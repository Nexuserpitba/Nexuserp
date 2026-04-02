const fs = require('fs');

const file = 'src/pages/fiscal/EmissaoNFe.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    const numero = String(Math.floor(Math.random() * 900000) + 100000);
    const protocolo = String(Date.now()).slice(-15);
    const chaveAcesso = form.emitenteCnpj.replace(/\\D/g, "") + 
      form.dataEmissao.replace(/-/g, "") + 
      "55" + 
      form.serie.padStart(3, "0") + 
      numero.padStart(9, "0") + 
      "1" + 
      Math.floor(Math.random() * 9);

    setNfeEmitida({ 
      numero, 
      protocolo, 
      dataEmissao: new Date().toLocaleString("pt-BR"),
      chaveAcesso,
      status: "100 - Autorizado o uso da NF-e"
    });
    setEmitidaDialogOpen(true);
    toast({ title: "NF-e Emitida com Sucesso!", description: \`NF-e nº \${numero} transmitida. Protocolo: \${protocolo}\` });

    setTimeout(() => {
      const xmlContent = \`<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe\${chaveAcesso}" versao="4.00"></infNFe></NFe></nfeProc>\`;
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`NFe\${chaveAcesso}.xml\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const printBtn = document.getElementById("btn-print-nfe");
      if (printBtn) printBtn.click();
    }, 500);
  }, [form, items, toast]);`;

const replacement = `    setEmitindo(true);
    
    try {
      const { xml, chaveAcesso } = gerarXmlNFeBruto(form, items);
      const { base64: certificadoBase64 = "", senha: certificadoSenha = "" } = empresaAtiva?.certificado || {};

      const response = await fetch("http://localhost:3001/api/sefaz/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xmlBruto: xml,
          ambiente: form.ambiente,
          uf: form.uf,
          chaveAcesso,
          certificadoBase64,
          certificadoSenha 
        })
      });

      const data = await response.json();
      if (!response.ok || data.erro) throw new Error(data.erro || "Falha na comunicação com o Servidor Fiscal (Backend).");

      const protocolo = data.protocolo || String(Date.now()).slice(-15);
      const xmlAssinado = data.xmlAssinado || xml;

      setNfeEmitida({ 
        numero: form.numero || "1", 
        protocolo, 
        dataEmissao: new Date().toLocaleString("pt-BR"),
        chaveAcesso,
        status: data.mensagem || "100 - Autorizado o uso da NF-e"
      });
      
      setEmitidaDialogOpen(true);
      toast({ title: "NF-e Emitida!", description: \`NF-e \${chaveAcesso} autorizada. Prot: \${protocolo}\` });

      const blob = new Blob([xmlAssinado], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`NFe\${chaveAcesso}.xml\`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        const printBtn = document.getElementById("btn-print-nfe");
        if (printBtn) printBtn.click();
      }, 500);

    } catch (err: any) {
      toast({ title: "Rejeição SEFAZ / Erro HTTP", description: err.message || "Erro ao emitir", variant: "destructive" });
    } finally {
      setEmitindo(false);
    }
  }, [form, items, empresaAtiva, toast]);`;

content = content.replace(target, replacement);

const handleTarget = 'const handleEmitir = useCallback(() => {';
const handleRepl = 'const handleEmitir = useCallback(async () => {';
content = content.replace(handleTarget, handleRepl);

fs.writeFileSync(file, content);
console.log("REPLACED SUCCESSFULLY!");
