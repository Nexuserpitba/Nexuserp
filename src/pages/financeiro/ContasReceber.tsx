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
  CheckCircle2, Clock, FileText, ShoppingCart, CreditCard, Trash2, Users, TrendingUp, Receipt
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

// ========== Interfaces ==========

interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  valorRecebido: number;
  status: "aberta" | "recebida" | "vencida" | "parcial";
  formaPagamento: string;
}

interface ContaReceber {
  id: string;
  tipo: "manual" | "nfe" | "pdv";
  nfeNumero?: string;
  nfeChave?: string;
  pdvVenda?: string;
  cliente: string;
  clienteDoc: string;
  descricao: string;
  categoria: string;
  centroCusto: string;
  contaContabil: string;
  dataEmissao: string;
  valorTotal: number;
  parcelas: Parcela[];
  observacao: string;
  status: "aberta" | "recebida" | "parcial" | "vencida" | "cancelada";
  historicoContabil: string;
}

interface VendaPDV {
  id: string;
  numero: string;
  data: string;
  cliente: string;
  clienteDoc: string;
  valorTotal: number;
  formaPagamento: string;
  itens: number;
}

interface NFeSaida {
  numero: string;
  chave: string;
  cliente: string;
  cnpj: string;
  dataEmissao: string;
  valorTotal: number;
  itens: number;
}

// ========== Helpers ==========

function getPessoas(): Array<{ id: string; nome: string; cpfCnpj: string; tipo: string }> {
  try {
    const stored = localStorage.getItem("pessoas");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function getVendasPDV(): VendaPDV[] {
  try {
    const stored = localStorage.getItem("vendas_pdv");
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Mock de vendas do PDV para demonstração
  return [
    { id: "v1", numero: "000101", data: "2026-03-05", cliente: "João Silva", clienteDoc: "123.456.789-00", valorTotal: 450.00, formaPagamento: "Cartão Crédito", itens: 5 },
    { id: "v2", numero: "000102", data: "2026-03-06", cliente: "Maria Souza", clienteDoc: "987.654.321-00", valorTotal: 1280.50, formaPagamento: "PIX", itens: 3 },
    { id: "v3", numero: "000103", data: "2026-03-06", cliente: "Empresa XYZ Ltda", clienteDoc: "12.345.678/0001-90", valorTotal: 3500.00, formaPagamento: "Boleto", itens: 12 },
    { id: "v4", numero: "000104", data: "2026-03-07", cliente: "Pedro Santos", clienteDoc: "456.789.123-00", valorTotal: 890.00, formaPagamento: "Dinheiro", itens: 2 },
    { id: "v5", numero: "000105", data: "2026-03-07", cliente: "Ana Oliveira", clienteDoc: "321.654.987-00", valorTotal: 2150.75, formaPagamento: "Cartão Crédito 3x", itens: 8 },
  ];
}

const categoriasReceita = [
  "Venda de Mercadorias",
  "Prestação de Serviços",
  "Receita de Aluguel",
  "Comissões",
  "Juros / Multas Recebidos",
  "Receita Financeira",
  "Outras Receitas",
];

const contasContabeis = [
  "1.1.2.01 - Clientes a Receber",
  "1.1.2.02 - Duplicatas a Receber",
  "1.1.2.03 - Cartões a Receber",
  "1.1.2.04 - Cheques a Receber",
  "3.1.1.01 - Receita de Vendas",
  "3.1.2.01 - Receita de Serviços",
  "3.2.1.01 - Outras Receitas",
];

const centrosCusto = [
  "CC01 - Loja Matriz",
  "CC02 - Filial 01",
  "CC03 - E-commerce",
  "CC04 - Atacado",
  "CC05 - Serviços",
];

const formasPagamento = ["Dinheiro", "PIX", "Boleto", "Transferência", "Cartão Crédito", "Cartão Débito", "Cheque", "Depósito"];

const nfesSaidaMock: NFeSaida[] = [
  { numero: "001234", chave: "35260312345678000195550010012345610012345671", cliente: "Comércio Alpha Ltda", cnpj: "33.456.789/0001-12", dataEmissao: "2026-03-02", valorTotal: 12500.00, itens: 35 },
  { numero: "001235", chave: "35260312345678000195550010012345620012345672", cliente: "Indústria Beta SA", cnpj: "44.567.890/0001-23", dataEmissao: "2026-03-04", valorTotal: 6800.00, itens: 18 },
  { numero: "001236", chave: "35260312345678000195550010012345630012345673", cliente: "Distribuidora Gama ME", cnpj: "55.678.901/0001-34", dataEmissao: "2026-03-06", valorTotal: 4350.00, itens: 22 },
];

function calcularStatus(parcelas: Parcela[]): ContaReceber["status"] {
  const hoje = new Date().toISOString().split("T")[0];
  const todasRecebidas = parcelas.every(p => p.status === "recebida");
  if (todasRecebidas) return "recebida";
  const algumaRecebida = parcelas.some(p => p.status === "recebida" || p.status === "parcial");
  const algumaVencida = parcelas.some(p => p.status !== "recebida" && p.vencimento < hoje);
  if (algumaVencida) return "vencida";
  if (algumaRecebida) return "parcial";
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
    valorRecebido: 0,
    status: "aberta" as const,
    formaPagamento: "",
  }));
}

