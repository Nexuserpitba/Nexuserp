/**
 * NexusERP - Auth Middleware
 * JWT validation, RBAC, Step-Up Auth, Dual Control
 * Zero Trust: never trust the frontend
 */
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nlrmhzazxhrywaldzhjj.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");

let adminClient = null;
try {
  if (SUPABASE_SERVICE_KEY) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } else {
    console.warn("[AUTH] SUPABASE_SERVICE_ROLE_KEY not set - auth features disabled");
  }
} catch (err) {
  console.error("[AUTH] Failed to create admin client:", err.message);
}

// In-memory event bus for biometric events (replaced by Redis in production)
const biometriaEventBus = new Map(); // terminalId -> [callbacks]

/**
 * Extrai e valida o Bearer token do header Authorization
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
}

/**
 * Middleware: valida JWT do Supabase e popula req.user
 * Zero Trust - valida tudo no backend
 */
async function authenticate(req, res, next) {
  try {
    if (!adminClient) {
      return res.status(503).json({ erro: "Serviço de autenticação indisponível. Configure SUPABASE_SERVICE_ROLE_KEY." });
    }

    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ erro: "Token de autenticação ausente" });
    }

    // Validar token com Supabase
    const { data: userData, error } = await adminClient.auth.getUser(token);
    if (error || !userData?.user) {
      return res.status(401).json({ erro: "Token inválido ou expirado" });
    }

    const userId = userData.user.id;

    // Buscar perfil e role
    const [profileRes, roleRes] = await Promise.all([
      adminClient.from("profiles").select("*").eq("id", userId).single(),
      adminClient.from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
    ]);

    if (!profileRes.data || profileRes.data.ativo === false) {
      return res.status(403).json({ erro: "Usuário inativo" });
    }

    // Buscar permissoes do usuario via RPC
    const { data: permissoes } = await adminClient.rpc("get_user_permissions", { _user_id: userId });

    req.user = {
      id: userId,
      email: userData.user.email,
      nome: profileRes.data.nome || userData.user.email,
      role: roleRes.data?.role || "operador",
      ativo: profileRes.data.ativo,
      limiteDesconto: profileRes.data.limite_desconto ?? 5,
      permissoes: (permissoes || []).map(p => p.codigo),
      permissoesDetalhes: permissoes || [],
    };

    // Validar sessao de terminal se fornecida
    const terminalId = req.headers["x-terminal-id"];
    if (terminalId) {
      const { data: sessao } = await adminClient
        .from("sessoes_terminal")
        .select("id, ativa, expira_em")
        .eq("usuario_id", userId)
        .eq("terminal_id", terminalId)
        .eq("ativa", true)
        .limit(1)
        .single();

      if (sessao) {
        if (new Date(sessao.expira_em) < new Date()) {
          await adminClient.from("sessoes_terminal").update({ ativa: false }).eq("id", sessao.id);
          return res.status(401).json({ erro: "Sessão do terminal expirada" });
        }
        // Atualizar last_activity
        await adminClient
          .from("sessoes_terminal")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", sessao.id);

        req.user.terminalId = terminalId;
        req.user.sessaoId = sessao.id;
      }
    }

    next();
  } catch (err) {
    console.error("[AUTH MIDDLEWARE]", err);
    return res.status(500).json({ erro: "Erro interno de autenticação" });
  }
}

/**
 * Middleware: verifica se o usuario tem permissao especifica (RBAC)
 * Uso: requirePermission('CANCELAR_VENDA')
 */
function requirePermission(...codigosPermissao) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    const temPermissao = codigosPermissao.some(codigo => req.user.permissoes.includes(codigo));
    if (!temPermissao) {
      // Log de acesso negado
      registrarAuditoria(req, "acesso_negado", {
        permissoes_requeridas: codigosPermissao,
        permissoes_usuario: req.user.permissoes,
      });
      return res.status(403).json({
        erro: "Permissão insuficiente",
        requer: codigosPermissao,
      });
    }

    next();
  };
}

/**
 * Middleware: exige step-up authentication para acoes criticas
 * Verifica se ha um step-up valido recente
 */
function requireStepUp(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ erro: "Não autenticado" });
  }

  const stepUpToken = req.headers["x-step-up-token"];
  if (!stepUpToken) {
    return res.status(403).json({
      erro: "Reautenticação necessária",
      tipo: "step_up",
      mensagem: "Esta ação requer reautenticação por biometria ou senha",
    });
  }

  // Validar step-up token
  adminClient
    .from("step_up_eventos")
    .select("id, status, expira_em, usuario_id")
    .eq("token", stepUpToken)
    .eq("usuario_id", req.user.id)
    .eq("status", "VALIDADO")
    .limit(1)
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        return res.status(403).json({
          erro: "Token de reautenticação inválido",
          tipo: "step_up",
        });
      }

      if (new Date(data.expira_em) < new Date()) {
        return res.status(403).json({
          erro: "Token de reautenticação expirado",
          tipo: "step_up",
        });
      }

      // Invalidar token (single-use)
      adminClient
        .from("step_up_eventos")
        .update({ status: "UTILIZADO", resolvido_em: new Date().toISOString() })
        .eq("id", data.id)
        .then(() => {});

      req.stepUpValidado = true;
      next();
    })
    .catch(() => {
      return res.status(500).json({ erro: "Erro ao validar reautenticação" });
    });
}

