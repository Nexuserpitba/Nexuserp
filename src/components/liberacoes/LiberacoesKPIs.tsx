import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, TrendingUp, Users } from "lucide-react";

interface LiberacoesKPIsProps {
  totalLiberacoes: number;
  totalGeral: number;
  totalExcedente: number;
  clientesDistintos: number;
}

export default function LiberacoesKPIs({ totalLiberacoes, totalGeral, totalExcedente, clientesDistintos }: LiberacoesKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <ShieldCheck size={14} /> Total de Liberações
          </div>
          <p className="text-2xl font-bold">{totalLiberacoes}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp size={14} /> Valor Total Autorizado
          </div>
          <p className="text-2xl font-bold font-mono">R$ {totalGeral.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp size={14} /> Total Excedente
          </div>
          <p className="text-2xl font-bold font-mono text-destructive">R$ {totalExcedente.toFixed(2)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users size={14} /> Clientes Distintos
          </div>
          <p className="text-2xl font-bold">{clientesDistintos}</p>
        </CardContent>
      </Card>
    </div>
  );
}
