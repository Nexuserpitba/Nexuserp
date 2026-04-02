import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CalendarIcon, Filter, TrendingUp, CreditCard, Banknote, QrCode, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";

// Mock sales data
function generateMockSales() {
  const formas = [
    { id: "dinheiro", label: "Dinheiro", icon: Banknote },
    { id: "credito", label: "Cartão Crédito", icon: CreditCard },
    { id: "debito", label: "Cartão Débito", icon: CreditCard },
    { id: "pix", label: "PIX", icon: QrCode },
    { id: "crediario", label: "Crediário", icon: FileText },
  ];

  const sales: Array<{
    id: string;
    data: string;
    formaPagamento: string;
    formaLabel: string;
    valor: number;
    cliente: string;
    nfce: string;
  }> = [];

  for (let i = 0; i < 120; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = subDays(new Date(), daysAgo);
    const forma = formas[Math.floor(Math.random() * formas.length)];
    sales.push({
      id: `V${String(1000 + i).padStart(6, "0")}`,
      data: format(date, "yyyy-MM-dd"),
      formaPagamento: forma.id,
      formaLabel: forma.label,
      valor: Math.round((Math.random() * 800 + 20) * 100) / 100,
      cliente: ["João Silva", "Maria Souza", "Carlos Lima", "Ana Oliveira", "Pedro Santos"][Math.floor(Math.random() * 5)],
      nfce: `NFC-e ${100000 + i}`,
    });
  }
  return sales;
}

const MOCK_SALES = generateMockSales();

const COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendasFormaPagamento() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const filteredSales = useMemo(() => {
    return MOCK_SALES.filter((s) => {
      const d = parseISO(s.data);
      return isWithinInterval(d, { start: dataInicio, end: dataFim });
    });
  }, [dataInicio, dataFim]);

  const resumoPorForma = useMemo(() => {
    const map: Record<string, { label: string; total: number; qtd: number }> = {};
    filteredSales.forEach((s) => {
      if (!map[s.formaPagamento]) map[s.formaPagamento] = { label: s.formaLabel, total: 0, qtd: 0 };
      map[s.formaPagamento].total += s.valor;
      map[s.formaPagamento].qtd += 1;
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  const totalGeral = resumoPorForma.reduce((s, r) => s + r.total, 0);
  const totalQtd = resumoPorForma.reduce((s, r) => s + r.qtd, 0);

  const barData = resumoPorForma.map((r) => ({ name: r.label, valor: Math.round(r.total * 100) / 100 }));
  const pieData = resumoPorForma.map((r) => ({ name: r.label, value: Math.round(r.total * 100) / 100 }));

  const exportColumns: ExportColumn[] = [
    { header: "Forma de Pagamento", key: "label" },
    { header: "Qtd. Vendas", key: "qtd", align: "right" },
    { header: "Total (R$)", key: "total", align: "right", format: (v) => formatBRL(v) },
    { header: "% do Total", key: "pct", align: "right", format: (v) => `${v}%` },
  ];

  const exportData = resumoPorForma.map((r) => ({
    label: r.label,
    qtd: r.qtd,
    total: r.total,
    pct: totalGeral > 0 ? ((r.total / totalGeral) * 100).toFixed(1) : "0",
  }));

  const periodoLabel = `${format(dataInicio, "dd/MM/yyyy")} a ${format(dataFim, "dd/MM/yyyy")}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Vendas por Forma de Pagamento"
        description="Análise de vendas agrupadas por método de pagamento"
        actions={
          <ExportButtons
            options={{
              title: "Vendas por Forma de Pagamento",
              subtitle: periodoLabel,
              filename: "vendas-forma-pagamento",
              columns: exportColumns,
              data: exportData,
              summaryRows: [
                { label: "Total Geral", value: formatBRL(totalGeral) },
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDataInicio(startOfMonth(new Date())); setDataFim(endOfMonth(new Date())); }}
            >
              Mês atual
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDataInicio(subDays(new Date(), 7)); setDataFim(new Date()); }}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setDataInicio(subDays(new Date(), 30)); setDataFim(new Date()); }}
            >
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
            <p className="text-sm text-muted-foreground">Qtd. de Vendas</p>
            <p className="text-2xl font-bold text-foreground">{totalQtd}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Ticket Médio</p>
            <p className="text-2xl font-bold text-foreground">{totalQtd > 0 ? formatBRL(totalGeral / totalQtd) : "R$ 0,00"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp size={14} /> Forma Líder</p>
            <p className="text-2xl font-bold text-foreground">{resumoPorForma[0]?.label || "-"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [formatBRL(value), "Valor"]} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
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
            <CardTitle className="text-base">Distribuição Percentual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
          <CardTitle className="text-base">Detalhamento por Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Forma de Pagamento</TableHead>
                <TableHead className="text-right">Qtd. Vendas</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumoPorForma.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <span className="inline-block w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {r.label}
                  </TableCell>
                  <TableCell className="text-right">{r.qtd}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(r.total)}</TableCell>
                  <TableCell className="text-right">{totalGeral > 0 ? ((r.total / totalGeral) * 100).toFixed(1) : 0}%</TableCell>
                  <TableCell className="text-right">{r.qtd > 0 ? formatBRL(r.total / r.qtd) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">{totalQtd}</TableCell>
                <TableCell className="text-right font-bold">{formatBRL(totalGeral)}</TableCell>
                <TableCell className="text-right font-bold">100%</TableCell>
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
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && onSelect(d)}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
