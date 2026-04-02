// XML Fiscal Parser - Extracts data from NF-e/NFC-e/CT-e XML files

export interface XmlFiscalParsed {
  chaveAcesso: string;
  numero: string;
  serie: string;
  tipoDocumento: string;
  statusSefaz: string;
  dataEmissao: string;
  emitenteCnpj: string;
  emitenteRazao: string;
  emitenteFantasia: string;
  emitenteUf: string;
  destinatarioCnpj: string;
  destinatarioRazao: string;
  valorTotal: number;
  valorProdutos: number;
  valorIcms: number;
  valorIpi: number;
  valorPis: number;
  valorCofins: number;
  valorFrete: number;
  valorDesconto: number;
  itens: XmlFiscalItemParsed[];
  xmlBruto: string;
}

export interface XmlFiscalItemParsed {
  numeroItem: number;
  codigoProduto: string;
  descricao: string;
  ncm: string;
  cest: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  valorDesconto: number;
  cstIcms: string;
  aliqIcms: number;
  valorIcms: number;
  cstIpi: string;
  aliqIpi: number;
  valorIpi: number;
  cstPis: string;
  aliqPis: number;
  valorPis: number;
  cstCofins: string;
  aliqCofins: number;
  valorCofins: number;
}

function getTextContent(parent: Element | Document | null, selector: string): string {
  if (!parent) return "";
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || "";
}

function getNumber(parent: Element | Document | null, selector: string): number {
  const val = getTextContent(parent, selector);
  return val ? parseFloat(val) || 0 : 0;
}

export function parseXmlFiscal(xmlText: string): XmlFiscalParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML inválido: " + parserError.textContent);
  }

  const ide = doc.querySelector("ide");
  const emit = doc.querySelector("emit");
  const dest = doc.querySelector("dest");
  const total = doc.querySelector("total ICMSTot");
  const infProt = doc.querySelector("infProt");
  const infNFe = doc.querySelector("infNFe");

  // Detect document type
  let tipoDocumento = "NF-e";
  if (doc.querySelector("infCte")) tipoDocumento = "CT-e";
  else if (getTextContent(ide, "mod") === "65") tipoDocumento = "NFC-e";

  // Extract chave de acesso
  const chaveAcesso =
    getTextContent(infProt, "chNFe") ||
    infNFe?.getAttribute("Id")?.replace("NFe", "") ||
    doc.querySelector("infCte")?.getAttribute("Id")?.replace("CTe", "") ||
    "";

  const statusSefaz = getTextContent(infProt, "cStat") === "100" ? "autorizado" : 
    getTextContent(infProt, "cStat") === "101" ? "cancelado" : "autorizado";

  // Parse items
  const dets = doc.querySelectorAll("det");
  const itens: XmlFiscalItemParsed[] = [];

  dets.forEach((det, idx) => {
    const prod = det.querySelector("prod");
    const imposto = det.querySelector("imposto");
    if (!prod) return;

    const icmsEl = imposto?.querySelector("ICMS")?.children[0];
    const ipiEl = imposto?.querySelector("IPI")?.children[0];
    const pisEl = imposto?.querySelector("PIS")?.children[0];
    const cofinsEl = imposto?.querySelector("COFINS")?.children[0];

    itens.push({
      numeroItem: parseInt(det.getAttribute("nItem") || String(idx + 1)),
      codigoProduto: getTextContent(prod, "cProd"),
      descricao: getTextContent(prod, "xProd"),
      ncm: getTextContent(prod, "NCM"),
      cest: getTextContent(prod, "CEST"),
      cfop: getTextContent(prod, "CFOP"),
      unidade: getTextContent(prod, "uCom") || "UN",
      quantidade: getNumber(prod, "qCom"),
      valorUnitario: getNumber(prod, "vUnCom"),
      valorTotal: getNumber(prod, "vProd"),
      valorDesconto: getNumber(prod, "vDesc"),
      cstIcms: getTextContent(icmsEl as Element, "CST") || getTextContent(icmsEl as Element, "CSOSN"),
      aliqIcms: getNumber(icmsEl as Element, "pICMS"),
      valorIcms: getNumber(icmsEl as Element, "vICMS"),
      cstIpi: getTextContent(ipiEl as Element, "CST"),
      aliqIpi: getNumber(ipiEl as Element, "pIPI"),
      valorIpi: getNumber(ipiEl as Element, "vIPI"),
      cstPis: getTextContent(pisEl as Element, "CST"),
      aliqPis: getNumber(pisEl as Element, "pPIS"),
      valorPis: getNumber(pisEl as Element, "vPIS"),
      cstCofins: getTextContent(cofinsEl as Element, "CST"),
      aliqCofins: getNumber(cofinsEl as Element, "pCOFINS"),
      valorCofins: getNumber(cofinsEl as Element, "vCOFINS"),
    });
  });

  return {
    chaveAcesso,
    numero: getTextContent(ide, "nNF"),
    serie: getTextContent(ide, "serie"),
    tipoDocumento,
    statusSefaz,
    dataEmissao: getTextContent(ide, "dhEmi")?.substring(0, 10) || "",
    emitenteCnpj: getTextContent(emit, "CNPJ"),
    emitenteRazao: getTextContent(emit, "xNome"),
    emitenteFantasia: getTextContent(emit, "xFant"),
    emitenteUf: getTextContent(emit, "enderEmit UF"),
    destinatarioCnpj: getTextContent(dest, "CNPJ") || getTextContent(dest, "CPF"),
    destinatarioRazao: getTextContent(dest, "xNome"),
    valorTotal: getNumber(total, "vNF"),
    valorProdutos: getNumber(total, "vProd"),
    valorIcms: getNumber(total, "vICMS"),
    valorIpi: getNumber(total, "vIPI"),
    valorPis: getNumber(total, "vPIS"),
    valorCofins: getNumber(total, "vCOFINS"),
    valorFrete: getNumber(total, "vFrete"),
    valorDesconto: getNumber(total, "vDesc"),
    itens,
    xmlBruto: xmlText,
  };
}

export function validateChaveAcesso(chave: string): boolean {
  return /^\d{44}$/.test(chave.replace(/\s/g, ""));
}
