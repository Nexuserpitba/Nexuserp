/**
 * Gerador de arquivo Sintegra (Convênio ICMS 57/95)
 * Layout oficial SEFAZ — todos os registros com 126 posições fixas.
 */

const RECORD_LEN = 126;

export interface SintegraEmpresa {
  cnpj: string;
  inscricaoEstadual: string;
  razaoSocial: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  responsavel: string;
}

export interface SintegraConfig {
  empresa: SintegraEmpresa;
  periodoInicio: string; // YYYY-MM
  periodoFim: string;    // YYYY-MM
  finalidade: string;    // 1,2,3,5
  registrosSelecionados: string[];
}

// ===================== Helpers posicionais =====================

/** Preenche à direita com char (padrão espaço), trunca em len */
function padR(val: string, len: number, char = " "): string {
  return (val || "").substring(0, len).padEnd(len, char);
}
/** Preenche à esquerda com zeros, apenas dígitos */
function padL(val: string | number, len: number): string {
  return String(val).replace(/\D/g, "").substring(0, len).padStart(len, "0");
}
/** Garante que o registro tenha exatamente 126 posições */
function fixLen(reg: string): string {
  if (reg.length > RECORD_LEN) return reg.substring(0, RECORD_LEN);
  return reg.padEnd(RECORD_LEN, " ");
}

function periodoToData(periodo: string, tipo: "inicio" | "fim"): string {
  const [ano, mes] = periodo.split("-");
  if (tipo === "inicio") return `${ano}${padL(mes, 2)}01`;
  const lastDay = new Date(Number(ano), Number(mes), 0).getDate();
  return `${ano}${padL(mes, 2)}${padL(lastDay, 2)}`;
}

// ===================== Registro 10 — Mestre do Estabelecimento =====================
// Pos 01-02: Tipo (2)  |  03-16: CNPJ (14)  |  17-30: IE (14)
// Pos 31-65: Razão Social (35)  |  66-95: Município (30)  |  96-97: UF (2)
// Pos 98-107: Fax (10)  |  108-115: Dt Inicial AAAAMMDD (8)
// Pos 116-123: Dt Final AAAAMMDD (8)  |  124: Cód Estrutura (1)
// Pos 125: Cód Natureza (1)  |  126: Cód Finalidade (1)
// Total = 126
function gerarRegistro10(config: SintegraConfig): string {
  const { empresa, periodoInicio, periodoFim, finalidade } = config;
  let r = "";
  r += "10";                                                // 01-02
  r += padL(empresa.cnpj, 14);                              // 03-16
  r += padR(empresa.inscricaoEstadual.replace(/\D/g, ""), 14); // 17-30
  r += padR(empresa.razaoSocial.toUpperCase(), 35);         // 31-65
  r += padR(empresa.cidade.toUpperCase(), 30);              // 66-95
  r += padR(empresa.uf.toUpperCase(), 2);                   // 96-97
  r += padL(empresa.telefone, 10);                          // 98-107
  r += periodoToData(periodoInicio, "inicio");              // 108-115
  r += periodoToData(periodoFim, "fim");                    // 116-123
  r += "3";                                                 // 124 - Magnético (3)
  r += "3";                                                 // 125 - Ambas operações (3)
  r += padR(finalidade, 1);                                 // 126
  return fixLen(r);
}

// ===================== Registro 11 — Dados Complementares =====================
// Pos 01-02: Tipo (2)  |  03-36: Logradouro (34)  |  37-41: Número (5)
// Pos 42-63: Complemento (22)  |  64-78: Bairro (15)  |  79-86: CEP (8)
// Pos 87-114: Responsável (28)  |  115-126: Telefone (12)
// Total = 126
function gerarRegistro11(config: SintegraConfig): string {
  const { empresa } = config;
  let r = "";
  r += "11";                                                // 01-02
  r += padR(empresa.logradouro.toUpperCase(), 34);          // 03-36
  r += padL(empresa.numero, 5);                             // 37-41
  r += padR(empresa.complemento.toUpperCase(), 22);         // 42-63
  r += padR(empresa.bairro.toUpperCase(), 15);              // 64-78
  r += padL(empresa.cep, 8);                                // 79-86
  r += padR(empresa.responsavel.toUpperCase(), 28);         // 87-114
  r += padL(empresa.telefone, 12);                          // 115-126
  return fixLen(r);
}

