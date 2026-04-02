import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensagem: string;
}

export function ConfirmarCancelamentoModal({ open, onClose, onConfirm, titulo, mensagem }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">{mensagem}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Não</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>Sim, Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
