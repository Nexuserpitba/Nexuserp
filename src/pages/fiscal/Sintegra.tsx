import { useState } from "react";
import { MonthPicker } from "@/components/ui/month-picker";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { gerarArquivoSintegra, downloadSintegra, SintegraConfig } from "@/lib/sintegra/generator";

export default function Sintegra() {
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [finalidade, setFinalidade] = useState("1");
  const [conteudoArquivo, setConteudoArquivo] = useState("");
  const [registros, setRegistros] = useState({
    reg50: true,
    reg51: false,
    reg53: false,
    reg54: true,
    reg55: false,
    reg60: true,
    reg61: false,
    reg70: false,
    reg74: true,
    reg75: true,
  });

  const toggleRegistro = (key: string) => {
    setRegistros(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const getEmpresa = () => {
    try {
      const stored = localStorage.getItem("empresas");
      if (stored) {
        const empresas = JSON.parse(stored);
        const selecionada = empresas.find((e: any) => e.selecionada) || empresas[0];
        if (selecionada) {
          return {
            cnpj: selecionada.cnpj || "",
            inscricaoEstadual: selecionada.inscricaoEstadual || "",
            razaoSocial: selecionada.razaoSocial || "",
            logradouro: selecionada.endereco || "",
            numero: "0",
            complemento: "",
            bairro: selecionada.bairro || "",
            cidade: selecionada.cidade || "",
            uf: selecionada.uf || "",
            cep: selecionada.cep || "",
            telefone: selecionada.telefone || "",
            responsavel: selecionada.nomeFantasia || "",
          };
        }
      }
    } catch { /* fallback */ }
    return {
      cnpj: "00000000000000",
      inscricaoEstadual: "ISENTO",
      razaoSocial: "EMPRESA NAO CADASTRADA",
      logradouro: "",
      numero: "0",
      complemento: "",
      bairro: "",
      cidade: "SAO PAULO",
      uf: "SP",
      cep: "00000000",
      telefone: "0000000000",
      responsavel: "",
    };
  };

  const gerarArquivo = () => {
    if (!periodoInicio || !periodoFim) {
      toast.error("Informe o período");
      return;
    }

    const selecionados = Object.entries(registros).filter(([, v]) => v).map(([k]) => k);

    const config: SintegraConfig = {
      empresa: getEmpresa(),
      periodoInicio,
      periodoFim,
      finalidade,
      registrosSelecionados: selecionados,
    };

    const conteudo = gerarArquivoSintegra(config);
    setConteudoArquivo(conteudo);
    toast.success("Arquivo Sintegra gerado com sucesso!");
  };

  const baixarArquivo = () => {
    if (!conteudoArquivo) return;
    downloadSintegra(conteudoArquivo, periodoInicio);
    toast.success("Download iniciado");
  };

  const copiarConteudo = () => {
    navigator.clipboard.writeText(conteudoArquivo);
    toast.success("Conteúdo copiado para a área de transferência");
  };

  const totalLinhas = conteudoArquivo ? conteudoArquivo.split("\r\n").filter(l => l.length > 0).length : 0;

  return (
    <div className="page-container">
      <PageHeader title="Sintegra" description="Geração do arquivo Sintegra (Convênio ICMS 57/95)" />

      <Card>
        <CardHeader>
          <CardTitle>Gerar Arquivo Sintegra</CardTitle>
          <CardDescription>Selecione o período e os registros desejados para geração</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="1">1 - Normal</SelectItem>
                  <SelectItem value="2">2 - Retificação total</SelectItem>
                  <SelectItem value="3">3 - Retificação aditiva</SelectItem>
                  <SelectItem value="5">5 - Desfazimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Registros a incluir</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(registros).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Checkbox checked={value} onCheckedChange={() => toggleRegistro(key)} />
                  <span className="text-sm font-mono">{key.toUpperCase().replace("REG", "Reg ")}</span>
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
                <CardTitle className="text-base">Prévia do Arquivo Sintegra</CardTitle>
                <CardDescription>{totalLinhas} linhas geradas • Pronto para download</CardDescription>
              </div>
              <Button onClick={() => setConteudoArquivo("")} variant="ghost" size="sm" className="gap-1">
                <EyeOff className="w-4 h-4" /> Ocultar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted/50 border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto leading-6 whitespace-pre">
                {conteudoArquivo.split("\r\n").filter(l => l.length > 0).map((linha, idx) => (
                  <div key={idx} className="flex hover:bg-accent/30 transition-colors">
                    <span className="text-muted-foreground w-8 text-right mr-3 select-none shrink-0">{idx + 1}</span>
                    <span className={
                      linha.startsWith("10") ? "text-blue-500 dark:text-blue-400" :
                      linha.startsWith("11") ? "text-cyan-500 dark:text-cyan-400" :
                      linha.startsWith("50") ? "text-green-600 dark:text-green-400" :
                      linha.startsWith("54") ? "text-amber-600 dark:text-amber-400" :
                      linha.startsWith("60") ? "text-purple-600 dark:text-purple-400" :
                      linha.startsWith("74") ? "text-orange-600 dark:text-orange-400" :
                      linha.startsWith("75") ? "text-pink-600 dark:text-pink-400" :
                      linha.startsWith("90") ? "text-red-500 dark:text-red-400" :
                      ""
                    }>{linha}</span>
                  </div>
                ))}
              </pre>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Reg 10 - Mestre</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-500" /> Reg 11 - Complementar</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-600" /> Reg 50 - NF</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-600" /> Reg 54 - Produtos</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-600" /> Reg 60 - ECF</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-600" /> Reg 74 - Inventário</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-600" /> Reg 75 - Produto/Merc</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Reg 90 - Totalizador</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
