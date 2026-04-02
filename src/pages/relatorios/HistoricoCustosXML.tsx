import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Package, Building2, RefreshCw, BarChart3 } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";

interface HistoricoItem {
  id: string;
  descricao: string;
  ncm: string;
  valor_unitario: number;
  quantidade: number;
  valor_total: number;
  emitente_razao: string;
  emitente_cnpj: string;
  data_emissao: string;
  numero_nf: string;
}

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function HistoricoCustosXML() {
  const [dados, setDados] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("todos");
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string | null>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: itens } = await (supabase.from("xml_fiscal_itens" as any) as any)
        .select("id, descricao, ncm, valor_unitario, quantidade, valor_total, xml_fiscal_id")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!itens || itens.length === 0) { setDados([]); setLoading(false); return; }

      const xmlIds = [...new Set(itens.map((i: any) => i.xml_fiscal_id))];
      const { data: xmlDocs } = await (supabase.from("xml_fiscais" as any) as any)
        .select("id, emitente_razao, emitente_cnpj, data_emissao, numero")
        .in("id", xmlIds);

      const xmlMap = new Map((xmlDocs || []).map((d: any) => [d.id, d]));

      const merged: HistoricoItem[] = itens.map((item: any) => {
        const xml = xmlMap.get(item.xml_fiscal_id) || {};
        return {
          id: item.id,
          descricao: item.descricao,
          ncm: item.ncm || "",
          valor_unitario: Number(item.valor_unitario) || 0,
          quantidade: Number(item.quantidade) || 0,
          valor_total: Number(item.valor_total) || 0,
          emitente_razao: (xml as any).emitente_razao || "",
          emitente_cnpj: (xml as any).emitente_cnpj || "",
          data_emissao: (xml as any).data_emissao || "",
          numero_nf: (xml as any).numero || "",
        };
      });

      setDados(merged);
      setFornecedores([...new Set(merged.map(d => d.emitente_razao).filter(Boolean))]);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = dados.filter(d => {
    if (fornecedorFiltro !== "todos" && d.emitente_razao !== fornecedorFiltro) return false;
    if (busca) {
      const s = busca.toLowerCase();
      if (!d.descricao?.toLowerCase().includes(s) && !d.ncm?.includes(s)) return false;
    }
    if (dataInicio && d.data_emissao) {
      const emissao = d.data_emissao.substring(0, 10);
      if (emissao < dataInicio) return false;
    }
    if (dataFim && d.data_emissao) {
      const emissao = d.data_emissao.substring(0, 10);
      if (emissao > dataFim) return false;
    }
    return true;
  });

  // Group products by description for summary
  const produtosSummary = Object.values(
    filtered.reduce((acc: Record<string, { descricao: string; ncm: string; entradas: number; custoMin: number; custoMax: number; custoMedio: number; totalQtd: number; fornecedoresSet: Set<string> }>, item) => {
      const key = item.descricao;
      if (!acc[key]) {
        acc[key] = { descricao: item.descricao, ncm: item.ncm, entradas: 0, custoMin: Infinity, custoMax: 0, custoMedio: 0, totalQtd: 0, fornecedoresSet: new Set() };
      }
      acc[key].entradas++;
      acc[key].custoMin = Math.min(acc[key].custoMin, item.valor_unitario);
      acc[key].custoMax = Math.max(acc[key].custoMax, item.valor_unitario);
      acc[key].totalQtd += item.quantidade;
      acc[key].custoMedio = ((acc[key].custoMedio * (acc[key].entradas - 1)) + item.valor_unitario) / acc[key].entradas;
      acc[key].fornecedoresSet.add(item.emitente_razao);
      return acc;
    }, {} as any)
  ).sort((a: any, b: any) => b.entradas - a.entradas) as any[];

  // Chart data for selected product
  const chartData = produtoSelecionado
    ? filtered
        .filter(d => d.descricao === produtoSelecionado)
        .sort((a, b) => new Date(a.data_emissao).getTime() - new Date(b.data_emissao).getTime())
        .map(d => ({
          data: d.data_emissao ? new Date(d.data_emissao).toLocaleDateString("pt-BR") : "N/A",
          custo: d.valor_unitario,
          fornecedor: d.emitente_razao?.substring(0, 20),
          nf: d.numero_nf,
          qtd: d.quantidade,
        }))
    : [];

  // Top products by cost variation
  const topVariacao = produtosSummary
    .filter((p: any) => p.entradas >= 2 && p.custoMin > 0)
    .map((p: any) => ({ ...p, variacao: ((p.custoMax - p.custoMin) / p.custoMin) * 100 }))
    .sort((a: any, b: any) => b.variacao - a.variacao)
    .slice(0, 10);

  // KPIs
  const totalProdutosDistintos = produtosSummary.length;
  const totalEntradas = filtered.length;
  const custoMedioGeral = filtered.length > 0 ? filtered.reduce((s, d) => s + d.valor_total, 0) / filtered.length : 0;


  const exportOptions = useMemo(() => ({
    title: "Histórico de Custos por XML",
    filename: "historico-custos-xml",
    subtitle: `${produtosSummary.length} produtos • ${filtered.length} entradas • ${fornecedores.length} fornecedores`,
    columns: [
      { key: "descricao", header: "Produto" },
      { key: "ncm", header: "NCM" },
      { key: "entradas", header: "Entradas", align: "center" as const },
      { key: "fornecedores", header: "Fornecedores", align: "center" as const },
      { key: "custoMin", header: "Custo Mín", align: "right" as const, format: (v: number) => v === Infinity ? "-" : formatCurrency(v) },
      { key: "custoMax", header: "Custo Máx", align: "right" as const, format: (v: number) => formatCurrency(v) },
      { key: "custoMedio", header: "Custo Médio", align: "right" as const, format: (v: number) => formatCurrency(v) },
      { key: "variacao", header: "Variação %", align: "right" as const, format: (v: number) => v > 0 ? `${v.toFixed(1)}%` : "-" },
      { key: "totalQtd", header: "Qtd Total", align: "right" as const, format: (v: number) => v.toFixed(2) },
    ],
    data: produtosSummary.map((p: any) => ({
      descricao: p.descricao,
      ncm: p.ncm,
      entradas: p.entradas,
      fornecedores: p.fornecedoresSet.size,
      custoMin: p.custoMin,
      custoMax: p.custoMax,
      custoMedio: p.custoMedio,
      variacao: p.custoMin > 0 && p.custoMin !== Infinity ? ((p.custoMax - p.custoMin) / p.custoMin) * 100 : 0,
      totalQtd: p.totalQtd,
    })),
    summaryRows: [
      { label: "Produtos Distintos", value: String(totalProdutosDistintos) },
      { label: "Total Entradas", value: String(totalEntradas) },
      { label: "Fornecedores", value: String(fornecedores.length) },
      { label: "Custo Médio Geral", value: formatCurrency(custoMedioGeral) },
    ],
  }), [produtosSummary, filtered.length, fornecedores.length, totalProdutosDistintos, totalEntradas, custoMedioGeral]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Histórico de Custos por XML" description="Comparativo de preços de compra ao longo do tempo, por fornecedor" />
        <ExportButtons options={exportOptions} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Produtos Distintos", value: totalProdutosDistintos, icon: Package },
          { label: "Total Entradas", value: totalEntradas, icon: BarChart3 },
          { label: "Fornecedores", value: fornecedores.length, icon: Building2 },
          { label: "Custo Médio", value: formatCurrency(custoMedioGeral), icon: TrendingUp },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <kpi.icon className="w-8 h-8 text-primary opacity-60" />
              <div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <div className="text-lg font-bold">{kpi.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 max-w-xs">
          <Input placeholder="Buscar produto ou NCM..." value={busca} onChange={e => setBusca(e.target.value)} className="h-9" />
        </div>
        <Select value={fornecedorFiltro} onValueChange={setFornecedorFiltro}>
          <SelectTrigger className="w-[250px] h-9"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Fornecedores</SelectItem>
            {fornecedores.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input type="date" className="h-9 w-[140px] text-xs" value={dataInicio} onChange={e => setDataInicio(e.target.value)} title="Data inicial" />
          <span className="text-xs text-muted-foreground">a</span>
          <Input type="date" className="h-9 w-[140px] text-xs" value={dataFim} onChange={e => setDataFim(e.target.value)} title="Data final" />
        </div>
        {(dataInicio || dataFim) && (
          <Button variant="ghost" size="sm" onClick={() => { setDataInicio(""); setDataFim(""); }} className="text-xs h-9">Limpar datas</Button>
        )}
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top variação de preço */}
        {topVariacao.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" />Maior Variação de Preço</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topVariacao} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis dataKey="descricao" type="category" width={120} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="variacao" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Chart for selected product */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {produtoSelecionado ? `Evolução: ${produtoSelecionado.substring(0, 40)}` : "Selecione um produto na tabela"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="data" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={l => `Data: ${l}`} />
                  <Legend />
                  <Line type="monotone" dataKey="custo" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="Custo Unitário" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Clique em um produto para ver a evolução de preço
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Products summary table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Resumo por Produto ({produtosSummary.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>NCM</TableHead>
                <TableHead className="text-center">Entradas</TableHead>
                <TableHead className="text-center">Fornecedores</TableHead>
                <TableHead className="text-right">Custo Mín</TableHead>
                <TableHead className="text-right">Custo Máx</TableHead>
                <TableHead className="text-right">Custo Médio</TableHead>
                <TableHead className="text-right">Variação</TableHead>
                <TableHead className="text-right">Qtd Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtosSummary.slice(0, 100).map((p: any, i: number) => {
                const variacao = p.custoMin > 0 && p.custoMin !== Infinity ? ((p.custoMax - p.custoMin) / p.custoMin) * 100 : 0;
                return (
                  <TableRow
                    key={i}
                    className={`cursor-pointer hover:bg-muted/50 ${produtoSelecionado === p.descricao ? "bg-primary/5" : ""}`}
                    onClick={() => setProdutoSelecionado(p.descricao === produtoSelecionado ? null : p.descricao)}
                  >
                    <TableCell className="text-xs max-w-[200px] truncate font-medium">{p.descricao}</TableCell>
                    <TableCell className="font-mono text-[10px]">{p.ncm}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary">{p.entradas}</Badge></TableCell>
                    <TableCell className="text-center text-xs">{p.fornecedoresSet.size}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.custoMin === Infinity ? "-" : formatCurrency(p.custoMin)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(p.custoMax)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(p.custoMedio)}</TableCell>
                    <TableCell className="text-right">
                      {variacao > 0 ? (
                        <span className={`font-mono text-xs font-semibold flex items-center justify-end gap-1 ${variacao > 20 ? "text-destructive" : variacao > 10 ? "text-amber-500" : "text-emerald-500"}`}>
                          {variacao > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {variacao.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.totalQtd.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {produtosSummary.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Nenhum produto importado via XML encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail table for selected product */}
      {produtoSelecionado && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Histórico detalhado: {produtoSelecionado.substring(0, 50)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>NF</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered
                  .filter(d => d.descricao === produtoSelecionado)
                  .sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime())
                  .map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{d.data_emissao ? new Date(d.data_emissao).toLocaleDateString("pt-BR") : "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{d.numero_nf}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">{d.emitente_razao}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{d.quantidade.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(d.valor_unitario)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatCurrency(d.valor_total)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
