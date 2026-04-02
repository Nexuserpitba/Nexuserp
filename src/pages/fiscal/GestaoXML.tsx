import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseXmlFiscal, validateChaveAcesso } from "@/lib/xmlFiscalParser";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  FileText, Upload, Search, Download, RefreshCw, Trash2, Eye, FileInput,
  CheckCircle2, AlertTriangle, XCircle, Clock, BarChart3, Settings, ScrollText,
  Package, FileCode, ArrowRight, Building2, ShieldCheck, ShieldAlert, ShieldX,
  Archive, ClipboardCheck, CalendarIcon, X
} from "lucide-react";

// ── Types ──
interface XmlFiscal {
  id: string;
  empresa_id: string | null;
  chave_acesso: string;
  numero: string;
  serie: string;
  tipo_documento: string;
  status_sefaz: string;
  status_processamento: string;
  data_emissao: string | null;
  data_importacao: string | null;
  emitente_cnpj: string;
  emitente_razao: string;
  emitente_fantasia: string;
  emitente_uf: string;
  destinatario_cnpj: string;
  destinatario_razao: string;
  valor_total: number;
  valor_produtos: number;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  valor_frete: number;
  valor_desconto: number;
  xml_bruto: string | null;
  dados_processados: any;
  manifestacao: string;
  observacoes: string;
  erro_detalhe: string;
  tentativas_importacao: number;
  created_at: string;
}

interface XmlFiscalLog { id: string; tipo: string; acao: string; detalhe: string; usuario_nome: string; created_at: string; }
interface XmlFiscalRegra { id: string; fornecedor_cnpj: string; fornecedor_nome: string; cfop_padrao: string; centro_custo: string; auto_importar: boolean; criar_produto_auto: boolean; ativo: boolean; observacoes: string; }

interface Divergencia {
  item: string;
  campo: string;
  valorXml: string;
  valorErp: string;
  tipo: "preco" | "imposto" | "quantidade" | "ncm" | "outro";
}

// ── Helpers ──
const statusBadge = (status: string) => {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    importado: { cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2, label: "Importado" },
    pendente: { cls: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock, label: "Pendente" },
    erro: { cls: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle, label: "Erro" },
    conferencia: { cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: ClipboardCheck, label: "Conferência" },
  };
  const s = map[status];
  if (!s) return <Badge variant="outline">{status}</Badge>;
  const Icon = s.icon;
  return <Badge className={s.cls}><Icon className="w-3 h-3 mr-1" />{s.label}</Badge>;
};