// ===================== Registro 50 — Nota Fiscal mod 1/1A e NF-e =====================
// Pos 01-02: Tipo (2)  |  03-16: CNPJ (14)  |  17-30: IE (14)
// Pos 31-38: Data AAAAMMDD (8)  |  39-40: UF (2)  |  41-42: Modelo (2)
// Pos 43-45: Série (3)  |  46-51: Número (6)  |  52-55: CFOP (4)
// Pos 56: Emitente P/T (1)  |  57-69: Vlr Total (13,2)
// Pos 70-82: BC ICMS (13,2)  |  83-95: Vlr ICMS (13,2)
// Pos 96-108: Isenta/NT (13,2)  |  109-121: Outras (13,2)
// Pos 122-125: Alíq ICMS (4,2)  |  126: Situação N/S/E/X/2/4 (1)
// Total = 126
function gerarRegistros50Exemplo(): { linhas: string[]; count: number } {
  const exemplos = [
    { cnpj: "11222333000144", ie: "1234567890", dt: "20240115", uf: "SP", mod: "55",
      serie: "001", num: "001234", cfop: "5102", emit: "P",
      vlTotal: 1500.00, bcIcms: 1500.00, vlIcms: 270.00,
      isenta: 0, outras: 0, aliq: 18.00, sit: "N" },
    { cnpj: "55666777000188", ie: "9876543210", dt: "20240220", uf: "SP", mod: "55",
      serie: "001", num: "005678", cfop: "5405", emit: "P",
      vlTotal: 899.90, bcIcms: 0, vlIcms: 0,
      isenta: 0, outras: 899.90, aliq: 0, sit: "N" },
  ];

  const linhas = exemplos.map(e => {
    let r = "50";                                           // 01-02
    r += padL(e.cnpj, 14);                                  // 03-16
    r += padR(e.ie, 14);                                    // 17-30
    r += e.dt;                                              // 31-38
    r += padR(e.uf, 2);                                     // 39-40
    r += padL(e.mod, 2);                                    // 41-42
    r += padR(e.serie, 3);                                  // 43-45
    r += padL(e.num, 6);                                    // 46-51
    r += padL(e.cfop, 4);                                   // 52-55
    r += e.emit;                                            // 56
    r += padL(Math.round(e.vlTotal * 100), 13);             // 57-69
    r += padL(Math.round(e.bcIcms * 100), 13);              // 70-82
    r += padL(Math.round(e.vlIcms * 100), 13);              // 83-95
    r += padL(Math.round(e.isenta * 100), 13);              // 96-108
    r += padL(Math.round(e.outras * 100), 13);              // 109-121
    r += padL(Math.round(e.aliq * 100), 4);                 // 122-125
    r += e.sit;                                             // 126
    return fixLen(r);
  });

  return { linhas, count: linhas.length };
}

