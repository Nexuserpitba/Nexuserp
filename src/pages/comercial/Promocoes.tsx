import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Percent, Package, ChevronsUpDown, Check, ShoppingBag, Gift } from "lucide-react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ProdutoSearchSelect({ produtos, value, selectedLabel, onSelect }: {
  produtos: any[];
  value: string;
  selectedLabel: string;
  onSelect: (prod: any) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal h-10">
          {value ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">Buscar produto...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Digite código ou descrição..." />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {produtos.map((p: any) => (
                <CommandItem
                  key={p.codigo || p.id}
                  value={`${p.codigo} ${p.descricao}`}
                  onSelect={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === p.codigo ? "opacity-100" : "opacity-0")} />
                  <span className="font-mono text-xs mr-2">{p.codigo}</span>
                  <span className="truncate">{p.descricao}</span>
                  {p.venda > 0 && (
                    <span className="ml-auto text-xs font-mono text-muted-foreground">R$ {p.venda.toFixed(2)}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type TipoPromocao = "desconto" | "leveXPagueY" | "kit";

interface ProdutoPromo {
  produtoCodigo: string;
  produtoDescricao: string;
  aplicacao: string;
  vendaOriginal: number;
  vendaPromocao: number;
  descontoReais: number;
  percentualDesconto: number;
  codigoAuxiliar: string;
}

interface KitProduto {
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
  precoOriginal: number;
}

interface Promocao {
  id: string;
  codigo: string;
  status: "ABERTO" | "FECHADO" | "CANCELADO";
  empresa: string;
  inicio: string;
  inicioHora: string;
  fim: string;
  fimHora: string;
  descricao: string;
  diasSemana: string[];
  validarFatorCaixa: boolean;
  validarProdutosDuplicados: boolean;
  produtos: ProdutoPromo[];
  // Tipo de promoção
  tipoPromocao: TipoPromocao;
  // Leve X Pague Y
  leveQuantidade: number;
  pagueQuantidade: number;
  // Kit por Valor
  kitValor: number;
  kitProdutos: KitProduto[];
}

const diasSemanaOptions = [
  "Segunda-Feira", "Terça-Feira", "Quarta-Feira",
  "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo",
];

const defaultPromocoes: Promocao[] = [
  {
    id: "1", codigo: "001", status: "ABERTO", empresa: "1",
    inicio: "2026-03-01", inicioHora: "00:00", fim: "2026-03-31", fimHora: "23:59",
    descricao: "Promoção de Março",
    diasSemana: ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"],
    validarFatorCaixa: true, validarProdutosDuplicados: true,
    tipoPromocao: "desconto", leveQuantidade: 3, pagueQuantidade: 2, kitValor: 0, kitProdutos: [],
    produtos: [
      { produtoCodigo: "001", produtoDescricao: "Smartphone X Pro 128GB", aplicacao: "Venda Direta", vendaOriginal: 2499.99, vendaPromocao: 2199.99, descontoReais: 300, percentualDesconto: 12, codigoAuxiliar: "" },
    ],
  },
  {
    id: "2", codigo: "002", status: "ABERTO", empresa: "1",
    inicio: "2026-03-01", inicioHora: "00:00", fim: "2026-03-31", fimHora: "23:59",
    descricao: "Leve 3 Pague 2 — Fone Bluetooth",
    diasSemana: ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo"],
    validarFatorCaixa: true, validarProdutosDuplicados: true,
    tipoPromocao: "leveXPagueY", leveQuantidade: 3, pagueQuantidade: 2, kitValor: 0, kitProdutos: [],
    produtos: [
      { produtoCodigo: "003", produtoDescricao: "Fone Bluetooth Z400", aplicacao: "Todas", vendaOriginal: 129.90, vendaPromocao: 0, descontoReais: 0, percentualDesconto: 0, codigoAuxiliar: "" },
    ],
  },
  {
    id: "3", codigo: "003", status: "ABERTO", empresa: "1",
    inicio: "2026-03-01", inicioHora: "00:00", fim: "2026-03-31", fimHora: "23:59",
    descricao: "Kit Gamer — Mouse + Teclado",
    diasSemana: ["Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado", "Domingo"],
    validarFatorCaixa: true, validarProdutosDuplicados: true,
    tipoPromocao: "kit", leveQuantidade: 3, pagueQuantidade: 2, kitValor: 449.90, kitProdutos: [
      { produtoCodigo: "005", produtoDescricao: "Mouse Gamer RGB", quantidade: 1, precoOriginal: 199.90 },
      { produtoCodigo: "006", produtoDescricao: "Teclado Mecânico Pro", quantidade: 1, precoOriginal: 349.90 },
    ],
    produtos: [],
  },
];

const emptyForm = (): Omit<Promocao, "id"> => ({
  codigo: "", status: "ABERTO", empresa: "",
  inicio: "", inicioHora: "00:00", fim: "", fimHora: "23:59",
  descricao: "",
  diasSemana: [],
  validarFatorCaixa: true, validarProdutosDuplicados: true,
  tipoPromocao: "desconto",
  leveQuantidade: 3, pagueQuantidade: 2,
  kitValor: 0, kitProdutos: [],
  produtos: [],
});

const emptyProduto = (): ProdutoPromo => ({
  produtoCodigo: "", produtoDescricao: "", aplicacao: "Venda Direta",
  vendaOriginal: 0, vendaPromocao: 0, descontoReais: 0, percentualDesconto: 0, codigoAuxiliar: "",
});

function getEmpresasCadastro(): { id: string; nome: string; cnpj: string; selecionada?: boolean }[] {
  try {
    const s = localStorage.getItem("empresas");
    if (!s) return [];
    const list = JSON.parse(s);
    return list.map((e: any) => ({
      id: e.id || e.cnpj,
      nome: e.nomeFantasia || e.razaoSocial || "",
      cnpj: e.cnpj || "",
      selecionada: e.selecionada,
    }));
  } catch {
    return [];
  }
}

function getEmpresaAtivaNome(): string {
  const empresas = getEmpresasCadastro();
  const ativa = empresas.find(e => e.selecionada) || empresas[0];
  return ativa ? ativa.nome : "";
}

export default function Promocoes() {
  const { items, addItem, updateItem, deleteItem } = useLocalStorage<Promocao>("promocoes", defaultPromocoes);
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Promocao, "id">>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [produtoDialog, setProdutoDialog] = useState(false);
  const [produtoForm, setProdutoForm] = useState<ProdutoPromo>(emptyProduto());
  const [editingProdutoIdx, setEditingProdutoIdx] = useState<number | null>(null);
  const [loteDialog, setLoteDialog] = useState(false);
  const [loteSelecionados, setLoteSelecionados] = useState<Set<string>>(new Set());
  const [loteBusca, setLoteBusca] = useState("");
  const [loteDesconto, setLoteDesconto] = useState(0);
  const [loteTipoDesconto, setLoteTipoDesconto] = useState<"percent" | "reais">("percent");
  const [kitProdutoDialog, setKitProdutoDialog] = useState(false);
  const [kitProdutoForm, setKitProdutoForm] = useState<KitProduto>({ produtoCodigo: "", produtoDescricao: "", quantidade: 1, precoOriginal: 0 });

  // Load available products from cadastro
  const produtosCadastro = useMemo(() => {
    try {
      const stored = localStorage.getItem("produtos");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            codigo: p.codigo || p.id,
            descricao: p.descricao || "",
            venda: Number(p.venda) || 0,
          }));
        }
      }
    } catch { /* erro ignorado */ }
    // Fallback: demo products matching PDV
    return [
      { codigo: "001", descricao: "Smartphone X Pro 128GB", venda: 2499.99 },
      { codigo: "002", descricao: "Notebook Ultra 15 i7", venda: 5999.99 },
      { codigo: "003", descricao: "Fone Bluetooth Z400", venda: 129.90 },
      { codigo: "004", descricao: "Cabo USB-C 2m Premium", venda: 39.90 },
      { codigo: "005", descricao: "Mouse Gamer RGB", venda: 199.90 },
      { codigo: "006", descricao: "Teclado Mecânico Pro", venda: 349.90 },
    ];
  }, [dialogOpen]);

  const empresasNaLista = useMemo(() => {
    const set = new Set(items.map(p => p.empresa).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = items.filter(p => {
    const matchSearch = p.codigo.includes(search) ||
      p.descricao.toLowerCase().includes(search.toLowerCase()) ||
      p.status.toLowerCase().includes(search.toLowerCase());
    const matchEmpresa = filterEmpresa === "todas" || p.empresa === filterEmpresa;
    return matchSearch && matchEmpresa;
  });

  const openNew = () => {
    const nextCode = String(items.length + 1).padStart(3, "0");
    setForm({ ...emptyForm(), codigo: nextCode, empresa: getEmpresaAtivaNome() });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Promocao) => {
    const { id, ...rest } = p;
    setForm(rest);
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.codigo || !form.inicio || !form.fim) {
      toast.error("Preencha código, data início e fim");
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Promoção atualizada!");
    } else {
      addItem(form);
      toast.success("Promoção cadastrada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
    setDeleteConfirm(null);
    toast.success("Promoção excluída!");
  };

  const toggleDia = (dia: string) => {
    setForm(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter(d => d !== dia)
        : [...prev.diasSemana, dia],
    }));
  };

  const openAddProduto = () => {
    setProdutoForm(emptyProduto());
    setEditingProdutoIdx(null);
    setProdutoDialog(true);
  };

  const openEditProduto = (idx: number) => {
    setProdutoForm({ ...form.produtos[idx] });
    setEditingProdutoIdx(idx);
    setProdutoDialog(true);
  };

  const saveProduto = () => {
    if (!produtoForm.produtoCodigo || !produtoForm.produtoDescricao) {
      toast.error("Selecione um produto");
      return;
    }
    if (editingProdutoIdx !== null) {
      const updated = [...form.produtos];
      updated[editingProdutoIdx] = produtoForm;
      setForm(prev => ({ ...prev, produtos: updated }));
    } else {
      setForm(prev => ({ ...prev, produtos: [...prev.produtos, produtoForm] }));
    }
    setProdutoDialog(false);
    toast.success("Produto adicionado à promoção");
  };

  const removeProduto = (idx: number) => {
    setForm(prev => ({ ...prev, produtos: prev.produtos.filter((_, i) => i !== idx) }));
  };

  const openLote = () => {
    setLoteSelecionados(new Set());
    setLoteBusca("");
    setLoteDesconto(0);
    setLoteTipoDesconto("percent");
    setLoteDialog(true);
  };

  const toggleLoteProduto = (codigo: string) => {
    setLoteSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const salvarLote = () => {
    if (loteSelecionados.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    const novos: ProdutoPromo[] = [];
    const jaExistem = new Set(form.produtos.map(p => p.produtoCodigo));
    loteSelecionados.forEach(codigo => {
      if (jaExistem.has(codigo) && form.validarProdutosDuplicados) return;
      const prod = produtosCadastro.find((p: any) => p.codigo === codigo);
      if (!prod) return;
      const precoOriginal = prod.venda || 0;
      let descontoR = 0;
      let pct = 0;
      let precoPromo = precoOriginal;
      if (loteDesconto > 0 && precoOriginal > 0) {
        if (loteTipoDesconto === "percent") {
          pct = loteDesconto;
          descontoR = Number((precoOriginal * pct / 100).toFixed(2));
          precoPromo = Number((precoOriginal - descontoR).toFixed(2));
        } else {
          descontoR = loteDesconto;
          precoPromo = Number((precoOriginal - descontoR).toFixed(2));
          pct = Number(((descontoR / precoOriginal) * 100).toFixed(2));
        }
      }
      novos.push({
        produtoCodigo: prod.codigo,
        produtoDescricao: prod.descricao,
        aplicacao: "Todas",
        vendaOriginal: precoOriginal,
        vendaPromocao: precoPromo > 0 ? precoPromo : 0,
        descontoReais: descontoR > 0 ? descontoR : 0,
        percentualDesconto: pct > 0 ? pct : 0,
        codigoAuxiliar: "",
      });
    });
    if (novos.length === 0) {
      toast.warning("Todos os produtos selecionados já estão na promoção");
      return;
    }
    setForm(prev => ({ ...prev, produtos: [...prev.produtos, ...novos] }));
    setLoteDialog(false);
    toast.success(`${novos.length} produto(s) adicionado(s) à promoção`);
  };

  const selectProdutoCadastro = (prod: any) => {
    const precoOriginal = prod.venda || 0;
    setProdutoForm(prev => ({
      ...prev,
      produtoCodigo: prod.codigo,
      produtoDescricao: prod.descricao,
      vendaOriginal: precoOriginal,
      vendaPromocao: prev.vendaPromocao || precoOriginal,
      descontoReais: prev.vendaPromocao > 0 && precoOriginal > 0
        ? Number((precoOriginal - prev.vendaPromocao).toFixed(2))
        : 0,
      percentualDesconto: prev.vendaPromocao > 0 && precoOriginal > 0
        ? Number((((precoOriginal - prev.vendaPromocao) / precoOriginal) * 100).toFixed(2))
        : 0,
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ABERTO": return "default";
      case "FECHADO": return "secondary";
      case "CANCELADO": return "destructive";
      default: return "outline" as const;
    }
  };

  const hoje = new Date().toISOString().split("T")[0];

  return (
    <div className="page-container">
      <PageHeader
        title="Promoções"
        description="Gerencie promoções de produtos com períodos, dias da semana e descontos"
        actions={
          <div className="flex gap-2 flex-wrap">
            <ExportButtons options={{
              title: "Promoções",
              filename: `Promocoes_${hoje}`,
              columns: [
                { header: "Código", key: "codigo" },
                { header: "Descrição", key: "descricao" },
                { header: "Status", key: "status" },
                { header: "Início", key: "inicio" },
                { header: "Fim", key: "fim" },
                { header: "Produtos", key: "produtos", format: (v: any[]) => String(v.length) },
              ],
              data: items,
            }} />
            <Button onClick={openNew}><Plus size={16} className="mr-2" /> Nova Promoção</Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Percent className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Promoções</p>
              <p className="text-xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Percent className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Ativas Hoje</p>
              <p className="text-xl font-bold text-primary">
                {items.filter(p => p.status === "ABERTO" && p.inicio <= hoje && p.fim >= hoje).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos em Promoção</p>
              <p className="text-xl font-bold">
                {items.filter(p => p.status === "ABERTO").reduce((s, p) => s + p.produtos.length, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código, descrição ou status..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            {empresasNaLista.length > 0 && (
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as empresas</SelectItem>
                  {empresasNaLista.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead className="text-right">Produtos</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.codigo}</TableCell>
                  <TableCell className="font-medium">{p.descricao || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">{p.empresa || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {(p.tipoPromocao || "desconto") === "desconto" ? "Desconto" : (p.tipoPromocao || "desconto") === "leveXPagueY" ? `Leve ${p.leveQuantidade || 3} Pague ${p.pagueQuantidade || 2}` : `Kit R$ ${formatCurrencyBRL(p.kitValor || 0)}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(p.status) as any}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{p.inicio ? new Date(p.inicio + "T00:00").toLocaleDateString("pt-BR") : "—"} {p.inicioHora}</TableCell>
                  <TableCell className="whitespace-nowrap">{p.fim ? new Date(p.fim + "T00:00").toLocaleDateString("pt-BR") : "—"} {p.fimHora}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-0.5">
                      {p.diasSemana.map(d => (
                        <Badge key={d} variant="outline" className="text-[9px] h-4 px-1">{d.slice(0, 3)}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold">{p.produtos.length}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma promoção encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Main Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Código *</Label>
                <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="font-mono" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTO">ABERTO</SelectItem>
                    <SelectItem value="FECHADO">FECHADO</SelectItem>
                    <SelectItem value="CANCELADO">CANCELADO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Empresa</Label>
                {(() => {
                  const empresas = getEmpresasCadastro();
                  return empresas.length > 0 ? (
                    <Select value={form.empresa} onValueChange={v => setForm({ ...form, empresa: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                      <SelectContent>
                        {empresas.map(e => (
                          <SelectItem key={e.id} value={e.nome}>
                            {e.nome} {e.cnpj ? `(${e.cnpj})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="Nome da empresa" />
                  );
                })()}
              </div>
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>Início *</Label>
                <Input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} />
              </div>
              <div>
                <Label>Hora Início</Label>
                <Input type="time" value={form.inicioHora} onChange={e => setForm({ ...form, inicioHora: e.target.value })} />
              </div>
              <div>
                <Label>Fim *</Label>
                <Input type="date" value={form.fim} onChange={e => setForm({ ...form, fim: e.target.value })} />
              </div>
              <div>
                <Label>Hora Fim</Label>
                <Input type="time" value={form.fimHora} onChange={e => setForm({ ...form, fimHora: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>

            {/* Tipo de Promoção */}
            <div>
              <Label className="mb-2 block font-semibold">Tipo de Promoção</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { value: "desconto" as TipoPromocao, label: "Desconto", desc: "Desconto direto no preço", icon: Percent },
                  { value: "leveXPagueY" as TipoPromocao, label: "Leve X Pague Y", desc: "Ex: Leve 3 Pague 2", icon: Gift },
                  { value: "kit" as TipoPromocao, label: "Kit por Valor", desc: "Combo com preço fixo", icon: ShoppingBag },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, tipoPromocao: opt.value })}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left",
                      form.tipoPromocao === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg",
                      form.tipoPromocao === opt.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <opt.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Leve X Pague Y config */}
            {form.tipoPromocao === "leveXPagueY" && (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardContent className="p-4 space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Gift size={16} className="text-primary" /> Configuração Leve X Pague Y
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Leve (quantidade)</Label>
                      <Input
                        type="number"
                        min="2"
                        value={form.leveQuantidade}
                        onChange={e => setForm({ ...form, leveQuantidade: Math.max(2, Number(e.target.value)) })}
                        className="font-mono text-lg font-bold"
                      />
                    </div>
                    <div>
                      <Label>Pague (quantidade)</Label>
                      <Input
                        type="number"
                        min="1"
                        max={form.leveQuantidade - 1}
                        value={form.pagueQuantidade}
                        onChange={e => setForm({ ...form, pagueQuantidade: Math.max(1, Math.min(form.leveQuantidade - 1, Number(e.target.value))) })}
                        className="font-mono text-lg font-bold"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    O cliente leva <strong>{form.leveQuantidade}</strong> unidades e paga apenas <strong>{form.pagueQuantidade}</strong>.
                    Economia de <strong>{form.leveQuantidade - form.pagueQuantidade}</strong> unidade(s) grátis por compra.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Kit por Valor config */}
            {form.tipoPromocao === "kit" && (
              <Card className="border-primary/20 bg-primary/[0.02]">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingBag size={16} className="text-primary" /> Configuração do Kit
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor do Kit</Label>
                      <CurrencyInput
                        value={form.kitValor}
                        onValueChange={v => setForm({ ...form, kitValor: v })}
                        className="font-mono text-lg font-bold"
                      />
                    </div>
                    <div>
                      <Label>Valor Original (soma)</Label>
                      <Input
                        readOnly
                        disabled
                        value={`R$ ${formatCurrencyBRL((form.kitProdutos || []).reduce((s, kp) => s + (kp.precoOriginal * kp.quantidade), 0))}`}
                        className="font-mono text-lg bg-muted"
                      />
                    </div>
                  </div>
                  {(() => {
                    const somaOriginal = (form.kitProdutos || []).reduce((s, kp) => s + (kp.precoOriginal * kp.quantidade), 0);
                    const economia = somaOriginal > 0 ? somaOriginal - form.kitValor : 0;
                    return somaOriginal > 0 && form.kitValor > 0 ? (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                        Economia para o cliente: <strong className="text-primary">R$ {formatCurrencyBRL(economia > 0 ? economia : 0)}</strong>
                        {economia > 0 && somaOriginal > 0 && <> ({((economia / somaOriginal) * 100).toFixed(1)}%)</>}
                      </p>
                    ) : null;
                  })()}

                  {/* Kit products */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium">Produtos do Kit</Label>
                      <Button variant="outline" size="sm" onClick={() => {
                        setKitProdutoForm({ produtoCodigo: "", produtoDescricao: "", quantidade: 1, precoOriginal: 0 });
                        setKitProdutoDialog(true);
                      }}>
                        <Plus size={14} className="mr-1" /> Adicionar
                      </Button>
                    </div>
                    {(form.kitProdutos || []).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4 border border-dashed rounded-lg">Nenhum produto no kit</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Preço Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(form.kitProdutos || []).map((kp, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{kp.produtoCodigo}</TableCell>
                              <TableCell className="font-medium text-sm">{kp.produtoDescricao}</TableCell>
                              <TableCell className="text-right font-mono">{kp.quantidade}</TableCell>
                              <TableCell className="text-right font-mono text-sm">R$ {formatCurrencyBRL(kp.precoOriginal)}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-sm">R$ {formatCurrencyBRL(kp.precoOriginal * kp.quantidade)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                                  setForm(prev => ({ ...prev, kitProdutos: (prev.kitProdutos || []).filter((_, i) => i !== idx) }));
                                }}>
                                  <Trash2 size={12} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Days of week + options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Dias da Semana</Label>
                <div className="space-y-2">
                  {diasSemanaOptions.map(dia => (
                    <label key={dia} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.diasSemana.includes(dia)}
                        onCheckedChange={() => toggleDia(dia)}
                      />
                      {dia}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="mb-2 block">Opções de Validação</Label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.validarFatorCaixa}
                    onCheckedChange={(v) => setForm({ ...form, validarFatorCaixa: !!v })}
                  />
                  Validar Fator Caixa
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.validarProdutosDuplicados}
                    onCheckedChange={(v) => setForm({ ...form, validarProdutosDuplicados: !!v })}
                  />
                  Validar produtos duplicados
                </label>
              </div>
            </div>

            {/* Products section - shown for desconto and leveXPagueY */}
            {(form.tipoPromocao === "desconto" || form.tipoPromocao === "leveXPagueY") && <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold flex items-center gap-1.5">
                  <Package size={16} /> Produtos da Promoção
                </Label>
                <div className="flex gap-2">
                  {form.produtos.length > 0 && (
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => {
                      setForm(prev => ({ ...prev, produtos: [] }));
                      toast.success("Todos os produtos removidos");
                    }}>
                      <Trash2 size={14} className="mr-1" /> Remover Todos
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={openLote}>
                    <Package size={14} className="mr-1" /> Incluir em Lote
                  </Button>
                  <Button variant="outline" size="sm" onClick={openAddProduto}>
                    <Plus size={14} className="mr-1" /> Incluir
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Código</TableHead>
                     <TableHead>Produto</TableHead>
                     <TableHead>Aplicação</TableHead>
                     <TableHead className="text-right">Preço Venda</TableHead>
                     <TableHead className="text-right">Desc. R$</TableHead>
                     <TableHead className="text-right">% Desc.</TableHead>
                     <TableHead className="text-right">Preço Promoção</TableHead>
                     <TableHead>Cód. Auxiliar</TableHead>
                     <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.produtos.length === 0 ? (
                   <TableRow>
                       <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                         Não há registros para exibir.
                       </TableCell>
                     </TableRow>
                   ) : (
                     form.produtos.map((prod, idx) => {
                       return (
                         <TableRow key={idx}>
                           <TableCell className="font-mono">{prod.produtoCodigo}</TableCell>
                           <TableCell className="font-medium">{prod.produtoDescricao}</TableCell>
                           <TableCell>{prod.aplicacao}</TableCell>
                           <TableCell className="text-right font-mono text-muted-foreground">
                             {prod.vendaOriginal > 0 ? `R$ ${formatCurrencyBRL(prod.vendaOriginal)}` : "—"}
                           </TableCell>
                           <TableCell className="text-right font-mono text-destructive">
                             {prod.descontoReais > 0 ? `R$ ${formatCurrencyBRL(prod.descontoReais)}` : "—"}
                           </TableCell>
                           <TableCell className="text-right font-bold text-destructive">{prod.percentualDesconto.toFixed(1)}%</TableCell>
                           <TableCell className="text-right font-mono font-bold text-primary">R$ {formatCurrencyBRL(prod.vendaPromocao)}</TableCell>
                           <TableCell className="font-mono text-muted-foreground">{prod.codigoAuxiliar || "—"}</TableCell>
                           <TableCell>
                             <div className="flex gap-1">
                               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditProduto(idx)}>
                                 <Pencil size={12} />
                               </Button>
                               <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduto(idx)}>
                                 <Trash2 size={12} />
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       );
                     })
                  )}
                </TableBody>
              </Table>
            </div>}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Product to Promotion Dialog */}
      <Dialog open={produtoDialog} onOpenChange={setProdutoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProdutoIdx !== null ? "Editar Produto" : "Incluir Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produto</Label>
              <ProdutoSearchSelect
                produtos={produtosCadastro}
                value={produtoForm.produtoCodigo}
                selectedLabel={produtoForm.produtoCodigo ? `${produtoForm.produtoCodigo} — ${produtoForm.produtoDescricao}` : ""}
                onSelect={(prod: any) => selectProdutoCadastro(prod)}
              />
            </div>
            <div>
              <Label>Aplicação</Label>
              <Select value={produtoForm.aplicacao} onValueChange={v => setProdutoForm({ ...produtoForm, aplicacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Venda Direta">Venda Direta</SelectItem>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Todas">Todas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Preço de Venda Original (read-only) */}
            {produtoForm.vendaOriginal > 0 && (
              <div>
                <Label>Preço de Venda Normal</Label>
                <Input
                  value={`R$ ${formatCurrencyBRL(produtoForm.vendaOriginal)}`}
                  readOnly
                  disabled
                  className="font-mono bg-muted text-base font-bold"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Desconto R$</Label>
                <CurrencyInput
                  value={produtoForm.descontoReais}
                  onValueChange={v => {
                    const orig = produtoForm.vendaOriginal;
                    const novoPreco = orig > 0 ? Number((orig - v).toFixed(2)) : 0;
                    const pct = orig > 0 ? Number(((v / orig) * 100).toFixed(2)) : 0;
                    setProdutoForm({
                      ...produtoForm,
                      descontoReais: v,
                      vendaPromocao: novoPreco > 0 ? novoPreco : 0,
                      percentualDesconto: pct > 0 ? pct : 0,
                    });
                  }}
                />
              </div>
              <div>
                <Label>% Desconto</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={produtoForm.percentualDesconto}
                    onChange={e => {
                      const pct = Number(e.target.value);
                      const orig = produtoForm.vendaOriginal;
                      const descR = orig > 0 ? Number((orig * pct / 100).toFixed(2)) : 0;
                      const novoPreco = orig > 0 ? Number((orig - descR).toFixed(2)) : 0;
                      setProdutoForm({
                        ...produtoForm,
                        percentualDesconto: pct,
                        descontoReais: descR > 0 ? descR : 0,
                        vendaPromocao: novoPreco > 0 ? novoPreco : 0,
                      });
                    }}
                    className="font-mono pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                </div>
              </div>
              <div>
                <Label>Preço Promoção</Label>
                <CurrencyInput
                  value={produtoForm.vendaPromocao}
                  onValueChange={v => {
                    const orig = produtoForm.vendaOriginal;
                    const descR = orig > 0 ? Number((orig - v).toFixed(2)) : 0;
                    const pct = orig > 0 ? Number(((descR / orig) * 100).toFixed(2)) : 0;
                    setProdutoForm({
                      ...produtoForm,
                      vendaPromocao: v,
                      descontoReais: descR > 0 ? descR : 0,
                      percentualDesconto: pct > 0 ? pct : 0,
                    });
                  }}
                />
              </div>
            </div>
            <div>
              <Label>Cód. Auxiliar</Label>
              <Input value={produtoForm.codigoAuxiliar} onChange={e => setProdutoForm({ ...produtoForm, codigoAuxiliar: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProdutoDialog(false)}>Cancelar</Button>
            <Button onClick={saveProduto}>{editingProdutoIdx !== null ? "Salvar" : "Incluir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Add Dialog */}
      <Dialog open={loteDialog} onOpenChange={setLoteDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package size={18} /> Incluir Produtos em Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select value={loteTipoDesconto} onValueChange={(v: any) => setLoteTipoDesconto(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="reais">Valor (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{loteTipoDesconto === "percent" ? "% Desconto" : "Desconto R$"}</Label>
                {loteTipoDesconto === "percent" ? (
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={loteDesconto}
                      onChange={e => setLoteDesconto(Number(e.target.value))}
                      className="font-mono pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span>
                  </div>
                ) : (
                  <CurrencyInput value={loteDesconto} onValueChange={setLoteDesconto} />
                )}
              </div>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={loteBusca}
                onChange={e => setLoteBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{loteSelecionados.size} produto(s) selecionado(s)</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                  const filtered = produtosCadastro.filter((p: any) => {
                    if (!loteBusca.trim()) return true;
                    const q = loteBusca.toLowerCase();
                    return p.codigo?.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q);
                  });
                  setLoteSelecionados(new Set(filtered.map((p: any) => p.codigo)));
                }}>
                  Selecionar todos
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setLoteSelecionados(new Set())}>
                  Limpar
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto border border-border rounded-md min-h-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right w-28">Preço Venda</TableHead>
                  <TableHead className="text-right w-28">Preço Promo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosCadastro
                  .filter((p: any) => {
                    if (!loteBusca.trim()) return true;
                    const q = loteBusca.toLowerCase();
                    return p.codigo?.toLowerCase().includes(q) || p.descricao?.toLowerCase().includes(q);
                  })
                  .map((p: any) => {
                    const selected = loteSelecionados.has(p.codigo);
                    const preco = p.venda || 0;
                    let precoPromo = preco;
                    if (loteDesconto > 0 && preco > 0) {
                      if (loteTipoDesconto === "percent") {
                        precoPromo = Number((preco * (1 - loteDesconto / 100)).toFixed(2));
                      } else {
                        precoPromo = Number((preco - loteDesconto).toFixed(2));
                      }
                    }
                    const jaExiste = form.produtos.some(fp => fp.produtoCodigo === p.codigo);
                    return (
                      <TableRow
                        key={p.codigo}
                        className={cn(
                          "cursor-pointer",
                          selected && "bg-primary/10",
                          jaExiste && "opacity-50"
                        )}
                        onClick={() => !jaExiste && toggleLoteProduto(p.codigo)}
                      >
                        <TableCell>
                          <Checkbox checked={selected} disabled={jaExiste} onCheckedChange={() => !jaExiste && toggleLoteProduto(p.codigo)} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{p.descricao}</span>
                          {jaExiste && <Badge variant="outline" className="ml-2 text-[9px] h-4">Já incluído</Badge>}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {preco > 0 ? `R$ ${formatCurrencyBRL(preco)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold text-primary">
                          {loteDesconto > 0 && preco > 0 ? `R$ ${formatCurrencyBRL(precoPromo > 0 ? precoPromo : 0)}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {produtosCadastro.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum produto cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoteDialog(false)}>Cancelar</Button>
            <Button onClick={salvarLote} disabled={loteSelecionados.size === 0}>
              <Plus size={14} className="mr-1" /> Incluir {loteSelecionados.size} produto(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kit Product Dialog */}
      <Dialog open={kitProdutoDialog} onOpenChange={setKitProdutoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingBag size={18} /> Adicionar Produto ao Kit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produto</Label>
              <ProdutoSearchSelect
                produtos={produtosCadastro}
                value={kitProdutoForm.produtoCodigo}
                selectedLabel={kitProdutoForm.produtoCodigo ? `${kitProdutoForm.produtoCodigo} — ${kitProdutoForm.produtoDescricao}` : ""}
                onSelect={(prod: any) => {
                  setKitProdutoForm(prev => ({
                    ...prev,
                    produtoCodigo: prod.codigo,
                    produtoDescricao: prod.descricao,
                    precoOriginal: prod.venda || 0,
                  }));
                }}
              />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={kitProdutoForm.quantidade}
                onChange={e => setKitProdutoForm({ ...kitProdutoForm, quantidade: Math.max(1, Number(e.target.value)) })}
                className="font-mono"
              />
            </div>
            {kitProdutoForm.precoOriginal > 0 && (
              <p className="text-sm text-muted-foreground">
                Preço unitário: <strong>R$ {formatCurrencyBRL(kitProdutoForm.precoOriginal)}</strong> |
                Subtotal: <strong>R$ {formatCurrencyBRL(kitProdutoForm.precoOriginal * kitProdutoForm.quantidade)}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKitProdutoDialog(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!kitProdutoForm.produtoCodigo) { toast.error("Selecione um produto"); return; }
              setForm(prev => ({ ...prev, kitProdutos: [...(prev.kitProdutos || []), kitProdutoForm] }));
              setKitProdutoDialog(false);
              toast.success("Produto adicionado ao kit");
            }}>Incluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir esta promoção?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
