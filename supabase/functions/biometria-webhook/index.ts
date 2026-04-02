// Edge Function para receber eventos do Intelbras CM 351
// Suporta: login, step-up auth, dual control
// Zero Trust: valida tudo no backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Rate limiter simples
const rateLimitMap = new Map<string, { count: number; start: number }>();

function checkRateLimit(ip: string, max = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  // Rate limit
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ erro: "Muitas requisições" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validar API key do webhook
    const expectedApiKey = Deno.env.get("WEBHOOK_API_KEY");
    if (expectedApiKey) {
      const apiKey = req.headers.get("x-api-key");
      if (apiKey !== expectedApiKey) {
        return new Response(
          JSON.stringify({ erro: "API key inválida" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      biometria_id,
      evento_tipo,
      dispositivo_id,
      terminal_id,
      acao_contexto, // "login", "step_up", "dual_auth"
      dados_brutos,
    } = body;

    if (!biometria_id) {
      return new Response(
        JSON.stringify({ erro: "biometria_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar usuario vinculado ao ID biométrico
    const { data: biometriaUsuario, error: biometriaError } = await supabase
      .from("biometria_usuarios")
      .select("user_id, ativo")
      .eq("biometria_id", biometria_id)
      .eq("ativo", true)
      .single();

    if (biometriaError || !biometriaUsuario) {
      await supabase.from("biometria_eventos").insert({
        biometria_id,
        evento_tipo: acao_contexto || evento_tipo || "identificacao",
        status: "nao_identificado",
        dispositivo_id: dispositivo_id || terminal_id,
        ip_origem: clientIp,
        dados_brutos: body,
      });

      return new Response(
        JSON.stringify({ acesso: false, erro: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o usuário está ativo
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nome, ativo")
      .eq("id", biometriaUsuario.user_id)
      .single();

    if (profileError || !profile || !profile.ativo) {
      await supabase.from("biometria_eventos").insert({
        biometria_id,
        user_id: biometriaUsuario.user_id,
        evento_tipo: acao_contexto || evento_tipo || "identificacao",
        status: "usuario_inativo",
        dispositivo_id: dispositivo_id || terminal_id,
        ip_origem: clientIp,
        dados_brutos: body,
      });

      return new Response(
        JSON.stringify({ acesso: false, erro: "Usuário inativo" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar token de sessão (3 minutos para step-up/dual, 5 min para login)
    const tokenDuration = acao_contexto === "step_up" || acao_contexto === "dual_auth"
      ? 3 * 60 * 1000
      : 5 * 60 * 1000;
    const tokenExpira = new Date(Date.now() + tokenDuration);
    const token = crypto.randomUUID();

    // Processar baseado no contexto
    let responseData: Record<string, unknown> = {};

    if (acao_contexto === "step_up") {
      // Buscar step-up pendente mais recente
      const { data: pendingStepUp } = await supabase
        .from("step_up_eventos")
        .select("id, acao_requerida")
        .eq("usuario_id", biometriaUsuario.user_id)
        .eq("status", "PENDENTE")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (pendingStepUp) {
        const stepToken = crypto.randomUUID();
        await supabase
          .from("step_up_eventos")
          .update({
            status: "VALIDADO",
            token: stepToken,
            resolvido_em: new Date().toISOString(),
          })
          .eq("id", pendingStepUp.id);

        responseData = {
          tipo: "step_up_validado",
          step_up_token: stepToken,
          acao: pendingStepUp.acao_requerida,
        };
      }
    } else if (acao_contexto === "dual_auth") {
      responseData = {
        tipo: "dual_auth_biometria",
        token_biometria: token,
      };
    }

    // Registrar evento de sucesso
    const { data: evento } = await supabase
      .from("biometria_eventos")
      .insert({
        biometria_id,
        user_id: biometriaUsuario.user_id,
        evento_tipo: acao_contexto || evento_tipo || "identificacao",
        status: "sucesso",
        token_gerado: token,
        token_expira_em: tokenExpira.toISOString(),
        dispositivo_id: dispositivo_id || terminal_id,
        ip_origem: clientIp,
        dados_brutos: body,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        acesso: true,
        token,
        token_expira_em: tokenExpira.toISOString(),
        usuario: {
          id: profile.id,
          nome: profile.nome,
        },
        evento_id: evento?.id,
        ...responseData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no webhook biométrico:", error);
    return new Response(
      JSON.stringify({ erro: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
