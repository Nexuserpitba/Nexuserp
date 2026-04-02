import { forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface ItemVenda {
  id: number;
  codigo: string;
  barras: string;
  descricao: string;
  quantidade: number;
  preco: number;
  imagem?: string;
}

interface Props {
  lastItem: ItemVenda | null;
  barcode: string;
  quantidade: string;
  itemCount: number;
  onBarcodeChange: (v: string) => void;
  onQuantidadeChange: (v: string) => void;
  onBarcodeSubmit: () => void;
}

export const PDVInputPanel = forwardRef<HTMLInputElement, Props>(
  ({ lastItem, barcode, quantidade, itemCount, onBarcodeChange, onQuantidadeChange, onBarcodeSubmit }, ref) => {
    return (
      <div className="w-[340px] flex flex-col bg-card border-r border-border shrink-0">
        {/* Input Fields */}
        <div className="p-3 space-y-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Código / Barras [F5]
            </label>
            <Input
              ref={ref}
              placeholder="Leia ou digite o código..."
              value={barcode}
              onChange={e => onBarcodeChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onBarcodeSubmit()}
              className="h-10 text-lg font-mono font-bold mt-0.5 border-primary/40 focus-visible:ring-primary/50 bg-background"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qtd</label>
              <Input
                value={quantidade}
                onChange={e => onQuantidadeChange(e.target.value)}
                className="h-9 text-base font-mono font-bold text-right mt-0.5 bg-background"
                type="number"
                min="1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vlr. Unit.</label>
              <Input
                value={lastItem ? `R$ ${lastItem.preco.toFixed(2)}` : "R$ 0,00"}
                readOnly
                className="h-9 text-base font-mono font-bold text-right mt-0.5 bg-muted/50 text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Item</label>
            <Input
              value={lastItem ? `R$ ${(lastItem.preco * lastItem.quantidade).toFixed(2)}` : "R$ 0,00"}
              readOnly
              className="h-11 text-2xl font-mono font-bold text-right mt-0.5 bg-primary/5 text-primary border-primary/20"
            />
          </div>
        </div>

        {/* Last item info */}
        <div className="flex-1 flex flex-col justify-end p-3">
          <div className="rounded-lg border border-border bg-muted/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</span>
              <span className="text-[10px] text-muted-foreground font-mono">{itemCount} item(ns)</span>
            </div>
            {lastItem ? (
              <p className="text-foreground text-xs font-medium mt-1 truncate">{lastItem.descricao}</p>
            ) : (
              <p className="text-muted-foreground text-[11px] mt-1">Aguardando leitura...</p>
            )}
          </div>
        </div>
      </div>
    );
  }
);

PDVInputPanel.displayName = "PDVInputPanel";
