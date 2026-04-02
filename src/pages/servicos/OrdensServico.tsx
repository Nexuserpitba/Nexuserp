import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Wrench,
  Clock, CheckCircle2, XCircle, PlayCircle, PauseCircle, Printer, User, Package
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { format } from "date-fns";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";

// ========== Interfaces ==========

interface HistoricoOS {
  id: string;
  data: string;
  responsavel: string;
  descricao: string;
  tipo: "status" | "interacao" | "nota";
}

interface ItemOS {
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  tipo: "produto" | "servico";
}

interface OrdemServico {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  clienteDoc: string;
  clienteTelefone: string;
  dataAbertura: string;
  dataPrevista: string;
  dataConclusao: string;
  status: "aberta" | "em_andamento" | "aguardando" | "concluida" | "cancelada";
  prioridade: "baixa" | "normal" | "alta" | "urgente";
  descricaoProblema: string;
  descricaoSolucao: string;
  tecnicoResponsavel: string;
  equipamento: string;
  numeroSerie: string;
  garantia: boolean;
  itens: ItemOS[];
  valorProdutos: number;
  valorServicos: number;
  valorDesconto: number;
  valorTotal: number;
  observacao: string;
  historico: HistoricoOS[];
}

interface Pessoa {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
  status: string;
  telefone: string;
  celular: string;
  email: string;
}

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  venda: number;
  custoAquisicao: number;
  ativo: boolean;
}

