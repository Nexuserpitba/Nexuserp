import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Percent, DollarSign, ShieldAlert, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/components/ExportButtons";
import { ExportColumn } from "@/lib/exportUtils";

interface DescontoEntry {
  id: string;
  data: Date;
  cupomNumero: string;
  tipo: "item" | "geral";
  descricao: string;
  percentual: number;
  valorDesconto: number;
  valorOriginal: number;
  operador: string;
  liberacaoGerencial: boolean;
  autorizadoPor?: string;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getDescontosFromHistorico(): DescontoEntry[] {
  const entries: DescontoEntry[] = [];

  // Get cupom history
  try {
    const stored = localStorage.getItem("pdv-cupons-historico");
    if (stored) {
      const cupons = JSON.parse(stored);
      cupons.forEach((c: any) => {
        const dataEmissao = new Date(c.dataEmissao);

        // Item-level discounts
        if (c.items) {
          c.items.forEach((item: any) => {
            if (item.desconto && item.desconto > 0) {
              const totalItem = item.preco * item.quantidade;
              const valorDesc = totalItem * (item.desconto / 100);
              entries.push({
                id: `${c.numero}-item-${item.id}`,
                data: dataEmissao,
                cupomNumero: c.numero,
                tipo: "item",
                descricao: item.descricao,
                percentual: item.desconto,
                valorDesconto: valorDesc,
                valorOriginal: totalItem,
                operador: c.operador || "",
                liberacaoGerencial: false,
              });
            }
          });
        }

        // General discount
        if (c.descontoGeral && c.descontoGeral.calculado > 0) {
          const subtotalItens = c.subtotal + c.descontoGeral.calculado;
          const pct = c.descontoGeral.tipo === "percent"
            ? c.descontoGeral.valor
            : subtotalItens > 0 ? (c.descontoGeral.calculado / subtotalItens) * 100 : 0;
          entries.push({
            id: `${c.numero}-geral`,
            data: dataEmissao,
            cupomNumero: c.numero,
            tipo: "geral",
            descricao: `Desconto geral ${c.descontoGeral.tipo === "percent" ? c.descontoGeral.valor + "%" : "R$ " + c.descontoGeral.valor.toFixed(2)}`,
            percentual: Math.round(pct * 100) / 100,
            valorDesconto: c.descontoGeral.calculado,
            valorOriginal: subtotalItens,
            operador: c.operador || "",
            liberacaoGerencial: false,
          });
        }
      });
    }
  } catch { /* erro ignorado */ }

  // Liberações gerenciais enrichment is now handled via Supabase
  // The loadLogs() async function can be used in a useEffect if needed

  return entries.sort((a, b) => b.data.getTime() - a.data.getTime());
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(210, 70%, 50%)",
];

const exportColumns: ExportColumn[] = [
  { key: "data", header: "Data" },
  { key: "cupomNumero", header: "Cupom" },
  { key: "operador", header: "Operador" },
  { key: "tipo", header: "Tipo" },
  { key: "descricao", header: "Descrição" },
  { key: "percentual", header: "% Desconto", align: "right" },
  { key: "valorDesconto", header: "Valor Desconto", align: "right" },
  { key: "valorOriginal", header: "Valor Original", align: "right" },
  { key: "liberacao", header: "Liberação" },
  { key: "autorizadoPor", header: "Autorizado Por" },
];

export default function RelatorioDescontos() {
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "item" | "geral">("todos");
  const [liberacaoFiltro, setLiberacaoFiltro] = useState<"todos" | "sim" | "nao">("todos");
  const [operadorFiltro, setOperadorFiltro] = useState("todos");

  const allEntries = useMemo(() => getDescontosFromHistorico(), []);

  const operadoresUnicos = useMemo(() => {
    const set = new Set(allEntries.map(e => e.operador).filter(Boolean));
    return Array.from(set).sort();
  }, [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      const inRange = isWithinInterval(e.data, { start: dataInicio, end: endOfMonth(dataFim) });
      if (!inRange) return false;
      if (tipoFiltro !== "todos" && e.tipo !== tipoFiltro) return false;
      if (liberacaoFiltro === "sim" && !e.liberacaoGerencial) return false;
      if (liberacaoFiltro === "nao" && e.liberacaoGerencial) return false;
      if (operadorFiltro !== "todos" && e.operador !== operadorFiltro) return false;
      return true;
    });
  }, [allEntries, dataInicio, dataFim, tipoFiltro, liberacaoFiltro, operadorFiltro]);

  // KPIs
  const totalDescontos = filtered.reduce((acc, e) => acc + e.valorDesconto, 0);
  const totalOriginal = filtered.reduce((acc, e) => acc + e.valorOriginal, 0);
  const percentualMedio = filtered.length > 0 ? filtered.reduce((acc, e) => acc + e.percentual, 0) / filtered.length : 0;
  const countLiberacoes = filtered.filter(e => e.liberacaoGerencial).length;

  // Chart: by type
  const chartByType = useMemo(() => {
    const itemTotal = filtered.filter(e => e.tipo === "item").reduce((a, e) => a + e.valorDesconto, 0);
    const geralTotal = filtered.filter(e => e.tipo === "geral").reduce((a, e) => a + e.valorDesconto, 0);
    return [
      { name: "Por Item", value: Math.round(itemTotal * 100) / 100 },
      { name: "Geral", value: Math.round(geralTotal * 100) / 100 },
    ].filter(d => d.value > 0);
  }, [filtered]);

  // Chart: by day
  const chartByDay = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      const key = format(e.data, "dd/MM");
      map.set(key, (map.get(key) || 0) + e.valorDesconto);
    });
    return Array.from(map.entries()).map(([dia, valor]) => ({ dia, valor: Math.round(valor * 100) / 100 }));
  }, [filtered]);

  const exportData = filtered.map(e => ({
    data: format(e.data, "dd/MM/yyyy HH:mm"),
    cupomNumero: e.cupomNumero,
    operador: e.operador || "-",
    tipo: e.tipo === "item" ? "Por Item" : "Geral",
    descricao: e.descricao,
    percentual: e.percentual.toFixed(2) + "%",
    valorDesconto: e.valorDesconto.toFixed(2),
    valorOriginal: e.valorOriginal.toFixed(2),
    liberacao: e.liberacaoGerencial ? "Sim" : "Não",
    autorizadoPor: e.autorizadoPor || "-",
  }));

  return (
    <div className="page-container">
      <PageHeader
        title="Relatório de Descontos"
        description="Análise detalhada de descontos concedidos nas vendas"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <DollarSign size={14} /> Total em Descontos
            </div>
            <p className="text-2xl font-bold font-mono text-destructive">{formatBRL(totalDescontos)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Tag size={14} /> Qtd. Descontos
            </div>
            <p className="text-2xl font-bold font-mono">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Percent size={14} /> Média %
            </div>
            <p className="text-2xl font-bold font-mono">{percentualMedio.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <ShieldAlert size={14} /> Liberações Gerenciais
            </div>
            <p className="text-2xl font-bold font-mono text-primary">{countLiberacoes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2 text-sm", !dataInicio && "text-muted-foreground")}>
              <CalendarIcon size={14} />
              {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataInicio} onSelect={d => d && setDataInicio(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground text-sm">até</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2 text-sm", !dataFim && "text-muted-foreground")}>
              <CalendarIcon size={14} />
              {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataFim} onSelect={d => d && setDataFim(d)} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Select value={tipoFiltro} onValueChange={v => setTipoFiltro(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="item">Por Item</SelectItem>
            <SelectItem value="geral">Geral da Venda</SelectItem>
          </SelectContent>
        </Select>

        <Select value={liberacaoFiltro} onValueChange={v => setLiberacaoFiltro(v as any)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas liberações</SelectItem>
            <SelectItem value="sim">Com liberação</SelectItem>
            <SelectItem value="nao">Sem liberação</SelectItem>
          </SelectContent>
        </Select>

        <Select value={operadorFiltro} onValueChange={setOperadorFiltro}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos operadores</SelectItem>
            {operadoresUnicos.map(op => (
              <SelectItem key={op} value={op}>{op}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <ExportButtons options={{ data: exportData, columns: exportColumns, filename: "relatorio-descontos", title: "Relatório de Descontos" }} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Descontos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {chartByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="valor" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Desconto" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {chartByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chartByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${formatBRL(value)}`}>
                    {chartByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cupom</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">% Desc.</TableHead>
              <TableHead className="text-right">Valor Desc.</TableHead>
              <TableHead className="text-right">Valor Original</TableHead>
              <TableHead>Liberação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhum desconto encontrado no período
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs font-mono">{format(e.data, "dd/MM/yy HH:mm")}</TableCell>
                  <TableCell className="font-mono text-xs">{e.cupomNumero}</TableCell>
                  <TableCell className="text-xs">{e.operador || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.tipo === "geral" ? "default" : "secondary"} className="text-[10px]">
                      {e.tipo === "item" ? "Item" : "Geral"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.descricao}</TableCell>
                  <TableCell className="text-right font-mono text-destructive font-bold">{e.percentual.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{formatBRL(e.valorDesconto)}</TableCell>
                  <TableCell className="text-right font-mono">{formatBRL(e.valorOriginal)}</TableCell>
                  <TableCell>
                    {e.liberacaoGerencial ? (
                      <Badge variant="outline" className="gap-1 text-[10px] border-primary text-primary">
                        <ShieldAlert size={10} /> {e.autorizadoPor || "Sim"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-mono font-bold text-destructive">{formatBRL(totalDescontos)}</TableCell>
                <TableCell className="text-right font-mono font-bold">{formatBRL(totalOriginal)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
