import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, ETAPAS_FUNIL } from "@/types/crm";
import { defaultLeads } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DollarSign, GripVertical, User, Building2, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const etapasAtivas = ETAPAS_FUNIL.filter(e => !['fechado_ganho', 'fechado_perdido'].includes(e.key));
const todasEtapas = ETAPAS_FUNIL;

const CRMFunil = () => {
  const { items: leads, updateItem } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const { toast } = useToast();

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const colunas = useMemo(() => {
    return todasEtapas.map(etapa => ({
      ...etapa,
      leads: leads.filter(l => l.etapa === etapa.key),
      total: leads.filter(l => l.etapa === etapa.key).reduce((s, l) => s + l.valor, 0),
    }));
  }, [leads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, etapa: Lead['etapa']) => {
    e.preventDefault();
    if (!draggedId) return;
    const lead = leads.find(l => l.id === draggedId);
    if (lead && lead.etapa !== etapa) {
      updateItem(draggedId, { etapa, dataAtualizacao: new Date().toISOString().split('T')[0] });
      toast({
        title: "Lead movido",
        description: `${lead.nome} → ${ETAPAS_FUNIL.find(e => e.key === etapa)?.label}`,
      });
    }
    setDraggedId(null);
  };

  const moverLead = (leadId: string, direcao: 'avancar' | 'voltar') => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const idx = todasEtapas.findIndex(e => e.key === lead.etapa);
    const newIdx = direcao === 'avancar' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= todasEtapas.length) return;
    updateItem(leadId, { etapa: todasEtapas[newIdx].key, dataAtualizacao: new Date().toISOString().split('T')[0] });
    toast({
      title: "Lead movido",
      description: `${lead.nome} → ${todasEtapas[newIdx].label}`,
    });
  };

  const prioridadeBadge = (p: string) => {
    if (p === 'alta') return <Badge variant="destructive" className="text-[10px]">Alta</Badge>;
    if (p === 'media') return <Badge variant="secondary" className="text-[10px]">Média</Badge>;
    return <Badge variant="outline" className="text-[10px]">Baixa</Badge>;
  };

  const handleEtapaChange = (leadId: string, novaEtapa: Lead['etapa']) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      updateItem(leadId, { etapa: novaEtapa, dataAtualizacao: new Date().toISOString().split('T')[0] });
      toast({ title: "Etapa atualizada", description: `${lead.nome} → ${ETAPAS_FUNIL.find(e => e.key === novaEtapa)?.label}` });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Funil de Vendas" description="Gerencie seus negócios pelo pipeline comercial" />
        <div className="flex gap-2">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>
            <LayoutGrid className="w-4 h-4 mr-1" /> Kanban
          </Button>
          <Button variant={view === 'lista' ? 'default' : 'outline'} size="sm" onClick={() => setView('lista')}>
            <List className="w-4 h-4 mr-1" /> Lista
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
          {colunas.map(col => (
            <div
              key={col.key}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-3 h-3 rounded-full", col.cor)} />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{col.leads.length}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatCurrency(col.total)}</p>
              </div>

              <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-dashed border-border">
                {col.leads.map(lead => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className={cn(
                      "cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                      draggedId === lead.id && "opacity-50"
                    )}
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium leading-tight">{lead.nome}</span>
                        </div>
                        {prioridadeBadge(lead.prioridade)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3" /> {lead.empresa}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                          <DollarSign className="w-3 h-3" /> {formatCurrency(lead.valor)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{lead.probabilidade}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <User className="w-3 h-3" /> {lead.responsavel}
                        </div>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moverLead(lead.id, 'voltar')}>
                            <ChevronLeft className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moverLead(lead.id, 'avancar')}>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Prob.</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.nome}</TableCell>
                  <TableCell>{lead.empresa}</TableCell>
                  <TableCell>
                    <Select value={lead.etapa} onValueChange={(v) => handleEtapaChange(lead.id, v as Lead['etapa'])}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {todasEtapas.map(e => (
                          <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(lead.valor)}</TableCell>
                  <TableCell>{lead.probabilidade}%</TableCell>
                  <TableCell>{prioridadeBadge(lead.prioridade)}</TableCell>
                  <TableCell>{lead.responsavel}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(lead.dataAtualizacao).toLocaleDateString('pt-BR')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default CRMFunil;
