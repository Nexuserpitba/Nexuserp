import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Banknote, QrCode, FileText, Loader2, CheckCircle2, AlertTriangle, Printer, Eye, EyeOff, X, Plus, Minus, Wallet, ShieldCheck, Lock } from "lucide-react";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { DanfeNFCe } from "./DanfeNFCe";
import { PixQRCodeModal } from "./PixQRCodeModal";
import { insertLiberacao } from "@/components/liberacoes/types";

function getSenhaGerencial(): string {
  try {
    const s = localStorage.getItem("nfce-config");
    if (s) {
      const config = JSON.parse(s);
      if (config.senhaGerencial) return config.senhaGerencial;
    }
  } catch { /* erro ignorado */ }
  return "1234"; // senha padrão
}

interface ItemVenda {
  id: number;
  codigo: string;
  descricao: string;
  quantidade: number;
  preco: number;
  emPromocao?: boolean;
  precoOriginal?: number;
  ncm?: string;
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

interface Props {
  open: boolean;
  onClose: () => void;
  items: ItemVenda[];
  subtotal: number;
  onFinalized: (pagamentos?: { forma: string; valor: number }[]) => void;
  cliente: Cliente | null;
  onRequestCliente: () => void;
  descontoGeral?: { tipo: "percent" | "value"; valor: number; calculado: number };
}

type NFeStatus = "idle" | "emitting" | "authorized" | "error";
type DescontoTipo = "percentual" | "valor";

interface FormaPagamentoConfig {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  ativo: boolean;
  tef: boolean;
  troco: boolean;
  maxParcelas: number;
  taxaOperadora: number;
  codigoFiscal: string;
}

interface Pagamento {
  formaId: string;
  formaDescricao: string;
  formaTipo: string;
  valor: number;
  parcelas?: number;
}

const defaultFormas: FormaPagamentoConfig[] = [
  { id: "1", codigo: "01", descricao: "Dinheiro", tipo: "dinheiro", ativo: true, tef: false, troco: true, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "01" },
  { id: "2", codigo: "02", descricao: "Cartão de Crédito", tipo: "credito", ativo: true, tef: true, troco: false, maxParcelas: 12, taxaOperadora: 2.5, codigoFiscal: "03" },
  { id: "3", codigo: "03", descricao: "Cartão de Débito", tipo: "debito", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 1.5, codigoFiscal: "04" },
  { id: "4", codigo: "04", descricao: "PIX", tipo: "pix", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "17" },
  { id: "5", codigo: "05", descricao: "Crediário", tipo: "crediario", ativo: true, tef: false, troco: false, maxParcelas: 12, taxaOperadora: 0, codigoFiscal: "05" },
  { id: "6", codigo: "06", descricao: "Vale Alimentação", tipo: "vale_alimentacao", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.5, codigoFiscal: "10" },
  { id: "7", codigo: "07", descricao: "Vale Refeição", tipo: "vale_refeicao", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.5, codigoFiscal: "11" },
  { id: "8", codigo: "08", descricao: "Convênio", tipo: "convenio", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "99" },
  { id: "13", codigo: "13", descricao: "Boleto Bancário", tipo: "boleto", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "15" },
];

function isFormaCrediario(f: FormaPagamentoConfig): boolean {
  if (f.tipo === "crediario") return true;
  const desc = (f.descricao || "").toLowerCase();
  return desc.includes("crediário") || desc.includes("crediario");
}

function loadFormasAtivas(): FormaPagamentoConfig[] {
  try {
    const s = localStorage.getItem("formas-pagamento");
    if (s) {
      const stored: FormaPagamentoConfig[] = JSON.parse(s);
      const defaultMap = new Map(defaultFormas.map(f => [f.id, f]));
      // Fix tipo: ensure defaults match, and detect crediário by description
      const updated = stored.map(f => {
        const def = defaultMap.get(f.id);
        if (def) return { ...f, tipo: def.tipo };
        // Auto-detect crediário by description even if tipo is wrong
        const desc = (f.descricao || "").toLowerCase();
        if ((desc.includes("crediário") || desc.includes("crediario")) && f.tipo !== "crediario") {
          return { ...f, tipo: "crediario" };
        }
        return f;
      });
      // Add missing default forms
      const storedIds = new Set(updated.map(f => f.id));
      const missing = defaultFormas.filter(f => !storedIds.has(f.id));
      const merged = [...updated, ...missing];
      localStorage.setItem("formas-pagamento", JSON.stringify(merged));
      return merged.filter(f => f.ativo);
    }
  } catch { /* erro ignorado */ }
  return defaultFormas.filter(f => f.ativo);
}

function getIconeForma(tipo: string) {
  switch (tipo) {
    case "dinheiro": return <Banknote size={18} />;
    case "credito": return <CreditCard size={18} />;
    case "debito": return <CreditCard size={18} />;
    case "pix": return <QrCode size={18} />;
    case "crediario": return <FileText size={18} />;
    case "vale_alimentacao": return <Wallet size={18} />;
    case "vale_refeicao": return <Wallet size={18} />;
    case "convenio": return <ShieldCheck size={18} />;
    case "boleto": return <FileText size={18} />;
    default: return <Wallet size={18} />;
  }
}

interface CreditoCliente {
  limiteCredito: number;
  limitePrazo: number;
  debitos: number;
  disponivel: number;
}

function consultarCreditoCliente(cpfCnpj: string): CreditoCliente | null {
  try {
    const stored = localStorage.getItem("pessoas");
    if (!stored) return null;
    const pessoas = JSON.parse(stored);
    const pessoa = pessoas.find((p: any) => p.cpfCnpj === cpfCnpj);
    if (!pessoa) return null;
    const limiteCredito = Number(pessoa.limiteCredito) || 0;
    const limitePrazo = Number(pessoa.limitePrazo) || 0;
    const debitos = Number(pessoa.debitos) || 0;
    // Buscar contas a receber abertas do cliente
    let debitosPendentes = 0;
    try {
      const cr = localStorage.getItem("contas_receber");
      if (cr) {
        const contas = JSON.parse(cr);
        debitosPendentes = contas
          .filter((c: any) => c.clienteDoc === cpfCnpj && (c.status === "aberta" || c.status === "parcial" || c.status === "vencida"))
          .reduce((acc: number, c: any) => {
            const totalParcAberto = (c.parcelas || [])
              .filter((p: any) => p.status !== "recebida")
              .reduce((s: number, p: any) => s + (Number(p.valor) - Number(p.valorRecebido || 0)), 0);
            return acc + totalParcAberto;
          }, 0);
      }
    } catch { /* erro ignorado */ }
    const totalDebitos = debitos + debitosPendentes;
    const limite = Math.max(limiteCredito, limitePrazo);
    return {
      limiteCredito,
      limitePrazo,
      debitos: totalDebitos,
      disponivel: Math.max(0, limite - totalDebitos),
    };
  } catch { return null; }
}

function gerarContasReceber(cliente: { nome: string; cpfCnpj: string }, valor: number, numParcelas: number, items: ItemVenda[]) {
  const parcelas = [];
  const valorParcela = Math.floor((valor / numParcelas) * 100) / 100;
  const residuo = Math.round((valor - valorParcela * numParcelas) * 100) / 100;

  for (let i = 0; i < numParcelas; i++) {
    const venc = new Date();
    venc.setDate(venc.getDate() + 30 * (i + 1));
    parcelas.push({
      numero: i + 1,
      valor: i === 0 ? valorParcela + residuo : valorParcela,
      vencimento: venc.toISOString().slice(0, 10),
      dataPagamento: null,
      valorRecebido: 0,
      status: "aberta" as const,
      formaPagamento: "Crediário",
    });
  }

  const conta = {
    id: crypto.randomUUID(),
    tipo: "pdv" as const,
    pdvVenda: String(Math.floor(Math.random() * 999999)).padStart(6, "0"),
    cliente: cliente.nome,
    clienteDoc: cliente.cpfCnpj,
    descricao: `Venda Crediário — ${items.length} itens`,
    categoria: "Venda de Mercadorias",
    centroCusto: "",
    contaContabil: "1.1.2.01 - Clientes a Receber",
    dataEmissao: new Date().toISOString().slice(0, 10),
    valorTotal: valor,
    parcelas,
    observacao: "",
    status: "aberta" as const,
    historicoContabil: "Crediário PDV",
  };

  try {
    const stored = localStorage.getItem("contas_receber");
    const existing = stored ? JSON.parse(stored) : [];
    existing.push(conta);
    localStorage.setItem("contas_receber", JSON.stringify(existing));
  } catch { /* erro ignorado */ }

  return conta;
}

function buscarDadosCompletosCliente(cpfCnpj: string): Record<string, string> {
  try {
    const s = localStorage.getItem("pessoas");
    if (!s) return {};
    const pessoas = JSON.parse(s);
    const p = pessoas.find((x: any) => x.cpfCnpj === cpfCnpj);
    if (!p) return {};
    return {
      endereco: p.endereco || "",
      numero: p.numero || "",
      bairro: p.bairro || "",
      cidade: p.cidade || "",
      uf: p.uf || "",
      cep: p.cep || "",
      telefone: p.telefone || p.celular || "",
      email: p.email || "",
      rg: p.rg || "",
    };
  } catch { return {}; }
}

function gerarHtmlCrediario(
  cliente: { nome: string; cpfCnpj: string },
  items: ItemVenda[],
  totalLiquido: number,
  parcelas: { numero: number; valor: number; vencimento: string }[],
  via: "estabelecimento" | "cliente",
  observacao?: string
): string {
  const dados = buscarDadosCompletosCliente(cliente.cpfCnpj);
  const enderecoCompleto = [dados.endereco, dados.numero, dados.bairro, dados.cidade, dados.uf].filter(Boolean).join(", ");

  const parcelasHtml = parcelas.map(p =>
    `<tr>
      <td style="padding:4px 8px;border-bottom:1px dashed #ccc;text-align:center">${p.numero}/${parcelas.length}</td>
      <td style="padding:4px 8px;border-bottom:1px dashed #ccc;text-align:center">${new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
      <td style="padding:4px 8px;border-bottom:1px dashed #ccc;text-align:right;font-weight:bold">R$ ${p.valor.toFixed(2)}</td>
    </tr>`
  ).join("");

  const itensHtml = items.map((it, i) =>
    `<tr>
      <td style="padding:2px 4px;font-size:11px;border-bottom:1px dotted #eee">${i + 1}</td>
      <td style="padding:2px 4px;font-size:11px;border-bottom:1px dotted #eee">${it.descricao}</td>
      <td style="padding:2px 4px;font-size:11px;border-bottom:1px dotted #eee;text-align:center">${it.quantidade}</td>
      <td style="padding:2px 4px;font-size:11px;border-bottom:1px dotted #eee;text-align:right">R$ ${(it.preco * it.quantidade).toFixed(2)}</td>
    </tr>`
  ).join("");

  const viaLabel = via === "estabelecimento" ? "1ª Via — Estabelecimento" : "2ª Via — Cliente";

  return `
    <div style="page-break-after: ${via === "estabelecimento" ? "always" : "auto"}; width:300px; margin:0 auto; padding:10px;">
    <h2 style="text-align:center;margin:0 0 4px;font-size:14px;">CONFISSÃO DE DÍVIDA — CREDIÁRIO</h2>
    <p style="text-align:center;font-size:10px;color:#666;font-weight:bold">${viaLabel}</p>
    <div style="border-top:2px solid #000;margin:8px 0"></div>

    <p style="font-weight:bold;margin-bottom:2px">DADOS DO CLIENTE</p>
    <p><strong>Nome:</strong> ${cliente.nome}</p>
    <p><strong>CPF/CNPJ:</strong> ${cliente.cpfCnpj}</p>
    ${dados.rg ? `<p><strong>RG:</strong> ${dados.rg}</p>` : ""}
    ${enderecoCompleto ? `<p><strong>Endereço:</strong> ${enderecoCompleto}</p>` : ""}
    ${dados.cep ? `<p><strong>CEP:</strong> ${dados.cep}</p>` : ""}
    ${dados.telefone ? `<p><strong>Telefone:</strong> ${dados.telefone}</p>` : ""}
    ${dados.email ? `<p><strong>E-mail:</strong> ${dados.email}</p>` : ""}
    <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}</p>

    <div style="border-top:1px dashed #999;margin:6px 0"></div>
    <p style="font-weight:bold;text-align:center">ITENS DA VENDA</p>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;font-size:10px">#</th>
        <th style="text-align:left;font-size:10px">Descrição</th>
        <th style="text-align:center;font-size:10px">Qtd</th>
        <th style="text-align:right;font-size:10px">Total</th>
      </tr></thead>
      <tbody>${itensHtml}</tbody>
    </table>
    <div style="border-top:1px dashed #999;margin:6px 0"></div>
    <p style="text-align:right;font-size:14px"><strong>TOTAL: R$ ${totalLiquido.toFixed(2)}</strong></p>
    <div style="border-top:2px solid #000;margin:8px 0"></div>
    <p style="font-weight:bold;text-align:center">PLANO DE PAGAMENTO</p>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="font-size:10px;text-align:center">Parcela</th>
        <th style="font-size:10px;text-align:center">Vencimento</th>
        <th style="font-size:10px;text-align:right">Valor (R$)</th>
      </tr></thead>
      <tbody>${parcelasHtml}</tbody>
    </table>
    <div style="border-top:2px solid #000;margin:8px 0"></div>
    ${observacao ? `<p style="font-size:10px;margin:6px 0"><strong>Observação:</strong> ${observacao}</p><div style="border-top:1px dashed #999;margin:6px 0"></div>` : ""}
    <p style="font-size:10px;text-align:justify">Eu, <strong>${cliente.nome}</strong>, portador(a) do documento <strong>${cliente.cpfCnpj}</strong>, declaro estar ciente das condições acima descritas e me comprometo a efetuar o pagamento dos valores nas datas estipuladas. Em caso de inadimplência, estarei sujeito(a) às penalidades previstas em lei, incluindo a inscrição nos órgãos de proteção ao crédito.</p>
    <div style="margin-top:40px;text-align:center;border-top:1px solid #000;padding-top:4px;font-size:11px">
      ${cliente.nome}<br>
      CPF/CNPJ: ${cliente.cpfCnpj}<br>
      <strong>Assinatura do Cliente</strong>
    </div>
    <div style="margin-top:30px;text-align:center;border-top:1px solid #000;padding-top:4px;font-size:11px">________________________________<br>Assinatura do Responsável / Gerente</div>
    <div style="text-align:center;font-size:10px;color:#666;margin-top:12px">Documento gerado em ${new Date().toLocaleString("pt-BR")} — NexusERP</div>
    </div>`;
}

function imprimirSegundaViaCrediario(
  cliente: { nome: string; cpfCnpj: string },
  items: ItemVenda[],
  totalLiquido: number,
  parcelas: { numero: number; valor: number; vencimento: string }[],
  observacao?: string
) {
  const win = window.open("", "_blank", "width=400,height=1400");
  if (!win) return;

  const viaEstabelecimento = gerarHtmlCrediario(cliente, items, totalLiquido, parcelas, "estabelecimento", observacao);
  const viaCliente = gerarHtmlCrediario(cliente, items, totalLiquido, parcelas, "cliente", observacao);

  win.document.write(`<!DOCTYPE html><html><head><title>Confissão de Dívida — Crediário</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:0;font-size:12px}
      table{width:100%;border-collapse:collapse}
      @media print { .page-break { page-break-before: always; } }
    </style>
  </head><body>
    ${viaEstabelecimento}
    <div class="page-break"></div>
    ${viaCliente}
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

export function FinalizarVendaModal({ open, onClose, items, subtotal, onFinalized, cliente, onRequestCliente, descontoGeral }: Props) {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [formaIdx, setFormaIdx] = useState(0);
  const [valorPagamento, setValorPagamento] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [cpfNota, setCpfNota] = useState("");
  const [nfeStatus, setNfeStatus] = useState<NFeStatus>("idle");
  const [nfeNumero, setNfeNumero] = useState("");
  const [nfeChave, setNfeChave] = useState("");
  const [showDanfe, setShowDanfe] = useState(false);
  const [showPixQR, setShowPixQR] = useState(false);
  const [pixValorPendente, setPixValorPendente] = useState(0);

  const [descontoTipo, setDescontoTipo] = useState<DescontoTipo>("percentual");
  const [descontoValor, setDescontoValor] = useState("");
  const [acrescimoValor, setAcrescimoValor] = useState("");
  const [observacaoCrediario, setObservacaoCrediario] = useState("");

  // Liberação gerencial
  const [showSenhaGerencial, setShowSenhaGerencial] = useState(false);
  const [senhaGerencialInput, setSenhaGerencialInput] = useState("");
  const [senhaGerencialErro, setSenhaGerencialErro] = useState(false);
  const [pendingCrediario, setPendingCrediario] = useState<{ forma: FormaPagamentoConfig; valor: number; numParcelas?: number } | null>(null);
  const [promoCrediarioLiberado, setPromoCrediarioLiberado] = useState(false);
  const [pendingPromoCrediario, setPendingPromoCrediario] = useState(false);
  const senhaGerencialRef = useRef<HTMLInputElement>(null);

  const valorInputRef = useRef<HTMLInputElement>(null);
  const danfeRef = useRef<HTMLDivElement>(null);
  const crediarioWarningRef = useRef<HTMLDivElement>(null);

  const formasAtivas = useMemo(() => loadFormasAtivas(), [open]);
  const formaSelecionada = formasAtivas[formaIdx] || formasAtivas[0];

  const permitirCrediarioPromocao = useMemo(() => {
    try {
      const s = localStorage.getItem("nfce-config");
      if (!s) return false;
      return JSON.parse(s).permitirCrediarioPromocao === true;
    } catch { return false; }
  }, [open]);

  const temProdutoPromocao = useMemo(() => items.some(i => i.emPromocao), [items]);

  const desconto = useMemo(() => {
    const v = parseFloat(descontoValor) || 0;
    if (v <= 0) return 0;
    if (descontoTipo === "percentual") return Math.min((subtotal * v) / 100, subtotal);
    return Math.min(v, subtotal);
  }, [descontoValor, descontoTipo, subtotal]);

  const acrescimo = useMemo(() => Math.max(0, parseFloat(acrescimoValor) || 0), [acrescimoValor]);

  const totalLiquido = Math.max(0, subtotal - desconto + acrescimo);
  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const restante = Math.max(0, totalLiquido - totalPago);
  const troco = totalPago > totalLiquido ? totalPago - totalLiquido : 0;
  const podeEmitir = restante <= 0.01 && pagamentos.length > 0;

  // Consulta de crédito do cliente
  const creditoCliente = useMemo(() => {
    if (!cliente) return null;
    return consultarCreditoCliente(cliente.cpfCnpj);
  }, [cliente, open]);

  const resetState = useCallback(() => {
    setPagamentos([]);
    setValorPagamento("");
    setCpfNota("");
    setNfeStatus("idle");
    setNfeNumero("");
    setNfeChave("");
    setShowDanfe(false);
    setShowPixQR(false);
    setPixValorPendente(0);
    setParcelas("1");
    setFormaIdx(0);
    setDescontoValor("");
    setAcrescimoValor("");
    setDescontoTipo("percentual");
    setShowSenhaGerencial(false);
    setSenhaGerencialInput("");
    setSenhaGerencialErro(false);
    setPendingCrediario(null);
    setPromoCrediarioLiberado(false);
    setPendingPromoCrediario(false);
    setObservacaoCrediario("");
  }, []);

  const addPagamento = useCallback((forma: FormaPagamentoConfig, valor: number, numParcelas?: number) => {
    if (valor <= 0) return;
    if (isFormaCrediario(forma)) {
      if (!cliente) {
        toast.warning("Selecione um cliente para venda em crediário!", { description: "Clique em F8 ou no botão de cliente" });
        onRequestCliente();
        return;
      }
      // Validar limite de crédito (se cadastrado)
      const credito = consultarCreditoCliente(cliente.cpfCnpj);
      if (credito) {
        const limite = Math.max(credito.limiteCredito, credito.limitePrazo);
        if (limite > 0 && valor > credito.disponivel) {
          // Limite cadastrado mas excedido — pedir liberação gerencial
          setPendingCrediario({ forma, valor, numParcelas });
          setSenhaGerencialInput("");
          setSenhaGerencialErro(false);
          setShowSenhaGerencial(true);
          setTimeout(() => senhaGerencialRef.current?.focus(), 100);
          return;
        }
        // Se limite = 0 (sem limite cadastrado), pedir liberação gerencial
        if (limite <= 0) {
          setPendingCrediario({ forma, valor, numParcelas });
          setSenhaGerencialInput("");
          setSenhaGerencialErro(false);
          setShowSenhaGerencial(true);
          toast.info("Cliente sem limite cadastrado — requer liberação gerencial");
          setTimeout(() => senhaGerencialRef.current?.focus(), 100);
          return;
        }
      } else {
        // Cliente não encontrado no cadastro de pessoas — pedir liberação gerencial
        setPendingCrediario({ forma, valor, numParcelas });
        setSenhaGerencialInput("");
        setSenhaGerencialErro(false);
        setShowSenhaGerencial(true);
        toast.info("Cliente sem cadastro completo — requer liberação gerencial");
        setTimeout(() => senhaGerencialRef.current?.focus(), 100);
        return;
      }
    }
    if (forma.tipo === "pix") {
      setPixValorPendente(valor);
      setShowPixQR(true);
      return;
    }
    setPagamentos(prev => [...prev, {
      formaId: forma.id,
      formaDescricao: forma.descricao,
      formaTipo: forma.tipo,
      valor,
      parcelas: forma.maxParcelas > 1 ? (numParcelas || parseInt(parcelas)) : undefined,
    }]);
    setValorPagamento("");
    setTimeout(() => valorInputRef.current?.focus(), 50);
  }, [parcelas, cliente, onRequestCliente]);

  const pagamentoRapido = useCallback(() => {
    if (restante <= 0.01 || !formaSelecionada) return;
    if (formaSelecionada && isFormaCrediario(formaSelecionada) && !cliente) {
      toast.warning("Selecione um cliente para venda em crediário!", { description: "Clique em F8 ou no botão de cliente" });
      onRequestCliente();
      return;
    }
    if (formaSelecionada && isFormaCrediario(formaSelecionada) && temProdutoPromocao && !permitirCrediarioPromocao && !promoCrediarioLiberado) {
      setPendingPromoCrediario(true);
      setSenhaGerencialInput("");
      setSenhaGerencialErro(false);
      setShowSenhaGerencial(true);
      toast.info("Crediário com promoção requer liberação gerencial");
      setTimeout(() => senhaGerencialRef.current?.focus(), 100);
      return;
    }
    addPagamento(formaSelecionada, restante);
  }, [restante, addPagamento, formaSelecionada, cliente, onRequestCliente, temProdutoPromocao, permitirCrediarioPromocao, promoCrediarioLiberado]);

  const adicionarPagamento = useCallback(() => {
    if (!formaSelecionada) return;
    if (isFormaCrediario(formaSelecionada) && temProdutoPromocao && !permitirCrediarioPromocao && !promoCrediarioLiberado) {
      setPendingPromoCrediario(true);
      setSenhaGerencialInput("");
      setSenhaGerencialErro(false);
      setShowSenhaGerencial(true);
      toast.info("Crediário com promoção requer liberação gerencial");
      setTimeout(() => senhaGerencialRef.current?.focus(), 100);
      return;
    }
    const digitado = parseFloat(valorPagamento);
    if (!digitado || digitado <= 0) {
      if (restante <= 0.01) return;
      addPagamento(formaSelecionada, restante);
      return;
    }
    if (formaSelecionada.troco) {
      addPagamento(formaSelecionada, digitado);
    } else {
      addPagamento(formaSelecionada, Math.min(digitado, restante));
    }
  }, [valorPagamento, restante, formaSelecionada, addPagamento, temProdutoPromocao, permitirCrediarioPromocao, promoCrediarioLiberado]);

  const removerPagamento = (index: number) => {
    setPagamentos(prev => prev.filter((_, i) => i !== index));
  };

  const handlePixConfirmado = useCallback(() => {
    if (!formaSelecionada) return;
    setPagamentos(prev => [...prev, {
      formaId: formaSelecionada.id,
      formaDescricao: formaSelecionada.descricao,
      formaTipo: "pix",
      valor: pixValorPendente,
    }]);
    setShowPixQR(false);
    setPixValorPendente(0);
    setValorPagamento("");
  }, [pixValorPendente, formaSelecionada]);

  const confirmarLiberacaoGerencial = useCallback(() => {
    const senhaCorreta = getSenhaGerencial();
    if (senhaGerencialInput !== senhaCorreta) {
      setSenhaGerencialErro(true);
      toast.error("Senha gerencial incorreta!");
      setSenhaGerencialInput("");
      setTimeout(() => senhaGerencialRef.current?.focus(), 50);
      return;
    }
    if (pendingPromoCrediario) {
      setPromoCrediarioLiberado(true);
      setPendingPromoCrediario(false);
      setShowSenhaGerencial(false);
      setSenhaGerencialInput("");
      setSenhaGerencialErro(false);
      toast.success("🔓 Crediário com promoção liberado!", {
        description: "Autorização gerencial concedida para esta venda.",
      });
      try {
        const turnoStr = localStorage.getItem("pdv-turno");
        const turno = turnoStr ? JSON.parse(turnoStr) : null;
        insertLiberacao({
          operador: turno?.operador || "ADMIN",
          cliente: cliente?.nome || "—",
          clienteDoc: cliente?.cpfCnpj || "",
          valorAutorizado: 0,
          limiteDisponivel: 0,
          excedente: 0,
          motivo: "Liberação crediário com produto em promoção",
        });
      } catch { /* erro ignorado */ }
      setTimeout(() => valorInputRef.current?.focus(), 50);
      return;
    }
    if (pendingCrediario) {
      const { forma, valor, numParcelas } = pendingCrediario;
      setPagamentos(prev => [...prev, {
        formaId: forma.id,
        formaDescricao: forma.descricao,
        formaTipo: forma.tipo,
        valor,
        parcelas: forma.maxParcelas > 1 ? (numParcelas || parseInt(parcelas)) : undefined,
      }]);
      setValorPagamento("");

      try {
        const turnoStr = localStorage.getItem("pdv-turno");
        const turno = turnoStr ? JSON.parse(turnoStr) : null;
        insertLiberacao({
          operador: turno?.operador || "ADMIN",
          cliente: cliente?.nome || "—",
          clienteDoc: cliente?.cpfCnpj || "",
          valorAutorizado: valor,
          limiteDisponivel: creditoCliente?.disponivel ?? 0,
          excedente: valor - (creditoCliente?.disponivel ?? 0),
          motivo: "Liberação de crédito excedente",
        });
      } catch { /* erro ignorado */ }

      toast.success("🔓 Liberação gerencial autorizada!", {
        description: `Venda em crediário de R$ ${valor.toFixed(2)} aprovada pelo gerente.`,
      });
    }
    setShowSenhaGerencial(false);
    setPendingCrediario(null);
    setPendingPromoCrediario(false);
    setSenhaGerencialInput("");
    setSenhaGerencialErro(false);
    setTimeout(() => valorInputRef.current?.focus(), 50);
  }, [senhaGerencialInput, pendingCrediario, pendingPromoCrediario, parcelas, cliente, creditoCliente]);

  const emitirNFCe = useCallback(() => {
    if (restante > 0.01) {
      toast.error("Valor pago insuficiente!");
      return;
    }
    // Validate crediário requires cliente
    const temCrediario = pagamentos.some(p => p.formaTipo === "crediario");
    if (temCrediario && !cliente) {
      toast.error("Cliente obrigatório para venda em crediário!");
      onRequestCliente();
      return;
    }
    setNfeStatus("emitting");
    setTimeout(() => {
      const numero = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
      const chave = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join("");
      setNfeNumero(numero);
      setNfeChave(chave);
      setNfeStatus("authorized");
      setShowDanfe(true);
      toast.success(`NFC-e nº ${numero} autorizada!`);

      // Gerar contas a receber para pagamentos em crediário
      if (temCrediario && cliente) {
        const crediarioPagamentos = pagamentos.filter(p => p.formaTipo === "crediario");
        crediarioPagamentos.forEach(pg => {
          const numParcelas = pg.parcelas || 1;
          const conta = gerarContasReceber(cliente, pg.valor, numParcelas, items);
          if (observacaoCrediario) {
            try {
              const stored = localStorage.getItem("contas_receber");
              if (stored) {
                const contas = JSON.parse(stored);
                const idx = contas.findIndex((c: any) => c.id === conta.id);
                if (idx >= 0) { contas[idx].observacao = observacaoCrediario; localStorage.setItem("contas_receber", JSON.stringify(contas)); }
              }
            } catch { /* erro ignorado */ }
          }
          toast.success(`Contas a receber geradas: ${numParcelas}x de R$ ${(pg.valor / numParcelas).toFixed(2)}`, {
            description: `Cliente: ${cliente.nome}`,
          });
          // Imprimir segunda via do crediário
          imprimirSegundaViaCrediario(cliente, items, pg.valor, conta.parcelas, observacaoCrediario || undefined);
        });
      }

      const pagamentosInfo = pagamentos.map(p => ({ forma: p.formaDescricao, valor: p.valor }));
      // Não auto-finaliza — aguarda F4 ou clique do operador
    }, 600);
  }, [restante, pagamentos, onFinalized, resetState, onClose, cliente, items, onRequestCliente]);

  const handleFinalizar = useCallback(() => {
    const pagamentosInfo = pagamentos.map(p => ({ forma: p.formaDescricao, valor: p.valor }));
    onFinalized(pagamentosInfo);
    resetState();
    onClose();
  }, [pagamentos, onFinalized, resetState, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      // F4 finaliza em qualquer estado após autorização
      if (e.key === "F4" && nfeStatus === "authorized") {
        e.preventDefault();
        handleFinalizar();
        return;
      }

      if (nfeStatus !== "idle") return;

      const tag = (document.activeElement as HTMLElement)?.tagName;

      // Number keys select payment method (1-9)
      if (tag !== "INPUT" && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < formasAtivas.length && restante > 0.01) {
          e.preventDefault();
          if (formaIdx === idx) {
            pagamentoRapido();
          } else {
            setFormaIdx(idx);
            setValorPagamento("");
            setTimeout(() => valorInputRef.current?.focus(), 50);
          }
        }
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        pagamentoRapido();
        return;
      }

      if ((e.key === "F2" || e.key === "F4") && podeEmitir) {
        e.preventDefault();
        emitirNFCe();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (podeEmitir) {
          emitirNFCe();
        } else if (restante > 0 || (formaSelecionada?.troco && parseFloat(valorPagamento) > 0)) {
          adicionarPagamento();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        resetState();
        onClose();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, nfeStatus, formaIdx, formasAtivas, podeEmitir, restante, pagamentoRapido, emitirNFCe, adicionarPagamento, onClose, resetState, valorPagamento, formaSelecionada, handleFinalizar]);

  useEffect(() => {
    if (open && nfeStatus === "idle") {
      setTimeout(() => valorInputRef.current?.focus(), 200);
    }
  }, [open, nfeStatus]);

  // Auto-scroll to crediário warning when crediário selected without client
  useEffect(() => {
    if (formaSelecionada && isFormaCrediario(formaSelecionada) && !cliente) {
      setTimeout(() => crediarioWarningRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [formaSelecionada, cliente]);


  return (
    <Dialog open={open} onOpenChange={v => !v && nfeStatus !== "emitting" && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-5 py-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={22} />
              <span className="font-semibold text-lg">Finalizar Venda</span>
            </div>
            <div className="text-right">
              <span className="text-xs opacity-80">{items.length} {items.length === 1 ? "item" : "itens"}</span>
              <p className="text-2xl font-bold font-mono">R$ {formatCurrencyBRL(subtotal)}</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {nfeStatus === "idle" && (
            <>
              {/* Desconto e Acréscimo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Minus size={12} /> Desconto
                  </Label>
                  <div className="flex gap-1">
                    <CurrencyInput
                      value={parseFloat(descontoValor) || 0}
                      onValueChange={v => setDescontoValor(String(v))}
                      showPrefix={descontoTipo === "valor"}
                      className="font-mono h-8 text-sm"
                    />
                    <Select value={descontoTipo} onValueChange={v => setDescontoTipo(v as DescontoTipo)}>
                      <SelectTrigger className="h-8 w-16 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentual">%</SelectItem>
                        <SelectItem value="valor">R$</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {desconto > 0 && (
                    <span className="text-[10px] text-destructive font-mono">- R$ {formatCurrencyBRL(desconto)}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Plus size={12} /> Acréscimo (R$)
                  </Label>
                  <CurrencyInput
                    value={parseFloat(acrescimoValor) || 0}
                    onValueChange={v => setAcrescimoValor(String(v))}
                    className="font-mono h-8 text-sm"
                  />
                  {acrescimo > 0 && (
                    <span className="text-[10px] text-primary font-mono">+ R$ {formatCurrencyBRL(acrescimo)}</span>
                  )}
                </div>
              </div>

              {/* Total líquido */}
              {(desconto > 0 || acrescimo > 0) && (
                <div className="bg-muted/50 rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>Subtotal: R$ {formatCurrencyBRL(subtotal)}</div>
                    {desconto > 0 && <div className="text-destructive">Desconto: - R$ {formatCurrencyBRL(desconto)}</div>}
                    {acrescimo > 0 && <div className="text-primary">Acréscimo: + R$ {formatCurrencyBRL(acrescimo)}</div>}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <p className="text-xl font-bold font-mono">R$ {formatCurrencyBRL(totalLiquido)}</p>
                  </div>
                </div>
              )}

              {/* Aviso crediário sem cliente */}
              {formaSelecionada && isFormaCrediario(formaSelecionada) && !cliente && (
                <div ref={crediarioWarningRef} className="bg-destructive/15 border-2 border-destructive/50 rounded-lg px-4 py-3 flex items-center gap-3 animate-pulse">
                  <AlertTriangle size={20} className="text-destructive shrink-0" />
                  <div>
                    <p className="text-sm text-destructive font-bold">⚠️ Cliente obrigatório para crediário</p>
                    <button onClick={onRequestCliente} className="text-sm text-destructive underline font-bold mt-0.5 hover:opacity-80">
                      👉 Clique aqui para selecionar cliente (F8)
                    </button>
                  </div>
                </div>
              )}

              {/* Alerta crediário + promoção */}
              {formaSelecionada && isFormaCrediario(formaSelecionada) && temProdutoPromocao && !permitirCrediarioPromocao && (
                promoCrediarioLiberado ? (
                  <div className="bg-accent/10 border-2 border-accent/40 rounded-lg px-4 py-3 flex items-center gap-3">
                    <Lock size={20} className="text-accent shrink-0" />
                    <div>
                      <p className="text-sm text-accent font-bold">✅ Crediário com promoção liberado</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Autorização gerencial concedida para esta venda.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-destructive/10 border-2 border-destructive/40 rounded-lg px-4 py-3 flex items-center gap-3">
                    <AlertTriangle size={20} className="text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-destructive font-bold">🚫 Crediário bloqueado para produtos em promoção</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requer liberação gerencial ou habilite nas configurações do PDV.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setPendingPromoCrediario(true);
                        setSenhaGerencialInput("");
                        setSenhaGerencialErro(false);
                        setShowSenhaGerencial(true);
                        setTimeout(() => senhaGerencialRef.current?.focus(), 100);
                      }}
                    >
                      <Lock size={14} className="mr-1" /> Liberar
                    </Button>
                  </div>
                )
              )}

              {formaSelecionada && isFormaCrediario(formaSelecionada) && cliente && creditoCliente && (
                <div className={`rounded-lg px-3 py-2 border ${creditoCliente.disponivel >= restante ? "bg-accent/10 border-accent/30" : "bg-destructive/10 border-destructive/30"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">💳 Análise de Crédito — {cliente.nome}</span>
                    {creditoCliente.disponivel >= restante ? (
                      <Badge variant="default" className="text-[10px] h-5 bg-accent text-accent-foreground">✓ APROVADO</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] h-5">✗ INSUFICIENTE</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">Limite</span>
                      <p className="font-mono font-bold">R$ {formatCurrencyBRL(Math.max(creditoCliente.limiteCredito, creditoCliente.limitePrazo))}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Débitos</span>
                      <p className="font-mono font-bold text-destructive">R$ {formatCurrencyBRL(creditoCliente.debitos)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Disponível</span>
                      <p className={`font-mono font-bold ${creditoCliente.disponivel >= restante ? "text-accent" : "text-destructive"}`}>
                        R$ {formatCurrencyBRL(creditoCliente.disponivel)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formaSelecionada && isFormaCrediario(formaSelecionada) && cliente && !creditoCliente && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-destructive shrink-0" />
                  <span className="text-xs text-destructive font-medium">
                    Cliente não encontrado no cadastro de pessoas. Cadastre com limite de crédito.
                  </span>
                </div>
              )}

              {/* Observação crediário */}
              {formaSelecionada && isFormaCrediario(formaSelecionada) && cliente && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">📝 Observação do vendedor (opcional)</Label>
                  <textarea
                    value={observacaoCrediario}
                    onChange={e => setObservacaoCrediario(e.target.value)}
                    placeholder="Anotações sobre a venda em crediário..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none h-16"
                    maxLength={300}
                  />
                  <span className="text-[10px] text-muted-foreground">{observacaoCrediario.length}/300</span>
                </div>
              )}

              {/* Cliente selecionado info (quando não crediário) */}
              {cliente && formaSelecionada?.tipo !== "crediario" && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="text-xs text-primary font-medium">👤 {cliente.nome} — {cliente.cpfCnpj}</span>
                </div>
              )}

              {/* Formas de pagamento dinâmicas */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(formasAtivas.length, 5)}, 1fr)` }}>
                {formasAtivas.map((f, i) => {
                  const isSelected = formaIdx === i;
                  const isCrediarioSemCliente = isFormaCrediario(f) && !cliente;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        if (restante <= 0.01) return;
                        if (isSelected) {
                          pagamentoRapido();
                        } else {
                          setFormaIdx(i);
                          setValorPagamento("");
                          setParcelas("1");
                          setTimeout(() => valorInputRef.current?.focus(), 50);
                        }
                      }}
                      className={`
                        flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-lg border-2 transition-all text-xs font-medium
                        ${isSelected
                          ? isCrediarioSemCliente
                            ? "border-destructive bg-destructive/10 text-destructive shadow-sm"
                            : "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                        }
                        ${restante <= 0.01 ? "opacity-40 pointer-events-none" : "cursor-pointer"}
                      `}
                    >
                      {getIconeForma(f.tipo)}
                      <span className="truncate max-w-full text-[11px]">{f.descricao}</span>
                      <kbd className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-mono">{i + 1}</kbd>
                    </button>
                  );
                })}
              </div>

              {restante > 0.01 && pagamentos.length === 0 && (
                <p className="text-[10px] text-center text-muted-foreground">
                  Clique na forma selecionada ou <kbd className="px-1 bg-muted rounded">F1</kbd> para pagar <strong>R$ {formatCurrencyBRL(restante)}</strong> de uma vez
                </p>
              )}

              {/* Valor pago + parcelas */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {formaSelecionada?.troco ? "Valor recebido" : "Valor"}
                  </Label>
                  <CurrencyInput
                    ref={valorInputRef}
                    value={parseFloat(valorPagamento) || (restante > 0 ? restante : 0)}
                    onValueChange={v => setValorPagamento(String(v))}
                    className="font-mono h-10 text-base"
                    disabled={restante <= 0.01}
                  />
                </div>
                {formaSelecionada && formaSelecionada.maxParcelas > 1 && (
                  <div className="w-20 space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcelas</Label>
                    <Select value={parcelas} onValueChange={setParcelas}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: formaSelecionada.maxParcelas }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button
                  onClick={adicionarPagamento}
                  disabled={(restante <= 0.01 && !(formaSelecionada?.troco)) || (formaSelecionada ? isFormaCrediario(formaSelecionada) && !cliente : false)}
                  size="default"
                  className="h-10 px-4 gap-1"
                >
                  Lançar
                </Button>
              </div>

              {/* CPF */}
              <div className="flex gap-2 items-center">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">CPF/CNPJ:</Label>
                <Input value={cpfNota} onChange={e => setCpfNota(e.target.value)} placeholder="opcional" className="h-7 text-xs max-w-[180px]" />
              </div>

              {/* Lista de pagamentos */}
              {pagamentos.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="divide-y divide-border">
                    {pagamentos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-card hover:bg-muted/30">
                        <div className="flex items-center gap-2 text-sm">
                          {getIconeForma(p.formaTipo)}
                          <span className="font-medium">{p.formaDescricao}</span>
                          {p.parcelas && p.parcelas > 1 && (
                            <Badge variant="secondary" className="text-[10px] px-1">{p.parcelas}x</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">R$ {formatCurrencyBRL(p.valor)}</span>
                          <button
                            onClick={() => removerPagamento(i)}
                            className="text-destructive hover:bg-destructive/10 rounded p-0.5 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-muted/50 px-3 py-1.5 flex justify-between text-sm border-t border-border">
                    <span className="text-muted-foreground">Total pago</span>
                    <span className="font-mono font-bold">R$ {totalPago.toFixed(2)}</span>
                  </div>

                  {restante > 0.01 && (
                    <div className="bg-destructive/5 px-3 py-1.5 flex justify-between text-sm border-t border-border">
                      <span className="text-destructive font-medium">Falta</span>
                      <span className="font-mono font-bold text-destructive">R$ {restante.toFixed(2)}</span>
                    </div>
                  )}

                  {troco > 0.01 && (
                    <div className="bg-primary/10 px-3 py-2 flex justify-between items-center border-t border-border">
                      <span className="text-primary font-bold text-base flex items-center gap-1">
                        <Banknote size={18} /> TROCO
                      </span>
                      <span className="font-mono font-bold text-primary text-xl">R$ {troco.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botão emitir */}
              <Button
                onClick={emitirNFCe}
                disabled={!podeEmitir}
                className={`w-full h-12 text-base gap-2 transition-all ${podeEmitir ? "animate-pulse" : ""}`}
              >
                <FileText size={20} />
                {podeEmitir ? "✓ Emitir NFC-e (F4)" : `Emitir NFC-e — falta R$ ${restante.toFixed(2)}`}
              </Button>

              {/* Atalhos */}
              <div className="flex flex-wrap gap-2 justify-center text-[10px] text-muted-foreground">
                <span><kbd className="px-1 py-0.5 bg-muted rounded">1-{formasAtivas.length}</kbd> Forma</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded">F1</kbd> Pagar tudo</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> Lançar</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded">F4</kbd> Emitir</span>
                <span><kbd className="px-1 py-0.5 bg-muted rounded">ESC</kbd> Voltar</span>
              </div>
            </>
          )}

          {nfeStatus === "emitting" && (
            <div className="text-center py-8 space-y-3">
              <Loader2 className="mx-auto animate-spin text-primary" size={48} />
              <p className="text-lg font-semibold">Emitindo NFC-e...</p>
              <p className="text-sm text-muted-foreground">Transmitindo para SEFAZ...</p>
            </div>
          )}

          {nfeStatus === "authorized" && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-accent">
                <CheckCircle2 size={24} />
                <span className="text-lg font-bold">NFC-e AUTORIZADA</span>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDanfe(!showDanfe)} className="gap-1">
                  {showDanfe ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showDanfe ? "Ocultar" : "DANFE"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.info("Enviado para impressão (simulação)")} className="gap-1">
                  <Printer size={14} /> Imprimir
                </Button>
                <Button size="sm" onClick={handleFinalizar} className="gap-1">Finalizar (F4)</Button>
              </div>
              <div
                ref={danfeRef}
                className={`flex justify-center overflow-hidden transition-all duration-500 ease-in-out ${showDanfe ? 'max-h-[2000px] opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'}`}
              >
                <DanfeNFCe
                  numero={nfeNumero}
                  chave={nfeChave}
                  items={items}
                  subtotal={subtotal}
                  pagamentos={pagamentos.map(p => ({ forma: p.formaDescricao, valor: p.valor }))}
                  troco={troco}
                  cpf={cpfNota || cliente?.cpfCnpj || ""}
                  clienteNome={cliente?.nome}
                  clienteTelefone={cliente?.telefone}
                  clienteEndereco={cliente?.endereco}
                  clienteNumero={cliente?.numero}
                  clienteBairro={cliente?.bairro}
                  clienteCidade={cliente?.cidade}
                  clienteUf={cliente?.uf}
                  dataEmissao={new Date()}
                  descontoGeral={descontoGeral}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">Pressione <kbd className="px-1 bg-muted rounded font-mono">F4</kbd> para finalizar e iniciar nova venda</p>
            </div>
          )}

          {nfeStatus === "error" && (
            <div className="text-center py-6 space-y-3">
              <AlertTriangle className="mx-auto text-destructive" size={48} />
              <p className="text-lg font-bold text-destructive">Erro na Emissão</p>
              <p className="text-sm text-muted-foreground">Falha ao comunicar com SEFAZ.</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setNfeStatus("idle")}>Tentar Novamente</Button>
                <Button variant="destructive" onClick={() => { setNfeStatus("idle"); toast.warning("Contingência off-line"); }}>Contingência</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      <PixQRCodeModal
        open={showPixQR}
        onClose={() => { setShowPixQR(false); setPixValorPendente(0); }}
        valor={pixValorPendente}
        onPagamentoConfirmado={handlePixConfirmado}
      />

      {/* Modal Liberação Gerencial */}
      <Dialog open={showSenhaGerencial} onOpenChange={v => { if (!v) { setShowSenhaGerencial(false); setPendingCrediario(null); setSenhaGerencialInput(""); setSenhaGerencialErro(false); } }}>
        <DialogContent className="max-w-sm">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldCheck className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
            <h3 className="text-lg font-bold">Liberação Gerencial</h3>
            <p className="text-sm text-muted-foreground">
              O valor excede o limite de crédito disponível do cliente.
            </p>
            {pendingCrediario && creditoCliente && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor da venda:</span><span className="font-mono font-bold">R$ {pendingCrediario.valor.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Disponível:</span><span className="font-mono font-bold text-destructive">R$ {creditoCliente.disponivel.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Excedente:</span><span className="font-mono font-bold text-destructive">R$ {(pendingCrediario.valor - creditoCliente.disponivel).toFixed(2)}</span></div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                <Lock size={12} /> Senha do Gerente
              </Label>
              <Input
                ref={senhaGerencialRef}
                type="password"
                value={senhaGerencialInput}
                onChange={e => { setSenhaGerencialInput(e.target.value); setSenhaGerencialErro(false); }}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmarLiberacaoGerencial(); } if (e.key === "Escape") { e.preventDefault(); setShowSenhaGerencial(false); setPendingCrediario(null); } }}
                placeholder="Digite a senha gerencial"
                className={`text-center font-mono text-lg h-12 ${senhaGerencialErro ? "border-destructive ring-1 ring-destructive" : ""}`}
                autoFocus
              />
              {senhaGerencialErro && (
                <p className="text-xs text-destructive font-medium">Senha incorreta. Tente novamente.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowSenhaGerencial(false); setPendingCrediario(null); }}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-1" onClick={confirmarLiberacaoGerencial}>
                <ShieldCheck size={16} /> Autorizar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Senha padrão: 1234 — Configure em NFC-e &gt; Senha Gerencial
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
