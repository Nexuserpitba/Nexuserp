import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MapPin, MoreHorizontal, Pencil, Trash2, Loader2, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { cidadesMapper } from "@/lib/supabaseMappers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

interface Cidade {
  id: string;
  nome: string;
  codigoIbge: string;
  uf: string;
  status: string;
}

const defaultCidades: Cidade[] = [
  { id: "1", nome: "São Paulo", codigoIbge: "3550308", uf: "SP", status: "Ativa" },
  { id: "2", nome: "Rio de Janeiro", codigoIbge: "3304557", uf: "RJ", status: "Ativa" },
  { id: "3", nome: "Manaus", codigoIbge: "1302603", uf: "AM", status: "Ativa" },
];

const emptyForm: Omit<Cidade, "id"> = { nome: "", codigoIbge: "", uf: "", status: "Ativa" };

export default function Cidades() {
  const [search, setSearch] = useState("");
  const [filterUf, setFilterUf] = useState<string>("todas");
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Cidade>({
    table: "cidades",
    mapper: cidadesMapper,
    defaultData: defaultCidades,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Cidade, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const filtered = items.filter(c => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.codigoIbge.includes(search);
    const matchUf = filterUf === "todas" || c.uf === filterUf;
    return matchSearch && matchUf;
  });

  const openNew = () => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); };
  const openEdit = (c: Cidade) => { setForm({ ...c }); setEditingId(c.id); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.nome || !form.codigoIbge || !form.uf) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Cidade atualizada!");
    } else {
      addItem(form);
      toast.success("Cidade cadastrada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
    setDeleteConfirm(null);
    toast.success("Cidade excluída!");
  };

  const importarCidadesPorUf = async (uf: string) => {
    if (!uf) { toast.error("Selecione uma UF no formulário primeiro"); return; }
    setImportando(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${uf}?providers=dados-abertos-br,gov,wikipedia`);
      const data: any[] = await res.json();
      const { data: existentes } = await supabase.from("cidades").select("codigo_ibge").eq("uf", uf);
      const existentesSet = new Set((existentes || []).map(c => c.codigo_ibge));
      const novas = data
        .filter(m => !existentesSet.has(String(m.codigo_ibge)))
        .map(m => ({ nome: m.nome, codigo_ibge: String(m.codigo_ibge), uf }));
      if (novas.length > 0) {
        const { error } = await supabase.from("cidades").insert(novas);
        if (error) throw error;
      }
      toast.success(`${novas.length} cidades importadas para ${uf}! (${data.length - novas.length} já existiam)`);
      // Refresh list
      const { data: refreshed } = await supabase.from("cidades").select("*").order("nome");
      // Force refetch handled by the hook
      window.location.reload();
    } catch {
      toast.error("Erro ao importar cidades. Tente novamente.");
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Cidades"
        description="Gerencie as cidades cadastradas no sistema (códigos IBGE para NF-e/NFC-e)"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={importando}>
                  {importando ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Importar por UF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-y-auto">
                {UFS.map(uf => (
                  <DropdownMenuItem key={uf} onClick={() => importarCidadesPorUf(uf)}>
                    {uf}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openNew}><Plus size={16} className="mr-2" /> Nova Cidade</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código IBGE..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterUf} onValueChange={setFilterUf}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas UFs</SelectItem>
                {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cidade</TableHead>
                <TableHead>Código IBGE</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-muted-foreground" />
                      {c.nome}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{c.codigoIbge}</TableCell>
                  <TableCell><Badge variant="outline">{c.uf}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-success/10 text-success border-0">{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(c.id)}><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma cidade encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Cidade" : "Nova Cidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Cidade *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: São Paulo" />
            </div>
            <div>
              <Label>Código IBGE *</Label>
              <Input value={form.codigoIbge} onChange={e => setForm({ ...form, codigoIbge: e.target.value.replace(/\D/g, "") })} placeholder="Ex: 3550308" />
              <p className="text-xs text-muted-foreground mt-1">Código de 7 dígitos do IBGE usado na NF-e</p>
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={form.uf} onValueChange={v => setForm({ ...form, uf: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {UFS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Inativa">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir esta cidade?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}