// ===================== Registro 54 — Produto / Item da NF =====================
// Pos 01-02: Tipo (2)  |  03-16: CNPJ (14)  |  17-18: Modelo (2)
// Pos 19-21: Série (3)  |  22-27: Número NF (6)  |  28-31: CFOP (4)
// Pos 32-34: CST (3)  |  35-37: Nº Item (3)  |  38-51: Cód Produto (14)
// Pos 52-62: Quantidade (11,3)  |  63-74: Vlr Produto (12,2)
// Pos 75-86: Desconto (12,2)  |  87-98: BC ICMS (12,2)
// Pos 99-110: BC ICMS ST (12,2)  |  111-122: Vlr IPI (12,2)
// Pos 123-126: Alíq ICMS (4,2)
// Total = 126
function gerarRegistros54Exemplo(): { linhas: string[]; count: number } {
  const exemplos = [
    { cnpj: "11222333000144", mod: "55", serie: "001", num: "001234",
      cfop: "5102", cst: "000", item: 1, codigo: "PROD001",
      qtd: 10.000, vlProd: 1500.00, desc: 0, bcIcms: 1500.00,
      bcST: 0, vlIpi: 0, aliq: 18.00 },
  ];

  const linhas = exemplos.map(e => {
    let r = "54";                                           // 01-02
    r += padL(e.cnpj, 14);                                  // 03-16
    r += padL(e.mod, 2);                                    // 17-18
    r += padR(e.serie, 3);                                  // 19-21
    r += padL(e.num, 6);                                    // 22-27
    r += padL(e.cfop, 4);                                   // 28-31
    r += padR(e.cst, 3);                                    // 32-34
    r += padL(e.item, 3);                                   // 35-37
    r += padR(e.codigo, 14);                                // 38-51
    r += padL(Math.round(e.qtd * 1000), 11);                // 52-62  (3 dec)
    r += padL(Math.round(e.vlProd * 100), 12);              // 63-74  (2 dec)
    r += padL(Math.round(e.desc * 100), 12);                // 75-86
    r += padL(Math.round(e.bcIcms * 100), 12);              // 87-98
    r += padL(Math.round(e.bcST * 100), 12);                // 99-110
    r += padL(Math.round(e.vlIpi * 100), 12);               // 111-122
    r += padL(Math.round(e.aliq * 100), 4);                 // 123-126
    return fixLen(r);
  });

  return { linhas, count: linhas.length };
}

// ===================== Registro 60M — Mestre ECF (Cupom Fiscal) =====================
// Pos 01-02: Tipo (2)  |  03: Subtipo "M" (1)  |  04-11: Data AAAAMMDD (8)
// Pos 12-31: Nº série fabricação (20)  |  32-34: Nº seq ECF (3)
// Pos 35-36: Modelo doc fiscal (2)  |  37-42: COO início (6)
// Pos 43-48: COO fim (6)  |  49-54: CRZ (6)  |  55-57: CRO (3)
// Pos 58-73: Venda bruta diária (16,2)  |  74-89: GT final (16,2)
// Pos 90-126: Brancos (37)
// Total = 126
function gerarRegistros60MExemplo(): { linhas: string[]; count: number } {
  let r = "60";                                             // 01-02
  r += "M";                                                 // 03
  r += "20240115";                                          // 04-11
  r += padR("ECF-001-SERIE", 20);                           // 12-31
  r += padL("1", 3);                                       // 32-34
  r += padR("2D", 2);                                      // 35-36
  r += padL("100", 6);                                     // 37-42
  r += padL("150", 6);                                     // 43-48
  r += padL("120", 6);                                     // 49-54
  r += padL("1", 3);                                       // 55-57  (CRO = 3 dígitos)
  r += padL(Math.round(5000.00 * 100), 16);                // 58-73
  r += padL(Math.round(125000.00 * 100), 16);              // 74-89
  // 90-126: brancos (37)
  return { linhas: [fixLen(r)], count: 1 };
}

// ===================== Registro 61 — Resumo Mensal (doc mod 2/2D sem ECF) =====================
// Pos 01-02: Tipo (2)  |  03-126: campos — placeholder
function gerarRegistros61Exemplo(): { linhas: string[]; count: number } {
  return { linhas: [], count: 0 };
}

// ===================== Registro 70 — Nota Fiscal Serviço Transporte / CT-e =====================
// Pos 01-02: Tipo (2)  |  03-16: CNPJ (14)  |  17-30: IE (14)
// Pos 31-38: Data (8)  |  39-40: UF (2)  |  41-42: Modelo (2)
// Pos 43-45: Série (3)  |  46-46: Subsérie (1)  |  47-52: Número (6)
// Pos 53-56: CFOP (4)  |  57-69: Vlr Total (13,2)
// Pos 70-82: BC ICMS (13,2)  |  83-95: Vlr ICMS (13,2)
// Pos 96-108: Isenta/NT (13,2)  |  109-121: Outras (13,2)
// Pos 122: CIF/FOB (1)  |  123-126: Situação (1) + brancos (3)
// Total = 126
function gerarRegistros70Exemplo(): { linhas: string[]; count: number } {
  return { linhas: [], count: 0 };
}

