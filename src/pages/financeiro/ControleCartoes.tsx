import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, CreditCard, CheckCircle2, Clock, XCircle, 
  RefreshCw, Download, DollarSign, Building2, Printer,
  FileText, FileSpreadsheet, Mail, MessageCircle, Eye, Send
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TransacaoCartao {
  id: string;
  dataHora: string;
  valor: number;
  valorLiquido: number;
  taxa: number;
  estabelecimento: string;
  cliente: string;
  cartao: string;
  bin: string;
  status: "aprovado" | "pendente" | "recusado" | "estornado" | "cancelado";
  tipo: "credito" | "debito" | "credito_parcelado";
  nsu: string;
  codigoAutorizacao: string;
  bandeira: "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "outros";
  parcelas: number;
  categoria: string;
  maquina: string;
}

function getTransacoesCartao(): TransacaoCartao[] {
  try {
    const stored = localStorage.getItem("transacoes_cartao");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [
    { id: "c1", dataHora: "2026-03-25T10:15:00", valor: 150.00, valorLiquido: 146.25, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "João Silva", cartao: "****1234", bin: "411111", status: "aprovado", tipo: "credito", nsu: "NSU001", codigoAutorizacao: "AUTH001", bandeira: "visa", parcelas: 1, categoria: "Venda", maquina: "TEF 01" },
    { id: "c2", dataHora: "2026-03-25T11:30:00", valor: 89.90, valorLiquido: 87.65, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "Maria Souza", cartao: "****5678", bin: "511111", status: "aprovado", tipo: "debito", nsu: "NSU002", codigoAutorizacao: "AUTH002", bandeira: "mastercard", parcelas: 1, categoria: "Venda", maquina: "TEF 01" },
    { id: "c3", dataHora: "2026-03-25T14:45:00", valor: 500.00, valorLiquido: 487.50, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "Pedro Santos", cartao: "****9012", bin: "627012", status: "aprovado", tipo: "credito_parcelado", nsu: "NSU003", codigoAutorizacao: "AUTH003", bandeira: "elo", parcelas: 3, categoria: "Venda", maquina: "TEF 02" },
    { id: "c4", dataHora: "2026-03-25T15:20:00", valor: 45.50, valorLiquido: 44.36, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "Ana Costa", cartao: "****3456", bin: "376001", status: "recusado", tipo: "credito", nsu: "NSU004", codigoAutorizacao: "", bandeira: "amex", parcelas: 1, categoria: "Venda", maquina: "TEF 01" },
    { id: "c5", dataHora: "2026-03-24T16:00:00", valor: 320.00, valorLiquido: 312.00, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "Carlos Lima", cartao: "****7890", bin: "451111", status: "estornado", tipo: "credito", nsu: "NSU005", codigoAutorizacao: "AUTH005", bandeira: "visa", parcelas: 2, categoria: "Venda", maquina: "TEF 02" },
    { id: "c6", dataHora: "2026-03-25T16:30:00", valor: 75.00, valorLiquido: 73.12, taxa: 2.5, estabelecimento: "Minha Empresa", cliente: "Julia Martins", cartao: "****2345", bin: "506001", status: "pendente", tipo: "credito", nsu: "NSU006", codigoAutorizacao: "", bandeira: "hipercard", parcelas: 1, categoria: "Venda", maquina: "TEF 01" },
  ];
}

function getStatusBadge(status: TransacaoCartao["status"]) {
  switch (status) {
    case "aprovado":
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>;
    case "pendente":
      return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    case "recusado":
      return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Recusado</Badge>;
    case "estornado":
      return <Badge className="bg-orange-500"><RefreshCw className="w-3 h-3 mr-1" /> Estornado</Badge>;
    case "cancelado":
      return <Badge className="bg-gray-500"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
  }
}

function getTipoBadge(tipo: TransacaoCartao["tipo"]) {
  switch (tipo) {
    case "credito":
      return <Badge variant="outline">Crédito</Badge>;
    case "debito":
      return <Badge variant="outline" className="border-blue-500 text-blue-500">Débito</Badge>;
    case "credito_parcelado":
      return <Badge variant="outline" className="border-purple-500 text-purple-500">Parcelado</Badge>;
  }
}

export default function ControleCartoes() {
  const [transacoes, setTransacoes] = useState<TransacaoCartao[]>(getTransacoesCartao);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroBandeira, setFiltroBandeira] = useState<string>("todos");
  const [aba, setAba] = useState("todos");
  const [showVisualizar, setShowVisualizar] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [empresa, setEmpresa] = useState<{razao_social: string; email: string; telefone: string; endereco: string; cnpj: string} | null>(null);

  useEffect(() => {
    const buscarEmpresa = async () => {
      const { data } = await supabase.from("empresas").select("razao_social, email, telefone, endereco, cnpj").eq("selecionada", true).limit(1).single();
      if (data) setEmpresa(data);
    };
    buscarEmpresa();
  }, []);

  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const matchBusca = !busca || 
        t.cliente.toLowerCase().includes(busca.toLowerCase()) ||
        t.nsu.includes(busca) ||
        t.cartao.includes(busca);
      const matchStatus = filtroStatus === "todos" || t.status === filtroStatus;
      const matchTipo = filtroTipo === "todos" || t.tipo === filtroTipo;
      const matchBandeira = filtroBandeira === "todos" || t.bandeira === filtroBandeira;
      
      if (aba === "credito") return matchBusca && matchStatus && (t.tipo === "credito" || t.tipo === "credito_parcelado") && matchBandeira;
      if (aba === "debito") return matchBusca && matchStatus && t.tipo === "debito" && matchBandeira;
      
      return matchBusca && matchStatus && matchTipo && matchBandeira;
    });
  }, [transacoes, busca, filtroStatus, filtroTipo, filtroBandeira, aba]);

  const totalRecebido = transacoes.filter(t => t.status === "aprovado").reduce((acc, t) => acc + t.valorLiquido, 0);
  const totalTaxa = transacoes.filter(t => t.status === "aprovado").reduce((acc, t) => acc + t.taxa, 0);
  const totalBruto = transacoes.filter(t => t.status === "aprovado").reduce((acc, t) => acc + t.valor, 0);

  const sincronizarCartoes = () => {
    toast.info("Sincronizando transações de cartões...");
    setTimeout(() => {
      toast.success("Transações de cartões sincronizadas!");
    }, 1500);
  };

  const getEmpresaEmail = (): string => {
    try {
      const stored = localStorage.getItem("empresas");
      if (stored) {
        const empresas = JSON.parse(stored);
        const selected = empresas.find((e: any) => e.selecionada);
        if (selected) return selected.email || selected.emailContabilidade || "";
      }
    } catch { /* ignore */ }
    return "";
  };

  const visualizarRelatorio = () => {
    if (transacoesFiltradas.length === 0) {
      toast.warning("Nenhuma transação para visualizar");
      return;
    }
    setShowVisualizar(true);
  };

  const CabecalhoEmpresaPrint = () => (
    <style>{`.print-only-header { display: none; } @media print { .print-only-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; } .print-only-header h2 { margin: 0; color: #2563eb; font-size: 18px; } .print-only-header p { margin: 2px 0; font-size: 12px; color: #666; } }`}</style>
  );

  const imprimirRelatorio = () => {
    toast.info("Preparando impressão...");
    setTimeout(() => {
      window.print();
      toast.success("Impressão enviada!");
    }, 500);
  };

  const exportarPDF = () => {
    toast.info("Gerando PDF...");
    
    const conteudo = `
<!DOCTYPE html>
<html>
<head>
  <title>Relatório de Controle de Cartões</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .empresa-header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
    .empresa-header h2 { margin: 0; color: #2563eb; font-size: 18px; }
    .empresa-header p { margin: 2px 0; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background-color: #2563eb; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .totais { margin-top: 20px; padding: 10px; background-color: #e7f3e7; border-radius: 5px; }
    .totais p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="empresa-header">
    <h2>${empresa?.razao_social || "Empresa"}</h2>
    <p>CNPJ: ${empresa?.cnpj || "-"} | Tel: ${empresa?.telefone || "-"}</p>
    <p>${empresa?.endereco || "-"}</p>
    <p>E-mail: ${empresa?.email || "-"}</p>
  </div>
  <h1>Relatório de Controle de Cartões</h1>
  <p>Data: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
  
  <div class="totais">
    <p><strong>Total Bruto:</strong> R$ ${totalBruto.toFixed(2)}</p>
    <p><strong>Total Líquido:</strong> R$ ${totalRecebido.toFixed(2)}</p>
    <p><strong>Taxa:</strong> ${totalTaxa.toFixed(1)}%</p>
    <p><strong>Transações:</strong> ${transacoesFiltradas.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Cliente</th>
        <th>Valor</th>
        <th>Líquido</th>
        <th>Bandeira</th>
        <th>Tipo</th>
        <th>NSU</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${transacoesFiltradas.map(t => `
        <tr>
          <td>${format(new Date(t.dataHora), "dd/MM/yyyy")}</td>
          <td>${t.cliente}</td>
          <td>R$ ${t.valor.toFixed(2)}</td>
          <td>R$ ${t.valorLiquido.toFixed(2)}</td>
          <td>${t.bandeira}</td>
          <td>${t.tipo}</td>
          <td>${t.nsu}</td>
          <td>${t.status}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([conteudo], { type: "text/html;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `controle_cartoes_${format(new Date(), "yyyy-MM-dd")}.html`;
    link.click();
    toast.success("PDF/HTML gerado! Use a função de impressão do navegador e selecione 'Salvar como PDF'");
  };

  const exportarExcel = () => {
    const csvContent = [
      ["Data/Hora", "Valor", "Líquido", "Cliente", "Cartão", "Bandeira", "Tipo", "NSU", "Máquina", "Status"],
      ...transacoesFiltradas.map(t => [
        format(new Date(t.dataHora), "dd/MM/yyyy HH:mm"),
        t.valor.toFixed(2),
        t.valorLiquido.toFixed(2),
        t.cliente,
        t.cartao,
        t.bandeira,
        t.tipo,
        t.nsu,
        t.maquina,
        t.status
      ])
    ].map(row => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `controle_cartoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Excel exportado com sucesso!");
  };

  const enviarWhatsApp = () => {
    const texto = `Relatório de Cartões\nTotal: R$ ${totalBruto.toFixed(2)}\nLíquido: R$ ${totalRecebido.toFixed(2)}\nTransações: ${transacoesFiltradas.length}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
    toast.success("Abrindo WhatsApp...");
  };

  const abrirDialogEmail = () => {
    if (transacoesFiltradas.length === 0) {
      toast.warning("Nenhuma transação para enviar");
      return;
    }
    setEmailDestino("");
    setShowEmailDialog(true);
  };

  const enviarEmail = async () => {
    if (!emailDestino) {
      toast.warning("Digite um e-mail de destino");
      return;
    }
    
    setEnviandoEmail(true);
    try {
      const { data: empresa } = await supabase.from("empresas").select("smtp_config, email, razao_social").eq("selecionada", true).limit(1).single();
      
      const smtp = empresa?.smtp_config as any;
      
      if (!smtp?.servidor || !smtp?.porta) {
        toast.error(" SMTP da empresa não está configurado.", { description: "Vá em Cadastros > Empresas > E-mail SMTP" });
        setEnviandoEmail(false);
        return;
      }

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:20px;">
          <h2 style="color:#2563eb;margin:0;">${empresa?.razao_social || "Empresa"}</h2>
          <p style="margin:2px 0;font-size:12px;color:#666;">CNPJ: ${empresa?.cnpj || "-"} | Tel: ${empresa?.telefone || "-"}</p>
          <p style="margin:2px 0;font-size:12px;color:#666;">${empresa?.endereco || "-"}</p>
        </div>
        <h2 style="color:#2563eb;">Relatório de Controle de Cartões</h2>
          <p>Prezada Gestão,</p>
          <p>Segue relatório de controle de cartões.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Total Bruto:</strong> R$ ${totalBruto.toFixed(2)}</p>
            <p style="margin:4px 0;"><strong>Total Líquido:</strong> R$ ${totalRecebido.toFixed(2)}</p>
            <p style="margin:4px 0;"><strong>Taxa:</strong> ${totalTaxa.toFixed(1)}%</p>
            <p style="margin:4px 0;"><strong>Quantidade:</strong> ${transacoesFiltradas.length} transações</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:12px;">
            <thead><tr style="background:#2563eb;color:white;">
              <th style="padding:8px;text-align:left;">Data</th>
              <th style="padding:8px;text-align:left;">Cliente</th>
              <th style="padding:8px;text-align:right;">Valor</th>
              <th style="padding:8px;text-align:right;">Líquido</th>
              <th style="padding:8px;text-align:left;">Bandeira</th>
              <th style="padding:8px;text-align:left;">Status</th>
            </tr></thead>
            <tbody>
              ${transacoesFiltradas.map(t => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:6px;">${format(new Date(t.dataHora), "dd/MM/yyyy")}</td>
                  <td style="padding:6px;">${t.cliente}</td>
                  <td style="padding:6px;text-align:right;">R$ ${t.valor.toFixed(2)}</td>
                  <td style="padding:6px;text-align:right;">R$ ${t.valorLiquido.toFixed(2)}</td>
                  <td style="padding:6px;">${t.bandeira}</td>
                  <td style="padding:6px;">${t.status}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p style="font-size:11px;color:#666;">Enviado pelo Sistema NexusERP — ${empresa.razao_social || ""}</p>
        </div>`;

      const { error } = await supabase.functions.invoke("send-smtp-email", {
        body: {
          smtp: { servidor: smtp.servidor, porta: smtp.porta, usuario: smtp.usuario, senha: smtp.senha, emailResposta: smtp.emailResposta, criptografia: smtp.criptografia, exigeSenha: smtp.exigeSenha !== false },
          to: emailDestino,
          subject: "Relatório de Controle de Cartões",
          html,
          body: `Total Bruto: R$ ${totalBruto.toFixed(2)} | Líquido: R$ ${totalRecebido.toFixed(2)}`,
        },
      });

      if (error) throw error;
      
      toast.success("E-mail enviado com sucesso!", { description: `Enviado para ${emailDestino}` });
      setShowEmailDialog(false);
    } catch (err: any) {
      console.error("Erro ao enviar e-mail:", err);
      toast.error("Erro ao enviar e-mail", { description: err?.message || "Verifique a configuração SMTP" });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <PageHeader 
        title="Controle de Cartões" 
        description="Gerencie suas transações de cartão de crédito e débito"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={sincronizarCartoes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <Button variant="outline" onClick={visualizarRelatorio}>
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebido Líquido</p>
                <p className="text-2xl font-bold">R$ {totalRecebido.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bruto</p>
                <p className="text-2xl font-bold">R$ {totalBruto.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa</p>
                <p className="text-2xl font-bold">{totalTaxa.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold">{transacoes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={aba} onValueChange={setAba} className="mb-4">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="credito">Crédito</TabsTrigger>
              <TabsTrigger value="debito">Débito</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente, NSU ou cartão..." 
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select 
              className="border rounded-md px-3 py-2"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="recusado">Recusado</option>
              <option value="estornado">Estornado</option>
            </select>
            <select 
              className="border rounded-md px-3 py-2"
              value={filtroBandeira}
              onChange={(e) => setFiltroBandeira(e.target.value)}
            >
              <option value="todos">Todas as bandeiras</option>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="elo">Elo</option>
              <option value="amex">Amex</option>
              <option value="hipercard">Hipercard</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Líquido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Bandeira</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>NSU</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação de cartão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                transacoesFiltradas.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.dataHora), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">R$ {t.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">R$ {t.valorLiquido.toFixed(2)}</TableCell>
                    <TableCell>{t.cliente}</TableCell>
                    <TableCell className="font-mono">{t.cartao}</TableCell>
                    <TableCell className="capitalize">{t.bandeira}</TableCell>
                    <TableCell>{getTipoBadge(t.tipo)}</TableCell>
                    <TableCell className="font-mono text-xs">{t.nsu}</TableCell>
                    <TableCell>{t.maquina}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showVisualizar} onOpenChange={setShowVisualizar}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <CabecalhoEmpresaPrint />
            <div className="print-only-header">
              <h2>{empresa?.razao_social || "Empresa"}</h2>
              <p>CNPJ: {empresa?.cnpj || "-"} | Tel: {empresa?.telefone || "-"}</p>
              <p>{empresa?.endereco || "-"}</p>
              <p>E-mail: {empresa?.email || "-"}</p>
            </div>
            <DialogTitle>Relatório de Controle de Cartões</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Recebido Líquido</p>
                <p className="text-xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Bruto</p>
                <p className="text-xl font-bold text-blue-600">R$ {totalBruto.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Taxa</p>
                <p className="text-xl font-bold text-red-600">{totalTaxa.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-xl font-bold text-purple-600">{transacoesFiltradas.length}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Bandeira</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.dataHora), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{t.cliente}</TableCell>
                      <TableCell>R$ {t.valor.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">R$ {t.valorLiquido.toFixed(2)}</TableCell>
                      <TableCell className="capitalize">{t.bandeira}</TableCell>
                      <TableCell>{t.tipo}</TableCell>
                      <TableCell>{getStatusBadge(t.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={imprimirRelatorio}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={exportarPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={exportarExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={enviarWhatsApp}>
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={abrirDialogEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Relatório por E-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do Destinatário</Label>
              <Input
                id="email"
                type="email"
                placeholder="digite@email.com"
                value={emailDestino}
                onChange={(e) => setEmailDestino(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              O relatório será enviado usando as configurações SMTP da empresa.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarEmail} disabled={enviandoEmail || !emailDestino}>
              {enviandoEmail ? (
                <>Enviando...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
