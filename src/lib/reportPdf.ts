import { PDFDocument, PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { ExportOptions } from "./exportUtils";
import { getActiveLogo, getSelectedEmpresaId } from "./logoUtils";

interface PdfRow {
  cells: string[];
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 32;
const TITLE_SIZE = 16;
const SUBTITLE_SIZE = 10;
const HEADER_SIZE = 9;
const CELL_SIZE = 8.5;
const ROW_HEIGHT = 18;
const FOOTER_HEIGHT = 28;

interface EmpresaInfo {
  nome: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  regime: string;
}

function getEmpresaInfo(): EmpresaInfo {
  const empty: EmpresaInfo = { nome: "", nomeFantasia: "", cnpj: "", ie: "", endereco: "", numero: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "", regime: "" };
  try {
    const s = localStorage.getItem("empresas");
    if (!s) return empty;
    const empresas = JSON.parse(s);
    const empresa = empresas.find((e: any) => e.selecionada) || empresas[0] || null;
    if (!empresa) return empty;

    return {
      nome: empresa.razaoSocial || empresa.razao_social || empresa.nomeFantasia || empresa.nome_fantasia || "",
      nomeFantasia: empresa.nomeFantasia || empresa.nome_fantasia || "",
      cnpj: empresa.cnpj || "",
      ie: empresa.inscricaoEstadual || empresa.inscricao_estadual || empresa.ie || "",
      endereco: empresa.endereco || empresa.logradouro || "",
      numero: empresa.numero || "",
      bairro: empresa.bairro || "",
      cidade: empresa.cidade || "",
      uf: empresa.uf || "",
      cep: empresa.cep || "",
      telefone: empresa.telefone || "",
      email: empresa.email || "",
      regime: empresa.regime || "",
    };
  } catch {
    return empty;
  }
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function buildRows(options: ExportOptions): PdfRow[] {
  return options.data.map((row) => ({
    cells: options.columns.map((col) => {
      const rawValue = row[col.key];
      const formatted = col.format ? col.format(rawValue, row) : String(rawValue ?? "");
      return stripHtml(formatted);
    }),
  }));
}

function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "relatorio";
}

async function loadLogoForPdf(pdf: PDFDocument): Promise<{ image: any; width: number; height: number } | null> {
  try {
    const empresaId = getSelectedEmpresaId() ?? undefined;
    const logoDataUri = getActiveLogo(empresaId);
    if (!logoDataUri) return null;

    const match = logoDataUri.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
    if (!match) return null;

    const mime = match[1].toLowerCase();
    const base64Data = match[3];
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    let image: any;
    if (mime === "image/png") {
      image = await pdf.embedPng(bytes);
    } else {
      image = await pdf.embedJpg(bytes);
    }

    return { image, width: image.width, height: image.height };
  } catch {
    return null;
  }
}

function drawHeader(
  page: PDFPage,
  empresa: EmpresaInfo,
  logo: { image: any; width: number; height: number } | null,
  reportTitle: string,
  fontBold: any,
  fontRegular: any,
): number {
  const MAX_LOGO_HEIGHT = 44;
  let y = PAGE_HEIGHT - MARGIN;

  const logoHeight = logo ? Math.min(logo.height, MAX_LOGO_HEIGHT) : 0;
  const logoWidth = logo ? (logoHeight / logo.height) * logo.width : 0;

  // ========== Linha superior decorativa ==========
  page.drawRectangle({
    x: MARGIN,
    y: y + 4,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 3,
    color: rgb(0.15, 0.15, 0.15),
  });

  // ========== Logo à esquerda ==========
  if (logo) {
    page.drawImage(logo.image, {
      x: MARGIN,
      y: y - logoHeight - 2,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // ========== Nome da empresa à esquerda ==========
  const textX = logo ? MARGIN + logoWidth + 14 : MARGIN;
  const empresaNome = empresa.nomeFantasia || empresa.nome || "";
  const empresaRazao = empresa.nome && empresa.nome !== empresa.nomeFantasia ? empresa.nome : "";

  let nameY = y - 8;
  if (empresaNome) {
    page.drawText(empresaNome.toUpperCase(), {
      x: textX,
      y: nameY,
      size: 16,
      font: fontBold,
      color: rgb(0.08, 0.08, 0.08),
    });
    nameY -= 15;
  }
  if (empresaRazao) {
    page.drawText(empresaRazao, {
      x: textX,
      y: nameY,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    nameY -= 12;
  }

  // Dados compactos à esquerda (abaixo do nome)
  let leftY = nameY - 2;
  const leftSize = 7.5;
  const leftColor = rgb(0.4, 0.4, 0.4);

  if (empresa.cnpj) {
    const iePart = empresa.ie ? `  |  I.E.: ${empresa.ie}` : "";
    page.drawText(`CNPJ: ${empresa.cnpj}${iePart}`, {
      x: textX, y: leftY, size: leftSize, font: fontRegular, color: leftColor,
    });
    leftY -= 10;
  }

  const endParts = [empresa.endereco + (empresa.numero ? `, ${empresa.numero}` : ""), empresa.bairro, empresa.cidade && empresa.uf ? `${empresa.cidade} - ${empresa.uf}` : empresa.cidade || empresa.uf, empresa.cep ? `CEP: ${empresa.cep}` : ""].filter(Boolean);
  if (endParts.length) {
    page.drawText(endParts.join(" • "), {
      x: textX, y: leftY, size: leftSize, font: fontRegular, color: leftColor,
    });
    leftY -= 10;
  }

  const contactParts = [empresa.telefone, empresa.email].filter(Boolean);
  if (contactParts.length) {
    page.drawText(contactParts.join("  •  "), {
      x: textX, y: leftY, size: leftSize, font: fontRegular, color: leftColor,
    });
    leftY -= 10;
  }

  // ========== Nome do relatório à direita ==========
  const rightX = PAGE_WIDTH - MARGIN;
  if (reportTitle) {
    const titleWidth = fontBold.widthOfTextAtSize(reportTitle, 11);
    page.drawText(reportTitle.toUpperCase(), {
      x: rightX - titleWidth,
      y: y - 8,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // ========== Linha separadora inferior ==========
  const headerBottom = Math.min(y - logoHeight - 6, leftY - 6);
  page.drawLine({
    start: { x: MARGIN, y: headerBottom },
    end: { x: PAGE_WIDTH - MARGIN, y: headerBottom },
    thickness: 1.0,
    color: rgb(0.15, 0.15, 0.15),
  });

  return headerBottom - 12;
}

function drawFooter(
  page: PDFPage,
  empresa: EmpresaInfo,
  pageNumber: number,
  totalPages: number,
  fontRegular: any,
  now: Date,
) {
  const rodapeTexto = empresa.nomeFantasia || empresa.nome || "";

  page.drawLine({
    start: { x: MARGIN, y: MARGIN + FOOTER_HEIGHT },
    end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + FOOTER_HEIGHT },
    thickness: 0.5,
    color: rgb(0.75, 0.75, 0.75),
  });

  // Esquerda: nome da empresa
  page.drawText(rodapeTexto, {
    x: MARGIN,
    y: MARGIN + 10,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Centro: data/hora
  const geradoEm = `Gerado em: ${now.toLocaleString("pt-BR")}`;
  const geradoEmWidth = fontRegular.widthOfTextAtSize(geradoEm, 7);
  page.drawText(geradoEm, {
    x: PAGE_WIDTH / 2 - geradoEmWidth / 2,
    y: MARGIN + 10,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Direita: página X de Y
  const pageInfo = `Página ${pageNumber} de ${totalPages}`;
  const pageInfoWidth = fontRegular.widthOfTextAtSize(pageInfo, 7);
  page.drawText(pageInfo, {
    x: PAGE_WIDTH - MARGIN - pageInfoWidth,
    y: MARGIN + 10,
    size: 7,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export interface ReportPdfAttachment {
  filename: string;
  contentType: "application/pdf";
  encoding: "base64";
  content: string;
}

export async function generateReportPdfAttachment(options: ExportOptions): Promise<ReportPdfAttachment> {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const empresa = getEmpresaInfo();
  const logo = await loadLogoForPdf(pdf);
  const columns = options.columns;
  const rows = buildRows(options);

  const colCount = Math.max(columns.length, 1);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const colWidth = contentWidth / colCount;
  const maxCharsByCol = Math.max(6, Math.floor(colWidth / 4.9));

  const now = new Date();
  const allPages: PDFPage[] = [];

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  allPages.push(page);

  let y = drawHeader(page, empresa, logo, options.title, fontBold, fontRegular);

  // ========== Título do relatório ==========
  page.drawText(options.title, {
    x: MARGIN, y: y, size: TITLE_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1),
  });
  y -= TITLE_SIZE + 4;

  if (options.subtitle) {
    page.drawText(options.subtitle, {
      x: MARGIN, y: y, size: SUBTITLE_SIZE, font: fontRegular, color: rgb(0.3, 0.3, 0.3),
    });
    y -= SUBTITLE_SIZE + 4;
  }

  const dateStr = now.toLocaleDateString("pt-BR");
  const timeStr = now.toLocaleTimeString("pt-BR");
  page.drawText(`Gerado em: ${dateStr} às ${timeStr}`, {
    x: MARGIN, y: y, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5),
  });
  y -= 20;

  // ========== Cabeçalho das colunas ==========
  const drawColumnHeader = (pg: PDFPage, cy: number): number => {
    pg.drawRectangle({
      x: MARGIN, y: cy - ROW_HEIGHT + 4, width: contentWidth, height: ROW_HEIGHT,
      color: rgb(0.92, 0.92, 0.92),
    });
    columns.forEach((col, index) => {
      pg.drawText(truncateText(col.header, maxCharsByCol), {
        x: MARGIN + colWidth * index + 3, y: cy - 10, size: HEADER_SIZE,
        font: fontBold, color: rgb(0.15, 0.15, 0.15),
      });
    });
    return cy - ROW_HEIGHT;
  };

  y = drawColumnHeader(page, y);

  // ========== Dados da tabela ==========
  rows.forEach((row, rowIndex) => {
    if (y < MARGIN + FOOTER_HEIGHT + ROW_HEIGHT * 2) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      allPages.push(page);
      y = drawHeader(page, empresa, logo, options.title, fontBold, fontRegular);
      y = drawColumnHeader(page, y);
    }

    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: MARGIN, y: y - ROW_HEIGHT + 4, width: contentWidth, height: ROW_HEIGHT,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    row.cells.forEach((cell, index) => {
      page.drawText(truncateText(cell, maxCharsByCol), {
        x: MARGIN + colWidth * index + 3, y: y - 10, size: CELL_SIZE,
        font: fontRegular, color: rgb(0.12, 0.12, 0.12),
      });
    });

    page.drawLine({
      start: { x: MARGIN, y: y - ROW_HEIGHT + 3 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - ROW_HEIGHT + 3 },
      thickness: 0.4, color: rgb(0.88, 0.88, 0.88),
    });

    y -= ROW_HEIGHT;
  });

  // ========== Resumo ==========
  if (options.summaryRows?.length) {
    if (y < MARGIN + FOOTER_HEIGHT + options.summaryRows.length * 14 + 20) {
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      allPages.push(page);
      y = PAGE_HEIGHT - MARGIN;
    }

    y -= 8;
    page.drawText("Resumo", {
      x: MARGIN, y: y - 12, size: 11, font: fontBold, color: rgb(0.18, 0.18, 0.18),
    });
    y -= 18;

    options.summaryRows.forEach((summary) => {
      page.drawText(`${summary.label}: ${stripHtml(summary.value)}`, {
        x: MARGIN, y: y - 10, size: CELL_SIZE, font: fontRegular, color: rgb(0.22, 0.22, 0.22),
      });
      y -= 14;
    });
  }

  // ========== Rodapé com número de páginas (two-pass) ==========
  const totalPages = allPages.length;
  allPages.forEach((pg, idx) => {
    drawFooter(pg, empresa, idx + 1, totalPages, fontRegular, now);
  });

  const base64 = await pdf.saveAsBase64({ dataUri: false });

  return {
    filename: `${sanitizeFilename(options.filename)}.pdf`,
    contentType: "application/pdf",
    encoding: "base64",
    content: base64,
  };
}
