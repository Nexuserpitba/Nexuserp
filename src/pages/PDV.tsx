import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PDVLogin } from "@/components/pdv/PDVLogin";
import { SystemUser, defaultDiscountLimits } from "@/contexts/AuthContext";
import { addAuditLog } from "@/lib/auditLog";
import { useThemeSchedule } from "@/hooks/useTheme";
import { PDVTopBar } from "@/components/pdv/PDVTopBar";
import { PDVInfoBar } from "@/components/pdv/PDVInfoBar";
import { PDVLastItemBanner } from "@/components/pdv/PDVLastItemBanner";
import { PDVInputPanel } from "@/components/pdv/PDVInputPanel";
import { PDVCupom } from "@/components/pdv/PDVCupom";
import { PDVStatusBar } from "@/components/pdv/PDVStatusBar";
import { PDVMobileView } from "@/components/pdv/PDVMobileView";
import { PDVMobileActionBar } from "@/components/pdv/PDVMobileActionBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { FinalizarVendaModal } from "@/components/pdv/FinalizarVendaModal";
import { BuscarProdutoModal } from "@/components/pdv/BuscarProdutoModal";
import { SelecionarClienteModal } from "@/components/pdv/SelecionarClienteModal";
import { LancarValorModal } from "@/components/pdv/LancarValorModal";
import { ConfirmarCancelamentoModal } from "@/components/pdv/ConfirmarCancelamentoModal";
import { BuscarPesoModal } from "@/components/pdv/BuscarPesoModal";
import { SangriaSuprimentoModal } from "@/components/pdv/SangriaSuprimentoModal";
import { FechamentoCaixaModal } from "@/components/pdv/FechamentoCaixaModal";
import { GerenciarTurnoModal } from "@/components/pdv/GerenciarTurnoModal";
import { ReimprimirCupomModal, UltimoCupom, salvarCupomHistorico } from "@/components/pdv/ReimprimirCupomModal";
import { ConsultaRapidaModal } from "@/components/pdv/ConsultaRapidaModal";
import { AtalhosModal } from "@/components/pdv/AtalhosModal";
import { LiberacaoDescontoModal } from "@/components/pdv/LiberacaoDescontoModal";
import { LiberacaoPrecoModal } from "@/components/pdv/LiberacaoPrecoModal";
import { LiberacaoQuantidadeModal } from "@/components/pdv/LiberacaoQuantidadeModal";
import { ProdutosBalancaModal } from "@/components/pdv/ProdutosBalancaModal";

interface ItemVenda {
  id: number;
  codigo: string;
  barras: string;
  descricao: string;
  quantidade: number;
  preco: number;
  imagem?: string;
  emPromocao?: boolean;
  precoOriginal?: number;
  produtoBalanca?: boolean;
  unidadeBalanca?: string;
  desconto?: number; // percentual de desconto (0-100)
  promoLeveXPagueY?: { leve: number; pague: number }; // Leve X Pague Y info
  promoKit?: string; // kit promo ID
  ncm?: string;
}

interface PromoLeveXPagueY {
  promoId: string;
  produtoCodigo: string;
  leve: number;
  pague: number;
}

interface PromoKit {
  promoId: string;
  descricao: string;
  kitValor: number;
  produtos: { produtoCodigo: string; produtoDescricao: string; quantidade: number; precoOriginal: number }[];
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

interface PagamentoVenda {
  forma: string;
  valor: number;
}

interface MovimentoCaixa {
  id: string;
  tipo: "sangria" | "suprimento" | "venda";
  valor: number;
  motivo?: string;
  hora: string;
  pagamentos?: PagamentoVenda[];
}

interface TurnoAtivo {
  id: string;
  operador: string;
  inicio: string;
  valorAbertura: number;
}

const produtosDemo: { codigo: string; barras: string; barrasMultiplos: string[]; descricao: string; venda: number; vendaOriginal?: number; emPromocao?: boolean; imagem?: string }[] = [
  { codigo: "001", barras: "7891234560001", barrasMultiplos: [], descricao: "Smartphone X Pro 128GB", venda: 2499.99 },
  { codigo: "002", barras: "7891234560002", barrasMultiplos: [], descricao: "Notebook Ultra 15 i7", venda: 5999.99 },
  { codigo: "003", barras: "7891234560003", barrasMultiplos: [], descricao: "Fone Bluetooth Z400", venda: 129.90 },
  { codigo: "004", barras: "7891234560004", barrasMultiplos: [], descricao: "Cabo USB-C 2m Premium", venda: 39.90 },
  { codigo: "005", barras: "7891234560005", barrasMultiplos: [], descricao: "Mouse Gamer RGB", venda: 199.90 },
  { codigo: "006", barras: "7891234560006", barrasMultiplos: [], descricao: "Teclado Mecânico Pro", venda: 349.90 },
];

function getPromocoesAtivas(): { descontos: Map<string, number>; leveXPagueY: PromoLeveXPagueY[]; kits: PromoKit[] } {
  const descontos = new Map<string, number>();
  const leveXPagueY: PromoLeveXPagueY[] = [];
  const kits: PromoKit[] = [];
  try {
    const stored = localStorage.getItem("promocoes");
    if (!stored) return { descontos, leveXPagueY, kits };
    const promocoes = JSON.parse(stored);
    const hoje = new Date();
    const diaSemana = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"][hoje.getDay()];

    for (const promo of promocoes) {
      if (promo.status !== "ABERTO") continue;
      const inicio = new Date(`${promo.inicio}T${promo.inicioHora || "00:00"}`);
      const fim = new Date(`${promo.fim}T${promo.fimHora || "23:59"}`);
      if (hoje < inicio || hoje > fim) continue;
      if (promo.diasSemana && promo.diasSemana.length > 0 && !promo.diasSemana.includes(diaSemana)) continue;

      const tipo = promo.tipoPromocao || "desconto";

      if (tipo === "desconto") {
        for (const p of promo.produtos || []) {
          if (p.vendaPromocao > 0) {
            const existing = descontos.get(p.produtoCodigo);
            if (!existing || p.vendaPromocao < existing) {
              descontos.set(p.produtoCodigo, p.vendaPromocao);
            }
          }
        }
      } else if (tipo === "leveXPagueY") {
        for (const p of promo.produtos || []) {
          leveXPagueY.push({
            promoId: promo.id,
            produtoCodigo: p.produtoCodigo,
            leve: promo.leveQuantidade || 3,
            pague: promo.pagueQuantidade || 2,
          });
        }
      } else if (tipo === "kit") {
        if ((promo.kitProdutos || []).length > 0 && promo.kitValor > 0) {
          kits.push({
            promoId: promo.id,
            descricao: promo.descricao || "Kit Promocional",
            kitValor: promo.kitValor,
            produtos: promo.kitProdutos || [],
          });
        }
      }
    }
  } catch { /* erro ignorado */ }
  return { descontos, leveXPagueY, kits };
}

function getProdutosCadastro() {
  const { descontos: promoMap } = getPromocoesAtivas();
  try {
    const stored = localStorage.getItem("produtos");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => {
          const codigo = p.codigo || p.id;
          const precoPromo = promoMap.get(codigo);
          return {
            codigo,
            barras: p.barras || "",
            barrasMultiplos: Array.isArray(p.barrasMultiplos) ? p.barrasMultiplos : [],
            descricao: p.descricao || "",
            venda: precoPromo ?? (Number(p.venda) || 0),
            vendaOriginal: precoPromo ? (Number(p.venda) || 0) : undefined,
            emPromocao: !!precoPromo,
            imagem: p.imagem || "",
            produtoBalanca: !!p.produtoBalanca,
            unidadeBalanca: p.unidadeBalanca || "kg",
            ncm: p.ncm || "",
          };
        });
      }
    }
  } catch { /* erro ignorado */ }
  // Aplica promos também nos produtos demo
  return produtosDemo.map(p => {
    const precoPromo = promoMap.get(p.codigo);
    return {
      ...p,
      venda: precoPromo ?? p.venda,
      vendaOriginal: precoPromo ? p.venda : undefined,
      emPromocao: !!precoPromo,
    };
  });
}

