/**
 * Validador de arquivos SPED (Fiscal e Contribuições)
 * Verifica estrutura, ordem de blocos, totalização e consistências
 */

export type Severidade = "erro" | "aviso" | "info";

export interface ValidacaoItem {
  severidade: Severidade;
  linha?: number;
  registro?: string;
  mensagem: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  itens: ValidacaoItem[];
  totalErros: number;
  totalAvisos: number;
  totalInfo: number;
}

function add(itens: ValidacaoItem[], sev: Severidade, msg: string, linha?: number, reg?: string) {
  itens.push({ severidade: sev, mensagem: msg, linha, registro: reg });
}

// ==================== Validadores de Dígitos ====================

function validarCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, "");
  if (nums.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(nums)) return false;

  const calc = (size: number) => {
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += Number(nums.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  if (calc(12) !== Number(nums.charAt(12))) return false;
  if (calc(13) !== Number(nums.charAt(13))) return false;
  return true;
}

function validarChaveNFe(chave: string): boolean {
  const nums = chave.replace(/\D/g, "");
  if (nums.length !== 44) return false;

  // Módulo 11 com pesos 2-9
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += Number(nums.charAt(i)) * peso;
    peso = peso >= 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dvCalculado = resto < 2 ? 0 : 11 - resto;
  return dvCalculado === Number(nums.charAt(43));
}

// Formatos de IE por UF (regex sobre dígitos limpos)
const IE_FORMATOS: Record<string, { regex: RegExp; desc: string }> = {
  AC: { regex: /^\d{13}$/, desc: "13 dígitos" },
  AL: { regex: /^\d{9}$/, desc: "9 dígitos" },
  AM: { regex: /^\d{9}$/, desc: "9 dígitos" },
  AP: { regex: /^\d{9}$/, desc: "9 dígitos" },
  BA: { regex: /^\d{8,9}$/, desc: "8 ou 9 dígitos" },
  CE: { regex: /^\d{9}$/, desc: "9 dígitos" },
  DF: { regex: /^\d{13}$/, desc: "13 dígitos" },
  ES: { regex: /^\d{9}$/, desc: "9 dígitos" },
  GO: { regex: /^\d{9}$/, desc: "9 dígitos" },
  MA: { regex: /^\d{9}$/, desc: "9 dígitos" },
  MG: { regex: /^\d{13}$/, desc: "13 dígitos" },
  MS: { regex: /^\d{9}$/, desc: "9 dígitos" },
  MT: { regex: /^\d{11}$/, desc: "11 dígitos" },
  PA: { regex: /^\d{9}$/, desc: "9 dígitos" },
  PB: { regex: /^\d{9}$/, desc: "9 dígitos" },
  PE: { regex: /^\d{9}$|^\d{14}$/, desc: "9 ou 14 dígitos" },
  PI: { regex: /^\d{9}$/, desc: "9 dígitos" },
  PR: { regex: /^\d{10}$/, desc: "10 dígitos" },
  RJ: { regex: /^\d{8}$/, desc: "8 dígitos" },
  RN: { regex: /^\d{9,10}$/, desc: "9 ou 10 dígitos" },
  RO: { regex: /^\d{14}$/, desc: "14 dígitos" },
  RR: { regex: /^\d{9}$/, desc: "9 dígitos" },
  RS: { regex: /^\d{10}$/, desc: "10 dígitos" },
  SC: { regex: /^\d{9}$/, desc: "9 dígitos" },
  SE: { regex: /^\d{9}$/, desc: "9 dígitos" },
  SP: { regex: /^\d{12}$/, desc: "12 dígitos" },
  TO: { regex: /^\d{11}$/, desc: "11 dígitos" },
};

function validarIE(ie: string, uf: string): { valido: boolean; motivo?: string } {
  const nums = ie.replace(/\D/g, "");
  if (!nums || ie.toUpperCase() === "ISENTO") return { valido: true };
  if (/^0+$/.test(nums)) return { valido: false, motivo: "IE zerada" };
  const fmt = IE_FORMATOS[uf];
  if (!fmt) return { valido: false, motivo: `UF "${uf}" não reconhecida` };
  if (!fmt.regex.test(nums)) {
    return { valido: false, motivo: `formato inválido para ${uf} (esperado: ${fmt.desc}, encontrado: ${nums.length} dígitos)` };
  }
  return { valido: true };
}

const IBGE_UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL",
  "28": "SE", "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

function ibgeCodToUf(cod: string): string | undefined {
  return IBGE_UF[cod];
}

// ==================== Validador Genérico SPED ====================

export function validarArquivoSped(
  conteudo: string,
  tipo: "fiscal" | "contribuicoes"
): ResultadoValidacao {
  const itens: ValidacaoItem[] = [];
  const linhas = conteudo.split("\r\n").filter(l => l.length > 0);

  if (linhas.length === 0) {
    add(itens, "erro", "Arquivo vazio — nenhum registro encontrado");
    return resultado(itens);
  }

  // 1. Verificar formato pipe
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (!l.startsWith("|") || !l.endsWith("|")) {
      add(itens, "erro", `Linha não inicia/termina com delimitador pipe "|"`, i + 1);
    }
  }

  // 2. Extrair registros
  const registros = linhas.map((l, i) => {
    const m = l.match(/^\|(\w{4})\|/);
    return { num: i + 1, codigo: m ? m[1] : "????", linha: l, campos: l.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1) };
  });

  // 3. Verificar registro 0000 (abertura)
  if (registros[0]?.codigo !== "0000") {
    add(itens, "erro", "Primeiro registro deve ser 0000 (Abertura do Arquivo)", 1, registros[0]?.codigo);
  } else {
    // Validar campos obrigatórios do 0000
    const c = registros[0].campos;
    if (!c[1]) add(itens, "aviso", "Registro 0000: COD_VER (versão do layout) vazio", 1, "0000");
    if (!c[4] && !c[5]) add(itens, "aviso", "Registro 0000: DT_INI não informada", 1, "0000");
    
    // Verificar CNPJ
    const cnpjIdx = tipo === "fiscal" ? 6 : 8;
    const cnpj = c[cnpjIdx] || "";
    if (cnpj && cnpj.replace(/\D/g, "").length !== 14) {
      add(itens, "aviso", `Registro 0000: CNPJ com tamanho inválido (${cnpj.length} dígitos)`, 1, "0000");
    } else if (cnpj === "00000000000000") {
      add(itens, "aviso", "Registro 0000: CNPJ zerado — empresa não cadastrada?", 1, "0000");
    } else if (cnpj && !validarCNPJ(cnpj)) {
      add(itens, "erro", `Registro 0000: Dígito verificador do CNPJ inválido (${cnpj})`, 1, "0000");
    }

    // Verificar IE + UF no 0000
    const ufIdx = tipo === "fiscal" ? 8 : 9;
    const ieIdx = tipo === "fiscal" ? 9 : -1;
    const uf0000 = c[ufIdx] || "";
    if (tipo === "fiscal" && ieIdx > 0) {
      const ie0000 = c[ieIdx] || "";
      if (ie0000 && uf0000) {
        const resIE = validarIE(ie0000, uf0000);
        if (!resIE.valido) {
          add(itens, "erro", `Registro 0000: IE inválida — ${resIE.motivo}`, 1, "0000");
        } else {
          add(itens, "info", `Registro 0000: IE válida para ${uf0000}`, 1, "0000");
        }
      }
    }
  }

  // 4. Verificar registro 9999 (encerramento)
  const ultimo = registros[registros.length - 1];
  if (ultimo?.codigo !== "9999") {
    add(itens, "erro", "Último registro deve ser 9999 (Encerramento do Arquivo)", linhas.length, ultimo?.codigo);
  } else {
    const totalDeclarado = parseInt(ultimo.campos[1] || "0");
    if (totalDeclarado !== linhas.length) {
      add(itens, "erro", `Registro 9999: total declarado (${totalDeclarado}) difere do total real (${linhas.length})`, linhas.length, "9999");
    } else {
      add(itens, "info", `Totalização 9999 correta: ${linhas.length} registros`, linhas.length, "9999");
    }
  }

  // 5. Verificar ordem dos blocos
  const blocosEsperados = tipo === "fiscal"
    ? ["0", "C", "D", "E", "G", "H", "K", "1", "9"]
    : ["0", "A", "C", "D", "F", "M", "1", "9"];

  const blocosEncontrados: string[] = [];
  for (const r of registros) {
    const bloco = r.codigo.charAt(0);
    if (!blocosEncontrados.includes(bloco)) blocosEncontrados.push(bloco);
  }

  // Verificar se todos os blocos esperados estão presentes
  for (const b of blocosEsperados) {
    if (!blocosEncontrados.includes(b)) {
      add(itens, "erro", `Bloco ${b} ausente no arquivo — todos os blocos devem ter ao menos abertura/encerramento`);
    }
  }

  // Verificar ordem
  let lastIdx = -1;
  for (const b of blocosEncontrados) {
    const idx = blocosEsperados.indexOf(b);
    if (idx === -1) {
      add(itens, "aviso", `Bloco "${b}" não esperado para SPED ${tipo === "fiscal" ? "Fiscal" : "Contribuições"}`);
    } else if (idx < lastIdx) {
      add(itens, "erro", `Bloco ${b} está fora da ordem esperada`);
    } else {
      lastIdx = idx;
    }
  }

  // 6. Verificar abertura/encerramento de cada bloco
  const blocoAbertura: Record<string, boolean> = {};
  const blocoEncerramento: Record<string, boolean> = {};

  for (const r of registros) {
    const bloco = r.codigo.charAt(0);
    const sufixo = r.codigo.substring(1);
    
    if (sufixo === "001") blocoAbertura[bloco] = true;
    if (sufixo === "990") blocoEncerramento[bloco] = true;
  }

  for (const b of blocosEncontrados) {
    if (!blocoAbertura[b]) {
      add(itens, "erro", `Bloco ${b}: registro de abertura ${b}001 ausente`);
    }
    if (!blocoEncerramento[b]) {
      add(itens, "erro", `Bloco ${b}: registro de encerramento ${b}990 ausente`);
    }
  }

  // 7. Verificar registros 9900 (contagem por tipo)
  const contReal: Record<string, number> = {};
  for (const r of registros) {
    contReal[r.codigo] = (contReal[r.codigo] || 0) + 1;
  }

  const regs9900 = registros.filter(r => r.codigo === "9900");
  for (const r9 of regs9900) {
    const tipoReg = r9.campos[1];
    const qtdDeclarada = parseInt(r9.campos[2] || "0");
    const qtdReal = contReal[tipoReg] || 0;

    if (qtdDeclarada !== qtdReal) {
      add(itens, "aviso", `Registro 9900: tipo ${tipoReg} declarado ${qtdDeclarada}x, encontrado ${qtdReal}x`, r9.num, "9900");
    }
  }

  // 8. Verificar campos vazios críticos em registros de dados
  for (const r of registros) {
    // Verificar 0005 (dados complementares) no fiscal
    if (r.codigo === "0005") {
      if (!r.campos[1]) add(itens, "aviso", "Registro 0005: Nome fantasia vazio", r.num, "0005");
    }

    // Verificar C100 (nota fiscal)
    if (r.codigo === "C100") {
      const vlDoc = r.campos.find((_, i) => i >= 10);
      if (vlDoc === "0,00") {
        add(itens, "aviso", "Registro C100: Valor do documento é zero", r.num, "C100");
      }
      // Validar chave NF-e (campo 8 no fiscal, campo 8 no contribuições)
      const chaveIdx = 8;
      const chave = r.campos[chaveIdx] || "";
      if (chave && chave.replace(/\D/g, "").length === 44) {
        if (!validarChaveNFe(chave)) {
          add(itens, "erro", `Registro C100: Dígito verificador da chave NF-e inválido (${chave.substring(0, 10)}...${chave.substring(40)})`, r.num, "C100");
        } else {
          add(itens, "info", "Registro C100: Chave NF-e com DV válido", r.num, "C100");
        }
      } else if (chave && chave.length > 0 && chave.replace(/\D/g, "").length !== 44) {
        add(itens, "erro", `Registro C100: Chave NF-e deve ter 44 dígitos, encontrado ${chave.replace(/\D/g, "").length}`, r.num, "C100");
      }
    }

    // Verificar 0100 (contabilista) — CPF e CNPJ
    if (r.codigo === "0100") {
      if (r.campos[1] === "CONTADOR RESPONSAVEL" || r.campos[2] === "00000000000") {
        add(itens, "aviso", "Registro 0100: Dados do contabilista parecem ser exemplo/placeholder", r.num, "0100");
      }
      const cnpjEscritorio = r.campos[4] || "";
      if (cnpjEscritorio && cnpjEscritorio.replace(/\D/g, "").length === 14 && cnpjEscritorio !== "00000000000000") {
        if (!validarCNPJ(cnpjEscritorio)) {
          add(itens, "erro", `Registro 0100: CNPJ do escritório contábil com DV inválido (${cnpjEscritorio})`, r.num, "0100");
        }
      }
    }

    // Verificar 0150 (participante) — CNPJ e IE
    if (r.codigo === "0150") {
      if (r.campos[2] === "CLIENTE EXEMPLO LTDA") {
        add(itens, "aviso", "Registro 0150: Participante parece ser exemplo/placeholder", r.num, "0150");
      }
      const cnpjPart = r.campos[4] || "";
      if (cnpjPart && cnpjPart.replace(/\D/g, "").length === 14) {
        if (!validarCNPJ(cnpjPart)) {
          add(itens, "erro", `Registro 0150: CNPJ do participante com DV inválido (${cnpjPart})`, r.num, "0150");
        }
      }
      // IE do participante: campo 6 = IE, campo 7 = COD_MUN (2 primeiros dígitos = UF IBGE)
      const iePart = r.campos[6] || "";
      const codMunPart = r.campos[7] || "";
      if (iePart && codMunPart) {
        // Mapear código IBGE da UF para sigla
        const ufPart = ibgeCodToUf(codMunPart.substring(0, 2));
        if (ufPart) {
          const resIE = validarIE(iePart, ufPart);
          if (!resIE.valido) {
            add(itens, "aviso", `Registro 0150: IE do participante "${r.campos[2]?.substring(0, 20)}" inválida para ${ufPart} — ${resIE.motivo}`, r.num, "0150");
          }
        }
      }
    }

    // Verificar 0200 (produto)
    if (r.codigo === "0200") {
      if (r.campos[2] === "PRODUTO EXEMPLO PARA TESTE") {
        add(itens, "aviso", "Registro 0200: Produto parece ser exemplo/placeholder", r.num, "0200");
      }
    }
  }

  // 9. Verificar se registros E110/M200 existem quando blocos ativos
  if (tipo === "fiscal") {
    const temE = blocosEncontrados.includes("E");
    const temE110 = registros.some(r => r.codigo === "E110");
    if (temE && !temE110) {
      const eAbertura = registros.find(r => r.codigo === "E001");
      const indicador = eAbertura?.campos[1];
      if (indicador === "0") {
        add(itens, "aviso", "Bloco E com dados mas sem registro E110 (Apuração ICMS)");
      }
    }
  }

  if (tipo === "contribuicoes") {
    const temM = blocosEncontrados.includes("M");
    const temM200 = registros.some(r => r.codigo === "M200");
    if (temM && !temM200) {
      const mAbertura = registros.find(r => r.codigo === "M001");
      if (mAbertura?.campos[1] === "0") {
        add(itens, "aviso", "Bloco M com dados mas sem registro M200 (Consolidação PIS)");
      }
    }
  }

  // 10. Informações gerais
  add(itens, "info", `Total de registros: ${linhas.length}`);
  add(itens, "info", `Blocos presentes: ${blocosEncontrados.join(", ")}`);
  add(itens, "info", `Tipos de registro distintos: ${Object.keys(contReal).length}`);

  return resultado(itens);
}

