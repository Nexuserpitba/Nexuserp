import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import {
  Search, PackageCheck, Eye, CheckCircle2, Clock, XCircle, Truck,
  ArrowDownCircle, Package, AlertTriangle
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

// ========== Interfaces ==========

interface ItemPedido {
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
  valorTotal: number;
  ncm: string;
}

interface PedidoCompra {
  id: string;
  numero: string;
  fornecedorId: string;
  fornecedorNome: string;
  fornecedorDoc: string;
  dataEmissao: string;
  dataEntrega: string;
  status: "rascunho" | "enviado" | "parcial" | "recebido" | "cancelado";
  condicaoPagamento: string;
  formaPagamento: string;
  itens: ItemPedido[];
  valorTotal: number;
  valorDesconto: number;
  valorFrete: number;
  valorLiquido: number;
  observacao: string;
  empresaId: string;
}

interface ItemRecebimento {
  produtoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  qtdPedida: number;
  qtdJaRecebida: number;
  qtdReceber: number;
  valorUnitario: number;
  valorTotal: number;
}

interface Recebimento {
  id: string;
  pedidoId: string;
  numeroPedido: string;
  fornecedorNome: string;
  dataRecebimento: string;
  notaFiscalRef: string;
  itens: ItemRecebimento[];
  valorTotal: number;
  observacao: string;
  status: "confirmado";
}

// ========== Helpers ==========

function getStoredData<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveStoredData<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ========== Component ==========

export default function RecebimentoMercadorias() {
  const [search, setSearch] = useState("");
  const [modalReceber, setModalReceber] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoCompra | null>(null);
  const [recebimentoVisualizar, setRecebimentoVisualizar] = useState<Recebimento | null>(null);
  const [itensRecebimento, setItensRecebimento] = useState<ItemRecebimento[]>([]);
  const [notaFiscalRef, setNotaFiscalRef] = useState("");
  const [observacao, setObservacao] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load data
  const pedidos: PedidoCompra[] = useMemo(() => getStoredData("pedidos_compra", []), [refreshKey]);
  const recebimentos: Recebimento[] = useMemo(() => getStoredData("recebimentos_mercadorias", []), [refreshKey]);

  // Pedidos available for receiving (enviado or parcial)
  const pedidosRecebiveis = useMemo(
    () => pedidos.filter(p => p.status === "enviado" || p.status === "parcial"),
    [pedidos]
  );

  // Calculate already received qty per pedido+produto
  const qtdRecebidaPorPedido = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    recebimentos.forEach(r => {
      if (!map[r.pedidoId]) map[r.pedidoId] = {};
      r.itens.forEach(i => {
        map[r.pedidoId][i.produtoId] = (map[r.pedidoId][i.produtoId] || 0) + i.qtdReceber;
      });
    });
    return map;
  }, [recebimentos]);

  // Filter recebimentos
  const filteredRecebimentos = recebimentos
    .filter(r =>
      r.fornecedorNome.toLowerCase().includes(search.toLowerCase()) ||
      r.numeroPedido.includes(search) ||
      r.notaFiscalRef.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.dataRecebimento).getTime() - new Date(a.dataRecebimento).getTime());

  // Stats
  const totalRecebimentos = recebimentos.length;
  const valorTotalRecebido = recebimentos.reduce((s, r) => s + r.valorTotal, 0);
  const pedidosPendentes = pedidosRecebiveis.length;

  // Open receive modal
  const abrirRecebimento = (pedido: PedidoCompra) => {
    const jaRecebido = qtdRecebidaPorPedido[pedido.id] || {};
    const itens: ItemRecebimento[] = pedido.itens.map(item => {
      const recebida = jaRecebido[item.produtoId] || 0;
      const pendente = Math.max(0, item.quantidade - recebida);
      return {
        produtoId: item.produtoId,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        qtdPedida: item.quantidade,
        qtdJaRecebida: recebida,
        qtdReceber: pendente,
        valorUnitario: item.valorUnitario,
        valorTotal: pendente * item.valorUnitario,
      };
    });
    setItensRecebimento(itens);
    setPedidoSelecionado(pedido);
    setNotaFiscalRef("");
    setObservacao("");
    setModalReceber(true);
  };

  const updateQtdReceber = (idx: number, qtd: number) => {
    setItensRecebimento(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const maxQtd = item.qtdPedida - item.qtdJaRecebida;
      const q = Math.max(0, Math.min(qtd, maxQtd));
      return { ...item, qtdReceber: q, valorTotal: q * item.valorUnitario };
    }));
  };

  const valorTotalRecebimento = itensRecebimento.reduce((s, i) => s + i.valorTotal, 0);

  // Confirm receipt
  const confirmarRecebimento = () => {
    if (!pedidoSelecionado) return;
    const itensComQtd = itensRecebimento.filter(i => i.qtdReceber > 0);
    if (itensComQtd.length === 0) {
      toast.error("Informe a quantidade de pelo menos um item");
      return;
    }

    // 1. Save recebimento
    const novoRecebimento: Recebimento = {
      id: crypto.randomUUID(),
      pedidoId: pedidoSelecionado.id,
      numeroPedido: pedidoSelecionado.numero,
      fornecedorNome: pedidoSelecionado.fornecedorNome,
      dataRecebimento: new Date().toISOString(),
      notaFiscalRef,
      itens: itensComQtd,
      valorTotal: itensComQtd.reduce((s, i) => s + i.valorTotal, 0),
      observacao,
      status: "confirmado",
    };
    const updRecebimentos = [...recebimentos, novoRecebimento];
    saveStoredData("recebimentos_mercadorias", updRecebimentos);

    // 2. Generate stock movements (entradas)
    const movimentacoes = getStoredData<any[]>("movimentacoes_estoque", []);
    const novasMovimentacoes = itensComQtd.map(item => ({
      id: crypto.randomUUID(),
      data: new Date().toISOString(),
      tipo: "entrada",
      motivo: "Compra",
      produtoCodigo: item.codigo,
      produtoDescricao: item.descricao,
      quantidade: item.qtdReceber,
      custoUnitario: item.valorUnitario,
      documentoRef: notaFiscalRef || `PC ${pedidoSelecionado.numero}`,
      observacao: `Recebimento do Pedido ${pedidoSelecionado.numero}`,
      usuario: "Admin",
    }));
    saveStoredData("movimentacoes_estoque", [...movimentacoes, ...novasMovimentacoes]);

    // 3. Update pedido status
    const jaRecebido = qtdRecebidaPorPedido[pedidoSelecionado.id] || {};
    let todosRecebidos = true;
    pedidoSelecionado.itens.forEach(item => {
      const totalRec = (jaRecebido[item.produtoId] || 0) +
        (itensComQtd.find(i => i.produtoId === item.produtoId)?.qtdReceber || 0);
      if (totalRec < item.quantidade) todosRecebidos = false;
    });

    const updPedidos = pedidos.map(p => {
      if (p.id !== pedidoSelecionado.id) return p;
      return { ...p, status: todosRecebidos ? "recebido" as const : "parcial" as const };
    });
    saveStoredData("pedidos_compra", updPedidos);

    // 4. Update product stock quantities
    const produtos = getStoredData<any[]>("produtos", []);
    const updProdutos = produtos.map(prod => {
      const itemRec = itensComQtd.find(i => i.produtoId === prod.id);
      if (!itemRec) return prod;
      const estoqueAtual = Number(prod.estoqueAtual || prod.estoque || 0);
      return { ...prod, estoqueAtual: estoqueAtual + itemRec.qtdReceber, estoque: estoqueAtual + itemRec.qtdReceber };
    });
    saveStoredData("produtos", updProdutos);

    // 5. Generate conta a pagar automatically
    const valorRecebimento = itensComQtd.reduce((s, i) => s + i.valorTotal, 0);
    const contasPagar = getStoredData<any[]>("contas_pagar", []);
    const dataHoje = new Date().toISOString().split("T")[0];
    const condicao = pedidoSelecionado.condicaoPagamento || "À Vista";
    
    // Parse parcelas from condicaoPagamento (e.g. "30/60/90" or "À Vista")
    let diasParcelas: number[] = [0];
    if (condicao && condicao !== "À Vista" && condicao !== "a_vista") {
      const parsed = condicao.split("/").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
      if (parsed.length > 0) diasParcelas = parsed;
    }

    const numParcelas = diasParcelas.length;
    const valorParcela = Math.floor(valorRecebimento * 100 / numParcelas) / 100;
    const residuo = Math.round((valorRecebimento - valorParcela * numParcelas) * 100) / 100;

    const parcelas = diasParcelas.map((dias, idx) => {
      const venc = new Date();
      venc.setDate(venc.getDate() + dias);
      return {
        numero: idx + 1,
        valor: idx === 0 ? valorParcela + residuo : valorParcela,
        vencimento: venc.toISOString().split("T")[0],
        dataPagamento: null,
        valorPago: 0,
        status: "aberta" as const,
        formaPagamento: pedidoSelecionado.formaPagamento || "boleto",
      };
    });

    const novaConta = {
      id: crypto.randomUUID(),
      tipo: "nfe",
      nfeNumero: notaFiscalRef || undefined,
      fornecedor: pedidoSelecionado.fornecedorNome,
      fornecedorDoc: pedidoSelecionado.fornecedorDoc,
      descricao: `Pedido de Compra ${pedidoSelecionado.numero}`,
      categoria: "Compra de Mercadorias",
      dataEmissao: dataHoje,
      valorTotal: valorRecebimento,
      parcelas,
      observacao: `Gerado automaticamente pelo recebimento do Pedido ${pedidoSelecionado.numero}`,
      status: "aberta",
    };
    saveStoredData("contas_pagar", [...contasPagar, novaConta]);

    setModalReceber(false);
    setRefreshKey(k => k + 1);
    toast.success(`Recebimento confirmado! ${itensComQtd.length} item(ns) no estoque e conta a pagar gerada.`);
  };

  // Export options
  const exportOptions = {
    title: "Recebimento de Mercadorias",
    filename: "recebimentos",
    columns: [
      { header: "Pedido", key: "pedido" },
      { header: "Fornecedor", key: "fornecedor" },
      { header: "Data", key: "data" },
      { header: "NF Ref.", key: "nfRef" },
      { header: "Itens", key: "itens", align: "center" as const },
      { header: "Valor Total", key: "valor", align: "right" as const },
    ],
    data: filteredRecebimentos.map(r => ({
      pedido: r.numeroPedido,
      fornecedor: r.fornecedorNome,
      data: format(new Date(r.dataRecebimento), "dd/MM/yyyy HH:mm"),
      nfRef: r.notaFiscalRef || "—",
      itens: r.itens.length,
      valor: formatCurrencyBRL(r.valorTotal),
    })),
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Recebimento de Mercadorias"
        description="Receba mercadorias dos pedidos de compra e atualize o estoque automaticamente"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <PackageCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Recebimentos</p>
              <p className="text-2xl font-bold">{totalRecebimentos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ArrowDownCircle className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Valor Recebido</p>
              <p className="text-2xl font-bold">{formatCurrencyBRL(valorTotalRecebido)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-accent-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
              <p className="text-2xl font-bold">{pedidosPendentes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pedidos pendentes */}
      {pedidosRecebiveis.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
              <Truck className="h-5 w-5" /> Pedidos Aguardando Recebimento
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosRecebiveis.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold">{p.numero}</TableCell>
                    <TableCell>{p.fornecedorNome}</TableCell>
                    <TableCell>{p.dataEntrega ? format(new Date(p.dataEntrega), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "parcial" ? "secondary" : "outline"}>
                        {p.status === "enviado" ? "Aguardando" : "Parcial"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrencyBRL(p.valorLiquido)}</TableCell>
                    <TableCell className="text-center">
                      <Button size="sm" onClick={() => abrirRecebimento(p)}>
                        <Package className="h-4 w-4 mr-1" /> Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Histórico de Recebimentos
            </h3>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <ExportButtons options={exportOptions} />
            </div>
          </div>

          {filteredRecebimentos.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PackageCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum recebimento registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>NF Ref.</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecebimentos.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-semibold">{r.numeroPedido}</TableCell>
                    <TableCell>{r.fornecedorNome}</TableCell>
                    <TableCell>{format(new Date(r.dataRecebimento), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell>{r.notaFiscalRef || "—"}</TableCell>
                    <TableCell className="text-center">{r.itens.length}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrencyBRL(r.valorTotal)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setRecebimentoVisualizar(r); setModalVisualizar(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Receber */}
      <Dialog open={modalReceber} onOpenChange={setModalReceber}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receber Mercadorias — Pedido {pedidoSelecionado?.numero}</DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground mb-2">
            Fornecedor: <strong>{pedidoSelecionado?.fornecedorNome}</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <Label>Nota Fiscal de Referência</Label>
              <Input
                placeholder="Ex: NF-e 123456"
                value={notaFiscalRef}
                onChange={e => setNotaFiscalRef(e.target.value)}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Input
                placeholder="Observações do recebimento"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Pedida</TableHead>
                <TableHead className="text-center">Já Recebida</TableHead>
                <TableHead className="text-center">Receber Agora</TableHead>
                <TableHead className="text-right">Valor Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensRecebimento.map((item, idx) => (
                <TableRow key={item.produtoId}>
                  <TableCell className="font-mono">{item.codigo}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell className="text-center">{item.qtdPedida}</TableCell>
                  <TableCell className="text-center">
                    {item.qtdJaRecebida > 0 && (
                      <Badge variant="secondary">{item.qtdJaRecebida}</Badge>
                    )}
                    {item.qtdJaRecebida === 0 && "0"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={0}
                      max={item.qtdPedida - item.qtdJaRecebida}
                      value={item.qtdReceber}
                      onChange={e => updateQtdReceber(idx, Number(e.target.value))}
                      className="w-20 text-center mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="text-right mt-2">
            <span className="text-sm text-muted-foreground mr-2">Total do Recebimento:</span>
            <span className="text-lg font-bold">{formatCurrencyBRL(valorTotalRecebimento)}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalReceber(false)}>Cancelar</Button>
            <Button onClick={confirmarRecebimento}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog open={modalVisualizar} onOpenChange={setModalVisualizar}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Recebimento</DialogTitle>
          </DialogHeader>
          {recebimentoVisualizar && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Pedido:</span> <strong>{recebimentoVisualizar.numeroPedido}</strong></div>
                <div><span className="text-muted-foreground">Fornecedor:</span> <strong>{recebimentoVisualizar.fornecedorNome}</strong></div>
                <div><span className="text-muted-foreground">Data:</span> <strong>{format(new Date(recebimentoVisualizar.dataRecebimento), "dd/MM/yyyy HH:mm")}</strong></div>
                <div><span className="text-muted-foreground">NF Ref.:</span> <strong>{recebimentoVisualizar.notaFiscalRef || "—"}</strong></div>
              </div>
              {recebimentoVisualizar.observacao && (
                <div className="text-sm"><span className="text-muted-foreground">Obs.:</span> {recebimentoVisualizar.observacao}</div>
              )}
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd Recebida</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recebimentoVisualizar.itens.map(item => (
                    <TableRow key={item.produtoId}>
                      <TableCell className="font-mono">{item.codigo}</TableCell>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell className="text-center">{item.qtdReceber}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorUnitario)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrencyBRL(item.valorTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">Total:</span>
                <span className="text-lg font-bold">{formatCurrencyBRL(recebimentoVisualizar.valorTotal)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
