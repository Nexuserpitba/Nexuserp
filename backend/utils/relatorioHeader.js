function gerarCabecalhoHTML(empresa) {
  if (!empresa) return "";

  const nome = empresa.nome_fantasia || empresa.razao_social || empresa.nome || "";
  const razao = empresa.razao_social && empresa.razao_social !== nome ? empresa.razao_social : "";
  const cnpj = empresa.cnpj || "";
  const ie = empresa.inscricao_estadual || empresa.ie || "";
  const endereco = empresa.logradouro || empresa.endereco || "";
  const numero = empresa.numero || "";
  const bairro = empresa.bairro || "";
  const cidade = empresa.cidade || "";
  const uf = empresa.uf || "";
  const cep = empresa.cep || "";
  const telefone = empresa.telefone || "";
  const email = empresa.email || "";
  const logoUrl = empresa.logo_url || empresa.logoUrl || "";

  const enderecoCompleto = [endereco + (numero ? `, ${numero}` : ""), bairro, cidade && uf ? `${cidade} - ${uf}` : cidade || uf, cep ? `CEP: ${cep}` : ""].filter(Boolean).join(" • ");

  const contato = [telefone, email].filter(Boolean).join(" • ");

  return `
    <div style="display:flex; align-items:center; border-bottom:2px solid #333; padding-bottom:12px; margin-bottom:20px;">
      ${logoUrl ? `<img src="${logoUrl}" style="height:60px; margin-right:20px;" crossorigin="anonymous" />` : ""}
      <div style="flex:1;">
        <h2 style="margin:0; font-size:18px; color:#1a1a1a;">${nome.toUpperCase()}</h2>
        ${razao ? `<p style="margin:2px 0 0; font-size:11px; color:#666;">${razao}</p>` : ""}
        <p style="margin:6px 0 0; font-size:10px; color:#555; line-height:1.5;">
          CNPJ: ${cnpj}${ie ? ` | I.E.: ${ie}` : ""}<br/>
          ${enderecoCompleto}${contato ? `<br/>${contato}` : ""}
        </p>
      </div>
    </div>
  `;
}

function gerarRodapeHTML(empresa, pageNumber, totalPages) {
  const nome = empresa?.nome_fantasia || empresa?.razao_social || "";
  const agora = new Date().toLocaleString("pt-BR");

  return `
    <div style="font-size:9px; color:#888; width:100%; display:flex; justify-content:space-between; padding:0 40px; box-sizing:border-box;">
      <span>${nome}</span>
      <span>Gerado em: ${agora}</span>
      <span>Página ${pageNumber} de ${totalPages}</span>
    </div>
  `;
}

module.exports = { gerarCabecalhoHTML, gerarRodapeHTML };
