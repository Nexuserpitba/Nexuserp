/**
 * Gerador de arquivo SPED Contribuições (EFD PIS/Cofins)
 * Layout conforme Guia Prático da EFD-Contribuições — registros delimitados por pipe "|".
 * Blocos: 0 (Abertura), A (Serviços), C (Mercadorias), D (Transporte),
 *         F (Demais Docs), M (Apuração PIS/Cofins), 1 (Complementar), 9 (Encerramento)
 */

export interface SpedContribEmpresa {
  cnpj: string;
  razaoSocial: string;
  fantasia: string;
  inscricaoEstadual: string;
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
  regime: string;
  cnae: string;
}

export interface SpedContribConfig {
  empresa: SpedContribEmpresa;
  periodoInicio: string;
  periodoFim: string;
  tipoEscrituracao: string;
  situacaoEspecial: string;
  layoutCodigo: string;
  indNatPj: string;
  indAtiv: string;
  blocosAtivos?: Record<string, boolean>;
}

export const BLOCOS_CONTRIBUICOES = [
  { id: "A", nome: "Bloco A", descricao: "Serviços (NFS-e)" },
  { id: "C", nome: "Bloco C", descricao: "Documentos Fiscais (Mercadorias)" },
  { id: "D", nome: "Bloco D", descricao: "Transporte" },
  { id: "F", nome: "Bloco F", descricao: "Demais Documentos" },
  { id: "M", nome: "Bloco M", descricao: "Apuração PIS/Cofins" },
  { id: "1", nome: "Bloco 1", descricao: "Informações Complementares" },
] as const;

// ==================== Helpers ====================

/**
 * Compõe o CST PIS/COFINS completo para o SPED Contribuições.
 * Utiliza o código de 2 dígitos diretamente (01-99).
 */
