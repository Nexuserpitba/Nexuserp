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
import { Tag, Printer, ArrowLeft } from "lucide-react";


interface EtiquetaConfig {
  modelo: string;
  largura: string;
  altura: string;
  formato: string;
  incluirPreco: boolean;
  incluirBarras: boolean;
  incluirValidade: boolean;
  incluirPeso: boolean;
  incluirLote: boolean;
  prefixoBarras: string;
  impressora: string;
  portaImpressora: string;
  tipoEtiqueta: string;
}

const defaultConfig: EtiquetaConfig = {
  modelo: "gondola",
  largura: "60",
  altura: "40",
  formato: "ean13",
  incluirPreco: true,
  incluirBarras: true,
  incluirValidade: false,
  incluirPeso: false,
  incluirLote: false,
  prefixoBarras: "2",
  impressora: "generica",
  portaImpressora: "USB001",
  tipoEtiqueta: "adesiva",
};

export default function ConfigEtiquetas() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<EtiquetaConfig>(() => {
    try { const s = localStorage.getItem("etiqueta-config"); return s ? JSON.parse(s) : defaultConfig; } catch { return defaultConfig; }
  });
  const [tab, setTab] = useState("layout");

  const update = (field: keyof EtiquetaConfig, value: string | boolean) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    localStorage.setItem("etiqueta-config", JSON.stringify(updated));
  };

  const salvar = () => {
    toast.success("Configuração de etiquetas salva com sucesso!");
    navigate("/pdv");
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuração de Etiquetas" description="Configure os modelos de etiquetas para balança e gôndola" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="layout" className="gap-2"><Tag size={14} /> Layout da Etiqueta</TabsTrigger>
          <TabsTrigger value="impressora" className="gap-2"><Printer size={14} /> Impressora</TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Layout da Etiqueta</CardTitle>
              <CardDescription>Defina o modelo e os campos que serão impressos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Etiqueta</Label>
                  <Select value={config.modelo} onValueChange={v => update("modelo", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gondola">Gôndola</SelectItem>
                      <SelectItem value="balanca">Balança (pesável)</SelectItem>
                      <SelectItem value="prateleira">Prateleira</SelectItem>
                      <SelectItem value="promocao">Promoção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Largura (mm)</Label>
                  <Input value={config.largura} onChange={e => update("largura", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Altura (mm)</Label>
                  <Input value={config.altura} onChange={e => update("altura", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formato do Código de Barras</Label>
                  <Select value={config.formato} onValueChange={v => update("formato", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ean13">EAN-13</SelectItem>
                      <SelectItem value="ean8">EAN-8</SelectItem>
                      <SelectItem value="code128">Code 128</SelectItem>
                      <SelectItem value="qrcode">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prefixo Código de Barras (pesáveis)</Label>
                  <Input value={config.prefixoBarras} onChange={e => update("prefixoBarras", e.target.value)} placeholder="2" />
                  <p className="text-xs text-muted-foreground">Prefixo "2" é padrão para produtos pesáveis (EAN-13)</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Campos da Etiqueta</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {([
                    ["incluirPreco", "Preço"],
                    ["incluirBarras", "Código de Barras"],
                    ["incluirValidade", "Data de Validade"],
                    ["incluirPeso", "Peso"],
                    ["incluirLote", "Lote"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="flex items-center gap-2">
                      <Switch checked={config[field]} onCheckedChange={v => update(field, v)} />
                      <Label>{label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview mock */}
              <div className="border border-border rounded-lg p-6 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2 uppercase font-semibold">Pré-visualização</p>
                <div className="bg-card border border-border rounded p-4 max-w-[300px] mx-auto text-center space-y-1">
                  <p className="font-bold text-sm text-foreground">PRODUTO EXEMPLO</p>
                  {config.incluirBarras && <p className="font-mono text-xs text-muted-foreground">|||||||||||||||||||</p>}
                  {config.incluirBarras && <p className="font-mono text-[10px] text-muted-foreground">7891234560001</p>}
                  {config.incluirPreco && <p className="font-bold text-xl text-foreground">R$ 12,99</p>}
                  <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
                    {config.incluirPeso && <span>Peso: 0,500 kg</span>}
                    {config.incluirValidade && <span>Val: 15/12/2026</span>}
                    {config.incluirLote && <span>Lote: L001</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impressora" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Impressora de Etiquetas</CardTitle>
              <CardDescription>Configure a impressora para impressão de etiquetas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo da Impressora</Label>
                  <Select value={config.impressora} onValueChange={v => update("impressora", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generica">Genérica</SelectItem>
                      <SelectItem value="zebra">Zebra</SelectItem>
                      <SelectItem value="argox">Argox</SelectItem>
                      <SelectItem value="elgin">Elgin</SelectItem>
                      <SelectItem value="bematech">Bematech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Porta</Label>
                  <Input value={config.portaImpressora} onChange={e => update("portaImpressora", e.target.value)} placeholder="USB001 ou LPT1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Etiqueta</Label>
                <Select value={config.tipoEtiqueta} onValueChange={v => update("tipoEtiqueta", v)}>
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adesiva">Adesiva</SelectItem>
                    <SelectItem value="continua">Contínua</SelectItem>
                    <SelectItem value="couchê">Couchê</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3">
        <Button onClick={salvar}>Salvar Configurações</Button>
        <Button variant="outline" onClick={() => toast.info("Impressão de teste enviada (simulação)")}>Imprimir Teste</Button>
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
