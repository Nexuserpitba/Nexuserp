import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Keyboard, Monitor, Clock, Scale, Pencil, Trash2, Tag } from "lucide-react";

interface ItemVenda {
  id: number;
  codigo: string;
  barras: string;
  descricao: string;
  quantidade: number;
  preco: number;
  produtoBalanca?: boolean;
  unidadeBalanca?: string;
  desconto?: number;
}

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
}

interface Props {
  items: ItemVenda[];
  subtotal: number;
  cliente: Cliente | null;
  barcode: string;
  quantidade: string;
  onBarcodeChange: (v: string) => void;
  onQuantidadeChange: (v: string) => void;
  onBarcodeSubmit: () => void;
  clock: string;
  operador: string;
  modoVenda: "varejo" | "atacado";
  modoOrcamento: boolean;
  turnoAtivo: boolean;
  onUpdateQuantidade?: (itemId: number, novaQtd: number) => void;
  onUpdatePreco?: (itemId: number, novoPreco: number) => void;
  onRemoveItem?: (itemId: number) => void;
  onUpdateDesconto?: (itemId: number, desconto: number) => void;
}

function MobileQtyEditor({ item, onConfirm }: { item: { id: number; quantidade: number }; onConfirm: (qty: number) => void }) {
  const [value, setValue] = useState(String(item.quantidade));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);
  const submit = () => { const n = parseFloat(value); onConfirm(!isNaN(n) && n > 0 ? n : item.quantidade); };
  return (
    <Input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} onBlur={submit}
      onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onConfirm(item.quantidade); }}
      className="h-6 w-16 text-xs font-mono font-bold p-0 text-center" type="number" min="0.001" step="any" inputMode="decimal" />
  );
}