// ===================== Registro 74 — Inventário =====================
// Pos 01-02: Tipo (2)  |  03-10: Data inventário AAAAMMDD (8)
// Pos 11-24: Cód produto (14)  |  25-37: Quantidade (13,3)
// Pos 38-50: Vlr produto (13,2)  |  51: Cód posse (1)
// Pos 52-65: CNPJ possuidor (14)  |  66-79: IE possuidor (14)
// Pos 80-81: UF (2)  |  82-126: Brancos (45)
// Total = 126
function gerarRegistros74Exemplo(): { linhas: string[]; count: number } {
  const exemplos = [
    { dt: "20241231", codigo: "PROD001", qtd: 10.000, vlProd: 1500.00,
      codPosse: "1", cnpjPoss: "12345678000190", iePoss: "1234567890", uf: "SP" },
  ];

  const linhas = exemplos.map(e => {
    let r = "74";                                           // 01-02
    r += e.dt;                                              // 03-10
    r += padR(e.codigo, 14);                                // 11-24
    r += padL(Math.round(e.qtd * 1000), 13);                // 25-37  (3 dec)
    r += padL(Math.round(e.vlProd * 100), 13);              // 38-50  (2 dec)
    r += e.codPosse;                                        // 51
    r += padL(e.cnpjPoss, 14);                              // 52-65
    r += padR(e.iePoss, 14);                                // 66-79
    r += padR(e.uf, 2);                                     // 80-81
    // 82-126: brancos
    return fixLen(r);
  });

  return { linhas, count: linhas.length };
}

// ===================== Registro 75 — Código do Produto ou Serviço =====================
// Pos 01-02: Tipo (2)  |  03-10: Data inicial AAAAMMDD (8)
// Pos 11-18: Data final AAAAMMDD (8)  |  19-32: Cód produto (14)
// Pos 33-40: NCM/SH (8)  |  41-93: Descrição (53)
// Pos 94-99: Unidade (6)  |  100-104: Alíq IPI (5,2)
// Pos 105-108: Alíq ICMS (4,2)  |  109-113: Redução BC (5,2)
// Pos 114-126: BC ICMS ST p/ MVA (13,2)
// Total = 126
function gerarRegistros75Exemplo(periodoInicio: string, periodoFim: string): { linhas: string[]; count: number } {
  const exemplos = [
    { codigo: "PROD001", ncm: "84713012", descricao: "NOTEBOOK PORTATIL",
      unidade: "UN", aliqIpi: 0, aliqIcms: 18.00, reducao: 0, baseST: 0 },
  ];

  const linhas = exemplos.map(e => {
    let r = "75";                                           // 01-02
    r += periodoToData(periodoInicio, "inicio");            // 03-10
    r += periodoToData(periodoFim, "fim");                  // 11-18
    r += padR(e.codigo, 14);                                // 19-32
    r += padR(e.ncm, 8);                                    // 33-40
    r += padR(e.descricao.toUpperCase(), 53);               // 41-93
    r += padR(e.unidade.toUpperCase(), 6);                  // 94-99
    r += padL(Math.round(e.aliqIpi * 100), 5);              // 100-104
    r += padL(Math.round(e.aliqIcms * 100), 4);             // 105-108
    r += padL(Math.round(e.reducao * 100), 5);              // 109-113
    r += padL(Math.round(e.baseST * 100), 13);              // 114-126
    return fixLen(r);
  });

  return { linhas, count: linhas.length };
}

