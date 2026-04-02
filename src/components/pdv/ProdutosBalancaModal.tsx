import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale, Search, Percent } from "lucide-react";

interface Produto {
  codigo: string;
  barras: string;
  descricao: string;
  venda: number;
  emPromocao?: boolean;
  vendaOriginal?: number;
  produtoBalanca?: boolean;
  unidadeBalanca?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: Produto) => void;
  produtos: Produto[];
}

export function ProdutosBalancaModal({ open, onClose, onSelect, produtos }: Props) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (open) setBusca("");
  }, [open]);

  const produtosBalanca = useMemo(() => {
    return produtos.filter(p => (p as any).produtoBalanca);
  }, [produtos]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return produtosBalanca;
    const q = busca.toLowerCase();
    return produtosBalanca.filter(p =>
      p.descricao.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.barras.includes(q)
    );
  }, [busca, produtosBalanca]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Scale size={18} className="text-primary" />
            Produtos de Balança
            <Badge variant="secondary" className="text-[10px] h-5 ml-1">
              {produtosBalanca.length} produto(s)
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto de balança..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoFocus
              className="pl-9 h-10 font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
          {filtrados.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              {produtosBalanca.length === 0
                ? "Nenhum produto cadastrado como produto de balança"
                : "Nenhum produto encontrado"}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filtrados.map(p => (
                <button
                  key={p.codigo}
                  onClick={() => { onSelect(p); onClose(); }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border border-border text-center transition-colors hover:bg-primary/10 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/50 ${p.emPromocao ? "bg-green-500/5 border-green-500/30" : "bg-card"}`}
                >
                  <Scale size={20} className="text-primary/60 mb-1.5" />
                  <span className="text-sm font-medium leading-tight line-clamp-2">{p.descricao}</span>
                  <span className="text-[10px] text-muted-foreground font-mono mt-1">
                    Cód: {p.codigo} • {(p as any).unidadeBalanca || "kg"}
                  </span>
                  <div className="mt-1.5">
                    {p.emPromocao && p.vendaOriginal ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-muted-foreground line-through font-mono">
                          R$ {p.vendaOriginal.toFixed(2)}
                        </span>
                        <span className="font-mono font-bold text-green-600 text-sm flex items-center gap-0.5">
                          R$ {p.venda.toFixed(2)}
                          <Percent size={10} />
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-primary text-sm">
                        R$ {p.venda.toFixed(2)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
