import { CurrencyInput } from "@/components/ui/currency-input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Calculator, CalendarDays, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { useState, useMemo } from "react";

// Cronograma da Reforma Tributária
const cronograma = [
  { ano: 2026, fase: "Teste", descricao: "CBS 0,9% e IBS 0,1% — alíquota teste sem impacto na carga", status: "proximo" },
  { ano: 2027, fase: "CBS Plena", descricao: "CBS substitui PIS/COFINS integralmente", status: "futuro" },
  { ano: 2028, fase: "Transição IBS", descricao: "IBS começa a substituir ICMS/ISS gradualmente", status: "futuro" },
  { ano: 2029, fase: "Redução 10%", descricao: "ICMS e ISS reduzidos em 10%, IBS compensa", status: "futuro" },
  { ano: 2030, fase: "Redução 20%", descricao: "ICMS e ISS reduzidos em 20%", status: "futuro" },
  { ano: 2031, fase: "Redução 30%", descricao: "ICMS e ISS reduzidos em 30%", status: "futuro" },
  { ano: 2032, fase: "Redução 40%", descricao: "ICMS e ISS reduzidos em 40%", status: "futuro" },
  { ano: 2033, fase: "Extinção", descricao: "ICMS e ISS extintos, IBS/CBS plenos", status: "futuro" },
];

// Alíquotas de referência
const aliquotasReferencia = {
  cbsGeral: 8.8,
  ibsGeral: 17.7,
  totalGeral: 26.5,
  reduzida60: 10.6,
  reduzida30: 18.55,
  zerada: 0,
};

// Categorias com tratamento diferenciado
const categoriasEspeciais = [
  { categoria: "Cesta básica nacional", reducao: "100%", aliquota: 0, icone: "🛒" },
  { categoria: "Saúde (medicamentos)", reducao: "60%", aliquota: 10.6, icone: "💊" },
  { categoria: "Educação", reducao: "60%", aliquota: 10.6, icone: "📚" },
  { categoria: "Transporte coletivo", reducao: "60%", aliquota: 10.6, icone: "🚌" },
  { categoria: "Produtos agropecuários", reducao: "60%", aliquota: 10.6, icone: "🌾" },
  { categoria: "Dispositivos médicos", reducao: "60%", aliquota: 10.6, icone: "🏥" },
  { categoria: "Higiene pessoal", reducao: "30%", aliquota: 18.55, icone: "🧴" },
  { categoria: "Alimentos (geral)", reducao: "30%", aliquota: 18.55, icone: "🍽️" },
  { categoria: "Bebidas alcoólicas", reducao: "0% + IS", aliquota: 26.5, icone: "🍺" },
  { categoria: "Cigarros", reducao: "0% + IS", aliquota: 26.5, icone: "🚬" },
  { categoria: "Veículos", reducao: "0% + IS", aliquota: 26.5, icone: "🚗" },
  { categoria: "Produtos geral", reducao: "0%", aliquota: 26.5, icone: "📦" },
];

// Comparativo impostos atuais vs reforma
const comparativoImpostos = [
  { atual: "PIS", aliqAtual: "0,65% / 1,65%", novo: "CBS", aliqNovo: "8,8%", obs: "Crédito amplo" },
  { atual: "COFINS", aliqAtual: "3,0% / 7,6%", novo: "CBS", aliqNovo: "(incluído acima)", obs: "Unificado com PIS" },
  { atual: "ICMS", aliqAtual: "7% a 22%", novo: "IBS", aliqNovo: "17,7%", obs: "Destino, não origem" },
  { atual: "ISS", aliqAtual: "2% a 5%", novo: "IBS", aliqNovo: "(incluído acima)", obs: "Unificado com ICMS" },
  { atual: "IPI", aliqAtual: "0% a 300%", novo: "IS", aliqNovo: "Variável", obs: "Imposto Seletivo" },
];

