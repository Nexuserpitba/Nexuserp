export interface CstIbsCbsEntry {
  codigo: string;
  descricao: string;
  tipo: "IBS" | "CBS" | "Ambos";
  categoria: "Tributação" | "Isenção/Imunidade" | "Redução" | "Diferimento" | "Suspensão" | "Crédito" | "Outros";
}

export const cstIbsCbsData: CstIbsCbsEntry[] = [
  // ===== OPERAÇÕES DE SAÍDA - TRIBUTAÇÃO NORMAL =====
  { codigo: "000", descricao: "Tributação normal - alíquota padrão", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "010", descricao: "Tributação com alíquota reduzida em 60%", tipo: "Ambos", categoria: "Redução" },
  { codigo: "011", descricao: "Tributação com alíquota reduzida em 30%", tipo: "Ambos", categoria: "Redução" },
  { codigo: "012", descricao: "Tributação com alíquota reduzida - percentual específico por produto", tipo: "Ambos", categoria: "Redução" },
  { codigo: "020", descricao: "Tributação com alíquota fixa por unidade de medida", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "030", descricao: "Tributação monofásica - operação com combustíveis", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "031", descricao: "Tributação monofásica - operação com cigarros e produtos fumígenos", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "040", descricao: "Tributação com alíquota zero", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "041", descricao: "Tributação com alíquota zero - cesta básica nacional", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "042", descricao: "Tributação com alíquota zero - medicamentos e dispositivos médicos", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "043", descricao: "Tributação com alíquota zero - produtos hortícolas, frutas e ovos", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "044", descricao: "Tributação com alíquota zero - insumos agropecuários", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "045", descricao: "Tributação com alíquota zero - produtor rural pessoa física", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "046", descricao: "Tributação com alíquota zero - produtos de higiene pessoal e limpeza", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "047", descricao: "Tributação com alíquota zero - educação", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "048", descricao: "Tributação com alíquota zero - serviços de saúde", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "049", descricao: "Tributação com alíquota zero - outras hipóteses", tipo: "Ambos", categoria: "Tributação" },

  // ===== ISENÇÃO E IMUNIDADE =====
  { codigo: "100", descricao: "Isenção", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "110", descricao: "Imunidade - exportação de bens e serviços", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "111", descricao: "Imunidade - operações com ouro ativo financeiro", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "112", descricao: "Imunidade - livros, jornais, periódicos e papel destinado à impressão", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "113", descricao: "Imunidade - fonogramas e videofonogramas musicais brasileiros", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "114", descricao: "Imunidade - entidades religiosas e templos de qualquer culto", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "115", descricao: "Imunidade - partidos políticos e suas fundações", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "116", descricao: "Imunidade - entidades sindicais dos trabalhadores", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "117", descricao: "Imunidade - instituições de educação e de assistência social sem fins lucrativos", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "118", descricao: "Imunidade - entidades beneficentes de assistência social", tipo: "Ambos", categoria: "Isenção/Imunidade" },
  { codigo: "119", descricao: "Imunidade - outras hipóteses constitucionais", tipo: "Ambos", categoria: "Isenção/Imunidade" },

  // ===== SUSPENSÃO E DIFERIMENTO =====
  { codigo: "200", descricao: "Suspensão - operação com mercadoria destinada à industrialização", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "201", descricao: "Suspensão - remessa para armazém geral ou depósito fechado", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "202", descricao: "Suspensão - remessa para demonstração ou mostruário", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "203", descricao: "Suspensão - regime aduaneiro especial", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "204", descricao: "Suspensão - operação com ativo imobilizado", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "205", descricao: "Suspensão - Zona Franca de Manaus e Áreas de Livre Comércio", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "210", descricao: "Diferimento - operação interna entre contribuintes", tipo: "Ambos", categoria: "Diferimento" },
  { codigo: "211", descricao: "Diferimento - insumos agropecuários", tipo: "Ambos", categoria: "Diferimento" },
  { codigo: "212", descricao: "Diferimento - operação com cooperativa", tipo: "Ambos", categoria: "Diferimento" },
  { codigo: "219", descricao: "Diferimento - outras hipóteses", tipo: "Ambos", categoria: "Diferimento" },
  { codigo: "250", descricao: "Suspensão parcial", tipo: "Ambos", categoria: "Suspensão" },
  { codigo: "290", descricao: "Suspensão ou diferimento - outras situações", tipo: "Ambos", categoria: "Suspensão" },

  // ===== OPERAÇÕES ESPECÍFICAS IBS =====
  { codigo: "300", descricao: "Operação sujeita a regime específico - serviços financeiros", tipo: "IBS", categoria: "Outros" },
  { codigo: "301", descricao: "Operação sujeita a regime específico - planos de saúde", tipo: "IBS", categoria: "Outros" },
  { codigo: "302", descricao: "Operação sujeita a regime específico - concursos de prognósticos e fantasy sport", tipo: "IBS", categoria: "Outros" },
  { codigo: "303", descricao: "Operação sujeita a regime específico - operações com bens imóveis", tipo: "IBS", categoria: "Outros" },
  { codigo: "304", descricao: "Operação sujeita a regime específico - sociedades cooperativas", tipo: "IBS", categoria: "Outros" },
  { codigo: "305", descricao: "Operação sujeita a regime específico - serviços de hotelaria e turismo", tipo: "IBS", categoria: "Outros" },
  { codigo: "306", descricao: "Operação sujeita a regime específico - bares, restaurantes e similares", tipo: "IBS", categoria: "Outros" },
  { codigo: "307", descricao: "Operação sujeita a regime específico - transporte coletivo de passageiros", tipo: "IBS", categoria: "Outros" },
  { codigo: "308", descricao: "Operação sujeita a regime específico - SAF (Sociedade Anônima do Futebol)", tipo: "IBS", categoria: "Outros" },
  { codigo: "309", descricao: "Operação sujeita a regime específico - outros", tipo: "IBS", categoria: "Outros" },

  // ===== OPERAÇÕES ESPECÍFICAS CBS =====
  { codigo: "300", descricao: "Operação sujeita a regime específico - serviços financeiros", tipo: "CBS", categoria: "Outros" },
  { codigo: "301", descricao: "Operação sujeita a regime específico - planos de saúde", tipo: "CBS", categoria: "Outros" },
  { codigo: "302", descricao: "Operação sujeita a regime específico - concursos de prognósticos e fantasy sport", tipo: "CBS", categoria: "Outros" },
  { codigo: "303", descricao: "Operação sujeita a regime específico - operações com bens imóveis", tipo: "CBS", categoria: "Outros" },
  { codigo: "304", descricao: "Operação sujeita a regime específico - sociedades cooperativas", tipo: "CBS", categoria: "Outros" },
  { codigo: "305", descricao: "Operação sujeita a regime específico - serviços de hotelaria e turismo", tipo: "CBS", categoria: "Outros" },
  { codigo: "306", descricao: "Operação sujeita a regime específico - bares, restaurantes e similares", tipo: "CBS", categoria: "Outros" },
  { codigo: "307", descricao: "Operação sujeita a regime específico - transporte coletivo de passageiros", tipo: "CBS", categoria: "Outros" },
  { codigo: "308", descricao: "Operação sujeita a regime específico - SAF (Sociedade Anônima do Futebol)", tipo: "CBS", categoria: "Outros" },
  { codigo: "309", descricao: "Operação sujeita a regime específico - outros", tipo: "CBS", categoria: "Outros" },

  // ===== CRÉDITO PRESUMIDO =====
  { codigo: "400", descricao: "Crédito presumido - aquisição de produtor rural pessoa física", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "401", descricao: "Crédito presumido - aquisição de cooperativa", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "402", descricao: "Crédito presumido - transportador autônomo", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "403", descricao: "Crédito presumido - resíduo e material reciclável", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "410", descricao: "Crédito presumido - aquisição de optante pelo Simples Nacional", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "411", descricao: "Crédito presumido - aquisição de MEI", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "420", descricao: "Crédito presumido - transição do regime atual (2027-2032)", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "490", descricao: "Crédito presumido - outras hipóteses", tipo: "Ambos", categoria: "Crédito" },

  // ===== TRANSIÇÃO =====
  { codigo: "500", descricao: "Transição 2026 - alíquota teste (IBS 0,1% / CBS 0,9%)", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "501", descricao: "Transição 2027-2028 - CBS integral + IBS reduzido", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "502", descricao: "Transição 2029-2032 - redução progressiva ICMS/ISS", tipo: "IBS", categoria: "Tributação" },
  { codigo: "503", descricao: "Transição 2029-2032 - redução progressiva PIS/COFINS", tipo: "CBS", categoria: "Tributação" },
  { codigo: "510", descricao: "Transição - manutenção de créditos do regime anterior", tipo: "Ambos", categoria: "Crédito" },
  { codigo: "590", descricao: "Transição - outras situações", tipo: "Ambos", categoria: "Tributação" },

  // ===== SIMPLES NACIONAL =====
  { codigo: "600", descricao: "Optante pelo Simples Nacional - operação normal", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "601", descricao: "Optante pelo Simples Nacional - operação com transferência de crédito", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "602", descricao: "Optante pelo Simples Nacional - excesso de sublimite", tipo: "Ambos", categoria: "Tributação" },
  { codigo: "610", descricao: "MEI - operação normal", tipo: "Ambos", categoria: "Tributação" },

  // ===== NÃO INCIDÊNCIA E OUTROS =====
  { codigo: "800", descricao: "Não incidência - operação fora do campo de incidência do IBS/CBS", tipo: "Ambos", categoria: "Outros" },
  { codigo: "801", descricao: "Não incidência - transferência entre estabelecimentos do mesmo titular", tipo: "Ambos", categoria: "Outros" },
  { codigo: "900", descricao: "Outras operações não especificadas", tipo: "Ambos", categoria: "Outros" },
  { codigo: "990", descricao: "Sem informação / não aplicável", tipo: "Ambos", categoria: "Outros" },
];
