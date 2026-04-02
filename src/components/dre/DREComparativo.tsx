import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Download, Printer, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { gerarDadosDRE, formatCurrency, formatPercent, meses, anosDisponiveis, LinhaDRE } from "@/lib/dreUtils";

type ModoComparacao = "mensal" | "anual";

export default function DREComparativo() {
  const now = new Date();
  const [modo, setModo] = useState<ModoComparacao>("mensal");

  // Período A (atual)
  const [periodoA, setPeriodoA] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const mesA = String(parseInt(periodoA.split("-")[1]) - 1);
  const anoA = periodoA.split("-")[0];

  // Período B (anterior)
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const [periodoB, setPeriodoB] = useState(`${prevYear}-${String(prevMonth).padStart(2, "0")}`);
  const mesB = String(parseInt(periodoB.split("-")[1]) - 1);
  const anoB = periodoB.split("-")[0];

  const linhasA = useMemo(() => gerarDadosDRE(Number(mesA), Number(anoA)), [mesA, anoA]);
  const linhasB = useMemo(() => gerarDadosDRE(Number(mesB), Number(anoB)), [mesB, anoB]);

  const recLiqA = linhasA.find(l => l.codigo === "3")?.valor ?? 1;
  const recLiqB = linhasB.find(l => l.codigo === "3")?.valor ?? 1;

  const labelA = `${meses[Number(mesA)].substring(0, 3)}/${anoA}`;
  const labelB = `${meses[Number(mesB)].substring(0, 3)}/${anoB}`;

  // Chart data for key metrics comparison
  const chartData = useMemo(() => {
    const keys = ["1", "3", "5", "7", "13"];
    const names: Record<string, string> = {
      "1": "Rec. Bruta", "3": "Rec. Líquida", "5": "Lucro Bruto", "7": "EBIT", "13": "Lucro Líq."
    };
    return keys.map(k => ({
      nome: names[k],
      [labelA]: linhasA.find(l => l.codigo === k)?.valor ?? 0,
      [labelB]: linhasB.find(l => l.codigo === k)?.valor ?? 0,
    }));
  }, [linhasA, linhasB, labelA, labelB]);

  const variacao = (a: number, b: number) => {
    if (b === 0) return a > 0 ? 100 : a < 0 ? -100 : 0;
    return ((a - b) / Math.abs(b)) * 100;
  };

  const handleExportCSV = () => {
    const header = `Conta;Descrição;${labelA};AV% ${labelA};${labelB};AV% ${labelB};Var. R$;Var. %\n`;
    const rows = linhasA.map((la) => {
      const lb = linhasB.find(l => l.codigo === la.codigo);
      const vB = lb?.valor ?? 0;
      const avA = recLiqA ? (la.valor / recLiqA * 100).toFixed(2) : "0.00";
      const avB = recLiqB ? (vB / recLiqB * 100).toFixed(2) : "0.00";
      const diff = la.valor - vB;
      const pct = variacao(la.valor, vB).toFixed(2);
      return `${la.codigo};"${la.descricao}";${la.valor.toFixed(2)};${avA}%;${vB.toFixed(2)};${avB}%;${diff.toFixed(2)};${pct}%`;
    }).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DRE_Comparativo_${labelA}_vs_${labelB}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>DRE Comparativo</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; padding: 20px; font-size: 11px; color: #1a1a1a; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 10px; }
      .total { font-weight: 700; background: #f0f4ff; }
      .subtotal { font-weight: 600; background: #fafafa; }
      .positive { color: #16a34a; } .negative { color: #dc2626; }
      .nivel-1 { padding-left: 20px; } .nivel-2 { padding-left: 40px; font-size: 10px; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
      h1 { font-size: 16px; margin-bottom: 4px; } h2 { font-size: 12px; color: #666; }
      .var-pos { color: #16a34a; } .var-neg { color: #dc2626; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <div class="header"><h1>DRE COMPARATIVO</h1><h2>${labelA} vs ${labelB}</h2></div>
    <table><thead><tr><th>Conta</th><th>Descrição</th><th style="text-align:right">${labelA}</th><th style="text-align:right">AV%</th><th style="text-align:right">${labelB}</th><th style="text-align:right">AV%</th><th style="text-align:right">Var. R$</th><th style="text-align:right">Var. %</th></tr></thead><tbody>
    ${linhasA.map(la => {
      const lb = linhasB.find(l => l.codigo === la.codigo);
      const vB = lb?.valor ?? 0;
      const avA = recLiqA ? (la.valor / recLiqA * 100).toFixed(2) : "0.00";
      const avB = recLiqB ? (vB / recLiqB * 100).toFixed(2) : "0.00";
      const diff = la.valor - vB;
      const pct = variacao(la.valor, vB).toFixed(2);
      const cls = [la.isTotal ? "total" : "", la.isSubtotal ? "subtotal" : "", `nivel-${la.nivel}`].filter(Boolean).join(" ");
      const varCls = diff >= 0 ? "var-pos" : "var-neg";
      return `<tr class="${cls}"><td>${la.codigo}</td><td>${la.descricao}</td><td style="text-align:right" class="${la.valor >= 0 ? 'positive' : 'negative'}">${formatCurrency(la.valor)}</td><td style="text-align:right">${avA}%</td><td style="text-align:right" class="${vB >= 0 ? 'positive' : 'negative'}">${formatCurrency(vB)}</td><td style="text-align:right">${avB}%</td><td style="text-align:right" class="${varCls}">${formatCurrency(diff)}</td><td style="text-align:right" class="${varCls}">${pct}%</td></tr>`;
    }).join("")}
    </tbody></table></body></html>`);
    win.document.close();
    win.print();
  };

  const VariacaoIcon = ({ val }: { val: number }) => {
    if (Math.abs(val) < 0.01) return <Minus className="h-3 w-3 text-muted-foreground inline" />;
    return val > 0
      ? <ArrowUpRight className="h-3 w-3 text-accent inline" />
      : <ArrowDownRight className="h-3 w-3 text-destructive inline" />;
  };

  return (
    <div className="space-y-4">
      {/* Seletores de período */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Período A</label>
                <MonthPicker value={periodoA} onChange={setPeriodoA} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Período B</label>
                <MonthPicker value={periodoB} onChange={setPeriodoB} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico comparativo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comparativo: {labelA} vs {labelB}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey={labelA} fill="hsl(217 91% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey={labelB} fill="hsl(217 91% 75%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela comparativa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Demonstrativo Comparativo</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] text-xs">Conta</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">{labelA}</TableHead>
                  <TableHead className="text-right w-[60px] text-xs hidden sm:table-cell">AV%</TableHead>
                  <TableHead className="text-right w-[110px] text-xs">{labelB}</TableHead>
                  <TableHead className="text-right w-[60px] text-xs hidden sm:table-cell">AV%</TableHead>
                  <TableHead className="text-right w-[100px] text-xs hidden md:table-cell">Var. R$</TableHead>
                  <TableHead className="text-right w-[70px] text-xs">Var. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasA.map((la) => {
                  const lb = linhasB.find(l => l.codigo === la.codigo);
                  const vB = lb?.valor ?? 0;
                  const avA = recLiqA ? la.valor / recLiqA : 0;
                  const avB = recLiqB ? vB / recLiqB : 0;
                  const diff = la.valor - vB;
                  const pct = variacao(la.valor, vB);

                  return (
                    <TableRow
                      key={la.codigo}
                      className={
                        la.isTotal
                          ? "bg-muted/60 font-bold border-t-2 border-border"
                          : la.isSubtotal
                          ? "bg-muted/30 font-semibold"
                          : ""
                      }
                    >
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{la.codigo}</TableCell>
                      <TableCell
                        style={{ paddingLeft: `${8 + la.nivel * 16}px` }}
                        className={`text-xs ${la.isTotal ? "font-bold" : la.isSubtotal ? "font-semibold" : ""}`}
                      >
                        {la.descricao}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${la.valor >= 0 ? "text-foreground" : "text-destructive"}`}>
                        {formatCurrency(la.valor)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground hidden sm:table-cell">
                        {formatPercent(avA)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${vB >= 0 ? "text-foreground" : "text-destructive"}`}>
                        {formatCurrency(vB)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] text-muted-foreground hidden sm:table-cell">
                        {formatPercent(avB)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs hidden md:table-cell ${diff >= 0 ? "text-accent" : "text-destructive"}`}>
                        {formatCurrency(diff)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${pct >= 0 ? "text-accent" : "text-destructive"}`}>
                        <span className="inline-flex items-center gap-0.5">
                          <VariacaoIcon val={pct} />
                          {Math.abs(pct).toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
