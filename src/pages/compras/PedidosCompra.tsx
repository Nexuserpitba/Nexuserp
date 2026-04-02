import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, ShoppingCart,
  Package, CheckCircle2, Clock, XCircle, Printer, Copy
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { format } from "date-fns";

// ========== Interfaces ==========

interface ItemPedido {
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  valorTotal: number;
  ncm: string;
}

interface PedidoCompra {
  id: string;
  numero: string;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorDoc: string;
  dataEmissao: string;
  dataEntrega: string;
  status: "rascunho" | "enviado" | "parcial" | "recebido" | "cancelado";
  condicaoPagamento: string;
  formaPagamento: string;
  itens: ItemPedido[];
  valorTotal: number;
  valorDesconto: number;
  valorFrete: number;
  valorLiquido: number;
  observacao: string;
  empresaId: string;
}

interface Pessoa {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
  status: string;
  razaoSocial: string;
  nomeFantasia: string;
  email: string;
  telefone: string;
  celular: string;
  cidade: string;
  uf: string;
}

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  custoAquisicao: number;
  venda: number;
  estoque: number;
  ncm: string;
  barras: string;
  ativo: boolean;
}

interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
}

// ========== Helpers ==========

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function gerarNumeroPedido(pedidos: PedidoCompra[]): string {
  const maxNum = pedidos.reduce((max, p) => {
    const n = parseInt(p.numero, 10);
    return n > max ? n : max;
  }, 0);
  return String(maxNum + 1).padStart(6, "0");
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  enviado: { label: "Enviado", variant: "default" },
  parcial: { label: "Parcial", variant: "outline" },
  recebido: { label: "Recebido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

const condicoesPagamento = [
  "À Vista", "7 dias", "14 dias", "21 dias", "28 dias", "30 dias",
  "30/60 dias", "30/60/90 dias", "30/60/90/120 dias",
];

const formasPagamento = [
  "Boleto", "Transferência", "PIX", "Cartão", "Cheque", "Dinheiro",
];

// ========== Componente ==========

const defaultPedidos: PedidoCompra[] = [];

export default function PedidosCompra() {
  const { items: pedidos, addItem, updateItem, deleteItem } = useLocalStorage<PedidoCompra>("pedidos_compra", defaultPedidos);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingPedido, setViewingPedido] = useState<PedidoCompra | null>(null);

  // Dados integrados
  const [fornecedores, setFornecedores] = useState<Pessoa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const pessoas = loadFromStorage<Pessoa>("pessoas", []);
    setFornecedores(pessoas.filter(p => p.tipo === "Fornecedor" && p.status === "Ativo"));
    setProdutos(loadFromStorage<Produto>("produtos", []).filter(p => p.ativo));
    setEmpresas(loadFromStorage<Empresa>("empresas", []));
  }, [modalOpen]);

  // Form state
  const [fornecedorId, setFornecedorId] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [condicaoPag, setCondicaoPag] = useState("30 dias");
  const [formaPag, setFormaPag] = useState("Boleto");
  const [valorFrete, setValorFrete] = useState(0);
  const [observacao, setObservacao] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [itens, setItens] = useState<ItemPedido[]>([]);

  // Add item form
  const [addProdutoId, setAddProdutoId] = useState("");
  const [addQtd, setAddQtd] = useState(1);
  const [addValorUnit, setAddValorUnit] = useState(0);
  const [addDesconto, setAddDesconto] = useState(0);
  const [searchProduto, setSearchProduto] = useState("");

  const produtosFiltrados = useMemo(() => {
    if (!searchProduto) return produtos.slice(0, 20);
    const q = searchProduto.toLowerCase();
    return produtos.filter(p =>
      p.descricao.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.barras?.includes(q)
    ).slice(0, 20);
  }, [produtos, searchProduto]);

  const totais = useMemo(() => {
    const subtotal = itens.reduce((s, i) => s + i.valorTotal, 0);
    const descontoTotal = itens.reduce((s, i) => s + i.desconto * i.quantidade, 0);
    const liquido = subtotal + valorFrete;
    return { subtotal, descontoTotal, liquido };
  }, [itens, valorFrete]);

  function resetForm() {
    setFornecedorId("");
    setDataEntrega("");
    setCondicaoPag("30 dias");
    setFormaPag("Boleto");
    setValorFrete(0);
    setObservacao("");
    setEmpresaId("");
    setItens([]);
    setEditingId(null);
    setSearchProduto("");
    setAddProdutoId("");
    setAddQtd(1);
    setAddValorUnit(0);
    setAddDesconto(0);
  }

  function openNew() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(pedido: PedidoCompra) {
    setEditingId(pedido.id);
    setFornecedorId(pedido.fornecedorId);
    setDataEntrega(pedido.dataEntrega);
    setCondicaoPag(pedido.condicaoPagamento);
    setFormaPag(pedido.formaPagamento);
    setValorFrete(pedido.valorFrete);
    setObservacao(pedido.observacao);
    setEmpresaId(pedido.empresaId);
    setItens([...pedido.itens]);
    setModalOpen(true);
  }

  function openView(pedido: PedidoCompra) {
    setViewingPedido(pedido);
    setViewModalOpen(true);
  }

  function addItemPedido() {
    const prod = produtos.find(p => p.id === addProdutoId);
    if (!prod) { toast.error("Selecione um produto"); return; }
    if (addQtd <= 0) { toast.error("Quantidade inválida"); return; }

    const exists = itens.find(i => i.produtoId === prod.id);
    if (exists) { toast.error("Produto já adicionado. Edite a quantidade."); return; }

    const valorTotal = (addValorUnit - addDesconto) * addQtd;
    setItens(prev => [...prev, {
      produtoId: prod.id,
      codigo: prod.codigo,
      descricao: prod.descricao,
      unidade: prod.unidade,
      quantidade: addQtd,
      valorUnitario: addValorUnit,
      desconto: addDesconto,
      valorTotal,
      ncm: prod.ncm,
    }]);
    setAddProdutoId("");
    setAddQtd(1);
    setAddValorUnit(0);
    setAddDesconto(0);
    setSearchProduto("");
  }

  function removeItem(produtoId: string) {
    setItens(prev => prev.filter(i => i.produtoId !== produtoId));
  }

  function handleSelectProduto(prodId: string) {
    setAddProdutoId(prodId);
    const prod = produtos.find(p => p.id === prodId);
    if (prod) {
      setAddValorUnit(prod.custoAquisicao);
      setSearchProduto(prod.descricao);
    }
  }

  function salvar(status: "rascunho" | "enviado" = "rascunho") {
    if (!fornecedorId) { toast.error("Selecione o fornecedor"); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item"); return; }

    const forn = fornecedores.find(f => f.id === fornecedorId);

    const data: Omit<PedidoCompra, "id"> = {
      numero: editingId ? pedidos.find(p => p.id === editingId)!.numero : gerarNumeroPedido(pedidos),
      fornecedorId,
      fornecedorNome: forn?.razaoSocial || forn?.nome || "",
      fornecedorDoc: forn?.cpfCnpj || "",
      dataEmissao: editingId ? pedidos.find(p => p.id === editingId)!.dataEmissao : format(new Date(), "yyyy-MM-dd"),
      dataEntrega,
      status,
      condicaoPagamento: condicaoPag,
      formaPagamento: formaPag,
      itens,
      valorTotal: totais.subtotal,
      valorDesconto: totais.descontoTotal,
      valorFrete,
      valorLiquido: totais.liquido,
      observacao,
      empresaId,
    };

    if (editingId) {
      updateItem(editingId, data);
      toast.success("Pedido atualizado!");
    } else {
      addItem(data);
      toast.success(`Pedido ${data.numero} criado como ${statusConfig[status].label}!`);
    }
    setModalOpen(false);
    resetForm();
  }

  function duplicarPedido(pedido: PedidoCompra) {
    const novoNumero = gerarNumeroPedido(pedidos);
    addItem({
      ...pedido,
      numero: novoNumero,
      dataEmissao: format(new Date(), "yyyy-MM-dd"),
      status: "rascunho",
      dataEntrega: "",
    } as Omit<PedidoCompra, "id">);
    toast.success(`Pedido duplicado: ${novoNumero}`);
  }

  function alterarStatus(id: string, status: PedidoCompra["status"]) {
    updateItem(id, { status } as Partial<PedidoCompra>);
    toast.success(`Status alterado para ${statusConfig[status].label}`);
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      const matchSearch = !search ||
        p.numero.includes(search) ||
        p.fornecedorNome.toLowerCase().includes(search.toLowerCase()) ||
        p.fornecedorDoc.includes(search);
      const matchStatus = filterStatus === "todos" || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [pedidos, search, filterStatus]);

  const resumo = useMemo(() => ({
    total: pedidos.length,
    rascunho: pedidos.filter(p => p.status === "rascunho").length,
    enviado: pedidos.filter(p => p.status === "enviado").length,
    recebido: pedidos.filter(p => p.status === "recebido").length,
    valorTotal: pedidos.filter(p => p.status !== "cancelado").reduce((s, p) => s + p.valorLiquido, 0),
  }), [pedidos]);

  const exportOptions = {
    title: "Pedidos de Compra",
    filename: "pedidos-compra",
    columns: [
      { header: "Nº", key: "numero" },
      { header: "Fornecedor", key: "fornecedor" },
      { header: "CNPJ/CPF", key: "doc" },
      { header: "Emissão", key: "emissao" },
      { header: "Entrega", key: "entrega" },
      { header: "Status", key: "status" },
      { header: "Itens", key: "itens" },
      { header: "Valor Total", key: "valor", align: "right" as const },
    ],
    data: pedidosFiltrados.map(p => ({
      numero: p.numero,
      fornecedor: p.fornecedorNome,
      doc: p.fornecedorDoc,
      emissao: p.dataEmissao,
      entrega: p.dataEntrega || "-",
      status: statusConfig[p.status]?.label,
      itens: p.itens.length,
      valor: formatCurrencyBRL(p.valorLiquido),
    })),
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Pedidos de Compra"
        description="Gerencie pedidos de compra integrados a fornecedores, produtos e estoque"
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{resumo.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Rascunhos</p>
          <p className="text-xl font-bold text-muted-foreground">{resumo.rascunho}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Enviados</p>
          <p className="text-xl font-bold text-primary">{resumo.enviado}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Recebidos</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{resumo.recebido}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-lg font-bold">{formatCurrencyBRL(resumo.valorTotal)}</p>
        </CardContent></Card>
      </div>

      {/* Barra de ações */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="flex gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, fornecedor ou CNPJ..."
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <ExportButtons options={exportOptions} />
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Pedido</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosFiltrados.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum pedido encontrado
                </TableCell></TableRow>
              ) : pedidosFiltrados.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onDoubleClick={() => openView(p)}>
                  <TableCell className="font-mono font-medium">{p.numero}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{p.fornecedorNome}</p>
                      <p className="text-xs text-muted-foreground">{p.fornecedorDoc}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.dataEmissao}</TableCell>
                  <TableCell className="text-sm">{p.dataEntrega || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[p.status]?.variant}>{statusConfig[p.status]?.label}</Badge>
                  </TableCell>
                  <TableCell>{p.itens.length}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrencyBRL(p.valorLiquido)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openView(p)}>
                          <Eye className="h-4 w-4 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        {p.status === "rascunho" && (
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => duplicarPedido(p)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        {p.status === "rascunho" && (
                          <DropdownMenuItem onClick={() => alterarStatus(p.id, "enviado")}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar Enviado
                          </DropdownMenuItem>
                        )}
                        {p.status === "enviado" && (
                          <DropdownMenuItem onClick={() => alterarStatus(p.id, "recebido")}>
                            <Package className="h-4 w-4 mr-2" /> Marcar Recebido
                          </DropdownMenuItem>
                        )}
                        {p.status !== "cancelado" && p.status !== "recebido" && (
                          <DropdownMenuItem onClick={() => alterarStatus(p.id, "cancelado")} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" /> Cancelar
                          </DropdownMenuItem>
                        )}
                        {p.status === "rascunho" && (
                          <DropdownMenuItem onClick={() => deleteItem(p.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Pedido de Compra" : "Novo Pedido de Compra"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cabeçalho */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Empresa *</Label>
                <Select value={empresaId} onValueChange={setEmpresaId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nomeFantasia || e.razaoSocial} - {e.cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor *</Label>
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.razaoSocial || f.nome} - {f.cpfCnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fornecedores.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Nenhum fornecedor ativo cadastrado em Pessoas</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Previsão de Entrega</Label>
                <Input type="date" value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} />
              </div>
              <div>
                <Label>Condição de Pagamento</Label>
                <Select value={condicaoPag} onValueChange={setCondicaoPag}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {condicoesPagamento.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={formaPag} onValueChange={setFormaPag}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Adicionar Produto */}
            <div>
              <Label className="text-base font-semibold">Itens do Pedido</Label>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mt-2 items-end">
                <div className="md:col-span-2">
                  <Label className="text-xs">Produto</Label>
                  <Select value={addProdutoId} onValueChange={handleSelectProduto}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Buscar produto..."
                          value={searchProduto}
                          onChange={e => setSearchProduto(e.target.value)}
                          className="mb-2"
                        />
                      </div>
                      {produtosFiltrados.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo} - {p.descricao}
                        </SelectItem>
                      ))}
                      {produtosFiltrados.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">Nenhum produto encontrado</p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Qtd</Label>
                  <Input type="number" min={1} value={addQtd} onChange={e => setAddQtd(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Valor Unit.</Label>
                  <CurrencyInput value={addValorUnit} onValueChange={setAddValorUnit} />
                </div>
                <div>
                  <Label className="text-xs">Desconto</Label>
                  <CurrencyInput value={addDesconto} onValueChange={setAddDesconto} />
                </div>
                <div>
                  <Button onClick={addItemPedido} className="w-full"><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                </div>
              </div>
            </div>

            {/* Lista de Itens */}
            {itens.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>UN</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Vl. Unit.</TableHead>
                    <TableHead className="text-right">Desc.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map(item => (
                    <TableRow key={item.produtoId}>
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="text-sm">{item.descricao}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyBRL(item.desconto)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.produtoId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Totais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Observações</Label>
                <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Valor do Frete</Label>
                  <CurrencyInput value={valorFrete} onValueChange={setValorFrete} />
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrencyBRL(totais.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descontos:</span>
                  <span className="text-destructive">-{formatCurrencyBRL(totais.descontoTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete:</span>
                  <span>{formatCurrencyBRL(valorFrete)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrencyBRL(totais.liquido)}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button variant="secondary" onClick={() => salvar("rascunho")}>
              <Clock className="h-4 w-4 mr-1" /> Salvar Rascunho
            </Button>
            <Button onClick={() => salvar("enviado")}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Salvar e Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido de Compra #{viewingPedido?.numero}</DialogTitle>
          </DialogHeader>
          {viewingPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Fornecedor:</span><p className="font-medium">{viewingPedido.fornecedorNome}</p></div>
                <div><span className="text-muted-foreground">CNPJ/CPF:</span><p className="font-medium">{viewingPedido.fornecedorDoc}</p></div>
                <div><span className="text-muted-foreground">Status:</span><p><Badge variant={statusConfig[viewingPedido.status]?.variant}>{statusConfig[viewingPedido.status]?.label}</Badge></p></div>
                <div><span className="text-muted-foreground">Emissão:</span><p>{viewingPedido.dataEmissao}</p></div>
                <div><span className="text-muted-foreground">Entrega:</span><p>{viewingPedido.dataEntrega || "-"}</p></div>
                <div><span className="text-muted-foreground">Pagamento:</span><p>{viewingPedido.condicaoPagamento} / {viewingPedido.formaPagamento}</p></div>
              </div>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Vl. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingPedido.itens.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.codigo} - {item.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">{item.ncm}</TableCell>
                      <TableCell className="text-right">{item.quantidade} {item.unidade}</TableCell>
                      <TableCell className="text-right">{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <div className="space-y-1 text-sm w-64">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrencyBRL(viewingPedido.valorTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Frete:</span><span>{formatCurrencyBRL(viewingPedido.valorFrete)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-base"><span>Total:</span><span>{formatCurrencyBRL(viewingPedido.valorLiquido)}</span></div>
                </div>
              </div>
              {viewingPedido.observacao && (
                <div><Label className="text-muted-foreground">Observações:</Label><p className="text-sm mt-1">{viewingPedido.observacao}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
