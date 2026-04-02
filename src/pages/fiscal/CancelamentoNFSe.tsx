import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CancelamentoRegistro {
  id: string;
  numeroNfse: string;
  dataEmissao: string;
  tomador: string;
  valor: number;
  dataCancelamento: string;
  motivo: string;
  protocolo: string;
  status: "pendente" | "aprovado" | "rejeitado";
}

const cancelamentosMock: CancelamentoRegistro[] = [
  { id: "1", numeroNfse: "000125", dataEmissao: "2025-03-10", tomador: "Carlos Santos", valor: 15000, dataCancelamento: "2025-03-12", motivo: "Serviço não prestado conforme contrato", protocolo: "CANC2025031200001", status: "aprovado" },
  { id: "2", numeroNfse: "000120", dataEmissao: "2025-02-15", tomador: "Empresa ABC Ltda", valor: 7500, dataCancelamento: "2025-02-20", motivo: "Erro na discriminação do serviço", protocolo: "CANC2025022000002", status: "pendente" },
];

export default function CancelamentoNFSe() {
  const [buscarNumero, setBuscarNumero] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [nfseSelecionada, setNfseSelecionada] = useState<{ numero: string; tomador: string; valor: number } | null>(null);
  const { toast } = useToast();

  const handleBuscar = () => {
    if (!buscarNumero.trim()) {
      toast({ title: "Informe o número", description: "Digite o número da NFS-e para buscar.", variant: "destructive" });
      return;
    }
    setNfseSelecionada({ numero: buscarNumero, tomador: "Cliente Exemplo", valor: 5000 });
    setModalAberto(true);
  };

  const handleConfirmarCancelamento = () => {
    if (!motivo.trim() || motivo.length < 15) {
      toast({ title: "Justificativa obrigatória", description: "A justificativa deve ter no mínimo 15 caracteres.", variant: "destructive" });
      return;
    }
    toast({
      title: "Cancelamento Solicitado",
      description: `NFS-e nº ${nfseSelecionada?.numero} enviada para cancelamento na prefeitura. Protocolo: CANC${Date.now()}`,
    });
    setModalAberto(false);
    setMotivo("");
    setNfseSelecionada(null);
    setBuscarNumero("");
  };

  const statusBadge = (status: CancelamentoRegistro["status"]) => {
    switch (status) {
      case "aprovado": return <Badge className="bg-green-600 text-white"><CheckCircle2 size={12} className="mr-1" />Aprovado</Badge>;
      case "pendente": return <Badge variant="secondary"><AlertTriangle size={12} className="mr-1" />Pendente</Badge>;
      case "rejeitado": return <Badge variant="destructive"><XCircle size={12} className="mr-1" />Rejeitado</Badge>;
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Cancelamento de NFS-e" description="Solicite o cancelamento de NFS-e junto à prefeitura" />

      {/* Buscar NFS-e */}
      <Card>
        <CardHeader><CardTitle className="text-base">Solicitar Cancelamento</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Número da NFS-e</Label>
              <Input placeholder="Ex: 000123" value={buscarNumero} onChange={e => setBuscarNumero(e.target.value)} />
            </div>
            <Button onClick={handleBuscar}><Search size={16} /> Buscar NFS-e</Button>
          </div>
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Atenção:</strong> O cancelamento de NFS-e é irreversível e está sujeito às regras da prefeitura do município.</p>
                <p>• Prazo máximo para cancelamento: geralmente até 6 meses da emissão (varia por município)</p>
                <p>• É obrigatório informar a justificativa do cancelamento</p>
                <p>• NFS-e com ISS recolhido pode exigir processo administrativo</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Cancelamentos</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NFS-e</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Tomador</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Cancelamento</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancelamentosMock.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-medium">{c.numeroNfse}</TableCell>
                  <TableCell>{new Date(c.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{c.tomador}</TableCell>
                  <TableCell className="text-right">R$ {c.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{new Date(c.dataCancelamento).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs">{c.motivo}</TableCell>
                  <TableCell className="font-mono text-xs">{c.protocolo}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Cancelamento */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><XCircle size={18} /> Cancelar NFS-e</DialogTitle>
            <DialogDescription>Confirme o cancelamento da NFS-e junto à prefeitura</DialogDescription>
          </DialogHeader>
          {nfseSelecionada && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="text-sm"><strong>NFS-e nº:</strong> {nfseSelecionada.numero}</p>
                <p className="text-sm"><strong>Tomador:</strong> {nfseSelecionada.tomador}</p>
                <p className="text-sm"><strong>Valor:</strong> R$ {nfseSelecionada.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-2">
                <Label>Justificativa do Cancelamento *</Label>
                <Textarea rows={3} placeholder="Descreva o motivo do cancelamento (mínimo 15 caracteres)..." value={motivo} onChange={e => setMotivo(e.target.value)} />
                <p className="text-xs text-muted-foreground">{motivo.length}/15 caracteres mínimos</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Voltar</Button>
            <Button variant="destructive" onClick={handleConfirmarCancelamento}><XCircle size={16} /> Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
