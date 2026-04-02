// ========== CNAB Types ==========

export type CnabFormato = "240" | "400";
export type CnabOperacao = "remessa_cobranca" | "retorno_cobranca" | "remessa_pagamento";

export interface BancoConfig {
  codigo: string;
  nome: string;
  formatos: CnabFormato[];
  cor: string;
  corTexto: string;
  sigla: string;
}

export const BANCOS_SUPORTADOS: Record<string, BancoConfig> = {
  "001": { codigo: "001", nome: "Banco do Brasil", formatos: ["240", "400"], cor: "#FFCB05", corTexto: "#003882", sigla: "BB" },
  "033": { codigo: "033", nome: "Santander", formatos: ["240", "400"], cor: "#EC0000", corTexto: "#FFFFFF", sigla: "S" },
  "104": { codigo: "104", nome: "Caixa Econômica Federal", formatos: ["240", "400"], cor: "#005CA9", corTexto: "#FFFFFF", sigla: "CEF" },
  "237": { codigo: "237", nome: "Bradesco", formatos: ["240", "400"], cor: "#CC092F", corTexto: "#FFFFFF", sigla: "B" },
  "341": { codigo: "341", nome: "Itaú Unibanco", formatos: ["240", "400"], cor: "#EC7000", corTexto: "#003A70", sigla: "Itaú" },
  "748": { codigo: "748", nome: "Sicredi", formatos: ["240"], cor: "#00703C", corTexto: "#FFFFFF", sigla: "Sicredi" },
  "756": { codigo: "756", nome: "Sicoob", formatos: ["240"], cor: "#003641", corTexto: "#FFFFFF", sigla: "Sicoob" },
};

export interface CnabHeaderArquivo {
  codigoBanco: string;
  loteServico: string;
  tipoRegistro: string;
  tipoOperacao: string;
  tipoServico: string;
  formaLancamento: string;
  layoutVersao: string;
  nomeEmpresa: string;
  cnpjEmpresa: string;
  agencia: string;
  conta: string;
  digitoConta: string;
  nomeEmpresaBanco: string;
  dataGeracao: string;
  horaGeracao: string;
  sequencialArquivo: number;
  convenio: string;
}

export interface CnabDetalheCobranca {
  nossoNumero: string;
  seuNumero: string;
  dataVencimento: string;
  valorTitulo: number;
  sacadoNome: string;
  sacadoDoc: string;
  sacadoEndereco: string;
  sacadoCidade: string;
  sacadoUF: string;
  sacadoCEP: string;
  especieDoc: string;
  dataEmissao: string;
  jurosMora: number;
  multa: number;
  desconto: number;
  instrucao1: string;
  instrucao2: string;
}

export interface CnabDetalhePagamento {
  favorecidoNome: string;
  favorecidoDoc: string;
  bancoFavorecido: string;
  agenciaFavorecido: string;
  contaFavorecido: string;
  digitoContaFavorecido: string;
  valorPagamento: number;
  dataPagamento: string;
  finalidade: string;
  tipoMovimento: string;
}

export interface CnabRetornoItem {
  nossoNumero: string;
  seuNumero: string;
  dataOcorrencia: string;
  codigoOcorrencia: string;
  descricaoOcorrencia: string;
  valorPago: number;
  valorTitulo: number;
  dataCredito: string;
  tarifas: number;
  sacadoNome: string;
}

export interface ArquivoCnab {
  id: string;
  tipo: CnabOperacao;
  formato: CnabFormato;
  banco: string;
  dataGeracao: string;
  sequencial: number;
  qtdRegistros: number;
  valorTotal: number;
  status: "gerado" | "enviado" | "processado" | "erro";
  nomeArquivo: string;
  conteudo?: string;
  itensRetorno?: CnabRetornoItem[];
}

export interface RemessaCobrancaItem {
  id: string;
  selecionado: boolean;
  nossoNumero: string;
  clienteNome: string;
  clienteDoc: string;
  valor: number;
  vencimento: string;
  emissao: string;
  descricao: string;
}

export interface RemessaPagamentoItem {
  id: string;
  selecionado: boolean;
  favorecidoNome: string;
  favorecidoDoc: string;
  bancoFavorecido: string;
  agenciaFavorecido: string;
  contaFavorecido: string;
  valor: number;
  dataPagamento: string;
  descricao: string;
}