const statusSefazBadge = (status: string) => {
  const map: Record<string, string> = { autorizado: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", cancelado: "bg-red-500/15 text-red-500 border-red-500/30", denegado: "bg-orange-500/15 text-orange-500 border-orange-500/30" };
  return <Badge className={map[status] || ""} variant={map[status] ? undefined : "outline"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
};

const manifestacaoBadge = (m: string) => {
  const map: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
    ciencia: { cls: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Eye, label: "Ciência" },
    confirmacao: { cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: ShieldCheck, label: "Confirmada" },
    desconhecimento: { cls: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: ShieldAlert, label: "Desconhecida" },
    nao_realizada: { cls: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldX, label: "Op. não Realizada" },
  };
  const s = map[m];
  if (!s) return <Badge variant="secondary" className="text-[10px]">Não manifestado</Badge>;
  const Icon = s.icon;
  return <Badge className={s.cls}><Icon className="w-3 h-3 mr-1" />{s.label}</Badge>;
};

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCnpj = (v: string) => v?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") || "";

// ══════════════════════════════════════════════
export default function GestaoXML() {
  const [xmlDocs, setXmlDocs] = useState<XmlFiscal[]>([]);
  const [logs, setLogs] = useState<XmlFiscalLog[]>([]);
  const [regras, setRegras] = useState<XmlFiscalRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filters
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | undefined>(undefined);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | undefined>(undefined);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showDetalhe, setShowDetalhe] = useState(false);
  const [showXmlBruto, setShowXmlBruto] = useState(false);
  const [showRegraModal, setShowRegraModal] = useState(false);
  const [showConferencia, setShowConferencia] = useState(false);
  const [showManifestacao, setShowManifestacao] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<XmlFiscal | null>(null);
  const [selectedItens, setSelectedItens] = useState<any[]>([]);

  // Conference
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  const [conferenciaLoading, setConferenciaLoading] = useState(false);

  // Manifestação
  const [manifestacaoTipo, setManifestacaoTipo] = useState("");
  const [manifestacaoJustificativa, setManifestacaoJustificativa] = useState("");

  // Bulk selection for ZIP export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportingZip, setExportingZip] = useState(false);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [chaveManual, setChaveManual] = useState("");

  // Regra form
  const [regraForm, setRegraForm] = useState<Partial<XmlFiscalRegra>>({
    fornecedor_cnpj: "", fornecedor_nome: "", cfop_padrao: "", centro_custo: "",
    auto_importar: false, criar_produto_auto: false, ativo: true, observacoes: ""
  });

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, logsRes, regrasRes] = await Promise.all([
        (supabase.from("xml_fiscais" as any) as any).select("*").order("created_at", { ascending: false }).limit(500),
        (supabase.from("xml_fiscal_logs" as any) as any).select("*").order("created_at", { ascending: false }).limit(200),
        (supabase.from("xml_fiscal_regras" as any) as any).select("*").order("created_at", { ascending: false }),
      ]);
      if (docsRes.data) setXmlDocs(docsRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (regrasRes.data) setRegras(regrasRes.data);
    } catch (err) {
      console.error("Error fetching XML data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addLog = async (acao: string, detalhe: string, tipo = "info", xmlId?: string) => {
    try {
      await (supabase.from("xml_fiscal_logs" as any) as any).insert({ xml_fiscal_id: xmlId || null, tipo, acao, detalhe, usuario_nome: "Sistema" });
    } catch { /* erro ignorado */ }
  };

  // ── Upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    let imported = 0, errors = 0, duplicates = 0;

    for (const file of Array.from(files)) {
      try {
        const xmlText = await file.text();
        const parsed = parseXmlFiscal(xmlText);
        if (!parsed.chaveAcesso) { errors++; toast.error(`${file.name}: Chave não encontrada`); continue; }

        const { data: existing } = await (supabase.from("xml_fiscais" as any) as any).select("id").eq("chave_acesso", parsed.chaveAcesso).maybeSingle();
        if (existing) { duplicates++; continue; }

        const { data: insertedDoc, error: insertErr } = await (supabase.from("xml_fiscais" as any) as any)
          .insert({
            chave_acesso: parsed.chaveAcesso, numero: parsed.numero, serie: parsed.serie,
            tipo_documento: parsed.tipoDocumento, status_sefaz: parsed.statusSefaz, status_processamento: "pendente",
            data_emissao: parsed.dataEmissao ? new Date(parsed.dataEmissao).toISOString() : null,
            emitente_cnpj: parsed.emitenteCnpj, emitente_razao: parsed.emitenteRazao,
            emitente_fantasia: parsed.emitenteFantasia, emitente_uf: parsed.emitenteUf,
            destinatario_cnpj: parsed.destinatarioCnpj, destinatario_razao: parsed.destinatarioRazao,
            valor_total: parsed.valorTotal, valor_produtos: parsed.valorProdutos,
            valor_icms: parsed.valorIcms, valor_ipi: parsed.valorIpi, valor_pis: parsed.valorPis,
            valor_cofins: parsed.valorCofins, valor_frete: parsed.valorFrete, valor_desconto: parsed.valorDesconto,
            xml_bruto: parsed.xmlBruto, dados_processados: { itensCount: parsed.itens.length },
          }).select().single();

        if (insertErr) throw insertErr;

        if (parsed.itens.length > 0 && insertedDoc) {
          await (supabase.from("xml_fiscal_itens" as any) as any).insert(
            parsed.itens.map(item => ({
              xml_fiscal_id: insertedDoc.id, numero_item: item.numeroItem, codigo_produto: item.codigoProduto,
              descricao: item.descricao, ncm: item.ncm, cest: item.cest, cfop: item.cfop,
              unidade: item.unidade, quantidade: item.quantidade, valor_unitario: item.valorUnitario,
              valor_total: item.valorTotal, valor_desconto: item.valorDesconto,
              cst_icms: item.cstIcms, aliq_icms: item.aliqIcms, valor_icms: item.valorIcms,
              cst_ipi: item.cstIpi, aliq_ipi: item.aliqIpi, valor_ipi: item.valorIpi,
              cst_pis: item.cstPis, aliq_pis: item.aliqPis, valor_pis: item.valorPis,
              cst_cofins: item.cstCofins, aliq_cofins: item.aliqCofins, valor_cofins: item.valorCofins,
            }))
          );
        }
        await addLog("upload_xml", `XML importado: NF ${parsed.numero} - ${parsed.emitenteRazao}`, "sucesso", insertedDoc?.id);
        imported++;
      } catch (err: any) {
        errors++;
        await addLog("erro_upload", `Erro ao importar ${file.name}: ${err.message}`, "erro");
        toast.error(`Erro em ${file.name}: ${err.message}`);
      }
    }
    setUploading(false);
    setShowUpload(false);
    const msgs: string[] = [];
    if (imported) msgs.push(`${imported} importado(s)`);
    if (duplicates) msgs.push(`${duplicates} duplicado(s)`);
    if (errors) msgs.push(`${errors} erro(s)`);
    toast.success(`Upload concluído: ${msgs.join(", ")}`);
    fetchData();
    e.target.value = "";
  };

  // ── Desdobramento (cost breakdown) ──
  const [showDesdobramento, setShowDesdobramento] = useState(false);
  const [desdobramentoItens, setDesdobramentoItens] = useState<any[]>([]);
  const [desdobramentoRateios, setDesdobramentoRateios] = useState<{ frete: number; seguro: number; outrasDespesas: number }>({ frete: 0, seguro: 0, outrasDespesas: 0 });
  const [importResult, setImportResult] = useState<{ fornecedorCriado: boolean; produtosCriados: number; produtosExistentes: number } | null>(null);

  // ── View detail ──
  const handleViewDetail = async (doc: XmlFiscal) => {
    setSelectedDoc(doc);
    const { data } = await (supabase.from("xml_fiscal_itens" as any) as any).select("*").eq("xml_fiscal_id", doc.id).order("numero_item");
    setSelectedItens(data || []);
    setShowDetalhe(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este XML?")) return;
    await (supabase.from("xml_fiscais" as any) as any).delete().eq("id", id);
    toast.success("XML excluído");
    fetchData();
  };

  // ── Conference / Divergence detection ──
  const handleConferencia = async (doc: XmlFiscal) => {
    setSelectedDoc(doc);
    setConferenciaLoading(true);
    setShowConferencia(true);
    setDivergencias([]);

    // Fetch items for this XML
    const { data: itens } = await (supabase.from("xml_fiscal_itens" as any) as any).select("*").eq("xml_fiscal_id", doc.id).order("numero_item");
    setSelectedItens(itens || []);

    // Compare each item against ERP products
    const divs: Divergencia[] = [];
    if (itens) {
      for (const item of itens) {
        // Try to find matching product in ERP by NCM or description
        const { data: produtosErp } = await (supabase.from("produtos" as any) as any)
          .select("descricao, ncm, venda, aliq_icms, aliq_pis, aliq_cofins, aliq_ipi")
          .or(`ncm.eq.${item.ncm},descricao.ilike.%${(item.descricao as string)?.substring(0, 20)}%`)
          .limit(1);

        if (produtosErp && produtosErp.length > 0) {
          const erp = produtosErp[0];
          // Price divergence
          if (erp.venda && Math.abs(Number(item.valor_unitario) - Number(erp.venda)) > 0.01) {
            divs.push({ item: item.descricao, campo: "Preço Unitário", valorXml: formatCurrency(Number(item.valor_unitario)), valorErp: formatCurrency(Number(erp.venda)), tipo: "preco" });
          }
          // ICMS divergence
          if (erp.aliq_icms != null && Math.abs(Number(item.aliq_icms) - Number(erp.aliq_icms)) > 0.01) {
            divs.push({ item: item.descricao, campo: "Alíq. ICMS", valorXml: `${Number(item.aliq_icms).toFixed(2)}%`, valorErp: `${Number(erp.aliq_icms).toFixed(2)}%`, tipo: "imposto" });
          }
          // PIS divergence
          if (erp.aliq_pis != null && Math.abs(Number(item.aliq_pis) - Number(erp.aliq_pis)) > 0.01) {
            divs.push({ item: item.descricao, campo: "Alíq. PIS", valorXml: `${Number(item.aliq_pis).toFixed(2)}%`, valorErp: `${Number(erp.aliq_pis).toFixed(2)}%`, tipo: "imposto" });
          }
          // COFINS divergence
          if (erp.aliq_cofins != null && Math.abs(Number(item.aliq_cofins) - Number(erp.aliq_cofins)) > 0.01) {
            divs.push({ item: item.descricao, campo: "Alíq. COFINS", valorXml: `${Number(item.aliq_cofins).toFixed(2)}%`, valorErp: `${Number(erp.aliq_cofins).toFixed(2)}%`, tipo: "imposto" });
          }
          // NCM divergence
          if (erp.ncm && item.ncm && erp.ncm.replace(/\./g, "") !== item.ncm.replace(/\./g, "")) {
            divs.push({ item: item.descricao, campo: "NCM", valorXml: item.ncm, valorErp: erp.ncm, tipo: "ncm" });
          }
        }
      }
    }
    setDivergencias(divs);
    setConferenciaLoading(false);
  };

  // ── Open desdobramento after conference ──
  const handleAbrirDesdobramento = async () => {
    if (!selectedDoc) return;
    // Prepare desdobramento items with cost calculation fields
    const itensComCusto = selectedItens.map((item: any) => {
      const custoUnitario = Number(item.valor_unitario) || 0;
      const qtd = Number(item.quantidade) || 1;
      const totalItem = Number(item.valor_total) || 0;
      return {
        ...item,
        custo_unitario: custoUnitario,
        custo_total: totalItem,
        margem_bruta: 0,
        margem_liquida: 0,
        preco_venda_sugerido: 0,
        rateio_frete: 0,
        rateio_outras: 0,
        custo_final: custoUnitario,
      };
    });
    setDesdobramentoItens(itensComCusto);
    setDesdobramentoRateios({
      frete: selectedDoc.valor_frete || 0,
      seguro: 0,
      outrasDespesas: 0,
    });
    setShowConferencia(false);
    setShowDesdobramento(true);
    recalcularDesdobramento(itensComCusto, selectedDoc.valor_frete || 0, 0, 0);
  };

  const recalcularDesdobramento = (itens: any[], frete: number, seguro: number, outras: number) => {
    const totalProdutos = itens.reduce((s: number, it: any) => s + (Number(it.valor_total) || 0), 0);
    if (totalProdutos === 0) return;
    const totalRateio = frete + seguro + outras;
    const atualizados = itens.map((item: any) => {
      const peso = (Number(item.valor_total) || 0) / totalProdutos;
      const rateioItem = totalRateio * peso;
      const custoFinal = (Number(item.valor_unitario) || 0) + (rateioItem / (Number(item.quantidade) || 1));
      const margemBruta = item.margem_bruta || 0;
      const margemLiquida = item.margem_liquida || 0;
      const precoVenda = margemBruta > 0 ? custoFinal / (1 - margemBruta / 100) : custoFinal;
      return {
        ...item,
        rateio_frete: rateioItem,
        custo_final: custoFinal,
        preco_venda_sugerido: precoVenda,
        margem_bruta: margemBruta,
        margem_liquida: margemLiquida,
      };
    });
    setDesdobramentoItens(atualizados);
  };

  const handleMargemChange = (index: number, campo: string, valor: number) => {
    setDesdobramentoItens(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [campo]: valor };
      if (campo === "margem_bruta") {
        const custoFinal = updated[index].custo_final || 0;
        updated[index].preco_venda_sugerido = valor > 0 ? custoFinal / (1 - valor / 100) : custoFinal;
      }
      if (campo === "margem_liquida") {
        // Margem líquida é informativa, calculada considerando impostos
      }
      return updated;
    });
  };

  const handleConfirmarImportacao = async () => {
    if (!selectedDoc) return;
    try {
      // 1. Check/create supplier (fornecedor)
      let fornecedorCriado = false;
      const cnpjFornecedor = selectedDoc.emitente_cnpj?.replace(/\D/g, "");
      if (cnpjFornecedor) {
        const { data: existingFornecedor } = await (supabase.from("pessoas" as any) as any)
          .select("id")
          .eq("cpf_cnpj", cnpjFornecedor)
          .maybeSingle();

        if (!existingFornecedor) {
          await (supabase.from("pessoas" as any) as any).insert({
            nome: selectedDoc.emitente_razao || "FORNECEDOR IMPORTADO",
            razao_social: selectedDoc.emitente_razao || "",
            nome_fantasia: selectedDoc.emitente_fantasia || "",
            cpf_cnpj: cnpjFornecedor,
            tipo: "Fornecedor",
            uf: selectedDoc.emitente_uf || "",
            status: "Ativo",
            observacao: `Cadastro automático via importação XML - NF ${selectedDoc.numero}`,
          });
          fornecedorCriado = true;
          await addLog("auto_cadastro", `Fornecedor criado automaticamente: ${selectedDoc.emitente_razao} (${cnpjFornecedor})`, "sucesso", selectedDoc.id);
        }
      }

      // 2. Check/create products
      let produtosCriados = 0;
      let produtosExistentes = 0;
      const itensParaImportar = desdobramentoItens.length > 0 ? desdobramentoItens : selectedItens;

      for (const item of itensParaImportar) {
        const descricaoItem = item.descricao || "";
        const ncmItem = (item.ncm || "").replace(/\D/g, "");

        // Try to find by NCM + similar description
        const { data: prodExistente } = await (supabase.from("produtos" as any) as any)
          .select("id")
          .or(`ncm.eq.${ncmItem},descricao.ilike.%${descricaoItem.substring(0, 25)}%`)
          .limit(1)
          .maybeSingle();

        if (prodExistente) {
          produtosExistentes++;
          // Update cost if desdobramento was done
          if (item.custo_final) {
            await (supabase.from("produtos" as any) as any)
              .update({
                custo_aquisicao: item.custo_final,
                margem_bruta: item.margem_bruta || 0,
                margem_liquida: item.margem_liquida || 0,
                venda: item.preco_venda_sugerido || 0,
                rateio: item.rateio_frete || 0,
              })
              .eq("id", prodExistente.id);
          }
          // Link item to ERP product
          await (supabase.from("xml_fiscal_itens" as any) as any)
            .update({ produto_erp_id: prodExistente.id, status_mapeamento: "mapeado" })
            .eq("id", item.id);
        } else {
          // Create new product
          const { data: novoProd } = await (supabase.from("produtos" as any) as any)
            .insert({
              descricao: descricaoItem,
              ncm: ncmItem,
              cest: item.cest || "",
              unidade: item.unidade || "UN",
              custo_aquisicao: item.custo_final || Number(item.valor_unitario) || 0,
              venda: item.preco_venda_sugerido || Number(item.valor_unitario) || 0,
              margem_bruta: item.margem_bruta || 0,
              margem_liquida: item.margem_liquida || 0,
              rateio: item.rateio_frete || 0,
              cst_icms: item.cst_icms || "",
              aliq_icms: Number(item.aliq_icms) || 0,
              aliq_pis: Number(item.aliq_pis) || 0,
              aliq_cofins: Number(item.aliq_cofins) || 0,
              aliq_ipi: Number(item.aliq_ipi) || 0,
              fornecedor: selectedDoc.emitente_razao || "",
              observacao: `Produto criado via importação XML - NF ${selectedDoc.numero}`,
              ativo: true,
              estoque: Number(item.quantidade) || 0,
              estoque_minimo: Math.max(1, Math.round((Number(item.quantidade) || 1) * 0.2)),
              estoque_maximo: Math.round((Number(item.quantidade) || 1) * 3),
            })
            .select("id")
            .single();

          if (novoProd) {
            await (supabase.from("xml_fiscal_itens" as any) as any)
              .update({ produto_erp_id: novoProd.id, status_mapeamento: "mapeado" })
              .eq("id", item.id);
          }
          produtosCriados++;
        }
      }

      // 3. Mark XML as imported
      await (supabase.from("xml_fiscais" as any) as any)
        .update({ status_processamento: "importado", data_importacao: new Date().toISOString() })
        .eq("id", selectedDoc.id);

      // Save divergences to items
      if (divergencias.length > 0) {
        for (const item of selectedItens) {
          const itemDivs = divergencias.filter(d => d.item === item.descricao);
          if (itemDivs.length > 0) {
            await (supabase.from("xml_fiscal_itens" as any) as any)
              .update({ divergencias: itemDivs })
              .eq("id", item.id);
          }
        }
      }

      await addLog("importacao_erp", `NF ${selectedDoc.numero} importada | Fornecedor: ${fornecedorCriado ? "CRIADO" : "existente"} | Produtos: ${produtosCriados} criados, ${produtosExistentes} existentes | ${divergencias.length} divergências`, "sucesso", selectedDoc.id);

      setImportResult({ fornecedorCriado, produtosCriados, produtosExistentes });
      toast.success(`NF ${selectedDoc.numero} importada! ${fornecedorCriado ? "Fornecedor criado. " : ""}${produtosCriados > 0 ? `${produtosCriados} produto(s) criado(s).` : ""}`);
      setShowDesdobramento(false);
      setShowConferencia(false);
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao importar: " + err.message);
      await addLog("erro_importacao", `Erro ao importar NF ${selectedDoc.numero}: ${err.message}`, "erro", selectedDoc.id);
    }
  };

  // ── Manifestação ──
  const handleOpenManifestacao = (doc: XmlFiscal) => {
    setSelectedDoc(doc);
    setManifestacaoTipo(doc.manifestacao || "");
    setManifestacaoJustificativa("");
    setShowManifestacao(true);
  };

  const handleSalvarManifestacao = async () => {
    if (!selectedDoc || !manifestacaoTipo) { toast.error("Selecione o tipo de manifestação"); return; }
    try {
      await (supabase.from("xml_fiscais" as any) as any)
        .update({ manifestacao: manifestacaoTipo })
        .eq("id", selectedDoc.id);
      await addLog("manifestacao", `NF ${selectedDoc.numero}: ${manifestacaoTipo}${manifestacaoJustificativa ? ` - ${manifestacaoJustificativa}` : ""}`, "sucesso", selectedDoc.id);
      toast.success("Manifestação registrada!");
      setShowManifestacao(false);
      fetchData();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  // ── Reprocess ──
  const handleReprocessar = async (doc: XmlFiscal) => {
    try {
      if (!doc.xml_bruto) { toast.error("XML bruto não disponível"); return; }
      const parsed = parseXmlFiscal(doc.xml_bruto);
      await (supabase.from("xml_fiscais" as any) as any)
        .update({ status_processamento: "pendente", erro_detalhe: "", dados_processados: { itensCount: parsed.itens.length, reprocessado: true }, tentativas_importacao: (doc.tentativas_importacao || 0) + 1 })
        .eq("id", doc.id);
      await addLog("reprocessamento", `NF ${doc.numero} reprocessada`, "info", doc.id);
      toast.success("XML reprocessado");
      fetchData();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  // ── Save rule ──
  const handleSaveRegra = async () => {
    if (!regraForm.fornecedor_cnpj) { toast.error("CNPJ obrigatório"); return; }
    try {
      if ((regraForm as any).id) {
        await (supabase.from("xml_fiscal_regras" as any) as any).update(regraForm).eq("id", (regraForm as any).id);
      } else {
        await (supabase.from("xml_fiscal_regras" as any) as any).insert(regraForm);
      }
      toast.success("Regra salva!");
      setShowRegraModal(false);
      fetchData();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  // ── Bulk ZIP Export ──
  const handleExportZip = async () => {
    const docsToExport = xmlDocs.filter(d => selectedIds.has(d.id) && d.xml_bruto);
    if (docsToExport.length === 0) { toast.error("Selecione XMLs com conteúdo para exportar"); return; }

    setExportingZip(true);
    try {
      const zip = new JSZip();
      for (const doc of docsToExport) {
        const emissao = doc.data_emissao ? new Date(doc.data_emissao) : new Date(doc.created_at);
        const year = emissao.getFullYear();
        const month = String(emissao.getMonth() + 1).padStart(2, "0");
        const emitente = (doc.emitente_razao || "SemEmitente").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
        const folder = `${doc.tipo_documento}/${year}-${month}/${emitente}`;
        const fileName = `NF_${doc.numero}_${doc.serie}_${doc.chave_acesso.substring(0, 10)}.xml`;
        zip.file(`${folder}/${fileName}`, doc.xml_bruto!);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const now = new Date();
      saveAs(blob, `XMLs_Backup_${now.toISOString().substring(0, 10)}.zip`);
      await addLog("export_zip", `Exportação ZIP: ${docsToExport.length} XMLs`, "sucesso");
      toast.success(`${docsToExport.length} XMLs exportados em ZIP`);
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error("Erro ao gerar ZIP: " + err.message);
    } finally {
      setExportingZip(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Filter ──
  const filteredDocs = xmlDocs.filter(doc => {
    if (filtroStatus !== "todos" && doc.status_processamento !== filtroStatus) return false;
    if (filtroBusca) {
      const s = filtroBusca.toLowerCase();
      if (!doc.emitente_razao?.toLowerCase().includes(s) && !doc.numero?.includes(s) && !doc.chave_acesso?.includes(s) && !doc.emitente_cnpj?.includes(s)) return false;
    }
    if (filtroDataInicio && doc.data_emissao) {
      const emissao = new Date(doc.data_emissao);
      emissao.setHours(0, 0, 0, 0);
      const inicio = new Date(filtroDataInicio);
      inicio.setHours(0, 0, 0, 0);
      if (emissao < inicio) return false;
    }
    if (filtroDataFim && doc.data_emissao) {
      const emissao = new Date(doc.data_emissao);
      emissao.setHours(23, 59, 59, 999);
      const fim = new Date(filtroDataFim);
      fim.setHours(23, 59, 59, 999);
      if (emissao > fim) return false;
    }
    return true;
  });

  // ── KPIs ──
  const totalNotas = xmlDocs.length;
  const totalImportados = xmlDocs.filter(d => d.status_processamento === "importado").length;
  const totalPendentes = xmlDocs.filter(d => d.status_processamento === "pendente").length;
  const totalErros = xmlDocs.filter(d => d.status_processamento === "erro").length;
  const valorTotalGeral = xmlDocs.reduce((s, d) => s + (d.valor_total || 0), 0);
  const naoManifestados = xmlDocs.filter(d => !d.manifestacao || d.manifestacao === "").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Gestão de XML Fiscal" description="Importe, gerencie e processe documentos fiscais eletrônicos" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="gestao"><FileText className="w-4 h-4 mr-1" />Gestão XML</TabsTrigger>
          <TabsTrigger value="regras"><Settings className="w-4 h-4 mr-1" />Regras</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="w-4 h-4 mr-1" />Logs</TabsTrigger>
          <TabsTrigger value="config"><Settings className="w-4 h-4 mr-1" />Config</TabsTrigger>
        </TabsList>

        {/* ═══ DASHBOARD ═══ */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Notas", value: totalNotas, icon: FileText, color: "text-primary" },
              { label: "Importados", value: totalImportados, icon: CheckCircle2, color: "text-emerald-500" },
              { label: "Pendentes", value: totalPendentes, icon: Clock, color: "text-amber-500" },
              { label: "Erros", value: totalErros, icon: XCircle, color: "text-red-500" },
              { label: "Não Manifestados", value: naoManifestados, icon: AlertTriangle, color: "text-orange-500" },
              { label: "Valor Total", value: formatCurrency(valorTotalGeral), icon: BarChart3, color: "text-blue-500" },
            ].map((kpi, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1"><kpi.icon className={`w-4 h-4 ${kpi.color}`} /><span className="text-xs text-muted-foreground">{kpi.label}</span></div>
                  <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalErros > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm text-destructive flex items-center gap-2"><XCircle className="w-4 h-4" />Erros Recentes</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>NF</TableHead><TableHead>Emitente</TableHead><TableHead>Erro</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {xmlDocs.filter(d => d.status_processamento === "erro").slice(0, 5).map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-xs">{doc.numero}/{doc.serie}</TableCell>
                        <TableCell className="text-xs">{doc.emitente_razao?.substring(0, 30)}</TableCell>
                        <TableCell className="text-xs text-destructive">{doc.erro_detalhe?.substring(0, 50)}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => handleReprocessar(doc)}><RefreshCw className="w-3 h-3 mr-1" />Retry</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><ScrollText className="w-4 h-4" />Últimas Operações</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Ação</TableHead><TableHead>Detalhe</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {logs.slice(0, 10).map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{log.acao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">{log.detalhe}</TableCell>
                      <TableCell><Badge variant="outline" className={log.tipo === "erro" ? "text-destructive" : log.tipo === "sucesso" ? "text-emerald-500" : ""}>{log.tipo}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma operação registrada</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ GESTÃO XML ═══ */}
        <TabsContent value="gestao" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={() => setShowUpload(true)}><Upload className="w-4 h-4 mr-2" />Importar XML</Button>
            {selectedIds.size > 0 && (
              <Button variant="outline" onClick={handleExportZip} disabled={exportingZip}>
                <Archive className="w-4 h-4 mr-2" />{exportingZip ? "Gerando..." : `Exportar ZIP (${selectedIds.size})`}
              </Button>
            )}
            <div className="flex-1 max-w-xs">
              <Input placeholder="Buscar por NF, emitente, CNPJ, chave..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} className="h-9" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
          </div>

          {/* Filtro por período */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período emissão:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !filtroDataInicio && "text-muted-foreground")}>
                  <CalendarIcon size={14} />
                  {filtroDataInicio ? format(filtroDataInicio, "dd/MM/yyyy") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={filtroDataInicio} onSelect={setFiltroDataInicio} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !filtroDataFim && "text-muted-foreground")}>
                  <CalendarIcon size={14} />
                  {filtroDataFim ? format(filtroDataFim, "dd/MM/yyyy") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={filtroDataFim} onSelect={setFiltroDataFim} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(filtroDataInicio || filtroDataFim) && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setFiltroDataInicio(undefined); setFiltroDataFim(undefined); }}>
                <X size={14} /> Limpar datas
              </Button>
            )}
          </div>

          {/* Sub-tabs: Em Aberto / Lançadas */}
          <Tabs defaultValue="em_aberto">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="em_aberto" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" />Em Aberto
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{xmlDocs.filter(d => d.status_processamento === "pendente").length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="lancadas" className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />Lançadas
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{xmlDocs.filter(d => d.status_processamento === "importado").length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="em_aberto" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"><Checkbox checked={selectedIds.size === filteredDocs.filter(d => d.status_processamento === "pendente").length && filteredDocs.filter(d => d.status_processamento === "pendente").length > 0} onCheckedChange={() => {
                          const pendentes = filteredDocs.filter(d => d.status_processamento === "pendente");
                          if (selectedIds.size === pendentes.length) setSelectedIds(new Set());
                          else setSelectedIds(new Set(pendentes.map(d => d.id)));
                        }} /></TableHead>
                        <TableHead>NF/Série</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Emitente</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>SEFAZ</TableHead>
                        <TableHead>Manif.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.filter(d => d.status_processamento === "pendente" || d.status_processamento === "erro" || d.status_processamento === "conferencia").map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell><Checkbox checked={selectedIds.has(doc.id)} onCheckedChange={() => toggleSelect(doc.id)} /></TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{doc.numero}/{doc.serie}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{doc.tipo_documento}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{doc.emitente_razao}</TableCell>
                          <TableCell className="text-xs">{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(doc.valor_total)}</TableCell>
                          <TableCell>{statusSefazBadge(doc.status_sefaz)}</TableCell>
                          <TableCell>{manifestacaoBadge(doc.manifestacao)}</TableCell>
                          <TableCell>{statusBadge(doc.status_processamento)}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewDetail(doc)} title="Detalhes"><Eye className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-500" onClick={() => handleConferencia(doc)} title="Conferir e Importar"><ClipboardCheck className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => handleOpenManifestacao(doc)} title="Manifestação"><ShieldCheck className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReprocessar(doc)} title="Reprocessar"><RefreshCw className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc.id)} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredDocs.filter(d => d.status_processamento === "pendente" || d.status_processamento === "erro" || d.status_processamento === "conferencia").length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                          <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nenhuma nota em aberto</p>
                          <Button variant="link" className="mt-2" onClick={() => setShowUpload(true)}>Importar XML</Button>
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lancadas" className="mt-3">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NF/Série</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Emitente</TableHead>
                        <TableHead>Emissão</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>SEFAZ</TableHead>
                        <TableHead>Manif.</TableHead>
                        <TableHead>Data Importação</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.filter(d => d.status_processamento === "importado").map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-mono text-xs font-semibold">{doc.numero}/{doc.serie}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{doc.tipo_documento}</Badge></TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">{doc.emitente_razao}</TableCell>
                          <TableCell className="text-xs">{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(doc.valor_total)}</TableCell>
                          <TableCell>{statusSefazBadge(doc.status_sefaz)}</TableCell>
                          <TableCell>{manifestacaoBadge(doc.manifestacao)}</TableCell>
                          <TableCell className="text-xs">{doc.data_importacao ? new Date(doc.data_importacao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewDetail(doc)} title="Detalhes"><Eye className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" onClick={() => handleOpenManifestacao(doc)} title="Manifestação"><ShieldCheck className="w-3.5 h-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredDocs.filter(d => d.status_processamento === "importado").length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>Nenhuma nota lançada ainda</p>
                        </TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ═══ REGRAS ═══ */}
        <TabsContent value="regras" className="space-y-4">
          <Button onClick={() => { setRegraForm({ fornecedor_cnpj: "", fornecedor_nome: "", cfop_padrao: "", centro_custo: "", auto_importar: false, criar_produto_auto: false, ativo: true, observacoes: "" }); setShowRegraModal(true); }}>
            <Settings className="w-4 h-4 mr-2" />Nova Regra
          </Button>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fornecedor</TableHead><TableHead>CNPJ</TableHead><TableHead>CFOP</TableHead><TableHead>Centro Custo</TableHead><TableHead>Auto</TableHead><TableHead>Criar Prod.</TableHead><TableHead>Status</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {regras.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.fornecedor_nome}</TableCell>
                    <TableCell className="font-mono text-[10px]">{formatCnpj(r.fornecedor_cnpj)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.cfop_padrao || "-"}</TableCell>
                    <TableCell className="text-xs">{r.centro_custo || "-"}</TableCell>
                    <TableCell>{r.auto_importar ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                    <TableCell>{r.criar_produto_auto ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</TableCell>
                    <TableCell><Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => { setRegraForm(r); setShowRegraModal(true); }}>Editar</Button></TableCell>
                  </TableRow>
                ))}
                {regras.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma regra configurada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ═══ LOGS ═══ */}
        <TabsContent value="logs" className="space-y-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Data/Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Ação</TableHead><TableHead>Detalhe</TableHead><TableHead>Usuário</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline" className={log.tipo === "erro" ? "text-destructive border-destructive/30" : log.tipo === "sucesso" ? "text-emerald-500 border-emerald-500/30" : "text-blue-500 border-blue-500/30"}>{log.tipo}</Badge></TableCell>
                    <TableCell className="text-xs font-medium">{log.acao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[400px] truncate">{log.detalhe}</TableCell>
                    <TableCell className="text-xs">{log.usuario_nome}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum log registrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ═══ CONFIG ═══ */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Certificado Digital</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">O certificado digital (A1/A3) é configurado no módulo de Empresas.</p>
                <Button variant="outline" size="sm" onClick={() => window.location.href = "/cadastros/empresas"}><Building2 className="w-4 h-4 mr-2" />Ir para Cadastro de Empresas</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Agendamento Automático</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Configure a frequência de consulta automática à SEFAZ.</p>
                <Select defaultValue="manual">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="30">A cada 30 minutos</SelectItem>
                    <SelectItem value="60">A cada 1 hora</SelectItem>
                    <SelectItem value="360">A cada 6 horas</SelectItem>
                    <SelectItem value="1440">Diário</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Importação Automática</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3"><Switch id="auto-import" /><Label htmlFor="auto-import" className="text-xs">Importar automaticamente XMLs com regras</Label></div>
                <div className="flex items-center gap-3"><Switch id="auto-create-product" /><Label htmlFor="auto-create-product" className="text-xs">Criar produtos não cadastrados</Label></div>
                <div className="flex items-center gap-3"><Switch id="auto-create-supplier" /><Label htmlFor="auto-create-supplier" className="text-xs">Criar fornecedores não cadastrados</Label></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Busca por Chave de Acesso</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label className="text-xs">Chave de Acesso (44 dígitos)</Label><Input value={chaveManual} onChange={e => setChaveManual(e.target.value)} placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000" maxLength={55} /></div>
                <Button size="sm" disabled={!validateChaveAcesso(chaveManual)} onClick={() => toast.info("Funcionalidade requer integração com servidor SEFAZ")}><Search className="w-4 h-4 mr-2" />Consultar SEFAZ</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ MODAL: UPLOAD ═══ */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Importar XML Fiscal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Selecione um ou mais arquivos XML de NF-e, NFC-e ou CT-e.</p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <Label htmlFor="xml-upload" className="cursor-pointer text-primary hover:underline text-lg">{uploading ? "Processando..." : "Selecionar arquivos XML"}</Label>
              <Input id="xml-upload" type="file" accept=".xml" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
              <p className="text-xs text-muted-foreground mt-2">Suporte a múltiplos arquivos • Detecção de duplicidade</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: DETALHE ═══ */}
      <Dialog open={showDetalhe} onOpenChange={setShowDetalhe}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> NF {selectedDoc?.numero}/{selectedDoc?.serie}
              <span className="ml-2">{selectedDoc && statusSefazBadge(selectedDoc.status_sefaz)}</span>
              <span>{selectedDoc && statusBadge(selectedDoc.status_processamento)}</span>
              <span>{selectedDoc && manifestacaoBadge(selectedDoc.manifestacao)}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
                <div><div className="text-[10px] text-muted-foreground">Chave de Acesso</div><div className="font-mono text-[10px] break-all">{selectedDoc.chave_acesso}</div></div>
                <div><div className="text-[10px] text-muted-foreground">Emitente</div><div className="text-sm">{selectedDoc.emitente_razao}</div><div className="font-mono text-[10px]">{formatCnpj(selectedDoc.emitente_cnpj)}</div></div>
                <div><div className="text-[10px] text-muted-foreground">Destinatário</div><div className="text-sm">{selectedDoc.destinatario_razao}</div><div className="font-mono text-[10px]">{formatCnpj(selectedDoc.destinatario_cnpj)}</div></div>
                <div><div className="text-[10px] text-muted-foreground">Emissão</div><div className="text-sm">{selectedDoc.data_emissao ? new Date(selectedDoc.data_emissao).toLocaleDateString("pt-BR") : "-"}</div></div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {[
                  { label: "Produtos", value: selectedDoc.valor_produtos }, { label: "ICMS", value: selectedDoc.valor_icms },
                  { label: "IPI", value: selectedDoc.valor_ipi }, { label: "PIS", value: selectedDoc.valor_pis },
                  { label: "COFINS", value: selectedDoc.valor_cofins }, { label: "Frete", value: selectedDoc.valor_frete },
                  { label: "Desconto", value: selectedDoc.valor_desconto }, { label: "Total NF", value: selectedDoc.valor_total },
                ].map((t, i) => (
                  <div key={i} className="bg-muted/20 rounded p-2 text-center">
                    <div className="text-[9px] text-muted-foreground">{t.label}</div>
                    <div className={`font-mono text-xs font-semibold ${i === 7 ? "text-primary" : ""}`}>{formatCurrency(t.value)}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Package className="w-4 h-4" />Itens ({selectedItens.length})</h4>
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Produto</TableHead><TableHead>NCM</TableHead><TableHead>CFOP</TableHead><TableHead>Un</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Total</TableHead><TableHead>CST</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selectedItens.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs">{item.numero_item}</TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{item.descricao}</TableCell>
                          <TableCell className="font-mono text-[10px]">{item.ncm}</TableCell>
                          <TableCell className="font-mono text-[10px]">{item.cfop}</TableCell>
                          <TableCell className="text-[10px]">{item.unidade}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{Number(item.quantidade).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-[10px]">{formatCurrency(Number(item.valor_unitario))}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(Number(item.valor_total))}</TableCell>
                          <TableCell className="font-mono text-[10px]">{item.cst_icms}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
              <div className="flex gap-2 justify-end">
                {selectedDoc.xml_bruto && <Button variant="outline" size="sm" onClick={() => setShowXmlBruto(true)}><FileCode className="w-4 h-4 mr-2" />XML Bruto</Button>}
                <Button variant="outline" size="sm" onClick={() => handleOpenManifestacao(selectedDoc)}><ShieldCheck className="w-4 h-4 mr-2" />Manifestação</Button>
                {selectedDoc.status_processamento === "pendente" && <Button size="sm" onClick={() => { setShowDetalhe(false); handleConferencia(selectedDoc); }}><ClipboardCheck className="w-4 h-4 mr-2" />Conferir e Importar</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: XML BRUTO ═══ */}
      <Dialog open={showXmlBruto} onOpenChange={setShowXmlBruto}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader><DialogTitle>XML Bruto</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]"><pre className="text-[10px] font-mono bg-muted/30 rounded p-4 whitespace-pre-wrap break-all">{selectedDoc?.xml_bruto}</pre></ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: CONFERÊNCIA PRÉ-IMPORTAÇÃO ═══ */}
      <Dialog open={showConferencia} onOpenChange={setShowConferencia}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" /> Conferência — NF {selectedDoc?.numero}/{selectedDoc?.serie}
            </DialogTitle>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Itens no XML</div>
                  <div className="text-2xl font-bold">{selectedItens.length}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Valor Total</div>
                  <div className="text-lg font-bold text-primary">{formatCurrency(selectedDoc.valor_total)}</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${divergencias.length > 0 ? "bg-amber-500/10 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
                  <div className="text-xs text-muted-foreground">Divergências</div>
                  <div className={`text-2xl font-bold ${divergencias.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                    {conferenciaLoading ? "..." : divergencias.length}
                  </div>
                </div>
              </div>

              {conferenciaLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Comparando com dados do ERP...</p>
                </div>
              ) : (
                <>
                  {/* Divergence table */}
                  {divergencias.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />Divergências Encontradas ({divergencias.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Campo</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Valor XML</TableHead>
                              <TableHead>Valor ERP</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {divergencias.map((d, i) => (
                              <TableRow key={i} className="bg-amber-500/5">
                                <TableCell className="text-xs max-w-[180px] truncate">{d.item}</TableCell>
                                <TableCell className="text-xs font-medium">{d.campo}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={
                                    d.tipo === "preco" ? "text-blue-500" :
                                    d.tipo === "imposto" ? "text-orange-500" :
                                    d.tipo === "ncm" ? "text-purple-500" : ""
                                  }>{d.tipo}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-amber-500">{d.valorXml}</TableCell>
                                <TableCell className="font-mono text-xs">{d.valorErp}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {divergencias.length === 0 && (
                    <div className="text-center py-6 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-500">Nenhuma divergência encontrada</p>
                      <p className="text-xs text-muted-foreground mt-1">Os dados do XML são compatíveis com o ERP</p>
                    </div>
                  )}

                  {/* Items preview */}
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2 py-2">
                      <Package className="w-4 h-4" />Itens do XML ({selectedItens.length})
                    </summary>
                    <ScrollArea className="max-h-[200px] mt-2">
                      <Table>
                        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Produto</TableHead><TableHead>NCM</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {selectedItens.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-xs">{item.numero_item}</TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate">{item.descricao}</TableCell>
                              <TableCell className="font-mono text-[10px]">{item.ncm}</TableCell>
                              <TableCell className="text-right font-mono text-xs">{Number(item.quantidade).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono text-[10px]">{formatCurrency(Number(item.valor_unitario))}</TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(Number(item.valor_total))}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </details>

                  <div className="flex gap-2 justify-end border-t pt-3">
                    <Button variant="outline" onClick={() => setShowConferencia(false)}>Cancelar</Button>
                    <Button onClick={handleAbrirDesdobramento}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      {divergencias.length > 0 ? `Avançar com ${divergencias.length} divergência(s)` : "Avançar para Desdobramento"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: MANIFESTAÇÃO ═══ */}
      <Dialog open={showManifestacao} onOpenChange={setShowManifestacao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Manifestação do Destinatário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">NF {selectedDoc?.numero}/{selectedDoc?.serie}</div>
              <div className="text-sm font-medium">{selectedDoc?.emitente_razao}</div>
              <div className="font-mono text-xs">{formatCurrency(selectedDoc?.valor_total || 0)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tipo de Manifestação</Label>
              {[
                { value: "ciencia", label: "Ciência da Operação", desc: "Confirma ciência da existência da NF-e", icon: Eye, color: "text-blue-500" },
                { value: "confirmacao", label: "Confirmação da Operação", desc: "Confirma que a operação ocorreu conforme descrito", icon: ShieldCheck, color: "text-emerald-500" },
                { value: "desconhecimento", label: "Desconhecimento da Operação", desc: "Informa desconhecimento da operação", icon: ShieldAlert, color: "text-orange-500" },
                { value: "nao_realizada", label: "Operação Não Realizada", desc: "Informa que a operação não foi realizada", icon: ShieldX, color: "text-destructive" },
              ].map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setManifestacaoTipo(opt.value)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      manifestacaoTipo === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${opt.color}`} />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {(manifestacaoTipo === "desconhecimento" || manifestacaoTipo === "nao_realizada") && (
              <div>
                <Label className="text-xs">Justificativa (mín. 15 caracteres)</Label>
                <Textarea value={manifestacaoJustificativa} onChange={e => setManifestacaoJustificativa(e.target.value)} rows={3} placeholder="Descreva o motivo..." />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowManifestacao(false)}>Cancelar</Button>
              <Button
                onClick={handleSalvarManifestacao}
                disabled={!manifestacaoTipo || ((manifestacaoTipo === "desconhecimento" || manifestacaoTipo === "nao_realizada") && manifestacaoJustificativa.length < 15)}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />Registrar Manifestação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: REGRA FORNECEDOR ═══ */}
      <Dialog open={showRegraModal} onOpenChange={setShowRegraModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{(regraForm as any)?.id ? "Editar Regra" : "Nova Regra de Fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">CNPJ do Fornecedor *</Label><Input value={regraForm.fornecedor_cnpj || ""} onChange={e => setRegraForm(p => ({ ...p, fornecedor_cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
            <div><Label className="text-xs">Nome do Fornecedor</Label><Input value={regraForm.fornecedor_nome || ""} onChange={e => setRegraForm(p => ({ ...p, fornecedor_nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">CFOP Padrão</Label><Input value={regraForm.cfop_padrao || ""} onChange={e => setRegraForm(p => ({ ...p, cfop_padrao: e.target.value }))} placeholder="1102" /></div>
              <div><Label className="text-xs">Centro de Custo</Label><Input value={regraForm.centro_custo || ""} onChange={e => setRegraForm(p => ({ ...p, centro_custo: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={regraForm.auto_importar} onCheckedChange={v => setRegraForm(p => ({ ...p, auto_importar: v }))} /><Label className="text-xs">Importar automaticamente</Label></div>
            <div className="flex items-center gap-3"><Switch checked={regraForm.criar_produto_auto} onCheckedChange={v => setRegraForm(p => ({ ...p, criar_produto_auto: v }))} /><Label className="text-xs">Criar produtos não cadastrados</Label></div>
            <div><Label className="text-xs">Observações</Label><Textarea value={regraForm.observacoes || ""} onChange={e => setRegraForm(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowRegraModal(false)}>Cancelar</Button><Button onClick={handleSaveRegra}>Salvar Regra</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL: DESDOBRAMENTO DE CUSTOS ═══ */}
      <Dialog open={showDesdobramento} onOpenChange={setShowDesdobramento}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" /> Desdobramento de Custos — NF {selectedDoc?.numero}/{selectedDoc?.serie}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              {/* Supplier info */}
              <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Fornecedor</div>
                  <div className="text-sm font-medium">{selectedDoc.emitente_razao}</div>
                  <div className="font-mono text-xs text-muted-foreground">{formatCnpj(selectedDoc.emitente_cnpj)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Valor NF</div>
                  <div className="text-lg font-bold text-primary">{formatCurrency(selectedDoc.valor_total)}</div>
                </div>
              </div>

              {/* Rateio inputs */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Rateio de Despesas (proporcional ao valor do item)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Frete</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={desdobramentoRateios.frete}
                        onChange={e => {
                          const v = Number(e.target.value) || 0;
                          setDesdobramentoRateios(p => ({ ...p, frete: v }));
                          recalcularDesdobramento(desdobramentoItens, v, desdobramentoRateios.seguro, desdobramentoRateios.outrasDespesas);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Seguro</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={desdobramentoRateios.seguro}
                        onChange={e => {
                          const v = Number(e.target.value) || 0;
                          setDesdobramentoRateios(p => ({ ...p, seguro: v }));
                          recalcularDesdobramento(desdobramentoItens, desdobramentoRateios.frete, v, desdobramentoRateios.outrasDespesas);
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Outras Despesas</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={desdobramentoRateios.outrasDespesas}
                        onChange={e => {
                          const v = Number(e.target.value) || 0;
                          setDesdobramentoRateios(p => ({ ...p, outrasDespesas: v }));
                          recalcularDesdobramento(desdobramentoItens, desdobramentoRateios.frete, desdobramentoRateios.seguro, v);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items table with margin inputs */}
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Rateio</TableHead>
                      <TableHead className="text-right">Custo Final</TableHead>
                      <TableHead className="text-right w-[100px]">Margem Bruta %</TableHead>
                      <TableHead className="text-right w-[100px]">Margem Líq. %</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {desdobramentoItens.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx}>
                        <TableCell className="text-xs">{item.numero_item}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">{item.descricao}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{Number(item.quantidade).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatCurrency(Number(item.valor_unitario))}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(item.rateio_frete / (Number(item.quantidade) || 1))}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold text-primary">{formatCurrency(item.custo_final)}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="99"
                            className="h-7 w-20 text-xs text-right font-mono ml-auto"
                            value={item.margem_bruta || ""}
                            onChange={e => handleMargemChange(idx, "margem_bruta", Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="99"
                            className="h-7 w-20 text-xs text-right font-mono ml-auto"
                            value={item.margem_liquida || ""}
                            onChange={e => handleMargemChange(idx, "margem_liquida", Number(e.target.value) || 0)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">
                          {formatCurrency(item.preco_venda_sugerido)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-3 bg-muted/20 rounded-lg p-3">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Total Produtos</div>
                  <div className="font-mono text-sm font-bold">{formatCurrency(selectedDoc.valor_produtos)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Total Rateio</div>
                  <div className="font-mono text-sm font-bold">{formatCurrency(desdobramentoRateios.frete + desdobramentoRateios.seguro + desdobramentoRateios.outrasDespesas)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Custo Total</div>
                  <div className="font-mono text-sm font-bold text-primary">{formatCurrency(desdobramentoItens.reduce((s: number, it: any) => s + (it.custo_final * (Number(it.quantidade) || 1)), 0))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Itens</div>
                  <div className="font-mono text-sm font-bold">{desdobramentoItens.length}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t pt-3">
                <Button variant="outline" onClick={() => { setShowDesdobramento(false); setShowConferencia(true); }}>Voltar à Conferência</Button>
                <Button onClick={handleConfirmarImportacao}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Confirmar Importação ao ERP
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