function resultado(itens: ValidacaoItem[]): ResultadoValidacao {
  const totalErros = itens.filter(i => i.severidade === "erro").length;
  const totalAvisos = itens.filter(i => i.severidade === "aviso").length;
  const totalInfo = itens.filter(i => i.severidade === "info").length;
  return {
    valido: totalErros === 0,
    itens,
    totalErros,
    totalAvisos,
    totalInfo,
  };
}

// ==================== Exportação TXT do Relatório ====================

export function exportarRelatorioValidacaoTxt(
  validacao: ResultadoValidacao,
  tipo: "fiscal" | "contribuicoes",
  empresa?: string,
  periodo?: string
): void {
  const now = new Date();
  const dataHora = now.toLocaleString("pt-BR");
  const tipoLabel = tipo === "fiscal" ? "SPED Fiscal (EFD ICMS/IPI)" : "SPED Contribuições (EFD PIS/Cofins)";
  const statusGeral = validacao.valido ? "APROVADO" : "REPROVADO";

  const linhas: string[] = [];
  const sep = "=".repeat(90);
  const sepFino = "-".repeat(90);

  linhas.push(sep);
  linhas.push("  RELATÓRIO DE VALIDAÇÃO — NexusERP");
  linhas.push(`  ${tipoLabel}`);
  linhas.push(sep);
  linhas.push("");
  linhas.push(`  Data/Hora da Validação : ${dataHora}`);
  if (empresa) linhas.push(`  Empresa                : ${empresa}`);
  if (periodo) linhas.push(`  Período                : ${periodo}`);
  linhas.push(`  Status Geral           : ${statusGeral}`);
  linhas.push(`  Total de Itens         : ${validacao.itens.length}`);
  linhas.push(`  Erros                  : ${validacao.totalErros}`);
  linhas.push(`  Avisos                 : ${validacao.totalAvisos}`);
  linhas.push(`  Informações            : ${validacao.totalInfo}`);
  linhas.push("");

  // Regras SEFAZ referenciadas
  linhas.push(sep);
  linhas.push("  REGRAS SEFAZ VERIFICADAS");
  linhas.push(sep);
  linhas.push("");

  const regras = [
    { cod: "REGRA-001", desc: "Formato pipe: cada registro deve iniciar e terminar com \"|\"" },
    { cod: "REGRA-002", desc: "Registro 0000 obrigatório como primeiro registro do arquivo" },
    { cod: "REGRA-003", desc: "Registro 9999 obrigatório como último registro do arquivo" },
    { cod: "REGRA-004", desc: "Totalização do 9999 deve coincidir com quantidade real de registros" },
    { cod: "REGRA-005", desc: "Todos os blocos obrigatórios devem possuir ao menos abertura e encerramento" },
    { cod: "REGRA-006", desc: "Blocos devem respeitar a ordem sequencial definida no Guia Prático da EFD" },
    { cod: "REGRA-007", desc: "Registros X001 (abertura) e X990 (encerramento) obrigatórios por bloco" },
    { cod: "REGRA-008", desc: "Registros 9900 devem refletir contagem correta de cada tipo de registro" },
    { cod: "REGRA-009", desc: "CNPJ do contribuinte deve conter 14 dígitos com DV válido (Módulo 11)" },
    { cod: "REGRA-010", desc: "Campos obrigatórios do registro 0000 (COD_VER, DT_INI, CNPJ) preenchidos" },
    { cod: "REGRA-011", desc: "Dados do contabilista (0100) não devem conter valores de exemplo" },
    { cod: "REGRA-012", desc: "Participantes (0150) e produtos (0200) não devem conter placeholders" },
    { cod: "REGRA-013", desc: "Chave da NF-e (C100) deve conter 44 dígitos com DV válido (Módulo 11 pesos 2-9)" },
    { cod: "REGRA-014", desc: "CNPJ do escritório contábil (0100) e participantes (0150) com DV válido" },
    { cod: "REGRA-015", desc: "Inscrição Estadual (IE) deve respeitar formato/tamanho da UF conforme SEFAZ" },
    { cod: "REGRA-016", desc: "IE de participantes (0150) validada pelo código IBGE do município (COD_MUN)" },
  ];

  if (tipo === "fiscal") {
    regras.push({ cod: "REGRA-F01", desc: "Bloco E com dados deve conter registro E110 (Apuração ICMS)" });
  } else {
    regras.push({ cod: "REGRA-C01", desc: "Bloco M com dados deve conter registro M200 (Consolidação PIS)" });
  }

  for (const r of regras) {
    linhas.push(`  [${r.cod}] ${r.desc}`);
  }
  linhas.push("");

  // Detalhamento
  linhas.push(sep);
  linhas.push("  DETALHAMENTO DAS OCORRÊNCIAS");
  linhas.push(sep);
  linhas.push("");

  const severidades: Array<{ label: string; filtro: Severidade }> = [
    { label: "ERROS", filtro: "erro" },
    { label: "AVISOS", filtro: "aviso" },
    { label: "INFORMAÇÕES", filtro: "info" },
  ];

  for (const s of severidades) {
    const itensGrupo = validacao.itens.filter(i => i.severidade === s.filtro);
    if (itensGrupo.length === 0) continue;

    linhas.push(`  --- ${s.label} (${itensGrupo.length}) ---`);
    linhas.push("");

    for (let i = 0; i < itensGrupo.length; i++) {
      const item = itensGrupo[i];
      const prefix = `  ${String(i + 1).padStart(3, " ")}.`;
      const locParts: string[] = [];
      if (item.linha) locParts.push(`Linha ${item.linha}`);
      if (item.registro) locParts.push(`Reg ${item.registro}`);
      const loc = locParts.length > 0 ? ` [${locParts.join(" | ")}]` : "";
      linhas.push(`${prefix}${loc} ${item.mensagem}`);
    }
    linhas.push("");
  }

  linhas.push(sepFino);
  linhas.push(`  Arquivo gerado por NexusERP em ${dataHora}`);
  linhas.push(`  Referência: Guia Prático da ${tipo === "fiscal" ? "EFD ICMS/IPI" : "EFD-Contribuições"} — SEFAZ`);
  linhas.push(sepFino);

  const texto = linhas.join("\r\n");
  const filename = `VALIDACAO_${tipo.toUpperCase()}_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.txt`;
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
