import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileText, Search, Eye, CheckCircle2, XCircle, AlertTriangle, 
  Clock, RefreshCw, FileX, FileCheck, Printer
} from "lucide-react";

const ITEMS_PER_PAGE = 50;

export default function GestaoNFe() {
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroDirecao, setFiltroDirecao] = useState<string>("saida");
  const [empresas, setEmpresas] = useState<{ id: string; nome_fantasia: string; cnpj?: string }[]>([]);
  const [empresaCnpj, setEmpresaCnpj] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedNota, setSelectedNota] = useState<any>(null);
  const [xmlDialogOpen, setXmlDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfHtml, setPdfHtml] = useState("");

  useEffect(() => {
    loadNotas();
    loadEmpresas();
  }, []);

  const loadNotas = async () => {
    setLoading(true);
    try {
      let all: any[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("xml_fiscais")
          .select("*, dados_processados")
          .eq("tipo_documento", "NF-e")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        const rows = (data || []) as any[];
        all = [...all, ...rows];
        hasMore = rows.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      setNotas(all);
    } catch (err) {
      console.error("Erro ao carregar notas:", err);
      toast.error("Erro ao carregar notas fiscais");
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("id, nome_fantasia, cnpj, selecionada");
    if (data) {
      setEmpresas(data as any);
      // Carregar CNPJ da empresa ativa (selecionada ou primeira)
      const ativa = (data as any[]).find((e: any) => e.selecionada) || (data as any[])[0];
      if (ativa?.cnpj) setEmpresaCnpj((ativa.cnpj as string).replace(/\D/g, ""));
    }
  };

  const notasFiltradas = useMemo(() => {
    return notas.filter(nota => {
      if (filtroEmpresa !== "todas" && nota.empresa_id !== filtroEmpresa) return false;
      if (filtroTipo !== "todos" && nota.status_sefaz !== filtroTipo) return false;
      // Filtrar por direção (saída = emitente é a empresa, entrada = destinatário é a empresa)
      if (empresaCnpj && filtroDirecao !== "todos") {
        const emitCnpj = (nota.emitente_cnpj || "").replace(/\D/g, "");
        const destCnpj = (nota.destinatario_cnpj || "").replace(/\D/g, "");
        if (filtroDirecao === "saida" && emitCnpj !== empresaCnpj) return false;
        if (filtroDirecao === "entrada" && destCnpj !== empresaCnpj) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        return (
          nota.numero?.includes(q) ||
          nota.chave_acesso?.includes(q) ||
          nota.destinatario_razao?.toLowerCase().includes(q) ||
          nota.destinatario_cnpj?.includes(q) ||
          nota.emitente_razao?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notas, busca, filtroTipo, filtroEmpresa, filtroDirecao, empresaCnpj]);

  const notasAutorizadas = notasFiltradas.filter(n => n.status_sefaz === "autorizado");
  const notasCanceladas = notasFiltradas.filter(n => n.status_sefaz === "cancelado");
  const notasDenegadas = notasFiltradas.filter(n => n.status_sefaz === "denegado");
  const notasInutilizadas = notasFiltradas.filter(n => n.status_sefaz === "inutilizado");
  const notasPendentes = notasFiltradas.filter(n => !["autorizado", "cancelado", "denegado", "inutilizado"].includes(n.status_sefaz || ""));

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const map: Record<string, { color: string; icon: React.ElementType; label: string }> = {
      autorizado: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: FileCheck, label: "Autorizada" },
      cancelado: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, label: "Cancelada" },
      denegado: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle, label: "Denegada" },
      inutilizado: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: FileX, label: "Inutilizada" },
      pendente: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock, label: "Pendente" },
    };
    const s = map[status || ""] || map.pendente;
    const Icon = s.icon;
    return (
      <Badge className={s.color}>
        <Icon className="w-3 h-3 mr-1" />
        {s.label}
      </Badge>
    );
  };

  const gerarDanfeHtml = (nota: any) => {
    const status = nota.status_sefaz === "autorizado" ? "AUTORIZADA" : nota.status_sefaz === "cancelado" ? "CANCELADA" : "DENEGADA";
    const dataEmissao = nota.data_emissao ? new Date(nota.data_emissao).toLocaleDateString("pt-BR") : "";
    
    const formatDoc = (doc: string) => {
      if (!doc) return "";
      const nums = doc.replace(/\D/g, "");
      if (nums.length === 11) return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
      if (nums.length === 14) return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      return doc;
    };
    
    const fCur = (n: number | string | null | undefined) => {
      const v = typeof n === "string" ? parseFloat(n) : (n || 0);
      return v.toFixed(2).replace(".", ",");
    };
    const fQtd = (n: number | null | undefined) => n ? n.toFixed(4).replace(".", ",") : "0,0000";
    
    // Initialize data holders
    let itens: any[] = [];
    let natOp = "VENDA MERCADORIA";
    let infAdic = "";
    let protocolo = "";
    let emit: any = { nome: nota.emitente_razao || "", fantasia: nota.emitente_fantasia || "", cnpj: nota.emitente_cnpj || "", ie: "", logradouro: "", numero: "", complemento: "", bairro: "", cep: "", municipio: "", uf: nota.emitente_uf || "", fone: "" };
    let dest: any = { nome: nota.destinatario_razao || "", cnpj: nota.destinatario_cnpj || "", logradouro: "", numero: "", bairro: "", cep: "", municipio: "", uf: "", fone: "", ie: "" };
    let tot: any = { vProd: nota.valor_produtos || 0, vFrete: nota.valor_frete || 0, vSeg: 0, vDesc: nota.valor_desconto || 0, vOutro: 0, vIPI: nota.valor_ipi || 0, vBC: nota.valor_produtos || 0, vICMS: nota.valor_icms || 0, vBCST: 0, vST: 0, vII: 0, vPIS: nota.valor_pis || 0, vCOFINS: nota.valor_cofins || 0, vNF: nota.valor_total || 0 };
    let transp: any = { nome: "", modFrete: "9", cnpj: "", ie: "", uf: "", placa: "", ufVeic: "", end: "", mun: "", qVol: "", esp: "", marca: "", nVol: "", pesoB: "", pesoL: "" };
    const duplicatas: any[] = [];
    let numNota = nota.numero || "";
    let serie = nota.serie || "1";
    let chave = nota.chave_acesso || "";
    let dataSaida = "";
    let horaSaida = "";
    let tipo = "1"; // saída
    
    // Parse XML for full data
    if (nota.xml_bruto) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(nota.xml_bruto, "text/xml");
        const getTag = (parent: Element | Document, tag: string) => parent.getElementsByTagName(tag)[0]?.textContent || "";
        
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        if (ide) {
          natOp = getTag(ide, "natOp") || natOp;
          numNota = getTag(ide, "nNF") || numNota;
          serie = getTag(ide, "serie") || serie;
          tipo = getTag(ide, "tpNF") || tipo;
          const dhEmi = getTag(ide, "dhEmi");
          if (dhEmi) {
            const d = new Date(dhEmi);
            // dataSaida same as emission for basic NFes
          }
          const dhSaiEnt = getTag(ide, "dhSaiEnt");
          if (dhSaiEnt) {
            const d = new Date(dhSaiEnt);
            dataSaida = d.toLocaleDateString("pt-BR");
            horaSaida = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          }
        }

        const protNFe = xmlDoc.getElementsByTagName("protNFe")[0];
        if (protNFe) {
          const nProt = getTag(protNFe, "nProt");
          const dhRecbto = getTag(protNFe, "dhRecbto");
          if (nProt) protocolo = `${nProt} - ${dhRecbto ? new Date(dhRecbto).toLocaleDateString("pt-BR") + " " + new Date(dhRecbto).toLocaleTimeString("pt-BR") : ""}`;
        }
        
        const emitXml = xmlDoc.getElementsByTagName("emit")[0];
        if (emitXml) {
          emit.nome = getTag(emitXml, "xNome") || emit.nome;
          emit.fantasia = getTag(emitXml, "xFant") || emit.fantasia;
          emit.cnpj = getTag(emitXml, "CNPJ") || emit.cnpj;
          emit.ie = getTag(emitXml, "IE") || "";
          const enderEmit = emitXml.getElementsByTagName("enderEmit")[0];
          if (enderEmit) {
            emit.logradouro = getTag(enderEmit, "xLgr");
            emit.numero = getTag(enderEmit, "nro");
            emit.complemento = getTag(enderEmit, "xCpl");
            emit.bairro = getTag(enderEmit, "xBairro");
            emit.cep = getTag(enderEmit, "CEP");
            emit.municipio = getTag(enderEmit, "xMun");
            emit.uf = getTag(enderEmit, "UF") || emit.uf;
            emit.fone = getTag(enderEmit, "fone");
          }
        }
        
        const destXml = xmlDoc.getElementsByTagName("dest")[0];
        if (destXml) {
          dest.nome = getTag(destXml, "xNome") || dest.nome;
          dest.cnpj = getTag(destXml, "CNPJ") || getTag(destXml, "CPF") || dest.cnpj;
          dest.ie = getTag(destXml, "IE") || "";
          const enderDest = destXml.getElementsByTagName("enderDest")[0];
          if (enderDest) {
            dest.logradouro = getTag(enderDest, "xLgr");
            dest.numero = getTag(enderDest, "nro");
            dest.bairro = getTag(enderDest, "xBairro");
            dest.cep = getTag(enderDest, "CEP");
            dest.municipio = getTag(enderDest, "xMun");
            dest.uf = getTag(enderDest, "UF");
            dest.fone = getTag(enderDest, "fone");
          }
        }
        
        const totalXml = xmlDoc.getElementsByTagName("total")[0];
        if (totalXml) {
          const icmsTot = totalXml.getElementsByTagName("ICMSTot")[0];
          if (icmsTot) {
            tot.vBC = parseFloat(getTag(icmsTot, "vBC")) || tot.vBC;
            tot.vICMS = parseFloat(getTag(icmsTot, "vICMS")) || tot.vICMS;
            tot.vBCST = parseFloat(getTag(icmsTot, "vBCST")) || 0;
            tot.vST = parseFloat(getTag(icmsTot, "vST")) || 0;
            tot.vProd = parseFloat(getTag(icmsTot, "vProd")) || tot.vProd;
            tot.vFrete = parseFloat(getTag(icmsTot, "vFrete")) || tot.vFrete;
            tot.vSeg = parseFloat(getTag(icmsTot, "vSeg")) || 0;
            tot.vDesc = parseFloat(getTag(icmsTot, "vDesc")) || tot.vDesc;
            tot.vII = parseFloat(getTag(icmsTot, "vII")) || 0;
            tot.vIPI = parseFloat(getTag(icmsTot, "vIPI")) || tot.vIPI;
            tot.vPIS = parseFloat(getTag(icmsTot, "vPIS")) || tot.vPIS;
            tot.vCOFINS = parseFloat(getTag(icmsTot, "vCOFINS")) || tot.vCOFINS;
            tot.vOutro = parseFloat(getTag(icmsTot, "vOutro")) || 0;
            tot.vNF = parseFloat(getTag(icmsTot, "vNF")) || tot.vNF;
          }
        }
        
        const dets = xmlDoc.getElementsByTagName("det");
        for (let i = 0; i < dets.length; i++) {
          const det = dets[i];
          const prod = det.getElementsByTagName("prod")[0];
          const imp = det.getElementsByTagName("imposto")[0];
          let cst = ""; let aliqICMS = 0; let vBC = 0; let vICMS = 0; let vIPI = 0; let aliqIPI = 0;
          if (imp) {
            const icmsTag = imp.getElementsByTagName("ICMS")[0];
            if (icmsTag && icmsTag.children.length > 0) {
              const child = icmsTag.children[0];
              cst = getTag(child, "orig") + getTag(child, "CST") || getTag(child, "CSOSN") || "";
              vBC = parseFloat(getTag(child, "vBC")) || 0;
              vICMS = parseFloat(getTag(child, "vICMS")) || 0;
              aliqICMS = parseFloat(getTag(child, "pICMS")) || 0;
            }
            const ipiTag = imp.getElementsByTagName("IPI")[0];
            if (ipiTag) {
              vIPI = parseFloat(getTag(ipiTag, "vIPI")) || 0;
              aliqIPI = parseFloat(getTag(ipiTag, "pIPI")) || 0;
            }
          }
          if (prod) {
            itens.push({
              cProd: getTag(prod, "cProd"), xProd: getTag(prod, "xProd"),
              ncm: getTag(prod, "NCM"), cfop: getTag(prod, "CFOP"),
              uCom: getTag(prod, "uCom"),
              qCom: parseFloat(getTag(prod, "qCom")) || 0,
              vUnCom: parseFloat(getTag(prod, "vUnCom")) || 0,
              vProd: parseFloat(getTag(prod, "vProd")) || 0,
              cst, aliqICMS, vBC, vICMS, vIPI, aliqIPI,
            });
          }
        }
        
        const transpXml = xmlDoc.getElementsByTagName("transp")[0];
        if (transpXml) {
          transp.modFrete = getTag(transpXml, "modFrete") || "9";
          const transporta = transpXml.getElementsByTagName("transporta")[0];
          if (transporta) {
            transp.nome = getTag(transporta, "xNome");
            transp.cnpj = getTag(transporta, "CNPJ");
            transp.ie = getTag(transporta, "IE");
            transp.uf = getTag(transporta, "UF");
          }
          const veicTransp = transpXml.getElementsByTagName("veicTransp")[0];
          if (veicTransp) {
            transp.placa = getTag(veicTransp, "placa");
            transp.ufVeic = getTag(veicTransp, "UF");
          }
          const vol = transpXml.getElementsByTagName("vol")[0];
          if (vol) {
            transp.qVol = getTag(vol, "qVol"); transp.esp = getTag(vol, "esp");
            transp.marca = getTag(vol, "marca"); transp.nVol = getTag(vol, "nVol");
            transp.pesoB = getTag(vol, "pesoB"); transp.pesoL = getTag(vol, "pesoL");
          }
        }
        
        const infAdicXml = xmlDoc.getElementsByTagName("infAdic")[0];
        if (infAdicXml) infAdic = getTag(infAdicXml, "infCpl");

        // Parse duplicatas
        const cobrXml = xmlDoc.getElementsByTagName("cobr")[0];
        if (cobrXml) {
          const dups = cobrXml.getElementsByTagName("dup");
          for (let i = 0; i < dups.length; i++) {
            const dup = dups[i];
            duplicatas.push({
              nDup: getTag(dup, "nDup") || "",
              dVenc: getTag(dup, "dVenc") || "",
              vDup: parseFloat(getTag(dup, "vDup")) || 0,
            });
          }
        }
      } catch (e) {
        console.error("Erro ao parsear XML:", e);
      }
    }
    
    // If no items from XML, try dados_processados
    if (itens.length === 0 && nota.dados_processados?.itens) {
      itens = nota.dados_processados.itens.map((item: any) => ({
        cProd: item.codigo_produto || "", xProd: item.descricao || "",
        ncm: item.ncm || "", cfop: item.cfop || "",
        uCom: "UN", qCom: item.quantidade || 0, vUnCom: item.valor_unitario || 0,
        vProd: item.valor_total || 0, cst: item.cst_icms || "",
        aliqICMS: item.aliq_icms || 0, vBC: item.valor_total || 0,
        vICMS: item.valor_icms || 0, vIPI: 0, aliqIPI: 0,
      }));
    }

    const modFreteLabels: Record<string, string> = { "0": "0-Emit.", "1": "1-Dest.", "2": "2-Terc.", "3": "3-Própr.Rem.", "4": "4-Própr.Dest.", "9": "9-S/Frete" };
    
    const chaveFormatada = chave.replace(/(\d{4})/g, "$1 ").trim();
    
    const itemsHtml = itens.map(item => `
      <tr>
        <td style="border-right:1px dashed #000;border-left:1px solid #000;padding:2px 4px;">${item.cProd}</td>
        <td style="border-right:1px dashed #000;padding:2px 4px;">${item.xProd}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:center;">${item.ncm}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:center;">${item.cst}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:center;">${item.cfop}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:center;">${item.uCom}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fQtd(item.qCom)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.vUnCom)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.vProd)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.vBC)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.vICMS)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.vIPI)}</td>
        <td style="border-right:1px dashed #000;padding:2px;text-align:right;">${fCur(item.aliqICMS)}</td>
        <td style="border-right:1px solid #000;padding:2px;text-align:right;">${fCur(item.aliqIPI)}</td>
      </tr>
    `).join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DANFE - NFe ${numNota}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 8px; color: #000; background: #f0f0f0; display: flex; justify-content: center; padding: 10px; }
    .danfe-page { background: #fff; width: 210mm; min-height: 297mm; padding: 8mm; }
    table { width: 100%; border-collapse: collapse; }
    .cell { border: 1px solid #000; padding: 2px 4px; }
    .cell-label { font-size: 6px; color: #333; text-transform: uppercase; }
    .cell-value { font-size: 9px; font-weight: bold; }
    .section-title { font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px; text-transform: uppercase; }
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { background: #fff; padding: 0; }
      .danfe-page { box-shadow: none; padding: 5mm; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="danfe-page">
    <!-- RECIBO -->
    <table style="margin-bottom:5px;">
      <tr>
        <td colspan="2" class="cell" style="font-size:8px;">
          RECEBEMOS DE ${emit.nome || emit.fantasia} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: ${dataEmissao} VALOR TOTAL: R$ ${fCur(tot.vNF)} DESTINATÁRIO: ${dest.nome}
        </td>
        <td rowspan="2" class="cell" style="width:150px;text-align:center;font-size:16px;font-weight:bold;vertical-align:middle;">
          NF-e<br/><span style="font-size:11px;font-weight:normal;">Nº. ${numNota}</span><br/><span style="font-size:11px;font-weight:normal;">Série ${serie}</span>
        </td>
      </tr>
      <tr>
        <td class="cell" style="width:120px;">
          <div class="cell-label">DATA DE RECEBIMENTO</div><div style="height:15px;"></div>
        </td>
        <td class="cell">
          <div class="cell-label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div><div style="height:15px;"></div>
        </td>
      </tr>
    </table>

    <!-- HEADER: EMITENTE / DANFE / CHAVE -->
    <table style="margin-top:10px;">
      <tr>
        <td rowspan="3" class="cell" style="width:40%;vertical-align:top;">
          <div style="text-align:center;font-weight:bold;font-size:11px;margin-bottom:5px;text-transform:uppercase;">${emit.nome || emit.fantasia}</div>
          <div style="font-size:9px;line-height:1.2;text-align:center;">
            ${emit.logradouro}${emit.numero ? ", " + emit.numero : ""} ${emit.complemento || ""}<br/>
            ${emit.bairro} - ${emit.cep}<br/>
            ${emit.municipio} - ${emit.uf}<br/>
            ${emit.fone ? "Fone/Fax: " + emit.fone : ""}
          </div>
        </td>
        <td rowspan="3" class="cell" style="width:20%;text-align:center;vertical-align:top;">
          <div style="font-size:16px;font-weight:bold;">DANFE</div>
          <div style="font-size:8px;margin-bottom:5px;">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</div>
          <div style="text-align:left;font-size:9px;margin-left:5px;">
            0 - ENTRADA<br/>1 - SAÍDA
          </div>
          <div style="float:right;border:1px solid #000;padding:2px 6px;font-weight:bold;font-size:12px;margin-top:-15px;margin-right:5px;">
            ${tipo}
          </div>
          <div style="margin-top:10px;font-size:10px;font-weight:bold;">
            Nº. ${numNota}<br/>SÉRIE ${serie}<br/>Folha 1/1
          </div>
        </td>
        <td class="cell" style="width:40%;text-align:center;vertical-align:top;padding-bottom:0;">
          <div style="font-size:6px;text-align:left;">CHAVE DE ACESSO</div>
          <div style="text-align:center;font-size:9px;font-weight:bold;letter-spacing:0.5px;margin-top:5px;">${chaveFormatada}</div>
        </td>
      </tr>
      <tr>
        <td class="cell" style="text-align:center;">
          <div style="font-size:8px;">
            Consulta de autenticidade no portal nacional da NF-e<br/>
            www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
          </div>
        </td>
      </tr>
      <tr>
        <td class="cell" style="text-align:center;">
          <div class="cell-label" style="text-align:left;">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
          <div class="cell-value">${protocolo}</div>
        </td>
      </tr>
    </table>

    <!-- NATUREZA / PROTOCOLO -->
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell" style="width:60%;">
          <div class="cell-label">NATUREZA DA OPERAÇÃO</div>
          <div class="cell-value" style="text-transform:uppercase;">${natOp}</div>
        </td>
        <td class="cell" style="width:40%;">
          <div class="cell-label">INSCRIÇÃO ESTADUAL</div>
          <div class="cell-value">${emit.ie}</div>
        </td>
      </tr>
    </table>

    <!-- IE / CNPJ -->
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell" style="width:33%;">
          <div class="cell-label">INSCRIÇÃO ESTADUAL</div>
          <div class="cell-value">${emit.ie}</div>
        </td>
        <td class="cell" style="width:33%;">
          <div class="cell-label">INSC. ESTADUAL DO SUBST. TRIBUTÁRIO</div>
          <div class="cell-value"></div>
        </td>
        <td class="cell" style="width:34%;">
          <div class="cell-label">CNPJ</div>
          <div class="cell-value">${formatDoc(emit.cnpj)}</div>
        </td>
      </tr>
    </table>

    <!-- DESTINATÁRIO -->
    <div class="section-title">DESTINATÁRIO / REMETENTE</div>
    <table>
      <tr>
        <td class="cell" style="width:60%;">
          <div class="cell-label">NOME / RAZÃO SOCIAL</div>
          <div class="cell-value">${dest.nome}</div>
        </td>
        <td class="cell" style="width:25%;">
          <div class="cell-label">CNPJ / CPF</div>
          <div class="cell-value">${formatDoc(dest.cnpj)}</div>
        </td>
        <td class="cell" style="width:15%;">
          <div class="cell-label">DATA DA EMISSÃO</div>
          <div class="cell-value" style="text-align:center;">${dataEmissao}</div>
        </td>
      </tr>
    </table>
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell" style="width:45%;">
          <div class="cell-label">ENDEREÇO</div>
          <div class="cell-value">${dest.logradouro}${dest.numero ? ", " + dest.numero : ""}</div>
        </td>
        <td class="cell" style="width:25%;">
          <div class="cell-label">BAIRRO / DISTRITO</div>
          <div class="cell-value">${dest.bairro}</div>
        </td>
        <td class="cell" style="width:15%;">
          <div class="cell-label">CEP</div>
          <div class="cell-value" style="text-align:center;">${dest.cep}</div>
        </td>
        <td class="cell" style="width:15%;">
          <div class="cell-label">DATA DA SAÍDA</div>
          <div class="cell-value" style="text-align:center;">${dataSaida}</div>
        </td>
      </tr>
    </table>
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell" style="width:45%;">
          <div class="cell-label">MUNICÍPIO</div>
          <div class="cell-value">${dest.municipio}</div>
        </td>
        <td class="cell" style="width:5%;">
          <div class="cell-label">UF</div>
          <div class="cell-value" style="text-align:center;">${dest.uf}</div>
        </td>
        <td class="cell" style="width:20%;">
          <div class="cell-label">FONE / FAX</div>
          <div class="cell-value">${dest.fone}</div>
        </td>
        <td class="cell" style="width:15%;">
          <div class="cell-label">INSCRIÇÃO ESTADUAL</div>
          <div class="cell-value">${dest.ie}</div>
        </td>
        <td class="cell" style="width:15%;">
          <div class="cell-label">HORA DA SAÍDA</div>
          <div class="cell-value" style="text-align:center;">${horaSaida}</div>
        </td>
      </tr>
    </table>

    <!-- CÁLCULO DO IMPOSTO -->
    <div class="section-title">CÁLCULO DO IMPOSTO</div>
    <table>
      <tr>
        <td class="cell"><div class="cell-label">BASE DE CÁLCULO DO ICMS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vBC)}</div></td>
        <td class="cell"><div class="cell-label">VALOR DO ICMS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vICMS)}</div></td>
        <td class="cell"><div class="cell-label">BASE DE CÁLC. ICMS S.T.</div><div class="cell-value" style="text-align:right;">${fCur(tot.vBCST)}</div></td>
        <td class="cell"><div class="cell-label">VALOR DO ICMS SUBST.</div><div class="cell-value" style="text-align:right;">${fCur(tot.vST)}</div></td>
        <td class="cell"><div class="cell-label">VALOR IMP. IMPORT.</div><div class="cell-value" style="text-align:right;">${fCur(tot.vII)}</div></td>
        <td class="cell"><div class="cell-label">VALOR DO PIS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vPIS)}</div></td>
        <td class="cell"><div class="cell-label">VALOR TOTAL DOS PRODUTOS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vProd)}</div></td>
      </tr>
    </table>
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell"><div class="cell-label">VALOR DO FRETE</div><div class="cell-value" style="text-align:right;">${fCur(tot.vFrete)}</div></td>
        <td class="cell"><div class="cell-label">VALOR DO SEGURO</div><div class="cell-value" style="text-align:right;">${fCur(tot.vSeg)}</div></td>
        <td class="cell"><div class="cell-label">DESCONTO</div><div class="cell-value" style="text-align:right;">${fCur(tot.vDesc)}</div></td>
        <td class="cell"><div class="cell-label">OUTRAS DESPESAS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vOutro)}</div></td>
        <td class="cell"><div class="cell-label">VALOR TOTAL DO IPI</div><div class="cell-value" style="text-align:right;">${fCur(tot.vIPI)}</div></td>
        <td class="cell"><div class="cell-label">VALOR DA COFINS</div><div class="cell-value" style="text-align:right;">${fCur(tot.vCOFINS)}</div></td>
        <td class="cell"><div class="cell-label">VALOR TOTAL DA NOTA</div><div class="cell-value" style="text-align:right;font-size:11px;">${fCur(tot.vNF)}</div></td>
      </tr>
    </table>

    <!-- FATURA / DUPLICATAS -->
    ${duplicatas.length > 0 ? `
    <div class="section-title">FATURA / DUPLICATAS</div>
    <table>
      <thead>
        <tr>
          <th class="cell" style="padding:2px;">NÚMERO</th>
          <th class="cell" style="padding:2px;">DATA DE VENCIMENTO</th>
          <th class="cell" style="padding:2px;">VALOR</th>
        </tr>
      </thead>
      <tbody>
        ${duplicatas.map(dup => `
        <tr>
          <td class="cell" style="text-align:center;">${dup.nDup}</td>
          <td class="cell" style="text-align:center;">${dup.dVenc ? new Date(dup.dVenc).toLocaleDateString("pt-BR") : ""}</td>
          <td class="cell" style="text-align:right;">${fCur(dup.vDup)}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
    ` : ""}

    <!-- TRANSPORTADOR -->
    <div class="section-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
    <table>
      <tr>
        <td class="cell" style="width:40%;"><div class="cell-label">NOME / RAZÃO SOCIAL</div><div class="cell-value">${transp.nome || "—"}</div></td>
        <td class="cell" style="width:15%;"><div class="cell-label">FRETE POR CONTA</div><div class="cell-value" style="text-align:center;">${modFreteLabels[transp.modFrete] || transp.modFrete}</div></td>
        <td class="cell" style="width:15%;"><div class="cell-label">CÓDIGO ANTT</div><div class="cell-value" style="text-align:center;"></div></td>
        <td class="cell" style="width:10%;"><div class="cell-label">PLACA DO VEÍCULO</div><div class="cell-value" style="text-align:center;">${transp.placa || ""}</div></td>
        <td class="cell" style="width:5%;"><div class="cell-label">UF</div><div class="cell-value" style="text-align:center;">${transp.ufVeic || transp.uf}</div></td>
        <td class="cell" style="width:15%;"><div class="cell-label">CNPJ / CPF</div><div class="cell-value" style="text-align:center;">${formatDoc(transp.cnpj)}</div></td>
      </tr>
    </table>
    <table style="margin-top:-1px;">
      <tr>
        <td class="cell"><div class="cell-label">QUANTIDADE</div><div class="cell-value" style="text-align:center;">${transp.qVol || "—"}</div></td>
        <td class="cell"><div class="cell-label">ESPÉCIE</div><div class="cell-value" style="text-align:center;">${transp.esp || "—"}</div></td>
        <td class="cell"><div class="cell-label">MARCA</div><div class="cell-value" style="text-align:center;">${transp.marca || ""}</div></td>
        <td class="cell"><div class="cell-label">NUMERAÇÃO</div><div class="cell-value" style="text-align:center;">${transp.nVol || ""}</div></td>
        <td class="cell"><div class="cell-label">PESO BRUTO</div><div class="cell-value" style="text-align:center;">${transp.pesoB || "0,000"}</div></td>
        <td class="cell"><div class="cell-label">PESO LÍQUIDO</div><div class="cell-value" style="text-align:center;">${transp.pesoL || "0,000"}</div></td>
      </tr>
    </table>

    <!-- PRODUTOS -->
    <div class="section-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
    <table style="font-size:7px;">
      <thead>
        <tr>
          <th class="cell" style="padding:2px;">CÓDIGO<br/>PRODUTO</th>
          <th class="cell" style="padding:2px;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
          <th class="cell" style="padding:2px;">NCM/SH</th>
          <th class="cell" style="padding:2px;">CST</th>
          <th class="cell" style="padding:2px;">CFOP</th>
          <th class="cell" style="padding:2px;">UN</th>
          <th class="cell" style="padding:2px;">QUANT</th>
          <th class="cell" style="padding:2px;">VALOR<br/>UNIT</th>
          <th class="cell" style="padding:2px;">VALOR<br/>TOTAL</th>
          <th class="cell" style="padding:2px;">B.CALC<br/>ICMS</th>
          <th class="cell" style="padding:2px;">VALOR<br/>ICMS</th>
          <th class="cell" style="padding:2px;">VALOR<br/>IPI</th>
          <th class="cell" style="padding:2px;">ALIQ.<br/>ICMS</th>
          <th class="cell" style="padding:2px;">ALIQ.<br/>IPI</th>
        </tr>
      </thead>
      <tbody style="border-bottom:1px solid #000;">
        ${itemsHtml || '<tr><td colspan="14" style="text-align:center;padding:10px;">Nenhum item registrado</td></tr>'}
      </tbody>
    </table>

    <!-- DADOS ADICIONAIS -->
    <div class="section-title" style="margin-top:5px;">DADOS ADICIONAIS</div>
    <table>
      <tr>
        <td class="cell" style="width:70%;vertical-align:top;height:80px;">
          <div class="cell-label">INFORMAÇÕES COMPLEMENTARES</div>
          <div style="font-size:8px;white-space:pre-wrap;">${infAdic || ""}</div>
        </td>
        <td class="cell" style="width:30%;vertical-align:top;">
          <div class="cell-label">RESERVADO AO FISCO</div>
        </td>
      </tr>
    </table>

    <div style="text-align:center;font-size:7px;margin-top:10px;color:#666;">
      Impresso por NexusERP - ${new Date().toLocaleString("pt-BR")}
    </div>
  </div>
</body>
</html>`;
  };

  const renderTabela = (notasList: any[], title: string, emptyMessage: string) => {
    const totalPages = Math.ceil(notasList.length / ITEMS_PER_PAGE);
    const paginadas = notasList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {title} ({notasList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-md overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Número</TableHead>
                  <TableHead className="w-20">Série</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginadas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginadas.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-mono font-semibold">{nota.numero}</TableCell>
                      <TableCell className="font-mono">{nota.serie}</TableCell>
                      <TableCell>{formatDate(nota.data_emissao)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{nota.destinatario_razao || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{nota.destinatario_cnpj || "—"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(nota.valor_total)}</TableCell>
                      <TableCell>{getStatusBadge(nota.status_sefaz)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedNota(nota); setPdfHtml(gerarDanfeHtml(nota)); setPdfDialogOpen(true); }} title="Visualizar DANFE">
                            <Printer size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedNota(nota); setXmlDialogOpen(true); }} title="Detalhes">
                            <Eye size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({notasList.length} itens)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Gestão de NFe"
        description="Consulte e gerencie suas Notas Fiscais Eletrônicas"
        actions={
          <Button variant="outline" size="sm" onClick={loadNotas} disabled={loading}>
            <RefreshCw size={16} className={`mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="cursor-pointer hover:ring-2 ring-primary/30" onClick={() => setFiltroTipo("todos")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{notasFiltradas.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-emerald-500/30" onClick={() => setFiltroTipo("autorizado")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{notasAutorizadas.length}</p>
            <p className="text-xs text-muted-foreground">Autorizadas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-red-500/30" onClick={() => setFiltroTipo("cancelado")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{notasCanceladas.length}</p>
            <p className="text-xs text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-orange-500/30" onClick={() => setFiltroTipo("denegado")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{notasDenegadas.length}</p>
            <p className="text-xs text-muted-foreground">Denegadas</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-amber-500/30" onClick={() => setFiltroTipo("pendente")}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{notasPendentes.length}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, chave, cliente ou CNPJ..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filtroEmpresa} onValueChange={v => { setFiltroEmpresa(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as empresas</SelectItem>
                {empresas.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.nome_fantasia || emp.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroDirecao} onValueChange={v => { setFiltroDirecao(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saida">📤 Saída</SelectItem>
                <SelectItem value="entrada">📥 Entrada</SelectItem>
                <SelectItem value="todos">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="todas" onValueChange={(v) => { setFiltroTipo(v === "todas" ? "todos" : v); setPage(1); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="autorizado">Autorizadas</TabsTrigger>
          <TabsTrigger value="cancelado">Canceladas</TabsTrigger>
          <TabsTrigger value="denegado">Denegadas</TabsTrigger>
          <TabsTrigger value="inutilizado">Inutilizadas</TabsTrigger>
          <TabsTrigger value="pendente">Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          {renderTabela(notasFiltradas, "Todas as Notas", "Nenhuma nota encontrada")}
        </TabsContent>
        <TabsContent value="autorizado">
          {renderTabela(notasAutorizadas, "Notas Autorizadas", "Nenhuma nota autorizada")}
        </TabsContent>
        <TabsContent value="cancelado">
          {renderTabela(notasCanceladas, "Notas Canceladas", "Nenhuma nota cancelada")}
        </TabsContent>
        <TabsContent value="denegado">
          {renderTabela(notasDenegadas, "Notas Denegadas", "Nenhuma nota denegada")}
        </TabsContent>
        <TabsContent value="inutilizado">
          {renderTabela(notasInutilizadas, "Notas Inutilizadas", "Nenhuma nota inutilizada")}
        </TabsContent>
        <TabsContent value="pendente">
          {renderTabela(notasPendentes, "Notas Pendentes", "Nenhuma nota pendente")}
        </TabsContent>
      </Tabs>

      <Dialog open={xmlDialogOpen} onOpenChange={setXmlDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da NFe {selectedNota?.numero}</DialogTitle>
          </DialogHeader>
          {selectedNota && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Chave de Acesso</p>
                  <p className="font-mono text-xs break-all">{selectedNota.chave_acesso}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status SEFAZ</p>
                  {getStatusBadge(selectedNota.status_sefaz)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Série / Número</p>
                  <p className="font-semibold">{selectedNota.serie} / {selectedNota.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Data Emissão</p>
                  <p>{formatDate(selectedNota.data_emissao)}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Destinatário</p>
                <p className="font-semibold">{selectedNota.destinatario_razao || "—"}</p>
                <p className="text-sm">{selectedNota.destinatario_cnpj || "—"}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Produtos</p>
                  <p className="font-mono">{formatCurrency(selectedNota.valor_produtos)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor ICMS</p>
                  <p className="font-mono">{formatCurrency(selectedNota.valor_icms)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-mono font-bold">{formatCurrency(selectedNota.valor_total)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        htmlContent={pdfHtml}
        title={`DANFE - NFe ${selectedNota?.numero}`}
      />
    </div>
  );
}
