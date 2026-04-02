import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { categoriasMapper } from "@/lib/supabaseMappers";
import { Plus, Pencil, Trash2, Search, Tag, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Categoria {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  categoriaPai: string;
  status: string;
  descricao: string;
}

const defaultCategorias: Categoria[] = [
  { id: "1", codigo: "001", nome: "Alimentos", tipo: "Produto", categoriaPai: "", status: "Ativo", descricao: "Produtos alimentícios em geral" },
  { id: "2", codigo: "002", nome: "Bebidas", tipo: "Produto", categoriaPai: "", status: "Ativo", descricao: "Bebidas em geral" },
  { id: "3", codigo: "003", nome: "Limpeza", tipo: "Produto", categoriaPai: "", status: "Ativo", descricao: "Produtos de limpeza" },
  { id: "4", codigo: "004", nome: "Higiene", tipo: "Produto", categoriaPai: "", status: "Ativo", descricao: "Produtos de higiene pessoal" },
  { id: "5", codigo: "005", nome: "Laticínios", tipo: "Produto", categoriaPai: "Alimentos", status: "Ativo", descricao: "Derivados de leite" },
  { id: "6", codigo: "006", nome: "Frios e Embutidos", tipo: "Produto", categoriaPai: "Alimentos", status: "Ativo", descricao: "Frios e embutidos" },
];

const emptyForm: Omit<Categoria, "id"> = {
  codigo: "", nome: "", tipo: "Produto", categoriaPai: "", status: "Ativo", descricao: ""
};

export default function Categorias() {
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Categoria>({
    table: "categorias",
    mapper: categoriasMapper,
    defaultData: defaultCategorias,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const gerarProximoCodigo = () => {
    const codigos = items.map(c => parseInt(c.codigo)).filter(n => !isNaN(n));
    const max = codigos.length > 0 ? Math.max(...codigos) : 0;
    return String(max + 1).padStart(3, "0");
  };

  const parentCategories = items.filter(c => !c.categoriaPai);

  const filtered = items.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo.toLowerCase().includes(search.toLowerCase()) ||
    c.tipo.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ ...emptyForm, codigo: gerarProximoCodigo() }); setEditingId(null); setDialogOpen(true); };
  const openEdit = (cat: Categoria) => {
    setForm({ codigo: cat.codigo, nome: cat.nome, tipo: cat.tipo, categoriaPai: cat.categoriaPai, status: cat.status, descricao: cat.descricao });
    setEditingId(cat.id);
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.nome || !form.codigo) {
      toast({ title: "Erro", description: "Código e Nome são obrigatórios", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      toast({ title: "Categoria atualizada" });
    } else {
      addItem(form);
      toast({ title: "Categoria criada" });
    }
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    const cat = items.find(c => c.id === id);
    const hasChildren = items.some(c => c.categoriaPai === cat?.nome);
    if (hasChildren) {
      toast({ title: "Erro", description: "Remova as subcategorias antes de excluir", variant: "destructive" });
      return;
    }
    deleteItem(id);
    toast({ title: "Categoria removida" });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Categorias"
        description="Gerencie categorias e subcategorias de produtos"
        actions={<Button onClick={openNew}><Plus size={16} /> Nova Categoria</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-muted-foreground" />
            <Input placeholder="Buscar por código, nome ou tipo..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria Pai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma categoria encontrada</TableCell></TableRow>
              ) : filtered.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell className="font-mono">{cat.codigo}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Tag size={14} className="text-muted-foreground" />
                    {cat.categoriaPai && <span className="text-muted-foreground text-xs">└</span>}
                    {cat.nome}
                  </TableCell>
                  <TableCell>{cat.tipo}</TableCell>
                  <TableCell>{cat.categoriaPai || "—"}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.status === "Ativo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {cat.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(cat.id)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Código *</Label><Input value={form.codigo} readOnly className="bg-muted/50 font-mono" /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Produto">Produto</SelectItem>
                    <SelectItem value="Serviço">Serviço</SelectItem>
                    <SelectItem value="Insumo">Insumo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Categoria Pai</Label>
              <Select value={form.categoriaPai || "nenhuma"} onValueChange={v => setForm({ ...form, categoriaPai: v === "nenhuma" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Nenhuma (raiz)</SelectItem>
                  {parentCategories.filter(c => c.id !== editingId).map(c => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
