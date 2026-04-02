import { useState, useMemo, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Lead } from "@/types/crm";
import { defaultLeads } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/ExportButtons";
import { Trophy, Medal, Award, TrendingUp, Users, Flame, Zap, Star, Target, Crown, Gem, Shield, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Cell, Legend, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MetaVendedor {
  id: string;
  vendedor: string;
  periodo: string;
  metaValor: number;
  metaLeads: number;
  metaConversoes: number;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(142 71% 45%)",
  "hsl(38 92% 50%)", "hsl(262 83% 58%)", "hsl(199 89% 48%)",
];

const mesesOpcoes = () => {
  const meses: { value: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = -5; i <= 0; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const l = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    meses.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) });
  }
  return meses;
};

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getRankIcon = (idx: number) => {
  if (idx === 0) return <Trophy className="w-5 h-5 text-amber-500" />;
  if (idx === 1) return <Medal className="w-5 h-5 text-slate-400" />;
  if (idx === 2) return <Award className="w-5 h-5 text-orange-600" />;
  return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{idx + 1}º</span>;
};

// ===== Gamification Badges =====
interface BadgeDef {
  id: string;
  nome: string;
  descricao: string;
  icon: React.ReactNode;
  cor: string;
  check: (stats: VendedorStats) => boolean;
}

interface VendedorStats {
  mesesAtingidos: number;          // months with >= 100%
  mesesConsecutivos: number;       // consecutive months >= 100%
  maiorPct: number;                // highest single-month %
  totalConversoes: number;
  totalLeads: number;
  meses: number;                   // total months with data
}

const BADGES: BadgeDef[] = [
  { id: "primeiro_gol", nome: "Primeiro Gol", descricao: "Atingiu a meta pela primeira vez", icon: <Target className="w-4 h-4" />, cor: "border-primary/50 bg-primary/10 text-primary", check: s => s.mesesAtingidos >= 1 },
  { id: "em_chamas", nome: "Em Chamas", descricao: "2 meses consecutivos batendo meta", icon: <Flame className="w-4 h-4" />, cor: "border-orange-500/50 bg-orange-500/10 text-orange-600", check: s => s.mesesConsecutivos >= 2 },
  { id: "imbativel", nome: "Imbatível", descricao: "3+ meses consecutivos batendo meta", icon: <Zap className="w-4 h-4" />, cor: "border-amber-500/50 bg-amber-500/10 text-amber-600", check: s => s.mesesConsecutivos >= 3 },
  { id: "superacao", nome: "Superação", descricao: "Ultrapassou 150% da meta em um mês", icon: <Star className="w-4 h-4" />, cor: "border-yellow-500/50 bg-yellow-500/10 text-yellow-600", check: s => s.maiorPct >= 150 },
  { id: "lenda", nome: "Lenda", descricao: "5+ meses atingindo a meta", icon: <Crown className="w-4 h-4" />, cor: "border-purple-500/50 bg-purple-500/10 text-purple-600", check: s => s.mesesAtingidos >= 5 },
];

// ===== Progressive Tier Levels =====
interface NivelVendedor {
  id: string;
  nome: string;
  icon: React.ReactNode;
  cor: string;
  corBg: string;
  minAnual: number; // minimum annual sales value
}

const NIVEIS: NivelVendedor[] = [
  { id: "bronze", nome: "Bronze", icon: <CircleDot className="w-4 h-4" />, cor: "text-orange-700", corBg: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50", minAnual: 0 },
  { id: "prata", nome: "Prata", icon: <Shield className="w-4 h-4" />, cor: "text-slate-500", corBg: "bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600/50", minAnual: 50000 },
  { id: "ouro", nome: "Ouro", icon: <Trophy className="w-4 h-4" />, cor: "text-amber-500", corBg: "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600/50", minAnual: 150000 },
  { id: "diamante", nome: "Diamante", icon: <Gem className="w-4 h-4" />, cor: "text-cyan-500", corBg: "bg-cyan-50 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-600/50", minAnual: 300000 },
];

const getNivel = (valorAnual: number): NivelVendedor => {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (valorAnual >= NIVEIS[i].minAnual) return NIVEIS[i];
  }
  return NIVEIS[0];
};

