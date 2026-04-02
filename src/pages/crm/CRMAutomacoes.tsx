import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, Atividade, ETAPAS_FUNIL } from "@/types/crm";
import { defaultLeads, defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, Zap, RotateCcw, Bell, CheckCircle, PlayCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutomacaoConfig {
  followUpAtivo: boolean;
  followUpDias: number;
  alertaParadoAtivo: boolean;
  alertaParadoDias: number;
  alertaAtrasadoAtivo: boolean;
}

const DEFAULT_CONFIG: AutomacaoConfig = {
  followUpAtivo: true,
  followUpDias: 3,
  alertaParadoAtivo: true,
  alertaParadoDias: 7,
  alertaAtrasadoAtivo: true,
};

function loadConfig(): AutomacaoConfig {
  try {
    const stored = localStorage.getItem("gp_erp_crm_automacoes_config");
    return stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;
  } catch { return DEFAULT_CONFIG; }
}

function saveConfig(config: AutomacaoConfig) {
  localStorage.setItem("gp_erp_crm_automacoes_config", JSON.stringify(config));
}

const CRMAutomacoes = () => {
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const { items: atividades, addItem: addAtividade } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);
  const [config, setConfig] = useState<AutomacaoConfig>(loadConfig);
  const { toast } = useToast();

  const updateConfig = (updates: Partial<AutomacaoConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  };

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];

  // Leads parados no funil (sem atualização há X dias)
  const leadsParados = useMemo(() => {
    return leads
      .filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.etapa))
      .filter(l => {
        const diff = Math.round((hoje.getTime() - new Date(l.dataAtualizacao).getTime()) / (1000 * 60 * 60 * 24));
        return diff >= config.alertaParadoDias;
      })
      .map(l => ({
        ...l,
        diasParado: Math.round((hoje.getTime() - new Date(l.dataAtualizacao).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.diasParado - a.diasParado);
  }, [leads, config.alertaParadoDias]);

  // Leads sem follow-up agendado
  const leadsSemFollowUp = useMemo(() => {
    const leadsAtivos = leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.etapa));
    return leadsAtivos.filter(l => {
      const atvsLead = atividades.filter(a => a.leadId === l.id && (a.status === 'pendente' || a.status === 'atrasada'));
      return atvsLead.length === 0;
    });
  }, [leads, atividades]);

  // Atividades atrasadas
  const atividadesAtrasadas = useMemo(() => {
    return atividades
      .filter(a => {
        if (a.status === 'concluida' || a.status === 'cancelada') return false;
        return new Date(a.dataAgendada) < hoje;
      })
      .map(a => ({
        ...a,
        diasAtraso: Math.round((hoje.getTime() - new Date(a.dataAgendada).getTime()) / (1000 * 60 * 60 * 24)),
        leadNome: leads.find(l => l.id === a.leadId)?.nome || 'Sem lead',
      }))
      .sort((a, b) => b.diasAtraso - a.diasAtraso);
  }, [atividades, leads]);

  // Gerar follow-ups automáticos
  const gerarFollowUps = useCallback(() => {
    let criados = 0;
    leadsSemFollowUp.forEach(lead => {
      const dataFollowUp = new Date();
      dataFollowUp.setDate(dataFollowUp.getDate() + config.followUpDias);
      addAtividade({
        leadId: lead.id,
        tipo: 'follow_up',
        titulo: `Follow-up automático: ${lead.nome}`,
        descricao: `Follow-up gerado automaticamente. Lead sem atividades pendentes há mais de ${config.followUpDias} dias.`,
        dataAgendada: dataFollowUp.toISOString().split('T')[0],
        status: 'pendente',
        responsavel: lead.responsavel,
      } as any);
      criados++;
    });
    toast({
      title: criados > 0 ? `${criados} follow-up(s) criado(s)` : "Nenhum follow-up necessário",
      description: criados > 0 ? "Atividades de follow-up foram agendadas automaticamente." : "Todos os leads ativos já possuem atividades pendentes.",
    });
  }, [leadsSemFollowUp, config.followUpDias, addAtividade, toast]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <PageHeader title="Automações CRM" description="Follow-ups automáticos e alertas de leads parados no funil" />

      {/* Configurações */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" /> Configurações de Automação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-primary" /> Follow-up automático
                </Label>
                <p className="text-xs text-muted-foreground">Criar follow-up para leads sem atividades</p>
                <div className="flex items-center gap-2 mt-1">
                  <Label className="text-xs">Agendar em</Label>
                  <Input
                    type="number" min={1} max={30}
                    value={config.followUpDias}
                    onChange={e => updateConfig({ followUpDias: Number(e.target.value) })}
                    className="w-16 h-7 text-xs"
                  />
                  <Label className="text-xs">dias</Label>
                </div>
              </div>
              <Switch checked={config.followUpAtivo} onCheckedChange={v => updateConfig({ followUpAtivo: v })} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Alerta lead parado
                </Label>
                <p className="text-xs text-muted-foreground">Alertar leads sem movimentação</p>
                <div className="flex items-center gap-2 mt-1">
                  <Label className="text-xs">Após</Label>
                  <Input
                    type="number" min={1} max={90}
                    value={config.alertaParadoDias}
                    onChange={e => updateConfig({ alertaParadoDias: Number(e.target.value) })}
                    className="w-16 h-7 text-xs"
                  />
                  <Label className="text-xs">dias</Label>
                </div>
              </div>
              <Switch checked={config.alertaParadoAtivo} onCheckedChange={v => updateConfig({ alertaParadoAtivo: v })} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-red-500" /> Alerta atividades atrasadas
                </Label>
                <p className="text-xs text-muted-foreground">Destacar atividades vencidas</p>
              </div>
              <Switch checked={config.alertaAtrasadoAtivo} onCheckedChange={v => updateConfig({ alertaAtrasadoAtivo: v })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ação rápida - Gerar Follow-ups */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Gerar Follow-ups Automáticos</p>
              <p className="text-xs text-muted-foreground">
                {leadsSemFollowUp.length} lead(s) ativo(s) sem atividades pendentes
              </p>
            </div>
          </div>
          <Button onClick={gerarFollowUps} disabled={leadsSemFollowUp.length === 0} size="sm" className="gap-1.5">
            <PlayCircle className="w-4 h-4" /> Gerar {leadsSemFollowUp.length} follow-up(s)
          </Button>
        </CardContent>
      </Card>

      {/* Resumo de alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Leads Parados</p>
          <p className="text-2xl font-bold text-amber-600">{leadsParados.length}</p>
          <p className="text-[10px] text-muted-foreground">há {config.alertaParadoDias}+ dias</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Atividades Atrasadas</p>
          <p className="text-2xl font-bold text-red-500">{atividadesAtrasadas.length}</p>
          <p className="text-[10px] text-muted-foreground">pendentes vencidas</p>
        </Card>
        <Card className="p-4 text-center">
          <RotateCcw className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Sem Follow-up</p>
          <p className="text-2xl font-bold text-primary">{leadsSemFollowUp.length}</p>
          <p className="text-[10px] text-muted-foreground">leads sem atividades</p>
        </Card>
      </div>

      {/* Leads parados */}
      {config.alertaParadoAtivo && leadsParados.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Leads Parados no Funil
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">{leadsParados.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leadsParados.map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-700">
                    {lead.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{lead.empresa} • {formatCurrency(lead.valor)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {ETAPAS_FUNIL.find(e => e.key === lead.etapa)?.label}
                  </Badge>
                  <Badge variant="destructive" className="text-[10px]">
                    {lead.diasParado} dias parado
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Atividades atrasadas */}
      {config.alertaAtrasadoAtivo && atividadesAtrasadas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" /> Atividades Atrasadas
              <Badge variant="destructive" className="text-[10px]">{atividadesAtrasadas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {atividadesAtrasadas.map(atv => (
              <div key={atv.id} className="flex items-center justify-between p-2.5 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-800/30">
                <div>
                  <p className="text-sm font-medium">{atv.titulo}</p>
                  <p className="text-xs text-muted-foreground">{atv.leadNome} • {atv.responsavel}</p>
                </div>
                <Badge variant="destructive" className="text-[10px]">
                  {atv.diasAtraso} dias de atraso
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CRMAutomacoes;
