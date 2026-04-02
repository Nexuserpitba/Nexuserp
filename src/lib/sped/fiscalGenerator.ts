/**
 * Gerador de arquivo SPED Fiscal (EFD ICMS/IPI)
 * Layout conforme Guia Prático da EFD — registros delimitados por pipe "|".
 * Blocos: 0 (Abertura), C (Documentos Fiscais), E (Apuração ICMS),
 *         H (Inventário), K (Produção), 1 (Informações Complementares), 9 (Encerramento)
 */

export interface SpedFiscalEmpresa {
  cnpj: string;
  cpf: string;
  razaoSocial: string;
  fantasia: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigoCidade: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  codAtividade: string; // CNAE
  regime: string; // 1=Real, 2=Presumido, 3=Simples
}

export interface SpedFiscalConfig {
  empresa: SpedFiscalEmpresa;
  periodoInicio: string; // YYYY-MM
  periodoFim: string;
  finalidade: string; // 0=Original, 1=Substituto
  perfil: string; // A, B, C
  layoutCodigo: string;
  atividade: string; // 0=Industrial/equiparado, 1=Outros
  blocosAtivos?: Record<string, boolean>; // Ex: { C: true, D: false, E: true, ... }
}

export const BLOCOS_FISCAL = [
  { id: "C", nome: "Bloco C", descricao: "Documentos Fiscais (Mercadorias)" },
  { id: "D", nome: "Bloco D", descricao: "Documentos Fiscais (Serviços)" },
  { id: "E", nome: "Bloco E", descricao: "Apuração do ICMS" },
  { id: "G", nome: "Bloco G", descricao: "CIAP" },
  { id: "H", nome: "Bloco H", descricao: "Inventário Físico" },
  { id: "K", nome: "Bloco K", descricao: "Controle da Produção" },
  { id: "1", nome: "Bloco 1", descricao: "Informações Complementares" },
] as const;

// ==================== Helpers ====================

