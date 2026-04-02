import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Percent } from "lucide-react";

interface Produto {
  codigo: string;
  barras: string;
  descricao: string;
  venda: number;
  emPromocao?: boolean;
  vendaOriginal?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (produto: Produto) => void;
  produtos: Produto[];
}

export function BuscarProdutoModal({ open, onClose, onSelect, produtos }: Props) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (open) setBusca("");
  }, [open]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return produtos;
    const q = busca.toLowerCase();
    return produtos.filter(p =>
      p.descricao.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.barras.includes(q) ||
      ((p as any).barrasMultiplos && (p as any).barrasMultiplos.some((b: string) => b.includes(q)))
    );
  }, [busca, produtos]);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search size={20} className="text-primary" />
            Buscar Produto - F5
          </DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Digite código, barras ou descrição..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          autoFocus
          className="font-mono"
        />
        <div className="flex-1 overflow-auto border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead className="w-36">Barras</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right w-28">Preço</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.map(p => (
                  <TableRow
                    key={p.codigo}
                    className={`cursor-pointer hover:bg-primary/10 ${p.emPromocao ? "bg-green-500/5" : ""}`}
                    onClick={() => { onSelect(p); onClose(); }}
                  >
                    <TableCell className="font-mono">{p.codigo}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span>{p.barras}</span>
                        {(p as any).barrasMultiplos?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(p as any).barrasMultiplos.map((ean: string, i: number) => (
                              <span key={i} className="text-[9px] text-muted-foreground bg-muted px-1 rounded">{ean}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{p.descricao}</span>
                        {p.emPromocao && (
                          <Badge className="bg-green-500/90 hover:bg-green-500 text-white text-[9px] h-4 px-1.5 gap-0.5 shrink-0 border-0">
                            <Percent size={8} />
                            PROMO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.emPromocao && p.vendaOriginal ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-muted-foreground line-through font-mono">
                            R$ {p.vendaOriginal.toFixed(2)}
                          </span>
                          <span className="font-mono font-bold text-green-600">
                            R$ {p.venda.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold">R$ {p.venda.toFixed(2)}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
