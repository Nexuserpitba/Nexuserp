import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, Atividade, TIPOS_ATIVIDADE } from "@/types/crm";
import { defaultLeads, defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, CheckCircle, Phone, Mail, Calendar, MapPin, ClipboardList, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const emptyAtividade: Omit<Atividade, 'id'> = {
  leadId: '', tipo: 'tarefa', titulo: '', descricao: '',
  dataAgendada: new Date().toISOString().split('T')[0], status: 'pendente', responsavel: '',
};

const tipoIcons: Record<string, React.ElementType> = {
  ligacao: Phone, email: Mail, reuniao: Calendar, visita: MapPin, tarefa: ClipboardList, follow_up: RotateCcw,
};

const CRMAtividades = () => {
  const { items: atividades, addItem, updateItem, deleteItem } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Atividade | null>(null);
  const [form, setForm] = useState<Omit<Atividade, 'id'>>(emptyAtividade);
  const { toast } = useToast();

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter(a => {
      const matchBusca = !busca || a.titulo.toLowerCase().includes(busca.toLowerCase()) || a.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === 'todas' || a.status === filtroStatus;
      const matchTipo = filtroTipo === 'todos' || a.tipo === filtroTipo;
      return matchBusca && matchStatus && matchTipo;
    }).sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime());
  }, [atividades, busca, filtroStatus, filtroTipo]);

  const abrirNovo = () => { setEditando(null); setForm(emptyAtividade); setModal(true); };
  const abrirEditar = (atv: Atividade) => { setEditando(atv); setForm({ ...atv }); setModal(true); };

  const salvar = () => {
    if (!form.titulo.trim()) { toast({ title: "Título obrigatório", variant: "destructive" }); return; }
    if (editando) {
      updateItem(editando.id, form);
      toast({ title: "Atividade atualizada" });
    } else {
      addItem(form as any);
      toast({ title: "Atividade criada" });
    }
    setModal(false);
  };

  const concluir = (id: string) => {
    updateItem(id, { status: 'concluida', dataConclusao: new Date().toISOString().split('T')[0] });
    toast({ title: "Atividade concluída ✓" });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string; className: string }> = {
      pendente: { variant: 'outline', label: 'Pendente', className: 'border-amber-300 text-amber-600' },
      concluida: { variant: 'outline', label: 'Concluída', className: 'border-green-300 text-green-600' },
      cancelada: { variant: 'outline', label: 'Cancelada', className: 'border-muted-foreground text-muted-foreground' },
      atrasada: { variant: 'destructive', label: 'Atrasada', className: '' },
    };
    const s = map[status] || map.pendente;
    return <Badge variant={s.variant} className={cn("text-[10px]", s.className)}>{s.label}</Badge>;
  };

  const getLeadNome = (id: string) => leads.find(l => l.id === id)?.nome || '—';

  const resumo = useMemo(() => ({
    pendentes: atividades.filter(a => a.status === 'pendente').length,
    atrasadas: atividades.filter(a => a.status === 'atrasada').length,
    concluidas: atividades.filter(a => a.status === 'concluida').length,
    total: atividades.length,
  }), [atividades]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Atividades CRM" description="Gerencie tarefas, ligações, reuniões e follow-ups" />
        <Button onClick={abrirNovo} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Atividade</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: resumo.total, className: 'text-foreground' },
          { label: 'Pendentes', value: resumo.pendentes, className: 'text-amber-600' },
          { label: 'Atrasadas', value: resumo.atrasadas, className: 'text-red-600' },
          { label: 'Concluídas', value: resumo.concluidas, className: 'text-green-600' },
        ].map(item => (
          <Card key={item.label} className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={cn("text-2xl font-bold", item.className)}>{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar atividades..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {TIPOS_ATIVIDADE.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {atividadesFiltradas.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma atividade encontrada</TableCell></TableRow>
            )}
            {atividadesFiltradas.map(atv => {
              const Icon = tipoIcons[atv.tipo] || ClipboardList;
              return (
                <TableRow key={atv.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="text-xs">{TIPOS_ATIVIDADE.find(t => t.key === atv.tipo)?.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{atv.titulo}</TableCell>
                  <TableCell className="text-sm">{getLeadNome(atv.leadId)}</TableCell>
                  <TableCell className="text-xs">{new Date(atv.dataAgendada).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{statusBadge(atv.status)}</TableCell>
                  <TableCell>{atv.responsavel}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {(atv.status === 'pendente' || atv.status === 'atrasada') && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => concluir(atv.id)} title="Concluir">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(atv)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteItem(atv.id); toast({ title: "Atividade excluída" }); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(p => ({ ...p, tipo: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_ATIVIDADE.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lead</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm(p => ({ ...p, leadId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data</Label><Input type="date" value={form.dataAgendada} onChange={e => setForm(p => ({ ...p, dataAgendada: e.target.value }))} /></div>
              <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} noUpperCase rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editando ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMAtividades;
