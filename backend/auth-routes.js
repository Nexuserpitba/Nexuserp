/**
 * NexusERP - Auth Routes
 * Login, Step-Up, Dual Authorization, Permissions
 */
const express = require("express");
const crypto = require("crypto");
const {
  authenticate,
  requirePermission,
  requireStepUp,
  requireDualAuth,
  registrarAuditoria,
  publishBiometriaEvento,
  subscribeBiometriaEvento,
  rateLimit,
  adminClient,
} = require("./auth-middleware");

const router = express.Router();

// Rate limit mais restritivo para auth
const authRateLimit = rateLimit(20, 60000);

// ============================================================
// POST /auth/login
// Login com email + senha OU token biométrico
// ============================================================
router.post("/login", authRateLimit, async (req, res) => {
  try {
    const { email, password, biometria_token, terminal_id, terminal_nome } = req.body;

    let userId, userName, userRole, userEmail;

    // ---- Login por biometria ----
    if (biometria_token) {
      const { data: evento, error: eventoError } = await adminClient
        .from("biometria_eventos")
        .select("user_id, token_expira_em, status")
        .eq("token_gerado", biometria_token)
        .eq("status", "sucesso")
        .limit(1)
        .single();

      if (eventoError || !evento || !evento.user_id) {
        return res.status(401).json({ erro: "Token biométrico inválido" });
      }

      if (new Date(evento.token_expira_em) < new Date()) {
        return res.status(401).json({ erro: "Token biométrico expirado" });
      }

      // Invalidar token (single-use)
      await adminClient
        .from("biometria_eventos")
        .update({ status: "utilizado" })
        .eq("token_gerado", biometria_token);

      // Buscar dados do usuario
      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", evento.user_id)
        .single();

      if (!profile || profile.ativo === false) {
        return res.status(403).json({ erro: "Usuário inativo" });
      }

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", evento.user_id)
        .limit(1)
        .single();

      userId = evento.user_id;
      userName = profile.nome;
      userRole = roleData?.role || "operador";
      userEmail = profile.login;

      // Criar sessão no Supabase Auth para o usuario via admin
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: profile.login || `${userId}@nexuserp.local`,
      });

      if (linkError) {
        // Fallback: gerar token proprio
        const jwtPayload = {
          sub: userId,
          email: userEmail,
          role: userRole,
          terminal_id,
          exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60, // 8 horas
        };

        await registrarSessaoTerminal(userId, terminal_id, terminal_nome, req);

        return res.json({
          sucesso: true,
          metodo: "biometria",
          usuario: { id: userId, nome: userName, role: userRole },
          terminal_id,
          // Frontend deve usar o Supabase client com o token retornado pelo webhook
        });
      }
    }
    // ---- Login com senha ----
    else if (email && password) {
      // Login via Supabase Auth
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
      const supabaseUrl = process.env.SUPABASE_URL || "https://nlrmhzazxhrywaldzhjj.supabase.co";

      const { createClient } = require("@supabase/supabase-js");
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !signInData.user) {
        await registrarAuditoria(
          { user: { id: null, nome: email, role: null }, ip: req.ip, headers: req.headers },
          "login_falha",
          { email, motivo: "Credenciais inválidas" }
        );
        return res.status(401).json({ erro: "Email ou senha inválidos" });
      }

      userId = signInData.user.id;

      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!profile || profile.ativo === false) {
        return res.status(403).json({ erro: "Usuário inativo" });
      }

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(1)
        .single();

      userName = profile.nome;
      userRole = roleData?.role || "operador";
      userEmail = email;
    } else {
      return res.status(400).json({ erro: "Forneça email+senha ou biometria_token" });
    }

    // Registrar sessão de terminal
    if (terminal_id) {
      await registrarSessaoTerminal(userId, terminal_id, terminal_nome, req);
    }

    // Buscar permissoes
    const { data: permissoes } = await adminClient.rpc("get_user_permissions", { _user_id: userId });

    // Log de auditoria
    await adminClient.from("audit_logs").insert({
      action: biometria_token ? "login_biometria" : "login",
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      terminal_id,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      detalhes: { metodo: biometria_token ? "biometria" : "senha" },
    });

    res.json({
      sucesso: true,
      metodo: biometria_token ? "biometria" : "senha",
      usuario: {
        id: userId,
        nome: userName,
        email: userEmail,
        role: userRole,
      },
      permissoes: (permissoes || []).map(p => p.codigo),
      terminal_id,
    });
  } catch (err) {
    console.error("[AUTH LOGIN]", err);
    res.status(500).json({ erro: "Erro interno no login" });
  }
});

