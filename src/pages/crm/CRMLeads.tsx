import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, Atividade, ETAPAS_FUNIL, ORIGENS } from "@/types/crm";
import { defaultLeads, defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Edit, Phone, Mail, Link2, UserCheck, X, Flame, Thermometer, Snowflake, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcularScore, type LeadScore } from "@/lib/leadScoring";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface PessoaSimples {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  celular: string;
  empresa?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
}

function loadPessoas(): PessoaSimples[] {
  try {
    const stored = localStorage.getItem("pessoas");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

const emptyLead: Omit<Lead, 'id'> = {
  nome: '', email: '', telefone: '', empresa: '', origem: 'site', etapa: 'prospeccao',
  valor: 0, responsavel: '', observacoes: '', dataCriacao: new Date().toISOString().split('T')[0],
  dataAtualizacao: new Date().toISOString().split('T')[0], probabilidade: 20, prioridade: 'media',
};

const ScoreBadge = ({ score }: { score: LeadScore }) => {
  const config = {
    quente: { icon: Flame, label: 'Quente', className: 'text-red-600 dark:text-red-400' },
    morno: { icon: Thermometer, label: 'Morno', className: 'text-amber-600 dark:text-amber-400' },
    frio: { icon: Snowflake, label: 'Frio', className: 'text-blue-600 dark:text-blue-400' },
  }[score.rank];
  const Icon = config.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-help">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className={config.className} strokeWidth="3"
                strokeDasharray={`${score.total * 0.975} 100`} strokeLinecap="round" />
            </svg>
            <span className={cn("absolute text-[10px] font-bold", config.className)}>{score.total}</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", config.className)}>
              <Icon className="w-3 h-3" /> {config.label}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs space-y-1 p-3">
        <p className="font-semibold mb-1">Detalhamento do Score</p>
        <p>Valor: {score.breakdown.valor}/20</p>
        <p>Probabilidade: {score.breakdown.probabilidade}/15</p>
        <p>Etapa: {score.breakdown.etapa}/40</p>
        <p>Prioridade: {score.breakdown.prioridade}/10</p>
        <p>Tempo no funil: {score.breakdown.tempoFunil > 0 ? '+' : ''}{score.breakdown.tempoFunil}</p>
        <p>Atividades: {score.breakdown.atividades}/15</p>
      </TooltipContent>
    </Tooltip>
  );
};

const CRMLeads = () => {
  const { items: leads, addItem, updateItem, deleteItem } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const { items: atividades } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas');
  const [filtroRanking, setFiltroRanking] = useState<string>('todos');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Lead | null>(null);
  const [form, setForm] = useState<Omit<Lead, 'id'>>(emptyLead);
  const [modalPessoa, setModalPessoa] = useState(false);
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const { toast } = useToast();

  const pessoas = useMemo(() => loadPessoas(), [modal, modalPessoa]);

  const pessoasFiltradas = useMemo(() => {
    if (!buscaPessoa) return pessoas;
    const q = buscaPessoa.toLowerCase();
    return pessoas.filter(p => p.nome.toLowerCase().includes(q) || p.cpfCnpj.includes(q));
  }, [pessoas, buscaPessoa]);

  const getPessoaNome = (pessoaId?: string) => {
    if (!pessoaId) return null;
    const p = pessoas.find(x => x.id === pessoaId);
    return p ? p.nome : null;
  };

  const leadsComScore = useMemo(() => {
    return leads.map(l => ({ ...l, score: calcularScore(l, atividades) }));
  }, [leads, atividades]);

  const leadsFiltrados = useMemo(() => {
    return leadsComScore.filter(l => {
      const matchBusca = !busca || l.nome.toLowerCase().includes(busca.toLowerCase()) || l.empresa.toLowerCase().includes(busca.toLowerCase()) || l.email.toLowerCase().includes(busca.toLowerCase());
      const matchEtapa = filtroEtapa === 'todas' || l.etapa === filtroEtapa;
      const matchRanking = filtroRanking === 'todos' || l.score.rank === filtroRanking;
      return matchBusca && matchEtapa && matchRanking;
    }).sort((a, b) => b.score.total - a.score.total);
  }, [leadsComScore, busca, filtroEtapa, filtroRanking]);

  const abrirNovo = () => { setEditando(null); setForm(emptyLead); setModal(true); };
  const abrirEditar = (lead: Lead) => { setEditando(lead); setForm({ ...lead }); setModal(true); };

  const salvar = () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const hoje = new Date().toISOString().split('T')[0];
    if (editando) {
      updateItem(editando.id, { ...form, dataAtualizacao: hoje });
      toast({ title: "Lead atualizado" });
    } else {
      addItem({ ...form, dataCriacao: hoje, dataAtualizacao: hoje } as any);
      toast({ title: "Lead cadastrado" });
    }
    setModal(false);
  };

  const excluir = (id: string) => { deleteItem(id); toast({ title: "Lead excluído" }); };

  const vincularPessoa = (pessoa: PessoaSimples) => {
    setForm(p => ({
      ...p,
      nome: pessoa.nome,
      email: pessoa.email,
      telefone: pessoa.celular || pessoa.telefone,
      empresa: pessoa.nomeFantasia || pessoa.razaoSocial || pessoa.nome,
      pessoaId: pessoa.id,
    }));
    setModalPessoa(false);
    toast({ title: "Pessoa vinculada ao lead" });
  };

  const desvincularPessoa = () => {
    setForm(p => ({ ...p, pessoaId: undefined }));
  };

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const etapaBadge = (etapa: string) => {
    const e = ETAPAS_FUNIL.find(x => x.key === etapa);
    if (!e) return etapa;
    const colors: Record<string, string> = {
      prospeccao: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      qualificacao: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      proposta: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      negociacao: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      fechado_ganho: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      fechado_perdido: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return <Badge className={cn("text-[10px] font-medium", colors[etapa])}>{e.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Gestão de Leads" description="Cadastro e gerenciamento de leads e oportunidades" />
        <Button onClick={abrirNovo} size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Lead</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, empresa ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as etapas</SelectItem>
            {ETAPAS_FUNIL.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroRanking} onValueChange={setFiltroRanking}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ranking" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os rankings</SelectItem>
            <SelectItem value="quente">🔥 Quente</SelectItem>
            <SelectItem value="morno">🌡️ Morno</SelectItem>
            <SelectItem value="frio">❄️ Frio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Score</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leadsFiltrados.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow>
            )}
            {leadsFiltrados.map(lead => (
              <TableRow key={lead.id}>
                <TableCell><ScoreBadge score={lead.score} /></TableCell>
                <TableCell className="font-medium">{lead.nome}</TableCell>
                <TableCell>{lead.empresa}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {lead.email}</span>
                    <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {lead.telefone}</span>
                  </div>
                </TableCell>
                <TableCell>{etapaBadge(lead.etapa)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(lead.valor)}</TableCell>
                <TableCell className="text-xs">{ORIGENS.find(o => o.key === lead.origem)?.label}</TableCell>
                <TableCell>
                  {lead.pessoaId ? (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 text-primary border-primary/20">
                      <UserCheck className="w-3 h-3" />
                      {getPessoaNome(lead.pessoaId) || "Vinculado"}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(lead)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => excluir(lead.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Lead */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            {/* Vincular Pessoa */}
            <div className="rounded-md border border-dashed p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" /> Vínculo com Cadastro de Pessoas
                </Label>
                {form.pessoaId ? (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={desvincularPessoa}>
                    <X className="w-3 h-3 mr-1" /> Desvincular
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => { setBuscaPessoa(''); setModalPessoa(true); }}>
                    <UserCheck className="w-3 h-3 mr-1" /> Vincular Pessoa
                  </Button>
                )}
              </div>
              {form.pessoaId && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <UserCheck className="w-3 h-3" />
                  {getPessoaNome(form.pessoaId) || form.pessoaId}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>Empresa</Label><Input value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} noUpperCase /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Origem</Label>
                <Select value={form.origem} onValueChange={(v) => setForm(p => ({ ...p, origem: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORIGENS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Select value={form.etapa} onValueChange={(v) => setForm(p => ({ ...p, etapa: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ETAPAS_FUNIL.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={(v) => setForm(p => ({ ...p, prioridade: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Valor (R$)</Label><Input type="number" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: Number(e.target.value) }))} /></div>
              <div><Label>Probabilidade (%)</Label><Input type="number" min={0} max={100} value={form.probabilidade} onChange={e => setForm(p => ({ ...p, probabilidade: Number(e.target.value) }))} /></div>
              <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} noUpperCase rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar Pessoa */}
      <Dialog open={modalPessoa} onOpenChange={setModalPessoa}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular Pessoa Cadastrada</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou CPF/CNPJ..." value={buscaPessoa} onChange={e => setBuscaPessoa(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {pessoasFiltradas.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhuma pessoa encontrada</p>
            )}
            {pessoasFiltradas.map(p => (
              <button
                key={p.id}
                className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                onClick={() => vincularPessoa(p)}
              >
                <div>
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.cpfCnpj} • {p.email}</p>
                </div>
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMLeads;
