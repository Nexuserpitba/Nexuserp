import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { FileText, Shield, Server, Printer, Building2, Settings, CreditCard, DollarSign, Scale, QrCode, Lock, ArrowLeft, Volume2 } from "lucide-react";
import { playThermalPrinterSound } from "@/lib/thermalPrinterSound";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";

interface NFCeConfig {
  ambiente: string;
  serie: string;
  proximoNumero: string;
  cscId: string;
  cscToken: string;
  ufEmitente: string;
  regimeTributario: string;
  certificadoTipo: string;
  certificadoSenha: string;
  certificadoValidade: string;
  inscricaoEstadual: string;
  cnpjEmitente: string;
  razaoSocial: string;
  nomeFantasia: string;
  enderecoLogradouro: string;
  enderecoNumero: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoCep: string;
  imprimirDanfe: boolean;
  modeloImpressora: string;
  larguraPapel: string;
  contingenciaAtiva: boolean;
  contingenciaTipo: string;
  emailContabilidade: string;
  numeroCaixa: string;
  certificadoArquivoNome: string;
  exigirTurno: boolean;
  imprimirUltimosMovimentos: boolean;
  pixChaveTipo: string;
  pixChaveValor: string;
  pixNomeBeneficiario: string;
  pixCidade: string;
  pixBanco: string;
  senhaGerencial: string;
  permitirCrediarioPromocao: boolean;
  somImpressora: boolean;
  somVolume: number;
  permitirAlterarQuantidade: boolean;
  permitirAlterarPreco: boolean;
  exigirLiberacaoQuantidade: boolean;
  exigirLiberacaoPreco: boolean;
}

const defaultConfig: NFCeConfig = {
  ambiente: "2",
  serie: "1",
  proximoNumero: "1",
  cscId: "",
  cscToken: "",
  ufEmitente: "SP",
  regimeTributario: "1",
  certificadoTipo: "A1",
  certificadoSenha: "",
  certificadoValidade: "",
  inscricaoEstadual: "",
  cnpjEmitente: "",
  razaoSocial: "",
  nomeFantasia: "",
  enderecoLogradouro: "",
  enderecoNumero: "",
  enderecoBairro: "",
  enderecoCidade: "",
  enderecoCep: "",
  imprimirDanfe: true,
  modeloImpressora: "termica80",
  larguraPapel: "80",
  contingenciaAtiva: false,
  contingenciaTipo: "offline",
  emailContabilidade: "",
  numeroCaixa: "001",
  certificadoArquivoNome: "",
  exigirTurno: true,
  imprimirUltimosMovimentos: true,
  pixChaveTipo: "cpf",
  pixChaveValor: "",
  pixNomeBeneficiario: "",
  pixCidade: "",
  pixBanco: "bb",
  senhaGerencial: "1234",
  permitirCrediarioPromocao: false,
  somImpressora: true,
  somVolume: 50,
  permitirAlterarQuantidade: true,
  permitirAlterarPreco: false,
  exigirLiberacaoQuantidade: false,
  exigirLiberacaoPreco: true,
};