// ============================================================
// POST /auth/step-up
// Reautenticacao para acoes criticas (biometria ou senha)
// ============================================================
router.post("/step-up", authenticate, authRateLimit, async (req, res) => {
  try {
    const { metodo, password, biometria_token, acao } = req.body;

    if (!metodo || !acao) {
      return res.status(400).json({ erro: "Metodo e acao são obrigatórios" });
    }

    // Verificar se a acao realmente exige step-up
    const { data: permissao } = await adminClient
      .from("permissoes")
      .select("step_up_obrigatorio")
      .eq("codigo", acao)
      .single();

    if (!permissao?.step_up_obrigatorio) {
      return res.status(400).json({ erro: "Esta ação não requer reautenticação" });
    }

    let autenticado = false;

    if (metodo === "senha") {
      if (!password) {
        return res.status(400).json({ erro: "Senha é obrigatória" });
      }

      // Verificar senha via Supabase
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
      const supabaseUrl = process.env.SUPABASE_URL || "https://nlrmhzazxhrywaldzhjj.supabase.co";
      const { createClient } = require("@supabase/supabase-js");
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      const { error } = await anonClient.auth.signInWithPassword({
        email: req.user.email,
        password,
      });

      autenticado = !error;
    } else if (metodo === "biometria") {
      if (!biometria_token) {
        return res.status(400).json({ erro: "Token biométrico é obrigatório" });
      }

      const { data: evento } = await adminClient
        .from("biometria_eventos")
        .select("user_id, token_expira_em, status")
        .eq("token_gerado", biometria_token)
        .eq("user_id", req.user.id)
        .eq("status", "sucesso")
        .limit(1)
        .single();

      if (evento && new Date(evento.token_expira_em) > new Date()) {
        autenticado = true;
        // Invalidar token
        await adminClient
          .from("biometria_eventos")
          .update({ status: "utilizado" })
          .eq("token_gerado", biometria_token);
      }
    }

    if (!autenticado) {
      // Registrar falha
      await adminClient.from("step_up_eventos").insert({
        usuario_id: req.user.id,
        acao_requerida: acao,
        metodo,
        status: "FALHOU",
        expira_em: new Date(Date.now() + 120000).toISOString(),
        ip_address: req.ip,
        terminal_id: req.user.terminalId,
      });

      await registrarAuditoria(req, "step_up_falha", { acao, metodo });
      return res.status(401).json({ erro: "Reautenticação falhou" });
    }

    // Gerar token de step-up
    const token = crypto.randomUUID();
    const expiraEm = new Date(Date.now() + 120000); // 2 minutos

    await adminClient.from("step_up_eventos").insert({
      usuario_id: req.user.id,
      acao_requerida: acao,
      metodo,
      status: "VALIDADO",
      token,
      expira_em: expiraEm.toISOString(),
      ip_address: req.ip,
      terminal_id: req.user.terminalId,
    });

    await registrarAuditoria(req, "step_up_sucesso", { acao, metodo });

    res.json({
      sucesso: true,
      step_up_token: token,
      expira_em: expiraEm.toISOString(),
      acao,
    });
  } catch (err) {
    console.error("[STEP-UP]", err);
    res.status(500).json({ erro: "Erro interno na reautenticação" });
  }
});

