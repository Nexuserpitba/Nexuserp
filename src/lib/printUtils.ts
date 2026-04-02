/**
 * Utility to open a styled print window for PDF generation.
 * Uses window.open + document.write for high-fidelity print output.
 * Professional report layout for NexusERP
 */

import { getActiveLogo, getSelectedEmpresaId } from "./logoUtils";
import { supabase } from "@/integrations/supabase/client";

// Get logo for print: configured logo only (no fallback)
async function getLogoBase64(): Promise<string> {
  const empresaId = getSelectedEmpresaId() ?? undefined;
  const configured = getActiveLogo(empresaId);
  if (configured) return configured;
  return "";
}

interface EmpresaInfo {
  html: string;
  nome: string;
  nomeFantasia: string;
  cnpj: string;
  ie: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  regime: string;
}

async function getEmpresaInfo(): Promise<EmpresaInfo> {
  const emptyResult = { html: "", nome: "", nomeFantasia: "", cnpj: "", ie: "", endereco: "", bairro: "", cidade: "", uf: "", cep: "", telefone: "", email: "", regime: "" };
  
  try {
    // Tenta primeiro do localStorage
    const s = localStorage.getItem("empresas");
    if (s) {
      const empresas = JSON.parse(s);
      const empresa = empresas.find((e: any) => e.selecionada) || empresas[0] || null;
      
      if (empresa) {
        const nome = empresa.razaoSocial || empresa.razao_social || empresa.nomeFantasia || empresa.nome_fantasia || "";
        const nomeFantasia = empresa.nomeFantasia || empresa.nome_fantasia || "";
        const cnpj = empresa.cnpj || "";
        const ie = empresa.inscricaoEstadual || empresa.inscricao_estadual || empresa.ie || "";
        const endereco = empresa.endereco || empresa.logradouro || "";
        const numero = empresa.numero || "";
        const bairro = empresa.bairro || "";
        const cidade = empresa.cidade || "";
        const uf = empresa.uf || "";
        const cep = empresa.cep || "";
        const telefone = empresa.telefone || "";
        const email = empresa.email || "";
        const regime = empresa.regime || "";
        const enderecoCompleto = [endereco, numero].filter(Boolean).join(", ");

        return { html: "", nome, nomeFantasia, cnpj, ie, endereco: enderecoCompleto, bairro, cidade, uf, cep, telefone, email, regime };
      }
    }

    // Fallback: busca direto do Supabase
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("selecionada", true)
      .limit(1)
      .single();

    if (error || !data) {
      // Tenta buscar qualquer empresa se não houver selecionada
      const { data: anyEmpresa } = await supabase
        .from("empresas")
        .select("*")
        .limit(1)
        .single();
      
      if (!anyEmpresa) return emptyResult;
      
      const nome = anyEmpresa.razao_social || anyEmpresa.nome_fantasia || "";
      const nomeFantasia = anyEmpresa.nome_fantasia || "";
      const cnpj = anyEmpresa.cnpj || "";
      const ie = anyEmpresa.inscricao_estadual || "";
      const endereco = anyEmpresa.endereco || "";
      const bairro = anyEmpresa.bairro || "";
      const cidade = anyEmpresa.cidade || "";
      const uf = anyEmpresa.uf || "";
      const cep = anyEmpresa.cep || "";
      const telefone = anyEmpresa.telefone || "";
      const email = anyEmpresa.email || "";
      const regime = anyEmpresa.regime || "";

      return { html: "", nome, nomeFantasia, cnpj, ie, endereco, bairro, cidade, uf, cep, telefone, email, regime };
    }

    const nome = data.razao_social || data.nome_fantasia || "";
    const nomeFantasia = data.nome_fantasia || "";
    const cnpj = data.cnpj || "";
    const ie = data.inscricao_estadual || "";
    const endereco = data.endereco || "";
    const bairro = data.bairro || "";
    const cidade = data.cidade || "";
    const uf = data.uf || "";
    const cep = data.cep || "";
    const telefone = data.telefone || "";
    const email = data.email || "";
    const regime = data.regime || "";

    return { html: "", nome, nomeFantasia, cnpj, ie, endereco, bairro, cidade, uf, cep, telefone, email, regime };
  } catch {
    return emptyResult;
  }
}

