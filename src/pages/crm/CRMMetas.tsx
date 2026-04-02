import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Lead } from "@/types/crm";
import { defaultLeads } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExportButtons } from "@/components/ExportButtons";
import { Plus, Trash2, Edit, Target, Trophy, TrendingUp, Medal, Award, AlertTriangle, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from "recharts";

interface MetaVendedor {
  id: string;
  vendedor: string;
  periodo: string; // YYYY-MM
  metaValor: number;
  metaLeads: number;
  metaConversoes: number;
}

const mesesOpcoes = () => {
  const meses: { value: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = -2; i <= 3; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const l = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    meses.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) });
  }
  return meses;
};

const defaultMetas: MetaVendedor[] = [
  { id: "meta-1", vendedor: "João", periodo: "2026-03", metaValor: 150000, metaLeads: 15, metaConversoes: 5 },
  { id: "meta-2", vendedor: "Ana", periodo: "2026-03", metaValor: 120000, metaLeads: 12, metaConversoes: 4 },
];

const emptyMeta: Omit<MetaVendedor, 'id'> = {
  vendedor: '', periodo: new Date().toISOString().slice(0, 7), metaValor: 0, metaLeads: 0, metaConversoes: 0,
};

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CRMMetas = () => {
  const { items: metas, addItem, updateItem, deleteItem } = useLocalStorage<MetaVendedor>("gp_erp_crm_metas", defaultMetas);
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [periodoFiltro, setPeriodoFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<MetaVendedor | null>(null);
  const [form, setForm] = useState<Omit<MetaVendedor, 'id'>>(emptyMeta);
  const { toast } = useToast();

  const metasPeriodo = useMemo(() => metas.filter(m => m.periodo === periodoFiltro), [metas, periodoFiltro]);

  const realizadoPorVendedor = useMemo(() => {
    const map: Record<string, { valor: number; leads: number; conversoes: number }> = {};
    leads.forEach((l: any) => {
      if (!l.responsavel) return;
      const mes = l.dataCriacao?.slice(0, 7);
      if (mes !== periodoFiltro) return;
      if (!map[l.responsavel]) map[l.responsavel] = { valor: 0, leads: 0, conversoes: 0 };
      map[l.responsavel].leads++;
      if (l.etapa === 'fechado_ganho') {
        map[l.responsavel].conversoes++;
        map[l.responsavel].valor += l.valor || 0;
      }
    });
    return map;
  }, [leads, periodoFiltro]);

  const progressData = useMemo(() => {
    return metasPeriodo.map(m => {
      const real = realizadoPorVendedor[m.vendedor] || { valor: 0, leads: 0, conversoes: 0 };
      const pctValor = m.metaValor > 0 ? Math.min(100, Math.round((real.valor / m.metaValor) * 100)) : 0;
      const pctLeads = m.metaLeads > 0 ? Math.min(100, Math.round((real.leads / m.metaLeads) * 100)) : 0;
      const pctConversoes = m.metaConversoes > 0 ? Math.min(100, Math.round((real.conversoes / m.metaConversoes) * 100)) : 0;
      return { ...m, real, pctValor, pctLeads, pctConversoes };
    });
  }, [metasPeriodo, realizadoPorVendedor]);

  // Deadline alerts: calculate days remaining and expected pace
  const deadlineAlerts = useMemo(() => {
    const [year, month] = periodoFiltro.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const hoje = new Date();
    const isCurrentMonth = hoje.getFullYear() === year && hoje.getMonth() + 1 === month;
    const diaAtual = isCurrentMonth ? hoje.getDate() : (hoje > new Date(year, month, 0) ? lastDay : 0);
    const diasRestantes = Math.max(0, lastDay - diaAtual);
    const pctMesDecorrido = lastDay > 0 ? (diaAtual / lastDay) * 100 : 0;

    return progressData.map(d => {
      const ritmoEsperado = pctMesDecorrido; // expected % at this point in month
      const defasagem = ritmoEsperado - d.pctValor;
      const emRisco = d.pctValor < ritmoEsperado * 0.7 && d.pctValor < 100;
      const atencao = d.pctValor < ritmoEsperado * 0.9 && d.pctValor < 100 && !emRisco;

      // Required daily pace to hit target
      const valorFaltante = Math.max(0, d.metaValor - d.real.valor);
      const mediaDiariaNecess = diasRestantes > 0 ? valorFaltante / diasRestantes : 0;

      return {
        ...d,
        diasRestantes,
        pctMesDecorrido,
        defasagem,
        emRisco,
        atencao,
        mediaDiariaNecess,
        isCurrentMonth,
      };
    });
  }, [progressData, periodoFiltro]);

  const alertasAtivos = deadlineAlerts.filter(a => a.emRisco || a.atencao);

  const chartData = useMemo(() => {
    return progressData.map(d => ({
      name: d.vendedor,
      meta: d.metaValor,
      realizado: d.real.valor,
      pct: d.pctValor,
    }));
  }, [progressData]);

  const abrirNovo = () => { setEditando(null); setForm({ ...emptyMeta, periodo: periodoFiltro }); setModal(true); };
  const abrirEditar = (m: MetaVendedor) => { setEditando(m); setForm({ ...m }); setModal(true); };

  const salvar = () => {
    if (!form.vendedor.trim()) { toast({ title: "Vendedor obrigatório", variant: "destructive" }); return; }
    if (editando) {
      updateItem(editando.id, form);
      toast({ title: "Meta atualizada" });
    } else {
      addItem(form as any);
      toast({ title: "Meta criada" });
    }
    setModal(false);
  };

  const getRankIcon = (idx: number) => {
    if (idx === 0) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (idx === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (idx === 2) return <Award className="w-5 h-5 text-orange-600" />;
    return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{idx + 1}º</span>;
  };

  const ranked = [...progressData].sort((a, b) => b.pctValor - a.pctValor);
  const mesLabel = mesesOpcoes().find(m => m.value === periodoFiltro)?.label || periodoFiltro;

  const exportColumns = [
    { header: "Vendedor", key: "vendedor" },
    { header: "Meta Valor", key: "metaValor", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Realizado", key: "realizado", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "% Valor", key: "pctValor", align: "center" as const, format: (v: number) => `${v}%` },
    { header: "Leads", key: "leads", align: "center" as const },
    { header: "Conversões", key: "conversoes", align: "center" as const },
    { header: "Status", key: "status" },
  ];

  const exportData = deadlineAlerts.map(d => ({
    vendedor: d.vendedor,
    metaValor: d.metaValor,
    realizado: d.real.valor,
    pctValor: d.pctValor,
    leads: `${d.real.leads}/${d.metaLeads}`,
    conversoes: `${d.real.conversoes}/${d.metaConversoes}`,
    status: d.emRisco ? "⚠️ Em risco" : d.atencao ? "⚡ Atenção" : d.pctValor >= 100 ? "✅ Atingida" : "🔄 Em andamento",
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Metas Comerciais" description="Acompanhe o progresso das metas por vendedor" />
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{mesesOpcoes().map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <ExportButtons options={{
            title: "Metas Comerciais",
            subtitle: mesLabel,
            filename: `metas-${periodoFiltro}`,
            columns: exportColumns,
            data: exportData,
          }} />
          <Button onClick={abrirNovo} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Meta</Button>
        </div>
      </div>

      {/* Deadline Alerts */}
      {alertasAtivos.length > 0 && (
        <Card className="border-amber-400/50 bg-amber-500/5">
          <CardContent className="pt-4 pb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas de Deadline
              <Badge variant="outline" className="text-[10px]">{alertasAtivos.length} pendência(s)</Badge>
            </h3>
            <div className="space-y-2">
              {alertasAtivos.map(a => (
                <div key={a.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border",
                  a.emRisco ? "border-destructive/40 bg-destructive/5" : "border-amber-400/40 bg-amber-500/5"
                )}>
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    a.emRisco ? "bg-destructive/10" : "bg-amber-500/10"
                  )}>
                    {a.emRisco ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{a.vendedor}</span>
                      <Badge variant={a.emRisco ? "destructive" : "outline"} className="text-[10px]">
                        {a.emRisco ? "Em risco" : "Atenção"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {a.pctValor}% atingido · {a.diasRestantes} dias restantes · 
                      Necessário {formatCurrency(a.mediaDiariaNecess)}/dia para atingir a meta
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold">{formatCurrency(a.real.valor)}</p>
                    <p className="text-[10px] text-muted-foreground">de {formatCurrency(a.metaValor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Cards */}
      {ranked.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranked.map((d, idx) => {
            const alert = deadlineAlerts.find(a => a.id === d.id);
            return (
              <Card key={d.id} className={cn(
                "relative overflow-hidden",
                idx === 0 && "ring-2 ring-amber-400/50",
                alert?.emRisco && "ring-1 ring-destructive/30"
              )}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{d.vendedor}</p>
                        {alert?.emRisco && <AlertTriangle className="w-3 h-3 text-destructive" />}
                        {alert?.atencao && <Clock className="w-3 h-3 text-amber-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(d.real.valor)} / {formatCurrency(d.metaValor)}
                      </p>
                    </div>
                    <Badge variant={d.pctValor >= 100 ? 'default' : d.pctValor >= 70 ? 'secondary' : 'outline'}
                      className={cn("text-xs", d.pctValor >= 100 && "bg-green-600")}>
                      {d.pctValor}%
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Faturamento</span><span>{d.pctValor}%</span>
                      </div>
                      <Progress value={d.pctValor} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Leads ({d.real.leads}/{d.metaLeads})</span><span>{d.pctLeads}%</span>
                      </div>
                      <Progress value={d.pctLeads} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                        <span>Conversões ({d.real.conversoes}/{d.metaConversoes})</span><span>{d.pctConversoes}%</span>
                      </div>
                      <Progress value={d.pctConversoes} className="h-1.5" />
                    </div>
                  </div>

                  {/* Deadline info */}
                  {alert?.isCurrentMonth && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-2">
                      <Calendar className="w-3 h-3" />
                      <span>{alert.diasRestantes} dias restantes</span>
                      <span>·</span>
                      <span>{Math.round(alert.pctMesDecorrido)}% do mês decorrido</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Comparativo Meta × Realizado
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= 100 ? 'hsl(142 71% 45%)' : entry.pct >= 70 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Meta Valor</TableHead>
              <TableHead className="text-center">Meta Leads</TableHead>
              <TableHead className="text-center">Meta Conversões</TableHead>
              <TableHead className="text-center">Progresso</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metasPeriodo.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma meta definida para este período</TableCell></TableRow>
            )}
            {metasPeriodo.map(m => {
              const d = progressData.find(p => p.id === m.id);
              const alert = deadlineAlerts.find(a => a.id === m.id);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.vendedor}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.metaValor)}</TableCell>
                  <TableCell className="text-center">{m.metaLeads}</TableCell>
                  <TableCell className="text-center">{m.metaConversoes}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={d && d.pctValor >= 100 ? 'default' : 'outline'} className={cn("text-xs", d && d.pctValor >= 100 && "bg-green-600")}>
                      {d?.pctValor ?? 0}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {alert?.emRisco && <Badge variant="destructive" className="text-[10px]">Em risco</Badge>}
                    {alert?.atencao && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">Atenção</Badge>}
                    {!alert?.emRisco && !alert?.atencao && d && d.pctValor >= 100 && <Badge className="text-[10px] bg-green-600">Atingida</Badge>}
                    {!alert?.emRisco && !alert?.atencao && d && d.pctValor < 100 && <Badge variant="outline" className="text-[10px]">Em andamento</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(m)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { deleteItem(m.id); toast({ title: "Meta excluída" }); }}>
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

      {/* Modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div><Label>Vendedor *</Label><Input value={form.vendedor} onChange={e => setForm(p => ({ ...p, vendedor: e.target.value }))} /></div>
            <div>
              <Label>Período</Label>
              <Select value={form.periodo} onValueChange={v => setForm(p => ({ ...p, periodo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{mesesOpcoes().map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Meta Valor (R$)</Label><Input type="number" value={form.metaValor} onChange={e => setForm(p => ({ ...p, metaValor: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Meta Leads</Label><Input type="number" value={form.metaLeads} onChange={e => setForm(p => ({ ...p, metaLeads: Number(e.target.value) }))} /></div>
              <div><Label>Meta Conversões</Label><Input type="number" value={form.metaConversoes} onChange={e => setForm(p => ({ ...p, metaConversoes: Number(e.target.value) }))} /></div>
            </div>
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

export default CRMMetas;
