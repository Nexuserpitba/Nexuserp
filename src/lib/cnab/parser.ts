import type { CnabRetornoItem, CnabFormato } from "./types";

// ========== CNAB Retorno Parser ==========

function detectarFormato(conteudo: string): CnabFormato {
  const primeiraLinha = conteudo.split(/\r?\n/)[0] || "";
  return primeiraLinha.length >= 240 ? "240" : "400";
}

function parseRetorno240(conteudo: string): CnabRetornoItem[] {
  const linhas = conteudo.split(/\r?\n/).filter(l => l.length >= 240);
  const itens: CnabRetornoItem[] = [];

  for (const linha of linhas) {
    const tipoRegistro = linha.charAt(7);
    const segmento = linha.charAt(13);

    // Segmento T = dados do título
    if (tipoRegistro === "3" && segmento === "T") {
      const codigoOcorrencia = linha.substring(15, 17);
      const nossoNumero = linha.substring(37, 57).trim();
      const seuNumero = linha.substring(58, 73).trim();
      const dataVencimento = linha.substring(73, 81);
      const valorTitulo = parseInt(linha.substring(81, 96)) / 100;
      const sacadoNome = linha.substring(148, 188).trim();

      itens.push({
        nossoNumero,
        seuNumero,
        dataOcorrencia: formatDateFromCnab(dataVencimento),
        codigoOcorrencia,
        descricaoOcorrencia: getDescricaoOcorrencia(codigoOcorrencia),
        valorPago: 0,
        valorTitulo,
        dataCredito: "",
        tarifas: 0,
        sacadoNome,
      });
    }

    // Segmento U = valores pagos
    if (tipoRegistro === "3" && segmento === "U" && itens.length > 0) {
      const ultimo = itens[itens.length - 1];
      ultimo.valorPago = parseInt(linha.substring(77, 92)) / 100;
      ultimo.tarifas = parseInt(linha.substring(107, 122)) / 100;
      const dataCredito = linha.substring(137, 145);
      ultimo.dataCredito = formatDateFromCnab(dataCredito);
      const dataOcorrencia = linha.substring(137, 145);
      if (dataOcorrencia && dataOcorrencia !== "00000000") {
        ultimo.dataOcorrencia = formatDateFromCnab(dataOcorrencia);
      }
    }
  }

  return itens;
}

function parseRetorno400(conteudo: string): CnabRetornoItem[] {
  const linhas = conteudo.split(/\r?\n/).filter(l => l.length >= 400);
  const itens: CnabRetornoItem[] = [];

  for (const linha of linhas) {
    const tipoRegistro = linha.charAt(0);

    if (tipoRegistro === "1") {
      const codigoOcorrencia = linha.substring(108, 110);
      const dataOcorrencia = linha.substring(110, 116);
      const nossoNumero = linha.substring(62, 74).trim();
      const seuNumero = linha.substring(116, 126).trim();
      const valorTitulo = parseInt(linha.substring(152, 165)) / 100;
      const valorPago = parseInt(linha.substring(253, 266)) / 100;
      const tarifas = parseInt(linha.substring(175, 188)) / 100;
      const dataCredito = linha.substring(295, 301);
      const sacadoNome = linha.substring(324, 364).trim();

      itens.push({
        nossoNumero,
        seuNumero,
        dataOcorrencia: formatDateFromCnab400(dataOcorrencia),
        codigoOcorrencia,
        descricaoOcorrencia: getDescricaoOcorrencia400(codigoOcorrencia),
        valorPago,
        valorTitulo,
        dataCredito: formatDateFromCnab400(dataCredito),
        tarifas,
        sacadoNome,
      });
    }
  }

  return itens;
}

function formatDateFromCnab(ddmmyyyy: string): string {
  if (!ddmmyyyy || ddmmyyyy === "00000000") return "";
  return `${ddmmyyyy.substring(4, 8)}-${ddmmyyyy.substring(2, 4)}-${ddmmyyyy.substring(0, 2)}`;
}

function formatDateFromCnab400(ddmmyy: string): string {
  if (!ddmmyy || ddmmyy === "000000") return "";
  const year = parseInt(ddmmyy.substring(4, 6));
  const fullYear = year > 50 ? 1900 + year : 2000 + year;
  return `${fullYear}-${ddmmyy.substring(2, 4)}-${ddmmyy.substring(0, 2)}`;
}

function getDescricaoOcorrencia(codigo: string): string {
  const map: Record<string, string> = {
    "02": "Entrada confirmada",
    "03": "Entrada rejeitada",
    "04": "Transferência de carteira",
    "06": "Liquidação normal",
    "09": "Baixa",
    "17": "Liquidação após baixa",
    "25": "Protestado",
    "26": "Instrução rejeitada",
  };
  return map[codigo] || `Ocorrência ${codigo}`;
}

function getDescricaoOcorrencia400(codigo: string): string {
  const map: Record<string, string> = {
    "02": "Entrada confirmada",
    "03": "Entrada rejeitada",
    "05": "Liquidação sem registro",
    "06": "Liquidação normal",
    "09": "Baixado automaticamente",
    "10": "Baixado por instrução",
    "15": "Liquidação em cartório",
    "23": "Encaminhado a protesto",
  };
  return map[codigo] || `Ocorrência ${codigo}`;
}

export function parseRetorno(conteudo: string): { formato: CnabFormato; itens: CnabRetornoItem[] } {
  const formato = detectarFormato(conteudo);
  const itens = formato === "240" ? parseRetorno240(conteudo) : parseRetorno400(conteudo);
  return { formato, itens };
}
