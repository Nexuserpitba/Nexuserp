export interface CstEntry {
  codigo: string;
  descricao: string;
  imposto: "ICMS" | "IPI" | "PIS" | "COFINS";
}

export interface OrigemMercadoriaEntry {
  codigo: string;
  descricao: string;
}

/**
 * Tabela A — Origem da Mercadoria ou Serviço
 * Conforme Ajuste SINIEF 20/2012, vigente a partir de 01/01/2013.
 * O código de origem compõe o primeiro dígito do CST (campo orig na NF-e).
 */
export const origemMercadoriaData: OrigemMercadoriaEntry[] = [
  { codigo: "0", descricao: "Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8" },
  { codigo: "1", descricao: "Estrangeira — Importação direta, exceto a indicada no código 6" },
  { codigo: "2", descricao: "Estrangeira — Adquirida no mercado interno, exceto a indicada no código 7" },
  { codigo: "3", descricao: "Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%" },
  { codigo: "4", descricao: "Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos (PPB) de que tratam o Decreto-Lei nº 288/67 e as Leis nºs 8.248/91, 8.387/91, 10.176/01 e 11.484/07" },
  { codigo: "5", descricao: "Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%" },
  { codigo: "6", descricao: "Estrangeira — Importação direta, sem similar nacional, constante em lista de Resolução CAMEX e gás natural" },
  { codigo: "7", descricao: "Estrangeira — Adquirida no mercado interno, sem similar nacional, constante em lista de Resolução CAMEX e gás natural" },
  { codigo: "8", descricao: "Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%" },
];

