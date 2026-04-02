import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, Search, Eye } from "lucide-react";
import { DanfeNFCe } from "./DanfeNFCe";
import { toast } from "sonner";
import { useRef, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export interface UltimoCupom {
  numero: string;
  chave: string;
  items: { id: number; codigo: string; descricao: string; quantidade: number; preco: number; desconto?: number }[];
  subtotal: number;
  pagamentos: { forma: string; valor: number }[];
  troco: number;
  cpf: string;
  dataEmissao: Date;
  descontoGeral?: { tipo: "percent" | "value"; valor: number; calculado: number };
  operador?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cupom: UltimoCupom | null;
}

function getHistoricoCupons(): UltimoCupom[] {
  try {
    const stored = localStorage.getItem("pdv-cupons-historico");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((c: any) => ({ ...c, dataEmissao: new Date(c.dataEmissao) }));
  } catch {
    return [];
  }
}

export function salvarCupomHistorico(cupom: UltimoCupom) {
  const historico = getHistoricoCupons();
  historico.push({ ...cupom, dataEmissao: cupom.dataEmissao });
  localStorage.setItem("pdv-cupons-historico", JSON.stringify(historico));
}

export function ReimprimirCupomModal({ open, onClose, cupom }: Props) {
  const danfeRef = useRef<HTMLDivElement>(null);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [cupomSelecionado, setCupomSelecionado] = useState<UltimoCupom | null>(null);
  const [visualizando, setVisualizando] = useState(false);

  const historico = useMemo(() => (open ? getHistoricoCupons() : []), [open]);

  const cupomsFiltrados = useMemo(() => {
    let lista = historico;
    if (dataInicio) {
      const inicio = new Date(dataInicio + "T00:00:00");
      lista = lista.filter(c => new Date(c.dataEmissao) >= inicio);
    }
    if (dataFim) {
      const fim = new Date(dataFim + "T23:59:59");
      lista = lista.filter(c => new Date(c.dataEmissao) <= fim);
    }
    return lista.sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime());
  }, [historico, dataInicio, dataFim]);

  const cupomExibido = visualizando ? cupomSelecionado : null;

  const handleImprimir = (ref: HTMLDivElement | null) => {
    if (!ref) return;
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) {
      toast.error("Pop-up bloqueado. Permita pop-ups para imprimir.");
      return;
    }
    printWindow.document.write(`
      <html><head><title>Reimpressão NFC-e</title>
      <style>body{margin:0;padding:10px;font-family:monospace;font-size:11px;}</style>
      </head><body>${ref.innerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
    toast.success("Cupom enviado para impressão");
  };

  const handleVoltar = () => {
    setVisualizando(false);
    setCupomSelecionado(null);
  };

  const handleClose = () => {
    setVisualizando(false);
    setCupomSelecionado(null);
    setDataInicio("");
    setDataFim("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="text-primary" size={20} />
            Reimpressão de Cupom
          </DialogTitle>
        </DialogHeader>

        {cupomExibido ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              NFC-e nº <span className="font-bold text-foreground">{cupomExibido.numero}</span> —{" "}
              {format(new Date(cupomExibido.dataEmissao), "dd/MM/yyyy HH:mm")}
            </p>
            <div ref={danfeRef} className="flex justify-center">
              <DanfeNFCe
                numero={cupomExibido.numero}
                chave={cupomExibido.chave}
                items={cupomExibido.items}
                subtotal={cupomExibido.subtotal}
                pagamentos={cupomExibido.pagamentos}
                troco={cupomExibido.troco}
                cpf={cupomExibido.cpf}
                dataEmissao={new Date(cupomExibido.dataEmissao)}
                descontoGeral={cupomExibido.descontoGeral}
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => handleImprimir(danfeRef.current)} className="gap-2">
                <Printer size={16} /> Reimprimir
              </Button>
              <Button variant="outline" onClick={handleVoltar}>Voltar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filtro por data */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => { setDataInicio(""); setDataFim(""); }}>
                <Search size={16} />
              </Button>
            </div>

            {/* Lista de cupons */}
            {cupomsFiltrados.length > 0 ? (
              <div className="border rounded-md divide-y max-h-[40vh] overflow-y-auto">
                {cupomsFiltrados.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <div className="text-sm">
                      <p className="font-medium">NFC-e nº {c.numero}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.dataEmissao), "dd/MM/yyyy HH:mm")} — R$ {c.subtotal.toFixed(2)}
                        {c.cpf && ` — CPF: ${c.cpf}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setCupomSelecionado(c); setVisualizando(true); }}>
                        <Eye size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {historico.length === 0
                    ? "Nenhum cupom emitido nesta sessão."
                    : "Nenhum cupom encontrado no período selecionado."}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