export default function ReformaTributaria() {
  const [simValor, setSimValor] = useState(1000);
  const [simCategoria, setSimCategoria] = useState("geral");
  const [simRegime, setSimRegime] = useState("normal");
  const [simAno, setSimAno] = useState("2026");

  const simulacao = useMemo(() => {
    const cat = categoriasEspeciais.find(c => c.categoria.toLowerCase().includes(simCategoria)) 
      || { aliquota: 26.5 };
    const aliqReforma = cat.aliquota;

    // Cálculo simplificado regime atual
    const pis = simRegime === "normal" ? simValor * 0.0165 : simValor * 0.0065;
    const cofins = simRegime === "normal" ? simValor * 0.076 : simValor * 0.03;
    const icms = simValor * 0.18;
    const totalAtual = pis + cofins + icms;
    const percAtual = (totalAtual / simValor) * 100;

    // Cálculo reforma por ano (transição)
    const ano = parseInt(simAno);
    let fatorTransicao = 0;
    if (ano <= 2026) fatorTransicao = 0.01; // teste
    else if (ano === 2027) fatorTransicao = 0.35; // CBS plena
    else if (ano === 2028) fatorTransicao = 0.5;
    else if (ano === 2029) fatorTransicao = 0.6;
    else if (ano === 2030) fatorTransicao = 0.7;
    else if (ano === 2031) fatorTransicao = 0.8;
    else if (ano === 2032) fatorTransicao = 0.9;
    else fatorTransicao = 1;

    const totalReforma = simValor * (aliqReforma / 100);
    const totalTransicao = totalAtual + (totalReforma - totalAtual) * fatorTransicao;
    const percTransicao = (totalTransicao / simValor) * 100;

    const economia = totalAtual - totalTransicao;
    const percEconomia = totalAtual > 0 ? (economia / totalAtual) * 100 : 0;

    return {
      pis, cofins, icms, totalAtual, percAtual,
      aliqReforma, totalReforma, totalTransicao, percTransicao,
      economia, percEconomia, fatorTransicao,
    };
  }, [simValor, simCategoria, simRegime, simAno]);

  const anoAtual = 2026;
  const progressoReforma = ((anoAtual - 2026) / (2033 - 2026)) * 100;

  return (
    <div className="page-container">
      <PageHeader
        title="Reforma Tributária"
        description="IBS, CBS e Imposto Seletivo — Transição 2026–2033"
      />

      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
        </TabsList>

        {/* ── VISÃO GERAL ── */}
        <TabsContent value="visao-geral" className="space-y-4">
          {/* Cards resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">CBS (Federal)</p>
                <p className="text-3xl font-bold text-primary">{aliquotasReferencia.cbsGeral}%</p>
                <p className="text-xs text-muted-foreground mt-1">Substitui PIS + COFINS</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">IBS (Estadual/Municipal)</p>
                <p className="text-3xl font-bold text-primary">{aliquotasReferencia.ibsGeral}%</p>
                <p className="text-xs text-muted-foreground mt-1">Substitui ICMS + ISS</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Alíquota Geral</p>
                <p className="text-3xl font-bold text-destructive">{aliquotasReferencia.totalGeral}%</p>
                <p className="text-xs text-muted-foreground mt-1">CBS + IBS combinado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Imposto Seletivo (IS)</p>
                <p className="text-3xl font-bold text-amber-600">Variável</p>
                <p className="text-xs text-muted-foreground mt-1">Bens prejudiciais à saúde/meio ambiente</p>
              </CardContent>
            </Card>
          </div>

          {/* Comparativo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight size={16} /> Comparativo: Sistema Atual × Reforma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imposto Atual</TableHead>
                    <TableHead>Alíquota Atual</TableHead>
                    <TableHead className="text-center"><ArrowRight size={14} className="inline" /></TableHead>
                    <TableHead>Novo Imposto</TableHead>
                    <TableHead>Alíquota Reforma</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparativoImpostos.map(c => (
                    <TableRow key={c.atual}>
                      <TableCell className="font-medium">{c.atual}</TableCell>
                      <TableCell className="font-mono">{c.aliqAtual}</TableCell>
                      <TableCell className="text-center text-muted-foreground">→</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">{c.novo}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{c.aliqNovo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.obs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Princípios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="font-semibold text-sm">Princípio do Destino</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Imposto cobrado no local de consumo, não mais na origem. Acaba com a guerra fiscal entre estados.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="font-semibold text-sm">Não-Cumulatividade Plena</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Crédito amplo de todos os insumos da cadeia. Elimina o efeito cascata dos tributos.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <p className="font-semibold text-sm">Split Payment</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recolhimento automático no momento do pagamento. Reduz inadimplência e sonegação.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SIMULADOR ── */}
        <TabsContent value="simulador" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator size={16} /> Simulador de Impacto da Reforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Valor do Produto (R$)</Label>
                  <CurrencyInput
                    value={simValor}
                    onValueChange={v => setSimValor(v)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Categoria</Label>
                  <Select value={simCategoria} onValueChange={setSimCategoria}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Produto Geral (26,5%)</SelectItem>
                      <SelectItem value="cesta">Cesta Básica (0%)</SelectItem>
                      <SelectItem value="saúde">Saúde (10,6%)</SelectItem>
                      <SelectItem value="educação">Educação (10,6%)</SelectItem>
                      <SelectItem value="higiene">Higiene (18,55%)</SelectItem>
                      <SelectItem value="alimentos">Alimentos (18,55%)</SelectItem>
                      <SelectItem value="bebidas">Bebidas Alcoólicas (26,5% + IS)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Regime Tributário</Label>
                  <Select value={simRegime} onValueChange={setSimRegime}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Lucro Real / Presumido</SelectItem>
                      <SelectItem value="simples">Simples Nacional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Ano de Referência</Label>
                  <Select value={simAno} onValueChange={setSimAno}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033].map(a => (
                        <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Resultados */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Regime atual */}
                <Card className="border-2 border-muted">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Sistema Atual</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>PIS:</span>
                        <span className="font-mono">R$ {simulacao.pis.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COFINS:</span>
                        <span className="font-mono">R$ {simulacao.cofins.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ICMS (18%):</span>
                        <span className="font-mono">R$ {simulacao.icms.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total Tributos:</span>
                        <span className="font-mono text-destructive">R$ {simulacao.totalAtual.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Carga efetiva:</span>
                        <span>{simulacao.percAtual.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transição */}
                <Card className="border-2 border-amber-500/30">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold text-amber-600 flex items-center gap-1">
                      <CalendarDays size={14} /> Transição {simAno}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Fator transição:</span>
                        <span className="font-mono">{(simulacao.fatorTransicao * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Alíq. reforma categoria:</span>
                        <span className="font-mono">{simulacao.aliqReforma}%</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total Tributos:</span>
                        <span className="font-mono text-amber-600">R$ {simulacao.totalTransicao.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Carga efetiva:</span>
                        <span>{simulacao.percTransicao.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Impacto */}
                <Card className="border-2 border-green-500/30">
                  <CardContent className="pt-4 space-y-3">
                    <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                      <TrendingUp size={14} /> Impacto
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Diferença:</span>
                        <span className={`font-mono font-bold ${simulacao.economia >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {simulacao.economia >= 0 ? "-" : "+"}R$ {Math.abs(simulacao.economia).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Variação:</span>
                        <span className={`font-mono ${simulacao.percEconomia >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {simulacao.percEconomia >= 0 ? "↓" : "↑"}{Math.abs(simulacao.percEconomia).toFixed(1)}%
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-2 pt-2">
                        {simulacao.economia >= 0 ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 size={12} className="mr-1" /> Economia
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle size={12} className="mr-1" /> Aumento
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
                <Info size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Simulação simplificada para fins de planejamento. Os valores reais dependerão da regulamentação
                  complementar, créditos acumulados e regras específicas de cada setor. Consulte seu contador.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CATEGORIAS ── */}
        <TabsContent value="categorias" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Categorias e Alíquotas Diferenciadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead></TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Redução</TableHead>
                    <TableHead className="text-right">Alíquota Efetiva</TableHead>
                    <TableHead className="text-right">Economia vs Geral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriasEspeciais.map(c => {
                    const economia = aliquotasReferencia.totalGeral - c.aliquota;
                    return (
                      <TableRow key={c.categoria}>
                        <TableCell className="text-center text-lg">{c.icone}</TableCell>
                        <TableCell className="font-medium">{c.categoria}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={c.reducao === "100%" ? "default" : c.reducao.includes("60") ? "secondary" : "outline"}>
                            {c.reducao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {c.aliquota === 0 ? (
                            <span className="text-green-600">Isento</span>
                          ) : (
                            `${c.aliquota}%`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {economia > 0 ? (
                            <span className="text-green-600">-{economia.toFixed(1)}pp</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* IS */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Imposto Seletivo (IS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                O Imposto Seletivo incide sobre bens e serviços prejudiciais à saúde ou ao meio ambiente,
                com alíquotas adicionais sobre a base IBS/CBS.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { item: "Cigarros", aliq: "Até 300%", icone: "🚬" },
                  { item: "Bebidas Alcoólicas", aliq: "Variável", icone: "🍺" },
                  { item: "Bebidas Açucaradas", aliq: "A definir", icone: "🥤" },
                  { item: "Veículos Poluentes", aliq: "A definir", icone: "🚗" },
                ].map(s => (
                  <Card key={s.item} className="border-amber-500/20">
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-2xl mb-1">{s.icone}</p>
                      <p className="text-sm font-medium">{s.item}</p>
                      <p className="text-xs text-amber-600 font-mono mt-1">{s.aliq}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CRONOGRAMA ── */}
        <TabsContent value="cronograma" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays size={16} /> Cronograma de Transição 2026–2033
                </CardTitle>
                <Badge variant="outline" className="font-mono">{progressoReforma.toFixed(0)}% concluído</Badge>
              </div>
              <Progress value={progressoReforma} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {cronograma.map((item, i) => {
                    const isAtual = item.ano === anoAtual;
                    const isPast = item.ano < anoAtual;
                    return (
                      <div key={item.ano} className="relative flex items-start gap-4 pl-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold z-10 shrink-0
                          ${isPast ? "bg-green-100 text-green-700 border-2 border-green-500" :
                            isAtual ? "bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/20" :
                            "bg-muted text-muted-foreground border-2 border-border"}`}>
                          {item.ano.toString().slice(-2)}
                        </div>
                        <div className={`flex-1 rounded-lg p-3 ${isAtual ? "bg-primary/5 border border-primary/20" : "bg-muted/30"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{item.ano} — {item.fase}</p>
                            {isAtual && <Badge className="text-xs">Atual</Badge>}
                            {isPast && <Badge variant="outline" className="text-xs text-green-600">Concluído</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.descricao}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