const UFs = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function ConfigNFCe() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<NFCeConfig>(() => {
    try { const s = localStorage.getItem("nfce-config"); return s ? JSON.parse(s) : defaultConfig; } catch { return defaultConfig; }
  });
  const [tab, setTab] = useState("emitente");

  const empresa = useMemo(() => {
    try {
      const s = localStorage.getItem("empresas");
      if (!s) return null;
      const empresas = JSON.parse(s);
      return empresas.find((e: any) => e.selecionada) || empresas[0] || null;
    } catch { return null; }
  }, []);

  const update = (field: keyof NFCeConfig, value: string | boolean | number) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    localStorage.setItem("nfce-config", JSON.stringify(updated));
  };

  const salvar = () => {
    toast.success("Configuração NFC-e salva com sucesso!");
    navigate("/pdv");
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuração NFC-e" description="Nota Fiscal de Consumidor Eletrônica — Modelo 65 (conforme legislação vigente)" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="emitente" className="gap-2"><FileText size={14} /> Emitente</TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2"><Shield size={14} /> Fiscal / CSC</TabsTrigger>
          <TabsTrigger value="certificado" className="gap-2"><Server size={14} /> Certificado Digital</TabsTrigger>
          <TabsTrigger value="impressao" className="gap-2"><Printer size={14} /> Impressão</TabsTrigger>
          <TabsTrigger value="operacao" className="gap-2"><Settings size={14} /> Operação</TabsTrigger>
        </TabsList>

        <TabsContent value="emitente" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Emitente</CardTitle>
              <CardDescription>Informações carregadas automaticamente do cadastro de empresas (empresa selecionada)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {empresa ? (
                <>
                  <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3 mb-2">
                    <Building2 className="text-primary mt-0.5" size={20} />
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{empresa.nomeFantasia || empresa.razaoSocial}</p>
                      <p className="text-muted-foreground text-xs">Empresa selecionada no cadastro. Para alterar os dados, acesse Cadastros → Empresas.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={empresa.cnpj || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Inscrição Estadual</Label>
                      <Input value={empresa.inscricaoEstadual || ""} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Razão Social</Label>
                      <Input value={empresa.razaoSocial || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Fantasia</Label>
                      <Input value={empresa.nomeFantasia || ""} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Endereço</Label>
                      <Input value={empresa.endereco || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input value={empresa.bairro || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input value={empresa.cep || ""} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={empresa.cidade || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input value={empresa.uf || ""} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Regime Tributário</Label>
                      <Input value={empresa.regime || ""} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Building2 size={40} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">Nenhuma empresa cadastrada</p>
                  <p className="text-muted-foreground text-sm mt-1">Cadastre uma empresa em Cadastros → Empresas para que os dados do emitente sejam exibidos aqui.</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/cadastros/empresas")}>Ir para Cadastro de Empresas</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Fiscais</CardTitle>
              <CardDescription>CSC, ambiente, série e numeração da NFC-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select value={config.ambiente} onValueChange={v => update("ambiente", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Produção</SelectItem>
                      <SelectItem value="2">2 - Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Série</Label>
                  <Input value={config.serie} onChange={e => update("serie", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Próximo Número</Label>
                  <Input value={config.proximoNumero} onChange={e => update("proximoNumero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nº do Caixa (PDV)</Label>
                  <Input value={config.numeroCaixa} onChange={e => update("numeroCaixa", e.target.value)} placeholder="001" />
                  <p className="text-xs text-muted-foreground">Identificação deste ponto de venda</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CSC - ID do Token</Label>
                  <Input value={config.cscId} onChange={e => update("cscId", e.target.value)} placeholder="000001" />
                  <p className="text-xs text-muted-foreground">Código de Segurança do Contribuinte (obtido na SEFAZ)</p>
                </div>
                <div className="space-y-2">
                  <Label>CSC - Token</Label>
                  <Input value={config.cscToken} onChange={e => update("cscToken", e.target.value)} type="password" placeholder="Token fornecido pela SEFAZ" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Regime Tributário</Label>
                <Select value={config.regimeTributario} onValueChange={v => update("regimeTributario", v)}>
                  <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Simples Nacional</SelectItem>
                    <SelectItem value="2">2 - Simples Nacional - Excesso Sublimite</SelectItem>
                    <SelectItem value="3">3 - Regime Normal (Lucro Presumido/Real)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Contingência</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={config.contingenciaAtiva} onCheckedChange={v => update("contingenciaAtiva", v)} />
                  <Label>Habilitar modo contingência</Label>
                </div>
                {config.contingenciaAtiva && (
                  <Select value={config.contingenciaTipo} onValueChange={v => update("contingenciaTipo", v)}>
                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offline">Contingência Off-line (NFC-e)</SelectItem>
                      <SelectItem value="svcan">SVCAN</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>E-mail da Contabilidade</Label>
                <Input value={config.emailContabilidade} onChange={e => update("emailContabilidade", e.target.value)} placeholder="contabilidade@empresa.com" type="email" className="max-w-md" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificado" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital</CardTitle>
              <CardDescription>Certificado digital e-CNPJ para assinatura das NFC-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Certificado</Label>
                  <Select value={config.certificadoTipo} onValueChange={v => update("certificadoTipo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (arquivo .pfx)</SelectItem>
                      <SelectItem value="A3">A3 (token/cartão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input value={config.certificadoSenha} onChange={e => update("certificadoSenha", e.target.value)} type="password" />
                </div>
              </div>
              {config.certificadoTipo === "A1" && (
                <div className="space-y-2">
                  <Label>Arquivo do Certificado (.pfx)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    {config.certificadoArquivoNome ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={28} className="text-primary" />
                        <p className="text-sm font-medium text-foreground">{config.certificadoArquivoNome}</p>
                        <p className="text-xs text-muted-foreground">Arquivo carregado com sucesso</p>
                        <Button variant="outline" size="sm" onClick={() => { update("certificadoArquivoNome", ""); toast.info("Arquivo removido"); }}>Remover</Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-sm">Arraste o arquivo .pfx aqui ou clique para selecionar</p>
                        <label>
                          <input
                            type="file"
                            accept=".pfx,.p12"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                update("certificadoArquivoNome", file.name);
                                toast.success(`Certificado "${file.name}" carregado`);
                              }
                              e.target.value = "";
                            }}
                          />
                          <Button variant="outline" className="mt-3 pointer-events-none">Selecionar Arquivo</Button>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Validade do Certificado</Label>
                <Input value={config.certificadoValidade} onChange={e => update("certificadoValidade", e.target.value)} placeholder="dd/mm/aaaa" className="max-w-xs" />
              </div>
              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Shield className="text-primary mt-0.5" size={20} />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Nota sobre Certificado Digital</p>
                  <p>O certificado digital e-CNPJ é obrigatório para emissão de NFC-e. Ele deve estar válido e vinculado ao CNPJ do emitente. Renove antes do vencimento para evitar interrupções.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impressao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Impressão DANFE NFC-e</CardTitle>
              <CardDescription>Configuração da impressão do documento auxiliar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Switch checked={config.imprimirDanfe} onCheckedChange={v => update("imprimirDanfe", v)} />
                <Label>Imprimir DANFE automaticamente após emissão</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={config.somImpressora} onCheckedChange={v => update("somImpressora", v)} />
                <Label>Som de impressora térmica ao exibir DANFE</Label>
                <Button variant="outline" size="sm" onClick={() => playThermalPrinterSound(1200, config.somVolume)} className="ml-2 gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> Ouvir
                </Button>
              </div>
              {config.somImpressora && (
                <div className="flex items-center gap-3 pl-10">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Slider
                    value={[config.somVolume]}
                    onValueChange={([v]) => update("somVolume", v)}
                    min={5}
                    max={100}
                    step={5}
                    className="w-48"
                  />
                  <span className="text-sm text-muted-foreground w-10">{config.somVolume}%</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo da Impressora</Label>
                  <Select value={config.modeloImpressora} onValueChange={v => update("modeloImpressora", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="termica80">Térmica 80mm</SelectItem>
                      <SelectItem value="termica58">Térmica 58mm</SelectItem>
                      <SelectItem value="a4">Impressora A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Largura do Papel (mm)</Label>
                  <Select value={config.larguraPapel} onValueChange={v => update("larguraPapel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58">58mm</SelectItem>
                      <SelectItem value="80">80mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Operação do PDV</CardTitle>
              <CardDescription>Configurações de funcionamento do caixa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Exigir abertura de turno para vender</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o operador precisa abrir um turno antes de registrar vendas. Desativado permite vender sem turno.
                  </p>
                </div>
                <Switch
                  checked={config.exigirTurno}
                  onCheckedChange={v => update("exigirTurno", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Imprimir últimos movimentos no fechamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, a impressão do fechamento de caixa incluirá a lista dos últimos movimentos (vendas, sangrias e suprimentos).
                  </p>
                </div>
                <Switch
                  checked={config.imprimirUltimosMovimentos}
                  onCheckedChange={v => update("imprimirUltimosMovimentos", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Permitir alterar quantidade no cupom</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o operador pode editar a quantidade dos itens diretamente no cupom de venda.
                  </p>
                </div>
                <Switch
                  checked={config.permitirAlterarQuantidade}
                  onCheckedChange={v => update("permitirAlterarQuantidade", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Permitir alterar preço no PDV</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, o operador pode alterar o preço unitário dos itens durante a venda.
                  </p>
                </div>
                <Switch
                  checked={config.permitirAlterarPreco}
                  onCheckedChange={v => update("permitirAlterarPreco", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Exigir liberação gerencial para alterar quantidade</Label>
                  <p className="text-sm text-muted-foreground">
                    Operadores precisarão de senha de gerente/admin para alterar a quantidade dos itens no PDV.
                  </p>
                </div>
                <Switch
                  checked={config.exigirLiberacaoQuantidade}
                  onCheckedChange={v => update("exigirLiberacaoQuantidade", v)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label className="font-medium">Exigir liberação gerencial para alterar preço</Label>
                  <p className="text-sm text-muted-foreground">
                    Operadores precisarão de senha de gerente/admin para alterar o preço dos itens no PDV.
                  </p>
                </div>
                <Switch
                  checked={config.exigirLiberacaoPreco}
                  onCheckedChange={v => update("exigirLiberacaoPreco", v)}
                />
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-primary" />
                  <Label className="font-medium">Senha Gerencial</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Senha utilizada para liberação gerencial de vendas em crediário acima do limite de crédito do cliente.
                </p>
                <Input
                  value={config.senhaGerencial}
                  onChange={e => update("senhaGerencial", e.target.value)}
                  type="password"
                  placeholder="Digite a senha gerencial"
                  className="max-w-xs font-mono"
                />
                <p className="text-xs text-muted-foreground">Senha padrão: 1234</p>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-primary" />
                      <Label className="font-medium">Crediário em Promoção</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permitir venda em crediário de produtos que estão em promoção.
                    </p>
                  </div>
                  <Switch
                    checked={config.permitirCrediarioPromocao}
                    onCheckedChange={v => update("permitirCrediarioPromocao", v)}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode size={18} className="text-primary" />
                  <Label className="font-medium text-base">Operação PIX</Label>
                </div>

                {/* Pix Recebedor - empresa ativa */}
                <fieldset className="border rounded-lg p-3 space-y-2">
                  <legend className="text-xs font-semibold px-2 text-muted-foreground">Pix Recebedor</legend>
                  <div className="flex items-center gap-2">
                    <Input
                      value={empresa ? `${empresa.nomeFantasia || empresa.razaoSocial} — CNPJ: ${empresa.cnpj}` : "Nenhuma empresa ativa"}
                      readOnly
                      className="bg-primary/10 font-semibold text-foreground"
                    />
                    <Button variant="outline" size="sm" onClick={() => navigate("/cadastros/empresas")} title="Selecionar empresa">
                      ...
                    </Button>
                  </div>
                </fieldset>

                {/* PSP + Proxy side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <fieldset className="border rounded-lg p-3 space-y-2">
                    <legend className="text-xs font-semibold px-2 text-muted-foreground">PSP</legend>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={empresa?.pixPsp?.psp || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Input value={empresa?.pixPsp?.psp ? "API PIX" : ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ambiente</Label>
                      <Input value={empresa?.pixPsp?.ambiente === "producao" ? "Produção" : empresa?.pixPsp?.ambiente === "homologacao" ? "Homologação" : ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Timeout</Label>
                      <Input value={empresa?.pixPsp?.timeoutMs ? `${empresa.pixPsp.timeoutMs} ms` : ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                  </fieldset>

                  <fieldset className="border rounded-lg p-3 space-y-2">
                    <legend className="text-xs font-semibold px-2 text-muted-foreground">Proxy</legend>
                    <div className="space-y-1">
                      <Label className="text-xs">Host</Label>
                      <Input value={empresa?.pixPsp?.proxyHost || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Porta</Label>
                      <Input value={empresa?.pixPsp?.proxyPorta || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Usuário</Label>
                      <Input value={empresa?.pixPsp?.proxyUsuario || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Senha</Label>
                      <Input value={empresa?.pixPsp?.proxySenha ? "••••••••" : ""} readOnly className="bg-muted/50 h-8 text-sm" type="password" />
                    </div>
                  </fieldset>
                </div>

                {/* Recebedor + Configurações side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <fieldset className="border rounded-lg p-3 space-y-2">
                    <legend className="text-xs font-semibold px-2 text-muted-foreground">Recebedor</legend>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input value={empresa?.pixPsp?.recebedorNome || empresa?.razaoSocial || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cidade</Label>
                      <Input value={empresa?.pixPsp?.recebedorCidade || empresa?.cidade || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">CEP</Label>
                        <Input value={empresa?.pixPsp?.recebedorCep || empresa?.cep || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">UF</Label>
                        <Input value={empresa?.pixPsp?.recebedorUf || empresa?.uf || ""} readOnly className="bg-muted/50 h-8 text-sm" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">MCC</Label>
                      <Input value={empresa?.pixPsp?.recebedorMcc || "0"} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                  </fieldset>

                  <fieldset className="border rounded-lg p-3 space-y-2">
                    <legend className="text-xs font-semibold px-2 text-muted-foreground">Configurações</legend>
                    <div className="space-y-1">
                      <Label className="text-xs">Expiração da Cobrança (s)</Label>
                      <Input value={empresa?.pixPsp?.expiracaoCobranca ?? 86400} readOnly className="bg-muted/50 h-8 text-sm" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-xs">Permitir Estorno na Finalizadora</Label>
                      <Switch checked={empresa?.pixPsp?.permitirEstorno ?? false} disabled className="pointer-events-none" />
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-xs">Imprimir Comprovante no PDV</Label>
                      <Switch checked={empresa?.pixPsp?.imprimirComprovante ?? true} disabled className="pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-2">
                      Para alterar, acesse Cadastros → Empresas → aba PIX / PSP
                    </p>
                  </fieldset>
                </div>

                {!empresa?.pixPsp?.psp && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <QrCode size={16} className="mt-0.5 shrink-0" />
                    <span>PIX/PSP não configurado para esta empresa. Acesse <strong>Cadastros → Empresas → PIX / PSP</strong> para configurar o provedor de pagamento.</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acesso rápido — Configurações do PDV</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/configuracoes/formas-pagamento")}>
                    <DollarSign size={18} className="text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Formas de Pagamento</p>
                      <p className="text-xs text-muted-foreground">Dinheiro, cartão, PIX...</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/configuracoes/tef")}>
                    <CreditCard size={18} className="text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">TEF</p>
                      <p className="text-xs text-muted-foreground">Transferência eletrônica</p>
                    </div>
                  </Button>
                  <Button variant="outline" className="justify-start gap-2 h-auto py-3" onClick={() => navigate("/configuracoes/balanca")}>
                    <Scale size={18} className="text-primary" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Balança</p>
                      <p className="text-xs text-muted-foreground">Integração com balança</p>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button onClick={salvar}>Salvar Configurações</Button>
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
