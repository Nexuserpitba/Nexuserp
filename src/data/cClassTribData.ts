export interface CClassTribEntry {
  codigo: string;
  descricao: string;
  categoria: "Regime Normal" | "Regime Específico" | "Imunidade/Isenção" | "Simples Nacional" | "Transição" | "Outros";
}

export const cClassTribData: CClassTribEntry[] = [
  { codigo: "00", descricao: "Tributação integral — alíquota padrão IBS/CBS", categoria: "Regime Normal" },
  { codigo: "01", descricao: "Tributação com alíquota reduzida em 20% — bens e serviços de saúde (art. 138, LC 214/2025)", categoria: "Regime Normal" },
  { codigo: "02", descricao: "Tributação com alíquota reduzida em 30% — serviços de educação (art. 139, LC 214/2025)", categoria: "Regime Normal" },
  { codigo: "03", descricao: "Tributação com alíquota reduzida em 60% — cesta básica estendida e insumos agropecuários", categoria: "Regime Normal" },
  { codigo: "04", descricao: "Tributação com alíquota reduzida em 100% — cesta básica nacional (alíquota zero)", categoria: "Regime Normal" },
  { codigo: "05", descricao: "Tributação com alíquota fixa por unidade de medida — combustíveis", categoria: "Regime Específico" },
  { codigo: "06", descricao: "Regime específico — serviços financeiros (art. 171, LC 214/2025)", categoria: "Regime Específico" },
  { codigo: "07", descricao: "Regime específico — operações com bens imóveis (art. 178, LC 214/2025)", categoria: "Regime Específico" },
  { codigo: "08", descricao: "Regime específico — planos de saúde e seguros (art. 186, LC 214/2025)", categoria: "Regime Específico" },
  { codigo: "09", descricao: "Regime específico — cooperativas (art. 190, LC 214/2025)", categoria: "Regime Específico" },
  { codigo: "10", descricao: "Regime específico — serviços de hotelaria, parques e restaurantes", categoria: "Regime Específico" },
  { codigo: "11", descricao: "Regime específico — transporte coletivo de passageiros", categoria: "Regime Específico" },
  { codigo: "12", descricao: "Regime específico — Sociedades Anônimas de Futebol (SAF)", categoria: "Regime Específico" },
  { codigo: "13", descricao: "Regime específico — aviação regional", categoria: "Regime Específico" },
  { codigo: "14", descricao: "Imunidade — exportações de bens e serviços", categoria: "Imunidade/Isenção" },
  { codigo: "15", descricao: "Imunidade — entidades religiosas e templos de qualquer culto", categoria: "Imunidade/Isenção" },
  { codigo: "16", descricao: "Imunidade — partidos políticos, sindicatos e entidades educacionais sem fins lucrativos", categoria: "Imunidade/Isenção" },
  { codigo: "17", descricao: "Imunidade — livros, jornais, periódicos e papel destinado à impressão", categoria: "Imunidade/Isenção" },
  { codigo: "18", descricao: "Isenção — operações com medicamentos adquiridos por órgãos públicos (Farmácia Popular)", categoria: "Imunidade/Isenção" },
  { codigo: "19", descricao: "Isenção — dispositivos médicos e de acessibilidade para PcD", categoria: "Imunidade/Isenção" },
  { codigo: "20", descricao: "Isenção — serviços prestados por MEI (Microempreendedor Individual)", categoria: "Simples Nacional" },
  { codigo: "21", descricao: "Simples Nacional — tributação unificada dentro do regime simplificado", categoria: "Simples Nacional" },
  { codigo: "22", descricao: "Simples Nacional — optante com recolhimento de IBS/CBS por fora do DAS", categoria: "Simples Nacional" },
  { codigo: "23", descricao: "Transição 2026 — alíquota-teste CBS 0,9% e IBS 0,1%", categoria: "Transição" },
  { codigo: "24", descricao: "Transição 2027–2028 — coexistência parcial PIS/Cofins e CBS", categoria: "Transição" },
  { codigo: "25", descricao: "Transição 2029–2032 — redução gradual de ICMS/ISS com elevação proporcional do IBS", categoria: "Transição" },
  { codigo: "26", descricao: "Transição 2033 — vigência plena IBS/CBS, extinção de ICMS/ISS/PIS/Cofins", categoria: "Transição" },
  { codigo: "90", descricao: "Outras classificações tributárias não especificadas", categoria: "Outros" },
  { codigo: "99", descricao: "Classificação tributária não aplicável", categoria: "Outros" },
];
