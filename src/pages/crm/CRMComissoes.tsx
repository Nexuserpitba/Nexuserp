import { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead } from "@/types/crm";
import { defaultLeads } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/ExportButtons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, Gem, Trophy, TrendingUp, TrendingDown, Settings2, Gift, Percent, History, Medal, Award, ArrowUpRight, ArrowDownRight, Crown, Star, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { printPDF } from "@/lib/printUtils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, LineChart, Line,
} from "recharts";

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Default tier config
const DEFAULT_NIVEIS = [
  { id: "bronze", nome: "Bronze", icon: "🥉", cor: "text-orange-700", corBg: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700/50", minAnual: 0, comissao: 3 },
  { id: "prata", nome: "Prata", icon: "🥈", cor: "text-slate-500", corBg: "bg-slate-100 border-slate-300 dark:bg-slate-800/50 dark:border-slate-600/50", minAnual: 50000, comissao: 5 },
  { id: "ouro", nome: "Ouro", icon: "🥇", cor: "text-amber-500", corBg: "bg-amber-50 border-amber-300 dark:bg-amber-900/30 dark:border-amber-600/50", minAnual: 150000, comissao: 7 },
  { id: "diamante", nome: "Diamante", icon: "💎", cor: "text-cyan-500", corBg: "bg-cyan-50 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-600/50", minAnual: 300000, comissao: 10 },
];

interface ComissaoConfig {
  niveis: typeof DEFAULT_NIVEIS;
  bonusAtivo: boolean;
  bonusPctMeta: number; // % above goal to trigger bonus (e.g., 120 = 120% of goal)
  bonusTaxa: number; // extra % commission on the exceeding amount
}

const DEFAULT_CONFIG: ComissaoConfig = {
  niveis: DEFAULT_NIVEIS,
  bonusAtivo: true,
  bonusPctMeta: 120,
  bonusTaxa: 2,
};

const loadConfig = (): ComissaoConfig => {
  try {
    const raw = localStorage.getItem("gp_erp_comissao_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, niveis: parsed.niveis?.length === 4 ? parsed.niveis.map((n: any, i: number) => ({ ...DEFAULT_NIVEIS[i], ...n })) : DEFAULT_NIVEIS };
    }
  } catch { /* erro ignorado */ }
  return DEFAULT_CONFIG;
};

const saveConfig = (cfg: ComissaoConfig) => {
  localStorage.setItem("gp_erp_comissao_config", JSON.stringify(cfg));
};

// ===== Confetti helpers =====
function triggerConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;
  const colors = ["#fbbf24", "#f59e0b", "#d97706", "#10b981", "#3b82f6"];

  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

// ===== Certificate PDF Export =====
function exportCertificadoPDF(ranking: { vendedor: string; valorAnual: number; vendasAnual: number; nivel: typeof DEFAULT_NIVEIS[0]; comissaoAnual: number }[]) {
  const ano = new Date().getFullYear();
  const premiacoes = [
    { pos: 0, icon: "🏆", label: "Campeão de Vendas", cor: "#d97706" },
    { pos: 1, icon: "🥈", label: "Vice-Campeão", cor: "#64748b" },
    { pos: 2, icon: "🥉", label: "3º Lugar", cor: "#c2410c" },
  ];

  let content = `
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:32px;letter-spacing:2px;font-weight:800;text-transform:uppercase;color:#1a1a1a;margin-bottom:4px;">
        Premiação Anual ${ano}
      </div>
      <div style="font-size:14px;color:#888;margin-bottom:24px;">Ranking de Desempenho por Vendedor</div>
      <div style="width:100px;height:3px;background:linear-gradient(90deg,#d97706,#f59e0b,#fbbf24);margin:0 auto 32px;border-radius:2px;"></div>
    </div>
  `;

  ranking.forEach((r, idx) => {
    const premiacao = premiacoes.find(p => p.pos === idx);
    const borderColor = premiacao ? premiacao.cor : "#e0e0e0";
    const bgColor = idx === 0 ? "#fffbeb" : idx === 1 ? "#f8fafc" : idx === 2 ? "#fff7ed" : "#ffffff";

    content += `
      <div style="border:2px solid ${borderColor};border-radius:16px;padding:24px;margin-bottom:16px;background:${bgColor};page-break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:56px;height:56px;border-radius:50%;background:${idx < 3 ? borderColor + '15' : '#f5f5f5'};display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">
            ${premiacao ? premiacao.icon : `<span style="font-size:18px;font-weight:700;color:#888;">${idx + 1}º</span>`}
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span style="font-size:18px;font-weight:700;">${r.vendedor}</span>
              ${premiacao ? `<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${borderColor}20;color:${borderColor};font-weight:600;border:1px solid ${borderColor}40;">${premiacao.label}</span>` : ''}
              <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:#f0f0f0;font-weight:500;">${r.nivel.icon} ${r.nivel.nome}</span>
            </div>
            <div style="display:flex;gap:24px;font-size:12px;color:#555;">
              <span><strong>Faturamento:</strong> ${r.valorAnual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              <span><strong>Vendas:</strong> ${r.vendasAnual}</span>
              <span style="color:#16a34a;font-weight:600;"><strong>Comissão:</strong> ${r.comissaoAnual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  content += `
    <div style="margin-top:48px;text-align:center;border-top:2px solid #e0e0e0;padding-top:24px;">
      <div style="font-size:11px;color:#888;margin-bottom:8px;">Este certificado reconhece o desempenho excepcional dos vendedores durante o ano de ${ano}.</div>
      <div style="display:flex;justify-content:center;gap:48px;margin-top:32px;">
        <div style="text-align:center;">
          <div style="width:160px;border-bottom:1px solid #333;margin-bottom:4px;"></div>
          <div style="font-size:10px;color:#888;">Diretor Comercial</div>
        </div>
        <div style="text-align:center;">
          <div style="width:160px;border-bottom:1px solid #333;margin-bottom:4px;"></div>
          <div style="font-size:10px;color:#888;">Gerente de Vendas</div>
        </div>
      </div>
    </div>
  `;

  const extraStyles = `
    @page { size: A4; margin: 15mm; }
    body { padding: 32px; }
  `;

  printPDF({
    title: `Certificado de Premiação — Ranking ${ano}`,
    subtitle: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    content,
    extraStyles,
  });
}

// ===== Config Modal =====
function ConfigComissoesModal({ config, onSave }: { config: ComissaoConfig; onSave: (c: ComissaoConfig) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ComissaoConfig>(config);

  const handleOpen = (o: boolean) => { if (o) setDraft(config); setOpen(o); };

  const updateNivel = (idx: number, field: "comissao" | "minAnual", val: number) => {
    const niveis = [...draft.niveis];
    niveis[idx] = { ...niveis[idx], [field]: val };
    setDraft({ ...draft, niveis });
  };

  const handleSave = () => {
    onSave(draft);
    saveConfig(draft);
    toast.success("Configurações de comissão salvas!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="w-4 h-4" /> Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" /> Configurações de Comissão</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tier rates */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Percent className="w-4 h-4" /> Taxas por Nível</h4>
            <div className="space-y-3">
              {draft.niveis.map((n, i) => (
                <div key={n.id} className={cn("flex items-center gap-3 p-3 rounded-xl border", n.corBg)}>
                  <span className="text-xl">{n.icon}</span>
                  <div className="flex-1">
                    <p className={cn("text-sm font-bold", n.cor)}>{n.nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Mín. Anual (R$)</Label>
                      <Input
                        type="number"
                        className="w-28 h-8 text-sm"
                        value={n.minAnual}
                        onChange={e => updateNivel(i, "minAnual", Number(e.target.value))}
                        disabled={i === 0}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Comissão %</Label>
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        value={n.comissao}
                        onChange={e => updateNivel(i, "comissao", Number(e.target.value))}
                        min={0}
                        max={100}
                        step={0.5}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus config */}
          <div className="border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Gift className="w-4 h-4 text-amber-500" /> Bônus por Superação de Meta</h4>
              <Switch checked={draft.bonusAtivo} onCheckedChange={v => setDraft({ ...draft, bonusAtivo: v })} />
            </div>
            {draft.bonusAtivo && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Gatilho (% da meta)</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={draft.bonusPctMeta}
                      onChange={e => setDraft({ ...draft, bonusPctMeta: Number(e.target.value) })}
                      min={100}
                      max={300}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Ex: 120 = ativa quando atingir 120% da meta</p>
                </div>
                <div>
                  <Label className="text-xs">Taxa bônus extra</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={draft.bonusTaxa}
                      onChange={e => setDraft({ ...draft, bonusTaxa: Number(e.target.value) })}
                      min={0}
                      max={50}
                      step={0.5}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Aplicada sobre o valor excedente à meta</p>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} className="w-full">Salvar Configurações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const mesesOpcoes = () => {
  const meses: { value: string; label: string }[] = [];
  const hoje = new Date();
  for (let i = -11; i <= 0; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const l = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    meses.push({ value: v, label: l.charAt(0).toUpperCase() + l.slice(1) });
  }
  return meses;
};

const CRMComissoes = () => {
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [periodoFiltro, setPeriodoFiltro] = useState(new Date().toISOString().slice(0, 7));
  const [config, setConfig] = useState<ComissaoConfig>(loadConfig);
  const allMeses = useMemo(() => mesesOpcoes(), []);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("nome, comissao").then(({ data }) => {
      if (data) setProfiles(data);
    });
  }, []);

  const NIVEIS = config.niveis;

  // Track previous tier levels for confetti on level-up
  const prevNiveisRef = useRef<Record<string, string>>({});
  const hasTriggeredInitialRef = useRef(false);
  const getNivel = (valorAnual: number) => {
    for (let i = NIVEIS.length - 1; i >= 0; i--) {
      if (valorAnual >= NIVEIS[i].minAnual) return NIVEIS[i];
    }
    return NIVEIS[0];
  };

  const vendedores = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l: any) => { if (l.responsavel) set.add(l.responsavel); });
    return Array.from(set).sort();
  }, [leads]);

  const comissoes = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());
    const metas = JSON.parse(localStorage.getItem("gp_erp_crm_metas") || "[]");
    const systemUsers = profiles;

    return vendedores.map(v => {
      let valorAnual = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== v) return;
        if (!(l.dataCriacao || "").startsWith(anoAtual)) return;
        if (l.etapa === "fechado_ganho") valorAnual += l.valor || 0;
      });

      let valorMes = 0, vendas = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== v) return;
        if ((l.dataCriacao || "").slice(0, 7) !== periodoFiltro) return;
        if (l.etapa === "fechado_ganho") { vendas++; valorMes += l.valor || 0; }
      });

      const nivel = getNivel(valorAnual);
      
      // Use user's custom commission rate if set, otherwise use tier rate
      const userCadastro = systemUsers.find(u => u.nome === v);
      const taxaEfetiva = userCadastro?.comissao !== undefined && userCadastro.comissao > 0
        ? userCadastro.comissao
        : nivel.comissao;
      const comissaoBase = valorMes * (taxaEfetiva / 100);

      // Bonus calculation
      let bonusValor = 0;
      if (config.bonusAtivo) {
        const meta = metas.find((m: any) => m.vendedor === v && m.periodo === periodoFiltro);
        if (meta && meta.metaValor > 0) {
          const pctAtingido = (valorMes / meta.metaValor) * 100;
          if (pctAtingido >= config.bonusPctMeta) {
            const excedente = valorMes - meta.metaValor;
            bonusValor = Math.max(0, excedente) * (config.bonusTaxa / 100);
          }
        }
      }

      return {
        vendedor: v,
        nivel,
        valorAnual,
        valorMes,
        vendas,
        taxaComissao: taxaEfetiva,
        comissaoPersonalizada: userCadastro?.comissao !== undefined && userCadastro.comissao > 0,
        comissaoBase,
        bonusValor,
        comissaoTotal: comissaoBase + bonusValor,
      };
    }).sort((a, b) => b.comissaoTotal - a.comissaoTotal);
  }, [vendedores, leads, periodoFiltro, config, NIVEIS, profiles]);

  // 6-month commission history per vendor
  const historicoData = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());
    const meses6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
    });

    return meses6.map(mes => {
      const row: Record<string, any> = { mes: mes.label };
      vendedores.forEach(v => {
        let valorAnual = 0;
        leads.forEach((l: any) => {
          if (l.responsavel !== v || !(l.dataCriacao || "").startsWith(anoAtual) || l.etapa !== "fechado_ganho") return;
          valorAnual += l.valor || 0;
        });
        let valorMes = 0;
        leads.forEach((l: any) => {
          if (l.responsavel !== v || (l.dataCriacao || "").slice(0, 7) !== mes.key || l.etapa !== "fechado_ganho") return;
          valorMes += l.valor || 0;
        });
        const nivel = getNivel(valorAnual);
        row[v] = valorMes * (nivel.comissao / 100);
      });
      return row;
    });
  }, [vendedores, leads, NIVEIS]);

  // Tier proximity alerts
  const proximidadeNivel = useMemo(() => {
    const anoAtual = String(new Date().getFullYear());
    return vendedores.map(v => {
      let valorAnual = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== v || !(l.dataCriacao || "").startsWith(anoAtual) || l.etapa !== "fechado_ganho") return;
        valorAnual += l.valor || 0;
      });
      const nivelAtual = getNivel(valorAnual);
      const idxAtual = NIVEIS.findIndex(n => n.id === nivelAtual.id);
      if (idxAtual < NIVEIS.length - 1) {
        const proximo = NIVEIS[idxAtual + 1];
        const falta = proximo.minAnual - valorAnual;
        const pctProgresso = ((valorAnual - nivelAtual.minAnual) / (proximo.minAnual - nivelAtual.minAnual)) * 100;
        if (pctProgresso >= 70) {
          return { vendedor: v, nivelAtual, proximo, falta, pctProgresso, valorAnual };
        }
      }
      return null;
    }).filter(Boolean) as { vendedor: string; nivelAtual: typeof NIVEIS[0]; proximo: typeof NIVEIS[0]; falta: number; pctProgresso: number; valorAnual: number }[];
  }, [vendedores, leads, NIVEIS]);

  const HISTORY_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(262 83% 58%)", "hsl(199 89% 48%)"];

  // Confetti when vendor levels up or reaches top
  useEffect(() => {
    if (!hasTriggeredInitialRef.current) {
      hasTriggeredInitialRef.current = true;
      // Store initial levels
      comissoes.forEach(c => {
        prevNiveisRef.current[c.vendedor] = c.nivel.id;
      });
      return;
    }

    let shouldCelebrate = false;
    comissoes.forEach(c => {
      const prev = prevNiveisRef.current[c.vendedor];
      if (prev && prev !== c.nivel.id) {
        const prevIdx = NIVEIS.findIndex(n => n.id === prev);
        const newIdx = NIVEIS.findIndex(n => n.id === c.nivel.id);
        if (newIdx > prevIdx) {
          shouldCelebrate = true;
          toast.success(`🎉 ${c.vendedor} subiu para o nível ${c.nivel.icon} ${c.nivel.nome}!`, { duration: 5000 });
        }
      }
      prevNiveisRef.current[c.vendedor] = c.nivel.id;
    });

    if (shouldCelebrate) {
      triggerConfetti();
    }
  }, [comissoes, NIVEIS]);
  const totalComissoes = comissoes.reduce((a, b) => a + b.comissaoTotal, 0);
  const totalBonus = comissoes.reduce((a, b) => a + b.bonusValor, 0);
  const totalVendas = comissoes.reduce((a, b) => a + b.valorMes, 0);
  const mesLabel = allMeses.find(m => m.value === periodoFiltro)?.label || periodoFiltro;

  const chartData = comissoes.map(c => ({
    name: c.vendedor,
    vendas: c.valorMes,
    comissao: c.comissaoBase,
    bonus: c.bonusValor,
  }));

  const exportColumns = [
    { header: "Vendedor", key: "vendedor" },
    { header: "Nível", key: "nivel" },
    { header: "Acum. Anual", key: "valorAnual", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Vendas Mês", key: "valorMes", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Nº Vendas", key: "vendas", align: "center" as const },
    { header: "Taxa %", key: "taxaComissao", align: "center" as const, format: (v: number) => `${v}%` },
    { header: "Comissão", key: "comissaoBase", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Bônus", key: "bonusValor", align: "right" as const, format: (v: number) => formatCurrency(v) },
    { header: "Total", key: "comissaoTotal", align: "right" as const, format: (v: number) => formatCurrency(v) },
  ];

  const exportData = comissoes.map(c => ({
    vendedor: c.vendedor,
    nivel: c.nivel.nome,
    valorAnual: c.valorAnual,
    valorMes: c.valorMes,
    vendas: c.vendas,
    taxaComissao: c.taxaComissao,
    comissaoBase: c.comissaoBase,
    bonusValor: c.bonusValor,
    comissaoTotal: c.comissaoTotal,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Comissões de Vendedores" description="Cálculo automático baseado no nível e vendas fechadas" />
        <div className="flex gap-2 items-center flex-wrap">
          <ConfigComissoesModal config={config} onSave={setConfig} />
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{allMeses.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <ExportButtons options={{
            title: "Relatório de Comissões",
            subtitle: mesLabel,
            filename: `comissoes-${periodoFiltro}`,
            columns: exportColumns,
            data: exportData,
            summaryRows: [
              { label: "Total Vendas", value: formatCurrency(totalVendas) },
              { label: "Total Comissões", value: formatCurrency(totalComissoes) },
              ...(totalBonus > 0 ? [{ label: "Total Bônus", value: formatCurrency(totalBonus) }] : []),
            ],
          }} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Comissões</p>
                <p className="text-lg font-bold">{formatCurrency(totalComissoes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Vendas</p>
                <p className="text-lg font-bold">{formatCurrency(totalVendas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Gift className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Total Bônus</p>
                <p className="text-lg font-bold">{formatCurrency(totalBonus)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10"><Gem className="w-5 h-5 text-cyan-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">% Comissão/Vendas</p>
                <p className="text-lg font-bold">{totalVendas > 0 ? `${((totalComissoes / totalVendas) * 100).toFixed(1)}%` : "0%"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission Tiers Reference */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Gem className="w-4 h-4 text-cyan-500" /> Tabela de Comissões por Nível
          {config.bonusAtivo && (
            <Badge variant="outline" className="text-[10px] gap-1"><Gift className="w-3 h-3" /> Bônus ativo: +{config.bonusTaxa}% acima de {config.bonusPctMeta}% da meta</Badge>
          )}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {NIVEIS.map(n => (
            <div key={n.id} className={cn("p-3 rounded-xl border text-center", n.corBg)}>
              <span className="text-2xl">{n.icon}</span>
              <p className={cn("font-bold text-sm mt-1", n.cor)}>{n.nome}</p>
              <p className="text-xs text-muted-foreground">{n.minAnual > 0 ? `≥ ${formatCurrency(n.minAnual)}` : "Inicial"}</p>
              <p className={cn("text-xl font-bold mt-1", n.cor)}>{n.comissao}%</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Vendas × Comissão × Bônus — {mesLabel}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [formatCurrency(value), name === "vendas" ? "Vendas" : name === "comissao" ? "Comissão" : "Bônus"]}
              />
              <Legend />
              <Bar dataKey="vendas" name="Vendas" fill="hsl(var(--primary))" opacity={0.3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="comissao" name="Comissão" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bonus" name="Bônus" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Tier Proximity Alerts */}
      {proximidadeNivel.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Próximos a Subir de Nível
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proximidadeNivel.map(p => (
              <div key={p.vendedor} className={cn("flex items-center gap-3 p-3 rounded-xl border", p.proximo.corBg)}>
                <span className="text-2xl">{p.proximo.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{p.vendedor}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.nivelAtual.icon} {p.nivelAtual.nome} → {p.proximo.icon} {p.proximo.nome} · Faltam <span className="font-bold">{formatCurrency(p.falta)}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, p.pctProgresso)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold">{p.pctProgresso.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6-Month Commission History */}
      {historicoData.length > 0 && vendedores.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" /> Evolução de Comissões — Últimos 6 Meses
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={historicoData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              {vendedores.map((v, i) => (
                <Line key={v} type="monotone" dataKey={v} name={v} stroke={HISTORY_COLORS[i % HISTORY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Executive Monthly Summary */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" /> Resumo Executivo Mensal — {mesLabel}
        </h3>
        {(() => {
          // Previous month data
          const mesAtualDate = new Date(parseInt(periodoFiltro.slice(0, 4)), parseInt(periodoFiltro.slice(5, 7)) - 1, 1);
          const mesAnteriorDate = new Date(mesAtualDate.getFullYear(), mesAtualDate.getMonth() - 1, 1);
          const mesAnteriorKey = `${mesAnteriorDate.getFullYear()}-${String(mesAnteriorDate.getMonth() + 1).padStart(2, "0")}`;
          const mesAnteriorLabel = mesAnteriorDate.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

          let totalMesAnterior = 0, comissaoMesAnterior = 0;
          vendedores.forEach(v => {
            let valorAnualPrev = 0;
            leads.forEach((l: any) => {
              if (l.responsavel !== v || l.etapa !== "fechado_ganho") return;
              if ((l.dataCriacao || "").startsWith(String(mesAnteriorDate.getFullYear()))) valorAnualPrev += l.valor || 0;
            });
            let valorMesPrev = 0;
            leads.forEach((l: any) => {
              if (l.responsavel !== v || (l.dataCriacao || "").slice(0, 7) !== mesAnteriorKey || l.etapa !== "fechado_ganho") return;
              valorMesPrev += l.valor || 0;
            });
            const nivelPrev = getNivel(valorAnualPrev);
            totalMesAnterior += valorMesPrev;
            comissaoMesAnterior += valorMesPrev * (nivelPrev.comissao / 100);
          });

          const varVendas = totalMesAnterior > 0 ? ((totalVendas - totalMesAnterior) / totalMesAnterior * 100) : 0;
          const varComissao = comissaoMesAnterior > 0 ? ((totalComissoes - comissaoMesAnterior) / comissaoMesAnterior * 100) : 0;

          // Projection: based on average of last 3 months
          const meses3 = Array.from({ length: 3 }, (_, i) => {
            const d = new Date(mesAtualDate.getFullYear(), mesAtualDate.getMonth() - (2 - i), 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          });
          let soma3 = 0, count3 = 0;
          meses3.forEach(mk => {
            let total = 0;
            leads.forEach((l: any) => {
              if ((l.dataCriacao || "").slice(0, 7) === mk && l.etapa === "fechado_ganho") total += l.valor || 0;
            });
            if (total > 0) { soma3 += total; count3++; }
          });
          const mediaMensal = count3 > 0 ? soma3 / count3 : totalVendas;
          const mesesRestantes = 12 - mesAtualDate.getMonth();
          
          // Calculate year-to-date totals
          let acumAnual = 0;
          for (let m = 0; m <= mesAtualDate.getMonth(); m++) {
            const mk = `${mesAtualDate.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
            leads.forEach((l: any) => {
              if ((l.dataCriacao || "").slice(0, 7) === mk && l.etapa === "fechado_ganho") acumAnual += l.valor || 0;
            });
          }
          const projecaoAnual = acumAnual + (mediaMensal * Math.max(0, mesesRestantes - 1));

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Vendas {mesLabel}</p>
                  <p className="text-lg font-bold">{formatCurrency(totalVendas)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {varVendas >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                    <span className={cn("text-xs font-semibold", varVendas >= 0 ? "text-green-600" : "text-destructive")}>{varVendas >= 0 ? "+" : ""}{varVendas.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Comissões {mesLabel}</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalComissoes)}</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {varComissao >= 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                    <span className={cn("text-xs font-semibold", varComissao >= 0 ? "text-green-600" : "text-destructive")}>{varComissao >= 0 ? "+" : ""}{varComissao.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border bg-muted/30 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Mês Anterior</p>
                  <p className="text-lg font-bold text-muted-foreground">{formatCurrency(totalMesAnterior)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{mesAnteriorLabel}</p>
                </div>
                <div className="p-3 rounded-xl border bg-primary/5 border-primary/20 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Projeção Anual</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(projecaoAnual)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Baseado na média de 3 meses</p>
                </div>
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Annual Ranking with Trophies */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" /> Ranking Anual {new Date().getFullYear()} — Premiações por Desempenho
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => triggerConfetti()}
            >
              <Sparkles className="w-4 h-4" /> Celebrar
            </Button>
          </div>
        </div>
        {(() => {
          const anoAtual = String(new Date().getFullYear());
          const rankingAnual = vendedores.map(v => {
            let valorAnual = 0, vendasAnual = 0;
            leads.forEach((l: any) => {
              if (l.responsavel !== v || !(l.dataCriacao || "").startsWith(anoAtual) || l.etapa !== "fechado_ganho") return;
              valorAnual += l.valor || 0;
              vendasAnual++;
            });
            const nivel = getNivel(valorAnual);
            const comissaoAnual = valorAnual * (nivel.comissao / 100);
            return { vendedor: v, valorAnual, vendasAnual, nivel, comissaoAnual };
          }).sort((a, b) => b.valorAnual - a.valorAnual);

          const premiacoes = [
            { pos: 0, icon: "🏆", label: "Campeão", badgeCor: "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
            { pos: 1, icon: "🥈", label: "Vice-Campeão", badgeCor: "bg-slate-100 border-slate-400 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400" },
            { pos: 2, icon: "🥉", label: "3º Lugar", badgeCor: "bg-orange-100 border-orange-400 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
          ];

          const bestSeller = rankingAnual.reduce((best, r) => r.vendasAnual > (best?.vendasAnual || 0) ? r : best, rankingAnual[0]);
          const bestCommission = rankingAnual.reduce((best, r) => r.comissaoAnual > (best?.comissaoAnual || 0) ? r : best, rankingAnual[0]);

          return (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    exportCertificadoPDF(rankingAnual);
                    toast.success("Certificado PDF gerado!");
                  }}
                >
                  <FileText className="w-4 h-4" /> Exportar Certificado PDF
                </Button>
              </div>
              {/* Special awards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20 text-center">
                  <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Mais Vendas (Qtd)</p>
                  <p className="text-sm font-bold mt-1">{bestSeller?.vendedor || "—"}</p>
                  <p className="text-xs text-muted-foreground">{bestSeller?.vendasAnual || 0} vendas fechadas</p>
                </div>
                <div className="p-3 rounded-xl border bg-primary/5 border-primary/20 text-center">
                  <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Maior Faturamento</p>
                  <p className="text-sm font-bold mt-1">{rankingAnual[0]?.vendedor || "—"}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(rankingAnual[0]?.valorAnual || 0)}</p>
                </div>
                <div className="p-3 rounded-xl border bg-green-500/5 border-green-500/20 text-center">
                  <Trophy className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground uppercase">Maior Comissão</p>
                  <p className="text-sm font-bold mt-1">{bestCommission?.vendedor || "—"}</p>
                  <p className="text-xs text-green-600">{formatCurrency(bestCommission?.comissaoAnual || 0)}</p>
                </div>
              </div>

              {/* Full ranking */}
              <div className="space-y-2">
                {rankingAnual.map((r, idx) => {
                  const premiacao = premiacoes.find(p => p.pos === idx);
                  return (
                    <div key={r.vendedor} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      idx === 0 ? "bg-amber-500/5 ring-1 ring-amber-400/30" :
                      idx === 1 ? "bg-slate-500/5 ring-1 ring-slate-300/30" :
                      idx === 2 ? "bg-orange-500/5 ring-1 ring-orange-300/30" : "bg-muted/20"
                    )}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0">
                        {premiacao ? premiacao.icon : <span className="text-sm font-bold text-muted-foreground">{idx + 1}º</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{r.vendedor}</span>
                          <span className={cn("inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border font-medium", r.nivel.corBg, r.nivel.cor)}>
                            {r.nivel.icon} {r.nivel.nome}
                          </span>
                          {premiacao && (
                            <Badge variant="outline" className={cn("text-[9px]", premiacao.badgeCor)}>
                              {premiacao.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span>{formatCurrency(r.valorAnual)}</span>
                          <span>•</span>
                          <span>{r.vendasAnual} vendas</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">Comissão: {formatCurrency(r.comissaoAnual)}</span>
                        </div>
                      </div>
                      {idx < 3 && (
                        <div className="shrink-0">
                          {idx === 0 ? <Trophy className="w-5 h-5 text-amber-500" /> :
                           idx === 1 ? <Medal className="w-5 h-5 text-slate-400" /> :
                           <Award className="w-5 h-5 text-orange-600" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhamento de Comissões — {mesLabel}</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-center">Nível</TableHead>
              <TableHead className="text-right">Acum. Anual</TableHead>
              <TableHead className="text-right">Vendas Mês</TableHead>
              <TableHead className="text-center">Nº Vendas</TableHead>
              <TableHead className="text-center">Taxa</TableHead>
              <TableHead className="text-right">Comissão</TableHead>
              <TableHead className="text-right">Bônus</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comissoes.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum dado para este período</TableCell></TableRow>
            )}
            {comissoes.map(c => (
              <TableRow key={c.vendedor}>
                <TableCell className="font-medium">{c.vendedor}</TableCell>
                <TableCell className="text-center">
                  <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium", c.nivel.corBg, c.nivel.cor)}>
                    {c.nivel.icon} {c.nivel.nome}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{formatCurrency(c.valorAnual)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(c.valorMes)}</TableCell>
                <TableCell className="text-center">{c.vendas}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {c.taxaComissao}%
                    {(c as any).comissaoPersonalizada && <span className="ml-1 text-[9px] text-primary" title="Taxa personalizada do cadastro">★</span>}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(c.comissaoBase)}</TableCell>
                <TableCell className="text-right">
                  {c.bonusValor > 0 ? (
                    <span className="text-amber-600 font-semibold">+{formatCurrency(c.bonusValor)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-green-600">{formatCurrency(c.comissaoTotal)}</TableCell>
              </TableRow>
            ))}
            {comissoes.length > 0 && (
              <TableRow className="bg-muted/30 font-bold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalVendas)}</TableCell>
                <TableCell className="text-center">{comissoes.reduce((a, b) => a + b.vendas, 0)}</TableCell>
                <TableCell />
                <TableCell className="text-right">{formatCurrency(totalComissoes - totalBonus)}</TableCell>
                <TableCell className="text-right text-amber-600">{totalBonus > 0 ? `+${formatCurrency(totalBonus)}` : "—"}</TableCell>
                <TableCell className="text-right text-green-600">{formatCurrency(totalComissoes)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CRMComissoes;
