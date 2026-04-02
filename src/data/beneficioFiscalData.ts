export interface BeneficioFiscalEntry {
  codigo: string;
  descricao: string;
  uf: string;
  tributo: "ICMS" | "IPI" | "PIS/COFINS" | "ISS" | "Múltiplos";
  tipo: "Isenção" | "Redução de Base" | "Crédito Presumido" | "Diferimento" | "Suspensão" | "Alíquota Zero" | "Incentivo Regional";
}

export const beneficioFiscalData: BeneficioFiscalEntry[] = [
  // Isenções ICMS — Convênios CONFAZ
  { codigo: "SP000001", descricao: "Isenção ICMS — hortifrutigranjeiros (Conv. ICMS 44/75)", uf: "SP", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "SP000002", descricao: "Isenção ICMS — medicamentos e insumos para o SUS", uf: "SP", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "SP000003", descricao: "Isenção ICMS — equipamentos para PcD (Conv. ICMS 38/12)", uf: "SP", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "MG000001", descricao: "Isenção ICMS — cesta básica mineira (Dec. 43.080/2002)", uf: "MG", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "RJ000001", descricao: "Isenção ICMS — operações com energia solar fotovoltaica (Conv. ICMS 16/15)", uf: "RJ", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "BA000001", descricao: "Isenção ICMS — produtos da cesta básica baiana", uf: "BA", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "PR000001", descricao: "Isenção ICMS — aquisição de veículo por taxista (Conv. ICMS 38/01)", uf: "PR", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "RS000001", descricao: "Isenção ICMS — leite pasteurizado (Conv. ICMS 124/93)", uf: "RS", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "SC000001", descricao: "Isenção ICMS — doações a órgãos públicos e entidades assistenciais", uf: "SC", tributo: "ICMS", tipo: "Isenção" },
  { codigo: "GO000001", descricao: "Isenção ICMS — PRODUZIR/FOMENTAR — indústria goiana", uf: "GO", tributo: "ICMS", tipo: "Isenção" },
  // Redução de Base de Cálculo
  { codigo: "SP000010", descricao: "Redução de base de cálculo ICMS — máquinas e implementos agrícolas (Conv. ICMS 52/91)", uf: "SP", tributo: "ICMS", tipo: "Redução de Base" },
  { codigo: "SP000011", descricao: "Redução de base de cálculo ICMS — cesta básica paulista (Dec. 45.490/2000)", uf: "SP", tributo: "ICMS", tipo: "Redução de Base" },
  { codigo: "MG000010", descricao: "Redução de base de cálculo ICMS — indústria de alimentos (Dec. 43.080/2002)", uf: "MG", tributo: "ICMS", tipo: "Redução de Base" },
  { codigo: "RJ000010", descricao: "Redução de base de cálculo ICMS — gás natural canalizado", uf: "RJ", tributo: "ICMS", tipo: "Redução de Base" },
  { codigo: "BA000010", descricao: "Redução de base de cálculo ICMS — transporte aéreo de passageiros", uf: "BA", tributo: "ICMS", tipo: "Redução de Base" },
  { codigo: "PR000010", descricao: "Redução de base de cálculo ICMS — refeições em bares e restaurantes", uf: "PR", tributo: "ICMS", tipo: "Redução de Base" },
  // Crédito Presumido
  { codigo: "SP000020", descricao: "Crédito presumido ICMS — fabricante de produtos têxteis", uf: "SP", tributo: "ICMS", tipo: "Crédito Presumido" },
  { codigo: "SC000020", descricao: "Crédito presumido ICMS — TTD (Tratamento Tributário Diferenciado) exportação", uf: "SC", tributo: "ICMS", tipo: "Crédito Presumido" },
  { codigo: "GO000020", descricao: "Crédito outorgado ICMS — PRODUZIR — indústria de transformação", uf: "GO", tributo: "ICMS", tipo: "Crédito Presumido" },
  { codigo: "PE000020", descricao: "Crédito presumido ICMS — PRODEPE — programa de desenvolvimento", uf: "PE", tributo: "ICMS", tipo: "Crédito Presumido" },
  { codigo: "CE000020", descricao: "Crédito presumido ICMS — FDI (Fundo de Desenvolvimento Industrial)", uf: "CE", tributo: "ICMS", tipo: "Crédito Presumido" },
  { codigo: "MT000020", descricao: "Crédito presumido ICMS — PRODEIC — programa de desenvolvimento econômico", uf: "MT", tributo: "ICMS", tipo: "Crédito Presumido" },
  // Diferimento
  { codigo: "SP000030", descricao: "Diferimento ICMS — saída interna de insumos para indústria", uf: "SP", tributo: "ICMS", tipo: "Diferimento" },
  { codigo: "MG000030", descricao: "Diferimento ICMS — operações com sucata e resíduos", uf: "MG", tributo: "ICMS", tipo: "Diferimento" },
  { codigo: "PR000030", descricao: "Diferimento ICMS — importação de matérias-primas por portos paranaenses", uf: "PR", tributo: "ICMS", tipo: "Diferimento" },
  { codigo: "RS000030", descricao: "Diferimento ICMS — FUNDOPEM — operações com ativo imobilizado", uf: "RS", tributo: "ICMS", tipo: "Diferimento" },
  { codigo: "ES000030", descricao: "Diferimento ICMS — INVEST-ES — importação e industrialização", uf: "ES", tributo: "ICMS", tipo: "Diferimento" },
  // Suspensão
  { codigo: "FED00001", descricao: "Suspensão IPI — remessa para industrialização por encomenda (RIPI art. 43)", uf: "Federal", tributo: "IPI", tipo: "Suspensão" },
  { codigo: "FED00002", descricao: "Suspensão IPI — exportação e formação de lote para exportação", uf: "Federal", tributo: "IPI", tipo: "Suspensão" },
  { codigo: "FED00003", descricao: "Suspensão PIS/COFINS — REPES (Regime Especial para Exportação de TI)", uf: "Federal", tributo: "PIS/COFINS", tipo: "Suspensão" },
  { codigo: "FED00004", descricao: "Suspensão PIS/COFINS — RECAP (aquisição de máquinas para exportadores)", uf: "Federal", tributo: "PIS/COFINS", tipo: "Suspensão" },
  // Alíquota Zero
  { codigo: "FED00010", descricao: "Alíquota zero PIS/COFINS — cesta básica (Lei 10.925/2004)", uf: "Federal", tributo: "PIS/COFINS", tipo: "Alíquota Zero" },
  { codigo: "FED00011", descricao: "Alíquota zero PIS/COFINS — livros e periódicos (Lei 10.865/2004)", uf: "Federal", tributo: "PIS/COFINS", tipo: "Alíquota Zero" },
  { codigo: "FED00012", descricao: "Alíquota zero PIS/COFINS — produtos hortícolas e frutas", uf: "Federal", tributo: "PIS/COFINS", tipo: "Alíquota Zero" },
  { codigo: "FED00013", descricao: "Alíquota zero IPI — produtos industrializados na ZFM (Dec. 7.212/2010)", uf: "Federal", tributo: "IPI", tipo: "Alíquota Zero" },
  // Incentivos Regionais
  { codigo: "AM000001", descricao: "Zona Franca de Manaus — isenção ICMS, IPI, PIS/COFINS (DL 288/67)", uf: "AM", tributo: "Múltiplos", tipo: "Incentivo Regional" },
  { codigo: "AM000002", descricao: "ZFM — crédito estímulo ICMS para indústria incentivada", uf: "AM", tributo: "ICMS", tipo: "Incentivo Regional" },
  { codigo: "FED00020", descricao: "SUDAM — redução de 75% IRPJ para empreendimentos prioritários", uf: "Federal", tributo: "Múltiplos", tipo: "Incentivo Regional" },
  { codigo: "FED00021", descricao: "SUDENE — redução de 75% IRPJ para empreendimentos prioritários", uf: "Federal", tributo: "Múltiplos", tipo: "Incentivo Regional" },
  { codigo: "FED00022", descricao: "Área de Livre Comércio — Tabatinga, Macapá-Santana, Boa Vista", uf: "Federal", tributo: "Múltiplos", tipo: "Incentivo Regional" },
  { codigo: "FED00023", descricao: "REPORTO — regime tributário para modernização portuária", uf: "Federal", tributo: "Múltiplos", tipo: "Incentivo Regional" },
];
