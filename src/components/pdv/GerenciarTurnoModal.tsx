import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Play, Square } from "lucide-react";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";

interface TurnoAtivo {
  id: string;
  operador: string;
  inicio: string;
  valorAbertura: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  turnoAtivo: TurnoAtivo | null;
  onAbrirTurno: (operador: string, valorAbertura: number) => void;
  onFecharTurno: () => void;
}

export function GerenciarTurnoModal({ open, onClose, turnoAtivo, onAbrirTurno, onFecharTurno }: Props) {
  const [operador, setOperador] = useState("ADMIN");
  const [valorAbertura, setValorAbertura] = useState(0);

  const handleAbrir = () => {
    onAbrirTurno(operador, valorAbertura);
    setValorAbertura(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            Gerenciar Turno
          </DialogTitle>
        </DialogHeader>

        {turnoAtivo ? (
          <div className="space-y-4 py-2">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-success font-bold">
                <Play size={14} /> Turno Ativo
              </div>
              <p className="text-sm text-foreground">Operador: <strong>{turnoAtivo.operador}</strong></p>
              <p className="text-xs text-muted-foreground">Início: {turnoAtivo.inicio}</p>
              <p className="text-xs text-muted-foreground">Fundo de troco: R$ {formatCurrencyBRL(turnoAtivo.valorAbertura)}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Voltar</Button>
              <Button variant="destructive" onClick={() => { onFecharTurno(); onClose(); }}>
                <Square size={14} className="mr-1" /> Fechar Turno
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhum turno aberto. Inicie um novo turno para operar o caixa.</p>
            </div>
            <div className="space-y-2">
              <Label>Operador</Label>
              <Select value={operador} onValueChange={setOperador}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="OPERADOR 1">OPERADOR 1</SelectItem>
                  <SelectItem value="OPERADOR 2">OPERADOR 2</SelectItem>
                  <SelectItem value="OPERADOR 3">OPERADOR 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor de Abertura / Fundo de Troco (R$)</Label>
              <CurrencyInput
                value={valorAbertura}
                onValueChange={setValorAbertura}
                className="text-xl font-mono font-bold text-right h-12"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleAbrir()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleAbrir}>
                <Play size={14} className="mr-1" /> Abrir Turno
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
