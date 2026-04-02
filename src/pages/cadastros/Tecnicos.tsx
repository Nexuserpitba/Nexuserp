import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Wrench, User } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { maskTelefone } from "@/lib/maskUtils";

interface Tecnico {
  id: string;
  nome: string;
  especialidade: string;
  telefone: string;
  email: string;
  observacao: string;
  ativo: boolean;
}

const defaultTecnicos: Tecnico[] = [];

export default function Tecnicos() {
  const { items, addItem, updateItem, deleteItem } = useLocalStorage<Tecnico>("tecnicos", defaultTecnicos);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", especialidade: "", telefone: "", email: "", observacao: "", ativo: true });

  const resetForm = () => {
    setForm({ nome: "", especialidade: "", telefone: "", email: "", observacao: "", ativo: true });
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setModalOpen(true); };

  const openEdit = (t: Tecnico) => {
    setEditingId(t.id);
    setForm({ nome: t.nome, especialidade: t.especialidade, telefone: t.telefone, email: t.email, observacao: t.observacao, ativo: t.ativo });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nome.trim()) { toast.error("Informe o nome do técnico"); return; }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Técnico atualizado");
    } else {
      addItem(form as any);
      toast.success("Técnico cadastrado");
    }
    setModalOpen(false);
    resetForm();
  };

  const filtered = items.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase()) ||
    t.especialidade.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  const ativos = items.filter(t => t.ativo).length;

  return (
    <div className="page-container">
      <PageHeader title="Técnicos" description="Cadastre e gerencie os técnicos responsáveis pelas ordens de serviço" />

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <User className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{items.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Wrench className="h-7 w-7 text-primary" />
            <div><p className="text-xs text-muted-foreground">Ativos</p><p className="text-xl font-bold">{ativos}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar técnico..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 w-72" />
            </div>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Técnico</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum técnico cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>{t.especialidade || "—"}</TableCell>
                    <TableCell>{t.telefone || "—"}</TableCell>
                    <TableCell>{t.email || "—"}</TableCell>
                    <TableCell><Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { updateItem(t.id, { ativo: !t.ativo }); toast.success(t.ativo ? "Técnico inativado" : "Técnico ativado"); }}>
                            <Wrench className="h-4 w-4 mr-2" /> {t.ativo ? "Inativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteItem(t.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
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

      <Dialog open={modalOpen} onOpenChange={v => { if (!v) resetForm(); setModalOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input placeholder="Nome completo" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input placeholder="Ex: Eletrônica, Informática, Mecânica" value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: maskTelefone(e.target.value) }))} noUpperCase />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" placeholder="tecnico@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
