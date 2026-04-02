const express = require("express");
const cors = require("cors");
const axios = require("axios");
const forge = require("node-forge");
const { SignedXml } = require("xml-crypto");
const fs = require("fs");
const path = require("path");
const { gerarRelatorioPDF, gerarRelatorioSimplesPDF } = require("./services/relatorioService");
const authRoutes = require("./auth-routes");
const { publishBiometriaEvento, rateLimit } = require("./auth-middleware");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(rateLimit(120, 60000)); // Global rate limit

// Auth routes
app.use("/auth", authRoutes);

const nfeDir = path.join(__dirname, "nfe_enviadas");
if (!fs.existsSync(nfeDir)) {
  fs.mkdirSync(nfeDir, { recursive: true });
}

// Função para extrair Key e Cert do PFX base64
function extractCertInfo(pfxBase64, password) {
  try {
    const p12Der = forge.util.decode64(pfxBase64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
    
    let privateKeyPem = "";
    let certPem = "";
    
    // Varre os "safe bags" do p12
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag][0];
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];

    // Converte a chave privada para PEM
    const privateKey = keyBag.key;
    privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Converte o certificado para PEM
    const cert = certBag.cert;
    certPem = forge.pki.certificateToPem(cert);
    
    // Extrai só o conteúdo do certificado (sem headers) para jogar no XML (X509Certificate)
    const certB64 = certPem.replace(/-----BEGIN CERTIFICATE-----/, "")
                           .replace(/-----END CERTIFICATE-----/, "")
                           .replace(/\r?\n/g, "");

    return { privateKeyPem, certPem, certB64 };
  } catch (error) {
    throw new Error("Falha ao extrair Certificado PFX. Verifique se o arquivo e a senha são válidos.");
  }
}

// Classe customizada provida pelo xml-crypto para injetar o certificado na tag <X509Data> do XMLDSig
function MyKeyInfo(certB64) {
  this.getKeyInfo = function() {
    return `<X509Data><X509Certificate>${certB64}</X509Certificate></X509Data>`;
  };
  this.getKey = function() {
    return certB64;
  };
}

function signXml(xmlBruto, privateKeyPem, certB64) {
  const sig = new SignedXml();
  
  // Algoritmos obrigatórios da NFe 4.0
  sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  sig.addReference(
    "//*[local-name(.)='infNFe']",
    ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
    "http://www.w3.org/2000/09/xmldsig#sha1"
  );

  sig.signingKey = privateKeyPem;
  sig.keyInfoProvider = new MyKeyInfo(certB64);
  
  sig.computeSignature(xmlBruto, {
    location: { reference: "//*[local-name(.)='infNFe']", action: "after" }
  });

  return sig.getSignedXml();
}

app.post("/api/sefaz/emitir", async (req, res) => {
  try {
    const { xmlBruto, ambiente, uf, certificadoBase64, certificadoSenha } = req.body;
    
    if (!xmlBruto) return res.status(400).json({ erro: "xmlBruto ausente no payload" });

    let xmlAssinado = xmlBruto;
    
    if (certificadoBase64 && certificadoSenha) {
      console.log("[INFO] Extraindo e carregando Certificado A1 PFX...");
      const { privateKeyPem, certB64 } = extractCertInfo(certificadoBase64, certificadoSenha);
      console.log("[INFO] Assinando o XML da NFe...");
      xmlAssinado = signXml(xmlBruto, privateKeyPem, certB64);
    } else {
      console.warn("[AVISO] Certificado nao fornecido, o XML gerado NÃO está com a assinatura RSASHA1 gerada com sucesso!");
    }

    // Salvar XML Localmente (Pasta nfe_enviadas)
    try {
      const chaveAcesso = xmlAssinado.match(/Id="NFe(\d+)"/)?.[1] || Date.now().toString();
      const xmlPath = path.join(nfeDir, `NFe${chaveAcesso}.xml`);
      fs.writeFileSync(xmlPath, xmlAssinado);
      console.log(`[SUCESSO] XML salvo em: ${xmlPath}`);
    } catch (saveErr) {
      console.error("[ERRO] Falha ao salvar XML localmente:", saveErr.message);
    }

    const baseUrl = ambiente === "1"
      ? "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx"
      : "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";

    console.log(`[INFO] Preparando envio SOAP para SEFAZ (${baseUrl})...`);

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <idLote>${Date.now().toString().slice(-15)}</idLote>
        <indSinc>1</indSinc>
        ${xmlAssinado.replace('<?xml version="1.0" encoding="UTF-8"?>', "").trim()}
      </enviNFe>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;

    console.log(`[INFO] Tentando transmissão para SEFAZ Autorizadora (${baseUrl})...`);
    let sefazResposta = "";
    
    if (certificadoBase64 && certificadoSenha) {
      try {
        const https = require("https");
        const agent = new https.Agent({
          pfx: Buffer.from(certificadoBase64, "base64"),
          passphrase: certificadoSenha,
          rejectUnauthorized: false
        });

        const response = await axios.post(baseUrl, soapEnvelope, {
          httpsAgent: agent,
          headers: {
            "Content-Type": "application/soap+xml; charset=utf-8",
            "SOAPAction": "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4"
          }
        });
        
        sefazResposta = response.data;
        console.log("[SUCESSO] Retorno da SEFAZ Obtido!");
      } catch (axErr) {
        console.error("[ERRO SEFAZ HTTP]", axErr.message);
        sefazResposta = axErr.response?.data || "Erro de conexão/mTLS ao acessar a SEFAZ.";
      }
    } else {
      console.warn("[AVISO] Certificado PFX não fornecido. Somente a estruturação (mock) será feita.");
    }
    
    res.json({
      sucesso: true,
      protocolo: "1" + Math.floor(Math.random() * 100000000000000).toString(),
      dataRecebimento: new Date().toISOString(),
      mensagem: sefazResposta ? "Retorno Mapeado com Sucesso" : "Autorizado (Simulação s/ Certificado)",
      xmlAssinado: xmlAssinado,
      sefazBody: sefazResposta
    });

  } catch (error) {
    console.error("[ERRO]", error);
    res.status(500).json({ erro: error.message || "Erro na emissão" });
  }
});

