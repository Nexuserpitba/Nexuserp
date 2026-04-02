import type { CnabHeaderArquivo, CnabDetalheCobranca, CnabDetalhePagamento } from "./types";

// ========== CNAB 240 Generator ==========

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

function formatDate(dateStr: string): string {
  // from YYYY-MM-DD to DDMMYYYY
  const [y, m, d] = dateStr.split("-");
  return `${d}${m}${y}`;
}

function formatValue(valor: number): string {
  return padNum(Math.round(valor * 100), 15);
}

// Header de Arquivo (Registro 0)
export function gerarHeaderArquivo240(header: CnabHeaderArquivo): string {
  let linha = "";
  linha += padNum(header.codigoBanco, 3);          // 1-3
  linha += "0000";                                   // 4-7 lote
  linha += "0";                                      // 8 tipo registro
  linha += pad("", 9, " ", true);                   // 9-17 uso FEBRABAN
  linha += "2";                                      // 18 tipo inscrição (2=CNPJ)
  linha += padNum(header.cnpjEmpresa, 14);          // 19-32
  linha += padAlpha(header.convenio, 20);            // 33-52 convênio
  linha += padNum(header.agencia, 5);               // 53-57
  linha += pad("", 1, " ", true);                   // 58 dígito agência
  linha += padNum(header.conta, 12);                // 59-70
  linha += padAlpha(header.digitoConta, 1);         // 71
  linha += " ";                                      // 72 dígito ag/conta
  linha += padAlpha(header.nomeEmpresa, 30);        // 73-102
  linha += padAlpha(header.nomeEmpresaBanco || header.codigoBanco, 30); // 103-132
  linha += pad("", 10, " ", true);                  // 133-142 uso FEBRABAN
  linha += "1";                                      // 143 código remessa
  linha += formatDate(header.dataGeracao);          // 144-151
  linha += padNum(header.horaGeracao.replace(":", ""), 6); // 152-157
  linha += padNum(header.sequencialArquivo, 6);     // 158-163
  linha += padAlpha(header.layoutVersao || "087", 3); // 164-166
  linha += padNum("0", 5);                          // 167-171 densidade
  linha += pad("", 20, " ", true);                  // 172-191 reservado banco
  linha += pad("", 20, " ", true);                  // 192-211 reservado empresa
  linha += pad("", 29, " ", true);                  // 212-240 uso FEBRABAN

  return linha.substring(0, 240);
}

// Header de Lote (Registro 1)
export function gerarHeaderLote240(
  codigoBanco: string,
  loteNum: number,
  tipoServico: string, // "01"=cobrança, "20"=pagamento
  header: CnabHeaderArquivo
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += padNum(loteNum, 4);
  linha += "1"; // tipo registro
  linha += "R"; // operação R=remessa
  linha += padNum(tipoServico, 2);
  linha += pad("", 2, " ", true); // forma lançamento
  linha += padAlpha("045", 3); // layout versão lote
  linha += " "; // uso FEBRABAN
  linha += "2"; // tipo inscrição
  linha += padNum(header.cnpjEmpresa, 15);
  linha += padAlpha(header.convenio, 20);
  linha += padNum(header.agencia, 5);
  linha += " ";
  linha += padNum(header.conta, 12);
  linha += padAlpha(header.digitoConta, 1);
  linha += " ";
  linha += padAlpha(header.nomeEmpresa, 30);
  linha += pad("", 40, " ", true); // mensagem 1
  linha += pad("", 40, " ", true); // mensagem 2
  linha += padNum(header.sequencialArquivo, 8);
  linha += formatDate(header.dataGeracao);
  linha += padNum("0", 8); // data crédito
  linha += pad("", 33, " ", true);

  return linha.substring(0, 240);
}

