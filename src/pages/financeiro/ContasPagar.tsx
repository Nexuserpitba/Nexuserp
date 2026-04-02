import { CurrencyInput } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Search, DollarSign, CalendarIcon, AlertTriangle,
  CheckCircle2, Clock, FileText, Upload, CreditCard, Trash2, Loader2, Users
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { format, addDays, addMonths, isBefore, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ========== Interfaces ==========

interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  valorPago: number;
  status: "aberta" | "paga" | "vencida" | "parcial";
  formaPagamento: string;
}

interface ContaPagar {
  id: string;
  tipo: "manual" | "nfe";
  nfeNumero?: string;
  nfeChave?: string;
  fornecedor: string;
  fornecedorDoc: string;
  descricao: string;
  categoria: string;
  dataEmissao: string;
  valorTotal: number;
  parcelas: Parcela[];
  observacao: string;
  status: "aberta" | "paga" | "parcial" | "vencida" | "cancelada";
}

interface NFeEntrada {
  numero: string;
  chave: string;
  fornecedor: string;
  cnpj: string;
  dataEmissao: string;
  valorTotal: number;
  itens: number;
}

// ========== Helpers ==========

function getPessoas(): Array<{ id: string; nome: string; cpfCnpj: string; tipo: string; email?: string; telefone?: string }> {
  try {
    const stored = localStorage.getItem("pessoas");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

async function buscarCnpjApi(cnpj: string): Promise<{ nome: string; cnpj: string } | null> {
  try {
    const limpo = cnpj.replace(/\D/g, "");
    if (limpo.length !== 14) return null;
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
    if (!res.ok) return null;
    const data = await res.json();
    return { nome: data.razao_social || data.nome_fantasia || "", cnpj: limpo };
  } catch { return null; }
}

const categorias = [
  "Mercadorias / Estoque",
  "Serviços",
  "Aluguel",
  "Energia / Água / Telefone",
  "Impostos / Tributos",
  "Folha de Pagamento",
  "Frete / Transporte",
  "Manutenção / Reparos",
  "Material de Escritório",
  "Outras Despesas",
];

const formasPagamento = ["Dinheiro", "PIX", "Boleto", "Transferência", "Cartão Crédito", "Cheque", "Débito Automático"];

function calcularStatus(parcelas: Parcela[]): ContaPagar["status"] {
  const hoje = new Date().toISOString().split("T")[0];
  const todasPagas = parcelas.every(p => p.status === "paga");
  if (todasPagas) return "paga";
  const algumaPaga = parcelas.some(p => p.status === "paga" || p.status === "parcial");
  const algumaVencida = parcelas.some(p => p.status !== "paga" && p.vencimento < hoje);
  if (algumaVencida) return "vencida";
  if (algumaPaga) return "parcial";
  return "aberta";
}

function gerarParcelas(valorTotal: number, numParcelas: number, primeiroVencimento: Date, intervalo: number): Parcela[] {
  const valorParcela = Math.floor(valorTotal / numParcelas * 100) / 100;
  const resto = Math.round((valorTotal - valorParcela * numParcelas) * 100) / 100;
  return Array.from({ length: numParcelas }, (_, i) => ({
    numero: i + 1,
    valor: i === 0 ? valorParcela + resto : valorParcela,
    vencimento: format(addDays(primeiroVencimento, i * intervalo), "yyyy-MM-dd"),
    dataPagamento: null,
    valorPago: 0,
    status: "aberta" as const,
    formaPagamento: "",
  }));
}

// NF-e de entrada mock
const nfesEntradaMock: NFeEntrada[] = [
  { numero: "123456", chave: "35260312345678000195550010001234561001234567", fornecedor: "Distribuidora ABC Ltda", cnpj: "12.345.678/0001-95", dataEmissao: "2026-03-01", valorTotal: 15800.00, itens: 42 },
  { numero: "789012", chave: "35260398765432000100550010007890121009876543", fornecedor: "Tech Parts Indústria", cnpj: "98.765.432/0001-00", dataEmissao: "2026-03-05", valorTotal: 8450.50, itens: 15 },
  { numero: "345678", chave: "35260311223344000155550010003456781001122334", fornecedor: "Alimentos Premium SA", cnpj: "11.223.344/0001-55", dataEmissao: "2026-03-06", valorTotal: 3200.00, itens: 28 },
];

const defaultContas: ContaPagar[] = [
  {
    id: "1", tipo: "manual", fornecedor: "Imobiliária Central", fornecedorDoc: "45.678.901/0001-23",
    descricao: "Aluguel Loja Centro - Março/2026", categoria: "Aluguel", dataEmissao: "2026-03-01", valorTotal: 4500.00,
    parcelas: [{ numero: 1, valor: 4500, vencimento: "2026-03-10", dataPagamento: null, valorPago: 0, status: "aberta", formaPagamento: "" }],
    observacao: "", status: "aberta",
  },
  {
    id: "2", tipo: "nfe", nfeNumero: "123456", nfeChave: "35260312345678000195550010001234561001234567",
    fornecedor: "Distribuidora ABC Ltda", fornecedorDoc: "12.345.678/0001-95",
    descricao: "NF-e 123456 - Mercadorias", categoria: "Mercadorias / Estoque", dataEmissao: "2026-03-01", valorTotal: 15800.00,
    parcelas: [
      { numero: 1, valor: 5266.67, vencimento: "2026-03-15", dataPagamento: "2026-03-15", valorPago: 5266.67, status: "paga", formaPagamento: "Boleto" },
      { numero: 2, valor: 5266.67, vencimento: "2026-04-15", dataPagamento: null, valorPago: 0, status: "aberta", formaPagamento: "" },
      { numero: 3, valor: 5266.66, vencimento: "2026-05-15", dataPagamento: null, valorPago: 0, status: "aberta", formaPagamento: "" },
    ],
    observacao: "Compra mensal", status: "parcial",
  },
];

// ========== Component ==========

export default function ContasPagar() {
  const { items: contas, addItem, updateItem, deleteItem } = useLocalStorage<ContaPagar>("contas_pagar", defaultContas);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalManualOpen, setModalManualOpen] = useState(false);
  const [modalNfeOpen, setModalNfeOpen] = useState(false);
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [contaAtual, setContaAtual] = useState<ContaPagar | null>(null);
  const [parcelaIdx, setParcelaIdx] = useState(0);

  // Form manual
  const [formFornecedor, setFormFornecedor] = useState("");
  const [formFornecedorDoc, setFormFornecedorDoc] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formValorTotal, setFormValorTotal] = useState("");
  const [formNumParcelas, setFormNumParcelas] = useState("1");
  const [formIntervalo, setFormIntervalo] = useState("30");
  const [formVencimento, setFormVencimento] = useState<Date | undefined>(addDays(new Date(), 30));
  const [formObservacao, setFormObservacao] = useState("");

  // Busca fornecedor
  const [buscaFornecedor, setBuscaFornecedor] = useState("");
  const [fornecedorAberto, setFornecedorAberto] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjBusca, setCnpjBusca] = useState("");

  const pessoasCadastro = useMemo(() => getPessoas(), [modalManualOpen]);

  const pessoasFiltradas = useMemo(() => {
    if (!buscaFornecedor) return pessoasCadastro.slice(0, 20);
    const term = buscaFornecedor.toLowerCase();
    return pessoasCadastro.filter(p =>
      p.nome.toLowerCase().includes(term) ||
      p.cpfCnpj.includes(term)
    ).slice(0, 20);
  }, [pessoasCadastro, buscaFornecedor]);

  const selecionarFornecedor = (pessoa: { nome: string; cpfCnpj: string }) => {
    setFormFornecedor(pessoa.nome);
    setFormFornecedorDoc(pessoa.cpfCnpj);
    setFornecedorAberto(false);
    setBuscaFornecedor("");
  };

  const buscarPorCnpj = async () => {
    const limpo = cnpjBusca.replace(/\D/g, "");
    if (limpo.length < 11) { toast.error("CNPJ/CPF inválido"); return; }

    // Primeiro busca no cadastro local
    const local = pessoasCadastro.find(p => p.cpfCnpj.replace(/\D/g, "") === limpo);
    if (local) {
      selecionarFornecedor(local);
      setCnpjBusca("");
      toast.success("Fornecedor encontrado no cadastro!");
      return;
    }

    // Se não encontrou e é CNPJ, busca na BrasilAPI
    if (limpo.length === 14) {
      setBuscandoCnpj(true);
      const resultado = await buscarCnpjApi(limpo);
      setBuscandoCnpj(false);
      if (resultado) {
        setFormFornecedor(resultado.nome);
        setFormFornecedorDoc(cnpjBusca);
        setCnpjBusca("");
        toast.success("CNPJ encontrado via BrasilAPI!");
      } else {
        toast.error("CNPJ não encontrado");
      }
    } else {
      toast.error("CPF/CNPJ não encontrado no cadastro");
    }
  };
  const [baixaValor, setBaixaValor] = useState("");
  const [baixaData, setBaixaData] = useState<Date | undefined>(new Date());
  const [baixaForma, setBaixaForma] = useState("");

  // NF-e
  const [nfeSelecionadas, setNfeSelecionadas] = useState<Set<string>>(new Set());
  const [nfeNumParcelas, setNfeNumParcelas] = useState("1");
  const [nfeIntervalo, setNfeIntervalo] = useState("30");
  const [nfeVencimento, setNfeVencimento] = useState<Date | undefined>(addDays(new Date(), 30));

  // Atualizar status das contas vencidas
  const contasAtualizadas = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return contas.map(c => {
      const parcelas = c.parcelas.map(p => {
        if (p.status === "aberta" && p.vencimento < hoje) return { ...p, status: "vencida" as const };
        return p;
      });
      return { ...c, parcelas, status: calcularStatus(parcelas) };
    });
  }, [contas]);

  const filtered = contasAtualizadas
    .filter(c => filtroStatus === "todos" || c.status === filtroStatus)
    .filter(c =>
      c.fornecedor.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.nfeNumero?.includes(search) ||
      c.fornecedorDoc.includes(search)
    )
    .sort((a, b) => {
      const aMin = Math.min(...a.parcelas.filter(p => p.status !== "paga").map(p => new Date(p.vencimento).getTime()));
      const bMin = Math.min(...b.parcelas.filter(p => p.status !== "paga").map(p => new Date(p.vencimento).getTime()));
      return aMin - bMin;
    });

  // Totais
  const totalAberto = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status !== "paga").reduce((a, p) => a + p.valor - p.valorPago, 0), 0);
  const totalVencido = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status === "vencida").reduce((a, p) => a + p.valor - p.valorPago, 0), 0);
  const totalPagoMes = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status === "paga" && p.dataPagamento?.startsWith(format(new Date(), "yyyy-MM"))).reduce((a, p) => a + p.valorPago, 0), 0);

  const statusBadge = (s: string) => {
    switch (s) {
      case "aberta": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Aberta</Badge>;
      case "paga": return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Paga</Badge>;
      case "parcial": return <Badge className="gap-1 bg-blue-600"><CreditCard className="h-3 w-3" />Parcial</Badge>;
      case "vencida": return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Vencida</Badge>;
      case "cancelada": return <Badge variant="secondary">Cancelada</Badge>;
      default: return null;
    }
  };

  // ===== Lançamento Manual =====
  const abrirManual = () => {
    setFormFornecedor(""); setFormFornecedorDoc(""); setFormDescricao("");
    setFormCategoria(""); setFormValorTotal(""); setFormNumParcelas("1");
    setFormIntervalo("30"); setFormVencimento(addDays(new Date(), 30)); setFormObservacao("");
    setBuscaFornecedor(""); setCnpjBusca(""); setFornecedorAberto(false);
    setModalManualOpen(true);
  };

  const salvarManual = () => {
    if (!formFornecedor || !formDescricao || !formValorTotal || !formVencimento) {
      toast.error("Preencha fornecedor, descrição, valor e vencimento");
      return;
    }
    const valor = parseFloat(formValorTotal);
    const numP = parseInt(formNumParcelas) || 1;
    const intervalo = parseInt(formIntervalo) || 30;
    const parcelas = gerarParcelas(valor, numP, formVencimento, intervalo);

    addItem({
      tipo: "manual",
      fornecedor: formFornecedor,
      fornecedorDoc: formFornecedorDoc,
      descricao: formDescricao,
      categoria: formCategoria,
      dataEmissao: format(new Date(), "yyyy-MM-dd"),
      valorTotal: valor,
      parcelas,
      observacao: formObservacao,
      status: "aberta",
    });
    toast.success(`Conta lançada com ${numP} parcela(s)`);
    setModalManualOpen(false);
  };

  // ===== Lançamento via NF-e =====
  const abrirNfe = () => {
    setNfeSelecionadas(new Set());
    setNfeNumParcelas("1");
    setNfeIntervalo("30");
    setNfeVencimento(addDays(new Date(), 30));
    setModalNfeOpen(true);
  };

  const jaImportada = (nfeNum: string) => contas.some(c => c.nfeNumero === nfeNum);

  const importarNfes = () => {
    if (nfeSelecionadas.size === 0 || !nfeVencimento) {
      toast.error("Selecione ao menos uma NF-e e defina o vencimento");
      return;
    }
    const numP = parseInt(nfeNumParcelas) || 1;
    const intervalo = parseInt(nfeIntervalo) || 30;
    let count = 0;

    nfeSelecionadas.forEach(chave => {
      const nfe = nfesEntradaMock.find(n => n.chave === chave);
      if (!nfe || jaImportada(nfe.numero)) return;
      const parcelas = gerarParcelas(nfe.valorTotal, numP, nfeVencimento!, intervalo);
      addItem({
        tipo: "nfe",
        nfeNumero: nfe.numero,
        nfeChave: nfe.chave,
        fornecedor: nfe.fornecedor,
        fornecedorDoc: nfe.cnpj,
        descricao: `NF-e ${nfe.numero} - ${nfe.itens} itens`,
        categoria: "Mercadorias / Estoque",
        dataEmissao: nfe.dataEmissao,
        valorTotal: nfe.valorTotal,
        parcelas,
        observacao: "",
        status: "aberta",
      });
      count++;
    });

    toast.success(`${count} NF-e(s) importada(s) com ${numP} parcela(s) cada`);
    setModalNfeOpen(false);
  };

  // ===== Baixa de Parcela =====
  const abrirBaixa = (conta: ContaPagar, idx: number) => {
    setContaAtual(conta);
    setParcelaIdx(idx);
    const parcela = conta.parcelas[idx];
    setBaixaValor((parcela.valor - parcela.valorPago).toFixed(2));
    setBaixaData(new Date());
    setBaixaForma("");
    setModalBaixaOpen(true);
  };

  const confirmarBaixa = () => {
    if (!contaAtual || !baixaForma || !baixaData) {
      toast.error("Preencha forma de pagamento e data");
      return;
    }
    const valor = parseFloat(baixaValor) || 0;
    if (valor <= 0) { toast.error("Valor inválido"); return; }

    const parcelas = [...contaAtual.parcelas];
    const p = parcelas[parcelaIdx];
    const novoPago = p.valorPago + valor;
    parcelas[parcelaIdx] = {
      ...p,
      valorPago: novoPago,
      dataPagamento: format(baixaData, "yyyy-MM-dd"),
      formaPagamento: baixaForma,
      status: novoPago >= p.valor ? "paga" : "parcial",
    };

    updateItem(contaAtual.id, { parcelas, status: calcularStatus(parcelas) });
    toast.success(`Parcela ${p.numero} baixada — R$ ${valor.toFixed(2)}`);
    setModalBaixaOpen(false);
  };

  // ===== Detalhes =====
  const abrirDetalhes = (conta: ContaPagar) => {
    setContaAtual(conta);
    setModalDetalhesOpen(true);
  };

  return (
    <div className="page-container">
      <PageHeader title="Contas a Pagar" description="Gerencie pagamentos manuais e oriundos de NF-e de entrada" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total em Aberto</p>
              <p className="text-xl font-bold">R$ {totalAberto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Vencido</p>
              <p className="text-xl font-bold text-destructive">R$ {totalVencido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pago este Mês</p>
              <p className="text-xl font-bold text-green-600">R$ {totalPagoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Títulos</p>
              <p className="text-xl font-bold">{contas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por fornecedor, descrição ou NF-e..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
              </SelectContent>
            </Select>
            <ExportButtons options={{
              title: "Contas a Pagar",
              subtitle: `Relatório gerado em ${new Date().toLocaleDateString("pt-BR")}`,
              filename: `Contas_Pagar_${format(new Date(), "yyyy-MM-dd")}`,
              columns: [
                { header: "Fornecedor", key: "fornecedor" },
                { header: "Descrição", key: "descricao" },
                { header: "Categoria", key: "categoria" },
                { header: "Valor Total", key: "valorTotal", align: "right", format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { header: "Status", key: "status" },
              ],
              data: filtered,
              summaryRows: [
                { label: "Total", value: `R$ ${filtered.reduce((s, c) => s + c.valorTotal, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { label: "Registros", value: String(filtered.length) },
              ],
            }} />
            <Button variant="outline" onClick={abrirNfe}><Upload className="h-4 w-4 mr-2" />Importar NF-e</Button>
            <Button onClick={abrirManual}><Plus className="h-4 w-4 mr-2" />Lançamento Manual</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Próx. Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
              ) : filtered.map(c => {
                const proxVenc = c.parcelas.filter(p => p.status !== "paga").sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
                const totalPago = c.parcelas.reduce((s, p) => s + p.valorPago, 0);
                return (
                  <TableRow key={c.id} className={c.status === "vencida" ? "bg-destructive/5" : ""}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.tipo === "nfe" ? <><FileText className="h-3 w-3 mr-1" />NF-e {c.nfeNumero}</> : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>{c.fornecedor}</div>
                      <div className="text-xs text-muted-foreground">{c.fornecedorDoc}</div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{c.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.categoria || "—"}</TableCell>
                    <TableCell className="text-right font-medium">R$ {c.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-sm">R$ {totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={proxVenc && proxVenc.status === "vencida" ? "text-destructive font-medium" : ""}>
                      {proxVenc ? new Date(proxVenc.vencimento).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => abrirDetalhes(c)}>Detalhes</Button>
                        {c.status !== "paga" && c.status !== "cancelada" && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { updateItem(c.id, { status: "cancelada" }); toast.success("Conta cancelada"); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ===== Modal Lançamento Manual ===== */}
      <Dialog open={modalManualOpen} onOpenChange={setModalManualOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Lançamento Manual</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Busca por CNPJ */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Buscar Fornecedor</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Digite o CNPJ/CPF para buscar..."
                  value={cnpjBusca}
                  onChange={e => setCnpjBusca(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && buscarPorCnpj()}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={buscarPorCnpj} disabled={buscandoCnpj}>
                  {buscandoCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Busca no cadastro de pessoas e, se não encontrar, consulta o CNPJ via BrasilAPI</p>

              {/* Busca por nome no cadastro */}
              <div className="mt-2">
                <Popover open={fornecedorAberto} onOpenChange={setFornecedorAberto}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal gap-2">
                      <Users className="h-4 w-4" />
                      {formFornecedor || "Ou selecione do cadastro de pessoas..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar por nome ou documento..." value={buscaFornecedor} onValueChange={setBuscaFornecedor} />
                      <CommandList>
                        <CommandEmpty>Nenhuma pessoa encontrada</CommandEmpty>
                        <CommandGroup heading="Cadastro de Pessoas">
                          {pessoasFiltradas.map(p => (
                            <CommandItem key={p.id} onSelect={() => selecionarFornecedor(p)} className="cursor-pointer">
                              <div className="flex justify-between w-full">
                                <span>{p.nome}</span>
                                <span className="text-xs text-muted-foreground">{p.cpfCnpj}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fornecedor *</Label>
                <Input value={formFornecedor} onChange={e => setFormFornecedor(e.target.value)} placeholder="Nome do fornecedor" />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={formFornecedorDoc} onChange={e => setFormFornecedorDoc(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={formCategoria} onValueChange={setFormCategoria}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Ex: Aluguel março/2026" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Valor Total *</Label>
                <CurrencyInput value={parseFloat(formValorTotal) || 0} onValueChange={v => setFormValorTotal(String(v))} />
              </div>
              <div>
                <Label>Nº Parcelas</Label>
                <Input type="number" min="1" max="48" value={formNumParcelas} onChange={e => setFormNumParcelas(e.target.value)} />
              </div>
              <div>
                <Label>Intervalo (dias)</Label>
                <Input type="number" min="1" value={formIntervalo} onChange={e => setFormIntervalo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>1º Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formVencimento && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formVencimento ? format(formVencimento, "dd/MM/yyyy") : "Selecione..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formVencimento} onSelect={setFormVencimento} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            {formValorTotal && parseInt(formNumParcelas) > 1 && formVencimento && (
              <div className="border rounded p-2 text-sm space-y-1">
                <p className="font-semibold text-xs text-muted-foreground">Prévia das parcelas:</p>
                {gerarParcelas(parseFloat(formValorTotal), parseInt(formNumParcelas), formVencimento, parseInt(formIntervalo) || 30).map(p => (
                  <div key={p.numero} className="flex justify-between">
                    <span>Parcela {p.numero}</span>
                    <span>R$ {p.valor.toFixed(2)} — venc. {new Date(p.vencimento).toLocaleDateString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label>Observação</Label>
              <Textarea value={formObservacao} onChange={e => setFormObservacao(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalManualOpen(false)}>Cancelar</Button>
            <Button onClick={salvarManual}>Lançar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Importar NF-e ===== */}
      <Dialog open={modalNfeOpen} onOpenChange={setModalNfeOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Contas de NF-e de Entrada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg p-3">
              <Label className="text-base font-semibold mb-3 block">NF-e de Entrada Disponíveis</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nfesEntradaMock.map(nfe => {
                    const importada = jaImportada(nfe.numero);
                    return (
                      <TableRow key={nfe.chave} className={importada ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}>
                        <TableCell>
                          <Checkbox
                            disabled={importada}
                            checked={nfeSelecionadas.has(nfe.chave)}
                            onCheckedChange={() => {
                              setNfeSelecionadas(prev => {
                                const next = new Set(prev);
                                if (next.has(nfe.chave)) next.delete(nfe.chave);
                                else next.add(nfe.chave);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{nfe.numero}</TableCell>
                        <TableCell>{nfe.fornecedor}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{nfe.cnpj}</TableCell>
                        <TableCell>{new Date(nfe.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-right font-medium">R$ {nfe.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell>
                          {importada ? <Badge variant="secondary">Já importada</Badge> : <Badge variant="outline">Disponível</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Nº Parcelas</Label>
                <Input type="number" min="1" max="48" value={nfeNumParcelas} onChange={e => setNfeNumParcelas(e.target.value)} />
              </div>
              <div>
                <Label>Intervalo (dias)</Label>
                <Input type="number" min="1" value={nfeIntervalo} onChange={e => setNfeIntervalo(e.target.value)} />
              </div>
              <div>
                <Label>1º Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nfeVencimento && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nfeVencimento ? format(nfeVencimento, "dd/MM/yyyy") : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={nfeVencimento} onSelect={setNfeVencimento} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNfeOpen(false)}>Cancelar</Button>
            <Button onClick={importarNfes} disabled={nfeSelecionadas.size === 0}>
              Importar {nfeSelecionadas.size} NF-e(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Baixa ===== */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Baixar Parcela</DialogTitle></DialogHeader>
          {contaAtual && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Fornecedor:</strong> {contaAtual.fornecedor}</p>
                <p><strong>Parcela:</strong> {contaAtual.parcelas[parcelaIdx]?.numero} de {contaAtual.parcelas.length}</p>
                <p><strong>Valor:</strong> R$ {contaAtual.parcelas[parcelaIdx]?.valor.toFixed(2)}</p>
                <p><strong>Já pago:</strong> R$ {contaAtual.parcelas[parcelaIdx]?.valorPago.toFixed(2)}</p>
              </div>
              <div>
                <Label>Valor do Pagamento *</Label>
                <CurrencyInput value={parseFloat(baixaValor) || 0} onValueChange={v => setBaixaValor(String(v))} />
              </div>
              <div>
                <Label>Forma de Pagamento *</Label>
                <Select value={baixaForma} onValueChange={setBaixaForma}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !baixaData && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {baixaData ? format(baixaData, "dd/MM/yyyy") : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={baixaData} onSelect={setBaixaData} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalBaixaOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarBaixa}>Confirmar Baixa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Detalhes / Parcelas ===== */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {contaAtual && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Detalhes — {contaAtual.fornecedor}
                  {statusBadge(contaAtual.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div><span className="text-muted-foreground">Origem:</span><br />{contaAtual.tipo === "nfe" ? `NF-e ${contaAtual.nfeNumero}` : "Manual"}</div>
                <div><span className="text-muted-foreground">CNPJ/CPF:</span><br />{contaAtual.fornecedorDoc || "—"}</div>
                <div><span className="text-muted-foreground">Categoria:</span><br />{contaAtual.categoria || "—"}</div>
                <div><span className="text-muted-foreground">Emissão:</span><br />{new Date(contaAtual.dataEmissao).toLocaleDateString("pt-BR")}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold">R$ {contaAtual.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Pago</p>
                  <p className="text-lg font-bold text-green-600">R$ {contaAtual.parcelas.reduce((s, p) => s + p.valorPago, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saldo Restante</p>
                  <p className="text-lg font-bold text-destructive">R$ {(contaAtual.valorTotal - contaAtual.parcelas.reduce((s, p) => s + p.valorPago, 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead>Dt. Pagamento</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contaAtual.parcelas.map((p, idx) => (
                    <TableRow key={idx} className={p.status === "vencida" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{p.numero}/{contaAtual.parcelas.length}</TableCell>
                      <TableCell className="text-right">R$ {p.valor.toFixed(2)}</TableCell>
                      <TableCell className={p.status === "vencida" ? "text-destructive font-medium" : ""}>
                        {new Date(p.vencimento).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">{p.valorPago > 0 ? `R$ ${p.valorPago.toFixed(2)}` : "—"}</TableCell>
                      <TableCell>{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm">{p.formaPagamento || "—"}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        {p.status !== "paga" && contaAtual.status !== "cancelada" && (
                          <Button size="sm" onClick={() => { setModalDetalhesOpen(false); setTimeout(() => abrirBaixa(contaAtual, idx), 200); }}>
                            Baixar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {contaAtual.observacao && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Obs:</strong> {contaAtual.observacao}
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDetalhesOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
