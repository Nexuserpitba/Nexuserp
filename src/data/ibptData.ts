/**
 * Tabela IBPTax - Alíquotas aproximadas de tributos por NCM
 * Fonte: Instituto Brasileiro de Planejamento e Tributação (IBPT)
 * Lei da Transparência Fiscal nº 12.741/2012
 * 
 * Valores em percentual (%) sobre o preço de venda ao consumidor final.
 */

import { supabase } from "@/integrations/supabase/client";

export interface IBPTEntry {
  ncm: string;
  descricao: string;
  federal: number;
  estadual: number;
  municipal: number;
}

// In-memory cache
let ibptCache: IBPTEntry[] = [];
let ibptMap = new Map<string, IBPTEntry>();
let cacheLoaded = false;

/**
 * Built-in fallback data for common NCMs (used when Supabase has no data)
 */
export const ibptData: IBPTEntry[] = [
  // === ALIMENTOS E BEBIDAS ===
  { ncm: "02011000", descricao: "Carnes de bovinos frescas/refrigeradas", federal: 4.20, estadual: 12.00, municipal: 0 },
  { ncm: "02013000", descricao: "Carnes de bovinos desossadas", federal: 4.20, estadual: 12.00, municipal: 0 },
  { ncm: "02071100", descricao: "Carnes de galinhas inteiras", federal: 4.20, estadual: 7.00, municipal: 0 },
  { ncm: "04011000", descricao: "Leite UHT integral", federal: 3.68, estadual: 12.00, municipal: 0 },
  { ncm: "04070000", descricao: "Ovos de galinha", federal: 2.76, estadual: 7.00, municipal: 0 },
  { ncm: "07020000", descricao: "Tomates frescos", federal: 3.68, estadual: 12.00, municipal: 0 },
  { ncm: "09012100", descricao: "Café torrado não descafeinado", federal: 13.45, estadual: 18.00, municipal: 0 },
  { ncm: "10063021", descricao: "Arroz beneficiado", federal: 3.68, estadual: 7.00, municipal: 0 },
  { ncm: "11010010", descricao: "Farinha de trigo", federal: 13.36, estadual: 18.00, municipal: 0 },
  { ncm: "15079011", descricao: "Óleo de soja refinado", federal: 12.59, estadual: 18.00, municipal: 0 },
  { ncm: "17019900", descricao: "Açúcar cristal/refinado", federal: 17.97, estadual: 18.00, municipal: 0 },
  { ncm: "19021100", descricao: "Massas alimentícias (macarrão)", federal: 13.36, estadual: 18.00, municipal: 0 },
  { ncm: "19053100", descricao: "Biscoitos e bolachas", federal: 16.79, estadual: 18.00, municipal: 0 },
  { ncm: "22011000", descricao: "Água mineral natural", federal: 14.85, estadual: 25.00, municipal: 0 },
  { ncm: "22021000", descricao: "Refrigerantes", federal: 19.56, estadual: 25.00, municipal: 0 },
  { ncm: "22030000", descricao: "Cerveja de malte", federal: 21.57, estadual: 25.00, municipal: 0 },
  // === HIGIENE ===
  { ncm: "33051000", descricao: "Xampus", federal: 22.66, estadual: 25.00, municipal: 0 },
  { ncm: "34022000", descricao: "Sabão em pó/detergente", federal: 14.85, estadual: 18.00, municipal: 0 },
  { ncm: "48181000", descricao: "Papel higiênico", federal: 19.03, estadual: 18.00, municipal: 0 },
  // === ELETRÔNICOS ===
  { ncm: "85171200", descricao: "Celulares/smartphones", federal: 16.47, estadual: 18.00, municipal: 0 },
  { ncm: "85287200", descricao: "Televisores LED/LCD", federal: 21.17, estadual: 25.00, municipal: 0 },
  // === COMBUSTÍVEIS ===
  { ncm: "27101259", descricao: "Gasolina comum", federal: 13.02, estadual: 29.00, municipal: 0 },
  { ncm: "27111300", descricao: "GLP (gás de cozinha)", federal: 9.76, estadual: 17.00, municipal: 0 },
];