export const cstData: CstEntry[] = [
  // ===== CST ICMS =====
  { codigo: "00", descricao: "Tributada integralmente", imposto: "ICMS" },
  { codigo: "10", descricao: "Tributada e com cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "20", descricao: "Com redução de base de cálculo", imposto: "ICMS" },
  { codigo: "30", descricao: "Isenta ou não tributada e com cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "40", descricao: "Isenta", imposto: "ICMS" },
  { codigo: "41", descricao: "Não tributada", imposto: "ICMS" },
  { codigo: "50", descricao: "Suspensão", imposto: "ICMS" },
  { codigo: "51", descricao: "Diferimento", imposto: "ICMS" },
  { codigo: "60", descricao: "ICMS cobrado anteriormente por substituição tributária", imposto: "ICMS" },
  { codigo: "70", descricao: "Com redução de base de cálculo e cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "90", descricao: "Outras", imposto: "ICMS" },

  // ===== CSOSN (Simples Nacional) =====
  { codigo: "101", descricao: "Tributada pelo Simples Nacional com permissão de crédito", imposto: "ICMS" },
  { codigo: "102", descricao: "Tributada pelo Simples Nacional sem permissão de crédito", imposto: "ICMS" },
  { codigo: "103", descricao: "Isenção do ICMS no Simples Nacional para faixa de receita bruta", imposto: "ICMS" },
  { codigo: "201", descricao: "Tributada pelo Simples Nacional com permissão de crédito e com cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "202", descricao: "Tributada pelo Simples Nacional sem permissão de crédito e com cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "203", descricao: "Isenção do ICMS no Simples Nacional para faixa de receita bruta e com cobrança do ICMS por substituição tributária", imposto: "ICMS" },
  { codigo: "300", descricao: "Imune", imposto: "ICMS" },
  { codigo: "400", descricao: "Não tributada pelo Simples Nacional", imposto: "ICMS" },
  { codigo: "500", descricao: "ICMS cobrado anteriormente por substituição tributária (substituído) ou por antecipação", imposto: "ICMS" },
  { codigo: "900", descricao: "Outros (Simples Nacional)", imposto: "ICMS" },

  // ===== CST IPI =====
  { codigo: "00", descricao: "Entrada com recuperação de crédito", imposto: "IPI" },
  { codigo: "01", descricao: "Entrada tributada com alíquota zero", imposto: "IPI" },
  { codigo: "02", descricao: "Entrada isenta", imposto: "IPI" },
  { codigo: "03", descricao: "Entrada não tributada", imposto: "IPI" },
  { codigo: "04", descricao: "Entrada imune", imposto: "IPI" },
  { codigo: "05", descricao: "Entrada com suspensão", imposto: "IPI" },
  { codigo: "49", descricao: "Outras entradas", imposto: "IPI" },
  { codigo: "50", descricao: "Saída tributada", imposto: "IPI" },
  { codigo: "51", descricao: "Saída tributada com alíquota zero", imposto: "IPI" },
  { codigo: "52", descricao: "Saída isenta", imposto: "IPI" },
  { codigo: "53", descricao: "Saída não tributada", imposto: "IPI" },
  { codigo: "54", descricao: "Saída imune", imposto: "IPI" },
  { codigo: "55", descricao: "Saída com suspensão", imposto: "IPI" },
  { codigo: "99", descricao: "Outras saídas", imposto: "IPI" },

  // ===== CST PIS =====
  { codigo: "01", descricao: "Operação tributável com alíquota básica", imposto: "PIS" },
  { codigo: "02", descricao: "Operação tributável com alíquota diferenciada", imposto: "PIS" },
  { codigo: "03", descricao: "Operação tributável com alíquota por unidade de medida de produto", imposto: "PIS" },
  { codigo: "04", descricao: "Operação tributável monofásica - revenda a alíquota zero", imposto: "PIS" },
  { codigo: "05", descricao: "Operação tributável por substituição tributária", imposto: "PIS" },
  { codigo: "06", descricao: "Operação tributável a alíquota zero", imposto: "PIS" },
  { codigo: "07", descricao: "Operação isenta da contribuição", imposto: "PIS" },
  { codigo: "08", descricao: "Operação sem incidência da contribuição", imposto: "PIS" },
  { codigo: "09", descricao: "Operação com suspensão da contribuição", imposto: "PIS" },
  { codigo: "49", descricao: "Outras operações de saída", imposto: "PIS" },
  { codigo: "50", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita tributada no mercado interno", imposto: "PIS" },
  { codigo: "51", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita não tributada no mercado interno", imposto: "PIS" },
  { codigo: "52", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita de exportação", imposto: "PIS" },
  { codigo: "53", descricao: "Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno", imposto: "PIS" },
  { codigo: "54", descricao: "Operação com direito a crédito - vinculada a receitas tributadas no mercado interno e de exportação", imposto: "PIS" },
  { codigo: "55", descricao: "Operação com direito a crédito - vinculada a receitas não-tributadas no mercado interno e de exportação", imposto: "PIS" },
  { codigo: "56", descricao: "Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno, e de exportação", imposto: "PIS" },
  { codigo: "60", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita tributada no mercado interno", imposto: "PIS" },
  { codigo: "61", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita não-tributada no mercado interno", imposto: "PIS" },
  { codigo: "62", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita de exportação", imposto: "PIS" },
  { codigo: "63", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno", imposto: "PIS" },
  { codigo: "64", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas no mercado interno e de exportação", imposto: "PIS" },
  { codigo: "65", descricao: "Crédito presumido - operação de aquisição vinculada a receitas não-tributadas no mercado interno e de exportação", imposto: "PIS" },
  { codigo: "66", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno, e de exportação", imposto: "PIS" },
  { codigo: "67", descricao: "Crédito presumido - outras operações", imposto: "PIS" },
  { codigo: "70", descricao: "Operação de aquisição sem direito a crédito", imposto: "PIS" },
  { codigo: "71", descricao: "Operação de aquisição com isenção", imposto: "PIS" },
  { codigo: "72", descricao: "Operação de aquisição com suspensão", imposto: "PIS" },
  { codigo: "73", descricao: "Operação de aquisição a alíquota zero", imposto: "PIS" },
  { codigo: "74", descricao: "Operação de aquisição sem incidência da contribuição", imposto: "PIS" },
  { codigo: "75", descricao: "Operação de aquisição por substituição tributária", imposto: "PIS" },
  { codigo: "98", descricao: "Outras operações de entrada", imposto: "PIS" },
  { codigo: "99", descricao: "Outras operações", imposto: "PIS" },

  // ===== CST COFINS =====
  { codigo: "01", descricao: "Operação tributável com alíquota básica", imposto: "COFINS" },
  { codigo: "02", descricao: "Operação tributável com alíquota diferenciada", imposto: "COFINS" },
  { codigo: "03", descricao: "Operação tributável com alíquota por unidade de medida de produto", imposto: "COFINS" },
  { codigo: "04", descricao: "Operação tributável monofásica - revenda a alíquota zero", imposto: "COFINS" },
  { codigo: "05", descricao: "Operação tributável por substituição tributária", imposto: "COFINS" },
  { codigo: "06", descricao: "Operação tributável a alíquota zero", imposto: "COFINS" },
  { codigo: "07", descricao: "Operação isenta da contribuição", imposto: "COFINS" },
  { codigo: "08", descricao: "Operação sem incidência da contribuição", imposto: "COFINS" },
  { codigo: "09", descricao: "Operação com suspensão da contribuição", imposto: "COFINS" },
  { codigo: "49", descricao: "Outras operações de saída", imposto: "COFINS" },
  { codigo: "50", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita tributada no mercado interno", imposto: "COFINS" },
  { codigo: "51", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita não tributada no mercado interno", imposto: "COFINS" },
  { codigo: "52", descricao: "Operação com direito a crédito - vinculada exclusivamente a receita de exportação", imposto: "COFINS" },
  { codigo: "53", descricao: "Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno", imposto: "COFINS" },
  { codigo: "54", descricao: "Operação com direito a crédito - vinculada a receitas tributadas no mercado interno e de exportação", imposto: "COFINS" },
  { codigo: "55", descricao: "Operação com direito a crédito - vinculada a receitas não-tributadas no mercado interno e de exportação", imposto: "COFINS" },
  { codigo: "56", descricao: "Operação com direito a crédito - vinculada a receitas tributadas e não-tributadas no mercado interno, e de exportação", imposto: "COFINS" },
  { codigo: "60", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita tributada no mercado interno", imposto: "COFINS" },
  { codigo: "61", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita não-tributada no mercado interno", imposto: "COFINS" },
  { codigo: "62", descricao: "Crédito presumido - operação de aquisição vinculada exclusivamente a receita de exportação", imposto: "COFINS" },
  { codigo: "63", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno", imposto: "COFINS" },
  { codigo: "64", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas no mercado interno e de exportação", imposto: "COFINS" },
  { codigo: "65", descricao: "Crédito presumido - operação de aquisição vinculada a receitas não-tributadas no mercado interno e de exportação", imposto: "COFINS" },
  { codigo: "66", descricao: "Crédito presumido - operação de aquisição vinculada a receitas tributadas e não-tributadas no mercado interno, e de exportação", imposto: "COFINS" },
  { codigo: "67", descricao: "Crédito presumido - outras operações", imposto: "COFINS" },
  { codigo: "70", descricao: "Operação de aquisição sem direito a crédito", imposto: "COFINS" },
  { codigo: "71", descricao: "Operação de aquisição com isenção", imposto: "COFINS" },
  { codigo: "72", descricao: "Operação de aquisição com suspensão", imposto: "COFINS" },
  { codigo: "73", descricao: "Operação de aquisição a alíquota zero", imposto: "COFINS" },
  { codigo: "74", descricao: "Operação de aquisição sem incidência da contribuição", imposto: "COFINS" },
  { codigo: "75", descricao: "Operação de aquisição por substituição tributária", imposto: "COFINS" },
  { codigo: "98", descricao: "Outras operações de entrada", imposto: "COFINS" },
  { codigo: "99", descricao: "Outras operações", imposto: "COFINS" },
];
