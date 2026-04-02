import { useState, useMemo, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Package, AlertTriangle, ArrowUpRight, Users,
  Target, Trophy, Star, Medal, Award, Filter, CalendarIcon,
  Truck, CreditCard, Bell, Percent, Tag, ShieldAlert, Factory, CheckCircle2, Play, Shield, ChevronDown, ChevronUp,
  Settings2, FileText, Printer, FileSpreadsheet, Clock, MessageCircle, Handshake, Pencil, Search, Upload
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { printPDF, buildPrintTable } from "@/lib/printUtils";
import { exportExcel, exportCSV, shareWhatsApp, type ExportColumn } from "@/lib/exportUtils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, isWithinInterval, isBefore, parseISO, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart, Legend, Line
} from "recharts";
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ===== Animated count hook =====
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * eased);
      setValue(current);
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function AnimatedNumber({ value, className, suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const animated = useCountUp(value);
  return <div className={className}>{animated}{suffix}</div>;
}

// ===== Audit Card Component =====
function AuditCard({ auditaveis, corrigidos, pendentes, pct, divNCM, divCST, divICMS, divOutros, semanaAtual, semanaAnterior, tendencia, sparkData, monthlyData, navigate }: {
  auditaveis: number; corrigidos: number; pendentes: number; pct: number;
  divNCM: number; divCST: number; divICMS: number; divOutros: number;
  semanaAtual: number; semanaAnterior: number; tendencia: number;
  sparkData: { dia: string; qtd: number }[];
  monthlyData: { mes: string; corrigidos: number; pendentes: number; pct: number }[];
  navigate: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMetaConfig, setShowMetaConfig] = useState(false);
  const [meta, setMeta] = useState(() => {
    try { return Number(localStorage.getItem("meta_conformidade_fiscal") || "90"); } catch { return 90; }
  });

  const handleMetaChange = (val: number[]) => {
    setMeta(val[0]);
    localStorage.setItem("meta_conformidade_fiscal", String(val[0]));
  };

  const metaAtingida = pct >= meta;
  const metaColor = metaAtingida ? "text-primary" : pct >= meta * 0.8 ? "text-amber-500" : "text-destructive";

  // Auto-notification when compliance is below goal
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!notifiedRef.current && pct < meta && auditaveis > 0) {
      notifiedRef.current = true;
      toast.warning(`Conformidade fiscal (${pct}%) está abaixo da meta de ${meta}%`, {
        description: `${pendentes} produto(s) pendente(s) de auditoria tributária.`,
        duration: 8000,
        action: {
          label: "Ver auditoria",
          onClick: () => navigate("/fiscal/auditoria"),
        },
      });
    }
  }, [pct, meta, pendentes, auditaveis, navigate]);

  const handleExportPDF = () => {
    const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const content = `
      <div class="info-grid">
        <div class="info-box"><div class="label">Produtos Auditáveis</div><div class="value">${auditaveis}</div></div>
        <div class="info-box"><div class="label">Corrigidos</div><div class="value" style="color:#16a34a">${corrigidos}</div></div>
        <div class="info-box"><div class="label">Pendentes</div><div class="value" style="color:#dc2626">${pendentes}</div></div>
        <div class="info-box"><div class="label">Conformidade</div><div class="value">${pct}%</div></div>
        <div class="info-box"><div class="label">Meta</div><div class="value">${meta}%</div></div>
        <div class="info-box"><div class="label">Status</div><div class="value" style="color:${metaAtingida ? '#16a34a' : '#dc2626'}">${metaAtingida ? '✅ Atingida' : '⚠️ Abaixo'}</div></div>
      </div>
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Divergências por Tipo</h3>
      ${buildPrintTable(
        [{ label: "Tipo", align: "left" as const }, { label: "Quantidade", align: "right" as const }],
        [
          { cells: ["CEST Ausente", String(divNCM)] },
          { cells: ["CST PIS/COFINS", String(divCST)] },
          { cells: ["CST ICMS (ST)", String(divICMS)] },
          { cells: ["Outras Divergências", String(divOutros)] },
          { cells: ["Total Pendentes", String(pendentes)], className: "total-row" },
        ]
      )}
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Tendência Semanal</h3>
      <p style="font-size:12px;">Correções esta semana: <strong>${semanaAtual}</strong> | Semana anterior: <strong>${semanaAnterior}</strong> | Variação: <strong>${tendencia > 0 ? '+' : ''}${tendencia}</strong></p>
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Evolução Mensal</h3>
      ${buildPrintTable(
        [{ label: "Mês", align: "left" as const }, { label: "Corrigidos", align: "right" as const }, { label: "Conformidade", align: "right" as const }],
        monthlyData.map(m => ({ cells: [m.mes, String(m.corrigidos), `${m.pct}%`] }))
      )}
    `;
    printPDF({
      title: "Resumo Executivo — Auditoria Fiscal",
      subtitle: `Gerado em ${timestamp}`,
      content,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield size={16} className="text-primary" /> Auditoria Fiscal
            </CardTitle>
            <div className="flex items-center gap-1">
              {/* Weekly trend */}
              <Badge variant="outline" className={cn("text-[10px] gap-1", tendencia > 0 ? "border-primary/40 text-primary" : tendencia < 0 ? "border-destructive/40 text-destructive" : "")}>
                {tendencia > 0 ? <TrendingUp size={11} /> : tendencia < 0 ? <TrendingDown size={11} /> : null}
                {semanaAtual} esta semana {tendencia !== 0 && `(${tendencia > 0 ? "+" : ""}${tendencia})`}
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleExportPDF} title="Exportar Resumo PDF">
                <Printer size={13} className="mr-1" /> PDF
              </Button>
              <Button variant="default" size="sm" className="text-xs h-7 px-3 gap-1 relative" onClick={() => navigate("/fiscal/auditoria")}>
                <ShieldAlert size={13} /> Auditar Produtos
                {pendentes > 0 && (
                  <TooltipProvider delayDuration={200}>
                    <ShadTooltip>
                      <TooltipTrigger asChild>
                        <Badge className="absolute -top-2 -right-2 h-4 min-w-4 px-1 text-[9px] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center animate-pulse cursor-help">
                          {pendentes}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[220px] space-y-1 p-2">
                        <p className="font-semibold mb-1">{pendentes} pendência(s)</p>
                        {divNCM > 0 && <button onClick={() => navigate("/fiscal/auditoria?filtro=ncm")} className="flex items-center gap-1.5 w-full hover:underline text-left"><span className="h-2 w-2 rounded-full bg-chart-1 inline-block shrink-0" /> NCM: {divNCM}</button>}
                        {divCST > 0 && <button onClick={() => navigate("/fiscal/auditoria?filtro=cst")} className="flex items-center gap-1.5 w-full hover:underline text-left"><span className="h-2 w-2 rounded-full bg-chart-2 inline-block shrink-0" /> CST: {divCST}</button>}
                        {divICMS > 0 && <button onClick={() => navigate("/fiscal/auditoria?filtro=icms")} className="flex items-center gap-1.5 w-full hover:underline text-left"><span className="h-2 w-2 rounded-full bg-chart-3 inline-block shrink-0" /> ICMS: {divICMS}</button>}
                        {divOutros > 0 && <button onClick={() => navigate("/fiscal/auditoria?filtro=outros")} className="flex items-center gap-1.5 w-full hover:underline text-left"><span className="h-2 w-2 rounded-full bg-chart-4 inline-block shrink-0" /> Outros: {divOutros}</button>}
                      </TooltipContent>
                    </ShadTooltip>
                  </TooltipProvider>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/fiscal/auditoria")}>
                Ver auditoria <ArrowUpRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <AnimatedNumber value={auditaveis} className="text-2xl font-bold text-foreground" />
              <div className="text-[11px] text-muted-foreground">Produtos Auditáveis</div>
            </div>
            <div className="text-center">
              <AnimatedNumber value={corrigidos} className="text-2xl font-bold text-primary" />
              <div className="text-[11px] text-muted-foreground">Corrigidos</div>
            </div>
            <div className="text-center">
              <AnimatedNumber value={pendentes} className={cn("text-2xl font-bold", pendentes > 0 ? "text-destructive" : "text-primary")} />
              <div className="text-[11px] text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <AnimatedNumber value={pct} suffix="%" className={cn("text-2xl font-bold", pct === 100 ? "text-primary" : pct >= 70 ? "text-foreground" : "text-destructive")} />
              <div className="text-[11px] text-muted-foreground">Conformidade</div>
            </div>
          </div>

          {/* Progress bar with goal indicator */}
          <div className="relative mb-1">
            <Progress value={pct} className="h-2.5" />
            {/* Goal marker */}
            <div
              className="absolute top-0 h-2.5 w-0.5 bg-foreground/70 rounded-full"
              style={{ left: `${meta}%` }}
              title={`Meta: ${meta}%`}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-muted-foreground">
                {pct === 100 ? "✅ Base fiscal 100% conforme" : `${pendentes} produto(s) aguardam auditoria tributária`}
              </p>
              <Badge variant="outline" className={cn("text-[10px] gap-1", metaColor)}>
                <Target size={10} /> Meta {meta}% {metaAtingida ? "✓" : ""}
              </Badge>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowMetaConfig(!showMetaConfig)}>
                <Settings2 size={11} />
              </Button>
            </div>
            {pendentes > 0 && (
              <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 gap-1" onClick={() => setExpanded(!expanded)}>
                Detalhes {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            )}
          </div>

          {/* Meta config slider */}
          {showMetaConfig && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium">Meta de Conformidade</span>
                <span className="text-sm font-bold">{meta}%</span>
              </div>
              <Slider value={[meta]} onValueChange={handleMetaChange} min={50} max={100} step={5} className="w-full" />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </motion.div>
          )}

          {expanded && pendentes > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
              {/* Sparkline */}
              {sparkData.some(s => s.qtd > 0) && (
                <div className="mb-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Correções nos últimos 7 dias:</p>
                  <div className="h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparkData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="dia" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <Area type="monotone" dataKey="qtd" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#sparkGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              <p className="text-xs font-medium text-muted-foreground mb-2">Divergências por tipo:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "CEST ausente", count: divNCM, color: "text-destructive", filter: "cest" },
                  { label: "CST PIS/COFINS", count: divCST, color: "text-primary", filter: "pis_cofins" },
                  { label: "CST ICMS (ST)", count: divICMS, color: "text-amber-500", filter: "icms" },
                  { label: "Outras", count: divOutros, color: "text-muted-foreground", filter: "outros" },
                ].filter(d => d.count > 0).map(d => (
                  <div
                    key={d.label}
                    className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30 cursor-pointer hover:border-primary/50 hover:bg-muted/60 transition-colors"
                    onClick={() => navigate(`/fiscal/auditoria?filtro=${d.filter}`)}
                  >
                    <span className="text-[11px]">{d.label}</span>
                    <span className={cn("text-sm font-bold", d.color)}>{d.count}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span>Semana anterior: {semanaAnterior} correção(ões)</span>
                <span>•</span>
                <span>Esta semana: {semanaAtual} correção(ões)</span>
              </div>
              {/* Monthly comparison */}
              {monthlyData.length > 1 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">Conformidade mensal:</p>
                  <div className="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyData} barGap={1}>
                        <XAxis dataKey="mes" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} formatter={(v: number) => [`${v}%`, "Conformidade"]} />
                        <Bar dataKey="pct" name="Conformidade %" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ===== Seed-based pseudo-random for stable data =====
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function generateDataForRange(start: Date, end: Date) {
  const days = eachDayOfInterval({ start, end });
  const rand = seededRandom(42);

  const vendedores = ["Carlos Mendes", "Ana Paula", "Roberto Farias", "Juliana Costa", "Pedro Almeida"];
  const metas = [25000, 20000, 30000, 18000, 22000];
  const produtos = ["Arroz 5kg", "Café 500g", "Óleo Soja 900ml", "Açúcar 5kg", "Feijão 1kg", "Leite 1L", "Farinha 1kg", "Macarrão 500g"];
  const clientes = ["João Silva", "Maria Souza", "Carlos Lima", "Ana Oliveira", "Pedro Santos"];
  const formas = ["Dinheiro", "Crédito", "Débito", "PIX", "Crediário"];

  // Daily sales
  const dailySales = days.map((d) => {
    const dow = d.getDay();
    const mult = dow === 0 ? 0.4 : dow === 6 ? 1.3 : 1;
    const base = 3000 + rand() * 5000;
    const valor = Math.round(base * mult);
    const qtd = Math.round(10 + rand() * 30 * mult);
    return { date: d, label: format(d, "dd/MM"), valor, qtd };
  });

  const totalVendas = dailySales.reduce((s, d) => s + d.valor, 0);
  const totalQtd = dailySales.reduce((s, d) => s + d.qtd, 0);
  const mediaDiaria = days.length > 0 ? totalVendas / days.length : 0;

  // Scale factor based on period length
  const scaleFactor = days.length / 30;

  // Formas pagamento
  const formasData = formas.map((name, i) => {
    const pcts = [0.16, 0.29, 0.22, 0.25, 0.08];
    return { name, value: Math.round(totalVendas * pcts[i]), color: ["hsl(142,71%,45%)", "hsl(217,91%,60%)", "hsl(262,83%,58%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"][i] };
  });

  // Vendedores
  const vendData = vendedores.map((nome, i) => {
    const share = [0.28, 0.24, 0.20, 0.16, 0.12][i];
    const total = Math.round(totalVendas * share);
    const metaScaled = Math.round(metas[i] * scaleFactor);
    const qtdV = Math.round(totalQtd * share);
    return { nome, total, meta: metaScaled, qtd: qtdV, pct: metaScaled > 0 ? Math.round((total / metaScaled) * 100) : 0 };
  });

  // Produtos
  const prodData = produtos.map((produto, i) => {
    const share = [0.18, 0.14, 0.12, 0.10, 0.09, 0.08, 0.06, 0.05][i];
    const total = Math.round(totalVendas * share);
    const qtdP = Math.round(total / (5 + rand() * 20));
    return { produto, total, qtd: qtdP };
  }).sort((a, b) => b.total - a.total);

  // ABC classification
  const prodTotal = prodData.reduce((s, p) => s + p.total, 0);
  let acc = 0;
  const prodABC = prodData.map((p) => {
    acc += p.total;
    const accPct = prodTotal > 0 ? (acc / prodTotal) * 100 : 0;
    return { ...p, curva: accPct <= 80 ? "A" as const : accPct <= 95 ? "B" as const : "C" as const };
  });

  // Clientes
  const clientData = clientes.map((cliente, i) => {
    const share = [0.25, 0.22, 0.20, 0.18, 0.15][i];
    const total = Math.round(totalVendas * share);
    const compras = Math.round((5 + rand() * 15) * scaleFactor);
    return { cliente, total, compras, ticket: compras > 0 ? Math.round(total / compras) : 0 };
  });

  // Faturamento mensal (últimos 6 meses)
  const fatMensal = Array.from({ length: 6 }, (_, i) => {
    const mesDate = new Date(end.getFullYear(), end.getMonth() - (5 - i), 1);
    const base = 130000 + rand() * 70000;
    const meta = 150000 + i * 10000;
    return { mes: format(mesDate, "MMM", { locale: ptBR }), valor: Math.round(base), meta };
  });

  const metasBatidas = vendData.filter((v) => v.pct >= 100).length;
  const clientesAtivos = clientes.length + Math.round(rand() * 100);
  const ticketMedio = totalQtd > 0 ? totalVendas / totalQtd : 0;
  const metaPctGeral = fatMensal.length > 0 ? Math.round((fatMensal[fatMensal.length - 1].valor / fatMensal[fatMensal.length - 1].meta) * 100) : 0;

  return {
    dailySales, totalVendas, totalQtd, mediaDiaria,
    formasData, vendData, prodABC, clientData, fatMensal,
    metasBatidas, clientesAtivos, ticketMedio, metaPctGeral,
  };
}

const produtosBaixoEstoque = [
  { nome: "Smartphone X Pro", estoque: 3, minimo: 10 },
  { nome: "Notebook Ultra 15", estoque: 1, minimo: 5 },
  { nome: "Fone Bluetooth Z", estoque: 5, minimo: 15 },
  { nome: "Cabo USB-C 2m", estoque: 8, minimo: 20 },
  { nome: "Carregador Turbo", estoque: 2, minimo: 10 },
];

const MEDAL_COLORS = ["text-yellow-500", "text-gray-400", "text-amber-700"];
const CURVA_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = { A: "default", B: "secondary", C: "destructive" };

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start text-left font-normal gap-2 min-w-[150px]">
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

function PromoCard({ navigate }: { navigate: (path: string) => void }) {
  const { promos, prodItems } = useMemo(() => {
    try {
      const stored = localStorage.getItem("promocoes");
      const allPromos: any[] = stored ? JSON.parse(stored) : [];
      const abertas = allPromos.filter(p => p.status === "ABERTO");
      const allProdItems: { descricao: string; vendaPromocao: number; percentualDesconto: number }[] = [];
      abertas.forEach(pr => (pr.produtos || []).forEach((prod: any) => allProdItems.push(prod)));
      return { promos: abertas, prodItems: allProdItems };
    } catch { return { promos: [], prodItems: [] }; }
  }, []);

  if (promos.length === 0) return null;

  const hoje = new Date().toISOString().split("T")[0];
  const vigentes = promos.filter((p: any) => p.inicio <= hoje && p.fim >= hoje);
  const mediaDesconto = prodItems.length > 0
    ? (prodItems.reduce((s, p) => s + (p.percentualDesconto || 0), 0) / prodItems.length).toFixed(1)
    : "0";

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Percent size={16} className="text-primary" /> Promoções Ativas
            <Badge className="ml-1 text-[10px] h-5 border-0">{promos.length}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/comercial/promocoes")}>
            Ver promoções <ArrowUpRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Promoções</p>
            <p className="text-xl font-bold text-primary">{promos.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vigentes Hoje</p>
            <p className="text-xl font-bold text-primary">{vigentes.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Desc. Médio</p>
            <p className="text-xl font-bold text-primary">{mediaDesconto}%</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {prodItems.slice(0, 4).map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.produtoDescricao}</p>
                <p className="text-xs font-mono text-primary font-bold">R$ {p.vendaPromocao?.toFixed(2)}</p>
              </div>
              <Badge variant="outline" className="shrink-0 ml-2 border-primary/40 text-primary">
                -{p.percentualDesconto?.toFixed(0)}%
              </Badge>
            </div>
          ))}
          {prodItems.length > 4 && (
            <p className="text-xs text-muted-foreground text-center">+ {prodItems.length - 4} produto(s) em promoção</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DescontosWidget({ navigate, dataInicio, dataFim }: { navigate: (path: string) => void; dataInicio: Date; dataFim: Date }) {
  const resumo = useMemo(() => {
    try {
      const stored = localStorage.getItem("pdv-cupons-historico");
      if (!stored) return null;
      const cupons = JSON.parse(stored);
      let totalDescontos = 0;
      let countDescontos = 0;
      let countLiberacoes = 0;
      const operadores = new Map<string, number>();
      const inicio = new Date(dataInicio); inicio.setHours(0, 0, 0, 0);
      const fim = new Date(dataFim); fim.setHours(23, 59, 59, 999);

      cupons.forEach((c: any) => {
        const dataEmissao = new Date(c.dataEmissao);
        if (dataEmissao < inicio || dataEmissao > fim) return;

        const op = c.operador || "Desconhecido";
        (c.items || []).forEach((item: any) => {
          if (item.desconto && item.desconto > 0) {
            const val = item.preco * item.quantidade * (item.desconto / 100);
            totalDescontos += val;
            countDescontos++;
            operadores.set(op, (operadores.get(op) || 0) + val);
          }
        });
        if (c.descontoGeral && c.descontoGeral.calculado > 0) {
          totalDescontos += c.descontoGeral.calculado;
          countDescontos++;
          operadores.set(op, (operadores.get(op) || 0) + c.descontoGeral.calculado);
        }
      });

      // Liberações count will be loaded async separately
      countLiberacoes = 0;

      const topOperadores = Array.from(operadores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return { totalDescontos, countDescontos, countLiberacoes, topOperadores };
    } catch { return null; }
  }, [dataInicio, dataFim]);

  if (!resumo || resumo.countDescontos === 0) return null;

  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Tag size={16} className="text-destructive" /> Descontos Concedidos
            <Badge variant="destructive" className="ml-1 text-[10px] h-5 border-0">{resumo.countDescontos}</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/descontos")}>
            Ver relatório <ArrowUpRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Descontos</p>
            <p className="text-xl font-bold text-destructive">{formatBRL(resumo.totalDescontos)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ocorrências</p>
            <p className="text-xl font-bold text-destructive">{resumo.countDescontos}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
              <ShieldAlert size={10} /> Liberações
            </p>
            <p className="text-xl font-bold text-primary">{resumo.countLiberacoes}</p>
          </div>
        </div>
        {resumo.topOperadores.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Operadores por Desconto</p>
            {resumo.topOperadores.map(([op, val], i) => (
              <div key={op} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>
                  <span className="text-sm font-medium">{op}</span>
                </div>
                <span className="text-sm font-bold text-destructive">{formatBRL(val)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProducaoWidget({ navigate }: { navigate: (path: string) => void }) {
  const dados = useMemo(() => {
    try {
      const stored = localStorage.getItem("ordens_producao");
      if (!stored) return null;
      const ordens: any[] = JSON.parse(stored);
      if (ordens.length === 0) return null;

      const emProducao = ordens.filter(o => o.status === "em_producao");
      const aguardando = ordens.filter(o => o.status === "aguardando");
      const finalizadas = ordens.filter(o => o.status === "finalizada");
      const custoTotal = finalizadas.reduce((a: number, o: any) => a + (o.custoTotal || 0), 0);
      const qtdProduzida = finalizadas.reduce((a: number, o: any) => a + (o.quantidadeReal ?? o.quantidade ?? 0), 0);
      const perdasReais = finalizadas.filter((o: any) => o.perdaReal != null && o.perdaReal > 0);
      const perdaMedia = perdasReais.length > 0
        ? perdasReais.reduce((a: number, o: any) => a + o.perdaReal, 0) / perdasReais.length
        : 0;

      // Alertas de validade
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const alertasValidade = ordens
        .filter((o: any) => o.dataValidade)
        .map((o: any) => {
          const validade = parseISO(o.dataValidade);
          const diasRestantes = differenceInDays(validade, hoje);
          return { ...o, diasRestantes };
        })
        .filter((o: any) => o.diasRestantes <= 7)
        .sort((a: any, b: any) => a.diasRestantes - b.diasRestantes);

      // Evolução mensal (últimos 6 meses)
      const evolucaoMap: Record<string, { mes: string; finalizadas: number; custo: number; quantidade: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = format(d, "yyyy-MM");
        const label = format(d, "MMM/yy", { locale: ptBR });
        evolucaoMap[key] = { mes: label, finalizadas: 0, custo: 0, quantidade: 0 };
      }
      ordens.forEach((o: any) => {
        if (o.status !== "finalizada" || !o.dataCriacao) return;
        const key = o.dataCriacao.substring(0, 7);
        if (evolucaoMap[key]) {
          evolucaoMap[key].finalizadas += 1;
          evolucaoMap[key].custo += o.custoTotal || 0;
          evolucaoMap[key].quantidade += o.quantidadeReal ?? o.quantidade ?? 0;
        }
      });
      const evolucaoMensal = Object.values(evolucaoMap);

      return { emProducao, aguardando, finalizadas, custoTotal, qtdProduzida, perdaMedia, total: ordens.length, alertasValidade, evolucaoMensal };
    } catch { return null; }
  }, []);

  if (!dados) return null;

  return (
    <Card className="border-blue-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Factory size={16} className="text-blue-600" /> Produção
            {dados.emProducao.length > 0 && (
              <Badge className="ml-1 text-[10px] h-5 border-0 bg-blue-500/20 text-blue-600">{dados.emProducao.length} em andamento</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/producao/ordens")}>
            Ver ordens <ArrowUpRight size={12} className="ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <div className="text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1"><Play size={10} /> Em Produção</p>
            <p className="text-xl font-bold text-blue-600">{dados.emProducao.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aguardando</p>
            <p className="text-xl font-bold text-amber-600">{dados.aguardando.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1"><CheckCircle2 size={10} /> Finalizadas</p>
            <p className="text-xl font-bold text-emerald-600">{dados.finalizadas.length}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Custo Acumulado</p>
            <p className="text-lg font-bold">{formatBRL(dados.custoTotal)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rendimento</p>
            <p className={`text-xl font-bold ${(100 - dados.perdaMedia) >= 95 ? "text-emerald-600" : (100 - dados.perdaMedia) >= 85 ? "text-amber-600" : "text-destructive"}`}>
              {(100 - dados.perdaMedia).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Gráfico evolução mensal */}
        {dados.evolucaoMensal.some((m: any) => m.finalizadas > 0) && (
          <div className="mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Evolução Mensal</p>
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={dados.evolucaoMensal} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="fill-muted-foreground" hide />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  formatter={(value: number, name: string) =>
                    name === "custo" ? [value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Custo"]
                    : name === "finalizadas" ? [value, "OPs Finalizadas"]
                    : [value, "Qtd Produzida"]
                  }
                />
                <Bar yAxisId="left" dataKey="finalizadas" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} barSize={20} name="finalizadas" />
                <Line yAxisId="left" type="monotone" dataKey="quantidade" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} name="quantidade" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {dados.emProducao.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ordens em Andamento</p>
            {dados.emProducao.slice(0, 4).map((op: any) => (
              <div key={op.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{op.produtoDescricao}</p>
                  <p className="text-xs text-muted-foreground font-mono">{op.numero} · {op.quantidade} {op.unidade}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold">{formatBRL(op.custoTotal)}</p>
                  {op.lote && <p className="text-[10px] text-muted-foreground">Lote: {op.lote}</p>}
                </div>
              </div>
            ))}
            {dados.emProducao.length > 4 && (
              <p className="text-xs text-muted-foreground text-center">+ {dados.emProducao.length - 4} ordem(ns)</p>
            )}
          </div>
        )}

        {/* Alertas de validade */}
        {dados.alertasValidade.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] text-destructive uppercase tracking-wider font-semibold flex items-center gap-1">
              <AlertTriangle size={10} /> Alertas de Validade ({dados.alertasValidade.length})
            </p>
            {dados.alertasValidade.slice(0, 5).map((op: any) => (
              <div key={`val-${op.id}`} className={cn(
                "flex items-center justify-between p-2 rounded-lg border",
                op.diasRestantes <= 0
                  ? "border-destructive/30 bg-destructive/5"
                  : op.diasRestantes <= 3
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border bg-muted/20"
              )}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{op.produtoDescricao || op.numero}</p>
                  <p className="text-xs text-muted-foreground">
                    {op.lote ? `Lote: ${op.lote} · ` : ""}Val: {format(parseISO(op.dataValidade), "dd/MM/yyyy")}
                  </p>
                </div>
                <Badge
                  variant={op.diasRestantes <= 0 ? "destructive" : "outline"}
                  className={cn("text-[10px] shrink-0 ml-2",
                    op.diasRestantes > 0 && op.diasRestantes <= 3 && "border-amber-500/40 text-amber-600",
                    op.diasRestantes > 3 && "border-primary/40 text-primary"
                  )}
                >
                  {op.diasRestantes < 0 ? `Vencido ${Math.abs(op.diasRestantes)}d` : op.diasRestantes === 0 ? "Vence hoje" : `${op.diasRestantes}d restante${op.diasRestantes > 1 ? "s" : ""}`}
                </Badge>
              </div>
            ))}
            {dados.alertasValidade.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">+ {dados.alertasValidade.length - 5} alerta(s)</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FinanceiroWidget({ navigate }: { navigate: (path: string) => void }) {
  const [showPrevisao, setShowPrevisao] = useState(false);
  const [showComparativo, setShowComparativo] = useState(false);
  const [showLimiarConfig, setShowLimiarConfig] = useState(false);
  const [agingDrillDown, setAgingDrillDown] = useState<string | null>(null);
  const [agingDrillFilter, setAgingDrillFilter] = useState<"todos" | "pagar" | "receber" | "negociando" | NegStatus>("todos");
  const [limiarAlerta, setLimiarAlerta] = useState(() => {
    try { return Number(localStorage.getItem("limiar_alerta_financeiro") || "0"); } catch { return 0; }
  });
  type NegStatus = "em_andamento" | "acordo_fechado" | "sem_acordo";
  const NEG_STATUS_LABELS: Record<NegStatus, string> = { em_andamento: "Em andamento", acordo_fechado: "Acordo fechado", sem_acordo: "Sem acordo" };
  const NEG_STATUS_COLORS: Record<NegStatus, string> = { em_andamento: "border-amber-500/50 text-amber-600 bg-amber-500/10", acordo_fechado: "border-primary/50 text-primary bg-primary/10", sem_acordo: "border-destructive/50 text-destructive bg-destructive/10" };

  const [negociacoes, setNegociacoes] = useState<Record<string, { ativo: boolean; observacao?: string; data?: string; responsavel?: string; statusNeg?: NegStatus }>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("aging_negociacoes") || "{}");
      const migrated: Record<string, { ativo: boolean; observacao?: string; data?: string; responsavel?: string; statusNeg?: NegStatus }> = {};
      Object.entries(raw).forEach(([k, v]) => {
        if (typeof v === "boolean") migrated[k] = { ativo: v, statusNeg: "em_andamento" };
        else { const obj = v as any; migrated[k] = { ...obj, statusNeg: obj.statusNeg || "em_andamento" }; }
      });
      return migrated;
    } catch { return {}; }
  });
  const [negociacaoEditKey, setNegociacaoEditKey] = useState<string | null>(null);
  const [negociacaoEditMode, setNegociacaoEditMode] = useState<"new" | "edit">("new");
  const [negociacaoForm, setNegociacaoForm] = useState({ observacao: "", responsavel: "", statusNeg: "em_andamento" as NegStatus });
  const [showHistoricoNeg, setShowHistoricoNeg] = useState(false);
  const [histNegDataInicio, setHistNegDataInicio] = useState<Date | undefined>(undefined);
  const [histNegDataFim, setHistNegDataFim] = useState<Date | undefined>(undefined);
  const [histNegPreset, setHistNegPreset] = useState<string | null>(null);
  const [histNegResponsavel, setHistNegResponsavel] = useState<string>("");
  const [histNegBusca, setHistNegBusca] = useState<string>("");
  const [histNegPagina, setHistNegPagina] = useState(1);
  const [histNegPorPagina, setHistNegPorPagina] = useState(15);
  const [histNegOrdem, setHistNegOrdem] = useState<"data_desc" | "data_asc" | "acao_asc" | "acao_desc">("data_desc");

  // Negotiation history
  const [historicoNegociacoes, setHistoricoNegociacoes] = useState<{ key: string; acao: string; responsavel?: string; observacao?: string; data: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("aging_negociacoes_historico") || "[]"); } catch { return []; }
  });

  const responsaveisUnicos = useMemo(() => {
    const map = new Map<string, number>();
    historicoNegociacoes.forEach(h => { if (h.responsavel) map.set(h.responsavel, (map.get(h.responsavel) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [historicoNegociacoes]);

  const historicoFiltrado = useMemo(() => {
    setHistNegPagina(1);
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const termos = histNegBusca ? normalize(histNegBusca).split(/\s+/).filter(Boolean) : [];
    const filtered = historicoNegociacoes.filter(h => {
      if (histNegResponsavel && h.responsavel !== histNegResponsavel) return false;
      if (termos.length > 0) {
        const texto = normalize([h.key, h.acao, h.observacao || "", h.responsavel || ""].join(" "));
        if (!termos.every(t => texto.includes(t))) return false;
      }
      if (!h.data) return true;
      const d = new Date(h.data);
      if (histNegDataInicio && d < histNegDataInicio) return false;
      if (histNegDataFim) { const fim = new Date(histNegDataFim); fim.setHours(23, 59, 59, 999); if (d > fim) return false; }
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (histNegOrdem === "data_desc") return (b.data || "").localeCompare(a.data || "");
      if (histNegOrdem === "data_asc") return (a.data || "").localeCompare(b.data || "");
      if (histNegOrdem === "acao_asc") return a.acao.localeCompare(b.acao);
      return b.acao.localeCompare(a.acao);
    });
  }, [historicoNegociacoes, histNegDataInicio, histNegDataFim, histNegResponsavel, histNegBusca, histNegOrdem]);

  const addHistorico = (key: string, acao: string, responsavel?: string, observacao?: string) => {
    const entry = { key, acao, responsavel, observacao, data: format(new Date(), "yyyy-MM-dd'T'HH:mm") };
    setHistoricoNegociacoes(prev => {
      const updated = [entry, ...prev].slice(0, 100);
      localStorage.setItem("aging_negociacoes_historico", JSON.stringify(updated));
      return updated;
    });
  };

  const totalNegociacoes = useMemo(() => Object.values(negociacoes).filter(n => n.ativo).length, [negociacoes]);

  const negociacoesAtivas = useMemo(() => {
    return Object.entries(negociacoes).filter(([, v]) => v.ativo).map(([k, v]) => ({ key: k, ...v }));
  }, [negociacoes]);

  // KPIs de negociação
  const negociacaoKPIs = useMemo(() => {
    const ativas = negociacoesAtivas;
    const resolvidas = Object.entries(negociacoes).filter(([, v]) => !v.ativo && v.data);
    const totalValor = ativas.reduce((s, n) => {
      const parts = n.key.split("-");
      const valStr = parts[parts.length - 1];
      return s + (parseFloat(valStr) || 0);
    }, 0);
    const agora = new Date();
    const diasAbertos = ativas.map(n => n.data ? differenceInDays(agora, new Date(n.data)) : 0);
    const tempoMedio = diasAbertos.length > 0 ? Math.round(diasAbertos.reduce((a, b) => a + b, 0) / diasAbertos.length) : 0;
    const totalHistorico = new Set(historicoNegociacoes.map(h => h.key)).size;
    const resolvidasKeys = new Set(resolvidas.map(([k]) => k));
    const taxaResolucao = totalHistorico > 0 ? Math.round((resolvidasKeys.size / totalHistorico) * 100) : 0;
    const vencidas15d = ativas.filter(n => n.data && differenceInDays(agora, new Date(n.data)) > 15);
    return { totalValor, tempoMedio, taxaResolucao, vencidas15d, total: ativas.length };
  }, [negociacoesAtivas, negociacoes, historicoNegociacoes]);

  // Alerta automático: negociações > 15 dias sem atualização
  const negAlertRef = useRef(false);
  useEffect(() => {
    if (negAlertRef.current || negociacaoKPIs.vencidas15d.length === 0) return;
    negAlertRef.current = true;
    const lastAlert = localStorage.getItem("aging_neg_15d_last_alert");
    const hoje = format(new Date(), "yyyy-MM-dd");
    if (lastAlert === hoje) return;
    localStorage.setItem("aging_neg_15d_last_alert", hoje);
    toast.warning(`${negociacaoKPIs.vencidas15d.length} negociação(ões) sem atualização há mais de 15 dias`, {
      description: "Parcelas em negociação prolongada requerem acompanhamento.",
      duration: 10000,
      action: { label: "Ver detalhes", onClick: () => setShowHistoricoNeg(true) },
    });
  }, [negociacaoKPIs]);

  const toggleNegociacao = (key: string) => {
    const current = negociacoes[key];
    if (current?.ativo) {
      setNegociacoes(prev => {
        const updated = { ...prev, [key]: { ...prev[key], ativo: false } };
        localStorage.setItem("aging_negociacoes", JSON.stringify(updated));
        toast.success("Marcação de negociação removida");
        return updated;
      });
      addHistorico(key, "Negociação removida", current.responsavel);
    } else {
      setNegociacaoEditMode("new");
      setNegociacaoEditKey(key);
      setNegociacaoForm({ observacao: current?.observacao || "", responsavel: current?.responsavel || "", statusNeg: current?.statusNeg || "em_andamento" });
    }
  };

  const editarNegociacao = (key: string) => {
    const current = negociacoes[key];
    if (!current?.ativo) return;
    setNegociacaoEditMode("edit");
    setNegociacaoEditKey(key);
    setNegociacaoForm({ observacao: current.observacao || "", responsavel: current.responsavel || "", statusNeg: current.statusNeg || "em_andamento" });
  };

  const confirmarNegociacao = () => {
    if (!negociacaoEditKey) return;
    const isEdit = negociacaoEditMode === "edit";
    const existing = negociacoes[negociacaoEditKey];
    const oldStatus = existing?.statusNeg || "em_andamento";
    const newStatus = negociacaoForm.statusNeg;
    const statusMudou = isEdit && oldStatus !== newStatus;

    setNegociacoes(prev => {
      const updated = {
        ...prev,
        [negociacaoEditKey]: {
          ativo: true,
          observacao: negociacaoForm.observacao,
          responsavel: negociacaoForm.responsavel,
          statusNeg: newStatus,
          data: isEdit && existing?.data ? existing.data : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        },
      };
      localStorage.setItem("aging_negociacoes", JSON.stringify(updated));
      toast.success(isEdit ? "Negociação atualizada" : "Parcela marcada como em negociação");
      return updated;
    });

    // Log and notify on status change
    if (statusMudou) {
      const deLabel = NEG_STATUS_LABELS[oldStatus];
      const paraLabel = NEG_STATUS_LABELS[newStatus];
      addHistorico(negociacaoEditKey, `Status alterado: ${deLabel} → ${paraLabel}`, negociacaoForm.responsavel, negociacaoForm.observacao);
      toast.info(`Status alterado: ${deLabel} → ${paraLabel}`, {
        description: `Responsável: ${negociacaoForm.responsavel || "Não informado"}`,
        duration: 6000,
      });
    } else {
      addHistorico(negociacaoEditKey, isEdit ? "Negociação atualizada" : "Negociação iniciada", negociacaoForm.responsavel, negociacaoForm.observacao);
    }

    setNegociacaoEditKey(null);
  };

  // Evolução semanal de negociações (últimas 8 semanas)
  const evolucaoNegociacoes = useMemo(() => {
    if (historicoNegociacoes.length === 0) return [];
    const agora = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const semEnd = subDays(agora, i * 7);
      const semStart = subDays(semEnd, 6);
      semStart.setHours(0, 0, 0, 0);
      semEnd.setHours(23, 59, 59, 999);
      const label = `${format(semStart, "dd/MM")}`;
      let abertas = 0;
      let resolvidas = 0;
      historicoNegociacoes.forEach(h => {
        const d = new Date(h.data);
        if (d >= semStart && d <= semEnd) {
          if (h.acao.includes("iniciada")) abertas++;
          else if (h.acao.includes("removida")) resolvidas++;
        }
      });
      return { semana: label, abertas, resolvidas };
    }).reverse();
  }, [historicoNegociacoes]);

  const handleLimiarChange = (val: number[]) => {
    setLimiarAlerta(val[0]);
    localStorage.setItem("limiar_alerta_financeiro", String(val[0]));
  };

  const dados = useMemo(() => {
    try {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      // Contas a pagar
      const contasPagar = JSON.parse(localStorage.getItem("contas_pagar") || "[]");
      let totalPagar = 0;
      let vencidas = 0;
      let totalVencido = 0;
      contasPagar.forEach((c: any) => {
        if (c.status === "cancelada" || c.status === "paga") return;
        (c.parcelas || []).forEach((p: any) => {
          if (p.status === "paga") return;
          const val = p.valor - (p.valorPago || 0);
          totalPagar += val;
          const venc = new Date(p.vencimento);
          if (venc < hoje) { vencidas++; totalVencido += val; }
        });
      });

      // Contas a receber
      const contasReceber = JSON.parse(localStorage.getItem("contas_receber") || "[]");
      let totalReceber = 0;
      let receberVencido = 0;
      contasReceber.forEach((c: any) => {
        if (c.status === "cancelada" || c.status === "recebida") return;
        (c.parcelas || []).forEach((p: any) => {
          if (p.status === "recebida") return;
          const val = p.valor - (p.valorRecebido || 0);
          totalReceber += val;
          const venc = new Date(p.vencimento);
          if (venc < hoje) receberVencido += val;
        });
      });

      // Fluxo simplificado: últimos 6 meses
      const fluxoMensal = Array.from({ length: 6 }, (_, i) => {
        const mesDate = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
        const mesEnd = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i) + 1, 0);
        const label = format(mesDate, "MMM/yy", { locale: ptBR });

        let entradas = 0;
        let saidas = 0;

        contasReceber.forEach((c: any) => {
          (c.parcelas || []).forEach((p: any) => {
            if (p.status !== "recebida") return;
            const d = new Date(p.dataRecebimento || p.vencimento);
            if (d >= mesDate && d <= mesEnd) entradas += p.valorRecebido || p.valor;
          });
        });

        contasPagar.forEach((c: any) => {
          (c.parcelas || []).forEach((p: any) => {
            if (p.status !== "paga") return;
            const d = new Date(p.dataPagamento || p.vencimento);
            if (d >= mesDate && d <= mesEnd) saidas += p.valorPago || p.valor;
          });
        });

        return { mes: label, entradas, saidas, saldo: entradas - saidas };
      });

      // ===== Previsão 30 dias =====
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(0, 0, 0, 0);
      const fim30 = new Date(amanha);
      fim30.setDate(fim30.getDate() + 30);

      // Agrupar por semana
      const previsaoSemanal: { semana: string; entradas: number; saidas: number; saldo: number }[] = [];
      for (let w = 0; w < 4; w++) {
        const semStart = new Date(amanha);
        semStart.setDate(semStart.getDate() + w * 7);
        const semEnd = new Date(semStart);
        semEnd.setDate(semEnd.getDate() + 6);
        semEnd.setHours(23, 59, 59, 999);
        const label = `${format(semStart, "dd/MM")} - ${format(semEnd, "dd/MM")}`;

        let entradas = 0;
        let saidas = 0;

        contasReceber.forEach((c: any) => {
          if (c.status === "cancelada" || c.status === "recebida") return;
          (c.parcelas || []).forEach((p: any) => {
            if (p.status === "recebida") return;
            const venc = new Date(p.vencimento);
            if (venc >= semStart && venc <= semEnd) entradas += p.valor - (p.valorRecebido || 0);
          });
        });

        contasPagar.forEach((c: any) => {
          if (c.status === "cancelada" || c.status === "paga") return;
          (c.parcelas || []).forEach((p: any) => {
            if (p.status === "paga") return;
            const venc = new Date(p.vencimento);
            if (venc >= semStart && venc <= semEnd) saidas += p.valor - (p.valorPago || 0);
          });
        });

        previsaoSemanal.push({ semana: label, entradas, saidas, saldo: entradas - saidas });
      }

      const previsaoTotalEntradas = previsaoSemanal.reduce((s, w) => s + w.entradas, 0);
      const previsaoTotalSaidas = previsaoSemanal.reduce((s, w) => s + w.saidas, 0);
      const previsaoSaldoFinal = previsaoTotalEntradas - previsaoTotalSaidas;

      // Saldo realizado últimos 30 dias (para tendência) — agrupado por semana para comparativo
      const inicio30passado = subDays(hoje, 30);
      let saldo30passadoEntradas = 0;
      let saldo30passadoSaidas = 0;

      const realizadoSemanal: { semana: string; entradas: number; saidas: number; saldo: number }[] = [];
      for (let w = 0; w < 4; w++) {
        const semEnd = subDays(hoje, w * 7);
        const semStart = subDays(semEnd, 6);
        semStart.setHours(0, 0, 0, 0);
        const label = `${format(semStart, "dd/MM")} - ${format(semEnd, "dd/MM")}`;
        let ent = 0;
        let sai = 0;
        contasReceber.forEach((c: any) => {
          (c.parcelas || []).forEach((p: any) => {
            if (p.status !== "recebida") return;
            const d = new Date(p.dataRecebimento || p.vencimento);
            if (d >= semStart && d <= semEnd) ent += p.valorRecebido || p.valor;
          });
        });
        contasPagar.forEach((c: any) => {
          (c.parcelas || []).forEach((p: any) => {
            if (p.status !== "paga") return;
            const d = new Date(p.dataPagamento || p.vencimento);
            if (d >= semStart && d <= semEnd) sai += p.valorPago || p.valor;
          });
        });
        saldo30passadoEntradas += ent;
        saldo30passadoSaidas += sai;
        realizadoSemanal.unshift({ semana: label, entradas: ent, saidas: sai, saldo: ent - sai });
      }

      const saldo30passado = saldo30passadoEntradas - saldo30passadoSaidas;
      const tendenciaFinanceira = previsaoSaldoFinal - saldo30passado;

      // Dados comparativos lado a lado
      const comparativoData = Array.from({ length: 4 }, (_, i) => ({
        semana: `Sem ${i + 1}`,
        realizadoEnt: realizadoSemanal[i]?.entradas || 0,
        realizadoSai: realizadoSemanal[i]?.saidas || 0,
        realizadoSaldo: realizadoSemanal[i]?.saldo || 0,
        previstoEnt: previsaoSemanal[i]?.entradas || 0,
        previstoSai: previsaoSemanal[i]?.saidas || 0,
        previstoSaldo: previsaoSemanal[i]?.saldo || 0,
      }));

      const saldoAtual = totalReceber - totalPagar;

      // ===== Aging report (faixas de atraso) =====
      type AgingParcela = { tipo: "pagar" | "receber"; nome: string; descricao: string; vencimento: string; valor: number; diasAtraso: number };
      const agingPagar = { ate7: 0, ate15: 0, ate30: 0, ate60: 0, acima60: 0, ate7Val: 0, ate15Val: 0, ate30Val: 0, ate60Val: 0, acima60Val: 0 };
      const agingReceber = { ate7: 0, ate15: 0, ate30: 0, ate60: 0, acima60: 0, ate7Val: 0, ate15Val: 0, ate30Val: 0, ate60Val: 0, acima60Val: 0 };
      const agingParcelas: Record<string, AgingParcela[]> = {
        "1-7 dias": [], "8-15 dias": [], "16-30 dias": [], "31-60 dias": [], "> 60 dias": [],
      };

      const classifyAging = (aging: typeof agingPagar, dias: number, val: number) => {
        if (dias <= 7) { aging.ate7++; aging.ate7Val += val; }
        else if (dias <= 15) { aging.ate15++; aging.ate15Val += val; }
        else if (dias <= 30) { aging.ate30++; aging.ate30Val += val; }
        else if (dias <= 60) { aging.ate60++; aging.ate60Val += val; }
        else { aging.acima60++; aging.acima60Val += val; }
      };

      const getFaixaKey = (dias: number) => dias <= 7 ? "1-7 dias" : dias <= 15 ? "8-15 dias" : dias <= 30 ? "16-30 dias" : dias <= 60 ? "31-60 dias" : "> 60 dias";

      contasPagar.forEach((c: any) => {
        if (c.status === "cancelada" || c.status === "paga") return;
        (c.parcelas || []).forEach((p: any) => {
          if (p.status === "paga") return;
          const venc = new Date(p.vencimento);
          if (venc < hoje) {
            const dias = differenceInDays(hoje, venc);
            const val = p.valor - (p.valorPago || 0);
            classifyAging(agingPagar, dias, val);
            agingParcelas[getFaixaKey(dias)].push({ tipo: "pagar", nome: c.fornecedor || c.descricao || "—", descricao: c.descricao || "", vencimento: p.vencimento, valor: val, diasAtraso: dias });
          }
        });
      });

      contasReceber.forEach((c: any) => {
        if (c.status === "cancelada" || c.status === "recebida") return;
        (c.parcelas || []).forEach((p: any) => {
          if (p.status === "recebida") return;
          const venc = new Date(p.vencimento);
          if (venc < hoje) {
            const dias = differenceInDays(hoje, venc);
            const val = p.valor - (p.valorRecebido || 0);
            classifyAging(agingReceber, dias, val);
            agingParcelas[getFaixaKey(dias)].push({ tipo: "receber", nome: c.cliente || c.descricao || "—", descricao: c.descricao || "", vencimento: p.vencimento, valor: val, diasAtraso: dias });
          }
        });
      });

      // Sort parcelas by diasAtraso desc
      Object.values(agingParcelas).forEach(arr => arr.sort((a, b) => b.diasAtraso - a.diasAtraso));

      const agingFaixas = [
        { faixa: "1-7 dias", pagarQtd: agingPagar.ate7, pagarVal: agingPagar.ate7Val, receberQtd: agingReceber.ate7, receberVal: agingReceber.ate7Val },
        { faixa: "8-15 dias", pagarQtd: agingPagar.ate15, pagarVal: agingPagar.ate15Val, receberQtd: agingReceber.ate15, receberVal: agingReceber.ate15Val },
        { faixa: "16-30 dias", pagarQtd: agingPagar.ate30, pagarVal: agingPagar.ate30Val, receberQtd: agingReceber.ate30, receberVal: agingReceber.ate30Val },
        { faixa: "31-60 dias", pagarQtd: agingPagar.ate60, pagarVal: agingPagar.ate60Val, receberQtd: agingReceber.ate60, receberVal: agingReceber.ate60Val },
        { faixa: "> 60 dias", pagarQtd: agingPagar.acima60, pagarVal: agingPagar.acima60Val, receberQtd: agingReceber.acima60, receberVal: agingReceber.acima60Val },
      ];
      const hasAging = agingFaixas.some(f => f.pagarQtd > 0 || f.receberQtd > 0);

      // ===== Evolução da inadimplência últimos 6 meses =====
      const evolucaoInadimplencia = Array.from({ length: 6 }, (_, i) => {
        const mesDate = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
        const mesEnd = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i) + 1, 0);
        mesEnd.setHours(23, 59, 59, 999);
        const label = format(mesDate, "MMM/yy", { locale: ptBR });
        let inadPagar = 0;
        let inadReceber = 0;

        contasPagar.forEach((c: any) => {
          if (c.status === "cancelada" || c.status === "paga") return;
          (c.parcelas || []).forEach((p: any) => {
            if (p.status === "paga") return;
            const venc = new Date(p.vencimento);
            if (venc >= mesDate && venc <= mesEnd && venc < hoje) {
              inadPagar += p.valor - (p.valorPago || 0);
            }
          });
        });

        contasReceber.forEach((c: any) => {
          if (c.status === "cancelada" || c.status === "recebida") return;
          (c.parcelas || []).forEach((p: any) => {
            if (p.status === "recebida") return;
            const venc = new Date(p.vencimento);
            if (venc >= mesDate && venc <= mesEnd && venc < hoje) {
              inadReceber += p.valor - (p.valorRecebido || 0);
            }
          });
        });

        return { mes: label, pagar: inadPagar, receber: inadReceber, total: inadPagar + inadReceber };
      });

      return {
        totalPagar, totalReceber, vencidas, totalVencido, receberVencido, saldoAtual, fluxoMensal,
        previsaoSemanal, previsaoTotalEntradas, previsaoTotalSaidas, previsaoSaldoFinal,
        saldo30passado, saldo30passadoEntradas, saldo30passadoSaidas, tendenciaFinanceira,
        realizadoSemanal, comparativoData, agingFaixas, hasAging, agingParcelas, evolucaoInadimplencia,
      };
    } catch { return null; }
  }, []);

  // Alerta automático: saldo projetado negativo
  const finNotifiedRef = useRef(false);
  useEffect(() => {
    if (!finNotifiedRef.current && dados && dados.previsaoSaldoFinal < limiarAlerta) {
      finNotifiedRef.current = true;
      const msg = limiarAlerta === 0
        ? `Saldo projetado negativo nos próximos 30 dias: ${formatBRL(dados.previsaoSaldoFinal)}`
        : `Saldo projetado (${formatBRL(dados.previsaoSaldoFinal)}) abaixo do limiar de ${formatBRL(limiarAlerta)}`;
      toast.error(msg, {
        description: `Entradas previstas: ${formatBRL(dados.previsaoTotalEntradas)} · Saídas previstas: ${formatBRL(dados.previsaoTotalSaidas)}`,
        duration: 10000,
        action: {
          label: "Ver fluxo",
          onClick: () => navigate("/financeiro/fluxo-caixa"),
        },
      });
    }
  }, [dados, navigate]);

  // Alerta diário: parcelas vencidas > 30 dias
  const agingNotifiedRef = useRef(false);
  useEffect(() => {
    if (agingNotifiedRef.current || !dados || !dados.hasAging) return;
    const criticas = (dados.agingFaixas[3]?.pagarQtd || 0) + (dados.agingFaixas[3]?.receberQtd || 0)
      + (dados.agingFaixas[4]?.pagarQtd || 0) + (dados.agingFaixas[4]?.receberQtd || 0);
    if (criticas === 0) return;
    const lastNotif = localStorage.getItem("aging_critico_last_notif");
    const hoje = format(new Date(), "yyyy-MM-dd");
    if (lastNotif === hoje) return;
    agingNotifiedRef.current = true;
    localStorage.setItem("aging_critico_last_notif", hoje);
    const valCritico = (dados.agingFaixas[3]?.pagarVal || 0) + (dados.agingFaixas[3]?.receberVal || 0)
      + (dados.agingFaixas[4]?.pagarVal || 0) + (dados.agingFaixas[4]?.receberVal || 0);
    toast.warning(`${criticas} parcela(s) vencida(s) há mais de 30 dias (${formatBRL(valCritico)})`, {
      description: "Atenção: títulos com atraso superior a 30 dias requerem ação imediata.",
      duration: 12000,
      action: { label: "Ver contas", onClick: () => navigate("/financeiro/contas-pagar") },
    });
  }, [dados, navigate]);

  const buildHistoricoNegPDF = () => {
    const rows = historicoNegociacoes.slice(0, 20).map(h => {
      const hp = h.key.split("-");
      const ht = hp[0] === "pagar" ? "PG" : "RC";
      const hn = hp.slice(1, -2).join("-");
      return {
        cells: [
          "[" + ht + "] " + hn,
          h.acao,
          h.responsavel || "—",
          h.data ? format(new Date(h.data), "dd/MM/yy HH:mm") : "—",
          h.observacao || "—",
        ],
      };
    });
    return '<h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">📋 Histórico de Negociações</h3>' +
      buildPrintTable(
        [
          { label: "Parcela", align: "left" as const },
          { label: "Ação", align: "left" as const },
          { label: "Responsável", align: "left" as const },
          { label: "Data", align: "center" as const },
          { label: "Observação", align: "left" as const },
        ],
        rows
      );
  };

  const buildEvolucaoNegPDF = () => {
    const filtered = evolucaoNegociacoes.filter(e => e.abertas > 0 || e.resolvidas > 0);
    return '<h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">📊 Evolução Semanal de Negociações</h3>' +
      buildPrintTable(
        [
          { label: "Semana", align: "left" as const },
          { label: "Abertas", align: "right" as const },
          { label: "Resolvidas", align: "right" as const },
        ],
        filtered.map(e => ({ cells: [e.semana, String(e.abertas), String(e.resolvidas)] }))
      );
  };

  const handleExportFinanceiroPDF = () => {
    if (!dados) return;
    const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const content = `
      <div class="info-grid">
        <div class="info-box"><div class="label">A Receber</div><div class="value" style="color:#16a34a">${formatBRL(dados.totalReceber)}</div></div>
        <div class="info-box"><div class="label">A Pagar</div><div class="value" style="color:#dc2626">${formatBRL(dados.totalPagar)}</div></div>
        <div class="info-box"><div class="label">Saldo Projetado</div><div class="value" style="color:${dados.saldoAtual >= 0 ? '#16a34a' : '#dc2626'}">${formatBRL(dados.saldoAtual)}</div></div>
        <div class="info-box"><div class="label">Inadimplência</div><div class="value" style="color:${dados.totalVencido > 0 ? '#dc2626' : '#16a34a'}">${formatBRL(dados.totalVencido)}</div></div>
      </div>
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Fluxo de Caixa — Últimos 6 Meses</h3>
      ${buildPrintTable(
        [
          { label: "Mês", align: "left" as const },
          { label: "Entradas", align: "right" as const },
          { label: "Saídas", align: "right" as const },
          { label: "Saldo", align: "right" as const },
        ],
        dados.fluxoMensal.map(m => ({
          cells: [m.mes, formatBRL(m.entradas), formatBRL(m.saidas), formatBRL(m.saldo)],
          className: m.saldo < 0 ? "negative" : "",
        }))
      )}
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Previsão — Próximos 30 Dias</h3>
      ${buildPrintTable(
        [
          { label: "Semana", align: "left" as const },
          { label: "Entradas Prev.", align: "right" as const },
          { label: "Saídas Prev.", align: "right" as const },
          { label: "Saldo Prev.", align: "right" as const },
        ],
        [
          ...dados.previsaoSemanal.map(w => ({
            cells: [w.semana, formatBRL(w.entradas), formatBRL(w.saidas), formatBRL(w.saldo)],
            className: w.saldo < 0 ? "negative" : "",
          })),
          {
            cells: ["TOTAL 30 DIAS", formatBRL(dados.previsaoTotalEntradas), formatBRL(dados.previsaoTotalSaidas), formatBRL(dados.previsaoSaldoFinal)],
            className: "total-row",
          },
        ]
      )}
      <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Comparativo: Realizado vs Previsto (Semanal)</h3>
      ${buildPrintTable(
        [
          { label: "Semana", align: "left" as const },
          { label: "Ent. Real.", align: "right" as const },
          { label: "Ent. Prev.", align: "right" as const },
          { label: "Saldo Real.", align: "right" as const },
          { label: "Saldo Prev.", align: "right" as const },
        ],
        dados.comparativoData.map(c => ({
          cells: [c.semana, formatBRL(c.realizadoEnt), formatBRL(c.previstoEnt), formatBRL(c.realizadoSaldo), formatBRL(c.previstoSaldo)],
        }))
      )}
      <p style="font-size:11px;margin-top:10px;color:#666;">Limiar de alerta financeiro: ${formatBRL(limiarAlerta)}</p>
      ${negociacoesAtivas.length > 0 ? `
        <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">🤝 Parcelas em Negociação (${negociacoesAtivas.length})</h3>
        ${buildPrintTable(
          [
            { label: "Parcela", align: "left" as const },
            { label: "Status", align: "left" as const },
            { label: "Responsável", align: "left" as const },
            { label: "Data", align: "center" as const },
            { label: "Observação", align: "left" as const },
          ],
          negociacoesAtivas.map(n => {
            const parts = n.key.split("-");
            const tipo = parts[0] === "pagar" ? "PG" : "RC";
            const nome = parts.slice(1, -2).join("-");
            const stLabel = NEG_STATUS_LABELS[n.statusNeg || "em_andamento"];
            return {
              cells: [
                "[" + tipo + "] " + nome,
                stLabel,
                n.responsavel || "—",
                n.data ? format(new Date(n.data), "dd/MM/yy HH:mm") : "—",
                n.observacao || "—",
              ],
            };
          })
        )}
      ` : ""}
      ${historicoNegociacoes.length > 0 ? buildHistoricoNegPDF() : ""}
      ${evolucaoNegociacoes.some(e => e.abertas > 0 || e.resolvidas > 0) ? buildEvolucaoNegPDF() : ""}
    `;
    printPDF({
      title: "Resumo Financeiro Consolidado",
      subtitle: `Gerado em ${timestamp}`,
      content,
    });
  };

  const handleExportFinanceiroExcel = () => {
    if (!dados) return;
    const timestamp = format(new Date(), "dd-MM-yyyy_HH-mm");

    // Sheet 1: Resumo
    const resumoData = [
      { item: "A Receber", valor: dados.totalReceber },
      { item: "A Pagar", valor: dados.totalPagar },
      { item: "Saldo Projetado", valor: dados.saldoAtual },
      { item: "Inadimplência (Pagar)", valor: dados.totalVencido },
      { item: "Inadimplência (Receber)", valor: dados.receberVencido },
      { item: "Limiar Alerta", valor: limiarAlerta },
    ];

    // Sheet 2: Fluxo mensal + previsão + comparativo + aging
    const allRows: Record<string, any>[] = [];

    // Fluxo mensal
    dados.fluxoMensal.forEach(m => allRows.push({ secao: "Fluxo 6 Meses", periodo: m.mes, entradas: m.entradas, saidas: m.saidas, saldo: m.saldo }));
    // Previsão
    dados.previsaoSemanal.forEach(w => allRows.push({ secao: "Previsão 30 Dias", periodo: w.semana, entradas: w.entradas, saidas: w.saidas, saldo: w.saldo }));
    // Comparativo
    dados.comparativoData.forEach(c => allRows.push({ secao: "Comparativo", periodo: c.semana, entradas: c.realizadoEnt, saidas: c.realizadoSai, saldo: c.realizadoSaldo, entradasPrev: c.previstoEnt, saidasPrev: c.previstoSai, saldoPrev: c.previstoSaldo }));
    // Aging
    dados.agingFaixas.forEach(f => allRows.push({ secao: "Aging Report", periodo: f.faixa, pagarQtd: f.pagarQtd, pagarVal: f.pagarVal, receberQtd: f.receberQtd, receberVal: f.receberVal }));

    const columns: ExportColumn[] = [
      { header: "Seção", key: "secao" },
      { header: "Período/Faixa", key: "periodo" },
      { header: "Entradas", key: "entradas", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Saídas", key: "saidas", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Saldo", key: "saldo", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Ent. Previstas", key: "entradasPrev", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Saídas Prev.", key: "saidasPrev", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Saldo Prev.", key: "saldoPrev", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Pagar Qtd", key: "pagarQtd", format: (v) => v != null ? String(v) : "" },
      { header: "Pagar Valor", key: "pagarVal", format: (v) => v != null ? formatBRL(v) : "" },
      { header: "Receber Qtd", key: "receberQtd", format: (v) => v != null ? String(v) : "" },
      { header: "Receber Valor", key: "receberVal", format: (v) => v != null ? formatBRL(v) : "" },
    ];

    exportExcel({
      title: "Resumo Financeiro",
      filename: `resumo-financeiro-${timestamp}`,
      columns,
      data: allRows,
      summaryRows: resumoData.map(r => ({ label: r.item, value: formatBRL(r.valor) })),
    });
    toast.success("Excel exportado com sucesso!");
  };

  const handleShareWhatsApp = () => {
    if (!dados) return;
    const ts = format(new Date(), "dd/MM/yyyy HH:mm");
    let text = `🔷 *NexusERP*\n`;
    text += `━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Resumo Financeiro Consolidado*\n`;
    text += `📅 _${ts}_\n`;
    text += `━━━━━━━━━━━━━━━━\n\n`;
    text += `📊 *Indicadores:*\n`;
    text += `• A Receber: *${formatBRL(dados.totalReceber)}*\n`;
    text += `• A Pagar: *${formatBRL(dados.totalPagar)}*\n`;
    text += `• Saldo Projetado: *${formatBRL(dados.saldoAtual)}*\n`;
    text += `• Inadimplência (Pagar): *${formatBRL(dados.totalVencido)}*\n`;
    text += `• Inadimplência (Receber): *${formatBRL(dados.receberVencido)}*\n\n`;
    text += `📅 *Previsão 30 dias:*\n`;
    text += `• Entradas: *${formatBRL(dados.previsaoTotalEntradas)}*\n`;
    text += `• Saídas: *${formatBRL(dados.previsaoTotalSaidas)}*\n`;
    text += `• Saldo: *${formatBRL(dados.previsaoSaldoFinal)}*\n`;
    if (dados.tendenciaFinanceira !== 0) {
      text += `• Tendência: *${dados.tendenciaFinanceira > 0 ? "↑" : "↓"} ${formatBRL(dados.tendenciaFinanceira)}* vs 30d ant.\n`;
    }
    if (dados.hasAging) {
      text += `\n⏰ *Aging Report:*\n`;
      dados.agingFaixas.filter(f => f.pagarQtd > 0 || f.receberQtd > 0).forEach(f => {
        const parts: string[] = [];
        if (f.pagarQtd > 0) parts.push(`Pagar: ${f.pagarQtd}x ${formatBRL(f.pagarVal)}`);
        if (f.receberQtd > 0) parts.push(`Receber: ${f.receberQtd}x ${formatBRL(f.receberVal)}`);
        text += `• ${f.faixa}: ${parts.join(" | ")}\n`;
      });
    }
    if (negociacoesAtivas.length > 0) {
      text += `\n🤝 *Parcelas em Negociação (${negociacoesAtivas.length}):*\n`;
      negociacoesAtivas.forEach(n => {
        const parts = n.key.split("-");
        const tipo = parts[0] === "pagar" ? "PG" : "RC";
        const nome = parts.slice(1, -2).join("-");
        text += `• [${tipo}] ${nome}`;
        const st = n.statusNeg || "em_andamento";
        const stLabel = st === "acordo_fechado" ? "✅ Acordo" : st === "sem_acordo" ? "❌ Sem acordo" : "🔄 Em andamento";
        text += ` ${stLabel}`;
        if (n.responsavel) text += ` — _${n.responsavel}_`;
        if (n.data) text += ` (${format(new Date(n.data), "dd/MM/yy")})`;
        if (n.observacao) text += `\n  📝 ${n.observacao}`;
        text += `\n`;
      });
    }
    if (historicoNegociacoes.length > 0) {
      text += `\n📋 *Histórico (últimos ${Math.min(historicoNegociacoes.length, 10)}):*\n`;
      historicoNegociacoes.slice(0, 10).forEach(h => {
        const hp = h.key.split("-");
        const ht = hp[0] === "pagar" ? "PG" : "RC";
        const hn = hp.slice(1, -2).join("-");
        text += `• [${ht}] ${hn} — ${h.acao}`;
        if (h.responsavel) text += ` (${h.responsavel})`;
        if (h.data) text += ` ${format(new Date(h.data), "dd/MM/yy")}`;
        text += `\n`;
      });
    }
    text += `\n━━━━━━━━━━━━━━━━\n`;
    text += `_Relatório gerado por NexusERP em ${ts}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // moved above early returns for hooks rules

  if (!dados) return null;
  if (dados.totalPagar === 0 && dados.totalReceber === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-primary" /> Resumo Financeiro
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleExportFinanceiroPDF} title="Exportar PDF">
                <Printer size={13} className="mr-1" /> PDF
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleExportFinanceiroExcel} title="Exportar Excel">
                <FileSpreadsheet size={13} className="mr-1" /> Excel
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleShareWhatsApp} title="Enviar por WhatsApp">
                <MessageCircle size={13} className="mr-1" /> WhatsApp
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/financeiro/fluxo-caixa")}>
                Fluxo de caixa <ArrowUpRight size={12} className="ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">A Receber</p>
              <p className="text-lg font-bold text-primary">{formatBRL(dados.totalReceber)}</p>
              {dados.receberVencido > 0 && <p className="text-[10px] text-destructive">{formatBRL(dados.receberVencido)} vencido</p>}
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">A Pagar</p>
              <p className="text-lg font-bold text-destructive">{formatBRL(dados.totalPagar)}</p>
              {dados.vencidas > 0 && <p className="text-[10px] text-destructive">{dados.vencidas} parcela(s) vencida(s)</p>}
            </div>
            <div className="text-center p-2 rounded-lg border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo Projetado</p>
              <p className={cn("text-lg font-bold", dados.saldoAtual >= 0 ? "text-primary" : "text-destructive")}>
                {formatBRL(dados.saldoAtual)}
              </p>
            </div>
            <div className="text-center p-2 rounded-lg border border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inadimplência</p>
              <p className={cn("text-lg font-bold", dados.totalVencido > 0 ? "text-destructive" : "text-primary")}>
                {formatBRL(dados.totalVencido)}
              </p>
            </div>
          </div>

          {/* Fluxo mensal simplificado */}
          {dados.fluxoMensal.some(m => m.entradas > 0 || m.saidas > 0) && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">Fluxo de Caixa — Últimos 6 meses:</p>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados.fluxoMensal} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="mes" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                      formatter={(v: number, name: string) => [formatBRL(v), name === "entradas" ? "Entradas" : name === "saidas" ? "Saídas" : "Saldo"]}
                    />
                    <Bar dataKey="entradas" name="entradas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={16} />
                    <Bar dataKey="saidas" name="saidas" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} barSize={16} />
                    <Line type="monotone" dataKey="saldo" name="saldo" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Previsão 30 dias */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">📅 Previsão — Próximos 30 dias</p>
              <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 gap-1" onClick={() => setShowPrevisao(!showPrevisao)}>
                {showPrevisao ? "Ocultar" : "Detalhes"} {showPrevisao ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-muted-foreground uppercase">Entradas Prev.</p>
                <p className="text-sm font-bold text-primary">{formatBRL(dados.previsaoTotalEntradas)}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                <p className="text-[10px] text-muted-foreground uppercase">Saídas Prev.</p>
                <p className="text-sm font-bold text-destructive">{formatBRL(dados.previsaoTotalSaidas)}</p>
              </div>
              <div className="text-center p-2 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase">Saldo Prev.</p>
                <p className={cn("text-sm font-bold", dados.previsaoSaldoFinal >= 0 ? "text-primary" : "text-destructive")}>
                  {formatBRL(dados.previsaoSaldoFinal)}
                </p>
                {/* Trend indicator vs últimos 30 dias */}
                <div className={cn("flex items-center justify-center gap-0.5 text-[10px] font-semibold mt-0.5",
                  dados.tendenciaFinanceira > 0 ? "text-primary" : dados.tendenciaFinanceira < 0 ? "text-destructive" : "text-muted-foreground"
                )}>
                  {dados.tendenciaFinanceira > 0 ? <TrendingUp size={10} /> : dados.tendenciaFinanceira < 0 ? <TrendingDown size={10} /> : null}
                  {dados.tendenciaFinanceira !== 0
                    ? `${dados.tendenciaFinanceira > 0 ? "+" : ""}${formatBRL(dados.tendenciaFinanceira)} vs 30d ant.`
                    : "Estável vs 30d ant."
                  }
                </div>
              </div>
            </div>

            {showPrevisao && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                {/* Weekly forecast chart */}
                <div className="h-[120px] mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dados.previsaoSemanal} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="semana" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                        formatter={(v: number, name: string) => [formatBRL(v), name === "entradas" ? "Entradas" : name === "saidas" ? "Saídas" : "Saldo"]}
                      />
                      <Bar dataKey="entradas" name="entradas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={14} />
                      <Bar dataKey="saidas" name="saidas" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} barSize={14} />
                      <Line type="monotone" dataKey="saldo" name="saldo" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {/* Weekly breakdown */}
                <div className="space-y-1">
                  {dados.previsaoSemanal.map((w, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 rounded-md text-[11px] border border-border bg-muted/20">
                      <span className="text-muted-foreground">{w.semana}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-medium">+{formatBRL(w.entradas)}</span>
                        <span className="text-destructive font-medium">-{formatBRL(w.saidas)}</span>
                        <span className={cn("font-bold", w.saldo >= 0 ? "text-primary" : "text-destructive")}>{formatBRL(w.saldo)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Gráfico Comparativo: Realizado vs Previsto */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">📊 Comparativo: Últimos 30 dias vs Próximos 30 dias</p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowLimiarConfig(!showLimiarConfig)} title="Configurar limiar de alerta">
                  <Settings2 size={11} />
                </Button>
                <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 gap-1" onClick={() => setShowComparativo(!showComparativo)}>
                  {showComparativo ? "Ocultar" : "Ver gráfico"} {showComparativo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </Button>
              </div>
            </div>

            {/* Resumo lado a lado */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="p-2 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground uppercase text-center mb-1">Últimos 30 dias (Realizado)</p>
                <div className="flex items-center justify-around text-[11px]">
                  <span className="text-primary font-bold">{formatBRL(dados.saldo30passadoEntradas)}</span>
                  <span className="text-destructive font-bold">{formatBRL(dados.saldo30passadoSaidas)}</span>
                </div>
                <p className={cn("text-center text-sm font-bold mt-1", dados.saldo30passado >= 0 ? "text-primary" : "text-destructive")}>
                  {formatBRL(dados.saldo30passado)}
                </p>
              </div>
              <div className="p-2 rounded-lg border border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground uppercase text-center mb-1">Próximos 30 dias (Previsto)</p>
                <div className="flex items-center justify-around text-[11px]">
                  <span className="text-primary font-bold">{formatBRL(dados.previsaoTotalEntradas)}</span>
                  <span className="text-destructive font-bold">{formatBRL(dados.previsaoTotalSaidas)}</span>
                </div>
                <p className={cn("text-center text-sm font-bold mt-1", dados.previsaoSaldoFinal >= 0 ? "text-primary" : "text-destructive")}>
                  {formatBRL(dados.previsaoSaldoFinal)}
                </p>
              </div>
            </div>

            {/* Limiar de alerta config */}
            {showLimiarConfig && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium">Limiar de Alerta Financeiro</span>
                    <p className="text-[10px] text-muted-foreground">Alerta quando saldo projetado ficar abaixo deste valor</p>
                  </div>
                  <span className="text-sm font-bold">{formatBRL(limiarAlerta)}</span>
                </div>
                <Slider
                  value={[limiarAlerta]}
                  onValueChange={handleLimiarChange}
                  min={-50000}
                  max={50000}
                  step={1000}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>-R$ 50.000</span>
                  <span>R$ 0</span>
                  <span>R$ 50.000</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-[10px]",
                    dados.previsaoSaldoFinal >= limiarAlerta ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"
                  )}>
                    {dados.previsaoSaldoFinal >= limiarAlerta ? "✅ Dentro do limiar" : "⚠️ Abaixo do limiar"}
                  </Badge>
                </div>
              </motion.div>
            )}

            {showComparativo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div className="h-[160px] mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dados.comparativoData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="semana" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                        formatter={(v: number, name: string) => {
                          const labels: Record<string, string> = {
                            realizadoSaldo: "Saldo Realizado",
                            previstoSaldo: "Saldo Previsto",
                            realizadoEnt: "Entradas Realizadas",
                            previstoEnt: "Entradas Previstas",
                          };
                          return [formatBRL(v), labels[name] || name];
                        }}
                      />
                      <Legend formatter={(v) => {
                        const labels: Record<string, string> = {
                          realizadoEnt: "Entradas Real.",
                          previstoEnt: "Entradas Prev.",
                          realizadoSaldo: "Saldo Real.",
                          previstoSaldo: "Saldo Prev.",
                        };
                        return labels[v] || v;
                      }} />
                      <Bar dataKey="realizadoEnt" name="realizadoEnt" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={12} opacity={0.7} />
                      <Bar dataKey="previstoEnt" name="previstoEnt" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={12} opacity={0.3} />
                      <Line type="monotone" dataKey="realizadoSaldo" name="realizadoSaldo" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="previstoSaldo" name="previstoSaldo" stroke="hsl(var(--foreground))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} opacity={0.5} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {/* Tabela comparativa */}
                <div className="space-y-1">
                  <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground font-medium px-1">
                    <span>Semana</span>
                    <span className="text-center">Ent. Real.</span>
                    <span className="text-center">Ent. Prev.</span>
                    <span className="text-center">Saldo Real.</span>
                    <span className="text-center">Saldo Prev.</span>
                  </div>
                  {dados.comparativoData.map((c, i) => (
                    <div key={i} className="grid grid-cols-5 gap-1 p-1.5 rounded-md text-[11px] border border-border bg-muted/20">
                      <span className="text-muted-foreground">{c.semana}</span>
                      <span className="text-center text-primary font-medium">{formatBRL(c.realizadoEnt)}</span>
                      <span className="text-center text-primary/60 font-medium">{formatBRL(c.previstoEnt)}</span>
                      <span className={cn("text-center font-bold", c.realizadoSaldo >= 0 ? "text-primary" : "text-destructive")}>{formatBRL(c.realizadoSaldo)}</span>
                      <span className={cn("text-center font-bold opacity-70", c.previstoSaldo >= 0 ? "text-primary" : "text-destructive")}>{formatBRL(c.previstoSaldo)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Aging Report - Inadimplência por faixa de atraso */}
          {dados.hasAging && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} /> Aging Report — Inadimplência por Faixa de Atraso
                </p>
                {totalNegociacoes > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-amber-500/50 text-amber-600 gap-1">
                    <Handshake size={10} /> {totalNegociacoes} em negociação
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                {/* Aging chart */}
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dados.agingFaixas.filter(f => f.pagarVal > 0 || f.receberVal > 0)}
                      margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="faixa" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                        formatter={(v: number, name: string) => [formatBRL(v), name === "pagarVal" ? "A Pagar" : "A Receber"]}
                      />
                      <Legend formatter={(v) => v === "pagarVal" ? "A Pagar" : "A Receber"} />
                      <Bar dataKey="pagarVal" name="pagarVal" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} barSize={14} />
                      <Bar dataKey="receberVal" name="receberVal" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Aging table */}
                <div className="space-y-1">
                  <div className="grid grid-cols-5 gap-1 text-[9px] text-muted-foreground font-medium px-1 uppercase">
                    <span>Faixa</span>
                    <span className="text-center">Pagar Qtd</span>
                    <span className="text-center">Pagar Valor</span>
                    <span className="text-center">Receber Qtd</span>
                    <span className="text-center">Receber Valor</span>
                  </div>
                  {dados.agingFaixas.filter(f => f.pagarQtd > 0 || f.receberQtd > 0).map((f, i) => {
                    const severity = i >= 3 ? "border-destructive/30 bg-destructive/5" : i >= 2 ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-muted/20";
                    const isOpen = agingDrillDown === f.faixa;
                    const parcelas = dados.agingParcelas[f.faixa] || [];
                    return (
                      <div key={f.faixa}>
                        <div
                          className={cn("grid grid-cols-5 gap-1 p-1.5 rounded-md text-[11px] border cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all", severity, isOpen && "ring-1 ring-primary/40")}
                          onClick={() => setAgingDrillDown(isOpen ? null : f.faixa)}
                        >
                          <span className="text-muted-foreground font-medium flex items-center gap-0.5">
                            {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />} {f.faixa}
                          </span>
                          <span className="text-center text-destructive font-medium">{f.pagarQtd || "-"}</span>
                          <span className="text-center text-destructive font-bold">{f.pagarVal > 0 ? formatBRL(f.pagarVal) : "-"}</span>
                          <span className="text-center text-primary font-medium">{f.receberQtd || "-"}</span>
                          <span className="text-center text-primary font-bold">{f.receberVal > 0 ? formatBRL(f.receberVal) : "-"}</span>
                        </div>
                        {isOpen && parcelas.length > 0 && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="ml-2 mt-1 mb-1">
                            {/* Filter buttons */}
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              {(["todos", "pagar", "receber", "negociando"] as const).map(ft => (
                                <Button
                                  key={ft}
                                  variant={agingDrillFilter === ft ? "default" : "outline"}
                                  size="sm"
                                  className={cn("text-[9px] h-5 px-2", ft === "negociando" && agingDrillFilter === ft && "bg-amber-500 hover:bg-amber-600 text-white")}
                                  onClick={() => setAgingDrillFilter(ft)}
                                >
                                  {ft === "todos" ? "Todos" : ft === "pagar" ? "A Pagar" : ft === "receber" ? "A Receber" : `Negociando${parcelas.filter(pp => negociacoes[`${pp.tipo}-${pp.nome}-${pp.vencimento}-${pp.valor.toFixed(2)}`]?.ativo).length > 0 ? ` (${parcelas.filter(pp => negociacoes[`${pp.tipo}-${pp.nome}-${pp.vencimento}-${pp.valor.toFixed(2)}`]?.ativo).length})` : ""}`}
                                </Button>
                              ))}
                              <span className="text-[8px] text-muted-foreground mx-0.5">|</span>
                              {(["em_andamento", "acordo_fechado", "sem_acordo"] as NegStatus[]).map(st => {
                                const count = parcelas.filter(pp => {
                                  const nk = `${pp.tipo}-${pp.nome}-${pp.vencimento}-${pp.valor.toFixed(2)}`;
                                  return negociacoes[nk]?.ativo && (negociacoes[nk]?.statusNeg || "em_andamento") === st;
                                }).length;
                                return (
                                  <Button
                                    key={st}
                                    variant={agingDrillFilter === st ? "default" : "outline"}
                                    size="sm"
                                    className={cn("text-[8px] h-5 px-1.5", agingDrillFilter === st && NEG_STATUS_COLORS[st])}
                                    onClick={() => setAgingDrillFilter(agingDrillFilter === st ? "todos" : st)}
                                  >
                                    {NEG_STATUS_LABELS[st]}{count > 0 ? ` (${count})` : ""}
                                  </Button>
                                );
                              })}
                            </div>
                            <div className="space-y-0.5">
                              {parcelas
                                .filter(p => {
                                  const nk = `${p.tipo}-${p.nome}-${p.vencimento}-${p.valor.toFixed(2)}`;
                                  if (agingDrillFilter === "negociando") return negociacoes[nk]?.ativo;
                                  if (agingDrillFilter === "em_andamento" || agingDrillFilter === "acordo_fechado" || agingDrillFilter === "sem_acordo") {
                                    return negociacoes[nk]?.ativo && (negociacoes[nk]?.statusNeg || "em_andamento") === agingDrillFilter;
                                  }
                                  return agingDrillFilter === "todos" || p.tipo === agingDrillFilter;
                                })
                                .slice(0, 10)
                                .map((p, pi) => {
                                const negKey = `${p.tipo}-${p.nome}-${p.vencimento}-${p.valor.toFixed(2)}`;
                                const negData = negociacoes[negKey];
                                const emNegociacao = negData?.ativo;
                                return (
                                <div key={pi}>
                                  <div
                                    className={cn(
                                      "flex items-center justify-between p-1.5 rounded text-[10px] border transition-colors",
                                      emNegociacao
                                        ? "border-amber-500/40 bg-amber-500/5"
                                        : "border-border/50 bg-background/50 hover:bg-muted/40 hover:border-primary/30"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => navigate(p.tipo === "pagar" ? "/financeiro/contas-pagar" : "/financeiro/contas-receber")} title={`Abrir ${p.tipo === "pagar" ? "Contas a Pagar" : "Contas a Receber"}`}>
                                      <Badge variant={p.tipo === "pagar" ? "destructive" : "default"} className="text-[8px] h-4 px-1 shrink-0">
                                        {p.tipo === "pagar" ? "PG" : "RC"}
                                      </Badge>
                                      {emNegociacao && (
                                        <Badge variant="outline" className={cn("text-[7px] h-3.5 px-1 shrink-0", NEG_STATUS_COLORS[negData?.statusNeg || "em_andamento"])}>
                                          <Handshake size={8} className="mr-0.5" /> {NEG_STATUS_LABELS[negData?.statusNeg || "em_andamento"]}
                                        </Badge>
                                      )}
                                      <span className={cn("truncate font-medium", emNegociacao && "text-amber-700 dark:text-amber-400")}>{p.nome}</span>
                                      {p.descricao && <span className="text-muted-foreground truncate hidden sm:inline">· {p.descricao}</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                      <span className="text-muted-foreground">{format(parseISO(p.vencimento), "dd/MM/yy")}</span>
                                      <span className="text-muted-foreground">{p.diasAtraso}d</span>
                                      <span className={cn("font-bold", p.tipo === "pagar" ? "text-destructive" : "text-primary")}>{formatBRL(p.valor)}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-5 w-5", emNegociacao ? "text-amber-600" : "text-muted-foreground hover:text-amber-600")}
                                        onClick={(e) => { e.stopPropagation(); toggleNegociacao(negKey); }}
                                        title={emNegociacao ? "Remover negociação" : "Marcar como em negociação"}
                                      >
                                        <Handshake size={10} />
                                      </Button>
                                      <ArrowUpRight size={10} className="text-muted-foreground cursor-pointer" onClick={() => navigate(p.tipo === "pagar" ? "/financeiro/contas-pagar" : "/financeiro/contas-receber")} />
                                    </div>
                                  </div>
                                  {/* Negotiation details */}
                                  {emNegociacao && negData && (
                                    <div className="ml-6 mt-0.5 mb-1 p-1.5 rounded border border-amber-500/20 bg-amber-500/5 text-[9px] text-amber-700 dark:text-amber-400 space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                          <p className="flex items-center gap-1">
                                            <span className="font-semibold">Status:</span>
                                            <Badge variant="outline" className={cn("text-[7px] h-3.5 px-1", NEG_STATUS_COLORS[negData.statusNeg || "em_andamento"])}>
                                              {NEG_STATUS_LABELS[negData.statusNeg || "em_andamento"]}
                                            </Badge>
                                          </p>
                                          {negData.responsavel && <p><span className="font-semibold">Responsável:</span> {negData.responsavel}</p>}
                                          {negData.data && <p><span className="font-semibold">Data:</span> {format(new Date(negData.data), "dd/MM/yyyy HH:mm")}</p>}
                                          {negData.observacao && <p><span className="font-semibold">Obs:</span> {negData.observacao}</p>}
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 text-amber-600 hover:text-amber-700 shrink-0"
                                          onClick={(e) => { e.stopPropagation(); editarNegociacao(negKey); }}
                                          title="Editar negociação"
                                        >
                                          <Pencil size={9} />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );})}
                              {(() => {
                                const filtered = parcelas.filter(p => {
                                  const nk = `${p.tipo}-${p.nome}-${p.vencimento}-${p.valor.toFixed(2)}`;
                                  if (agingDrillFilter === "negociando") return negociacoes[nk]?.ativo;
                                  if (agingDrillFilter === "em_andamento" || agingDrillFilter === "acordo_fechado" || agingDrillFilter === "sem_acordo") {
                                    return negociacoes[nk]?.ativo && (negociacoes[nk]?.statusNeg || "em_andamento") === agingDrillFilter;
                                  }
                                  return agingDrillFilter === "todos" || p.tipo === agingDrillFilter;
                                });
                                if (filtered.length > 10) return (
                                  <p className="text-[10px] text-muted-foreground text-center">+ {filtered.length - 10} parcela(s)</p>
                                );
                                if (filtered.length === 0) return (
                                  <p className="text-[10px] text-muted-foreground text-center py-1">Nenhuma parcela nesta faixa para o filtro selecionado</p>
                                );
                                return null;
                              })()}
                            </div>

                            {/* Negotiation form modal */}
                            {negociacaoEditKey && parcelas.some(p => `${p.tipo}-${p.nome}-${p.vencimento}-${p.valor.toFixed(2)}` === negociacaoEditKey) && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-1 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5">
                                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                  <Handshake size={10} /> {negociacaoEditMode === "edit" ? "Editar Negociação" : "Registrar Negociação"}
                                </p>
                                <div className="space-y-1.5">
                                  <input
                                    className="w-full text-[10px] px-2 py-1 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground"
                                    placeholder="Responsável pela negociação"
                                    value={negociacaoForm.responsavel}
                                    onChange={e => setNegociacaoForm(f => ({ ...f, responsavel: e.target.value }))}
                                  />
                                  <textarea
                                    className="w-full text-[10px] px-2 py-1 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none"
                                    rows={2}
                                    placeholder="Observação sobre a negociação..."
                                    value={negociacaoForm.observacao}
                                    onChange={e => setNegociacaoForm(f => ({ ...f, observacao: e.target.value }))}
                                  />
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-muted-foreground">Status:</span>
                                    {(["em_andamento", "acordo_fechado", "sem_acordo"] as NegStatus[]).map(st => (
                                      <Button
                                        key={st}
                                        variant={negociacaoForm.statusNeg === st ? "default" : "outline"}
                                        size="sm"
                                        className={cn("text-[8px] h-4 px-1.5", negociacaoForm.statusNeg === st && NEG_STATUS_COLORS[st])}
                                        onClick={() => setNegociacaoForm(f => ({ ...f, statusNeg: st }))}
                                      >
                                        {NEG_STATUS_LABELS[st]}
                                      </Button>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" className="text-[9px] h-5 px-2 bg-amber-500 hover:bg-amber-600 text-white" onClick={confirmarNegociacao}>
                                      {negociacaoEditMode === "edit" ? "Salvar" : "Confirmar"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-[9px] h-5 px-2" onClick={() => setNegociacaoEditKey(null)}>
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-5 gap-1 p-1.5 rounded-md text-[11px] border border-foreground/20 bg-muted/40 font-bold">
                    <span>Total</span>
                    <span className="text-center text-destructive">{dados.agingFaixas.reduce((s, f) => s + f.pagarQtd, 0)}</span>
                    <span className="text-center text-destructive">{formatBRL(dados.totalVencido)}</span>
                    <span className="text-center text-primary">{dados.agingFaixas.reduce((s, f) => s + f.receberQtd, 0)}</span>
                    <span className="text-center text-primary">{formatBRL(dados.receberVencido)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evolução da inadimplência */}
          {dados.evolucaoInadimplencia.some(m => m.total > 0) && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">📈 Evolução da Inadimplência — 6 Meses</p>
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dados.evolucaoInadimplencia} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="mes" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                      formatter={(v: number, name: string) => [formatBRL(v), name === "pagar" ? "Inadimpl. Pagar" : name === "receber" ? "Inadimpl. Receber" : "Total"]}
                    />
                    <Legend formatter={(v) => v === "pagar" ? "A Pagar" : v === "receber" ? "A Receber" : "Total"} />
                    <Bar dataKey="pagar" name="pagar" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} barSize={12} stackId="inad" />
                    <Bar dataKey="receber" name="receber" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={12} stackId="inad" />
                    <Line type="monotone" dataKey="total" name="total" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Painel resumo executivo de negociações */}
          {(negociacaoKPIs.total > 0 || historicoNegociacoes.length > 0) && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-1">
                <Handshake size={12} /> Resumo Executivo — Negociações
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                <div className="text-center p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Em Negociação</p>
                  <p className="text-xl font-bold text-amber-600">{negociacaoKPIs.total}</p>
                </div>
                <div className="text-center p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Total</p>
                  <p className="text-lg font-bold text-amber-600">{formatBRL(negociacaoKPIs.totalValor)}</p>
                </div>
                <div className="text-center p-2 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo Médio</p>
                  <p className={cn("text-xl font-bold", negociacaoKPIs.tempoMedio > 15 ? "text-destructive" : "text-foreground")}>{negociacaoKPIs.tempoMedio}d</p>
                </div>
                <div className="text-center p-2 rounded-lg border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa Resolução</p>
                  <p className={cn("text-xl font-bold", negociacaoKPIs.taxaResolucao >= 70 ? "text-primary" : negociacaoKPIs.taxaResolucao >= 40 ? "text-amber-600" : "text-destructive")}>{negociacaoKPIs.taxaResolucao}%</p>
                </div>
              </div>
              {negociacaoKPIs.vencidas15d.length > 0 && (
                <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/5 mb-2">
                  <p className="text-[10px] font-semibold text-destructive flex items-center gap-1 mb-1">
                    <AlertTriangle size={10} /> {negociacaoKPIs.vencidas15d.length} negociação(ões) sem atualização há mais de 15 dias
                  </p>
                  <div className="space-y-0.5">
                    {negociacaoKPIs.vencidas15d.slice(0, 5).map((n, i) => {
                      const parts = n.key.split("-");
                      const tipo = parts[0] === "pagar" ? "PG" : "RC";
                      const nome = parts.slice(1, -2).join("-");
                      const dias = n.data ? differenceInDays(new Date(), new Date(n.data)) : 0;
                      return (
                        <div key={i} className="flex items-center justify-between text-[9px] p-1 rounded border border-destructive/20 bg-background/50">
                          <div className="flex items-center gap-1">
                            <Badge variant={tipo === "PG" ? "destructive" : "default"} className="text-[7px] h-3.5 px-1">{tipo}</Badge>
                            <span className="font-medium truncate max-w-[140px]">{nome}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {n.responsavel && <span className="text-muted-foreground">👤 {n.responsavel}</span>}
                            <Badge variant="destructive" className="text-[7px] h-3.5 px-1">{dias}d</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gráfico evolução negociações */}
          {evolucaoNegociacoes.some(e => e.abertas > 0 || e.resolvidas > 0) && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">📊 Evolução Semanal — Negociações (8 semanas)</p>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucaoNegociacoes} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="semana" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                      formatter={(v: number, name: string) => [v, name === "abertas" ? "Abertas" : "Resolvidas"]}
                    />
                    <Legend formatter={(v) => v === "abertas" ? "Abertas" : "Resolvidas"} />
                    <Bar dataKey="abertas" name="abertas" fill="hsl(38, 92%, 50%)" radius={[3, 3, 0, 0]} barSize={14} />
                    <Bar dataKey="resolvidas" name="resolvidas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Histórico de negociações timeline */}
          {historicoNegociacoes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                  <Handshake size={12} /> Histórico de Negociações
                  <Badge variant="outline" className="text-[9px] h-4 ml-1 border-amber-500/40 text-amber-600">{historicoFiltrado.length}/{historicoNegociacoes.length}</Badge>
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 gap-1" onClick={() => setShowHistoricoNeg(!showHistoricoNeg)}>
                    {showHistoricoNeg ? "Ocultar" : "Ver histórico"} {showHistoricoNeg ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </Button>
                  {(() => {
                    const periodoLabel = histNegDataInicio || histNegDataFim
                      ? `Período: ${histNegDataInicio ? format(histNegDataInicio, "dd/MM/yyyy") : "início"} a ${histNegDataFim ? format(histNegDataFim, "dd/MM/yyyy") : "atual"}`
                      : "Período: Todos";
                    const exportColumns: ExportColumn[] = [
                      { header: "Tipo", key: "tipo" },
                      { header: "Parcela", key: "parcela" },
                      { header: "Ação", key: "acao" },
                      { header: "Responsável", key: "responsavel" },
                      { header: "Data/Hora", key: "dataHora", align: "center" },
                      { header: "Observação", key: "observacao" },
                    ];
                    const exportData = historicoFiltrado.map(h => {
                      const parts = h.key.split("-");
                      return {
                        tipo: parts[0] === "pagar" ? "A Pagar" : "A Receber",
                        parcela: parts.slice(1, -2).join("-"),
                        acao: h.acao,
                        responsavel: h.responsavel || "—",
                        dataHora: h.data ? format(new Date(h.data), "dd/MM/yyyy HH:mm") : "—",
                        observacao: h.observacao || "—",
                      };
                    });
                    const totalTransicoes = historicoFiltrado.filter(h => h.acao.includes("Status alterado")).length;
                    const totalIniciadas = historicoFiltrado.filter(h => h.acao.includes("iniciada")).length;
                    const totalRemovidas = historicoFiltrado.filter(h => h.acao.includes("removida")).length;
                    const totalAtualizadas = historicoFiltrado.filter(h => h.acao.includes("atualizada")).length;
                    const summaryRows = [
                      { label: "Total", value: String(historicoFiltrado.length) },
                      { label: "Transições", value: String(totalTransicoes) },
                      { label: "Iniciadas", value: String(totalIniciadas) },
                      { label: "Removidas", value: String(totalRemovidas) },
                      { label: "Atualizações", value: String(totalAtualizadas) },
                    ];
                    const exportOpts = { title: "Histórico de Transições de Negociações", subtitle: periodoLabel, filename: "historico-negociacoes", columns: exportColumns, data: exportData, summaryRows };

                    const handlePDF = () => {
                      const headers = exportColumns.map(c => ({ label: c.header, align: (c.align ?? "left") as "left" | "right" | "center" }));
                      const rows = exportData.map(r => ({ cells: exportColumns.map(c => String(r[c.key as keyof typeof r] ?? "")) }));
                      const acaoTipos = [
                        { name: "Iniciada", count: totalIniciadas, color: "#3b82f6" },
                        { name: "Atualizada", count: totalAtualizadas, color: "#f59e0b" },
                        { name: "Status alterado", count: totalTransicoes, color: "#8b5cf6" },
                        { name: "Removida", count: totalRemovidas, color: "#ef4444" },
                      ].filter(a => a.count > 0);
                      const totalAcoes = acaoTipos.reduce((s, a) => s + a.count, 0);
                      let cumPct = 0;
                      const gradientParts = acaoTipos.map(a => { const pct = (a.count / totalAcoes) * 100; const seg = `${a.color} ${cumPct}% ${cumPct + pct}%`; cumPct += pct; return seg; });
                      const legendHtml = acaoTipos.map(a => { const pct = ((a.count / totalAcoes) * 100).toFixed(1); return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;"><div style="width:12px;height:12px;border-radius:50%;background:${a.color};flex-shrink:0;"></div><span>${a.name}: <strong>${a.count}</strong> (${pct}%)</span></div>`; }).join("");
                      const chartHtml = totalAcoes > 0 ? `<div style="display:flex;align-items:center;gap:24px;margin:16px 0;padding:12px;border:1px solid #e0e0e0;border-radius:8px;"><div style="width:100px;height:100px;border-radius:50%;background:conic-gradient(${gradientParts.join(", ")});flex-shrink:0;"></div><div><div style="font-weight:600;font-size:12px;margin-bottom:8px;">Distribuição por Tipo de Ação</div><div style="display:flex;flex-direction:column;gap:4px;">${legendHtml}</div></div></div>` : "";
                      const content = `<div style="margin-bottom:12px"><p style="font-size:12px;margin-bottom:8px;color:#666">${periodoLabel}</p><div style="display:flex;gap:24px;margin-bottom:8px"><div><strong>Total:</strong> ${historicoFiltrado.length}</div><div><strong>Transições:</strong> ${totalTransicoes}</div><div><strong>Iniciadas:</strong> ${totalIniciadas}</div><div><strong>Removidas:</strong> ${totalRemovidas}</div><div><strong>Atualizações:</strong> ${totalAtualizadas}</div></div></div>${chartHtml}${buildPrintTable(headers, rows)}`;
                      printPDF({ title: "Histórico de Transições de Negociações", subtitle: periodoLabel, content });
                    };

                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 gap-1">
                            <Download size={10} /> Exportar
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={handlePDF}>
                            <Printer size={12} className="mr-2" /> Imprimir / PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { exportExcel(exportOpts); toast.success("Excel exportado!"); }}>
                            <FileSpreadsheet size={12} className="mr-2" /> Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { exportCSV(exportOpts); toast.success("CSV exportado!"); }}>
                            <Download size={12} className="mr-2" /> CSV
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => shareWhatsApp(exportOpts)}>
                            <MessageCircle size={12} className="mr-2" /> WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()}
                </div>
              </div>
              {showHistoricoNeg && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  {/* Date filters */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Filtrar período:</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("text-[10px] h-6 px-2 gap-1", !histNegDataInicio && "text-muted-foreground")}>
                          <CalendarIcon size={10} />
                          {histNegDataInicio ? format(histNegDataInicio, "dd/MM/yyyy") : "Data início"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={histNegDataInicio} onSelect={(d) => { setHistNegDataInicio(d); setHistNegPreset(null); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <span className="text-[10px] text-muted-foreground">a</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("text-[10px] h-6 px-2 gap-1", !histNegDataFim && "text-muted-foreground")}>
                          <CalendarIcon size={10} />
                          {histNegDataFim ? format(histNegDataFim, "dd/MM/yyyy") : "Data fim"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={histNegDataFim} onSelect={(d) => { setHistNegDataFim(d); setHistNegPreset(null); }} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {(histNegDataInicio || histNegDataFim || histNegResponsavel || histNegBusca) && (
                      <Button variant="ghost" size="sm" className="text-[9px] h-5 px-1.5 text-muted-foreground" onClick={() => { setHistNegDataInicio(undefined); setHistNegDataFim(undefined); setHistNegPreset(null); setHistNegResponsavel(""); setHistNegBusca(""); }}>
                        Limpar
                      </Button>
                    )}
                    <span className="text-[8px] text-muted-foreground mx-0.5">|</span>
                    {([
                      { label: "7 dias", fn: () => { setHistNegDataInicio(subDays(new Date(), 7)); setHistNegDataFim(new Date()); setHistNegPreset("7 dias"); } },
                      { label: "30 dias", fn: () => { setHistNegDataInicio(subDays(new Date(), 30)); setHistNegDataFim(new Date()); setHistNegPreset("30 dias"); } },
                      { label: "Este mês", fn: () => { setHistNegDataInicio(startOfMonth(new Date())); setHistNegDataFim(endOfMonth(new Date())); setHistNegPreset("Este mês"); } },
                    ] as const).map(p => (
                      <Button key={p.label} variant={histNegPreset === p.label ? "default" : "outline"} size="sm" className={cn("text-[9px] h-5 px-1.5", histNegPreset === p.label && "bg-primary text-primary-foreground")} onClick={p.fn}>
                        {p.label}
                      </Button>
                    ))}
                    {responsaveisUnicos.length > 0 && (
                      <>
                        <span className="text-[8px] text-muted-foreground mx-0.5">|</span>
                        <Select value={histNegResponsavel || "__all__"} onValueChange={(v) => setHistNegResponsavel(v === "__all__" ? "" : v)}>
                          <SelectTrigger className="h-5 text-[9px] w-auto min-w-[90px] px-1.5 border-border">
                            <SelectValue placeholder="Responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todos ({historicoNegociacoes.length})</SelectItem>
                            {responsaveisUnicos.map(([r, count]) => (
                              <SelectItem key={r} value={r}>{r} ({count})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar parcela, observação..."
                        value={histNegBusca}
                        onChange={e => setHistNegBusca(e.target.value)}
                        className="w-full h-6 text-[10px] pl-7 pr-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <Select value={histNegOrdem} onValueChange={(v) => setHistNegOrdem(v as typeof histNegOrdem)}>
                      <SelectTrigger className="h-6 text-[9px] w-auto min-w-[110px] px-1.5 border-border">
                        <SelectValue placeholder="Ordenar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data_desc">Data ↓ (recente)</SelectItem>
                        <SelectItem value="data_asc">Data ↑ (antiga)</SelectItem>
                        <SelectItem value="acao_asc">Ação A→Z</SelectItem>
                        <SelectItem value="acao_desc">Ação Z→A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {historicoFiltrado.length > 0 && (() => {
                    const acaoMap: Record<string, number> = {};
                    historicoFiltrado.forEach(h => {
                      let tipo = "Outros";
                      if (h.acao.includes("iniciada")) tipo = "Iniciada";
                      else if (h.acao.includes("atualizada")) tipo = "Atualizada";
                      else if (h.acao.includes("Status alterado")) tipo = "Status alterado";
                      else if (h.acao.includes("removida")) tipo = "Removida";
                      acaoMap[tipo] = (acaoMap[tipo] || 0) + 1;
                    });
                    const acaoData = Object.entries(acaoMap).map(([name, value]) => ({ name, value }));
                    const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 45 90% 55%))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];
                    return (
                      <div className="mb-3 p-2 rounded-lg border border-border/50 bg-muted/30">
                        <p className="text-[10px] text-muted-foreground font-medium mb-1">Distribuição por Tipo de Ação</p>
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width={140} height={120}>
                            <PieChart>
                              <Pie data={acaoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                                {acaoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => [v, "Registros"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col gap-1">
                            {acaoData.map((d, i) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-muted-foreground">{d.name}:</span>
                                <span className="font-semibold text-foreground">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    const totalPaginas = Math.ceil(historicoFiltrado.length / histNegPorPagina);
                    const paginaAtual = Math.min(histNegPagina, totalPaginas || 1);
                    const inicio = (paginaAtual - 1) * histNegPorPagina;
                    const paginados = historicoFiltrado.slice(inicio, inicio + histNegPorPagina);
                    return (
                      <>
                        <div className="relative ml-3 border-l-2 border-amber-500/30 space-y-2 pl-4 py-1">
                          {paginados.map((h, i) => {
                            const parts = h.key.split("-");
                            const tipo = parts[0] === "pagar" ? "PG" : "RC";
                            const nome = parts.slice(1, -2).join("-");
                            const isInicio = h.acao.includes("iniciada");
                            return (
                              <div key={inicio + i} className="relative">
                                <div className={cn(
                                  "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2",
                                  isInicio ? "bg-amber-500 border-amber-400" : "bg-muted border-muted-foreground/40"
                                )} />
                                <div className="p-1.5 rounded border border-border/50 bg-background/50 text-[10px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant={tipo === "PG" ? "destructive" : "default"} className="text-[7px] h-3.5 px-1">{tipo}</Badge>
                                      <span className="font-medium truncate max-w-[120px]">{nome}</span>
                                      <span className={cn("font-semibold", isInicio ? "text-amber-600" : "text-muted-foreground")}>{h.acao}</span>
                                    </div>
                                    <span className="text-muted-foreground shrink-0">{h.data ? format(new Date(h.data), "dd/MM/yy HH:mm") : ""}</span>
                                  </div>
                                  {(h.responsavel || h.observacao) && (
                                    <div className="mt-0.5 text-muted-foreground">
                                      {h.responsavel && <span>👤 {h.responsavel}</span>}
                                      {h.responsavel && h.observacao && <span> · </span>}
                                      {h.observacao && <span>📝 {h.observacao}</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {historicoFiltrado.length === 0 && (
                            <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum registro encontrado no período selecionado</p>
                          )}
                        </div>
                        {(totalPaginas > 1 || historicoFiltrado.length > 10) && (
                          <div className="flex items-center justify-center gap-1.5 mt-2">
                            <Button variant="outline" size="sm" className="text-[9px] h-5 px-1.5" disabled={paginaAtual <= 1} onClick={() => setHistNegPagina(p => p - 1)}>
                              ← Anterior
                            </Button>
                            <span className="text-[9px] text-muted-foreground">
                              {paginaAtual} de {totalPaginas} ({historicoFiltrado.length} registros)
                            </span>
                            <Button variant="outline" size="sm" className="text-[9px] h-5 px-1.5" disabled={paginaAtual >= totalPaginas} onClick={() => setHistNegPagina(p => p + 1)}>
                              Próxima →
                            </Button>
                            <Select value={String(histNegPorPagina)} onValueChange={(v) => { setHistNegPorPagina(Number(v)); setHistNegPagina(1); }}>
                              <SelectTrigger className="h-5 text-[9px] w-auto min-w-[55px] px-1.5 border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[10, 15, 25, 50].map(n => (
                                  <SelectItem key={n} value={String(n)}>{n}/pág</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NCMConformityCard({ navigate }: { navigate: (path: string) => void }) {
  const [ncmStats, setNcmStats] = useState<{ total: number; comNcm: number; semNcm: number; pct: number } | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: prods, error } = await (supabase.from("produtos" as any) as any)
          .select("ncm, ativo")
          .eq("ativo", true);
        if (error || !prods) return;
        const total = prods.length;
        const comNcm = prods.filter((p: any) => p.ncm && p.ncm.replace(/\D/g, "").length >= 8).length;
        const semNcm = total - comNcm;
        const pct = total > 0 ? Math.round((comNcm / total) * 100) : 0;
        setNcmStats({ total, comNcm, semNcm, pct });
      } catch { /* erro ignorado */ }
    })();
  }, []);

  if (!ncmStats || ncmStats.total === 0) return null;

  const color = ncmStats.pct >= 90 ? "hsl(142, 71%, 45%)" : ncmStats.pct >= 70 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
      <Card className="bg-card/80 backdrop-blur border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package size={16} style={{ color }} /> Conformidade NCM — Lei 12.741
            </CardTitle>
            <Badge variant={ncmStats.pct >= 90 ? "default" : "destructive"} className="text-xs">
              {ncmStats.pct}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={ncmStats.pct} className="h-2 mb-3" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{ncmStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Produtos ativos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">{ncmStats.comNcm}</p>
              <p className="text-[10px] text-muted-foreground">Com NCM válido</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{ncmStats.semNcm}</p>
              <p className="text-[10px] text-muted-foreground">Sem NCM</p>
            </div>
          </div>
          {ncmStats.semNcm > 0 && (
            <Button variant="outline" size="sm" className="w-full mt-3 gap-1 text-xs" onClick={() => navigate("/cadastros/produtos")}>
              <AlertTriangle size={12} /> Corrigir {ncmStats.semNcm} produto(s) sem NCM
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function XmlDivergenciasCard({ navigate }: { navigate: (path: string) => void }) {
  const [dados, setDados] = useState<{ total: number; comDiv: number; tipos: { preco: number; ncm: number; imposto: number; outros: number }; recentes: { descricao: string; campo: string }[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: itens } = await (supabase.from("xml_fiscal_itens" as any) as any)
          .select("descricao, divergencias, status_mapeamento")
          .not("divergencias", "eq", "[]");

        if (!itens || itens.length === 0) { setDados(null); return; }

        const { count: totalCount } = await (supabase.from("xml_fiscal_itens" as any) as any)
          .select("id", { count: "exact", head: true });

        let preco = 0, ncm = 0, imposto = 0, outros = 0;
        const recentes: { descricao: string; campo: string }[] = [];

        const comDiv = itens.filter((it: any) => {
          const divs: any[] = Array.isArray(it.divergencias) ? it.divergencias : [];
          if (divs.length === 0) return false;
          divs.forEach((d: any) => {
            const tipo = d.tipo || d.campo || "";
            if (tipo.includes("preco") || tipo.includes("Preço")) preco++;
            else if (tipo.includes("ncm") || tipo.includes("NCM")) ncm++;
            else if (tipo.includes("icms") || tipo.includes("pis") || tipo.includes("cofins") || tipo.includes("Imposto") || tipo.includes("Alíq")) imposto++;
            else outros++;
          });
          if (recentes.length < 5) {
            recentes.push({ descricao: it.descricao, campo: divs[0]?.campo || divs[0]?.tipo || "Divergência" });
          }
          return true;
        }).length;

        setDados({ total: totalCount || itens.length, comDiv, tipos: { preco, ncm, imposto, outros }, recentes });
      } catch { setDados(null); }
    })();
  }, []);

  if (!dados || dados.comDiv === 0) return null;

  const totalDivs = dados.tipos.preco + dados.tipos.ncm + dados.tipos.imposto + dados.tipos.outros;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
      <Card className="border-amber-500/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} className="text-amber-500" /> Divergências XML Fiscal
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 animate-pulse">
                {dados.comDiv} item(ns)
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/fiscal/gestao-xml")}>
              Ver gestão XML <ArrowUpRight size={12} className="ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: "Preço", count: dados.tipos.preco, color: "text-destructive" },
              { label: "NCM", count: dados.tipos.ncm, color: "text-amber-500" },
              { label: "Impostos", count: dados.tipos.imposto, color: "text-primary" },
              { label: "Outros", count: dados.tipos.outros, color: "text-muted-foreground" },
            ].map(d => (
              <div key={d.label} className="text-center p-2 rounded-lg border border-border bg-muted/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                <p className={cn("text-xl font-bold", d.color)}>{d.count}</p>
              </div>
            ))}
          </div>
          <Progress value={dados.total > 0 ? Math.round(((dados.total - dados.comDiv) / dados.total) * 100) : 100} className="h-2 mb-2" />
          <p className="text-[11px] text-muted-foreground">
            {dados.comDiv} de {dados.total} itens com divergências detectadas na conferência ({totalDivs} divergência(s) no total)
          </p>
          {dados.recentes.length > 0 && (
            <div className="mt-3 space-y-1">
              {dados.recentes.slice(0, 3).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 rounded border border-border bg-muted/20 text-xs">
                  <span className="truncate flex-1">{r.descricao}</span>
                  <Badge variant="outline" className="text-[9px] ml-2 shrink-0 border-amber-500/40 text-amber-600">{r.campo}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState<Date>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date>(endOfMonth(new Date()));

  const data = useMemo(() => generateDataForRange(dataInicio, dataFim), [dataInicio, dataFim]);

  // === IBPT Expiry Check ===
  const [ibptAlerta, setIbptAlerta] = useState<{ vencida: boolean; diasDesdeAtualizacao: number | null }>({ vencida: false, diasDesdeAtualizacao: null });
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: rows } = await (supabase.from("ibpt_dados" as any) as any)
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (rows && rows.length > 0) {
          const lastUpdate = new Date(rows[0].updated_at);
          const dias = differenceInDays(new Date(), lastUpdate);
          setIbptAlerta({ vencida: dias > 180, diasDesdeAtualizacao: dias });
        } else {
          setIbptAlerta({ vencida: true, diasDesdeAtualizacao: null });
        }
      } catch {
        // No Supabase data, check if using built-in (always "old")
        setIbptAlerta({ vencida: true, diasDesdeAtualizacao: null });
      }
    })();
  }, []);

  // === Failed email alert ===
  const emailAlertRef = useRef(false);
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: falhas } = await (supabase.from("email_send_history" as any) as any)
          .select("id, destinatario, assunto")
          .eq("status", "falhou")
          .eq("tipo", "semanal")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!emailAlertRef.current && falhas && falhas.length > 0) {
          emailAlertRef.current = true;
          toast.error(`${falhas.length} e-mail(s) semanal(is) com falha de envio`, {
            description: "Verifique o histórico em Configurações > Relatórios.",
            duration: 10000,
            action: {
              label: "Ver histórico",
              onClick: () => navigate("/configuracoes/relatorios"),
            },
          });
        }
      } catch { /* erro ignorado */ }
    })();
  }, [navigate]);

  // === Alertas: Pedidos atrasados e Contas vencidas ===
  const alertas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let pedidosAtrasados: { numero: string; fornecedor: string; dataEntrega: string; diasAtraso: number }[] = [];
    try {
      const pedidos = JSON.parse(localStorage.getItem("pedidos_compra") || "[]");
      pedidosAtrasados = pedidos
        .filter((p: any) => (p.status === "enviado" || p.status === "parcial") && p.dataEntrega && isBefore(parseISO(p.dataEntrega), hoje))
        .map((p: any) => ({
          numero: p.numero,
          fornecedor: p.fornecedorNome,
          dataEntrega: p.dataEntrega,
          diasAtraso: differenceInDays(hoje, parseISO(p.dataEntrega)),
        }))
        .sort((a: any, b: any) => b.diasAtraso - a.diasAtraso);
    } catch { /* erro ignorado */ }

    let contasVencidas: { fornecedor: string; descricao: string; valor: number; vencimento: string; diasAtraso: number }[] = [];
    try {
      const contas = JSON.parse(localStorage.getItem("contas_pagar") || "[]");
      contas.forEach((c: any) => {
        if (c.status === "cancelada" || c.status === "paga") return;
        (c.parcelas || []).forEach((p: any) => {
          if (p.status === "paga") return;
          const venc = parseISO(p.vencimento);
          if (isBefore(venc, hoje)) {
            contasVencidas.push({
              fornecedor: c.fornecedor,
              descricao: c.descricao,
              valor: p.valor - (p.valorPago || 0),
              vencimento: p.vencimento,
              diasAtraso: differenceInDays(hoje, venc),
            });
          }
        });
      });
      contasVencidas.sort((a, b) => b.diasAtraso - a.diasAtraso);
    } catch { /* erro ignorado */ }

    return { pedidosAtrasados, contasVencidas };
  }, []);

  const totalAlertas = alertas.pedidosAtrasados.length + alertas.contasVencidas.length;

  const periodoLabel = `${format(dataInicio, "dd/MM")} - ${format(dataFim, "dd/MM/yyyy")}`;
  const numDias = differenceInDays(dataFim, dataInicio) + 1;

  const kpis = [
    { title: "Faturamento", value: formatBRL(data.totalVendas), change: "+7.9%", up: true, icon: DollarSign, color: "hsl(217, 91%, 60%)" },
    { title: "Qtd. Vendas", value: data.totalQtd.toLocaleString("pt-BR"), change: "+8.2%", up: true, icon: ShoppingCart, color: "hsl(142, 71%, 45%)" },
    { title: "Ticket Médio", value: formatBRL(data.ticketMedio), change: "-2.1%", up: false, icon: TrendingUp, color: "hsl(38, 92%, 50%)" },
    { title: "Média/Dia", value: formatBRL(data.mediaDiaria), change: "+3.4%", up: true, icon: Target, color: "hsl(262, 83%, 58%)" },
    { title: "Meta Mês", value: `${data.metaPctGeral}%`, change: "", up: data.metaPctGeral >= 100, icon: Target, color: "hsl(38, 92%, 50%)" },
    { title: "Clientes Ativos", value: String(data.clientesAtivos), change: "+5.3%", up: true, icon: Users, color: "hsl(262, 83%, 58%)" },
    { title: "Vend. c/ Meta", value: `${data.metasBatidas}/5`, change: "", up: true, icon: Trophy, color: "hsl(45, 93%, 47%)" },
    { title: "Alertas", value: String(totalAlertas), change: "", up: false, icon: Bell, color: totalAlertas > 0 ? "hsl(0, 84%, 60%)" : "hsl(142, 71%, 45%)" },
  ];

  const totalFormas = data.formasData.reduce((s, f) => s + f.value, 0);

  return (
    <div className="page-container">
      <PageHeader title="Dashboard Consolidado" description={`${periodoLabel} · ${numDias} dias`} showBack={false} />

      {/* IBPT Expiry Banner */}
      {ibptAlerta.vencida && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="py-3 flex items-center gap-3 flex-wrap">
              <AlertTriangle className="text-amber-500 shrink-0" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Tabela IBPTax desatualizada
                  {ibptAlerta.diasDesdeAtualizacao !== null
                    ? ` — última atualização há ${ibptAlerta.diasDesdeAtualizacao} dias`
                    : " — nenhuma tabela importada no Supabase"}
                </p>
                <p className="text-xs text-muted-foreground">
                  A Lei 12.741/2012 exige tributos aproximados atualizados no cupom fiscal. Importe o CSV mais recente do IBPT.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/20" onClick={() => navigate("/tabelas/ibpt")}>
                <Upload size={14} /> Atualizar IBPTax
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Period Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
            <DatePicker label="De" date={dataInicio} onSelect={setDataInicio} />
            <DatePicker label="Até" date={dataFim} onSelect={setDataFim} />
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(new Date()); setDataFim(new Date()); }}>Hoje</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 7)); setDataFim(new Date()); }}>7 dias</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 15)); setDataFim(new Date()); }}>15 dias</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(startOfMonth(new Date())); setDataFim(endOfMonth(new Date())); }}>Mês atual</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 30)); setDataFim(new Date()); }}>30 dias</Button>
              <Button variant="outline" size="sm" onClick={() => { setDataInicio(subDays(new Date(), 90)); setDataFim(new Date()); }}>90 dias</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: idx * 0.05, duration: 0.35, ease: "easeOut" }}
          >
            <Card className="glass-card gradient-border overflow-hidden group">
              <CardContent className="p-3 sm:p-4 relative">
                {/* Gradient accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, ${kpi.color}, ${kpi.color}40)` }} />
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm transition-transform duration-200 group-hover:scale-110"
                    style={{ backgroundColor: `${kpi.color}15`, boxShadow: `0 0 12px ${kpi.color}20` }}>
                    <kpi.icon size={15} style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground truncate font-medium uppercase tracking-wider">{kpi.title}</p>
                <p className="text-lg font-bold mt-0.5 tracking-tight">{kpi.value}</p>
                {kpi.change && (
                  <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${kpi.up ? "text-success" : "text-destructive"}`}>
                    {kpi.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {kpi.change}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alertas: Pedidos atrasados e Contas vencidas */}
      {totalAlertas > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alertas.pedidosAtrasados.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <Truck size={16} className="text-destructive" /> Pedidos com Entrega Atrasada
                    <Badge variant="destructive" className="ml-1 text-[10px] h-5">{alertas.pedidosAtrasados.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/compras/pedidos")}>
                    Ver pedidos <ArrowUpRight size={12} className="ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertas.pedidosAtrasados.slice(0, 5).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Pedido {p.numero} — {p.fornecedor}</p>
                      <p className="text-xs text-muted-foreground">Entrega prevista: {format(parseISO(p.dataEntrega), "dd/MM/yyyy")}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 ml-2">
                      {p.diasAtraso} dia{p.diasAtraso !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
                {alertas.pedidosAtrasados.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {alertas.pedidosAtrasados.length - 5} pedido(s) atrasado(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {alertas.contasVencidas.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-1.5">
                    <CreditCard size={16} className="text-destructive" /> Contas a Pagar Vencidas
                    <Badge variant="destructive" className="ml-1 text-[10px] h-5">{alertas.contasVencidas.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/financeiro/contas-pagar")}>
                    Ver contas <ArrowUpRight size={12} className="ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {alertas.contasVencidas.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.fornecedor}</p>
                      <p className="text-xs text-muted-foreground">{c.descricao} · Venc: {format(parseISO(c.vencimento), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold text-destructive">{formatBRL(c.valor)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.diasAtraso}d atraso</p>
                    </div>
                  </div>
                ))}
                {alertas.contasVencidas.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {alertas.contasVencidas.length - 5} parcela(s) vencida(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Produtos em Promoção */}
      <PromoCard navigate={navigate} />

      {/* Descontos Concedidos */}
      <DescontosWidget navigate={navigate} dataInicio={dataInicio} dataFim={dataFim} />

      {/* Row 1: Evolução + Faturamento vs Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evolução Diária</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/vendas-diarias")}>
                  Ver mais <ArrowUpRight size={12} className="ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.dailySales.slice(-30)}>
                  <defs>
                    <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} className="fill-muted-foreground" interval={Math.max(0, Math.floor(data.dailySales.length / 10))} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatBRL(v), "Vendas"]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Area type="monotone" dataKey="valor" stroke="url(#gradStroke)" strokeWidth={2.5} fill="url(#gradArea)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Faturamento vs Meta (Mensal)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.fatMensal}>
                  <defs>
                    <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number, n: string) => [formatBRL(v), n === "valor" ? "Faturamento" : "Meta"]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                  <Legend formatter={(v) => v === "valor" ? "Faturamento" : "Meta"} />
                  <Bar dataKey="valor" name="valor" fill="url(#gradBar)" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="meta" name="meta" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Formas Pgto + Vendas por dia da semana */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4 }}
      >
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/vendas-forma-pagamento")}>
                <ArrowUpRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.formasData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                  {data.formasData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [formatBRL(v), "Valor"]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 justify-center">
              {data.formasData.map((f) => (
                <div key={f.name} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.name} ({totalFormas > 0 ? (f.value / totalFormas * 100).toFixed(0) : 0}%)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas no Período (últimos 14 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.dailySales.slice(-14)}>
                <defs>
                  <linearGradient id="gradBarGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatBRL(v), "Vendas"]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="valor" fill="url(#gradBarGreen)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row 3: Rankings */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        {/* Top Vendedores */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-1.5"><Trophy size={16} className="text-warning" /> Top Vendedores</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/vendas-vendedor")}>
                <ArrowUpRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.vendData.map((v, i) => (
              <div key={v.nome} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i < 3 ? <Medal size={14} className={MEDAL_COLORS[i]} /> : <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>}
                    <span className="text-sm font-medium">{v.nome}</span>
                  </div>
                  <span className="text-sm font-bold">{formatBRL(v.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(v.pct, 100)}%`,
                        background: v.pct >= 100
                          ? 'linear-gradient(90deg, hsl(var(--success)), hsl(var(--accent)))'
                          : 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                      }}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold ${v.pct >= 100 ? "text-success" : "text-muted-foreground"}`}>{v.pct}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Produtos */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-1.5"><Package size={16} className="text-primary" /> Top Produtos</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/vendas-produto-curva-abc")}>
                <ArrowUpRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.prodABC.slice(0, 5).map((p, i) => (
              <div key={p.produto} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>
                  <span className="text-sm font-medium truncate">{p.produto}</span>
                  <Badge variant={CURVA_VARIANTS[p.curva]} className="text-[10px] h-4 px-1.5">{p.curva}</Badge>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold">{formatBRL(p.total)}</p>
                  <p className="text-[10px] text-muted-foreground">{p.qtd} un</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-1.5"><Star size={16} className="text-warning" /> Top Clientes</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/relatorios/vendas-cliente")}>
                <ArrowUpRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.clientData.map((c, i) => (
              <div key={c.cliente} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  {i < 3 ? <Medal size={14} className={MEDAL_COLORS[i]} /> : <span className="text-xs text-muted-foreground w-4">{i + 1}º</span>}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.cliente}</p>
                    <p className="text-[10px] text-muted-foreground">{c.compras} compras · TM: {formatBRL(c.ticket)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold shrink-0 ml-2">{formatBRL(c.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Row: Produção */}
      <ProducaoWidget navigate={navigate} />

      {/* Row 4: Estoque baixo */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-destructive" /> Produtos com Estoque Baixo
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/estoque/movimentacoes")}>
              Ver todos <ArrowUpRight size={12} className="ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {produtosBaixoEstoque.map((p) => (
              <div key={p.nome} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">Mín: {p.minimo} un</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-sm font-bold ${p.estoque <= 3 ? "text-destructive" : "text-yellow-600"}`}>{p.estoque}</span>
                  <AlertTriangle size={12} className={p.estoque <= 3 ? "text-destructive" : "text-yellow-600"} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Widget Resumo CRM */}
      {(() => {
        try {
          const crmLeads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
          const crmAtividades = JSON.parse(localStorage.getItem("gp_erp_crm_atividades") || "[]");
          if (crmLeads.length === 0) return null;

          const ativos = crmLeads.filter((l: any) => !['fechado_ganho', 'fechado_perdido'].includes(l.etapa));
          const ganhos = crmLeads.filter((l: any) => l.etapa === 'fechado_ganho');
          const totalPipeline = ativos.reduce((s: number, l: any) => s + (l.valor || 0), 0);
          const totalGanho = ganhos.reduce((s: number, l: any) => s + (l.valor || 0), 0);
          const taxaConv = crmLeads.length > 0 ? ((ganhos.length / crmLeads.length) * 100) : 0;
          const previsao = ativos.reduce((s: number, l: any) => s + ((l.valor || 0) * (l.probabilidade || 0) / 100), 0);

          const leadsQuentes = ativos
            .filter((l: any) => l.prioridade === 'alta')
            .sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0))
            .slice(0, 4);

          const hoje = new Date();
          const atividadesPendentes = crmAtividades
            .filter((a: any) => a.status === 'pendente' || a.status === 'atrasada')
            .sort((a: any, b: any) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime())
            .slice(0, 4)
            .map((a: any) => ({
              ...a,
              leadNome: crmLeads.find((l: any) => l.id === a.leadId)?.nome || '—',
              atrasada: new Date(a.dataAgendada) < hoje,
            }));

          const etapaLabels: Record<string, string> = {
            prospeccao: 'Prospecção', qualificacao: 'Qualificação',
            proposta: 'Proposta', negociacao: 'Negociação',
          };

          const funilData = ['prospeccao', 'qualificacao', 'proposta', 'negociacao'].map(key => ({
            etapa: etapaLabels[key] || key,
            qtd: ativos.filter((l: any) => l.etapa === key).length,
          }));

          // Sparkline: tendência semanal de novos leads e conversões (últimas 6 semanas)
          const sparkWeeks = Array.from({ length: 6 }, (_, i) => {
            const weekStart = startOfWeek(subWeeks(hoje, 5 - i), { weekStartsOn: 1 });
            const weekEnd = endOfWeek(subWeeks(hoje, 5 - i), { weekStartsOn: 1 });
            const novos = crmLeads.filter((l: any) => {
              const d = new Date(l.dataCriacao);
              return d >= weekStart && d <= weekEnd;
            }).length;
            const conversoes = crmLeads.filter((l: any) => {
              if (l.etapa !== 'fechado_ganho') return false;
              const d = new Date(l.dataAtualizacao);
              return d >= weekStart && d <= weekEnd;
            }).length;
            return { semana: format(weekStart, "dd/MM"), novos, conversoes };
          });

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Handshake size={16} className="text-primary" /> Resumo CRM
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm")}>
                      Ver CRM <ArrowUpRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{ativos.length}</div>
                      <div className="text-[11px] text-muted-foreground">Negócios Ativos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{formatBRL(totalPipeline)}</div>
                      <div className="text-[11px] text-muted-foreground">Pipeline</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">{formatBRL(previsao)}</div>
                      <div className="text-[11px] text-muted-foreground">Previsão Ponderada</div>
                    </div>
                    <div className="text-center">
                      <div className={cn("text-2xl font-bold", taxaConv >= 20 ? "text-primary" : "text-amber-500")}>{taxaConv.toFixed(1)}%</div>
                      <div className="text-[11px] text-muted-foreground">Conversão</div>
                    </div>
                  </div>

                  {/* Funil mini */}
                  <div className="flex gap-1.5 mb-4">
                    {funilData.map((f, i) => {
                      const maxQtd = Math.max(...funilData.map(x => x.qtd), 1);
                      const widthPct = Math.max(15, (f.qtd / maxQtd) * 100);
                      return (
                        <div key={f.etapa} className="flex-1">
                          <div
                            className="h-6 rounded-md bg-primary/20 flex items-center justify-center text-[10px] font-semibold transition-all"
                            style={{ opacity: 0.4 + (0.6 * ((4 - i) / 4)) }}
                          >
                            {f.qtd}
                          </div>
                          <div className="text-[9px] text-muted-foreground text-center mt-0.5 truncate">{f.etapa}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sparkline Tendência Semanal */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp size={12} className="text-primary" /> Tendência Semanal
                    </p>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkWeeks} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="crmNovosGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="crmConvGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="semana" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis hide allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                            labelStyle={{ fontWeight: 600 }}
                          />
                          <Area type="monotone" dataKey="novos" name="Novos Leads" stroke="hsl(var(--primary))" fill="url(#crmNovosGrad)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                          <Area type="monotone" dataKey="conversoes" name="Conversões" stroke="hsl(142 71% 45%)" fill="url(#crmConvGrad)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(142 71% 45%)' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-sm bg-primary" /> Novos Leads
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(142 71% 45%)' }} /> Conversões
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Leads quentes */}
                    {leadsQuentes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Star size={12} className="text-amber-500" /> Leads Quentes
                        </p>
                        <div className="space-y-1.5">
                          {leadsQuentes.map((lead: any) => (
                            <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate("/crm/leads")}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {lead.nome?.charAt(0) || '?'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{lead.nome}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{lead.empresa}</p>
                                </div>
                              </div>
                              <span className="text-xs font-bold shrink-0 ml-2">{formatBRL(lead.valor || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Próximas atividades */}
                    {atividadesPendentes.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock size={12} /> Próximas Atividades
                        </p>
                        <div className="space-y-1.5">
                          {atividadesPendentes.map((atv: any) => (
                            <div key={atv.id} className={cn("flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer", atv.atrasada ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30")} onClick={() => navigate("/crm/atividades")}>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{atv.titulo}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{atv.leadNome} · {atv.responsavel}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className={cn("text-[10px]", atv.atrasada ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                  {new Date(atv.dataAgendada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                                {atv.atrasada && <Badge variant="destructive" className="text-[8px] h-4 px-1">Atrasada</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        } catch { return null; }
      })()}

      {/* Leaderboard - Top 3 Vendedores do Mês */}
      {(() => {
        try {
          const crmMetas = JSON.parse(localStorage.getItem("gp_erp_crm_metas") || "[]");
          const crmLeads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
          const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          const metasMes = crmMetas.filter((m: any) => m.periodo === mesAtual);
          if (metasMes.length === 0) return null;

          // Calc per vendor
          const ranking = metasMes.map((m: any) => {
            let valor = 0, totalLeads = 0, conversoes = 0;
            crmLeads.forEach((l: any) => {
              if (l.responsavel !== m.vendedor) return;
              if ((l.dataCriacao || "").slice(0, 7) !== mesAtual) return;
              totalLeads++;
              if (l.etapa === "fechado_ganho") { conversoes++; valor += l.valor || 0; }
            });
            const pct = m.metaValor > 0 ? Math.round((valor / m.metaValor) * 100) : 0;
            return { vendedor: m.vendedor, valor, pct, totalLeads, conversoes, metaValor: m.metaValor };
          }).sort((a: any, b: any) => b.pct - a.pct || b.valor - a.valor).slice(0, 3);

          // Gamification badges (simplified check)
          const allMeses6 = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          });
          const getBadges = (vendedor: string) => {
            const pcts = allMeses6.map(mes => {
              const meta = crmMetas.find((m: any) => m.vendedor === vendedor && m.periodo === mes);
              if (!meta || !meta.metaValor) return 0;
              let val = 0;
              crmLeads.forEach((l: any) => {
                if (l.responsavel !== vendedor || (l.dataCriacao || "").slice(0, 7) !== mes) return;
                if (l.etapa === "fechado_ganho") val += l.valor || 0;
              });
              return Math.round((val / meta.metaValor) * 100);
            });
            const atingidos = pcts.filter(p => p >= 100).length;
            let maxStreak = 0, streak = 0;
            pcts.forEach(p => { if (p >= 100) { streak++; maxStreak = Math.max(maxStreak, streak); } else streak = 0; });
            const badges: { nome: string; icon: string; cor: string }[] = [];
            if (atingidos >= 1) badges.push({ nome: "Primeiro Gol", icon: "🎯", cor: "border-primary/40 text-primary bg-primary/10" });
            if (maxStreak >= 2) badges.push({ nome: "Em Chamas", icon: "🔥", cor: "border-orange-500/40 text-orange-600 bg-orange-500/10" });
            if (maxStreak >= 3) badges.push({ nome: "Imbatível", icon: "⚡", cor: "border-amber-500/40 text-amber-600 bg-amber-500/10" });
            if (Math.max(0, ...pcts) >= 150) badges.push({ nome: "Superação", icon: "⭐", cor: "border-yellow-500/40 text-yellow-600 bg-yellow-500/10" });
            if (atingidos >= 5) badges.push({ nome: "Lenda", icon: "👑", cor: "border-purple-500/40 text-purple-600 bg-purple-500/10" });
            return badges;
          };

          // Tier levels
          const anoAtual = String(new Date().getFullYear());
          const TIER_LEVELS = [
            { id: "bronze", nome: "Bronze", icon: "🥉", cor: "border-orange-400/40 text-orange-700 bg-orange-100/50 dark:bg-orange-900/20", min: 0 },
            { id: "prata", nome: "Prata", icon: "🥈", cor: "border-slate-400/40 text-slate-500 bg-slate-100/50 dark:bg-slate-800/30", min: 50000 },
            { id: "ouro", nome: "Ouro", icon: "🥇", cor: "border-amber-400/40 text-amber-500 bg-amber-50/50 dark:bg-amber-900/20", min: 150000 },
            { id: "diamante", nome: "Diamante", icon: "💎", cor: "border-cyan-400/40 text-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/20", min: 300000 },
          ];
          const getTierLevel = (vendedor: string) => {
            let valorAnual = 0;
            crmLeads.forEach((l: any) => {
              if (l.responsavel !== vendedor) return;
              if (!(l.dataCriacao || "").startsWith(anoAtual)) return;
              if (l.etapa === "fechado_ganho") valorAnual += l.valor || 0;
            });
            for (let i = TIER_LEVELS.length - 1; i >= 0; i--) {
              if (valorAnual >= TIER_LEVELS[i].min) return TIER_LEVELS[i];
            }
            return TIER_LEVELS[0];
          };

          const MEDAL_ICONS = [
            <Trophy key="t" size={18} className="text-amber-500" />,
            <Medal key="m" size={18} className="text-slate-400" />,
            <Award key="a" size={18} className="text-orange-600" />,
          ];

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy size={16} className="text-amber-500" /> Leaderboard — Vendedores do Mês
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/desempenho")}>
                      Ver ranking <ArrowUpRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ranking.map((r: any, idx: number) => {
                    const badges = getBadges(r.vendedor);
                    return (
                      <div key={r.vendedor} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all",
                        idx === 0 ? "bg-amber-500/5 ring-1 ring-amber-400/30" : "bg-muted/30"
                      )}>
                        <div className="shrink-0">{MEDAL_ICONS[idx]}</div>
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{r.vendedor}</span>
                            {(() => {
                              const tier = getTierLevel(r.vendedor);
                              return (
                                <span className={cn("inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium", tier.cor)}>
                                  {tier.icon} {tier.nome}
                                </span>
                              );
                            })()}
                            <Badge variant={r.pct >= 100 ? "default" : "outline"} className={cn("text-[10px]", r.pct >= 100 && "bg-green-600")}>
                              {r.pct}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{formatBRL(r.valor)} / {formatBRL(r.metaValor)}</span>
                            <span className="text-[10px] text-muted-foreground">{r.totalLeads} leads · {r.conversoes} conv.</span>
                          </div>
                          {badges.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {badges.map(b => (
                                <span key={b.nome} className={cn("inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium", b.cor)}>
                                  {b.icon} {b.nome}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 w-16">
                          <Progress value={Math.min(100, r.pct)} className="h-1.5" />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        } catch { return null; }
      })()}

      {/* Widget Resumo Comissões */}
      {(() => {
        try {
          const crmLeads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
          const comissaoConfig = JSON.parse(localStorage.getItem("gp_erp_comissao_config") || "null");
          const TIER_RATES = [
            { id: "bronze", min: 0, comissao: 3 },
            { id: "prata", min: 50000, comissao: 5 },
            { id: "ouro", min: 150000, comissao: 7 },
            { id: "diamante", min: 300000, comissao: 10 },
          ];
          const niveis = comissaoConfig?.niveis?.length === 4
            ? comissaoConfig.niveis.map((n: any, i: number) => ({ ...TIER_RATES[i], ...n }))
            : TIER_RATES;
          const getTier = (anual: number) => {
            for (let i = niveis.length - 1; i >= 0; i--) {
              if (anual >= niveis[i].min || anual >= niveis[i].minAnual) return niveis[i];
            }
            return niveis[0];
          };

          const mesAtual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
          const anoAtual = String(new Date().getFullYear());
          const vendedoresSet = new Set<string>();
          crmLeads.forEach((l: any) => { if (l.responsavel) vendedoresSet.add(l.responsavel); });

          const comissoes = Array.from(vendedoresSet).map(v => {
            let valorAnual = 0, valorMes = 0;
            crmLeads.forEach((l: any) => {
              if (l.responsavel !== v || l.etapa !== "fechado_ganho") return;
              if ((l.dataCriacao || "").startsWith(anoAtual)) valorAnual += l.valor || 0;
              if ((l.dataCriacao || "").slice(0, 7) === mesAtual) valorMes += l.valor || 0;
            });
            const tier = getTier(valorAnual);
            const comissao = valorMes * ((tier.comissao ?? tier.comissao) / 100);
            return { vendedor: v, valorMes, comissao, nivel: tier };
          }).sort((a, b) => b.comissao - a.comissao);

          const totalComissoes = comissoes.reduce((s, c) => s + c.comissao, 0);
          const totalVendas = comissoes.reduce((s, c) => s + c.valorMes, 0);
          const top3 = comissoes.slice(0, 3);
          if (top3.length === 0) return null;

          const TIER_ICONS: Record<string, string> = { bronze: "🥉", prata: "🥈", ouro: "🥇", diamante: "💎" };

          return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}>
              <Card className="bg-card/80 backdrop-blur border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign size={16} className="text-primary" /> Comissões do Mês
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/crm/comissoes")}>
                      Ver detalhes <ArrowUpRight size={12} className="ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Comissões</p>
                      <p className="text-xl font-bold text-primary">{formatBRL(totalComissoes)}</p>
                    </div>
                    <div className="h-8 w-px bg-border" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Vendas</p>
                      <p className="text-lg font-semibold">{formatBRL(totalVendas)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {top3.map((c, idx) => (
                      <div key={c.vendedor} className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                        idx === 0 ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/30"
                      )}>
                        <span className="text-lg">{TIER_ICONS[c.nivel.id] || "🥉"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{c.vendedor}</p>
                          <p className="text-[10px] text-muted-foreground">Vendas: {formatBRL(c.valorMes)}</p>
                        </div>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatBRL(c.comissao)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        } catch { return null; }
      })()}

      {/* Widget Resumo Financeiro */}
      <FinanceiroWidget navigate={navigate} />

      {/* Resumo Conformidade NCM */}
      <NCMConformityCard navigate={navigate} />

      {/* Resumo Auditoria Fiscal */}
      {(() => {
        try {
          const prods = JSON.parse(localStorage.getItem("produtos") || "[]");
          const auditaveis = prods.filter((p: any) => p.ncm && p.ncm.length >= 8);
          if (auditaveis.length < 1) return null;
          const corrigidos = auditaveis.filter((p: any) => p.auditoriaCorrigida).length;
          const pendentes = auditaveis.length - corrigidos;
          const pct = Math.round((corrigidos / auditaveis.length) * 100);

          const pendentesProds = auditaveis.filter((p: any) => !p.auditoriaCorrigida);
          const divNCM = pendentesProds.filter((p: any) => !p.cest || p.cest === "").length;
          const divCST = pendentesProds.filter((p: any) => p.cstPis === "01" || p.cstCofins === "01").length;
          const divICMS = pendentesProds.filter((p: any) => p.cstIcms === "00" && p.mva > 0).length;
          const divOutros = Math.max(0, pendentesProds.length - divNCM - divCST - divICMS);

          const hist = JSON.parse(localStorage.getItem("historico_auditoria") || "[]");
          const now = new Date();
          const semanaAtual = hist.filter((h: any) => {
            const d = new Date(h.data);
            return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 });
          }).reduce((s: number, h: any) => s + (h.quantidadeProdutos || 0), 0);
          const semanaAnterior = hist.filter((h: any) => {
            const d = new Date(h.data);
            const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
            return d >= prevStart && d <= prevEnd;
          }).reduce((s: number, h: any) => s + (h.quantidadeProdutos || 0), 0);
          const tendencia = semanaAtual - semanaAnterior;

          const sparkData = Array.from({ length: 7 }, (_, i) => {
            const day = subDays(now, 6 - i);
            const label = format(day, "dd/MM");
            const qtd = hist.filter((h: any) => {
              const d = new Date(h.data);
              return format(d, "dd/MM") === label;
            }).reduce((s: number, h: any) => s + (h.quantidadeProdutos || 0), 0);
            return { dia: label, qtd };
          });

          const monthlyData = Array.from({ length: 6 }, (_, i) => {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const mesLabel = format(monthDate, "MMM/yy", { locale: ptBR });
            const monthCorr = hist.filter((h: any) => {
              const d = new Date(h.data);
              return d.getMonth() === monthDate.getMonth() && d.getFullYear() === monthDate.getFullYear();
            }).reduce((s: number, h: any) => s + (h.quantidadeProdutos || 0), 0);
            const monthPct = auditaveis.length > 0 ? Math.min(100, Math.round((monthCorr / auditaveis.length) * 100)) : 0;
            return { mes: mesLabel, corrigidos: monthCorr, pendentes: Math.max(0, auditaveis.length - monthCorr), pct: monthPct };
          });

          return (
            <AuditCard
              auditaveis={auditaveis.length} corrigidos={corrigidos} pendentes={pendentes} pct={pct}
              divNCM={divNCM} divCST={divCST} divICMS={divICMS} divOutros={divOutros}
              semanaAtual={semanaAtual} semanaAnterior={semanaAnterior} tendencia={tendencia}
              sparkData={sparkData} monthlyData={monthlyData}
              navigate={navigate}
            />
          );
        } catch { return null; }
      })()}

      {/* XML Fiscal Divergências */}
      <XmlDivergenciasCard navigate={navigate} />
    </div>
  );
}
