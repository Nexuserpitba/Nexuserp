import { useState } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Plus, Search, Pencil, Trash2, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface GrupoDesconto {
  id: string;
  nome: string;
  descricao: string;
  tipoDesconto: "percentual" | "valor_fixo";
  valorDesconto: number;
  aplicacao: "produto" | "categoria" | "geral";
  referencia: string;
  prioridade: number;
  acumulativo: boolean;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  // Clientes vinculados
  clientesVinculados: string[]; // IDs de pessoas
}

interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  status: string;
}

const STORAGE_KEY = "grupos_desconto";

function loadData(): GrupoDesconto[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveData(data: GrupoDesconto[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPessoas(): Pessoa[] {
  try {
    const stored = localStorage.getItem("pessoas");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

const emptyForm: Omit<GrupoDesconto, "id"> = {
  nome: "",
  descricao: "",
  tipoDesconto: "percentual",
  valorDesconto: 0,
  aplicacao: "geral",
  referencia: "",
  prioridade: 1,
  acumulativo: false,
  dataInicio: "",
  dataFim: "",
  ativo: true,
  clientesVinculados: [],
};

export default function GruposDesconto() {
  const [items, setItems] = useState<GrupoDesconto[]>(loadData);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GrupoDesconto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pessoas] = useState<Pessoa[]>(loadPessoas);

  const filtered = items.filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    i.descricao.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (item: GrupoDesconto) => {
    setEditing(item);
    const { id, ...rest } = item;
    setForm({ ...emptyForm, ...rest });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do grupo"); return; }
    if (form.valorDesconto <= 0) { toast.error("Informe o valor do desconto"); return; }
    let updated: GrupoDesconto[];
    if (editing) {
      updated = items.map(i => i.id === editing.id ? { ...form, id: editing.id } : i);
      toast.success("Grupo de desconto atualizado");
    } else {
      updated = [...items, { ...form, id: crypto.randomUUID() }];
      toast.success("Grupo de desconto cadastrado");
    }
    setItems(updated);
    saveData(updated);
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    saveData(updated);
    toast.success("Grupo de desconto removido");
  };

  const aplicacaoLabel: Record<string, string> = {
    produto: "Produto",
    categoria: "Categoria",
    geral: "Geral",
  };

  const pessoasClientes = pessoas.filter(p => p.tipo === "Cliente" && p.status === "Ativo");

  const toggleCliente = (pessoaId: string) => {
    const current = form.clientesVinculados ?? [];
    const updated = current.includes(pessoaId)
      ? current.filter(id => id !== pessoaId)
      : [...current, pessoaId];
    setForm({ ...form, clientesVinculados: updated });
  };

  const getNomeCliente = (id: string) => pessoas.find(p => p.id === id)?.nome ?? id;

  return (
    <div className="page-container">
      <PageHeader
        title="Grupos de Desconto"
        description="Cadastro de grupos de desconto para aplicar em vendas e orçamentos"
        actions={<Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Grupo</Button>}
      />

      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou descrição..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead>Aplicação</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Prioridade</TableHead>
                  <TableHead>Acumulativo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum grupo de desconto cadastrado</TableCell></TableRow>
                ) : filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tipoDesconto === "percentual" ? "%" : "R$"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {item.tipoDesconto === "percentual" ? `${item.valorDesconto.toFixed(2)}%` : `R$ ${item.valorDesconto.toFixed(2)}`}
                    </TableCell>
                    <TableCell>{aplicacaoLabel[item.aplicacao]}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{(item.clientesVinculados ?? []).length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{item.prioridade}</TableCell>
                    <TableCell>
                      <Badge variant={item.acumulativo ? "default" : "secondary"}>{item.acumulativo ? "Sim" : "Não"}</Badge>
                    </TableCell>
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
            <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> {editing ? "Editar" : "Novo"} Grupo de Desconto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Nome do Grupo *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Desconto Atacado" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição do grupo de desconto" rows={2} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select value={form.tipoDesconto} onValueChange={v => setForm({ ...form, tipoDesconto: v as GrupoDesconto["tipoDesconto"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual">Percentual (%)</SelectItem>
                    <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Desconto *</Label>
                {form.tipoDesconto === "valor_fixo" ? (
                  <CurrencyInput value={form.valorDesconto} onValueChange={v => setForm({ ...form, valorDesconto: v })} />
                ) : (
                  <Input type="number" step="0.01" value={form.valorDesconto || ""} onChange={e => setForm({ ...form, valorDesconto: Number(e.target.value) })} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Aplicação</Label>
                <Select value={form.aplicacao} onValueChange={v => setForm({ ...form, aplicacao: v as GrupoDesconto["aplicacao"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="categoria">Categoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referência (produto/categoria)</Label>
                <Input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Produto ou categoria" />
              </div>
            </div>

            {/* Clientes vinculados */}
            <div>
              <Label>Clientes Vinculados</Label>
              <div className="border rounded-md p-2 mt-1 max-h-36 overflow-y-auto space-y-1">
                {pessoasClientes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-1">Nenhum cliente ativo em Cadastros &gt; Pessoas</p>
                ) : pessoasClientes.map(p => {
                  const checked = (form.clientesVinculados ?? []).includes(p.id);
                  return (
                    <label key={p.id} className="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <input type="checkbox" checked={checked} onChange={() => toggleCliente(p.id)} className="rounded" />
                      {p.nome}
                    </label>
                  );
                })}
              </div>
              {(form.clientesVinculados ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(form.clientesVinculados ?? []).map(id => (
                    <Badge key={id} variant="secondary" className="text-xs gap-1">
                      {getNomeCliente(id)}
                      <button onClick={() => toggleCliente(id)} className="ml-1 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={form.prioridade} onChange={e => setForm({ ...form, prioridade: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <input type="checkbox" checked={form.acumulativo} onChange={e => setForm({ ...form, acumulativo: e.target.checked })} className="rounded" />
                <Label>Acumulativo com outros descontos</Label>
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