/**
 * Middleware: exige dupla autorizacao (dual control) para acoes criticas
 * Verifica se ha uma autorizacao de gerente valida
 */
function requireDualAuth(acao) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ erro: "Não autenticado" });
    }

    const authId = req.headers["x-dual-auth-id"];
    if (!authId) {
      return res.status(403).json({
        erro: "Autorização de gerente necessária",
        tipo: "dual_auth",
        acao,
        mensagem: "Esta ação requer autorização de um gerente ou supervisor",
      });
    }

    const { data: autorizacao, error } = await adminClient
      .from("autorizacoes")
      .select("id, status, expira_em, operador_id, gerente_id, usado")
      .eq("id", authId)
      .eq("acao", acao)
      .limit(1)
      .single();

    if (error || !autorizacao) {
      return res.status(403).json({
        erro: "Autorização não encontrada",
        tipo: "dual_auth",
      });
    }

    if (autorizacao.status !== "APROVADO") {
      return res.status(403).json({
        erro: `Autorização com status: ${autorizacao.status}`,
        tipo: "dual_auth",
      });
    }

    if (new Date(autorizacao.expira_em) < new Date()) {
      await adminClient.from("autorizacoes").update({ status: "EXPIRADO" }).eq("id", autorizacao.id);
      return res.status(403).json({
        erro: "Autorização expirada",
        tipo: "dual_auth",
      });
    }

    if (autorizacao.usado) {
      return res.status(403).json({
        erro: "Autorização já utilizada",
        tipo: "dual_auth",
      });
    }

    // Verificar que o operador não está se auto-autorizando
    if (autorizacao.operador_id === autorizacao.gerente_id) {
      return res.status(403).json({
        erro: "Operador não pode autorizar própria ação",
        tipo: "dual_auth",
      });
    }

    // Marcar como usado (single-use)
    await adminClient
      .from("autorizacoes")
      .update({ usado: true, resolvido_em: new Date().toISOString() })
      .eq("id", autorizacao.id);

    req.autorizacao = autorizacao;
    next();
  };
}

/**
 * Registra entrada de auditoria
 */
async function registrarAuditoria(req, acao, detalhes = {}) {
  try {
    await adminClient.from("audit_logs").insert({
      action: acao,
      user_id: req.user?.id,
      user_name: req.user?.nome,
      user_role: req.user?.role,
      terminal_id: req.headers["x-terminal-id"] || req.user?.terminalId,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers["user-agent"],
      detalhes,
      metodo_autenticacao: req.headers["x-step-up-token"] ? "step-up" : "jwt",
    });
  } catch (err) {
    console.error("[AUDITORIA] Erro ao registrar:", err);
  }
}

/**
 * Publica evento biométrico no event bus (para WebSocket)
 */
function publishBiometriaEvento(terminalId, evento) {
  const callbacks = biometriaEventBus.get(terminalId) || [];
  callbacks.forEach(cb => {
    try {
      cb(evento);
    } catch (err) {
      console.error("[EVENT BUS] Erro ao publicar:", err);
    }
  });
}

/**
 * Inscreve para eventos biométricos de um terminal
 */
function subscribeBiometriaEvento(terminalId, callback) {
  if (!biometriaEventBus.has(terminalId)) {
    biometriaEventBus.set(terminalId, []);
  }
  biometriaEventBus.get(terminalId).push(callback);

  // Retorna função de cleanup
  return () => {
    const cbs = biometriaEventBus.get(terminalId) || [];
    const idx = cbs.indexOf(callback);
    if (idx > -1) cbs.splice(idx, 1);
  };
}

/**
 * Rate limiter simples por IP
 */
const rateLimitMap = new Map();

function rateLimit(maxReqs = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now - entry.start > windowMs) {
      rateLimitMap.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count++;
    if (entry.count > maxReqs) {
      return res.status(429).json({ erro: "Muitas requisições. Tente novamente em instantes." });
    }

    next();
  };
}

// Limpar mapas periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > 120000) rateLimitMap.delete(key);
  }
}, 60000);

module.exports = {
  authenticate,
  requirePermission,
  requireStepUp,
  requireDualAuth,
  registrarAuditoria,
  publishBiometriaEvento,
  subscribeBiometriaEvento,
  rateLimit,
  adminClient,
};
