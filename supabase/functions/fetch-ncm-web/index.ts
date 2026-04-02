import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user with anon client
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { codigo, descricao, bulk, salvar } = await req.json().catch(() => ({}));

    // Use service role client for DB writes
    const supabaseClient = createClient(supabaseUrl, serviceKey);

    // Bulk mode: fetch all NCMs from BrasilAPI
    if (bulk) {
      console.log("Bulk fetch: fetching all NCMs from BrasilAPI...");
      const response = await fetch("https://brasilapi.com.br/api/ncm/v1", {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `BrasilAPI retornou status ${response.status}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : [data];
      console.log(`Fetched ${items.length} NCMs from BrasilAPI`);

      if (salvar) {
        // Deduplicate by codigo before upserting
        const uniqueMap = new Map();
        for (const item of items) {
          const codigo = item.codigo || item.code || "";
          if (codigo) uniqueMap.set(codigo, item);
        }
        const uniqueItems = Array.from(uniqueMap.values());

        // Batch upsert to Supabase in chunks of 500
        const CHUNK = 500;
        let saved = 0;
        for (let i = 0; i < uniqueItems.length; i += CHUNK) {
          const chunk = uniqueItems.slice(i, i + CHUNK).map((item: any) => ({
            codigo: item.codigo || item.code || "",
            descricao: item.descricao || item.description || "",
            data_inicio: item.data_inicio || "",
            data_fim: item.data_fim || "",
            tipo_ato: item.tipo_ato || "",
            numero_ato: item.numero_ato || "",
            ano_ato: item.ano_ato || "",
            updated_at: new Date().toISOString(),
          }));

          const { error } = await supabaseClient
            .from("ncm_web")
            .upsert(chunk, { onConflict: "codigo", ignoreDuplicates: true });

          if (error) {
            console.error("Upsert error:", error);
          } else {
            saved += chunk.length;
          }
        }
        console.log(`Saved ${saved} NCMs to database`);
        return new Response(
          JSON.stringify({ success: true, total: items.length, saved }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, total: items.length, data: items.slice(0, 100) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search mode
    let url = "https://brasilapi.com.br/api/ncm/v1";
    if (codigo) {
      url += `?code=${encodeURIComponent(codigo)}`;
    } else if (descricao) {
      url += `?search=${encodeURIComponent(descricao)}`;
    }

    console.log("Fetching NCM from:", url);

    const response = await fetch(url, { headers: { "Accept": "application/json" } });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `BrasilAPI retornou status ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : [data];

    const normalized = items.map((item: any) => ({
      codigo: item.codigo || item.code || "",
      descricao: item.descricao || item.description || "",
      data_inicio: item.data_inicio || "",
      data_fim: item.data_fim || "",
      tipo_ato: item.tipo_ato || "",
      numero_ato: item.numero_ato || "",
      ano_ato: item.ano_ato || "",
    }));

    // Save to DB if requested
    if (salvar && normalized.length > 0) {
      const toUpsert = normalized.map((n: any) => ({
        ...n,
        updated_at: new Date().toISOString(),
      }));
      // Deduplicate before upsert
      const uniqueNorm = new Map();
      for (const n of toUpsert) uniqueNorm.set(n.codigo, n);
      const { error } = await supabaseClient
        .from("ncm_web")
        .upsert(Array.from(uniqueNorm.values()), { onConflict: "codigo", ignoreDuplicates: true });
      if (error) console.error("Upsert error:", error);
    }

    return new Response(
      JSON.stringify({ success: true, data: normalized, total: normalized.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching NCM:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
