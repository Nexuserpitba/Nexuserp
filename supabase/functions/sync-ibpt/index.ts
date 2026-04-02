// Edge Function - Sincronização automática IBPT (via API pública)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ erro: "Token ausente" }, 401);
    }
    const token = authHeader.substring(7);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ erro: "Token inválido" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { uf = "SP", acao = "sync", ncm_busca } = body;
    const ufUpper = uf.toUpperCase();

    // ---- Consulta individual ----
    if (acao === "consulta" && ncm_busca) {
      const ncmClean = ncm_busca.replace(/\D/g, "");
      const res = await fetch(
        `https://api-ibpt.seunegocionanuvem.com.br/api_ibpt.php?codigo=${ncmClean}&uf=${ufUpper}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return json({ erro: `API retornou ${res.status}` }, 502);
      const data = await res.json();
      return json({ sucesso: true, dados: data });
    }

    // ---- Limpar ----
    if (acao === "limpar") {
      await supabase.from("ibpt_dados").delete().neq("ncm", "___");
      return json({ sucesso: true, mensagem: "Tabela limpa" });
    }

    // ---- Sync completo via bulk download ----
    console.log(`Iniciando sync IBPT para UF: ${ufUpper}`);

    // 1. Baixar todos os NCMs de uma vez
    const ibptRes = await fetch(
      `https://api-ibpt.seunegocionanuvem.com.br/api_ibpt_json.php?uf=${ufUpper}`,
      { signal: AbortSignal.timeout(120000) }
    );

    if (!ibptRes.ok) {
      return json({ erro: `API IBPT retornou ${ibptRes.status}` }, 502);
    }

    const ibptData = await ibptRes.json();
    const items = ibptData.ncm || [];
    const versao = ibptData.versao || "desconhecida";
    const totalAPI = ibptData.total || items.length;

    console.log(`Recebidos ${items.length} NCMs, versão ${versao}`);

    // 2. Mapear para formato do banco
    const entries = items
      .filter((item: any) => item.codigo && item.codigo.length >= 8)
      .map((item: any) => ({
        ncm: String(item.codigo).replace(/\D/g, "").padStart(8, "0"),
        descricao: item.descricao || "",
        federal: parseFloat(item.nacionalfederal || "0"),
        estadual: parseFloat(item.estadual || "0"),
        municipal: parseFloat(item.municipal || "0"),
        versao: versao,
      }));

    // 3. Upsert em lotes de 500
    let totalImported = 0;
    let batchErrors = 0;
    const BATCH_SIZE = 500;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("ibpt_dados")
        .upsert(batch, { onConflict: "ncm", ignoreDuplicates: false });

      if (error) {
        batchErrors++;
        console.error(`Erro no lote ${Math.floor(i / BATCH_SIZE)}: ${error.message}`);
      } else {
        totalImported += batch.length;
      }
    }

    // 4. Atualizar config
    await supabase.from("ibpt_config").update({
      ultima_sinc: new Date().toISOString(),
      total_registros: totalImported,
      status: "sincronizado",
      updated_at: new Date().toISOString(),
    }).eq("id", "00000000-0000-0000-0000-000000000001");

    // 5. Log
    await supabase.from("audit_logs").insert({
      action: "ibpt_sync",
      user_id: userData.user.id,
      user_name: userData.user.email,
      detalhes: { uf: ufUpper, total: totalImported, versao, erros: batchErrors },
    });

    return json({
      sucesso: true,
      total: totalImported,
      total_api: totalAPI,
      versao,
      erros: batchErrors,
      uf: ufUpper,
      fonte: "IBPT (api-ibpt.seunegocionanuvem.com.br)",
    });
  } catch (err: any) {
    console.error("Sync IBPT error:", err);
    return json({ erro: "Erro interno", detalhe: err.message }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