function fmt(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

/**
 * Compõe o CST ICMS completo (3 dígitos) conforme Ajuste SINIEF 20/2012:
 * Primeiro dígito = Origem da Mercadoria (Tabela A: 0-8)
 * Dois últimos dígitos = Tributação pelo ICMS (Tabela B: 00-90)
 * Ex: composeCstIcms("0", "60") → "060" (Nacional + ICMS cobrado por ST)
 */
export function composeCstIcms(origem: string = "0", cstIcms: string = "00"): string {
  const orig = (origem || "0").charAt(0);
  const trib = (cstIcms || "00").padStart(2, "0");
  return `${orig}${trib}`;
}

function fmtDt(periodo: string, tipo: "inicio" | "fim"): string {
  const [ano, mes] = periodo.split("-");
  if (tipo === "inicio") return `01${mes.padStart(2, "0")}${ano}`;
  const lastDay = new Date(Number(ano), Number(mes), 0).getDate();
  return `${String(lastDay).padStart(2, "0")}${mes.padStart(2, "0")}${ano}`;
}

function fmtVal(val: number, dec = 2): string {
  return val.toFixed(dec).replace(".", ",");
}

function fmtQtd(val: number): string {
  return val.toFixed(3).replace(".", ",");
}

function reg(...fields: string[]): string {
  return "|" + fields.join("|") + "|";
}

// ==================== BLOCO 0 — Abertura e Identificação ====================

function bloco0(config: SpedFiscalConfig): string[] {
  const { empresa, periodoInicio, periodoFim, finalidade, perfil, layoutCodigo } = config;
  const lines: string[] = [];

  // 0000 — Abertura do arquivo digital
  lines.push(reg(
    "0000",
    layoutCodigo.padStart(3, "0"),     // COD_VER
    "0",                                // COD_FIN (0=Remessa)
    fmtDt(periodoInicio, "inicio"),     // DT_INI
    fmtDt(periodoFim, "fim"),           // DT_FIN
    empresa.razaoSocial.toUpperCase(),  // NOME
    empresa.cnpj.replace(/\D/g, ""),    // CNPJ
    empresa.cpf.replace(/\D/g, ""),     // CPF
    empresa.uf,                         // UF
    empresa.inscricaoEstadual.replace(/\D/g, ""), // IE
    empresa.codigoCidade,               // COD_MUN
    empresa.inscricaoMunicipal || "",    // IM
    "",                                 // SUFRAMA
    perfil,                             // IND_PERFIL
    config.atividade                    // IND_ATIV
  ));

  // 0001 — Abertura do Bloco 0
  lines.push(reg("0001", "0")); // 0=Bloco com dados

  // 0005 — Dados complementares da entidade
  lines.push(reg(
    "0005",
    empresa.fantasia.toUpperCase(),
    empresa.cep.replace(/\D/g, ""),
    empresa.logradouro.toUpperCase(),
    empresa.numero,
    empresa.complemento.toUpperCase(),
    empresa.bairro.toUpperCase(),
    empresa.telefone.replace(/\D/g, ""),
    "",                                 // FAX
    empresa.email
  ));

  // 0100 — Dados do contabilista
  lines.push(reg(
    "0100",
    "CONTADOR RESPONSAVEL",             // NOME
    "00000000000",                      // CPF
    "000000",                           // CRC
    "00000000",                         // CNPJ (escritório)
    "00000000",                         // CEP
    "RUA DO CONTADOR",                  // END
    "0",                                // NUM
    "",                                 // COMPL
    "CENTRO",                           // BAIRRO
    "0000000000",                       // FONE
    "",                                 // FAX
    "contador@email.com",               // EMAIL
    empresa.codigoCidade                // COD_MUN
  ));

  // 0150 — Tabela de cadastro do participante (exemplo)
  lines.push(reg(
    "0150",
    "PART001",                          // COD_PART
    "CLIENTE EXEMPLO LTDA",             // NOME
    "1058",                             // COD_PAIS
    "11222333000144",                   // CNPJ
    "",                                 // CPF
    "1234567890",                       // IE
    empresa.codigoCidade,               // COD_MUN
    "",                                 // SUFRAMA
    empresa.logradouro.toUpperCase(),    // END
    "100",                              // NUM
    "",                                 // COMPL
    "CENTRO"                            // BAIRRO
  ));

  // 0190 — Identificação das unidades de medida
  lines.push(reg("0190", "UN", "UNIDADE"));
  lines.push(reg("0190", "KG", "QUILOGRAMA"));
  lines.push(reg("0190", "CX", "CAIXA"));

  // 0200 — Tabela de identificação do item (produto)
  lines.push(reg(
    "0200",
    "PROD001",                          // COD_ITEM
    "PRODUTO EXEMPLO PARA TESTE",       // DESCR_ITEM
    "",                                 // COD_BARRA
    "",                                 // COD_ANT_ITEM
    "UN",                               // UNID_INV
    "00",                               // TIPO_ITEM (00=Mercadoria revenda)
    "84713012",                         // COD_NCM
    "",                                 // EX_IPI
    "0000000",                          // COD_GEN
    "",                                 // COD_LST
    fmtVal(18.00)                       // ALIQ_ICMS
  ));

  // 0990 — Encerramento do Bloco 0
  lines.push(reg("0990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO C — Documentos Fiscais (Mercadorias) ====================

function blocoC(config: SpedFiscalConfig): string[] {
  const lines: string[] = [];

  // C001 — Abertura do Bloco C
  lines.push(reg("C001", "0")); // 0=com dados

  // C100 — Nota fiscal (mod 01/1A/55)
  lines.push(reg(
    "C100",
    "0",                                // IND_OPER (0=Entrada, 1=Saída)
    "1",                                // IND_EMIT (0=Próprio, 1=Terceiros)
    "PART001",                          // COD_PART
    "55",                               // COD_MOD
    "00",                               // COD_SIT (00=Regular)
    "1",                                // SER
    "000001234",                        // NUM_DOC
    "35240111222333000144550010000012341000012340", // CHV_NFE (44 dígitos)
    fmtDt(config.periodoInicio, "inicio"), // DT_DOC
    fmtDt(config.periodoInicio, "inicio"), // DT_E_S
    fmtVal(1500.00),                    // VL_DOC
    "1",                                // IND_PGTO (0=Vista, 1=Prazo)
    fmtVal(0),                          // VL_DESC
    fmtVal(0),                          // VL_ABAT_NT
    fmtVal(1500.00),                    // VL_MERC
    "1",                                // IND_FRT (0=Emit, 1=Dest, 2=Terc, 9=Sem)
    fmtVal(0),                          // VL_FRT
    fmtVal(0),                          // VL_SEG
    fmtVal(0),                          // VL_OUT_DA
    fmtVal(1500.00),                    // VL_BC_ICMS
    fmtVal(270.00),                     // VL_ICMS
    fmtVal(0),                          // VL_BC_ICMS_ST
    fmtVal(0),                          // VL_ICMS_ST
    fmtVal(0),                          // VL_IPI
    fmtVal(0),                          // VL_PIS
    fmtVal(0),                          // VL_COFINS
    fmtVal(0),                          // VL_PIS_ST
    fmtVal(0)                           // VL_COFINS_ST
  ));

  // C170 — Itens do documento
  lines.push(reg(
    "C170",
    "1",                                // NUM_ITEM
    "PROD001",                          // COD_ITEM
    "PRODUTO EXEMPLO PARA TESTE",       // DESCR_COMPL
    fmtQtd(10),                         // QTD
    "UN",                               // UNID
    fmtVal(1500.00),                    // VL_ITEM
    fmtVal(0),                          // VL_DESC
    "0",                                // IND_MOV (0=Sim)
    "000",                              // CST_ICMS (Origem + CST: ex. 060 = Nacional + ST anterior)
    "1102",                             // CFOP
    "000",                              // COD_NAT
    fmtVal(1500.00),                    // VL_BC_ICMS
    fmtVal(18.00),                      // ALIQ_ICMS
    fmtVal(270.00),                     // VL_ICMS
    fmtVal(0),                          // VL_BC_ICMS_ST
    fmtVal(0),                          // ALIQ_ST
    fmtVal(0),                          // VL_ICMS_ST
    "",                                 // IND_APUR
    "50",                               // CST_IPI
    "",                                 // COD_ENQ
    fmtVal(0),                          // VL_BC_IPI
    fmtVal(0),                          // ALIQ_IPI
    fmtVal(0),                          // VL_IPI
    "01",                               // CST_PIS
    fmtVal(1500.00),                    // VL_BC_PIS
    fmtVal(1.65),                       // ALIQ_PIS
    fmtVal(0),                          // QUANT_BC_PIS
    fmtVal(0),                          // ALIQ_PIS_QUANT
    fmtVal(24.75),                      // VL_PIS
    "01",                               // CST_COFINS
    fmtVal(1500.00),                    // VL_BC_COFINS
    fmtVal(7.60),                       // ALIQ_COFINS
    fmtVal(0),                          // QUANT_BC_COFINS
    fmtVal(0),                          // ALIQ_COFINS_QUANT
    fmtVal(114.00),                     // VL_COFINS
    "",                                 // COD_CTA
    ""                                  // VL_ABAT_NT
  ));

  // C190 — Registro analítico do documento (consolidação)
  lines.push(reg(
    "C190",
    "000",                              // CST_ICMS (Origem + CST composto — Ajuste SINIEF 20/2012)
    "1102",                             // CFOP
    fmtVal(18.00),                      // ALIQ_ICMS
    fmtVal(1500.00),                    // VL_OPR
    fmtVal(1500.00),                    // VL_BC_ICMS
    fmtVal(270.00),                     // VL_ICMS
    fmtVal(0),                          // VL_BC_ICMS_ST
    fmtVal(0),                          // VL_ICMS_ST
    fmtVal(0),                          // VL_RED_BC
    fmtVal(0),                          // VL_IPI
    "",                                 // COD_OBS
  ));

  // C990 — Encerramento do Bloco C
  lines.push(reg("C990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO D — Documentos Fiscais (Serviços) ====================

function blocoD(): string[] {
  const lines: string[] = [];
  lines.push(reg("D001", "1")); // 1=Bloco sem dados
  lines.push(reg("D990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO E — Apuração do ICMS ====================

function blocoE(config: SpedFiscalConfig): string[] {
  const lines: string[] = [];

  // E001 — Abertura
  lines.push(reg("E001", "0"));

  // E100 — Período de apuração do ICMS
  lines.push(reg(
    "E100",
    fmtDt(config.periodoInicio, "inicio"),
    fmtDt(config.periodoFim, "fim")
  ));

  // E110 — Apuração do ICMS — Operações próprias
  lines.push(reg(
    "E110",
    fmtVal(270.00),                     // VL_TOT_DEBITOS
    fmtVal(0),                          // VL_AJ_DEBITOS
    fmtVal(270.00),                     // VL_TOT_AJ_DEBITOS
    fmtVal(0),                          // VL_ESTORNOS_CRED
    fmtVal(0),                          // VL_TOT_CREDITOS
    fmtVal(0),                          // VL_AJ_CREDITOS
    fmtVal(0),                          // VL_TOT_AJ_CREDITOS
    fmtVal(0),                          // VL_ESTORNOS_DEB
    fmtVal(270.00),                     // VL_SLD_CREDOR_ANT
    fmtVal(270.00),                     // VL_SLD_APURADO
    fmtVal(0),                          // VL_TOT_DED
    fmtVal(270.00),                     // VL_ICMS_RECOLHER
    fmtVal(0),                          // VL_SLD_CREDOR_TRANSPORTAR
    fmtVal(0)                           // DEB_ESP
  ));

  // E990 — Encerramento
  lines.push(reg("E990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO G — CIAP ====================

function blocoG(): string[] {
  const lines: string[] = [];
  lines.push(reg("G001", "1")); // sem dados
  lines.push(reg("G990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO H — Inventário Físico ====================

function blocoH(config: SpedFiscalConfig): string[] {
  const lines: string[] = [];

  lines.push(reg("H001", "0")); // com dados

  // H005 — Totais do inventário
  lines.push(reg(
    "H005",
    fmtDt(config.periodoFim, "fim"),    // DT_INV
    fmtVal(1500.00),                    // VL_INV
    "02"                                // MOT_INV (02=Final do período)
  ));

  // H010 — Inventário
  lines.push(reg(
    "H010",
    "PROD001",                          // COD_ITEM
    "UN",                               // UNID
    fmtQtd(10),                         // QTD
    fmtVal(150.00),                     // VL_UNIT
    fmtVal(1500.00),                    // VL_ITEM
    "",                                 // IND_PROP (0=Informante)
    "",                                 // COD_PART
    "",                                 // TXT_COMPL
    "",                                 // COD_CTA
    fmtVal(1500.00),                    // VL_ITEM_IR
  ));

  lines.push(reg("H990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO K — Controle da Produção ====================

function blocoK(): string[] {
  const lines: string[] = [];
  lines.push(reg("K001", "1")); // sem dados
  lines.push(reg("K990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO 1 — Informações Complementares ====================

function bloco1(): string[] {
  const lines: string[] = [];

  lines.push(reg("1001", "0")); // com dados

  // 1010 — Obrigatoriedade de registros do Bloco 1
  lines.push(reg(
    "1010",
    "N",  // IND_EXP
    "N",  // IND_CCRF
    "N",  // IND_COMB
    "N",  // IND_USINA
    "N",  // IND_VA
    "N",  // IND_EE
    "N",  // IND_CART
    "N",  // IND_FORM
    "N"   // IND_AER
  ));

  lines.push(reg("1990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO 9 — Controle e Encerramento ====================

function bloco9(allLines: string[]): string[] {
  const lines: string[] = [];

  lines.push(reg("9001", "0")); // com dados

  // 9900 — Registros do arquivo (quantidade por tipo)
  const contagem: Record<string, number> = {};
  for (const line of allLines) {
    const match = line.match(/^\|(\w{4})\|/);
    if (match) {
      contagem[match[1]] = (contagem[match[1]] || 0) + 1;
    }
  }

  // Adiciona contagem dos próprios registros 9xxx que serão gerados
  const tipos9 = Object.keys(contagem).sort();
  // +3 para 9001, 9990, 9999; + N para cada 9900
  const total9900 = tipos9.length + 4; // +4 = 9001, 9900 (próprio), 9990, 9999
  contagem["9001"] = 1;
  contagem["9900"] = total9900;
  contagem["9990"] = 1;
  contagem["9999"] = 1;

  const tiposOrdenados = Object.keys(contagem).sort();
  for (const tipo of tiposOrdenados) {
    lines.push(reg("9900", tipo, String(contagem[tipo])));
  }

  // 9990 — Encerramento do Bloco 9
  lines.push(reg("9990", String(lines.length + 2))); // +2 = 9990 + 9999

  // 9999 — Encerramento do arquivo
  const totalGeral = allLines.length + lines.length + 1; // +1 para o próprio 9999
  lines.push(reg("9999", String(totalGeral)));

  return lines;
}

// ==================== Montagem do arquivo ====================

function blocoVazio(letra: string): string[] {
  const reg_ = (...f: string[]) => "|" + f.join("|") + "|";
  return [reg_(`${letra}001`, "1"), reg_(`${letra}990`, "2")];
}

export function gerarArquivoSpedFiscal(config: SpedFiscalConfig): string {
  const b = config.blocosAtivos || { C: true, D: true, E: true, G: true, H: true, K: true, "1": true };
  let allLines: string[] = [];

  allLines.push(...bloco0(config));
  allLines.push(...(b.C !== false ? blocoC(config) : blocoVazio("C")));
  allLines.push(...(b.D !== false ? blocoD() : blocoVazio("D")));
  allLines.push(...(b.E !== false ? blocoE(config) : blocoVazio("E")));
  allLines.push(...(b.G !== false ? blocoG() : blocoVazio("G")));
  allLines.push(...(b.H !== false ? blocoH(config) : blocoVazio("H")));
  allLines.push(...(b.K !== false ? blocoK() : blocoVazio("K")));
  allLines.push(...(b["1"] !== false ? bloco1() : blocoVazio("1")));

  const linhas9 = bloco9(allLines);
  allLines.push(...linhas9);

  return allLines.join("\r\n") + "\r\n";
}

export function downloadSpedFiscal(conteudo: string, periodoInicio: string) {
  const [ano, mes] = periodoInicio.split("-");
  const filename = `SPED_FISCAL_${ano}${mes}.txt`;
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
