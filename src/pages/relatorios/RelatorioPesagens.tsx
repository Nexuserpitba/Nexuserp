import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale, CheckCircle2, AlertTriangle, Trash2, TrendingUp, Hash, Weight, Clock } from "lucide-react";
import { ExportButtons } from "@/components/ExportButtons";
import type { ExportOptions } from "@/lib/exportUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface PesagemHistorico {
  id: string;
  peso: number;
  timestamp: string;
  estavel: boolean;
}

function loadHistorico(): PesagemHistorico[] {
  try {
    const s = localStorage.getItem("gp_erp_pesagens_turno");
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export default function RelatorioPesagens() {
  const [pesagens, setPesagens] = useState<PesagemHistorico[]>(loadHistorico);

  const stats = useMemo(() => {
    if (pesagens.length === 0) return null;
    const pesos = pesagens.map(p => p.peso);
    const total = pesos.reduce((a, b) => a + b, 0);
    const media = total / pesos.length;
    const estaveis = pesagens.filter(p => p.estavel).length;
    const menor = Math.min(...pesos);
    const maior = Math.max(...pesos);
    return { total, media, estaveis, instaveis: pesagens.length - estaveis, menor, maior, count: pesagens.length };
  }, [pesagens]);

  const chartData = useMemo(() => {
    return [...pesagens].reverse().map((p, i) => ({
      idx: i + 1,
      peso: p.peso,
      horario: new Date(p.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      estavel: p.estavel,
    }));
  }, [pesagens]);

  const limparHistorico = () => {
    localStorage.removeItem("gp_erp_pesagens_turno");
    setPesagens([]);
  };

  const exportOptions: ExportOptions = useMemo(() => ({
    title: "Relatório de Pesagens",
    subtitle: `Turno atual — ${pesagens.length} pesagens`,
    filename: "pesagens-turno",
    columns: [
      { header: "#", key: "idx" },
      { header: "Peso (kg)", key: "peso", align: "right" as const },
      { header: "Estável", key: "estavel" },
      { header: "Horário", key: "horario" },
    ],
    data: pesagens.map((p, i) => ({
      idx: String(i + 1),
      peso: p.peso.toFixed(3),
      estavel: p.estavel ? "Sim" : "Não",
      horario: new Date(p.timestamp).toLocaleString("pt-BR"),
    })),
    summaryRows: stats ? [
      { label: "Peso Total", value: `${stats.total.toFixed(3)} kg` },
      { label: "Peso Médio", value: `${stats.media.toFixed(3)} kg` },
      { label: "Estáveis", value: `${stats.estaveis}/${stats.count}` },
    ] : [],
  }), [pesagens, stats]);

  return (
    <div className="page-container">
      <PageHeader title="Relatório de Pesagens" description="Pesagens realizadas no turno atual com totais e médias" />

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Hash size={18} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.count}</p>
              <p className="text-[11px] text-muted-foreground">Pesagens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Weight size={18} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.total.toFixed(3)}</p>
              <p className="text-[11px] text-muted-foreground">Peso Total (kg)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <TrendingUp size={18} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.media.toFixed(3)}</p>
              <p className="text-[11px] text-muted-foreground">Peso Médio (kg)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Scale size={18} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.menor.toFixed(3)}</p>
              <p className="text-[11px] text-muted-foreground">Menor (kg)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Scale size={18} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.maior.toFixed(3)}</p>
              <p className="text-[11px] text-muted-foreground">Maior (kg)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <CheckCircle2 size={18} className="mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{stats.estaveis}/{stats.count}</p>
              <p className="text-[11px] text-muted-foreground">Estáveis</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de evolução */}
      {chartData.length >= 2 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp size={18} className="text-primary" /> Evolução do Peso no Turno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="horario" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis
                  domain={["dataMin - 0.05", "dataMax + 0.05"]}
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v: number) => `${v.toFixed(3)}`}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`${value.toFixed(3)} kg`, "Peso"]}
                  labelFormatter={(label) => `Horário: ${label}`}
                />
                {stats && (
                  <ReferenceLine
                    y={stats.media}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                    label={{ value: `Média: ${stats.media.toFixed(3)}`, position: "insideTopRight", fontSize: 11, fill: "hsl(var(--primary))" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela + Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={18} className="text-primary" /> Pesagens do Turno
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportButtons options={exportOptions} thermal />
              {pesagens.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={limparHistorico}>
                  <Trash2 size={14} /> Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pesagens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Scale size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma pesagem registrada neste turno</p>
              <p className="text-sm">As pesagens confirmadas no PDV (Ctrl+B) aparecerão aqui.</p>
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Estabilidade</TableHead>
                    <TableHead>Horário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pesagens.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-mono font-bold text-foreground">{p.peso.toFixed(3)} kg</TableCell>
                      <TableCell>
                        {p.estavel ? (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 dark:text-green-400">
                            <CheckCircle2 size={12} /> Estável
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500/30 dark:text-yellow-400">
                            <AlertTriangle size={12} /> Instável
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", day: "2-digit", month: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
