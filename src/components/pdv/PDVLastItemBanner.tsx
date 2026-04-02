import { ShoppingCart } from "lucide-react";

interface ItemVenda {
  id: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  preco: number;
}

interface Props {
  lastItem: ItemVenda | null;
}

export function PDVLastItemBanner({ lastItem }: Props) {
  return (
    <div className="h-10 bg-muted/30 border-b border-border/50 flex items-center justify-center px-4 shrink-0">
      {lastItem ? (
        <div className="flex items-center gap-3">
          <ShoppingCart size={14} className="text-primary/60" />
          <span className="text-primary font-bold text-base tracking-wide">
            {lastItem.quantidade} × {lastItem.descricao.toUpperCase()}
          </span>
          <span className="text-muted-foreground font-mono text-sm">
            R$ {(lastItem.preco * lastItem.quantidade).toFixed(2)}
          </span>
        </div>
      ) : (
        <span className="text-muted-foreground/60 text-sm">
          Leia um código de barras ou pressione F5 para buscar produtos
        </span>
      )}
    </div>
  );
}
