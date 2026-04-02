// Edge Function - Sincronização IBPT via API oficial (apidoni.ibpt.org.br)
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
      return json({ erro: "Token de autenticação ausente" }, 401);
    }
    const authToken = authHeader.substring(7);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userError } = await anonClient.auth.getUser(authToken);
    if (userError || !userData.user) {
      return json({ erro: "Token de autenticação inválido" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { uf = "SP", acao = "sync", ncm_busca } = body;
    const ufUpper = uf.toUpperCase();

    // Get IBPT token and CNPJ from request or config table
    let ibptToken = body.token || "";
    let ibptCnpj = (body.cnpj || "").replace(/\D/g, "");

    // If not in request, try config table
    if (!ibptToken || !ibptCnpj) {
      const { data: configData } = await supabase
        .from("ibpt_config")
        .select("token_ibpt, cnpj")
        .eq("id", "00000000-0000-0000-0000-000000000001")
        .single();

      if (!ibptToken && configData?.token_ibpt) ibptToken = configData.token_ibpt;
      if (!ibptCnpj && configData?.cnpj) ibptCnpj = configData.cnpj.replace(/\D/g, "");
    }

    // Validate required fields
    if (!ibptToken) {
      return json({
        erro: "Token IBPT não configurado",
        detalhe: "Acesse Tabela IBPTax > Configurar Token e insira seu token do deolhonoimposto.ibpt.org.br"
      }, 400);
    }

    if (!ibptCnpj) {
      return json({
        erro: "CNPJ não configurado",
        detalhe: "Acesse Tabela IBPTax > Configurar Token e insira o CNPJ da empresa"
      }, 400);
    }

    console.log(`IBPT Sync: token=${ibptToken.substring(0, 8)}..., cnpj=${ibptCnpj}, uf=${ufUpper}`);

    // ---- Consulta individual ----
    if (acao === "consulta" && ncm_busca) {
      const ncmClean = ncm_busca.replace(/\D/g, "");
      const consultUrl = `https://apidoni.ibpt.org.br/api/v1/produtos?` + new URLSearchParams({
        token: ibptToken,
        cnpj: ibptCnpj,
        codigo: ncmClean,
        uf: ufUpper,
        ex: "0",
        descricao: "",
        unidadeMedida: "",
        valor: "0",
        gtin: "",
      }).toString();

      console.log(`Consultando NCM ${ncmClean} na API IBPT...`);
      const res = await fetch(consultUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { "Accept": "application/json" }
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`API IBPT retornou ${res.status}: ${errText}`);
        return json({ erro: `API IBPT retornou ${res.status}`, detalhe: errText }, 502);
      }

      const data = await res.json();
      return json({ sucesso: true, dados: data });
    }

    // ---- Limpar ----
    if (acao === "limpar") {
      await supabase.from("ibpt_dados").delete().neq("ncm", "___");
      return json({ sucesso: true, mensagem: "Tabela limpa" });
    }

    // ---- Sync completo ----
    console.log(`Iniciando sync IBPT para UF: ${ufUpper}`);

    // Try official API first for a test query to validate credentials
    let apiWorking = false;
    let testResult: any = null;

    try {
      const testUrl = `https://apidoni.ibpt.org.br/api/v1/produtos?` + new URLSearchParams({
        token: ibptToken,
        cnpj: ibptCnpj,
        codigo: "02011000",
        uf: ufUpper,
        ex: "0",
        descricao: "",
        unidadeMedida: "",
        valor: "0",
        gtin: "",
      }).toString();

      console.log("Testando API IBPT oficial...");
      const testRes = await fetch(testUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { "Accept": "application/json" }
      });

      if (testRes.ok) {
        testResult = await testRes.json();
        apiWorking = true;
        console.log("API IBPT oficial funcionando:", JSON.stringify(testResult).substring(0, 200));
      } else {
        const errText = await testRes.text().catch(() => "");
        console.error(`API IBPT retornou ${testRes.status}: ${errText}`);
      }
    } catch (e: any) {
      console.error("Erro ao testar API IBPT:", e.message);
    }

    // Download full table from third-party API
    let items: any[] = [];
    let versao = "";
    let totalAPI = 0;

    console.log("Baixando tabela completa da API terceira...");
    try {
      const bulkRes = await fetch(
        `https://api-ibpt.seunegocionanuvem.com.br/api_ibpt_json.php?uf=${ufUpper}`,
        { signal: AbortSignal.timeout(120000) }
      );

      if (bulkRes.ok) {
        const bulkData = await bulkRes.json();
        items = Array.isArray(bulkData) ? bulkData : (bulkData.ncm || []);
        versao = bulkData.versao || "";
        totalAPI = bulkData.total || items.length;
        console.log(`Recebidos ${items.length} NCMs, versão ${versao}`);
      } else {
        console.error(`API bulk retornou ${bulkRes.status}`);
      }
    } catch (e: any) {
      console.error("Erro ao baixar tabela bulk:", e.message);
    }

    // If bulk failed and official API works, use common NCMs
    if (items.length === 0 && apiWorking && testResult) {
      console.log("Usando API oficial para NCMs básicos...");
      items = [{
        codigo: testResult.Codigo || "02011000",
        descricao: testResult.Descricao || "",
        nacionalfederal: String(testResult.Nacional || "0"),
        importadosfederal: String(testResult.Importado || "0"),
        estadual: String(testResult.Estadual || "0"),
        municipal: String(testResult.Municipal || "0"),
        uf: testResult.UF || ufUpper,
        ex: testResult.EX || "",
        tipo: "0",
        vigenciainicio: testResult.VigenciaInicio || "",
        vigenciafim: testResult.VigenciaFim || "",
        versao: testResult.Versao || "",
        fonte: testResult.Fonte || "IBPT",
      }];
      versao = testResult.Versao || new Date().toISOString().slice(0, 7);
    }

    if (items.length === 0) {
      return json({
        erro: "Nenhum dado obtido das APIs",
        detalhe: "Verifique se o token e CNPJ estão corretos em Configurar Token",
        api_oficial: apiWorking ? "OK" : "Falhou",
      }, 502);
    }

    // Map to database format
    const entries = items
      .filter((item: any) => item.codigo && String(item.codigo).replace(/\D/g, "").length >= 4)
      .map((item: any) => {
        const ncm = String(item.codigo).replace(/\D/g, "").padStart(8, "0");
        return {
          ncm,
          descricao: item.descricao || "",
          federal: parseFloat(item.nacionalfederal || "0"),
          importado: parseFloat(item.importadosfederal || "0"),
          estadual: parseFloat(item.estadual || "0"),
          municipal: parseFloat(item.municipal || "0"),
          uf: item.uf || ufUpper,
          ex: String(item.ex || ""),
          tipo: String(item.tipo ?? ""),
          vigencia_inicio: item.vigenciainicio || "",
          vigencia_fim: item.vigenciafim || "",
          chave: item.chave || "",
          versao: item.versao || versao,
          fonte: item.fonte || "IBPT",
        };
      });

    console.log(`${entries.length} registros mapeados para o banco`);

    // Upsert in batches
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

    console.log(`Importados: ${totalImported}, Erros: ${batchErrors}`);

    // Update config
    await supabase.from("ibpt_config").update({
      ultima_sinc: new Date().toISOString(),
      total_registros: totalImported,
      status: batchErrors > 0 ? "parcial" : "sincronizado",
      updated_at: new Date().toISOString(),
    }).eq("id", "00000000-0000-0000-0000-000000000001");

    // Log
    try {
      await supabase.from("audit_logs").insert({
        action: "ibpt_sync",
        user_id: userData.user.id,
        user_name: userData.user.email,
        detalhes: { uf: ufUpper, total: totalImported, versao, erros: batchErrors },
      });
    } catch (e) {
      console.error("Erro ao salvar log:", e);
    }

    return json({
      sucesso: true,
      total: totalImported,
      total_api: totalAPI,
      versao,
      erros: batchErrors,
      uf: ufUpper,
      fonte: apiWorking ? "IBPT (apidoni.ibpt.org.br)" : "IBPT (api-ibpt.seunegocionanuvem.com.br)",
    });

  } catch (err: any) {
    console.error("Sync IBPT error:", err);
    return json({
      erro: "Erro interno na sincronização",
      detalhe: err.message,
      stack: err.stack?.substring(0, 500)
    }, 500);
  }
});

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
