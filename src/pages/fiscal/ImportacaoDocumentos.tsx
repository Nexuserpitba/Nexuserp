import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseXmlFiscal, type XmlFiscalParsed, type XmlFiscalItemParsed } from "@/lib/xmlFiscalParser";
import {
  FileText, Upload, Eye, CheckCircle2, AlertTriangle, XCircle, Clock,
  Package, ArrowRight, Building2, Truck, ShoppingCart, CreditCard,
  FileInput, RefreshCw, Search, ArrowDownCircle, ClipboardCheck, FileCode
} from "lucide-react";

// ── Helpers ──
const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatCnpj = (v: string) => {
  if (!v) return "";
  const clean = v.replace(/\D/g, "");
  if (clean.length === 14) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (clean.length === 11) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return v;
};

interface ImportState {
  step: "upload" | "preview" | "desdobramento" | "confirmacao" | "concluido";
  parsed: XmlFiscalParsed | null;
  tipo: "NF-e" | "NFC-e" | "CT-e";
  fornecedorExiste: boolean;
  fornecedorId: string | null;
  produtosExistentes: Map<number, { id: string; descricao: string }>;
  produtosNovos: number[];
  desdobramentoItens: DesdobramentoItem[];
  rateios: { frete: number; seguro: number; outras: number };
  gerarContaPagar: boolean;
  gerarMovEstoque: boolean;
  condicaoPagamento: string;
  numParcelas: number;
  intervaloParcelas: number;
  primeiroVencimento: string;
  formaPagamento: string;
  observacao: string;
  contaPagarGerada: boolean;
  // CT-e specific
  cteData: {
    tomador: string;
    remetente: string;
    destinatario: string;
    valorFrete: number;
    cfopServico: string;
    modalFrete: string;
  };
}

interface DesdobramentoItem extends XmlFiscalItemParsed {
  custoFinal: number;
  rateioUnit: number;
  margemBruta: number;
  margemLiquida: number;
  precoVendaSugerido: number;
  produtoErpId: string | null;
  isNovo: boolean;
  estoqueMinimo: number;
  estoqueMaximo: number;
}

interface ImportLog {
  id: string;
  tipo: string;
  acao: string;
  detalhe: string;
  created_at: string;
}

const initialCteData = { tomador: "", remetente: "", destinatario: "", valorFrete: 0, cfopServico: "1353", modalFrete: "01" };

const getDefaultVencimento = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

const initialState: ImportState = {
  step: "upload",
  parsed: null,
  tipo: "NF-e",
  fornecedorExiste: false,
  fornecedorId: null,
  produtosExistentes: new Map(),
  produtosNovos: [],
  desdobramentoItens: [],
  rateios: { frete: 0, seguro: 0, outras: 0 },
  gerarContaPagar: true,
  gerarMovEstoque: true,
  condicaoPagamento: "À vista",
  numParcelas: 1,
  intervaloParcelas: 30,
  primeiroVencimento: getDefaultVencimento(),
  formaPagamento: "Boleto",
  observacao: "",
  contaPagarGerada: false,
  cteData: { ...initialCteData },
};

