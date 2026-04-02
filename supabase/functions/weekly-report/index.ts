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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read weekly report config from DB
    const { data: weeklyConfig } = await supabase
      .from('weekly_report_config')
      .select('*')
      .limit(1)
      .single();

    if (!weeklyConfig?.ativo) {
      console.log("Envio semanal desativado na configuração.");
      return new Response(JSON.stringify({ skipped: true, reason: "Envio semanal desativado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const destinatarios: string[] = weeklyConfig.destinatarios || [];
    if (destinatarios.length === 0) {
      console.log("Nenhum destinatário configurado.");
      return new Response(JSON.stringify({ skipped: true, reason: "Sem destinatários" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const relatoriosAtivos: string[] = weeklyConfig.relatorios_ativos || [];

    // Fetch active company
    const { data: empresa, error: empError } = await supabase
      .from('empresas')
      .select('razao_social, nome_fantasia, smtp_config, email')
      .eq('selecionada', true)
      .single();

    if (empError || !empresa) {
      console.log("Nenhuma empresa ativa encontrada, pulando envio semanal.");
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhuma empresa ativa" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!empresa.smtp_config?.servidor) {
      console.log("SMTP não configurado na empresa ativa.");
      return new Response(JSON.stringify({ skipped: true, reason: "SMTP não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch product data for reports
    const { data: produtos } = await supabase
      .from('produtos')
      .select('codigo, descricao, ncm, venda, estoque, ativo')
      .eq('ativo', true)
      .order('descricao');

    const totalProdutos = produtos?.length || 0;
    const semNcm = produtos?.filter(p => !p.ncm || p.ncm.replace(/\D/g, '').length < 8) || [];
    const coberturaPercent = totalProdutos > 0 ? Math.round(((totalProdutos - semNcm.length) / totalProdutos) * 100) : 0;
    const estoqueZero = produtos?.filter(p => !p.estoque || p.estoque <= 0) || [];

    const now = new Date();
    const dataRelatorio = now.toLocaleDateString('pt-BR');
    const nomeEmpresa = empresa.nome_fantasia || empresa.razao_social;

    // Build report sections based on selected reports
    let sections = '';

    if (relatoriosAtivos.includes('cobertura_ncm') || relatoriosAtivos.length === 0) {
      sections += `
      <div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap;">
        <div style="background:#eff6ff;border-radius:8px;padding:16px;min-width:160px;flex:1;">
          <div style="font-size:12px;color:#3b82f6;">Produtos Ativos</div>
          <div style="font-size:28px;font-weight:bold;color:#1e40af;">${totalProdutos}</div>
        </div>
        <div style="background:${coberturaPercent >= 90 ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:16px;min-width:160px;flex:1;">
          <div style="font-size:12px;color:${coberturaPercent >= 90 ? '#16a34a' : '#dc2626'};">Cobertura NCM</div>
          <div style="font-size:28px;font-weight:bold;color:${coberturaPercent >= 90 ? '#15803d' : '#b91c1c'};">${coberturaPercent}%</div>
        </div>
        <div style="background:#fef9c3;border-radius:8px;padding:16px;min-width:160px;flex:1;">
          <div style="font-size:12px;color:#a16207;">Sem NCM</div>
          <div style="font-size:28px;font-weight:bold;color:#92400e;">${semNcm.length}</div>
        </div>
      </div>`;

      if (semNcm.length > 0) {
        sections += `
        <h3 style="color:#dc2626;margin-top:24px;">⚠️ Produtos sem NCM (Top 20)</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
          <thead><tr style="background:#f5f5f5;">
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Código</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:left;">Descrição</th>
            <th style="border:1px solid #ddd;padding:8px;text-align:right;">Preço Venda</th>
          </tr></thead>
          <tbody>${semNcm.slice(0, 20).map(p => `<tr>
            <td style="border:1px solid #ddd;padding:6px;">${p.codigo}</td>
            <td style="border:1px solid #ddd;padding:6px;">${p.descricao}</td>
            <td style="border:1px solid #ddd;padding:6px;text-align:right;">${(p.venda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>`).join('')}</tbody>
        </table>`;
      }
    }

    if (relatoriosAtivos.includes('estoque_zerado') && estoqueZero.length > 0) {
      sections += `
      <div style="background:#fce7f3;border-radius:8px;padding:16px;min-width:160px;margin:16px 0;">
        <div style="font-size:12px;color:#be185d;">Estoque Zerado</div>
        <div style="font-size:28px;font-weight:bold;color:#9d174d;">${estoqueZero.length}</div>
      </div>
      <h3 style="color:#a16207;margin-top:24px;">📦 Produtos com Estoque Zerado (Top 20)</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
        <thead><tr style="background:#f5f5f5;">
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Código</th>
          <th style="border:1px solid #ddd;padding:8px;text-align:left;">Descrição</th>
        </tr></thead>
        <tbody>${estoqueZero.slice(0, 20).map(p => `<tr>
          <td style="border:1px solid #ddd;padding:6px;">${p.codigo}</td>
          <td style="border:1px solid #ddd;padding:6px;">${p.descricao}</td>
        </tr>`).join('')}</tbody>
      </table>`;
    }

    // List selected report names
    const reportNames = relatoriosAtivos.length > 0
      ? relatoriosAtivos.join(', ')
      : 'Todos os relatórios disponíveis';

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">
      <h2 style="color:#1e40af;">📊 Relatório Semanal - ${nomeEmpresa}</h2>
      <p style="color:#666;">Gerado em ${dataRelatorio}</p>
      <p style="color:#999;font-size:12px;">Relatórios incluídos: ${reportNames}</p>
      ${sections}
      <hr style="margin-top:30px;border:none;border-top:1px solid #eee;" />
      <p style="color:#999;font-size:11px;">Relatório automático do NexusERP • ${nomeEmpresa}</p>
    </div>`;

    const subject = `📊 Relatório Semanal - ${nomeEmpresa} - ${dataRelatorio}`;
    const smtpUrl = `${supabaseUrl}/functions/v1/send-smtp-email`;
    const results: { to: string; ok: boolean; error?: string }[] = [];

    // Send to each recipient
    for (const dest of destinatarios) {
      try {
        const response = await fetch(smtpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            smtp: empresa.smtp_config,
            to: dest,
            subject,
            body: `Relatório semanal do NexusERP para ${nomeEmpresa}`,
            html,
          }),
        });

        const result = await response.json();
        const ok = response.ok && !result.error;

        results.push({ to: dest, ok, error: result.error });

        // Log to email_send_history
        await supabase.from('email_send_history').insert({
          destinatario: dest,
          assunto: subject,
          tipo: 'semanal',
          status: ok ? 'enviado' : 'falhou',
          erro: ok ? null : (result.error || 'Erro desconhecido'),
        });

        console.log(`Relatório semanal ${ok ? 'enviado' : 'FALHOU'} para ${dest}`);
      } catch (err: any) {
        results.push({ to: dest, ok: false, error: err.message });
        await supabase.from('email_send_history').insert({
          destinatario: dest,
          assunto: subject,
          tipo: 'semanal',
          status: 'falhou',
          erro: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro no relatório semanal:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