// ===================== Registro 90 — Totalização do Arquivo =====================
// Pos 01-02: Tipo (2)  |  03-16: CNPJ (14)  |  17-30: IE (14)
// Pos 31-126: Pares (tipo 2 + total 8) até 9 pares = 90 + total geral 8 + nº reg90 1
// Cada par = 10 posições. Máx 9 pares por linha (90 pos) + total geral(8) + nºreg90(1) = 99... 
// Na verdade: 31 até 125 = 95 posições. Pares de 10, cabe 9 pares (90). Sobram 5 brancos.
// Pos 126: nº de registros tipo 90 neste arquivo (1)
// A última posição da última linha 90 deve conter o total geral de registros.
function gerarRegistro90(config: SintegraConfig, totalRegistros: Record<string, number>): string[] {
  const { empresa } = config;
  const cnpj = padL(empresa.cnpj, 14);
  const ie = padR(empresa.inscricaoEstadual.replace(/\D/g, ""), 14);

  // Inclui reg 90 no total
  const tipos = Object.keys(totalRegistros).sort();
  
  // Agrupa em blocos de até 9 pares por linha
  const maxPares = 9;
  const numLinhas90 = Math.max(1, Math.ceil(tipos.length / maxPares));
  
  // Total geral inclui as linhas do reg 90
  const totalGeralRegs = Object.values(totalRegistros).reduce((a, b) => a + b, 0) + numLinhas90;

  const linhas: string[] = [];

  for (let bloco = 0; bloco < numLinhas90; bloco++) {
    let r = "90";                                           // 01-02
    r += cnpj;                                              // 03-16
    r += ie;                                                // 17-30

    const inicio = bloco * maxPares;
    const fim = Math.min(inicio + maxPares, tipos.length);

    for (let i = inicio; i < fim; i++) {
      r += padR(tipos[i], 2);                               // tipo registro
      r += padL(totalRegistros[tipos[i]], 8);                // total desse tipo
    }

    // Na última linha, adiciona o total geral
    if (bloco === numLinhas90 - 1) {
      // Preenche pares vazios restantes
      const paresUsados = fim - inicio;
      for (let i = paresUsados; i < maxPares - 1; i++) {
        r += padR("", 10);
      }
      // Par com total geral
      r += padL("99", 2);
      r += padL(totalGeralRegs, 8);
    } else {
      const paresUsados = fim - inicio;
      for (let i = paresUsados; i < maxPares; i++) {
        r += padR("", 10);
      }
    }

    // Garante 125 chars + nº de linhas 90 na pos 126
    r = r.substring(0, 125).padEnd(125, " ");
    r += padL(numLinhas90, 1);                              // 126
    linhas.push(fixLen(r));
  }

  return linhas;
}

// ===================== Montagem do arquivo =====================

export function gerarArquivoSintegra(config: SintegraConfig): string {
  const { registrosSelecionados, periodoInicio, periodoFim } = config;
  const linhas: string[] = [];
  const totais: Record<string, number> = {};

  // Registros obrigatórios
  linhas.push(gerarRegistro10(config));
  totais["10"] = 1;
  linhas.push(gerarRegistro11(config));
  totais["11"] = 1;

  // Registros condicionais
  if (registrosSelecionados.includes("reg50")) {
    const r = gerarRegistros50Exemplo();
    linhas.push(...r.linhas);
    totais["50"] = r.count;
  }
  if (registrosSelecionados.includes("reg54")) {
    const r = gerarRegistros54Exemplo();
    linhas.push(...r.linhas);
    totais["54"] = r.count;
  }
  if (registrosSelecionados.includes("reg60")) {
    const r = gerarRegistros60MExemplo();
    if (r.count > 0) { linhas.push(...r.linhas); totais["60"] = r.count; }
  }
  if (registrosSelecionados.includes("reg61")) {
    const r = gerarRegistros61Exemplo();
    if (r.count > 0) { linhas.push(...r.linhas); totais["61"] = r.count; }
  }
  if (registrosSelecionados.includes("reg70")) {
    const r = gerarRegistros70Exemplo();
    if (r.count > 0) { linhas.push(...r.linhas); totais["70"] = r.count; }
  }
  if (registrosSelecionados.includes("reg74")) {
    const r = gerarRegistros74Exemplo();
    linhas.push(...r.linhas);
    totais["74"] = r.count;
  }
  if (registrosSelecionados.includes("reg75")) {
    const r = gerarRegistros75Exemplo(periodoInicio, periodoFim);
    linhas.push(...r.linhas);
    totais["75"] = r.count;
  }

  // Registro 90 — obrigatório (totalização)
  const linhas90 = gerarRegistro90(config, totais);
  linhas.push(...linhas90);

  return linhas.join("\r\n") + "\r\n";
}

export function downloadSintegra(conteudo: string, periodoInicio: string) {
  const [ano, mes] = periodoInicio.split("-");
  const filename = `SINTEGRA_${ano}${mes}.txt`;
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