const defaultContas: ContaReceber[] = [
  {
    id: "1", tipo: "pdv", pdvVenda: "000101", cliente: "João Silva", clienteDoc: "123.456.789-00",
    descricao: "Venda PDV #000101 — 5 itens", categoria: "Venda de Mercadorias", centroCusto: "CC01 - Loja Matriz",
    contaContabil: "1.1.2.03 - Cartões a Receber", dataEmissao: "2026-03-05", valorTotal: 450.00,
    parcelas: [{ numero: 1, valor: 450, vencimento: "2026-03-20", dataPagamento: null, valorRecebido: 0, status: "aberta", formaPagamento: "" }],
    observacao: "", status: "aberta", historicoContabil: "Receita de venda a prazo — PDV 000101",
  },
  {
    id: "2", tipo: "nfe", nfeNumero: "001234", nfeChave: "35260312345678000195550010012345610012345671",
    cliente: "Comércio Alpha Ltda", clienteDoc: "33.456.789/0001-12",
    descricao: "NF-e 001234 — Venda mercadorias", categoria: "Venda de Mercadorias", centroCusto: "CC04 - Atacado",
    contaContabil: "1.1.2.02 - Duplicatas a Receber", dataEmissao: "2026-03-02", valorTotal: 12500.00,
    parcelas: [
      { numero: 1, valor: 4166.67, vencimento: "2026-03-15", dataPagamento: "2026-03-15", valorRecebido: 4166.67, status: "recebida", formaPagamento: "Boleto" },
      { numero: 2, valor: 4166.67, vencimento: "2026-04-15", dataPagamento: null, valorRecebido: 0, status: "aberta", formaPagamento: "" },
      { numero: 3, valor: 4166.66, vencimento: "2026-05-15", dataPagamento: null, valorRecebido: 0, status: "aberta", formaPagamento: "" },
    ],
    observacao: "Venda atacado trimestral", status: "parcial", historicoContabil: "Receita de venda atacado — NF-e 001234",
  },
  {
    id: "3", tipo: "manual", cliente: "Carlos Ferreira", clienteDoc: "654.321.987-00",
    descricao: "Serviço de consultoria — contrato mensal", categoria: "Prestação de Serviços", centroCusto: "CC05 - Serviços",
    contaContabil: "3.1.2.01 - Receita de Serviços", dataEmissao: "2026-03-01", valorTotal: 3200.00,
    parcelas: [{ numero: 1, valor: 3200, vencimento: "2026-03-01", dataPagamento: null, valorRecebido: 0, status: "vencida", formaPagamento: "" }],
    observacao: "Contrato ref. março/2026", status: "vencida", historicoContabil: "Receita de serviços — Consultoria março/2026",
  },
];

// ========== Component ==========

