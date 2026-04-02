import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, Atividade, ETAPAS_FUNIL } from "@/types/crm";
import { defaultLeads } from "@/data/crmDefaultData";
import { defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Users, TrendingUp, DollarSign, Target, Clock, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Phone, Mail, Calendar
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Funnel, FunnelChart, LabelList } from "recharts";
import { cn } from "@/lib/utils";

const CRMDashboard = () => {
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const { items: atividades } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);

  const metricas = useMemo(() => {
    const ativos = leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.etapa));
    const ganhos = leads.filter(l => l.etapa === 'fechado_ganho');
    const perdidos = leads.filter(l => l.etapa === 'fechado_perdido');
    const totalPipeline = ativos.reduce((s, l) => s + l.valor, 0);
    const totalGanho = ganhos.reduce((s, l) => s + l.valor, 0);
    const taxaConversao = leads.length > 0 ? (ganhos.length / leads.length) * 100 : 0;
    const atividadesPendentes = atividades.filter(a => a.status === 'pendente' || a.status === 'atrasada');
    const atividadesAtrasadas = atividades.filter(a => a.status === 'atrasada');

    return { ativos, ganhos, perdidos, totalPipeline, totalGanho, taxaConversao, atividadesPendentes, atividadesAtrasadas, total: leads.length };
  }, [leads, atividades]);

  const funilData = useMemo(() => {
    return ETAPAS_FUNIL.filter(e => !['fechado_ganho', 'fechado_perdido'].includes(e.key)).map(etapa => ({
      name: etapa.label,
      value: leads.filter(l => l.etapa === etapa.key).length,
      fill: etapa.key === 'prospeccao' ? 'hsl(var(--primary))' :
            etapa.key === 'qualificacao' ? 'hsl(var(--chart-2))' :
            etapa.key === 'proposta' ? 'hsl(var(--chart-3))' :
            'hsl(var(--chart-4))',
    }));
  }, [leads]);

  const origemData = useMemo(() => {
    const contagem: Record<string, number> = {};
    leads.forEach(l => { contagem[l.origem] = (contagem[l.origem] || 0) + 1; });
    return Object.entries(contagem).map(([key, value]) => ({ name: key.replace('_', ' '), value }));
  }, [leads]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--muted-foreground))'];

  const proximasAtividades = useMemo(() => {
    return atividades
      .filter(a => a.status === 'pendente' || a.status === 'atrasada')
      .sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime())
      .slice(0, 5)
      .map(a => ({
        ...a,
        leadNome: leads.find(l => l.id === a.leadId)?.nome || 'Sem lead',
      }));
  }, [atividades, leads]);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const kpis = [
    { label: "Total Pipeline", value: formatCurrency(metricas.totalPipeline), icon: DollarSign, desc: `${metricas.ativos.length} negócios ativos`, trend: "up" },
    { label: "Receita Ganha", value: formatCurrency(metricas.totalGanho), icon: TrendingUp, desc: `${metricas.ganhos.length} negócios`, trend: "up" },
    { label: "Taxa de Conversão", value: `${metricas.taxaConversao.toFixed(1)}%`, icon: Target, desc: `${metricas.ganhos.length} de ${metricas.total}`, trend: metricas.taxaConversao > 10 ? "up" : "down" },
    { label: "Atividades Pendentes", value: String(metricas.atividadesPendentes.length), icon: Clock, desc: `${metricas.atividadesAtrasadas.length} atrasada(s)`, trend: metricas.atividadesAtrasadas.length > 0 ? "down" : "up" },
  ];

  const tipoIcon = (tipo: string) => {
    if (tipo === 'ligacao') return Phone;
    if (tipo === 'email') return Mail;
    return Calendar;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="CRM - Dashboard" description="Visão geral do funil de vendas e atividades comerciais" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                    <span className="text-xs text-muted-foreground">{kpi.desc}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Funil de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funilData} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funilData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {origemData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" /> Próximas Atividades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximasAtividades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade pendente</p>}
            {proximasAtividades.map(atv => {
              const Icon = tipoIcon(atv.tipo);
              const isAtrasada = atv.status === 'atrasada';
              return (
                <div key={atv.id} className={cn("flex items-center gap-3 p-2 rounded-lg border", isAtrasada && "border-red-300 bg-red-50 dark:bg-red-950/20")}>
                  <div className={cn("p-2 rounded-lg", isAtrasada ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10")}>
                    <Icon className={cn("w-4 h-4", isAtrasada ? "text-red-500" : "text-primary")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{atv.titulo}</p>
                    <p className="text-xs text-muted-foreground">{atv.leadNome} • {new Date(atv.dataAgendada).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {isAtrasada && <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Leads Prioritários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leads
              .filter(l => l.prioridade === 'alta' && !['fechado_ganho', 'fechado_perdido'].includes(l.etapa))
              .slice(0, 5)
              .map(lead => (
                <div key={lead.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {lead.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{lead.empresa} • {formatCurrency(lead.valor)}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {ETAPAS_FUNIL.find(e => e.key === lead.etapa)?.label}
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;