export const PDVMobileView = forwardRef<HTMLInputElement, Props>(({
  items, subtotal, cliente, barcode, quantidade,
  onBarcodeChange, onQuantidadeChange, onBarcodeSubmit,
  clock, operador, modoVenda, modoOrcamento, turnoAtivo, onUpdateQuantidade, onUpdatePreco, onRemoveItem, onUpdateDesconto
}, ref) => {
  const [tab, setTab] = useState("input");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const lastItem = items.length > 0 ? items[items.length - 1] : null;

  // Swipe gesture support
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Only swipe if horizontal movement is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
      if (deltaX < 0) setTab("cupom");   // swipe left → Cupom
      else setTab("input");              // swipe right → Leitura
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  return (
    <div className="flex flex-col h-full pb-[68px]">
      {/* Compact top bar */}
      <div className="bg-primary px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-primary-foreground" />
          <span className="text-primary-foreground font-black text-xs">PDV</span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary-foreground/30 text-primary-foreground/80">
            {modoVenda === "varejo" ? "Varejo" : "Atacado"}
          </Badge>
          {modoOrcamento && (
            <Badge className="bg-accent text-accent-foreground text-[9px] h-4 px-1.5 border-0">
              Orçamento
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[9px] h-4 px-1.5 gap-0.5 ${turnoAtivo ? "border-green-500/50 text-green-300" : "border-destructive/50 text-red-300"}`}>
            <Clock size={8} />
            {turnoAtivo ? "Turno" : "S/Turno"}
          </Badge>
          <span className="text-primary-foreground/70 text-[10px] font-mono">{clock}</span>
        </div>
      </div>

      {/* Subtotal banner - always visible */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {cliente ? cliente.nome : "Consumidor Final"}
          </span>
          <span className="text-[10px] text-muted-foreground">Op: {operador}</span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Total</span>
          <span className="text-2xl font-black font-mono text-primary tabular-nums">
            R$ {subtotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Tabs: Input / Cupom */}
      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <TabsList className="mx-3 mt-2 shrink-0">
          <TabsTrigger value="input" className="flex-1 gap-1.5 text-xs">
            <Keyboard size={14} /> Leitura
          </TabsTrigger>
          <TabsTrigger value="cupom" className="flex-1 gap-1.5 text-xs">
            <ShoppingCart size={14} /> Cupom
            {items.length > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1 ml-1 border-0">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Input tab */}
        <TabsContent value="input" className="flex-1 p-3 space-y-3 overflow-auto">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Código / Barras
            </label>
            <Input
              ref={ref}
              placeholder="Leia ou digite o código..."
              value={barcode}
              onChange={e => onBarcodeChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  onBarcodeSubmit();
                  setTab("cupom");
                }
              }}
              className="h-12 text-lg font-mono font-bold mt-1 border-primary/40 focus-visible:ring-primary/50"
              autoFocus
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qtd</label>
              <Input
                value={quantidade}
                onChange={e => onQuantidadeChange(e.target.value)}
                className="h-11 text-lg font-mono font-bold text-right mt-1"
                type="number"
                min="1"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vlr. Unit.</label>
              <Input
                value={lastItem ? `R$ ${lastItem.preco.toFixed(2)}` : "R$ 0,00"}
                readOnly
                className="h-11 text-lg font-mono font-bold text-right mt-1 bg-muted/50 text-muted-foreground"
              />
            </div>
          </div>

          {/* Last item card */}
          {lastItem && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Último item</span>
              <p className="font-semibold text-sm mt-0.5 truncate">{lastItem.descricao}</p>
              <p className="text-primary font-mono font-bold text-lg mt-0.5">
                {lastItem.quantidade} × R$ {lastItem.preco.toFixed(2)} = R$ {(lastItem.preco * lastItem.quantidade).toFixed(2)}
              </p>
            </div>
          )}

          {!lastItem && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
              <span className="text-4xl mb-2">📦</span>
              <span className="text-sm">Leia um código de barras</span>
              <span className="text-xs">ou use "Produtos" para buscar</span>
            </div>
          )}
        </TabsContent>

        {/* Cupom tab */}
        <TabsContent value="cupom" className="flex-1 overflow-auto min-h-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
              <span className="text-4xl mb-2">🧾</span>
              <span className="text-sm">Nenhum item na venda</span>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`px-4 py-2.5 ${index === items.length - 1 ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-mono">{item.codigo}</span>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium truncate">{item.descricao}</p>
                        {item.produtoBalanca && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-primary/40 text-primary">
                            <Scale size={8} /> BAL
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-bold text-primary whitespace-nowrap">
                          R$ {(() => { const bruto = item.preco * item.quantidade; return item.desconto ? (bruto - bruto * (item.desconto / 100)).toFixed(2) : bruto.toFixed(2); })()}
                        </span>
                        {item.desconto ? (
                          <span className="text-[9px] text-muted-foreground line-through font-mono">
                            {(item.preco * item.quantidade).toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                      {onRemoveItem && (
                        confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { onRemoveItem(item.id); setConfirmDeleteId(null); }}
                              className="text-[9px] font-bold text-destructive-foreground bg-destructive hover:bg-destructive/80 rounded px-1.5 py-0.5 transition-colors"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[9px] font-bold text-muted-foreground hover:text-foreground rounded px-1.5 py-0.5 transition-colors"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                            title="Excluir item"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground font-mono items-center">
                    {editingId === item.id && onUpdateQuantidade ? (
                      <MobileQtyEditor
                        item={item}
                        onConfirm={(qty) => {
                          onUpdateQuantidade(item.id, qty);
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                        onClick={() => onUpdateQuantidade && setEditingId(item.id)}
                      >
                        Qtd: {item.produtoBalanca ? `${item.quantidade} ${item.unidadeBalanca || "kg"}` : item.quantidade}
                        {onUpdateQuantidade && <Pencil size={10} className="opacity-40" />}
                      </button>
                    )}
                    {editingPriceId === item.id && onUpdatePreco ? (
                      <div className="inline-flex items-center gap-0.5">
                        <span className="text-[10px]">R$</span>
                        <Input
                          autoFocus
                          defaultValue={String(item.preco)}
                          onBlur={e => { const n = parseFloat(e.target.value); onUpdatePreco(item.id, !isNaN(n) && n > 0 ? n : item.preco); setEditingPriceId(null); }}
                          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingPriceId(null); }}
                          className="h-5 w-16 text-right font-mono font-bold text-[10px] p-0"
                          type="number" min="0.01" step="any" inputMode="decimal"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`inline-flex items-center gap-0.5 transition-colors ${onUpdatePreco ? "hover:text-primary" : ""}`}
                        onClick={() => onUpdatePreco && setEditingPriceId(item.id)}
                      >
                        Unit: {item.preco.toFixed(2)}
                        {onUpdatePreco && <Pencil size={10} className="opacity-40" />}
                      </button>
                    )}
                    {onUpdateDesconto && (
                      editingDiscountId === item.id ? (
                        <div className="inline-flex items-center gap-0.5">
                          <Input
                            autoFocus
                            defaultValue={String(item.desconto || 0)}
                            onBlur={e => { const n = parseFloat(e.target.value); onUpdateDesconto(item.id, !isNaN(n) && n >= 0 && n <= 100 ? n : item.desconto || 0); setEditingDiscountId(null); }}
                            onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditingDiscountId(null); }}
                            className="h-5 w-12 text-center font-mono font-bold text-[10px] p-0"
                            type="number" min="0" max="100" step="any" inputMode="decimal"
                          />
                          <span className="text-[10px]">%</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-0.5 hover:text-primary transition-colors"
                          onClick={() => setEditingDiscountId(item.id)}
                        >
                          <Tag size={10} className="opacity-60" />
                          <span>{item.desconto ? `${item.desconto}%` : "Desc"}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

PDVMobileView.displayName = "PDVMobileView";
