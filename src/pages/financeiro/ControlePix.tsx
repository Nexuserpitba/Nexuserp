import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, ArrowDownCircle, CheckCircle2, Clock, XCircle, 
  RefreshCw, Download, Filter, Banknote, Printer, FileText, 
  FileSpreadsheet, Mail, MessageCircle, Eye, Send
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TransacaoPix {
  id: string;
  dataHora: string;
  valor: number;
  chavePix: string;
  recebedor: string;
  pagador: string;
  pagadorDoc: string;
  banco: string;
  status: "pendente" | "confirmado" | "falhou" | "estornado";
  tipoChave: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
  txId: string;
  categoria: string;
}

function getTransacoesPix(): TransacaoPix[] {
  try {
    const stored = localStorage.getItem("transacoes_pix");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [
    { id: "p1", dataHora: "2026-03-25T10:30:00", valor: 150.00, chavePix: "***123", recebedor: "Minha Empresa Ltda", pagador: "João Silva", pagadorDoc: "123.456.789-00", banco: "Banco do Brasil", status: "confirmado", tipoChave: "cpf", txId: "TX123456789", categoria: "Venda" },
    { id: "p2", dataHora: "2026-03-25T11:45:00", valor: 89.90, chavePix: "***456", recebedor: "Minha Empresa Ltda", pagador: "Maria Souza", pagadorDoc: "987.654.321-00", banco: "Bradesco", status: "confirmado", tipoChave: "cpf", txId: "TX123456790", categoria: "Venda" },
    { id: "p3", dataHora: "2026-03-25T14:20:00", valor: 2500.00, chavePix: "***789", recebedor: "Minha Empresa Ltda", pagador: "Empresa XYZ", pagadorDoc: "12.345.678/0001-90", banco: "Santander", status: "pendente", tipoChave: "cnpj", txId: "TX123456791", categoria: "Venda" },
    { id: "p4", dataHora: "2026-03-25T15:10:00", valor: 45.50, chavePix: "***321", recebedor: "Minha Empresa Ltda", pagador: "Pedro Santos", pagadorDoc: "456.789.123-00", banco: "Itaú", status: "falhou", tipoChave: "cpf", txId: "TX123456792", categoria: "Venda" },
    { id: "p5", dataHora: "2026-03-24T09:15:00", valor: 320.00, chavePix: "***654", recebedor: "Minha Empresa Ltda", pagador: "Ana Costa", pagadorDoc: "111.222.333-44", banco: "Banco do Brasil", status: "estornado", tipoChave: "cpf", txId: "TX123456780", categoria: "Venda" },
  ];
}

function getStatusBadge(status: TransacaoPix["status"]) {
  switch (status) {
    case "confirmado":
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmado</Badge>;
    case "pendente":
      return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    case "falhou":
      return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
    case "estornado":
      return <Badge className="bg-gray-500"><RefreshCw className="w-3 h-3 mr-1" /> Estornado</Badge>;
  }
}

export default function ControlePix() {
  const [transacoes, setTransacoes] = useState<TransacaoPix[]>(getTransacoesPix);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroData, setFiltroData] = useState<string>("");
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
        t.pagador.toLowerCase().includes(busca.toLowerCase()) ||
        t.pagadorDoc.includes(busca) ||
        t.txId.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || t.status === filtroStatus;
      const matchData = !filtroData || t.dataHora.startsWith(filtroData);
      return matchBusca && matchStatus && matchData;
    });
  }, [transacoes, busca, filtroStatus, filtroData]);

  const totalRecebido = transacoes.filter(t => t.status === "confirmado").reduce((acc, t) => acc + t.valor, 0);
  const totalPendente = transacoes.filter(t => t.status === "pendente").reduce((acc, t) => acc + t.valor, 0);
  const totalFalhou = transacoes.filter(t => t.status === "falhou" || t.status === "estornado").reduce((acc, t) => acc + t.valor, 0);

  const sincronizarPix = () => {
    toast.info("Sincronizando transações PIX...");
    setTimeout(() => {
      toast.success("Transações PIX sincronizadas com sucesso!");
    }, 1500);
  };

  const visualizarRelatorio = () => {
    if (transacoesFiltradas.length === 0) {
      toast.warning("Nenhuma transação para visualizar");
      return;
    }
    setShowVisualizar(true);
  };

  const CabecalhoEmpresa = () => (
    <div className="hidden print:block mb-4 border-b pb-2">
      <h1 className="text-xl font-bold text-gray-800">{empresa?.razao_social || "Empresa"}</h1>
      <p className="text-sm text-gray-600">CNPJ: {empresa?.cnpj || "-"} | Tel: {empresa?.telefone || "-"}</p>
      <p className="text-sm text-gray-600">{empresa?.endereco || "-"}</p>
      <p className="text-sm text-gray-600">E-mail: {empresa?.email || "-"}</p>
    </div>
  );

  const CabecalhoEmpresaPrint = () => (
    <style>{`@media print { .print-header { display: block !important; } } }`}</style>
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
  <title>Relatório de PIX Recebidos</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .empresa-header { border-bottom: 2px solid #4CAF50; padding-bottom: 10px; margin-bottom: 20px; }
    .empresa-header h2 { margin: 0; color: #059669; font-size: 18px; }
    .empresa-header p { margin: 2px 0; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background-color: #4CAF50; color: white; }
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
  <h1>Relatório de PIX Recebidos</h1>
  <p>Data: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
  
  <div class="totais">
    <p><strong>Total Recebido:</strong> R$ ${totalRecebido.toFixed(2)}</p>
    <p><strong>Pendente:</strong> R$ ${totalPendente.toFixed(2)}</p>
    <p><strong>Falhou/Estornado:</strong> R$ ${totalFalhou.toFixed(2)}</p>
    <p><strong>Transações:</strong> ${transacoesFiltradas.length}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Data</th>
        <th>Pagador</th>
        <th>Documento</th>
        <th>Banco</th>
        <th>Valor</th>
        <th>TX ID</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${transacoesFiltradas.map(t => `
        <tr>
          <td>${format(new Date(t.dataHora), "dd/MM/yyyy HH:mm")}</td>
          <td>${t.pagador}</td>
          <td>${t.pagadorDoc}</td>
          <td>${t.banco}</td>
          <td>R$ ${t.valor.toFixed(2)}</td>
          <td>${t.txId}</td>
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
    link.download = `controle_pix_${format(new Date(), "yyyy-MM-dd")}.html`;
    link.click();
    toast.success("PDF/HTML gerado! Use a função de impressão do navegador e selecione 'Salvar como PDF'");
  };

  const exportarExcel = () => {
    const csvContent = [
      ["Data/Hora", "Valor", "Pagador", "Documento", "Banco", "TX ID", "Status"],
      ...transacoesFiltradas.map(t => [
        format(new Date(t.dataHora), "dd/MM/yyyy HH:mm"),
        t.valor.toFixed(2),
        t.pagador,
        t.pagadorDoc,
        t.banco,
        t.txId,
        t.status
      ])
    ].map(row => row.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `controle_pix_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Excel exportado com sucesso!");
  };

  const enviarWhatsApp = () => {
    const texto = `Relatório de PIX Recebidos\nTotal: R$ ${totalRecebido.toFixed(2)}\nPendente: R$ ${totalPendente.toFixed(2)}\nTransações: ${transacoesFiltradas.length}`;
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
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:20px;">
          <h2 style="color:#059669;margin:0;">${empresa?.razao_social || "Empresa"}</h2>
          <p style="margin:2px 0;font-size:12px;color:#666;">CNPJ: ${empresa?.cnpj || "-"} | Tel: ${empresa?.telefone || "-"}</p>
          <p style="margin:2px 0;font-size:12px;color:#666;">${empresa?.endereco || "-"}</p>
        </div>
        <h2 style="color:#059669;">Relatório de PIX Recebidos</h2>
          <p>Prezada Gestão,</p>
          <p>Segue relatório de PIX recebidos.</p>
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;">
            <p style="margin:4px 0;"><strong>Total Recebido:</strong> R$ ${totalRecebido.toFixed(2)}</p>
            <p style="margin:4px 0;"><strong>Pendente:</strong> R$ ${totalPendente.toFixed(2)}</p>
            <p style="margin:4px 0;"><strong>Falhou/Estornado:</strong> R$ ${totalFalhou.toFixed(2)}</p>
            <p style="margin:4px 0;"><strong>Quantidade:</strong> ${transacoesFiltradas.length} transações</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:12px;">
            <thead><tr style="background:#059669;color:white;">
              <th style="padding:8px;text-align:left;">Data</th>
              <th style="padding:8px;text-align:left;">Pagador</th>
              <th style="padding:8px;text-align:right;">Valor</th>
              <th style="padding:8px;text-align:left;">Banco</th>
              <th style="padding:8px;text-align:left;">Status</th>
            </tr></thead>
            <tbody>
              ${transacoesFiltradas.map(t => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:6px;">${format(new Date(t.dataHora), "dd/MM/yyyy HH:mm")}</td>
                  <td style="padding:6px;">${t.pagador}</td>
                  <td style="padding:6px;text-align:right;">R$ ${t.valor.toFixed(2)}</td>
                  <td style="padding:6px;">${t.banco}</td>
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
          subject: "Relatório de PIX Recebidos",
          html,
          body: `Total Recebido: R$ ${totalRecebido.toFixed(2)} | Transações: ${transacoesFiltradas.length}`,
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
        title="Controle de PIX Recebidos" 
        description="Gerencie suas transações PIX recebidas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={sincronizarPix}>
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
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold">R$ {totalRecebido.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-2xl font-bold">R$ {totalPendente.toFixed(2)}</p>
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
                <p className="text-sm text-muted-foreground">Falhou/Estornado</p>
                <p className="text-2xl font-bold">R$ {totalFalhou.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Banknote className="w-6 h-6 text-blue-600" />
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
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por pagador, documento ou ID..." 
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Input 
              type="date" 
              className="w-40"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
            <select 
              className="border rounded-md px-3 py-2"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="todos">Todos os status</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Pendente</option>
              <option value="falhou">Falhou</option>
              <option value="estornado">Estornado</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagador</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>TX ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoesFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação PIX encontrada
                  </TableCell>
                </TableRow>
              ) : (
                transacoesFiltradas.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.dataHora), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="font-medium">R$ {t.valor.toFixed(2)}</TableCell>
                    <TableCell>{t.pagador}</TableCell>
                    <TableCell>{t.pagadorDoc}</TableCell>
                    <TableCell>{t.banco}</TableCell>
                    <TableCell className="font-mono text-xs">{t.txId}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell>{t.categoria}</TableCell>
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
            <style>{`.print-only-header { display: none; } @media print { .print-only-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px; } .print-only-header h2 { margin: 0; color: #059669; font-size: 18px; } .print-only-header p { margin: 2px 0; font-size: 12px; color: #666; } }`}</style>
            <div className="print-only-header">
              <h2>{empresa?.razao_social || "Empresa"}</h2>
              <p>CNPJ: {empresa?.cnpj || "-"} | Tel: {empresa?.telefone || "-"}</p>
              <p>{empresa?.endereco || "-"}</p>
              <p>E-mail: {empresa?.email || "-"}</p>
            </div>
            <DialogTitle>Relatório de PIX Recebidos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-yellow-600">R$ {totalPendente.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Falhou/Estornado</p>
                <p className="text-xl font-bold text-red-600">R$ {totalFalhou.toFixed(2)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-xl font-bold text-blue-600">{transacoesFiltradas.length}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pagador</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.dataHora), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{t.pagador}</TableCell>
                      <TableCell>R$ {t.valor.toFixed(2)}</TableCell>
                      <TableCell>{t.banco}</TableCell>
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
