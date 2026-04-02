import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Truck, CreditCard, X, ChevronRight, Volume2, VolumeX, Percent, FlaskConical, PackageX, Target, ShieldAlert, Handshake, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInDays, isBefore, parseISO } from "date-fns";
import { toast } from "sonner";

interface Alerta {
  id: string;
  tipo: "pedido_atrasado" | "conta_vencida" | "promo_expirando" | "validade_proxima" | "falta_critica" | "meta_compras_90" | "divergencia_fiscal" | "lead_parado" | "atividade_atrasada_crm" | "meta_vendedor_atingida" | "nivel_vendedor_subiu" | "ranking_mudou" | "nivel_proximo" | "alerta_seguranca" | "ibpt_vencida" | "variacao_preco";
  titulo: string;
  descricao: string;
  diasAtraso: number;
  valor?: number;
  rota: string;
}

function getAlertas(): Alerta[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alertas: Alerta[] = [];

  try {
    const pedidos = JSON.parse(localStorage.getItem("pedidos_compra") || "[]");
    pedidos
      .filter((p: any) => (p.status === "enviado" || p.status === "parcial") && p.dataEntrega && isBefore(parseISO(p.dataEntrega), hoje))
      .forEach((p: any) => {
        alertas.push({
          id: `ped-${p.id}`,
          tipo: "pedido_atrasado",
          titulo: `Pedido ${p.numero} atrasado`,
          descricao: `${p.fornecedorNome} · Entrega: ${format(parseISO(p.dataEntrega), "dd/MM/yyyy")}`,
          diasAtraso: differenceInDays(hoje, parseISO(p.dataEntrega)),
          rota: "/compras/pedidos",
        });
      });
  } catch {
    // erro ignorado
  }

  try {
    const contas = JSON.parse(localStorage.getItem("contas_pagar") || "[]");
    contas.forEach((c: any) => {
      if (c.status === "cancelada" || c.status === "paga") return;
      (c.parcelas || []).forEach((p: any, idx: number) => {
        if (p.status === "paga") return;
        const venc = parseISO(p.vencimento);
        if (isBefore(venc, hoje)) {
          alertas.push({
            id: `cp-${c.id}-${idx}`,
            tipo: "conta_vencida",
            titulo: `Conta vencida — ${c.fornecedor}`,
            descricao: `${c.descricao} · Venc: ${format(venc, "dd/MM/yyyy")}`,
            diasAtraso: differenceInDays(hoje, venc),
            valor: p.valor - (p.valorPago || 0),
            rota: "/financeiro/contas-pagar",
          });
        }
      });
    });
  } catch {
    // erro ignorado
  }

  // Promoções próximas de expirar (3 dias ou menos)
  try {
    const promocoes = JSON.parse(localStorage.getItem("promocoes") || "[]");
    promocoes.forEach((pr: any) => {
      if (pr.status !== "ABERTO" || !pr.fim) return;
      const diasRestantes = differenceInDays(parseISO(pr.fim), hoje);
      if (diasRestantes >= 0 && diasRestantes <= 3) {
        alertas.push({
          id: `promo-${pr.id}`,
          tipo: "promo_expirando",
          titulo: `Promoção expira ${diasRestantes === 0 ? "hoje" : `em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`}`,
          descricao: `${pr.descricao || `Cód. ${pr.codigo}`} · ${pr.produtos?.length || 0} produto(s) (até ${format(parseISO(pr.fim), "dd/MM")})`,
          diasAtraso: diasRestantes === 0 ? 999 : diasRestantes,
          rota: "/comercial/promocoes",
        });
      }
    });
  } catch {
    // erro ignorado
  }

  // Validade próxima ao vencimento (ordens de produção)
  try {
    const ordens = JSON.parse(localStorage.getItem("ordens_producao") || "[]");
    ordens.forEach((op: any) => {
      if (!op.dataValidade) return;
      const validade = parseISO(op.dataValidade);
      const diasRestantes = differenceInDays(validade, hoje);
      if (diasRestantes <= 7) {
        alertas.push({
          id: `val-${op.id}`,
          tipo: "validade_proxima",
          titulo: diasRestantes < 0 ? `Produto vencido — ${op.produtoDescricao || op.numero}` : diasRestantes === 0 ? `Vence hoje — ${op.produtoDescricao || op.numero}` : `Validade próxima — ${op.produtoDescricao || op.numero}`,
          descricao: `${op.lote ? `Lote: ${op.lote} · ` : ""}Val: ${format(validade, "dd/MM/yyyy")}`,
          diasAtraso: diasRestantes < 0 ? Math.abs(diasRestantes) + 100 : diasRestantes === 0 ? 999 : diasRestantes,
          rota: "/producao/ordens",
        });
      }
    });
  } catch {
    // erro ignorado
  }

  // Faltas de mercadorias com prioridade crítica
  try {
    const faltas = JSON.parse(localStorage.getItem("faltas_mercadorias") || "[]");
    faltas
      .filter((f: any) => f.prioridade === "critica" && f.status !== "resolvida" && f.status !== "pedido_realizado")
      .forEach((f: any) => {
        alertas.push({
          id: `falta-${f.id}`,
          tipo: "falta_critica",
          titulo: `Falta crítica — ${f.produto}`,
          descricao: `${f.quantidadeFalta} ${f.unidade} em falta${f.fornecedor ? ` · ${f.fornecedor}` : ""} · ${f.motivoFalta}`,
          diasAtraso: 500,
          rota: "/compras/faltas-mercadorias",
        });
      });
  } catch {
    // erro ignorado
  }

  // Alerta de meta mensal de compras >= 90%
  try {
    const meta = Number(localStorage.getItem("meta_compras_mensal")) || 0;
    if (meta > 0) {
      const pedidos = JSON.parse(localStorage.getItem("pedidos_compra") || "[]");
      const now = new Date();
      const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const valorMes = pedidos.reduce((acc: number, p: any) => {
        const d = (p.dataEmissao || "").substring(0, 7);
        if (d === mesAtual) return acc + (p.valorLiquido || p.valorTotal || 0);
        return acc;
      }, 0);
      const pct = (valorMes / meta) * 100;
      if (pct >= 90) {
        alertas.push({
          id: "meta-compras-90",
          tipo: "meta_compras_90",
          titulo: pct >= 100 ? "Meta de compras atingida!" : "Compras próximas da meta (≥90%)",
          descricao: `R$ ${valorMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${meta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${pct.toFixed(1)}%)`,
          diasAtraso: pct >= 100 ? 0 : 1,
          valor: valorMes,
          rota: "/compras/dashboard",
        });
      }
    }
  } catch {
    // erro ignorado
  }

   // Divergências fiscais não corrigidas
  try {
    const produtos = JSON.parse(localStorage.getItem("produtos") || "[]");
    const naoCorrigidos = produtos.filter((p: any) => p.auditoriaCorrigida === false || (p.auditoriaCorrigida === undefined && p.ncm));
    const produtosAuditaveis = produtos.filter((p: any) => p.ncm && p.ncm.length >= 8);
    const semAuditoria = produtosAuditaveis.filter((p: any) => !p.auditoriaCorrigida);
    if (semAuditoria.length > 0 && produtosAuditaveis.length >= 5) {
      alertas.push({
        id: "divergencia-fiscal",
        tipo: "divergencia_fiscal",
        titulo: `${semAuditoria.length} produto(s) com divergência fiscal`,
        descricao: `${semAuditoria.length} de ${produtosAuditaveis.length} produtos aguardam auditoria tributária`,
        diasAtraso: 50,
        rota: "/fiscal/auditoria",
      });
    }
  } catch {
    // erro ignorado
  }

  // CRM: Leads parados no funil (sem atualização há 7+ dias)
  try {
    const crmConfig = JSON.parse(localStorage.getItem("gp_erp_crm_automacoes_config") || "{}");
    const alertaAtivo = crmConfig.alertaParadoAtivo !== false;
    const diasLimite = crmConfig.alertaParadoDias || 7;
    if (alertaAtivo) {
      const leads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
      const leadsParados = leads.filter((l: any) => {
        if (['fechado_ganho', 'fechado_perdido'].includes(l.etapa)) return false;
        const diff = Math.round((hoje.getTime() - new Date(l.dataAtualizacao).getTime()) / (1000 * 60 * 60 * 24));
        return diff >= diasLimite;
      });
      if (leadsParados.length > 0) {
        alertas.push({
          id: "crm-leads-parados",
          tipo: "lead_parado",
          titulo: `${leadsParados.length} lead(s) parado(s) no funil`,
          descricao: `Leads sem movimentação há ${diasLimite}+ dias no CRM`,
          diasAtraso: 40,
          rota: "/crm/automacoes",
        });
      }
    }
  } catch {
    // erro ignorado
  }

  // CRM: Metas de vendedor atingidas (100%+)
  try {
    const metas = JSON.parse(localStorage.getItem("gp_erp_crm_metas") || "[]");
    const leads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const metasMes = metas.filter((m: any) => m.periodo === mesAtual);
    metasMes.forEach((m: any) => {
      let valorRealizado = 0;
      leads.forEach((l: any) => {
        if (l.responsavel !== m.vendedor) return;
        if ((l.dataCriacao || "").slice(0, 7) !== mesAtual) return;
        if (l.etapa === "fechado_ganho") valorRealizado += l.valor || 0;
      });
      const pct = m.metaValor > 0 ? Math.round((valorRealizado / m.metaValor) * 100) : 0;
      if (pct >= 100) {
        alertas.push({
          id: `meta-vendedor-${m.id}`,
          tipo: "meta_vendedor_atingida",
          titulo: `🏆 ${m.vendedor} atingiu ${pct}% da meta!`,
          descricao: `R$ ${valorRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${m.metaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          diasAtraso: 0,
          valor: valorRealizado,
          rota: "/crm/metas",
        });
      }
    });
  } catch {
    // erro ignorado
  }

  // CRM: Atividades atrasadas
  try {
    const crmConfig = JSON.parse(localStorage.getItem("gp_erp_crm_automacoes_config") || "{}");
    const alertaAtivo = crmConfig.alertaAtrasadoAtivo !== false;
    if (alertaAtivo) {
      const atividades = JSON.parse(localStorage.getItem("gp_erp_crm_atividades") || "[]");
      const atrasadas = atividades.filter((a: any) => {
        if (a.status === 'concluida' || a.status === 'cancelada') return false;
        return new Date(a.dataAgendada) < hoje;
      });
      if (atrasadas.length > 0) {
        alertas.push({
          id: "crm-atividades-atrasadas",
          tipo: "atividade_atrasada_crm",
          titulo: `${atrasadas.length} atividade(s) CRM atrasada(s)`,
          descricao: `Atividades comerciais vencidas aguardando conclusão`,
          diasAtraso: 35,
          rota: "/crm/atividades",
        });
      }
    }
  } catch {
    // erro ignorado
  }

  // CRM: Vendedor subiu de nível (Bronze→Prata→Ouro→Diamante)
  try {
    const prevLevels: Record<string, string> = JSON.parse(localStorage.getItem("gp_erp_crm_levels_seen") || "{}");
    const crmLeads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
    const anoAtual = String(hoje.getFullYear());
    const NIVEIS_NAMES: Record<string, string> = { bronze: "Bronze", prata: "Prata", ouro: "Ouro", diamante: "Diamante" };
    const NIVEIS_MIN = [
      { id: "bronze", min: 0 }, { id: "prata", min: 50000 },
      { id: "ouro", min: 150000 }, { id: "diamante", min: 300000 },
    ];
    const getNivelId = (val: number) => {
      for (let i = NIVEIS_MIN.length - 1; i >= 0; i--) {
        if (val >= NIVEIS_MIN[i].min) return NIVEIS_MIN[i].id;
      }
      return "bronze";
    };

    const vendedoresSet = new Set<string>();
    crmLeads.forEach((l: any) => { if (l.responsavel) vendedoresSet.add(l.responsavel); });

    vendedoresSet.forEach(v => {
      let valorAnual = 0;
      crmLeads.forEach((l: any) => {
        if (l.responsavel !== v) return;
        if (!(l.dataCriacao || "").startsWith(anoAtual)) return;
        if (l.etapa === "fechado_ganho") valorAnual += l.valor || 0;
      });
      const nivelAtual = getNivelId(valorAnual);
      const nivelAnterior = prevLevels[v];
      if (nivelAnterior && nivelAnterior !== nivelAtual) {
        const prevIdx = NIVEIS_MIN.findIndex(n => n.id === nivelAnterior);
        const currIdx = NIVEIS_MIN.findIndex(n => n.id === nivelAtual);
        if (currIdx > prevIdx) {
          alertas.push({
            id: `nivel-${v}`,
            tipo: "nivel_vendedor_subiu",
            titulo: `🎖️ ${v} subiu para ${NIVEIS_NAMES[nivelAtual]}!`,
            descricao: `Acumulado anual: R$ ${valorAnual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            diasAtraso: 0,
            rota: "/crm/desempenho",
          });
        }
      }
    });
  } catch {
    // erro ignorado
  }

  // CRM: Ranking change notification
  try {
    const prevRanking: { vendedor: string; posicao: number }[] = JSON.parse(localStorage.getItem("gp_erp_crm_ranking_prev") || "[]");
    const currRanking: { vendedor: string; posicao: number }[] = JSON.parse(localStorage.getItem("gp_erp_crm_ranking_snapshot") || "[]");
    if (prevRanking.length > 0 && currRanking.length > 0) {
      currRanking.forEach(curr => {
        const prev = prevRanking.find(p => p.vendedor === curr.vendedor);
        if (prev && curr.posicao < prev.posicao) {
          alertas.push({
            id: `ranking-${curr.vendedor}`,
            tipo: "ranking_mudou",
            titulo: `📈 ${curr.vendedor} subiu no ranking!`,
            descricao: `De ${prev.posicao}º para ${curr.posicao}º lugar`,
            diasAtraso: 0,
            rota: "/crm/desempenho",
          });
        }
      });
    }
    // Save current as previous for next check
    if (currRanking.length > 0) {
      localStorage.setItem("gp_erp_crm_ranking_prev", JSON.stringify(currRanking));
    }
  } catch {
    // erro ignorado
  }

  // CRM: Vendedor próximo de subir de nível (≥70% do caminho)
  try {
    const crmLeads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
    const comissaoConfig = JSON.parse(localStorage.getItem("gp_erp_comissao_config") || "null");
    const anoAtual = String(hoje.getFullYear());
    const TIER_DEFAULTS = [
      { id: "bronze", nome: "Bronze", icon: "🥉", min: 0 },
      { id: "prata", nome: "Prata", icon: "🥈", min: 50000 },
      { id: "ouro", nome: "Ouro", icon: "🥇", min: 150000 },
      { id: "diamante", nome: "Diamante", icon: "💎", min: 300000 },
    ];
    const niveis = comissaoConfig?.niveis?.length === 4
      ? comissaoConfig.niveis.map((n: any, i: number) => ({ ...TIER_DEFAULTS[i], min: n.minAnual ?? TIER_DEFAULTS[i].min, ...n }))
      : TIER_DEFAULTS;

    const vendedoresSet = new Set<string>();
    crmLeads.forEach((l: any) => { if (l.responsavel) vendedoresSet.add(l.responsavel); });

    vendedoresSet.forEach(v => {
      let valorAnual = 0;
      crmLeads.forEach((l: any) => {
        if (l.responsavel !== v || !(l.dataCriacao || "").startsWith(anoAtual) || l.etapa !== "fechado_ganho") return;
        valorAnual += l.valor || 0;
      });
      // Find current tier
      let idxAtual = 0;
      for (let i = niveis.length - 1; i >= 0; i--) {
        if (valorAnual >= (niveis[i].minAnual ?? niveis[i].min)) { idxAtual = i; break; }
      }
      if (idxAtual < niveis.length - 1) {
        const proximo = niveis[idxAtual + 1];
        const atual = niveis[idxAtual];
        const minAtual = atual.minAnual ?? atual.min;
        const minProximo = proximo.minAnual ?? proximo.min;
        const falta = minProximo - valorAnual;
        const pct = ((valorAnual - minAtual) / (minProximo - minAtual)) * 100;
        if (pct >= 70) {
          alertas.push({
            id: `nivel-proximo-${v}`,
            tipo: "nivel_proximo",
            titulo: `📊 ${v} está a ${falta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} do nível ${proximo.nome}!`,
            descricao: `${(pct).toFixed(0)}% do caminho ${atual.nome} → ${proximo.nome}`,
            diasAtraso: 5,
            rota: "/crm/comissoes",
          });
        }
      }
    });
  } catch {
    // erro ignorado
  }

  // Security alerts loaded from Supabase are handled separately via getAuditLogs()
  // For now, skip localStorage-based security alerts as audit logs are in Supabase

  // Alerta de bloqueio automático ativo
  try {
    const blockedUsers = JSON.parse(localStorage.getItem("blocked-users") || "[]");
    const now = new Date();
    blockedUsers.forEach((b: any) => {
      if (new Date(b.expiresAt) > now) {
        const minutesLeft = Math.max(1, Math.ceil((new Date(b.expiresAt).getTime() - now.getTime()) / 60000));
        alertas.push({
          id: `block-${b.userId}`,
          tipo: "alerta_seguranca",
          titulo: `🔒 ${b.userName} — bloqueado automaticamente`,
          descricao: `Bloqueio expira em ${minutesLeft} min. ${b.reason}`,
          diasAtraso: 950,
          rota: "/configuracoes/relatorio-seguranca",
        });
      }
    });
  } catch {
    // erro ignorado
  }

  return alertas.sort((a, b) => b.diasAtraso - a.diasAtraso);
}

