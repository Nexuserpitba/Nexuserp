import { useState, useMemo, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, GitCompareArrows } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import type { ExportOptions } from "@/lib/exportUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { gerarDadosDRE, formatCurrency, formatPercent, meses, anosDisponiveis } from "@/lib/dreUtils";
import DREComparativo from "@/components/dre/DREComparativo";

export default function DRE() {
  const currentDate = new Date();
  const [periodo, setPeriodo] = useState(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`);
  const mes = String(parseInt(periodo.split("-")[1]) - 1);
  const ano = periodo.split("-")[0];
  const [tab, setTab] = useState("demonstrativo");
  const printRef = useRef<HTMLDivElement>(null);

  const linhas = useMemo(() => gerarDadosDRE(Number(mes), Number(ano)), [mes, ano]);

  const receitaBruta = linhas.find(l => l.codigo === "1")?.valor ?? 0;
  const receitaLiquida = linhas.find(l => l.codigo === "3")?.valor ?? 0;
  const lucroBruto = linhas.find(l => l.codigo === "5")?.valor ?? 0;
  const lucroLiquido = linhas.find(l => l.codigo === "13")?.valor ?? 0;
  const ebit = linhas.find(l => l.codigo === "7")?.valor ?? 0;

  const margemBruta = receitaLiquida ? lucroBruto / receitaLiquida : 0;
  const margemOperacional = receitaLiquida ? ebit / receitaLiquida : 0;
  const margemLiquida = receitaLiquida ? lucroLiquido / receitaLiquida : 0;

  const dadosGrafico = useMemo(() => [
    { nome: "Rec. Bruta", valor: receitaBruta },
    { nome: "Rec. Líquida", valor: receitaLiquida },
    { nome: "Lucro Bruto", valor: lucroBruto },
    { nome: "EBIT", valor: ebit },
    { nome: "Lucro Líq.", valor: lucroLiquido },
  ], [receitaBruta, receitaLiquida, lucroBruto, ebit, lucroLiquido]);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>DRE - ${meses[Number(mes)]}/${ano}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 12px; color: #1a1a1a; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 6px 10px; border-bottom: 1px solid #e5e5e5; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 11px; }
      .total { font-weight: 700; background: #f0f4ff; }
      .subtotal { font-weight: 600; background: #fafafa; }
      .positive { color: #16a34a; } .negative { color: #dc2626; }
      .nivel-1 { padding-left: 24px; } .nivel-2 { padding-left: 48px; font-size: 11px; }
      h1 { font-size: 18px; margin-bottom: 4px; } h2 { font-size: 13px; color: #666; margin-bottom: 20px; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <div class="header"><h1>DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO</h1><h2>Período: ${meses[Number(mes)]} de ${ano}</h2></div>
    <table><thead><tr><th>Conta</th><th>Descrição</th><th style="text-align:right">Valor (R$)</th><th style="text-align:right">AV%</th></tr></thead><tbody>
    ${linhas.map(l => {
      const av = receitaLiquida ? (l.valor / receitaLiquida * 100).toFixed(2) : "0.00";
      const cls = [l.isTotal ? "total" : "", l.isSubtotal ? "subtotal" : "", `nivel-${l.nivel}`].filter(Boolean).join(" ");
      return `<tr class="${cls}"><td>${l.codigo}</td><td>${l.descricao}</td><td style="text-align:right" class="${l.valor >= 0 ? 'positive' : 'negative'}">${formatCurrency(l.valor)}</td><td style="text-align:right">${av}%</td></tr>`;
    }).join("")}
    </tbody></table></body></html>`);
    win.document.close();
    win.print();
  };

  const handleExportCSV = () => {
    const header = "Conta;Descrição;Valor;AV%\n";
    const rows = linhas.map(l => {
      const av = receitaLiquida ? (l.valor / receitaLiquida * 100).toFixed(2) : "0.00";
      return `${l.codigo};"${l.descricao}";${l.valor.toFixed(2)};${av}%`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRE_${meses[Number(mes)]}_${ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: "Receita Bruta", value: formatCurrency(receitaBruta), icon: DollarSign, color: "text-primary" },
    { label: "Margem Bruta", value: formatPercent(margemBruta), icon: TrendingUp, color: margemBruta >= 0 ? "text-accent" : "text-destructive" },
    { label: "Margem Operacional", value: formatPercent(margemOperacional), icon: BarChart3, color: margemOperacional >= 0 ? "text-accent" : "text-destructive" },
    { label: "Lucro Líquido", value: formatCurrency(lucroLiquido), icon: lucroLiquido >= 0 ? TrendingUp : TrendingDown, color: lucroLiquido >= 0 ? "text-accent" : "text-destructive" },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="DRE - Demonstração do Resultado"
        description="Demonstrativo contábil completo para análise gerencial e contabilidade"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="demonstrativo" className="text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4 mr-1.5" /> Demonstrativo
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="text-xs sm:text-sm">
            <GitCompareArrows className="h-4 w-4 mr-1.5" /> Comparativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demonstrativo" className="space-y-4">
          {/* Period selector */}
          <div className="flex flex-wrap gap-2 items-end">
            <MonthPicker value={periodo} onChange={setPeriodo} className="w-[200px]" />
            <ExportButtons options={{
              title: "DRE - Demonstração do Resultado do Exercício",
              subtitle: `Período: ${meses[Number(mes)]} de ${ano}`,
              filename: `DRE_${meses[Number(mes)]}_${ano}`,
              columns: [
                { header: "Conta", key: "codigo" },
                { header: "Descrição", key: "descricao" },
                { header: "Valor (R$)", key: "valor", align: "right", format: (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
                { header: "AV%", key: "av", align: "right", format: (v: number) => `${(v * 100).toFixed(2)}%` },
              ],
              data: linhas.map(l => ({ ...l, av: receitaLiquida ? l.valor / receitaLiquida : 0 })),
              summaryRows: [
                { label: "Receita Bruta", value: formatCurrency(receitaBruta) },
                { label: "Margem Bruta", value: formatPercent(margemBruta) },
                { label: "Lucro Líquido", value: formatCurrency(lucroLiquido) },
              ],
            }} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
                  </div>
                  <p className={`text-lg sm:text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Evolução do Resultado</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[220px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGrafico} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Margin cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Margem Bruta", value: margemBruta, formula: "Lucro Bruto / Receita Líquida" },
              { label: "Margem EBIT", value: margemOperacional, formula: "EBIT / Receita Líquida" },
              { label: "Margem Líquida", value: margemLiquida, formula: "Lucro Líquido / Receita Líquida" },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <p className={`text-2xl font-bold ${m.value >= 0 ? "text-accent" : "text-destructive"}`}>{formatPercent(m.value)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{m.formula}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full table */}
          <Card ref={printRef}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Demonstrativo Completo — {meses[Number(mes)]}/{ano}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Conta</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right w-[140px]">Valor (R$)</TableHead>
                      <TableHead className="text-right w-[80px]">AV%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhas.map((linha) => {
                      const av = receitaLiquida ? linha.valor / receitaLiquida : 0;
                      return (
                        <TableRow
                          key={linha.codigo}
                          className={
                            linha.isTotal ? "bg-muted/60 font-bold border-t-2 border-border"
                            : linha.isSubtotal ? "bg-muted/30 font-semibold" : ""
                          }
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">{linha.codigo}</TableCell>
                          <TableCell
                            style={{ paddingLeft: `${12 + linha.nivel * 20}px` }}
                            className={linha.isTotal ? "text-sm font-bold" : linha.isSubtotal ? "text-sm font-semibold" : "text-sm"}
                          >
                            {linha.descricao}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${linha.valor >= 0 ? "text-foreground" : "text-destructive"}`}>
                            {formatCurrency(linha.valor)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">
                            {formatPercent(av)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparativo">
          <DREComparativo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
