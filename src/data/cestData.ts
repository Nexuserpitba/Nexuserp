export interface CestEntry {
  cest: string;
  ncm: string;
  descricao: string;
  segmento: string;
}

export const segmentosCest: Record<string, string> = {
  "01": "Autopeças",
  "02": "Bebidas alcoólicas",
  "03": "Cervejas, chopes, refrigerantes e energéticos",
  "04": "Cigarros e produtos de tabacaria",
  "05": "Cimentos",
  "06": "Combustíveis e lubrificantes",
  "07": "Energia elétrica",
  "08": "Ferramentas",
  "09": "Lâmpadas, reatores e starter",
  "10": "Materiais de construção e congêneres",
  "11": "Materiais de limpeza",
  "12": "Materiais elétricos",
  "13": "Medicamentos de uso humano",
  "14": "Papéis, plásticos, produtos cerâmicos e vidros",
  "15": "Pneumáticos, câmaras de ar e protetores",
  "16": "Produtos alimentícios",
  "17": "Produtos de papelaria",
  "18": "Produtos de perfumaria e higiene pessoal",
  "19": "Produtos eletrônicos, eletroeletrônicos e eletrodomésticos",
  "20": "Rações para animais domésticos",
  "21": "Sorvetes e preparados para fabricação de sorvetes",
  "22": "Tintas e vernizes",
  "23": "Veículos automotores",
  "24": "Veículos de duas e três rodas motorizados",
  "25": "Venda de mercadorias pelo sistema porta a porta",
  "28": "Produtos de uso veterinário",
};

