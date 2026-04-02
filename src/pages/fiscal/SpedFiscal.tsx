import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthPicker } from "@/components/ui/month-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Settings, Plus, Trash2, Copy, EyeOff, ShieldCheck, AlertTriangle, AlertCircle, Info, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { gerarArquivoSpedFiscal, downloadSpedFiscal, SpedFiscalConfig, BLOCOS_FISCAL } from "@/lib/sped/fiscalGenerator";
import { validarArquivoSped, ResultadoValidacao, exportarRelatorioValidacaoTxt } from "@/lib/sped/validator";

interface LayoutVersion {
  id: string;
  codigo: string;
  descricao: string;
  vigenciaInicio: string;
  vigenciaFim: string;
  ativo: boolean;
}

const defaultLayouts: LayoutVersion[] = [
  { id: "1", codigo: "018", descricao: "Layout 018 - Vigente desde 01/2024", vigenciaInicio: "2024-01", vigenciaFim: "", ativo: true },
  { id: "2", codigo: "017", descricao: "Layout 017 - Vigente 01/2023 a 12/2023", vigenciaInicio: "2023-01", vigenciaFim: "2023-12", ativo: false },
  { id: "3", codigo: "016", descricao: "Layout 016 - Vigente 01/2022 a 12/2022", vigenciaInicio: "2022-01", vigenciaFim: "2022-12", ativo: false },
];

function getColorForLine(line: string): string {
  const match = line.match(/^\|(\w)/);
  if (!match) return "";
  const bloco = match[1];
  const map: Record<string, string> = {
    "0": "text-blue-500 dark:text-blue-400",
    "C": "text-green-600 dark:text-green-400",
    "D": "text-cyan-600 dark:text-cyan-400",
    "E": "text-amber-600 dark:text-amber-400",
    "G": "text-indigo-600 dark:text-indigo-400",
    "H": "text-orange-600 dark:text-orange-400",
    "K": "text-pink-600 dark:text-pink-400",
    "1": "text-purple-600 dark:text-purple-400",
    "9": "text-red-500 dark:text-red-400",
  };
  return map[bloco] || "";
}