export default function ImportacaoDocumentos() {
  const [activeTab, setActiveTab] = useState<"NF-e" | "NFC-e" | "CT-e">("NF-e");
  const [state, setState] = useState<ImportState>({ ...initialState });
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [pendingXmls, setPendingXmls] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buscaPendente, setBuscaPendente] = useState("");

  const fetchRecent = useCallback(async () => {
    const { data } = await (supabase.from("xml_fiscais" as any) as any)
      .select("id, numero, serie, tipo_documento, emitente_razao, valor_total, status_processamento, data_emissao, created_at")
      .eq("status_processamento", "importado")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setRecentImports(data);
  }, []);

  const fetchPendingXmls = useCallback(async () => {
    setLoadingPending(true);
    try {
      const { data } = await (supabase.from("xml_fiscais" as any) as any)
        .select("id, chave_acesso, numero, serie, tipo_documento, emitente_cnpj, emitente_razao, valor_total, valor_produtos, valor_icms, valor_ipi, valor_pis, valor_cofins, valor_frete, valor_desconto, data_emissao, xml_bruto, emitente_fantasia, emitente_uf, destinatario_cnpj, destinatario_razao, status_sefaz, created_at")
        .eq("status_processamento", "pendente")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setPendingXmls(data);
    } catch (err) {
      console.error("Erro ao buscar XMLs pendentes:", err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); fetchPendingXmls(); }, [fetchRecent, fetchPendingXmls]);

  const resetState = () => { setState({ ...initialState, tipo: activeTab }); fetchPendingXmls(); };

  // ── Select pending XML from Gestão XML ──
  const handleSelectPendingXml = async (doc: any) => {
    if (!doc.xml_bruto) {
      toast.error("XML bruto não disponível para este documento");
      return;
    }
    setLoading(true);
    try {
      const parsed = parseXmlFiscal(doc.xml_bruto);
      if (!parsed.chaveAcesso) throw new Error("Chave de acesso não encontrada no XML");

      const detectedType = parsed.tipoDocumento as "NF-e" | "NFC-e" | "CT-e";

      // Check supplier
      const cnpjClean = parsed.emitenteCnpj?.replace(/\D/g, "");
      let fornecedorExiste = false;
      let fornecedorId: string | null = null;
      if (cnpjClean) {
        const { data: forn } = await (supabase.from("pessoas" as any) as any)
          .select("id, nome").eq("cpf_cnpj", cnpjClean).maybeSingle();
        if (forn) { fornecedorExiste = true; fornecedorId = forn.id; }
      }

      // Check products
      const produtosExistentes = new Map<number, { id: string; descricao: string }>();
      const produtosNovos: number[] = [];
      for (let i = 0; i < parsed.itens.length; i++) {
        const item = parsed.itens[i];
        const ncm = (item.ncm || "").replace(/\D/g, "");
        const desc = item.descricao?.substring(0, 25) || "";
        const { data: prod } = await (supabase.from("produtos" as any) as any)
          .select("id, descricao")
          .or(`ncm.eq.${ncm},descricao.ilike.%${desc}%`)
          .limit(1)
          .maybeSingle();
        if (prod) {
          produtosExistentes.set(i, { id: prod.id, descricao: prod.descricao });
        } else {
          produtosNovos.push(i);
        }
      }

      let cteData = { ...initialCteData };
      if (detectedType === "CT-e") {
        cteData.valorFrete = parsed.valorTotal;
        cteData.remetente = parsed.emitenteRazao;
        cteData.destinatario = parsed.destinatarioRazao;
      }

      setState({
        ...state,
        step: "preview",
        parsed,
        tipo: detectedType,
        fornecedorExiste,
        fornecedorId,
        produtosExistentes,
        produtosNovos,
        rateios: { frete: parsed.valorFrete, seguro: 0, outras: 0 },
        cteData,
      });

      if (detectedType !== activeTab) {
        setActiveTab(detectedType);
        toast.info(`Documento detectado como ${detectedType}`);
      }
      toast.success(`XML NF ${parsed.numero} carregado da Gestão XML`);
    } catch (err: any) {
      toast.error("Erro ao processar XML: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const addLog = async (acao: string, detalhe: string, tipo = "info", xmlId?: string) => {
    try {
      await (supabase.from("xml_fiscal_logs" as any) as any).insert({
        xml_fiscal_id: xmlId || null, tipo, acao, detalhe, usuario_nome: "Sistema"
      });
    } catch { /* erro ignorado */ }
  };

  // File upload removed - imports only from Gestão XML

  // ── STEP 2 → 3: Preview → Desdobramento ──
  const handleAvancarDesdobramento = () => {
    if (!state.parsed) return;
    const totalProdutos = state.parsed.itens.reduce((s, it) => s + it.valorTotal, 0);
    const totalRateio = state.rateios.frete + state.rateios.seguro + state.rateios.outras;

    const desdobramentoItens: DesdobramentoItem[] = state.parsed.itens.map((item, idx) => {
      const peso = totalProdutos > 0 ? item.valorTotal / totalProdutos : 0;
      const rateioItem = totalRateio * peso;
      const rateioUnit = item.quantidade > 0 ? rateioItem / item.quantidade : 0;
      const custoFinal = item.valorUnitario + rateioUnit;
      const existing = state.produtosExistentes.get(idx);
      const qtd = item.quantidade || 1;
      return {
        ...item,
        custoFinal,
        rateioUnit,
        margemBruta: 0,
        margemLiquida: 0,
        precoVendaSugerido: custoFinal,
        produtoErpId: existing?.id || null,
        isNovo: !existing,
        estoqueMinimo: Math.max(1, Math.round(qtd * 0.2)),
        estoqueMaximo: Math.round(qtd * 3),
      };
    });
    setState(prev => ({ ...prev, step: "desdobramento", desdobramentoItens }));
  };

  const recalcularDesdobramento = (frete: number, seguro: number, outras: number) => {
    if (!state.parsed) return;
    const totalProdutos = state.parsed.itens.reduce((s, it) => s + it.valorTotal, 0);
    const totalRateio = frete + seguro + outras;
    setState(prev => ({
      ...prev,
      rateios: { frete, seguro, outras },
      desdobramentoItens: prev.desdobramentoItens.map(item => {
        const peso = totalProdutos > 0 ? item.valorTotal / totalProdutos : 0;
        const rateioItem = totalRateio * peso;
        const rateioUnit = item.quantidade > 0 ? rateioItem / item.quantidade : 0;
        const custoFinal = item.valorUnitario + rateioUnit;
        const precoVendaSugerido = item.margemBruta > 0 ? custoFinal / (1 - item.margemBruta / 100) : custoFinal;
        return { ...item, custoFinal, rateioUnit, precoVendaSugerido };
      }),
    }));
  };

  const handleMargemChange = (idx: number, campo: "margemBruta" | "margemLiquida", valor: number) => {
    setState(prev => {
      const updated = [...prev.desdobramentoItens];
      updated[idx] = { ...updated[idx], [campo]: valor };
      if (campo === "margemBruta") {
        const cf = updated[idx].custoFinal;
        updated[idx].precoVendaSugerido = valor > 0 ? cf / (1 - valor / 100) : cf;
      }
      return { ...prev, desdobramentoItens: updated };
    });
  };

  // ── STEP 4: Confirmar Importação ──
  const handleConfirmarImportacao = async () => {
    if (!state.parsed) return;
    setLoading(true);
    try {
      const parsed = state.parsed;

      // 1. Create/get supplier
      let fornecedorId = state.fornecedorId;
      const cnpjClean = parsed.emitenteCnpj?.replace(/\D/g, "");
      if (!state.fornecedorExiste && cnpjClean) {
        const { data: novoForn } = await (supabase.from("pessoas" as any) as any)
          .insert({
            nome: parsed.emitenteRazao || "FORNECEDOR IMPORTADO",
            razao_social: parsed.emitenteRazao || "",
            nome_fantasia: parsed.emitenteFantasia || "",
            cpf_cnpj: cnpjClean,
            tipo: "Fornecedor",
            uf: parsed.emitenteUf || "",
            status: "Ativo",
            observacao: `Auto-cadastro via importação ${state.tipo} - NF ${parsed.numero}`,
          }).select("id").single();
        if (novoForn) fornecedorId = novoForn.id;
        await addLog("auto_cadastro_fornecedor", `Fornecedor criado: ${parsed.emitenteRazao} (${cnpjClean})`);
      }

      // 2. Create/update products
      let produtosCriados = 0;
      let produtosAtualizados = 0;
      for (const item of state.desdobramentoItens) {
        if (item.produtoErpId) {
          // Update existing product costs
          await (supabase.from("produtos" as any) as any)
            .update({
              custo_aquisicao: item.custoFinal,
              custo_reposicao: item.valorUnitario,
              margem_bruta: item.margemBruta,
              margem_liquida: item.margemLiquida,
              venda: item.precoVendaSugerido,
              rateio: item.rateioUnit,
            }).eq("id", item.produtoErpId);
          produtosAtualizados++;
        } else {
          // Create new product
          const { data: novoProd } = await (supabase.from("produtos" as any) as any)
            .insert({
              descricao: item.descricao,
              ncm: (item.ncm || "").replace(/\D/g, ""),
              cest: item.cest || "",
              unidade: item.unidade || "UN",
              custo_aquisicao: item.custoFinal,
              custo_reposicao: item.valorUnitario,
              venda: item.precoVendaSugerido,
              margem_bruta: item.margemBruta,
              margem_liquida: item.margemLiquida,
              rateio: item.rateioUnit,
              cst_icms: item.cstIcms || "",
              aliq_icms: item.aliqIcms,
              aliq_pis: item.aliqPis,
              aliq_cofins: item.aliqCofins,
              aliq_ipi: item.aliqIpi,
              fornecedor: parsed.emitenteRazao || "",
              estoque: item.quantidade,
              estoque_minimo: item.estoqueMinimo,
              estoque_maximo: item.estoqueMaximo,
              observacao: `Auto-cadastro via ${state.tipo} NF ${parsed.numero}`,
              ativo: true,
            }).select("id").single();
          if (novoProd) item.produtoErpId = novoProd.id;
          produtosCriados++;
        }
      }

      // 3. Save XML document
      const { data: xmlDoc } = await (supabase.from("xml_fiscais" as any) as any)
        .insert({
          chave_acesso: parsed.chaveAcesso,
          numero: parsed.numero,
          serie: parsed.serie,
          tipo_documento: state.tipo,
          status_sefaz: parsed.statusSefaz,
          status_processamento: "importado",
          data_emissao: parsed.dataEmissao ? new Date(parsed.dataEmissao).toISOString() : null,
          data_importacao: new Date().toISOString(),
          emitente_cnpj: parsed.emitenteCnpj,
          emitente_razao: parsed.emitenteRazao,
          emitente_fantasia: parsed.emitenteFantasia,
          emitente_uf: parsed.emitenteUf,
          destinatario_cnpj: parsed.destinatarioCnpj,
          destinatario_razao: parsed.destinatarioRazao,
          valor_total: parsed.valorTotal,
          valor_produtos: parsed.valorProdutos,
          valor_icms: parsed.valorIcms,
          valor_ipi: parsed.valorIpi,
          valor_pis: parsed.valorPis,
          valor_cofins: parsed.valorCofins,
          valor_frete: parsed.valorFrete,
          valor_desconto: parsed.valorDesconto,
          xml_bruto: parsed.xmlBruto,
          dados_processados: {
            itensCount: parsed.itens.length,
            fornecedorCriado: !state.fornecedorExiste,
            produtosCriados,
            produtosAtualizados,
            gerarContaPagar: state.gerarContaPagar,
            gerarMovEstoque: state.gerarMovEstoque,
          },
          observacoes: state.observacao,
        }).select("id").single();

      // 4. Save items
      if (xmlDoc) {
        await (supabase.from("xml_fiscal_itens" as any) as any).insert(
          state.desdobramentoItens.map(item => ({
            xml_fiscal_id: xmlDoc.id,
            numero_item: item.numeroItem,
            codigo_produto: item.codigoProduto,
            descricao: item.descricao,
            ncm: item.ncm,
            cest: item.cest,
            cfop: item.cfop,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
            valor_total: item.valorTotal,
            valor_desconto: item.valorDesconto,
            cst_icms: item.cstIcms,
            aliq_icms: item.aliqIcms,
            valor_icms: item.valorIcms,
            cst_ipi: item.cstIpi,
            aliq_ipi: item.aliqIpi,
            valor_ipi: item.valorIpi,
            cst_pis: item.cstPis,
            aliq_pis: item.aliqPis,
            valor_pis: item.valorPis,
            cst_cofins: item.cstCofins,
            aliq_cofins: item.aliqCofins,
            valor_cofins: item.valorCofins,
            produto_erp_id: item.produtoErpId,
            status_mapeamento: "mapeado",
          }))
        );
      }

      // 5. Generate Conta a Pagar in localStorage
      let contaPagarGerada = false;
      if (state.gerarContaPagar && parsed.valorTotal > 0) {
        try {
          const existingRaw = localStorage.getItem("contas_pagar");
          const existingContas = existingRaw ? JSON.parse(existingRaw) : [];

          const numP = state.numParcelas || 1;
          const intervalo = state.intervaloParcelas || 30;
          const baseDate = new Date(); // Data de hoje como base
          const valorParcela = Math.floor(parsed.valorTotal / numP * 100) / 100;
          const resto = Math.round((parsed.valorTotal - valorParcela * numP) * 100) / 100;

          const parcelas = Array.from({ length: numP }, (_, i) => {
            const venc = new Date(baseDate);
            venc.setDate(venc.getDate() + (i + 1) * intervalo);
            return {
              numero: i + 1,
              valor: i === 0 ? valorParcela + resto : valorParcela,
              vencimento: venc.toISOString().split("T")[0],
              dataPagamento: null,
              valorPago: 0,
              status: "aberta",
              formaPagamento: state.formaPagamento || "",
            };
          });

          const novaConta = {
            id: crypto.randomUUID(),
            tipo: "nfe",
            nfeNumero: parsed.numero,
            nfeChave: parsed.chaveAcesso,
            fornecedor: parsed.emitenteRazao || "FORNECEDOR",
            fornecedorDoc: parsed.emitenteCnpj || "",
            descricao: `${state.tipo} ${parsed.numero} - ${parsed.itens.length} itens`,
            categoria: state.tipo === "CT-e" ? "Frete / Transporte" : "Mercadorias / Estoque",
            dataEmissao: parsed.dataEmissao ? new Date(parsed.dataEmissao).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            valorTotal: parsed.valorTotal,
            parcelas,
            observacao: state.observacao || `Importação automática via ${state.tipo}`,
            status: "aberta",
          };

          existingContas.push(novaConta);
          localStorage.setItem("contas_pagar", JSON.stringify(existingContas));
          contaPagarGerada = true;
          await addLog("conta_pagar_gerada",
            `Conta a Pagar gerada: ${formatCurrency(parsed.valorTotal)} em ${numP}x de ${formatCurrency(valorParcela)} - ${state.condicaoPagamento}`,
            "sucesso", xmlDoc?.id
          );
        } catch (err: any) {
          console.error("Erro ao gerar conta a pagar:", err);
          await addLog("erro_conta_pagar", `Erro ao gerar conta a pagar: ${err.message}`, "erro", xmlDoc?.id);
        }
      }

      await addLog("importacao_completa",
        `${state.tipo} NF ${parsed.numero} importada | Fornecedor: ${!state.fornecedorExiste ? "CRIADO" : "existente"} | ${produtosCriados} prod. criados, ${produtosAtualizados} atualizados | Valor: ${formatCurrency(parsed.valorTotal)}${contaPagarGerada ? ` | Conta a Pagar: ${state.numParcelas}x ${state.condicaoPagamento}` : ""}`,
        "sucesso", xmlDoc?.id
      );

      setState(prev => ({ ...prev, step: "concluido", contaPagarGerada }));
      toast.success(`${state.tipo} NF ${parsed.numero} importada com sucesso!${contaPagarGerada ? " Conta a pagar gerada!" : ""}`);
      fetchRecent();
    } catch (err: any) {
      toast.error("Erro na importação: " + err.message);
      await addLog("erro_importacao", `Erro: ${err.message}`, "erro");
    } finally {
      setLoading(false);
    }
  };

  // ── RENDER ──
  const filteredPendingXmls = pendingXmls.filter(doc => {
    if (!buscaPendente) return true;
    const search = buscaPendente.toLowerCase();
    return (
      doc.numero?.toLowerCase().includes(search) ||
      doc.emitente_razao?.toLowerCase().includes(search) ||
      doc.emitente_cnpj?.includes(search) ||
      doc.chave_acesso?.includes(search)
    );
  });

  const renderUploadStep = () => (
    <div className="space-y-4">
      {/* XMLs pendentes da Gestão XML - única fonte de importação */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Notas Pendentes na Gestão XML
              <Badge variant="secondary">{pendingXmls.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nº, emitente ou CNPJ..."
                  value={buscaPendente}
                  onChange={e => setBuscaPendente(e.target.value)}
                  className="h-8 pl-8 w-[260px] text-xs"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={fetchPendingXmls} disabled={loadingPending}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingPending ? "animate-spin" : ""}`} />Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPendingXmls.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <FileCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
              {pendingXmls.length === 0
                ? <>
                    <p>Nenhuma nota pendente na Gestão XML.</p>
                    <p className="text-xs mt-1">Faça upload de XMLs na tela de <strong>Gestão XML</strong> primeiro.</p>
                    <Button variant="link" className="mt-2" onClick={() => window.location.href = "/fiscal/gestao-xml"}>
                      <FileText className="w-4 h-4 mr-1" />Ir para Gestão XML
                    </Button>
                  </>
                : "Nenhuma nota encontrada com o filtro aplicado."
              }
            </div>
          ) : (
            <ScrollArea className="max-h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>NF/Série</TableHead>
                    <TableHead>Emitente</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Baixado em</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingXmls.map((doc: any) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectPendingXml(doc)}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{doc.tipo_documento}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{doc.numero}/{doc.serie}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{doc.emitente_razao}</TableCell>
                      <TableCell className="font-mono text-[10px]">{formatCnpj(doc.emitente_cnpj || "")}</TableCell>
                      <TableCell className="text-xs">{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(doc.valor_total || 0)}</TableCell>
                      <TableCell className="text-xs">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" disabled={loading}>
                          <ArrowRight className="w-3.5 h-3.5" />Importar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => {
    if (!state.parsed) return null;
    const p = state.parsed;
    return (
      <div className="space-y-4">
        {/* Document type banner */}
        <div className={`rounded-lg p-4 border flex items-center justify-between ${
          state.tipo === "CT-e" ? "bg-blue-500/5 border-blue-500/20" :
          state.tipo === "NFC-e" ? "bg-purple-500/5 border-purple-500/20" :
          "bg-emerald-500/5 border-emerald-500/20"
        }`}>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <div>
              <div className="text-lg font-bold">{state.tipo} — Nº {p.numero}/{p.serie}</div>
              <div className="font-mono text-xs text-muted-foreground">{p.chaveAcesso}</div>
            </div>
          </div>
          <Badge className="text-lg px-3 py-1">{formatCurrency(p.valorTotal)}</Badge>
        </div>

        {/* Supplier & Recipient */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4" />Emitente (Fornecedor)
                {state.fornecedorExiste ?
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Cadastrado</Badge> :
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Novo - será criado</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium">{p.emitenteRazao}</p>
              {p.emitenteFantasia && <p className="text-xs text-muted-foreground">{p.emitenteFantasia}</p>}
              <p className="font-mono text-xs">{formatCnpj(p.emitenteCnpj)} • {p.emitenteUf}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2"><ArrowDownCircle className="w-4 h-4" />Destinatário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm font-medium">{p.destinatarioRazao}</p>
              <p className="font-mono text-xs">{formatCnpj(p.destinatarioCnpj)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { label: "Produtos", value: p.valorProdutos },
            { label: "ICMS", value: p.valorIcms },
            { label: "IPI", value: p.valorIpi },
            { label: "PIS", value: p.valorPis },
            { label: "COFINS", value: p.valorCofins },
            { label: "Frete", value: p.valorFrete },
            { label: "Desconto", value: p.valorDesconto },
            { label: "Total NF", value: p.valorTotal },
          ].map((t, i) => (
            <div key={i} className="bg-muted/20 rounded p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{t.label}</div>
              <div className={`font-mono text-xs font-semibold ${i === 7 ? "text-primary" : ""}`}>{formatCurrency(t.value)}</div>
            </div>
          ))}
        </div>

        {/* CT-e specific fields */}
        {state.tipo === "CT-e" && (
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4" />Dados do CT-e</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Remetente</Label><Input value={state.cteData.remetente} onChange={e => setState(p => ({ ...p, cteData: { ...p.cteData, remetente: e.target.value } }))} /></div>
                <div><Label className="text-xs">Destinatário</Label><Input value={state.cteData.destinatario} onChange={e => setState(p => ({ ...p, cteData: { ...p.cteData, destinatario: e.target.value } }))} /></div>
                <div><Label className="text-xs">Tomador do Frete</Label>
                  <Select value={state.cteData.tomador} onValueChange={v => setState(p => ({ ...p, cteData: { ...p.cteData, tomador: v } }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remetente">Remetente</SelectItem>
                      <SelectItem value="destinatario">Destinatário</SelectItem>
                      <SelectItem value="terceiro">Terceiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Modal de Frete</Label>
                  <Select value={state.cteData.modalFrete} onValueChange={v => setState(p => ({ ...p, cteData: { ...p.cteData, modalFrete: v } }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">Rodoviário</SelectItem>
                      <SelectItem value="02">Aéreo</SelectItem>
                      <SelectItem value="03">Aquaviário</SelectItem>
                      <SelectItem value="04">Ferroviário</SelectItem>
                      <SelectItem value="05">Dutoviário</SelectItem>
                      <SelectItem value="06">Multimodal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products summary */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />Itens ({p.itens.length})
              <Badge variant="secondary" className="ml-2">{state.produtosExistentes.size} existentes</Badge>
              <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">{state.produtosNovos.length} novos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>CFOP</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Unitário</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.itens.map((item, idx) => {
                    const existing = state.produtosExistentes.get(idx);
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{item.numeroItem}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{item.descricao}</TableCell>
                        <TableCell className="font-mono text-[10px]">{item.ncm}</TableCell>
                        <TableCell className="font-mono text-[10px]">{item.cfop}</TableCell>
                        <TableCell className="text-center">
                          {existing ?
                            <Badge className="bg-emerald-500/20 text-emerald-500 text-[9px]">Cadastrado</Badge> :
                            <Badge className="bg-amber-500/20 text-amber-500 text-[9px]">Novo</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{item.quantidade.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px]">{formatCurrency(item.valorUnitario)}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(item.valorTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Import options */}
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Opções de Importação</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Switch checked={state.gerarMovEstoque} onCheckedChange={v => setState(p => ({ ...p, gerarMovEstoque: v }))} />
                <Label className="text-xs flex items-center gap-1"><Package className="w-3.5 h-3.5" />Gerar movimentação de estoque (entrada)</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={state.gerarContaPagar} onCheckedChange={v => setState(p => ({ ...p, gerarContaPagar: v }))} />
                <Label className="text-xs flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />Gerar conta a pagar</Label>
              </div>
            </div>
            {state.gerarContaPagar && (
              <div className="space-y-3 border-t pt-3">
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Condição de Pagamento</Label>
                    <Select value={state.condicaoPagamento} onValueChange={v => {
                      const parcMap: Record<string, { n: number; i: number }> = {
                        "À vista": { n: 1, i: 0 },
                        "30 dias": { n: 1, i: 30 },
                        "30/60": { n: 2, i: 30 },
                        "30/60/90": { n: 3, i: 30 },
                        "30/60/90/120": { n: 4, i: 30 },
                        "Personalizado": { n: state.numParcelas, i: state.intervaloParcelas },
                      };
                      const cfg = parcMap[v] || { n: 1, i: 30 };
                      const baseDate = new Date();
                      baseDate.setDate(baseDate.getDate() + (cfg.i || 30));
                      setState(p => ({ ...p, condicaoPagamento: v, numParcelas: cfg.n, intervaloParcelas: cfg.i || 30, primeiroVencimento: baseDate.toISOString().split("T")[0] }));
                    }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="À vista">À vista</SelectItem>
                        <SelectItem value="30 dias">30 dias</SelectItem>
                        <SelectItem value="30/60">30/60 dias</SelectItem>
                        <SelectItem value="30/60/90">30/60/90 dias</SelectItem>
                        <SelectItem value="30/60/90/120">30/60/90/120 dias</SelectItem>
                        <SelectItem value="Personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nº Parcelas</Label>
                    <Input type="number" min="1" max="24" className="h-9" value={state.numParcelas}
                      onChange={e => setState(p => ({ ...p, numParcelas: Math.max(1, parseInt(e.target.value) || 1), condicaoPagamento: "Personalizado" }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Intervalo (dias)</Label>
                    <Input type="number" min="0" max="180" className="h-9" value={state.intervaloParcelas}
                      onChange={e => setState(p => ({ ...p, intervaloParcelas: parseInt(e.target.value) || 30, condicaoPagamento: "Personalizado" }))} />
                  </div>
                  <div>
                    <Label className="text-xs">1º Vencimento</Label>
                    <Input type="date" className="h-9" value={state.primeiroVencimento}
                      onChange={e => setState(p => ({ ...p, primeiroVencimento: e.target.value }))} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Forma de Pagamento</Label>
                    <Select value={state.formaPagamento} onValueChange={v => setState(p => ({ ...p, formaPagamento: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Boleto", "PIX", "Transferência", "Dinheiro", "Cartão Crédito", "Cheque", "Débito Automático"].map(f => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Observações</Label>
                    <Input value={state.observacao} onChange={e => setState(p => ({ ...p, observacao: e.target.value }))} placeholder="Obs. da importação" />
                  </div>
                </div>
                {/* Preview parcelas */}
                {state.numParcelas > 0 && state.parsed && (
                  <div className="bg-muted/20 rounded-lg p-3">
                    <div className="text-xs font-medium mb-2 text-muted-foreground">Prévia das Parcelas</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Array.from({ length: Math.min(state.numParcelas, 12) }, (_, i) => {
                        const valorTotal = state.parsed?.valorTotal || 0;
                        const valorParc = Math.floor(valorTotal / state.numParcelas * 100) / 100;
                        const resto = Math.round((valorTotal - valorParc * state.numParcelas) * 100) / 100;
                        const venc = new Date();
                        venc.setDate(venc.getDate() + (i + 1) * state.intervaloParcelas);
                        return (
                          <div key={i} className="bg-background rounded p-2 border text-center">
                            <div className="text-[10px] text-muted-foreground">{i + 1}ª parcela</div>
                            <div className="font-mono text-xs font-semibold">{formatCurrency(i === 0 ? valorParc + resto : valorParc)}</div>
                            <div className="text-[10px] text-muted-foreground">{venc.toLocaleDateString("pt-BR")}</div>
                          </div>
                        );
                      })}
                      {state.numParcelas > 12 && <div className="flex items-center justify-center text-xs text-muted-foreground">+{state.numParcelas - 12} parcelas...</div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={resetState}>Cancelar</Button>
          <Button onClick={handleAvancarDesdobramento}>
            <ArrowRight className="w-4 h-4 mr-2" />Avançar para Desdobramento de Custos
          </Button>
        </div>
      </div>
    );
  };

  const renderDesdobramentoStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck className="w-5 h-5" />Desdobramento de Custos</h3>
        <Badge className="text-sm">{state.tipo} — NF {state.parsed?.numero}</Badge>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Rateio de Despesas</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Frete</Label>
              <Input type="number" step="0.01" value={state.rateios.frete}
                onChange={e => recalcularDesdobramento(Number(e.target.value) || 0, state.rateios.seguro, state.rateios.outras)} />
            </div>
            <div>
              <Label className="text-xs">Seguro</Label>
              <Input type="number" step="0.01" value={state.rateios.seguro}
                onChange={e => recalcularDesdobramento(state.rateios.frete, Number(e.target.value) || 0, state.rateios.outras)} />
            </div>
            <div>
              <Label className="text-xs">Outras Despesas</Label>
              <Input type="number" step="0.01" value={state.rateios.outras}
                onChange={e => recalcularDesdobramento(state.rateios.frete, state.rateios.seguro, Number(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Custo Unit.</TableHead>
              <TableHead className="text-right">Rateio</TableHead>
              <TableHead className="text-right">Custo Final</TableHead>
              <TableHead className="text-right w-[90px]">Margem B. %</TableHead>
              <TableHead className="text-right w-[90px]">Margem L. %</TableHead>
              <TableHead className="text-right">Preço Venda</TableHead>
              {state.desdobramentoItens.some(i => i.isNovo) && <>
                <TableHead className="text-right w-[70px]">Est. Mín</TableHead>
                <TableHead className="text-right w-[70px]">Est. Máx</TableHead>
              </>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.desdobramentoItens.map((item, idx) => (
              <TableRow key={idx} className={item.isNovo ? "bg-amber-500/5" : ""}>
                <TableCell className="text-xs">{item.numeroItem}</TableCell>
                <TableCell className="text-xs max-w-[160px] truncate">{item.descricao}</TableCell>
                <TableCell className="text-center">
                  {item.isNovo ?
                    <Badge className="bg-amber-500/20 text-amber-500 text-[9px]">Novo</Badge> :
                    <Badge className="bg-emerald-500/20 text-emerald-500 text-[9px]">Existente</Badge>
                  }
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{formatCurrency(item.valorUnitario)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(item.rateioUnit)}</TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold text-primary">{formatCurrency(item.custoFinal)}</TableCell>
                <TableCell><Input type="number" step="0.5" min="0" max="99" className="h-7 w-full text-xs text-right font-mono"
                  value={item.margemBruta || ""} onChange={e => handleMargemChange(idx, "margemBruta", Number(e.target.value) || 0)} placeholder="0" /></TableCell>
                <TableCell><Input type="number" step="0.5" min="0" max="99" className="h-7 w-full text-xs text-right font-mono"
                  value={item.margemLiquida || ""} onChange={e => handleMargemChange(idx, "margemLiquida", Number(e.target.value) || 0)} placeholder="0" /></TableCell>
                <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(item.precoVendaSugerido)}</TableCell>
                {state.desdobramentoItens.some(i => i.isNovo) && <>
                  <TableCell>
                    {item.isNovo && <Input type="number" className="h-7 w-full text-xs text-right font-mono" value={item.estoqueMinimo}
                      onChange={e => { const v = Number(e.target.value) || 0; setState(p => { const u = [...p.desdobramentoItens]; u[idx] = { ...u[idx], estoqueMinimo: v }; return { ...p, desdobramentoItens: u }; }); }} />}
                  </TableCell>
                  <TableCell>
                    {item.isNovo && <Input type="number" className="h-7 w-full text-xs text-right font-mono" value={item.estoqueMaximo}
                      onChange={e => { const v = Number(e.target.value) || 0; setState(p => { const u = [...p.desdobramentoItens]; u[idx] = { ...u[idx], estoqueMaximo: v }; return { ...p, desdobramentoItens: u }; }); }} />}
                  </TableCell>
                </>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="grid grid-cols-4 gap-3 bg-muted/20 rounded-lg p-3">
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Total Produtos</div><div className="font-mono text-sm font-bold">{formatCurrency(state.parsed?.valorProdutos || 0)}</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Rateio Total</div><div className="font-mono text-sm font-bold">{formatCurrency(state.rateios.frete + state.rateios.seguro + state.rateios.outras)}</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Custo Total</div><div className="font-mono text-sm font-bold text-primary">{formatCurrency(state.desdobramentoItens.reduce((s, it) => s + it.custoFinal * it.quantidade, 0))}</div></div>
        <div className="text-center"><div className="text-[10px] text-muted-foreground">Itens</div><div className="font-mono text-sm font-bold">{state.desdobramentoItens.length}</div></div>
      </div>

      <div className="flex gap-2 justify-end border-t pt-3">
        <Button variant="outline" onClick={() => setState(p => ({ ...p, step: "preview" }))}>Voltar</Button>
        <Button onClick={handleConfirmarImportacao} disabled={loading}>
          <CheckCircle2 className="w-4 h-4 mr-2" />{loading ? "Importando..." : "Confirmar Importação ao ERP"}
        </Button>
      </div>
    </div>
  );

  const renderConcluidoStep = () => (
    <Card>
      <CardContent className="p-12 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
        <h3 className="text-2xl font-bold mb-2">Importação Concluída!</h3>
        <p className="text-muted-foreground mb-2">
          {state.tipo} NF {state.parsed?.numero}/{state.parsed?.serie} — {state.parsed?.emitenteRazao}
        </p>
        <p className="text-lg font-bold text-primary mb-6">{formatCurrency(state.parsed?.valorTotal || 0)}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <div className="bg-muted/30 rounded-lg p-3 text-center min-w-[120px]">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Fornecedor</div>
            <div className="text-sm font-medium">{state.fornecedorExiste ? "Existente" : "Criado"}</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center min-w-[120px]">
            <Package className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Produtos</div>
            <div className="text-sm font-medium">{state.produtosNovos.length} novos / {state.produtosExistentes.size} existentes</div>
          </div>
          {state.gerarMovEstoque && (
            <div className="bg-muted/30 rounded-lg p-3 text-center min-w-[120px]">
              <ArrowDownCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
              <div className="text-xs text-muted-foreground">Estoque</div>
              <div className="text-sm font-medium">Entrada gerada</div>
            </div>
          )}
          {state.contaPagarGerada && (
            <div className="bg-muted/30 rounded-lg p-3 text-center min-w-[120px]">
              <CreditCard className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground">Conta a Pagar</div>
              <div className="text-sm font-medium">{state.numParcelas}x {state.formaPagamento}</div>
              <div className="text-[10px] text-muted-foreground">{state.condicaoPagamento}</div>
            </div>
          )}
        </div>
        <Button className="mt-8" onClick={resetState}><FileInput className="w-4 h-4 mr-2" />Nova Importação</Button>
      </CardContent>
    </Card>
  );

  // Steps indicator
  const steps = [
    { key: "upload", label: "Selecionar Nota", icon: FileCode },
    { key: "preview", label: "Pré-visualização", icon: Eye },
    { key: "desdobramento", label: "Desdobramento", icon: ClipboardCheck },
    { key: "concluido", label: "Concluído", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Importação de Documentos Fiscais" description="Importe notas baixadas na Gestão XML para dar entrada no ERP" />

      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.key === state.step;
          const isPast = steps.findIndex(x => x.key === state.step) > i;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-primary text-primary-foreground" :
                isPast ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as any); if (state.step === "upload") resetState(); }}>
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="NF-e" disabled={state.step !== "upload"}><FileText className="w-4 h-4 mr-1" />NF-e</TabsTrigger>
          <TabsTrigger value="NFC-e" disabled={state.step !== "upload"}><ShoppingCart className="w-4 h-4 mr-1" />NFC-e</TabsTrigger>
          <TabsTrigger value="CT-e" disabled={state.step !== "upload"}><Truck className="w-4 h-4 mr-1" />CT-e</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {state.step === "upload" && renderUploadStep()}
          {state.step === "preview" && renderPreviewStep()}
          {state.step === "desdobramento" && renderDesdobramentoStep()}
          {state.step === "concluido" && renderConcluidoStep()}
        </TabsContent>
      </Tabs>

      {/* Recent imports */}
      {state.step === "upload" && recentImports.length > 0 && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Últimas Importações</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>NF/Série</TableHead>
                  <TableHead>Emitente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data Import.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((doc: any) => (
                  <TableRow key={doc.id}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{doc.tipo_documento}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{doc.numero}/{doc.serie}</TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{doc.emitente_razao}</TableCell>
                    <TableCell className="text-xs">{doc.data_emissao ? new Date(doc.data_emissao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(doc.valor_total || 0)}</TableCell>
                    <TableCell className="text-xs">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
