import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Filter, Users, TrendingUp, ShoppingCart, Star, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";

const CLIENTES = [
  "João Silva", "Maria Souza", "Carlos Lima", "Ana Oliveira", "Pedro Santos",
  "Fernanda Costa", "Roberto Almeida", "Juliana Mendes", "Lucas Pereira", "Patrícia Rocha",
  "André Martins", "Camila Ferreira", "Diego Nascimento", "Beatriz Cardoso", "Rafael Gomes",
];

function generateMockSales() {
  const sales: Array<{ data: string; cliente: string; valor: number; itens: number }> = [];
  for (let i = 0; i < 400; i++) {
    const daysAgo = Math.floor(Math.random() * 90);
    const date = subDays(new Date(), daysAgo);
    // Skew: first clients buy more
    const idx = Math.floor(Math.pow(Math.random(), 1.4) * CLIENTES.length);
    const itens = Math.floor(Math.random() * 8) + 1;
    const valor = Math.round((Math.random() * 500 + 30) * 100) / 100;
    sales.push({ data: format(date, "yyyy-MM-dd"), cliente: CLIENTES[idx], valor, itens });
  }
  return sales;
}

const MOCK_SALES = generateMockSales();
const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(262, 83%, 58%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(180, 60%, 45%)", "hsl(330, 70%, 55%)", "hsl(60, 70%, 45%)", "hsl(200, 70%, 50%)", "hsl(290, 60%, 50%)"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasCliente() {
  const [dataInicio, setDataInicio] = useState<Date>(subDays(new Date(), 30));
  const [dataFim, setDataFim] = useState<Date>(new Date());

  const filtered = useMemo(() => MOCK_SALES.filter((s) => {
    const d = parseISO(s.data);
    return isWithinInterval(d, { start: dataInicio, end: dataFim });
  }), [dataInicio, dataFim]);

  const ranking = useMemo(() => {
    const map: Record<string, { cliente: string; total: number; qtdCompras: number; totalItens: number; ultimaCompra: string }> = {};
    filtered.forEach((s) => {
      if (!map[s.cliente]) map[s.cliente] = { cliente: s.cliente, total: 0, qtdCompras: 0, totalItens: 0, ultimaCompra: s.data };
      map[s.cliente].total += s.valor;
      map[s.cliente].qtdCompras += 1;
      map[s.cliente].totalItens += s.itens;
      if (s.data > map[s.cliente].ultimaCompra) map[s.cliente].ultimaCompra = s.data;
    });
    return Object.values(map)
      .map((r) => ({ ...r, ticketMedio: r.qtdCompras > 0 ? r.total / r.qtdCompras : 0, mediaItens: r.qtdCompras > 0 ? r.totalItens / r.qtdCompras : 0 }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => ({ ...r, pos: i + 1 }));
  }, [filtered]);

  const totalGeral = ranking.reduce((s, r) => s + r.total, 0);
  const totalCompras = ranking.reduce((s, r) => s + r.qtdCompras, 0);
  const ticketMedioGeral = totalCompras > 0 ? totalGeral / totalCompras : 0;

  // Top 5 concentration
  const top5Total = ranking.slice(0, 5).reduce((s, r) => s + r.total, 0);
  const top5Pct = totalGeral > 0 ? (top5Total / totalGeral * 100).toFixed(1) : "0";

  // Frequency chart
  const freqData = useMemo(() => {
    const buckets = [
      { label: "1 compra", min: 1, max: 1, count: 0 },
      { label: "2-3", min: 2, max: 3, count: 0 },
      { label: "4-6", min: 4, max: 6, count: 0 },
      { label: "7-10", min: 7, max: 10, count: 0 },
      { label: "11+", min: 11, max: 9999, count: 0 },
    ];
    ranking.forEach((r) => {
      const b = buckets.find((b) => r.qtdCompras >= b.min && r.qtdCompras <= b.max);
      if (b) b.count++;
    });
    return buckets.map((b) => ({ name: b.label, clientes: b.count }));
  }, [ranking]);

  const barData = ranking.slice(0, 10).map((r) => ({
    name: r.cliente.split(" ")[0],
    valor: Math.round(r.total * 100) / 100,
    ticket: Math.round(r.ticketMedio * 100) / 100,
  }));

  const exportColumns: ExportColumn[] = [
    { header: "Pos.", key: "pos", align: "center" },
    { header: "Cliente", key: "cliente" },
    { header: "Compras", key: "qtdCompras", align: "right" },
    { header: "Total (R$)", key: "total", align: "right", format: (v) => formatBRL(v) },
    { header: "Ticket Médio", key: "ticketMedio", align: "right", format: (v) => formatBRL(v) },
    { header: "Última Compra", key: "ultimaCompra", align: "center", format: (v) => format(parseISO(v), "dd/MM/yyyy") },
  ];

  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Vendas por Cliente"
        description="Histórico de compras, ticket médio e frequência por cliente"
        actions={
          <ExportButtons
            options={{
              title: "Vendas por Cliente",
              subtitle: periodoLabel,
              filename: "vendas-cliente",
              columns: exportColumns,
              data: ranking,
              summaryRows: [
                { label: "Total Geral", value: formatBRL(totalGeral) },
                { label: "Ticket Médio", value: formatBRL(ticketMedioGeral) },
                { label: "Clientes Ativos", value: String(ranking.length) },
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
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 90)); setDataFim(new Date()); }}>Últimos 90 dias</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Faturamento</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(totalGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Users size={14} /> Clientes Ativos</p>
            <p className="text-2xl font-bold text-foreground">{ranking.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><ShoppingCart size={14} /> Total Compras</p>
            <p className="text-2xl font-bold text-foreground">{totalCompras}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp size={14} /> Ticket Médio</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(ticketMedioGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Star size={14} /> Top 5 concentram</p>
            <p className="text-2xl font-bold text-foreground">{top5Pct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Clientes — Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" width={80} />
                  <Tooltip formatter={(value: number) => [formatBRL(value), "Faturamento"]} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frequência de Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <Tooltip formatter={(value: number) => [value, "Clientes"]} />
                  <Bar dataKey="clientes" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalhamento por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Compras</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Méd. Itens/Compra</TableHead>
                <TableHead className="text-center">Última Compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r) => (
                <TableRow key={r.cliente}>
                  <TableCell>
                    {r.pos <= 3 ? (
                      <Badge variant="default" className="min-w-[28px] justify-center">{r.pos}º</Badge>
                    ) : (
                      <span className="text-muted-foreground">{r.pos}º</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{r.cliente}</TableCell>
                  <TableCell className="text-right">{r.qtdCompras}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(r.total)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.ticketMedio)}</TableCell>
                  <TableCell className="text-right">{r.mediaItens.toFixed(1)}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{format(parseISO(r.ultimaCompra), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalCompras}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(totalGeral)}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(ticketMedioGeral)}</TableCell>
                <TableCell />
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
