import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportButtons } from "@/components/ExportButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Play, CheckCircle2,
  XCircle, FlaskConical, Package, AlertTriangle, Clock, Factory, Copy, CalendarIcon, Printer
} from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

// ── Types ──────────────────────────────────────────────────
interface ComposicaoItem {
  produtoId: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
}

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoque: number;
  custoAquisicao: number;
  custoReposicao: number;
  venda: number;
  composicao: ComposicaoItem[];
  ativo: boolean;
  [key: string]: unknown;
}

type StatusOP = "rascunho" | "aguardando" | "em_producao" | "finalizada" | "cancelada";

interface InsumoOP {
  produtoId: string;
  produtoDescricao: string;
  quantidadeNecessaria: number;
  unidade: string;
  custoUnitario: number;
  estoqueDisponivel: number;
}

interface OrdemProducao {
  id: string;
  numero: string;
  produtoId: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
  status: StatusOP;
  insumos: InsumoOP[];
  custoTotal: number;
  observacoes: string;
  dataCriacao: string;
  dataInicio?: string;
  dataFinalizacao?: string;
  // Rendimento / Perda
  percentualPerda: number;
  quantidadeReal?: number;
  perdaReal?: number;
  // Rastreabilidade
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  // Controle de qualidade
  checklistQualidade?: { item: string; ok: boolean }[];
  // Histórico de status
  historicoStatus?: { de: string; para: string; data: string; hora: string }[];
}

const CHECKLIST_QUALIDADE_PADRAO = [
  "Aparência visual conforme padrão",
  "Peso/quantidade dentro da tolerância",
  "Embalagem íntegra e identificada",
  "Temperatura adequada (se aplicável)",
  "Amostra retida para controle",
  "Limpeza do equipamento realizada",
];

function addHistorico(op: OrdemProducao, para: StatusOP): { de: string; para: string; data: string; hora: string }[] {
  const now = new Date();
  return [...(op.historicoStatus || []), {
    de: op.status,
    para,
    data: now.toISOString().split("T")[0],
    hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  }];
}

