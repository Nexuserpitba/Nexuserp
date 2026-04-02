const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://hgkpnfynwpitqkdbmxvo.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhna3BuZnlud3BpdHFrZGJteHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MjAxNjMsImV4cCI6MjA4ODk5NjE2M30.CAaUnA4XuueeeTk5GxNs9CSAr3-EGfuNcGe6HsWu9w0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getEmpresaAtiva() {
  let { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("selecionada", true)
    .maybeSingle();

  if (!data && !error) {
    const fallback = await supabase
      .from("empresas")
      .select("*")
      .limit(1)
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(`Erro ao buscar empresa: ${error.message}`);
  return data;
}

async function getEmpresaById(id) {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Erro ao buscar empresa: ${error.message}`);
  return data;
}

module.exports = { getEmpresaAtiva, getEmpresaById };
