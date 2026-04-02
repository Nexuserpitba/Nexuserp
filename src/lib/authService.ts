/**
 * NexusERP - Auth Service
 * API calls for login, step-up, dual authorization
 */
import { supabase } from "@/integrations/supabase/client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface LoginResponse {
  sucesso: boolean;
  metodo: "senha" | "biometria";
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: string;
  };
  permissoes: string[];
  terminal_id?: string;
}

interface StepUpResponse {
  sucesso: boolean;
  step_up_token: string;
  expira_em: string;
  acao: string;
}

interface SolicitarAutorizacaoResponse {
  sucesso: boolean;
  autorizacao_id: string;
  status: string;
  expira_em: string;
  mensagem: string;
}

interface ConfirmarAutorizacaoResponse {
  sucesso: boolean;
  autorizacao_id: string;
  status: string;
  gerente: string;
}

/**
 * Headers padrao com autenticacao
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  // Terminal ID
  const terminalId = localStorage.getItem("terminal-id") || "default";
  headers["x-terminal-id"] = terminalId;

  return headers;
}

/**
 * Login com email + senha via backend
 */
export async function loginComSenha(
  email: string,
  password: string,
  terminalId?: string
): Promise<LoginResponse> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      terminal_id: terminalId || localStorage.getItem("terminal-id") || "default",
      terminal_nome: navigator.userAgent,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.erro || "Erro no login");
  }

  return resp.json();
}

/**
 * Login com token biométrico via backend
 */
export async function loginComBiometria(
  biometriaToken: string,
  terminalId?: string
): Promise<LoginResponse> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      biometria_token: biometriaToken,
      terminal_id: terminalId || localStorage.getItem("terminal-id") || "default",
      terminal_nome: navigator.userAgent,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.erro || "Erro no login biométrico");
  }

  return resp.json();
}

/**
 * Step-up authentication (reautenticacao)
 */
export async function stepUpAuth(params: {
  metodo: "senha" | "biometria";
  acao: string;
  password?: string;
  biometriaToken?: string;
}): Promise<StepUpResponse> {
  const headers = await getAuthHeaders();

  const resp = await fetch(`${API_BASE}/auth/step-up`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      metodo: params.metodo,
      acao: params.acao,
      password: params.password,
      biometria_token: params.biometriaToken,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.erro || "Erro na reautenticação");
  }

  return resp.json();
}

/**
 * Solicitar autorizacao dual (pendente gerente)
 */
export async function solicitarAutorizacao(params: {
  acao: string;
  motivo?: string;
  detalhes?: Record<string, unknown>;
}): Promise<SolicitarAutorizacaoResponse> {
  const headers = await getAuthHeaders();

  const resp = await fetch(`${API_BASE}/auth/solicitar-autorizacao`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.erro || "Erro ao solicitar autorização");
  }

  return resp.json();
}

/**
 * Confirmar autorizacao (gerente aprova/nega)
 */
export async function confirmarAutorizacao(params: {
  autorizacaoId: string;
  aprovar: boolean;
  metodo: "senha" | "biometria";
  password?: string;
  biometriaToken?: string;
}): Promise<ConfirmarAutorizacaoResponse> {
  const headers = await getAuthHeaders();

  const resp = await fetch(`${API_BASE}/auth/confirmar-autorizacao`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      autorizacao_id: params.autorizacaoId,
      aprovar: params.aprovar,
      metodo: params.metodo,
      password: params.password,
      biometria_token: params.biometriaToken,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.erro || "Erro ao confirmar autorização");
  }

  return resp.json();
}

/**
 * Buscar permissoes do usuario autenticado
 */
export async function getPermissoesAutenticado(): Promise<{
  usuario: { id: string; nome: string; role: string };
  permissoes: string[];
  permissoesDetalhes: Array<{
    codigo: string;
    nome: string;
    tipo: string;
    step_up_obrigatorio: boolean;
    requer_gerente: boolean;
  }>;
}> {
  const headers = await getAuthHeaders();

  const resp = await fetch(`${API_BASE}/auth/permissoes`, {
    method: "GET",
    headers,
  });

  if (!resp.ok) {
    throw new Error("Erro ao buscar permissões");
  }

  return resp.json();
}

/**
 * Logout via backend
 */
export async function logoutBackend(): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers,
    });
  } catch {
    // Ignorar erros de logout
  }
}

/**
 * Buscar autorizacoes pendentes (para gerente)
 */
export async function getAutorizacoesPendentes(): Promise<Array<{
  id: string;
  acao: string;
  status: string;
  motivo: string;
  detalhes: Record<string, unknown>;
  expira_em: string;
  created_at: string;
  operador: { nome: string } | null;
}>> {
  const headers = await getAuthHeaders();

  const resp = await fetch(`${API_BASE}/auth/autorizacoes/pendentes`, {
    method: "GET",
    headers,
  });

  if (!resp.ok) return [];

  const data = await resp.json();
  return data.autorizacoes || [];
}

/**
 * Conectar ao SSE stream de eventos biométricos
 */
export function conectarStreamBiometria(
  terminalId: string,
  onEvento: (evento: Record<string, unknown>) => void
): () => void {
  const url = `${API_BASE}/auth/biometria/stream/${terminalId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.tipo !== "heartbeat") {
        onEvento(data);
      }
    } catch {
      // Ignorar erros de parse
    }
  };

  eventSource.onerror = () => {
    // SSE reconecta automaticamente
    console.warn("[SSE] Conexão perdida, reconectando...");
  };

  return () => eventSource.close();
}

/**
 * Polling de eventos biométricos (fallback para SSE)
 */
export function pollEventosBiometria(
  terminalId: string,
  onEvento: (evento: Record<string, unknown>) => void,
  intervalMs = 2000
): () => void {
  let lastEventId = 0;
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        const { data } = await supabase
          .from("biometria_eventos")
          .select("*")
          .eq("dispositivo_id", terminalId)
          .eq("status", "sucesso")
          .gt("created_at", new Date(lastEventId || Date.now() - 10000).toISOString())
          .order("created_at", { ascending: true })
          .limit(5);

        if (data && data.length > 0) {
          for (const evento of data) {
            onEvento({
              tipo: "biometria_reconhecida",
              usuario_id: evento.user_id,
              biometria_id: evento.biometria_id,
              token: evento.token_gerado,
              token_expira_em: evento.token_expira_em,
            });
            lastEventId = new Date(evento.created_at).getTime();
          }
        }
      } catch {
        // Ignorar erros de polling
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  };

  poll();

  return () => {
    running = false;
  };
}
