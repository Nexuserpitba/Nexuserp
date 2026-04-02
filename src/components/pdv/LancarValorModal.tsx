import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (descricao: string, valor: number, quantidade: number) => void;
}

export function LancarValorModal({ open, onClose, onConfirm }: Props) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState(0);
  const [quantidade, setQuantidade] = useState("1");

  useEffect(() => {
    if (open) {
      setDescricao("");
      setValor(0);
      setQuantidade("1");
    }
  }, [open]);

  const handleConfirm = () => {
    const q = parseInt(quantidade) || 1;
    if (!descricao.trim() || valor <= 0) return;
    onConfirm(descricao, valor, q);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={20} className="text-primary" />
            Lançar Valor Manual - F10
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição do Item</Label>
            <Input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Serviço de instalação"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor Unitário (R$)</Label>
              <CurrencyInput
                value={valor}
                onValueChange={setValor}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={e => setQuantidade(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          {valor > 0 && descricao && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <span className="text-muted-foreground text-sm">Total: </span>
              <span className="font-mono font-bold text-primary text-lg">
                R$ {formatCurrencyBRL(valor * (parseInt(quantidade) || 1))}
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!descricao.trim() || valor <= 0}>
            Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
