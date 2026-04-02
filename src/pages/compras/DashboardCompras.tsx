import { useState, useMemo, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnaliseSazonalidade, SugestoesReposicao } from "@/components/compras/SazonalidadeReposicao";
import { VariacaoPrecosCategoria, fetchVariacaoCategoriasData } from "@/components/compras/VariacaoPrecosCategoria";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, PackageX, AlertTriangle, Truck, TrendingUp, TrendingDown, Clock, CalendarIcon, ArrowUpRight, ArrowDownRight, Minus, Printer, DollarSign, Target, Check, Pencil, Activity, Mail, Settings2 } from "lucide-react";
import { Area, AreaChart, ComposedChart } from "recharts";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
];

function loadJSON(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function getDateFromRecord(record: any): Date | null {
  const d = record.dataEmissao || record.dataRegistro || record.data || record.dataRecebimento;
  if (!d) return null;
  try { return new Date(d); } catch { return null; }
}

type PresetPeriod = "7d" | "30d" | "90d" | "mes_atual" | "mes_anterior" | "custom";

function getPresetRange(preset: PresetPeriod): { from: Date; to: Date } {
  const hoje = new Date();
  switch (preset) {
    case "7d": return { from: subDays(hoje, 7), to: hoje };
    case "30d": return { from: subDays(hoje, 30), to: hoje };
    case "90d": return { from: subDays(hoje, 90), to: hoje };
    case "mes_atual": return { from: startOfMonth(hoje), to: endOfMonth(hoje) };
    case "mes_anterior": { const prev = subMonths(hoje, 1); return { from: startOfMonth(prev), to: endOfMonth(prev) }; }
    default: return { from: subDays(hoje, 30), to: hoje };
  }
}

export default function DashboardCompras() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<PresetPeriod>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [metaMensal, setMetaMensal] = useState<number>(() => {
    try { return Number(localStorage.getItem("meta_compras_mensal")) || 0; } catch { return 0; }
  });
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("");
  const [limiarVariacao, setLimiarVariacao] = useState<number>(() => {
    try { return Number(localStorage.getItem("alerta_variacao_limiar")) || 30; } catch { return 30; }
  });
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const salvarMeta = useCallback(() => {
    const valor = parseFloat(metaInput.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    setMetaMensal(valor);
    localStorage.setItem("meta_compras_mensal", String(valor));
    // Save to history
    const now = new Date();
    const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const hist = JSON.parse(localStorage.getItem("meta_compras_historico") || "{}");
      hist[mesKey] = { ...hist[mesKey], meta: valor };
      localStorage.setItem("meta_compras_historico", JSON.stringify(hist));
    } catch { /* erro ignorado */ }
    setEditandoMeta(false);
  }, [metaInput]);

  const salvarLimiar = useCallback((val: number) => {
    setLimiarVariacao(val);
    localStorage.setItem("alerta_variacao_limiar", String(val));
    toast.success(`Limiar de alerta atualizado para ${val}%`);
  }, []);

  const enviarEmailVariacao = useCallback(async () => {
    setEnviandoEmail(true);
    try {
      // Get SMTP config from empresa selecionada
      const { data: empresa } = await supabase.from("empresas").select("smtp_config, email, razao_social").eq("selecionada", true).limit(1).single();
      if (!empresa?.smtp_config) {
        toast.error("Configure o SMTP da empresa antes de enviar e-mails", { description: "Vá em Cadastros > Empresas e configure o servidor SMTP." });
        return;
      }
      const smtp = empresa.smtp_config as any;
      if (!smtp.servidor || !smtp.porta) {
        toast.error("Configuração SMTP incompleta");
        return;
      }

      const categorias = await fetchVariacaoCategoriasData();
      const limiar = Number(localStorage.getItem("alerta_variacao_limiar")) || 30;
      const alertaCats = categorias.filter(c => c.variacao > limiar);
      if (alertaCats.length === 0) {
        toast.info("Nenhuma categoria com variação acima do limiar configurado");
        return;
      }

      const rows = alertaCats.map(c =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">${c.nome}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${c.variacao.toFixed(1)}%</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">R$ ${c.custoMin.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">R$ ${c.custoMax.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
         <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${c.fornecedores}</td></tr>`
      ).join("");

      const html = `<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <h2 style="color:#dc2626;">⚠️ Alerta de Variação de Preços</h2>
        <p>Foram detectadas <strong>${alertaCats.length} categoria(s)</strong> com variação de preço acima de <strong>${limiar}%</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
          <thead><tr style="background:#f3f4f6;">
            <th style="padding:8px 10px;text-align:left;">Categoria</th>
            <th style="padding:8px 10px;text-align:right;">Variação</th>
            <th style="padding:8px 10px;text-align:right;">Custo Mín</th>
            <th style="padding:8px 10px;text-align:right;">Custo Máx</th>
            <th style="padding:8px 10px;text-align:center;">Fornecedores</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="font-size:11px;color:#666;">Enviado automaticamente pelo NexusERP — ${empresa.razao_social || ""}</p>
      </div>`;

      const destinatario = smtp.emailResposta || empresa.email;
      if (!destinatario) {
        toast.error("Nenhum e-mail de destinatário configurado na empresa");
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("send-smtp-email", {
        body: {
          smtp: { servidor: smtp.servidor, porta: smtp.porta, usuario: smtp.usuario, senha: smtp.senha, emailResposta: smtp.emailResposta, criptografia: smtp.criptografia, exigeSenha: smtp.exigeSenha !== false },
          to: destinatario,
          subject: `⚠️ Alerta: ${alertaCats.length} categorias com variação de preço > ${limiar}%`,
          html,
          body: `Alerta: ${alertaCats.length} categorias com variação de preço acima de ${limiar}%.`,
        },
      });

      if (error) throw error;
      toast.success("E-mail de alerta enviado com sucesso!", { description: `Enviado para ${destinatario}` });
    } catch (err: any) {
      console.error("Erro ao enviar e-mail de variação:", err);
      toast.error("Erro ao enviar e-mail", { description: err?.message || "Verifique a configuração SMTP" });
    } finally {
      setEnviandoEmail(false);
    }
  }, []);


  const dateRange = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    return getPresetRange(preset);
  }, [preset, customFrom, customTo]);

  // Previous period for trend comparison
  const prevRange = useMemo(() => {
    const diff = dateRange.to.getTime() - dateRange.from.getTime();
    return { from: new Date(dateRange.from.getTime() - diff), to: new Date(dateRange.from.getTime() - 1) };
  }, [dateRange]);

  const isInRange = (record: any, range: { from: Date; to: Date }) => {
    const d = getDateFromRecord(record);
    if (!d) return false;
    return isWithinInterval(d, { start: range.from, end: range.to });
  };

  const data = useMemo(() => {
    const allPedidos = loadJSON("pedidos_compra");
    const allFaltas = loadJSON("faltas_mercadorias");
    const allPerdas = loadJSON("perdas_estoque");
    const allRecebimentos = loadJSON("recebimentos_mercadorias");

    const pedidos = allPedidos.filter((p: any) => isInRange(p, dateRange));
    const faltas = allFaltas.filter((f: any) => isInRange(f, dateRange));
    const perdas = allPerdas.filter((p: any) => isInRange(p, dateRange));
    const recebimentos = allRecebimentos.filter((r: any) => isInRange(r, dateRange));

    // Previous period
    const prevPedidos = allPedidos.filter((p: any) => isInRange(p, prevRange));
    const prevFaltas = allFaltas.filter((f: any) => isInRange(f, prevRange));
    const prevPerdas = allPerdas.filter((p: any) => isInRange(p, prevRange));
    const prevRecebimentos = allRecebimentos.filter((r: any) => isInRange(r, prevRange));

    const pedidosTotal = pedidos.length;
    const pedidosAbertos = pedidos.filter((p: any) => p.status === "rascunho" || p.status === "enviado").length;
    const pedidosAtrasados = pedidos.filter((p: any) => {
      if (!p.dataEntrega || (p.status !== "enviado" && p.status !== "parcial")) return false;
      return new Date(p.dataEntrega) < new Date();
    }).length;
    const valorTotalPedidos = pedidos.reduce((acc: number, p: any) => acc + (p.valorLiquido || p.valorTotal || 0), 0);

    const faltasTotal = faltas.length;
    const faltasCriticas = faltas.filter((f: any) => f.prioridade === "critica" && f.status !== "resolvida").length;
    const faltasPendentes = faltas.filter((f: any) => f.status === "pendente").length;

    const perdasTotal = perdas.length;
    const valorPerdas = perdas.reduce((acc: number, p: any) => acc + ((p.valorUnitario || 0) * (p.quantidade || 0)), 0);

    const recebimentosTotal = recebimentos.length;
    const recebimentosPendentes = recebimentos.filter((r: any) => r.status === "pendente").length;

    // Trends
    const trendPedidos = pedidosTotal - prevPedidos.length;
    const trendFaltas = faltasTotal - prevFaltas.length;
    const trendPerdas = perdasTotal - prevPerdas.length;
    const trendRecebimentos = recebimentosTotal - prevRecebimentos.length;
    const trendFaltasCriticas = faltasCriticas - prevFaltas.filter((f: any) => f.prioridade === "critica" && f.status !== "resolvida").length;
    const trendAtrasados = pedidosAtrasados - prevPedidos.filter((p: any) => {
      if (!p.dataEntrega || (p.status !== "enviado" && p.status !== "parcial")) return false;
      return new Date(p.dataEntrega) < new Date();
    }).length;

    // Pedidos por status
    const statusCounts: Record<string, number> = {};
    pedidos.forEach((p: any) => { const s = p.status || "rascunho"; statusCounts[s] = (statusCounts[s] || 0) + 1; });
    const pedidosPorStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "), value,
    }));

    const mesesPedidos: Record<string, number> = {};
    pedidos.forEach((p: any) => { const mes = (p.dataEmissao || "").substring(0, 7); if (mes) mesesPedidos[mes] = (mesesPedidos[mes] || 0) + 1; });
    const evolucaoPedidos = Object.entries(mesesPedidos).sort(([a], [b]) => a.localeCompare(b)).map(([mes, qtd]) => { const [y, m] = mes.split("-"); return { mes: `${m}/${y}`, pedidos: qtd }; });

    const prioridadeCounts: Record<string, number> = {};
    faltas.forEach((f: any) => { prioridadeCounts[f.prioridade] = (prioridadeCounts[f.prioridade] || 0) + 1; });
    const faltasPorPrioridade = Object.entries(prioridadeCounts).map(([name, value]) => ({
      name: name === "critica" ? "Crítica" : name === "alta" ? "Alta" : name === "media" ? "Média" : "Baixa", value,
    }));

    const mesesPerdas: Record<string, number> = {};
    perdas.forEach((p: any) => { const mes = (p.data || "").substring(0, 7); if (mes) mesesPerdas[mes] = (mesesPerdas[mes] || 0) + (p.quantidade || 0); });
    const evolucaoPerdas = Object.entries(mesesPerdas).sort(([a], [b]) => a.localeCompare(b)).map(([mes, qtd]) => { const [y, m] = mes.split("-"); return { mes: `${m}/${y}`, perdas: qtd }; });

    // Evolução de valores (R$) por mês - pedidos e perdas combinados
    const mesesValor: Record<string, { valorPedidos: number; valorPerdas: number }> = {};
    pedidos.forEach((p: any) => {
      const mes = (p.dataEmissao || "").substring(0, 7);
      if (mes) { if (!mesesValor[mes]) mesesValor[mes] = { valorPedidos: 0, valorPerdas: 0 }; mesesValor[mes].valorPedidos += (p.valorLiquido || p.valorTotal || 0); }
    });
    perdas.forEach((p: any) => {
      const mes = (p.data || "").substring(0, 7);
      if (mes) { if (!mesesValor[mes]) mesesValor[mes] = { valorPedidos: 0, valorPerdas: 0 }; mesesValor[mes].valorPerdas += ((p.valorUnitario || 0) * (p.quantidade || 0)); }
    });
    const evolucaoValores = Object.entries(mesesValor).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => { const [y, m] = mes.split("-"); return { mes: `${m}/${y}`, pedidos: Number(v.valorPedidos.toFixed(2)), perdas: Number(v.valorPerdas.toFixed(2)) }; });

    // Comparative data: current vs previous period
    const prevValorPedidos = prevPedidos.reduce((acc: number, p: any) => acc + (p.valorLiquido || p.valorTotal || 0), 0);
    const prevValorPerdas = prevPerdas.reduce((acc: number, p: any) => acc + ((p.valorUnitario || 0) * (p.quantidade || 0)), 0);
    const comparativo = [
      { metrica: "Pedidos", atual: pedidosTotal, anterior: prevPedidos.length },
      { metrica: "Faltas", atual: faltasTotal, anterior: prevFaltas.length },
      { metrica: "Perdas", atual: perdasTotal, anterior: prevPerdas.length },
      { metrica: "Recebimentos", atual: recebimentosTotal, anterior: prevRecebimentos.length },
    ];
    const comparativoValor = [
      { metrica: "Vlr Pedidos", atual: valorTotalPedidos, anterior: prevValorPedidos },
      { metrica: "Vlr Perdas", atual: valorPerdas, anterior: prevValorPerdas },
    ];

    // Top suppliers ranking
    const fornecedorCounts: Record<string, { nome: string; pedidos: number; valor: number }> = {};
    pedidos.forEach((p: any) => {
      const nome = p.fornecedor || p.fornecedorNome || "Não informado";
      if (!fornecedorCounts[nome]) fornecedorCounts[nome] = { nome, pedidos: 0, valor: 0 };
      fornecedorCounts[nome].pedidos++;
      fornecedorCounts[nome].valor += (p.valorLiquido || p.valorTotal || 0);
    });
    const rankingFornecedores = Object.values(fornecedorCounts).sort((a, b) => b.pedidos - a.pedidos).slice(0, 10);

    return {
      pedidosTotal, pedidosAbertos, pedidosAtrasados, valorTotalPedidos,
      faltasTotal, faltasCriticas, faltasPendentes,
      perdasTotal, valorPerdas,
      recebimentosTotal, recebimentosPendentes,
      pedidosPorStatus, evolucaoPedidos, faltasPorPrioridade, evolucaoPerdas, evolucaoValores,
      trendPedidos, trendFaltas, trendPerdas, trendRecebimentos, trendFaltasCriticas, trendAtrasados,
      comparativo, comparativoValor, rankingFornecedores,
    };
  }, [dateRange, prevRange]);

  // Persist current month's realized value to history
  useEffect(() => {
    if (metaMensal <= 0) return;
    const now = new Date();
    const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const hist = JSON.parse(localStorage.getItem("meta_compras_historico") || "{}");
      hist[mesKey] = { ...hist[mesKey], meta: metaMensal, realizado: data.valorTotalPedidos };
      localStorage.setItem("meta_compras_historico", JSON.stringify(hist));
    } catch { /* erro ignorado */ }
  }, [metaMensal, data.valorTotalPedidos]);

  // Historical data for the last 6 months
  const historicoMetas = useMemo(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("meta_compras_historico") || "{}");
      const meses: { mes: string; meta: number; realizado: number; pct: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = hist[key] || {};
        const meta = entry.meta || 0;
        const realizado = entry.realizado || 0;
        const [y, m] = key.split("-");
        meses.push({ mes: `${m}/${y}`, meta, realizado, pct: meta > 0 ? Math.round((realizado / meta) * 100) : 0 });
      }
      return meses;
    } catch { return []; }
  }, [data.valorTotalPedidos, metaMensal]);

  // Demand forecast: linear regression on last 6 months, project 3 months ahead
  const previsaoDemanda = useMemo(() => {
    try {
      const allPedidos = loadJSON("pedidos_compra");
      const mesesMap: Record<string, { qtd: number; valor: number }> = {};
      allPedidos.forEach((p: any) => {
        const mes = (p.dataEmissao || "").substring(0, 7);
        if (mes) {
          if (!mesesMap[mes]) mesesMap[mes] = { qtd: 0, valor: 0 };
          mesesMap[mes].qtd++;
          mesesMap[mes].valor += (p.valorLiquido || p.valorTotal || 0);
        }
      });

      const now = new Date();
      const historico: { mes: string; key: string; qtd: number; valor: number; tipo: "real" | "previsao" }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(now, i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const [y, m] = key.split("-");
        const entry = mesesMap[key] || { qtd: 0, valor: 0 };
        historico.push({ mes: `${m}/${y}`, key, qtd: entry.qtd, valor: entry.valor, tipo: "real" });
      }

      // Simple linear regression for qty and value
      const n = historico.length;
      if (n < 2) return [];
      const xVals = historico.map((_, i) => i);
      const yQtd = historico.map(h => h.qtd);
      const yVal = historico.map(h => h.valor);

      const linearReg = (xs: number[], ys: number[]) => {
        const xMean = xs.reduce((a, b) => a + b, 0) / n;
        const yMean = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        xs.forEach((x, i) => { num += (x - xMean) * (ys[i] - yMean); den += (x - xMean) ** 2; });
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;
        return { slope, intercept };
      };

      const regQtd = linearReg(xVals, yQtd);
      const regVal = linearReg(xVals, yVal);

      // Add forecast for next 3 months
      const result = historico.map(h => ({ ...h, previsaoQtd: undefined as number | undefined, previsaoValor: undefined as number | undefined }));
      for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const [y, m] = key.split("-");
        const x = n - 1 + i;
        const pQtd = Math.max(0, Math.round(regQtd.slope * x + regQtd.intercept));
        const pVal = Math.max(0, regVal.slope * x + regVal.intercept);
        result.push({ mes: `${m}/${y}`, key, qtd: 0, valor: 0, tipo: "previsao", previsaoQtd: pQtd, previsaoValor: Number(pVal.toFixed(2)) });
      }
      return result;
    } catch { return []; }
  }, []);

  const TrendIndicator = ({ value, invertColor = false }: { value: number; invertColor?: boolean }) => {
    if (value === 0) return <span className="inline-flex items-center text-[10px] text-muted-foreground"><Minus className="h-3 w-3 mr-0.5" />0</span>;
    const isUp = value > 0;
    // For metrics where "up" is bad (atrasados, faltas, perdas), invert color
    const isPositive = invertColor ? !isUp : isUp;
    return (
      <span className={cn("inline-flex items-center text-[10px] font-medium", isPositive ? "text-emerald-600" : "text-destructive")}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(value)}
      </span>
    );
  };

  const kpis = [
    { label: "Pedidos de Compra", value: data.pedidosTotal, sub: `${data.pedidosAbertos} aberto(s)`, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", onClick: () => navigate("/compras/pedidos"), trend: data.trendPedidos, invertColor: false },
    { label: "Pedidos Atrasados", value: data.pedidosAtrasados, sub: "entrega vencida", icon: Clock, color: "text-destructive", bg: "bg-destructive/10", onClick: () => navigate("/compras/pedidos"), trend: data.trendAtrasados, invertColor: true },
    { label: "Faltas Críticas", value: data.faltasCriticas, sub: `${data.faltasPendentes} pendente(s)`, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", onClick: () => navigate("/compras/faltas"), trend: data.trendFaltasCriticas, invertColor: true },
    { label: "Total Faltas", value: data.faltasTotal, sub: "registros", icon: PackageX, color: "text-primary", bg: "bg-primary/10", onClick: () => navigate("/compras/faltas"), trend: data.trendFaltas, invertColor: true },
    { label: "Total Perdas", value: data.perdasTotal, sub: data.valorPerdas > 0 ? `R$ ${data.valorPerdas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "sem valor", icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/10", onClick: () => navigate("/compras/perdas"), trend: data.trendPerdas, invertColor: true },
    { label: "Recebimentos", value: data.recebimentosTotal, sub: `${data.recebimentosPendentes} pendente(s)`, icon: Truck, color: "text-primary", bg: "bg-primary/10", onClick: () => navigate("/compras/recebimento"), trend: data.trendRecebimentos, invertColor: false },
  ];

  const handleExportPDF = async () => {
    const periodo = `${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`;

    // KPIs section
    const kpiHtml = `<div class="info-grid">${kpis.map(k => 
      `<div class="info-box"><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="muted">${k.sub}</div></div>`
    ).join("")}</div>`;

    // Comparativo table
    const compTable = buildPrintTable(
      [{ label: "Métrica" }, { label: "Período Atual", align: "right" }, { label: "Período Anterior", align: "right" }],
      data.comparativo.map(c => ({ cells: [c.metrica, String(c.atual), String(c.anterior)] }))
    );

    // Ranking fornecedores table
    const rankTable = data.rankingFornecedores.length > 0 ? buildPrintTable(
      [{ label: "#", align: "center" }, { label: "Fornecedor" }, { label: "Pedidos", align: "right" }, { label: "Valor", align: "right" }],
      data.rankingFornecedores.map((f, i) => ({ cells: [String(i + 1), f.nome, String(f.pedidos), printCurrency(f.valor)] }))
    ) : "<p class='muted'>Sem dados de fornecedores no período</p>";

    // Pedidos por status table
    const statusTable = data.pedidosPorStatus.length > 0 ? buildPrintTable(
      [{ label: "Status" }, { label: "Quantidade", align: "right" }],
      data.pedidosPorStatus.map(s => ({ cells: [s.name, String(s.value)] }))
    ) : "";

    // Resumo de valores
    const resumoHtml = `<div class="info-grid">
      <div class="info-box"><div class="label">Valor Total em Pedidos</div><div class="value positive">${printCurrency(data.valorTotalPedidos)}</div></div>
      <div class="info-box"><div class="label">Valor Total em Perdas</div><div class="value negative">${printCurrency(data.valorPerdas)}</div></div>
    </div>`;

    // Fetch category variation data
    const categorias = await fetchVariacaoCategoriasData();
    const variacaoTable = categorias.length > 0 ? buildPrintTable(
      [
        { label: "Categoria" },
        { label: "Itens", align: "center" },
        { label: "Fornecedores", align: "center" },
        { label: "Custo Mín", align: "right" },
        { label: "Custo Máx", align: "right" },
        { label: "Custo Médio", align: "right" },
        { label: "Variação %", align: "right" },
      ],
      categorias.slice(0, 20).map(c => ({
        cells: [
          c.nome,
          String(c.itens),
          String(c.fornecedores),
          printCurrency(c.custoMin),
          printCurrency(c.custoMax),
          printCurrency(c.custoMedio),
          c.variacao > 0 ? `${c.variacao.toFixed(1)}%` : "-",
        ],
      }))
    ) : "<p class='muted'>Sem dados de XML fiscal para análise de variação</p>";

    const content = `
      ${kpiHtml}
      <h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;">Comparativo: Período Atual vs Anterior</h3>
      ${compTable}
      <h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;">Pedidos por Status</h3>
      ${statusTable || "<p class='muted'>Sem dados</p>"}
      <h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;">Ranking de Fornecedores</h3>
      ${rankTable}
      <h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;">Resumo Financeiro</h3>
      ${resumoHtml}
      <div style="page-break-before: always;"></div>
      <h3 style="margin:20px 0 8px;font-size:13px;font-weight:700;">Variação de Preços por Categoria (NCM)</h3>
      <p style="font-size:10px;color:#666;margin-bottom:8px;">${categorias.length} categorias analisadas — ordenadas por maior variação</p>
      ${variacaoTable}
    `;

    await printPDF({ title: "Dashboard Consolidado de Compras", subtitle: `Período: ${periodo}`, content });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <PageHeader title="Dashboard de Compras" description="Visão consolidada de pedidos, faltas, perdas e recebimentos" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={handleExportPDF}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
          </Button>
          <Select value={preset} onValueChange={(v) => setPreset(v as PresetPeriod)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="mes_atual">Mês atual</SelectItem>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 w-[130px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {customFrom ? format(customFrom, "dd/MM/yyyy") : "De"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">a</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 w-[130px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                    {customTo ? format(customTo, "dd/MM/yyyy") : "Até"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={setCustomTo} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <Badge variant="outline" className="h-9 px-3 text-xs">
            {format(dateRange.from, "dd/MM")} — {format(dateRange.to, "dd/MM/yyyy")}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={kpi.onClick}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-md ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <TrendIndicator value={kpi.trend} invertColor={kpi.invertColor} />
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Evolução de Pedidos por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.evolucaoPedidos.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.evolucaoPedidos}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip formatter={(v: number) => [v, "Pedidos"]} />
                  <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados de pedidos no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Pedidos por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pedidosPorStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.pedidosPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {data.pedidosPorStatus.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados de pedidos no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Faltas por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.faltasPorPrioridade.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.faltasPorPrioridade} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {data.faltasPorPrioridade.map((_, i) => {
                      const colors = ["hsl(150, 60%, 45%)", "hsl(210, 70%, 55%)", "hsl(35, 90%, 55%)", "hsl(var(--destructive))"];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Pie>
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados de faltas no período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" /> Evolução de Perdas por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.evolucaoPerdas.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.evolucaoPerdas}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <RechartsTooltip formatter={(v: number) => [v, "Qtd Perdida"]} />
                  <Line type="monotone" dataKey="perdas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados de perdas no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart - Evolução de Valores (R$) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Evolução de Valores (R$) — Pedidos vs Perdas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.evolucaoValores.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.evolucaoValores}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, name === "pedidos" ? "Pedidos" : "Perdas"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === "pedidos" ? "Vlr Pedidos" : "Vlr Perdas"} />
                <Bar dataKey="pedidos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="perdas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">Sem dados de valores no período</p>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 3 - Comparative & Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Comparativo: Período Atual vs Anterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.comparativo} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                <YAxis dataKey="metrica" type="category" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={90} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="atual" name="Período Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="anterior" name="Período Anterior" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Ranking de Fornecedores (por volume)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.rankingFornecedores.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {data.rankingFornecedores.map((f, i) => {
                  const maxPedidos = data.rankingFornecedores[0]?.pedidos || 1;
                  const pct = (f.pedidos / maxPedidos) * 100;
                  return (
                    <div key={f.nome} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium truncate">{f.nome}</span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <Badge variant="secondary" className="text-[10px] px-1.5">{f.pedidos} ped.</Badge>
                            {f.valor > 0 && <span className="text-[10px] text-muted-foreground">R$ {f.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-16">Sem dados de fornecedores no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meta Mensal de Compras */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Meta Mensal de Compras
            </span>
            {!editandoMeta ? (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { setMetaInput(metaMensal > 0 ? metaMensal.toString() : ""); setEditandoMeta(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar meta
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input type="text" placeholder="Ex: 50000" value={metaInput} onChange={(e) => setMetaInput(e.target.value)} className="h-7 w-32 text-xs" onKeyDown={(e) => e.key === "Enter" && salvarMeta()} />
                <Button variant="default" size="sm" className="h-7 px-2" onClick={salvarMeta}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metaMensal > 0 ? (() => {
            const pct = Math.min((data.valorTotalPedidos / metaMensal) * 100, 100);
            const overMeta = data.valorTotalPedidos > metaMensal;
            const getBarColor = () => {
              if (pct < 50) return "bg-destructive";
              if (pct < 80) return "bg-amber-500";
              return "bg-emerald-500";
            };
            return (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Realizado</p>
                    <p className="text-xl font-bold text-primary">R$ {data.valorTotalPedidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-lg font-semibold text-muted-foreground">R$ {metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", getBarColor())} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">0%</span>
                    <Badge variant={overMeta ? "default" : pct >= 80 ? "secondary" : "outline"} className="text-[10px] px-1.5">
                      {pct.toFixed(1)}% {overMeta ? "✓ Meta atingida!" : "da meta"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">100%</span>
                  </div>
                </div>
                {!overMeta && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    Faltam <span className="font-semibold text-foreground">R$ {(metaMensal - data.valorTotalPedidos).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span> para atingir a meta
                  </p>
                )}
              </div>
            );
          })() : (
            <div className="text-center py-6">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
              <p className="text-xs text-muted-foreground">Clique em "Editar meta" para definir o valor mensal</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Metas - Últimos 6 Meses */}
      {historicoMetas.some(h => h.meta > 0 || h.realizado > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Histórico de Atingimento de Metas (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={historicoMetas}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, name === "meta" ? "Meta" : "Realizado"]} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => v === "meta" ? "Meta" : "Realizado"} />
                <Bar dataKey="meta" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.35} />
                <Bar dataKey="realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {historicoMetas.filter(h => h.meta > 0).map(h => (
                <div key={h.mes} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{h.mes}</p>
                  <Badge variant={h.pct >= 100 ? "default" : h.pct >= 80 ? "secondary" : "outline"} className="text-[10px] px-1.5">
                    {h.pct}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previsão de Demanda */}
      {previsaoDemanda.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Previsão de Demanda (próximos 3 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quantidade */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Quantidade de Pedidos</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={previsaoDemanda}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" allowDecimals={false} />
                    <RechartsTooltip formatter={(v: number, name: string) => [v, name === "qtd" ? "Real" : "Previsão"]} />
                    <Bar dataKey="qtd" name="Real" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previsaoQtd" name="Previsão" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.35} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {/* Valor */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Valor Estimado (R$)</p>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={previsaoDemanda}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, name === "valor" ? "Real" : "Previsão"]} />
                    <Bar dataKey="valor" name="Real" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previsaoValor" name="Previsão" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.35} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              {previsaoDemanda.filter(p => p.tipo === "previsao").map(p => (
                <div key={p.key} className="text-center border rounded-lg px-3 py-1.5 bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">{p.mes}</p>
                  <p className="text-xs font-semibold">{p.previsaoQtd} ped.</p>
                  <p className="text-[10px] text-muted-foreground">R$ {(p.previsaoValor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 italic">* Previsão baseada em regressão linear dos últimos 6 meses</p>
          </CardContent>
        </Card>
      )}

      {/* Variação de Preços — Configuração do Limiar e Envio de E-mail */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" /> Configuração de Alertas de Variação de Preço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Limiar para alertas de variação</label>
                <Badge variant={limiarVariacao > 40 ? "secondary" : "destructive"} className="text-xs">
                  {limiarVariacao}%
                </Badge>
              </div>
              <Slider
                value={[limiarVariacao]}
                onValueChange={([v]) => setLimiarVariacao(v)}
                onValueCommit={([v]) => salvarLimiar(v)}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span>
                <span>Categorias com variação acima deste limiar geram alertas</span>
                <span>100%</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 whitespace-nowrap"
              onClick={enviarEmailVariacao}
              disabled={enviandoEmail}
            >
              <Mail className="h-3.5 w-3.5" />
              {enviandoEmail ? "Enviando..." : "Enviar Alerta por E-mail"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Variação de Preços por Categoria */}
      <VariacaoPrecosCategoria />

      {/* Sazonalidade e Sugestões de Reposição */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnaliseSazonalidade />
        <SugestoesReposicao />
      </div>

      {/* Resumo de Valor */}
      {(data.valorTotalPedidos > 0 || data.valorPerdas > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 justify-center">
              {data.valorTotalPedidos > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor Total em Pedidos</p>
                  <p className="text-xl font-bold text-primary">R$ {data.valorTotalPedidos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
              {data.valorPerdas > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Valor Total em Perdas</p>
                  <p className="text-xl font-bold text-destructive">R$ {data.valorPerdas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
