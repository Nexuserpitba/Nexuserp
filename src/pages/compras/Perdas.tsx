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
import { Plus, Search, Trash2, Edit, AlertTriangle, Package, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "@/components/ExportButtons";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface Perda {
  id: string;
  data: string;
  produto: string;
  codigo: string;
  quantidade: number;
  unidade: string;
  motivo: string;
  valorUnitario: number;
  valorTotal: number;
  responsavel: string;
  observacao: string;
  status: "registrada" | "aprovada" | "contabilizada";
}

interface Movimentacao {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  motivo: string;
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
  custoUnitario: number;
  documentoRef: string;
  observacao: string;
  usuario: string;
}

const motivosPerda = [
  "Avaria no transporte",
  "Vencimento / Validade expirada",
  "Defeito de fabricação",
  "Armazenamento inadequado",
  "Quebra / Dano físico",
  "Furto / Extravio",
  "Contaminação",
  "Erro de manipulação",
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
  "hsl(60, 70%, 50%)",
];

const defaultPerdas: Omit<Perda, "id">[] = [
  { data: "2026-01-15", produto: "LEITE INTEGRAL 1L", codigo: "00001", quantidade: 12, unidade: "UN", motivo: "Vencimento / Validade expirada", valorUnitario: 5.49, valorTotal: 65.88, responsavel: "CARLOS SILVA", observacao: "Lote vencido em 08/01", status: "contabilizada" },
  { data: "2026-01-28", produto: "IOGURTE NATURAL 500G", codigo: "00034", quantidade: 6, unidade: "UN", motivo: "Vencimento / Validade expirada", valorUnitario: 4.29, valorTotal: 25.74, responsavel: "MARIA OLIVEIRA", observacao: "", status: "contabilizada" },
  { data: "2026-02-05", produto: "DETERGENTE LÍQUIDO 500ML", codigo: "00045", quantidade: 3, unidade: "UN", motivo: "Quebra / Dano físico", valorUnitario: 2.99, valorTotal: 8.97, responsavel: "MARIA OLIVEIRA", observacao: "Caixa caiu durante descarga", status: "contabilizada" },
  { data: "2026-02-18", produto: "AZEITE EXTRA VIRGEM 500ML", codigo: "00067", quantidade: 2, unidade: "UN", motivo: "Avaria no transporte", valorUnitario: 29.90, valorTotal: 59.80, responsavel: "JOÃO SANTOS", observacao: "", status: "aprovada" },
  { data: "2026-03-03", produto: "BISCOITO CREAM CRACKER 400G", codigo: "00102", quantidade: 8, unidade: "UN", motivo: "Avaria no transporte", valorUnitario: 4.29, valorTotal: 34.32, responsavel: "JOÃO SANTOS", observacao: "Embalagens amassadas e abertas", status: "registrada" },
  { data: "2026-03-10", produto: "QUEIJO MUSSARELA KG", codigo: "00078", quantidade: 5, unidade: "KG", motivo: "Armazenamento inadequado", valorUnitario: 42.90, valorTotal: 214.50, responsavel: "CARLOS SILVA", observacao: "Refrigeração falhou", status: "aprovada" },
  { data: "2026-03-12", produto: "SUCO DE LARANJA 1L", codigo: "00091", quantidade: 4, unidade: "UN", motivo: "Vencimento / Validade expirada", valorUnitario: 7.99, valorTotal: 31.96, responsavel: "ANA COSTA", observacao: "", status: "registrada" },
];

export default function Perdas() {
  const { items: perdas, addItem: addPerda, updateItem: updatePerda, deleteItem: deletePerda } = useLocalStorage<Perda>("perdas_mercadorias", defaultPerdas as Perda[]);
  const { addItem: addMovimentacao } = useLocalStorage<Movimentacao>("movimentacoes_estoque", []);
  const [busca, setBusca] = useState("");
  const [filtroMotivo, setFiltroMotivo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Perda | null>(null);

  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    produto: "",
    codigo: "",
    quantidade: "",
    unidade: "UN",
    motivo: "",
    valorUnitario: "",
    responsavel: "",
    observacao: "",
  });

  const perdasFiltradas = perdas.filter((p) => {
    const matchBusca = p.produto.toLowerCase().includes(busca.toLowerCase()) || p.codigo.includes(busca);
    const matchMotivo = filtroMotivo === "todos" || p.motivo === filtroMotivo;
    const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
    return matchBusca && matchMotivo && matchStatus;
  });

  const totalPerdas = perdasFiltradas.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalItens = perdasFiltradas.reduce((acc, p) => acc + p.quantidade, 0);

  // Chart data: perdas por mês
  const chartPorMes = useMemo(() => {
    const meses: Record<string, number> = {};
    perdas.forEach((p) => {
      const mes = p.data.substring(0, 7); // YYYY-MM
      meses[mes] = (meses[mes] || 0) + p.valorTotal;
    });
    return Object.entries(meses)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, valor]) => {
        const [y, m] = mes.split("-");
        const label = `${m}/${y}`;
        return { mes: label, valor: parseFloat(valor.toFixed(2)) };
      });
  }, [perdas]);

  // Chart data: perdas por motivo
  const chartPorMotivo = useMemo(() => {
    const motivos: Record<string, number> = {};
    perdas.forEach((p) => {
      motivos[p.motivo] = (motivos[p.motivo] || 0) + p.valorTotal;
    });
    return Object.entries(motivos)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [perdas]);

  const resetForm = () => {
    setForm({ data: new Date().toISOString().split("T")[0], produto: "", codigo: "", quantidade: "", unidade: "UN", motivo: "", valorUnitario: "", responsavel: "", observacao: "" });
    setEditando(null);
  };

  const registrarMovimentacaoEstoque = (perda: Perda) => {
    addMovimentacao({
      data: new Date().toISOString(),
      tipo: "saida",
      motivo: "Perda/Avaria",
      produtoCodigo: perda.codigo,
      produtoDescricao: perda.produto,
      quantidade: perda.quantidade,
      custoUnitario: perda.valorUnitario,
      documentoRef: `PERDA #${perda.id}`,
      observacao: `Perda: ${perda.motivo}. ${perda.observacao}`.trim(),
      usuario: perda.responsavel || "Admin",
    });
  };

  const handleSalvar = () => {
    if (!form.produto || !form.motivo || !form.quantidade || !form.valorUnitario) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    const qtd = parseFloat(form.quantidade);
    const vlr = parseFloat(form.valorUnitario);

    if (editando) {
      updatePerda(editando.id, { ...form, quantidade: qtd, valorUnitario: vlr, valorTotal: qtd * vlr });
      toast.success("Perda atualizada com sucesso");
    } else {
      const nova = {
        ...form,
        quantidade: qtd,
        valorUnitario: vlr,
        valorTotal: qtd * vlr,
        status: "registrada" as const,
      };
      addPerda(nova);
      // Integração: gerar saída automática no estoque
      registrarMovimentacaoEstoque({ ...nova, id: "temp" });
      toast.success("Perda registrada e saída de estoque gerada automaticamente");
    }
    resetForm();
    setModalAberto(false);
  };

  const handleEditar = (perda: Perda) => {
    setEditando(perda);
    setForm({
      data: perda.data,
      produto: perda.produto,
      codigo: perda.codigo,
      quantidade: String(perda.quantidade),
      unidade: perda.unidade,
      motivo: perda.motivo,
      valorUnitario: String(perda.valorUnitario),
      responsavel: perda.responsavel,
      observacao: perda.observacao,
    });
    setModalAberto(true);
  };

  const handleExcluir = (id: string) => {
    deletePerda(id);
    toast.success("Registro de perda excluído");
  };

  const statusBadge = (status: Perda["status"]) => {
    const map = {
      registrada: { label: "Registrada", variant: "outline" as const },
      aprovada: { label: "Aprovada", variant: "default" as const },
      contabilizada: { label: "Contabilizada", variant: "secondary" as const },
    };
    return <Badge variant={map[status].variant}>{map[status].label}</Badge>;
  };

  const columns = [
    { header: "Data", key: "data" },
    { header: "Código", key: "codigo" },
    { header: "Produto", key: "produto" },
    { header: "Qtd", key: "quantidade" },
    { header: "Motivo", key: "motivo" },
    { header: "Valor Total", key: "valorTotal" },
    { header: "Status", key: "status" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Perdas de Mercadorias" description="Registre e gerencie perdas de produtos do estoque" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Perdas</p>
                <p className="text-2xl font-bold text-destructive">R$ {totalPerdas.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens Perdidos</p>
                <p className="text-2xl font-bold">{totalItens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <TrendingDown className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{perdasFiltradas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução de Perdas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {chartPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartPorMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${v}`} />
                  <RechartsTooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Valor"]} />
                  <Bar dataKey="valor" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Perdas por Motivo</CardTitle>
          </CardHeader>
          <CardContent>
            {chartPorMotivo.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartPorMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {chartPorMotivo.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Valor"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados para exibir</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <CardTitle className="text-lg">Registros de Perdas</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <ExportButtons options={{ data: perdasFiltradas, filename: "perdas-mercadorias", columns, title: "Perdas de Mercadorias" }} />
              <Dialog open={modalAberto} onOpenChange={(o) => { setModalAberto(o); if (!o) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Perda</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editando ? "Editar Perda" : "Registrar Nova Perda"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Data *</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                      <div><Label>Código</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Código" /></div>
                    </div>
                    <div><Label>Produto *</Label><Input value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} placeholder="Nome do produto" /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Quantidade *</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
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
                      <div><Label>Valor Unit. *</Label><Input type="number" step="0.01" value={form.valorUnitario} onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })} /></div>
                    </div>
                    <div><Label>Motivo *</Label>
                      <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                        <SelectContent>{motivosPerda.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome do responsável" /></div>
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
              <Input placeholder="Buscar por produto ou código..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
              <SelectTrigger className="w-full md:w-[220px]"><SelectValue placeholder="Motivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os motivos</SelectItem>
                {motivosPerda.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="registrada">Registrada</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="contabilizada">Contabilizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perdasFiltradas.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma perda encontrada</TableCell></TableRow>
              ) : perdasFiltradas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell className="font-medium">{p.produto}</TableCell>
                  <TableCell className="text-right">{p.quantidade} {p.unidade}</TableCell>
                  <TableCell><span className="text-xs">{p.motivo}</span></TableCell>
                  <TableCell className="text-right font-medium text-destructive">R$ {p.valorTotal.toFixed(2)}</TableCell>
                  <TableCell>{statusBadge(p.status)}</TableCell>
                  <TableCell className="text-xs">{p.responsavel}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditar(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleExcluir(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
