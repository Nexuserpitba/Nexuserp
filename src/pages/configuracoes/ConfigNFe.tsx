import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileText, Shield, Building2, Truck, ArrowLeft } from "lucide-react";

interface NFeConfig {
  // Emitente
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  crt: string;
  // Emissão
  serie: string;
  ultimoNumero: string;
  ambiente: string;
  tipoEmissao: string;
  formatoDanfe: string;
  // Certificado
  tipoCertificado: string;
  senhaCertificado: string;
  validadeCertificado: string;
  // Transporte
  modalidadeFrete: string;
  // Opções
  enviarEmailAuto: boolean;
  incluirIBPT: boolean;
  permitirContingencia: boolean;
  gerarPDF: boolean;
}

const defaultConfig: NFeConfig = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  inscricaoEstadual: "",
  inscricaoMunicipal: "",
  crt: "1",
  serie: "1",
  ultimoNumero: "0",
  ambiente: "2",
  tipoEmissao: "1",
  formatoDanfe: "retrato",
  tipoCertificado: "A1",
  senhaCertificado: "",
  validadeCertificado: "",
  modalidadeFrete: "9",
  enviarEmailAuto: true,
  incluirIBPT: true,
  permitirContingencia: true,
  gerarPDF: true,
};

export default function ConfigNFe() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<NFeConfig>(() => {
    try { const s = localStorage.getItem("nfe-config"); return s ? JSON.parse(s) : defaultConfig; } catch { return defaultConfig; }
  });
  const [tab, setTab] = useState("emitente");

  const update = (field: keyof NFeConfig, value: string | boolean) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    localStorage.setItem("nfe-config", JSON.stringify(updated));
  };

  const salvar = () => { toast.success("Configuração NF-e salva com sucesso!"); navigate("/pdv"); };

  return (
    <div className="page-container">
      <PageHeader title="Configuração NF-e" description="Configure os parâmetros para emissão de Nota Fiscal Eletrônica (modelo 55)" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="emitente" className="gap-2"><Building2 size={14} /> Emitente</TabsTrigger>
          <TabsTrigger value="emissao" className="gap-2"><FileText size={14} /> Emissão</TabsTrigger>
          <TabsTrigger value="certificado" className="gap-2"><Shield size={14} /> Certificado</TabsTrigger>
          <TabsTrigger value="transporte" className="gap-2"><Truck size={14} /> Transporte</TabsTrigger>
        </TabsList>

        <TabsContent value="emitente" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Emitente</CardTitle>
              <CardDescription>Informações da empresa emissora da NF-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input value={config.razaoSocial} onChange={e => update("razaoSocial", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={config.nomeFantasia} onChange={e => update("nomeFantasia", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={config.cnpj} onChange={e => update("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={config.inscricaoEstadual} onChange={e => update("inscricaoEstadual", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Municipal</Label>
                  <Input value={config.inscricaoMunicipal} onChange={e => update("inscricaoMunicipal", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Regime Tributário (CRT)</Label>
                <Select value={config.crt} onValueChange={v => update("crt", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Simples Nacional</SelectItem>
                    <SelectItem value="2">2 - Simples Nacional (excesso)</SelectItem>
                    <SelectItem value="3">3 - Regime Normal</SelectItem>
                    <SelectItem value="4">4 - MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emissao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Parâmetros de Emissão</CardTitle>
              <CardDescription>Série, numeração e ambiente de emissão NF-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Série</Label>
                  <Input value={config.serie} onChange={e => update("serie", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Último Número Emitido</Label>
                  <Input value={config.ultimoNumero} onChange={e => update("ultimoNumero", e.target.value)} />
                </div>
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Emissão</Label>
                  <Select value={config.tipoEmissao} onValueChange={v => update("tipoEmissao", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Normal</SelectItem>
                      <SelectItem value="2">2 - Contingência FS-IA</SelectItem>
                      <SelectItem value="3">3 - Contingência SCAN</SelectItem>
                      <SelectItem value="6">6 - Contingência SVC-AN</SelectItem>
                      <SelectItem value="7">7 - Contingência SVC-RS</SelectItem>
                      <SelectItem value="9">9 - Contingência off-line NFC-e</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato DANFE</Label>
                  <Select value={config.formatoDanfe} onValueChange={v => update("formatoDanfe", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retrato">Retrato (padrão)</SelectItem>
                      <SelectItem value="paisagem">Paisagem</SelectItem>
                      <SelectItem value="simplificado">Simplificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Opções</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={config.enviarEmailAuto} onCheckedChange={v => update("enviarEmailAuto", v)} />
                    <Label>Enviar e-mail automaticamente ao destinatário</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.incluirIBPT} onCheckedChange={v => update("incluirIBPT", v)} />
                    <Label>Incluir tributos aproximados (IBPT)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.permitirContingencia} onCheckedChange={v => update("permitirContingencia", v)} />
                    <Label>Permitir contingência automática</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={config.gerarPDF} onCheckedChange={v => update("gerarPDF", v)} />
                    <Label>Gerar PDF do DANFE automaticamente</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificado" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Certificado Digital</CardTitle>
              <CardDescription>Configuração do certificado digital para assinatura da NF-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Certificado</Label>
                  <Select value={config.tipoCertificado} onValueChange={v => update("tipoCertificado", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (arquivo .pfx)</SelectItem>
                      <SelectItem value="A3">A3 (token/cartão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input type="password" value={config.senhaCertificado} onChange={e => update("senhaCertificado", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Validade do Certificado</Label>
                <Input type="date" value={config.validadeCertificado} onChange={e => update("validadeCertificado", e.target.value)} />
              </div>
              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <Shield className="text-primary mt-0.5" size={20} />
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground mb-1">Certificado Digital</p>
                  <p>O certificado A1 (.pfx) é armazenado em arquivo. O certificado A3 requer token USB ou smart card conectado. Ambos devem estar válidos e emitidos por autoridade certificadora credenciada pela ICP-Brasil.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transporte" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Transporte Padrão</CardTitle>
              <CardDescription>Modalidade de frete padrão para novas NF-e</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label>Modalidade de Frete</Label>
                <Select value={config.modalidadeFrete} onValueChange={v => update("modalidadeFrete", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Frete por conta do remetente (CIF)</SelectItem>
                    <SelectItem value="1">1 - Frete por conta do destinatário (FOB)</SelectItem>
                    <SelectItem value="2">2 - Frete por conta de terceiros</SelectItem>
                    <SelectItem value="3">3 - Transporte próprio por conta do remetente</SelectItem>
                    <SelectItem value="4">4 - Transporte próprio por conta do destinatário</SelectItem>
                    <SelectItem value="9">9 - Sem frete</SelectItem>
                  </SelectContent>
                </Select>
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
