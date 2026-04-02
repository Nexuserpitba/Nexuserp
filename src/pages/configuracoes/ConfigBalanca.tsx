import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Scale, Usb, Wifi, TestTube, ArrowLeft } from "lucide-react";

interface BalancaConfig {
  ativa: boolean;
  modelo: string;
  porta: string;
  baudRate: string;
  protocolo: string;
  conexao: string;
  ip: string;
  portaTcp: string;
  casasDecimais: string;
  timeout: string;
  toleranciaEstabilidade: string;
  amostrasEstabilidade: string;
}

const defaultConfig: BalancaConfig = {
  ativa: false,
  modelo: "toledo",
  porta: "COM1",
  baudRate: "9600",
  protocolo: "toledo-prix",
  conexao: "serial",
  ip: "",
  portaTcp: "9100",
  casasDecimais: "3",
  timeout: "5000",
  toleranciaEstabilidade: "5",
  amostrasEstabilidade: "5",
};

export default function ConfigBalanca() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<BalancaConfig>(() => {
    try { const s = localStorage.getItem("balanca-config"); return s ? JSON.parse(s) : defaultConfig; } catch { return defaultConfig; }
  });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const update = (field: keyof BalancaConfig, value: string | boolean) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    localStorage.setItem("balanca-config", JSON.stringify(updated));
  };

  const salvar = () => {
    toast.success("Configuração da balança salva com sucesso!");
    navigate("/pdv");
  };

  const testarConexao = () => {
    setTestStatus("testing");
    setTimeout(() => {
      setTestStatus("success");
      toast.success("Balança conectada com sucesso! (simulação)");
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 2000);
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuração de Balança" description="Configure a integração com a balança de checkout" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scale className="text-primary" size={24} />
              <div>
                <CardTitle>Balança de Caixa</CardTitle>
                <CardDescription>Configuração da comunicação com a balança</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="balanca-ativa">Ativa</Label>
              <Switch id="balanca-ativa" checked={config.ativa} onCheckedChange={v => update("ativa", v)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={config.modelo} onValueChange={v => update("modelo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="toledo">Toledo Prix</SelectItem>
                  <SelectItem value="filizola">Filizola</SelectItem>
                  <SelectItem value="urano">Urano</SelectItem>
                  <SelectItem value="elgin">Elgin</SelectItem>
                  <SelectItem value="balmak">Balmak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Protocolo</Label>
              <Select value={config.protocolo} onValueChange={v => update("protocolo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="toledo-prix">Toledo Prix</SelectItem>
                  <SelectItem value="filizola-bcr">Filizola BCR</SelectItem>
                  <SelectItem value="urano-pop">Urano POP</SelectItem>
                  <SelectItem value="generico">Genérico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={config.conexao} onValueChange={v => update("conexao", v)}>
            <TabsList>
              <TabsTrigger value="serial" className="gap-2"><Usb size={14} /> Serial</TabsTrigger>
              <TabsTrigger value="tcp" className="gap-2"><Wifi size={14} /> TCP/IP</TabsTrigger>
            </TabsList>
            <TabsContent value="serial" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Porta Serial</Label>
                  <Select value={config.porta} onValueChange={v => update("porta", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["COM1","COM2","COM3","COM4","COM5","COM6","COM7","COM8"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Baud Rate</Label>
                  <Select value={config.baudRate} onValueChange={v => update("baudRate", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["2400","4800","9600","19200","38400","57600","115200"].map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="tcp" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Endereço IP</Label>
                  <Input value={config.ip} onChange={e => update("ip", e.target.value)} placeholder="192.168.1.100" />
                </div>
                <div className="space-y-2">
                  <Label>Porta TCP</Label>
                  <Input value={config.portaTcp} onChange={e => update("portaTcp", e.target.value)} placeholder="9100" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Casas Decimais do Peso</Label>
              <Select value={config.casasDecimais} onValueChange={v => update("casasDecimais", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 casas</SelectItem>
                  <SelectItem value="3">3 casas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input value={config.timeout} onChange={e => update("timeout", e.target.value)} placeholder="5000" />
            </div>
          </div>

          {/* Estabilidade */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scale size={16} className="text-primary" /> Estabilidade do Peso
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tolerância de Estabilidade (gramas)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={config.toleranciaEstabilidade}
                  onChange={e => update("toleranciaEstabilidade", e.target.value)}
                  placeholder="5"
                />
                <p className="text-[11px] text-muted-foreground">Variação máxima aceita entre leituras para considerar o peso estável (ex: 5 = 5g)</p>
              </div>
              <div className="space-y-2">
                <Label>Amostras para Estabilidade</Label>
                <Select value={config.amostrasEstabilidade} onValueChange={v => update("amostrasEstabilidade", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 amostras</SelectItem>
                    <SelectItem value="5">5 amostras</SelectItem>
                    <SelectItem value="8">8 amostras</SelectItem>
                    <SelectItem value="10">10 amostras</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Quantidade de leituras consecutivas para avaliar estabilidade</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button onClick={salvar}>Salvar Configurações</Button>
            <Button variant="outline" onClick={testarConexao} disabled={testStatus === "testing"} className="gap-2">
              <TestTube size={16} />
              {testStatus === "testing" ? "Testando..." : "Testar Conexão"}
            </Button>
            {testStatus === "success" && <Badge className="bg-accent text-accent-foreground">Conectada</Badge>}
            {testStatus === "error" && <Badge variant="destructive">Falha na conexão</Badge>}
            <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
