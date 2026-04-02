const puppeteer = require("puppeteer");
const { getEmpresaAtiva, getEmpresaById } = require("./empresaService");
const { gerarCabecalhoHTML } = require("../utils/relatorioHeader");

async function gerarRelatorioPDF({ empresaId, titulo, conteudo }) {
  const empresa = empresaId ? await getEmpresaById(empresaId) : await getEmpresaAtiva();

  if (!empresa) throw new Error("Empresa não encontrada");

  const cabecalho = gerarCabecalhoHTML(empresa);
  const nomeFantasia = empresa.nome_fantasia || empresa.razao_social || "";
  const cnpj = empresa.cnpj || "";

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 0 40px; }
        .conteudo { margin-top: 10px; }
        h3 { font-size: 16px; color: #1a1a1a; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #f0f0f0; font-size: 11px; text-align: left; padding: 8px 6px; border-bottom: 2px solid #ccc; }
        td { font-size: 11px; padding: 6px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #fafafa; }
        .resumo { margin-top: 20px; padding: 10px; background: #f8f8f8; border: 1px solid #ddd; }
        .resumo p { margin: 4px 0; font-size: 11px; }
      </style>
    </head>
    <body>
      ${cabecalho}
      <div class="conteudo">
        ${conteudo}
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#666; padding-top:10px;">
          ${nomeFantasia} - CNPJ: ${cnpj}
        </div>
      `,
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#888; padding-bottom:10px;">
          Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      margin: { top: "60px", bottom: "50px", left: "40px", right: "40px" },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

async function gerarRelatorioSimplesPDF({ empresaId, titulo, linhas, colunas }) {
  const empresa = empresaId ? await getEmpresaById(empresaId) : await getEmpresaAtiva();

  if (!empresa) throw new Error("Empresa não encontrada");

  let tabelaHTML = "";
  if (colunas && linhas) {
    tabelaHTML = `
      <h3>${titulo || "Relatório"}</h3>
      <table>
        <thead>
          <tr>${colunas.map((c) => `<th>${c.header}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${linhas.map((linha) => `<tr>${colunas.map((c) => `<td>${linha[c.key] ?? ""}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  return gerarRelatorioPDF({
    empresaId,
    titulo,
    conteudo: tabelaHTML || `<h3>${titulo || "Relatório"}</h3><p>Sem dados para exibir.</p>`,
  });
}

module.exports = { gerarRelatorioPDF, gerarRelatorioSimplesPDF };
