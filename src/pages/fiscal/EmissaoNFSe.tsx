import { useState, useCallback, useRef } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, Save, Eye, Building2, User, Briefcase, Calculator, Search, Loader2, Printer, Download, FileText, DollarSign } from "lucide-react";
import NFSeDocument from "@/components/nfse/NFSeDocument";
import type { NFSeData } from "@/components/nfse/NFSeDocument";

interface NFSeFormData {
  // Prestador
  prestadorCnpj: string;
  prestadorRazaoSocial: string;
  prestadorInscMunicipal: string;
  prestadorTelefone: string;
  prestadorEmail: string;
  prestadorEndereco: string;
  prestadorMunicipio: string;
  prestadorCep: string;
  simplesNacional: string;
  // Tomador
  tomadorCpfCnpj: string;
  tomadorNome: string;
  tomadorEmail: string;
  tomadorTelefone: string;
  tomadorLogradouro: string;
  tomadorNumero: string;
  tomadorBairro: string;
  tomadorCidade: string;
  tomadorUf: string;
  tomadorCep: string;
  // Serviço
  codigoServico: string;
  localPrestacao: string;
  discriminacao: string;
  valorServico: string;
  aliquotaIss: string;
  valorDeducoes: string;
  descontoIncondicionado: string;
  descontoCondicionado: string;
  // Tributação
  naturezaOperacao: string;
  regimeEspecial: string;
  issRetido: string;
  municipioIncidencia: string;
  // Tributação Federal
  irrf: string;
  pis: string;
  cofins: string;
  csll: string;
  inss: string;
  // Extra
  informacoesComplementares: string;
}

const initialForm: NFSeFormData = {
  prestadorCnpj: "",
  prestadorRazaoSocial: "",
  prestadorInscMunicipal: "",
  prestadorTelefone: "",
  prestadorEmail: "",
  prestadorEndereco: "",
  prestadorMunicipio: "",
  prestadorCep: "",
  simplesNacional: "2",
  tomadorCpfCnpj: "",
  tomadorNome: "",
  tomadorEmail: "",
  tomadorTelefone: "",
  tomadorLogradouro: "",
  tomadorNumero: "",
  tomadorBairro: "",
  tomadorCidade: "",
  tomadorUf: "",
  tomadorCep: "",
  codigoServico: "",
  localPrestacao: "",
  discriminacao: "",
  valorServico: "",
  aliquotaIss: "5.00",
  valorDeducoes: "0.00",
  descontoIncondicionado: "0.00",
  descontoCondicionado: "0.00",
  naturezaOperacao: "1",
  regimeEspecial: "0",
  issRetido: "2",
  municipioIncidencia: "",
  irrf: "",
  pis: "",
  cofins: "",
  csll: "",
  inss: "",
  informacoesComplementares: "",
};

const codigosServico = [
  { codigo: "01.01.01", descricao: "Análise e desenvolvimento de sistemas" },
  { codigo: "01.01.02", descricao: "Programação" },
  { codigo: "01.01.03", descricao: "Processamento de dados e congêneres" },
  { codigo: "01.01.04", descricao: "Elaboração de programas de computadores" },
  { codigo: "01.01.05", descricao: "Licenciamento de uso de programas" },
  { codigo: "07.02.01", descricao: "Execução de obras de engenharia" },
  { codigo: "07.03.01", descricao: "Elaboração de planos diretores e projetos" },
  { codigo: "11.01.01", descricao: "Guarda e estacionamento de veículos" },
  { codigo: "14.01.01", descricao: "Lubrificação, limpeza, lustração" },
  { codigo: "17.01.01", descricao: "Assessoria ou consultoria" },
  { codigo: "17.02.01", descricao: "Datilografia, digitação e estenografia" },
  { codigo: "25.01.01", descricao: "Serviços funerários" },
];

