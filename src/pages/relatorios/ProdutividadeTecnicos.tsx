import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExportButtons } from "@/components/ExportButtons";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Users, CheckCircle2, Clock, TrendingUp, Award, CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatCurrencyBRL } from "@/components/ui/currency-input";

// ========== Interfaces ==========

interface OrdemServico {
  id: string;
  status: "aberta" | "em_andamento" | "aguardando" | "concluida" | "cancelada";
  tecnicoResponsavel: string;
  dataAbertura: string;
  dataConclusao: string;
  valorTotal: number;
}

interface Tecnico {
  id: string;
  nome: string;
  especialidade: string;
  ativo: boolean;
}

interface TecnicoStats {
  nome: string;
  totalOS: number;
  concluidas: number;
  emAndamento: number;
  canceladas: number;
  taxaConclusao: number;
  tempoMedioDias: number;
  faturamento: number;
}

// ========== Helpers ==========

function getStoredData<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

function diffDays(start: string, end: string): number {
  const d1 = new Date(start);
  const d2 = new Date(end);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(210 70% 55%)",
  "hsl(150 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(340 65% 50%)",
  "hsl(270 55% 55%)",
  "hsl(190 60% 45%)",
];

// ========== Component ==========

export default function ProdutividadeTecnicos() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const stats = useMemo<TecnicoStats[]>(() => {
    const ordens = getStoredData<OrdemServico[]>("ordens_servico", []);
    const tecnicos = getStoredData<Tecnico[]>("tecnicos", []);

    // Filter by date range
    const filteredOrdens = ordens.filter(os => {
      if (!os.dataAbertura) return false;
      try {
        const d = parseISO(os.dataAbertura);
        return isWithinInterval(d, { start: dataInicio, end: dataFim });
      } catch { return false; }
    });

    const map = new Map<string, { os: OrdemServico[] }>();

    tecnicos.filter(t => t.ativo !== false).forEach(t => {
      map.set(t.nome, { os: [] });
    });

    filteredOrdens.forEach(os => {
      if (!os.tecnicoResponsavel) return;
      if (!map.has(os.tecnicoResponsavel)) {
        map.set(os.tecnicoResponsavel, { os: [] });
      }
      map.get(os.tecnicoResponsavel)!.os.push(os);
    });

    return Array.from(map.entries()).map(([nome, { os }]) => {
      const concluidas = os.filter(o => o.status === "concluida");
      const emAndamento = os.filter(o => o.status === "em_andamento" || o.status === "aguardando").length;
      const canceladas = os.filter(o => o.status === "cancelada").length;

      const tempos = concluidas
        .filter(o => o.dataAbertura && o.dataConclusao)
        .map(o => diffDays(o.dataAbertura, o.dataConclusao));

      const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
      const faturamento = concluidas.reduce((sum, o) => sum + (o.valorTotal || 0), 0);

      return {
        nome,
        totalOS: os.length,
        concluidas: concluidas.length,
        emAndamento,
        canceladas,
        taxaConclusao: os.length > 0 ? (concluidas.length / os.length) * 100 : 0,
        tempoMedioDias: Math.round(tempoMedio * 10) / 10,
        faturamento,
      };
    }).sort((a, b) => b.concluidas - a.concluidas);
  }, [dataInicio, dataFim]);

  const totals = useMemo(() => ({
    totalOS: stats.reduce((s, t) => s + t.totalOS, 0),
    concluidas: stats.reduce((s, t) => s + t.concluidas, 0),
    tempoMedio: stats.filter(t => t.tempoMedioDias > 0).length > 0
      ? Math.round(stats.filter(t => t.tempoMedioDias > 0).reduce((s, t) => s + t.tempoMedioDias, 0) / stats.filter(t => t.tempoMedioDias > 0).length * 10) / 10
      : 0,
    faturamento: stats.reduce((s, t) => s + t.faturamento, 0),
  }), [stats]);

  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    stats.forEach((t, i) => {
      cfg[t.nome] = { label: t.nome, color: COLORS[i % COLORS.length] };
    });
    cfg.concluidas = { label: "Concluídas", color: "hsl(150 60% 45%)" };
    cfg.emAndamento = { label: "Em Andamento", color: "hsl(40 80% 55%)" };
    cfg.canceladas = { label: "Canceladas", color: "hsl(0 65% 50%)" };
    return cfg;
  }, [stats]);

  const barData = stats.map(t => ({
    nome: t.nome.length > 12 ? t.nome.substring(0, 12) + "…" : t.nome,
    concluidas: t.concluidas,
    emAndamento: t.emAndamento,
    canceladas: t.canceladas,
  }));

  const pieData = stats.filter(t => t.concluidas > 0).map((t, i) => ({
    name: t.nome,
    value: t.concluidas,
    fill: COLORS[i % COLORS.length],
  }));

  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  const exportOptions = {
    title: "Produtividade dos Técnicos",
    subtitle: `Período: ${periodoLabel}`,
    filename: "produtividade-tecnicos",
    columns: [
      { header: "Técnico", key: "nome" },
      { header: "Total OS", key: "totalOS" },
      { header: "Concluídas", key: "concluidas" },
      { header: "Em Andamento", key: "emAndamento" },
      { header: "Taxa Conclusão", key: "taxaConclusao", format: (v: number) => `${v.toFixed(1)}%` },
      { header: "Tempo Médio (dias)", key: "tempoMedioDias" },
      { header: "Faturamento", key: "faturamento", format: (v: number) => formatCurrencyBRL(v) },
    ],
    data: stats,
    summaryRows: [
      { label: "Total de OS", value: String(totals.totalOS) },
      { label: "Concluídas", value: String(totals.concluidas) },
      { label: "Tempo Médio Geral", value: `${totals.tempoMedio} dias` },
      { label: "Faturamento Total", value: formatCurrencyBRL(totals.faturamento) },
    ],
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Produtividade dos Técnicos"
          description="Análise de desempenho, OS concluídas e tempo médio de atendimento"
        />
        <ExportButtons options={exportOptions} thermal />
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataInicio, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={(d) => d && setDataInicio(d)} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataFim, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={(d) => d && setDataFim(d)} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-1.5 ml-2">
          {[
            { label: "Hoje", fn: () => { setDataInicio(startOfDay(new Date())); setDataFim(endOfDay(new Date())); } },
            { label: "Esta Semana", fn: () => { setDataInicio(startOfWeek(new Date(), { weekStartsOn: 1 })); setDataFim(endOfWeek(new Date(), { weekStartsOn: 1 })); } },
            { label: "Este Mês", fn: () => { setDataInicio(startOfMonth(new Date())); setDataFim(endOfMonth(new Date())); } },
            { label: "Último Trimestre", fn: () => { setDataInicio(startOfMonth(subMonths(new Date(), 3))); setDataFim(endOfMonth(new Date())); } },
          ].map(p => (
            <Button key={p.label} variant="ghost" size="sm" className="text-xs h-8" onClick={p.fn}>{p.label}</Button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Técnicos Ativos</p>
              <p className="text-2xl font-bold">{stats.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">OS Concluídas</p>
              <p className="text-2xl font-bold">{totals.concluidas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tempo Médio</p>
              <p className="text-2xl font-bold">{totals.tempoMedio} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Faturamento</p>
              <p className="text-2xl font-bold text-lg">{formatCurrencyBRL(totals.faturamento)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {stats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">OS por Técnico</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="concluidas" stackId="a" fill="hsl(150 60% 45%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="emAndamento" stackId="a" fill="hsl(40 80% 55%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="canceladas" stackId="a" fill="hsl(0 65% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição de Conclusões</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" /> Ranking de Produtividade
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Total OS</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Em Andamento</TableHead>
                <TableHead className="text-center">Canceladas</TableHead>
                <TableHead className="text-center">Taxa Conclusão</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum técnico cadastrado ou sem ordens de serviço registradas.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((t, i) => (
                  <TableRow key={t.nome}>
                    <TableCell>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                    </TableCell>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell className="text-center">{t.totalOS}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">{t.concluidas}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">{t.emAndamento}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-red-100 text-red-700">{t.canceladas}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.taxaConclusao >= 70 ? "default" : "secondary"}>
                        {t.taxaConclusao.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.tempoMedioDias > 0 ? `${t.tempoMedioDias} dias` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrencyBRL(t.faturamento)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