function isBalancaAtiva(): boolean {
  try {
    const s = localStorage.getItem("balanca-config");
    return s ? JSON.parse(s)?.ativa === true : false;
  } catch {
    return false;
  }
}

function isExigirTurno(): boolean {
  try {
    const s = localStorage.getItem("nfce-config");
    if (!s) return true;
    const config = JSON.parse(s);
    return config.exigirTurno !== false;
  } catch {
    return true;
  }
}

function getPdvPermissoes(): { permitirAlterarQuantidade: boolean; permitirAlterarPreco: boolean; exigirLiberacaoQuantidade: boolean; exigirLiberacaoPreco: boolean } {
  try {
    const s = localStorage.getItem("nfce-config");
    if (!s) return { permitirAlterarQuantidade: true, permitirAlterarPreco: false, exigirLiberacaoQuantidade: false, exigirLiberacaoPreco: true };
    const config = JSON.parse(s);
    return {
      permitirAlterarQuantidade: config.permitirAlterarQuantidade !== false,
      permitirAlterarPreco: config.permitirAlterarPreco === true,
      exigirLiberacaoQuantidade: config.exigirLiberacaoQuantidade === true,
      exigirLiberacaoPreco: config.exigirLiberacaoPreco !== false,
    };
  } catch {
    return { permitirAlterarQuantidade: true, permitirAlterarPreco: false, exigirLiberacaoQuantidade: false, exigirLiberacaoPreco: true };
  }
}

