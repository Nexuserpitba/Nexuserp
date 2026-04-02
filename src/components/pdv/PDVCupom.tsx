import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Percent, Scale, Pencil, Trash2, Tag, DollarSign, ShoppingBag, Gift, TrendingDown } from "lucide-react";

interface ItemVenda {
  id: number;
  codigo: string;
  barras: string;
  descricao: string;
  quantidade: number;
  preco: number;
  emPromocao?: boolean;
  precoOriginal?: number;
  produtoBalanca?: boolean;
  unidadeBalanca?: string;
  desconto?: number;
}

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface DescontoGeral {
  tipo: "percent" | "value";
  valor: number;
  calculado: number;
}

interface Props {
  items: ItemVenda[];
  subtotal: number;
  totalFinal?: number;
  cliente: Cliente | null;
  onUpdateQuantidade?: (itemId: number, novaQtd: number) => void;
  onUpdatePreco?: (itemId: number, novoPreco: number) => void;
  onRemoveItem?: (itemId: number) => void;
  onUpdateDesconto?: (itemId: number, desconto: number) => void;
  descontoGeral?: DescontoGeral;
  onDescontoGeralChange?: (tipo: "percent" | "value", valor: number) => void;
  promoDesconto?: number;
  kitItemCodigos?: Set<string>;
  leveXPagueYItemCodigos?: Set<string>;
  kitPromoDetails?: Map<string, { nome: string; economia: number }>;
  levePromoDetails?: Map<string, { leve: number; pague: number; economia: number }>;
}

function InlinePriceEditor({ item, onConfirm }: { item: ItemVenda; onConfirm: (price: number) => void }) {
  const [value, setValue] = useState(String(item.preco));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const n = parseFloat(value);
    if (!isNaN(n) && n > 0) onConfirm(n);
    else onConfirm(item.preco);
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onConfirm(item.preco); }}
      className="h-6 w-20 text-right font-mono font-bold text-xs p-0 mx-auto"
      type="number"
      min="0.01"
      step="any"
      inputMode="decimal"
    />
  );
}

function InlineQtyEditor({ item, onConfirm }: { item: ItemVenda; onConfirm: (qty: number) => void }) {
  const [value, setValue] = useState(String(item.quantidade));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const n = parseFloat(value);
    if (!isNaN(n) && n > 0) onConfirm(n);
    else onConfirm(item.quantidade);
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onConfirm(item.quantidade); }}
      className="h-6 w-16 text-center font-mono font-bold text-xs p-0 mx-auto"
      type="number"
      min="0.001"
      step="any"
    />
  );
}

function InlineDiscountEditor({ item, onConfirm }: { item: ItemVenda; onConfirm: (desc: number) => void }) {
  const [value, setValue] = useState(String(item.desconto || 0));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = () => {
    const n = parseFloat(value);
    if (!isNaN(n) && n >= 0 && n <= 100) onConfirm(n);
    else onConfirm(item.desconto || 0);
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={submit}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") onConfirm(item.desconto || 0); }}
        className="h-6 w-14 text-center font-mono font-bold text-xs p-0"
        type="number"
        min="0"
        max="100"
        step="any"
      />
      <span className="text-[10px] text-muted-foreground">%</span>
    </div>
  );
}

function calcItemTotal(item: ItemVenda) {
  const bruto = item.preco * item.quantidade;
  return item.desconto ? bruto - bruto * (item.desconto / 100) : bruto;
}