const BASE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  
  * { 
    box-sizing: border-box; 
    margin: 0; 
    padding: 0; 
  }
  
  body { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
    padding: 0; 
    font-size: 11px; 
    color: #1a1a1a; 
    line-height: 1.6;
    background: #fff;
  }
  
  .page-container {
    max-width: 210mm;
    margin: 0 auto;
    padding: 20mm 15mm;
  }
  
  .header { 
    background: #fff;
    color: #1a1a1a;
    padding: 0 0 0 0;
    margin: -20mm -15mm 20px -15mm;
    padding-left: 15mm;
    padding-right: 15mm;
  }
  
  .header .header-bar {
    height: 3px;
    background: #1a1a1a;
    margin-bottom: 12px;
  }
  
  .header .header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }
  
  .header .header-left {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    flex-shrink: 0;
    flex: 1;
  }
  
  .header .logo { 
    flex-shrink: 0;
    background: none;
    padding: 0;
    border-radius: 0;
    box-shadow: none;
  }
  
  .header .logo img { 
    height: 56px; 
    width: auto;
    display: block;
  }
  
  .header .header-left-text {
    display: flex;
    flex-direction: column;
  }
  
  .header .empresa-nome { 
    font-size: 17px;
    font-weight: 700;
    margin-bottom: 1px;
    color: #1a1a1a;
    letter-spacing: -0.3px;
    line-height: 1.2;
    text-transform: uppercase;
  }
  
  .header .empresa-razao {
    font-size: 9px;
    color: #555;
    font-weight: 400;
    margin-bottom: 6px;
  }

  .header .empresa-line {
    font-size: 8px;
    color: #555;
    line-height: 1.5;
    margin-top: 2px;
  }
  
  .header .header-right {
    text-align: right;
    flex-shrink: 0;
  }
  
  .header .report-name-header {
    font-size: 11px;
    font-weight: 700;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .header .empresa-details { 
    font-size: 8px;
    color: #555;
    line-height: 1.6;
    text-align: right;
    margin-top: 4px;
  }
  
  .header .empresa-details span {
    display: block;
    white-space: nowrap;
  }
  
  .report-title-section {
    background: #fff;
    border: none;
    border-bottom: 1px solid #ccc;
    border-radius: 0;
    padding: 12px 0;
    margin-bottom: 20px;
  }
  
  .report-title-section h1 { 
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 4px;
    letter-spacing: -0.5px;
  }
  
  .report-title-section .cabecalho-titulo {
    font-size: 11px;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
  
  .report-title-section .cabecalho-subtitulo {
    font-size: 10px;
    color: #555;
    margin-bottom: 6px;
  }
  
  .report-title-section p { 
    font-size: 11px;
    color: #555;
  }
  
  .report-title-section .report-meta {
    display: flex;
    gap: 20px;
    margin-top: 6px;
    font-size: 10px;
    color: #777;
  }
  
  .report-title-section .report-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 16px 0;
    font-size: 10px;
  }
  
  th { 
    background: #f5f5f5;
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #333;
    border-bottom: 2px solid #999;
    white-space: nowrap;
  }
  
  td { 
    padding: 9px 12px;
    border-bottom: 1px solid #eee;
    text-align: left;
    font-size: 10px;
  }
  
  tbody tr:hover {
    background: #fafafa;
  }
  
  tbody tr:last-child td {
    border-bottom: 2px solid #999;
  }
  
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .bold { font-weight: 600; }
  
  .total-row { 
    font-weight: 700;
    background: #f0f0f0 !important;
    border-top: 2px solid #333;
    color: #1a1a1a;
  }
  
  .total-row td {
    padding: 12px;
    border-bottom: none;
  }
  
  .subtotal-row { 
    font-weight: 600;
    background: #f8f8f8;
  }
  
  .positive { color: #333; font-weight: 600; }
  .negative { color: #333; font-weight: 600; }
  .muted { color: #888; font-size: 9px; }
  
  .info-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); 
    gap: 12px; 
    margin: 20px 0; 
  }
  
  .info-box { 
    background: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 4px; 
    padding: 14px 16px; 
    text-align: center;
  }
  
  .info-box .label { 
    font-size: 9px; 
    color: #555; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    font-weight: 500;
  }
  
  .info-box .value { 
    font-size: 18px; 
    font-weight: 700;
    color: #1a1a1a;
  }
  
  .info-box.highlight,
  .info-box.success,
  .info-box.danger {
    background: #f5f5f5;
    border-color: #ccc;
  }
  
  .info-box.highlight .value,
  .info-box.success .value,
  .info-box.danger .value {
    color: #1a1a1a;
  }
  
  .section-title {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    margin: 24px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #999;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-title::before {
    content: '';
    width: 4px;
    height: 16px;
    background: #333;
    border-radius: 2px;
  }
  
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid #999;
    background: #f0f0f0;
    color: #333;
  }
  
  .footer { 
    margin-top: 32px;
    padding: 16px 0;
    border-top: 1px solid #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #777;
  }
  
  .footer .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .footer .footer-right {
    text-align: right;
  }
  
  .nivel-1 { padding-left: 24px !important; }
  .nivel-2 { padding-left: 48px !important; font-size: 10px; }
  
  .watermark {
    position: fixed;
    bottom: 20mm;
    right: 15mm;
    font-size: 8px;
    color: #ccc;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  
  @media print { 
    .page-container {
      padding: 0;
    }
    
    .header {
      margin: 0 0 20px 0;
      padding-left: 0;
      padding-right: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .report-title-section,
    .info-box,
    .total-row,
    th {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    @page { 
      margin: 15mm 12mm; 
      size: A4;
    }
    
    @page :first {
      margin-top: 0;
    }
    
    tbody tr:hover {
      background: transparent;
    }
  }
`;

export interface PrintPDFOptions {
  title: string;
  subtitle?: string;
  content: string;
  extraStyles?: string;
  thermal?: boolean;
  showWatermark?: boolean;
}

const THERMAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Courier New', monospace; 
    padding: 4px; 
    font-size: 10px; 
    color: #000; 
    line-height: 1.3;
    width: 302px;
    max-width: 302px;
  }
  .header { 
    background: none !important;
    color: #000 !important;
    text-align: center; 
    margin: 0 0 8px 0 !important;
    padding: 0 !important;
    border-bottom: 1px dashed #000; 
    padding-bottom: 6px !important;
    display: block !important;
  }
  .header .logo { 
    background: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    display: inline-block !important;
  }
  .header .logo img { height: 40px; width: auto; }
  .header .header-top { display: block !important; text-align: center; }
  .header .header-left { display: block !important; text-align: center; margin-bottom: 4px; }
  .header .header-left-text { display: block !important; text-align: center; }
  .header .header-right { display: block !important; text-align: center; }
  .header .empresa-nome { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
  .header .empresa-fantasia { font-size: 9px; color: #000 !important; }
  .header .empresa-details { 
    display: block !important;
    font-size: 8px; 
    line-height: 1.4;
    text-align: center !important;
  }
  .report-title-section {
    background: none !important;
    border: none !important;
    border-bottom: 1px dashed #000 !important;
    padding: 6px 0 !important;
    margin: 0 0 8px 0 !important;
    border-radius: 0 !important;
  }
  .report-title-section h1 { font-size: 12px; margin-bottom: 2px; color: #000 !important; }
  .report-title-section p { font-size: 9px; }
  .report-title-section .cabecalho-titulo,
  .report-title-section .cabecalho-subtitulo {
    color: #000 !important;
  }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th, td { padding: 2px 3px; text-align: left; font-size: 9px; }
  th { font-weight: 700; border-bottom: 1px dashed #000; font-size: 8px; background: none !important; color: #000 !important; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .bold { font-weight: 700; }
  .total-row { font-weight: 700; border-top: 1px dashed #000; background: none !important; }
  .total-row td { color: #000 !important; }
  .info-grid { margin: 4px 0; }
  .info-box { padding: 2px 0; border-bottom: 1px dotted #ccc; background: none !important; border: none !important; border-radius: 0 !important; }
  .info-box .label { font-size: 8px; text-transform: uppercase; color: #000 !important; }
  .info-box .value { font-size: 11px; font-weight: 700; color: #000 !important; }
  .footer { 
    margin-top: 8px; 
    padding-top: 4px; 
    border-top: 1px dashed #000; 
    font-size: 8px; 
    text-align: center;
    display: block !important;
  }
  .section-title { font-size: 10px; margin: 8px 0 4px 0; border-bottom: none !important; padding-bottom: 2px !important; }
  .section-title::before { display: none; }
  .badge { border: 1px solid #000; background: none !important; }
  @media print { 
    body { padding: 2px; } 
    @page { margin: 2mm; size: 80mm auto; }
  }
`;

export async function generatePrintHTML({ title, subtitle, content, extraStyles = "", thermal = false, showWatermark = true }: PrintPDFOptions): Promise<string> {
  const now = new Date();
  const timestamp = now.toLocaleString("pt-BR");
  const dateOnly = now.toLocaleDateString("pt-BR");
  const timeOnly = now.toLocaleTimeString("pt-BR");
  const logoSrc = await getLogoBase64();
  const logoHtml = logoSrc ? `<div class="logo"><img src="${logoSrc}" alt="Logo" /></div>` : "";

  const empresa = await getEmpresaInfo();
  
  const configRelatorios = (() => {
    try { return JSON.parse(localStorage.getItem("config_relatorios") || "{}"); } catch { return {}; }
  })();
  const rodapeTexto = configRelatorios.rodapeTexto || "NexusERP";
  const cabTitulo = configRelatorios.cabecalhoTitulo || "";
  const cabSubtitulo = configRelatorios.cabecalhoSubtitulo || "";

  // Monta endereço completo
  const enderecoCompleto = [
    empresa.endereco,
    empresa.bairro,
    empresa.cidade && empresa.uf ? `${empresa.cidade} - ${empresa.uf}` : empresa.cidade || empresa.uf,
    empresa.cep ? `CEP: ${empresa.cep}` : ""
  ].filter(Boolean).join(" • ");

  const empresaDetailsHtml = !thermal ? `
    <div class="empresa-details">
      ${empresa.cnpj ? `<span><strong>CNPJ:</strong> ${empresa.cnpj}</span>` : ""}
      ${empresa.ie ? `<span><strong>I.E.:</strong> ${empresa.ie}</span>` : ""}
      ${empresa.regime ? `<span><strong>Regime:</strong> ${empresa.regime}</span>` : ""}
      ${enderecoCompleto ? `<span>${enderecoCompleto}</span>` : ""}
      ${empresa.telefone ? `<span>${empresa.telefone}</span>` : ""}
      ${empresa.email ? `<span>${empresa.email}</span>` : ""}
    </div>
  ` : "";

  const empresaDetailsThermal = thermal ? `
    <div class="empresa-details">
      ${empresa.cnpj ? `<span>CNPJ: ${empresa.cnpj}</span>` : ""}
      ${enderecoCompleto ? `<span>${enderecoCompleto}</span>` : ""}
    </div>
  ` : "";

  const cabecalhoExtra = (cabTitulo || cabSubtitulo)
    ? `${cabTitulo ? `<div class="cabecalho-titulo">${cabTitulo}</div>` : ""}${cabSubtitulo ? `<div class="cabecalho-subtitulo">${cabSubtitulo}</div>` : ""}`
    : "";

  const styles = thermal ? THERMAL_STYLES + extraStyles : BASE_STYLES + extraStyles;

  const watermarkHtml = !thermal && showWatermark ? `<div class="watermark">NexusERP — Relatório Gerado em ${timestamp}</div>` : "";

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${empresa.nomeFantasia || empresa.nome || ""}</title>
  <style>${styles}</style>
</head><body>
  <div class="page-container">
    <div class="header">
      <div class="header-top">
        <div class="header-left">
          ${logoHtml}
          <div class="header-left-text">
            <div class="empresa-nome">${empresa.nomeFantasia || empresa.nome || ""}</div>
            ${empresa.nomeFantasia && empresa.nome !== empresa.nomeFantasia ? `<div class="empresa-fantasia">${empresa.nomeFantasia}</div>` : ""}
          </div>
        </div>
        <div class="header-right">
          ${thermal ? empresaDetailsThermal : empresaDetailsHtml}
        </div>
      </div>
    </div>
    
    <div class="report-title-section">
      ${cabecalhoExtra}
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
      <div class="report-meta">
        ${empresa.cnpj ? `<span><strong>CNPJ:</strong> ${empresa.cnpj}</span>` : ""}
        ${empresa.ie ? `<span><strong>I.E.:</strong> ${empresa.ie}</span>` : ""}
        ${empresa.telefone ? `<span><strong>Tel:</strong> ${empresa.telefone}</span>` : ""}
        ${empresa.email ? `<span><strong>E-mail:</strong> ${empresa.email}</span>` : ""}
        ${enderecoCompleto ? `<span>${enderecoCompleto}</span>` : ""}
      </div>
    </div>

    ${content}

    <div class="footer">
      <div class="footer-left">
        ${empresa.cnpj ? `<span>CNPJ: ${empresa.cnpj}</span>` : ""}
        ${empresa.ie ? `<span> | I.E.: ${empresa.ie}</span>` : ""}
        ${empresa.telefone ? `<span> | Tel: ${empresa.telefone}</span>` : ""}
      </div>
      <div class="footer-right">
        ${empresa.email ? `<span>${empresa.email}</span>` : ""}
        ${enderecoCompleto ? `<span>${enderecoCompleto}</span>` : ""}
      </div>
    </div>
  </div>
  ${watermarkHtml}
</body></html>`;
}

export async function printPDF(options: PrintPDFOptions) {
  const win = window.open("", "_blank", options.thermal ? "width=360,height=600" : undefined);
  if (!win) return;

  const html = await generatePrintHTML(options);
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

/**
 * Builds an HTML table string from headers and rows.
 */
export function buildPrintTable(
  headers: { label: string; align?: "left" | "right" | "center" }[],
  rows: { cells: string[]; className?: string }[]
): string {
  const ths = headers.map(h => 
    `<th style="text-align:${h.align ?? "left"}">${h.label}</th>`
  ).join("");

  const trs = rows.map(r => {
    const tds = r.cells.map((cell, i) => 
      `<td style="text-align:${headers[i]?.align ?? "left"}">${cell}</td>`
    ).join("");
    return `<tr class="${r.className ?? ""}">${tds}</tr>`;
  }).join("");

  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

/**
 * Builds an info grid for KPIs
 */
export function buildInfoGrid(items: { label: string; value: string; type?: "default" | "highlight" | "success" | "danger" }[]): string {
  const boxes = items.map(item => {
    const typeClass = item.type ? ` ${item.type}` : "";
    return `<div class="info-box${typeClass}">
      <div class="label">${item.label}</div>
      <div class="value">${item.value}</div>
    </div>`;
  }).join("");
  
  return `<div class="info-grid">${boxes}</div>`;
}

/**
 * Builds a section title
 */
export function buildSectionTitle(title: string): string {
  return `<div class="section-title">${title}</div>`;
}

/**
 * Builds a badge
 */
export function buildBadge(text: string, type: "primary" | "success" | "danger" | "warning" = "primary"): string {
  return `<span class="badge badge-${type}">${text}</span>`;
}

/**
 * Format currency for print
 */
export function printCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Format percentage for print
 */
export function printPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format date for print
 */
export function printDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Format number for print
 */
export function printNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}