// Detalhe Segmento P (Cobrança)
export function gerarSegmentoP(
  codigoBanco: string,
  loteNum: number,
  seqRegistro: number,
  header: CnabHeaderArquivo,
  det: CnabDetalheCobranca
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += padNum(loteNum, 4);
  linha += "3"; // tipo registro
  linha += padNum(seqRegistro, 5);
  linha += "P"; // segmento
  linha += " ";
  linha += "01"; // código movimento (01=entrada)
  linha += padNum(header.agencia, 5);
  linha += " ";
  linha += padNum(header.conta, 12);
  linha += padAlpha(header.digitoConta, 1);
  linha += " ";
  linha += padAlpha(det.nossoNumero, 20);
  linha += "1"; // carteira
  linha += "1"; // forma cadastro
  linha += "1"; // tipo documento
  linha += "2"; // emissão boleto
  linha += "2"; // distribuição
  linha += padAlpha(det.seuNumero, 15);
  linha += formatDate(det.dataVencimento);
  linha += formatValue(det.valorTitulo);
  linha += padNum("0", 5); // agência cobradora
  linha += " ";
  linha += padAlpha(det.especieDoc || "DM", 2);
  linha += "N"; // aceite
  linha += formatDate(det.dataEmissao);
  linha += "1"; // código juros
  linha += formatDate(det.dataVencimento); // data juros
  linha += formatValue(det.jurosMora);
  linha += "0"; // código desconto
  linha += padNum("0", 8);
  linha += formatValue(det.desconto);
  linha += formatValue(0); // IOF
  linha += formatValue(0); // abatimento
  linha += padAlpha(det.seuNumero, 25); // identificação
  linha += "1"; // código protesto
  linha += padNum("0", 2); // dias protesto
  linha += "0"; // código baixa
  linha += padNum("0", 3); // dias baixa
  linha += "09"; // código moeda (09=real)
  linha += padNum("0", 10);
  linha += " ";

  return linha.substring(0, 240);
}

// Detalhe Segmento Q (Dados Sacado)
export function gerarSegmentoQ(
  codigoBanco: string,
  loteNum: number,
  seqRegistro: number,
  det: CnabDetalheCobranca
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += padNum(loteNum, 4);
  linha += "3";
  linha += padNum(seqRegistro, 5);
  linha += "Q";
  linha += " ";
  linha += "01"; // código movimento
  const tipoDoc = (det.sacadoDoc || "").replace(/\D/g, "").length > 11 ? "2" : "1";
  linha += tipoDoc;
  linha += padNum(det.sacadoDoc, 15);
  linha += padAlpha(det.sacadoNome, 40);
  linha += padAlpha(det.sacadoEndereco, 40);
  linha += padAlpha("", 15); // bairro
  linha += padNum(det.sacadoCEP, 8);
  linha += padAlpha(det.sacadoCidade, 15);
  linha += padAlpha(det.sacadoUF, 2);
  linha += "0"; // tipo inscrição sacador
  linha += padNum("0", 15);
  linha += padAlpha("", 40);
  linha += padNum("0", 3); // banco correspondente
  linha += padAlpha("", 20); // nosso número correspondente
  linha += pad("", 8, " ", true);

  return linha.substring(0, 240);
}

// Trailer de Lote
export function gerarTrailerLote240(
  codigoBanco: string,
  loteNum: number,
  qtdRegistros: number,
  qtdTitulos: number,
  valorTotal: number
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += padNum(loteNum, 4);
  linha += "5"; // tipo registro
  linha += pad("", 9, " ", true);
  linha += padNum(qtdRegistros, 6);
  linha += padNum(qtdTitulos, 6);
  linha += formatValue(valorTotal);
  linha += padNum("0", 6);
  linha += formatValue(0);
  linha += pad("", 46, " ", true);
  linha += pad("", 6, " ", true);
  linha += pad("", 217 - 98 + 1, " ", true);

  return linha.substring(0, 240);
}

