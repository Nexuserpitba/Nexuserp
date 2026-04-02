/**
 * NexusERP - Permission Service
 * RBAC + ABAC permission management
 */
import { supabase } from "@/integrations/supabase/client";

export interface Permissao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: "OPERACIONAL" | "FINANCEIRA" | "ADMIN";
  stepUpObrigatorio: boolean;
  requerGerente: boolean;
}

export interface PerfilPermissao {
  perfil: string;
  permissaoId: string;
}

// Cache de permissoes
let permissoesCache: Permissao[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca todas as permissoes cadastradas
 */
export async function getTodasPermissoes(): Promise<Permissao[]> {
  const now = Date.now();
  if (permissoesCache && now - cacheTimestamp < CACHE_TTL) {
    return permissoesCache;
  }

  const { data, error } = await supabase
    .from("permissoes")
    .select("*")
    .order("tipo", { ascending: true });

  if (error || !data) return [];

  permissoesCache = data.map(p => ({
    id: p.id,
    codigo: p.codigo,
    nome: p.nome,
    descricao: p.descricao || "",
    tipo: p.tipo as Permissao["tipo"],
    stepUpObrigatorio: p.step_up_obrigatorio,
    requerGerente: p.requer_gerente,
  }));

  cacheTimestamp = now;
  return permissoesCache;
}

/**
 * Busca permissoes de um perfil especifico
 */
export async function getPermissoesPerfil(perfil: string): Promise<Permissao[]> {
  const { data, error } = await supabase
    .from("perfil_permissoes")
    .select(`
      permissao_id,
      permissoes!inner(id, codigo, nome, descricao, tipo, step_up_obrigatorio, requer_gerente)
    `)
    .eq("perfil", perfil);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.permissoes.id,
    codigo: row.permissoes.codigo,
    nome: row.permissoes.nome,
    descricao: row.permissoes.descricao || "",
    tipo: row.permissoes.tipo,
    stepUpObrigatorio: row.permissoes.step_up_obrigatorio,
    requerGerente: row.permissoes.requer_gerente,
  }));
}

/**
 * Busca permissoes de um usuario via RPC
 */
export async function getPermissoesUsuario(userId: string): Promise<Permissao[]> {
  const { data, error } = await supabase.rpc("get_user_permissions", { _user_id: userId });
  if (error || !data) return [];

  return data.map(p => ({
    id: "",
    codigo: p.codigo,
    nome: p.nome,
    descricao: "",
    tipo: p.tipo as Permissao["tipo"],
    stepUpObrigatorio: p.step_up_obrigatorio,
    requerGerente: p.requer_gerente,
  }));
}

/**
 * Verifica se usuario tem permissao especifica
 */
export async function verificarPermissao(userId: string, codigo: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_permission", {
    _user_id: userId,
    _permissao_codigo: codigo,
  });
  return !error && data === true;
}

/**
 * Verifica se a acao requer step-up
 */
export async function requerStepUp(codigo: string): Promise<boolean> {
  const permissoes = await getTodasPermissoes();
  const p = permissoes.find(p => p.codigo === codigo);
  return p?.stepUpObrigatorio ?? false;
}

/**
 * Verifica se a acao requer gerente (dual control)
 */
export async function requerGerente(codigo: string): Promise<boolean> {
  const permissoes = await getTodasPermissoes();
  const p = permissoes.find(p => p.codigo === codigo);
  return p?.requerGerente ?? false;
}

/**
 * Invalidar cache de permissoes
 */
export function invalidarCachePermissoes(): void {
  permissoesCache = null;
  cacheTimestamp = 0;
}

/**
 * Atualizar permissoes de um perfil (admin)
 */
export async function atualizarPermissoesPerfil(
  perfil: string,
  permissaoIds: string[]
): Promise<boolean> {
  // Remover todas as permissoes atuais do perfil
  await supabase.from("perfil_permissoes").delete().eq("perfil", perfil);

  // Inserir novas permissoes
  if (permissaoIds.length > 0) {
    const inserts = permissaoIds.map(pid => ({
      perfil,
      permissao_id: pid,
    }));
    const { error } = await supabase.from("perfil_permissoes").insert(inserts);
    if (error) return false;
  }

  invalidarCachePermissoes();
  return true;
}

// Codigos de acao críticas (para referência)
export const ACOES_CRITICAS = {
  CANCELAR_VENDA: "CANCELAR_VENDA",
  ESTORNO: "ESTORNO",
  SANGRIA: "SANGRIA",
  DESCONTO_ALTO: "DESCONTO_ALTO",
  CANCELAR_NFE: "CANCELAR_NFE",
  ALTERAR_PRECO: "ALTERAR_PRECO",
  GERENCIAR_USUARIOS: "GERENCIAR_USUARIOS",
  GERENCIAR_PERMISSOES: "GERENCIAR_PERMISSOES",
} as const;