interface Tecnico {
  id: string;
  nome: string;
  especialidade: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

// ========== Helpers ==========

function getStoredData<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function gerarNumeroOS(ordens: OrdemServico[]): string {
  const max = ordens.reduce((m, o) => {
    const n = parseInt(o.numero.replace(/\D/g, "")) || 0;
    return n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(6, "0");
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  aberta: { label: "Aberta", variant: "outline" },
  em_andamento: { label: "Em Andamento", variant: "default" },
  aguardando: { label: "Aguardando", variant: "secondary" },
  concluida: { label: "Concluída", variant: "default" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const prioridadeConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  baixa: { label: "Baixa", variant: "outline" },
  normal: { label: "Normal", variant: "secondary" },
  alta: { label: "Alta", variant: "default" },
  urgente: { label: "Urgente", variant: "destructive" },
};

const defaultOrdens: OrdemServico[] = [];

// ========== Component ==========

export default function OrdensServico() {
  const { items: ordens, addItem, updateItem, deleteItem } = useLocalStorage<OrdemServico>("ordens_servico", defaultOrdens);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalView, setModalView] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewOS, setViewOS] = useState<OrdemServico | null>(null);

  // Load related data
  const pessoas: Pessoa[] = useMemo(() => getStoredData("pessoas", []), []);
  const clientes = useMemo(() => pessoas.filter(p => p.status === "Ativo"), [pessoas]);
  const produtos: Produto[] = useMemo(() => {
    const all = getStoredData<Produto[]>("produtos", []);
    return all.filter(p => p.ativo !== false);
  }, []);
  const tecnicos: Tecnico[] = useMemo(() => getStoredData<Tecnico[]>("tecnicos", []).filter(t => t.ativo !== false), []);

  // Form state
  const [form, setForm] = useState({
    clienteId: "",
    dataPrevista: "",
    prioridade: "normal" as OrdemServico["prioridade"],
    descricaoProblema: "",
    descricaoSolucao: "",
    tecnicoResponsavel: "",
    equipamento: "",
    numeroSerie: "",
    garantia: false,
    valorDesconto: 0,
    observacao: "",
  });
  const [itens, setItens] = useState<ItemOS[]>([]);

  // Item form
  const [itemForm, setItemForm] = useState({
    produtoId: "",
    quantidade: "1",
    tipo: "servico" as "produto" | "servico",
    valorUnitario: 0,
  });

  const resetForm = () => {
    setForm({
      clienteId: "", dataPrevista: "", prioridade: "normal",
      descricaoProblema: "", descricaoSolucao: "", tecnicoResponsavel: "",
      equipamento: "", numeroSerie: "", garantia: false, valorDesconto: 0, observacao: "",
    });
    setItens([]);
    setEditingId(null);
    setItemForm({ produtoId: "", quantidade: "1", tipo: "servico", valorUnitario: 0 });
  };

  const openNew = () => { resetForm(); setModalOpen(true); };

  const openEdit = (os: OrdemServico) => {
    setEditingId(os.id);
    const cliente = clientes.find(c => c.id === os.clienteId);
    setForm({
      clienteId: os.clienteId,
      dataPrevista: os.dataPrevista,
      prioridade: os.prioridade,
      descricaoProblema: os.descricaoProblema,
      descricaoSolucao: os.descricaoSolucao,
      tecnicoResponsavel: os.tecnicoResponsavel,
      equipamento: os.equipamento,
      numeroSerie: os.numeroSerie,
      garantia: os.garantia,
      valorDesconto: os.valorDesconto,
      observacao: os.observacao,
    });
    setItens(os.itens);
    setModalOpen(true);
  };

  // Add item
  const addItemOS = () => {
    const prod = produtos.find(p => p.id === itemForm.produtoId);
    if (!prod) { toast.error("Selecione um produto/serviço"); return; }
    const qtd = Number(itemForm.quantidade) || 1;
    const valorUnit = itemForm.valorUnitario || prod.venda || 0;
    const novoItem: ItemOS = {
      produtoId: prod.id,
      codigo: prod.codigo,
      descricao: prod.descricao,
      unidade: prod.unidade,
      quantidade: qtd,
      valorUnitario: valorUnit,
      valorTotal: qtd * valorUnit,
      tipo: itemForm.tipo,
    };
    setItens(prev => [...prev, novoItem]);
    setItemForm({ produtoId: "", quantidade: "1", tipo: "servico", valorUnitario: 0 });
  };

  const removeItemOS = (idx: number) => setItens(prev => prev.filter((_, i) => i !== idx));

  // Totals
  const valorProdutos = itens.filter(i => i.tipo === "produto").reduce((s, i) => s + i.valorTotal, 0);
  const valorServicos = itens.filter(i => i.tipo === "servico").reduce((s, i) => s + i.valorTotal, 0);
  const valorTotal = valorProdutos + valorServicos - form.valorDesconto;

  // Save
  const handleSave = () => {
    if (!form.clienteId) { toast.error("Selecione um cliente"); return; }
    if (!form.descricaoProblema) { toast.error("Descreva o problema/serviço"); return; }

    const cliente = clientes.find(c => c.id === form.clienteId);
    if (!cliente) return;

    const osData: Omit<OrdemServico, "id"> = {
      numero: editingId ? ordens.find(o => o.id === editingId)!.numero : gerarNumeroOS(ordens),
      clienteId: form.clienteId,
      clienteNome: cliente.nome,
      clienteDoc: cliente.cpfCnpj,
      clienteTelefone: cliente.telefone || cliente.celular || "",
      dataAbertura: editingId ? ordens.find(o => o.id === editingId)!.dataAbertura : new Date().toISOString(),
      dataPrevista: form.dataPrevista,
      dataConclusao: "",
      status: editingId ? ordens.find(o => o.id === editingId)!.status : "aberta",
      prioridade: form.prioridade,
      descricaoProblema: form.descricaoProblema,
      descricaoSolucao: form.descricaoSolucao,
      tecnicoResponsavel: form.tecnicoResponsavel,
      equipamento: form.equipamento,
      numeroSerie: form.numeroSerie,
      garantia: form.garantia,
      itens,
      valorProdutos,
      valorServicos,
      valorDesconto: form.valorDesconto,
      valorTotal,
      observacao: form.observacao,
      historico: editingId
        ? [
            ...(ordens.find(o => o.id === editingId)?.historico || []),
            { id: crypto.randomUUID(), data: new Date().toISOString(), responsavel: form.tecnicoResponsavel || "Admin", descricao: "OS atualizada", tipo: "nota" as const },
          ]
        : [{ id: crypto.randomUUID(), data: new Date().toISOString(), responsavel: form.tecnicoResponsavel || "Admin", descricao: "OS criada", tipo: "status" as const }],
    };

    if (editingId) {
      updateItem(editingId, osData);
      toast.success("Ordem de serviço atualizada");
    } else {
      addItem(osData as any);
      toast.success(`OS ${osData.numero} criada com sucesso`);
    }
    setModalOpen(false);
    resetForm();
  };

  // Status change
  const mudarStatus = (id: string, novoStatus: OrdemServico["status"]) => {
    const os = ordens.find(o => o.id === id);
    if (!os) return;

    const historicoEntry: HistoricoOS = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      responsavel: os.tecnicoResponsavel || "Admin",
      descricao: `Status alterado para ${statusConfig[novoStatus].label}`,
      tipo: "status",
    };

    const updates: Partial<OrdemServico> = {
      status: novoStatus,
      historico: [...(os.historico || []), historicoEntry],
    };
    if (novoStatus === "concluida") {
      updates.dataConclusao = new Date().toISOString();

      if (os.valorTotal > 0 && !os.garantia) {
        try {
          const contasReceber = JSON.parse(localStorage.getItem("contas_receber") || "[]");
          const dataHoje = new Date().toISOString().split("T")[0];
          const vencimento = new Date();
          vencimento.setDate(vencimento.getDate() + 30);
          const novaConta = {
            id: crypto.randomUUID(), tipo: "manual", cliente: os.clienteNome, clienteDoc: os.clienteDoc,
            descricao: `Ordem de Serviço ${os.numero}${os.equipamento ? ` — ${os.equipamento}` : ""}`,
            categoria: "Serviços", centroCusto: "", contaContabil: "", dataEmissao: dataHoje, valorTotal: os.valorTotal,
            parcelas: [{ numero: 1, valor: os.valorTotal, vencimento: vencimento.toISOString().split("T")[0], dataPagamento: null, valorRecebido: 0, status: "aberta", formaPagamento: "dinheiro" }],
            observacao: `Gerado automaticamente pela conclusão da OS ${os.numero}`, status: "aberta", historicoContabil: "",
          };
          localStorage.setItem("contas_receber", JSON.stringify([...contasReceber, novaConta]));
          toast.success(`Conta a receber de ${formatCurrencyBRL(os.valorTotal)} gerada no financeiro`);
        } catch { /* erro ignorado */ }
      }
    }

    updateItem(id, updates);
    toast.success(`Status atualizado para ${statusConfig[novoStatus].label}`);
  };

  // Add historico note
  const [historicoNota, setHistoricoNota] = useState("");
  const [historicoResponsavel, setHistoricoResponsavel] = useState("");

  const adicionarNota = (osId: string) => {
    if (!historicoNota.trim()) { toast.error("Digite uma descrição"); return; }
    const os = ordens.find(o => o.id === osId);
    if (!os) return;
    const entry: HistoricoOS = {
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      responsavel: historicoResponsavel || os.tecnicoResponsavel || "Admin",
      descricao: historicoNota,
      tipo: "interacao",
    };
    updateItem(osId, { historico: [...(os.historico || []), entry] });
    setHistoricoNota("");
    setHistoricoResponsavel("");
    // Refresh viewOS
    setViewOS(prev => prev ? { ...prev, historico: [...(prev.historico || []), entry] } : prev);
    toast.success("Registro adicionado ao histórico");
  };

  // Print OS
  const imprimirOS = (os: OrdemServico) => {
    const itensTable = os.itens.length > 0
      ? buildPrintTable(
          [
            { label: "Tipo" },
            { label: "Código" },
            { label: "Descrição" },
            { label: "Qtd", align: "center" },
            { label: "Valor Unit.", align: "right" },
            { label: "Total", align: "right" },
          ],
          os.itens.map(i => ({
            cells: [
              i.tipo === "servico" ? "Serviço" : "Produto",
              i.codigo,
              i.descricao,
              String(i.quantidade),
              printCurrency(i.valorUnitario),
              printCurrency(i.valorTotal),
            ],
          }))
        )
      : "";

    const content = `
      <div class="info-grid" style="grid-template-columns: repeat(2, 1fr);">
        <div class="info-box"><div class="label">Cliente</div><div class="value" style="font-size:13px">${os.clienteNome}</div><div class="muted">${os.clienteDoc}${os.clienteTelefone ? ` · ${os.clienteTelefone}` : ""}</div></div>
        <div class="info-box"><div class="label">Status / Prioridade</div><div class="value" style="font-size:13px">${statusConfig[os.status].label} · ${prioridadeConfig[os.prioridade].label}</div>${os.garantia ? '<div class="muted">EM GARANTIA</div>' : ""}</div>
      </div>
      <div class="info-grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="info-box"><div class="label">Abertura</div><div class="value" style="font-size:12px">${format(new Date(os.dataAbertura), "dd/MM/yyyy")}</div></div>
        <div class="info-box"><div class="label">Previsão</div><div class="value" style="font-size:12px">${os.dataPrevista ? format(new Date(os.dataPrevista), "dd/MM/yyyy") : "—"}</div></div>
        <div class="info-box"><div class="label">Equipamento</div><div class="value" style="font-size:12px">${os.equipamento || "—"}</div></div>
        <div class="info-box"><div class="label">Nº Série</div><div class="value" style="font-size:12px">${os.numeroSerie || "—"}</div></div>
      </div>
      <div class="info-box" style="margin:12px 0;text-align:left"><div class="label">Técnico Responsável</div><div style="font-size:12px;font-weight:600">${os.tecnicoResponsavel || "—"}</div></div>
      <div class="info-box" style="margin:12px 0;text-align:left"><div class="label">Descrição do Problema / Serviço</div><div style="font-size:12px">${os.descricaoProblema}</div></div>
      ${os.descricaoSolucao ? `<div class="info-box" style="margin:12px 0;text-align:left"><div class="label">Solução / Laudo Técnico</div><div style="font-size:12px">${os.descricaoSolucao}</div></div>` : ""}
      ${itensTable ? `<h3 style="font-size:13px;margin:16px 0 8px;font-weight:700">Produtos e Serviços</h3>${itensTable}` : ""}
      <div class="info-grid" style="grid-template-columns: repeat(4, 1fr); margin-top:16px;">
        <div class="info-box"><div class="label">Produtos</div><div class="value" style="font-size:14px">${printCurrency(os.valorProdutos)}</div></div>
        <div class="info-box"><div class="label">Serviços</div><div class="value" style="font-size:14px">${printCurrency(os.valorServicos)}</div></div>
        <div class="info-box"><div class="label">Desconto</div><div class="value" style="font-size:14px;color:#dc2626">${os.valorDesconto > 0 ? "-" + printCurrency(os.valorDesconto) : "—"}</div></div>
        <div class="info-box"><div class="label">Total</div><div class="value" style="font-size:18px">${printCurrency(os.valorTotal)}</div></div>
      </div>
      ${os.observacao ? `<div style="margin-top:12px;font-size:11px;color:#666"><strong>Obs:</strong> ${os.observacao}</div>` : ""}
      <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:48px">
        <div style="border-top:1px solid #333;padding-top:8px;text-align:center;font-size:11px">Assinatura do Cliente</div>
        <div style="border-top:1px solid #333;padding-top:8px;text-align:center;font-size:11px">Assinatura do Técnico</div>
      </div>
    `;

    printPDF({
      title: `Ordem de Serviço Nº ${os.numero}`,
      subtitle: `${os.clienteNome} · ${format(new Date(os.dataAbertura), "dd/MM/yyyy")}`,
      content,
    });
  };

  // Filter
  const filtered = ordens
    .filter(o => filtroStatus === "todos" || o.status === filtroStatus)
    .filter(o =>
      o.numero.includes(search) ||
      o.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
      o.equipamento.toLowerCase().includes(search.toLowerCase()) ||
      o.tecnicoResponsavel.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime());

  // Stats
  const stats = {
    abertas: ordens.filter(o => o.status === "aberta").length,
    andamento: ordens.filter(o => o.status === "em_andamento").length,
    aguardando: ordens.filter(o => o.status === "aguardando").length,
    concluidas: ordens.filter(o => o.status === "concluida").length,
  };

  // Export
  const exportOptions = {
    title: "Ordens de Serviço",
    filename: "ordens_servico",
    columns: [
      { header: "Nº OS", key: "numero" },
      { header: "Cliente", key: "cliente" },
      { header: "Equipamento", key: "equipamento" },
      { header: "Status", key: "status" },
      { header: "Prioridade", key: "prioridade" },
      { header: "Data Abertura", key: "abertura" },
      { header: "Valor Total", key: "valor", align: "right" as const },
    ],
    data: filtered.map(o => ({
      numero: o.numero,
      cliente: o.clienteNome,
      equipamento: o.equipamento,
      status: statusConfig[o.status].label,
      prioridade: prioridadeConfig[o.prioridade].label,
      abertura: format(new Date(o.dataAbertura), "dd/MM/yyyy"),
      valor: formatCurrencyBRL(o.valorTotal),
    })),
  };

  return (
    <div className="page-container">
      <PageHeader title="Ordens de Serviço" description="Gerencie ordens de serviço integradas a clientes e produtos" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-7 w-7 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Abertas</p><p className="text-xl font-bold">{stats.abertas}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PlayCircle className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Em Andamento</p><p className="text-xl font-bold">{stats.andamento}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PauseCircle className="h-7 w-7 text-muted-foreground" />
            <div><p className="text-xs text-muted-foreground">Aguardando</p><p className="text-xl font-bold">{stats.aguardando}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-xl font-bold">{stats.concluidas}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar OS, cliente, equipamento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-72" />
              </div>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <ExportButtons options={exportOptions} />
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova OS</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ordem de serviço encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Abertura</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(os => (
                  <TableRow key={os.id}>
                    <TableCell className="font-mono font-semibold">{os.numero}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{os.clienteNome}</p>
                        <p className="text-xs text-muted-foreground">{os.clienteDoc}</p>
                      </div>
                    </TableCell>
                    <TableCell>{os.equipamento || "—"}</TableCell>
                    <TableCell>{os.tecnicoResponsavel || "—"}</TableCell>
                    <TableCell><Badge variant={statusConfig[os.status].variant}>{statusConfig[os.status].label}</Badge></TableCell>
                    <TableCell><Badge variant={prioridadeConfig[os.prioridade].variant}>{prioridadeConfig[os.prioridade].label}</Badge></TableCell>
                    <TableCell>{format(new Date(os.dataAbertura), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrencyBRL(os.valorTotal)}</TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewOS(os); setModalView(true); }}><Eye className="h-4 w-4 mr-2" /> Visualizar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => imprimirOS(os)}><Printer className="h-4 w-4 mr-2" /> Imprimir</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(os)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          {os.status === "aberta" && <DropdownMenuItem onClick={() => mudarStatus(os.id, "em_andamento")}><PlayCircle className="h-4 w-4 mr-2" /> Iniciar</DropdownMenuItem>}
                          {os.status === "em_andamento" && <DropdownMenuItem onClick={() => mudarStatus(os.id, "aguardando")}><PauseCircle className="h-4 w-4 mr-2" /> Aguardar</DropdownMenuItem>}
                          {(os.status === "em_andamento" || os.status === "aguardando") && <DropdownMenuItem onClick={() => mudarStatus(os.id, "concluida")}><CheckCircle2 className="h-4 w-4 mr-2" /> Concluir</DropdownMenuItem>}
                          {os.status !== "cancelada" && os.status !== "concluida" && <DropdownMenuItem onClick={() => mudarStatus(os.id, "cancelada")} className="text-destructive"><XCircle className="h-4 w-4 mr-2" /> Cancelar</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => deleteItem(os.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Create/Edit */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) resetForm(); setModalOpen(v); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.clienteId} onValueChange={v => setForm(f => ({ ...f, clienteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" /> {c.nome} — {c.cpfCnpj}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Prevista de Conclusão</Label>
                <Input type="date" value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))} />
              </div>
            </div>

            {/* Equipamento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Equipamento</Label>
                <Input placeholder="Ex: Notebook Dell" value={form.equipamento} onChange={e => setForm(f => ({ ...f, equipamento: e.target.value }))} />
              </div>
              <div>
                <Label>Nº Série</Label>
                <Input placeholder="Número de série" value={form.numeroSerie} onChange={e => setForm(f => ({ ...f, numeroSerie: e.target.value }))} />
              </div>
              <div>
                <Label>Técnico Responsável</Label>
                <Select value={form.tecnicoResponsavel} onValueChange={v => setForm(f => ({ ...f, tecnicoResponsavel: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                  <SelectContent>
                    {tecnicos.map(t => (
                      <SelectItem key={t.id} value={t.nome}>{t.nome}{t.especialidade ? ` — ${t.especialidade}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="garantia" checked={form.garantia} onChange={e => setForm(f => ({ ...f, garantia: e.target.checked }))} className="rounded" />
                <Label htmlFor="garantia">Serviço em Garantia</Label>
              </div>
            </div>

            <div>
              <Label>Descrição do Problema/Serviço *</Label>
              <Textarea rows={3} placeholder="Descreva o problema ou serviço a ser realizado" value={form.descricaoProblema} onChange={e => setForm(f => ({ ...f, descricaoProblema: e.target.value }))} />
            </div>

            <div>
              <Label>Solução / Laudo Técnico</Label>
              <Textarea rows={2} placeholder="Descreva a solução aplicada" value={form.descricaoSolucao} onChange={e => setForm(f => ({ ...f, descricaoSolucao: e.target.value }))} />
            </div>

            <Separator />

            {/* Itens */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Package className="h-4 w-4" /> Produtos e Serviços</h4>
              <div className="grid grid-cols-12 gap-2 items-end mb-3">
                <div className="col-span-2">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={itemForm.tipo} onValueChange={v => setItemForm(f => ({ ...f, tipo: v as any }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Produto/Serviço</Label>
                  <Select value={itemForm.produtoId} onValueChange={v => {
                    const prod = produtos.find(p => p.id === v);
                    setItemForm(f => ({ ...f, produtoId: v, valorUnitario: prod?.venda || 0 }));
                  }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input type="number" min="1" className="h-9" value={itemForm.quantidade} onChange={e => setItemForm(f => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Valor Unit.</Label>
                  <CurrencyInput value={itemForm.valorUnitario} onValueChange={v => setItemForm(f => ({ ...f, valorUnitario: v }))} />
                </div>
                <div className="col-span-2">
                  <Button size="sm" onClick={addItemOS} className="w-full h-9"><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                </div>
              </div>

              {itens.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Badge variant={item.tipo === "servico" ? "default" : "secondary"}>{item.tipo === "servico" ? "Serviço" : "Produto"}</Badge></TableCell>
                        <TableCell className="font-mono">{item.codigo}</TableCell>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItemOS(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Produtos</Label>
                <p className="font-mono font-semibold">{formatCurrencyBRL(valorProdutos)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Serviços</Label>
                <p className="font-mono font-semibold">{formatCurrencyBRL(valorServicos)}</p>
              </div>
              <div>
                <Label>Desconto</Label>
                <CurrencyInput value={form.valorDesconto} onValueChange={v => setForm(f => ({ ...f, valorDesconto: v }))} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total</Label>
                <p className="text-xl font-bold">{formatCurrencyBRL(valorTotal)}</p>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar Alterações" : "Criar OS"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog open={modalView} onOpenChange={setModalView}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OS {viewOS?.numero}</DialogTitle>
          </DialogHeader>
          {viewOS && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={statusConfig[viewOS.status].variant}>{statusConfig[viewOS.status].label}</Badge>
                <Badge variant={prioridadeConfig[viewOS.prioridade].variant}>{prioridadeConfig[viewOS.prioridade].label}</Badge>
                {viewOS.garantia && <Badge variant="outline">Garantia</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> <strong>{viewOS.clienteNome}</strong></div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span> <strong>{viewOS.clienteDoc}</strong></div>
                <div><span className="text-muted-foreground">Telefone:</span> <strong>{viewOS.clienteTelefone || "—"}</strong></div>
                <div><span className="text-muted-foreground">Técnico:</span> <strong>{viewOS.tecnicoResponsavel || "—"}</strong></div>
                <div><span className="text-muted-foreground">Equipamento:</span> <strong>{viewOS.equipamento || "—"}</strong></div>
                <div><span className="text-muted-foreground">Nº Série:</span> <strong>{viewOS.numeroSerie || "—"}</strong></div>
                <div><span className="text-muted-foreground">Abertura:</span> <strong>{format(new Date(viewOS.dataAbertura), "dd/MM/yyyy HH:mm")}</strong></div>
                <div><span className="text-muted-foreground">Previsão:</span> <strong>{viewOS.dataPrevista ? format(new Date(viewOS.dataPrevista), "dd/MM/yyyy") : "—"}</strong></div>
                {viewOS.dataConclusao && <div><span className="text-muted-foreground">Conclusão:</span> <strong>{format(new Date(viewOS.dataConclusao), "dd/MM/yyyy HH:mm")}</strong></div>}
              </div>

              <Separator />
              <div><Label className="text-xs text-muted-foreground">Problema</Label><p className="text-sm">{viewOS.descricaoProblema}</p></div>
              {viewOS.descricaoSolucao && <div><Label className="text-xs text-muted-foreground">Solução</Label><p className="text-sm">{viewOS.descricaoSolucao}</p></div>}

              {viewOS.itens.length > 0 && (
                <>
                  <Separator />
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewOS.itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Badge variant={item.tipo === "servico" ? "default" : "secondary"}>{item.tipo === "servico" ? "Serviço" : "Produto"}</Badge></TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="text-center">{item.quantidade}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Produtos: {formatCurrencyBRL(viewOS.valorProdutos)} | Serviços: {formatCurrencyBRL(viewOS.valorServicos)}</p>
                {viewOS.valorDesconto > 0 && <p className="text-sm text-muted-foreground">Desconto: -{formatCurrencyBRL(viewOS.valorDesconto)}</p>}
                <p className="text-xl font-bold">Total: {formatCurrencyBRL(viewOS.valorTotal)}</p>
              </div>
              {viewOS.observacao && <div className="text-sm text-muted-foreground">Obs: {viewOS.observacao}</div>}

              {/* Histórico / Acompanhamento */}
              <Separator />
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Clock className="h-4 w-4" /> Histórico de Acompanhamento
                </Label>

                {/* Add note form */}
                {viewOS.status !== "concluida" && viewOS.status !== "cancelada" && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="Responsável"
                      value={historicoResponsavel}
                      onChange={e => setHistoricoResponsavel(e.target.value)}
                      className="w-36"
                    />
                    <Input
                      placeholder="Descreva a interação ou evolução..."
                      value={historicoNota}
                      onChange={e => setHistoricoNota(e.target.value)}
                      className="flex-1"
                      onKeyDown={e => e.key === "Enter" && adicionarNota(viewOS.id)}
                    />
                    <Button size="sm" onClick={() => adicionarNota(viewOS.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Registrar
                    </Button>
                  </div>
                )}

                {(viewOS.historico || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {[...(viewOS.historico || [])].reverse().map(h => (
                      <div key={h.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border bg-muted/30">
                        <div className={`mt-0.5 p-1 rounded-full ${h.tipo === "status" ? "bg-primary/10" : h.tipo === "interacao" ? "bg-accent" : "bg-muted"}`}>
                          {h.tipo === "status" ? <CheckCircle2 className="h-3 w-3 text-primary" /> : <Wrench className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{h.descricao}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{format(new Date(h.data), "dd/MM/yyyy HH:mm")}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">· {h.responsavel}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
