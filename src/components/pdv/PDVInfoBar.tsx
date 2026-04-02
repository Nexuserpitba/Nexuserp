import { Badge } from "@/components/ui/badge";
import { Scale, Wifi, WifiOff, Clock } from "lucide-react";

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
}

interface Props {
  modoVenda: "varejo" | "atacado";
  modoOrcamento: boolean;
  cliente: Cliente | null;
  onToggleModoVenda: () => void;
  balancaAtiva: boolean;
  turnoAtivo: boolean;
}

export function PDVInfoBar({ modoVenda, modoOrcamento, cliente, onToggleModoVenda, balancaAtiva, turnoAtivo }: Props) {
  return (
    <div className="h-7 bg-muted/30 flex items-center px-4 gap-2 shrink-0 border-b border-border/50">
      <Badge
        variant="outline"
        className="text-[10px] py-0 h-5 cursor-pointer hover:bg-primary/10 transition-colors"
        onClick={onToggleModoVenda}
      >
        {modoVenda === "varejo" ? "● Varejo" : "● Atacado"}
      </Badge>

      {modoOrcamento && (
        <Badge className="bg-accent text-accent-foreground text-[10px] py-0 h-5 border-0">
          ● Orçamento
        </Badge>
      )}

      <Badge variant="outline" className="text-[10px] py-0 h-5 gap-1">
        {balancaAtiva ? <Wifi size={10} className="text-accent" /> : <WifiOff size={10} className="text-muted-foreground" />}
        Balança
      </Badge>

      <Badge variant="outline" className={`text-[10px] py-0 h-5 gap-1 ${turnoAtivo ? "border-accent/50 text-accent" : "border-destructive/50 text-destructive"}`}>
        <Clock size={10} />
        {turnoAtivo ? "Turno Aberto" : "Sem Turno"}
      </Badge>

      <div className="flex-1" />

      {cliente && (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 h-5">
          Cliente: {cliente.nome}
        </Badge>
      )}
    </div>
  );
}
