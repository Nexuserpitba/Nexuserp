import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Filter, TrendingUp, TrendingDown, ShoppingCart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";

function generateMockSales() {
  const sales: Array<{ data: string; valor: number; qtd: number }> = [];
  for (let i = 59; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dow = date.getDay();
    const baseMult = dow === 0 ? 0.4 : dow === 6 ? 1.3 : 1;
    const qtd = Math.floor((Math.random() * 20 + 5) * baseMult);
    const valor = Math.round((Math.random() * 400 + 150) * qtd * baseMult) / 100 * 10;
    sales.push({ data: format(date, "yyyy-MM-dd"), valor: Math.round(valor * 100) / 100, qtd });
  }
  return sales;
}

const MOCK_DAILY = generateMockSales();

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasDiarias() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const filtered = useMemo(() => {
    return MOCK_DAILY.filter((s) => {
      const d = parseISO(s.data);
      return isWithinInterval(d, { start: dataInicio, end: dataFim });
    });
  }, [dataInicio, dataFim]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: dataInicio, end: dataFim });
    const map: Record<string, { valor: number; qtd: number }> = {};
    filtered.forEach((s) => { map[s.data] = { valor: s.valor, qtd: s.qtd }; });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const label = format(d, "dd/MM", { locale: ptBR });
      const dow = format(d, "EEE", { locale: ptBR });
      return { date: key, label, dow, valor: map[key]?.valor || 0, qtd: map[key]?.qtd || 0 };
    });
  }, [filtered, dataInicio, dataFim]);

  const totalValor = filtered.reduce((s, r) => s + r.valor, 0);
  const totalQtd = filtered.reduce((s, r) => s + r.qtd, 0);
  const mediaDiaria = chartData.length > 0 ? totalValor / chartData.length : 0;
  const melhorDia = chartData.reduce((best, d) => d.valor > best.valor ? d : best, { valor: 0, label: "-", date: "", dow: "", qtd: 0 });

  // Trend: compare first half vs second half
  const half = Math.floor(chartData.length / 2);
  const firstHalf = chartData.slice(0, half).reduce((s, d) => s + d.valor, 0);
  const secondHalf = chartData.slice(half).reduce((s, d) => s + d.valor, 0);
  const trend = half > 0 && firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;

  // Day of week summary
  const dowSummary = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    chartData.forEach((d) => {
      if (!map[d.dow]) map[d.dow] = { total: 0, count: 0 };
      map[d.dow].total += d.valor;
      map[d.dow].count += 1;
    });
    return Object.entries(map).map(([dow, v]) => ({
      dow, media: v.count > 0 ? v.total / v.count : 0, total: v.total,
    }));
  }, [chartData]);

  const DOW_COLORS = ["hsl(0, 84%, 60%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(262, 83%, 58%)", "hsl(38, 92%, 50%)", "hsl(180, 60%, 45%)", "hsl(330, 70%, 55%)"];

  const exportColumns: ExportColumn[] = [
    { header: "Data", key: "label" },
    { header: "Dia", key: "dow" },
    { header: "Qtd. Vendas", key: "qtd", align: "right" },
    { header: "Total (R$)", key: "valor", align: "right", format: (v) => formatBRL(v) },
  ];

  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Vendas Diárias"
        description="Evolução temporal das vendas com análise de tendência"
        actions={
          <ExportButtons
            options={{
              title: "Vendas Diárias",
              subtitle: periodoLabel,
              filename: "vendas-diarias",
              columns: exportColumns,
              data: chartData,
              summaryRows: [
                { label: "Total Geral", value: formatBRL(totalValor) },
                { label: "Média Diária", value: formatBRL(mediaDiaria) },
                { label: "Total de Vendas", value: String(totalQtd) },
              ],
            }}
          />
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <DatePicker label="De" date={dataInicio} onSelect={setDataInicio} />
            <DatePicker label="Até" date={dataFim} onSelect={setDataFim} />
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(startOfMonth(new Date())); setDataFim(endOfMonth(new Date())); }}>Mês atual</Button>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 7)); setDataFim(new Date()); }}>Últimos 7 dias</Button>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 30)); setDataFim(new Date()); }}>Últimos 30 dias</Button>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 60)); setDataFim(new Date()); }}>Últimos 60 dias</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total no Período</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(totalValor)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Média Diária</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(mediaDiaria)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {trend >= 0 ? <TrendingUp size={14} className="text-green-500" /> : <TrendingDown size={14} className="text-red-500" />}
              Tendência
            </p>
            <p className={cn("text-2xl font-bold flex items-center gap-1", trend >= 0 ? "text-green-600" : "text-red-600")}>
              {trend >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
              {Math.abs(trend).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><ShoppingCart size={14} /> Melhor Dia</p>
            <p className="text-2xl font-bold text-foreground">{melhorDia.label}</p>
            <p className="text-xs text-muted-foreground">{formatBRL(melhorDia.valor)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Area chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" interval={chartData.length > 14 ? Math.floor(chartData.length / 10) : 0} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatBRL(value), "Vendas"]} labelFormatter={(l) => `Data: ${l}`} />
                <Area type="monotone" dataKey="valor" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Day of week bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Média de Vendas por Dia da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowSummary}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="dow" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value: number) => [formatBRL(value), "Média"]} />
                <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                  {dowSummary.map((_, i) => (
                    <Cell key={i} fill={DOW_COLORS[i % DOW_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhamento Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Dia</TableHead>
                <TableHead className="text-right">Qtd. Vendas</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">vs Média</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((d) => {
                const diff = mediaDiaria > 0 ? ((d.valor - mediaDiaria) / mediaDiaria) * 100 : 0;
                return (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">{d.label}</TableCell>
                    <TableCell className="text-muted-foreground capitalize">{d.dow}</TableCell>
                    <TableCell className="text-right">{d.qtd}</TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(d.valor)}</TableCell>
                    <TableCell className={cn("text-right text-sm", diff >= 0 ? "text-green-600" : "text-red-500")}>
                      {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold" colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-bold">{totalQtd}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(totalValor)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-2 min-w-[150px]")}>
          <CalendarIcon size={14} />
          {label}: {format(date, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && onSelect(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}
