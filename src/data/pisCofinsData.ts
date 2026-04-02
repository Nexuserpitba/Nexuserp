export interface PisCofinsEntry {
  codigo: string;
  descricao: string;
  tipo: "PIS" | "COFINS" | "Ambos";
  categoria: "Cumulativo" | "Não Cumulativo" | "Substituição" | "Alíquota Zero" | "Isento/Suspenso" | "Outros";
}

export const pisCofinsData: PisCofinsEntry[] = [
  // CST PIS/COFINS — Saídas
  { codigo: "01", descricao: "Operação tributável com alíquota básica", tipo: "Ambos", categoria: "Cumulativo" },
  { codigo: "02", descricao: "Operação tributável com alíquota diferenciada", tipo: "Ambos", categoria: "Cumulativo" },
  { codigo: "03", descricao: "Operação tributável com alíquota por unidade de medida de produto", tipo: "Ambos", categoria: "Cumulativo" },
  { codigo: "04", descricao: "Operação tributável — monofásica — revenda a alíquota zero", tipo: "Ambos", categoria: "Alíquota Zero" },
  { codigo: "05", descricao: "Operação tributável por substituição tributária", tipo: "Ambos", categoria: "Substituição" },
  { codigo: "06", descricao: "Operação tributável — alíquota zero", tipo: "Ambos", categoria: "Alíquota Zero" },
  { codigo: "07", descricao: "Operação isenta da contribuição", tipo: "Ambos", categoria: "Isento/Suspenso" },
  { codigo: "08", descricao: "Operação sem incidência da contribuição", tipo: "Ambos", categoria: "Isento/Suspenso" },
  { codigo: "09", descricao: "Operação com suspensão da contribuição", tipo: "Ambos", categoria: "Isento/Suspenso" },
  // CST PIS/COFINS — Entradas (Créditos)
  { codigo: "50", descricao: "Operação com direito a crédito — vinculada exclusivamente a receita tributada no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "51", descricao: "Operação com direito a crédito — vinculada exclusivamente a receita não tributada no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "52", descricao: "Operação com direito a crédito — vinculada exclusivamente a receita de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "53", descricao: "Operação com direito a crédito — vinculada a receitas tributadas e não tributadas no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "54", descricao: "Operação com direito a crédito — vinculada a receitas tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "55", descricao: "Operação com direito a crédito — vinculada a receitas não tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "56", descricao: "Operação com direito a crédito — vinculada a receitas tributadas e não tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "60", descricao: "Crédito presumido — operação de aquisição vinculada exclusivamente a receita tributada no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "61", descricao: "Crédito presumido — operação de aquisição vinculada exclusivamente a receita não tributada no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "62", descricao: "Crédito presumido — operação de aquisição vinculada exclusivamente a receita de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "63", descricao: "Crédito presumido — operação de aquisição vinculada a receitas tributadas e não tributadas no mercado interno", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "64", descricao: "Crédito presumido — operação de aquisição vinculada a receitas tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "65", descricao: "Crédito presumido — operação de aquisição vinculada a receitas não tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "66", descricao: "Crédito presumido — operação de aquisição vinculada a receitas tributadas e não tributadas no mercado interno e de exportação", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "67", descricao: "Crédito presumido — outras operações", tipo: "Ambos", categoria: "Não Cumulativo" },
  { codigo: "70", descricao: "Operação de aquisição sem direito a crédito", tipo: "Ambos", categoria: "Outros" },
  { codigo: "71", descricao: "Operação de aquisição com isenção", tipo: "Ambos", categoria: "Isento/Suspenso" },
  { codigo: "72", descricao: "Operação de aquisição com suspensão", tipo: "Ambos", categoria: "Isento/Suspenso" },
  { codigo: "73", descricao: "Operação de aquisição a alíquota zero", tipo: "Ambos", categoria: "Alíquota Zero" },
  { codigo: "74", descricao: "Operação de aquisição sem incidência da contribuição", tipo: "Ambos", categoria: "Isento/Suspenso" },
  { codigo: "75", descricao: "Operação de aquisição por substituição tributária", tipo: "Ambos", categoria: "Substituição" },
  { codigo: "98", descricao: "Outras operações de entrada", tipo: "Ambos", categoria: "Outros" },
  { codigo: "99", descricao: "Outras operações", tipo: "Ambos", categoria: "Outros" },
];