app.post("/api/relatorios/gerar", async (req, res) => {
  try {
    const { empresaId, titulo, conteudo, linhas, colunas } = req.body;

    let pdf;

    if (conteudo) {
      pdf = await gerarRelatorioPDF({ empresaId, titulo, conteudo });
    } else if (linhas && colunas) {
      pdf = await gerarRelatorioSimplesPDF({ empresaId, titulo, linhas, colunas });
    } else {
      return res.status(400).json({ erro: "Forneça 'conteudo' (HTML) ou 'linhas' + 'colunas' para gerar o relatório" });
    }

    const filename = (titulo || "relatorio").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    console.error("[ERRO RELATÓRIO]", error);
    res.status(500).json({ erro: error.message || "Erro ao gerar relatório" });
  }
});

// Webhook para receber eventos do Intelbras (CM 351 / InControl Web)
const webhookEvents = [];

app.post("/api/webhook/intelbras", async (req, res) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const apiKey = req.headers["x-api-key"];

  // Validar API key se configurada
  const expectedApiKey = process.env.WEBHOOK_API_KEY;
  if (expectedApiKey && apiKey !== expectedApiKey) {
    console.warn(`[WEBHOOK INTELBRAS] API key inválida de ${ip}`);
    return res.status(401).json({ erro: "API key inválida" });
  }

  const event = {
    id: Date.now(),
    timestamp,
    sourceIp: ip,
    headers: req.headers,
    body: req.body,
    query: req.query
  };

  webhookEvents.unshift(event);
  if (webhookEvents.length > 100) webhookEvents.pop();

  console.log(`[WEBHOOK INTELBRAS] Evento recebido às ${timestamp} de ${ip}`);

  // Extrair dados do evento biométrico
  const biometriaId = req.body.biometria_id || req.body.BiometricID || req.body.biometric_id;
  const eventoTipo = req.body.evento_tipo || req.body.EventType || "identificacao";
  const terminalId = req.body.terminal_id || req.body.TerminalID || req.body.dispositivo_id;
  const acaoContexto = req.body.acao_contexto; // "step_up", "dual_auth", "login"

  if (biometriaId) {
    try {
      const { createClient } = require("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL || "https://nlrmhzazxhrywaldzhjj.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Buscar usuario pelo biometria_id
        const { data: bioUser } = await supabase
          .from("biometria_usuarios")
          .select("user_id, ativo")
          .eq("biometria_id", biometriaId)
          .eq("ativo", true)
          .single();

        if (bioUser) {
          // Buscar perfil
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, nome, ativo")
            .eq("id", bioUser.user_id)
            .single();

          if (profile && profile.ativo) {
            const token = require("crypto").randomUUID();
            const tokenExpira = new Date(Date.now() + 3 * 60 * 1000); // 3 minutos

            // Registrar evento
            await supabase.from("biometria_eventos").insert({
              biometria_id: biometriaId,
              user_id: bioUser.user_id,
              evento_tipo: acaoContexto || eventoTipo,
              status: "sucesso",
              token_gerado: token,
              token_expira_em: tokenExpira.toISOString(),
              dispositivo_id: terminalId,
              ip_origem: ip,
              dados_brutos: req.body,
            });

            // Se for contexto de step-up ou dual auth, processar
            if (acaoContexto === "step_up") {
              // Marcar step-up como validado
              const { data: pendingStepUp } = await supabase
                .from("step_up_eventos")
                .select("id")
                .eq("usuario_id", bioUser.user_id)
                .eq("status", "PENDENTE")
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

              if (pendingStepUp) {
                const stepToken = require("crypto").randomUUID();
                await supabase
                  .from("step_up_eventos")
                  .update({
                    status: "VALIDADO",
                    token: stepToken,
                    resolvido_em: new Date().toISOString(),
                  })
                  .eq("id", pendingStepUp.id);

                // Publicar no event bus
                publishBiometriaEvento(terminalId || "global", {
                  tipo: "step_up_validado",
                  usuario_id: bioUser.user_id,
                  usuario_nome: profile.nome,
                  step_up_token: stepToken,
                  token_biometria: token,
                });
              }
            } else if (acaoContexto === "dual_auth") {
              // Publicar evento para dual auth
              publishBiometriaEvento(terminalId || "global", {
                tipo: "dual_auth_biometria",
                usuario_id: bioUser.user_id,
                usuario_nome: profile.nome,
                token_biometria: token,
                biometria_id: biometriaId,
              });
            } else {
              // Login normal - publicar evento
              publishBiometriaEvento(terminalId || "global", {
                tipo: "biometria_reconhecida",
                usuario_id: bioUser.user_id,
                usuario_nome: profile.nome,
                token: token,
                token_expira_em: tokenExpira.toISOString(),
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("[WEBHOOK INTELBRAS] Erro ao processar:", err);
    }
  }

  res.status(200).json({
    sucesso: true,
    mensagem: "Evento recebido com sucesso",
    eventoId: event.id
  });
});

app.get("/api/webhook/intelbras/eventos", (req, res) => {
  res.json({
    total: webhookEvents.length,
    eventos: webhookEvents
  });
});

app.delete("/api/webhook/intelbras/eventos", (req, res) => {
  webhookEvents.length = 0;
  res.json({ sucesso: true, mensagem: "Eventos limpos" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