export function NotificacoesPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [somAtivo, setSomAtivo] = useState<boolean>(() => {
    try { return localStorage.getItem("notif_som") !== "false"; } catch { return true; }
  });
  const [toastAtivo, setToastAtivo] = useState<boolean>(() => {
    try { return localStorage.getItem("notif_toast") !== "false"; } catch { return true; }
  });
  const prevCountRef = useRef<number>(0);
  const initialLoadRef = useRef(true);

  const toggleSom = useCallback((v: boolean) => {
    setSomAtivo(v);
    localStorage.setItem("notif_som", String(v));
  }, []);

  const toggleToast = useCallback((v: boolean) => {
    setToastAtivo(v);
    localStorage.setItem("notif_toast", String(v));
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!somAtivo) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
    // erro ignorado
  }
  }, [somAtivo]);

  // Refresh alerts every 30s and on open
  useEffect(() => {
    const check = () => {
      const newAlertas = getAlertas();
      setAlertas(prev => {
        const newCount = newAlertas.length;
        if (!initialLoadRef.current && newCount > prevCountRef.current) {
          const diff = newCount - prevCountRef.current;
          playNotificationSound();
          if (toastAtivo) {
            toast.warning(`${diff} novo(s) alerta(s)`, {
              description: "Pedidos atrasados, contas vencidas ou validades próximas",
            });
          }
        }
        prevCountRef.current = newCount;
        initialLoadRef.current = false;
        return newAlertas;
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [playNotificationSound, toastAtivo]);

  // IBPT expiry async check
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { differenceInDays: diffDays } = await import("date-fns");
        const { data: rows } = await (supabase.from("ibpt_dados" as any) as any)
          .select("updated_at")
          .order("updated_at", { ascending: false })
          .limit(1);
        
        let vencida = true;
        let dias = 0;
        let desc = "Nenhuma tabela IBPTax importada no Supabase. Importe o CSV oficial.";
        
        if (rows && rows.length > 0) {
          dias = diffDays(new Date(), new Date(rows[0].updated_at));
          vencida = dias > 180;
          desc = `Última atualização há ${dias} dias. A Lei 12.741 exige dados atualizados.`;
        }
        
        if (vencida) {
          setAlertas(prev => {
            if (prev.some(a => a.id === "ibpt-vencida")) return prev;
            return [...prev, {
              id: "ibpt-vencida",
              tipo: "ibpt_vencida" as const,
              titulo: "⚠️ Tabela IBPTax desatualizada",
              descricao: desc,
              diasAtraso: 999,
              rota: "/tabelas/ibpt",
            }];
          });
        }
      } catch {
    // erro ignorado
  }
    })();
  }, []);

  // Price variation alerts (configurable threshold via localStorage)
  useEffect(() => {
    (async () => {
      try {
        const limiar = Number(localStorage.getItem("alerta_variacao_limiar")) || 30;
        const { fetchVariacaoCategoriasData } = await import("@/components/compras/VariacaoPrecosCategoria");
        const categorias = await fetchVariacaoCategoriasData();
        const alertasCat = categorias
          .filter(c => c.variacao > limiar)
          .map(c => ({
            id: `variacao-preco-${c.nome}`,
            tipo: "variacao_preco" as const,
            titulo: `⚠️ Variação ${c.variacao.toFixed(0)}% — ${c.nome}`,
            descricao: `Custo: ${c.custoMin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} → ${c.custoMax.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${c.fornecedores} fornecedor${c.fornecedores > 1 ? "es" : ""})`,
            diasAtraso: c.variacao > 50 ? 800 : 600,
            rota: "/compras/dashboard",
          }));
        if (alertasCat.length > 0) {
          setAlertas(prev => {
            // Remove old variacao_preco alerts and add fresh ones
            const filtered = prev.filter(a => a.tipo !== "variacao_preco");
            return [...filtered, ...alertasCat].sort((a, b) => b.diasAtraso - a.diasAtraso);
          });
        }
      } catch {
    // erro ignorado
  }
    })();
  }, []);

  useEffect(() => {
    if (open) setAlertas(getAlertas());
  }, [open]);

  const visibleAlertas = alertas.filter(a => !dismissed.has(a.id));
  const count = visibleAlertas.length;

  const dismiss = (id: string) => setDismissed(prev => new Set(prev).add(id));

  const pedidosCount = visibleAlertas.filter(a => a.tipo === "pedido_atrasado").length;
  const contasCount = visibleAlertas.filter(a => a.tipo === "conta_vencida").length;
  const promosCount = visibleAlertas.filter(a => a.tipo === "promo_expirando").length;
  const validadeCount = visibleAlertas.filter(a => a.tipo === "validade_proxima").length;
  const faltasCount = visibleAlertas.filter(a => a.tipo === "falta_critica").length;
  const fiscalCount = visibleAlertas.filter(a => a.tipo === "divergencia_fiscal").length;
  const crmCount = visibleAlertas.filter(a => a.tipo === "lead_parado" || a.tipo === "atividade_atrasada_crm").length;
  const metaVendedorCount = visibleAlertas.filter(a => a.tipo === "meta_vendedor_atingida").length;
  const segurancaCount = visibleAlertas.filter(a => a.tipo === "alerta_seguranca").length;
  const variacaoPrecoCount = visibleAlertas.filter(a => a.tipo === "variacao_preco").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Notificações</span>
            {count > 0 && <Badge variant="destructive" className="text-[10px] h-5">{count}</Badge>}
          </div>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDismissed(new Set(alertas.map(a => a.id)))}>
              Limpar tudo
            </Button>
          )}
        </div>

        {/* Settings row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              {somAtivo ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              Som
              <Switch checked={somAtivo} onCheckedChange={toggleSom} className="scale-75" />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              Aviso
              <Switch checked={toastAtivo} onCheckedChange={toggleToast} className="scale-75" />
            </label>
          </div>
        </div>

        {count > 0 && (
          <div className="flex gap-2 px-4 py-2 border-b border-border">
            {pedidosCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Truck className="h-3 w-3" /> {pedidosCount} pedido{pedidosCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {contasCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <CreditCard className="h-3 w-3" /> {contasCount} conta{contasCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {promosCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                <Percent className="h-3 w-3" /> {promosCount} promoção(ões)
              </Badge>
            )}
            {validadeCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600">
                <FlaskConical className="h-3 w-3" /> {validadeCount} validade(s)
              </Badge>
            )}
            {faltasCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
                <PackageX className="h-3 w-3" /> {faltasCount} falta(s) crítica(s)
              </Badge>
            )}
            {fiscalCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                <ShieldAlert className="h-3 w-3" /> {fiscalCount} fiscal
              </Badge>
            )}
            {crmCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600">
                <Handshake className="h-3 w-3" /> {crmCount} CRM
              </Badge>
            )}
            {metaVendedorCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-green-500/40 text-green-600">
                <Target className="h-3 w-3" /> {metaVendedorCount} meta(s) atingida(s)
              </Badge>
            )}
            {segurancaCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
                <ShieldAlert className="h-3 w-3" /> {segurancaCount} alerta(s) segurança
              </Badge>
            )}
            {variacaoPrecoCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
                <TrendingUp className="h-3 w-3" /> {variacaoPrecoCount} variação(ões) preço
              </Badge>
            )}
          </div>
        )}

        <ScrollArea className="max-h-80">
          {visibleAlertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleAlertas.map(a => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => { navigate(a.rota); setOpen(false); }}
                >
                  <div className={`mt-0.5 p-1.5 rounded-md ${a.tipo === "variacao_preco" ? "bg-destructive/10" : a.tipo === "alerta_seguranca" || a.tipo === "ibpt_vencida" ? "bg-destructive/10" : a.tipo === "meta_vendedor_atingida" || a.tipo === "nivel_vendedor_subiu" || a.tipo === "ranking_mudou" ? "bg-green-500/10" : a.tipo === "nivel_proximo" ? "bg-amber-500/10" : a.tipo === "promo_expirando" ? "bg-primary/10" : a.tipo === "validade_proxima" ? "bg-amber-500/10" : (a.tipo === "lead_parado" || a.tipo === "atividade_atrasada_crm") ? "bg-amber-500/10" : "bg-destructive/10"}`}>
                    {a.tipo === "ibpt_vencida" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : a.tipo === "alerta_seguranca" ? (
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                    ) : a.tipo === "pedido_atrasado" ? (
                      <Truck className="h-4 w-4 text-destructive" />
                    ) : a.tipo === "promo_expirando" ? (
                      <Percent className="h-4 w-4 text-primary" />
                    ) : a.tipo === "validade_proxima" ? (
                      <FlaskConical className="h-4 w-4 text-amber-600" />
                    ) : a.tipo === "falta_critica" ? (
                      <PackageX className="h-4 w-4 text-destructive" />
                    ) : a.tipo === "meta_compras_90" ? (
                      <Target className="h-4 w-4 text-primary" />
                    ) : a.tipo === "divergencia_fiscal" ? (
                      <ShieldAlert className="h-4 w-4 text-primary" />
                    ) : a.tipo === "lead_parado" ? (
                      <Handshake className="h-4 w-4 text-amber-600" />
                    ) : a.tipo === "atividade_atrasada_crm" ? (
                      <Clock className="h-4 w-4 text-amber-600" />
                    ) : a.tipo === "meta_vendedor_atingida" ? (
                      <Target className="h-4 w-4 text-green-600" />
                    ) : a.tipo === "nivel_vendedor_subiu" ? (
                      <Target className="h-4 w-4 text-cyan-600" />
                    ) : a.tipo === "ranking_mudou" ? (
                      <Target className="h-4 w-4 text-amber-500" />
                    ) : a.tipo === "nivel_proximo" ? (
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    ) : a.tipo === "variacao_preco" ? (
                      <TrendingUp className="h-4 w-4 text-destructive" />
                    ) : (
                      <CreditCard className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.descricao}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {a.tipo === "promo_expirando" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/40 text-primary">
                          {a.diasAtraso === 999 ? "Expira hoje" : `${a.diasAtraso}d restante${a.diasAtraso > 1 ? "s" : ""}`}
                        </Badge>
                      ) : a.tipo === "validade_proxima" ? (
                        <Badge variant={a.diasAtraso > 100 ? "destructive" : "outline"} className={`text-[10px] h-4 px-1.5 ${a.diasAtraso <= 100 ? (a.diasAtraso === 999 ? "" : "border-amber-500/40 text-amber-600") : ""}`}>
                          {a.diasAtraso > 100 ? `Vencido ${a.diasAtraso - 100}d` : a.diasAtraso === 999 ? "Vence hoje" : `${a.diasAtraso}d restante${a.diasAtraso > 1 ? "s" : ""}`}
                        </Badge>
                      ) : a.tipo === "falta_critica" ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          Prioridade Crítica
                        </Badge>
                      ) : a.tipo === "meta_compras_90" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/40 text-primary">
                          Meta ≥90%
                        </Badge>
                      ) : a.tipo === "divergencia_fiscal" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/40 text-primary">
                          Auditoria Pendente
                        </Badge>
                      ) : a.tipo === "lead_parado" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-600">
                          Leads parados
                        </Badge>
                       ) : a.tipo === "atividade_atrasada_crm" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-600">
                          CRM Atrasada
                        </Badge>
                      ) : a.tipo === "meta_vendedor_atingida" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-green-500/40 text-green-600">
                          🏆 Meta Atingida
                        </Badge>
                      ) : a.tipo === "nivel_vendedor_subiu" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-500/40 text-cyan-600">
                          🎖️ Subiu de Nível
                        </Badge>
                      ) : a.tipo === "ranking_mudou" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-500">
                          📈 Ranking
                        </Badge>
                      ) : a.tipo === "nivel_proximo" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-600">
                          📊 Próximo Nível
                        </Badge>
                      ) : a.tipo === "alerta_seguranca" ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          ⚠️ Segurança
                        </Badge>
                      ) : a.tipo === "ibpt_vencida" ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/40 text-amber-600">
                          📋 IBPTax Vencida
                        </Badge>
                      ) : a.tipo === "variacao_preco" ? (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          📈 Variação &gt;30%
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          {a.diasAtraso}d atraso
                        </Badge>
                      )}
                      {a.valor != null && (
                        <span className="text-xs font-semibold text-destructive">
                          {a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={e => { e.stopPropagation(); dismiss(a.id); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {count > 0 && (
          <div className="border-t border-border px-4 py-2">
            <Button variant="ghost" size="sm" className="w-full text-xs justify-center gap-1" onClick={() => { navigate("/"); setOpen(false); }}>
              Ver Dashboard completo <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