export default function EmissaoNFSe() {
  const [form, setForm] = useState<NFSeFormData>(initialForm);
  const [buscandoPrestador, setBuscandoPrestador] = useState(false);
  const [buscandoTomador, setBuscandoTomador] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoCepPrestador, setBuscandoCepPrestador] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nfseEmitida, setNfseEmitida] = useState<{ numero: string; protocolo: string; dataEmissao: string; chaveAcesso: string } | null>(null);
  const [emitidaDialogOpen, setEmitidaDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleChange = useCallback((field: keyof NFSeFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const buscarCnpj = useCallback(async (cnpj: string, tipo: "prestador" | "tomador") => {
    const limpo = cnpj.replace(/\D/g, "");
    if (limpo.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Digite um CNPJ com 14 dígitos.", variant: "destructive" });
      return;
    }
    const setLoading = tipo === "prestador" ? setBuscandoPrestador : setBuscandoTomador;
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      if (tipo === "prestador") {
        setForm(prev => ({
          ...prev,
          prestadorRazaoSocial: data.razao_social || prev.prestadorRazaoSocial,
          prestadorTelefone: data.ddd_telefone_1 || prev.prestadorTelefone,
          prestadorEmail: data.email || prev.prestadorEmail,
          prestadorEndereco: [data.logradouro, data.numero, data.complemento, data.bairro].filter(Boolean).join(", "),
          prestadorMunicipio: `${data.municipio || ""} - ${data.uf || ""}`,
          prestadorCep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : prev.prestadorCep,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          tomadorNome: data.razao_social || data.nome_fantasia || "",
          tomadorEmail: data.email || "",
          tomadorTelefone: data.ddd_telefone_1 || "",
          tomadorLogradouro: data.logradouro || "",
          tomadorNumero: data.numero || "",
          tomadorBairro: data.bairro || "",
          tomadorCidade: data.municipio || "",
          tomadorUf: data.uf || "",
          tomadorCep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : "",
        }));
      }
      toast({ title: "CNPJ encontrado!", description: `${data.razao_social}` });
    } catch {
      toast({ title: "Erro na busca", description: "CNPJ não encontrado na base da Receita Federal.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const buscarCep = useCallback(async (cep: string, tipo: "prestador" | "tomador") => {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    const setLoading = tipo === "prestador" ? setBuscandoCepPrestador : setBuscandoCep;
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${limpo}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (tipo === "prestador") {
        setForm(prev => ({
          ...prev,
          prestadorEndereco: [data.street, data.neighborhood].filter(Boolean).join(", "),
          prestadorMunicipio: `${data.city || ""} - ${data.state || ""}`,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          tomadorLogradouro: data.street || prev.tomadorLogradouro,
          tomadorBairro: data.neighborhood || prev.tomadorBairro,
          tomadorCidade: data.city || prev.tomadorCidade,
          tomadorUf: data.state || prev.tomadorUf,
        }));
      }
      toast({ title: "CEP encontrado!", description: `${data.street}, ${data.city}/${data.state}` });
    } catch {
      toast({ title: "CEP não encontrado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const valorServico = parseFloat(form.valorServico || "0");
  const valorDeducoes = parseFloat(form.valorDeducoes || "0");
  const descontoInc = parseFloat(form.descontoIncondicionado || "0");
  const aliquota = parseFloat(form.aliquotaIss || "0");
  const baseCalculo = valorServico - valorDeducoes - descontoInc;
  const valorIssCalculado = baseCalculo * (aliquota / 100);
  const retFederais = [form.irrf, form.pis, form.cofins, form.csll, form.inss].reduce((s, v) => s + parseFloat(v || "0"), 0);
  const valorLiquido = valorServico - descontoInc - (form.issRetido === "1" ? valorIssCalculado : 0) - retFederais;

  const handleEmitir = useCallback(() => {
    if (!form.prestadorCnpj || !form.prestadorRazaoSocial) {
      toast({ title: "Dados do Prestador", description: "Preencha CNPJ e Razão Social do prestador.", variant: "destructive" });
      return;
    }
    if (!form.codigoServico || !form.valorServico) {
      toast({ title: "Dados do Serviço", description: "Selecione o serviço e informe o valor.", variant: "destructive" });
      return;
    }
    const numero = String(Math.floor(Math.random() * 900000) + 100000);
    const protocolo = String(Date.now());
    const dataEmissao = new Date().toLocaleString("pt-BR");
    const chaveAcesso = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join("");
    setNfseEmitida({ numero, protocolo, dataEmissao, chaveAcesso });
    setEmitidaDialogOpen(true);
    toast({ title: "NFS-e Emitida com Sucesso!", description: `NFS-e nº ${numero} transmitida. Protocolo: ${protocolo}` });
  }, [form, toast]);

  const handleSalvarRascunho = useCallback(() => {
    toast({ title: "Rascunho Salvo", description: "NFS-e salva como rascunho." });
  }, [toast]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=800,height=1100");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>DANFSe - NFS-e</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; padding: 10mm; }
      .border { border: 1px solid #9ca3af; } .border-b { border-bottom: 1px solid #9ca3af; }
      .border-r { border-right: 1px solid #9ca3af; } .border-gray-400 { border-color: #9ca3af; }
      .bg-blue-900 { background: #1e3a5f; } .text-blue-900 { color: #1e3a5f; }
      .bg-gray-50 { background: #f9fafb; } .bg-green-50 { background: #f0fdf4; }
      .text-white { color: #fff; } .text-gray-500 { color: #6b7280; } .text-gray-400 { color: #9ca3af; }
      .text-gray-600 { color: #4b5563; } .text-green-800 { color: #166534; } .text-blue-600 { color: #2563eb; }
      .grid { display: grid; } .grid-cols-2 { grid-template-columns: repeat(2,1fr); }
      .grid-cols-3 { grid-template-columns: repeat(3,1fr); } .grid-cols-4 { grid-template-columns: repeat(4,1fr); }
      .grid-cols-5 { grid-template-columns: repeat(5,1fr); } .grid-cols-6 { grid-template-columns: repeat(6,1fr); }
      .grid-cols-\\[200px_1fr_200px\\] { grid-template-columns: 200px 1fr 200px; }
      .col-span-2 { grid-column: span 2; } .col-span-3 { grid-column: span 3; }
      .flex { display: flex; } .flex-col { flex-direction: column; }
      .items-center { align-items: center; } .justify-center { justify-content: center; }
      .text-center { text-align: center; }
      .p-1\\.5 { padding: 6px; } .p-2 { padding: 8px; } .p-3 { padding: 12px; }
      .px-3 { padding-left: 12px; padding-right: 12px; } .py-1 { padding-top: 4px; padding-bottom: 4px; }
      .mt-0\\.5 { margin-top: 2px; } .mt-1 { margin-top: 4px; } .mt-3 { margin-top: 12px; }
      .space-y-0\\.5 > * + * { margin-top: 2px; }
      .font-bold { font-weight: 700; } .font-black { font-weight: 900; } .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; } .font-mono { font-family: monospace; }
      .text-lg { font-size: 18px; } .text-sm { font-size: 13px; } .text-xs { font-size: 11px; }
      .text-\\[8px\\] { font-size: 8px; } .text-\\[9px\\] { font-size: 9px; }
      .text-\\[10px\\] { font-size: 10px; } .text-\\[11px\\] { font-size: 11px; }
      .uppercase { text-transform: uppercase; } .italic { font-style: italic; }
      .tracking-wider { letter-spacing: 0.1em; } .tracking-wide { letter-spacing: 0.05em; }
      .leading-tight { line-height: 1.25; } .whitespace-pre-wrap { white-space: pre-wrap; }
      .min-h-\\[40px\\] { min-height: 40px; } .max-w-\\[210mm\\] { max-width: 210mm; } .mx-auto { margin: 0 auto; }
      .\\!border-r-0 { border-right: 0 !important; }
      @media print { @page { size: A4; margin: 8mm; } body { padding: 0; } }
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }, []);

  const buildDocumentData = (emitida?: typeof nfseEmitida): NFSeData => ({
    ...form,
    numero: emitida?.numero,
    chaveAcesso: emitida?.chaveAcesso,
    protocolo: emitida?.protocolo,
    dataEmissao: emitida?.dataEmissao,
  });

  return (
    <div className="page-container">
      <PageHeader title="Emissão de NFS-e" description="Nota Fiscal de Serviços Eletrônica — Padrão Nacional DANFSe v1.0" />

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs">Padrão Nacional NFS-e</Badge>
        <Badge variant="outline" className="text-xs">DANFSe v1.0</Badge>
        <Badge variant="outline" className="text-xs">Portal gov.br</Badge>
        <Badge variant="secondary" className="text-xs">Ambiente: Homologação</Badge>
      </div>

      <Tabs defaultValue="prestador" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="prestador" className="gap-1.5"><Building2 size={14} />Prestador</TabsTrigger>
          <TabsTrigger value="tomador" className="gap-1.5"><User size={14} />Tomador</TabsTrigger>
          <TabsTrigger value="servico" className="gap-1.5"><Briefcase size={14} />Serviço</TabsTrigger>
          <TabsTrigger value="tributos" className="gap-1.5"><Calculator size={14} />Tributos</TabsTrigger>
          <TabsTrigger value="federal" className="gap-1.5"><DollarSign size={14} />Federal</TabsTrigger>
        </TabsList>

        {/* PRESTADOR */}
        <TabsContent value="prestador">
          <Card>
            <CardHeader><CardTitle className="text-base">Emitente da NFS-e (Prestador)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <div className="flex gap-2">
                  <Input value={form.prestadorCnpj} onChange={e => handleChange("prestadorCnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                  <Button type="button" variant="outline" size="icon" onClick={() => buscarCnpj(form.prestadorCnpj, "prestador")} disabled={buscandoPrestador}>
                    {buscandoPrestador ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Razão Social *</Label>
                <Input value={form.prestadorRazaoSocial} onChange={e => handleChange("prestadorRazaoSocial", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input value={form.prestadorInscMunicipal} onChange={e => handleChange("prestadorInscMunicipal", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.prestadorTelefone} onChange={e => handleChange("prestadorTelefone", e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.prestadorEmail} onChange={e => handleChange("prestadorEmail", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input value={form.prestadorCep} onChange={e => handleChange("prestadorCep", e.target.value)} placeholder="00000-000" />
                  <Button type="button" variant="outline" size="icon" onClick={() => buscarCep(form.prestadorCep, "prestador")} disabled={buscandoCepPrestador}>
                    {buscandoCepPrestador ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.prestadorEndereco} onChange={e => handleChange("prestadorEndereco", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Município - UF</Label>
                <Input value={form.prestadorMunicipio} onChange={e => handleChange("prestadorMunicipio", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Simples Nacional</Label>
                <Select value={form.simplesNacional} onValueChange={v => handleChange("simplesNacional", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Optante - Simples Nacional</SelectItem>
                    <SelectItem value="2">Não Optante</SelectItem>
                    <SelectItem value="3">Optante - MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOMADOR */}
        <TabsContent value="tomador">
          <Card>
            <CardHeader><CardTitle className="text-base">Tomador do Serviço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <div className="flex gap-2">
                  <Input placeholder="CPF ou CNPJ" value={form.tomadorCpfCnpj} onChange={e => handleChange("tomadorCpfCnpj", e.target.value)} />
                  <Button type="button" variant="outline" size="icon" onClick={() => buscarCnpj(form.tomadorCpfCnpj, "tomador")} disabled={buscandoTomador}>
                    {buscandoTomador ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Nome/Razão Social</Label>
                <Input value={form.tomadorNome} onChange={e => handleChange("tomadorNome", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.tomadorEmail} onChange={e => handleChange("tomadorEmail", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.tomadorTelefone} onChange={e => handleChange("tomadorTelefone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input value={form.tomadorCep} onChange={e => handleChange("tomadorCep", e.target.value)} placeholder="00000-000" />
                  <Button type="button" variant="outline" size="icon" onClick={() => buscarCep(form.tomadorCep, "tomador")} disabled={buscandoCep}>
                    {buscandoCep ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.tomadorLogradouro} onChange={e => handleChange("tomadorLogradouro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.tomadorNumero} onChange={e => handleChange("tomadorNumero", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.tomadorBairro} onChange={e => handleChange("tomadorBairro", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.tomadorCidade} onChange={e => handleChange("tomadorCidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={form.tomadorUf} onValueChange={v => handleChange("tomadorUf", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SERVIÇO */}
        <TabsContent value="servico">
          <Card>
            <CardHeader><CardTitle className="text-base">Serviço Prestado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código de Tributação Nacional *</Label>
                  <Select value={form.codigoServico} onValueChange={v => handleChange("codigoServico", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                    <SelectContent>
                      {codigosServico.map(s => (
                        <SelectItem key={s.codigo} value={s.codigo}>{s.codigo} — {s.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Local da Prestação</Label>
                  <Input value={form.localPrestacao} onChange={e => handleChange("localPrestacao", e.target.value)} placeholder="Município - UF" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição do Serviço *</Label>
                <Textarea rows={4} placeholder="Descreva detalhadamente o serviço prestado..." value={form.discriminacao} onChange={e => handleChange("discriminacao", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Serviço (R$) *</Label>
                  <CurrencyInput value={parseFloat(form.valorServico) || 0} onValueChange={v => handleChange("valorServico", String(v))} />
                </div>
                <div className="space-y-2">
                  <Label>Desc. Incondicionado (R$)</Label>
                  <CurrencyInput value={parseFloat(form.descontoIncondicionado) || 0} onValueChange={v => handleChange("descontoIncondicionado", String(v))} />
                </div>
                <div className="space-y-2">
                  <Label>Desc. Condicionado (R$)</Label>
                  <CurrencyInput value={parseFloat(form.descontoCondicionado) || 0} onValueChange={v => handleChange("descontoCondicionado", String(v))} />
                </div>
                <div className="space-y-2">
                  <Label>Total Deduções (R$)</Label>
                  <CurrencyInput value={parseFloat(form.valorDeducoes) || 0} onValueChange={v => handleChange("valorDeducoes", String(v))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIBUTOS MUNICIPAL */}
        <TabsContent value="tributos">
          <Card>
            <CardHeader><CardTitle className="text-base">Tributação Municipal — ISSQN</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tributação do ISSQN</Label>
                <Select value={form.naturezaOperacao} onValueChange={v => handleChange("naturezaOperacao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Operação Tributável</SelectItem>
                    <SelectItem value="2">Tributação fora do município</SelectItem>
                    <SelectItem value="3">Isenção</SelectItem>
                    <SelectItem value="4">Imune</SelectItem>
                    <SelectItem value="5">Exigibilidade suspensa (judicial)</SelectItem>
                    <SelectItem value="6">Exigibilidade suspensa (administrativo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Município de Incidência do ISSQN</Label>
                <Input value={form.municipioIncidencia} onChange={e => handleChange("municipioIncidencia", e.target.value)} placeholder="Município - UF" />
              </div>
              <div className="space-y-2">
                <Label>Regime Especial de Tributação</Label>
                <Select value={form.regimeEspecial} onValueChange={v => handleChange("regimeEspecial", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nenhum</SelectItem>
                    <SelectItem value="1">Microempresa Municipal</SelectItem>
                    <SelectItem value="2">Estimativa</SelectItem>
                    <SelectItem value="3">Sociedade de Profissionais</SelectItem>
                    <SelectItem value="4">Cooperativa</SelectItem>
                    <SelectItem value="5">MEI</SelectItem>
                    <SelectItem value="6">ME/EPP Simples Nacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Retenção do ISSQN</Label>
                <Select value={form.issRetido} onValueChange={v => handleChange("issRetido", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Retido</SelectItem>
                    <SelectItem value="2">Não Retido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíquota ISS (%)</Label>
                <Input type="number" step="0.01" value={form.aliquotaIss} onChange={e => handleChange("aliquotaIss", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIBUTOS FEDERAL */}
        <TabsContent value="federal">
          <Card>
            <CardHeader><CardTitle className="text-base">Tributação Federal — Retenções</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>IRRF (R$)</Label>
                <CurrencyInput value={parseFloat(form.irrf) || 0} onValueChange={v => handleChange("irrf", String(v))} />
              </div>
              <div className="space-y-2">
                <Label>PIS (R$)</Label>
                <CurrencyInput value={parseFloat(form.pis) || 0} onValueChange={v => handleChange("pis", String(v))} />
              </div>
              <div className="space-y-2">
                <Label>COFINS (R$)</Label>
                <CurrencyInput value={parseFloat(form.cofins) || 0} onValueChange={v => handleChange("cofins", String(v))} />
              </div>
              <div className="space-y-2">
                <Label>CSLL (R$)</Label>
                <CurrencyInput value={parseFloat(form.csll) || 0} onValueChange={v => handleChange("csll", String(v))} />
              </div>
              <div className="space-y-2">
                <Label>INSS (R$)</Label>
                <CurrencyInput value={parseFloat(form.inss) || 0} onValueChange={v => handleChange("inss", String(v))} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Informações Complementares</Label>
                <Textarea rows={3} value={form.informacoesComplementares} onChange={e => handleChange("informacoesComplementares", e.target.value)} placeholder="Observações adicionais..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resumo */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground">Valor Serviço</p>
              <p className="text-sm font-bold">R$ {valorServico.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Descontos</p>
              <p className="text-sm font-bold">R$ {descontoInc.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Deduções</p>
              <p className="text-sm font-bold">R$ {valorDeducoes.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Base Cálculo</p>
              <p className="text-sm font-bold">R$ {baseCalculo.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">ISS ({form.aliquotaIss}%)</p>
              <p className="text-sm font-bold text-destructive">R$ {valorIssCalculado.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Ret. Federais</p>
              <p className="text-sm font-bold">R$ {retFederais.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Valor Líquido</p>
              <p className="text-sm font-black text-primary">R$ {valorLiquido.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={handleSalvarRascunho}><Save size={16} /> Salvar Rascunho</Button>
        <Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye size={16} /> Pré-visualizar DANFSe</Button>
        <Button onClick={handleEmitir}><Send size={16} /> Emitir NFS-e</Button>
      </div>

      {/* Dialog Pré-visualização */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye size={18} /> Pré-visualização DANFSe</DialogTitle>
          </DialogHeader>
          <NFSeDocument ref={printRef} dados={buildDocumentData()} />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fechar</Button>
            <Button variant="outline" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog NFS-e Emitida */}
      <Dialog open={emitidaDialogOpen} onOpenChange={setEmitidaDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600"><FileText size={18} /> NFS-e Emitida com Sucesso!</DialogTitle>
          </DialogHeader>
          <NFSeDocument ref={printRef} dados={buildDocumentData(nfseEmitida)} />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setEmitidaDialogOpen(false)}>Fechar</Button>
            <Button variant="outline" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
            <Button onClick={handlePrint}><Download size={16} /> Salvar PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
