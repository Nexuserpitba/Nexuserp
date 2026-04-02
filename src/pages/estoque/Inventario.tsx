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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, ClipboardList, CheckCircle2, Clock, AlertTriangle, PackageCheck, CalendarIcon, DollarSign, FileText, Printer, Download } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProdutoCadastro {
  id: string;
  codigo: string;
  barras?: string;
  descricao: string;
  estoque: number;
  custoAquisicao: number;
  custoReposicao: number;
  venda: number;
  grupo: string;
  categoria: string;
  ncm?: string;
  cest?: string;
  unidade?: string;
  ativo: boolean;
}

interface ItemInventario {
  produtoCodigo: string;
  produtoDescricao: string;
  estoqueAtual: number;
  contagem: number | null;
  diferenca: number;
  ajustado: boolean;
  custoUnitario: number;
  tipoCusto: "aquisicao" | "reposicao" | "venda";
  ncm?: string;
  unidade?: string;
}

interface Inventario {
  id: string;
  numero: string;
  dataInicio: string;
  dataFim: string | null;
  status: "em_andamento" | "finalizado" | "cancelado";
  responsavel: string;
  observacao: string;
  tipoCusto: "aquisicao" | "reposicao" | "venda";
  itens: ItemInventario[];
}

function getProdutosCadastro(): ProdutoCadastro[] {
  try {
    const stored = localStorage.getItem("produtos");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// ====== Geração do Bloco H (SPED Fiscal) ======
function gerarBlocoH(inv: Inventario, motivo: string): string {
  const dataFim = inv.dataFim || inv.dataInicio;
  const dtFormatada = dataFim.replace(/-/g, "");
  const lines: string[] = [];

  // H001 - Abertura do Bloco H
  lines.push(`|H001|0|`);

  // H005 - Totais do Inventário
  const valorTotal = inv.itens.reduce((acc, i) => {
    const qty = i.contagem !== null ? i.contagem : i.estoqueAtual;
    return acc + qty * i.custoUnitario;
  }, 0);
  lines.push(`|H005|${dtFormatada}|${valorTotal.toFixed(2).replace(".", ",")}|${motivo}|`);

  // H010 - Itens do Inventário
  inv.itens.forEach(item => {
    const qty = item.contagem !== null ? item.contagem : item.estoqueAtual;
    const vlItem = qty * item.custoUnitario;
    const un = item.unidade || "UN";
    const ncm = (item.ncm || "").replace(/\./g, "");
    // |H010|COD_ITEM|UNID|QTD|VL_UNIT|VL_ITEM|IND_PROP|COD_PART|TXT_COMPL|COD_CTA|VL_ITEM_IR|
    lines.push(`|H010|${item.produtoCodigo}|${un}|${qty.toFixed(3).replace(".", ",")}|${item.custoUnitario.toFixed(6).replace(".", ",")}|${vlItem.toFixed(2).replace(".", ",")}|0||||0,00|`);
  });

  // H020 - Informação complementar (NCM)
  inv.itens.forEach(item => {
    if (item.ncm) {
      const ncmLimpo = item.ncm.replace(/\./g, "");
      lines.push(`|H020|${item.produtoCodigo}|${ncmLimpo}|`);
    }
  });

  // H990 - Encerramento do Bloco H
  lines.push(`|H990|${lines.length + 1}|`);

  return lines.join("\n");
}

function gerarRelatorioCSV(inv: Inventario): string {
  const header = "Código;Descrição;Unidade;NCM;Est.Sistema;Contagem;Diferença;Custo Unit.;Valor Sistema;Valor Contagem;Valor Diferença;Status";
  const rows = inv.itens.map(item => {
    const qty = item.contagem !== null ? item.contagem : item.estoqueAtual;
    const vlSistema = item.estoqueAtual * item.custoUnitario;
    const vlContagem = qty * item.custoUnitario;
    const vlDif = (item.contagem !== null ? item.diferenca : 0) * item.custoUnitario;
    const status = item.ajustado ? "Ajustado" : item.contagem !== null && item.diferenca !== 0 ? "Divergente" : "OK";
    return `${item.produtoCodigo};${item.produtoDescricao};${item.unidade || "UN"};${item.ncm || ""};${item.estoqueAtual};${qty};${item.contagem !== null ? item.diferenca : 0};${item.custoUnitario.toFixed(2)};${vlSistema.toFixed(2)};${vlContagem.toFixed(2)};${vlDif.toFixed(2)};${status}`;
  });
  return [header, ...rows].join("\n");
}

const defaultInventarios: Inventario[] = [];

export default function InventarioPage() {
  const { items: inventarios, addItem, updateItem } = useLocalStorage<Inventario>("inventarios_estoque", defaultInventarios);
  const [search, setSearch] = useState("");
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [modalContagemOpen, setModalContagemOpen] = useState(false);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [inventarioAtual, setInventarioAtual] = useState<Inventario | null>(null);
  const [itensContagem, setItensContagem] = useState<ItemInventario[]>([]);
  const [motivoInventario, setMotivoInventario] = useState("01");
  const relatorioRef = useRef<HTMLDivElement>(null);

  // Form novo inventário
  const [responsavel, setResponsavel] = useState("Admin");
  const [observacao, setObservacao] = useState("");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(new Date());
  const [tipoCusto, setTipoCusto] = useState<"aquisicao" | "reposicao" | "venda">("aquisicao");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<string>>(new Set());

  const produtosCadastro = useMemo(() => getProdutosCadastro(), [modalNovoOpen]);

  const produtosFiltrados = useMemo(() => {
    if (!buscaProduto) return produtosCadastro.filter(p => p.ativo);
    const term = buscaProduto.toLowerCase();
    return produtosCadastro.filter(p =>
      p.ativo && (
        p.descricao.toLowerCase().includes(term) ||
        p.codigo.includes(term) ||
        p.grupo?.toLowerCase().includes(term) ||
        p.categoria?.toLowerCase().includes(term)
      )
    );
  }, [produtosCadastro, buscaProduto]);

  const filtered = inventarios
    .filter(i => i.numero.toLowerCase().includes(search.toLowerCase()) || i.responsavel.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());

  const statusLabel = (s: string) => {
    if (s === "em_andamento") return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Em Andamento</Badge>;
    if (s === "finalizado") return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Finalizado</Badge>;
    return <Badge variant="destructive">Cancelado</Badge>;
  };

  const custoLabel = (tipo: string) => {
    if (tipo === "aquisicao") return "Custo Aquisição";
    if (tipo === "reposicao") return "Custo Reposição";
    return "Preço Venda";
  };

  const getCustoByTipo = (p: ProdutoCadastro, tipo: string) => {
    if (tipo === "aquisicao") return p.custoAquisicao || 0;
    if (tipo === "reposicao") return p.custoReposicao || 0;
    return p.venda || 0;
  };

  const toggleProduto = (id: string) => {
    setProdutosSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => {
    if (produtosSelecionados.size === produtosFiltrados.length) {
      setProdutosSelecionados(new Set());
    } else {
      setProdutosSelecionados(new Set(produtosFiltrados.map(p => p.id)));
    }
  };

  const abrirModalNovo = () => {
    setResponsavel("Admin");
    setObservacao("");
    setDataInicio(new Date());
    setTipoCusto("aquisicao");
    setBuscaProduto("");
    setProdutosSelecionados(new Set());
    setModalNovoOpen(true);
  };

  const handleCriarInventario = () => {
    if (produtosSelecionados.size === 0) {
      toast.error("Selecione ao menos um produto");
      return;
    }
    const selecionados = produtosCadastro.filter(p => produtosSelecionados.has(p.id));
    const itens: ItemInventario[] = selecionados.map(p => ({
      produtoCodigo: p.codigo,
      produtoDescricao: p.descricao,
      estoqueAtual: p.estoque,
      contagem: null,
      diferenca: 0,
      ajustado: false,
      custoUnitario: getCustoByTipo(p, tipoCusto),
      tipoCusto,
      ncm: p.ncm || "",
      unidade: p.unidade || "UN",
    }));
    const numero = `INV-${String(inventarios.length + 1).padStart(3, "0")}`;
    addItem({
      numero,
      dataInicio: dataInicio ? dataInicio.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      dataFim: null,
      status: "em_andamento",
      responsavel,
      observacao,
      tipoCusto,
      itens,
    });
    toast.success(`Inventário ${numero} criado com ${itens.length} itens`);
    setModalNovoOpen(false);
  };

  const abrirContagem = (inv: Inventario) => {
    setInventarioAtual(inv);
    setItensContagem(inv.itens.map(i => ({ ...i })));
    setModalContagemOpen(true);
  };

  const atualizarContagem = (idx: number, valor: string) => {
    setItensContagem(prev => {
      const updated = [...prev];
      const contagem = valor === "" ? null : parseFloat(valor);
      updated[idx] = {
        ...updated[idx],
        contagem,
        diferenca: contagem !== null ? contagem - updated[idx].estoqueAtual : 0,
      };
      return updated;
    });
  };

  const salvarContagem = (finalizar: boolean) => {
    if (!inventarioAtual) return;
    const itensFinais = itensContagem.map(i => ({
      ...i,
      ajustado: finalizar && i.contagem !== null,
    }));
    updateItem(inventarioAtual.id, {
      itens: itensFinais,
      status: finalizar ? "finalizado" : "em_andamento",
      dataFim: finalizar ? new Date().toISOString().split("T")[0] : null,
    });
    if (finalizar) {
      toast.success("Inventário finalizado! Gerando relatório SEFAZ...");
      // Atualiza inventarioAtual para abrir relatório
      const invFinalizado = {
        ...inventarioAtual,
        itens: itensFinais,
        status: "finalizado" as const,
        dataFim: new Date().toISOString().split("T")[0],
      };
      setModalContagemOpen(false);
      setTimeout(() => {
        setInventarioAtual(invFinalizado);
        setModalRelatorioOpen(true);
      }, 500);
    } else {
      toast.success("Contagem salva como rascunho");
      setModalContagemOpen(false);
    }
  };

  const abrirRelatorio = (inv: Inventario) => {
    setInventarioAtual(inv);
    setModalRelatorioOpen(true);
  };

  const totalDivergencias = (itens: ItemInventario[]) => itens.filter(i => i.contagem !== null && i.diferenca !== 0).length;

  const calcularValorTotal = (itens: ItemInventario[]) => {
    return itens.reduce((acc, i) => acc + (i.contagem !== null ? i.contagem : i.estoqueAtual) * i.custoUnitario, 0);
  };

  const calcularDiferencaValor = (itens: ItemInventario[]) => {
    return itens.reduce((acc, i) => acc + (i.contagem !== null ? i.diferenca * i.custoUnitario : 0), 0);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBlocoH = () => {
    if (!inventarioAtual) return;
    const txt = gerarBlocoH(inventarioAtual, motivoInventario);
    downloadFile(txt, `BlocoH_${inventarioAtual.numero}.txt`, "text/plain");
    toast.success("Bloco H exportado com sucesso!");
  };

  const handleExportCSV = () => {
    if (!inventarioAtual) return;
    const csv = gerarRelatorioCSV(inventarioAtual);
    downloadFile(csv, `Inventario_${inventarioAtual.numero}.csv`, "text/csv");
    toast.success("Relatório CSV exportado!");
  };

  const handlePrint = () => {
    if (!relatorioRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Relatório Inventário SEFAZ</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 11px; margin: 20px; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; text-align: center; margin-bottom: 16px; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; font-size: 10px; }
        th { background: #eee; font-weight: bold; }
        .right { text-align: right; }
        .center { text-align: center; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 12px; border: 1px solid #333; padding: 8px; }
        .header-info div { font-size: 11px; }
        .totals { margin-top: 12px; border: 1px solid #333; padding: 8px; }
        .totals p { margin: 2px 0; font-size: 11px; }
        .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #666; }
        .divergente { background: #fff3cd; }
        .negativo { color: red; }
        .positivo { color: green; }
        @media print { body { margin: 10px; } }
      </style></head><body>
      ${relatorioRef.current.innerHTML}
      <div class="footer">
        <p>Documento gerado em ${new Date().toLocaleString("pt-BR")} — Conforme layout SPED Fiscal (Bloco H)</p>
        <p>Registro H005 (Totais) / H010 (Inventário) / H020 (Informação Complementar)</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const motivosInventario: Record<string, string> = {
    "01": "01 - Final do período",
    "02": "02 - Mudança de forma de tributação",
    "03": "03 - Baixa cadastral",
    "04": "04 - Regime de estimativa",
    "05": "05 - Inventário rotativo",
    "06": "06 - Determinação dos fiscos",
  };

  return (
    <div className="page-container">
      <PageHeader title="Inventário de Estoque" description="Realize contagens, ajustes e gere relatórios conforme SEFAZ (Bloco H)" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><ClipboardList className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{inventarios.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Clock className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Em Andamento</p>
              <p className="text-xl font-bold">{inventarios.filter(i => i.status === "em_andamento").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><PackageCheck className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Finalizados</p>
              <p className="text-xl font-bold">{inventarios.filter(i => i.status === "finalizado").length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Cadastrados</p>
              <p className="text-xl font-bold">{getProdutosCadastro().filter(p => p.ativo).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar inventário..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={abrirModalNovo}><Plus className="h-4 w-4 mr-2" />Novo Inventário</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Divergências</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum inventário encontrado</TableCell></TableRow>
              ) : filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.numero}</TableCell>
                  <TableCell>{new Date(inv.dataInicio).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{inv.dataFim ? new Date(inv.dataFim).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  <TableCell>{statusLabel(inv.status)}</TableCell>
                  <TableCell className="text-xs">{custoLabel(inv.tipoCusto)}</TableCell>
                  <TableCell>{inv.responsavel}</TableCell>
                  <TableCell className="text-right">{inv.itens.length}</TableCell>
                  <TableCell className="text-right">
                    {totalDivergencias(inv.itens) > 0 ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{totalDivergencias(inv.itens)}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant={inv.status === "em_andamento" ? "default" : "outline"} onClick={() => abrirContagem(inv)}>
                        {inv.status === "em_andamento" ? "Contar" : "Ver"}
                      </Button>
                      {inv.status === "finalizado" && (
                        <Button size="sm" variant="outline" onClick={() => abrirRelatorio(inv)} title="Relatório SEFAZ">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Novo Inventário */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Inventário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Responsável</Label>
                <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} />
              </div>
              <div>
                <Label>Data de Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Custo para Valorização</Label>
                <Select value={tipoCusto} onValueChange={(v: any) => setTipoCusto(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aquisicao">Custo Aquisição</SelectItem>
                    <SelectItem value="reposicao">Custo Reposição</SelectItem>
                    <SelectItem value="venda">Preço Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Ex: Inventário mensal março" />
            </div>
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Selecionar Produtos ({produtosSelecionados.size} selecionados)</Label>
                <Button size="sm" variant="outline" onClick={selecionarTodos}>
                  {produtosSelecionados.size === produtosFiltrados.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </Button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto por nome, código, grupo..." className="pl-9" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} />
              </div>
              {produtosFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {produtosCadastro.length === 0 ? "Nenhum produto cadastrado. Cadastre produtos primeiro." : "Nenhum produto encontrado."}
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Grupo</TableHead>
                        <TableHead className="text-right">Estoque</TableHead>
                        <TableHead className="text-right">{custoLabel(tipoCusto)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosFiltrados.map(p => (
                        <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleProduto(p.id)}>
                          <TableCell>
                            <Checkbox checked={produtosSelecionados.has(p.id)} onCheckedChange={() => toggleProduto(p.id)} />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                          <TableCell>{p.descricao}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{p.grupo || "—"}</TableCell>
                          <TableCell className="text-right">{p.estoque}</TableCell>
                          <TableCell className="text-right">R$ {getCustoByTipo(p, tipoCusto).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNovoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarInventario} disabled={produtosSelecionados.size === 0}>
              Criar Inventário ({produtosSelecionados.size} itens)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Contagem */}
      <Dialog open={modalContagemOpen} onOpenChange={setModalContagemOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Contagem — {inventarioAtual?.numero}
              {inventarioAtual && statusLabel(inventarioAtual.status)}
            </DialogTitle>
            {inventarioAtual && (
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                <span>Início: {new Date(inventarioAtual.dataInicio).toLocaleDateString("pt-BR")}</span>
                {inventarioAtual.dataFim && <span>Fim: {new Date(inventarioAtual.dataFim).toLocaleDateString("pt-BR")}</span>}
                <span>Custo: {custoLabel(inventarioAtual.tipoCusto)}</span>
              </div>
            )}
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor Estoque Atual</p>
              <p className="text-lg font-bold">R$ {itensContagem.reduce((a, i) => a + i.estoqueAtual * i.custoUnitario, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor Contagem</p>
              <p className="text-lg font-bold">R$ {calcularValorTotal(itensContagem).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Diferença (R$)</p>
              <p className={`text-lg font-bold ${calcularDiferencaValor(itensContagem) > 0 ? "text-green-600" : calcularDiferencaValor(itensContagem) < 0 ? "text-destructive" : ""}`}>
                R$ {calcularDiferencaValor(itensContagem).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Custo Un.</TableHead>
                <TableHead className="text-right">Est. Atual</TableHead>
                <TableHead className="text-right w-28">Contagem</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-right">Valor Dif.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itensContagem.map((item, idx) => (
                <TableRow key={idx} className={item.diferenca !== 0 && item.contagem !== null ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono text-sm">{item.produtoCodigo}</TableCell>
                  <TableCell>{item.produtoDescricao}</TableCell>
                  <TableCell className="text-right text-sm">R$ {item.custoUnitario.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{item.estoqueAtual}</TableCell>
                  <TableCell className="text-right">
                    {inventarioAtual?.status === "em_andamento" ? (
                      <Input
                        type="number"
                        min="0"
                        className="w-24 text-right ml-auto"
                        value={item.contagem ?? ""}
                        onChange={e => atualizarContagem(idx, e.target.value)}
                      />
                    ) : (
                      <span>{item.contagem ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${item.diferenca > 0 ? "text-green-600" : item.diferenca < 0 ? "text-destructive" : ""}`}>
                    {item.contagem !== null ? (item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca) : "—"}
                  </TableCell>
                  <TableCell className={`text-right text-sm ${item.diferenca !== 0 && item.contagem !== null ? (item.diferenca > 0 ? "text-green-600" : "text-destructive") : ""}`}>
                    {item.contagem !== null && item.diferenca !== 0
                      ? `R$ ${(item.diferenca * item.custoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {item.ajustado ? (
                      <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Ajustado</Badge>
                    ) : item.contagem !== null && item.diferenca !== 0 ? (
                      <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300"><AlertTriangle className="h-3 w-3" />Divergente</Badge>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {inventarioAtual?.status === "em_andamento" && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setModalContagemOpen(false)}>Cancelar</Button>
              <Button variant="secondary" onClick={() => salvarContagem(false)}>Salvar Rascunho</Button>
              <Button onClick={() => salvarContagem(true)}>Finalizar e Ajustar Estoque</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Relatório SEFAZ */}
      <Dialog open={modalRelatorioOpen} onOpenChange={setModalRelatorioOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Inventário — SEFAZ (Bloco H)
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <Label>Motivo do Inventário (MOT_INV)</Label>
              <Select value={motivoInventario} onValueChange={setMotivoInventario}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(motivosInventario).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportBlocoH}><Download className="h-4 w-4 mr-2" />Bloco H (TXT)</Button>
            <Button variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-2" />CSV</Button>
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
          </div>

          {inventarioAtual && (
            <div ref={relatorioRef}>
              <h1 style={{ fontSize: 16, textAlign: "center", marginBottom: 4 }}>RELATÓRIO DE INVENTÁRIO DE ESTOQUE</h1>
              <h2 style={{ fontSize: 13, textAlign: "center", marginBottom: 16, color: "#555" }}>
                Conforme Guia Prático EFD-ICMS/IPI — Bloco H (Registros H005, H010, H020)
              </h2>

              <div style={{ display: "flex", justifyContent: "space-between", border: "1px solid #333", padding: 8, marginBottom: 12, fontSize: 11 }}>
                <div>
                  <strong>Inventário:</strong> {inventarioAtual.numero}<br />
                  <strong>Responsável:</strong> {inventarioAtual.responsavel}
                </div>
                <div>
                  <strong>Data Início:</strong> {new Date(inventarioAtual.dataInicio).toLocaleDateString("pt-BR")}<br />
                  <strong>Data Fim:</strong> {inventarioAtual.dataFim ? new Date(inventarioAtual.dataFim).toLocaleDateString("pt-BR") : "—"}
                </div>
                <div>
                  <strong>Motivo (MOT_INV):</strong> {motivosInventario[motivoInventario]}<br />
                  <strong>Valorização:</strong> {custoLabel(inventarioAtual.tipoCusto)}
                </div>
              </div>

              {/* Registro H005 */}
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>Registro H005 — Totais do Inventário</strong>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
                  <thead>
                    <tr style={{ background: "#eee" }}>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>REG</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>DT_INV</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>VL_AJ_INV</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>MOT_INV</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>H005</td>
                      <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>
                        {(inventarioAtual.dataFim || inventarioAtual.dataInicio).replace(/-/g, "")}
                      </td>
                      <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>
                        {calcularValorTotal(inventarioAtual.itens).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>{motivoInventario}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Registro H010 */}
              <div style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 12 }}>Registro H010 — Inventário</strong>
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
                  <thead>
                    <tr style={{ background: "#eee" }}>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>COD_ITEM</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>Descrição</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>UNID</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>NCM</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>Est.Sist.</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>QTD (Contagem)</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>Diferença</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>VL_UNIT</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>VL_ITEM</th>
                      <th style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>IND_PROP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventarioAtual.itens.map((item, idx) => {
                      const qty = item.contagem !== null ? item.contagem : item.estoqueAtual;
                      const vlItem = qty * item.custoUnitario;
                      const isDivergente = item.contagem !== null && item.diferenca !== 0;
                      return (
                        <tr key={idx} style={isDivergente ? { background: "#fff3cd" } : {}}>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, fontFamily: "monospace" }}>{item.produtoCodigo}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10 }}>{item.produtoDescricao}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "center" }}>{item.unidade || "UN"}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, fontFamily: "monospace" }}>{item.ncm || "—"}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>{item.estoqueAtual.toFixed(3)}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>{qty.toFixed(3)}</td>
                          <td style={{
                            border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right", fontWeight: "bold",
                            color: item.diferenca > 0 ? "green" : item.diferenca < 0 ? "red" : "inherit"
                          }}>
                            {item.contagem !== null ? (item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca.toString()) : "—"}
                          </td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>{item.custoUnitario.toFixed(6)}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "right" }}>{vlItem.toFixed(2)}</td>
                          <td style={{ border: "1px solid #333", padding: "4px 6px", fontSize: 10, textAlign: "center" }}>0</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totais */}
              <div style={{ border: "1px solid #333", padding: 8, marginTop: 12 }}>
                <p style={{ margin: "2px 0", fontSize: 11 }}><strong>Total de Itens:</strong> {inventarioAtual.itens.length}</p>
                <p style={{ margin: "2px 0", fontSize: 11 }}><strong>Valor Total Estoque (Sistema):</strong> R$ {inventarioAtual.itens.reduce((a, i) => a + i.estoqueAtual * i.custoUnitario, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p style={{ margin: "2px 0", fontSize: 11 }}><strong>Valor Total Contagem:</strong> R$ {calcularValorTotal(inventarioAtual.itens).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p style={{ margin: "2px 0", fontSize: 11, color: calcularDiferencaValor(inventarioAtual.itens) < 0 ? "red" : calcularDiferencaValor(inventarioAtual.itens) > 0 ? "green" : "inherit" }}>
                  <strong>Diferença Total:</strong> R$ {calcularDiferencaValor(inventarioAtual.itens).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p style={{ margin: "2px 0", fontSize: 11 }}><strong>Itens com Divergência:</strong> {totalDivergencias(inventarioAtual.itens)}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRelatorioOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
