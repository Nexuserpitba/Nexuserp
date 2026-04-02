import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IBPTRow {
  ncm: string;
  descricao: string;
  federal: number;
  estadual: number;
  municipal: number;
  versao: string;
}

function parseCSV(text: string): IBPTRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.replace(/"/g, "").trim().toLowerCase());

  const iNCM = header.findIndex((h) => h === "codigo" || h === "ncm" || h === "código");
  const iDesc = header.findIndex((h) => h.includes("descri"));
  const iFed = header.findIndex((h) => h.includes("nacionalfederal") || h.includes("federal") || h.includes("aliqnac"));
  const iEst = header.findIndex((h) => h.includes("estadual") || h.includes("icms"));
  const iMun = header.findIndex((h) => h.includes("municipal") || h.includes("iss"));
  const iTipo = header.findIndex((h) => h === "tipo" || h === "ex");

  if (iNCM === -1 || iFed === -1) {
    throw new Error("CSV missing required columns (codigo/ncm and federal/nacionalfederal)");
  }

  const entries: IBPTRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.replace(/"/g, "").trim());
    if (!cols[iNCM]) continue;
    if (iTipo !== -1 && cols[iTipo] === "1") continue;

    const ncm = cols[iNCM].replace(/\D/g, "");
    if (ncm.length < 4) continue;

    entries.push({
      ncm,
      descricao: iDesc !== -1 ? cols[iDesc] : "",
      federal: parseFloat((cols[iFed] || "0").replace(",", ".")) || 0,
      estadual: iEst !== -1 ? parseFloat((cols[iEst] || "0").replace(",", ".")) || 0 : 0,
      municipal: iMun !== -1 ? parseFloat((cols[iMun] || "0").replace(",", ".")) || 0 : 0,
      versao: "",
    });
  }
  return entries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check - only admins/gerentes
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["administrador", "gerente"])
      .limit(1);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem atualizar a tabela IBPT" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { csv_content, versao } = body;

    if (!csv_content) {
      return new Response(JSON.stringify({ error: "csv_content é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entries = parseCSV(csv_content);
    if (entries.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum registro válido encontrado no CSV" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set version
    const ver = versao || new Date().toISOString().slice(0, 10);
    entries.forEach((e) => (e.versao = ver));

    // Deduplicate entries by NCM (keep last occurrence)
    const uniqueMap = new Map<string, IBPTRow>();
    for (const e of entries) uniqueMap.set(e.ncm, e);
    const uniqueEntries = Array.from(uniqueMap.values());

    // Clear existing and insert in batches
    await adminClient.from("ibpt_dados").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const BATCH_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < uniqueEntries.length; i += BATCH_SIZE) {
      const batch = uniqueEntries.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await adminClient.from("ibpt_dados").insert(batch);
      if (insertError) {
        console.error("Batch insert error:", insertError);
        const { error: upsertError } = await adminClient
          .from("ibpt_dados")
          .upsert(batch, { onConflict: "ncm" });
        if (upsertError) throw upsertError;
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${inserted.toLocaleString()} NCMs importados com sucesso`,
        total: inserted,
        versao: ver,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("upload-ibpt error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
