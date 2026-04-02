import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import {
  Factory, Package, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, ArrowRight, XCircle, Play, Gauge, Settings2, ArrowUpDown, Printer, FlaskConical
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend, ReferenceLine
} from "recharts";
import { printPDF, buildPrintTable } from "@/lib/printUtils";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 160 60% 45%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 65% 60%))",
  "hsl(var(--chart-5, 340 75% 55%))",
];

interface OrdemProducao {
  id: string;
  numero: string;
  produtoId: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
  status: "rascunho" | "aguardando" | "em_producao" | "finalizada" | "cancelada";
  custoTotal: number;
  dataCriacao: string;
  dataInicio?: string;
  dataFinalizacao?: string;
  percentualPerda: number;
  quantidadeReal?: number;
  perdaReal?: number;
  checklistQualidade?: { item: string; ok: boolean }[];
  lote?: string;
}

function getOrdens(): OrdemProducao[] {
  try {
    const stored = localStorage.getItem("ordens_producao");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function seedTestOrdens() {
  const checklistItems = [
    "Dimensões dentro da tolerância",
    "Acabamento superficial",
    "Peso conforme especificação",
    "Embalagem adequada",
    "Cor/aparência visual",
    "Teste funcional aprovado",
  ];
  const produtos = [
    { id: "p1", desc: "Parafuso M8x50", un: "un" },
    { id: "p2", desc: "Arruela Lisa 3/8", un: "un" },
    { id: "p3", desc: "Porca Sextavada M10", un: "un" },
    { id: "p4", desc: "Barra Roscada 1/2x1m", un: "un" },
    { id: "p5", desc: "Chapa Aço 2mm", un: "m²" },
  ];
  const now = new Date();
  const ordens: OrdemProducao[] = [];
  let num = 1000;
  for (let m = 5; m >= 0; m--) {
    const mesDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const ym = `${mesDate.getFullYear()}-${String(mesDate.getMonth() + 1).padStart(2, "0")}`;
    const opsCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < opsCount; i++) {
      const prod = produtos[Math.floor(Math.random() * produtos.length)];
      const qty = 50 + Math.floor(Math.random() * 200);
      const qtyReal = Math.max(1, qty - Math.floor(Math.random() * qty * 0.15));
      const perdaReal = Number(((1 - qtyReal / qty) * 100).toFixed(1));
      const day = 1 + Math.floor(Math.random() * 27);
      const dataInicio = `${ym}-${String(day).padStart(2, "0")}`;
      const leadDays = 1 + Math.floor(Math.random() * 5);
      const endDate = new Date(mesDate.getFullYear(), mesDate.getMonth(), day + leadDays);
      const dataFin = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      const checklist = checklistItems.map(item => ({
        item,
        ok: Math.random() > 0.25,
      }));
      num++;
      ordens.push({
        id: `seed-${num}`,
        numero: `OP-${num}`,
        produtoId: prod.id,
        produtoDescricao: prod.desc,
        quantidade: qty,
        unidade: prod.un,
        status: "finalizada",
        custoTotal: qty * (2 + Math.random() * 8),
        dataCriacao: dataInicio,
        dataInicio,
        dataFinalizacao: dataFin,
        percentualPerda: perdaReal,
        quantidadeReal: qtyReal,
        perdaReal,
        checklistQualidade: checklist,
        lote: `L${ym.replace("-", "")}${String(i + 1).padStart(2, "0")}`,
      });
    }
  }
  // Add a couple em_producao and aguardando
  const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  ordens.push({
    id: "seed-ep1", numero: "OP-2001", produtoId: "p1", produtoDescricao: "Parafuso M8x50",
    quantidade: 100, unidade: "un", status: "em_producao", custoTotal: 450,
    dataCriacao: `${curYm}-05`, dataInicio: `${curYm}-06`, percentualPerda: 0,
    checklistQualidade: [],
  });
  ordens.push({
    id: "seed-ag1", numero: "OP-2002", produtoId: "p3", produtoDescricao: "Porca Sextavada M10",
    quantidade: 200, unidade: "un", status: "aguardando", custoTotal: 300,
    dataCriacao: `${curYm}-02`, percentualPerda: 0,
    checklistQualidade: [],
  });
  localStorage.setItem("ordens_producao", JSON.stringify(ordens));
  return ordens.length;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`;
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

function calcOEEForOrdens(ops: OrdemProducao[]) {
  const fin = ops.filter(o => o.status === "finalizada");
  const noCanceladas = ops.filter(o => o.status !== "cancelada");
  if (fin.length === 0) return { disponibilidade: 0, desempenho: 0, qualidade: 0, oee: 0, finalizadas: 0, total: ops.length };
  const disp = noCanceladas.length > 0 ? (fin.length / noCanceladas.length) * 100 : 0;
  const qtdPlan = fin.reduce((a, o) => a + o.quantidade, 0);
  const qtdReal = fin.reduce((a, o) => a + (o.quantidadeReal ?? o.quantidade), 0);
  const desemp = qtdPlan > 0 ? Math.min(100, (qtdReal / qtdPlan) * 100) : 0;
  const opsQ = ops.filter(o => o.checklistQualidade && o.checklistQualidade.length > 0);
  const totalQ = opsQ.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
  const aprovQ = opsQ.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
  const qual = totalQ > 0 ? (aprovQ / totalQ) * 100 : 100;
  const oeeVal = (disp / 100) * (desemp / 100) * (qual / 100) * 100;
  return {
    disponibilidade: Number(disp.toFixed(1)),
    desempenho: Number(desemp.toFixed(1)),
    qualidade: Number(qual.toFixed(1)),
    oee: Number(oeeVal.toFixed(1)),
    finalizadas: fin.length,
    total: ops.length,
  };
}

export default function DashboardProducao() {
  const navigate = useNavigate();
  const [seedKey, setSeedKey] = useState(0);
  const allOrdens = useMemo(() => getOrdens(), [seedKey]);
  const [periodoFilter, setPeriodoFilter] = useState("todos");
  const [metaOEE, setMetaOEE] = useState(() => {
    try { return Number(localStorage.getItem("meta_oee") || "85"); } catch { return 85; }
  });
  const [comparPeriodoA, setComparPeriodoA] = useState("");
  const [comparPeriodoB, setComparPeriodoB] = useState("");
  const [drillDownProduto, setDrillDownProduto] = useState<string | null>(null);
  const handleMetaOEEChange = (val: number) => {
    const v = Math.max(0, Math.min(100, val));
    setMetaOEE(v);
    localStorage.setItem("meta_oee", String(v));
  };

  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    allOrdens.forEach(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      if (ref) set.add(ref.slice(0, 7));
    });
    return Array.from(set).sort().reverse();
  }, [allOrdens]);

  // Comparativo OEE entre períodos
  const allMesesOrdenados = useMemo(() => {
    const set = new Set<string>();
    allOrdens.forEach(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      if (ref) set.add(ref.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [allOrdens]);

  const comparData = useMemo(() => {
    if (!comparPeriodoA || !comparPeriodoB) return null;
    const opsA = allOrdens.filter(o => (o.dataFinalizacao || o.dataCriacao)?.slice(0, 7) === comparPeriodoA);
    const opsB = allOrdens.filter(o => (o.dataFinalizacao || o.dataCriacao)?.slice(0, 7) === comparPeriodoB);
    return { a: calcOEEForOrdens(opsA), b: calcOEEForOrdens(opsB) };
  }, [allOrdens, comparPeriodoA, comparPeriodoB]);

  const handleExportComparativo = useCallback(() => {
    if (!comparData) return;
    const labelA = monthLabel(comparPeriodoA);
    const labelB = monthLabel(comparPeriodoB);
    const indicators = [
      { label: "OEE", a: comparData.a.oee, b: comparData.b.oee },
      { label: "Disponibilidade", a: comparData.a.disponibilidade, b: comparData.b.disponibilidade },
      { label: "Desempenho", a: comparData.a.desempenho, b: comparData.b.desempenho },
      { label: "Qualidade", a: comparData.a.qualidade, b: comparData.b.qualidade },
    ];
    const table = buildPrintTable(
      [{ label: "Indicador" }, { label: labelA, align: "center" }, { label: labelB, align: "center" }, { label: "Variação", align: "center" }],
      indicators.map(ind => {
        const diff = ind.b - ind.a;
        const diffClass = diff > 0 ? "positive" : diff < 0 ? "negative" : "";
        return { cells: [ind.label, `${ind.a}%`, `${ind.b}%`, `<span class="${diffClass}">${diff > 0 ? "+" : ""}${diff.toFixed(1)}pp</span>`] };
      })
    );
    const summaryHtml = `
      <div class="info-grid">
        <div class="info-box"><div class="label">OPs Finalizadas (${labelA})</div><div class="value">${comparData.a.finalizadas} / ${comparData.a.total}</div></div>
        <div class="info-box"><div class="label">OPs Finalizadas (${labelB})</div><div class="value">${comparData.b.finalizadas} / ${comparData.b.total}</div></div>
        <div class="info-box"><div class="label">OEE ${labelA}</div><div class="value" style="color:${comparData.a.oee >= 85 ? '#16a34a' : comparData.a.oee >= 60 ? '#ca8a04' : '#dc2626'}">${comparData.a.oee}%</div></div>
        <div class="info-box"><div class="label">OEE ${labelB}</div><div class="value" style="color:${comparData.b.oee >= 85 ? '#16a34a' : comparData.b.oee >= 60 ? '#ca8a04' : '#dc2626'}">${comparData.b.oee}%</div></div>
      </div>`;
    const barChartHtml = `
      <h3 style="font-size:13px;margin:20px 0 12px;font-weight:600;">Comparativo Visual</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
        ${indicators.map(ind => {
          const hA = Math.round((ind.a / 100) * 120);
          const hB = Math.round((ind.b / 100) * 120);
          return `<div style="text-align:center;"><div style="display:flex;align-items:flex-end;justify-content:center;gap:6px;height:140px;"><div style="width:28px;background:#3b82f6;border-radius:4px 4px 0 0;height:${hA}px;"></div><div style="width:28px;background:#f59e0b;border-radius:4px 4px 0 0;height:${hB}px;"></div></div><div style="font-size:10px;margin-top:4px;font-weight:600;">${ind.label}</div><div style="font-size:9px;color:#888;">${ind.a}% → ${ind.b}%</div></div>`;
        }).join("")}
      </div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:10px;color:#666;"><span>■ <span style="color:#3b82f6">${labelA}</span></span><span>■ <span style="color:#f59e0b">${labelB}</span></span></div>`;
    printPDF({ title: "Comparativo de OEE", subtitle: `${labelA} vs ${labelB}`, content: summaryHtml + table + barChartHtml });
  }, [comparData, comparPeriodoA, comparPeriodoB]);

  const ordens = useMemo(() => {
    if (periodoFilter === "todos") return allOrdens;
    return allOrdens.filter(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      return ref?.slice(0, 7) === periodoFilter;
    });
  }, [allOrdens, periodoFilter]);

  const total = ordens.length;
  const finalizadas = ordens.filter(o => o.status === "finalizada");
  const emProducao = ordens.filter(o => o.status === "em_producao");
  const aguardando = ordens.filter(o => o.status === "aguardando");
  const canceladas = ordens.filter(o => o.status === "cancelada");

  // KPIs
  const custoTotal = finalizadas.reduce((a, o) => a + o.custoTotal, 0);
  const qtdProduzida = finalizadas.reduce((a, o) => a + (o.quantidadeReal ?? o.quantidade), 0);
  const perdaMedia = finalizadas.length > 0
    ? finalizadas.reduce((a, o) => a + (o.perdaReal ?? 0), 0) / finalizadas.length
    : 0;

  // Lead time médio
  const leadTimes = finalizadas
    .filter(o => o.dataInicio && o.dataFinalizacao)
    .map(o => Math.max(1, Math.round((new Date(o.dataFinalizacao!).getTime() - new Date(o.dataInicio!).getTime()) / (1000 * 60 * 60 * 24))));
  const leadTimeMedia = leadTimes.length > 0 ? (leadTimes.reduce((a, d) => a + d, 0) / leadTimes.length).toFixed(1) : "—";

  // Qualidade
  const opsComChecklist = ordens.filter(o => o.checklistQualidade && o.checklistQualidade.length > 0);
  const totalItensQ = opsComChecklist.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
  const totalAprovadosQ = opsComChecklist.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
  const taxaQualidade = totalItensQ > 0 ? ((totalAprovadosQ / totalItensQ) * 100).toFixed(1) : "—";

  // OEE (Overall Equipment Effectiveness) = Disponibilidade × Desempenho × Qualidade
  const oee = useMemo(() => {
    if (finalizadas.length === 0) return null;
    // Disponibilidade: % de OPs que foram efetivamente iniciadas e finalizadas vs total criadas
    const totalCriadas = ordens.filter(o => o.status !== "cancelada").length;
    const disponibilidade = totalCriadas > 0 ? (finalizadas.length / totalCriadas) * 100 : 0;

    // Desempenho: % de quantidade real produzida vs quantidade planejada
    const qtdPlanejada = finalizadas.reduce((a, o) => a + o.quantidade, 0);
    const qtdReal = finalizadas.reduce((a, o) => a + (o.quantidadeReal ?? o.quantidade), 0);
    const desempenho = qtdPlanejada > 0 ? Math.min(100, (qtdReal / qtdPlanejada) * 100) : 0;

    // Qualidade: taxa de aprovação no checklist (ou 100% se sem checklist)
    const qualidade = totalItensQ > 0 ? (totalAprovadosQ / totalItensQ) * 100 : 100;

    const oeeVal = (disponibilidade / 100) * (desempenho / 100) * (qualidade / 100) * 100;

    return {
      disponibilidade: Number(disponibilidade.toFixed(1)),
      desempenho: Number(desempenho.toFixed(1)),
      qualidade: Number(qualidade.toFixed(1)),
      oee: Number(oeeVal.toFixed(1)),
    };
  }, [finalizadas, ordens, totalItensQ, totalAprovadosQ]);

  // Status distribution
  const statusData = [
    { name: "Finalizada", value: finalizadas.length, color: "hsl(142, 71%, 45%)" },
    { name: "Em Produção", value: emProducao.length, color: "hsl(217, 91%, 60%)" },
    { name: "Aguardando", value: aguardando.length, color: "hsl(45, 93%, 47%)" },
    { name: "Cancelada", value: canceladas.length, color: "hsl(0, 84%, 60%)" },
  ].filter(s => s.value > 0);

  // Evolução mensal
  const meses = getLast6Months();
  const evolucaoMensal = meses.map(mes => {
    const doMes = allOrdens.filter(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      return ref?.slice(0, 7) === mes;
    });
    const fin = doMes.filter(o => o.status === "finalizada");
    return {
      mes: monthLabel(mes),
      total: doMes.length,
      finalizadas: fin.length,
      custo: fin.reduce((a, o) => a + o.custoTotal, 0),
    };
  });

  // OEE mensal
  const oeeHistorico = meses.map(mes => {
    const doMes = allOrdens.filter(o => {
      const ref = o.dataFinalizacao || o.dataCriacao;
      return ref?.slice(0, 7) === mes;
    });
    const fin = doMes.filter(o => o.status === "finalizada");
    const noCanceladas = doMes.filter(o => o.status !== "cancelada");

    const disp = noCanceladas.length > 0 ? (fin.length / noCanceladas.length) * 100 : 0;
    const qtdPlan = fin.reduce((a, o) => a + o.quantidade, 0);
    const qtdReal = fin.reduce((a, o) => a + (o.quantidadeReal ?? o.quantidade), 0);
    const desemp = qtdPlan > 0 ? Math.min(100, (qtdReal / qtdPlan) * 100) : 0;

    const opsQ = doMes.filter(o => o.checklistQualidade && o.checklistQualidade.length > 0);
    const totalQ = opsQ.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
    const aprovQ = opsQ.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
    const qual = totalQ > 0 ? (aprovQ / totalQ) * 100 : 100;

    const oeeVal = fin.length > 0 ? (disp / 100) * (desemp / 100) * (qual / 100) * 100 : 0;

    return {
      mes: monthLabel(mes),
      disponibilidade: Number(disp.toFixed(1)),
      desempenho: Number(desemp.toFixed(1)),
      qualidade: Number(qual.toFixed(1)),
      oee: Number(oeeVal.toFixed(1)),
    };
  });

  // Top produtos
  const produtoMap = new Map<string, { desc: string; qtd: number; ordens: number }>();
  finalizadas.forEach(o => {
    const cur = produtoMap.get(o.produtoId) || { desc: o.produtoDescricao, qtd: 0, ordens: 0 };
    cur.qtd += o.quantidadeReal ?? o.quantidade;
    cur.ordens++;
    produtoMap.set(o.produtoId, cur);
  });
  const topProdutos = Array.from(produtoMap.values())
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5);

  // Alertas
  const metaLeadTime = (() => { try { return Number(localStorage.getItem("meta_lead_time") || "3"); } catch { return 3; } })();
  const produtosAcimaLT = (() => {
    const map = new Map<string, number[]>();
    finalizadas.forEach(o => {
      if (!o.dataInicio || !o.dataFinalizacao) return;
      const dias = Math.max(1, Math.round((new Date(o.dataFinalizacao).getTime() - new Date(o.dataInicio).getTime()) / (1000 * 60 * 60 * 24)));
      const cur = map.get(o.produtoDescricao) || [];
      cur.push(dias);
      map.set(o.produtoDescricao, cur);
    });
    return Array.from(map.entries())
      .map(([p, dias]) => ({ produto: p, media: dias.reduce((a, d) => a + d, 0) / dias.length }))
      .filter(p => p.media > metaLeadTime);
  })();

  // Alerta OEE abaixo da meta por 2+ meses consecutivos
  const oeeAlertaConsecutivo = useMemo(() => {
    const recentes = oeeHistorico.filter(m => m.oee > 0);
    if (recentes.length < 2) return null;
    let consecutivos = 0;
    const mesesAbaixo: string[] = [];
    for (let i = recentes.length - 1; i >= 0; i--) {
      if (recentes[i].oee < metaOEE) {
        consecutivos++;
        mesesAbaixo.unshift(recentes[i].mes);
      } else break;
    }
    return consecutivos >= 2 ? { count: consecutivos, meses: mesesAbaixo, valores: recentes.slice(-consecutivos).map(m => m.oee) } : null;
  }, [oeeHistorico, metaOEE]);

  // Curva ABC de perdas por produto
  const curvaABCPerdas = useMemo(() => {
    const map = new Map<string, { desc: string; perdaTotal: number; ordens: number }>();
    finalizadas.forEach(o => {
      if (!o.perdaReal || o.perdaReal <= 0) return;
      const cur = map.get(o.produtoId) || { desc: o.produtoDescricao, perdaTotal: 0, ordens: 0 };
      cur.perdaTotal += o.perdaReal;
      cur.ordens++;
      map.set(o.produtoId, cur);
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.perdaTotal - a.perdaTotal);
    const totalPerda = sorted.reduce((a, p) => a + p.perdaTotal, 0);
    if (totalPerda === 0) return [];
    let acum = 0;
    return sorted.map(p => {
      acum += p.perdaTotal;
      const pctItem = (p.perdaTotal / totalPerda) * 100;
      const pctAcum = (acum / totalPerda) * 100;
      const classe = pctAcum <= 80 ? "A" : pctAcum <= 95 ? "B" : "C";
      return { ...p, pctItem: Number(pctItem.toFixed(1)), pctAcum: Number(pctAcum.toFixed(1)), classe };
    });
  }, [finalizadas]);

  // Tendência de perdas nos últimos 3 meses
  const tendenciaPerdas = useMemo(() => {
    const ultimos3 = meses.slice(-3);
    const dados = ultimos3.map(mes => {
      const doMes = allOrdens.filter(o => {
        const ref = o.dataFinalizacao || o.dataCriacao;
        return ref?.slice(0, 7) === mes && o.status === "finalizada";
      });
      const comPerda = doMes.filter(o => (o.perdaReal ?? 0) > 0);
      const perdaMediaMes = doMes.length > 0
        ? doMes.reduce((a, o) => a + (o.perdaReal ?? 0), 0) / doMes.length
        : 0;
      return { mes: monthLabel(mes), perdaMedia: Number(perdaMediaMes.toFixed(1)), opsComPerda: comPerda.length, totalOps: doMes.length };
    });
    const valores = dados.map(d => d.perdaMedia).filter(v => v > 0);
    let tendencia: "subindo" | "descendo" | "estavel" = "estavel";
    if (valores.length >= 2) {
      const diff = valores[valores.length - 1] - valores[0];
      if (diff > 0.5) tendencia = "subindo";
      else if (diff < -0.5) tendencia = "descendo";
    }
    return { dados, tendencia };
  }, [allOrdens, meses]);

  // Painel de Qualidade: ranking de falhas e tendência mensal
  const qualidadePainel = useMemo(() => {
    const opsComCheck = allOrdens.filter(o => o.checklistQualidade && o.checklistQualidade.length > 0);
    if (opsComCheck.length === 0) return null;

    // Ranking de falhas
    const falhaMap = new Map<string, number>();
    opsComCheck.forEach(o => {
      o.checklistQualidade?.filter(c => !c.ok).forEach(c => {
        falhaMap.set(c.item, (falhaMap.get(c.item) || 0) + 1);
      });
    });
    const rankingFalhas = Array.from(falhaMap.entries())
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count);

    // Total checks
    const totalChecks = opsComCheck.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
    const totalAprovados = opsComCheck.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
    const taxaGeral = totalChecks > 0 ? Number(((totalAprovados / totalChecks) * 100).toFixed(1)) : 0;

    // Tendência mensal de qualidade
    const tendenciaMensal = meses.map(mes => {
      const doMes = allOrdens.filter(o => {
        const ref = o.dataFinalizacao || o.dataCriacao;
        return ref?.slice(0, 7) === mes && o.checklistQualidade && o.checklistQualidade.length > 0;
      });
      const tChecks = doMes.reduce((a, o) => a + (o.checklistQualidade?.length || 0), 0);
      const tAprov = doMes.reduce((a, o) => a + (o.checklistQualidade?.filter(c => c.ok).length || 0), 0);
      return {
        mes: monthLabel(mes),
        taxa: tChecks > 0 ? Number(((tAprov / tChecks) * 100).toFixed(1)) : 0,
        falhas: tChecks - tAprov,
        total: tChecks,
      };
    });

    return { rankingFalhas, taxaGeral, totalChecks, totalAprovados, tendenciaMensal };
  }, [allOrdens, meses]);

  const kpis = [
    { label: "Total OPs", value: total, icon: Factory, color: "text-primary" },
    { label: "Em Produção", value: emProducao.length, icon: Play, color: "text-blue-500" },
    { label: "Finalizadas", value: finalizadas.length, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Custo Total", value: formatCurrencyBRL(custoTotal), icon: Package, color: "text-primary" },
    { label: "Qtd Produzida", value: `${qtdProduzida.toFixed(0)} un`, icon: Package, color: "text-primary" },
    { label: "Lead Time Médio", value: leadTimeMedia !== "—" ? `${leadTimeMedia}d` : "—", icon: Clock, color: "text-amber-500" },
    { label: "Perda Média", value: `${perdaMedia.toFixed(1)}%`, icon: perdaMedia > 5 ? TrendingDown : TrendingUp, color: perdaMedia > 5 ? "text-destructive" : "text-emerald-500" },
    { label: "Qualidade", value: taxaQualidade !== "—" ? `${taxaQualidade}%` : "—", icon: CheckCircle2, color: Number(taxaQualidade) >= 90 ? "text-emerald-500" : "text-amber-500" },
  ];

  return (
    <div className="page-container animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <PageHeader
          title="Dashboard de Produção"
          description="Visão consolidada de todos os indicadores de produção"
        />
        <div className="flex items-center gap-2">
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Meses</SelectItem>
              {mesesDisponiveis.map(m => (
                <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButtons options={{
            title: "Dashboard de Produção",
            filename: "dashboard-producao",
            columns: [
              { header: "Indicador", key: "indicador" },
              { header: "Valor", key: "valor" },
            ],
            data: kpis.map(k => ({ indicador: k.label, valor: String(k.value) })),
            summaryRows: [
              { label: "OEE", value: oee ? `${oee.oee}% (Disp: ${oee.disponibilidade}% | Desemp: ${oee.desempenho}% | Qual: ${oee.qualidade}%)` : "—" },
              { label: "Top Produtos", value: topProdutos.map(p => `${p.desc} (${p.qtd.toFixed(0)} un)`).join(", ") || "—" },
              { label: "Alertas", value: `${emProducao.length} em produção, ${produtosAcimaLT.length} acima do lead time` },
            ],
          }} />
          <Button variant="outline" size="sm" onClick={() => {
            const count = seedTestOrdens();
            setSeedKey(k => k + 1);
            toast.success(`${count} ordens de produção de teste criadas com checklist de qualidade!`);
          }} className="gap-1.5">
            <FlaskConical size={14} /> Gerar Dados de Teste
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/relatorios/producao")} className="gap-1.5">
            <BarChart3 size={14} /> Relatório Completo <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <kpi.icon size={18} className={`mx-auto mb-1 ${kpi.color}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-lg font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* OEE */}
      {oee && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-1.5">
              <Gauge size={14} className="text-primary" /> OEE — Overall Equipment Effectiveness
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* OEE Principal */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-28 h-28">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={oee.oee >= 85 ? "hsl(142, 71%, 45%)" : oee.oee >= 60 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)"}
                      strokeWidth="8"
                      strokeDasharray={`${(oee.oee / 100) * 263.9} 263.9`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${oee.oee >= 85 ? "text-emerald-600" : oee.oee >= 60 ? "text-amber-600" : "text-destructive"}`}>
                      {oee.oee}%
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase">OEE</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {oee.oee >= 85 ? "World Class" : oee.oee >= 60 ? "Típico" : "Baixo"}
                </p>
              </div>
              {/* Sub-indicadores */}
              {[
                { label: "Disponibilidade", value: oee.disponibilidade, desc: "OPs finalizadas vs criadas" },
                { label: "Desempenho", value: oee.desempenho, desc: "Qtd real vs planejada" },
                { label: "Qualidade", value: oee.qualidade, desc: "Aprovação no checklist" },
              ].map((ind, i) => (
                <div key={i} className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{ind.label}</p>
                  <div className="w-full bg-muted rounded-full h-2 mb-1.5">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ind.value)}%`,
                        backgroundColor: ind.value >= 90 ? "hsl(142, 71%, 45%)" : ind.value >= 70 ? "hsl(45, 93%, 47%)" : "hsl(0, 84%, 60%)",
                      }}
                    />
                  </div>
                  <p className={`text-xl font-bold ${ind.value >= 90 ? "text-emerald-600" : ind.value >= 70 ? "text-amber-600" : "text-destructive"}`}>
                    {ind.value}%
                  </p>
                  <p className="text-[9px] text-muted-foreground text-center">{ind.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Distribuição por Status</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="total" name="Total" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="finalizadas" name="Finalizadas" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Produtos */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">🏆 Top Produtos Produzidos</h3>
            {topProdutos.length > 0 ? (
              <div className="space-y-2">
                {topProdutos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      <span className="text-sm truncate max-w-[200px]">{p.desc}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{p.qtd.toFixed(0)} un</p>
                      <p className="text-[10px] text-muted-foreground">{p.ordens} OPs</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-destructive" /> Alertas e Atenção
            </h3>
            <div className="space-y-2">
              {emProducao.length > 0 && (
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <p className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                    <Play size={12} /> {emProducao.length} ordem(ns) em produção
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {emProducao.slice(0, 3).map(o => (
                      <p key={o.id} className="text-[11px] text-blue-600/80">
                        {o.numero} — {o.produtoDescricao}
                      </p>
                    ))}
                    {emProducao.length > 3 && <p className="text-[11px] text-blue-600/60">+{emProducao.length - 3} mais</p>}
                  </div>
                </div>
              )}

              {produtosAcimaLT.length > 0 && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <Clock size={12} /> {produtosAcimaLT.length} produto(s) acima da meta de lead time ({metaLeadTime}d)
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {produtosAcimaLT.map((p, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px] h-5">
                        {p.produto.length > 20 ? p.produto.slice(0, 20) + "…" : p.produto}: {p.media.toFixed(1)}d
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {Number(taxaQualidade) > 0 && Number(taxaQualidade) < 90 && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                    <XCircle size={12} /> Taxa de qualidade em {taxaQualidade}% (abaixo de 90%)
                  </p>
                </div>
              )}

              {perdaMedia > 5 && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <TrendingDown size={12} /> Perda média elevada: {perdaMedia.toFixed(1)}%
                  </p>
                </div>
              )}

              {oeeAlertaConsecutivo && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                    <Gauge size={12} /> OEE abaixo da meta ({metaOEE}%) por {oeeAlertaConsecutivo.count} meses consecutivos
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {oeeAlertaConsecutivo.meses.map((m, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px] h-5">
                        {m}: {oeeAlertaConsecutivo.valores[i]}%
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {emProducao.length === 0 && produtosAcimaLT.length === 0 && perdaMedia <= 5 && !oeeAlertaConsecutivo && (Number(taxaQualidade) >= 90 || taxaQualidade === "—") && (
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Todos os indicadores estão dentro dos parâmetros
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custo mensal */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">Evolução de Custos de Produção</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatCurrencyBRL(v), "Custo"]} />
              <Line type="monotone" dataKey="custo" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tendência de Perdas - Últimos 3 Meses */}
      {tendenciaPerdas.dados.some(d => d.totalOps > 0) && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
              {tendenciaPerdas.tendencia === "subindo" ? (
                <TrendingUp size={14} className="text-destructive" />
              ) : tendenciaPerdas.tendencia === "descendo" ? (
                <TrendingDown size={14} className="text-emerald-500" />
              ) : (
                <ArrowRight size={14} className="text-muted-foreground" />
              )}
              Tendência de Perdas — Últimos 3 Meses
              <Badge
                variant={tendenciaPerdas.tendencia === "subindo" ? "destructive" : tendenciaPerdas.tendencia === "descendo" ? "default" : "secondary"}
                className="text-[10px] h-5 ml-2"
              >
                {tendenciaPerdas.tendencia === "subindo" ? "↑ Aumentando" : tendenciaPerdas.tendencia === "descendo" ? "↓ Reduzindo" : "→ Estável"}
              </Badge>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={tendenciaPerdas.dados}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number, name: string) => [`${v}%`, name === "perdaMedia" ? "Perda Média" : name]} />
                  <Bar dataKey="perdaMedia" name="Perda Média" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2">
                {tendenciaPerdas.dados.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">{d.mes}</p>
                    <p className={`text-xl font-bold ${d.perdaMedia > 5 ? "text-destructive" : d.perdaMedia > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {d.perdaMedia}%
                    </p>
                    <p className="text-[9px] text-muted-foreground">{d.opsComPerda}/{d.totalOps} OPs c/ perda</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Painel de Qualidade Consolidado */}
      {qualidadePainel && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-primary" /> Painel de Qualidade Consolidado
              </h3>
              <div className="flex items-center gap-2">
                <ExportButtons options={{
                  title: "Painel de Qualidade Consolidado",
                  filename: "painel-qualidade",
                  columns: [
                    { header: "Posição", key: "pos" },
                    { header: "Item de Falha", key: "item" },
                    { header: "Ocorrências", key: "count" },
                    { header: "% do Total de Falhas", key: "pct" },
                  ],
                  data: qualidadePainel.rankingFalhas.map((f, i) => ({
                    pos: `${i + 1}º`,
                    item: f.item,
                    count: String(f.count),
                    pct: `${((f.count / Math.max(1, qualidadePainel.totalChecks - qualidadePainel.totalAprovados)) * 100).toFixed(1)}%`,
                  })),
                  summaryRows: [
                    { label: "Taxa de Aprovação Geral", value: `${qualidadePainel.taxaGeral}%` },
                    { label: "Total de Verificações", value: String(qualidadePainel.totalChecks) },
                    { label: "Aprovados", value: String(qualidadePainel.totalAprovados) },
                    { label: "Falhas Totais", value: String(qualidadePainel.totalChecks - qualidadePainel.totalAprovados) },
                    { label: "Itens Distintos com Falha", value: String(qualidadePainel.rankingFalhas.length) },
                  ],
                }} />
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => {
                  const totalFalhas = qualidadePainel.totalChecks - qualidadePainel.totalAprovados;
                  const summaryHtml = `
                    <div class="info-grid">
                      <div class="info-box"><div class="label">Taxa de Aprovação</div><div class="value" style="color:${qualidadePainel.taxaGeral >= 90 ? '#16a34a' : qualidadePainel.taxaGeral >= 70 ? '#ca8a04' : '#dc2626'}">${qualidadePainel.taxaGeral}%</div></div>
                      <div class="info-box"><div class="label">Total Verificações</div><div class="value">${qualidadePainel.totalChecks}</div></div>
                      <div class="info-box"><div class="label">Aprovados</div><div class="value positive">${qualidadePainel.totalAprovados}</div></div>
                      <div class="info-box"><div class="label">Falhas Totais</div><div class="value negative">${totalFalhas}</div></div>
                    </div>`;
                  const rankingTable = buildPrintTable(
                    [{ label: "#" }, { label: "Item de Falha" }, { label: "Ocorrências", align: "center" }, { label: "% Falhas", align: "center" }, { label: "Impacto" }],
                    qualidadePainel.rankingFalhas.map((f, i) => {
                      const pct = totalFalhas > 0 ? ((f.count / totalFalhas) * 100).toFixed(1) : "0";
                      const barWidth = totalFalhas > 0 ? Math.round((f.count / totalFalhas) * 100) : 0;
                      return {
                        cells: [
                          `${i + 1}º`,
                          f.item,
                          String(f.count),
                          `${pct}%`,
                          `<div style="background:#fee2e2;border-radius:4px;height:10px;width:100%;"><div style="background:#dc2626;border-radius:4px;height:10px;width:${barWidth}%;"></div></div>`,
                        ],
                      };
                    })
                  );
                  const trendHtml = `
                    <h3 style="font-size:13px;margin:24px 0 12px;font-weight:600;">Tendência Mensal de Qualidade</h3>
                    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                      ${qualidadePainel.tendenciaMensal.map(t => {
                        const barH = Math.round((t.taxa / 100) * 100);
                        return `<div style="text-align:center;width:80px;">
                          <div style="display:flex;align-items:flex-end;justify-content:center;height:110px;gap:4px;">
                            <div style="width:24px;background:#16a34a;border-radius:4px 4px 0 0;height:${barH}px;" title="Aprovação ${t.taxa}%"></div>
                            <div style="width:24px;background:#dc2626;border-radius:4px 4px 0 0;height:${Math.min(100, t.falhas * 5)}px;" title="${t.falhas} falhas"></div>
                          </div>
                          <div style="font-size:10px;font-weight:600;margin-top:4px;">${t.mes}</div>
                          <div style="font-size:9px;color:#888;">${t.taxa}% aprov.</div>
                          <div style="font-size:9px;color:#dc2626;">${t.falhas} falha(s)</div>
                        </div>`;
                      }).join("")}
                    </div>
                    <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:10px;color:#666;">
                      <span>■ <span style="color:#16a34a">Aprovação</span></span>
                      <span>■ <span style="color:#dc2626">Falhas</span></span>
                    </div>`;
                  printPDF({
                    title: "Painel de Qualidade Consolidado",
                    subtitle: "Ranking de falhas frequentes e tendência mensal",
                    content: summaryHtml + `<h3 style="font-size:13px;margin:20px 0 8px;font-weight:600;">Ranking de Falhas Frequentes</h3>` + rankingTable + trendHtml,
                  });
                }}>
                  <Printer size={12} /> Exportar PDF
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* KPIs de Qualidade */}
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-border bg-muted/20 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Taxa de Aprovação Geral</p>
                  <p className={`text-3xl font-bold ${qualidadePainel.taxaGeral >= 90 ? "text-emerald-600" : qualidadePainel.taxaGeral >= 70 ? "text-amber-600" : "text-destructive"}`}>
                    {qualidadePainel.taxaGeral}%
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {qualidadePainel.totalAprovados}/{qualidadePainel.totalChecks} itens aprovados
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Falhas Totais</p>
                    <p className="text-lg font-bold text-destructive">{qualidadePainel.totalChecks - qualidadePainel.totalAprovados}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Itens Distintos</p>
                    <p className="text-lg font-bold">{qualidadePainel.rankingFalhas.length}</p>
                  </div>
                </div>
              </div>

              {/* Ranking de Falhas */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ranking de Falhas Frequentes</p>
                {qualidadePainel.rankingFalhas.length > 0 ? (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {qualidadePainel.rankingFalhas.map((f, i) => {
                      const pct = qualidadePainel.totalChecks > 0 ? ((f.count / (qualidadePainel.totalChecks - qualidadePainel.totalAprovados)) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20">
                          <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{f.item}</p>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                              <div className="h-1.5 rounded-full bg-destructive transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-[9px] h-4 px-1.5 shrink-0">{f.count}x</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 py-4">
                    <CheckCircle2 size={12} /> Nenhuma falha registrada
                  </p>
                )}
              </div>

              {/* Tendência Mensal */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Tendência Mensal de Qualidade</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={qualidadePainel.tendenciaMensal}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number, name: string) => [name === "taxa" ? `${v}%` : v, name === "taxa" ? "Aprovação" : "Falhas"]} />
                    <Line type="monotone" dataKey="taxa" name="Aprovação" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="falhas" name="Falhas" stroke="hsl(0, 84%, 60%)" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Curva ABC de Perdas */}
      {curvaABCPerdas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <TrendingDown size={14} className="text-destructive" /> Curva ABC — Perdas por Produto (Pareto)
              </h3>
              <ExportButtons options={{
                title: "Curva ABC — Perdas por Produto",
                filename: "curva-abc-perdas",
                columns: [
                  { header: "Produto", key: "desc" },
                  { header: "Perda %", key: "pctItem" },
                  { header: "Acumulado %", key: "pctAcum" },
                  { header: "OPs", key: "ordens" },
                  { header: "Classe", key: "classe" },
                ],
                data: curvaABCPerdas.map(p => ({
                  desc: p.desc,
                  pctItem: `${p.pctItem}%`,
                  pctAcum: `${p.pctAcum}%`,
                  ordens: String(p.ordens),
                  classe: p.classe,
                })),
                summaryRows: [
                  { label: "Classe A (80%)", value: `${curvaABCPerdas.filter(p => p.classe === "A").length} produto(s)` },
                  { label: "Classe B (15%)", value: `${curvaABCPerdas.filter(p => p.classe === "B").length} produto(s)` },
                  { label: "Classe C (5%)", value: `${curvaABCPerdas.filter(p => p.classe === "C").length} produto(s)` },
                ],
              }} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={curvaABCPerdas.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="desc" tick={{ fontSize: 9 }} width={120} tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 18) + "…" : v} />
                  <Tooltip formatter={(v: number, name: string) => [`${v}%`, name]} />
                  <Bar dataKey="pctItem" name="% Perda" radius={[0, 4, 4, 0]} barSize={16}>
                    {curvaABCPerdas.slice(0, 10).map((entry, idx) => (
                      <Cell key={idx} fill={entry.classe === "A" ? "hsl(0, 84%, 60%)" : entry.classe === "B" ? "hsl(45, 93%, 47%)" : "hsl(142, 71%, 45%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                <div className="grid grid-cols-[1fr_60px_60px_60px_40px] gap-1 text-[10px] text-muted-foreground uppercase font-semibold px-2 pb-1 border-b border-border">
                  <span>Produto</span><span className="text-right">Perda%</span><span className="text-right">Acum%</span><span className="text-right">OPs</span><span className="text-center">ABC</span>
                </div>
                {curvaABCPerdas.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_60px_60px_60px_40px] gap-1 text-xs items-center px-2 py-1 rounded hover:bg-muted/40 cursor-pointer"
                    onClick={() => setDrillDownProduto(p.desc)}
                    title="Clique para ver detalhes das OPs"
                  >
                    <span className="truncate text-primary underline-offset-2 hover:underline" title={p.desc}>{p.desc}</span>
                    <span className="text-right font-medium">{p.pctItem}%</span>
                    <span className="text-right text-muted-foreground">{p.pctAcum}%</span>
                    <span className="text-right text-muted-foreground">{p.ordens}</span>
                    <span className="text-center">
                      <Badge variant={p.classe === "A" ? "destructive" : p.classe === "B" ? "secondary" : "default"} className="text-[9px] h-4 px-1.5">{p.classe}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownProduto} onOpenChange={(open) => !open && setDrillDownProduto(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1.5">
              <TrendingDown size={14} className="text-destructive" /> Detalhes de Perda — {drillDownProduto}
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const opsDoProducto = finalizadas.filter(o => o.produtoDescricao === drillDownProduto && (o.perdaReal ?? 0) > 0)
              .sort((a, b) => (b.perdaReal ?? 0) - (a.perdaReal ?? 0));
            if (opsDoProducto.length === 0) return <p className="text-sm text-muted-foreground py-4">Nenhuma OP com perda encontrada.</p>;
            const totalPerdaProd = opsDoProducto.reduce((a, o) => a + (o.perdaReal ?? 0), 0);
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Total OPs</p>
                    <p className="text-lg font-bold">{opsDoProducto.length}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Perda Média</p>
                    <p className="text-lg font-bold text-destructive">{(totalPerdaProd / opsDoProducto.length).toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Maior Perda</p>
                    <p className="text-lg font-bold text-destructive">{Math.max(...opsDoProducto.map(o => o.perdaReal ?? 0)).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold">OP</th>
                        <th className="text-left px-3 py-2 font-semibold">Lote</th>
                        <th className="text-right px-3 py-2 font-semibold">Qtd Plan.</th>
                        <th className="text-right px-3 py-2 font-semibold">Qtd Real</th>
                        <th className="text-right px-3 py-2 font-semibold">Perda%</th>
                        <th className="text-left px-3 py-2 font-semibold">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {opsDoProducto.map(op => (
                        <tr key={op.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-3 py-1.5 font-medium">{op.numero}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{op.lote || "—"}</td>
                          <td className="px-3 py-1.5 text-right">{op.quantidade} {op.unidade}</td>
                          <td className="px-3 py-1.5 text-right">{(op.quantidadeReal ?? op.quantidade)} {op.unidade}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-destructive">{(op.perdaReal ?? 0).toFixed(1)}%</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{op.dataFinalizacao ? new Date(op.dataFinalizacao).toLocaleDateString("pt-BR") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* OEE Histórico */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <Gauge size={14} className="text-primary" /> Evolução Mensal do OEE
            </h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  <Settings2 size={12} /> Meta: {metaOEE}%
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <Label className="text-xs">Meta de OEE (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={metaOEE}
                  onChange={e => handleMetaOEEChange(Number(e.target.value))}
                  className="mt-1 h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {metaOEE >= 85 ? "World Class (≥85%)" : metaOEE >= 60 ? "Típico (60-84%)" : "Baixo (<60%)"}
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oeeHistorico}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v: number, name: string) => [`${v}%`, name]} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={metaOEE} stroke="hsl(var(--destructive))" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: `Meta ${metaOEE}%`, position: "right", fontSize: 10, fill: "hsl(var(--destructive))" }} />
              <Line type="monotone" dataKey="oee" name="OEE" stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="disponibilidade" name="Disponibilidade" stroke={CHART_COLORS[1]} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="desempenho" name="Desempenho" stroke={CHART_COLORS[2]} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="qualidade" name="Qualidade" stroke={CHART_COLORS[3]} strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparativo OEE entre Períodos */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-primary" /> Comparativo de OEE entre Períodos
            </h3>
            {comparData && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleExportComparativo}>
                <Printer size={12} /> Exportar PDF
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <Label className="text-xs text-muted-foreground">Período A</Label>
              <Select value={comparPeriodoA} onValueChange={setComparPeriodoA}>
                <SelectTrigger className="w-36 h-8 text-xs mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {allMesesOrdenados.map(m => (
                    <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground text-xs pb-1.5">vs</span>
            <div>
              <Label className="text-xs text-muted-foreground">Período B</Label>
              <Select value={comparPeriodoB} onValueChange={setComparPeriodoB}>
                <SelectTrigger className="w-36 h-8 text-xs mt-1">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {allMesesOrdenados.map(m => (
                    <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {comparData ? (
            <div className="space-y-3">
              {/* Bar chart comparison */}
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { indicador: "OEE", A: comparData.a.oee, B: comparData.b.oee },
                  { indicador: "Disponib.", A: comparData.a.disponibilidade, B: comparData.b.disponibilidade },
                  { indicador: "Desempenho", A: comparData.a.desempenho, B: comparData.b.desempenho },
                  { indicador: "Qualidade", A: comparData.a.qualidade, B: comparData.b.qualidade },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="indicador" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="A" name={monthLabel(comparPeriodoA)} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} barSize={28} />
                  <Bar dataKey="B" name={monthLabel(comparPeriodoB)} fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>

              {/* Detail table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["oee", "disponibilidade", "desempenho", "qualidade"] as const).map(key => {
                  const labelMap = { oee: "OEE", disponibilidade: "Disponibilidade", desempenho: "Desempenho", qualidade: "Qualidade" };
                  const valA = comparData.a[key];
                  const valB = comparData.b[key];
                  const diff = valB - valA;
                  return (
                    <div key={key} className="p-3 rounded-lg border border-border bg-muted/20 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{labelMap[key]}</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm font-bold">{valA}%</span>
                        <ArrowRight size={12} className="text-muted-foreground" />
                        <span className="text-sm font-bold">{valB}%</span>
                      </div>
                      <Badge
                        variant={diff > 0 ? "default" : diff < 0 ? "destructive" : "secondary"}
                        className="text-[10px] h-5 mt-1"
                      >
                        {diff > 0 ? "+" : ""}{diff.toFixed(1)}pp
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Selecione dois períodos para comparar os indicadores de OEE
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
