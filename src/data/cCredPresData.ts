export interface CCredPresEntry {
  codigo: string;
  descricao: string;
  categoria: "Crédito Presumido" | "Crédito Outorgado" | "Transição" | "Outros";
}

export const cCredPresData: CCredPresEntry[] = [
  { codigo: "0", descricao: "Sem crédito presumido", categoria: "Outros" },
  { codigo: "1", descricao: "Crédito presumido — Operações com produtos agropecuários in natura (art. 27, LC 214/2025)", categoria: "Crédito Presumido" },
  { codigo: "2", descricao: "Crédito presumido — Aquisição de produtor rural pessoa física não contribuinte", categoria: "Crédito Presumido" },
  { codigo: "3", descricao: "Crédito presumido — Aquisição de produtor rural pessoa física contribuinte optante por regime simplificado", categoria: "Crédito Presumido" },
  { codigo: "4", descricao: "Crédito presumido — Resíduos e demais materiais recicláveis (art. 28, LC 214/2025)", categoria: "Crédito Presumido" },
  { codigo: "5", descricao: "Crédito presumido — Serviços de transporte público coletivo de passageiros rodoviário e metroviário", categoria: "Crédito Presumido" },
  { codigo: "6", descricao: "Crédito presumido — Prestador de serviço de transporte de passageiros — regime específico", categoria: "Crédito Presumido" },
  { codigo: "7", descricao: "Crédito presumido — Aquisição de bens e serviços de optante pelo Simples Nacional", categoria: "Crédito Presumido" },
  { codigo: "8", descricao: "Crédito presumido — Operações com bens imóveis — regime específico", categoria: "Crédito Presumido" },
  { codigo: "9", descricao: "Crédito presumido — Serviços financeiros — regime específico", categoria: "Crédito Presumido" },
  { codigo: "10", descricao: "Crédito presumido — Combustíveis — regime específico (art. 172, LC 214/2025)", categoria: "Crédito Presumido" },
  { codigo: "11", descricao: "Crédito presumido — Cooperativas — regime específico", categoria: "Crédito Presumido" },
  { codigo: "12", descricao: "Crédito presumido — Medicamentos e dispositivos médicos (art. 149, LC 214/2025)", categoria: "Crédito Presumido" },
  { codigo: "13", descricao: "Crédito outorgado — ZFM e áreas de livre comércio (art. 24, LC 214/2025)", categoria: "Crédito Outorgado" },
  { codigo: "14", descricao: "Crédito outorgado — SUDAM/SUDENE — desenvolvimento regional", categoria: "Crédito Outorgado" },
  { codigo: "15", descricao: "Crédito presumido — Transição 2027–2028 — manutenção proporcional de créditos acumulados ICMS", categoria: "Transição" },
  { codigo: "16", descricao: "Crédito presumido — Transição 2029–2032 — aproveitamento parcial de saldos credores pré-reforma", categoria: "Transição" },
  { codigo: "17", descricao: "Crédito presumido — Transição — bens de ativo imobilizado adquiridos antes da vigência", categoria: "Transição" },
  { codigo: "18", descricao: "Crédito presumido — Outros casos previstos em legislação específica", categoria: "Outros" },
  { codigo: "99", descricao: "Crédito presumido — Outros não classificados", categoria: "Outros" },
];
