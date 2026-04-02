import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { to, subject, html, body, reportType, attachments } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Destinatário obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeAttachments = Array.isArray(attachments) ? attachments : [];

    // Busca empresa ativa com config SMTP
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('razao_social, nome_fantasia, smtp_config')
      .eq('selecionada', true)
      .single();

    if (empError || !empresa) {
      return new Response(
        JSON.stringify({ error: "Nenhuma empresa ativa encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!empresa.smtp_config?.servidor) {
      return new Response(
        JSON.stringify({ error: "Configuração SMTP não encontrada na empresa ativa. Configure em Cadastros > Empresas > aba E-mail SMTP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chama a função send-smtp-email
    const smtpUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-smtp-email`;
    const response = await fetch(smtpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        smtp: empresa.smtp_config,
        to,
        subject: subject || `Relatório ${reportType || ''} - ${empresa.nome_fantasia || empresa.razao_social}`,
        body: body || '',
        html: html || body || '',
        attachments: safeAttachments,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: result.error || 'Falha ao enviar relatório' }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `Relatório enviado para ${to}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro ao enviar relatório:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
