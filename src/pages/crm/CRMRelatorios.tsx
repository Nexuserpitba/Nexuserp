import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExportButtons } from "@/components/ExportButtons";
import { Lead, Atividade, ETAPAS_FUNIL } from "@/types/crm";
import { defaultLeads, defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Users, Clock, DollarSign, Target, Award, ArrowUpRight, ArrowDownRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CRMRelatorios = () => {
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const { items: atividades } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);

  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Métricas por responsável
  const porResponsavel = useMemo(() => {
    const map: Record<string, { total: number; ganhos: number; perdidos: number; valorGanho: number; valorPipeline: number; atividadesConcluidas: number }> = {};
    leads.forEach(l => {
      const r = l.responsavel || 'Sem responsável';
      if (!map[r]) map[r] = { total: 0, ganhos: 0, perdidos: 0, valorGanho: 0, valorPipeline: 0, atividadesConcluidas: 0 };
      map[r].total++;
      if (l.etapa === 'fechado_ganho') { map[r].ganhos++; map[r].valorGanho += l.valor; }
      if (l.etapa === 'fechado_perdido') map[r].perdidos++;
      if (!['fechado_ganho', 'fechado_perdido'].includes(l.etapa)) map[r].valorPipeline += l.valor;
    });
    atividades.forEach(a => {
      const r = a.responsavel || 'Sem responsável';
      if (!map[r]) map[r] = { total: 0, ganhos: 0, perdidos: 0, valorGanho: 0, valorPipeline: 0, atividadesConcluidas: 0 };
      if (a.status === 'concluida') map[r].atividadesConcluidas++;
    });
    return Object.entries(map).map(([nome, dados]) => ({
      nome,
      ...dados,
      taxaConversao: dados.total > 0 ? ((dados.ganhos / dados.total) * 100) : 0,
    })).sort((a, b) => b.valorGanho - a.valorGanho);
  }, [leads, atividades]);

  // Tempo médio no funil (dias entre criação e atualização para leads fechados)
  const tempoMedioFunil = useMemo(() => {
    const fechados = leads.filter(l => ['fechado_ganho', 'fechado_perdido'].includes(l.etapa));
    if (fechados.length === 0) return { geral: 0, ganhos: 0, perdidos: 0 };
    const calcMedia = (arr: Lead[]) => {
      if (arr.length === 0) return 0;
      const total = arr.reduce((s, l) => {
        const d1 = new Date(l.dataCriacao).getTime();
        const d2 = new Date(l.dataAtualizacao).getTime();
        return s + Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
      }, 0);
      return Math.round(total / arr.length);
    };
    return {
      geral: calcMedia(fechados),
      ganhos: calcMedia(leads.filter(l => l.etapa === 'fechado_ganho')),
      perdidos: calcMedia(leads.filter(l => l.etapa === 'fechado_perdido')),
    };
  }, [leads]);

  // Previsão de receita (valor * probabilidade / 100)
  const previsaoReceita = useMemo(() => {
    const ativos = leads.filter(l => !['fechado_ganho', 'fechado_perdido'].includes(l.etapa));
    const previsaoPorEtapa = ETAPAS_FUNIL
      .filter(e => !['fechado_ganho', 'fechado_perdido'].includes(e.key))
      .map(etapa => {
        const leadsEtapa = ativos.filter(l => l.etapa === etapa.key);
        const valorTotal = leadsEtapa.reduce((s, l) => s + l.valor, 0);
        const valorPonderado = leadsEtapa.reduce((s, l) => s + (l.valor * l.probabilidade / 100), 0);
        return { etapa: etapa.label, leads: leadsEtapa.length, valorTotal, valorPonderado };
      });
    const totalPrevisao = previsaoPorEtapa.reduce((s, e) => s + e.valorPonderado, 0);
    const totalPipeline = ativos.reduce((s, l) => s + l.valor, 0);
    return { porEtapa: previsaoPorEtapa, totalPrevisao, totalPipeline };
  }, [leads]);

  // Dados do gráfico de conversão por responsável
  const chartResponsavel = useMemo(() => {
    return porResponsavel.map(r => ({
      name: r.nome,
      'Taxa Conversão (%)': Number(r.taxaConversao.toFixed(1)),
      'Ganhos': r.ganhos,
      'Perdidos': r.perdidos,
    }));
  }, [porResponsavel]);

  // Dados do gráfico de previsão
  const chartPrevisao = useMemo(() => {
    return previsaoReceita.porEtapa.map(e => ({
      name: e.etapa,
      'Valor Total': e.valorTotal,
      'Valor Ponderado': e.valorPonderado,
    }));
  }, [previsaoReceita]);

  // KPIs globais
  const ganhos = leads.filter(l => l.etapa === 'fechado_ganho');
  const totalGanho = ganhos.reduce((s, l) => s + l.valor, 0);
  const taxaGlobal = leads.length > 0 ? (ganhos.length / leads.length * 100) : 0;
  const ticketMedio = ganhos.length > 0 ? totalGanho / ganhos.length : 0;

  const kpis = [
    { label: "Receita Prevista", value: formatCurrency(previsaoReceita.totalPrevisao), icon: DollarSign, desc: `Pipeline: ${formatCurrency(previsaoReceita.totalPipeline)}`, trend: "up" },
    { label: "Taxa Conversão Global", value: `${taxaGlobal.toFixed(1)}%`, icon: Target, desc: `${ganhos.length} ganhos de ${leads.length}`, trend: taxaGlobal > 15 ? "up" : "down" },
    { label: "Ticket Médio", value: formatCurrency(ticketMedio), icon: TrendingUp, desc: `${ganhos.length} negócios ganhos`, trend: "up" },
    { label: "Tempo Médio Funil", value: `${tempoMedioFunil.geral} dias`, icon: Clock, desc: `Ganhos: ${tempoMedioFunil.ganhos}d | Perdidos: ${tempoMedioFunil.perdidos}d`, trend: tempoMedioFunil.geral < 30 ? "up" : "down" },
  ];

  // Export data
  const exportColumns = [
    { header: "Responsável", key: "nome" },
    { header: "Total Leads", key: "total", align: "center" as const },
    { header: "Ganhos", key: "ganhos", align: "center" as const },
    { header: "Perdidos", key: "perdidos", align: "center" as const },
    { header: "Taxa Conversão", key: "taxaConversao", align: "center" as const, format: (v: number) => `${v.toFixed(1)}%` },
    { header: "Valor Ganho", key: "valorGanho", align: "right" as const, format: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { header: "Pipeline Ativo", key: "valorPipeline", align: "right" as const, format: (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { header: "Atividades Concluídas", key: "atividadesConcluidas", align: "center" as const },
  ];

  const exportSummary = [
    { label: "Receita Prevista", value: formatCurrency(previsaoReceita.totalPrevisao) },
    { label: "Taxa Conversão Global", value: `${taxaGlobal.toFixed(1)}%` },
    { label: "Ticket Médio", value: formatCurrency(ticketMedio) },
    { label: "Tempo Médio Funil", value: `${tempoMedioFunil.geral} dias` },
  ];

  const handlePrintPDF = async () => {
    // KPIs section
    const kpisHtml = `<div class="info-grid">${kpis.map(k => `<div class="info-box"><div class="label">${k.label}</div><div class="value">${k.value}</div><div class="muted">${k.desc}</div></div>`).join('')}</div>`;

    // Gráfico de conversão (CSS bars)
    const maxConv = Math.max(...porResponsavel.map(r => r.total), 1);
    const chartHtml = `<h3 style="font-size:13px;font-weight:600;margin:20px 0 8px;">Conversão por Responsável</h3>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
        ${porResponsavel.map(r => `
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:100px;font-size:11px;font-weight:500;text-align:right;">${r.nome}</span>
            <div style="flex:1;display:flex;height:18px;border-radius:4px;overflow:hidden;background:#f0f0f0;">
              <div style="width:${(r.ganhos/maxConv)*100}%;background:#16a34a;"></div>
              <div style="width:${(r.perdidos/maxConv)*100}%;background:#dc2626;"></div>
            </div>
            <span style="font-size:10px;width:80px;">${r.ganhos}G / ${r.perdidos}P (${r.taxaConversao.toFixed(0)}%)</span>
          </div>`).join('')}
        <div style="display:flex;gap:12px;margin-top:4px;font-size:10px;color:#888;">
          <span>■ <span style="color:#16a34a;">Ganhos</span></span>
          <span>■ <span style="color:#dc2626;">Perdidos</span></span>
        </div>
      </div>`;

    // Previsão chart (CSS bars)
    const maxPrev = Math.max(...previsaoReceita.porEtapa.map(e => e.valorTotal), 1);
    const prevChartHtml = `<h3 style="font-size:13px;font-weight:600;margin:20px 0 8px;">Previsão de Receita por Etapa</h3>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
        ${previsaoReceita.porEtapa.map(e => `
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:100px;font-size:11px;font-weight:500;text-align:right;">${e.etapa}</span>
            <div style="flex:1;display:flex;height:18px;border-radius:4px;overflow:hidden;background:#f0f0f0;">
              <div style="width:${(e.valorPonderado/maxPrev)*100}%;background:#3b82f6;"></div>
              <div style="width:${((e.valorTotal-e.valorPonderado)/maxPrev)*100}%;background:#93c5fd;"></div>
            </div>
            <span style="font-size:10px;width:100px;">${printCurrency(e.valorPonderado)}</span>
          </div>`).join('')}
      </div>`;

    // Performance table
    const perfTable = buildPrintTable(
      [
        { label: "Responsável" }, { label: "Total", align: "center" }, { label: "Ganhos", align: "center" },
        { label: "Perdidos", align: "center" }, { label: "Conversão", align: "center" },
        { label: "Valor Ganho", align: "right" }, { label: "Pipeline", align: "right" },
      ],
      porResponsavel.map(r => ({
        cells: [r.nome, String(r.total), String(r.ganhos), String(r.perdidos), `${r.taxaConversao.toFixed(1)}%`, printCurrency(r.valorGanho), printCurrency(r.valorPipeline)],
      }))
    );

    // Previsão detalhada table
    const prevTable = buildPrintTable(
      [{ label: "Etapa" }, { label: "Leads", align: "center" }, { label: "Valor Total", align: "right" }, { label: "Valor Ponderado", align: "right" }],
      [
        ...previsaoReceita.porEtapa.map(e => ({
          cells: [e.etapa, String(e.leads), printCurrency(e.valorTotal), printCurrency(e.valorPonderado)],
        })),
        {
          cells: ["TOTAL", String(previsaoReceita.porEtapa.reduce((s, e) => s + e.leads, 0)), printCurrency(previsaoReceita.totalPipeline), printCurrency(previsaoReceita.totalPrevisao)],
          className: "total-row",
        }
      ]
    );

    // Tempo médio
    const tempoHtml = `<div class="info-grid" style="margin-top:20px;"><div class="info-box"><div class="label">Tempo Médio Geral</div><div class="value">${tempoMedioFunil.geral} dias</div></div><div class="info-box"><div class="label">Ciclo de Venda</div><div class="value positive">${tempoMedioFunil.ganhos} dias</div></div><div class="info-box"><div class="label">Ciclo até Perda</div><div class="value negative">${tempoMedioFunil.perdidos} dias</div></div></div>`;

    await printPDF({
      title: "Relatórios CRM - Performance",
      subtitle: `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      content: `${kpisHtml}${chartHtml}${prevChartHtml}<h3 style="font-size:13px;font-weight:600;margin:20px 0 8px;">Performance por Responsável</h3>${perfTable}<h3 style="font-size:13px;font-weight:600;margin:20px 0 8px;">Previsão de Receita Detalhada</h3>${prevTable}${tempoHtml}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PageHeader title="Relatórios CRM" description="Métricas de conversão, tempo de funil e previsão de receita" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintPDF}><Printer className="w-4 h-4 mr-1" /> PDF</Button>
          <ExportButtons options={{
            title: "Relatório CRM - Performance",
            filename: "crm-performance",
            columns: exportColumns,
            data: porResponsavel,
            summaryRows: exportSummary,
          }} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
                    <span className="text-xs text-muted-foreground">{kpi.desc}</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <kpi.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Conversão por Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartResponsavel} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Ganhos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perdidos" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Previsão de Receita por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartPrevisao} margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="Valor Total" fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Valor Ponderado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Performance por Responsável */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Award className="w-4 h-4" /> Performance por Responsável
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Total Leads</TableHead>
                <TableHead className="text-center">Ganhos</TableHead>
                <TableHead className="text-center">Perdidos</TableHead>
                <TableHead className="text-center">Taxa Conversão</TableHead>
                <TableHead className="text-right">Valor Ganho</TableHead>
                <TableHead className="text-right">Pipeline Ativo</TableHead>
                <TableHead className="text-center">Atividades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porResponsavel.map((r, i) => (
                <TableRow key={r.nome}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Badge className="bg-yellow-500/20 text-yellow-600 text-[9px] border-0">🥇</Badge>}
                      {i === 1 && <Badge className="bg-gray-300/20 text-gray-500 text-[9px] border-0">🥈</Badge>}
                      {i === 2 && <Badge className="bg-orange-400/20 text-orange-500 text-[9px] border-0">🥉</Badge>}
                      {r.nome}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{r.total}</TableCell>
                  <TableCell className="text-center text-green-600 font-semibold">{r.ganhos}</TableCell>
                  <TableCell className="text-center text-red-500">{r.perdidos}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[10px]", r.taxaConversao >= 30 ? "border-green-300 text-green-600" : r.taxaConversao >= 15 ? "border-amber-300 text-amber-600" : "border-red-300 text-red-500")}>
                      {r.taxaConversao.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.valorGanho)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(r.valorPipeline)}</TableCell>
                  <TableCell className="text-center">{r.atividadesConcluidas}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Previsão de Receita detalhada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Previsão de Receita Detalhada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etapa do Funil</TableHead>
                <TableHead className="text-center">Qtd. Leads</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Valor Ponderado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previsaoReceita.porEtapa.map(e => (
                <TableRow key={e.etapa}>
                  <TableCell className="font-medium">{e.etapa}</TableCell>
                  <TableCell className="text-center">{e.leads}</TableCell>
                  <TableCell className="text-right">{formatCurrency(e.valorTotal)}</TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(e.valorPonderado)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{previsaoReceita.porEtapa.reduce((s, e) => s + e.leads, 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(previsaoReceita.totalPipeline)}</TableCell>
                <TableCell className="text-right text-primary">{formatCurrency(previsaoReceita.totalPrevisao)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tempo Médio no Funil */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tempo Médio Geral", value: `${tempoMedioFunil.geral} dias`, className: "text-foreground" },
          { label: "Ciclo de Venda (Ganhos)", value: `${tempoMedioFunil.ganhos} dias`, className: "text-green-600" },
          { label: "Ciclo até Perda", value: `${tempoMedioFunil.perdidos} dias`, className: "text-red-500" },
        ].map(item => (
          <Card key={item.label} className="p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
            <p className={cn("text-3xl font-bold mt-1", item.className)}>{item.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CRMRelatorios;
