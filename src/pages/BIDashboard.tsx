import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users,
  AlertTriangle, ArrowUpRight, Target, Calendar, Filter, Download,
  RefreshCw, Settings, Bell, ChevronDown, ChevronUp, BarChart3,
  PieChart, Activity, Zap, Shield, Clock, FileText, Printer, 
  FileSpreadsheet, MessageCircle, Share2, Eye, EyeOff, Maximize2,
  Minimize2, Database, Brain, Lightbulb, Layers, Grid3X3, LayoutDashboard
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadialBarChart,
  RadialBar, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { printPDF, buildPrintTable } from "@/lib/printUtils";
import { exportExcel, type ExportColumn } from "@/lib/exportUtils";

// ===== Types =====
interface KPIData {
  revenue: { actual: number; target: number; score: number };
  profitability: { actual: number; target: number; score: number };
  defaultRate: { actual: number; target: number; score: number };
}

interface Alert {
  type: "critical" | "warning" | "info";
  category: string;
  title: string;
  message: string;
  action: string;
}

interface SalesTrend {
  period: string;
  value: number;
  movingAverage: number;
  trend: number;
}

interface FinancialSummary {
  totalReceivable: number;
  totalPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  netBalance: number;
  currentRatio: number;
  aging: { range: string; count: number; total: number }[];
}

interface CashflowData {
  month: string;
  inflows: number;
  outflows: number;
  net: number;
}

interface Prediction {
  historical: number[];
  forecast: number[];
  confidence: number;
}

// ===== Custom Hooks =====
function useBI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async (endpoint: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3002/api/bi${endpoint}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchData, loading, error };
}

// ===== Utility Functions =====
function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-primary";
  if (score >= 70) return "text-amber-500";
  return "text-destructive";
}