const statusConfig: Record<StatusOP, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
  aguardando: { label: "Aguardando", color: "bg-amber-500/20 text-amber-600", icon: Clock },
  em_producao: { label: "Em Produção", color: "bg-blue-500/20 text-blue-600", icon: Factory },
  finalizada: { label: "Finalizada", color: "bg-emerald-500/20 text-emerald-600", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

function getProdutos(): Produto[] {
  try {
    const stored = localStorage.getItem("produtos");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function updateProdutoEstoque(produtoId: string, novoEstoque: number) {
  try {
    const stored = localStorage.getItem("produtos");
    if (!stored) return;
    const produtos: Produto[] = JSON.parse(stored);
    const updated = produtos.map(p => p.id === produtoId ? { ...p, estoque: novoEstoque } : p);
    localStorage.setItem("produtos", JSON.stringify(updated));
  } catch { /* silent */ }
}

function registrarMovimentacao(produtoId: string, descricao: string, tipo: "entrada" | "saida", quantidade: number, motivo: string) {
  try {
    const stored = localStorage.getItem("movimentacoes");
    const movs = stored ? JSON.parse(stored) : [];
    movs.push({
      id: crypto.randomUUID(),
      data: new Date().toISOString().split("T")[0],
      tipo,
      produtoId,
      produto: descricao,
      quantidade,
      motivo,
      documento: "",
      observacao: `Ordem de Produção`,
    });
    localStorage.setItem("movimentacoes", JSON.stringify(movs));
  } catch { /* silent */ }
}

const emptyForm = (): Omit<OrdemProducao, "id"> => ({
  numero: "",
  produtoId: "",
  produtoDescricao: "",
  quantidade: 1,
  unidade: "UN",
  status: "rascunho",
  insumos: [],
  custoTotal: 0,
  observacoes: "",
  dataCriacao: new Date().toISOString().split("T")[0],
  percentualPerda: 0,
  lote: "",
  dataFabricacao: new Date().toISOString().split("T")[0],
  dataValidade: "",
});

export default function OrdensProducao() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const { items: ordens, addItem, updateItem, deleteItem } = useLocalStorage<OrdemProducao>("ordens_producao", []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<OrdemProducao, "id">>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [detailOpen, setDetailOpen] = useState<OrdemProducao | null>(null);
  const [finalizarOP, setFinalizarOP] = useState<OrdemProducao | null>(null);
  const [qtdRealFinalizar, setQtdRealFinalizar] = useState(0);
  const [obsFinalizacao, setObsFinalizacao] = useState("");
  const [checklistFinalizar, setChecklistFinalizar] = useState<{ item: string; ok: boolean }[]>([]);

  const produtos = useMemo(() => getProdutos(), [dialogOpen]);
  const produtosComComposicao = produtos.filter(p => p.ativo && p.composicao && p.composicao.length > 0);

  const produtosFiltrados = produtosComComposicao.filter(p =>
    p.descricao.toLowerCase().includes(produtoSearch.toLowerCase()) ||
    p.codigo.includes(produtoSearch)
  );

  const gerarNumero = () => {
    const nums = ordens.map(o => parseInt(o.numero.replace("OP-", ""))).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `OP-${String(max + 1).padStart(5, "0")}`;
  };

  const selecionarProduto = (p: Produto) => {
    const insumosOP: InsumoOP[] = p.composicao.map(c => {
      const prodInsumo = produtos.find(pr => pr.id === c.produtoId);
      return {
        produtoId: c.produtoId,
        produtoDescricao: c.produtoDescricao,
        quantidadeNecessaria: c.quantidade * form.quantidade,
        unidade: c.unidade,
        custoUnitario: c.custoUnitario,
        estoqueDisponivel: prodInsumo?.estoque ?? 0,
      };
    });
    const custoTotal = insumosOP.reduce((acc, i) => acc + i.quantidadeNecessaria * i.custoUnitario, 0);
    setForm(prev => ({
      ...prev,
      produtoId: p.id,
      produtoDescricao: p.descricao,
      unidade: p.unidade,
      insumos: insumosOP,
      custoTotal,
    }));
    setProdutoSearch("");
  };

  const recalcularInsumos = (qtd: number) => {
    if (!form.produtoId) return;
    const p = produtos.find(pr => pr.id === form.produtoId);
    if (!p || !p.composicao) return;
    const insumosOP: InsumoOP[] = p.composicao.map(c => {
      const prodInsumo = produtos.find(pr => pr.id === c.produtoId);
      return {
        produtoId: c.produtoId,
        produtoDescricao: c.produtoDescricao,
        quantidadeNecessaria: c.quantidade * qtd,
        unidade: c.unidade,
        custoUnitario: c.custoUnitario,
        estoqueDisponivel: prodInsumo?.estoque ?? 0,
      };
    });
    const custoTotal = insumosOP.reduce((acc, i) => acc + i.quantidadeNecessaria * i.custoUnitario, 0);
    setForm(prev => ({ ...prev, quantidade: qtd, insumos: insumosOP, custoTotal }));
  };

  const insumosInsuficientes = form.insumos.filter(i => i.estoqueDisponivel < i.quantidadeNecessaria);

  const openNew = () => {
    const f = emptyForm();
    f.numero = gerarNumero();
    setForm(f);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (op: OrdemProducao) => {
    const { id, ...rest } = op;
    // Refresh estoque disponível
    const insumosAtualizados = (rest.insumos || []).map(i => {
      const prodInsumo = produtos.find(p => p.id === i.produtoId);
      return { ...i, estoqueDisponivel: prodInsumo?.estoque ?? 0 };
    });
    setProdutoSearch("");
    setForm({
      ...emptyForm(),
      ...rest,
      insumos: insumosAtualizados,
    });
    setEditingId(id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.produtoId) { toast.error("Selecione um produto para produção"); return; }
    if (form.quantidade <= 0) { toast.error("Quantidade deve ser maior que zero"); return; }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Ordem de produção atualizada!");
    } else {
      addItem(form as Omit<OrdemProducao, "id">);
      toast.success("Ordem de produção criada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
    setDeleteConfirm(null);
    toast.success("Ordem excluída!");
  };

  const duplicarOP = (op: OrdemProducao) => {
    const produtosAtuais = getProdutos();
    const insumosAtualizados = op.insumos.map(i => {
      const prod = produtosAtuais.find(p => p.id === i.produtoId);
      return { ...i, estoqueDisponivel: prod?.estoque ?? 0 };
    });
    const novaOP: Omit<OrdemProducao, "id"> = {
      numero: gerarNumero(),
      produtoId: op.produtoId,
      produtoDescricao: op.produtoDescricao,
      quantidade: op.quantidade,
      unidade: op.unidade,
      status: "rascunho",
      insumos: insumosAtualizados,
      custoTotal: op.custoTotal,
      observacoes: op.observacoes,
      dataCriacao: new Date().toISOString().split("T")[0],
      percentualPerda: op.percentualPerda,
      lote: "",
      dataFabricacao: new Date().toISOString().split("T")[0],
      dataValidade: op.dataValidade || "",
    };
    addItem(novaOP);
    toast.success(`Ordem duplicada! Nova OP: ${novaOP.numero}`);
  };

  const iniciarProducao = (op: OrdemProducao) => {
    // Verificar estoque
    const produtosAtuais = getProdutos();
    for (const insumo of op.insumos) {
      const prod = produtosAtuais.find(p => p.id === insumo.produtoId);
      if (!prod || prod.estoque < insumo.quantidadeNecessaria) {
        toast.error(`Estoque insuficiente de "${insumo.produtoDescricao}" — Disponível: ${prod?.estoque ?? 0} ${insumo.unidade}, Necessário: ${insumo.quantidadeNecessaria} ${insumo.unidade}`);
        return;
      }
    }
    // Dar baixa no estoque dos insumos
    for (const insumo of op.insumos) {
      const prod = produtosAtuais.find(p => p.id === insumo.produtoId)!;
      const novoEstoque = Number((prod.estoque - insumo.quantidadeNecessaria).toFixed(4));
      updateProdutoEstoque(insumo.produtoId, novoEstoque);
      registrarMovimentacao(insumo.produtoId, insumo.produtoDescricao, "saida", insumo.quantidadeNecessaria, "Consumo Produção");
    }
    updateItem(op.id, { status: "em_producao" as StatusOP, dataInicio: new Date().toISOString().split("T")[0], historicoStatus: addHistorico(op, "em_producao") });
    toast.success("Produção iniciada! Estoque dos insumos foi consumido.");
  };

  const abrirFinalizacao = (op: OrdemProducao) => {
    const qtdEstimada = Number((op.quantidade * (1 - (op.percentualPerda || 0) / 100)).toFixed(4));
    setQtdRealFinalizar(qtdEstimada);
    setObsFinalizacao("");
    setChecklistFinalizar(CHECKLIST_QUALIDADE_PADRAO.map(item => ({ item, ok: false })));
    setFinalizarOP(op);
  };

  const confirmarFinalizacao = () => {
    if (!finalizarOP) return;
    const op = finalizarOP;
    const qtdReal = qtdRealFinalizar;
    if (qtdReal <= 0) { toast.error("Quantidade real deve ser maior que zero"); return; }
    const perdaReal = Number((((op.quantidade - qtdReal) / op.quantidade) * 100).toFixed(2));

    // Dar entrada no estoque do produto acabado
    const produtosAtuais = getProdutos();
    const prodAcabado = produtosAtuais.find(p => p.id === op.produtoId);
    if (prodAcabado) {
      const novoEstoque = Number((prodAcabado.estoque + qtdReal).toFixed(4));
      updateProdutoEstoque(op.produtoId, novoEstoque);
      registrarMovimentacao(op.produtoId, op.produtoDescricao, "entrada", qtdReal, "Produção Finalizada");
    }
    updateItem(op.id, {
      status: "finalizada" as StatusOP,
      dataFinalizacao: new Date().toISOString().split("T")[0],
      quantidadeReal: qtdReal,
      perdaReal,
      observacoes: obsFinalizacao ? `${op.observacoes ? op.observacoes + "\n" : ""}[Finalização] ${obsFinalizacao}` : op.observacoes,
      checklistQualidade: checklistFinalizar,
      historicoStatus: addHistorico(op, "finalizada"),
    });
    setFinalizarOP(null);
    toast.success(`Produção finalizada! ${qtdReal} ${op.unidade} de "${op.produtoDescricao}" adicionado ao estoque. Perda real: ${perdaReal}%`);
  };

  const cancelarOP = (op: OrdemProducao) => {
    if (op.status === "em_producao") {
      // Devolver estoque dos insumos
      const produtosAtuais = getProdutos();
      for (const insumo of op.insumos) {
        const prod = produtosAtuais.find(p => p.id === insumo.produtoId);
        if (prod) {
          const novoEstoque = Number((prod.estoque + insumo.quantidadeNecessaria).toFixed(4));
          updateProdutoEstoque(insumo.produtoId, novoEstoque);
          registrarMovimentacao(insumo.produtoId, insumo.produtoDescricao, "entrada", insumo.quantidadeNecessaria, "Cancelamento Produção");
        }
      }
      toast.info("Estoque dos insumos foi devolvido.");
    }
    updateItem(op.id, { status: "cancelada" as StatusOP, historicoStatus: addHistorico(op, "cancelada") });
    toast.success("Ordem de produção cancelada!");
  };

  const filtered = ordens.filter(o => {
    const matchSearch = o.produtoDescricao.toLowerCase().includes(search.toLowerCase()) ||
      o.numero.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || o.status === statusFilter;
    let matchPeriodo = true;
    if (dataInicio || dataFim) {
      const ref = o.dataCriacao ? parseISO(o.dataCriacao) : null;
      if (!ref) { matchPeriodo = false; }
      else {
        if (dataInicio && ref < startOfDay(dataInicio)) matchPeriodo = false;
        if (dataFim && ref > endOfDay(dataFim)) matchPeriodo = false;
      }
    }
    return matchSearch && matchStatus && matchPeriodo;
  });

  // KPIs
  const totalRascunho = ordens.filter(o => o.status === "rascunho").length;
  const totalAguardando = ordens.filter(o => o.status === "aguardando").length;
  const totalEmProducao = ordens.filter(o => o.status === "em_producao").length;
  const totalFinalizadas = ordens.filter(o => o.status === "finalizada").length;

  // Lead time médio (dias entre dataInicio e dataFinalizacao)
  const finalizadasComDatas = ordens.filter(o => o.status === "finalizada" && o.dataInicio && o.dataFinalizacao);
  const leadTimeMedio = finalizadasComDatas.length > 0
    ? finalizadasComDatas.reduce((acc, o) => {
        const inicio = new Date(o.dataInicio!);
        const fim = new Date(o.dataFinalizacao!);
        return acc + Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0) / finalizadasComDatas.length
    : 0;

  const handlePrint = () => {
    const kpis = `
      <div class="info-grid">
        <div class="info-box"><div class="label">Rascunho</div><div class="value">${totalRascunho}</div></div>
        <div class="info-box"><div class="label">Aguardando</div><div class="value">${totalAguardando}</div></div>
        <div class="info-box"><div class="label">Em Produção</div><div class="value">${totalEmProducao}</div></div>
        <div class="info-box"><div class="label">Finalizadas</div><div class="value positive">${totalFinalizadas}</div></div>
        <div class="info-box"><div class="label">Lead Time Médio</div><div class="value">${leadTimeMedio > 0 ? leadTimeMedio.toFixed(1) + " dias" : "—"}</div></div>
        <div class="info-box"><div class="label">Total Filtrado</div><div class="value">${filtered.length}</div></div>
      </div>
    `;
    const totalCusto = filtered.reduce((a, o) => a + o.custoTotal, 0);
    const table = buildPrintTable(
      [
        { label: "Número" }, { label: "Produto" }, { label: "Qtd Plan.", align: "right" },
        { label: "Qtd Real", align: "right" }, { label: "Perda %", align: "right" },
        { label: "Custo Total", align: "right" }, { label: "Lote" }, { label: "Status" }, { label: "Data" },
      ],
      filtered.map(op => {
        const st = statusConfig[op.status];
        return {
          cells: [
            op.numero, op.produtoDescricao,
            `${op.quantidade} ${op.unidade}`,
            op.quantidadeReal != null ? `${op.quantidadeReal} ${op.unidade}` : "—",
            op.perdaReal != null ? `${op.perdaReal}%` : "—",
            printCurrency(op.custoTotal),
            op.lote || "—", st.label,
            op.dataCriacao || "",
          ],
        };
      })
    );
    const totalRow = `<p style="text-align:right;font-weight:700;margin-top:8px;">Total: ${printCurrency(totalCusto)} (${filtered.length} ordens)</p>`;
    const periodo = dataInicio || dataFim
      ? ` · Período: ${dataInicio ? format(dataInicio, "dd/MM/yyyy") : "..."} a ${dataFim ? format(dataFim, "dd/MM/yyyy") : "..."}`
      : "";
    printPDF({
      title: "Ordens de Produção",
      subtitle: `Gerado em ${new Date().toLocaleDateString("pt-BR")}${periodo} — ${filtered.length} ordens`,
      content: kpis + table + totalRow,
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Ordens de Produção"
        description="Gerencie a fabricação de produtos próprios com base na composição/ficha técnica"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={16} className="mr-2" />Imprimir PDF
            </Button>
            <ExportButtons options={{
              title: "Ordens de Produção",
              filename: `OrdensProducao_${new Date().toISOString().split("T")[0]}`,
              columns: [
                { header: "Número", key: "numero" },
                { header: "Produto", key: "produtoDescricao" },
                { header: "Qtd Planejada", key: "quantidade", align: "right" },
                { header: "Qtd Real", key: "quantidadeReal", align: "right" },
                { header: "Unidade", key: "unidade" },
                { header: "Perda %", key: "perdaReal", align: "right" },
                { header: "Custo Total", key: "custoTotal", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                { header: "Status", key: "status" },
                { header: "Lote", key: "lote" },
                { header: "Dt Fabricação", key: "dataFabricacao" },
                { header: "Dt Validade", key: "dataValidade" },
                { header: "Data Criação", key: "dataCriacao" },
              ],
              data: filtered,
            }} thermal />
            <Button onClick={openNew} className="w-full sm:w-auto">
              <Plus size={16} className="mr-2" /> Nova Ordem
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rascunho</p>
          <p className="text-2xl font-bold">{totalRascunho}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Aguardando</p>
          <p className="text-2xl font-bold text-amber-600">{totalAguardando}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Em Produção</p>
          <p className="text-2xl font-bold text-blue-600">{totalEmProducao}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Finalizadas</p>
          <p className="text-2xl font-bold text-emerald-600">{totalFinalizadas}</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock size={12} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Lead Time Médio</p>
          </div>
          <p className={`text-2xl font-bold ${leadTimeMedio <= 1 ? "text-emerald-600" : leadTimeMedio <= 3 ? "text-amber-600" : "text-destructive"}`}>
            {leadTimeMedio > 0 ? `${leadTimeMedio.toFixed(1)}d` : "—"}
          </p>
        </Card>
      </div>

      {/* Painel de Controle de Qualidade */}
      {(() => {
        const opsComChecklist = ordens.filter(o => o.checklistQualidade && o.checklistQualidade.length > 0);
        if (opsComChecklist.length === 0) return null;
        const totalItens = opsComChecklist.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
        const totalAprovados = opsComChecklist.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
        const taxaGeral = totalItens > 0 ? (totalAprovados / totalItens) * 100 : 0;
        const opsComTodosOk = opsComChecklist.filter(o => o.checklistQualidade!.every(c => c.ok)).length;
        const opsComFalha = opsComChecklist.filter(o => o.checklistQualidade!.some(c => !c.ok)).length;

        // Itens com mais reprovações
        const itemFalhas = new Map<string, number>();
        opsComChecklist.forEach(o => o.checklistQualidade!.forEach(c => {
          if (!c.ok) itemFalhas.set(c.item, (itemFalhas.get(c.item) || 0) + 1);
        }));
        const topFalhas = Array.from(itemFalhas.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);

        return (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-primary" /> Controle de Qualidade Consolidado
                </h3>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                  // Detalhamento por OP
                  const opsRows = opsComChecklist.map(o => {
                    const aprovados = o.checklistQualidade!.filter(c => c.ok).length;
                    const total = o.checklistQualidade!.length;
                    const reprovados = o.checklistQualidade!.filter(c => !c.ok).map(c => c.item);
                    return {
                      cells: [
                        o.numero, o.produtoDescricao,
                        `${aprovados}/${total}`,
                        `${((aprovados / total) * 100).toFixed(0)}%`,
                        reprovados.length > 0 ? reprovados.join(", ") : "—",
                      ]
                    };
                  });
                  const opsTable = buildPrintTable(
                    [{ label: "OP" }, { label: "Produto" }, { label: "Aprovados" }, { label: "Taxa", align: "right" }, { label: "Itens Reprovados" }],
                    opsRows
                  );
                  const falhasRows = topFalhas.map(([item, count]) => ({ cells: [item, `${count}`] }));
                  const falhasTable = topFalhas.length > 0 ? `<h3 style="font-size:13px;font-weight:600;margin:16px 0 6px">Itens com Mais Reprovações</h3>` + buildPrintTable(
                    [{ label: "Item de Qualidade" }, { label: "Reprovações", align: "right" }],
                    falhasRows
                  ) : "";
                  const kpis = `
                    <div class="info-grid">
                      <div class="info-box"><div class="label">Taxa Aprovação</div><div class="value ${taxaGeral >= 90 ? "positive" : taxaGeral < 70 ? "negative" : ""}">${taxaGeral.toFixed(1)}%</div></div>
                      <div class="info-box"><div class="label">OPs Avaliadas</div><div class="value">${opsComChecklist.length}</div></div>
                      <div class="info-box"><div class="label">100% Aprovadas</div><div class="value positive">${opsComTodosOk}</div></div>
                      <div class="info-box"><div class="label">Com Reprovações</div><div class="value negative">${opsComFalha}</div></div>
                    </div>
                  `;
                  printPDF({
                    title: "Relatório de Controle de Qualidade",
                    subtitle: `Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${opsComChecklist.length} ordens avaliadas`,
                    content: kpis + `<h3 style="font-size:13px;font-weight:600;margin:16px 0 6px">Detalhamento por Ordem</h3>` + opsTable + falhasTable,
                  });
                }}>
                  <Printer size={14} className="mr-1" /> Imprimir PDF
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa Aprovação</p>
                  <p className={`text-2xl font-bold ${taxaGeral >= 90 ? "text-emerald-600" : taxaGeral >= 70 ? "text-amber-600" : "text-destructive"}`}>
                    {taxaGeral.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">OPs Avaliadas</p>
                  <p className="text-2xl font-bold">{opsComChecklist.length}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">100% Aprovadas</p>
                  <p className="text-2xl font-bold text-emerald-600">{opsComTodosOk}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Com Reprovações</p>
                  <p className="text-2xl font-bold text-destructive">{opsComFalha}</p>
                </div>
              </div>
              {topFalhas.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Itens com Mais Reprovações</p>
                  <div className="space-y-1.5">
                    {topFalhas.map(([item, count], i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/20">
                        <span className="text-sm truncate flex-1">{item}</span>
                        <Badge variant="destructive" className="text-[10px] h-5 ml-2">{count}x</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Tendência de qualidade mensal */}
              {(() => {
                const porMes = new Map<string, { aprovados: number; total: number }>();
                opsComChecklist.forEach(o => {
                  const dt = o.dataFinalizacao || o.dataCriacao;
                  const mes = dt.slice(0, 7); // YYYY-MM
                  const prev = porMes.get(mes) || { aprovados: 0, total: 0 };
                  const ok = o.checklistQualidade!.filter(c => c.ok).length;
                  const t = o.checklistQualidade!.length;
                  porMes.set(mes, { aprovados: prev.aprovados + ok, total: prev.total + t });
                });
                const dadosMensais = Array.from(porMes.entries())
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([mes, v]) => ({
                    mes: format(parseISO(mes + "-01"), "MMM/yy", { locale: ptBR }),
                    taxa: v.total > 0 ? Math.round((v.aprovados / v.total) * 100) : 0,
                    ops: 0, // placeholder
                  }));
                if (dadosMensais.length < 2) return null;
                const ultimo = dadosMensais[dadosMensais.length - 1].taxa;
                const penultimo = dadosMensais[dadosMensais.length - 2].taxa;
                const diff = ultimo - penultimo;
                return (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tendência Mensal de Qualidade</p>
                      <span className={`text-xs font-semibold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {diff > 0 ? "▲" : diff < 0 ? "▼" : "—"} {Math.abs(diff)}pp vs mês anterior
                      </span>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={dadosMensais}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" unit="%" width={35} />
                        <RechartsTooltip formatter={(v: number) => [`${v}%`, "Aprovação"]} />
                        <Line type="monotone" dataKey="taxa" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        );
      })()}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por número ou produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-36 justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-36 justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {(dataInicio || dataFim) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
                Limpar datas
              </Button>
            )}
          </div>

          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(op => {
                  const st = statusConfig[op.status];
                  const StIcon = st.icon;
                  return (
                    <TableRow key={op.id} className="cursor-pointer" onClick={() => setDetailOpen(op)}>
                      <TableCell className="font-mono font-medium">{op.numero}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <FlaskConical size={14} className="text-primary shrink-0" />
                          <span className="truncate max-w-[200px]">{op.produtoDescricao}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{op.quantidade} {op.unidade}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrencyBRL(op.custoTotal)}</TableCell>
                      <TableCell>
                        <Badge className={`${st.color} gap-1 border-0`}>
                          <StIcon size={12} />{st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{op.dataCriacao}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(op.status === "rascunho" || op.status === "aguardando") && (
                              <DropdownMenuItem onClick={() => openEdit(op)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                            )}
                            {(op.status === "rascunho") && (
                              <DropdownMenuItem onClick={() => { updateItem(op.id, { status: "aguardando" as StatusOP, historicoStatus: addHistorico(op, "aguardando") }); toast.success("Status atualizado para Aguardando"); }}>
                                <Clock size={14} className="mr-2" />Liberar
                              </DropdownMenuItem>
                            )}
                            {op.status === "aguardando" && (
                              <DropdownMenuItem onClick={() => iniciarProducao(op)}>
                                <Play size={14} className="mr-2" />Iniciar Produção
                              </DropdownMenuItem>
                            )}
                            {op.status === "em_producao" && (
                              <DropdownMenuItem onClick={() => abrirFinalizacao(op)}>
                                <CheckCircle2 size={14} className="mr-2" />Finalizar
                              </DropdownMenuItem>
                            )}
                            {(op.status !== "finalizada" && op.status !== "cancelada") && (
                              <DropdownMenuItem className="text-destructive" onClick={() => cancelarOP(op)}>
                                <XCircle size={14} className="mr-2" />Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => duplicarOP(op)}>
                              <Copy size={14} className="mr-2" />Duplicar
                            </DropdownMenuItem>
                            {op.status === "rascunho" && (
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(op.id)}>
                                <Trash2 size={14} className="mr-2" />Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma ordem de produção encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── New/Edit Dialog ──────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory size={20} className="text-primary" />
              {editingId ? "Editar Ordem de Produção" : "Nova Ordem de Produção"}
              <Badge variant="outline" className="font-mono ml-2">{form.numero}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Produto seleção */}
            <div className="space-y-2">
              <Label>Produto a Fabricar *</Label>
              {form.produtoId ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
                  <FlaskConical size={18} className="text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{form.produtoDescricao}</p>
                    <p className="text-xs text-muted-foreground">{form.insumos.length} insumo(s) na composição</p>
                  </div>
                  {!editingId && (
                    <Button variant="ghost" size="sm" onClick={() => setForm(prev => ({ ...prev, produtoId: "", produtoDescricao: "", insumos: [], custoTotal: 0 }))}>
                      Trocar
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={produtoSearch}
                      onChange={e => setProdutoSearch(e.target.value)}
                      placeholder="Buscar produto com composição..."
                      className="pl-9"
                    />
                  </div>
                  {produtosComComposicao.length === 0 ? (
                    <Card className="p-4 text-center border-dashed">
                      <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                      <p className="text-sm font-medium">Nenhum produto com composição cadastrada</p>
                      <p className="text-xs text-muted-foreground mt-1">Cadastre a ficha técnica (composição) no cadastro de Produtos primeiro.</p>
                    </Card>
                  ) : (
                    <div className="border rounded-md max-h-[200px] overflow-y-auto">
                      {produtosFiltrados.slice(0, 15).map(p => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b last:border-b-0"
                          onClick={() => selecionarProduto(p)}
                        >
                          <div className="flex items-center gap-2">
                            <FlaskConical size={14} className="text-primary" />
                            <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                            <span>{p.descricao}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{p.composicao.length} insumos</Badge>
                            <Plus size={14} className="text-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Quantidade */}
            {form.produtoId && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade a Produzir *</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={form.quantidade}
                    onChange={e => recalcularInsumos(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Input value={form.unidade} readOnly className="bg-muted/50" />
                </div>
                <div>
                  <Label>% Perda Estimada</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.percentualPerda}
                    onChange={e => setForm(prev => ({ ...prev, percentualPerda: Number(e.target.value) }))}
                  />
                  {form.percentualPerda > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Rendimento estimado: <strong>{(form.quantidade * (1 - form.percentualPerda / 100)).toFixed(2)} {form.unidade}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Insumos */}
            {form.insumos.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Package size={14} />Insumos Necessários
                </Label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead className="text-right">Necessário</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">Custo Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.insumos.map((ins, i) => {
                        const insuficiente = ins.estoqueDisponivel < ins.quantidadeNecessaria;
                        return (
                          <TableRow key={i} className={insuficiente ? "bg-destructive/5" : ""}>
                            <TableCell className="text-sm">{ins.produtoDescricao}</TableCell>
                            <TableCell className="text-right font-mono">{ins.quantidadeNecessaria.toFixed(3)} {ins.unidade}</TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={insuficiente ? "text-destructive font-bold" : ""}>
                                {ins.estoqueDisponivel} {ins.unidade}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">{formatCurrencyBRL(ins.custoUnitario)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrencyBRL(ins.quantidadeNecessaria * ins.custoUnitario)}</TableCell>
                            <TableCell>
                              {insuficiente && <AlertTriangle size={14} className="text-destructive" />}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {insumosInsuficientes.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                    <AlertTriangle size={16} className="text-destructive shrink-0" />
                    <p className="text-xs text-destructive">
                      {insumosInsuficientes.length} insumo(s) com estoque insuficiente. A produção não poderá ser iniciada.
                    </p>
                  </div>
                )}

                {/* Custo total */}
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Custo Total da Produção</p>
                    <p className="text-xl font-bold text-primary">{formatCurrencyBRL(form.custoTotal)}</p>
                  </div>
                  {form.quantidade > 1 && (
                    <p className="text-xs text-muted-foreground text-right">
                      Custo unitário: {formatCurrencyBRL(form.custoTotal / form.quantidade)}
                    </p>
                  )}
                </Card>
              </div>
            )}

            {/* Lote / Validade */}
            {form.produtoId && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Lote</Label>
                  <Input
                    value={form.lote}
                    onChange={e => setForm(prev => ({ ...prev, lote: e.target.value.toUpperCase() }))}
                    placeholder="Ex: LT-2026-001"
                  />
                </div>
                <div>
                  <Label>Data Fabricação</Label>
                  <Input
                    type="date"
                    value={form.dataFabricacao}
                    onChange={e => setForm(prev => ({ ...prev, dataFabricacao: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Data Validade</Label>
                  <Input
                    type="date"
                    value={form.dataValidade}
                    onChange={e => setForm(prev => ({ ...prev, dataValidade: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações sobre esta ordem de produção..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Criar Ordem"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ──────────────────────────── */}
      <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] overflow-y-auto">
          {detailOpen && (() => {
            const st = statusConfig[detailOpen.status];
            const StIcon = st.icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Factory size={20} className="text-primary" />
                    {detailOpen.numero}
                    <Badge className={`${st.color} gap-1 border-0 ml-2`}><StIcon size={12} />{st.label}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Lote/Validade */}
                  {(detailOpen.lote || detailOpen.dataValidade) && (
                    <div className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-md border border-dashed">
                      {detailOpen.lote && (
                        <Badge variant="outline" className="font-mono text-xs">Lote: {detailOpen.lote}</Badge>
                      )}
                      {detailOpen.dataFabricacao && (
                        <span className="text-xs text-muted-foreground">Fab: {detailOpen.dataFabricacao}</span>
                      )}
                      {detailOpen.dataValidade && (
                        <span className="text-xs text-muted-foreground">Val: {detailOpen.dataValidade}</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Produto</p>
                      <p className="font-medium">{detailOpen.produtoDescricao}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Quantidade</p>
                      <p className="font-mono font-medium">{detailOpen.quantidade} {detailOpen.unidade}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data Criação</p>
                      <p className="text-sm">{detailOpen.dataCriacao}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="font-mono font-bold text-primary">{formatCurrencyBRL(detailOpen.custoTotal)}</p>
                    </div>
                    {detailOpen.dataInicio && (
                      <div>
                        <p className="text-xs text-muted-foreground">Início Produção</p>
                        <p className="text-sm">{detailOpen.dataInicio}</p>
                      </div>
                    )}
                    {detailOpen.dataFinalizacao && (
                      <div>
                        <p className="text-xs text-muted-foreground">Finalização</p>
                        <p className="text-sm">{detailOpen.dataFinalizacao}</p>
                      </div>
                    )}
                    {detailOpen.percentualPerda > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Perda Estimada</p>
                        <p className="text-sm font-medium">{detailOpen.percentualPerda}%</p>
                      </div>
                    )}
                    {detailOpen.quantidadeReal != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Qtd Real Produzida</p>
                        <p className="font-mono font-medium">{detailOpen.quantidadeReal} {detailOpen.unidade}</p>
                      </div>
                    )}
                    {detailOpen.perdaReal != null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Perda Real</p>
                        <p className={`font-mono font-bold ${detailOpen.perdaReal > 10 ? "text-destructive" : "text-amber-600"}`}>{detailOpen.perdaReal}%</p>
                      </div>
                    )}
                    {detailOpen.quantidadeReal != null && detailOpen.custoTotal > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Custo Unit. Real</p>
                        <p className="font-mono font-bold text-primary">{formatCurrencyBRL(detailOpen.custoTotal / detailOpen.quantidadeReal)}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Insumos Consumidos</p>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Insumo</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Custo Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailOpen.insumos.map((ins, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm">{ins.produtoDescricao}</TableCell>
                              <TableCell className="text-right font-mono">{ins.quantidadeNecessaria.toFixed(3)} {ins.unidade}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrencyBRL(ins.custoUnitario)}</TableCell>
                              <TableCell className="text-right font-mono font-medium">{formatCurrencyBRL(ins.quantidadeNecessaria * ins.custoUnitario)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {detailOpen.checklistQualidade && detailOpen.checklistQualidade.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-primary" /> Controle de Qualidade
                      </p>
                      <div className="space-y-1 p-2.5 rounded-md border border-border bg-muted/20">
                        {detailOpen.checklistQualidade.map((ck, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {ck.ok ? (
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle size={14} className="text-destructive shrink-0" />
                            )}
                            <span className={ck.ok ? "text-foreground" : "text-muted-foreground"}>{ck.item}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {detailOpen.checklistQualidade.filter(c => c.ok).length}/{detailOpen.checklistQualidade.length} itens aprovados
                      </p>
                    </div>
                  )}

                  {detailOpen.historicoStatus && detailOpen.historicoStatus.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Clock size={14} className="text-muted-foreground" /> Histórico de Status
                      </p>
                      <div className="relative pl-4 border-l-2 border-border space-y-3">
                        {detailOpen.historicoStatus.map((h, i) => {
                          const stPara = statusConfig[h.para as StatusOP];
                          return (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background bg-primary" />
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={`${(statusConfig[h.de as StatusOP]?.color || "bg-muted text-muted-foreground")} border-0 text-[10px] h-5`}>
                                  {statusConfig[h.de as StatusOP]?.label || h.de}
                                </Badge>
                                <span className="text-xs text-muted-foreground">→</span>
                                <Badge className={`${(stPara?.color || "bg-muted text-muted-foreground")} border-0 text-[10px] h-5`}>
                                  {stPara?.label || h.para}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground ml-auto">{h.data} {h.hora}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {detailOpen.observacoes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm whitespace-pre-line">{detailOpen.observacoes}</p>
                    </div>
                  )}

                  <Button variant="outline" className="w-full" onClick={() => {
                    const op = detailOpen;
                    const st = statusConfig[op.status];
                    const infoRows = [
                      ["Produto", op.produtoDescricao],
                      ["Quantidade Planejada", `${op.quantidade} ${op.unidade}`],
                      op.quantidadeReal != null ? ["Quantidade Real", `${op.quantidadeReal} ${op.unidade}`] : null,
                      ["Custo Total", printCurrency(op.custoTotal)],
                      op.quantidadeReal ? ["Custo Unitário Real", printCurrency(op.custoTotal / op.quantidadeReal)] : null,
                      ["Status", st.label],
                      ["Data Criação", op.dataCriacao || "—"],
                      op.dataInicio ? ["Início Produção", op.dataInicio] : null,
                      op.dataFinalizacao ? ["Finalização", op.dataFinalizacao] : null,
                      ["Perda Estimada", `${op.percentualPerda}%`],
                      op.perdaReal != null ? ["Perda Real", `${op.perdaReal}%`] : null,
                      op.lote ? ["Lote", op.lote] : null,
                      op.dataFabricacao ? ["Data Fabricação", op.dataFabricacao] : null,
                      op.dataValidade ? ["Data Validade", op.dataValidade] : null,
                    ].filter(Boolean) as string[][];

                    const infoTable = infoRows.map(([l, v]) =>
                      `<tr><td style="padding:4px 12px 4px 0;font-weight:600;font-size:11px;color:#555;white-space:nowrap">${l}</td><td style="padding:4px 0;font-size:12px">${v}</td></tr>`
                    ).join("");

                    const insumosTable = buildPrintTable(
                      [{ label: "Insumo" }, { label: "Quantidade", align: "right" }, { label: "Custo Unit.", align: "right" }, { label: "Subtotal", align: "right" }],
                      op.insumos.map(ins => ({
                        cells: [ins.produtoDescricao, `${ins.quantidadeNecessaria.toFixed(3)} ${ins.unidade}`, printCurrency(ins.custoUnitario), printCurrency(ins.quantidadeNecessaria * ins.custoUnitario)]
                      }))
                    );

                    const obs = op.observacoes ? `<div style="margin-top:16px;padding:8px 12px;background:#f8f8f8;border-radius:6px;border:1px solid #eee"><p style="font-size:10px;color:#888;margin:0 0 4px">Observações</p><p style="font-size:12px;margin:0;white-space:pre-line">${op.observacoes}</p></div>` : "";

                    // Checklist de qualidade
                    let checklistHtml = "";
                    if (op.checklistQualidade && op.checklistQualidade.length > 0) {
                      const items = op.checklistQualidade.map(ck =>
                        `<tr><td style="padding:3px 8px;font-size:12px">${ck.ok ? "✅" : "❌"} ${ck.item}</td></tr>`
                      ).join("");
                      const aprovados = op.checklistQualidade.filter(c => c.ok).length;
                      checklistHtml = `<h3 style="font-size:13px;font-weight:600;margin:16px 0 6px">Controle de Qualidade (${aprovados}/${op.checklistQualidade.length})</h3><table style="width:100%;border:1px solid #ddd;border-radius:6px;border-collapse:collapse">${items}</table>`;
                    }

                    // Histórico de status
                    let historicoHtml = "";
                    if (op.historicoStatus && op.historicoStatus.length > 0) {
                      const rows = op.historicoStatus.map(h => {
                        const deLabel = statusConfig[h.de as StatusOP]?.label || h.de;
                        const paraLabel = statusConfig[h.para as StatusOP]?.label || h.para;
                        return `<tr><td style="padding:3px 8px;font-size:11px;color:#555">${h.data} ${h.hora}</td><td style="padding:3px 8px;font-size:12px">${deLabel} → ${paraLabel}</td></tr>`;
                      }).join("");
                      historicoHtml = `<h3 style="font-size:13px;font-weight:600;margin:16px 0 6px">Histórico de Status</h3><table style="width:100%;border:1px solid #ddd;border-radius:6px;border-collapse:collapse">${rows}</table>`;
                    }

                    printPDF({
                      title: `Ordem de Produção ${op.numero}`,
                      subtitle: `${st.label} · Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
                      content: `<table style="margin-bottom:16px">${infoTable}</table><h3 style="font-size:13px;font-weight:600;margin:12px 0 6px">Insumos</h3>${insumosTable}<p style="text-align:right;font-weight:700;margin-top:8px;font-size:12px">Total: ${printCurrency(op.custoTotal)}</p>${checklistHtml}${historicoHtml}${obs}`,
                    });
                  }}>
                    <Printer size={16} className="mr-2" /> Imprimir Ordem
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Finalizar Produção Dialog ──────────────── */}
      <Dialog open={!!finalizarOP} onOpenChange={() => setFinalizarOP(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-emerald-600" />
              Finalizar Produção
            </DialogTitle>
          </DialogHeader>
          {finalizarOP && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Produto</p>
                <p className="font-medium">{finalizarOP.produtoDescricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Qtd Planejada</p>
                  <p className="font-mono font-medium">{finalizarOP.quantidade} {finalizarOP.unidade}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Perda Estimada</p>
                  <p className="font-mono">{finalizarOP.percentualPerda}%</p>
                </div>
              </div>
              <div>
                <Label>Quantidade Real Produzida *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={qtdRealFinalizar}
                  onChange={e => setQtdRealFinalizar(Number(e.target.value))}
                  autoFocus
                />
                {qtdRealFinalizar > 0 && qtdRealFinalizar < finalizarOP.quantidade && (
                  <div className="mt-2 p-2 bg-amber-500/10 rounded-md">
                    <p className="text-xs text-amber-700 font-medium">
                      Perda: {(finalizarOP.quantidade - qtdRealFinalizar).toFixed(4)} {finalizarOP.unidade} ({(((finalizarOP.quantidade - qtdRealFinalizar) / finalizarOP.quantidade) * 100).toFixed(2)}%)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Custo unitário real: {formatCurrencyBRL(finalizarOP.custoTotal / qtdRealFinalizar)}
                    </p>
                  </div>
                )}
                {qtdRealFinalizar > finalizarOP.quantidade && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Rendimento acima do esperado! +{(qtdRealFinalizar - finalizarOP.quantidade).toFixed(4)} {finalizarOP.unidade}
                  </p>
                )}
              </div>

              {/* Checklist de Qualidade */}
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={14} className="text-primary" /> Controle de Qualidade
                </Label>
                <div className="space-y-2 p-3 rounded-md border border-border bg-muted/20">
                  {checklistFinalizar.map((ck, i) => (
                    <label key={i} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={ck.ok}
                        onCheckedChange={(v) => {
                          setChecklistFinalizar(prev => prev.map((c, idx) => idx === i ? { ...c, ok: !!v } : c));
                        }}
                      />
                      <span className={ck.ok ? "text-foreground" : "text-muted-foreground"}>{ck.item}</span>
                    </label>
                  ))}
                </div>
                {checklistFinalizar.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {checklistFinalizar.filter(c => c.ok).length}/{checklistFinalizar.length} itens verificados
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm">Observações da Finalização</Label>
                <Textarea
                  placeholder="Registre ocorrências, ajustes ou observações sobre esta produção..."
                  value={obsFinalizacao}
                  onChange={e => setObsFinalizacao(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizarOP(null)}>Cancelar</Button>
            <Button onClick={confirmarFinalizacao}>Confirmar Finalização</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir esta ordem de produção?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