export default function SpedFiscal() {
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [finalidade, setFinalidade] = useState("0");
  const [perfil, setPerfil] = useState("A");
  const [conteudoArquivo, setConteudoArquivo] = useState("");
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [conteudoEditado, setConteudoEditado] = useState("");
  const [layouts, setLayouts] = useState<LayoutVersion[]>(() => {
    try {
      const stored = localStorage.getItem("sped-fiscal-layouts");
      return stored ? JSON.parse(stored) : defaultLayouts;
    } catch { return defaultLayouts; }
  });
  const [novoLayout, setNovoLayout] = useState({ codigo: "", descricao: "", vigenciaInicio: "", vigenciaFim: "" });
  const [blocosAtivos, setBlocosAtivos] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BLOCOS_FISCAL.map(b => [b.id, true]))
  );

  const layoutAtivo = layouts.find(l => l.ativo);

  const salvarLayouts = (updated: LayoutVersion[]) => {
    setLayouts(updated);
    localStorage.setItem("sped-fiscal-layouts", JSON.stringify(updated));
  };

  const adicionarLayout = () => {
    if (!novoLayout.codigo || !novoLayout.descricao || !novoLayout.vigenciaInicio) {
      toast.error("Preencha código, descrição e vigência inicial");
      return;
    }
    salvarLayouts([{ id: crypto.randomUUID(), ...novoLayout, ativo: false }, ...layouts]);
    setNovoLayout({ codigo: "", descricao: "", vigenciaInicio: "", vigenciaFim: "" });
    toast.success("Layout adicionado");
  };

  const ativarLayout = (id: string) => {
    salvarLayouts(layouts.map(l => ({ ...l, ativo: l.id === id })));
    toast.success("Layout ativado");
  };

  const removerLayout = (id: string) => {
    if (layouts.find(l => l.id === id)?.ativo) { toast.error("Não é possível remover o layout ativo"); return; }
    salvarLayouts(layouts.filter(l => l.id !== id));
    toast.success("Layout removido");
  };

  const getEmpresa = () => {
    try {
      const stored = localStorage.getItem("empresas");
      if (stored) {
        const empresas = JSON.parse(stored);
        const sel = empresas.find((e: any) => e.selecionada) || empresas[0];
        if (sel) {
          return {
            cnpj: sel.cnpj || "", cpf: "", razaoSocial: sel.razaoSocial || "",
            fantasia: sel.nomeFantasia || "", inscricaoEstadual: sel.inscricaoEstadual || "",
            inscricaoMunicipal: sel.inscricaoMunicipal || "", cep: sel.cep || "",
            logradouro: sel.endereco || "", numero: "0", complemento: "",
            bairro: sel.bairro || "", codigoCidade: sel.codigoCidade || "3550308",
            cidade: sel.cidade || "", uf: sel.uf || "", telefone: sel.telefone || "",
            email: sel.email || "", codAtividade: "4712100",
            regime: sel.regime === "Simples Nacional" ? "3" : sel.regime === "Lucro Real" ? "1" : "2",
          };
        }
      }
    } catch { /* fallback */ }
    return {
      cnpj: "00000000000000", cpf: "", razaoSocial: "EMPRESA NAO CADASTRADA",
      fantasia: "EMPRESA", inscricaoEstadual: "ISENTO", inscricaoMunicipal: "",
      cep: "00000000", logradouro: "", numero: "0", complemento: "",
      bairro: "", codigoCidade: "3550308", cidade: "SAO PAULO", uf: "SP",
      telefone: "0000000000", email: "", codAtividade: "4712100", regime: "3",
    };
  };

  const gerarArquivo = () => {
    if (!periodoInicio || !periodoFim) { toast.error("Informe o período"); return; }
    if (!layoutAtivo) { toast.error("Nenhum layout ativo definido"); return; }

    const config: SpedFiscalConfig = {
      empresa: getEmpresa(),
      periodoInicio,
      periodoFim,
      finalidade,
      perfil,
      layoutCodigo: layoutAtivo.codigo,
      atividade: "1",
      blocosAtivos,
    };

    const conteudo = gerarArquivoSpedFiscal(config);
    setConteudoArquivo(conteudo);

    const result = validarArquivoSped(conteudo, "fiscal");
    setValidacao(result);

    if (result.totalErros > 0) {
      toast.warning(`Arquivo gerado com ${result.totalErros} erro(s) — verifique a validação`);
    } else if (result.totalAvisos > 0) {
      toast.success(`Arquivo gerado com ${result.totalAvisos} aviso(s)`);
    } else {
      toast.success("Arquivo SPED Fiscal gerado sem inconsistências!");
    }
  };

  const baixarArquivo = () => {
    if (!conteudoArquivo) return;
    downloadSpedFiscal(conteudoArquivo, periodoInicio);
    toast.success("Download iniciado");
  };

  const copiarConteudo = () => {
    navigator.clipboard.writeText(conteudoArquivo);
    toast.success("Conteúdo copiado");
  };

  const revalidar = () => {
    const texto = modoEdicao ? conteudoEditado : conteudoArquivo;
    if (modoEdicao) setConteudoArquivo(conteudoEditado);
    const result = validarArquivoSped(texto, "fiscal");
    setValidacao(result);
    setModoEdicao(false);
    if (result.totalErros > 0) toast.warning(`${result.totalErros} erro(s) encontrado(s)`);
    else toast.success("Validação concluída sem erros");
  };

  const toggleEdicao = () => {
    if (!modoEdicao) setConteudoEditado(conteudoArquivo);
    setModoEdicao(!modoEdicao);
  };

  const linhasArquivo = conteudoArquivo ? conteudoArquivo.split("\r\n").filter(l => l.length > 0) : [];

  // Conta blocos
  const contaBlocos = () => {
    const blocos: Record<string, number> = {};
    for (const l of linhasArquivo) {
      const m = l.match(/^\|(\w)/);
      if (m) blocos[m[1]] = (blocos[m[1]] || 0) + 1;
    }
    return blocos;
  };

  return (
    <div className="page-container">
      <PageHeader title="SPED Fiscal (EFD ICMS/IPI)" description="Geração do arquivo SPED Fiscal com controle de versão de layout" />

      <Tabs defaultValue="gerar">
        <TabsList>
          <TabsTrigger value="gerar"><FileText className="w-4 h-4 mr-1" /> Gerar Arquivo</TabsTrigger>
          <TabsTrigger value="layouts"><Settings className="w-4 h-4 mr-1" /> Layouts / Versões</TabsTrigger>
        </TabsList>

        <TabsContent value="gerar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerar SPED Fiscal</CardTitle>
              <CardDescription>Layout ativo: {layoutAtivo ? `${layoutAtivo.codigo} - ${layoutAtivo.descricao}` : "Nenhum"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Período Início</Label>
                  <MonthPicker value={periodoInicio} onChange={setPeriodoInicio} placeholder="Mês inicial" />
                </div>
                <div className="space-y-2">
                  <Label>Período Fim</Label>
                  <MonthPicker value={periodoFim} onChange={setPeriodoFim} placeholder="Mês final" />
                </div>
                <div className="space-y-2">
                  <Label>Finalidade</Label>
                  <Select value={finalidade} onValueChange={setFinalidade}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Remessa original</SelectItem>
                      <SelectItem value="1">1 - Arquivo substituto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={perfil} onValueChange={setPerfil}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Perfil A</SelectItem>
                      <SelectItem value="B">B - Perfil B</SelectItem>
                      <SelectItem value="C">C - Perfil C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Blocos a incluir</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-3 border border-border rounded-lg bg-muted/30">
                  {BLOCOS_FISCAL.map(bloco => (
                    <label key={bloco.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={blocosAtivos[bloco.id] !== false}
                        onCheckedChange={(checked) =>
                          setBlocosAtivos(prev => ({ ...prev, [bloco.id]: !!checked }))
                        }
                      />
                      <span className="leading-tight">
                        <span className="font-mono font-bold">{bloco.id}</span>
                        <span className="text-muted-foreground text-xs block">{bloco.descricao}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={gerarArquivo} className="gap-2">
                  <FileText className="w-4 h-4" /> Gerar Arquivo
                </Button>
                {conteudoArquivo && (
                  <>
                    <Button onClick={baixarArquivo} variant="outline" className="gap-2">
                      <Download className="w-4 h-4" /> Baixar TXT
                    </Button>
                    <Button onClick={copiarConteudo} variant="outline" className="gap-2">
                      <Copy className="w-4 h-4" /> Copiar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {conteudoArquivo && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Prévia do Arquivo SPED Fiscal</CardTitle>
                    <CardDescription>{linhasArquivo.length} registros gerados • Layout {layoutAtivo?.codigo}</CardDescription>
                  </div>
                   <Button onClick={() => setConteudoArquivo("")} variant="ghost" size="sm" className="gap-1">
                    <EyeOff className="w-4 h-4" /> Ocultar
                  </Button>
                  <Button onClick={toggleEdicao} variant={modoEdicao ? "default" : "outline"} size="sm" className="gap-1">
                    <Pencil className="w-4 h-4" /> {modoEdicao ? "Editando" : "Editar"}
                  </Button>
                  {modoEdicao && (
                    <Button onClick={revalidar} variant="outline" size="sm" className="gap-1">
                      <RefreshCw className="w-4 h-4" /> Revalidar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {modoEdicao ? (
                    <textarea
                      className="w-full bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono max-h-[500px] min-h-[300px] overflow-auto leading-6 whitespace-pre resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                      value={conteudoEditado}
                      onChange={e => setConteudoEditado(e.target.value)}
                    />
                  ) : (
                    <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto leading-6 whitespace-pre">
                    {linhasArquivo.map((linha, idx) => (
                      <div key={idx} className="flex hover:bg-accent/30 transition-colors">
                        <span className="text-muted-foreground w-8 text-right mr-3 select-none shrink-0">{idx + 1}</span>
                        <span className={getColorForLine(linha)}>{linha}</span>
                      </div>
                    ))}
                  </pre>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {Object.entries(contaBlocos()).sort().map(([bloco, count]) => (
                      <span key={bloco} className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded ${
                          bloco === "0" ? "bg-blue-500" :
                          bloco === "C" ? "bg-green-600" :
                          bloco === "D" ? "bg-cyan-600" :
                          bloco === "E" ? "bg-amber-600" :
                          bloco === "G" ? "bg-indigo-600" :
                          bloco === "H" ? "bg-orange-600" :
                          bloco === "K" ? "bg-pink-600" :
                          bloco === "1" ? "bg-purple-600" :
                          bloco === "9" ? "bg-red-500" : "bg-muted"
                        }`} />
                        Bloco {bloco} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {conteudoArquivo && validacao && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${validacao.valido ? "text-green-500" : "text-destructive"}`} />
                    <CardTitle className="text-base">Validação do Arquivo</CardTitle>
                  </div>
                  <div className="flex gap-2 items-center">
                    {validacao.totalErros > 0 && <Badge variant="destructive">{validacao.totalErros} erro(s)</Badge>}
                    {validacao.totalAvisos > 0 && <Badge className="bg-amber-500 text-white">{validacao.totalAvisos} aviso(s)</Badge>}
                    <Badge variant="secondary">{validacao.totalInfo} info</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        const empresa = getEmpresa();
                        exportarRelatorioValidacaoTxt(validacao, "fiscal", empresa.razaoSocial, `${periodoInicio} a ${periodoFim}`);
                        toast.success("Relatório de validação exportado");
                      }}
                    >
                      <Download className="w-4 h-4" /> Exportar TXT
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {validacao.itens.map((item, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-2 rounded text-sm ${
                      item.severidade === "erro" ? "bg-destructive/10 text-destructive" :
                      item.severidade === "aviso" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                      "bg-muted/50 text-muted-foreground"
                    }`}>
                      {item.severidade === "erro" ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
                       item.severidade === "aviso" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                       <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                      <span className="flex-1">
                        {item.linha && <span className="font-mono text-xs mr-1">[L{item.linha}]</span>}
                        {item.registro && <span className="font-mono font-bold text-xs mr-1">{item.registro}:</span>}
                        {item.mensagem}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="layouts">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Layouts do SPED Fiscal</CardTitle>
              <CardDescription>Atualize o layout conforme as mudanças anuais do Guia Prático da EFD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end p-4 border border-border rounded-lg bg-muted/30">
                <div className="space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input placeholder="Ex: 019" value={novoLayout.codigo} onChange={e => setNovoLayout(p => ({ ...p, codigo: e.target.value }))} />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input placeholder="Layout 019 - Vigente desde..." value={novoLayout.descricao} onChange={e => setNovoLayout(p => ({ ...p, descricao: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vigência Início</Label>
                  <MonthPicker value={novoLayout.vigenciaInicio} onChange={v => setNovoLayout(p => ({ ...p, vigenciaInicio: v }))} placeholder="Mês" />
                </div>
                <Button onClick={adicionarLayout} className="gap-2"><Plus className="w-4 h-4" /> Adicionar</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {layouts.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono font-bold">{l.codigo}</TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell>{l.vigenciaInicio}{l.vigenciaFim ? ` a ${l.vigenciaFim}` : " em diante"}</TableCell>
                      <TableCell>
                        {l.ativo ? <Badge className="bg-primary text-primary-foreground">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!l.ativo && <Button size="sm" variant="outline" onClick={() => ativarLayout(l.id)}>Ativar</Button>}
                        {!l.ativo && <Button size="sm" variant="ghost" onClick={() => removerLayout(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