function getScoreBadge(score: number): "default" | "secondary" | "destructive" {
  if (score >= 90) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

// ===== Animated Components =====
function AnimatedCounter({ 
  value, 
  format = "number", 
  suffix = "",
  className 
}: { 
  value: number; 
  format?: "number" | "currency" | "percent";
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 1000;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = start + (end - start) * eased;
      setDisplay(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  let formatted: string;
  switch (format) {
    case "currency":
      formatted = formatBRL(display);
      break;
    case "percent":
      formatted = `${display.toFixed(1)}%`;
      break;
    default:
      formatted = formatNumber(Math.round(display));
  }

  return (
    <span className={className}>
      {formatted}{suffix}
    </span>
  );
}

// ===== Main Dashboard Component =====
export default function BIDashboard() {
  const { fetchData, loading } = useBI();
  
  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showPredictions, setShowPredictions] = useState(true);
  const [compactView, setCompactView] = useState(false);
  
  // Data state
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [salesTrends, setSalesTrends] = useState<SalesTrend[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [cashflowData, setCashflowData] = useState<CashflowData[]>([]);
  const [salesPrediction, setSalesPrediction] = useState<Prediction | null>(null);
  const [cashflowPrediction, setCashflowPrediction] = useState<Prediction | null>(null);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [abcClassification, setAbcClassification] = useState<any>(null);

  // Load data
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [kpisData, alertsData, trendsData, financialData, cashflow, salesPred, cashPred, salesSum, perf, abc] = await Promise.all([
        fetchData("/kpis"),
        fetchData("/alerts"),
        fetchData("/sales/trends?period=month"),
        fetchData("/financial/summary"),
        fetchData("/financial/cashflow?months=6"),
        fetchData("/predictions/sales?periods=6"),
        fetchData("/predictions/cashflow?periods=3"),
        fetchData("/sales/summary"),
        fetchData("/performance"),
        fetchData("/sales/abc")
      ]);
      
      if (kpisData) setKpis(kpisData);
      if (alertsData) setAlerts(alertsData.alerts || []);
      if (trendsData) setSalesTrends(trendsData.data || []);
      if (financialData) setFinancialSummary(financialData);
      if (cashflow) setCashflowData(cashflow.cashflow || []);
      if (salesPred) setSalesPrediction(salesPred);
      if (cashPred) setCashflowPrediction(cashPred);
      if (salesSum) setSalesSummary(salesSum);
      if (perf) setPerformance(perf);
      if (abc) setAbcClassification(abc);
    } catch (err) {
      toast.error("Erro ao carregar dados do BI");
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Export handlers
  const handleExportPDF = () => {
    const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });
    const content = `
      <div class="info-grid">
        <div class="info-box"><div class="label">Faturamento</div><div class="value">${formatBRL(performance?.totalRevenue || 0)}</div></div>
        <div class="info-box"><div class="label">Lucro Bruto</div><div class="value" style="color:#16a34a">${formatPercent(performance?.profitability?.grossMargin || 0)}</div></div>
        <div class="info-box"><div class="label">Crescimento</div><div class="value">${formatPercent(performance?.growthRate || 0)}</div></div>
        <div class="info-box"><div class="label">Cobrança</div><div class="value">${formatPercent(performance?.collectionRate || 0)}</div></div>
      </div>
      ${alerts.length > 0 ? `
        <h3 style="margin:20px 0 8px;font-size:14px;font-weight:700;">Alertas Inteligentes</h3>
        ${buildPrintTable(
          [{ label: "Tipo", align: "left" as const }, { label: "Mensagem", align: "left" as const }],
          alerts.map(a => ({ cells: [a.title, a.message] }))
        )}
      ` : ""}
    `;
    printPDF({ title: "Dashboard BI Executivo", subtitle: `Gerado em ${timestamp}`, content });
  };

  const handleExportExcel = () => {
    const timestamp = format(new Date(), "dd-MM-yyyy_HH-mm");
    const columns: ExportColumn[] = [
      { header: "Período", key: "period" },
      { header: "Valor", key: "value", format: (v) => formatBRL(v) },
      { header: "Média Móvel", key: "movingAverage", format: (v) => formatBRL(v) },
      { header: "Tendência", key: "trend", format: (v) => formatBRL(v) }
    ];
    exportExcel({
      title: "Tendências de Vendas",
      filename: `bi-dashboard-${timestamp}`,
      columns,
      data: salesTrends
    });
    toast.success("Excel exportado com sucesso!");
  };

  // KPI Cards
  const kpiCards = useMemo(() => [
    {
      title: "Faturamento",
      value: performance?.totalRevenue || 0,
      format: "currency" as const,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
      target: kpis?.revenue?.target,
      score: kpis?.revenue?.score
    },
    {
      title: "Lucro Bruto",
      value: performance?.profitability?.grossMargin || 0,
      format: "percent" as const,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      target: kpis?.profitability?.target,
      score: kpis?.profitability?.score
    },
    {
      title: "Inadimplência",
      value: financialSummary?.overdueReceivable || 0,
      format: "currency" as const,
      icon: AlertTriangle,
      color: financialSummary?.overdueReceivable ? "text-destructive" : "text-primary",
      bgColor: financialSummary?.overdueReceivable ? "bg-destructive/10" : "bg-primary/10",
      target: kpis?.defaultRate?.target,
      score: kpis?.defaultRate?.score,
      inverse: true
    },
    {
      title: "Crescimento",
      value: performance?.growthRate || 0,
      format: "percent" as const,
      icon: performance?.growthRate >= 0 ? TrendingUp : TrendingDown,
      color: performance?.growthRate >= 0 ? "text-primary" : "text-destructive",
      bgColor: performance?.growthRate >= 0 ? "bg-primary/10" : "bg-destructive/10"
    }
  ], [kpis, performance, financialSummary]);

  // Render functions
  const renderKPICard = (kpi: any, index: number) => (
    <motion.div
      key={kpi.title}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <div className={cn("p-2 rounded-lg", kpi.bgColor)}>
              <kpi.icon size={16} className={kpi.color} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatedCounter
            value={kpi.value}
            format={kpi.format}
            className="text-2xl font-bold"
          />
          {kpi.score !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <Progress value={kpi.score} className="h-1.5 flex-1" />
              <Badge variant={getScoreBadge(kpi.score)} className="text-[10px]">
                {kpi.score}%
              </Badge>
            </div>
          )}
          {kpi.target && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Meta: {kpi.format === "currency" ? formatBRL(kpi.target) : formatPercent(kpi.target)}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderAlert = (alert: Alert, index: number) => (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-3 rounded-lg border",
        alert.type === "critical" ? "border-destructive/30 bg-destructive/5" :
        alert.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
        "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-1.5 rounded-full mt-0.5",
          alert.type === "critical" ? "bg-destructive/20" :
          alert.type === "warning" ? "bg-amber-500/20" : "bg-primary/20"
        )}>
          <AlertTriangle size={14} className={
            alert.type === "critical" ? "text-destructive" :
            alert.type === "warning" ? "text-amber-500" : "text-primary"
          } />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
          <Button variant="ghost" size="sm" className="text-xs h-6 mt-1 px-2">
            {alert.action} <ArrowUpRight size={10} className="ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">BI Inteligente</h1>
                  <p className="text-xs text-muted-foreground">
                    Analytics Profissional
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <Activity size={12} />
                Tempo Real
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Switch 
                  checked={autoRefresh} 
                  onCheckedChange={setAutoRefresh}
                  id="auto-refresh"
                />
                <Label htmlFor="auto-refresh" className="text-xs">
                  Auto-atualizar
                </Label>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadData}
                disabled={refreshing}
              >
                <RefreshCw size={14} className={cn("mr-1", refreshing && "animate-spin")} />
                Atualizar
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download size={14} className="mr-1" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <Printer size={14} className="mr-2" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet size={14} className="mr-2" />
                    Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <MessageCircle size={14} className="mr-2" />
                    Compartilhar WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Alertas Inteligentes</h2>
              <Badge variant="destructive" className="text-[10px]">
                {alerts.length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.map((alert, i) => renderAlert(alert, i))}
            </div>
          </motion.section>
        )}

        {/* KPIs Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold">Indicadores-Chave</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setCompactView(!compactView)}
            >
              {compactView ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </Button>
          </div>
          <div className={cn(
            "grid gap-4",
            compactView ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {kpiCards.map((kpi, i) => renderKPICard(kpi, i))}
          </div>
        </section>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1">
              <Grid3X3 size={14} />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1">
              <ShoppingCart size={14} />
              Vendas
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-1">
              <DollarSign size={14} />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-1">
              <Brain size={14} />
              Previsões
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1">
              <BarChart3 size={14} />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp size={16} />
                    Tendência de Vendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={salesTrends}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))" 
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(v: number) => [formatBRL(v), "Valor"]}
                        contentStyle={{ 
                          fontSize: 12, 
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="movingAverage" 
                        stroke="hsl(var(--foreground))" 
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cash Flow */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity size={16} />
                    Fluxo de Caixa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <ComposedChart data={cashflowData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))" 
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(v: number, name: string) => [
                          formatBRL(v),
                          name === "inflows" ? "Entradas" : name === "outflows" ? "Saídas" : "Saldo"
                        ]}
                        contentStyle={{ 
                          fontSize: 12, 
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))"
                        }}
                      />
                      <Bar dataKey="inflows" name="inflows" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outflows" name="outflows" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Line 
                        type="monotone" 
                        dataKey="net" 
                        name="net"
                        stroke="hsl(var(--foreground))" 
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            {financialSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield size={16} />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs text-muted-foreground">A Receber</p>
                      <p className="text-lg font-bold text-primary">
                        {formatBRL(financialSummary.totalReceivable)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <p className="text-xs text-muted-foreground">A Pagar</p>
                      <p className="text-lg font-bold text-destructive">
                        {formatBRL(financialSummary.totalPayable)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                      <p className={cn(
                        "text-lg font-bold",
                        financialSummary.netBalance >= 0 ? "text-primary" : "text-destructive"
                      )}>
                        {formatBRL(financialSummary.netBalance)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                      <p className="text-xs text-muted-foreground">Inadimplência</p>
                      <p className="text-lg font-bold text-destructive">
                        {formatBRL(financialSummary.overdueReceivable)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Liquidez</p>
                      <p className="text-lg font-bold">
                        {financialSummary.currentRatio.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sales Summary */}
              {salesSummary && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Resumo de Vendas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-primary">
                          {formatBRL(salesSummary.totalRevenue)}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground">Qtd Vendas</p>
                        <p className="text-xl font-bold">
                          {formatNumber(salesSummary.totalSales)}
                        </p>
                      </div>
                      <div className="text-center p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground">Ticket Médio</p>
                        <p className="text-xl font-bold">
                          {formatBRL(salesSummary.averageTicket)}
                        </p>
                      </div>
                    </div>
                    {salesSummary.topProducts?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Top 5 Produtos</p>
                        <div className="space-y-2">
                          {salesSummary.topProducts.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                              <span className="text-sm truncate">{p.name}</span>
                              <span className="text-sm font-bold">{formatBRL(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ABC Classification */}
              {abcClassification && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Classificação ABC</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPie>
                        <Pie
                          data={[
                            { name: "Classe A", value: abcClassification.summary?.a || 0, color: "hsl(var(--primary))" },
                            { name: "Classe B", value: abcClassification.summary?.b || 0, color: "hsl(var(--secondary))" },
                            { name: "Classe C", value: abcClassification.summary?.c || 0, color: "hsl(var(--destructive))" }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {[
                            { color: "hsl(var(--primary))" },
                            { color: "hsl(var(--secondary))" },
                            { color: "hsl(var(--destructive))" }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [v, "Produtos"]} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {[
                        { name: "A", count: abcClassification.summary?.a || 0, color: "bg-primary" },
                        { name: "B", count: abcClassification.summary?.b || 0, color: "bg-secondary" },
                        { name: "C", count: abcClassification.summary?.c || 0, color: "bg-destructive" }
                      ].map(item => (
                        <div key={item.name} className="flex items-center gap-1">
                          <div className={cn("w-3 h-3 rounded-full", item.color)} />
                          <span className="text-xs">{item.name}: {item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            {financialSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aging Report</CardTitle>
                  <CardDescription>Análise de inadimplência por faixa de atraso</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialSummary.aging.filter(a => a.total > 0)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(v: number) => [formatBRL(v), "Valor"]}
                        contentStyle={{ 
                          fontSize: 12, 
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))"
                        }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {financialSummary.aging.filter(a => a.total > 0).map((bucket, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <span className="text-sm">{bucket.range}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{bucket.count} itens</span>
                          <span className="text-sm font-bold">{formatBRL(bucket.total)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Análise Preditiva</h3>
                <p className="text-xs text-muted-foreground">
                  Previsões baseadas em algoritmos de suavização exponencial e regressão linear
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={showPredictions} 
                  onCheckedChange={setShowPredictions}
                  id="show-predictions"
                />
                <Label htmlFor="show-predictions" className="text-xs">
                  Mostrar previsões
                </Label>
              </div>
            </div>

            {showPredictions && salesPrediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb size={16} />
                    Previsão de Vendas
                    <Badge variant="outline" className="text-[10px]">
                      Confiança: {salesPrediction.confidence}%
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={[
                      ...salesPrediction.historical.map((v, i) => ({ month: `Mês ${i + 1}`, value: v })),
                      ...salesPrediction.forecast.slice(-6).map((v, i) => ({ month: `Previsão ${i + 1}`, value: v }))
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        formatter={(v: number) => [formatBRL(v), "Valor"]}
                        contentStyle={{ 
                          fontSize: 12, 
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--background))"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análise de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Margem Bruta", value: performance?.profitability?.grossMargin || 0, format: "percent" },
                    { label: "Crescimento", value: performance?.growthRate || 0, format: "percent" },
                    { label: "Taxa Cobrança", value: performance?.collectionRate || 0, format: "percent" },
                    { label: "Razão Corrente", value: financialSummary?.currentRatio || 0, format: "number" }
                  ].map((metric, i) => (
                    <div key={i} className="text-center p-4 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold mt-1">
                        {metric.format === "percent" 
                          ? formatPercent(metric.value)
                          : metric.format === "currency"
                          ? formatBRL(metric.value)
                          : metric.value.toFixed(2)
                        }
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}