// Trailer de Arquivo
export function gerarTrailerArquivo240(
  codigoBanco: string,
  qtdLotes: number,
  qtdRegistrosTotal: number
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += "9999"; // lote
  linha += "9"; // tipo registro
  linha += pad("", 9, " ", true);
  linha += padNum(qtdLotes, 6);
  linha += padNum(qtdRegistrosTotal, 6);
  linha += padNum("0", 6);
  linha += pad("", 205, " ", true);

  return linha.substring(0, 240);
}

// Segmento J (Pagamento)
export function gerarSegmentoJ(
  codigoBanco: string,
  loteNum: number,
  seqRegistro: number,
  det: CnabDetalhePagamento
): string {
  let linha = "";
  linha += padNum(codigoBanco, 3);
  linha += padNum(loteNum, 4);
  linha += "3";
  linha += padNum(seqRegistro, 5);
  linha += "J";
  linha += " ";
  linha += "00"; // código movimento
  linha += padNum(det.bancoFavorecido, 3);
  linha += padNum(det.agenciaFavorecido, 5);
  linha += " ";
  linha += padNum(det.contaFavorecido, 12);
  linha += padAlpha(det.digitoContaFavorecido, 1);
  linha += " ";
  linha += padAlpha(det.favorecidoNome, 30);
  linha += padAlpha("", 20); // seu número
  linha += formatDate(det.dataPagamento);
  linha += "BRL"; // moeda
  linha += padNum("0", 15); // quantidade moeda
  linha += formatValue(det.valorPagamento);
  linha += padAlpha("", 20); // nosso número
  linha += padNum("0", 8); // data efetiva
  linha += formatValue(0); // valor efetivo
  linha += padAlpha(det.finalidade, 40);
  linha += pad("", 9, " ", true);

  return linha.substring(0, 240);
}

// ===== Full file generator =====
export function gerarRemessaCobranca240(
  header: CnabHeaderArquivo,
  detalhes: CnabDetalheCobranca[]
): string {
  const linhas: string[] = [];

  // Header Arquivo
  linhas.push(gerarHeaderArquivo240(header));

  // Header Lote 1 (Cobrança)
  linhas.push(gerarHeaderLote240(header.codigoBanco, 1, "01", header));

  let seq = 1;
  detalhes.forEach((det) => {
    linhas.push(gerarSegmentoP(header.codigoBanco, 1, seq++, header, det));
    linhas.push(gerarSegmentoQ(header.codigoBanco, 1, seq++, det));
  });

  // Trailer Lote (header + registros + trailer = 2 + detalhes*2)
  const qtdRegLote = 2 + detalhes.length * 2;
  const valorTotal = detalhes.reduce((s, d) => s + d.valorTitulo, 0);
  linhas.push(gerarTrailerLote240(header.codigoBanco, 1, qtdRegLote, detalhes.length, valorTotal));

  // Trailer Arquivo (header + lote inteiro + trailer = 1 + qtdRegLote + 1)
  linhas.push(gerarTrailerArquivo240(header.codigoBanco, 1, linhas.length + 1));

  return linhas.join("\r\n");
}

export function gerarRemessaPagamento240(
  header: CnabHeaderArquivo,
  detalhes: CnabDetalhePagamento[]
): string {
  const linhas: string[] = [];

  linhas.push(gerarHeaderArquivo240(header));
  linhas.push(gerarHeaderLote240(header.codigoBanco, 1, "20", header));

  let seq = 1;
  detalhes.forEach((det) => {
    linhas.push(gerarSegmentoJ(header.codigoBanco, 1, seq++, det));
  });

  const qtdRegLote = 2 + detalhes.length;
  const valorTotal = detalhes.reduce((s, d) => s + d.valorPagamento, 0);
  linhas.push(gerarTrailerLote240(header.codigoBanco, 1, qtdRegLote, detalhes.length, valorTotal));
  linhas.push(gerarTrailerArquivo240(header.codigoBanco, 1, linhas.length + 1));

  return linhas.join("\r\n");
}
