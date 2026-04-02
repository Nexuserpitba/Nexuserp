export const gerarXmlNFeBruto = (form: any, items: any[], contasReceber: any = null): { xml: string, chaveAcesso: string } => {
  const agora = new Date();
  const formataDataHora = (dataLocal: string, horaLocal: string) => {
    if (!dataLocal || !horaLocal) return agora.toISOString().substring(0, 19) + "-03:00";
    return `${dataLocal}T${horaLocal}:00-03:00`;
  };

  const removeAcentos = (str: string) => {
    return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 \-_.]/g, "") : "";
  };
  
  const justNumbers = (str: string) => {
    return str ? str.replace(/\D/g, "") : "";
  };

  const padLeft = (num: any, size: number) => {
    let s = String(num);
    while (s.length < size) s = "0" + s;
    return s;
  };

  const cNF = padLeft(Math.floor(Math.random() * 99999999), 8);
  const cdMunicipioEmitente = form.emitenteCodMunicipio || "3550308";
  const ufCodeEMitente = cdMunicipioEmitente.substring(0, 2);
  
  const anoMes = (form.dataEmissao || "").substring(2, 4) + (form.dataEmissao || "").substring(5, 7);
  let chaveParcial = `${ufCodeEMitente}${anoMes}${justNumbers(form.emitenteCnpj).padStart(14, '0')}${padLeft(form.modelo, 2)}${padLeft(form.serie, 3)}${padLeft(form.numero || "1", 9)}${form.tipo}${cNF}`;
  
  let soma = 0;
  let peso = 2;
  for (let i = chaveParcial.length - 1; i >= 0; i--) {
    soma += parseInt(chaveParcial.charAt(i)) * peso;
    peso++;
    if (peso > 9) peso = 2;
  }
  let resto = soma % 11;
  let dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
  
  const cDV = String(dv);
  const chaveCompleta = chaveParcial + cDV;
  const idNFe = "NFe" + chaveCompleta;

  const numFormat = (val: string | number) => {
    const v = typeof val === "string" ? parseFloat(val.replace(',', '.')) : val;
    return isNaN(v) ? "0.00" : v.toFixed(2);
  };

  let totalIcms = 0;
  let totalBaseIcms = 0;
  let totalProd = 0;
  let totalIpi = 0;

  const xmlDets = items.map((item, idx) => {
    const nItem = idx + 1;
    const vProdValue = parseFloat(item.valorTotal || (item.valorUnitario * item.quantidade));
    const vProd = isNaN(vProdValue) ? 0 : vProdValue;
    totalProd += vProd;
    
    const ncm = justNumbers(item.ncm) || "00000000";
    const cfop = justNumbers(item.cfop) || "5102";

    const isSimples = form.emitenteCrt === "1" || form.emitenteCrt === "2";
    let icmsNode = "";
    if (isSimples) {
      icmsNode = `
        <ICMSSN>
          <CSOSN102>
            <orig>0</orig>
            <CSOSN>102</CSOSN>
          </CSOSN102>
        </ICMSSN>
      `;
    } else {
      icmsNode = `
        <ICMS00>
          <orig>0</orig>
          <CST>00</CST>
          <modBC>0</modBC>
          <vBC>${numFormat(vProd)}</vBC>
          <pICMS>${numFormat(item.icmsAliquota || 18)}</pICMS>
          <vICMS>${numFormat((vProd * (item.icmsAliquota || 18)) / 100)}</vICMS>
        </ICMS00>
      `;
      totalBaseIcms += vProd;
      totalIcms += (vProd * (item.icmsAliquota || 18)) / 100;
    }

    return `
    <det nItem="${nItem}">
      <prod>
        <cProd>${removeAcentos(item.codigo)}</cProd>
        <cEAN></cEAN>
        <xProd>${removeAcentos(item.descricao)}</xProd>
        <NCM>${ncm}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${removeAcentos(item.unidade)}</uCom>
        <qCom>${numFormat(item.quantidade)}</qCom>
        <vUnCom>${numFormat(item.valorUnitario)}</vUnCom>
        <vProd>${numFormat(vProd)}</vProd>
        <cEANTrib></cEANTrib>
        <uTrib>${removeAcentos(item.unidade)}</uTrib>
        <qTrib>${numFormat(item.quantidade)}</qTrib>
        <vUnTrib>${numFormat(item.valorUnitario)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          ${icmsNode}
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>99</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.00</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>
    `;
  }).join('');

  // Cobrança (Fatura e Duplicatas)
  let cobrNode = "";
  if (contasReceber && contasReceber.parcelas && contasReceber.parcelas.length > 0) {
    const fVal = (v: any) => {
      const n = parseFloat(String(v || "0").replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const totalVNF = totalProd - fVal(form.totalDesconto) + fVal(form.totalFrete) + fVal(form.totalOutros);

    cobrNode = `
    <cobr>
      <fat>
        <nFat>${padLeft(form.numero || "1", 9)}</nFat>
        <vOrig>${numFormat(totalVNF)}</vOrig>
        <vLiq>${numFormat(totalVNF)}</vLiq>
      </fat>
      ${contasReceber.parcelas.map((p: any) => `
      <dup>
        <nDup>${p.numero.padStart(3, '0')}</nDup>
        <dVenc>${p.vencimento}</dVenc>
        <vDup>${numFormat(p.valor)}</vDup>
      </dup>
      `).join('')}
    </cobr>
    `;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="${idNFe}">
    <ide>
      <cUF>${ufCodeEMitente}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>Venda de Mercadorias</natOp>
      <mod>${form.modelo}</mod>
      <serie>${form.serie}</serie>
      <nNF>${form.numero || "1"}</nNF>
      <dhEmi>${formataDataHora(form.dataEmissao, form.horaSaida)}</dhEmi>
      <dhSaiEnt>${formataDataHora(form.dataSaida, form.horaSaida)}</dhSaiEnt>
      <tpNF>${form.tipo}</tpNF>
      <idDest>${form.uf === form.destUf ? "1" : "2"}</idDest>
      <cMunFG>${cdMunicipioEmitente}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>${form.ambiente || "2"}</tpAmb>
      <finNFe>${form.finalidade || "1"}</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>NexusERP 1.0.0</verProc>
    </ide>
    <emit>
      <CNPJ>${justNumbers(form.emitenteCnpj)}</CNPJ>
      <xNome>${removeAcentos(form.emitenteRazaoSocial)}</xNome>
      <xFant>${removeAcentos(form.emitenteNomeFantasia)}</xFant>
      <enderEmit>
        <xLgr>${removeAcentos(form.emitenteLogradouro)}</xLgr>
        <nro>${removeAcentos(form.emitenteNumero) || "S/N"}</nro>
        <xCpl>${removeAcentos(form.emitenteComplemento)}</xCpl>
        <xBairro>${removeAcentos(form.emitenteBairro)}</xBairro>
        <cMun>${cdMunicipioEmitente}</cMun>
        <xMun>${removeAcentos(form.emitenteMunicipio)}</xMun>
        <UF>${form.emitenteUf}</UF>
        <CEP>${justNumbers(form.emitenteCep)}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        <fone>${justNumbers(form.emitenteTelefone)}</fone>
      </enderEmit>
      <IE>${justNumbers(form.emitenteIe) || "ISENTO"}</IE>
      <CRT>${form.emitenteCrt || "1"}</CRT>
    </emit>
    <dest>
      <${justNumbers(form.destCpfCnpj).length === 11 ? "CPF" : "CNPJ"}>${justNumbers(form.destCpfCnpj)}</${justNumbers(form.destCpfCnpj).length === 11 ? "CPF" : "CNPJ"}>
      <xNome>${removeAcentos(form.destNome)}</xNome>
      <enderDest>
        <xLgr>${removeAcentos(form.destLogradouro)}</xLgr>
        <nro>${removeAcentos(form.destNumero) || "S/N"}</nro>
        <xCpl>${removeAcentos(form.destComplemento)}</xCpl>
        <xBairro>${removeAcentos(form.destBairro)}</xBairro>
        <cMun>${form.destCodMunicipio || form.emitenteCodMunicipio}</cMun>
        <xMun>${removeAcentos(form.destMunicipio)}</xMun>
        <UF>${form.destUf}</UF>
        <CEP>${justNumbers(form.destCep)}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
        <fone>${justNumbers(form.destTelefone)}</fone>
      </enderDest>
      <indIEDest>${form.destIndicadorIE || "9"}</indIEDest>
      ${form.destIe ? `<IE>${justNumbers(form.destIe)}</IE>` : ""}
    </dest>
    ${xmlDets}
    <total>
      <ICMSTot>
        <vBC>${numFormat(totalBaseIcms)}</vBC>
        <vICMS>${numFormat(totalIcms)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${numFormat(totalProd)}</vProd>
        <vFrete>${numFormat(form.totalFrete)}</vFrete>
        <vSeg>${numFormat(form.totalSeguro)}</vSeg>
        <vDesc>${numFormat(form.totalDesconto)}</vDesc>
        <vII>0.00</vII>
        <vIPI>${numFormat(totalIpi)}</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>${numFormat(form.totalOutros)}</vOutro>
        <vNF>${numFormat(totalProd - parseFloat(form.totalDesconto || "0") + parseFloat(form.totalFrete || "0") + parseFloat(form.totalOutros || "0"))}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${form.transpModalidadeFrete}</modFrete>
      ${form.transpModalidadeFrete !== "9" && form.transpTransportadoraNome ? `
      <transporta>
        <${justNumbers(form.transpTransportadoraCnpj).length === 11 ? "CPF" : "CNPJ"}>${justNumbers(form.transpTransportadoraCnpj)}</${justNumbers(form.transpTransportadoraCnpj).length === 11 ? "CPF" : "CNPJ"}>
        <xNome>${removeAcentos(form.transpTransportadoraNome)}</xNome>
        <IE>${justNumbers(form.transpTransportadoraIe)}</IE>
        <xEnder>${removeAcentos(form.transpTransportadoraEndereco)}</xEnder>
        <xMun>${removeAcentos(form.transpTransportadoraMunicipio)}</xMun>
        <UF>${form.transpVeiculoUf || form.emitenteUf}</UF>
      </transporta>
      <veicTransp>
        <placa>${removeAcentos(form.transpVeiculoPlaca).replace("-","")}</placa>
        <UF>${form.transpVeiculoUf}</UF>
      </veicTransp>` : ""}
      <vol>
        <qVol>${justNumbers(form.transpVolumeQuantidade) || "1"}</qVol>
        <esp>${removeAcentos(form.transpVolumeEspecie) || "VOL"}</esp>
        <pesoL>${numFormat(form.transpVolumePesoLiquido || "0.00")}</pesoL>
        <pesoB>${numFormat(form.transpVolumePesoBruto || "0.00")}</pesoB>
      </vol>
    </transp>
    ${cobrNode}
    <pag>
      <detPag>
        <indPag>${form.pagForma === "14" || form.pagForma === "15" ? "1" : (contasReceber ? "1" : "0")}</indPag>
        <tPag>${padLeft(form.pagForma, 2) || "01"}</tPag>
        <vPag>${numFormat(totalProd - parseFloat(form.totalDesconto || "0") + parseFloat(form.totalFrete || "0") + parseFloat(form.totalOutros || "0"))}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>${removeAcentos(form.informacoesComplementares)}</infCpl>
    </infAdic>
  </infNFe>
</NFe>
`;

  return { xml, chaveAcesso: chaveCompleta };
};
