import { supabase } from "@/integrations/supabase/client";

const AUDIT_KEY = "audit-log";

export type AuditAction =
  | "login"
  | "logout"
  | "login_biometria"
  | "login_falha"
  | "pdv_login"
  | "pdv_logout"
  | "pdv_troca_operador"
  | "senha_alterada"
  | "biometria_cadastrada"
  | "biometria_removida"
  | "pdv_alterar_quantidade"
  | "pdv_alterar_preco"
  | "permissoes_alteradas"
  | "permissoes_restauradas"
  | "acesso_negado"
  | "bloqueio_automatico"
  | "desbloqueio_manual"
  | "ncm_auto_sugestao"
  | "ncm_edicao_massa"
  // RBAC + Step-Up + Dual Control
  | "step_up_sucesso"
  | "step_up_falha"
  | "autorizacao_solicitada"
  | "autorizacao_aprovada"
  | "autorizacao_negada"
  | "auto_autorizacao_bloqueada";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  detail?: string;
  timestamp: string;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  login: "Login no sistema",
  logout: "Logout do sistema",
  login_biometria: "Login por biometria",
  login_falha: "Tentativa de login falhou",
  pdv_login: "Login no PDV",
  pdv_logout: "Logout do PDV",
  pdv_troca_operador: "Troca de operador no PDV",
  senha_alterada: "Senha alterada",
  biometria_cadastrada: "Biometria cadastrada",
  biometria_removida: "Biometria removida",
  pdv_alterar_quantidade: "Alteração de quantidade no PDV",
  pdv_alterar_preco: "Alteração de preço no PDV",
  permissoes_alteradas: "Permissões por módulo alteradas",
  permissoes_restauradas: "Permissões por módulo restauradas ao padrão",
  acesso_negado: "Tentativa de acesso a rota sem permissão",
  bloqueio_automatico: "Bloqueio automático por excesso de acessos negados",
  desbloqueio_manual: "Desbloqueio manual pelo administrador",
  ncm_auto_sugestao: "NCM sugerido automaticamente em lote",
  ncm_edicao_massa: "NCM editado em massa",
  step_up_sucesso: "Reautenticação realizada com sucesso",
  step_up_falha: "Reautenticação falhou",
  autorizacao_solicitada: "Autorização dual solicitada",
  autorizacao_aprovada: "Autorização aprovada pelo gerente",
  autorizacao_negada: "Autorização negada pelo gerente",
  auto_autorizacao_bloqueada: "Tentativa de auto-autorização bloqueada",
};

export function getActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] || action;
}

export function addAuditLog(
  action: AuditAction,
  user: { id: string; nome: string; role: string },
  detail?: string
) {
  // Write to Supabase (fire-and-forget)
  supabase
    .from("audit_logs")
    .insert({
      action,
      user_id: user.id,
      user_name: user.nome,
      user_role: user.role,
      detail: detail || "",
    })
    .then(() => {});
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      action: row.action as AuditAction,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      detail: row.detail || "",
      timestamp: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function clearAuditLogs() {
  // Delete all audit logs (admin only)
  await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

// ===== Auto-block config =====
const BLOCK_CONFIG_KEY = "block-config";
const BLOCK_KEY = "blocked-users";

export interface BlockConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockMinutes: number;
  enabled: boolean;
}

const DEFAULT_BLOCK_CONFIG: BlockConfig = {
  maxAttempts: 10,
  windowMinutes: 60,
  blockMinutes: 30,
  enabled: true,
};

export function getBlockConfig(): BlockConfig {
  try {
    const s = localStorage.getItem(BLOCK_CONFIG_KEY);
    return s ? { ...DEFAULT_BLOCK_CONFIG, ...JSON.parse(s) } : { ...DEFAULT_BLOCK_CONFIG };
  } catch {
    return { ...DEFAULT_BLOCK_CONFIG };
  }
}

export function saveBlockConfig(config: BlockConfig) {
  localStorage.setItem(BLOCK_CONFIG_KEY, JSON.stringify(config));
}

// ===== Auto-block system =====
interface BlockEntry {
  userId: string;
  userName: string;
  blockedAt: string;
  expiresAt: string;
  reason: string;
}

export function getBlockedUsers(): BlockEntry[] {
  try {
    const s = localStorage.getItem(BLOCK_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveBlockedUsers(entries: BlockEntry[]) {
  localStorage.setItem(BLOCK_KEY, JSON.stringify(entries));
}

export function isUserBlocked(userId: string): BlockEntry | null {
  const now = new Date();
  let entries = getBlockedUsers();
  const before = entries.length;
  entries = entries.filter(e => new Date(e.expiresAt) > now);
  if (entries.length !== before) saveBlockedUsers(entries);
  return entries.find(e => e.userId === userId) || null;
}

export function blockUser(userId: string, userName: string, reason: string, minutes?: number) {
  const cfg = getBlockConfig();
  const dur = minutes ?? cfg.blockMinutes;
  const now = new Date();
  let entries = getBlockedUsers().filter(e => new Date(e.expiresAt) > now && e.userId !== userId);
  entries.push({
    userId,
    userName,
    blockedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + dur * 60 * 1000).toISOString(),
    reason,
  });
  saveBlockedUsers(entries);
}

export function unblockUser(userId: string) {
  saveBlockedUsers(getBlockedUsers().filter(e => e.userId !== userId));
}

export async function checkAndAutoBlock(userId: string, userName: string): Promise<boolean> {
  const cfg = getBlockConfig();
  if (!cfg.enabled) return false;
  const windowStart = new Date(Date.now() - cfg.windowMinutes * 60 * 1000);
  const logs = await getAuditLogs();
  const recentDenials = logs.filter(
    l => l.action === "acesso_negado" && l.userId === userId && new Date(l.timestamp) >= windowStart
  );
  if (recentDenials.length >= cfg.maxAttempts && !isUserBlocked(userId)) {
    blockUser(userId, userName, `Bloqueio automático: ${recentDenials.length} acessos negados em ${cfg.windowMinutes} min`);
    addAuditLog("bloqueio_automatico" as AuditAction, { id: userId, nome: userName, role: "" }, `${recentDenials.length} tentativas em ${cfg.windowMinutes}min`);
    return true;
  }
  return false;
}