// Initialize fallback map
function initFallbackMap() {
  ibptData.forEach(entry => ibptMap.set(entry.ncm.replace(/\D/g, ""), entry));
  ibptCache = [...ibptData];
}
initFallbackMap();

/**
 * Load IBPT data from Supabase into memory cache
 */
export async function loadIBPTFromSupabase(): Promise<IBPTEntry[]> {
  try {
    // Supabase has 1000 row default limit, paginate
    let allData: IBPTEntry[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await (supabase.from("ibpt_dados" as any) as any)
        .select("ncm, descricao, federal, estadual, municipal")
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data.map((r: any) => ({
          ncm: r.ncm,
          descricao: r.descricao,
          federal: Number(r.federal),
          estadual: Number(r.estadual),
          municipal: Number(r.municipal),
        })));
        from += pageSize;
        if (data.length < pageSize) hasMore = false;
      }
    }

    if (allData.length > 0) {
      ibptCache = allData;
      ibptMap.clear();
      allData.forEach(entry => ibptMap.set(entry.ncm.replace(/\D/g, ""), entry));
      cacheLoaded = true;
      return allData;
    }
  } catch (err) {
    console.error("Error loading IBPT from Supabase:", err);
  }

  // Fallback to built-in
  if (!cacheLoaded) {
    initFallbackMap();
  }
  return ibptCache;
}

/**
 * Get current IBPT data (cached)
 */
export function getIBPTCache(): IBPTEntry[] {
  return ibptCache;
}

export function isCacheFromSupabase(): boolean {
  return cacheLoaded;
}

// Legacy compat
const IBPT_STORAGE_KEY = "ibpt-imported-data";
export function getImportedIBPT(): IBPTEntry[] {
  try {
    const stored = localStorage.getItem(IBPT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* erro ignorado */ }
  return [];
}
export function setImportedIBPT(data: IBPTEntry[]) {
  localStorage.setItem(IBPT_STORAGE_KEY, JSON.stringify(data));
  ibptMap.clear();
  data.forEach(entry => ibptMap.set(entry.ncm.replace(/\D/g, ""), entry));
  ibptCache = data;
}
export function clearImportedIBPT() {
  localStorage.removeItem(IBPT_STORAGE_KEY);
  initFallbackMap();
}

/**
 * Busca alíquotas IBPT por NCM com fallback por prefixo
 */
export function getIBPTByNCM(ncm: string): IBPTEntry | null {
  if (!ncm) return null;
  const clean = ncm.replace(/\D/g, "");

  if (ibptMap.has(clean)) return ibptMap.get(clean)!;

  for (let len = 6; len >= 4; len -= 2) {
    const prefix = clean.substring(0, len);
    for (const [key, entry] of ibptMap) {
      if (key.startsWith(prefix)) return entry;
    }
  }

  return null;
}

/**
 * Calcula tributos aproximados para um item de venda.
 */
export function calcularTributosItem(
  ncm: string,
  valorTotal: number
): { federal: number; estadual: number; municipal: number; total: number; percentual: number } {
  const ibpt = getIBPTByNCM(ncm);

  const pctFederal = ibpt?.federal ?? 15.28;
  const pctEstadual = ibpt?.estadual ?? 17.00;
  const pctMunicipal = ibpt?.municipal ?? 0;
  const pctTotal = pctFederal + pctEstadual + pctMunicipal;

  return {
    federal: valorTotal * pctFederal / 100,
    estadual: valorTotal * pctEstadual / 100,
    municipal: valorTotal * pctMunicipal / 100,
    total: valorTotal * pctTotal / 100,
    percentual: pctTotal,
  };
}
