import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, TestTube, Shield, ArrowLeft } from "lucide-react";

import { useState } from "react";

interface TEFConfig {
  ativo: boolean;
  tipo: string;
  adquirente: string;
  ip: string;
  porta: string;
  loja: string;
  terminal: string;
  cnpjEstabelecimento: string;
  timeoutTransacao: string;
  imprimirVia: boolean;
  confirmarAutomatico: boolean;
  permitirParcelamento: boolean;
  maxParcelas: string;
}

const defaultConfig: TEFConfig = {
  ativo: false,
  tipo: "dedicado",
  adquirente: "sitef",
  ip: "127.0.0.1",
  porta: "4096",
  loja: "00000001",
  terminal: "00000001",
  cnpjEstabelecimento: "",
  timeoutTransacao: "120",
  imprimirVia: true,
  confirmarAutomatico: false,
  permitirParcelamento: true,
  maxParcelas: "12",
};

export default function ConfigTEF() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<TEFConfig>(() => {
    try { const s = localStorage.getItem("tef-config"); return s ? JSON.parse(s) : defaultConfig; } catch { return defaultConfig; }
  });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const update = (field: keyof TEFConfig, value: string | boolean) => {
    const updated = { ...config, [field]: value };
    setConfig(updated);
    localStorage.setItem("tef-config", JSON.stringify(updated));
  };

  const salvar = () => {
    toast.success("Configuração TEF salva com sucesso!");
    navigate("/pdv");
  };

  const testarConexao = () => {
    setTestStatus("testing");
    setTimeout(() => {
      setTestStatus("success");
      toast.success("Conexão TEF estabelecida com sucesso! (simulação)");
      setTimeout(() => setTestStatus("idle"), 3000);
    }, 2500);
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuração TEF" description="Configure a Transferência Eletrônica de Fundos para pagamentos com cartão" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="text-primary" size={24} />
              <div>
                <CardTitle>TEF - Transferência Eletrônica de Fundos</CardTitle>
                <CardDescription>Integração com adquirentes de cartão de crédito e débito</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="tef-ativo">Ativo</Label>
              <Switch id="tef-ativo" checked={config.ativo} onCheckedChange={v => update("ativo", v)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo TEF</Label>
              <Select value={config.tipo} onValueChange={v => update("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dedicado">TEF Dedicado</SelectItem>
                  <SelectItem value="discado">TEF Discado</SelectItem>
                  <SelectItem value="ip">TEF IP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Adquirente / Gerenciador</Label>
              <Select value={config.adquirente} onValueChange={v => update("adquirente", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sitef">SiTef (Software Express)</SelectItem>
                  <SelectItem value="paygo">PayGo (Setis)</SelectItem>
                  <SelectItem value="cappta">Cappta</SelectItem>
                  <SelectItem value="stone">Stone</SelectItem>
                  <SelectItem value="cielo">Cielo LIO</SelectItem>
                  <SelectItem value="rede">Rede</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CNPJ Estabelecimento</Label>
              <Input value={config.cnpjEstabelecimento} onChange={e => update("cnpjEstabelecimento", e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Endereço IP do Servidor</Label>
              <Input value={config.ip} onChange={e => update("ip", e.target.value)} placeholder="127.0.0.1" />
            </div>
            <div className="space-y-2">
              <Label>Porta</Label>
              <Input value={config.porta} onChange={e => update("porta", e.target.value)} placeholder="4096" />
            </div>
            <div className="space-y-2">
              <Label>Cód. Loja</Label>
              <Input value={config.loja} onChange={e => update("loja", e.target.value)} placeholder="00000001" />
            </div>
            <div className="space-y-2">
              <Label>Cód. Terminal</Label>
              <Input value={config.terminal} onChange={e => update("terminal", e.target.value)} placeholder="00000001" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Timeout Transação (segundos)</Label>
              <Input value={config.timeoutTransacao} onChange={e => update("timeoutTransacao", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Máximo de Parcelas</Label>
              <Input value={config.maxParcelas} onChange={e => update("maxParcelas", e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Opções</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={config.imprimirVia} onCheckedChange={v => update("imprimirVia", v)} />
                <Label>Imprimir comprovante</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.confirmarAutomatico} onCheckedChange={v => update("confirmarAutomatico", v)} />
                <Label>Confirmação automática</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.permitirParcelamento} onCheckedChange={v => update("permitirParcelamento", v)} />
                <Label>Permitir parcelamento</Label>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
            <Shield className="text-primary mt-0.5" size={20} />
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Segurança TEF</p>
              <p>A comunicação TEF segue os padrões PCI-DSS. Os dados do cartão não são armazenados localmente. Certifique-se de que o servidor TEF esteja ativo e acessível na rede.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button onClick={salvar}>Salvar Configurações</Button>
            <Button variant="outline" onClick={testarConexao} disabled={testStatus === "testing"} className="gap-2">
              <TestTube size={16} />
              {testStatus === "testing" ? "Testando..." : "Testar Conexão TEF"}
            </Button>
            {testStatus === "success" && <Badge className="bg-accent text-accent-foreground">Conectado</Badge>}
            {testStatus === "error" && <Badge variant="destructive">Falha</Badge>}
            <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
