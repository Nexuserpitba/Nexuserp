import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Download, Printer, FileText, XCircle, Mail } from "lucide-react";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";

interface NFSe {
  id: string;
  numero: string;
  dataEmissao: string;
  prestador: string;
  tomador: string;
  cpfCnpjTomador: string;
  servico: string;
  valor: number;
  iss: number;
  status: "emitida" | "cancelada" | "substituida";
  protocolo: string;
  codigoVerificacao: string;
}

const nfseMock: NFSe[] = [
  { id: "1", numero: "000123", dataEmissao: "2025-03-01", prestador: "Empresa Exemplo Serviços Ltda", tomador: "João Silva", cpfCnpjTomador: "123.456.789-00", servico: "01.01 — Análise e desenvolvimento de sistemas", valor: 5000, iss: 250, status: "emitida", protocolo: "PROT2025030100123", codigoVerificacao: "ABCD-1234-EFGH" },
  { id: "2", numero: "000124", dataEmissao: "2025-03-05", prestador: "Empresa Exemplo Serviços Ltda", tomador: "Maria Oliveira ME", cpfCnpjTomador: "12.345.678/0001-90", servico: "17.01 — Assessoria ou consultoria", valor: 8500, iss: 425, status: "emitida", protocolo: "PROT2025030500124", codigoVerificacao: "WXYZ-5678-IJKL" },
  { id: "3", numero: "000125", dataEmissao: "2025-03-10", prestador: "Empresa Exemplo Serviços Ltda", tomador: "Carlos Santos", cpfCnpjTomador: "987.654.321-00", servico: "01.04 — Elaboração de programas de computadores", valor: 15000, iss: 750, status: "cancelada", protocolo: "PROT2025031000125", codigoVerificacao: "MNOP-9012-QRST" },
  { id: "4", numero: "000126", dataEmissao: "2025-03-15", prestador: "Empresa Exemplo Serviços Ltda", tomador: "Tech Solutions Ltda", cpfCnpjTomador: "98.765.432/0001-10", servico: "01.02 — Programação", valor: 12000, iss: 600, status: "emitida", protocolo: "PROT2025031500126", codigoVerificacao: "UVWX-3456-YZAB" },
  { id: "5", numero: "000127", dataEmissao: "2025-03-20", prestador: "Empresa Exemplo Serviços Ltda", tomador: "Ana Beatriz Costa", cpfCnpjTomador: "456.789.123-00", servico: "17.01 — Assessoria ou consultoria", valor: 3200, iss: 160, status: "emitida", protocolo: "PROT2025032000127", codigoVerificacao: "CDEF-7890-GHIJ" },
];

