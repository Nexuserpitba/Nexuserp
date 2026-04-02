import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Layers, Building2, Package } from "lucide-react";

interface ItemData {
  descricao: string;
  ncm: string;
  valor_unitario: number;
  quantidade: number;
  emitente_razao: string;
  data_emissao: string;
  categoria: string;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const getNcmCategoria = (ncm: string): string => {
  if (!ncm || ncm.length < 2) return "Outros";
  const cap = ncm.substring(0, 2);
  const map: Record<string, string> = {
    "01": "Animais Vivos", "02": "Carnes", "03": "Peixes/Crustáceos", "04": "Laticínios/Ovos",
    "07": "Hortícolas", "08": "Frutas", "09": "Café/Chá", "10": "Cereais",
    "11": "Farinhas/Amidos", "15": "Gorduras/Óleos", "16": "Preparações Carne/Peixe",
    "17": "Açúcares", "18": "Cacau", "19": "Preparações Cereais", "20": "Preparações Hortícolas",
    "21": "Preparações Alimentícias", "22": "Bebidas", "23": "Resíduos Alimentares",
    "24": "Tabaco", "25": "Sal/Pedras", "27": "Combustíveis", "28": "Químicos Inorgânicos",
    "29": "Químicos Orgânicos", "30": "Produtos Farmacêuticos", "33": "Óleos Essenciais/Perfumaria",
    "34": "Sabões/Detergentes", "38": "Produtos Químicos Diversos", "39": "Plásticos",
    "40": "Borracha", "44": "Madeira", "48": "Papel/Cartão", "49": "Impressos",
    "61": "Vestuário (malha)", "62": "Vestuário (outros)", "63": "Artefatos Têxteis",
    "69": "Cerâmica", "70": "Vidro", "72": "Ferro/Aço", "73": "Obras Ferro/Aço",
    "76": "Alumínio", "84": "Máquinas/Equipamentos", "85": "Elétricos/Eletrônicos",
    "87": "Veículos", "90": "Instrumentos Ópticos", "94": "Móveis", "95": "Brinquedos",
    "96": "Obras Diversas",
  };
  return map[cap] || `Cap. ${cap}`;
};

export function VariacaoPrecosCategoria() {
  const [dados, setDados] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [agrupamento, setAgrupamento] = useState<"categoria" | "fornecedor">("categoria");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data: itens } = await (supabase.from("xml_fiscal_itens" as any) as any)
          .select("descricao, ncm, valor_unitario, quantidade, xml_fiscal_id")
          .gt("valor_unitario", 0)
          .order("created_at", { ascending: false })
          .limit(2000);

        if (!itens?.length) { setDados([]); setLoading(false); return; }

        const xmlIds = [...new Set(itens.map((i: any) => i.xml_fiscal_id))];
        const { data: xmlDocs } = await (supabase.from("xml_fiscais" as any) as any)
          .select("id, emitente_razao, data_emissao")
          .in("id", xmlIds);

        const xmlMap = new Map((xmlDocs || []).map((d: any) => [d.id, d]));

        const merged: ItemData[] = itens.map((item: any) => {
          const xml = xmlMap.get(item.xml_fiscal_id) || {};
          return {
            descricao: item.descricao,
            ncm: item.ncm || "",
            valor_unitario: Number(item.valor_unitario) || 0,
            quantidade: Number(item.quantidade) || 0,
            emitente_razao: (xml as any).emitente_razao || "Não informado",
            data_emissao: (xml as any).data_emissao || "",
            categoria: getNcmCategoria(item.ncm || ""),
          };
        });