export default function ContasReceber() {
  const { items: contas, addItem, updateItem, deleteItem } = useLocalStorage<ContaReceber>("contas_receber", defaultContas);
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [modalManualOpen, setModalManualOpen] = useState(false);
  const [modalNfeOpen, setModalNfeOpen] = useState(false);
  const [modalPdvOpen, setModalPdvOpen] = useState(false);
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false);
  const [contaAtual, setContaAtual] = useState<ContaReceber | null>(null);
  const [parcelaIdx, setParcelaIdx] = useState(0);

  // Form manual
  const [formCliente, setFormCliente] = useState("");
  const [formClienteDoc, setFormClienteDoc] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formCategoria, setFormCategoria] = useState("");
  const [formCentroCusto, setFormCentroCusto] = useState("");
  const [formContaContabil, setFormContaContabil] = useState("");
  const [formValorTotal, setFormValorTotal] = useState("");
  const [formNumParcelas, setFormNumParcelas] = useState("1");
  const [formIntervalo, setFormIntervalo] = useState("30");
  const [formVencimento, setFormVencimento] = useState<Date | undefined>(addDays(new Date(), 30));
  const [formObservacao, setFormObservacao] = useState("");
  const [formHistorico, setFormHistorico] = useState("");

  // Busca cliente
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteAberto, setClienteAberto] = useState(false);

  const pessoasCadastro = useMemo(() => getPessoas(), [modalManualOpen]);
  const pessoasFiltradas = useMemo(() => {
    if (!buscaCliente) return pessoasCadastro.slice(0, 20);
    const term = buscaCliente.toLowerCase();
    return pessoasCadastro.filter(p => p.nome.toLowerCase().includes(term) || p.cpfCnpj.includes(term)).slice(0, 20);
  }, [pessoasCadastro, buscaCliente]);

  const selecionarCliente = (pessoa: { nome: string; cpfCnpj: string }) => {
    setFormCliente(pessoa.nome);
    setFormClienteDoc(pessoa.cpfCnpj);
    setClienteAberto(false);
    setBuscaCliente("");
  };

  // Baixa
  const [baixaValor, setBaixaValor] = useState("");
  const [baixaData, setBaixaData] = useState<Date | undefined>(new Date());
  const [baixaForma, setBaixaForma] = useState("");

  // NF-e
  const [nfeSelecionadas, setNfeSelecionadas] = useState<Set<string>>(new Set());
  const [nfeNumParcelas, setNfeNumParcelas] = useState("1");
  const [nfeIntervalo, setNfeIntervalo] = useState("30");
  const [nfeVencimento, setNfeVencimento] = useState<Date | undefined>(addDays(new Date(), 30));
  const [nfeCentroCusto, setNfeCentroCusto] = useState("");
  const [nfeContaContabil, setNfeContaContabil] = useState("");

  // PDV
  const [pdvSelecionadas, setPdvSelecionadas] = useState<Set<string>>(new Set());
  const [pdvNumParcelas, setPdvNumParcelas] = useState("1");
  const [pdvIntervalo, setPdvIntervalo] = useState("30");
  const [pdvVencimento, setPdvVencimento] = useState<Date | undefined>(addDays(new Date(), 30));
  const [pdvCentroCusto, setPdvCentroCusto] = useState("CC01 - Loja Matriz");
  const [pdvContaContabil, setPdvContaContabil] = useState("1.1.2.03 - Cartões a Receber");

  const vendasPDV = useMemo(() => getVendasPDV(), [modalPdvOpen]);

  // Atualizar status
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
    .filter(c => filtroTipo === "todos" || c.tipo === filtroTipo)
    .filter(c =>
      c.cliente.toLowerCase().includes(search.toLowerCase()) ||
      c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.nfeNumero?.includes(search) ||
      c.pdvVenda?.includes(search) ||
      c.clienteDoc.includes(search)
    )
    .sort((a, b) => {
      const aMin = Math.min(...a.parcelas.filter(p => p.status !== "recebida").map(p => new Date(p.vencimento).getTime()).concat([Infinity]));
      const bMin = Math.min(...b.parcelas.filter(p => p.status !== "recebida").map(p => new Date(p.vencimento).getTime()).concat([Infinity]));
      return aMin - bMin;
    });

  // Totais
  const totalAberto = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status !== "recebida").reduce((a, p) => a + p.valor - p.valorRecebido, 0), 0);
  const totalVencido = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status === "vencida").reduce((a, p) => a + p.valor - p.valorRecebido, 0), 0);
  const totalRecebidoMes = contasAtualizadas.reduce((s, c) => s + c.parcelas.filter(p => p.status === "recebida" && p.dataPagamento?.startsWith(format(new Date(), "yyyy-MM"))).reduce((a, p) => a + p.valorRecebido, 0), 0);
  const totalInadimplente = contasAtualizadas.filter(c => c.status === "vencida").length;

  const statusBadge = (s: string) => {
    switch (s) {
      case "aberta": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Aberta</Badge>;
      case "recebida": return <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" />Recebida</Badge>;
      case "parcial": return <Badge className="gap-1 bg-blue-600"><CreditCard className="h-3 w-3" />Parcial</Badge>;
      case "vencida": return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Vencida</Badge>;
      case "cancelada": return <Badge variant="secondary">Cancelada</Badge>;
      default: return null;
    }
  };

  const tipoBadge = (tipo: string, ref?: string) => {
    switch (tipo) {
      case "pdv": return <Badge variant="outline" className="text-xs gap-1"><ShoppingCart className="h-3 w-3" />PDV {ref}</Badge>;
      case "nfe": return <Badge variant="outline" className="text-xs gap-1"><FileText className="h-3 w-3" />NF-e {ref}</Badge>;
      default: return <Badge variant="outline" className="text-xs">Manual</Badge>;
    }
  };

  // ===== Lançamento Manual =====
  const abrirManual = () => {
    setFormCliente(""); setFormClienteDoc(""); setFormDescricao("");
    setFormCategoria(""); setFormCentroCusto(""); setFormContaContabil("");
    setFormValorTotal(""); setFormNumParcelas("1"); setFormIntervalo("30");
    setFormVencimento(addDays(new Date(), 30)); setFormObservacao(""); setFormHistorico("");
    setBuscaCliente(""); setClienteAberto(false);
    setModalManualOpen(true);
  };

  const salvarManual = () => {
    if (!formCliente || !formDescricao || !formValorTotal || !formVencimento) {
      toast.error("Preencha cliente, descrição, valor e vencimento");
      return;
    }
    const valor = parseFloat(formValorTotal);
    const numP = parseInt(formNumParcelas) || 1;
    const intervalo = parseInt(formIntervalo) || 30;
    const parcelas = gerarParcelas(valor, numP, formVencimento, intervalo);

    addItem({
      tipo: "manual",
      cliente: formCliente,
      clienteDoc: formClienteDoc,
      descricao: formDescricao,
      categoria: formCategoria,
      centroCusto: formCentroCusto,
      contaContabil: formContaContabil,
      dataEmissao: format(new Date(), "yyyy-MM-dd"),
      valorTotal: valor,
      parcelas,
      observacao: formObservacao,
      status: "aberta",
      historicoContabil: formHistorico || `Receita — ${formDescricao}`,
    });
    toast.success(`Conta a receber lançada com ${numP} parcela(s)`);
    setModalManualOpen(false);
  };

  // ===== Importar NF-e =====
  const abrirNfe = () => {
    setNfeSelecionadas(new Set());
    setNfeNumParcelas("1"); setNfeIntervalo("30");
    setNfeVencimento(addDays(new Date(), 30));
    setNfeCentroCusto(""); setNfeContaContabil("");
    setModalNfeOpen(true);
  };

  const jaImportadaNfe = (nfeNum: string) => contas.some(c => c.nfeNumero === nfeNum);

  const importarNfes = () => {
    if (nfeSelecionadas.size === 0 || !nfeVencimento) {
      toast.error("Selecione ao menos uma NF-e e defina o vencimento");
      return;
    }
    const numP = parseInt(nfeNumParcelas) || 1;
    const intervalo = parseInt(nfeIntervalo) || 30;
    let count = 0;

    nfeSelecionadas.forEach(chave => {
      const nfe = nfesSaidaMock.find(n => n.chave === chave);
      if (!nfe || jaImportadaNfe(nfe.numero)) return;
      const parcelas = gerarParcelas(nfe.valorTotal, numP, nfeVencimento!, intervalo);
      addItem({
        tipo: "nfe",
        nfeNumero: nfe.numero,
        nfeChave: nfe.chave,
        cliente: nfe.cliente,
        clienteDoc: nfe.cnpj,
        descricao: `NF-e ${nfe.numero} — ${nfe.itens} itens`,
        categoria: "Venda de Mercadorias",
        centroCusto: nfeCentroCusto,
        contaContabil: nfeContaContabil || "1.1.2.02 - Duplicatas a Receber",
        dataEmissao: nfe.dataEmissao,
        valorTotal: nfe.valorTotal,
        parcelas,
        observacao: "",
        status: "aberta",
        historicoContabil: `Receita de venda — NF-e ${nfe.numero}`,
      });
      count++;
    });

    toast.success(`${count} NF-e(s) importada(s) com ${numP} parcela(s) cada`);
    setModalNfeOpen(false);
  };

  // ===== Importar Vendas PDV =====
  const abrirPdv = () => {
    setPdvSelecionadas(new Set());
    setPdvNumParcelas("1"); setPdvIntervalo("30");
    setPdvVencimento(addDays(new Date(), 30));
    setPdvCentroCusto("CC01 - Loja Matriz");
    setPdvContaContabil("1.1.2.03 - Cartões a Receber");
    setModalPdvOpen(true);
  };

  const jaImportadaPdv = (vendaId: string) => contas.some(c => c.pdvVenda === vendaId);

  const importarPdv = () => {
    if (pdvSelecionadas.size === 0 || !pdvVencimento) {
      toast.error("Selecione ao menos uma venda e defina o vencimento");
      return;
    }
    const numP = parseInt(pdvNumParcelas) || 1;
    const intervalo = parseInt(pdvIntervalo) || 30;
    let count = 0;

    pdvSelecionadas.forEach(id => {
      const venda = vendasPDV.find(v => v.id === id);
      if (!venda || jaImportadaPdv(venda.id)) return;
      const parcelas = gerarParcelas(venda.valorTotal, numP, pdvVencimento!, intervalo);
      addItem({
        tipo: "pdv",
        pdvVenda: venda.id,
        cliente: venda.cliente,
        clienteDoc: venda.clienteDoc,
        descricao: `Venda PDV #${venda.numero} — ${venda.itens} itens`,
        categoria: "Venda de Mercadorias",
        centroCusto: pdvCentroCusto,
        contaContabil: pdvContaContabil,
        dataEmissao: venda.data,
        valorTotal: venda.valorTotal,
        parcelas,
        observacao: `Forma original: ${venda.formaPagamento}`,
        status: "aberta",
        historicoContabil: `Receita de venda PDV #${venda.numero}`,
      });
      count++;
    });

    toast.success(`${count} venda(s) importada(s) com ${numP} parcela(s) cada`);
    setModalPdvOpen(false);
  };

  // ===== Baixa =====
  const abrirBaixa = (conta: ContaReceber, idx: number) => {
    setContaAtual(conta);
    setParcelaIdx(idx);
    const parcela = conta.parcelas[idx];
    setBaixaValor((parcela.valor - parcela.valorRecebido).toFixed(2));
    setBaixaData(new Date());
    setBaixaForma("");
    setModalBaixaOpen(true);
  };

  const confirmarBaixa = () => {
    if (!contaAtual || !baixaForma || !baixaData) {
      toast.error("Preencha forma de recebimento e data");
      return;
    }
    const valor = parseFloat(baixaValor) || 0;
    if (valor <= 0) { toast.error("Valor inválido"); return; }

    const parcelas = [...contaAtual.parcelas];
    const p = parcelas[parcelaIdx];
    const novoRecebido = p.valorRecebido + valor;
    parcelas[parcelaIdx] = {
      ...p,
      valorRecebido: novoRecebido,
      dataPagamento: format(baixaData, "yyyy-MM-dd"),
      formaPagamento: baixaForma,
      status: novoRecebido >= p.valor ? "recebida" : "parcial",
    };

    updateItem(contaAtual.id, { parcelas, status: calcularStatus(parcelas) });
    toast.success(`Parcela ${p.numero} recebida — R$ ${valor.toFixed(2)}`);
    setModalBaixaOpen(false);
  };

  const abrirDetalhes = (conta: ContaReceber) => {
    setContaAtual(conta);
    setModalDetalhesOpen(true);
  };

  return (
    <div className="page-container">
      <PageHeader title="Contas a Receber" description="Recebíveis de vendas PDV, NF-e e lançamentos manuais — completo para contabilidade" />

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total a Receber</p>
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
            <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Recebido no Mês</p>
              <p className="text-xl font-bold text-green-600">R$ {totalRecebidoMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Inadimplentes</p>
              <p className="text-xl font-bold text-orange-600">{totalInadimplente}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Receipt className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Títulos</p>
              <p className="text-xl font-bold">{contas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela principal */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente, descrição, NF-e ou venda..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="recebida">Recebidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Origens</SelectItem>
                <SelectItem value="pdv">PDV</SelectItem>
                <SelectItem value="nfe">NF-e</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <ExportButtons options={{
              title: "Contas a Receber",
              subtitle: `Relatório gerado em ${new Date().toLocaleDateString("pt-BR")}`,
              filename: `Contas_Receber_${format(new Date(), "yyyy-MM-dd")}`,
              columns: [
                { header: "Cliente", key: "cliente" },
                { header: "Descrição", key: "descricao" },
                { header: "Centro Custo", key: "centroCusto" },
                { header: "Valor Total", key: "valorTotal", align: "right", format: (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { header: "Status", key: "status" },
              ],
              data: filtered,
              summaryRows: [
                { label: "Total", value: `R$ ${filtered.reduce((s, c) => s + c.valorTotal, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { label: "Registros", value: String(filtered.length) },
              ],
            }} />
            <Button variant="outline" onClick={abrirPdv}><ShoppingCart className="h-4 w-4 mr-2" />Vendas PDV</Button>
            <Button variant="outline" onClick={abrirNfe}><FileText className="h-4 w-4 mr-2" />Importar NF-e</Button>
            <Button onClick={abrirManual}><Plus className="h-4 w-4 mr-2" />Lançamento Manual</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Centro Custo</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Próx. Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma conta encontrada</TableCell></TableRow>
              ) : filtered.map(c => {
                const proxVenc = c.parcelas.filter(p => p.status !== "recebida").sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
                const totalRecebido = c.parcelas.reduce((s, p) => s + p.valorRecebido, 0);
                return (
                  <TableRow key={c.id} className={c.status === "vencida" ? "bg-destructive/5" : ""}>
                    <TableCell>{tipoBadge(c.tipo, c.nfeNumero || c.pdvVenda)}</TableCell>
                    <TableCell>
                      <div>{c.cliente}</div>
                      <div className="text-xs text-muted-foreground">{c.clienteDoc}</div>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{c.descricao}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.centroCusto || "—"}</TableCell>
                    <TableCell className="text-right font-medium">R$ {c.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-sm">R$ {totalRecebido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={proxVenc && proxVenc.status === "vencida" ? "text-destructive font-medium" : ""}>
                      {proxVenc ? new Date(proxVenc.vencimento).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => abrirDetalhes(c)}>Detalhes</Button>
                        {c.status !== "recebida" && c.status !== "cancelada" && (
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
          <DialogHeader><DialogTitle>Novo Lançamento Manual — Conta a Receber</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Busca cliente */}
            <div className="border rounded-lg p-3 bg-muted/30">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Buscar Cliente</Label>
              <Popover open={clienteAberto} onOpenChange={setClienteAberto}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal gap-2">
                    <Users className="h-4 w-4" />
                    {formCliente || "Selecione do cadastro de pessoas..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar por nome ou documento..." value={buscaCliente} onValueChange={setBuscaCliente} />
                    <CommandList>
                      <CommandEmpty>Nenhuma pessoa encontrada</CommandEmpty>
                      <CommandGroup heading="Cadastro de Pessoas">
                        {pessoasFiltradas.map(p => (
                          <CommandItem key={p.id} onSelect={() => selecionarCliente(p)} className="cursor-pointer">
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

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente *</Label><Input value={formCliente} onChange={e => setFormCliente(e.target.value)} placeholder="Nome do cliente" /></div>
              <div><Label>CPF/CNPJ</Label><Input value={formClienteDoc} onChange={e => setFormClienteDoc(e.target.value)} /></div>
            </div>
            <div><Label>Descrição *</Label><Input value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Ex: Serviço de consultoria março/2026" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={formCategoria} onValueChange={setFormCategoria}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{categoriasReceita.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Select value={formCentroCusto} onValueChange={setFormCentroCusto}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{centrosCusto.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta Contábil</Label>
                <Select value={formContaContabil} onValueChange={setFormContaContabil}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contasContabeis.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Valor Total *</Label><CurrencyInput value={parseFloat(formValorTotal) || 0} onValueChange={v => setFormValorTotal(String(v))} /></div>
              <div><Label>Nº Parcelas</Label><Input type="number" min="1" max="48" value={formNumParcelas} onChange={e => setFormNumParcelas(e.target.value)} /></div>
              <div><Label>Intervalo (dias)</Label><Input type="number" min="1" value={formIntervalo} onChange={e => setFormIntervalo(e.target.value)} /></div>
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
            <div><Label>Histórico Contábil</Label><Input value={formHistorico} onChange={e => setFormHistorico(e.target.value)} placeholder="Ex: Receita de serviços — Consultoria março/2026" /></div>
            <div><Label>Observação</Label><Textarea value={formObservacao} onChange={e => setFormObservacao(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalManualOpen(false)}>Cancelar</Button>
            <Button onClick={salvarManual}>Lançar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Importar NF-e de Saída ===== */}
      <Dialog open={modalNfeOpen} onOpenChange={setModalNfeOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Contas de NF-e de Saída</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nfesSaidaMock.map(nfe => {
                  const importada = jaImportadaNfe(nfe.numero);
                  return (
                    <TableRow key={nfe.chave} className={importada ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}>
                      <TableCell>
                        <Checkbox disabled={importada} checked={nfeSelecionadas.has(nfe.chave)} onCheckedChange={() => {
                          setNfeSelecionadas(prev => { const next = new Set(prev); if (next.has(nfe.chave)) next.delete(nfe.chave); else next.add(nfe.chave); return next; });
                        }} />
                      </TableCell>
                      <TableCell className="font-mono">{nfe.numero}</TableCell>
                      <TableCell>{nfe.cliente}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{nfe.cnpj}</TableCell>
                      <TableCell>{new Date(nfe.dataEmissao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-medium">R$ {nfe.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{importada ? <Badge variant="secondary">Já importada</Badge> : <Badge variant="outline">Disponível</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo</Label>
                <Select value={nfeCentroCusto} onValueChange={setNfeCentroCusto}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{centrosCusto.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conta Contábil</Label>
                <Select value={nfeContaContabil} onValueChange={setNfeContaContabil}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contasContabeis.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Nº Parcelas</Label><Input type="number" min="1" max="48" value={nfeNumParcelas} onChange={e => setNfeNumParcelas(e.target.value)} /></div>
              <div><Label>Intervalo (dias)</Label><Input type="number" min="1" value={nfeIntervalo} onChange={e => setNfeIntervalo(e.target.value)} /></div>
              <div>
                <Label>1º Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !nfeVencimento && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{nfeVencimento ? format(nfeVencimento, "dd/MM/yyyy") : "Selecione..."}
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
            <Button onClick={importarNfes} disabled={nfeSelecionadas.size === 0}>Importar {nfeSelecionadas.size} NF-e(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Importar Vendas PDV ===== */}
      <Dialog open={modalPdvOpen} onOpenChange={setModalPdvOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar Vendas do PDV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasPDV.map(v => {
                  const importada = jaImportadaPdv(v.id);
                  return (
                    <TableRow key={v.id} className={importada ? "opacity-50" : "cursor-pointer hover:bg-muted/50"}>
                      <TableCell>
                        <Checkbox disabled={importada} checked={pdvSelecionadas.has(v.id)} onCheckedChange={() => {
                          setPdvSelecionadas(prev => { const next = new Set(prev); if (next.has(v.id)) next.delete(v.id); else next.add(v.id); return next; });
                        }} />
                      </TableCell>
                      <TableCell className="font-mono">#{v.numero}</TableCell>
                      <TableCell>{new Date(v.data).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div>{v.cliente}</div>
                        <div className="text-xs text-muted-foreground">{v.clienteDoc}</div>
                      </TableCell>
                      <TableCell className="text-sm">{v.formaPagamento}</TableCell>
                      <TableCell className="text-right font-medium">R$ {v.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{importada ? <Badge variant="secondary">Já importada</Badge> : <Badge variant="outline">Disponível</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Centro de Custo</Label>
                <Select value={pdvCentroCusto} onValueChange={setPdvCentroCusto}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{centrosCusto.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Conta Contábil</Label>
                <Select value={pdvContaContabil} onValueChange={setPdvContaContabil}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{contasContabeis.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Nº Parcelas</Label><Input type="number" min="1" max="48" value={pdvNumParcelas} onChange={e => setPdvNumParcelas(e.target.value)} /></div>
              <div><Label>Intervalo (dias)</Label><Input type="number" min="1" value={pdvIntervalo} onChange={e => setPdvIntervalo(e.target.value)} /></div>
              <div>
                <Label>1º Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !pdvVencimento && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{pdvVencimento ? format(pdvVencimento, "dd/MM/yyyy") : "Selecione..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={pdvVencimento} onSelect={setPdvVencimento} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPdvOpen(false)}>Cancelar</Button>
            <Button onClick={importarPdv} disabled={pdvSelecionadas.size === 0}>Importar {pdvSelecionadas.size} Venda(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Baixa ===== */}
      <Dialog open={modalBaixaOpen} onOpenChange={setModalBaixaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Receber Parcela</DialogTitle></DialogHeader>
          {contaAtual && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><strong>Cliente:</strong> {contaAtual.cliente}</p>
                <p><strong>Parcela:</strong> {contaAtual.parcelas[parcelaIdx]?.numero} de {contaAtual.parcelas.length}</p>
                <p><strong>Valor:</strong> R$ {contaAtual.parcelas[parcelaIdx]?.valor.toFixed(2)}</p>
                <p><strong>Já recebido:</strong> R$ {contaAtual.parcelas[parcelaIdx]?.valorRecebido.toFixed(2)}</p>
              </div>
              <div><Label>Valor do Recebimento *</Label><CurrencyInput value={parseFloat(baixaValor) || 0} onValueChange={v => setBaixaValor(String(v))} /></div>
              <div>
                <Label>Forma de Recebimento *</Label>
                <Select value={baixaForma} onValueChange={setBaixaForma}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{formasPagamento.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data do Recebimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !baixaData && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />{baixaData ? format(baixaData, "dd/MM/yyyy") : "Selecione..."}
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
            <Button onClick={confirmarBaixa}>Confirmar Recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Modal Detalhes ===== */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {contaAtual && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Detalhes — {contaAtual.cliente}
                  {statusBadge(contaAtual.status)}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div><span className="text-muted-foreground">Origem:</span><br />{contaAtual.tipo === "nfe" ? `NF-e ${contaAtual.nfeNumero}` : contaAtual.tipo === "pdv" ? `PDV #${contaAtual.pdvVenda}` : "Manual"}</div>
                <div><span className="text-muted-foreground">CPF/CNPJ:</span><br />{contaAtual.clienteDoc || "—"}</div>
                <div><span className="text-muted-foreground">Categoria:</span><br />{contaAtual.categoria || "—"}</div>
                <div><span className="text-muted-foreground">Emissão:</span><br />{new Date(contaAtual.dataEmissao).toLocaleDateString("pt-BR")}</div>
              </div>

              {/* Dados contábeis */}
              <div className="grid grid-cols-3 gap-3 text-sm mb-4 border rounded-lg p-3 bg-muted/30">
                <div><span className="text-xs text-muted-foreground font-semibold">Centro de Custo</span><br />{contaAtual.centroCusto || "—"}</div>
                <div><span className="text-xs text-muted-foreground font-semibold">Conta Contábil</span><br />{contaAtual.contaContabil || "—"}</div>
                <div><span className="text-xs text-muted-foreground font-semibold">Histórico Contábil</span><br />{contaAtual.historicoContabil || "—"}</div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold">R$ {contaAtual.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Recebido</p>
                  <p className="text-lg font-bold text-green-600">R$ {contaAtual.parcelas.reduce((s, p) => s + p.valorRecebido, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saldo Restante</p>
                  <p className="text-lg font-bold text-destructive">R$ {(contaAtual.valorTotal - contaAtual.parcelas.reduce((s, p) => s + p.valorRecebido, 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead>Dt. Recebimento</TableHead>
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
                      <TableCell className="text-right">{p.valorRecebido > 0 ? `R$ ${p.valorRecebido.toFixed(2)}` : "—"}</TableCell>
                      <TableCell>{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-sm">{p.formaPagamento || "—"}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>
                        {p.status !== "recebida" && contaAtual.status !== "cancelada" && (
                          <Button size="sm" onClick={() => { setModalDetalhesOpen(false); setTimeout(() => abrirBaixa(contaAtual, idx), 200); }}>
                            Receber
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {contaAtual.observacao && (
                <div className="mt-2 text-sm text-muted-foreground"><strong>Obs:</strong> {contaAtual.observacao}</div>
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
