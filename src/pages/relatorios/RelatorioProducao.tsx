import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportButtons } from "@/components/ExportButtons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyBRL } from "@/components/ui/currency-input";
import {
  Factory, TrendingDown, TrendingUp, DollarSign, Package,
  Search, CheckCircle2, Clock, XCircle, BarChart3, Activity, Printer, Settings2, AlertTriangle
} from "lucide-react";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  Area, AreaChart, ReferenceLine
} from "recharts";

interface OrdemProducao {
  id: string;
  numero: string;
  produtoId: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
  status: "rascunho" | "aguardando" | "em_producao" | "finalizada" | "cancelada";
  insumos: { produtoId: string; produtoDescricao: string; quantidadeNecessaria: number; unidade: string; custoUnitario: number; estoqueDisponivel: number }[];
  custoTotal: number;
  observacoes: string;
  dataCriacao: string;
  dataInicio?: string;
  dataFinalizacao?: string;
  percentualPerda: number;
  quantidadeReal?: number;
  perdaReal?: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  aguardando: { label: "Aguardando", color: "bg-amber-500/20 text-amber-600" },
  em_producao: { label: "Em Produção", color: "bg-blue-500/20 text-blue-600" },
  finalizada: { label: "Finalizada", color: "bg-emerald-500/20 text-emerald-600" },
  cancelada: { label: "Cancelada", color: "bg-destructive/20 text-destructive" },
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

function getOrdens(): OrdemProducao[] {
  try {
    const stored = localStorage.getItem("ordens_producao");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
}

export default function RelatorioProducao() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [periodoFilter, setPeriodoFilter] = useState("todos");
  const [metaLeadTime, setMetaLeadTime] = useState<number>(() => {
    try { return Number(localStorage.getItem("meta_lead_time") || "3"); } catch { return 3; }
  });
  const [metasPorProduto, setMetasPorProduto] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("metas_lead_time_produto") || "{}"); } catch { return {}; }
  });
  const [showMetaConfig, setShowMetaConfig] = useState(false);
  const [editandoMetaProduto, setEditandoMetaProduto] = useState<string | null>(null);
  const [comparPeriodo1, setComparPeriodo1] = useState("");
  const [comparPeriodo2, setComparPeriodo2] = useState("");

  const allOrdens = useMemo(() => getOrdens(), []);

  // Filter
  const filtered = useMemo(() => {
    return allOrdens.filter(o => {
      const matchSearch = o.produtoDescricao.toLowerCase().includes(search.toLowerCase()) ||
        o.numero.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || o.status === statusFilter;
      let matchPeriodo = true;
      if (periodoFilter !== "todos") {
        const mesRef = o.dataFinalizacao || o.dataCriacao;
        matchPeriodo = mesRef?.startsWith(periodoFilter) ?? false;
      }
      return matchSearch && matchStatus && matchPeriodo;
    });
  }, [allOrdens, search, statusFilter, periodoFilter]);

  const finalizadas = allOrdens.filter(o => o.status === "finalizada");

  // ── KPIs ──
  const totalOrdens = allOrdens.length;
  const totalFinalizadas = finalizadas.length;
  const custoAcumulado = finalizadas.reduce((acc, o) => acc + o.custoTotal, 0);
  const qtdTotalProduzida = finalizadas.reduce((acc, o) => acc + (o.quantidadeReal ?? o.quantidade), 0);
  const perdasReais = finalizadas.filter(o => o.perdaReal != null && o.perdaReal > 0);
  const perdaMedia = perdasReais.length > 0
    ? perdasReais.reduce((acc, o) => acc + (o.perdaReal ?? 0), 0) / perdasReais.length
    : 0;
  const rendimentoMedio = 100 - perdaMedia;
  const custoUnitarioMedio = qtdTotalProduzida > 0 ? custoAcumulado / qtdTotalProduzida : 0;

  // ── Evolução mensal ──
  const last6 = getLast6Months();
  const evolucaoMensal = last6.map(ym => {
    const ordensDoMes = finalizadas.filter(o => (o.dataFinalizacao || o.dataCriacao)?.startsWith(ym));
    const custoMes = ordensDoMes.reduce((a, o) => a + o.custoTotal, 0);
    const qtdMes = ordensDoMes.reduce((a, o) => a + (o.quantidadeReal ?? o.quantidade), 0);
    const perdasMes = ordensDoMes.filter(o => o.perdaReal != null);
    const perdaMediaMes = perdasMes.length > 0
      ? perdasMes.reduce((a, o) => a + (o.perdaReal ?? 0), 0) / perdasMes.length
      : 0;
    return {
      mes: monthLabel(ym),
      ordens: ordensDoMes.length,
      custo: custoMes,
      quantidade: qtdMes,
      perda: Number(perdaMediaMes.toFixed(2)),
    };
  });

  // ── Status distribution ──
  const statusDist = [
    { name: "Finalizadas", value: allOrdens.filter(o => o.status === "finalizada").length },
    { name: "Em Produção", value: allOrdens.filter(o => o.status === "em_producao").length },
    { name: "Aguardando", value: allOrdens.filter(o => o.status === "aguardando").length },
    { name: "Rascunho", value: allOrdens.filter(o => o.status === "rascunho").length },
    { name: "Canceladas", value: allOrdens.filter(o => o.status === "cancelada").length },
  ].filter(d => d.value > 0);

  // ── Top produtos ──
  const topProdutos = useMemo(() => {
    const map = new Map<string, { descricao: string; qtd: number; custo: number; ordens: number }>();
    finalizadas.forEach(o => {
      const cur = map.get(o.produtoId) || { descricao: o.produtoDescricao, qtd: 0, custo: 0, ordens: 0 };
      cur.qtd += o.quantidadeReal ?? o.quantidade;
      cur.custo += o.custoTotal;
      cur.ordens += 1;
      map.set(o.produtoId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [finalizadas]);

  // ── Lead time por produto ──
  const leadTimePorProduto = useMemo(() => {
    const map = new Map<string, { id: string; descricao: string; dias: number[]; }>();
    finalizadas.forEach(o => {
      if (!o.dataInicio || !o.dataFinalizacao) return;
      const dias = Math.max(1, Math.round((new Date(o.dataFinalizacao).getTime() - new Date(o.dataInicio).getTime()) / (1000 * 60 * 60 * 24)));
      const cur = map.get(o.produtoId) || { id: o.produtoId, descricao: o.produtoDescricao, dias: [] };
      cur.dias.push(dias);
      map.set(o.produtoId, cur);
    });
    return Array.from(map.values())
      .map(p => ({
        produtoId: p.id,
        produto: p.descricao.length > 18 ? p.descricao.slice(0, 18) + "…" : p.descricao,
        produtoFull: p.descricao,
        media: Number((p.dias.reduce((a, d) => a + d, 0) / p.dias.length).toFixed(1)),
        min: Math.min(...p.dias),
        max: Math.max(...p.dias),
        ordens: p.dias.length,
        meta: metasPorProduto[p.id] ?? metaLeadTime,
      }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 8);
  }, [finalizadas, metaLeadTime, metasPorProduto]);

  // ── Helper: salvar meta individual ──
  const salvarMetaProduto = (produtoId: string, valor: number) => {
    const novas = { ...metasPorProduto, [produtoId]: valor };
    setMetasPorProduto(novas);
    localStorage.setItem("metas_lead_time_produto", JSON.stringify(novas));
  };
  const limparMetaProduto = (produtoId: string) => {
    const novas = { ...metasPorProduto };
    delete novas[produtoId];
    setMetasPorProduto(novas);
    localStorage.setItem("metas_lead_time_produto", JSON.stringify(novas));
  };

  // ── Alerta: produtos acima da meta por 3+ meses consecutivos ──
  const produtosAlertaConsecutivo = useMemo(() => {
    const meses = getLast6Months();
    const porProdutoMes = new Map<string, { id: string; meses: Map<string, number[]> }>();
    finalizadas.forEach(o => {
      if (!o.dataInicio || !o.dataFinalizacao) return;
      const mes = o.dataFinalizacao.slice(0, 7);
      const dias = Math.max(1, Math.round((new Date(o.dataFinalizacao).getTime() - new Date(o.dataInicio).getTime()) / (1000 * 60 * 60 * 24)));
      if (!porProdutoMes.has(o.produtoDescricao)) porProdutoMes.set(o.produtoDescricao, { id: o.produtoId, meses: new Map() });
      const pm = porProdutoMes.get(o.produtoDescricao)!;
      if (!pm.meses.has(mes)) pm.meses.set(mes, []);
      pm.meses.get(mes)!.push(dias);
    });
    const alertas: { produto: string; mesesConsecutivos: number }[] = [];
    porProdutoMes.forEach(({ id, meses: mesesMap }, produto) => {
      const metaProd = metasPorProduto[id] ?? metaLeadTime;
      let consecutivos = 0;
      let maxConsec = 0;
      for (const mes of meses) {
        const dias = mesesMap.get(mes);
        if (dias) {
          const media = dias.reduce((a, d) => a + d, 0) / dias.length;
          if (media > metaProd) { consecutivos++; maxConsec = Math.max(maxConsec, consecutivos); }
          else consecutivos = 0;
        } else {
          consecutivos = 0;
        }
      }
      if (maxConsec >= 3) alertas.push({ produto, mesesConsecutivos: maxConsec });
    });
    return alertas;
  }, [finalizadas, metaLeadTime, metasPorProduto]);

  useEffect(() => {
    if (produtosAlertaConsecutivo.length === 0) return;
    const shown = sessionStorage.getItem("lead_time_alert_shown");
    if (shown) return;
    sessionStorage.setItem("lead_time_alert_shown", "1");
    produtosAlertaConsecutivo.forEach(a => {
      toast.warning(`⚠️ ${a.produto}`, {
        description: `Lead time acima da meta por ${a.mesesConsecutivos} meses consecutivos`,
        duration: 8000,
      });
    });
  }, [produtosAlertaConsecutivo]);

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    allOrdens.forEach(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      if (ref) set.add(ref.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [allOrdens]);

  // ── Comparativo de lead time entre períodos ──
  const comparativoLeadTime = useMemo(() => {
    if (!comparPeriodo1 || !comparPeriodo2) return null;
    const calcPeriodo = (mes: string) => {
      const map = new Map<string, { descricao: string; dias: number[] }>();
      finalizadas.forEach(o => {
        if (!o.dataInicio || !o.dataFinalizacao) return;
        if (o.dataFinalizacao.slice(0, 7) !== mes) return;
        const dias = Math.max(1, Math.round((new Date(o.dataFinalizacao).getTime() - new Date(o.dataInicio).getTime()) / (1000 * 60 * 60 * 24)));
        const cur = map.get(o.produtoId) || { descricao: o.produtoDescricao, dias: [] };
        cur.dias.push(dias);
        map.set(o.produtoId, cur);
      });
      return map;
    };
    const p1 = calcPeriodo(comparPeriodo1);
    const p2 = calcPeriodo(comparPeriodo2);
    const allIds = new Set([...p1.keys(), ...p2.keys()]);
    const result: { produto: string; periodo1: number | null; periodo2: number | null; diff: number | null }[] = [];
    allIds.forEach(id => {
      const d1 = p1.get(id);
      const d2 = p2.get(id);
      const m1 = d1 ? Number((d1.dias.reduce((a, d) => a + d, 0) / d1.dias.length).toFixed(1)) : null;
      const m2 = d2 ? Number((d2.dias.reduce((a, d) => a + d, 0) / d2.dias.length).toFixed(1)) : null;
      const desc = (d1?.descricao || d2?.descricao || id);
      result.push({
        produto: desc.length > 20 ? desc.slice(0, 20) + "…" : desc,
        periodo1: m1,
        periodo2: m2,
        diff: m1 != null && m2 != null ? Number((m2 - m1).toFixed(1)) : null,
      });
    });
    return result.sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0));
  }, [finalizadas, comparPeriodo1, comparPeriodo2]);

  const handlePrint = () => {
    // KPIs section
    const kpis = `
      <div class="info-grid">
        <div class="info-box"><div class="label">Total Ordens</div><div class="value">${totalOrdens}</div></div>
        <div class="info-box"><div class="label">Finalizadas</div><div class="value">${totalFinalizadas}</div></div>
        <div class="info-box"><div class="label">Custo Acumulado</div><div class="value">${printCurrency(custoAcumulado)}</div></div>
        <div class="info-box"><div class="label">Qtd Produzida</div><div class="value">${qtdTotalProduzida.toFixed(0)}</div></div>
        <div class="info-box"><div class="label">Rendimento Médio</div><div class="value ${rendimentoMedio >= 95 ? "positive" : rendimentoMedio >= 85 ? "" : "negative"}">${rendimentoMedio.toFixed(1)}%</div></div>
        <div class="info-box"><div class="label">Custo Unit. Médio</div><div class="value">${printCurrency(custoUnitarioMedio)}</div></div>
      </div>
    `;

    // Top produtos
    let topSection = "";
    if (topProdutos.length > 0) {
      const topTable = buildPrintTable(
        [{ label: "Produto" }, { label: "Qtd Produzida", align: "right" }, { label: "Ordens", align: "right" }, { label: "Custo Total", align: "right" }],
        topProdutos.map(p => ({ cells: [p.descricao, p.qtd.toFixed(0), String(p.ordens), printCurrency(p.custo)] }))
      );
      topSection = `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:600;">Top Produtos Produzidos</h3>${topTable}`;
    }

    // Histórico
    const historicoTable = buildPrintTable(
      [
        { label: "Número" }, { label: "Produto" },
        { label: "Qtd Plan.", align: "right" }, { label: "Qtd Real", align: "right" },
        { label: "Perda %", align: "right" }, { label: "Custo Total", align: "right" },
        { label: "Custo Unit.", align: "right" }, { label: "Status" }, { label: "Data" },
      ],
      filtered.map(op => {
        const qtdReal = op.quantidadeReal ?? op.quantidade;
        const custoUnit = qtdReal > 0 ? op.custoTotal / qtdReal : 0;
        const st = statusConfig[op.status] || statusConfig.rascunho;
        return {
          cells: [
            op.numero, op.produtoDescricao,
            `${op.quantidade} ${op.unidade}`,
            op.quantidadeReal != null ? `${op.quantidadeReal} ${op.unidade}` : "—",
            op.perdaReal != null ? `${op.perdaReal}%` : "—",
            printCurrency(op.custoTotal), printCurrency(custoUnit),
            st.label, op.dataFinalizacao || op.dataCriacao || "",
          ],
        };
      })
    );

    // Total row
    const totalCustoFiltered = filtered.reduce((a, o) => a + o.custoTotal, 0);
    const totalRow = `<p style="text-align:right;font-weight:700;margin-top:8px;">Total: ${printCurrency(totalCustoFiltered)} (${filtered.length} ordens)</p>`;

    printPDF({
      title: "Relatório de Produção",
      subtitle: `Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${filtered.length} ordens`,
      content: kpis + topSection + `<h3 style="margin:20px 0 8px;font-size:13px;font-weight:600;">Histórico de Ordens</h3>` + historicoTable + totalRow,
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Relatório de Produção"
        description="Análise de custos, rendimento e evolução das ordens de produção"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={16} className="mr-2" />Imprimir PDF
            </Button>
            <ExportButtons options={{
              title: "Relatório de Produção",
              filename: `RelatorioProducao_${new Date().toISOString().split("T")[0]}`,
              columns: [
                { header: "Número", key: "numero" },
                { header: "Produto", key: "produtoDescricao" },
                { header: "Qtd Planejada", key: "quantidade", align: "right" },
                { header: "Qtd Real", key: "quantidadeReal", align: "right" },
                { header: "Perda %", key: "perdaReal", align: "right" },
                { header: "Custo Total", key: "custoTotal", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                { header: "Status", key: "status" },
                { header: "Data", key: "dataFinalizacao" },
              ],
              data: filtered,
            }} thermal />
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Factory size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Total Ordens</p>
          </div>
          <p className="text-2xl font-bold">{totalOrdens}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{totalFinalizadas}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Custo Acumulado</p>
          </div>
          <p className="text-lg font-bold">{formatCurrencyBRL(custoAcumulado)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package size={14} className="text-blue-600" />
            <p className="text-xs text-muted-foreground">Qtd Produzida</p>
          </div>
          <p className="text-2xl font-bold">{qtdTotalProduzida.toFixed(0)}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-600" />
            <p className="text-xs text-muted-foreground">Rendimento Médio</p>
          </div>
          <p className={`text-2xl font-bold ${rendimentoMedio >= 95 ? "text-emerald-600" : rendimentoMedio >= 85 ? "text-amber-600" : "text-destructive"}`}>
            {rendimentoMedio.toFixed(1)}%
          </p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Custo Unit. Médio</p>
          </div>
          <p className="text-lg font-bold">{formatCurrencyBRL(custoUnitarioMedio)}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Evolução de Custos */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <DollarSign size={14} className="text-primary" />Evolução de Custos (6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrencyBRL(v)} />
                <Area type="monotone" dataKey="custo" name="Custo" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução de Perdas */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-destructive" />Evolução de Perdas % (6 meses)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} domain={[0, "auto"]} unit="%" />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Line type="monotone" dataKey="perda" name="Perda Média" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produção Mensal */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <BarChart3 size={14} className="text-primary" />Produção Mensal (Ordens Finalizadas)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="ordens" name="Ordens" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="quantidade" name="Qtd Produzida" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribuição de Status */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <Factory size={14} className="text-primary" />Distribuição por Status
            </h3>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Lead Time por Produto */}
        {leadTimePorProduto.length > 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5">
                  <Clock size={14} className="text-primary" />Lead Time Médio por Produto (dias)
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                    const excedidos = leadTimePorProduto.filter(p => p.media > p.meta);
                    const rows = leadTimePorProduto.map(p => ({
                      cells: [
                        p.produto,
                        `${p.media}d`,
                        `${p.min}d`,
                        `${p.max}d`,
                        `${p.meta}d`,
                        `${p.ordens}`,
                        p.media > p.meta ? "⚠️ ACIMA" : "✅ OK",
                      ],
                    }));
                    const tabela = buildPrintTable(
                      [{ label: "Produto" }, { label: "Média", align: "right" as const }, { label: "Mín", align: "right" as const }, { label: "Máx", align: "right" as const }, { label: "Meta", align: "right" as const }, { label: "OPs", align: "right" as const }, { label: "Status" }],
                      rows
                    );
                    const alertasHtml = excedidos.length > 0
                      ? `<div style="margin-top:12px;padding:10px;border:1px solid #e53e3e;border-radius:6px;background:#fff5f5">
                          <p style="font-size:12px;font-weight:600;color:#e53e3e;margin:0 0 6px">⚠️ ${excedidos.length} produto${excedidos.length > 1 ? "s" : ""} acima da meta individual:</p>
                          ${excedidos.map(p => `<p style="font-size:11px;color:#c53030;margin:2px 0"><b>${p.produto}</b> — média ${p.media}d / meta ${p.meta}d</p>`).join("")}
                        </div>`
                      : "";
                    const consecutivosHtml = produtosAlertaConsecutivo.length > 0
                      ? `<div style="margin-top:10px;padding:10px;border:1px solid #e53e3e;border-radius:6px;background:#fff5f5">
                          <p style="font-size:12px;font-weight:600;color:#e53e3e;margin:0 0 6px">🔴 Alerta Recorrente (3+ meses consecutivos):</p>
                          ${produtosAlertaConsecutivo.map(a => `<p style="font-size:11px;color:#c53030;margin:2px 0"><b>${a.produto}</b> — ${a.mesesConsecutivos} meses acima da meta</p>`).join("")}
                        </div>`
                      : "";
                    printPDF({
                      title: "Lead Time por Produto",
                      subtitle: `Meta padrão: ${metaLeadTime}d — Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
                      content: tabela + alertasHtml + consecutivosHtml,
                    });
                  }}>
                    <Printer size={12} /> PDF
                  </Button>
                  {showMetaConfig ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Padrão:</span>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={metaLeadTime}
                        onChange={e => {
                          const v = Number(e.target.value);
                          if (v > 0) { setMetaLeadTime(v); localStorage.setItem("meta_lead_time", String(v)); }
                        }}
                        className="w-16 h-7 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">dias</span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowMetaConfig(false)}>OK</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowMetaConfig(true)}>
                      <Settings2 size={12} /> Padrão: {metaLeadTime}d
                    </Button>
                  )}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={leadTimePorProduto} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                  <YAxis dataKey="produto" type="category" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border border-border rounded-md p-2 shadow-md text-xs">
                        <p className="font-medium mb-1">{d.produtoFull || d.produto}</p>
                        <p>Média: <b>{d.media}d</b> | Meta: <b>{d.meta}d</b></p>
                        <p>Mín: {d.min}d | Máx: {d.max}d</p>
                        <p className="text-muted-foreground">{d.ordens} ordens</p>
                        {d.media > d.meta && <p className="text-destructive font-semibold mt-1">⚠️ Acima da meta</p>}
                      </div>
                    );
                  }} />
                  <ReferenceLine x={metaLeadTime} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeWidth={1} label={{ value: `Padrão ${metaLeadTime}d`, position: "top", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <Bar dataKey="meta" name="meta" fill="none" stroke="hsl(var(--destructive))" strokeDasharray="4 2" barSize={16} radius={[0, 4, 4, 0]} opacity={0.4} />
                  <Bar dataKey="media" name="media" radius={[0, 4, 4, 0]} barSize={16}>
                    {leadTimePorProduto.map((entry, idx) => (
                      <Cell key={idx} fill={entry.media > entry.meta ? "hsl(var(--destructive))" : CHART_COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Metas individuais por produto */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Meta individual por produto (clique para editar)</p>
                <div className="flex flex-wrap gap-1.5">
                  {leadTimePorProduto.map((p, i) => {
                    const isCustom = p.produtoId in metasPorProduto;
                    const isEditing = editandoMetaProduto === p.produtoId;
                    return (
                      <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border cursor-pointer transition-colors ${
                        p.media > p.meta
                          ? "bg-destructive/10 border-destructive/20 text-destructive"
                          : isCustom
                            ? "bg-primary/10 border-primary/20 text-primary"
                            : "bg-muted/30 border-border text-foreground"
                      }`}>
                        {isEditing ? (
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            defaultValue={p.meta}
                            autoFocus
                            className="w-12 h-5 text-[11px] p-0.5"
                            onBlur={e => {
                              const v = Number(e.target.value);
                              if (v > 0) salvarMetaProduto(p.produtoId, v);
                              setEditandoMetaProduto(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditandoMetaProduto(null);
                            }}
                          />
                        ) : (
                          <span onClick={() => setEditandoMetaProduto(p.produtoId)} className="flex items-center gap-1">
                            {p.produto}: <b>{p.meta}d</b>
                            {isCustom && (
                              <button
                                className="ml-0.5 text-muted-foreground hover:text-destructive"
                                onClick={e => { e.stopPropagation(); limparMetaProduto(p.produtoId); }}
                                title="Usar meta padrão"
                              >×</button>
                            )}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
              {/* Alertas de produtos acima da meta */}
              {(() => {
                const excedidos = leadTimePorProduto.filter(p => p.media > p.meta);
                if (excedidos.length === 0) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[10px] text-destructive uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                      <AlertTriangle size={12} /> {excedidos.length} produto{excedidos.length > 1 ? "s" : ""} acima da meta
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {excedidos.map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium border border-destructive/20">
                          {p.produto} — {p.media}d (meta {p.meta}d)
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Alerta de produtos com lead time acima da meta por 3+ meses consecutivos */}
              {produtosAlertaConsecutivo.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle size={14} /> Atenção: Lead time recorrente acima da meta
                  </p>
                  <div className="space-y-1">
                    {produtosAlertaConsecutivo.map((a, i) => (
                      <p key={i} className="text-[11px] text-destructive/80">
                        <span className="font-medium">{a.produto}</span> — acima da meta por <span className="font-bold">{a.mesesConsecutivos} meses</span> consecutivos
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Comparativo de Lead Time entre Períodos */}
      {mesesDisponiveis.length >= 2 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <TrendingUp size={14} className="text-primary" /> Comparativo de Lead Time entre Períodos
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Período 1:</span>
                <Select value={comparPeriodo1} onValueChange={setComparPeriodo1}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {mesesDisponiveis.map(m => (
                      <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-muted-foreground text-xs">vs</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Período 2:</span>
                <Select value={comparPeriodo2} onValueChange={setComparPeriodo2}>
                  <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {mesesDisponiveis.map(m => (
                      <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {comparativoLeadTime && comparativoLeadTime.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(180, comparativoLeadTime.length * 36)}>
                  <BarChart data={comparativoLeadTime} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit="d" />
                    <YAxis dataKey="produto" type="category" tick={{ fontSize: 10 }} width={140} />
                    <Tooltip formatter={(v: number | null, name: string) => [v != null ? `${v} dias` : "—", name === "periodo1" ? monthLabel(comparPeriodo1) : monthLabel(comparPeriodo2)]} />
                    <Legend formatter={(value: string) => value === "periodo1" ? monthLabel(comparPeriodo1) : monthLabel(comparPeriodo2)} />
                    <Bar dataKey="periodo1" name="periodo1" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="periodo2" name="periodo2" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Variação de lead time</p>
                  <div className="flex flex-wrap gap-1.5">
                    {comparativoLeadTime.filter(p => p.diff != null).map((p, i) => (
                      <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        p.diff! > 0 ? "bg-destructive/10 text-destructive border-destructive/20" :
                        p.diff! < 0 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        "bg-muted/30 text-muted-foreground border-border"
                      }`}>
                        {p.diff! > 0 ? "▲" : p.diff! < 0 ? "▼" : "—"} {p.produto}: {p.diff! > 0 ? "+" : ""}{p.diff}d
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : comparPeriodo1 && comparPeriodo2 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ordem finalizada nos períodos selecionados</p>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Selecione dois períodos para comparar</p>
            )}
          </CardContent>
        </Card>
      )}

      {topProdutos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">🏆 Top Produtos Produzidos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {topProdutos.map((p, i) => (
                <Card key={i} className="p-3 text-center">
                  <p className="text-xs text-muted-foreground truncate">{p.descricao}</p>
                  <p className="text-lg font-bold">{p.qtd.toFixed(0)} un</p>
                  <p className="text-xs text-muted-foreground">{p.ordens} ordem(ns) • {formatCurrencyBRL(p.custo)}</p>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <h3 className="text-sm font-medium mb-3">Histórico de Ordens</h3>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por número ou produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="finalizada">Finalizada</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Meses</SelectItem>
                {mesesDisponiveis.map(m => (
                  <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd Plan.</TableHead>
                  <TableHead className="text-right">Qtd Real</TableHead>
                  <TableHead className="text-right">Perda %</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(op => {
                  const st = statusConfig[op.status] || statusConfig.rascunho;
                  const qtdReal = op.quantidadeReal ?? op.quantidade;
                  const custoUnit = qtdReal > 0 ? op.custoTotal / qtdReal : 0;
                  return (
                    <TableRow key={op.id}>
                      <TableCell className="font-mono font-medium">{op.numero}</TableCell>
                      <TableCell className="truncate max-w-[180px]">{op.produtoDescricao}</TableCell>
                      <TableCell className="text-right font-mono">{op.quantidade} {op.unidade}</TableCell>
                      <TableCell className="text-right font-mono">
                        {op.quantidadeReal != null ? `${op.quantidadeReal} ${op.unidade}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {op.perdaReal != null ? (
                          <span className={op.perdaReal > 10 ? "text-destructive font-bold" : op.perdaReal > 5 ? "text-amber-600 font-medium" : "text-emerald-600"}>
                            {op.perdaReal}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrencyBRL(op.custoTotal)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrencyBRL(custoUnit)}</TableCell>
                      <TableCell>
                        <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{op.dataFinalizacao || op.dataCriacao}</TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma ordem encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
