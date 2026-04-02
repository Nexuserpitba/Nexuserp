import { useState } from "react";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { Plus, Search, Pencil, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PrecoEspecial {
  id: string;
  descricao: string;
  tipo: "cliente" | "grupo" | "produto" | "categoria";
  referencia: string;
  referenciaId: string;
  precoOriginal: number;
  precoEspecial: number;
  descontoPercent: number;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
}

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  status: string;
}

const STORAGE_KEY = "precos_especiais";

function loadData(): PrecoEspecial[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveData(data: PrecoEspecial[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPessoas(): Pessoa[] {
  try {
    const stored = localStorage.getItem("pessoas");
    const parsed = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((p: any) => ({
      id: String(p?.id ?? ""),
      nome: String(p?.nome ?? p?.razaoSocial ?? ""),
      tipo: String(p?.tipo ?? ""),
      status: String(p?.status ?? ""),
    })).filter((p: Pessoa) => !!p.id);
  } catch {
    return [];
  }
}

const emptyForm: Omit<PrecoEspecial, "id"> = {
  descricao: "",
  tipo: "cliente",
  referencia: "",
  referenciaId: "",
  precoOriginal: 0,
  precoEspecial: 0,
  descontoPercent: 0,
  dataInicio: "",
  dataFim: "",
  ativo: true,
};

export default function PrecosEspeciais() {
  const [items, setItems] = useState<PrecoEspecial[]>(loadData);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrecoEspecial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pessoas] = useState<Pessoa[]>(loadPessoas);

  const filtered = items.filter(i =>
    i.descricao.toLowerCase().includes(search.toLowerCase()) ||
    i.referencia.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (item: PrecoEspecial) => {
    setEditing(item);
    const { id, ...rest } = item;
    setForm({ ...emptyForm, ...rest });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.descricao.trim()) { toast.error("Informe a descrição"); return; }
    let updated: PrecoEspecial[];
    if (editing) {
      updated = items.map(i => i.id === editing.id ? { ...form, id: editing.id } : i);
      toast.success("Preço especial atualizado");
    } else {
      updated = [...items, { ...form, id: crypto.randomUUID() }];
      toast.success("Preço especial cadastrado");
    }
    setItems(updated);
    saveData(updated);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveData(updated);
    toast.success("Preço especial removido");
  };

  const calcDesconto = (original: number, especial: number) => {
    if (original <= 0) return 0;
    return Number((((original - especial) / original) * 100).toFixed(2));
  };

  const tipoLabel: Record<string, string> = {
    cliente: "Cliente",
    grupo: "Grupo",
    produto: "Produto",
    categoria: "Categoria",
  };

  const pessoasClientes = pessoas.filter(p => String(p.tipo ?? "").toLowerCase() === "cliente" && String(p.status ?? "").toLowerCase() === "ativo");

  const handleTipoChange = (v: string) => {
    setForm(prev => ({ ...prev, tipo: v as PrecoEspecial["tipo"], referencia: "", referenciaId: "" }));
  };

  const handleClienteSelect = (value: string) => {
    setForm(prev => {
      if (value === "__clear__") return { ...prev, referenciaId: "", referencia: "" };
      const pessoa = pessoas.find(p => p.id === value);
      return { ...prev, referenciaId: value, referencia: pessoa?.nome ?? "" };
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Preços Especiais"
        description="Cadastro de preços especiais por cliente, grupo, produto ou categoria"
        actions={<Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Preço</Button>}
      />

      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por descrição ou referência..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-right">Preço Original</TableHead>
                  <TableHead className="text-right">Preço Especial</TableHead>
                  <TableHead className="text-right">Desconto %</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum preço especial cadastrado</TableCell></TableRow>
                ) : filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.descricao}</TableCell>
                    <TableCell><Badge variant="outline">{tipoLabel[item.tipo]}</Badge></TableCell>
                    <TableCell>{item.referencia || "—"}</TableCell>
                    <TableCell className="text-right font-mono">R$ {formatCurrencyBRL(item.precoOriginal)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary font-mono">R$ {formatCurrencyBRL(item.precoEspecial)}</TableCell>
                    <TableCell className="text-right">{item.descontoPercent.toFixed(2)}%</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{item.dataInicio || "—"} a {item.dataFim || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={item.ativo ? "default" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> {editing ? "Editar" : "Novo"} Preço Especial</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Preço atacado Cliente X" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={handleTipoChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="grupo">Grupo</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="categoria">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referência</Label>
                {form.tipo === "cliente" ? (
                  <>
                    <Select value={form.referenciaId} onValueChange={handleClienteSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__clear__">Nenhum</SelectItem>
                        {pessoasClientes.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {pessoasClientes.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">Nenhum cliente ativo em Cadastros &gt; Pessoas</p>
                    )}
                  </>
                ) : (
                  <Input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Nome do grupo, produto..." />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Preço Original</Label>
                <CurrencyInput value={form.precoOriginal} onValueChange={v => {
                  setForm({ ...form, precoOriginal: v, descontoPercent: calcDesconto(v, form.precoEspecial) });
                }} />
              </div>
              <div>
                <Label>Preço Especial</Label>
                <CurrencyInput value={form.precoEspecial} onValueChange={v => {
                  setForm({ ...form, precoEspecial: v, descontoPercent: calcDesconto(form.precoOriginal, v) });
                }} />
              </div>
              <div>
                <Label>Desconto %</Label>
                <Input type="number" step="0.01" value={form.descontoPercent || ""} onChange={e => {
                  const d = Number(e.target.value);
                  const esp = Number((form.precoOriginal * (1 - d / 100)).toFixed(2));
                  setForm({ ...form, descontoPercent: d, precoEspecial: esp });
                }} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={form.dataInicio} onChange={e => setForm({ ...form, dataInicio: e.target.value })} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={form.dataFim} onChange={e => setForm({ ...form, dataFim: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} className="rounded" />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