// ============================================================
// POST /auth/solicitar-autorizacao
// Solicita dupla autorizacao de gerente
// ============================================================
router.post("/solicitar-autorizacao", authenticate, async (req, res) => {
  try {
    const { acao, motivo, detalhes } = req.body;

    if (!acao) {
      return res.status(400).json({ erro: "Ação é obrigatória" });
    }

    // Verificar se a acao requer dupla autorizacao
    const { data: permissao } = await adminClient
      .from("permissoes")
      .select("requer_gerente, step_up_obrigatorio")
      .eq("codigo", acao)
      .single();

    if (!permissao) {
      return res.status(400).json({ erro: "Ação desconhecida" });
    }

    // Verificar se o usuario tem permissao para a acao
    if (!req.user.permissoes.includes(acao)) {
      return res.status(403).json({ erro: "Sem permissão para esta ação" });
    }

    // Criar autorizacao pendente (expira em 120 segundos)
    const expiraEm = new Date(Date.now() + 120000);

    const { data: autorizacao, error } = await adminClient
      .from("autorizacoes")
      .insert({
        acao,
        operador_id: req.user.id,
        status: "PENDENTE",
        motivo,
        detalhes: detalhes || {},
        expira_em: expiraEm.toISOString(),
        ip_address: req.ip,
        terminal_id: req.user.terminalId,
      })
      .select()
      .single();

    if (error) {
      console.error("[SOLICITAR AUTORIZACAO]", error);
      return res.status(500).json({ erro: "Erro ao criar autorização" });
    }

    // Notificar via event bus
    publishBiometriaEvento(req.user.terminalId || "global", {
      tipo: "autorizacao_pendente",
      autorizacao_id: autorizacao.id,
      acao,
      operador: req.user.nome,
      expira_em: expiraEm.toISOString(),
    });

    await registrarAuditoria(req, "autorizacao_solicitada", {
      autorizacao_id: autorizacao.id,
      acao,
      motivo,
    });

    res.json({
      sucesso: true,
      autorizacao_id: autorizacao.id,
      status: "PENDENTE",
      expira_em: expiraEm.toISOString(),
      mensagem: "Aguardando autorização de gerente. O gerente deve usar biometria ou senha.",
    });
  } catch (err) {
    console.error("[SOLICITAR AUTORIZACAO]", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// POST /auth/confirmar-autorizacao
// Gerente confirma ou nega autorizacao (via biometria ou senha)
// ============================================================
router.post("/confirmar-autorizacao", authenticate, authRateLimit, async (req, res) => {
  try {
    const { autorizacao_id, aprovar, metodo, password, biometria_token } = req.body;

    if (!autorizacao_id) {
      return res.status(400).json({ erro: "ID da autorização é obrigatório" });
    }

    // Buscar autorizacao
    const { data: autorizacao, error } = await adminClient
      .from("autorizacoes")
      .select("*")
      .eq("id", autorizacao_id)
      .limit(1)
      .single();

    if (error || !autorizacao) {
      return res.status(404).json({ erro: "Autorização não encontrada" });
    }

    if (autorizacao.status !== "PENDENTE") {
      return res.status(400).json({ erro: `Autorização com status: ${autorizacao.status}` });
    }

    if (new Date(autorizacao.expira_em) < new Date()) {
      await adminClient.from("autorizacoes").update({ status: "EXPIRADO" }).eq("id", autorizacao_id);
      return res.status(400).json({ erro: "Autorização expirada" });
    }

    // NÃO permitir auto-autorizacao
    if (autorizacao.operador_id === req.user.id) {
      await registrarAuditoria(req, "auto_autorizacao_bloqueada", { autorizacao_id });
      return res.status(403).json({ erro: "Operador não pode autorizar própria ação" });
    }

    // Verificar se quem confirma tem role de gerente/admin/supervisor
    const rolesAutorizadores = ["administrador", "gerente", "supervisor"];
    if (!rolesAutorizadores.includes(req.user.role)) {
      return res.status(403).json({ erro: "Apenas gerentes podem autorizar ações críticas" });
    }

    // Verificar autenticacao do gerente
    let autenticado = false;

    if (metodo === "senha" && password) {
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
      const supabaseUrl = process.env.SUPABASE_URL || "https://nlrmhzazxhrywaldzhjj.supabase.co";
      const { createClient } = require("@supabase/supabase-js");
      const anonClient = createClient(supabaseUrl, supabaseAnonKey);

      const { error: authError } = await anonClient.auth.signInWithPassword({
        email: req.user.email,
        password,
      });
      autenticado = !authError;
    } else if (metodo === "biometria" && biometria_token) {
      const { data: evento } = await adminClient
        .from("biometria_eventos")
        .select("user_id, token_expira_em, status")
        .eq("token_gerado", biometria_token)
        .eq("user_id", req.user.id)
        .eq("status", "sucesso")
        .limit(1)
        .single();

      if (evento && new Date(evento.token_expira_em) > new Date()) {
        autenticado = true;
        await adminClient
          .from("biometria_eventos")
          .update({ status: "utilizado" })
          .eq("token_gerado", biometria_token);
      }
    }

    if (!autenticado) {
      return res.status(401).json({ erro: "Autenticação do gerente falhou" });
    }

    // Atualizar autorizacao
    const novoStatus = aprovar ? "APROVADO" : "NEGADO";
    await adminClient
      .from("autorizacoes")
      .update({
        status: novoStatus,
        gerente_id: req.user.id,
        metodo: metodo || "senha",
        resolvido_em: new Date().toISOString(),
      })
      .eq("id", autorizacao_id);

    // Notificar via event bus
    publishBiometriaEvento(autorizacao.terminal_id || "global", {
      tipo: aprovar ? "autorizacao_aprovada" : "autorizacao_negada",
      autorizacao_id,
      acao: autorizacao.acao,
      gerente: req.user.nome,
    });

    await registrarAuditoria(req, aprovar ? "autorizacao_aprovada" : "autorizacao_negada", {
      autorizacao_id,
      acao: autorizacao.acao,
      operador_id: autorizacao.operador_id,
      metodo,
    });

    res.json({
      sucesso: true,
      autorizacao_id,
      status: novoStatus,
      gerente: req.user.nome,
    });
  } catch (err) {
    console.error("[CONFIRMAR AUTORIZACAO]", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// GET /auth/permissoes
// Lista permissoes do usuario autenticado
// ============================================================
router.get("/permissoes", authenticate, async (req, res) => {
  try {
    res.json({
      usuario: {
        id: req.user.id,
        nome: req.user.nome,
        role: req.user.role,
      },
      permissoes: req.user.permissoes,
      permissoesDetalhes: req.user.permissoesDetalhes,
    });
  } catch (err) {
    console.error("[PERMISSOES]", err);
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// GET /auth/sessao/terminal
// Status da sessão do terminal atual
// ============================================================
router.get("/sessao/terminal", authenticate, async (req, res) => {
  try {
    const terminalId = req.headers["x-terminal-id"];
    if (!terminalId) {
      return res.status(400).json({ erro: "x-terminal-id header obrigatório" });
    }

    const { data: sessao } = await adminClient
      .from("sessoes_terminal")
      .select("id, ativa, last_activity, expira_em, terminal_nome")
      .eq("usuario_id", req.user.id)
      .eq("terminal_id", terminalId)
      .eq("ativa", true)
      .limit(1)
      .single();

    res.json({
      sessao: sessao || null,
      terminal_id: terminalId,
    });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// GET /auth/autorizacoes/pendentes
// Lista autorizacoes pendentes (para painel do gerente)
// ============================================================
router.get("/autorizacoes/pendentes", authenticate, requirePermission("GERENCIAR_USUARIOS"), async (req, res) => {
  try {
    // Limpar expiradas primeiro
    await adminClient.rpc("limpar_autorizacoes_expiradas");

    const { data: autorizacoes, error } = await adminClient
      .from("autorizacoes")
      .select(`
        id, acao, status, motivo, detalhes, expira_em, created_at,
        operador:operador_id (nome)
      `)
      .eq("status", "PENDENTE")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ erro: "Erro ao buscar autorizações" });
    }

    res.json({ autorizacoes: autorizacoes || [] });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// POST /auth/logout
// Logout e invalidacao de sessao
// ============================================================
router.post("/logout", authenticate, async (req, res) => {
  try {
    const terminalId = req.headers["x-terminal-id"];

    // Invalidar sessao do terminal
    if (terminalId) {
      await adminClient
        .from("sessoes_terminal")
        .update({ ativa: false })
        .eq("usuario_id", req.user.id)
        .eq("terminal_id", terminalId);
    }

    await registrarAuditoria(req, "logout", { terminal_id: terminalId });

    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: "Erro interno" });
  }
});

// ============================================================
// WebSocket / SSE endpoint para eventos biométricos em tempo real
// ============================================================
router.get("/biometria/stream/:terminalId", (req, res) => {
  const { terminalId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Enviar heartbeat
  const heartbeat = setInterval(() => {
    res.write("data: {\"tipo\":\"heartbeat\"}\n\n");
  }, 30000);

  // Inscrever no event bus
  const unsubscribe = subscribeBiometriaEvento(terminalId, (evento) => {
    res.write(`data: ${JSON.stringify(evento)}\n\n`);
  });

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// ============================================================
// Helper: Registrar sessão de terminal
// ============================================================
async function registrarSessaoTerminal(userId, terminalId, terminalNome, req) {
  // Invalidar sessoes anteriores deste terminal
  await adminClient
    .from("sessoes_terminal")
    .update({ ativa: false })
    .eq("terminal_id", terminalId)
    .eq("ativa", true);

  // Invalidar sessoes anteriores deste usuario neste terminal
  await adminClient
    .from("sessoes_terminal")
    .update({ ativa: false })
    .eq("usuario_id", userId)
    .eq("ativa", true);

  // Criar nova sessao (8 horas de validade)
  const expiraEm = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await adminClient.from("sessoes_terminal").insert({
    usuario_id: userId,
    terminal_id: terminalId,
    terminal_nome: terminalNome,
    ip_address: req.ip,
    user_agent: req.headers["user-agent"],
    ativa: true,
    expira_em: expiraEm.toISOString(),
  });
}

module.exports = router;