export function PDVCupom({ items, subtotal, totalFinal, cliente, onUpdateQuantidade, onUpdatePreco, onRemoveItem, onUpdateDesconto, descontoGeral, onDescontoGeralChange, promoDesconto, kitItemCodigos, leveXPagueYItemCodigos, kitPromoDetails, levePromoDetails }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const [editingDescontoGeral, setEditingDescontoGeral] = useState(false);
  const [descontoGeralInput, setDescontoGeralInput] = useState("");

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="bg-primary/90 px-4 py-1.5 shrink-0 flex items-center justify-between">
        <span className="text-primary-foreground font-bold text-sm tracking-widest uppercase">
          Cupom Fiscal
        </span>
        <span className="text-primary-foreground/60 text-[10px] font-mono">
          {items.length > 0 ? `${items.length} itens` : "vazio"}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/80 border-b border-border">
              <th className="text-left p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-8">#</th>
              <th className="text-left p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="text-left p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descrição</th>
              <th className="text-center p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-20">Qtd</th>
              <th className="text-right p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-24">Unit.</th>
              <th className="text-center p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-16">Desc%</th>
              <th className="text-right p-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-28">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-20 text-muted-foreground/50">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl opacity-20">📦</span>
                    <span className="text-sm">Aguardando leitura de código de barras...</span>
                    <span className="text-[10px]">Use F5 para buscar produtos</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b border-border/30 hover:bg-muted/20 transition-colors ${
                    index === items.length - 1 ? "bg-primary/5" : ""
                  } ${kitItemCodigos?.has(item.codigo) ? "bg-accent/10 border-l-2 border-l-accent" : ""}`}
                >
                  <td className="p-2 text-xs text-muted-foreground font-mono">{index + 1}</td>
                  <td className="p-2 font-mono text-xs text-muted-foreground">{item.codigo}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm">{item.descricao}</span>
                      {item.produtoBalanca && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-primary/40 text-primary">
                          <Scale size={8} />
                          BAL
                        </Badge>
                      )}
                      {item.emPromocao && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-green-500/90 hover:bg-green-500 text-white text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-0 cursor-help animate-promo-glow">
                              <Percent size={8} />
                              PROMO
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">Promoção Ativa</p>
                            {item.precoOriginal && (
                              <>
                                <p className="text-muted-foreground">De R$ {item.precoOriginal.toFixed(2)} por R$ {item.preco.toFixed(2)}</p>
                                <p className="text-green-400 font-bold">Economia: R$ {(item.precoOriginal - item.preco).toFixed(2)} ({((1 - item.preco / item.precoOriginal) * 100).toFixed(0)}%)</p>
                              </>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {kitItemCodigos?.has(item.codigo) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-accent hover:bg-accent text-accent-foreground text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-0 cursor-help animate-promo-glow">
                              <ShoppingBag size={8} />
                              KIT
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-semibold">{kitPromoDetails?.get(item.codigo)?.nome || "Kit Promocional"}</p>
                            {kitPromoDetails?.get(item.codigo)?.economia && (
                              <p className="text-accent">Economia: R$ {kitPromoDetails.get(item.codigo)!.economia.toFixed(2)}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {leveXPagueYItemCodigos?.has(item.codigo) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className="bg-primary/80 hover:bg-primary text-primary-foreground text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-0 cursor-help animate-promo-glow">
                              <Gift size={8} />
                              LEVE+PAGUE
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {(() => {
                              const d = levePromoDetails?.get(item.codigo);
                              return d ? (
                                <>
                                  <p className="font-semibold">Leve {d.leve} Pague {d.pague}</p>
                                  <p className="text-accent">Economia: R$ {d.economia.toFixed(2)}</p>
                                </>
                              ) : <p>Leve X Pague Y</p>;
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {item.emPromocao && item.precoOriginal && (
                      <span className="text-[10px] text-muted-foreground line-through font-mono">
                        De R$ {item.precoOriginal.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono font-bold">
                    {editingId === item.id && onUpdateQuantidade ? (
                      <InlineQtyEditor
                        item={item}
                        onConfirm={(qty) => {
                          onUpdateQuantidade(item.id, qty);
                          setEditingId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="group inline-flex items-center gap-1 hover:text-primary cursor-pointer transition-colors"
                        onClick={() => onUpdateQuantidade && setEditingId(item.id)}
                        title="Clique para editar"
                      >
                        {item.produtoBalanca ? `${item.quantidade} ${item.unidadeBalanca || "kg"}` : item.quantidade}
                        {onUpdateQuantidade && (
                          <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono text-muted-foreground">
                    {editingPriceId === item.id && onUpdatePreco ? (
                      <InlinePriceEditor
                        item={item}
                        onConfirm={(price) => {
                          onUpdatePreco(item.id, price);
                          setEditingPriceId(null);
                        }}
                      />
                    ) : item.emPromocao ? (
                      <span className="text-green-600 font-bold">{item.preco.toFixed(2)}</span>
                    ) : (
                      <button
                        type="button"
                        className={`group inline-flex items-center gap-1 transition-colors ${onUpdatePreco ? "hover:text-primary cursor-pointer" : ""}`}
                        onClick={() => onUpdatePreco && !item.emPromocao && setEditingPriceId(item.id)}
                        disabled={!onUpdatePreco || item.emPromocao}
                      >
                        {item.preco.toFixed(2)}
                        {onUpdatePreco && !item.emPromocao && (
                          <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono">
                    {editingDiscountId === item.id && onUpdateDesconto ? (
                      <InlineDiscountEditor
                        item={item}
                        onConfirm={(desc) => {
                          onUpdateDesconto(item.id, desc);
                          setEditingDiscountId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={`group inline-flex items-center gap-0.5 transition-colors cursor-pointer ${
                          item.desconto ? "text-accent-foreground font-bold" : "text-muted-foreground/40 hover:text-primary"
                        }`}
                        onClick={() => onUpdateDesconto && setEditingDiscountId(item.id)}
                        title="Clique para aplicar desconto"
                      >
                        {item.desconto ? (
                          <span className="text-xs">{item.desconto}%</span>
                        ) : (
                          <Tag size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                        {onUpdateDesconto && !item.desconto && (
                          <span className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity">—</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="p-2 text-right font-mono font-bold">
                    {calcItemTotal(item).toFixed(2)}
                    {item.desconto ? (
                      <span className="block text-[9px] text-muted-foreground line-through font-normal">
                        {(item.preco * item.quantidade).toFixed(2)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-1 text-center">
                    {onRemoveItem && (
                      confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-0.5 justify-center">
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
                          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded"
                          title="Excluir item"
                        >
                          <Trash2 size={13} />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-card border-t-2 border-primary/20 px-4 py-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cliente</span>
            <span className="text-sm font-semibold text-foreground">
              {cliente ? cliente.nome : "CONSUMIDOR FINAL"}
            </span>
            {cliente?.cpfCnpj && (
              <span className="text-[10px] text-muted-foreground font-mono">
                CPF/CNPJ: {cliente.cpfCnpj}
              </span>
            )}
            {cliente?.telefone && (
              <span className="text-[10px] text-muted-foreground font-mono">
                Tel: {cliente.telefone}
              </span>
            )}
            {cliente?.endereco && (
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[280px]">
                {cliente.endereco}{cliente.numero ? `, ${cliente.numero}` : ""}{cliente.bairro ? ` - ${cliente.bairro}` : ""}{cliente.cidade ? ` - ${cliente.cidade}` : ""}{cliente.uf ? `/${cliente.uf}` : ""}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Subtotal Itens</span>
            <span className={`block font-mono font-bold tabular-nums ${descontoGeral && descontoGeral.calculado > 0 ? "text-lg text-muted-foreground" : "text-3xl text-primary font-black"}`}>
              R$ {subtotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Promo Desconto (Leve X Pague Y / Kit) */}
        {promoDesconto && promoDesconto > 0 && (
          <div className="flex items-center gap-2 border-t border-border/50 pt-2">
            <Tag size={14} className="text-primary shrink-0" />
            <span className="text-[10px] text-primary uppercase tracking-wider shrink-0 font-semibold">Promoção</span>
            <span className="flex-1 text-right text-xs font-mono font-bold text-primary">
              - R$ {promoDesconto.toFixed(2)}
            </span>
          </div>
        )}

        {/* Desconto Geral */}
        {onDescontoGeralChange && items.length > 0 && (
          <div className="flex items-center gap-2 border-t border-border/50 pt-2">
            <Tag size={14} className="text-muted-foreground shrink-0" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">Desc. Geral</span>
            {editingDescontoGeral ? (
              <div className="flex items-center gap-1 flex-1">
                <div className="flex border border-border rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onDescontoGeralChange("percent", descontoGeral?.valor || 0)}
                    className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${descontoGeral?.tipo === "percent" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => onDescontoGeralChange("value", descontoGeral?.valor || 0)}
                    className={`px-2 py-0.5 text-[10px] font-bold transition-colors ${descontoGeral?.tipo === "value" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    R$
                  </button>
                </div>
                <Input
                  autoFocus
                  value={descontoGeralInput}
                  onChange={e => setDescontoGeralInput(e.target.value)}
                  onBlur={() => {
                    const n = parseFloat(descontoGeralInput);
                    if (!isNaN(n) && n >= 0) {
                      if (descontoGeral?.tipo === "percent" && n > 100) onDescontoGeralChange(descontoGeral.tipo, 100);
                      else onDescontoGeralChange(descontoGeral?.tipo || "percent", n);
                    }
                    setEditingDescontoGeral(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") { setEditingDescontoGeral(false); }
                  }}
                  className="h-6 w-20 text-xs font-mono font-bold text-right p-1"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                />
              </div>
            ) : (
              <button
                type="button"
                className="flex-1 text-left text-xs font-mono hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => {
                  setDescontoGeralInput(String(descontoGeral?.valor || 0));
                  setEditingDescontoGeral(true);
                }}
              >
                {descontoGeral && descontoGeral.valor > 0 ? (
                  <span className="text-destructive font-bold">
                    {descontoGeral.tipo === "percent" ? `${descontoGeral.valor}%` : `R$ ${descontoGeral.valor.toFixed(2)}`}
                    {" "}(- R$ {descontoGeral.calculado.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-muted-foreground/50">Clique para aplicar</span>
                )}
                <Pencil size={10} className="opacity-40" />
              </button>
            )}
            {descontoGeral && descontoGeral.valor > 0 && !editingDescontoGeral && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => onDescontoGeralChange(descontoGeral.tipo, 0)}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
        )}

        {/* Total Final */}
        {descontoGeral && descontoGeral.calculado > 0 && (
          <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
            <span className="text-3xl font-black font-mono text-primary tabular-nums">
              R$ {(totalFinal ?? subtotal).toFixed(2)}
            </span>
          </div>
        )}

        {/* Resumo de Economia Total */}
        {(() => {
          const econPromo = items.reduce((acc, item) => {
            if (item.emPromocao && item.precoOriginal) {
              return acc + (item.precoOriginal - item.preco) * item.quantidade;
            }
            return acc;
          }, 0);
          const econLeveKit = promoDesconto || 0;
          const econDescontoGeral = descontoGeral?.calculado || 0;
          const econTotal = econPromo + econLeveKit + econDescontoGeral;

          if (econTotal <= 0 || items.length === 0) return null;

          return (
            <div className="border-t-2 border-dashed border-accent/40 pt-2 mt-1 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-accent shrink-0" />
                <span className="text-[10px] text-accent uppercase tracking-wider font-bold">Você economizou</span>
              </div>
              <div className="flex flex-col gap-0.5 pl-5">
                {econPromo > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Promoções (desconto direto)</span>
                    <span className="font-mono font-semibold text-accent">- R$ {econPromo.toFixed(2)}</span>
                  </div>
                )}
                {econLeveKit > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Leve+Pague / Kit</span>
                    <span className="font-mono font-semibold text-accent">- R$ {econLeveKit.toFixed(2)}</span>
                  </div>
                )}
                {econDescontoGeral > 0 && (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Desconto geral</span>
                    <span className="font-mono font-semibold text-accent">- R$ {econDescontoGeral.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-accent/20">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">Economia Total</span>
                <span className="text-lg font-black font-mono text-accent tabular-nums">
                  R$ {econTotal.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
    </TooltipProvider>
  );
}