export default function ConsultaNFSe() {
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroTomador, setFiltroTomador] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [selectedNfse, setSelectedNfse] = useState<NFSe | null>(null);
  const { toast } = useToast();

  const filtered = nfseMock.filter(n => {
    if (filtroNumero && !n.numero.includes(filtroNumero)) return false;
    if (filtroTomador && !n.tomador.toLowerCase().includes(filtroTomador.toLowerCase())) return false;
    if (filtroStatus !== "todos" && n.status !== filtroStatus) return false;
    return true;
  });

  const totalEmitidas = filtered.filter(n => n.status === "emitida").length;
  const totalValor = filtered.filter(n => n.status === "emitida").reduce((s, n) => s + n.valor, 0);
  const totalIss = filtered.filter(n => n.status === "emitida").reduce((s, n) => s + n.iss, 0);

  const statusBadge = (status: NFSe["status"]) => {
    switch (status) {
      case "emitida": return <Badge className="bg-green-600 text-white">Emitida</Badge>;
      case "cancelada": return <Badge variant="destructive">Cancelada</Badge>;
      case "substituida": return <Badge variant="secondary">Substituída</Badge>;
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Consulta NFS-e" description="Consulte e gerencie as NFS-e emitidas" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">NFS-e Emitidas</p><p className="text-2xl font-bold">{totalEmitidas}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">Valor Total</p><p className="text-2xl font-bold text-primary">R$ {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-xs text-muted-foreground">ISS Total</p><p className="text-2xl font-bold text-destructive">R$ {totalIss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></CardContent></Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Número NFS-e</Label>
              <Input placeholder="Ex: 000123" value={filtroNumero} onChange={e => setFiltroNumero(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tomador</Label>
              <Input placeholder="Nome do tomador" value={filtroTomador} onChange={e => setFiltroTomador(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="emitida">Emitida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="substituida">Substituída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full"><Search size={16} /> Buscar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tomador</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">ISS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(nfse => (
                <TableRow key={nfse.id}>
                  <TableCell className="font-mono font-medium">{nfse.numero}</TableCell>
                  <TableCell>{new Date(nfse.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{nfse.tomador}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{nfse.servico}</TableCell>
                  <TableCell className="text-right">R$ {nfse.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">R$ {nfse.iss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{statusBadge(nfse.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setSelectedNfse(nfse)} title="Visualizar"><Eye size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toast({ title: "PDF gerado", description: `NFS-e ${nfse.numero} baixada.` })} title="Download PDF"><Download size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => toast({ title: "E-mail enviado", description: `NFS-e ${nfse.numero} enviada por e-mail.` })} title="Enviar por e-mail"><Mail size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma NFS-e encontrada.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Detalhes */}
      <Dialog open={!!selectedNfse} onOpenChange={() => setSelectedNfse(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText size={18} /> NFS-e nº {selectedNfse?.numero}</DialogTitle>
            <DialogDescription>Detalhes da Nota Fiscal de Serviço Eletrônica</DialogDescription>
          </DialogHeader>
          {selectedNfse && (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                {statusBadge(selectedNfse.status)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Data:</span> <span className="font-medium">{new Date(selectedNfse.dataEmissao).toLocaleDateString("pt-BR")}</span></div>
                <div><span className="text-muted-foreground">Protocolo:</span> <span className="font-mono text-xs">{selectedNfse.protocolo}</span></div>
                <div className="col-span-2"><span className="text-muted-foreground">Cód. Verificação:</span> <span className="font-mono">{selectedNfse.codigoVerificacao}</span></div>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold">Tomador</p>
                <p>{selectedNfse.tomador} — {selectedNfse.cpfCnpjTomador}</p>
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold">Serviço</p>
                <p>{selectedNfse.servico}</p>
              </div>
              <div className="border-t pt-3 grid grid-cols-3 gap-4 text-center">
                <div><p className="text-xs text-muted-foreground">Valor</p><p className="font-bold">R$ {selectedNfse.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-xs text-muted-foreground">ISS</p><p className="font-bold text-destructive">R$ {selectedNfse.iss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
                <div><p className="text-xs text-muted-foreground">Líquido</p><p className="font-bold text-primary">R$ {(selectedNfse.valor - selectedNfse.iss).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  printPDF({
                    title: `NFS-e nº ${selectedNfse.numero}`,
                    subtitle: `Emissão: ${new Date(selectedNfse.dataEmissao).toLocaleDateString("pt-BR")} | Protocolo: ${selectedNfse.protocolo}`,
                    content: `
                      <div class="info-grid">
                        <div class="info-box"><div class="label">Tomador</div><div class="value" style="font-size:13px">${selectedNfse.tomador}</div></div>
                        <div class="info-box"><div class="label">CPF/CNPJ</div><div class="value" style="font-size:13px">${selectedNfse.cpfCnpjTomador}</div></div>
                      </div>
                      <p style="margin:8px 0"><strong>Serviço:</strong> ${selectedNfse.servico}</p>
                      <p><strong>Cód. Verificação:</strong> ${selectedNfse.codigoVerificacao}</p>
                      <div class="info-grid" style="margin-top:16px">
                        <div class="info-box"><div class="label">Valor</div><div class="value">${printCurrency(selectedNfse.valor)}</div></div>
                        <div class="info-box"><div class="label">ISS</div><div class="value negative">${printCurrency(selectedNfse.iss)}</div></div>
                        <div class="info-box"><div class="label">Líquido</div><div class="value positive">${printCurrency(selectedNfse.valor - selectedNfse.iss)}</div></div>
                      </div>
                    `,
                  });
                }}><Download size={14} /> PDF</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  printPDF({
                    title: `NFS-e nº ${selectedNfse.numero}`,
                    subtitle: `Emissão: ${new Date(selectedNfse.dataEmissao).toLocaleDateString("pt-BR")}`,
                    content: `
                      <p><strong>Tomador:</strong> ${selectedNfse.tomador} — ${selectedNfse.cpfCnpjTomador}</p>
                      <p><strong>Serviço:</strong> ${selectedNfse.servico}</p>
                      <div class="info-grid" style="margin-top:12px">
                        <div class="info-box"><div class="label">Valor</div><div class="value">${printCurrency(selectedNfse.valor)}</div></div>
                        <div class="info-box"><div class="label">ISS</div><div class="value negative">${printCurrency(selectedNfse.iss)}</div></div>
                        <div class="info-box"><div class="label">Líquido</div><div class="value positive">${printCurrency(selectedNfse.valor - selectedNfse.iss)}</div></div>
                      </div>
                    `,
                  });
                }}><Printer size={14} /> Imprimir</Button>
                {selectedNfse.status === "emitida" && (
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => { toast({ title: "Cancelamento", description: "Use a tela de cancelamento para solicitar." }); setSelectedNfse(null); }}><XCircle size={14} /> Cancelar</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
