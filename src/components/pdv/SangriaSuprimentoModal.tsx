import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";

interface Props {
  open: boolean;
  onClose: () => void;
  tipo: "sangria" | "suprimento";
  onConfirm: (valor: number, motivo: string) => void;
}

export function SangriaSuprimentoModal({ open, onClose, tipo, onConfirm }: Props) {
  const [valor, setValor] = useState(0);
  const [motivo, setMotivo] = useState("");

  const isSangria = tipo === "sangria";
  const titulo = isSangria ? "Sangria de Caixa" : "Suprimento de Caixa";
  const descricao = isSangria
    ? "Retirada de valores do caixa"
    : "Entrada de valores no caixa";

  const handleConfirm = () => {
    if (valor <= 0) return;
    onConfirm(valor, motivo);
    setValor(0);
    setMotivo("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSangria ? (
              <ArrowDownCircle size={20} className="text-destructive" />
            ) : (
              <ArrowUpCircle size={20} className="text-green-600" />
            )}
            {titulo}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <CurrencyInput
              value={valor}
              onValueChange={setValor}
              className="text-2xl font-mono font-bold text-right h-14"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
            />
          </div>
          <div className="space-y-2">
            <Label>Motivo / Observação</Label>
            <Textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder={isSangria ? "Ex: Pagamento de fornecedor, troco..." : "Ex: Fundo de troco, reforço..."}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleConfirm}
            className={isSangria ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : "bg-accent hover:bg-accent/90 text-accent-foreground"}
            disabled={valor <= 0}
          >
            {isSangria ? "Registrar Sangria" : "Registrar Suprimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
