import type { CnabHeaderArquivo, CnabDetalheCobranca } from "./types";

// ========== CNAB 400 Generator ==========

function pad(str: string, len: number, char = " ", right = false): string {
  const s = (str || "").toString().substring(0, len);
  return right ? s.padEnd(len, char) : s.padStart(len, char);
}

function padNum(num: number | string, len: number): string {
  return pad(String(num).replace(/\D/g, ""), len, "0");
}

function padAlpha(str: string, len: number): string {
  return pad(str.toUpperCase(), len, " ", true);
}

function formatDate400(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}${m}${y.slice(2)}`;
}

function formatValue400(valor: number, len = 13): string {
  return padNum(Math.round(valor * 100), len);
}

// Header de Arquivo CNAB 400
export function gerarHeaderArquivo400(header: CnabHeaderArquivo): string {
  let linha = "";
  linha += "0";                                      // 1 tipo registro
  linha += "1";                                      // 2 operação (remessa)
  linha += "REMESSA";                                // 3-9
  linha += "01";                                     // 10-11 tipo serviço (cobrança)
  linha += padAlpha("COBRANCA", 15);                // 12-26
  linha += padNum("0", 20);                         // 27-46 código empresa/convênio
  linha += padAlpha(header.nomeEmpresa, 30);        // 47-76
  linha += padNum(header.codigoBanco, 3);           // 77-79
  linha += padAlpha(header.nomeEmpresaBanco || "", 15); // 80-94
  linha += formatDate400(header.dataGeracao);       // 95-100
  linha += pad("", 8, " ", true);                   // 101-108
  linha += "MX";                                     // 109-110
  linha += padNum(header.sequencialArquivo, 7);     // 111-117
  linha += pad("", 277, " ", true);                 // 118-394
  linha += padNum(1, 6);                            // 395-400 sequencial

  return linha.substring(0, 400);
}

// Detalhe (Registro 1) CNAB 400
export function gerarDetalhe400(
  seqRegistro: number,
  header: CnabHeaderArquivo,
  det: CnabDetalheCobranca
): string {
  let linha = "";
  linha += "1";                                      // 1 tipo registro
  linha += "02";                                     // 2-3 tipo inscrição (CNPJ)
  linha += padNum(header.cnpjEmpresa, 14);          // 4-17
  linha += padNum(header.agencia, 4);               // 18-21
  linha += padNum("0", 2);                          // 22-23 complemento agência
  linha += padNum(header.conta, 5);                 // 24-28
  linha += padAlpha(header.digitoConta, 1);         // 29
  linha += pad("", 4, " ", true);                   // 30-33 uso banco
  linha += padNum("0", 4);                          // 34-37 instrução/alegação
  linha += padAlpha(det.seuNumero, 25);             // 38-62
  linha += padAlpha(det.nossoNumero, 12);           // 63-74
  linha += pad("", 12, " ", true);                  // 75-86 uso banco
  linha += "01";                                     // 87-88 tipo cobrança
  linha += "01";                                     // 89-90 comando (entrada)
  linha += padAlpha(det.seuNumero, 10);             // 91-100
  linha += formatDate400(det.dataVencimento);       // 101-106
  linha += formatValue400(det.valorTitulo);         // 107-119
  linha += padNum(header.codigoBanco, 3);           // 120-122
  linha += padNum("0", 5);                          // 123-127 agência cobradora
  linha += padAlpha(det.especieDoc || "DM", 2);     // 128-129
  linha += "N";                                      // 130 aceite
  linha += formatDate400(det.dataEmissao);          // 131-136
  linha += "00";                                     // 137-138 instrução 1
  linha += "00";                                     // 139-140 instrução 2
  linha += formatValue400(det.jurosMora);           // 141-153
  linha += formatDate400(det.dataVencimento);       // 154-159 data desconto
  linha += formatValue400(det.desconto);            // 160-172
  linha += formatValue400(0);                       // 173-185 IOF
  linha += formatValue400(0);                       // 186-198 abatimento
  const tipoSacado = (det.sacadoDoc || "").replace(/\D/g, "").length > 11 ? "02" : "01";
  linha += tipoSacado;                              // 199-200
  linha += padNum(det.sacadoDoc, 14);               // 201-214
  linha += padAlpha(det.sacadoNome, 40);            // 215-254
  linha += padAlpha(det.sacadoEndereco, 40);        // 255-294
  linha += pad("", 12, " ", true);                  // 295-306 mensagem
  linha += padNum(det.sacadoCEP, 8);                // 307-314
  linha += pad("", 80, " ", true);                  // 315-394
  linha += padNum(seqRegistro, 6);                  // 395-400

  return linha.substring(0, 400);
}

// Trailer CNAB 400
export function gerarTrailer400(seqRegistro: number): string {
  let linha = "";
  linha += "9";                                      // 1 tipo registro
  linha += pad("", 393, " ", true);                 // 2-394
  linha += padNum(seqRegistro, 6);                  // 395-400

  return linha.substring(0, 400);
}

export function gerarRemessaCobranca400(
  header: CnabHeaderArquivo,
  detalhes: CnabDetalheCobranca[]
): string {
  const linhas: string[] = [];
  linhas.push(gerarHeaderArquivo400(header));

  detalhes.forEach((det, i) => {
    linhas.push(gerarDetalhe400(i + 2, header, det));
  });

  linhas.push(gerarTrailer400(detalhes.length + 2));

  return linhas.join("\r\n");
}
