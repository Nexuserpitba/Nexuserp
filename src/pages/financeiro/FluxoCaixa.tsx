import { CurrencyInput } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CalendarDays, BarChart3, Wallet, AlertTriangle, CheckCircle, PieChart
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart as RechartsPie, Pie, Cell
} from "recharts";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  status: string;
  valorPago?: number;
  dataPagamento?: string;
}

interface ContaFinanceira {
  id: string;
  parcelas: Parcela[];
  fornecedor?: string;
  cliente?: string;
  categoria?: string;
  status?: string;
}

function getStoredData<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

const CORES = {
  receita: "hsl(142, 72%, 42%)",
  despesa: "hsl(0, 84%, 60%)",
  saldo: "hsl(217, 91%, 50%)",
  projecao: "hsl(38, 92%, 50%)",
};

const PIE_COLORS = [
  "hsl(217, 91%, 50%)", "hsl(142, 72%, 42%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(280, 60%, 55%)", "hsl(190, 80%, 45%)",
  "hsl(340, 75%, 55%)", "hsl(160, 60%, 40%)",
];

export default function FluxoCaixa() {
  const [periodo, setPeriodo] = useState<"diario" | "semanal" | "mensal">("diario");
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [editandoSaldo, setEditandoSaldo] = useState(false);
  const [saldoTemp, setSaldoTemp] = useState("0");

  // Carregar dados
  const contasPagar = useMemo(() => getStoredData<ContaFinanceira>("contas_pagar"), []);
  const contasReceber = useMemo(() => getStoredData<ContaFinanceira>("contas_receber"), []);

  // Extrair movimentações
  const movimentacoes = useMemo(() => {
    const movs: { data: string; tipo: "receita" | "despesa"; valor: number; descricao: string; categoria: string; status: "realizado" | "previsto" }[] = [];

    contasReceber.forEach((cr) => {
      cr.parcelas?.forEach((p) => {
        const realizado = p.status === "recebida" || p.status === "paga";
        const data = realizado && p.dataPagamento ? p.dataPagamento : p.vencimento;
        movs.push({
          data,
          tipo: "receita",
          valor: realizado ? (p.valorPago || p.valor) : p.valor,
          descricao: cr.cliente || "Receita",
          categoria: cr.categoria || "Vendas",
          status: realizado ? "realizado" : "previsto",
        });
      });
    });

    contasPagar.forEach((cp) => {
      cp.parcelas?.forEach((p) => {
        const realizado = p.status === "paga" || p.status === "recebida";
        const data = realizado && p.dataPagamento ? p.dataPagamento : p.vencimento;
        movs.push({
          data,
          tipo: "despesa",
          valor: realizado ? (p.valorPago || p.valor) : p.valor,
          descricao: cp.fornecedor || "Despesa",
          categoria: cp.categoria || "Fornecedores",
          status: realizado ? "realizado" : "previsto",
        });
      });
    });

    return movs.sort((a, b) => a.data.localeCompare(b.data));
  }, [contasPagar, contasReceber]);

  // Filtrar por período
  const movsFiltradas = useMemo(() => {
    return movimentacoes.filter(m => m.data >= dataInicio && m.data <= dataFim);
  }, [movimentacoes, dataInicio, dataFim]);

  // Dados do gráfico por dia
  const dadosGrafico = useMemo(() => {
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    const dias = eachDayOfInterval({ start, end });
    let saldoAcumulado = saldoInicial;

    return dias.map(dia => {
      const diaStr = format(dia, "yyyy-MM-dd");
      const movsNoDia = movsFiltradas.filter(m => m.data === diaStr);
      const receitas = movsNoDia.filter(m => m.tipo === "receita").reduce((s, m) => s + m.valor, 0);
      const despesas = movsNoDia.filter(m => m.tipo === "despesa").reduce((s, m) => s + m.valor, 0);
      saldoAcumulado += receitas - despesas;

      const label = periodo === "diario"
        ? format(dia, "dd/MM", { locale: ptBR })
        : periodo === "semanal"
        ? `Sem ${format(dia, "dd/MM")}`
        : format(dia, "MMM/yy", { locale: ptBR });

      return { data: label, dataISO: diaStr, receitas, despesas, saldo: saldoAcumulado };
    });
  }, [movsFiltradas, saldoInicial, dataInicio, dataFim, periodo]);

  // Agrupar por semana ou mês se necessário
  const dadosAgrupados = useMemo(() => {
    if (periodo === "diario") return dadosGrafico;

    const grupos: Record<string, { data: string; receitas: number; despesas: number; saldo: number }> = {};

    dadosGrafico.forEach(d => {
      const dia = parseISO(d.dataISO);
      let chave: string;
      if (periodo === "semanal") {
        const inicio = startOfWeek(dia, { weekStartsOn: 1 });
        chave = format(inicio, "dd/MM");
      } else {
        chave = format(dia, "MMM/yy", { locale: ptBR });
      }
      if (!grupos[chave]) {
        grupos[chave] = { data: chave, receitas: 0, despesas: 0, saldo: d.saldo };
      }
      grupos[chave].receitas += d.receitas;
      grupos[chave].despesas += d.despesas;
      grupos[chave].saldo = d.saldo;
    });

    return Object.values(grupos);
  }, [dadosGrafico, periodo]);

  // Totais
  const totalReceitas = movsFiltradas.filter(m => m.tipo === "receita").reduce((s, m) => s + m.valor, 0);
  const totalDespesas = movsFiltradas.filter(m => m.tipo === "despesa").reduce((s, m) => s + m.valor, 0);
  const receitasRealizadas = movsFiltradas.filter(m => m.tipo === "receita" && m.status === "realizado").reduce((s, m) => s + m.valor, 0);
  const despesasRealizadas = movsFiltradas.filter(m => m.tipo === "despesa" && m.status === "realizado").reduce((s, m) => s + m.valor, 0);
  const receitasPrevistas = movsFiltradas.filter(m => m.tipo === "receita" && m.status === "previsto").reduce((s, m) => s + m.valor, 0);
  const despesasPrevistas = movsFiltradas.filter(m => m.tipo === "despesa" && m.status === "previsto").reduce((s, m) => s + m.valor, 0);
  const saldoFinal = saldoInicial + totalReceitas - totalDespesas;
  const saldoRealizado = saldoInicial + receitasRealizadas - despesasRealizadas;

  // Categorias para gráfico de pizza
  const categoriasDespesa = useMemo(() => {
    const cats: Record<string, number> = {};
    movsFiltradas.filter(m => m.tipo === "despesa").forEach(m => {
      cats[m.categoria] = (cats[m.categoria] || 0) + m.valor;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [movsFiltradas]);

  const categoriasReceita = useMemo(() => {
    const cats: Record<string, number> = {};
    movsFiltradas.filter(m => m.tipo === "receita").forEach(m => {
      cats[m.categoria] = (cats[m.categoria] || 0) + m.valor;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [movsFiltradas]);

  // Movimentações para tabela detalhada
  const movsTabela = useMemo(() => {
    return [...movsFiltradas].sort((a, b) => a.data.localeCompare(b.data));
  }, [movsFiltradas]);

  const hoje = format(new Date(), "yyyy-MM-dd");

  function formatVal(v: number) {
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  return (
    <div className="page-container max-w-7xl mx-auto">
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão consolidada de entradas, saídas e projeção financeira"
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saldo Inicial</Label>
              {editandoSaldo ? (
                <div className="flex gap-1">
                  <CurrencyInput value={parseFloat(saldoTemp) || 0} onValueChange={v => setSaldoTemp(String(v))} className="w-32" />
                  <Button size="sm" onClick={() => { setSaldoInicial(Number(saldoTemp)); setEditandoSaldo(false); }}>OK</Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-40 justify-start" onClick={() => { setSaldoTemp(String(saldoInicial)); setEditandoSaldo(true); }}>
                  <Wallet size={14} className="mr-1" /> R$ {formatVal(saldoInicial)}
                </Button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(format(new Date(), "yyyy-MM-dd")); setDataFim(format(addDays(new Date(), 7), "yyyy-MM-dd")); }}>7 dias</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(format(new Date(), "yyyy-MM-dd")); setDataFim(format(addDays(new Date(), 30), "yyyy-MM-dd")); }}>30 dias</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd")); setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd")); }}>Mês Atual</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(format(new Date(), "yyyy-MM-dd")); setDataFim(format(addDays(new Date(), 90), "yyyy-MM-dd")); }}>90 dias</Button>
              <ExportButtons options={{
                title: "Fluxo de Caixa",
                subtitle: `Período: ${new Date(dataInicio).toLocaleDateString("pt-BR")} a ${new Date(dataFim).toLocaleDateString("pt-BR")}`,
                filename: `Fluxo_Caixa_${dataInicio}_${dataFim}`,
                columns: [
                  { header: "Data", key: "data", format: (v: string) => new Date(v).toLocaleDateString("pt-BR") },
                  { header: "Tipo", key: "tipo", format: (v: string) => v === "receita" ? "Receita" : "Despesa" },
                  { header: "Descrição", key: "descricao" },
                  { header: "Categoria", key: "categoria" },
                  { header: "Valor", key: "valor", align: "right", format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                  { header: "Status", key: "status", format: (v: string) => v === "realizado" ? "Realizado" : "Previsto" },
                ],
                data: movsTabela,
                summaryRows: [
                  { label: "Total Receitas", value: `R$ ${totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                  { label: "Total Despesas", value: `R$ ${totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                  { label: "Saldo Final", value: `R$ ${saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                ],
              }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Wallet className="text-primary" size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Atual</p>
              <p className={`text-lg font-bold ${saldoRealizado >= 0 ? "text-foreground" : "text-destructive"}`}>R$ {formatVal(saldoRealizado)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="text-accent" size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Projetado</p>
              <p className={`text-lg font-bold ${saldoFinal >= 0 ? "text-foreground" : "text-destructive"}`}>R$ {formatVal(saldoFinal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsla(142,72%,42%,0.1)" }}><ArrowUpRight style={{ color: CORES.receita }} size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Receitas</p>
              <p className="text-lg font-bold text-foreground">R$ {formatVal(totalReceitas)}</p>
              <p className="text-[9px] text-muted-foreground">Realizado: R$ {formatVal(receitasRealizadas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><ArrowDownRight className="text-destructive" size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Despesas</p>
              <p className="text-lg font-bold text-foreground">R$ {formatVal(totalDespesas)}</p>
              <p className="text-[9px] text-muted-foreground">Realizado: R$ {formatVal(despesasRealizadas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsla(38,92%,50%,0.1)" }}><CalendarDays style={{ color: CORES.projecao }} size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">A Receber</p>
              <p className="text-lg font-bold text-foreground">R$ {formatVal(receitasPrevistas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="text-destructive" size={18} /></div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">A Pagar</p>
              <p className="text-lg font-bold text-foreground">R$ {formatVal(despesasPrevistas)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="grafico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grafico" className="gap-1"><BarChart3 size={14} /> Gráfico</TabsTrigger>
          <TabsTrigger value="extrato" className="gap-1"><CalendarDays size={14} /> Extrato</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1"><PieChart size={14} /> Categorias</TabsTrigger>
        </TabsList>

        {/* GRÁFICO */}
        <TabsContent value="grafico">
          <Card>
            <CardHeader><CardTitle className="text-base">Evolução do Fluxo de Caixa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={dadosAgrupados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`R$ ${formatVal(value)}`, name === "receitas" ? "Receitas" : name === "despesas" ? "Despesas" : "Saldo"]}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Legend formatter={v => v === "receitas" ? "Receitas" : v === "despesas" ? "Despesas" : "Saldo Acumulado"} />
                  <Area type="monotone" dataKey="receitas" stroke={CORES.receita} fill={CORES.receita} fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="despesas" stroke={CORES.despesa} fill={CORES.despesa} fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="saldo" stroke={CORES.saldo} fill={CORES.saldo} fillOpacity={0.08} strokeWidth={2.5} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Barras comparativo */}
          <Card className="mt-4">
            <CardHeader><CardTitle className="text-base">Receitas vs Despesas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dadosAgrupados}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 89%)" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => `R$ ${formatVal(value)}`} />
                  <Legend formatter={v => v === "receitas" ? "Receitas" : "Despesas"} />
                  <Bar dataKey="receitas" fill={CORES.receita} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill={CORES.despesa} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXTRATO */}
        <TabsContent value="extrato">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movsTabela.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma movimentação no período</TableCell></TableRow>
                  )}
                  {movsTabela.map((m, i) => (
                    <TableRow key={i} className={m.status === "previsto" ? "opacity-70" : ""}>
                      <TableCell className="text-sm">{m.data.split("-").reverse().join("/")}</TableCell>
                      <TableCell>
                        {m.tipo === "receita"
                          ? <Badge variant="default" className="bg-accent text-accent-foreground text-xs gap-1"><ArrowUpRight size={10} /> Receita</Badge>
                          : <Badge variant="destructive" className="text-xs gap-1"><ArrowDownRight size={10} /> Despesa</Badge>
                        }
                      </TableCell>
                      <TableCell className="font-medium">{m.descricao}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.categoria}</Badge></TableCell>
                      <TableCell className={`text-right font-bold ${m.tipo === "receita" ? "text-accent" : "text-destructive"}`}>
                        {m.tipo === "receita" ? "+" : "-"} R$ {formatVal(m.valor)}
                      </TableCell>
                      <TableCell>
                        {m.status === "realizado"
                          ? <Badge variant="secondary" className="text-xs gap-1"><CheckCircle size={10} /> Realizado</Badge>
                          : <Badge variant="outline" className="text-xs gap-1"><CalendarDays size={10} /> Previsto</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo do extrato */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Card className="border-l-4" style={{ borderLeftColor: CORES.receita }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Entradas</p>
                <p className="text-xl font-bold text-foreground">R$ {formatVal(totalReceitas)}</p>
                <p className="text-xs text-muted-foreground">{movsFiltradas.filter(m => m.tipo === "receita").length} lançamentos</p>
              </CardContent>
            </Card>
            <Card className="border-l-4" style={{ borderLeftColor: CORES.despesa }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Saídas</p>
                <p className="text-xl font-bold text-foreground">R$ {formatVal(totalDespesas)}</p>
                <p className="text-xs text-muted-foreground">{movsFiltradas.filter(m => m.tipo === "despesa").length} lançamentos</p>
              </CardContent>
            </Card>
            <Card className="border-l-4" style={{ borderLeftColor: CORES.saldo }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Resultado do Período</p>
                <p className={`text-xl font-bold ${(totalReceitas - totalDespesas) >= 0 ? "text-foreground" : "text-destructive"}`}>
                  R$ {formatVal(totalReceitas - totalDespesas)}
                </p>
                <p className="text-xs text-muted-foreground">{(totalReceitas - totalDespesas) >= 0 ? "Superávit" : "Déficit"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CATEGORIAS */}
        <TabsContent value="categorias">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowDownRight size={16} className="text-destructive" /> Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {categoriasDespesa.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem despesas no período</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={categoriasDespesa} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoriasDespesa.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `R$ ${formatVal(v)}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {categoriasDespesa.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span>{c.name}</span>
                          </div>
                          <span className="font-medium">R$ {formatVal(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowUpRight size={16} className="text-accent" /> Receitas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {categoriasReceita.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem receitas no período</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPie>
                        <Pie data={categoriasReceita} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoriasReceita.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => `R$ ${formatVal(v)}`} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {categoriasReceita.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span>{c.name}</span>
                          </div>
                          <span className="font-medium">R$ {formatVal(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