export const cestData: CestEntry[] = [
  // 01 - Autopeças
  { cest: "01.001.00", ncm: "3815.12.10", descricao: "Catalisadores em colmeia cerâmica ou metálica para conversão catalítica de gases de escape de veículos", segmento: "01" },
  { cest: "01.002.00", ncm: "3917.40.00", descricao: "Tubos e seus acessórios (juntas, cotovelos, flanges, uniões) de plásticos para uso automotivo", segmento: "01" },
  { cest: "01.003.00", ncm: "3918.10.00", descricao: "Protetores de caçamba de plástico para veículos", segmento: "01" },
  { cest: "01.004.00", ncm: "3923.30.00", descricao: "Reservatórios de óleo para veículos automotores", segmento: "01" },
  { cest: "01.005.00", ncm: "3926.30.00", descricao: "Frisos, decalques, molduras e acabamentos para veículos", segmento: "01" },
  { cest: "01.006.00", ncm: "4010.3", descricao: "Correias de transmissão de borracha vulcanizada para uso automotivo", segmento: "01" },
  { cest: "01.007.00", ncm: "4016.93.00", descricao: "Juntas, gaxetas e semelhantes de borracha vulcanizada para uso automotivo", segmento: "01" },
  { cest: "01.008.00", ncm: "4016.99.90", descricao: "Peças de borracha vulcanizada para uso automotivo", segmento: "01" },
  { cest: "01.009.00", ncm: "6813.81.10", descricao: "Pastilhas e discos de freio montados para veículos", segmento: "01" },
  { cest: "01.010.00", ncm: "7007.11.00", descricao: "Vidros de segurança temperados para veículos", segmento: "01" },
  { cest: "01.011.00", ncm: "7007.21.00", descricao: "Vidros de segurança laminados (para-brisas) para veículos", segmento: "01" },
  { cest: "01.012.00", ncm: "7009.10.00", descricao: "Espelhos retrovisores para veículos", segmento: "01" },
  { cest: "01.013.00", ncm: "7014.00.00", descricao: "Lentes de faróis, lanternas e outros dispositivos de iluminação de vidro para veículos", segmento: "01" },
  { cest: "01.014.00", ncm: "7320.10.00", descricao: "Molas e folhas de molas de ferro ou aço para suspensão de veículos", segmento: "01" },

  // 02 - Bebidas alcoólicas
  { cest: "02.001.00", ncm: "2204.10.10", descricao: "Vinhos espumantes e espumosos (champanha, prosecco, cava)", segmento: "02" },
  { cest: "02.002.00", ncm: "2204.21.00", descricao: "Vinhos de uvas frescas em recipientes até 2 litros", segmento: "02" },
  { cest: "02.003.00", ncm: "2205.10.00", descricao: "Vermutes e outros vinhos aromatizados até 2 litros", segmento: "02" },
  { cest: "02.004.00", ncm: "2206.00.10", descricao: "Sidra e outras bebidas fermentadas (hidromel, perada)", segmento: "02" },
  { cest: "02.005.00", ncm: "2207.10.10", descricao: "Álcool etílico não desnaturado com teor alcoólico acima de 80%", segmento: "02" },
  { cest: "02.006.00", ncm: "2208.20.00", descricao: "Aguardentes de vinho ou de bagaço de uvas (conhaque, brandy, grappa)", segmento: "02" },
  { cest: "02.007.00", ncm: "2208.30.20", descricao: "Uísques (whisky e whiskey)", segmento: "02" },
  { cest: "02.008.00", ncm: "2208.40.00", descricao: "Rum e outras aguardentes de cana-de-açúcar (cachaça)", segmento: "02" },
  { cest: "02.009.00", ncm: "2208.50.00", descricao: "Gim (gin) e genebra", segmento: "02" },
  { cest: "02.010.00", ncm: "2208.60.00", descricao: "Vodca", segmento: "02" },
  { cest: "02.011.00", ncm: "2208.70.00", descricao: "Licores e cremes de licor", segmento: "02" },

  // 03 - Cervejas, chopes, refrigerantes e energéticos
  { cest: "03.001.00", ncm: "2201.10.00", descricao: "Água mineral natural ou artificial, gasosa ou não", segmento: "03" },
  { cest: "03.002.00", ncm: "2202.10.00", descricao: "Refrigerantes e refrescos em geral", segmento: "03" },
  { cest: "03.003.00", ncm: "2202.99.00", descricao: "Bebidas energéticas e isotônicas", segmento: "03" },
  { cest: "03.004.00", ncm: "2203.00.00", descricao: "Cervejas de malte", segmento: "03" },
  { cest: "03.005.00", ncm: "2202.91.00", descricao: "Cerveja sem álcool", segmento: "03" },
  { cest: "03.006.00", ncm: "2203.00.00", descricao: "Chope", segmento: "03" },

  // 04 - Cigarros e tabacaria
  { cest: "04.001.00", ncm: "2402.20.00", descricao: "Cigarros contendo tabaco", segmento: "04" },
  { cest: "04.002.00", ncm: "2402.10.00", descricao: "Charutos e cigarrilhas de tabaco", segmento: "04" },
  { cest: "04.003.00", ncm: "2403.11.00", descricao: "Tabaco para narguilé (hookah)", segmento: "04" },
  { cest: "04.004.00", ncm: "2403.19.00", descricao: "Outros tabacos para fumar", segmento: "04" },

  // 05 - Cimentos
  { cest: "05.001.00", ncm: "2523.29.10", descricao: "Cimento Portland comum (CP I)", segmento: "05" },
  { cest: "05.002.00", ncm: "2523.29.90", descricao: "Cimento Portland composto (CP II, CP III, CP IV, CP V)", segmento: "05" },
  { cest: "05.003.00", ncm: "2523.21.00", descricao: "Cimento Portland branco", segmento: "05" },

  // 06 - Combustíveis e lubrificantes
  { cest: "06.001.00", ncm: "2710.12.59", descricao: "Gasolina automotiva comum - GAC", segmento: "06" },
  { cest: "06.002.00", ncm: "2710.12.59", descricao: "Gasolina automotiva premium", segmento: "06" },
  { cest: "06.003.00", ncm: "2710.19.21", descricao: "Óleo diesel S-10", segmento: "06" },
  { cest: "06.004.00", ncm: "2710.19.21", descricao: "Óleo diesel S-500", segmento: "06" },
  { cest: "06.005.00", ncm: "2207.10.00", descricao: "Etanol hidratado combustível - EHC", segmento: "06" },
  { cest: "06.006.00", ncm: "2207.10.00", descricao: "Etanol anidro combustível - EAC", segmento: "06" },
  { cest: "06.007.00", ncm: "2711.19.10", descricao: "Gás liquefeito de petróleo (GLP)", segmento: "06" },
  { cest: "06.008.00", ncm: "2711.11.00", descricao: "Gás natural veicular (GNV)", segmento: "06" },
  { cest: "06.009.00", ncm: "2710.19.32", descricao: "Querosene de aviação (QAV)", segmento: "06" },
  { cest: "06.010.00", ncm: "3826.00.00", descricao: "Biodiesel e suas misturas (B100)", segmento: "06" },
  { cest: "06.011.00", ncm: "2710.19.91", descricao: "Óleos lubrificantes automotivos", segmento: "06" },
  { cest: "06.012.00", ncm: "2710.19.99", descricao: "Graxas lubrificantes", segmento: "06" },

  // 08 - Ferramentas
  { cest: "08.001.00", ncm: "8205.40.00", descricao: "Chaves de fenda e chaves Phillips", segmento: "08" },
  { cest: "08.002.00", ncm: "8204.11.00", descricao: "Chaves de boca fixa", segmento: "08" },
  { cest: "08.003.00", ncm: "8203.20.10", descricao: "Alicates de uso geral", segmento: "08" },

  // 09 - Lâmpadas
  { cest: "09.001.00", ncm: "8539.50.00", descricao: "Lâmpadas LED", segmento: "09" },
  { cest: "09.002.00", ncm: "8539.31.00", descricao: "Lâmpadas fluorescentes compactas", segmento: "09" },
  { cest: "09.003.00", ncm: "8504.10.00", descricao: "Reatores para lâmpadas de descarga", segmento: "09" },

  // 10 - Materiais de construção
  { cest: "10.001.00", ncm: "7214.20.00", descricao: "Vergalhões de ferro ou aço para construção", segmento: "10" },
  { cest: "10.002.00", ncm: "6905.10.00", descricao: "Telhas cerâmicas", segmento: "10" },
  { cest: "10.003.00", ncm: "6907.21.00", descricao: "Pisos e revestimentos cerâmicos", segmento: "10" },
  { cest: "10.004.00", ncm: "3925.20.00", descricao: "Portas, janelas e batentes de plástico", segmento: "10" },
  { cest: "10.005.00", ncm: "3917.21.00", descricao: "Tubos rígidos de PVC para construção civil", segmento: "10" },
  { cest: "10.006.00", ncm: "7604.10.00", descricao: "Barras e perfis de alumínio para esquadrias", segmento: "10" },

  // 11 - Materiais de limpeza
  { cest: "11.001.00", ncm: "3402.20.00", descricao: "Detergentes e sabões líquidos", segmento: "11" },
  { cest: "11.002.00", ncm: "3402.90.39", descricao: "Desinfetantes e germicidas de uso doméstico", segmento: "11" },
  { cest: "11.003.00", ncm: "3405.10.00", descricao: "Ceras e polidores para pisos", segmento: "11" },
  { cest: "11.004.00", ncm: "3401.19.00", descricao: "Sabão em barra para uso doméstico", segmento: "11" },

  // 12 - Materiais elétricos
  { cest: "12.001.00", ncm: "8536.10.00", descricao: "Fusíveis e corta-circuitos", segmento: "12" },
  { cest: "12.002.00", ncm: "8536.20.00", descricao: "Disjuntores residenciais e industriais", segmento: "12" },
  { cest: "12.003.00", ncm: "8536.50.90", descricao: "Interruptores e tomadas de uso doméstico", segmento: "12" },
  { cest: "12.004.00", ncm: "8544.49.00", descricao: "Fios e cabos elétricos isolados de cobre", segmento: "12" },

  // 13 - Medicamentos
  { cest: "13.001.00", ncm: "3003.90.99", descricao: "Medicamentos genéricos de uso humano", segmento: "13" },
  { cest: "13.002.00", ncm: "3004.90.99", descricao: "Medicamentos de referência (marca)", segmento: "13" },
  { cest: "13.003.00", ncm: "3004.90.69", descricao: "Medicamentos similares de uso humano", segmento: "13" },

  // 14 - Papéis, plásticos, cerâmicas e vidros
  { cest: "14.001.00", ncm: "4818.10.00", descricao: "Papel higiênico em rolos", segmento: "14" },
  { cest: "14.002.00", ncm: "3924.10.00", descricao: "Copos e pratos descartáveis de plástico", segmento: "14" },
  { cest: "14.003.00", ncm: "7010.90.11", descricao: "Garrafas e frascos de vidro", segmento: "14" },

  // 15 - Pneumáticos
  { cest: "15.001.00", ncm: "4011.10.00", descricao: "Pneus novos para automóveis de passageiros", segmento: "15" },
  { cest: "15.002.00", ncm: "4011.20.10", descricao: "Pneus novos para ônibus e caminhões", segmento: "15" },
  { cest: "15.003.00", ncm: "4013.10.10", descricao: "Câmaras de ar para automóveis", segmento: "15" },

  // 16 - Produtos alimentícios
  { cest: "16.001.00", ncm: "1905.31.00", descricao: "Biscoitos e bolachas doces", segmento: "16" },
  { cest: "16.002.00", ncm: "1905.90.20", descricao: "Pães industrializados (pão de forma, bisnaguinha)", segmento: "16" },
  { cest: "16.003.00", ncm: "1806.31.20", descricao: "Chocolates e bombons", segmento: "16" },
  { cest: "16.004.00", ncm: "1902.11.00", descricao: "Massas alimentícias (macarrão, espaguete)", segmento: "16" },
  { cest: "16.005.00", ncm: "2009.12.00", descricao: "Sucos de frutas concentrados ou não", segmento: "16" },
  { cest: "16.006.00", ncm: "0402.21.10", descricao: "Leite em pó integral ou desnatado", segmento: "16" },
  { cest: "16.007.00", ncm: "1704.90.10", descricao: "Balas, confeitos e gomas de mascar", segmento: "16" },
  { cest: "16.008.00", ncm: "2103.90.21", descricao: "Molhos e condimentos preparados", segmento: "16" },

  // 17 - Produtos de papelaria
  { cest: "17.001.00", ncm: "4820.10.00", descricao: "Cadernos escolares e universitários", segmento: "17" },
  { cest: "17.002.00", ncm: "9608.10.00", descricao: "Canetas esferográficas", segmento: "17" },
  { cest: "17.003.00", ncm: "9609.10.00", descricao: "Lápis e lapiseiras", segmento: "17" },

  // 18 - Perfumaria e higiene pessoal
  { cest: "18.001.00", ncm: "3305.10.00", descricao: "Xampus e condicionadores para cabelos", segmento: "18" },
  { cest: "18.002.00", ncm: "3306.10.00", descricao: "Cremes e pastas dentifrícias (creme dental)", segmento: "18" },
  { cest: "18.003.00", ncm: "3303.00.20", descricao: "Perfumes e águas-de-colônia", segmento: "18" },
  { cest: "18.004.00", ncm: "3307.20.10", descricao: "Desodorantes e antitranspirantes", segmento: "18" },
  { cest: "18.005.00", ncm: "3304.99.10", descricao: "Protetores solares e bronzeadores", segmento: "18" },

  // 19 - Eletrônicos e eletrodomésticos
  { cest: "19.001.00", ncm: "8418.10.00", descricao: "Refrigeradores e freezers domésticos", segmento: "19" },
  { cest: "19.002.00", ncm: "8450.11.00", descricao: "Máquinas de lavar roupa domésticas", segmento: "19" },
  { cest: "19.003.00", ncm: "8516.60.00", descricao: "Fogões e fornos elétricos domésticos", segmento: "19" },
  { cest: "19.004.00", ncm: "8528.72.00", descricao: "Aparelhos de televisão (TV)", segmento: "19" },
  { cest: "19.005.00", ncm: "8517.12.31", descricao: "Smartphones e telefones celulares", segmento: "19" },
  { cest: "19.006.00", ncm: "8471.30.19", descricao: "Computadores portáteis (notebooks)", segmento: "19" },

  // 20 - Rações para animais domésticos
  { cest: "20.001.00", ncm: "2309.10.00", descricao: "Ração tipo seca para cães", segmento: "20" },
  { cest: "20.002.00", ncm: "2309.10.00", descricao: "Ração tipo seca para gatos", segmento: "20" },
  { cest: "20.003.00", ncm: "2309.10.00", descricao: "Ração úmida (sachê e lata) para animais domésticos", segmento: "20" },

  // 21 - Sorvetes
  { cest: "21.001.00", ncm: "2105.00.10", descricao: "Sorvetes de qualquer espécie", segmento: "21" },
  { cest: "21.002.00", ncm: "1806.90.00", descricao: "Preparados para fabricação de sorvetes em máquina", segmento: "21" },

  // 22 - Tintas e vernizes
  { cest: "22.001.00", ncm: "3208.10.10", descricao: "Tintas acrílicas para paredes e construção civil", segmento: "22" },
  { cest: "22.002.00", ncm: "3208.90.10", descricao: "Tintas esmalte sintético", segmento: "22" },
  { cest: "22.003.00", ncm: "3209.10.00", descricao: "Vernizes à base de polímeros acrílicos", segmento: "22" },
  { cest: "22.004.00", ncm: "3214.10.10", descricao: "Massa corrida e massa acrílica para paredes", segmento: "22" },

  // 23 - Veículos automotores
  { cest: "23.001.00", ncm: "8703.22.10", descricao: "Automóveis de passageiros com motor de ignição por centelha (gasolina/etanol)", segmento: "23" },
  { cest: "23.002.00", ncm: "8703.23.10", descricao: "Automóveis de passageiros com motor diesel", segmento: "23" },
  { cest: "23.003.00", ncm: "8704.21.10", descricao: "Caminhões e veículos de carga", segmento: "23" },

  // 24 - Veículos de duas e três rodas
  { cest: "24.001.00", ncm: "8711.20.10", descricao: "Motocicletas com motor de cilindrada entre 50 e 250 cm³", segmento: "24" },
  { cest: "24.002.00", ncm: "8711.30.00", descricao: "Motocicletas com motor de cilindrada entre 250 e 500 cm³", segmento: "24" },
  { cest: "24.003.00", ncm: "8711.50.00", descricao: "Motocicletas com motor de cilindrada superior a 800 cm³", segmento: "24" },

  // 25 - Venda porta a porta
  { cest: "25.001.00", ncm: "3304.10.00", descricao: "Produtos de maquiagem para lábios (batons, glosses)", segmento: "25" },
  { cest: "25.002.00", ncm: "3304.20.10", descricao: "Produtos de maquiagem para olhos (sombras, rímel)", segmento: "25" },
  { cest: "25.003.00", ncm: "3304.91.00", descricao: "Cremes e pós faciais para venda direta", segmento: "25" },

  // 28 - Produtos de uso veterinário
  { cest: "28.001.00", ncm: "3004.90.29", descricao: "Medicamentos de uso veterinário", segmento: "28" },
  { cest: "28.002.00", ncm: "3808.91.99", descricao: "Carrapaticidas, sarnicidas e inseticidas de uso veterinário", segmento: "28" },
  { cest: "28.003.00", ncm: "3002.30.00", descricao: "Vacinas de uso veterinário", segmento: "28" },
];

export const totalCestItems = cestData.length;
