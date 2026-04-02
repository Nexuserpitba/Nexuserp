import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Barcode, Percent } from "lucide-react";

interface Produto {
  codigo: string;
  barras: string;
  descricao: string;
  venda: number;
  imagem?: string;
  emPromocao?: boolean;
  vendaOriginal?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  produtos: Produto[];
}

export function ConsultaRapidaModal({ open, onClose, produtos }: Props) {
  const [busca, setBusca] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBusca("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filtrados = busca.trim()
    ? produtos.filter(p =>
        p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo.includes(busca) ||
        p.barras.includes(busca) ||
        ((p as any).barrasMultiplos && (p as any).barrasMultiplos.some((b: string) => b.includes(busca)))
      ).slice(0, 20)
    : [];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Search size={18} className="text-primary" />
            Consulta Rápida de Preço
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-2">
          <Input
            ref={inputRef}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Digite código, código de barras ou descrição..."
            className="h-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          {busca.trim() && filtrados.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">Nenhum produto encontrado</p>
          )}

          {filtrados.map(p => (
            <div
              key={p.codigo}
              className={`flex items-center justify-between py-2.5 px-3 border-b border-border last:border-0 hover:bg-muted/30 rounded-md ${p.emPromocao ? "bg-green-500/5" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Package size={16} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{p.descricao}</p>
                    {p.emPromocao && (
                      <Badge className="bg-green-500/90 hover:bg-green-500 text-white text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-0">
                        <Percent size={8} />
                        PROMO
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">Cód: {p.codigo}</span>
                    {p.barras && (
                      <span className="flex items-center gap-0.5 font-mono">
                        <Barcode size={10} /> {p.barras}
                      </span>
                    )}
                    {(p as any).barrasMultiplos?.length > 0 && (p as any).barrasMultiplos.map((ean: string, i: number) => (
                      <span key={i} className="font-mono text-[9px] bg-muted px-1 rounded">{ean}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 ml-2">
                {p.emPromocao && p.vendaOriginal ? (
                  <>
                    <span className="text-[10px] text-muted-foreground line-through font-mono">
                      R$ {p.vendaOriginal.toFixed(2)}
                    </span>
                    <Badge variant="secondary" className="font-mono text-sm font-bold text-green-600">
                      R$ {p.venda.toFixed(2)}
                    </Badge>
                  </>
                ) : (
                  <Badge variant="secondary" className="font-mono text-sm font-bold">
                    R$ {p.venda.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {!busca.trim() && (
            <p className="text-center text-muted-foreground text-xs py-8">
              Digite para buscar produtos e consultar preços
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
