import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, ComposedChart, Area } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Filter, Package, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";

const PRODUTOS = [
  "Arroz 5kg", "Feijão 1kg", "Açúcar 5kg", "Óleo de Soja 900ml", "Café 500g",
  "Leite Integral 1L", "Farinha de Trigo 1kg", "Macarrão 500g", "Sal 1kg", "Margarina 500g",
  "Biscoito 200g", "Detergente 500ml", "Sabão em Pó 1kg", "Papel Higiênico 12un", "Desinfetante 2L",
  "Água Mineral 1.5L", "Refrigerante 2L", "Cerveja 350ml", "Suco 1L", "Vinagre 750ml",
  "Molho de Tomate 340g", "Creme de Leite 200g", "Leite Condensado 395g", "Manteiga 200g", "Queijo Mussarela kg",
];

function generateMockSales() {
  const sales: Array<{ data: string; produtoIdx: number; produto: string; qtd: number; valor: number }> = [];
  for (let i = 0; i < 500; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = subDays(new Date(), daysAgo);
    const idx = Math.floor(Math.random() * PRODUTOS.length);
    // Skew: first products sell more
    const skewedIdx = Math.floor(Math.pow(Math.random(), 1.5) * PRODUTOS.length);
    const finalIdx = skewedIdx < PRODUTOS.length ? skewedIdx : idx;
    const qtd = Math.floor(Math.random() * 10) + 1;
    const precoUnit = Math.round((Math.random() * 30 + 3) * 100) / 100;
    sales.push({
      data: format(date, "yyyy-MM-dd"),
      produtoIdx: finalIdx,
      produto: PRODUTOS[finalIdx],
      qtd,
      valor: Math.round(qtd * precoUnit * 100) / 100,
    });
  }
  return sales;
}

const MOCK_SALES = generateMockSales();

const CURVA_COLORS: Record<string, string> = {
  A: "hsl(142, 71%, 45%)",
  B: "hsl(38, 92%, 50%)",
  C: "hsl(0, 84%, 60%)",
};