        setDados(merged);
      } catch (err) {
        console.error("Erro ao buscar dados de variação:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const analise = useMemo(() => {
    if (!dados.length) return { categorias: [], fornecedores: [], evolucao: [] };

    // By category
    const catMap: Record<string, { itens: number; custoMin: number; custoMax: number; somaUnit: number; count: number; fornecedoresSet: Set<string> }> = {};
    dados.forEach(d => {
      const key = d.categoria;
      if (!catMap[key]) catMap[key] = { itens: 0, custoMin: Infinity, custoMax: 0, somaUnit: 0, count: 0, fornecedoresSet: new Set() };
      catMap[key].itens++;
      catMap[key].custoMin = Math.min(catMap[key].custoMin, d.valor_unitario);
      catMap[key].custoMax = Math.max(catMap[key].custoMax, d.valor_unitario);
      catMap[key].somaUnit += d.valor_unitario;
      catMap[key].count++;
      catMap[key].fornecedoresSet.add(d.emitente_razao);
    });

    const categorias = Object.entries(catMap)
      .map(([nome, v]) => ({
        nome,
        itens: v.itens,
        custoMin: v.custoMin === Infinity ? 0 : v.custoMin,
        custoMax: v.custoMax,
        custoMedio: v.somaUnit / v.count,
        variacao: v.custoMin > 0 && v.custoMin !== Infinity ? ((v.custoMax - v.custoMin) / v.custoMin) * 100 : 0,
        fornecedores: v.fornecedoresSet.size,
      }))
      .sort((a, b) => b.variacao - a.variacao);

    // By supplier
    const fornMap: Record<string, { itens: number; categorias: Set<string>; somaUnit: number; count: number }> = {};
    dados.forEach(d => {
      const key = d.emitente_razao;
      if (!fornMap[key]) fornMap[key] = { itens: 0, categorias: new Set(), somaUnit: 0, count: 0 };
      fornMap[key].itens++;
      fornMap[key].categorias.add(d.categoria);
      fornMap[key].somaUnit += d.valor_unitario;
      fornMap[key].count++;
    });

    const fornecedores = Object.entries(fornMap)
      .map(([nome, v]) => ({
        nome: nome.substring(0, 30),
        itens: v.itens,
        categorias: v.categorias.size,
        custoMedio: v.somaUnit / v.count,
      }))
      .sort((a, b) => b.itens - a.itens)
      .slice(0, 15);

    // Price evolution by month (top 5 categories)
    const topCats = categorias.slice(0, 5).map(c => c.nome);
    const mesMap: Record<string, Record<string, { soma: number; count: number }>> = {};
    dados.filter(d => topCats.includes(d.categoria) && d.data_emissao).forEach(d => {
      const mes = d.data_emissao.substring(0, 7);
      if (!mesMap[mes]) mesMap[mes] = {};
      if (!mesMap[mes][d.categoria]) mesMap[mes][d.categoria] = { soma: 0, count: 0 };
      mesMap[mes][d.categoria].soma += d.valor_unitario;
      mesMap[mes][d.categoria].count++;
    });

    const evolucao = Object.entries(mesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, cats]) => {
        const [y, m] = mes.split("-");
        const entry: any = { mes: `${m}/${y}` };
        topCats.forEach(cat => {
          if (cats[cat]) entry[cat] = Number((cats[cat].soma / cats[cat].count).toFixed(2));
        });
        return entry;
      });

    return { categorias, fornecedores, evolucao, topCats };
  }, [dados]);

  const COLORS = [
    "hsl(var(--primary))", "hsl(var(--destructive))", "hsl(210, 70%, 55%)",
    "hsl(150, 60%, 45%)", "hsl(35, 90%, 55%)",
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Carregando análise de variação de preços...
        </CardContent>
      </Card>
    );
  }

  if (!dados.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Nenhum dado de XML fiscal encontrado para análise de preços
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Variação de Preços por Categoria</h3>
          <Badge variant="secondary" className="text-[10px]">{analise.categorias.length} categorias</Badge>
        </div>
        <Select value={agrupamento} onValueChange={(v) => setAgrupamento(v as any)}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="categoria">Por Categoria (NCM)</SelectItem>
            <SelectItem value="fornecedor">Por Fornecedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top variação chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Top Variação por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={analise.categorias.filter(c => c.variacao > 0).slice(0, 10)}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <YAxis dataKey="nome" type="category" width={130} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Bar dataKey="variacao" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price evolution for top categories */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Evolução Custo Médio (Top 5 Categorias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(analise.evolucao?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analise.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {(analise as any).topCats?.map((cat: string, i: number) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={cat} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Dados insuficientes para evolução temporal
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">
            {agrupamento === "categoria" ? "Detalhamento por Categoria" : "Detalhamento por Fornecedor"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {agrupamento === "categoria" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-center">Fornecedores</TableHead>
                  <TableHead className="text-right">Custo Mín</TableHead>
                  <TableHead className="text-right">Custo Máx</TableHead>
                  <TableHead className="text-right">Custo Médio</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analise.categorias.slice(0, 30).map((cat, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{cat.nome}</TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-[10px]">{cat.itens}</Badge></TableCell>
                    <TableCell className="text-center text-xs">{cat.fornecedores}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(cat.custoMin)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(cat.custoMax)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(cat.custoMedio)}</TableCell>
                    <TableCell className="text-right">
                      {cat.variacao > 0 ? (
                        <span className={`font-mono text-xs font-semibold flex items-center justify-end gap-1 ${cat.variacao > 50 ? "text-destructive" : cat.variacao > 20 ? "text-amber-500" : "text-emerald-500"}`}>
                          {cat.variacao > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {cat.variacao.toFixed(1)}%
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-center">Categorias</TableHead>
                  <TableHead className="text-right">Custo Médio Unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analise.fornecedores.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {f.nome}
                    </TableCell>
                    <TableCell className="text-center"><Badge variant="secondary" className="text-[10px]">{f.itens}</Badge></TableCell>
                    <TableCell className="text-center text-xs">{f.categorias}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{formatCurrency(f.custoMedio)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export interface CategoriaAnalise {
  nome: string;
  itens: number;
  custoMin: number;
  custoMax: number;
  custoMedio: number;
  variacao: number;
  fornecedores: number;
}

export async function fetchVariacaoCategoriasData(): Promise<CategoriaAnalise[]> {
  try {
    const { data: itens } = await (supabase.from("xml_fiscal_itens" as any) as any)
      .select("ncm, valor_unitario, xml_fiscal_id")
      .gt("valor_unitario", 0)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (!itens?.length) return [];

    const xmlIds = [...new Set(itens.map((i: any) => i.xml_fiscal_id))];
    const { data: xmlDocs } = await (supabase.from("xml_fiscais" as any) as any)
      .select("id, emitente_razao")
      .in("id", xmlIds);

    const xmlMap = new Map((xmlDocs || []).map((d: any) => [d.id, d]));

    const catMap: Record<string, { itens: number; custoMin: number; custoMax: number; somaUnit: number; count: number; fornecedoresSet: Set<string> }> = {};
    itens.forEach((item: any) => {
      const cat = getNcmCategoria(item.ncm || "");
      const xml = xmlMap.get(item.xml_fiscal_id) || {};
      const val = Number(item.valor_unitario) || 0;
      if (!catMap[cat]) catMap[cat] = { itens: 0, custoMin: Infinity, custoMax: 0, somaUnit: 0, count: 0, fornecedoresSet: new Set() };
      catMap[cat].itens++;
      catMap[cat].custoMin = Math.min(catMap[cat].custoMin, val);
      catMap[cat].custoMax = Math.max(catMap[cat].custoMax, val);
      catMap[cat].somaUnit += val;
      catMap[cat].count++;
      catMap[cat].fornecedoresSet.add((xml as any).emitente_razao || "");
    });

    return Object.entries(catMap)
      .map(([nome, v]) => ({
        nome,
        itens: v.itens,
        custoMin: v.custoMin === Infinity ? 0 : v.custoMin,
        custoMax: v.custoMax,
        custoMedio: v.somaUnit / v.count,
        variacao: v.custoMin > 0 && v.custoMin !== Infinity ? ((v.custoMax - v.custoMin) / v.custoMin) * 100 : 0,
        fornecedores: v.fornecedoresSet.size,
      }))
      .sort((a, b) => b.variacao - a.variacao);
  } catch {
    return [];
  }
}
