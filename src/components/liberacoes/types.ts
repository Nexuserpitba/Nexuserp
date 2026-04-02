import { supabase } from "@/integrations/supabase/client";

export interface LogLiberacao {
  id: string;
  data: string;
  operador: string;
  cliente: string;
  clienteDoc: string;
  valorAutorizado: number;
  limiteDisponivel: number;
  excedente: number;
  motivo?: string;
}

export async function loadLogs(): Promise<LogLiberacao[]> {
  try {
    const { data, error } = await supabase
      .from("liberacoes_gerenciais")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      data: row.created_at,
      operador: row.operador || "",
      cliente: row.cliente || "",
      clienteDoc: row.cliente_doc || "",
      valorAutorizado: Number(row.valor_autorizado) || 0,
      limiteDisponivel: Number(row.limite_disponivel) || 0,
      excedente: Number(row.excedente) || 0,
      motivo: row.motivo || "",
    }));
  } catch {
    return [];
  }
}

export async function insertLiberacao(entry: Omit<LogLiberacao, "id" | "data">) {
  await supabase.from("liberacoes_gerenciais").insert({
    operador: entry.operador,
    cliente: entry.cliente,
    cliente_doc: entry.clienteDoc,
    valor_autorizado: entry.valorAutorizado,
    limite_disponivel: entry.limiteDisponivel,
    excedente: entry.excedente,
    motivo: entry.motivo || "",
  });
}

export async function clearLiberacoes() {
  await supabase.from("liberacoes_gerenciais").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 60%, 55%)",
];