const CURVA_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  A: "default",
  B: "secondary",
  C: "destructive",
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasProdutoCurvaABC() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const filtered = useMemo(() => {
    return MOCK_SALES.filter((s) => {
      const d = parseISO(s.data);
      return isWithinInterval(d, { start: dataInicio, end: dataFim });
    });
  }, [dataInicio, dataFim]);

  const ranking = useMemo(() => {
    const map: Record<string, { produto: string; total: number; qtd: number }> = {};
    filtered.forEach((s) => {
      if (!map[s.produto]) map[s.produto] = { produto: s.produto, total: 0, qtd: 0 };
      map[s.produto].total += s.valor;
      map[s.produto].qtd += s.qtd;
    });
    const sorted = Object.values(map).sort((a, b) => b.total - a.total);
    const grandTotal = sorted.reduce((s, r) => s + r.total, 0);

    let accPct = 0;
    return sorted.map((r, i) => {
      const pct = grandTotal > 0 ? (r.total / grandTotal) * 100 : 0;
      accPct += pct;
      const curva = accPct <= 80 ? "A" : accPct <= 95 ? "B" : "C";
      return { ...r, pos: i + 1, pct: Math.round(pct * 10) / 10, accPct: Math.round(accPct * 10) / 10, curva };
    });
  }, [filtered]);

  const totalGeral = ranking.reduce((s, r) => s + r.total, 0);
  const totalQtd = ranking.reduce((s, r) => s + r.qtd, 0);
  const curvaA = ranking.filter((r) => r.curva === "A").length;
  const curvaB = ranking.filter((r) => r.curva === "B").length;
  const curvaC = ranking.filter((r) => r.curva === "C").length;

  const top10 = ranking.slice(0, 10);

  const pieData = [
    { name: "Curva A", value: ranking.filter((r) => r.curva === "A").reduce((s, r) => s + r.total, 0), fill: CURVA_COLORS.A },
    { name: "Curva B", value: ranking.filter((r) => r.curva === "B").reduce((s, r) => s + r.total, 0), fill: CURVA_COLORS.B },
    { name: "Curva C", value: ranking.filter((r) => r.curva === "C").reduce((s, r) => s + r.total, 0), fill: CURVA_COLORS.C },
  ];

  // Composed chart: bars + accumulated line
  const composedData = top10.map((r) => ({
    name: r.produto.length > 15 ? r.produto.substring(0, 15) + "…" : r.produto,
    valor: Math.round(r.total * 100) / 100,
    acumulado: r.accPct,
  }));

  const exportColumns: ExportColumn[] = [
    { header: "Pos.", key: "pos", align: "center" },
    { header: "Produto", key: "produto" },
    { header: "Curva", key: "curva", align: "center" },
    { header: "Qtd.", key: "qtd", align: "right" },
    { header: "Total (R$)", key: "total", align: "right", format: (v) => formatBRL(v) },
    { header: "% Part.", key: "pct", align: "right", format: (v) => `${v}%` },
    { header: "% Acum.", key: "accPct", align: "right", format: (v) => `${v}%` },
  ];

  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Vendas por Produto — Curva ABC"
        description="Classificação ABC de produtos por faturamento"
        actions={
          <ExportButtons
            options={{
              title: "Vendas por Produto - Curva ABC",
              subtitle: periodoLabel,
              filename: "vendas-produto-curva-abc",
              columns: exportColumns,
              data: ranking,
              summaryRows: [
                { label: "Total Geral", value: formatBRL(totalGeral) },
                { label: "Curva A", value: `${curvaA} produtos (80% fat.)` },
                { label: "Curva B", value: `${curvaB} produtos (15% fat.)` },
                { label: "Curva C", value: `${curvaC} produtos (5% fat.)` },
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
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Package size={14} /> Produtos</p>
            <p className="text-2xl font-bold text-foreground">{ranking.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: CURVA_COLORS.A }}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Curva A (80%)</p>
            <p className="text-2xl font-bold text-foreground">{curvaA} <span className="text-sm font-normal text-muted-foreground">produtos</span></p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: CURVA_COLORS.B }}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Curva B (15%)</p>
            <p className="text-2xl font-bold text-foreground">{curvaB} <span className="text-sm font-normal text-muted-foreground">produtos</span></p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: CURVA_COLORS.C }}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Curva C (5%)</p>
            <p className="text-2xl font-bold text-foreground">{curvaC} <span className="text-sm font-normal text-muted-foreground">produtos</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 10 Produtos (Pareto)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={composedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" angle={-20} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <Tooltip formatter={(value: number, name: string) => [name === "acumulado" ? `${value}%` : formatBRL(value), name === "acumulado" ? "% Acumulado" : "Faturamento"]} />
                  <Bar yAxisId="left" dataKey="valor" radius={[4, 4, 0, 0]}>
                    {composedData.map((_, i) => (
                      <Cell key={i} fill={i < 3 ? CURVA_COLORS.A : i < 7 ? CURVA_COLORS.B : CURVA_COLORS.C} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição ABC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatBRL(value), "Valor"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Classificação ABC Completa</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Curva</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">% Part.</TableHead>
                <TableHead className="text-right">% Acum.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r) => (
                <TableRow key={r.produto}>
                  <TableCell className="text-muted-foreground">{r.pos}º</TableCell>
                  <TableCell className="font-medium">{r.produto}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={CURVA_VARIANTS[r.curva]} className="min-w-[32px] justify-center">{r.curva}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{r.qtd}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(r.total)}</TableCell>
                  <TableCell className="text-right">{r.pct}%</TableCell>
                  <TableCell className="text-right">{r.accPct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-bold">Total</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">{totalQtd}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(totalGeral)}</TableCell>
                <TableCell className="text-right font-bold">100%</TableCell>
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
