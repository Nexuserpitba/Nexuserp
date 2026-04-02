import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, ArrowRightLeft, CheckCircle2, Clock, Truck, XCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

interface ProdutoCadastro {
  id: string;
  codigo: string;
  descricao: string;
  estoque: number;
  unidade: string;
  ativo: boolean;
}

interface ItemTransferencia {
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
}

interface Transferencia {
  id: string;
  numero: string;
  data: string;
  origem: string;
  destino: string;
  status: "pendente" | "em_transito" | "recebida" | "cancelada";
  observacao: string;
  itens: ItemTransferencia[];
}

const lojas = ["Matriz", "Filial Centro", "Filial Shopping", "Filial Zona Norte", "CD Principal"];

function getProdutosCadastro(): ProdutoCadastro[] {
  try {
    const stored = localStorage.getItem("produtos");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

const defaultTransferencias: Transferencia[] = [
  {
    id: "1", numero: "TRF-001", data: "2026-03-05", origem: "CD Principal", destino: "Filial Centro", status: "recebida", observacao: "Reposição semanal",
    itens: [
      { produtoCodigo: "001", produtoDescricao: "Smartphone X Pro 128GB", quantidade: 10, unidade: "UN" },
      { produtoCodigo: "003", produtoDescricao: "Fone Bluetooth ANC", quantidade: 20, unidade: "UN" },
    ],
  },
  {
    id: "2", numero: "TRF-002", data: "2026-03-07", origem: "Matriz", destino: "Filial Shopping", status: "em_transito", observacao: "Urgente - promoção",
    itens: [
      { produtoCodigo: "002", produtoDescricao: "Notebook Ultra 15 i7", quantidade: 5, unidade: "UN" },
    ],
  },
];

export default function Transferencias() {
  const { items: transferencias, addItem, updateItem } = useLocalStorage<Transferencia>("transferencias_estoque", defaultTransferencias);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [observacao, setObservacao] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosSelecionados, setProdutosSelecionados] = useState<Map<string, number>>(new Map());

  const produtosCadastro = useMemo(() => getProdutosCadastro(), [modalOpen]);

  const produtosFiltrados = useMemo(() => {
    const ativos = produtosCadastro.filter(p => p.ativo);
    if (!buscaProduto) return ativos;
    const term = buscaProduto.toLowerCase();
    return ativos.filter(p =>
      p.descricao.toLowerCase().includes(term) || p.codigo.includes(term)
    );
  }, [produtosCadastro, buscaProduto]);

  const filtered = transferencias
    .filter(t =>
      t.numero.toLowerCase().includes(search.toLowerCase()) ||
      t.origem.toLowerCase().includes(search.toLowerCase()) ||
      t.destino.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const statusLabel = (s: string) => {
    switch (s) {
      case "pendente": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
      case "em_transito": return <Badge className="gap-1 bg-blue-600"><Truck className="h-3 w-3" />Em Trânsito</Badge>;
      case "recebida": return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Recebida</Badge>;
      case "cancelada": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelada</Badge>;
      default: return null;
    }
  };

  const toggleProduto = (id: string) => {
    setProdutosSelecionados(prev => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  };

  const setQuantidade = (id: string, qty: number) => {
    setProdutosSelecionados(prev => {
      const next = new Map(prev);
      next.set(id, qty);
      return next;
    });
  };

  const abrirModal = () => {
    setOrigem("");
    setDestino("");
    setObservacao("");
    setBuscaProduto("");
    setProdutosSelecionados(new Map());
    setModalOpen(true);
  };

  const handleCriar = () => {
    if (!origem || !destino) {
      toast.error("Selecione origem e destino");
      return;
    }
    if (origem === destino) {
      toast.error("Origem e destino devem ser diferentes");
      return;
    }
    if (produtosSelecionados.size === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    const itens: ItemTransferencia[] = [];
    produtosSelecionados.forEach((qty, id) => {
      const p = produtosCadastro.find(pr => pr.id === id);
      if (p && qty > 0) {
        itens.push({
          produtoCodigo: p.codigo,
          produtoDescricao: p.descricao,
          quantidade: qty,
          unidade: p.unidade || "UN",
        });
      }
    });
    if (itens.length === 0) {
      toast.error("Informe a quantidade dos produtos");
      return;
    }
    const numero = `TRF-${String(transferencias.length + 1).padStart(3, "0")}`;
    addItem({
      numero,
      data: new Date().toISOString().split("T")[0],
      origem,
      destino,
      status: "pendente",
      observacao,
      itens,
    });
    toast.success(`Transferência ${numero} criada com ${itens.length} itens`);
    setModalOpen(false);
  };

  const atualizarStatus = (id: string, novoStatus: Transferencia["status"]) => {
    updateItem(id, { status: novoStatus });
    const labels: Record<string, string> = { em_transito: "em trânsito", recebida: "recebida", cancelada: "cancelada" };
    toast.success(`Transferência marcada como ${labels[novoStatus]}`);
  };

  return (
    <div className="page-container">
      <PageHeader title="Transferências entre Lojas" description="Controle transferências de produtos entre filiais e CDs" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><ArrowRightLeft className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{transferencias.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Clock className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-xl font-bold">{transferencias.filter(t => t.status === "pendente").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Truck className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Em Trânsito</p>
              <p className="text-xl font-bold">{transferencias.filter(t => t.status === "em_transito").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Recebidas</p>
              <p className="text-xl font-bold">{transferencias.filter(t => t.status === "recebida").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número, origem ou destino..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={abrirModal}><Plus className="h-4 w-4 mr-2" />Nova Transferência</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma transferência encontrada</TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.numero}</TableCell>
                  <TableCell>{new Date(t.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{t.origem}</TableCell>
                  <TableCell>{t.destino}</TableCell>
                  <TableCell>{statusLabel(t.status)}</TableCell>
                  <TableCell className="text-right">{t.itens.length} ({t.itens.reduce((s, i) => s + i.quantidade, 0)} un)</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.status === "pendente" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => atualizarStatus(t.id, "em_transito")}>Enviar</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => atualizarStatus(t.id, "cancelada")}>Cancelar</Button>
                        </>
                      )}
                      {t.status === "em_transito" && (
                        <Button size="sm" onClick={() => atualizarStatus(t.id, "recebida")}>Confirmar Recebimento</Button>
                      )}
                      {(t.status === "recebida" || t.status === "cancelada") && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Transferência</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem *</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {lojas.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Destino *</Label>
                <Select value={destino} onValueChange={setDestino}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {lojas.filter(l => l !== origem).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Reposição semanal" />
            </div>

            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Selecionar Produtos ({produtosSelecionados.size} selecionados)</Label>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto por nome ou código..." className="pl-9" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} />
              </div>
              {produtosFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {produtosCadastro.length === 0 ? "Nenhum produto cadastrado." : "Nenhum produto encontrado."}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Unid.</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right w-28">Qtd Transferir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosFiltrados.map(p => {
                        const selecionado = produtosSelecionados.has(p.id);
                        return (
                          <TableRow key={p.id} className={selecionado ? "bg-primary/5" : "hover:bg-muted/50"}>
                            <TableCell>
                              <Checkbox checked={selecionado} onCheckedChange={() => toggleProduto(p.id)} />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                            <TableCell>{p.descricao}</TableCell>
                            <TableCell className="text-muted-foreground">{p.unidade || "UN"}</TableCell>
                            <TableCell className="text-right">{p.estoque}</TableCell>
                            <TableCell className="text-right">
                              {selecionado ? (
                                <Input
                                  type="number"
                                  min="1"
                                  max={p.estoque}
                                  className="w-24 text-right ml-auto"
                                  value={produtosSelecionados.get(p.id) || ""}
                                  onChange={e => setQuantidade(p.id, parseFloat(e.target.value) || 0)}
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={produtosSelecionados.size === 0}>
              Criar Transferência ({produtosSelecionados.size} itens)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
