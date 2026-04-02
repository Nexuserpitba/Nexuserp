// Serviço de integração biométrica com hardware Intelbras CM 351
import { supabase } from "@/integrations/supabase/client";

export interface BiometriaConfig {
  id: string;
  dispositivoNome: string;
  dispositivoIp: string;
  dispositivoPorta: number;
  softwareIntegracao: string;
  webhookUrl: string;
  ativo: boolean;
}

export interface BiometriaUsuario {
  id: string;
  userId: string;
  biometriaId: string;
  dispositivoId: string;
  nomeDispositivo: string;
  ativo: boolean;
  userName?: string;
}

export interface BiometriaEvento {
  id: string;
  biometriaId: string;
  userId?: string;
  eventoTipo: string;
  status: string;
  tokenGerado?: string;
  tokenExpiraEm?: string;
  createdAt: string;
}

// Buscar configuração do dispositivo biométrico
export async function getBiometriaConfig(): Promise<BiometriaConfig | null> {
  const { data, error } = await supabase
    .from("biometria_config")
    .select("*")
    .eq("ativo", true)
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    dispositivoNome: data.dispositivo_nome,
    dispositivoIp: data.dispositivo_ip,
    dispositivoPorta: data.dispositivo_porta,
    softwareIntegracao: data.software_integracao,
    webhookUrl: data.webhook_url,
    ativo: data.ativo,
  };
}

// Salvar configuração do dispositivo
export async function saveBiometriaConfig(config: Partial<BiometriaConfig>): Promise<boolean> {
  const existing = await getBiometriaConfig();

  if (existing) {
    const { error } = await supabase
      .from("biometria_config")
      .update({
        dispositivo_nome: config.dispositivoNome,
        dispositivo_ip: config.dispositivoIp,
        dispositivo_porta: config.dispositivoPorta,
        software_integracao: config.softwareIntegracao,
        webhook_url: config.webhookUrl,
        ativo: config.ativo,
      })
      .eq("id", existing.id);

    return !error;
  } else {
    const { error } = await supabase
      .from("biometria_config")
      .insert({
        dispositivo_nome: config.dispositivoNome || "CM 351",
        dispositivo_ip: config.dispositivoIp,
        dispositivo_porta: config.dispositivoPorta || 9000,
        software_integracao: config.softwareIntegracao || "InControl Web",
        webhook_url: config.webhookUrl,
        ativo: config.ativo !== false,
      });

    return !error;
  }
}

// Vincular ID biométrico a um usuário
export async function vincularBiometriaUsuario(
  userId: string,
  biometriaId: string,
  dispositivoId?: string,
  nomeDispositivo?: string
): Promise<boolean> {
  // Verificar se já existe vinculo
  const { data: existing } = await supabase
    .from("biometria_usuarios")
    .select("id")
    .eq("user_id", userId)
    .eq("biometria_id", biometriaId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("biometria_usuarios")
      .update({ ativo: true })
      .eq("id", existing.id);
    return !error;
  }

  const { error } = await supabase
    .from("biometria_usuarios")
    .insert({
      user_id: userId,
      biometria_id: biometriaId,
      dispositivo_id: dispositivoId,
      nome_dispositivo: nomeDispositivo,
      ativo: true,
    });

  return !error;
}

// Desvincular biometria de um usuário
export async function desvincularBiometriaUsuario(vinculoId: string): Promise<boolean> {
  const { error } = await supabase
    .from("biometria_usuarios")
    .update({ ativo: false })
    .eq("id", vinculoId);

  return !error;
}

// Listar vínculos biométricos de um usuário
export async function getBiometriasUsuario(userId: string): Promise<BiometriaUsuario[]> {
  const { data, error } = await supabase
    .from("biometria_usuarios")
    .select("*")
    .eq("user_id", userId)
    .eq("ativo", true);

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    biometriaId: d.biometria_id,
    dispositivoId: d.dispositivo_id,
    nomeDispositivo: d.nome_dispositivo,
    ativo: d.ativo,
  }));
}

// Listar todos os vínculos biométricos (admin)
export async function getAllBiometriasUsuarios(): Promise<BiometriaUsuario[]> {
  const { data, error } = await supabase
    .from("biometria_usuarios")
    .select("*")
    .eq("ativo", true);

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    userId: d.user_id,
    biometriaId: d.biometria_id,
    dispositivoId: d.dispositivo_id,
    nomeDispositivo: d.nome_dispositivo,
    ativo: d.ativo,
  }));
}

// Listar eventos biométricos
export async function getBiometriaEventos(limit = 50): Promise<BiometriaEvento[]> {
  const { data, error } = await supabase
    .from("biometria_eventos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((d) => ({
    id: d.id,
    biometriaId: d.biometria_id,
    userId: d.user_id,
    eventoTipo: d.evento_tipo,
    status: d.status,
    tokenGerado: d.token_gerado,
    tokenExpiraEm: d.token_expira_em,
    createdAt: d.created_at,
  }));
}

// Autenticar com token biométrico
export async function autenticarComTokenBiometria(token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("biometria_eventos")
    .select("user_id, token_expira_em")
    .eq("token_gerado", token)
    .eq("status", "sucesso")
    .single();

  if (error || !data || !data.user_id) return null;

  // Verificar se token não expirou
  if (data.token_expira_em && new Date(data.token_expira_em) < new Date()) {
    return null;
  }

  return data.user_id;
}

// Verificar se sistema biométrico está configurado
export async function isBiometriaConfigurada(): Promise<boolean> {
  const config = await getBiometriaConfig();
  return !!config && !!config.dispositivoIp;
}
