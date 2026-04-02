import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Filter, Trophy, TrendingUp, Target, Users, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const VENDEDORES = [
  { id: "v1", nome: "Carlos Mendes", meta: 25000 },
  { id: "v2", nome: "Ana Paula", meta: 20000 },
  { id: "v3", nome: "Roberto Farias", meta: 30000 },
  { id: "v4", nome: "Juliana Costa", meta: 18000 },
  { id: "v5", nome: "Pedro Almeida", meta: 22000 },
  { id: "v6", nome: "Fernanda Lima", meta: 15000 },
];

function generateMockSales() {
  const sales: Array<{
    id: string;
    data: string;
    vendedorId: string;
    vendedor: string;
    valor: number;
    cliente: string;
  }> = [];

  for (let i = 0; i < 200; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = subDays(new Date(), daysAgo);
    const vend = VENDEDORES[Math.floor(Math.random() * VENDEDORES.length)];
    sales.push({
      id: `V${String(2000 + i).padStart(6, "0")}`,
      data: format(date, "yyyy-MM-dd"),
      vendedorId: vend.id,
      vendedor: vend.nome,
      valor: Math.round((Math.random() * 1200 + 50) * 100) / 100,
      cliente: ["João Silva", "Maria Souza", "Carlos Lima", "Ana Oliveira", "Pedro Santos"][Math.floor(Math.random() * 5)],
    });
  }
  return sales;
}

const MOCK_SALES = generateMockSales();

const COLORS = [
  "hsl(45, 93%, 47%)",   // gold
  "hsl(0, 0%, 65%)",     // silver
  "hsl(25, 60%, 45%)",   // bronze
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(262, 83%, 58%)",
];

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasVendedor() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const filteredSales = useMemo(() => {
    return MOCK_SALES.filter((s) => {
      const d = parseISO(s.data);
      return isWithinInterval(d, { start: dataInicio, end: dataFim });
    });
  }, [dataInicio, dataFim]);

  const ranking = useMemo(() => {
    const map: Record<string, { nome: string; total: number; qtd: number; meta: number }> = {};
    VENDEDORES.forEach((v) => {
      map[v.id] = { nome: v.nome, total: 0, qtd: 0, meta: v.meta };
    });
    filteredSales.forEach((s) => {
      if (map[s.vendedorId]) {
        map[s.vendedorId].total += s.valor;
        map[s.vendedorId].qtd += 1;
      }
    });
    return Object.entries(map)
      .map(([id, v]) => ({
        id,
        ...v,
        pctMeta: v.meta > 0 ? Math.round((v.total / v.meta) * 100) : 0,
        ticketMedio: v.qtd > 0 ? v.total / v.qtd : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  const totalGeral = ranking.reduce((s, r) => s + r.total, 0);
  const totalQtd = ranking.reduce((s, r) => s + r.qtd, 0);
  const metasBatidas = ranking.filter((r) => r.pctMeta >= 100).length;

  const barData = ranking.map((r) => ({ name: r.nome.split(" ")[0], valor: Math.round(r.total * 100) / 100, meta: r.meta }));

  const exportColumns: ExportColumn[] = [
    { header: "Pos.", key: "pos", align: "center" },
    { header: "Vendedor", key: "nome" },
    { header: "Qtd. Vendas", key: "qtd", align: "right" },
    { header: "Total (R$)", key: "total", align: "right", format: (v) => formatBRL(v) },
    { header: "Meta (R$)", key: "meta", align: "right", format: (v) => formatBRL(v) },
    { header: "% Meta", key: "pctMeta", align: "right", format: (v) => `${v}%` },
  ];

  const exportData = ranking.map((r, i) => ({ pos: i + 1, ...r }));
  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Vendas por Vendedor"
        description="Ranking de vendedores com acompanhamento de metas"
        actions={
          <ExportButtons
            options={{
              title: "Vendas por Vendedor",
              subtitle: periodoLabel,
              filename: "vendas-vendedor",
              columns: exportColumns,
              data: exportData,
              summaryRows: [
                { label: "Total Geral", value: formatBRL(totalGeral) },
                { label: "Total de Vendas", value: String(totalQtd) },
                { label: "Metas Batidas", value: `${metasBatidas}/${ranking.length}` },
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
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(startOfMonth(new Date())); setDataFim(endOfMonth(new Date())); }}>
              Mês atual
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 7)); setDataFim(new Date()); }}>
              Últimos 7 dias
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 30)); setDataFim(new Date()); }}>
              Últimos 30 dias
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total no Período</p>
            <p className="text-2xl font-bold text-foreground">{formatBRL(totalGeral)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Trophy size={14} /> Líder</p>
            <p className="text-2xl font-bold text-foreground">{ranking[0]?.nome || "-"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Target size={14} /> Metas Batidas</p>
            <p className="text-2xl font-bold text-foreground">{metasBatidas} / {ranking.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Users size={14} /> Vendedores Ativos</p>
            <p className="text-2xl font-bold text-foreground">{ranking.filter((r) => r.qtd > 0).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Bar with meta line */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vendas vs Meta por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number, name: string) => [formatBRL(value), name === "valor" ? "Vendas" : "Meta"]} />
                <Legend formatter={(value) => (value === "valor" ? "Vendas" : "Meta")} />
                <Bar dataKey="valor" name="valor" radius={[4, 4, 0, 0]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="meta" name="meta" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking de Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Qtd. Vendas</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">Meta (R$)</TableHead>
                <TableHead className="min-w-[160px]">% Meta</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {i < 3 ? (
                      <Medal size={18} className={MEDAL_COLORS[i]} />
                    ) : (
                      <span className="text-muted-foreground">{i + 1}º</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-right">{r.qtd}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(r.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatBRL(r.meta)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(r.pctMeta, 100)} className="h-2 flex-1" />
                      <Badge variant={r.pctMeta >= 100 ? "default" : r.pctMeta >= 70 ? "secondary" : "destructive"} className="text-xs min-w-[48px] justify-center">
                        {r.pctMeta}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(r.ticketMedio)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalQtd}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(totalGeral)}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(ranking.reduce((s, r) => s + r.meta, 0))}</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{totalQtd > 0 ? formatBRL(totalGeral / totalQtd) : "-"}</TableCell>
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
