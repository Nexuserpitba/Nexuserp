export interface AnpEntry {
  codigo: string;
  descricao: string;
  categoria: "Gasolina" | "Diesel" | "Etanol" | "GLP" | "GNV" | "Querosene" | "Lubrificante" | "Biodiesel" | "Outros";
}

export const anpData: AnpEntry[] = [
  // Gasolina
  { codigo: "210203001", descricao: "Gasolina C comum", categoria: "Gasolina" },
  { codigo: "210203002", descricao: "Gasolina C aditivada", categoria: "Gasolina" },
  { codigo: "210203003", descricao: "Gasolina C premium", categoria: "Gasolina" },
  { codigo: "210201001", descricao: "Gasolina A comum (sem etanol)", categoria: "Gasolina" },
  { codigo: "210201002", descricao: "Gasolina A premium", categoria: "Gasolina" },
  { codigo: "210204001", descricao: "Gasolina C podium", categoria: "Gasolina" },
  // Diesel
  { codigo: "420105001", descricao: "Óleo diesel B S10 (comum)", categoria: "Diesel" },
  { codigo: "420105002", descricao: "Óleo diesel B S10 aditivado", categoria: "Diesel" },
  { codigo: "420301001", descricao: "Óleo diesel B S500 (comum)", categoria: "Diesel" },
  { codigo: "420301002", descricao: "Óleo diesel B S500 aditivado", categoria: "Diesel" },
  { codigo: "420101001", descricao: "Óleo diesel A S10", categoria: "Diesel" },
  { codigo: "420201001", descricao: "Óleo diesel A S500", categoria: "Diesel" },
  { codigo: "420105003", descricao: "Óleo diesel B S10 premium", categoria: "Diesel" },
  { codigo: "420501001", descricao: "Óleo diesel marítimo (DMA)", categoria: "Diesel" },
  // Etanol
  { codigo: "810101001", descricao: "Etanol hidratado combustível (EHC)", categoria: "Etanol" },
  { codigo: "810101002", descricao: "Etanol hidratado combustível aditivado", categoria: "Etanol" },
  { codigo: "810102001", descricao: "Etanol anidro combustível (EAC)", categoria: "Etanol" },
  { codigo: "810201001", descricao: "Etanol hidratado combustível premium", categoria: "Etanol" },
  // GLP
  { codigo: "110201001", descricao: "GLP (Gás Liquefeito de Petróleo) — botijão P13", categoria: "GLP" },
  { codigo: "110201002", descricao: "GLP — botijão P20", categoria: "GLP" },
  { codigo: "110201003", descricao: "GLP — botijão P45", categoria: "GLP" },
  { codigo: "110201004", descricao: "GLP a granel", categoria: "GLP" },
  { codigo: "110201005", descricao: "GLP — botijão P5", categoria: "GLP" },
  { codigo: "110201006", descricao: "GLP — botijão P8", categoria: "GLP" },
  { codigo: "110201007", descricao: "GLP — botijão P90", categoria: "GLP" },
  // GNV
  { codigo: "220101001", descricao: "Gás natural veicular (GNV)", categoria: "GNV" },
  { codigo: "220101002", descricao: "Gás natural comprimido (GNC)", categoria: "GNV" },
  { codigo: "220201001", descricao: "Gás natural liquefeito (GNL)", categoria: "GNV" },
  // Querosene
  { codigo: "320101001", descricao: "Querosene de aviação (QAV-1/JET A-1)", categoria: "Querosene" },
  { codigo: "320201001", descricao: "Querosene iluminante", categoria: "Querosene" },
  { codigo: "320101002", descricao: "Querosene de aviação alternativo (QAVC/SPK)", categoria: "Querosene" },
  // Lubrificantes
  { codigo: "530101001", descricao: "Óleo lubrificante automotivo mineral", categoria: "Lubrificante" },
  { codigo: "530101002", descricao: "Óleo lubrificante automotivo sintético", categoria: "Lubrificante" },
  { codigo: "530101003", descricao: "Óleo lubrificante automotivo semissintético", categoria: "Lubrificante" },
  { codigo: "530201001", descricao: "Óleo lubrificante industrial", categoria: "Lubrificante" },
  { codigo: "530301001", descricao: "Graxa lubrificante", categoria: "Lubrificante" },
  { codigo: "530401001", descricao: "Fluido para freio hidráulico (DOT 3)", categoria: "Lubrificante" },
  { codigo: "530401002", descricao: "Fluido para freio hidráulico (DOT 4)", categoria: "Lubrificante" },
  { codigo: "530501001", descricao: "Fluido de transmissão automática (ATF)", categoria: "Lubrificante" },
  // Biodiesel
  { codigo: "820101001", descricao: "Biodiesel B100", categoria: "Biodiesel" },
  { codigo: "820101002", descricao: "Biodiesel — éster metílico de soja", categoria: "Biodiesel" },
  { codigo: "820101003", descricao: "Biodiesel — éster metílico de sebo", categoria: "Biodiesel" },
  { codigo: "820101004", descricao: "Biodiesel — éster metílico de palma", categoria: "Biodiesel" },
  // Outros
  { codigo: "610101001", descricao: "Coque de petróleo (verde)", categoria: "Outros" },
  { codigo: "610101002", descricao: "Coque de petróleo calcinado", categoria: "Outros" },
  { codigo: "710101001", descricao: "Asfalto diluído (CM-30)", categoria: "Outros" },
  { codigo: "710101002", descricao: "Cimento asfáltico de petróleo (CAP 50/70)", categoria: "Outros" },
  { codigo: "710201001", descricao: "Emulsão asfáltica (RR-1C)", categoria: "Outros" },
  { codigo: "910101001", descricao: "Óleo combustível A1", categoria: "Outros" },
  { codigo: "920101001", descricao: "Solvente derivado de petróleo", categoria: "Outros" },
  { codigo: "990101001", descricao: "Arla 32 (agente redutor líquido automotivo)", categoria: "Outros" },
];
