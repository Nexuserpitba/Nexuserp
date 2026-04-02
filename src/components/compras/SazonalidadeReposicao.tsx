import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { Sun, Snowflake, PackageCheck, AlertTriangle, ArrowRight, ShoppingCart, CheckSquare, Square, Filter } from "lucide-react";
import { subMonths, format } from "date-fns";
import { ExportButtons } from "@/components/ExportButtons";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function loadJSON(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

const MESES_NOME = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface SazonalidadeData {
  mes: string;
  mesNum: number;
  media: number;
  isPico: boolean;
  isBaixa: boolean;
}

export function AnaliseSazonalidade() {
  const sazonalidade = useMemo<SazonalidadeData[]>(() => {
    const pedidos = loadJSON("pedidos_compra");
    // Group by month-of-year (0-11) across all years
    const mesesAcum: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 12; i++) mesesAcum[i] = { total: 0, count: 0 };

    pedidos.forEach((p: any) => {
      const d = p.dataEmissao || "";
      if (!d) return;
      const monthNum = parseInt(d.substring(5, 7), 10) - 1;
      if (monthNum >= 0 && monthNum < 12) {
        mesesAcum[monthNum].total += (p.valorLiquido || p.valorTotal || 0);
        mesesAcum[monthNum].count++;
      }
    });

    const dados = Object.entries(mesesAcum).map(([m, v]) => ({
      mes: MESES_NOME[Number(m)],
      mesNum: Number(m),
      media: v.count > 0 ? v.total / Math.max(1, new Set(loadJSON("pedidos_compra").map((p: any) => (p.dataEmissao || "").substring(0, 4))).size) : 0,
      isPico: false,
      isBaixa: false,
    }));

    // Identify peaks and lows (top 3 and bottom 3 with data)
    const withData = dados.filter(d => d.media > 0);
    if (withData.length >= 3) {
      const sorted = [...withData].sort((a, b) => b.media - a.media);
      sorted.slice(0, 3).forEach(s => { const d = dados.find(d => d.mesNum === s.mesNum); if (d) d.isPico = true; });
      sorted.slice(-3).forEach(s => { const d = dados.find(d => d.mesNum === s.mesNum); if (d) d.isBaixa = true; });
    }

    return dados;
  }, []);

  const hasData = sazonalidade.some(s => s.media > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" /> Análise de Sazonalidade (Média por Mês)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sazonalidade}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Média"]} />
                <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                  {sazonalidade.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isPico ? "hsl(var(--destructive))" : entry.isBaixa ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))"}
                      opacity={entry.isBaixa ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-destructive" />
                <span className="text-[10px] text-muted-foreground">Pico (Top 3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-[10px] text-muted-foreground">Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-muted-foreground opacity-40" />
                <span className="text-[10px] text-muted-foreground">Baixa (Bottom 3)</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {sazonalidade.filter(s => s.isPico).map(s => (
                <Badge key={s.mes} variant="destructive" className="text-[10px] px-2">
                  <Sun className="h-3 w-3 mr-1" /> {s.mes} — Pico
                </Badge>
              ))}
              {sazonalidade.filter(s => s.isBaixa && s.media > 0).map(s => (
                <Badge key={s.mes} variant="outline" className="text-[10px] px-2">
                  <Snowflake className="h-3 w-3 mr-1" /> {s.mes} — Baixa
                </Badge>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Sem dados históricos suficientes para análise de sazonalidade</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SugestoesReposicao() {
  const navigate = useNavigate();
  const sugestoes = useMemo(() => {
    const produtos = loadJSON("produtos");
    const pedidos = loadJSON("pedidos_compra");

    if (produtos.length === 0) return [];

    // Calculate average monthly consumption per product from pedidos
    const now = new Date();
    const consumoPorProduto: Record<string, { nome: string; unidade: string; estoqueAtual: number; custoReposicao: number; totalQtd: number; meses: Set<string>; fornecedor: string }> = {};

    // Initialize with all products
    produtos.forEach((p: any) => {
      if (!p.ativo && p.ativo !== undefined) return;
      consumoPorProduto[p.id] = {
        nome: p.descricao || p.nome || `Produto ${p.codigo}`,
        unidade: p.unidade || "UN",
        estoqueAtual: p.estoque || 0,
        custoReposicao: p.custoReposicao || p.custoAquisicao || 0,
        totalQtd: 0,
        meses: new Set(),
        fornecedor: p.fornecedor || "",
      };
    });

    // Scan pedidos items for last 6 months
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, i);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      pedidos.forEach((ped: any) => {
        const pedMes = (ped.dataEmissao || "").substring(0, 7);
        if (pedMes !== mesKey) return;
        (ped.itens || []).forEach((item: any) => {
          const prodId = item.produtoId || item.id;
          if (prodId && consumoPorProduto[prodId]) {
            consumoPorProduto[prodId].totalQtd += (item.quantidade || 0);
            consumoPorProduto[prodId].meses.add(mesKey);
          }
        });
      });
    }

    // Calculate suggestions
    const result = Object.values(consumoPorProduto)
      .map(p => {
        const mesesComDados = Math.max(p.meses.size, 1);
        const mediaMensal = p.totalQtd / mesesComDados;
        const coberturaMeses = mediaMensal > 0 ? p.estoqueAtual / mediaMensal : 999;
        const qtdSugerida = Math.max(0, Math.ceil(mediaMensal * 3 - p.estoqueAtual)); // 3 months coverage
        const valorEstimado = qtdSugerida * p.custoReposicao;
        const urgencia: "critica" | "alta" | "media" | "baixa" =
          coberturaMeses < 1 ? "critica" :
          coberturaMeses < 2 ? "alta" :
          coberturaMeses < 3 ? "media" : "baixa";

        return {
          ...p,
          mediaMensal: Number(mediaMensal.toFixed(1)),
          coberturaMeses: Number(coberturaMeses.toFixed(1)),
          qtdSugerida,
          valorEstimado,
          urgencia,
        };
      })
      .filter(p => p.urgencia !== "baixa" && p.mediaMensal > 0)
      .sort((a, b) => {
        const prioridade = { critica: 0, alta: 1, media: 2, baixa: 3 };
        return prioridade[a.urgencia] - prioridade[b.urgencia] || b.qtdSugerida - a.qtdSugerida;
      })
      .slice(0, 15);

    return result;
  }, []);

  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");

  const fornecedoresUnicos = useMemo(() => {
    const set = new Set(sugestoes.map(s => s.fornecedor || "Sem fornecedor"));
    return Array.from(set).sort();
  }, [sugestoes]);

  const sugestoesFiltradas = useMemo(() => {
    if (filtroFornecedor === "todos") return sugestoes;
    return sugestoes.filter(s => (s.fornecedor || "Sem fornecedor") === filtroFornecedor);
  }, [sugestoes, filtroFornecedor]);

  const toggleItem = (i: number) => setSelecionados(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  const toggleAll = () => setSelecionados(prev => {
    const indices = sugestoesFiltradas.map(s => sugestoes.indexOf(s));
    const allSelected = indices.every(i => prev.has(i));
    const next = new Set(prev);
    if (allSelected) { indices.forEach(i => next.delete(i)); } else { indices.forEach(i => next.add(i)); }
    return next;
  });

  const itensSelecionados = selecionados.size > 0
    ? sugestoes.filter((_, i) => selecionados.has(i))
    : sugestoesFiltradas;

  const urgenciaConfig = {
    critica: { label: "Crítica", variant: "destructive" as const, icon: AlertTriangle },
    alta: { label: "Alta", variant: "destructive" as const, icon: AlertTriangle },
    media: { label: "Média", variant: "secondary" as const, icon: PackageCheck },
    baixa: { label: "Baixa", variant: "outline" as const, icon: PackageCheck },
  };

  const gerarPedidoAutomatico = useCallback(() => {
    if (itensSelecionados.length === 0) {
      toast.error("Selecione pelo menos um item para gerar o pedido.");
      return;
    }

    // Group by supplier
    const porFornecedor: Record<string, typeof itensSelecionados> = {};
    itensSelecionados.forEach(s => {
      const key = s.fornecedor || "__sem_fornecedor__";
      if (!porFornecedor[key]) porFornecedor[key] = [];
      porFornecedor[key].push(s);
    });

    const pedidos = loadJSON("pedidos_compra");
    const hoje = format(new Date(), "yyyy-MM-dd");
    const entrega = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");
    let count = 0;

    // Find matching pessoa for supplier name
    let pessoas: any[] = [];
    try { pessoas = JSON.parse(localStorage.getItem("pessoas") || "[]"); } catch { /* erro ignorado */ }

    Object.entries(porFornecedor).forEach(([fornKey, items]) => {
      const nextNum = String(pedidos.length + 1).padStart(6, "0");
      const fornNome = fornKey === "__sem_fornecedor__" ? "A definir (Reposição)" : fornKey;
      const pessoa = pessoas.find((p: any) => (p.nome === fornNome || p.razaoSocial === fornNome || p.nomeFantasia === fornNome));

      const itens = items.map(s => ({
        id: crypto.randomUUID(),
        produtoId: "",
        produtoCodigo: "",
        produtoDescricao: s.nome,
        quantidade: s.qtdSugerida,
        valorUnitario: s.custoReposicao,
        valorTotal: s.valorEstimado,
        unidade: s.unidade,
      }));

      const valorTotal = itens.reduce((acc, item) => acc + item.valorTotal, 0);

      pedidos.push({
        id: crypto.randomUUID(),
        numero: `REP-${nextNum}`,
        fornecedorId: pessoa?.id || "",
        fornecedorNome: fornNome,
        fornecedorDoc: pessoa?.cpfCnpj || "",
        dataEmissao: hoje,
        dataEntrega: entrega,
        status: "rascunho",
        condicaoPagamento: "30 dias",
        formaPagamento: "Boleto",
        itens,
        valorTotal,
        valorDesconto: 0,
        valorFrete: 0,
        valorLiquido: valorTotal,
        observacao: `Pedido gerado automaticamente — Reposição ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
        empresaId: "",
      });
      count++;
    });

    localStorage.setItem("pedidos_compra", JSON.stringify(pedidos));
    const msg = count === 1
      ? `1 pedido de reposição criado com ${itensSelecionados.length} itens!`
      : `${count} pedidos criados (agrupados por fornecedor) com ${itensSelecionados.length} itens no total!`;
    toast.success(msg);
    navigate("/compras/pedidos");
  }, [itensSelecionados, navigate]);

  const exportData = sugestoes.map(s => ({
    produto: s.nome,
    unidade: s.unidade,
    estoqueAtual: s.estoqueAtual,
    mediaMensal: s.mediaMensal,
    coberturaMeses: s.coberturaMeses,
    qtdSugerida: s.qtdSugerida,
    valorEstimado: s.valorEstimado,
    urgencia: urgenciaConfig[s.urgencia].label,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-primary" /> Sugestões de Reposição
          </span>
          {sugestoes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <ExportButtons options={{
                title: "Sugestões de Reposição",
                filename: "sugestoes-reposicao",
                columns: [
                  { header: "Produto", key: "produto" },
                  { header: "Un.", key: "unidade" },
                  { header: "Estoque", key: "estoqueAtual", align: "right" },
                  { header: "Média/mês", key: "mediaMensal", align: "right" },
                  { header: "Cobertura", key: "coberturaMeses", align: "right" },
                  { header: "Qtd Sugerida", key: "qtdSugerida", align: "right" },
                  { header: "Valor Est.", key: "valorEstimado", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                  { header: "Urgência", key: "urgencia" },
                ],
                data: exportData,
              }} />
              <Button variant="default" size="sm" className="h-7 px-2 text-xs" onClick={gerarPedidoAutomatico}>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Gerar Pedido {selecionados.size > 0 ? `(${selecionados.size})` : `(${sugestoes.length})`}
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sugestoes.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <button onClick={toggleAll} className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1">
                {sugestoesFiltradas.every(s => selecionados.has(sugestoes.indexOf(s))) && selecionados.size > 0
                  ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  : <Square className="h-3.5 w-3.5" />}
                {sugestoesFiltradas.every(s => selecionados.has(sugestoes.indexOf(s))) && selecionados.size > 0 ? "Desmarcar" : "Selecionar"} ({sugestoesFiltradas.length})
              </button>
              {fornecedoresUnicos.length > 1 && (
                <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                  <SelectTrigger className="h-7 w-[180px] text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos fornecedores</SelectItem>
                    {fornecedoresUnicos.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {sugestoesFiltradas.map((s) => {
              const i = sugestoes.indexOf(s);
              const cfg = urgenciaConfig[s.urgencia];
              const selected = selecionados.has(i);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer ${selected ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-muted/30"}`}
                  onClick={() => toggleItem(i)}
                >
                  <div className="shrink-0">
                    {selected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium truncate">{s.nome}</span>
                      <Badge variant={cfg.variant} className="text-[9px] px-1.5 h-4 shrink-0">{cfg.label}</Badge>
                      {s.fornecedor && <Badge variant="outline" className="text-[9px] px-1.5 h-4 shrink-0">{s.fornecedor}</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>Estoque: <strong className="text-foreground">{s.estoqueAtual} {s.unidade}</strong></span>
                      <span>Média/mês: <strong className="text-foreground">{s.mediaMensal}</strong></span>
                      <span>Cobertura: <strong className={s.coberturaMeses < 1 ? "text-destructive" : "text-foreground"}>{s.coberturaMeses} meses</strong></span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <ArrowRight className="h-3 w-3" />
                      {s.qtdSugerida} {s.unidade}
                    </div>
                    {s.valorEstimado > 0 && (
                      <span className="text-[10px] text-muted-foreground">≈ R$ {s.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <PackageCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">Nenhuma sugestão de reposição no momento</p>
            <p className="text-xs text-muted-foreground">Todos os produtos possuem cobertura ≥ 3 meses ou sem dados de consumo</p>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground text-center mt-3 italic">* Sugestões calculadas para manter cobertura de 3 meses baseada no consumo médio</p>
      </CardContent>
    </Card>
  );
}