export default function PDV() {
  const isMobile = useIsMobile();
  const pdvPermissoes = useMemo(() => getPdvPermissoes(), []);
  const navigate = useNavigate();
  // Ativa o agendamento automático de modo escuro no PDV
  useThemeSchedule();

  // Auto-load IBPT data from Supabase on PDV open
  useEffect(() => {
    import("@/data/ibptData").then(({ loadIBPTFromSupabase }) => {
      loadIBPTFromSupabase().catch(console.error);
    });
  }, []);
  const [pdvUser, setPdvUser] = useState<SystemUser | null>(() => {
    try { const s = localStorage.getItem("pdv-user"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [items, setItems] = useState<ItemVenda[]>([]);
  const [barcode, setBarcode] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [nextId, setNextId] = useState(1);
  const [clock, setClock] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showFinalizar, setShowFinalizar] = useState(false);
  const [showBuscarProduto, setShowBuscarProduto] = useState(false);
  const [showCliente, setShowCliente] = useState(false);
  const [showLancarValor, setShowLancarValor] = useState(false);
  const [showCancelar, setShowCancelar] = useState(false);
  const [showExcluirItem, setShowExcluirItem] = useState(false);
  const [showBuscarPeso, setShowBuscarPeso] = useState(false);
  const [showSangria, setShowSangria] = useState(false);
  const [showSuprimento, setShowSuprimento] = useState(false);
  const [showFechamento, setShowFechamento] = useState(false);
  const [showTurno, setShowTurno] = useState(false);
  const [showReimprimir, setShowReimprimir] = useState(false);
  const [showConsultaRapida, setShowConsultaRapida] = useState(false);
  const [showAtalhos, setShowAtalhos] = useState(false);
  const [showProdutosBalanca, setShowProdutosBalanca] = useState(false);
  const [showTrocarOperador, setShowTrocarOperador] = useState(false);
  const [voltarParaFinalizar, setVoltarParaFinalizar] = useState(false);
  const [ultimoCupom, setUltimoCupom] = useState<UltimoCupom | null>(null);
  const [pendingBalancaProduto, setPendingBalancaProduto] = useState<any>(null);

  const [pendingDesconto, setPendingDesconto] = useState<{ itemId: number; desconto: number; itemDesc: string } | null>(null);
  const [pendingDescontoGeral, setPendingDescontoGeral] = useState<{ tipo: "percent" | "value"; valor: number; percentual: number } | null>(null);
  const [pendingPreco, setPendingPreco] = useState<{ itemId: number; novoPreco: number; precoAnterior: number; itemDesc: string } | null>(null);
  const [pendingQuantidade, setPendingQuantidade] = useState<{ itemId: number; novaQtd: number; qtdAnterior: number; itemDesc: string } | null>(null);

  const [modoVenda, setModoVenda] = useState<"varejo" | "atacado">("varejo");
  const [modoOrcamento, setModoOrcamento] = useState(false);
  const [descontoGeralTipo, setDescontoGeralTipo] = useState<"percent" | "value">("percent");
  const [descontoGeralValor, setDescontoGeralValor] = useState(0);
  const [pdvDark, setPdvDark] = useState(() => localStorage.getItem("pdv-dark") === "true");

  // Turno & Movimentos
  const [turnoAtivo, setTurnoAtivo] = useState<TurnoAtivo | null>(() => {
    try {
      const s = localStorage.getItem("pdv-turno");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [movimentos, setMovimentos] = useState<MovimentoCaixa[]>(() => {
    try {
      const s = localStorage.getItem("pdv-movimentos");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const produtos = useMemo(() => getProdutosCadastro(), []);
  const promosAtivas = useMemo(() => getPromocoesAtivas(), []);
  const balancaAtivada = useMemo(() => isBalancaAtiva(), []);
  const exigirTurno = useMemo(() => isExigirTurno(), []);
  const lastItem = items.length > 0 ? items[items.length - 1] : null;

  // Calculate Leve X Pague Y discount
  const leveXPagueYDesconto = useMemo(() => {
    let desconto = 0;
    for (const promo of promosAtivas.leveXPagueY) {
      const item = items.find(i => i.codigo === promo.produtoCodigo);
      if (item) {
        const gruposCompletos = Math.floor(item.quantidade / promo.leve);
        const itensGratis = gruposCompletos * (promo.leve - promo.pague);
        desconto += itensGratis * item.preco;
      }
    }
    return desconto;
  }, [items, promosAtivas.leveXPagueY]);

  // Calculate Kit discount + track which items are in completed kits with details
  const { kitDesconto, kitItemCodigos, kitPromoDetails } = useMemo(() => {
    let desconto = 0;
    const codigos = new Set<string>();
    const details = new Map<string, { nome: string; economia: number }>();
    for (const kit of promosAtivas.kits) {
      let kitQty = Infinity;
      for (const kp of kit.produtos) {
        const item = items.find(i => i.codigo === kp.produtoCodigo);
        if (!item) { kitQty = 0; break; }
        kitQty = Math.min(kitQty, Math.floor(item.quantidade / kp.quantidade));
      }
      if (kitQty > 0 && kitQty < Infinity) {
        const somaOriginal = kit.produtos.reduce((s, kp) => {
          const item = items.find(i => i.codigo === kp.produtoCodigo);
          return s + (item ? item.preco * kp.quantidade : 0);
        }, 0);
        const economia = (somaOriginal - kit.kitValor) * kitQty;
        desconto += economia;
        kit.produtos.forEach(kp => {
          codigos.add(kp.produtoCodigo);
          details.set(kp.produtoCodigo, { nome: kit.descricao, economia });
        });
      }
    }
    return { kitDesconto: Math.max(0, desconto), kitItemCodigos: codigos, kitPromoDetails: details };
  }, [items, promosAtivas.kits]);

  // Track which items have active Leve X Pague Y with details
  const { leveXPagueYItemCodigos, levePromoDetails } = useMemo(() => {
    const codigos = new Set<string>();
    const details = new Map<string, { leve: number; pague: number; economia: number }>();
    for (const promo of promosAtivas.leveXPagueY) {
      const item = items.find(i => i.codigo === promo.produtoCodigo);
      if (item && item.quantidade >= promo.leve) {
        codigos.add(promo.produtoCodigo);
        const gruposCompletos = Math.floor(item.quantidade / promo.leve);
        const itensGratis = gruposCompletos * (promo.leve - promo.pague);
        details.set(promo.produtoCodigo, { leve: promo.leve, pague: promo.pague, economia: itensGratis * item.preco });
      }
    }
    return { leveXPagueYItemCodigos: codigos, levePromoDetails: details };
  }, [items, promosAtivas.leveXPagueY]);

  const subtotal = items.reduce((acc, i) => {
    const totalItem = i.preco * i.quantidade;
    const desc = i.desconto ? totalItem * (i.desconto / 100) : 0;
    return acc + totalItem - desc;
  }, 0);
  const operador = pdvUser?.nome || turnoAtivo?.operador || "ADMIN";

  const promoDesconto = leveXPagueYDesconto + kitDesconto;
  const subtotalComPromo = Math.max(0, subtotal - promoDesconto);
  const descontoGeralCalculado = descontoGeralTipo === "percent"
    ? subtotalComPromo * (descontoGeralValor / 100)
    : Math.min(descontoGeralValor, subtotalComPromo);
  const totalFinal = Math.max(0, subtotalComPromo - descontoGeralCalculado);

  // Persist turno & movimentos
  useEffect(() => {
    if (turnoAtivo) localStorage.setItem("pdv-turno", JSON.stringify(turnoAtivo));
    else localStorage.removeItem("pdv-turno");
  }, [turnoAtivo]);

  useEffect(() => {
    localStorage.setItem("pdv-movimentos", JSON.stringify(movimentos));
  }, [movimentos]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const addMovimento = (tipo: MovimentoCaixa["tipo"], valor: number, motivo?: string, pagamentos?: PagamentoVenda[]) => {
    setMovimentos(prev => [...prev, {
      id: crypto.randomUUID(),
      tipo,
      valor,
      motivo,
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      pagamentos,
    }]);
  };

  const addProduto = (produto: { codigo: string; barras: string; descricao: string; venda: number; imagem?: string; emPromocao?: boolean; vendaOriginal?: number; produtoBalanca?: boolean; unidadeBalanca?: string; ncm?: string }, qty?: number, skipBalancaCheck?: boolean) => {
    // Se é produto de balança e não veio do fluxo de peso, abre o modal de peso
    if (produto.produtoBalanca && !skipBalancaCheck) {
      setPendingBalancaProduto(produto);
      setShowBuscarPeso(true);
      setBarcode("");
      return;
    }
    const q = qty || Math.max(1, parseInt(quantidade) || 1);
    // Produtos de balança sempre adicionam nova linha (cada pesagem é única)
    if (produto.produtoBalanca) {
      setItems([...items, { id: nextId, codigo: produto.codigo, barras: produto.barras, descricao: produto.descricao, quantidade: q, preco: produto.venda, imagem: produto.imagem, emPromocao: produto.emPromocao, precoOriginal: produto.vendaOriginal, produtoBalanca: produto.produtoBalanca, unidadeBalanca: produto.unidadeBalanca, ncm: produto.ncm }]);
      setNextId(nextId + 1);
    } else {
      const existing = items.find(i => i.codigo === produto.codigo);
      if (existing) {
        setItems(items.map(i => i.codigo === produto.codigo ? { ...i, quantidade: i.quantidade + q } : i));
      } else {
        setItems([...items, { id: nextId, codigo: produto.codigo, barras: produto.barras, descricao: produto.descricao, quantidade: q, preco: produto.venda, imagem: produto.imagem, emPromocao: produto.emPromocao, precoOriginal: produto.vendaOriginal, produtoBalanca: produto.produtoBalanca, unidadeBalanca: produto.unidadeBalanca, ncm: produto.ncm }]);
        setNextId(nextId + 1);
      }
    }
    if (produto.emPromocao && produto.vendaOriginal) {
      toast.success(`🏷️ Promoção! De R$ ${produto.vendaOriginal.toFixed(2)} por R$ ${produto.venda.toFixed(2)}`, { duration: 3000 });
    }
    // Check Leve X Pague Y notification
    const levePromo = promosAtivas.leveXPagueY.find(lp => lp.produtoCodigo === produto.codigo);
    if (levePromo) {
      const existingItem = items.find(i => i.codigo === produto.codigo);
      const newQty = (existingItem?.quantidade || 0) + (qty || Math.max(1, parseInt(quantidade) || 1));
      const falta = levePromo.leve - (newQty % levePromo.leve);
      if (newQty >= levePromo.leve) {
        toast.success(`🎁 Leve ${levePromo.leve} Pague ${levePromo.pague}! ${levePromo.leve - levePromo.pague} grátis aplicado!`, { duration: 4000 });
      } else if (falta <= 2 && falta > 0) {
        toast.info(`🎁 Leve ${levePromo.leve} Pague ${levePromo.pague}! Falta ${falta} para ganhar ${levePromo.leve - levePromo.pague} grátis!`, { duration: 4000 });
      }
    }
    // Check Kit completion
    for (const kit of promosAtivas.kits) {
      const kitHasProduto = kit.produtos.some(kp => kp.produtoCodigo === produto.codigo);
      if (kitHasProduto) {
        const allPresent = kit.produtos.every(kp => {
          const inSale = items.find(i => i.codigo === kp.produtoCodigo);
          const qty2 = kp.produtoCodigo === produto.codigo ? (inSale?.quantidade || 0) + (qty || 1) : (inSale?.quantidade || 0);
          return qty2 >= kp.quantidade;
        });
        if (allPresent) {
          const somaOrig = kit.produtos.reduce((s, kp) => s + kp.precoOriginal * kp.quantidade, 0);
          const economia = somaOrig - kit.kitValor;
          toast.success(`🛍️ Kit "${kit.descricao}" completo! Economia de R$ ${economia.toFixed(2)}`, { duration: 4000 });
        } else {
          const faltam = kit.produtos.filter(kp => {
            const inSale = items.find(i => i.codigo === kp.produtoCodigo);
            const qty2 = kp.produtoCodigo === produto.codigo ? (inSale?.quantidade || 0) + (qty || 1) : (inSale?.quantidade || 0);
            return qty2 < kp.quantidade;
          });
          if (faltam.length <= 2) {
            toast.info(`🛍️ Kit "${kit.descricao}": falta ${faltam.map(f => f.produtoDescricao).join(", ")}`, { duration: 4000 });
          }
        }
      }
    }
    setBarcode("");
    setQuantidade("1");
    barcodeRef.current?.focus();
  };

  const addByBarcode = () => {
    if (!barcode.trim()) return;
    const produto = produtos.find(p => p.barras === barcode || p.codigo === barcode || (p.barrasMultiplos && p.barrasMultiplos.includes(barcode)));
    if (!produto) { toast.error("Produto não encontrado!"); return; }
    addProduto(produto);
  };

  const updateItemQuantidade = (itemId: number, novaQtd: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    // Operadores precisam de liberação gerencial se configurado
    if (pdvPermissoes.exigirLiberacaoQuantidade && pdvUser && pdvUser.role === "operador") {
      setPendingQuantidade({ itemId, novaQtd, qtdAnterior: item.quantidade, itemDesc: item.descricao });
      return;
    }
    if (pdvUser) {
      addAuditLog("pdv_alterar_quantidade", pdvUser, `${item.descricao}: ${item.quantidade} → ${novaQtd}`);
    }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantidade: novaQtd } : i));
    toast.success("Quantidade atualizada");
  };

  const handleQuantidadeAutorizada = (autorizadoPor: string) => {
    if (!pendingQuantidade) return;
    if (pdvUser) {
      addAuditLog("pdv_alterar_quantidade", pdvUser, `${pendingQuantidade.itemDesc}: ${pendingQuantidade.qtdAnterior} → ${pendingQuantidade.novaQtd} (autorizado por ${autorizadoPor})`);
    }
    setItems(prev => prev.map(i => i.id === pendingQuantidade.itemId ? { ...i, quantidade: pendingQuantidade.novaQtd } : i));
    toast.success(`Quantidade atualizada (liberação gerencial)`);
    setPendingQuantidade(null);
  };

  const updateItemPreco = (itemId: number, novoPreco: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    // Operadores precisam de liberação gerencial para alterar preço
    if (pdvUser && pdvUser.role === "operador") {
      setPendingPreco({ itemId, novoPreco, precoAnterior: item.preco, itemDesc: item.descricao });
      return;
    }
    if (pdvUser) {
      addAuditLog("pdv_alterar_preco", pdvUser, `${item.descricao}: R$ ${item.preco.toFixed(2)} → R$ ${novoPreco.toFixed(2)}`);
    }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, preco: novoPreco } : i));
    toast.success("Preço atualizado");
  };

  const handlePrecoAutorizado = (autorizadoPor: string) => {
    if (!pendingPreco) return;
    const item = items.find(i => i.id === pendingPreco.itemId);
    if (pdvUser) {
      addAuditLog("pdv_alterar_preco", pdvUser, `${pendingPreco.itemDesc}: R$ ${pendingPreco.precoAnterior.toFixed(2)} → R$ ${pendingPreco.novoPreco.toFixed(2)} (autorizado por ${autorizadoPor})`);
    }
    setItems(prev => prev.map(i => i.id === pendingPreco.itemId ? { ...i, preco: pendingPreco.novoPreco } : i));
    toast.success(`Preço atualizado para R$ ${pendingPreco.novoPreco.toFixed(2)} (liberação gerencial)`);
    setPendingPreco(null);
  };

  const getMaxDesconto = () => {
    if (!pdvUser) return 0;
    if (pdvUser.limiteDesconto !== undefined) return pdvUser.limiteDesconto;
    return defaultDiscountLimits[pdvUser.role] ?? 5;
  };

  const updateItemDesconto = (itemId: number, desconto: number) => {
    const max = getMaxDesconto();
    if (desconto > max) {
      const item = items.find(i => i.id === itemId);
      setPendingDesconto({ itemId, desconto, itemDesc: item?.descricao || "Item" });
      return;
    }
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, desconto } : i));
    toast.success(`Desconto de ${desconto}% aplicado`);
  };

  const handleDescontoAutorizado = () => {
    if (!pendingDesconto) return;
    setItems(prev => prev.map(i => i.id === pendingDesconto.itemId ? { ...i, desconto: pendingDesconto.desconto } : i));
    toast.success(`Desconto de ${pendingDesconto.desconto}% aplicado (liberação gerencial)`);
    setPendingDesconto(null);
  };

  const handleDescontoGeralAutorizado = () => {
    if (!pendingDescontoGeral) return;
    setDescontoGeralTipo(pendingDescontoGeral.tipo);
    setDescontoGeralValor(pendingDescontoGeral.valor);
    toast.success(`Desconto geral de ${pendingDescontoGeral.tipo === "percent" ? pendingDescontoGeral.valor + "%" : "R$ " + pendingDescontoGeral.valor.toFixed(2)} aplicado (liberação gerencial)`);
    setPendingDescontoGeral(null);
  };

  const handleDescontoGeralChange = (tipo: "percent" | "value", valor: number) => {
    const max = getMaxDesconto();
    // Calculate the effective percentage
    let percentualEfetivo = tipo === "percent" ? valor : (subtotal > 0 ? (Math.min(valor, subtotal) / subtotal) * 100 : 0);
    if (percentualEfetivo > max) {
      setPendingDescontoGeral({ tipo, valor, percentual: percentualEfetivo });
      return;
    }
    setDescontoGeralTipo(tipo);
    setDescontoGeralValor(valor);
  };

  const removeItem = (itemId: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
    toast.info(`Item removido: ${item.descricao}`);
    barcodeRef.current?.focus();
  };

  const excluirUltimoItem = () => {
    if (items.length === 0) return;
    const last = items[items.length - 1];
    setItems(items.filter(i => i.id !== last.id));
    toast.info(`Item removido: ${last.descricao}`);
    barcodeRef.current?.focus();
  };

  const cancelarVenda = () => {
    setItems([]); setNextId(1); setCliente(null); setDescontoGeralValor(0);
    toast.warning("Venda cancelada");
    barcodeRef.current?.focus();
  };

  const novaVenda = () => {
    setItems([]); setNextId(1); setCliente(null); setDescontoGeralValor(0);
    toast.success("Nova venda iniciada");
    barcodeRef.current?.focus();
  };

  const handleLancarValor = (descricao: string, valor: number, qty: number) => {
    setItems([...items, { id: nextId, codigo: "MANUAL", barras: "", descricao, quantidade: qty, preco: valor }]);
    setNextId(nextId + 1);
    toast.success("Valor lançado manualmente");
    barcodeRef.current?.focus();
  };

  const handleSangriaSuprimento = (tipo: "sangria" | "suprimento", valor: number, motivo: string) => {
    addMovimento(tipo, valor, motivo);
    toast.success(`${tipo === "sangria" ? "Sangria" : "Suprimento"} de R$ ${valor.toFixed(2)} registrado`);
  };

  const handleAbrirTurno = (op: string, valorAbertura: number) => {
    const turno: TurnoAtivo = {
      id: crypto.randomUUID(),
      operador: op,
      inicio: new Date().toLocaleString("pt-BR"),
      valorAbertura,
    };
    setTurnoAtivo(turno);
    setMovimentos([]);
    if (valorAbertura > 0) {
      addMovimento("suprimento", valorAbertura, "Fundo de troco — abertura");
    }
    toast.success(`Turno aberto — Operador: ${op}`);
  };

  const handleFecharTurno = () => {
    setShowFechamento(true);
  };

  const handleConfirmFechamento = (valorConferido: number) => {
    toast.success("Caixa fechado com sucesso!");
    setTurnoAtivo(null);
    setMovimentos([]);
    setItems([]);
    setNextId(1);
    setCliente(null);
  };

  const anyModalOpen = showFinalizar || showBuscarProduto || showCliente || showLancarValor || showCancelar || showExcluirItem || showBuscarPeso || showSangria || showSuprimento || showFechamento || showTurno || showReimprimir || showConsultaRapida || showAtalhos || showProdutosBalanca;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        setModoOrcamento(prev => { toast.info(!prev ? "Modo Orçamento ativado" : "Modo Orçamento desativado"); return !prev; });
        return;
      }

      if (anyModalOpen) return;

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case "a": e.preventDefault(); toast.info("Abrir Orçamento"); break;
          case "d": e.preventDefault(); togglePdvDark(); break;
          case "b": e.preventDefault(); if (e.shiftKey) setShowProdutosBalanca(true); else setShowBuscarPeso(true); break;
          case "n": e.preventDefault(); navigate("/cadastros/produtos"); break;
          case "p": e.preventDefault(); toast.info("Alterar Preço - selecione um item"); break;
          case "1": e.preventDefault(); toast.info("Termo de venda alterado"); break;
          case "s": e.preventDefault(); setShowSangria(true); break;
          case "u": e.preventDefault(); setShowSuprimento(true); break;
          case "t": e.preventDefault(); setShowTurno(true); break;
          case "f": e.preventDefault(); if (turnoAtivo || !exigirTurno) setShowFechamento(true); else toast.warning("Nenhum turno aberto"); break;
          case "q": e.preventDefault(); setShowConsultaRapida(true); break;
          case "g": e.preventDefault(); toast.success("🔓 Gaveta aberta!", { description: "Comando enviado para a gaveta de dinheiro" }); break;
          case "l": e.preventDefault(); if (items.length > 0) { setShowTrocarOperador(true); } else { logoutPdv(); } break;
        }
        return;
      }

      if (e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case "C": e.preventDefault(); navigate("/cadastros/pessoas"); break;
          case "V": e.preventDefault(); toast.info("Trocar Vendedor"); break;
        }
        return;
      }

      switch (e.key) {
        case "F1": e.preventDefault(); setShowAtalhos(true); break;
        case "F2": e.preventDefault(); setShowConsultaRapida(true); break;
        case "F3": e.preventDefault(); setModoOrcamento(prev => { toast.info(!prev ? "Modo Orçamento ativado" : "Modo Orçamento desativado"); return !prev; }); break;
        case "F4": e.preventDefault(); if (items.length === 0) { toast.warning("Adicione itens antes de finalizar"); } else if (exigirTurno && !turnoAtivo) { toast.warning("Abra um turno primeiro (Ctrl+T)"); } else { setShowFinalizar(true); } break;
        case "F5": e.preventDefault(); setShowBuscarProduto(true); break;
        case "F6": e.preventDefault(); if (items.length > 0) setShowCancelar(true); break;
        case "F7": e.preventDefault(); if (items.length > 0) setShowExcluirItem(true); else toast.warning("Nenhum item para excluir"); break;
        case "F8": e.preventDefault(); setShowCliente(true); break;
        case "F9": e.preventDefault(); setShowLancarValor(true); break;
        case "F10": e.preventDefault(); novaVenda(); break;
        case "F11": e.preventDefault(); setShowReimprimir(true); break;
        case "F12": e.preventDefault(); setShowBuscarPeso(true); break;
        case "Escape": e.preventDefault(); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigate, items, anyModalOpen, turnoAtivo, exigirTurno]);

  const [pdvReady, setPdvReady] = useState(false);

  useEffect(() => {
    if (pdvUser && !pdvReady) {
      const t = setTimeout(() => setPdvReady(true), 50);
      return () => clearTimeout(t);
    }
    if (!pdvUser) setPdvReady(false);
  }, [pdvUser, pdvReady]);

  const togglePdvDark = () => {
    // Add transition class before toggling
    document.documentElement.classList.add("pdv-theme-transition");
    setPdvDark(prev => {
      const next = !prev;
      localStorage.setItem("pdv-dark", String(next));
      return next;
    });
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove("pdv-theme-transition");
    }, 600);
  };

  // Apply pdv-dark to document root so portaled modals inherit the theme
  // Must use inline styles because useTheme sets inline CSS variables that override class-based rules
  useEffect(() => {
    const root = document.documentElement;
    const pdvDarkVars: Record<string, string> = {
      "--background": "220 15% 4%",
      "--foreground": "0 0% 95%",
      "--card": "220 15% 8%",
      "--card-foreground": "0 0% 95%",
      "--popover": "220 15% 8%",
      "--popover-foreground": "0 0% 95%",
      "--primary": "200 100% 50%",
      "--primary-foreground": "0 0% 0%",
      "--secondary": "220 12% 14%",
      "--secondary-foreground": "0 0% 92%",
      "--muted": "220 12% 12%",
      "--muted-foreground": "220 8% 60%",
      "--accent": "160 100% 45%",
      "--accent-foreground": "0 0% 0%",
      "--destructive": "0 90% 55%",
      "--destructive-foreground": "0 0% 100%",
      "--warning": "45 100% 55%",
      "--warning-foreground": "0 0% 0%",
      "--success": "140 80% 48%",
      "--success-foreground": "0 0% 0%",
      "--border": "220 12% 16%",
      "--input": "220 12% 16%",
      "--ring": "200 100% 50%",
      "--glow-primary": "200 100% 50%",
      "--glow-accent": "160 100% 45%",
    };

    const savedValues: Record<string, string> = {};

    if (pdvDark) {
      root.classList.add("pdv-dark");
      // Save current inline values and apply pdv-dark overrides
      for (const [prop, value] of Object.entries(pdvDarkVars)) {
        savedValues[prop] = root.style.getPropertyValue(prop);
        root.style.setProperty(prop, value);
      }
    } else {
      root.classList.remove("pdv-dark");
    }

    return () => {
      root.classList.remove("pdv-dark");
      if (pdvDark) {
        // Restore previous inline values
        for (const [prop] of Object.entries(pdvDarkVars)) {
          const prev = savedValues[prop];
          if (prev) {
            root.style.setProperty(prop, prev);
          } else {
            root.style.removeProperty(prop);
          }
        }
      }
    };
  }, [pdvDark]);

  const loginPdv = (u: SystemUser) => { setPdvUser(u); localStorage.setItem("pdv-user", JSON.stringify(u)); addAuditLog("pdv_login", u); };
  const logoutPdv = () => { if (pdvUser) addAuditLog("pdv_logout", pdvUser); setPdvUser(null); localStorage.removeItem("pdv-user"); };

  if (!pdvUser) {
    return <PDVLogin onLogin={loginPdv} onBack={() => navigate("/")} />;
  }

  const sharedActionProps = {
    onFinalizar: () => { if (items.length === 0) toast.warning("Adicione itens"); else if (exigirTurno && !turnoAtivo) toast.warning("Abra um turno primeiro (Ctrl+T)"); else setShowFinalizar(true); },
    onBuscarProduto: () => setShowBuscarProduto(true),
    onCancelar: () => items.length > 0 && setShowCancelar(true),
    onExcluirItem: () => items.length > 0 ? setShowExcluirItem(true) : toast.warning("Nenhum item"),
    onCliente: () => setShowCliente(true),
    onLancarValor: () => setShowLancarValor(true),
    onNovaVenda: novaVenda,
    onBuscarPeso: () => setShowBuscarPeso(true),
    onModoOrcamento: () => setModoOrcamento(p => { toast.info(!p ? "Modo Orçamento ativado" : "Modo Orçamento desativado"); return !p; }),
    onSangria: () => setShowSangria(true),
    onSuprimento: () => setShowSuprimento(true),
    onFechamento: () => (turnoAtivo || !exigirTurno) ? setShowFechamento(true) : toast.warning("Abra um turno primeiro"),
    onTurno: () => setShowTurno(true),
    onReimprimir: () => setShowReimprimir(true),
    onConsultaRapida: () => setShowConsultaRapida(true),
    onAbrirGaveta: () => toast.success("🔓 Gaveta aberta!", { description: "Comando enviado para a gaveta de dinheiro" }),
  };

  if (isMobile) {
    return (
      <div className={`h-screen flex flex-col bg-background select-none overflow-hidden transition-all duration-500 ease-out ${pdvDark ? "pdv-dark" : ""} ${pdvReady ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <PDVMobileView
          ref={barcodeRef}
          items={items}
          subtotal={totalFinal}
          cliente={cliente}
          barcode={barcode}
          quantidade={quantidade}
          onBarcodeChange={setBarcode}
          onQuantidadeChange={setQuantidade}
          onBarcodeSubmit={addByBarcode}
          clock={clock}
          operador={operador}
          modoVenda={modoVenda}
          modoOrcamento={modoOrcamento}
          turnoAtivo={!!turnoAtivo}
          onUpdateQuantidade={pdvPermissoes.permitirAlterarQuantidade ? updateItemQuantidade : undefined}
          onUpdatePreco={pdvPermissoes.permitirAlterarPreco ? updateItemPreco : undefined}
          onRemoveItem={removeItem}
          onUpdateDesconto={updateItemDesconto}
        />
        <PDVMobileActionBar
          itemCount={items.length}
          {...sharedActionProps}
          onSair={() => { logoutPdv(); navigate("/"); }}
        />

        {/* MODALS */}
        <FinalizarVendaModal open={showFinalizar} onClose={() => { setShowFinalizar(false); setTimeout(() => barcodeRef.current?.focus(), 100); }} items={items} subtotal={totalFinal} cliente={cliente} descontoGeral={descontoGeralCalculado > 0 ? { tipo: descontoGeralTipo, valor: descontoGeralValor, calculado: descontoGeralCalculado } : undefined} onRequestCliente={() => { setShowFinalizar(false); setVoltarParaFinalizar(true); setShowCliente(true); }} onFinalized={(pagamentos?: { forma: string; valor: number }[]) => { const nfNum = String(Math.floor(Math.random() * 999999)).padStart(6, "0"); const nfChave = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(""); const descontoGeralData = descontoGeralCalculado > 0 ? { tipo: descontoGeralTipo, valor: descontoGeralValor, calculado: descontoGeralCalculado } as const : undefined; const novoCupom: UltimoCupom = { numero: nfNum, chave: nfChave, items: [...items], subtotal: totalFinal, pagamentos: pagamentos || [], troco: 0, cpf: cliente?.cpfCnpj || "", dataEmissao: new Date(), descontoGeral: descontoGeralData, operador }; setUltimoCupom(novoCupom); salvarCupomHistorico(novoCupom); addMovimento("venda", totalFinal, `${items.length} itens`, pagamentos); setItems([]); setNextId(1); setCliente(null); setDescontoGeralValor(0); }} />
        <BuscarProdutoModal open={showBuscarProduto} onClose={() => { setShowBuscarProduto(false); barcodeRef.current?.focus(); }} onSelect={(p) => addProduto(p, 1)} produtos={produtos} />
        <SelecionarClienteModal open={showCliente} onClose={() => { setShowCliente(false); if (voltarParaFinalizar) { setVoltarParaFinalizar(false); setShowFinalizar(true); } else { barcodeRef.current?.focus(); } }} onSelect={(c) => { setCliente(c); }} clienteAtual={cliente} />
        <LancarValorModal open={showLancarValor} onClose={() => { setShowLancarValor(false); barcodeRef.current?.focus(); }} onConfirm={handleLancarValor} />
        <ConfirmarCancelamentoModal open={showCancelar} onClose={() => setShowCancelar(false)} onConfirm={cancelarVenda} titulo="Cancelar Venda" mensagem="Tem certeza que deseja cancelar a venda atual? Todos os itens serão removidos." />
        <ConfirmarCancelamentoModal open={showExcluirItem} onClose={() => setShowExcluirItem(false)} onConfirm={excluirUltimoItem} titulo="Excluir Último Item" mensagem={lastItem ? `Remover "${lastItem.descricao}" da venda?` : "Nenhum item para excluir."} />
        <ConfirmarCancelamentoModal open={showTrocarOperador} onClose={() => setShowTrocarOperador(false)} onConfirm={() => { if (pdvUser) addAuditLog("pdv_troca_operador", pdvUser, `Venda com ${items.length} itens descartada`); setItems([]); setNextId(1); setCliente(null); logoutPdv(); }} titulo="Trocar Operador" mensagem="Existe uma venda em andamento. Ao trocar de operador, os itens serão descartados. Deseja continuar?" />
        <BuscarPesoModal open={showBuscarPeso} onClose={() => { setShowBuscarPeso(false); setPendingBalancaProduto(null); barcodeRef.current?.focus(); }} onConfirm={(peso) => { if (pendingBalancaProduto) { addProduto(pendingBalancaProduto, peso, true); setPendingBalancaProduto(null); toast.success(`⚖️ ${pendingBalancaProduto.descricao} — ${peso} kg`); } else { setQuantidade(peso.toString()); toast.success(`Peso capturado: ${peso} kg`); } barcodeRef.current?.focus(); }} />
        <SangriaSuprimentoModal open={showSangria} onClose={() => setShowSangria(false)} tipo="sangria" onConfirm={(v, m) => handleSangriaSuprimento("sangria", v, m)} />
        <SangriaSuprimentoModal open={showSuprimento} onClose={() => setShowSuprimento(false)} tipo="suprimento" onConfirm={(v, m) => handleSangriaSuprimento("suprimento", v, m)} />
        <FechamentoCaixaModal open={showFechamento} onClose={() => setShowFechamento(false)} movimentos={movimentos} turnoInicio={turnoAtivo?.inicio || ""} operador={operador} onConfirmFechamento={handleConfirmFechamento} />
        <GerenciarTurnoModal open={showTurno} onClose={() => setShowTurno(false)} turnoAtivo={turnoAtivo} onAbrirTurno={handleAbrirTurno} onFecharTurno={handleFecharTurno} />
        <ReimprimirCupomModal open={showReimprimir} onClose={() => { setShowReimprimir(false); barcodeRef.current?.focus(); }} cupom={ultimoCupom} />
        <ConsultaRapidaModal open={showConsultaRapida} onClose={() => { setShowConsultaRapida(false); barcodeRef.current?.focus(); }} produtos={produtos} />
        <AtalhosModal open={showAtalhos} onClose={() => { setShowAtalhos(false); barcodeRef.current?.focus(); }} />
        <ProdutosBalancaModal open={showProdutosBalanca} onClose={() => { setShowProdutosBalanca(false); barcodeRef.current?.focus(); }} onSelect={(p) => addProduto(p as any, 1)} produtos={produtos} />
        <LiberacaoDescontoModal open={!!pendingDesconto} onClose={() => setPendingDesconto(null)} descontoSolicitado={pendingDesconto?.desconto || 0} limiteOperador={getMaxDesconto()} itemDescricao={pendingDesconto?.itemDesc || ""} onAutorizado={handleDescontoAutorizado} />
        <LiberacaoDescontoModal open={!!pendingDescontoGeral} onClose={() => setPendingDescontoGeral(null)} descontoSolicitado={Math.round((pendingDescontoGeral?.percentual || 0) * 100) / 100} limiteOperador={getMaxDesconto()} itemDescricao="Desconto Geral da Venda" onAutorizado={handleDescontoGeralAutorizado} />
        <LiberacaoPrecoModal open={!!pendingPreco} onClose={() => setPendingPreco(null)} itemDescricao={pendingPreco?.itemDesc || ""} precoAnterior={pendingPreco?.precoAnterior || 0} novoPreco={pendingPreco?.novoPreco || 0} onAutorizado={handlePrecoAutorizado} />
        <LiberacaoQuantidadeModal open={!!pendingQuantidade} onClose={() => setPendingQuantidade(null)} itemDescricao={pendingQuantidade?.itemDesc || ""} qtdAnterior={pendingQuantidade?.qtdAnterior || 0} novaQtd={pendingQuantidade?.novaQtd || 0} onAutorizado={handleQuantidadeAutorizada} />
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-background select-none overflow-hidden min-h-0 transition-all duration-500 ease-out ${pdvDark ? "pdv-dark" : ""} ${pdvReady ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
      <PDVTopBar clock={clock} operador={operador} pdvDark={pdvDark} onTogglePdvDark={togglePdvDark} onTrocarOperador={() => { if (items.length > 0) { setShowTrocarOperador(true); } else { logoutPdv(); } }} />
      <PDVInfoBar modoVenda={modoVenda} modoOrcamento={modoOrcamento} cliente={cliente} onToggleModoVenda={() => setModoVenda(m => m === "varejo" ? "atacado" : "varejo")} balancaAtiva={balancaAtivada} turnoAtivo={!!turnoAtivo} />
      <PDVLastItemBanner lastItem={lastItem} />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <PDVInputPanel ref={barcodeRef} lastItem={lastItem} barcode={barcode} quantidade={quantidade} itemCount={items.length} onBarcodeChange={setBarcode} onQuantidadeChange={setQuantidade} onBarcodeSubmit={addByBarcode} />
        <PDVCupom items={items} subtotal={subtotal} totalFinal={totalFinal} cliente={cliente} onUpdateQuantidade={pdvPermissoes.permitirAlterarQuantidade ? updateItemQuantidade : undefined} onUpdatePreco={pdvPermissoes.permitirAlterarPreco ? updateItemPreco : undefined} onRemoveItem={removeItem} onUpdateDesconto={updateItemDesconto} descontoGeral={{ tipo: descontoGeralTipo, valor: descontoGeralValor, calculado: descontoGeralCalculado }} onDescontoGeralChange={handleDescontoGeralChange} promoDesconto={promoDesconto} kitItemCodigos={kitItemCodigos} leveXPagueYItemCodigos={leveXPagueYItemCodigos} kitPromoDetails={kitPromoDetails} levePromoDetails={levePromoDetails} />
      </div>
      <PDVStatusBar caixaOcupado={items.length > 0} itemCount={items.length} {...sharedActionProps} />

      {/* MODALS */}
      <FinalizarVendaModal open={showFinalizar} onClose={() => { setShowFinalizar(false); setTimeout(() => barcodeRef.current?.focus(), 100); }} items={items} subtotal={totalFinal} cliente={cliente} descontoGeral={descontoGeralCalculado > 0 ? { tipo: descontoGeralTipo, valor: descontoGeralValor, calculado: descontoGeralCalculado } : undefined} onRequestCliente={() => { setShowFinalizar(false); setVoltarParaFinalizar(true); setShowCliente(true); }} onFinalized={(pagamentos?: { forma: string; valor: number }[]) => { const nfNum = String(Math.floor(Math.random() * 999999)).padStart(6, "0"); const nfChave = Array.from({ length: 44 }, () => Math.floor(Math.random() * 10)).join(""); const descontoGeralData = descontoGeralCalculado > 0 ? { tipo: descontoGeralTipo, valor: descontoGeralValor, calculado: descontoGeralCalculado } as const : undefined; const novoCupom: UltimoCupom = { numero: nfNum, chave: nfChave, items: [...items], subtotal: totalFinal, pagamentos: pagamentos || [], troco: 0, cpf: cliente?.cpfCnpj || "", dataEmissao: new Date(), descontoGeral: descontoGeralData, operador }; setUltimoCupom(novoCupom); salvarCupomHistorico(novoCupom); addMovimento("venda", totalFinal, `${items.length} itens`, pagamentos); setItems([]); setNextId(1); setCliente(null); setDescontoGeralValor(0); }} />
      <BuscarProdutoModal open={showBuscarProduto} onClose={() => { setShowBuscarProduto(false); barcodeRef.current?.focus(); }} onSelect={(p) => addProduto(p, 1)} produtos={produtos} />
      <SelecionarClienteModal open={showCliente} onClose={() => { setShowCliente(false); if (voltarParaFinalizar) { setVoltarParaFinalizar(false); setShowFinalizar(true); } else { barcodeRef.current?.focus(); } }} onSelect={(c) => { setCliente(c); }} clienteAtual={cliente} />
      <LancarValorModal open={showLancarValor} onClose={() => { setShowLancarValor(false); barcodeRef.current?.focus(); }} onConfirm={handleLancarValor} />
      <ConfirmarCancelamentoModal open={showCancelar} onClose={() => setShowCancelar(false)} onConfirm={cancelarVenda} titulo="Cancelar Venda" mensagem="Tem certeza que deseja cancelar a venda atual? Todos os itens serão removidos." />
      <ConfirmarCancelamentoModal open={showExcluirItem} onClose={() => setShowExcluirItem(false)} onConfirm={excluirUltimoItem} titulo="Excluir Último Item" mensagem={lastItem ? `Remover "${lastItem.descricao}" da venda?` : "Nenhum item para excluir."} />
      <ConfirmarCancelamentoModal open={showTrocarOperador} onClose={() => setShowTrocarOperador(false)} onConfirm={() => { if (pdvUser) addAuditLog("pdv_troca_operador", pdvUser, `Venda com ${items.length} itens descartada`); setItems([]); setNextId(1); setCliente(null); logoutPdv(); }} titulo="Trocar Operador" mensagem="Existe uma venda em andamento. Ao trocar de operador, os itens serão descartados. Deseja continuar?" />
      <BuscarPesoModal open={showBuscarPeso} onClose={() => { setShowBuscarPeso(false); setPendingBalancaProduto(null); barcodeRef.current?.focus(); }} onConfirm={(peso) => { if (pendingBalancaProduto) { addProduto(pendingBalancaProduto, peso, true); setPendingBalancaProduto(null); toast.success(`⚖️ ${pendingBalancaProduto.descricao} — ${peso} kg`); } else { setQuantidade(peso.toString()); toast.success(`Peso capturado: ${peso} kg`); } barcodeRef.current?.focus(); }} />
      <SangriaSuprimentoModal open={showSangria} onClose={() => setShowSangria(false)} tipo="sangria" onConfirm={(v, m) => handleSangriaSuprimento("sangria", v, m)} />
      <SangriaSuprimentoModal open={showSuprimento} onClose={() => setShowSuprimento(false)} tipo="suprimento" onConfirm={(v, m) => handleSangriaSuprimento("suprimento", v, m)} />
      <FechamentoCaixaModal open={showFechamento} onClose={() => setShowFechamento(false)} movimentos={movimentos} turnoInicio={turnoAtivo?.inicio || ""} operador={operador} onConfirmFechamento={handleConfirmFechamento} />
      <GerenciarTurnoModal open={showTurno} onClose={() => setShowTurno(false)} turnoAtivo={turnoAtivo} onAbrirTurno={handleAbrirTurno} onFecharTurno={handleFecharTurno} />
      <ReimprimirCupomModal open={showReimprimir} onClose={() => { setShowReimprimir(false); barcodeRef.current?.focus(); }} cupom={ultimoCupom} />
      <ConsultaRapidaModal open={showConsultaRapida} onClose={() => { setShowConsultaRapida(false); barcodeRef.current?.focus(); }} produtos={produtos} />
       <AtalhosModal open={showAtalhos} onClose={() => { setShowAtalhos(false); barcodeRef.current?.focus(); }} />
       <ProdutosBalancaModal open={showProdutosBalanca} onClose={() => { setShowProdutosBalanca(false); barcodeRef.current?.focus(); }} onSelect={(p) => addProduto(p as any, 1)} produtos={produtos} />
      <LiberacaoDescontoModal open={!!pendingDesconto} onClose={() => setPendingDesconto(null)} descontoSolicitado={pendingDesconto?.desconto || 0} limiteOperador={getMaxDesconto()} itemDescricao={pendingDesconto?.itemDesc || ""} onAutorizado={handleDescontoAutorizado} />
      <LiberacaoDescontoModal open={!!pendingDescontoGeral} onClose={() => setPendingDescontoGeral(null)} descontoSolicitado={Math.round((pendingDescontoGeral?.percentual || 0) * 100) / 100} limiteOperador={getMaxDesconto()} itemDescricao="Desconto Geral da Venda" onAutorizado={handleDescontoGeralAutorizado} />
      <LiberacaoPrecoModal open={!!pendingPreco} onClose={() => setPendingPreco(null)} itemDescricao={pendingPreco?.itemDesc || ""} precoAnterior={pendingPreco?.precoAnterior || 0} novoPreco={pendingPreco?.novoPreco || 0} onAutorizado={handlePrecoAutorizado} />
      <LiberacaoQuantidadeModal open={!!pendingQuantidade} onClose={() => setPendingQuantidade(null)} itemDescricao={pendingQuantidade?.itemDesc || ""} qtdAnterior={pendingQuantidade?.qtdAnterior || 0} novaQtd={pendingQuantidade?.novaQtd || 0} onAutorizado={handleQuantidadeAutorizada} />
    </div>
  );
}
