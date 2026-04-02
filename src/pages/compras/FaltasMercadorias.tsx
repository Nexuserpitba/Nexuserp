import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Trash2, Edit, AlertCircle, PackageX, ShoppingCart, FileText, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ExportButtons } from "@/components/ExportButtons";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FaltaMercadoria {
  id: string;
  dataRegistro: string;
  produto: string;
  codigo: string;
  quantidadeFalta: number;
  unidade: string;
  fornecedor: string;
  motivoFalta: string;
  previsaoEntrega: string;
  prioridade: "baixa" | "media" | "alta" | "critica";
  status: "pendente" | "em_cotacao" | "pedido_realizado" | "resolvida";
  observacao: string;
}

const motivosFalta = [
  "Ruptura de estoque",
  "Atraso do fornecedor",
  "Demanda acima do previsto",
  "Falha no pedido de compra",
  "Produto descontinuado",
  "Problema logístico",
  "Sazonalidade",
  "Outro",
];

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 60%)",
  "hsl(180, 50%, 45%)",
];

const defaultFaltas: Omit<FaltaMercadoria, "id">[] = [
  { dataRegistro: "2026-01-10", produto: "ARROZ TIPO 1 5KG", codigo: "00023", quantidadeFalta: 50, unidade: "UN", fornecedor: "DISTRIBUIDORA ALIMENTOS LTDA", motivoFalta: "Atraso do fornecedor", previsaoEntrega: "2026-01-20", prioridade: "alta", status: "resolvida", observacao: "" },
  { dataRegistro: "2026-01-25", produto: "FEIJÃO CARIOCA 1KG", codigo: "00024", quantidadeFalta: 80, unidade: "UN", fornecedor: "DISTRIBUIDORA ALIMENTOS LTDA", motivoFalta: "Ruptura de estoque", previsaoEntrega: "2026-02-05", prioridade: "critica", status: "resolvida", observacao: "" },
  { dataRegistro: "2026-02-08", produto: "PAPEL TOALHA FOLHA DUPLA", codigo: "00089", quantidadeFalta: 100, unidade: "UN", fornecedor: "HIGIENE & CIA", motivoFalta: "Ruptura de estoque", previsaoEntrega: "", prioridade: "media", status: "em_cotacao", observacao: "Cotando com 3 fornecedores" },
  { dataRegistro: "2026-02-20", produto: "SABÃO EM PÓ 1KG", codigo: "00112", quantidadeFalta: 40, unidade: "UN", fornecedor: "HIGIENE & CIA", motivoFalta: "Demanda acima do previsto", previsaoEntrega: "2026-03-01", prioridade: "alta", status: "pedido_realizado", observacao: "" },
  { dataRegistro: "2026-03-05", produto: "CAFÉ TORRADO E MOÍDO 500G", codigo: "00156", quantidadeFalta: 30, unidade: "UN", fornecedor: "", motivoFalta: "Demanda acima do previsto", previsaoEntrega: "", prioridade: "critica", status: "pendente", observacao: "Produto com alta saída no período" },
  { dataRegistro: "2026-03-10", produto: "ARROZ TIPO 1 5KG", codigo: "00023", quantidadeFalta: 60, unidade: "UN", fornecedor: "DISTRIBUIDORA ALIMENTOS LTDA", motivoFalta: "Atraso do fornecedor", previsaoEntrega: "2026-03-18", prioridade: "alta", status: "pedido_realizado", observacao: "Pedido #1234 enviado" },
  { dataRegistro: "2026-03-12", produto: "ÓLEO DE SOJA 900ML", codigo: "00055", quantidadeFalta: 25, unidade: "UN", fornecedor: "", motivoFalta: "Sazonalidade", previsaoEntrega: "", prioridade: "media", status: "pendente", observacao: "" },
];