export function composeCstPisCofins(cst: string = "01"): string {
  return (cst || "01").padStart(2, "0");
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

// ==================== BLOCO 0 — Abertura ====================

function bloco0(config: SpedContribConfig): string[] {
  const { empresa, periodoInicio, periodoFim, tipoEscrituracao, situacaoEspecial, layoutCodigo } = config;
  const lines: string[] = [];

  // 0000 — Abertura do arquivo
  lines.push(reg(
    "0000",
    layoutCodigo.padStart(3, "0"),       // COD_VER
    tipoEscrituracao,                    // TIPO_ESCRIT
    "",                                  // IND_SIT_ESP
    "0",                                 // NUM_REC_ANTERIOR
    fmtDt(periodoInicio, "inicio"),      // DT_INI
    fmtDt(periodoFim, "fim"),            // DT_FIN
    empresa.razaoSocial.toUpperCase(),   // NOME
    empresa.cnpj.replace(/\D/g, ""),     // CNPJ
    empresa.uf,                          // UF
    empresa.codigoCidade,                // COD_MUN
    "",                                  // SUFRAMA
    config.indNatPj,                     // IND_NAT_PJ
    config.indAtiv                       // IND_ATIV
  ));

  // 0001 — Abertura do Bloco 0
  lines.push(reg("0001", "0"));

  // 0100 — Dados do contabilista
  lines.push(reg(
    "0100",
    "CONTADOR RESPONSAVEL",
    "00000000000",                       // CPF
    "000000",                            // CRC
    "00000000000000",                    // CNPJ escritório
    "00000000",                          // CEP
    "RUA DO CONTADOR",
    "0",
    "",
    "CENTRO",
    "0000000000",
    "",
    "contador@email.com",
    empresa.codigoCidade
  ));

  // 0110 — Regimes de apuração
  lines.push(reg(
    "0110",
    "1",                                 // COD_INC_TRIB (1=Não cumulativo, 2=Cumulativo)
    "1",                                 // IND_APRO_CRED (1=Apropriação direta)
    "1",                                 // COD_TIPO_CONT (1=Exclusiva)
    "",                                  // IND_REG_CUM
  ));

  // 0140 — Tabela de cadastro de estabelecimento
  lines.push(reg(
    "0140",
    "01",                                // COD_EST
    empresa.razaoSocial.toUpperCase(),
    empresa.cnpj.replace(/\D/g, ""),
    empresa.uf,
    empresa.inscricaoEstadual.replace(/\D/g, ""),
    empresa.codigoCidade,
    "",                                  // IM
    "",                                  // SUFRAMA
  ));

  // 0150 — Participante
  lines.push(reg(
    "0150",
    "PART001",
    "CLIENTE EXEMPLO LTDA",
    "1058",
    "11222333000144",
    "",
    "1234567890",
    empresa.codigoCidade,
    "",
    empresa.logradouro.toUpperCase(),
    "100",
    "",
    "CENTRO"
  ));

  // 0190 — Unidades
  lines.push(reg("0190", "UN", "UNIDADE"));
  lines.push(reg("0190", "KG", "QUILOGRAMA"));

  // 0200 — Produtos
  lines.push(reg(
    "0200",
    "PROD001",
    "PRODUTO EXEMPLO PARA TESTE",
    "",                                  // COD_BARRA
    "",                                  // COD_ANT_ITEM
    "UN",
    "00",                                // TIPO_ITEM
    "84713012",                          // COD_NCM
    "",                                  // EX_IPI
    "0000000",
    "",
    fmtVal(18.00)
  ));

  // 0400 — Natureza da operação
  lines.push(reg("0400", "001", "VENDA DE MERCADORIA"));
  lines.push(reg("0400", "002", "COMPRA DE MERCADORIA"));

  // 0990 — Encerramento do Bloco 0
  lines.push(reg("0990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO A — Serviços (NFS-e) ====================

function blocoA(): string[] {
  const lines: string[] = [];
  lines.push(reg("A001", "1")); // sem dados
  lines.push(reg("A990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO C — Documentos Fiscais (Mercadorias) ====================

function blocoC(config: SpedContribConfig): string[] {
  const lines: string[] = [];

  lines.push(reg("C001", "0")); // com dados

  // C010 — Identificação do estabelecimento
  lines.push(reg(
    "C010",
    config.empresa.cnpj.replace(/\D/g, ""),
    "1"                                  // IND_ESCRI (1=Consolidado)
  ));

  // C100 — Documento fiscal (NF-e mod 55)
  lines.push(reg(
    "C100",
    "1",                                 // IND_OPER (1=Saída)
    "0",                                 // IND_EMIT (0=Próprio)
    "PART001",
    "55",                                // COD_MOD
    "00",                                // COD_SIT
    "1",                                 // SER
    "000001234",                         // NUM_DOC
    "35240111222333000144550010000012341000012340",
    fmtDt(config.periodoInicio, "inicio"),
    fmtDt(config.periodoInicio, "inicio"),
    fmtVal(1500.00),                     // VL_DOC
    "0",                                 // IND_PGTO
    fmtVal(0),                           // VL_DESC
    fmtVal(0),                           // VL_ABAT_NT
    fmtVal(1500.00),                     // VL_MERC
    "9",                                 // IND_FRT
    fmtVal(0), fmtVal(0), fmtVal(0),    // FRT, SEG, OUT_DA
    fmtVal(1500.00),                     // VL_BC_ICMS
    fmtVal(270.00),                      // VL_ICMS
    fmtVal(0), fmtVal(0),               // BC_ST, ICMS_ST
    fmtVal(0),                           // VL_IPI
    fmtVal(24.75),                       // VL_PIS
    fmtVal(114.00),                      // VL_COFINS
    fmtVal(0), fmtVal(0)                 // PIS_ST, COFINS_ST
  ));

  // C170 — Item do documento
  lines.push(reg(
    "C170",
    "1",                                 // NUM_ITEM
    "PROD001",
    "PRODUTO EXEMPLO PARA TESTE",
    fmtQtd(10),
    "UN",
    fmtVal(1500.00),                     // VL_ITEM
    fmtVal(0),                           // VL_DESC
    "0",                                 // IND_MOV
    "01",                                // CST_PIS
    fmtVal(1500.00),                     // VL_BC_PIS
    fmtVal(1.65),                        // ALIQ_PIS (%)
    fmtVal(0),                           // QUANT_BC_PIS
    fmtVal(0),                           // ALIQ_PIS_QUANT
    fmtVal(24.75),                       // VL_PIS
    "01",                                // CST_COFINS
    fmtVal(1500.00),                     // VL_BC_COFINS
    fmtVal(7.60),                        // ALIQ_COFINS (%)
    fmtVal(0),                           // QUANT_BC_COFINS
    fmtVal(0),                           // ALIQ_COFINS_QUANT
    fmtVal(114.00),                      // VL_COFINS
    "",                                  // COD_CTA
    ""                                   // VL_ABAT_NT
  ));

  // C990 — Encerramento do Bloco C
  lines.push(reg("C990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO D — Transporte ====================

function blocoD(): string[] {
  const lines: string[] = [];
  lines.push(reg("D001", "1"));
  lines.push(reg("D990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO F — Demais Documentos ====================

function blocoF(): string[] {
  const lines: string[] = [];
  lines.push(reg("F001", "1"));
  lines.push(reg("F990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO M — Apuração PIS e Cofins ====================

function blocoM(config: SpedContribConfig): string[] {
  const lines: string[] = [];

  lines.push(reg("M001", "0")); // com dados

  // M100 — Crédito de PIS/Pasep
  lines.push(reg("M100", ""));

  // M200 — Consolidação da contribuição PIS/Pasep
  lines.push(reg(
    "M200",
    fmtVal(24.75),                       // VL_TOT_CONT_NC_PER (não cumulativo)
    fmtVal(0),                           // VL_TOT_CRED_DESC
    fmtVal(0),                           // VL_TOT_CRED_DESC_ANT
    fmtVal(0),                           // VL_TOT_CONT_NC_DEV
    fmtVal(0),                           // VL_RET_NC
    fmtVal(0),                           // VL_OUT_DED_NC
    fmtVal(24.75),                       // VL_CONT_NC_REC
    fmtVal(0),                           // VL_TOT_CONT_CUM_PER
    fmtVal(0),                           // VL_RET_CUM
    fmtVal(0),                           // VL_OUT_DED_CUM
    fmtVal(0),                           // VL_CONT_CUM_REC
    fmtVal(24.75)                        // VL_TOT_CONT_REC
  ));

  // M210 — Detalhamento PIS — Contribuição apurada
  lines.push(reg(
    "M210",
    "01",                                // COD_CONT
    fmtVal(24.75),                       // VL_REC_BRT
    fmtVal(1500.00),                     // VL_BC_CONT
    fmtVal(1.65),                        // ALIQ_PIS
    fmtVal(0),                           // QUANT_BC_PIS
    fmtVal(0),                           // ALIQ_PIS_QUANT
    fmtVal(24.75),                       // VL_CONT_APUR
    fmtVal(0),                           // VL_AJUS_ACRES
    fmtVal(0),                           // VL_AJUS_REDUC
    fmtVal(24.75),                       // VL_CONT_DIFER
    fmtVal(0),                           // VL_CONT_DIFER_ANT
    fmtVal(24.75)                        // VL_CONT_PER
  ));

  // M500 — Crédito de Cofins (vazio se não há)
  lines.push(reg("M500", ""));

  // M600 — Consolidação Cofins
  lines.push(reg(
    "M600",
    fmtVal(114.00),
    fmtVal(0), fmtVal(0), fmtVal(0),
    fmtVal(0), fmtVal(0),
    fmtVal(114.00),
    fmtVal(0), fmtVal(0), fmtVal(0), fmtVal(0),
    fmtVal(114.00)
  ));

  // M610 — Detalhamento Cofins
  lines.push(reg(
    "M610",
    "01",
    fmtVal(114.00),
    fmtVal(1500.00),
    fmtVal(7.60),
    fmtVal(0), fmtVal(0),
    fmtVal(114.00),
    fmtVal(0), fmtVal(0),
    fmtVal(114.00),
    fmtVal(0),
    fmtVal(114.00)
  ));

  lines.push(reg("M990", String(lines.length + 1)));

  return lines;
}

// ==================== BLOCO 1 — Complementar ====================

function bloco1(): string[] {
  const lines: string[] = [];
  lines.push(reg("1001", "0"));

  // 1010 — Indicadores de detalhamento
  lines.push(reg(
    "1010",
    "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N", "N"
  ));

  lines.push(reg("1990", String(lines.length + 1)));
  return lines;
}

// ==================== BLOCO 9 — Encerramento ====================

function bloco9(allLines: string[]): string[] {
  const lines: string[] = [];
  lines.push(reg("9001", "0"));

  const contagem: Record<string, number> = {};
  for (const line of allLines) {
    const match = line.match(/^\|(\w{4})\|/);
    if (match) contagem[match[1]] = (contagem[match[1]] || 0) + 1;
  }

  contagem["9001"] = 1;
  const total9900 = Object.keys(contagem).length + 3;
  contagem["9900"] = total9900;
  contagem["9990"] = 1;
  contagem["9999"] = 1;

  for (const tipo of Object.keys(contagem).sort()) {
    lines.push(reg("9900", tipo, String(contagem[tipo])));
  }

  lines.push(reg("9990", String(lines.length + 2)));
  const totalGeral = allLines.length + lines.length + 1;
  lines.push(reg("9999", String(totalGeral)));

  return lines;
}

// ==================== Montagem ====================

function blocoVazio(letra: string): string[] {
  const reg_ = (...f: string[]) => "|" + f.join("|") + "|";
  return [reg_(`${letra}001`, "1"), reg_(`${letra}990`, "2")];
}

export function gerarArquivoSpedContribuicoes(config: SpedContribConfig): string {
  const b = config.blocosAtivos || { A: true, C: true, D: true, F: true, M: true, "1": true };
  let allLines: string[] = [];

  allLines.push(...bloco0(config));
  allLines.push(...(b.A !== false ? blocoA() : blocoVazio("A")));
  allLines.push(...(b.C !== false ? blocoC(config) : blocoVazio("C")));
  allLines.push(...(b.D !== false ? blocoD() : blocoVazio("D")));
  allLines.push(...(b.F !== false ? blocoF() : blocoVazio("F")));
  allLines.push(...(b.M !== false ? blocoM(config) : blocoVazio("M")));
  allLines.push(...(b["1"] !== false ? bloco1() : blocoVazio("1")));

  const linhas9 = bloco9(allLines);
  allLines.push(...linhas9);

  return allLines.join("\r\n") + "\r\n";
}

export function downloadSpedContribuicoes(conteudo: string, periodoInicio: string) {
  const [ano, mes] = periodoInicio.split("-");
  const filename = `SPED_CONTRIBUICOES_${ano}${mes}.txt`;
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