const getProximoNivel = (valorAnual: number): NivelVendedor | null => {
  const atual = getNivel(valorAnual);
  const idx = NIVEIS.findIndex(n => n.id === atual.id);
  return idx < NIVEIS.length - 1 ? NIVEIS[idx + 1] : null;
};

const CRMDesempenhoVendedores = () => {
  const { items: metas } = useLocalStorage<MetaVendedor>("gp_erp_crm_metas", []);
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [periodoFiltro, setPeriodoFiltro] = useState(new Date().toISOString().slice(0, 7));
  const confettiFiredRef = useRef(false);

  const vendedores = useMemo(() => {
    const set = new Set<string>();
    metas.forEach(m => set.add(m.vendedor));
    leads.forEach((l: any) => { if (l.responsavel) set.add(l.responsavel); });
    return Array.from(set).sort();
  }, [metas, leads]);

  const allMeses = useMemo(() => mesesOpcoes(), []);

  const calcPeriodo = (periodo: string) => {
    return vendedores.map(v => {
      const meta = metas.find(m => m.vendedor === v && m.periodo === periodo);
      let valor = 0, totalLeads = 0, conversoes = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== v) return;
        if ((l.dataCriacao || "").slice(0, 7) !== periodo) return;
        totalLeads++;
        if (l.etapa === "fechado_ganho") { conversoes++; valor += l.valor || 0; }
      });
      const metaValor = meta?.metaValor || 0;
      const pctValor = metaValor > 0 ? Math.round((valor / metaValor) * 100) : 0;
      const taxaConversao = totalLeads > 0 ? Math.round((conversoes / totalLeads) * 100) : 0;
      return { vendedor: v, valor, totalLeads, conversoes, metaValor, pctValor, taxaConversao };
    }).sort((a, b) => b.pctValor - a.pctValor || b.valor - a.valor);
  };

  const desempenhoPeriodo = useMemo(() => calcPeriodo(periodoFiltro), [periodoFiltro, vendedores, metas, leads]);

  // Monthly evolution data per vendor (for LineChart)
  const evolucaoMensal = useMemo(() => {
    return allMeses.map(m => {
      const row: Record<string, any> = { mes: m.label };
      vendedores.forEach(v => {
        const meta = metas.find(mt => mt.vendedor === v && mt.periodo === m.value);
        let valor = 0;
        leads.forEach((l: any) => {
          if (l.responsavel !== v) return;
          if ((l.dataCriacao || "").slice(0, 7) !== m.value) return;
          if (l.etapa === "fechado_ganho") valor += l.valor || 0;
        });
        const metaValor = meta?.metaValor || 0;
        row[v] = metaValor > 0 ? Math.round((valor / metaValor) * 100) : 0;
      });
      return row;
    });
  }, [allMeses, vendedores, metas, leads]);

  // Annual sales per vendor (for tier levels)
  const niveisVendedores = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());
    return vendedores.map(v => {
      let valorAnual = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== v) return;
        if (!(l.dataCriacao || "").startsWith(anoAtual)) return;
        if (l.etapa === "fechado_ganho") valorAnual += l.valor || 0;
      });
      const nivel = getNivel(valorAnual);
      const proximo = getProximoNivel(valorAnual);
      const pctProximo = proximo ? Math.min(100, Math.round((valorAnual / proximo.minAnual) * 100)) : 100;
      return { vendedor: v, valorAnual, nivel, proximo, pctProximo };
    });
  }, [vendedores, leads]);

  // Gamification stats per vendor
  const gamificacao = useMemo(() => {
    return vendedores.map(v => {
      const pctPorMes = allMeses.map(m => {
        const meta = metas.find(mt => mt.vendedor === v && mt.periodo === m.value);
        let valor = 0, tLeads = 0, conv = 0;
        leads.forEach((l: any) => {
          if (l.responsavel !== v) return;
          if ((l.dataCriacao || "").slice(0, 7) !== m.value) return;
          tLeads++;
          if (l.etapa === "fechado_ganho") { conv++; valor += l.valor || 0; }
        });
        const metaValor = meta?.metaValor || 0;
        return { pct: metaValor > 0 ? Math.round((valor / metaValor) * 100) : 0, leads: tLeads, conv };
      });

      const mesesAtingidos = pctPorMes.filter(p => p.pct >= 100).length;
      const maiorPct = Math.max(0, ...pctPorMes.map(p => p.pct));
      const totalConversoes = pctPorMes.reduce((a, b) => a + b.conv, 0);
      const totalLeads = pctPorMes.reduce((a, b) => a + b.leads, 0);

      let maxStreak = 0, streak = 0;
      pctPorMes.forEach(p => {
        if (p.pct >= 100) { streak++; maxStreak = Math.max(maxStreak, streak); }
        else streak = 0;
      });

      const stats: VendedorStats = { mesesAtingidos, mesesConsecutivos: maxStreak, maiorPct, totalConversoes, totalLeads, meses: allMeses.length };
      const earned = BADGES.filter(b => b.check(stats));
      return { vendedor: v, stats, badges: earned };
    });
  }, [vendedores, allMeses, metas, leads]);

  // Confetti celebration for new badge unlocks & level ups
  useEffect(() => {
    if (confettiFiredRef.current) return;
    const prevBadgesRaw = localStorage.getItem("gp_erp_crm_badges_seen");
    const prevBadges: Record<string, string[]> = prevBadgesRaw ? JSON.parse(prevBadgesRaw) : {};
    const prevLevelsRaw = localStorage.getItem("gp_erp_crm_levels_seen");
    const prevLevels: Record<string, string> = prevLevelsRaw ? JSON.parse(prevLevelsRaw) : {};
    let hasNew = false;
    const updated: Record<string, string[]> = {};
    const updatedLevels: Record<string, string> = {};

    gamificacao.forEach(g => {
      const prev = prevBadges[g.vendedor] || [];
      const current = g.badges.map(b => b.id);
      updated[g.vendedor] = current;
      const newOnes = current.filter(id => !prev.includes(id));
      if (newOnes.length > 0) {
        hasNew = true;
        const badgeNames = g.badges.filter(b => newOnes.includes(b.id)).map(b => b.nome);
        import("sonner").then(({ toast }) => {
          toast.success(`🏆 ${g.vendedor} desbloqueou: ${badgeNames.join(", ")}!`, { duration: 6000 });
        });
      }
    });

    // Detect level ups
    niveisVendedores.forEach(nv => {
      updatedLevels[nv.vendedor] = nv.nivel.id;
      const prevLevel = prevLevels[nv.vendedor];
      if (prevLevel && prevLevel !== nv.nivel.id) {
        const prevIdx = NIVEIS.findIndex(n => n.id === prevLevel);
        const currIdx = NIVEIS.findIndex(n => n.id === nv.nivel.id);
        if (currIdx > prevIdx) {
          hasNew = true;
          import("sonner").then(({ toast }) => {
            toast.success(`🎖️ ${nv.vendedor} subiu para o nível ${nv.nivel.nome}!`, { duration: 6000 });
          });
        }
      }
    });

    if (hasNew) {
      confettiFiredRef.current = true;
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#FFD700", "#FF6B00", "#00C853", "#2979FF", "#AA00FF"] });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.3 } }), 300);
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5, x: 0.7 } }), 500);
    }
    localStorage.setItem("gp_erp_crm_badges_seen", JSON.stringify(updated));
    localStorage.setItem("gp_erp_crm_levels_seen", JSON.stringify(updatedLevels));

    // Save ranking snapshot for notification panel
    const rankingSnapshot = desempenhoPeriodo.map((d, i) => ({ vendedor: d.vendedor, posicao: i + 1 }));
    localStorage.setItem("gp_erp_crm_ranking_snapshot", JSON.stringify(rankingSnapshot));
  }, [gamificacao, niveisVendedores, desempenhoPeriodo]);

  const historicoMensal = useMemo(() => {
    return allMeses.map(m => {
      const dados = calcPeriodo(m.value);
      const top = dados.length > 0 ? dados[0] : null;
      return { mes: m.label, mesKey: m.value, top: top?.vendedor || "-", topPct: top?.pctValor || 0, topValor: top?.valor || 0 };
    });
  }, [vendedores, metas, leads]);

  const chartData = useMemo(() => desempenhoPeriodo.map(d => ({
    name: d.vendedor, meta: d.metaValor, realizado: d.valor, pct: d.pctValor,
  })), [desempenhoPeriodo]);

  const exportColumns = [
    { header: "Pos.", key: "pos" },
    { header: "Vendedor", key: "vendedor" },
    { header: "Meta", key: "meta", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Realizado", key: "realizado", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "% Meta", key: "pctValor", align: "center" as const, format: (v: number) => `${v}%` },
    { header: "Leads", key: "totalLeads", align: "center" as const },
    { header: "Conversões", key: "conversoes", align: "center" as const },
    { header: "Tx. Conversão", key: "taxaConversao", align: "center" as const, format: (v: number) => `${v}%` },
    { header: "Conquistas", key: "badges", align: "center" as const },
  ];

  const exportData = desempenhoPeriodo.map((d, i) => {
    const g = gamificacao.find(g => g.vendedor === d.vendedor);
    return {
      pos: i + 1, vendedor: d.vendedor, meta: d.metaValor, realizado: d.valor,
      pctValor: d.pctValor, totalLeads: d.totalLeads, conversoes: d.conversoes,
      taxaConversao: d.taxaConversao, badges: g?.badges.map(b => b.nome).join(", ") || "-",
    };
  });

  const totalRealizado = desempenhoPeriodo.reduce((a, b) => a + b.valor, 0);
  const totalMeta = desempenhoPeriodo.reduce((a, b) => a + b.metaValor, 0);
  const mesLabel = allMeses.find(m => m.value === periodoFiltro)?.label || periodoFiltro;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Desempenho Comparativo" description="Ranking, evolução e conquistas dos vendedores" />
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{allMeses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <ExportButtons options={{
            title: "Desempenho Comparativo de Vendedores",
            subtitle: mesLabel,
            filename: `desempenho-vendedores-${periodoFiltro}`,
            columns: exportColumns,
            data: exportData,
            summaryRows: [
              { label: "Total Realizado", value: formatCurrency(totalRealizado) },
              { label: "Total Meta", value: formatCurrency(totalMeta) },
              { label: "% Geral", value: totalMeta > 0 ? `${Math.round((totalRealizado / totalMeta) * 100)}%` : "N/A" },
            ],
          }} />
        </div>
      </div>

      {/* Ranking Cards */}
      {desempenhoPeriodo.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {desempenhoPeriodo.slice(0, 3).map((d, idx) => {
            const g = gamificacao.find(g => g.vendedor === d.vendedor);
            return (
              <Card key={d.vendedor} className={cn("relative overflow-hidden", idx === 0 && "ring-2 ring-amber-400/50")}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{d.vendedor}</p>
                        {(() => {
                          const nv = niveisVendedores.find(n => n.vendedor === d.vendedor);
                          if (!nv) return null;
                          return (
                            <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium", nv.nivel.corBg, nv.nivel.cor)}>
                              {nv.nivel.icon} {nv.nivel.nome}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatCurrency(d.valor)} / {formatCurrency(d.metaValor)}</p>
                    </div>
                    <Badge variant={d.pctValor >= 100 ? "default" : "outline"} className={cn("text-xs", d.pctValor >= 100 && "bg-green-600")}>
                      {d.pctValor}%
                    </Badge>
                  </div>
                  <Progress value={Math.min(100, d.pctValor)} className="h-2" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{d.totalLeads} leads · {d.conversoes} conv.</span>
                    <span>Tx. {d.taxaConversao}%</span>
                  </div>
                  {g && g.badges.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {g.badges.map(b => (
                        <Tooltip key={b.id}>
                          <TooltipTrigger asChild>
                            <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border", b.cor)}>
                              {b.icon} {b.nome}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">{b.descricao}</p></TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Meta × Realizado — {mesLabel}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="meta" name="Meta" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.pct >= 100 ? "hsl(142 71% 45%)" : entry.pct >= 70 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Radar Chart - Performance Comparison */}
      {desempenhoPeriodo.length > 1 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Comparativo de Performance — Gráfico Radar
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <RadarChart data={(() => {
              const maxValor = Math.max(1, ...desempenhoPeriodo.map(d => d.valor));
              const maxLeads = Math.max(1, ...desempenhoPeriodo.map(d => d.totalLeads));
              const maxConv = Math.max(1, ...desempenhoPeriodo.map(d => d.conversoes));
              const dimensions = ["% Meta", "Faturamento", "Leads", "Conversões", "Tx. Conversão"];

              return dimensions.map(dim => {
                const row: Record<string, any> = { dimension: dim };
                desempenhoPeriodo.forEach(d => {
                  let val = 0;
                  if (dim === "% Meta") val = Math.min(d.pctValor, 150);
                  else if (dim === "Faturamento") val = (d.valor / maxValor) * 100;
                  else if (dim === "Leads") val = (d.totalLeads / maxLeads) * 100;
                  else if (dim === "Conversões") val = (d.conversoes / maxConv) * 100;
                  else if (dim === "Tx. Conversão") val = d.taxaConversao;
                  row[d.vendedor] = Math.round(val);
                });
                return row;
              });
            })()}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 150]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} tickFormatter={v => `${v}%`} />
              {desempenhoPeriodo.map((d, i) => (
                <Radar
                  key={d.vendedor}
                  name={d.vendedor}
                  dataKey={d.vendedor}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Legend />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Monthly Evolution LineChart */}
      {vendedores.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Evolução Mensal (% da Meta)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Legend />
              {/* 100% reference line */}
              <Line dataKey={() => 100} name="Meta 100%" stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" dot={false} strokeWidth={1} />
              {vendedores.map((v, i) => (
                <Line
                  key={v}
                  dataKey={v}
                  name={v}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Gamification Panel */}
      {gamificacao.some(g => g.badges.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> Conquistas dos Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {gamificacao.filter(g => g.badges.length > 0).map(g => (
              <div key={g.vendedor} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className="font-medium text-sm min-w-[80px]">{g.vendedor}</span>
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {g.badges.map(b => (
                    <Tooltip key={b.id}>
                      <TooltipTrigger asChild>
                        <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium", b.cor)}>
                          {b.icon} {b.nome}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent><p className="text-xs">{b.descricao}</p></TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{g.stats.mesesAtingidos}/{g.stats.meses} meses</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Progressive Tier Levels */}
      {niveisVendedores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gem className="w-4 h-4 text-cyan-500" /> Níveis Progressivos — Acumulado Anual {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap mb-2">
              {NIVEIS.map(n => (
                <span key={n.id} className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium", n.corBg, n.cor)}>
                  {n.icon} {n.nome} {n.minAnual > 0 ? `≥ ${formatCurrency(n.minAnual)}` : "Inicial"}
                </span>
              ))}
            </div>
            {niveisVendedores.sort((a, b) => b.valorAnual - a.valorAnual).map(nv => (
              <div key={nv.vendedor} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium", nv.nivel.corBg, nv.nivel.cor)}>
                  {nv.nivel.icon} {nv.nivel.nome}
                </span>
                <span className="font-medium text-sm min-w-[80px]">{nv.vendedor}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{formatCurrency(nv.valorAnual)}</span>
                    {nv.proximo && <span>Próximo: {nv.proximo.nome} ({formatCurrency(nv.proximo.minAnual)})</span>}
                    {!nv.proximo && <span className="text-cyan-500 font-medium">Nível máximo!</span>}
                  </div>
                  <Progress value={nv.pctProximo} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Annual Goals with 3-Month Trend Projection */}
      {niveisVendedores.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> Metas Anuais & Projeção {new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead className="text-right">Acum. Anual</TableHead>
                  <TableHead className="text-right">Média/Mês (3m)</TableHead>
                  <TableHead className="text-right">Projeção 12m</TableHead>
                  <TableHead className="text-center">Nível Projetado</TableHead>
                  <TableHead className="text-center">Tendência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...niveisVendedores].sort((a, b) => b.valorAnual - a.valorAnual).map(nv => {
                  const hoje = new Date();
                  const ultimos3 = Array.from({ length: 3 }, (_, i) => {
                    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  });
                  let soma3m = 0;
                  ultimos3.forEach(mes => {
                    leads.forEach((l: any) => {
                      if (l.responsavel !== nv.vendedor) return;
                      if ((l.dataCriacao || "").slice(0, 7) !== mes) return;
                      if (l.etapa === "fechado_ganho") soma3m += l.valor || 0;
                    });
                  });
                  const media3m = soma3m / 3;
                  const mesesRestantes = 12 - hoje.getMonth();
                  const projecao = nv.valorAnual + (media3m * mesesRestantes);
                  const nivelProjetado = getNivel(projecao);
                  const nivelAtualIdx = NIVEIS.findIndex(n => n.id === nv.nivel.id);
                  const nivelProjIdx = NIVEIS.findIndex(n => n.id === nivelProjetado.id);
                  const tendencia = nivelProjIdx > nivelAtualIdx ? "up" : nivelProjIdx < nivelAtualIdx ? "down" : "stable";

                  return (
                    <TableRow key={nv.vendedor}>
                      <TableCell className="font-medium">{nv.vendedor}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium", nv.nivel.corBg, nv.nivel.cor)}>
                          {nv.nivel.icon} {nv.nivel.nome}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(nv.valorAnual)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(media3m)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(projecao)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium", nivelProjetado.corBg, nivelProjetado.cor)}>
                          {nivelProjetado.icon} {nivelProjetado.nome}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {tendencia === "up" && <TrendingUp className="w-4 h-4 text-green-500 mx-auto" />}
                        {tendencia === "down" && <TrendingUp className="w-4 h-4 text-destructive mx-auto rotate-180" />}
                        {tendencia === "stable" && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ranking Detalhado — {mesLabel}</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-center">% Meta</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Conv.</TableHead>
              <TableHead className="text-center">Tx. Conv.</TableHead>
              <TableHead className="text-center">Conquistas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {desempenhoPeriodo.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum dado para este período</TableCell></TableRow>
            )}
            {desempenhoPeriodo.map((d, idx) => {
              const g = gamificacao.find(g => g.vendedor === d.vendedor);
              return (
                <TableRow key={d.vendedor}>
                  <TableCell>{getRankIcon(idx)}</TableCell>
                  <TableCell className="font-medium">{d.vendedor}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(d.metaValor)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(d.valor)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={d.pctValor >= 100 ? "default" : d.pctValor >= 70 ? "secondary" : "outline"}
                      className={cn("text-xs", d.pctValor >= 100 && "bg-green-600")}>
                      {d.pctValor}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{d.totalLeads}</TableCell>
                  <TableCell className="text-center">{d.conversoes}</TableCell>
                  <TableCell className="text-center">{d.taxaConversao}%</TableCell>
                  <TableCell className="text-center">
                    <div className="flex gap-0.5 justify-center">
                      {g?.badges.map(b => (
                        <Tooltip key={b.id}>
                          <TooltipTrigger asChild>
                            <span className={cn("inline-flex p-1 rounded-full border", b.cor)}>{b.icon}</span>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-xs">{b.nome}: {b.descricao}</p></TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Monthly History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Ranking Histórico Mensal
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>1º Lugar</TableHead>
              <TableHead className="text-center">% Meta</TableHead>
              <TableHead className="text-right">Valor Realizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historicoMensal.map(h => (
              <TableRow key={h.mesKey}>
                <TableCell className="font-medium">{h.mes}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    {h.top}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={h.topPct >= 100 ? "default" : "outline"} className={cn("text-xs", h.topPct >= 100 && "bg-green-600")}>
                    {h.topPct}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(h.topValor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CRMDesempenhoVendedores;
