import { ExportButtons } from "@/components/ExportButtons";
import { useState, useMemo, useCallback } from "react";
import { printPDF, buildPrintTable } from "@/lib/printUtils";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthPicker } from "@/components/ui/month-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  FileText, Download, Calculator, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, BarChart3, PieChart, ArrowRight, Printer, Eye,
  DollarSign, FileCheck, ArrowUpRight, ArrowDownRight, ChevronRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CORES_IMPOSTOS = {
  icms: "hsl(217, 91%, 50%)",
  pis: "hsl(142, 72%, 42%)",
  cofins: "hsl(38, 92%, 50%)",
  ipi: "hsl(280, 65%, 55%)",
  iss: "hsl(0, 84%, 60%)",
  irpj: "hsl(190, 75%, 45%)",
  csll: "hsl(330, 65%, 50%)",
  simples: "hsl(160, 60%, 45%)",
};

// Dados simulados realistas
function gerarDadosApuracao(mes: number, ano: number) {
  const seed = mes + ano * 12;
  const rand = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

  const faturamento = rand(80000, 250000);
  const compras = faturamento * rand(0.4, 0.65);
  const servicos = faturamento * rand(0.05, 0.15);

  const icmsEntrada = compras * 0.18;
  const icmsSaida = faturamento * 0.18;
  const icmsApurado = Math.max(0, icmsSaida - icmsEntrada);

  const pisEntrada = compras * 0.0165;
  const pisSaida = faturamento * 0.0165;
  const pisApurado = Math.max(0, pisSaida - pisEntrada);

  const cofinsEntrada = compras * 0.076;
  const cofinsSaida = faturamento * 0.076;
  const cofinsApurado = Math.max(0, cofinsSaida - cofinsEntrada);

  const ipiEntrada = compras * rand(0.03, 0.08);
  const ipiSaida = faturamento * rand(0.03, 0.08);
  const ipiApurado = Math.max(0, ipiSaida - ipiEntrada);

  const issApurado = servicos * 0.05;

  const totalDebitos = icmsSaida + pisSaida + cofinsSaida + ipiSaida;
  const totalCreditos = icmsEntrada + pisEntrada + cofinsEntrada + ipiEntrada;
  const totalApurado = icmsApurado + pisApurado + cofinsApurado + ipiApurado + issApurado;

  const notasEmitidas = Math.floor(rand(45, 150));
  const notasEntrada = Math.floor(rand(20, 80));

  return {
    mes, ano, faturamento, compras, servicos,
    icms: { entrada: icmsEntrada, saida: icmsSaida, apurado: icmsApurado, aliquota: 18 },
    pis: { entrada: pisEntrada, saida: pisSaida, apurado: pisApurado, aliquota: 1.65 },
    cofins: { entrada: cofinsEntrada, saida: cofinsSaida, apurado: cofinsApurado, aliquota: 7.6 },
    ipi: { entrada: ipiEntrada, saida: ipiSaida, apurado: ipiApurado },
    iss: { apurado: issApurado, aliquota: 5 },
    totalDebitos, totalCreditos, totalApurado,
    notasEmitidas, notasEntrada,
    status: mes < new Date().getMonth() ? "fechado" : "aberto",
  };
}

function gerarHistorico(ano: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = gerarDadosApuracao(i, ano);
    return {
      mes: MESES[i].substring(0, 3),
      icms: d.icms.apurado,
      pis: d.pis.apurado,
      cofins: d.cofins.apurado,
      ipi: d.ipi.apurado,
      iss: d.iss.apurado,
      total: d.totalApurado,
      faturamento: d.faturamento,
    };
  });
}

const anoAtual = new Date().getFullYear();
const mesAtual = new Date().getMonth();