export default function FaltasMercadorias() {
  const { items: faltas, addItem: addFalta, updateItem: updateFalta, deleteItem: deleteFalta } = useLocalStorage<FaltaMercadoria>("faltas_mercadorias", defaultFaltas as FaltaMercadoria[]);
  const [busca, setBusca] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<FaltaMercadoria | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [faltasParaPedido, setFaltasParaPedido] = useState<FaltaMercadoria[]>([]);

  const [form, setForm] = useState({
    dataRegistro: new Date().toISOString().split("T")[0],
    produto: "",
    codigo: "",
    quantidadeFalta: "",
    unidade: "UN",
    fornecedor: "",
    motivoFalta: "",
    previsaoEntrega: "",
    prioridade: "media" as FaltaMercadoria["prioridade"],
    observacao: "",
  });

  const faltasFiltradas = faltas.filter((f) => {
    const matchBusca = f.produto.toLowerCase().includes(busca.toLowerCase()) || f.codigo.includes(busca) || f.fornecedor.toLowerCase().includes(busca.toLowerCase());
    const matchPrioridade = filtroPrioridade === "todos" || f.prioridade === filtroPrioridade;
    const matchStatus = filtroStatus === "todos" || f.status === filtroStatus;
    return matchBusca && matchPrioridade && matchStatus;
  });

  const totalPendentes = faltas.filter((f) => f.status === "pendente").length;
  const totalCriticas = faltas.filter((f) => f.prioridade === "critica" && f.status !== "resolvida").length;

  // Faltas elegíveis para pedido (pendente ou em_cotacao, com fornecedor)
  const faltasElegiveis = faltasFiltradas.filter(f => f.status === "pendente" || f.status === "em_cotacao");

  const chartPorMes = useMemo(() => {
    const meses: Record<string, number> = {};
    faltas.forEach((f) => {
      const mes = f.dataRegistro.substring(0, 7);
      meses[mes] = (meses[mes] || 0) + f.quantidadeFalta;
    });
    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, qtd]) => {
        const [y, m] = mes.split("-");
        return { mes: `${m}/${y}`, quantidade: qtd };
      });
  }, [faltas]);

  const chartPorMotivo = useMemo(() => {
    const motivos: Record<string, number> = {};
    faltas.forEach((f) => {
      motivos[f.motivoFalta] = (motivos[f.motivoFalta] || 0) + f.quantidadeFalta;
    });
    return Object.entries(motivos)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [faltas]);

  // Relatório de faltas recorrentes por produto
  const faltasRecorrentes = useMemo(() => {
    const produtos: Record<string, { produto: string; codigo: string; ocorrencias: number; qtdTotal: number; ultimaFalta: string; motivos: Set<string>; fornecedores: Set<string> }> = {};
    faltas.forEach((f) => {
      const key = f.codigo || f.produto;
      if (!produtos[key]) {
        produtos[key] = { produto: f.produto, codigo: f.codigo, ocorrencias: 0, qtdTotal: 0, ultimaFalta: "", motivos: new Set(), fornecedores: new Set() };
      }
      produtos[key].ocorrencias++;
      produtos[key].qtdTotal += f.quantidadeFalta;
      if (f.dataRegistro > produtos[key].ultimaFalta) produtos[key].ultimaFalta = f.dataRegistro;
      produtos[key].motivos.add(f.motivoFalta);
      if (f.fornecedor) produtos[key].fornecedores.add(f.fornecedor);
    });
    return Object.values(produtos)
      .filter(p => p.ocorrencias >= 2)
      .sort((a, b) => b.ocorrencias - a.ocorrencias);
  }, [faltas]);

  const resetForm = () => {
    setForm({ dataRegistro: new Date().toISOString().split("T")[0], produto: "", codigo: "", quantidadeFalta: "", unidade: "UN", fornecedor: "", motivoFalta: "", previsaoEntrega: "", prioridade: "media", observacao: "" });
    setEditando(null);
  };

  const handleSalvar = () => {
    if (!form.produto || !form.motivoFalta || !form.quantidadeFalta) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (editando) {
      updateFalta(editando.id, { ...form, quantidadeFalta: parseFloat(form.quantidadeFalta) });
      toast.success("Registro atualizado com sucesso");
    } else {
      addFalta({ ...form, quantidadeFalta: parseFloat(form.quantidadeFalta), status: "pendente" });
      toast.success("Falta registrada com sucesso");
    }
    resetForm();
    setModalAberto(false);
  };

  const handleEditar = (falta: FaltaMercadoria) => {
    setEditando(falta);
    setForm({
      dataRegistro: falta.dataRegistro, produto: falta.produto, codigo: falta.codigo,
      quantidadeFalta: String(falta.quantidadeFalta), unidade: falta.unidade, fornecedor: falta.fornecedor,
      motivoFalta: falta.motivoFalta, previsaoEntrega: falta.previsaoEntrega, prioridade: falta.prioridade, observacao: falta.observacao,
    });
    setModalAberto(true);
  };

  const handleExcluir = (id: string) => {
    deleteFalta(id);
    toast.success("Registro excluído");
  };

  // Abre confirmação para pedido individual
  const handleConfirmarPedidoUnico = (falta: FaltaMercadoria) => {
    if (!falta.fornecedor) {
      toast.error("Informe o fornecedor antes de gerar o pedido de compra");
      return;
    }
    setFaltasParaPedido([falta]);
    setConfirmacaoAberta(true);
  };

  // Abre confirmação para pedidos consolidados (seleção múltipla)
  const handleConfirmarPedidoMultiplo = () => {
    const selecionadosList = faltas.filter(f => selecionados.has(f.id));
    const semFornecedor = selecionadosList.filter(f => !f.fornecedor);
    if (semFornecedor.length > 0) {
      toast.error(`${semFornecedor.length} item(ns) sem fornecedor: ${semFornecedor.map(f => f.produto).join(", ")}. Informe o fornecedor antes de gerar pedidos.`);
      return;
    }
    setFaltasParaPedido(selecionadosList);
    setConfirmacaoAberta(true);
  };

  // Agrupa faltas por fornecedor para resumo
  const faltasAgrupadasPorFornecedor = useMemo(() => {
    const grupos: Record<string, FaltaMercadoria[]> = {};
    faltasParaPedido.forEach(f => {
      if (!grupos[f.fornecedor]) grupos[f.fornecedor] = [];
      grupos[f.fornecedor].push(f);
    });
    return grupos;
  }, [faltasParaPedido]);

  // Gera pedidos consolidados por fornecedor
  const handleGerarPedidos = () => {
    try {
      const pedidosKey = "pedidos_compra";
      const pedidosExistentes = JSON.parse(localStorage.getItem(pedidosKey) || "[]");
      let contador = pedidosExistentes.length;
      const pedidosCriados: string[] = [];

      Object.entries(faltasAgrupadasPorFornecedor).forEach(([fornecedor, itens]) => {
        contador++;
        const numero = String(contador).padStart(6, "0");

        const novoPedido = {
          id: crypto.randomUUID(),
          numero,
          fornecedorId: "",
          fornecedorNome: fornecedor,
          fornecedorDoc: "",
          dataEmissao: new Date().toISOString(),
          dataEntrega: itens[0]?.previsaoEntrega || "",
          status: "rascunho",
          condicaoPagamento: "À Vista",
          formaPagamento: "Boleto",
          itens: itens.map(f => ({
            produtoId: "",
            codigo: f.codigo,
            descricao: f.produto,
            unidade: f.unidade,
            quantidade: f.quantidadeFalta,
            valorUnitario: 0,
            desconto: 0,
            valorTotal: 0,
            ncm: "",
          })),
          valorTotal: 0,
          valorDesconto: 0,
          valorFrete: 0,
          valorLiquido: 0,
          observacao: `Gerado automaticamente a partir de Faltas de Mercadorias (${itens.length} item/itens)`,
          empresaId: "",
        };

        pedidosExistentes.push(novoPedido);
        pedidosCriados.push(`#${numero} (${fornecedor})`);
      });

      localStorage.setItem(pedidosKey, JSON.stringify(pedidosExistentes));

      // Atualiza status de todas as faltas processadas
      faltasParaPedido.forEach(f => {
        updateFalta(f.id, { status: "pedido_realizado" as FaltaMercadoria["status"] });
      });

      setSelecionados(new Set());
      setConfirmacaoAberta(false);
      setFaltasParaPedido([]);

      toast.success(`${pedidosCriados.length} pedido(s) gerado(s): ${pedidosCriados.join(", ")}. Acesse Compras > Pedidos de Compra para completar os dados.`);
    } catch {
      toast.error("Erro ao gerar pedido(s) de compra");
    }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    const elegiveisIds = faltasElegiveis.map(f => f.id);
    const todosJaSelecionados = elegiveisIds.every(id => selecionados.has(id));
    if (todosJaSelecionados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(elegiveisIds));
    }
  };

  const prioridadeBadge = (p: FaltaMercadoria["prioridade"]) => {
    const map = {
      baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
      media: { label: "Média", className: "bg-primary/10 text-primary" },
      alta: { label: "Alta", className: "bg-orange-500/10 text-orange-600" },
      critica: { label: "Crítica", className: "bg-destructive/10 text-destructive" },
    };
    return <Badge className={map[p].className} variant="outline">{map[p].label}</Badge>;
  };

  const statusBadge = (s: FaltaMercadoria["status"]) => {
    const map = {
      pendente: { label: "Pendente", variant: "outline" as const },
      em_cotacao: { label: "Em Cotação", variant: "secondary" as const },
      pedido_realizado: { label: "Pedido Realizado", variant: "default" as const },
      resolvida: { label: "Resolvida", variant: "secondary" as const },
    };
    return <Badge variant={map[s].variant}>{map[s].label}</Badge>;
  };

  const columns = [
    { header: "Data", key: "dataRegistro" },
    { header: "Produto", key: "produto" },
    { header: "Qtd Falta", key: "quantidadeFalta" },
    { header: "Fornecedor", key: "fornecedor" },
    { header: "Prioridade", key: "prioridade" },
    { header: "Status", key: "status" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Faltas de Mercadorias" description="Controle de produtos em falta e ruptura de estoque" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertCircle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Itens Críticos</p>
                <p className="text-2xl font-bold text-destructive">{totalCriticas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><PackageX className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{totalPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent"><ShoppingCart className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total Registros</p>
                <p className="text-2xl font-bold">{faltasFiltradas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Evolução de Faltas por Período</CardTitle></CardHeader>
          <CardContent>
            {chartPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <RechartsTooltip formatter={(value: number) => [value, "Qtd em Falta"]} />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Faltas por Motivo</CardTitle></CardHeader>
          <CardContent>
            {chartPorMotivo.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartPorMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {chartPorMotivo.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [value, "Quantidade"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Relatório de Faltas Recorrentes */}
      {faltasRecorrentes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base">Faltas Recorrentes por Produto</CardTitle>
                <Badge variant="destructive" className="ml-2">{faltasRecorrentes.length} produto(s)</Badge>
              </div>
              <ExportButtons options={{
                title: "Faltas Recorrentes por Produto",
                subtitle: `Produtos com 2+ registros de falta — ${new Date().toLocaleDateString("pt-BR")}`,
                filename: "faltas-recorrentes",
                columns: [
                  { header: "Código", key: "codigo" },
                  { header: "Produto", key: "produto" },
                  { header: "Ocorrências", key: "ocorrencias" },
                  { header: "Qtd Total", key: "qtdTotal" },
                  { header: "Última Falta", key: "ultimaFalta", format: (v: string) => v ? new Date(v + "T12:00:00").toLocaleDateString("pt-BR") : "—" },
                  { header: "Motivos", key: "motivos", format: (v: Set<string>) => Array.from(v).join(", ") },
                  { header: "Fornecedor(es)", key: "fornecedores", format: (v: Set<string>) => Array.from(v).join(", ") || "—" },
                ],
                data: faltasRecorrentes,
                summaryRows: [
                  { label: "Total de Produtos Recorrentes", value: String(faltasRecorrentes.length) },
                  { label: "Produto Mais Recorrente", value: faltasRecorrentes[0]?.produto || "—" },
                ],
              }} />
            </div>
            <p className="text-xs text-muted-foreground">Produtos com 2 ou mais registros de falta no período — requerem atenção especial no planejamento de compras</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Ocorrências</TableHead>
                  <TableHead className="text-right">Qtd Total Falta</TableHead>
                  <TableHead>Última Falta</TableHead>
                  <TableHead>Motivos</TableHead>
                  <TableHead>Fornecedor(es)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faltasRecorrentes.map((r, idx) => (
                  <TableRow key={r.codigo || r.produto}>
                    <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{r.codigo || "—"}</TableCell>
                    <TableCell className="font-medium">{r.produto}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.ocorrencias >= 3 ? "destructive" : "secondary"}>{r.ocorrencias}x</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.qtdTotal}</TableCell>
                    <TableCell className="text-xs">{r.ultimaFalta ? new Date(r.ultimaFalta + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{Array.from(r.motivos).join(", ")}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{Array.from(r.fornecedores).join(", ") || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-lg">Registros de Faltas</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {selecionados.size > 0 && (
                <Button size="sm" variant="outline" onClick={handleConfirmarPedidoMultiplo}>
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Gerar Pedido ({selecionados.size})
                </Button>
              )}
              <ExportButtons options={{ data: faltasFiltradas, filename: "faltas-mercadorias", columns, title: "Faltas de Mercadorias" }} />
              <Dialog open={modalAberto} onOpenChange={(o) => { setModalAberto(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Falta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editando ? "Editar Falta" : "Registrar Nova Falta"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Data *</Label><Input type="date" value={form.dataRegistro} onChange={(e) => setForm({ ...form, dataRegistro: e.target.value })} /></div>
                      <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Código" /></div>
                    </div>
                    <div><Label>Produto *</Label><Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} placeholder="Nome do produto" /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Qtd em Falta *</Label><Input type="number" value={form.quantidadeFalta} onChange={(e) => setForm({ ...form, quantidadeFalta: e.target.value })} /></div>
                      <div><Label>Unidade</Label>
                        <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UN">UN</SelectItem>
                            <SelectItem value="KG">KG</SelectItem>
                            <SelectItem value="CX">CX</SelectItem>
                            <SelectItem value="PCT">PCT</SelectItem>
                            <SelectItem value="LT">LT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Prioridade</Label>
                        <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as FaltaMercadoria["prioridade"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="critica">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Motivo da Falta *</Label>
                      <Select value={form.motivoFalta} onValueChange={(v) => setForm({ ...form, motivoFalta: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                        <SelectContent>{motivosFalta.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Fornecedor</Label><Input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Nome do fornecedor" /></div>
                      <div><Label>Previsão de Entrega</Label><Input type="date" value={form.previsaoEntrega} onChange={(e) => setForm({ ...form, previsaoEntrega: e.target.value })} /></div>
                    </div>
                    <div><Label>Observação</Label><Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Detalhes adicionais" rows={2} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setModalAberto(false); resetForm(); }}>Cancelar</Button>
                    <Button onClick={handleSalvar}>{editando ? "Atualizar" : "Registrar"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por produto, código ou fornecedor..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_cotacao">Em Cotação</SelectItem>
                <SelectItem value="pedido_realizado">Pedido Realizado</SelectItem>
                <SelectItem value="resolvida">Resolvida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={faltasElegiveis.length > 0 && faltasElegiveis.every(f => selecionados.has(f.id))}
                    onCheckedChange={toggleTodos}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd Falta</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Previsão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faltasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhuma falta encontrada</TableCell></TableRow>
              ) : faltasFiltradas.map((f) => {
                const isElegivel = f.status === "pendente" || f.status === "em_cotacao";
                return (
                  <TableRow key={f.id} className={selecionados.has(f.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      {isElegivel ? (
                        <Checkbox checked={selecionados.has(f.id)} onCheckedChange={() => toggleSelecionado(f.id)} />
                      ) : (
                        <span className="block w-4" />
                      )}
                    </TableCell>
                    <TableCell>{new Date(f.dataRegistro + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                    <TableCell className="font-medium">{f.produto}</TableCell>
                    <TableCell className="text-right">{f.quantidadeFalta} {f.unidade}</TableCell>
                    <TableCell className="text-xs">{f.fornecedor || "—"}</TableCell>
                    <TableCell><span className="text-xs">{f.motivoFalta}</span></TableCell>
                    <TableCell>{prioridadeBadge(f.prioridade)}</TableCell>
                    <TableCell>{statusBadge(f.status)}</TableCell>
                    <TableCell className="text-xs">{f.previsaoEntrega ? new Date(f.previsaoEntrega + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex justify-end gap-1">
                          {isElegivel && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleConfirmarPedidoUnico(f)}><FileText className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent>Gerar Pedido de Compra</TooltipContent>
                            </Tooltip>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditar(f)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleExcluir(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Confirmação */}
      <Dialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Geração de Pedido de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {Object.keys(faltasAgrupadasPorFornecedor).length === 1
                ? "Será gerado 1 pedido de compra com os seguintes itens:"
                : `Serão gerados ${Object.keys(faltasAgrupadasPorFornecedor).length} pedidos de compra (consolidados por fornecedor):`}
            </p>

            {Object.entries(faltasAgrupadasPorFornecedor).map(([fornecedor, itens]) => (
              <div key={fornecedor} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{fornecedor}</span>
                  <Badge variant="secondary" className="ml-auto">{itens.length} item(ns)</Badge>
                </div>
                <Separator />
                <div className="space-y-1">
                  {itens.map(item => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span>{item.codigo ? `[${item.codigo}] ` : ""}{item.produto}</span>
                      <span className="text-muted-foreground font-mono">{item.quantidadeFalta} {item.unidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              <p>• Os pedidos serão criados com status <strong>Rascunho</strong></p>
              <p>• Complete os valores unitários em Compras &gt; Pedidos de Compra</p>
              <p>• As faltas terão o status atualizado para <strong>Pedido Realizado</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacaoAberta(false)}>Cancelar</Button>
            <Button onClick={handleGerarPedidos}>
              <FileText className="h-4 w-4 mr-1" />
              Confirmar e Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