export default function Apuracao() {
  const [periodo, setPeriodo] = useState(`${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}`);
  const mesSelecionado = parseInt(periodo.split("-")[1]) - 1;
  const anoSelecionado = parseInt(periodo.split("-")[0]);
  const [abaAtiva, setAbaAtiva] = useState("resumo");
  const [periodosFechados, setPeriodosFechados] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("periodos_fechados") || "[]");
    } catch { return []; }
  });
  const { toast } = useToast();

  const chavePeriodo = `${mesSelecionado}-${anoSelecionado}`;
  const periodoFechado = periodosFechados.includes(chavePeriodo);

  const dados = useMemo(
    () => gerarDadosApuracao(mesSelecionado, anoSelecionado),
    [mesSelecionado, anoSelecionado]
  );

  const historico = useMemo(() => gerarHistorico(anoSelecionado), [anoSelecionado]);

  const composicaoImpostos = [
    { name: "ICMS", value: dados.icms.apurado, cor: CORES_IMPOSTOS.icms },
    { name: "PIS", value: dados.pis.apurado, cor: CORES_IMPOSTOS.pis },
    { name: "COFINS", value: dados.cofins.apurado, cor: CORES_IMPOSTOS.cofins },
    { name: "IPI", value: dados.ipi.apurado, cor: CORES_IMPOSTOS.ipi },
    { name: "ISS", value: dados.iss.apurado, cor: CORES_IMPOSTOS.iss },
  ];

  const cargaTributaria = dados.faturamento > 0
    ? ((dados.totalApurado / dados.faturamento) * 100).toFixed(2)
    : "0.00";

  const statusPeriodo = periodoFechado ? "fechado" : dados.status;

  const handleFecharPeriodo = useCallback(() => {
    const novos = [...periodosFechados, chavePeriodo];
    setPeriodosFechados(novos);
    localStorage.setItem("periodos_fechados", JSON.stringify(novos));
    toast({
      title: "Período Fechado",
      description: `A apuração de ${MESES[mesSelecionado]}/${anoSelecionado} foi fechada com sucesso.`,
    });
  }, [periodosFechados, chavePeriodo, mesSelecionado, anoSelecionado, toast]);

  const handleImprimir = useCallback(() => {
    const impostos = [
      { nome: "ICMS", debitos: dados.icms.saida, creditos: dados.icms.entrada, saldo: dados.icms.apurado },
      { nome: "PIS", debitos: dados.pis.saida, creditos: dados.pis.entrada, saldo: dados.pis.apurado },
      { nome: "COFINS", debitos: dados.cofins.saida, creditos: dados.cofins.entrada, saldo: dados.cofins.apurado },
      { nome: "IPI", debitos: dados.ipi.saida, creditos: dados.ipi.entrada, saldo: dados.ipi.apurado },
      { nome: "ISS", debitos: dados.iss.apurado, creditos: 0, saldo: dados.iss.apurado },
    ];
    const fc = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    // printPDF and buildPrintTable imported at top level
    printPDF({
      title: "APURAÇÃO FISCAL",
      subtitle: `Competência: ${MESES[mesSelecionado]}/${anoSelecionado} | Status: ${statusPeriodo === "fechado" ? "FECHADO" : "EM ABERTO"}`,
      content: `
        <div class="info-grid">
          <div class="info-box"><div class="label">Faturamento</div><div class="value">${fc(dados.faturamento)}</div></div>
          <div class="info-box"><div class="label">NFs Emitidas</div><div class="value">${dados.notasEmitidas}</div></div>
          <div class="info-box"><div class="label">Total a Recolher</div><div class="value">${fc(dados.totalApurado)}</div></div>
        </div>
        ${buildPrintTable(
          [{ label: "Imposto" }, { label: "Débitos", align: "right" as const }, { label: "Créditos", align: "right" as const }, { label: "Saldo a Recolher", align: "right" as const }],
          [
            ...impostos.map(i => ({ cells: [i.nome, fc(i.debitos), fc(i.creditos), fc(i.saldo)] })),
            { cells: ["TOTAL", fc(dados.totalDebitos + dados.iss.apurado), fc(dados.totalCreditos), fc(dados.totalApurado)], className: "total-row" }
          ]
        )}
      `,
    });
  }, [dados, mesSelecionado, anoSelecionado, statusPeriodo]);

  const handleExportar = useCallback(() => {
    const impostos = [
      { nome: "ICMS", debitos: dados.icms.saida, creditos: dados.icms.entrada, saldo: dados.icms.apurado },
      { nome: "PIS", debitos: dados.pis.saida, creditos: dados.pis.entrada, saldo: dados.pis.apurado },
      { nome: "COFINS", debitos: dados.cofins.saida, creditos: dados.cofins.entrada, saldo: dados.cofins.apurado },
      { nome: "IPI", debitos: dados.ipi.saida, creditos: dados.ipi.entrada, saldo: dados.ipi.apurado },
      { nome: "ISS", debitos: dados.iss.apurado, creditos: 0, saldo: dados.iss.apurado },
    ];
    const fc = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Apuração Fiscal</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 30px; color: #1a1a2e; }
  .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px; }
  .header h1 { font-size: 22px; color: #2563eb; }
  .header p { font-size: 13px; color: #666; margin-top: 4px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 25px; }
  .info-box { background: #f0f4ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 12px; text-align: center; }
  .info-box .label { font-size: 11px; color: #666; text-transform: uppercase; }
  .info-box .value { font-size: 18px; font-weight: bold; color: #1a1a2e; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #2563eb; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
  th:not(:first-child) { text-align: right; }
  td { padding: 9px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  td:not(:first-child) { text-align: right; font-family: monospace; }
  tr:last-child { background: #f0f4ff; font-weight: bold; }
  .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
  .total-box { background: #2563eb; color: white; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px; }
  .total-box .label { font-size: 12px; opacity: 0.85; }
  .total-box .value { font-size: 28px; font-weight: bold; margin-top: 4px; }
  .debito { color: #dc2626; }
  .credito { color: #16a34a; }
  @media print { body { padding: 15px; } }
</style></head><body>
  <div class="header">
    <h1>APURAÇÃO FISCAL</h1>
    <p>Competência: ${MESES[mesSelecionado]}/${anoSelecionado} &nbsp;|&nbsp; Status: ${statusPeriodo === "fechado" ? "FECHADO" : "EM ABERTO"}</p>
  </div>
  <div class="info-grid">
    <div class="info-box"><div class="label">Faturamento</div><div class="value">${fc(dados.faturamento)}</div></div>
    <div class="info-box"><div class="label">NFs Emitidas</div><div class="value">${dados.notasEmitidas}</div></div>
    <div class="info-box"><div class="label">Carga Tributária</div><div class="value">${cargaTributaria}%</div></div>
  </div>
  <div class="total-box">
    <div class="label">TOTAL DE IMPOSTOS A RECOLHER</div>
    <div class="value">${fc(dados.totalApurado)}</div>
  </div>
  <table>
    <thead><tr><th>Imposto</th><th>Débitos</th><th>Créditos</th><th>Saldo a Recolher</th></tr></thead>
    <tbody>
      ${impostos.map(i => `<tr><td><strong>${i.nome}</strong></td><td class="debito">${fc(i.debitos)}</td><td class="credito">${fc(i.creditos)}</td><td><strong>${fc(i.saldo)}</strong></td></tr>`).join("")}
      <tr><td>TOTAL</td><td class="debito">${fc(dados.totalDebitos + dados.iss.apurado)}</td><td class="credito">${fc(dados.totalCreditos)}</td><td><strong>${fc(dados.totalApurado)}</strong></td></tr>
    </tbody>
  </table>
  <div class="footer">Documento gerado automaticamente pelo sistema NexusERP em ${new Date().toLocaleString("pt-BR")}</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 400);
    }
    toast({ title: "PDF Gerado", description: "Use 'Salvar como PDF' na janela de impressão." });
  }, [dados, mesSelecionado, anoSelecionado, cargaTributaria, statusPeriodo, toast]);

  return (
    <div className="page-container">
      <PageHeader
        title="Apuração Fiscal"
        description="Apuração mensal de impostos com análise detalhada"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker value={periodo} onChange={setPeriodo} className="w-[200px]" />
            <ExportButtons options={{
              title: "Apuração Fiscal",
              subtitle: `Competência: ${MESES[mesSelecionado]}/${anoSelecionado}`,
              filename: `Apuracao_Fiscal_${MESES[mesSelecionado]}_${anoSelecionado}`,
              columns: [
                { header: "Imposto", key: "nome" },
                { header: "Débitos", key: "debitos", align: "right", format: (v: number) => formatCurrency(v) },
                { header: "Créditos", key: "creditos", align: "right", format: (v: number) => formatCurrency(v) },
                { header: "Saldo", key: "saldo", align: "right", format: (v: number) => formatCurrency(v) },
              ],
              data: [
                { nome: "ICMS", debitos: dados.icms.saida, creditos: dados.icms.entrada, saldo: dados.icms.apurado },
                { nome: "PIS", debitos: dados.pis.saida, creditos: dados.pis.entrada, saldo: dados.pis.apurado },
                { nome: "COFINS", debitos: dados.cofins.saida, creditos: dados.cofins.entrada, saldo: dados.cofins.apurado },
                { nome: "IPI", debitos: dados.ipi.saida, creditos: dados.ipi.entrada, saldo: dados.ipi.apurado },
                { nome: "ISS", debitos: dados.iss.apurado, creditos: 0, saldo: dados.iss.apurado },
              ],
              summaryRows: [
                { label: "Total a Pagar", value: formatCurrency(dados.icms.apurado + dados.pis.apurado + dados.cofins.apurado + dados.ipi.apurado + dados.iss.apurado) },
                { label: "Status", value: statusPeriodo === "fechado" ? "Fechado" : "Aberto" },
              ],
            }} inline />
          </div>
        }
      />

      {/* Status da Apuração */}
      <Card className="border-l-4" style={{ borderLeftColor: statusPeriodo === "fechado" ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
        <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {statusPeriodo === "fechado" ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : (
              <Clock className="h-5 w-5 text-warning" />
            )}
            <span className="font-medium text-foreground">
              Competência: {MESES[mesSelecionado]}/{anoSelecionado}
            </span>
            <Badge variant={statusPeriodo === "fechado" ? "default" : "secondary"}
              className={statusPeriodo === "fechado"
                ? "bg-success text-success-foreground"
                : "bg-warning/10 text-warning border-warning/30"}>
              {statusPeriodo === "fechado" ? "Fechado" : "Em Aberto"}
            </Badge>
          </div>
          {statusPeriodo !== "fechado" && (
            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={handleFecharPeriodo}>
              <FileCheck className="h-4 w-4 mr-1" /> Fechar Período
            </Button>
          )}
        </CardContent>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard
          titulo="Faturamento"
          valor={formatCurrency(dados.faturamento)}
          icone={<DollarSign className="h-5 w-5" />}
          cor="primary"
          detalhe={`${dados.notasEmitidas} NFs emitidas`}
        />
        <KPICard
          titulo="Total Débitos"
          valor={formatCurrency(dados.totalDebitos)}
          icone={<ArrowUpRight className="h-5 w-5" />}
          cor="destructive"
          detalhe="Impostos sobre saídas"
        />
        <KPICard
          titulo="Total Créditos"
          valor={formatCurrency(dados.totalCreditos)}
          icone={<ArrowDownRight className="h-5 w-5" />}
          cor="success"
          detalhe={`${dados.notasEntrada} NFs entrada`}
        />
        <KPICard
          titulo="Imposto a Pagar"
          valor={formatCurrency(dados.totalApurado)}
          icone={<Calculator className="h-5 w-5" />}
          cor="warning"
          detalhe={`Carga: ${cargaTributaria}%`}
        />
      </div>

      {/* Abas */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="resumo" className="gap-1">
            <FileText className="h-4 w-4" /> Resumo
          </TabsTrigger>
          <TabsTrigger value="detalhamento" className="gap-1">
            <Calculator className="h-4 w-4" /> Detalhamento
          </TabsTrigger>
          <TabsTrigger value="graficos" className="gap-1">
            <BarChart3 className="h-4 w-4" /> Gráficos
          </TabsTrigger>
          <TabsTrigger value="guias" className="gap-1">
            <FileCheck className="h-4 w-4" /> Guias
          </TabsTrigger>
        </TabsList>

        {/* ABA RESUMO */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Tabela Resumo por Imposto */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo por Imposto</CardTitle>
                <CardDescription>Débitos, créditos e saldo a recolher</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imposto</TableHead>
                      <TableHead className="text-right">Débitos</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                      <TableHead className="text-right font-bold">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { nome: "ICMS", ...dados.icms },
                      { nome: "PIS", ...dados.pis },
                      { nome: "COFINS", ...dados.cofins },
                      { nome: "IPI", ...dados.ipi },
                    ].map((imp) => (
                      <TableRow key={imp.nome}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES_IMPOSTOS[imp.nome.toLowerCase() as keyof typeof CORES_IMPOSTOS] }} />
                            <span className="font-medium">{imp.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(imp.saida)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(imp.entrada)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(imp.apurado)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CORES_IMPOSTOS.iss }} />
                          <span className="font-medium">ISS</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(dados.iss.apurado)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(dados.iss.apurado)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(dados.totalDebitos + dados.iss.apurado)}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(dados.totalCreditos)}</TableCell>
                      <TableCell className="text-right text-primary text-lg">{formatCurrency(dados.totalApurado)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Gráfico Pizza Composição */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Composição Tributária</CardTitle>
                <CardDescription>Participação de cada imposto no total</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RechartsPie>
                    <Pie
                      data={composicaoImpostos}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {composicaoImpostos.map((item, i) => (
                        <Cell key={i} fill={item.cor} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniCard label="NFs Saída" value={String(dados.notasEmitidas)} />
            <MiniCard label="NFs Entrada" value={String(dados.notasEntrada)} />
            <MiniCard label="Carga Tributária" value={`${cargaTributaria}%`} />
            <MiniCard label="Créditos Acum." value={formatCurrency(dados.totalCreditos * 0.12)} />
          </div>
        </TabsContent>

        {/* ABA DETALHAMENTO */}
        <TabsContent value="detalhamento" className="space-y-4 mt-4">
          {[
            { titulo: "ICMS", aliq: `${dados.icms.aliquota}%`, dados: dados.icms, cor: CORES_IMPOSTOS.icms },
            { titulo: "PIS", aliq: `${dados.pis.aliquota}%`, dados: dados.pis, cor: CORES_IMPOSTOS.pis },
            { titulo: "COFINS", aliq: `${dados.cofins.aliquota}%`, dados: dados.cofins, cor: CORES_IMPOSTOS.cofins },
          ].map((imp) => (
            <Card key={imp.titulo}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: imp.cor }} />
                    <div>
                      <CardTitle className="text-base">{imp.titulo}</CardTitle>
                      <CardDescription>Alíquota: {imp.aliq}</CardDescription>
                    </div>
                  </div>
                  <Badge className="text-lg px-3 py-1 bg-primary/10 text-primary border-primary/20">
                    {formatCurrency(imp.dados.apurado)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-xs text-muted-foreground mb-1">Débitos (Saídas)</p>
                    <p className="text-lg font-bold text-destructive">{formatCurrency(imp.dados.saida)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-success/5 border border-success/10">
                    <p className="text-xs text-muted-foreground mb-1">Créditos (Entradas)</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(imp.dados.entrada)}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Saldo a Recolher</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(imp.dados.apurado)}</p>
                  </div>
                </div>
                {/* Barra visual débito vs crédito */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Proporção Crédito/Débito</span>
                    <span>{imp.dados.saida > 0 ? ((imp.dados.entrada / imp.dados.saida) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-destructive/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-success transition-all"
                      style={{ width: `${imp.dados.saida > 0 ? Math.min((imp.dados.entrada / imp.dados.saida) * 100, 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* IPI e ISS lado a lado */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: CORES_IMPOSTOS.ipi }} />
                  <div>
                    <CardTitle className="text-base">IPI</CardTitle>
                    <CardDescription>Imposto sobre Produtos Industrializados</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Débitos</p>
                    <p className="font-bold text-destructive">{formatCurrency(dados.ipi.saida)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Créditos</p>
                    <p className="font-bold text-success">{formatCurrency(dados.ipi.entrada)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-bold text-primary">{formatCurrency(dados.ipi.apurado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: CORES_IMPOSTOS.iss }} />
                  <div>
                    <CardTitle className="text-base">ISS</CardTitle>
                    <CardDescription>Imposto Sobre Serviços — {dados.iss.aliquota}%</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Base de Cálculo</p>
                    <p className="font-bold">{formatCurrency(dados.servicos)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ISS a Recolher</p>
                    <p className="font-bold text-primary">{formatCurrency(dados.iss.apurado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA GRÁFICOS */}
        <TabsContent value="graficos" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Evolução Mensal */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Evolução Mensal de Impostos — {anoSelecionado}</CardTitle>
                <CardDescription>Comparativo mensal por tipo de imposto</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={historico} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="icms" name="ICMS" fill={CORES_IMPOSTOS.icms} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pis" name="PIS" fill={CORES_IMPOSTOS.pis} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="cofins" name="COFINS" fill={CORES_IMPOSTOS.cofins} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="ipi" name="IPI" fill={CORES_IMPOSTOS.ipi} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Linha: Total Impostos x Faturamento */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Carga Tributária vs Faturamento</CardTitle>
                <CardDescription>Relação entre impostos e receita ao longo do ano</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={historico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="total" name="Total Impostos" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA GUIAS */}
        <TabsContent value="guias" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Guias de Recolhimento</CardTitle>
              <CardDescription>Geração de guias para pagamento dos impostos apurados</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imposto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { imp: "ICMS", cod: "DARE", valor: dados.icms.apurado, venc: `20/${String(mesSelecionado + 2).padStart(2, "0")}/${anoSelecionado}` },
                    { imp: "PIS", cod: "DARF 8109", valor: dados.pis.apurado, venc: `25/${String(mesSelecionado + 2).padStart(2, "0")}/${anoSelecionado}` },
                    { imp: "COFINS", cod: "DARF 2172", valor: dados.cofins.apurado, venc: `25/${String(mesSelecionado + 2).padStart(2, "0")}/${anoSelecionado}` },
                    { imp: "IPI", cod: "DARF 1097", valor: dados.ipi.apurado, venc: `25/${String(mesSelecionado + 2).padStart(2, "0")}/${anoSelecionado}` },
                    { imp: "ISS", cod: "DAM", valor: dados.iss.apurado, venc: `15/${String(mesSelecionado + 2).padStart(2, "0")}/${anoSelecionado}` },
                  ].map((g) => (
                    <TableRow key={g.imp}>
                      <TableCell className="font-medium">{g.imp}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{g.cod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(g.valor)}</TableCell>
                      <TableCell>{g.venc}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          statusPeriodo === "fechado"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-warning/10 text-warning border-warning/20"
                        }>
                          {statusPeriodo === "fechado" ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Imprimir">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo de Guias */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium text-foreground">Total de Guias Pendentes</p>
                  <p className="text-sm text-muted-foreground">5 guias para o período {MESES[mesSelecionado]}/{anoSelecionado}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{formatCurrency(dados.totalApurado)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ titulo, valor, icone, cor, detalhe }: {
  titulo: string; valor: string; icone: React.ReactNode; cor: string; detalhe: string;
}) {
  const corMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{titulo}</p>
          <div className={`p-2 rounded-lg ${corMap[cor]}`}>{icone}</div>
        </div>
        <p className="text-xl md:text-2xl font-bold text-foreground">{valor}</p>
        <p className="text-xs text-muted-foreground mt-1">{detalhe}</p>
      </CardContent>
    </Card>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
