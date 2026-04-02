import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyInput, formatCurrencyBRL } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Calculator, Tag, ShieldCheck, ShieldAlert, MapPin, Scale, FlaskConical, AlertTriangle, Download, FileText, RefreshCw, Loader2 } from "lucide-react";
import { NcmAutocomplete } from "@/components/cadastros/NcmAutocomplete";
import { useState, useEffect, useMemo } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { produtosMapper } from "@/lib/supabaseMappers";
import { toast } from "sonner";
import { addAuditLog } from "@/lib/auditLog";
import { PDFPreviewModal } from "@/components/PDFPreviewModal";
import { useAuth } from "@/contexts/AuthContext";
import { ncmCestMvaData } from "@/data/ncmCestMva";
import { estados, getAliquotaByUF } from "@/data/aliquotasEstados";
import { supabase } from "@/integrations/supabase/client";
import { useColumnPreferences, type ColumnConfig } from "@/hooks/useColumnPreferences";
import { ColumnSelector } from "@/components/ui/ColumnSelector";

// Mapeamento local base
const ncmTableLocal = ncmCestMvaData.map(item => ({
  ncm: item.ncm,
  descricao: item.descricao,
  cest: item.cest,
  mva: item.mvaOriginal,
}));

interface ComposicaoItem {
  produtoId: string;
  produtoDescricao: string;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
}

interface Desdobramento {
  unidade: string;
  fator: number;
  barras: string;
}

interface GrupoPreco {
  nome: string;
  preco: number;
}

interface Produto {
  id: string;
  codigo: string;
  codigoAuxiliar: string;
  codigoReferencia: string;
  barras: string;
  barrasMultiplos: string[];
  descricao: string;
  // Classificação
  ncm: string;
  cest: string;
  grupo: string;
  subgrupo: string;
  departamento: string;
  familia: string;
  subfamilia: string;
  categoria: string;
  // Tributação
  origemMercadoria: string;
  ufTributacao: string;
  cstIcms: string;
  cstPis: string;
  cstCofins: string;
  aliqIcms: number;
  aliqPis: number;
  aliqCofins: number;
  aliqIpi: number;
  cfopInterno: string;
  cfopExterno: string;
  // Custos e preços
  custoAquisicao: number;
  custoReposicao: number;
  mva: number;
  venda: number;
  margemBruta: number;
  margemLiquida: number;
  sugestaoVenda: number;
  estoque: number;
  unidade: string;
  // Desdobramentos
  desdobramentos: Desdobramento[];
  // Grupo de preços
  grupoPrecos: GrupoPreco[];
  // Etiqueta / PROCOM
  etiquetaDescricao: string;
  rateio: number;
  normaProcom: string;
  // Auditoria
  auditoriaCorrigida: boolean;
  auditoriaData?: string;
  // Balança
  produtoBalanca: boolean;
  unidadeBalanca: string;
  // Composição / Ficha Técnica
  composicao: ComposicaoItem[];
  // Fornecedor
  fornecedor: string;
  observacao: string;
  // Status
  ativo: boolean;
}

const defaultProdutos: Produto[] = [
  {
    id: "1", codigo: "001", codigoAuxiliar: "", codigoReferencia: "", barras: "7891234560001", barrasMultiplos: [], descricao: "Smartphone X Pro 128GB",
    ncm: "8517.12.31", cest: "21.053.00", grupo: "Eletrônicos", subgrupo: "Celulares", departamento: "Tecnologia", familia: "Smartphones", subfamilia: "Android", categoria: "Eletrônicos",
    origemMercadoria: "0", ufTributacao: "SP", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6, aliqIpi: 0, cfopInterno: "5102", cfopExterno: "6102",
    custoAquisicao: 1100, custoReposicao: 1200, mva: 38, venda: 2499.99, margemBruta: 52, margemLiquida: 25, sugestaoVenda: 2400, estoque: 45, unidade: "UN",
    desdobramentos: [], grupoPrecos: [{ nome: "Atacado", preco: 2199.99 }],
    etiquetaDescricao: "SMARTPHONE X PRO 128GB", rateio: 0, normaProcom: "", auditoriaCorrigida: false,
    produtoBalanca: false, unidadeBalanca: "kg", composicao: [], fornecedor: "", observacao: "", ativo: true,
  },
  {
    id: "2", codigo: "002", codigoAuxiliar: "", codigoReferencia: "", barras: "7891234560002", barrasMultiplos: [], descricao: "Notebook Ultra 15 i7",
    ncm: "8471.30.19", cest: "21.046.00", grupo: "Informática", subgrupo: "Notebooks", departamento: "Tecnologia", familia: "Computadores", subfamilia: "Portáteis", categoria: "Informática",
    origemMercadoria: "0", ufTributacao: "SP", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6, aliqIpi: 5, cfopInterno: "5102", cfopExterno: "6102",
    custoAquisicao: 3200, custoReposicao: 3500, mva: 35, venda: 5999.99, margemBruta: 41.7, margemLiquida: 14, sugestaoVenda: 5800, estoque: 12, unidade: "UN",
    desdobramentos: [], grupoPrecos: [],
    etiquetaDescricao: "NOTEBOOK ULTRA 15 I7", rateio: 0, normaProcom: "", auditoriaCorrigida: false,
    produtoBalanca: false, unidadeBalanca: "kg", composicao: [], fornecedor: "", observacao: "", ativo: true,
  },
];

const origensOptions = [
  { value: "0", label: "0 - Nacional, exceto códigos 3, 4, 5 e 8" },
  { value: "1", label: "1 - Estrangeira (importação direta)" },
  { value: "2", label: "2 - Estrangeira (mercado interno)" },
  { value: "3", label: "3 - Nacional (40% a 70% importado)" },
  { value: "4", label: "4 - Nacional (PPB — DL 288/67)" },
  { value: "5", label: "5 - Nacional (até 40% importado)" },
  { value: "6", label: "6 - Estrangeira (importação direta, sem similar)" },
  { value: "7", label: "7 - Estrangeira (mercado interno, sem similar)" },
  { value: "8", label: "8 - Nacional (acima 70% importado)" },
];

const cstIcmsOptions = [
  "00 - Tributada integralmente",
  "10 - Tributada com ST",
  "20 - Com redução BC",
  "30 - Isenta/não tributada com ST",
  "40 - Isenta",
  "41 - Não tributada",
  "50 - Suspensão",
  "51 - Diferimento",
  "60 - ICMS cobrado por ST",
  "70 - Redução BC com ST",
  "90 - Outros",
];

const unidadesPadrao = [
  { sigla: "UN", descricao: "Unidade" },
  { sigla: "CX", descricao: "Caixa" },
  { sigla: "KG", descricao: "Quilograma" },
  { sigla: "G", descricao: "Grama" },
  { sigla: "MG", descricao: "Miligrama" },
  { sigla: "LT", descricao: "Litro" },
  { sigla: "ML", descricao: "Mililitro" },
  { sigla: "MT", descricao: "Metro" },
  { sigla: "CM", descricao: "Centímetro" },
  { sigla: "MM", descricao: "Milímetro" },
  { sigla: "M2", descricao: "Metro Quadrado" },
  { sigla: "M3", descricao: "Metro Cúbico" },
  { sigla: "PCT", descricao: "Pacote" },
  { sigla: "FD", descricao: "Fardo" },
  { sigla: "DZ", descricao: "Dúzia" },
  { sigla: "SC", descricao: "Saco" },
  { sigla: "PC", descricao: "Peça" },
  { sigla: "PR", descricao: "Par" },
  { sigla: "JG", descricao: "Jogo" },
  { sigla: "BD", descricao: "Balde" },
  { sigla: "RL", descricao: "Rolo" },
  { sigla: "TB", descricao: "Tubo" },
  { sigla: "GL", descricao: "Galão" },
  { sigla: "BB", descricao: "Bombona" },
  { sigla: "TN", descricao: "Tonelada" },
  { sigla: "CT", descricao: "Cartela" },
  { sigla: "BL", descricao: "Bloco" },
  { sigla: "FR", descricao: "Frasco" },
  { sigla: "GF", descricao: "Garrafa" },
  { sigla: "LA", descricao: "Lata" },
  { sigla: "PT", descricao: "Pote" },
  { sigla: "SV", descricao: "Serviço" },
  { sigla: "HR", descricao: "Hora" },
  { sigla: "MN", descricao: "Minuto" },
  { sigla: "DS", descricao: "Display" },
  { sigla: "BG", descricao: "Bag" },
  { sigla: "EN", descricao: "Envelope" },
  { sigla: "FL", descricao: "Folha" },
  { sigla: "RS", descricao: "Resma" },
  { sigla: "KT", descricao: "Kit" },
  { sigla: "BN", descricao: "Bandeja" },
];

function getUnidadesCustom(): { sigla: string; descricao: string }[] {
  try {
    const stored = localStorage.getItem("unidades_customizadas");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveUnidadeCustom(sigla: string, descricao: string) {
  const custom = getUnidadesCustom();
  if (!custom.find(u => u.sigla === sigla)) {
    custom.push({ sigla, descricao });
    localStorage.setItem("unidades_customizadas", JSON.stringify(custom));
  }
}

const unidadesDesdobramento = ["CX", "KG", "PCT", "FD", "DZ", "SC", "LT", "ML", "GR", "MT"];

const emptyDesdobramento: Desdobramento = { unidade: "CX", fator: 1, barras: "" };
const emptyGrupoPreco: GrupoPreco = { nome: "", preco: 0 };

function calcMargemBruta(venda: number, custo: number) {
  if (venda <= 0) return 0;
  return Number((((venda - custo) / venda) * 100).toFixed(2));
}

function calcMargemLiquida(venda: number, custo: number, icms: number, pis: number, cofins: number) {
  if (venda <= 0) return 0;
  const impostos = venda * ((icms + pis + cofins) / 100);
  return Number((((venda - custo - impostos) / venda) * 100).toFixed(2));
}

function calcSugestaoVenda(custo: number, mva: number) {
  return Number((custo * (1 + mva / 100)).toFixed(2));
}

const emptyForm = (): Omit<Produto, "id"> => ({
  codigo: "", codigoAuxiliar: "", codigoReferencia: "", barras: "", barrasMultiplos: [], descricao: "",
  ncm: "", cest: "", grupo: "", subgrupo: "", departamento: "", familia: "", subfamilia: "", categoria: "",
  origemMercadoria: "0", ufTributacao: "", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6, aliqIpi: 0, cfopInterno: "5102", cfopExterno: "6102",
  custoAquisicao: 0, custoReposicao: 0, mva: 0, venda: 0, margemBruta: 0, margemLiquida: 0, sugestaoVenda: 0, estoque: 0, unidade: "UN",
  desdobramentos: [], grupoPrecos: [],
  etiquetaDescricao: "", rateio: 0, normaProcom: "", auditoriaCorrigida: false,
  produtoBalanca: false, unidadeBalanca: "kg", composicao: [], fornecedor: "", observacao: "", ativo: true,
});

const defaultColumns: ColumnConfig[] = [
  { key: "codigo", label: "Código", visible: true },
  { key: "codigoAuxiliar", label: "Cód. Auxiliar", visible: false },
  { key: "barras", label: "Código de Barras", visible: true },
  { key: "descricao", label: "Descrição", visible: true },
  { key: "ncm", label: "NCM", visible: true },
  { key: "cest", label: "CEST", visible: true },
  { key: "fornecedor", label: "Fornecedor", visible: true },
  { key: "grupo", label: "Grupo", visible: true },
  { key: "categoria", label: "Categoria", visible: false },
  { key: "unidade", label: "Unidade", visible: false },
  { key: "custoAquisicao", label: "Custo Aq.", visible: false },
  { key: "custoReposicao", label: "Custo Rep.", visible: true },
  { key: "venda", label: "Venda", visible: true },
  { key: "margemBruta", label: "Mg.Bruta", visible: true },
  { key: "margemLiquida", label: "Mg.Líq.", visible: true },
  { key: "estoque", label: "Estoque", visible: true },
  { key: "auditoria", label: "Auditoria", visible: true },
  { key: "status", label: "Status", visible: true },
];

export default function Produtos() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Produto>({
    table: "produtos",
    mapper: produtosMapper,
    defaultData: defaultProdutos,
  });
  const { columns, visibleColumns, toggleColumn, resetToDefault } = useColumnPreferences("produtos-list", defaultColumns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Produto, "id">>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [ncmSearchOpen, setNcmSearchOpen] = useState(false);
  const [ncmSearch, setNcmSearch] = useState("");
  const [novaUnidadeOpen, setNovaUnidadeOpen] = useState(false);
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState("");
  const [novaUnidadeDescricao, setNovaUnidadeDescricao] = useState("");
  const [unidadesCustom, setUnidadesCustom] = useState(getUnidadesCustom);

  const [codigoDigits, setCodigoDigits] = useState(() => {
    try {
      const stored = localStorage.getItem("gp_erp_config_produtos_digits");
      return stored ? parseInt(stored) : 3;
    } catch { return 3; }
  });

  const handleDigitsChange = (digits: string) => {
    const d = parseInt(digits);
    setCodigoDigits(d);
    localStorage.setItem("gp_erp_config_produtos_digits", String(d));
    toast.success(`Código automático configurado para ${d} dígitos!`);
  };

  const isAuthorized = ["administrador", "gerente", "supervisor"].includes(user?.role || "");

  const handleResequence = async () => {
    if (!window.confirm(`Deseja re-sequenciar TODOS os ${items.length} produtos? Isso mudará os códigos para a sequência 1, 2, 3... usando ${codigoDigits} dígitos.`)) return;
    
    setLoadingCode(true);
    try {
      const sorted = [...items].sort((a, b) => {
        const valA = String(a.codigo || "").padStart(20, '0');
        const valB = String(b.codigo || "").padStart(20, '0');
        return valA.localeCompare(valB, undefined, { numeric: true });
      });

      const executeBulkUpdate = async (updates: { id: string, codigo: string }[]) => {
        try {
          const { error } = await supabase.rpc('bulk_update_produtos_codigo' as any, { p_updates: updates });
          if (error) {
            // Se for erro de cache do PostgREST, tenta via loop manual
            if (error.message.includes("schema cache") || error.code === 'PGRST202') {
              console.warn("RPC não encontrada ou em cache. Usando fallback unitário.");
              for (const u of updates) {
                const { error: upError } = await supabase.from("produtos").update({ codigo: u.codigo }).eq("id", u.id);
                if (upError) throw upError;
              }
              return;
            }
            throw error;
          }
        } catch (err) {
          throw err;
        }
      };

      // Passo 1: Prefixar todos com TEMP_
      const tempUpdates = sorted.map((p) => ({
        id: p.id,
        codigo: `TEMP_${p.id.slice(0,8)}_${p.codigo}`
      }));
      
      await executeBulkUpdate(tempUpdates);

      // Passo 2: Definir os códigos finais na sequência
      const finalUpdates = sorted.map((p, index) => ({
        id: p.id,
        codigo: String(index + 1).padStart(codigoDigits, "0")
      }));

      await executeBulkUpdate(finalUpdates);

      toast.success(`${finalUpdates.length} produtos re-sequenciados com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao re-sequenciar: ${err.message || "Verifique as permissões de banco"}`);
    } finally {
      setLoadingCode(false);
    }
  };

  const [loadingCode, setLoadingCode] = useState(false);

  // Insumo rápido
  const [insumoRapidoOpen, setInsumoRapidoOpen] = useState(false);
  const [insumoRapido, setInsumoRapido] = useState({ descricao: "", unidade: "UN", custoReposicao: 0, barras: "", estoque: 0, ncm: "", fornecedor: "" });

  const pessoasCadastradas: { id: string; nome: string; tipo: string; cpfCnpj: string }[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("pessoas") || "[]"); } catch { return []; }
  }, [insumoRapidoOpen]);
  const fornecedoresCadastrados = useMemo(() => pessoasCadastradas.filter(p => p.tipo === "Fornecedor" || p.tipo === "Ambos"), [pessoasCadastradas]);

  const todasUnidades = [...unidadesPadrao, ...unidadesCustom.filter(c => !unidadesPadrao.find(p => p.sigla === c.sigla))];
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("todos");
  const [filtroNcm, setFiltroNcm] = useState<string>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkNcmOpen, setBulkNcmOpen] = useState(false);
  const [bulkNcmValue, setBulkNcmValue] = useState("");
  const [bulkNcmSearch, setBulkNcmSearch] = useState("");
  const [ncmWebItems, setNcmWebItems] = useState<{ ncm: string; descricao: string; cest: string; mva: number }[]>([]);
  const [pdfNcmOpen, setPdfNcmOpen] = useState(false);
  const [pdfNcmHtml, setPdfNcmHtml] = useState("");

  // Load web NCMs from Supabase on mount
  useEffect(() => {
    const loadWebNcms = async () => {
      try {
        let all: any[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase
            .from("ncm_web" as any)
            .select("codigo, descricao")
            .range(from, from + PAGE_SIZE - 1);
          if (error) break;
          const rows = (data || []) as any[];
          all = [...all, ...rows];
          hasMore = rows.length === PAGE_SIZE;
          from += PAGE_SIZE;
        }
        setNcmWebItems(all.map((r: any) => ({ ncm: r.codigo, descricao: r.descricao, cest: "", mva: 0 })));
      } catch (err) {
        console.error("Erro ao carregar NCMs da web:", err);
      }
    };
    loadWebNcms();
  }, []);

  // Merged NCM table: web (15K+) + local, deduplicated, local takes priority
  const ncmTable = useMemo(() => {
    const map = new Map<string, { ncm: string; descricao: string; cest: string; mva: number; fonte: "local" | "web" }>();
    for (const item of ncmWebItems) map.set(item.ncm, { ...item, fonte: "web" });
    for (const item of ncmTableLocal) map.set(item.ncm, { ...item, fonte: "local" }); // local overrides web
    return Array.from(map.values());
  }, [ncmWebItems]);

  const isNcmValido = (ncm: string | undefined) => !!ncm && ncm.replace(/\D/g, "").length >= 8;

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(p => p.id)));
  };

  const handleBulkNcmApply = async () => {
    if (!bulkNcmValue.trim()) { toast.error("Selecione um NCM"); return; }
    const ncmMatch = ncmTable.find(n => n.ncm === bulkNcmValue.replace(/\D/g, ""));
    for (const id of selectedIds) {
      await updateItem(id, {
        ncm: bulkNcmValue,
        cest: ncmMatch?.cest || "",
        mva: ncmMatch?.mva || 0,
      } as Partial<Produto>);
    }
    toast.success(`NCM atualizado em ${selectedIds.size} produto(s)`);
    if (user) addAuditLog("ncm_edicao_massa", { id: user.id, nome: user.nome, role: user.role }, `NCM ${bulkNcmValue} aplicado a ${selectedIds.size} produto(s)`);
    setSelectedIds(new Set());
    setBulkNcmOpen(false);
    setBulkNcmValue("");
  };

  const handleAddUnidade = () => {
    const sigla = novaUnidadeSigla.trim().toUpperCase();
    const desc = novaUnidadeDescricao.trim();
    if (!sigla || !desc) { toast.error("Preencha sigla e descrição"); return; }
    if (todasUnidades.find(u => u.sigla === sigla)) { toast.error("Sigla já existe"); return; }
    saveUnidadeCustom(sigla, desc);
    setUnidadesCustom(getUnidadesCustom());
    setForm(prev => ({ ...prev, unidade: sigla }));
    setNovaUnidadeSigla("");
    setNovaUnidadeDescricao("");
    setNovaUnidadeOpen(false);
    toast.success(`Unidade "${sigla} - ${desc}" cadastrada!`);
  };

  // Load categorias from localStorage (shared with Categorias module)
  const defaultCategorias = [
    { id: "1", nome: "Alimentos", tipo: "Produto", categoriaPai: "", status: "Ativo" },
    { id: "2", nome: "Bebidas", tipo: "Produto", categoriaPai: "", status: "Ativo" },
    { id: "3", nome: "Limpeza", tipo: "Produto", categoriaPai: "", status: "Ativo" },
    { id: "4", nome: "Higiene", tipo: "Produto", categoriaPai: "", status: "Ativo" },
    { id: "5", nome: "Laticínios", tipo: "Produto", categoriaPai: "Alimentos", status: "Ativo" },
    { id: "6", nome: "Frios e Embutidos", tipo: "Produto", categoriaPai: "Alimentos", status: "Ativo" },
  ];
  const categoriasData: { id: string; nome: string; tipo: string; categoriaPai: string; status: string }[] = (() => {
    try {
      const stored = localStorage.getItem("categorias");
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed && parsed.length > 0 ? parsed : defaultCategorias;
    } catch { return defaultCategorias; }
  })();
  const categoriasAtivas = categoriasData.filter(c => c.status === "Ativo");
  const categoriasRaiz = categoriasAtivas.filter(c => !c.categoriaPai);
  const getSubcategorias = (paiNome: string) => categoriasAtivas.filter(c => c.categoriaPai === paiNome);

  // Recalculate margins when costs/prices/taxes change
  useEffect(() => {
    const mb = calcMargemBruta(form.venda, form.custoReposicao || form.custoAquisicao);
    const ml = calcMargemLiquida(form.venda, form.custoReposicao || form.custoAquisicao, form.aliqIcms, form.aliqPis, form.aliqCofins);
    const sug = calcSugestaoVenda(form.custoReposicao || form.custoAquisicao, form.mva);
    if (mb !== form.margemBruta || ml !== form.margemLiquida || sug !== form.sugestaoVenda) {
      setForm(prev => ({ ...prev, margemBruta: mb, margemLiquida: ml, sugestaoVenda: sug }));
    }
  }, [form.venda, form.custoAquisicao, form.custoReposicao, form.mva, form.aliqIcms, form.aliqPis, form.aliqCofins]);

  const fornecedoresUnicos = useMemo(() => {
    const set = new Set(items.map(p => p.fornecedor).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = items.filter(p => {
    if (filtroFornecedor !== "todos" && (p.fornecedor || "") !== filtroFornecedor) return false;
    if (filtroNcm === "invalido" && isNcmValido(p.ncm)) return false;
    if (filtroNcm === "sem" && p.ncm && p.ncm.trim() !== "") return false;
    if (filtroNcm === "valido" && !isNcmValido(p.ncm)) return false;
    return p.descricao.toLowerCase().includes(search.toLowerCase()) || p.barras.includes(search) || p.codigo.includes(search) ||
      (p.codigoAuxiliar && p.codigoAuxiliar.includes(search)) || (p.codigoReferencia && p.codigoReferencia.includes(search)) ||
      (p.barrasMultiplos && p.barrasMultiplos.some(b => b.includes(search)));
  });

  const gerarProximoCodigo = () => {
    const codigos = items.map(p => parseInt(p.codigo)).filter(n => !isNaN(n));
    const max = codigos.length > 0 ? Math.max(...codigos) : 0;
    return String(max + 1).padStart(codigoDigits, "0");
  };

  const handleCriarInsumoRapido = () => {
    if (!insumoRapido.descricao.trim()) { toast.error("Preencha a descrição do insumo"); return; }
    const codigo = gerarProximoCodigo();
    const ncmItem = ncmTable.find(n => n.ncm === insumoRapido.ncm.trim());
    const novoInsumo: Omit<Produto, "id"> = {
      ...emptyForm(),
      codigo,
      descricao: insumoRapido.descricao.trim(),
      barras: insumoRapido.barras.trim(),
      unidade: insumoRapido.unidade,
      custoReposicao: insumoRapido.custoReposicao,
      estoque: insumoRapido.estoque,
      ncm: insumoRapido.ncm.trim(),
      cest: ncmItem?.cest || "",
      mva: ncmItem?.mva || 0,
      fornecedor: insumoRapido.fornecedor.trim(),
    };
    addItem(novoInsumo);
    // Adiciona automaticamente à composição atual
    const newId = JSON.parse(localStorage.getItem("produtos") || "[]").find((p: Produto) => p.codigo === codigo)?.id;
    if (newId) {
      setForm(prev => ({
        ...prev,
        composicao: [...prev.composicao, {
          produtoId: newId,
          produtoDescricao: insumoRapido.descricao.trim(),
          quantidade: 1,
          unidade: insumoRapido.unidade,
          custoUnitario: insumoRapido.custoReposicao,
        }]
      }));
    }
    setInsumoRapido({ descricao: "", unidade: "UN", custoReposicao: 0, barras: "", estoque: 0, ncm: "", fornecedor: "" });
    setInsumoRapidoOpen(false);
    toast.success(`Insumo "${insumoRapido.descricao}" criado e adicionado à composição!`);
  };

  const openNew = () => { const f = emptyForm(); f.codigo = gerarProximoCodigo(); setForm(f); setEditingId(null); setDialogOpen(true); };
  const openEdit = (p: Produto) => {
    const { id, ...rest } = p;
    setForm({ ...emptyForm(), ...rest, fornecedor: rest.fornecedor || "", barrasMultiplos: rest.barrasMultiplos || [], composicao: rest.composicao || [], desdobramentos: rest.desdobramentos || [], grupoPrecos: rest.grupoPrecos || [] });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.descricao) { toast.error("Preencha a descrição do produto"); return; }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Produto atualizado!");
    } else {
      addItem(form as Omit<Produto, "id">);
      toast.success("Produto cadastrado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { deleteItem(id); setDeleteConfirm(null); toast.success("Produto excluído!"); };

  const selectNcm = (item: typeof ncmTable[0]) => {
    setForm(prev => ({ ...prev, ncm: item.ncm, cest: item.cest, mva: item.mva }));
    setNcmSearchOpen(false);
    const fonteLabel = item.fonte === "local" ? "base local (CEST/MVA inclusos)" : "base web (BrasilAPI)";
    toast.success(`NCM ${item.ncm} selecionado — Fonte: ${fonteLabel}`);
  };

  const addDesdobramento = () => setForm(prev => ({ ...prev, desdobramentos: [...prev.desdobramentos, { ...emptyDesdobramento }] }));
  const removeDesdobramento = (i: number) => setForm(prev => ({ ...prev, desdobramentos: prev.desdobramentos.filter((_, idx) => idx !== i) }));
  const updateDesdobramento = (i: number, field: keyof Desdobramento, value: string | number) => {
    setForm(prev => ({
      ...prev,
      desdobramentos: prev.desdobramentos.map((d, idx) => idx === i ? { ...d, [field]: value } : d)
    }));
  };

  const addGrupoPreco = () => setForm(prev => ({ ...prev, grupoPrecos: [...prev.grupoPrecos, { ...emptyGrupoPreco }] }));
  const removeGrupoPreco = (i: number) => setForm(prev => ({ ...prev, grupoPrecos: prev.grupoPrecos.filter((_, idx) => idx !== i) }));
  const updateGrupoPreco = (i: number, field: keyof GrupoPreco, value: string | number) => {
    setForm(prev => ({
      ...prev,
      grupoPrecos: prev.grupoPrecos.map((g, idx) => idx === i ? { ...g, [field]: value } : g)
    }));
  };

  // Composição
  const [composicaoSearch, setComposicaoSearch] = useState("");
  const composicaoSearchLower = composicaoSearch.toLowerCase();
  const produtosParaComposicao = composicaoSearch.length >= 1
    ? items.filter(p =>
        p.ativo && p.id !== editingId &&
        (p.descricao.toLowerCase().includes(composicaoSearchLower) ||
         p.codigo.toLowerCase().includes(composicaoSearchLower) ||
         p.barras.includes(composicaoSearch) ||
         (p.barrasMultiplos && p.barrasMultiplos.some(b => b.includes(composicaoSearch))))
      )
    : [];
  const addComposicaoItem = (p: Produto) => {
    if (form.composicao.find(c => c.produtoId === p.id)) {
      toast.error("Produto já adicionado à composição");
      return;
    }
    setForm(prev => ({
      ...prev,
      composicao: [...prev.composicao, {
        produtoId: p.id,
        produtoDescricao: p.descricao,
        quantidade: 1,
        unidade: p.unidade,
        custoUnitario: p.custoReposicao || p.custoAquisicao,
      }]
    }));
    setComposicaoSearch("");
    toast.success(`"${p.descricao}" adicionado à composição`);
  };
  const removeComposicaoItem = (i: number) => setForm(prev => ({ ...prev, composicao: prev.composicao.filter((_, idx) => idx !== i) }));
  const updateComposicaoItem = (i: number, field: keyof ComposicaoItem, value: string | number) => {
    setForm(prev => ({
      ...prev,
      composicao: prev.composicao.map((c, idx) => idx === i ? { ...c, [field]: value } : c)
    }));
  };
  const custoComposicao = form.composicao.reduce((acc, c) => acc + (c.custoUnitario * c.quantidade), 0);

  const ncmFiltered = useMemo(() => {
    if (!ncmSearch.trim()) return ncmTable.slice(0, 50);
    const terms = ncmSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
    return ncmTable.filter(n => {
      const desc = n.descricao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const ncmCode = n.ncm;
      const cestCode = n.cest;
      return terms.every(term =>
        ncmCode.includes(term) || cestCode.includes(term) || desc.includes(term)
      );
    });
  }, [ncmSearch]);

  const custo = form.custoReposicao || form.custoAquisicao;

  const renderCell = (p: Produto, columnKey: string, mb: number, ml: number) => {
    switch (columnKey) {
      case "codigo":
        return <TableCell className="font-mono text-sm">{p.codigo}</TableCell>;
      case "codigoAuxiliar":
        return <TableCell className="font-mono text-xs text-muted-foreground">{p.codigoAuxiliar || "—"}</TableCell>;
      case "barras":
        return <TableCell className="font-mono text-xs">{p.barras || "—"}</TableCell>;
      case "descricao":
        return (
          <TableCell className="font-medium max-w-[200px] truncate">
            <div className="flex items-center gap-1.5">
              <span>{p.descricao}</span>
              {p.produtoBalanca && (
                <Badge variant="outline" className="text-primary border-primary/30 gap-0.5 text-[9px] h-4 px-1.5 shrink-0">
                  <Scale size={10} />BAL
                </Badge>
              )}
            </div>
          </TableCell>
        );
      case "ncm":
        return (
          <TableCell className="font-mono text-sm">
            {p.ncm && p.ncm.replace(/\D/g, "").length >= 8 ? (
              <span className="text-green-600">{p.ncm}</span>
            ) : p.ncm ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-destructive font-semibold">{p.ncm} <AlertTriangle size={12} className="inline mb-0.5" /></span>
                  </TooltipTrigger>
                  <TooltipContent><p>NCM inválido — deve conter 8 dígitos</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-destructive/70 italic">Não informado <AlertTriangle size={12} className="inline mb-0.5" /></span>
                  </TooltipTrigger>
                  <TooltipContent><p>NCM obrigatório para emissão fiscal (Lei 12.741)</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </TableCell>
        );
      case "cest":
        return <TableCell className="font-mono text-xs">{p.cest || "—"}</TableCell>;
      case "fornecedor":
        return <TableCell className="text-sm text-muted-foreground truncate max-w-[120px]">{p.fornecedor || "—"}</TableCell>;
      case "grupo":
        return <TableCell><Badge variant="secondary" className="border-0">{p.grupo || "—"}</Badge></TableCell>;
      case "categoria":
        return <TableCell className="text-sm text-muted-foreground">{p.categoria || "—"}</TableCell>;
      case "unidade":
        return <TableCell className="text-xs">{p.unidade || "UN"}</TableCell>;
      case "custoAquisicao":
        return <TableCell className="text-right font-mono text-xs">R$ {(p.custoAquisicao || 0).toFixed(2)}</TableCell>;
      case "custoReposicao":
        return <TableCell className="text-right font-mono">R$ {(p.custoReposicao || p.custoAquisicao).toFixed(2)}</TableCell>;
      case "venda":
        return <TableCell className="text-right font-mono">R$ {p.venda.toFixed(2)}</TableCell>;
      case "margemBruta":
        return (
          <TableCell className="text-right">
            <span className={mb < 15 ? "text-destructive font-bold" : "text-green-600 font-semibold"}>{mb}%</span>
          </TableCell>
        );
      case "margemLiquida":
        return (
          <TableCell className="text-right">
            <span className={ml < 5 ? "text-destructive font-bold" : "text-green-600 font-semibold"}>{ml}%</span>
          </TableCell>
        );
      case "estoque":
        return (
          <TableCell className="text-right">
            <span className={p.estoque < 15 ? "text-destructive font-bold" : ""}>{p.estoque} {p.unidade}</span>
          </TableCell>
        );
      case "auditoria":
        return (
          <TableCell>
            {p.auditoriaCorrigida ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                <ShieldCheck size={12} />Auditado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1">
                <ShieldAlert size={12} />Pendente
              </Badge>
            )}
          </TableCell>
        );
      case "status":
        return (
          <TableCell>
            <Badge variant={p.ativo !== false ? "default" : "secondary"}>{p.ativo !== false ? "Ativo" : "Inativo"}</Badge>
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Produtos"
        description="Cadastro completo com tributação, custos, margens e classificação fiscal"
        actions={
          <div className="flex gap-2 flex-wrap">
            <ExportButtons options={{
              title: "Cadastro de Produtos",
              filename: `Produtos_${new Date().toISOString().split("T")[0]}`,
              columns: [
                { header: "Código", key: "codigo" },
                { header: "Descrição", key: "descricao" },
                { header: "NCM", key: "ncm" },
                { header: "Fornecedor", key: "fornecedor" },
                { header: "Grupo", key: "grupo" },
                { header: "Custo Rep.", key: "custoReposicao", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                { header: "Venda", key: "venda", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                { header: "Estoque", key: "estoque", align: "right" },
                { header: "Status", key: "ativo", format: (v: boolean) => v ? "Ativo" : "Inativo" },
              ],
              data: items,
            }} />
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md border text-xs">
              <span className="text-muted-foreground whitespace-nowrap">Dígitos Código:</span>
              <Select value={String(codigoDigits)} onValueChange={handleDigitsChange}>
                <SelectTrigger className="h-7 w-16 border-none bg-transparent font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAuthorized && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2" 
                onClick={handleResequence}
                disabled={loadingCode || items.length === 0}
              >
                {loadingCode ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span className="hidden sm:inline">Re-sequenciar</span>
              </Button>
            )}
            <Button onClick={openNew} className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Novo Produto</Button>
          </div>
        }
      />

      {/* Dashboard de Cobertura NCM */}
      {(() => {
        const ativos = items.filter(p => p.ativo);
        const comNcm = ativos.filter(p => isNcmValido(p.ncm));
        const semNcm = ativos.length - comNcm.length;
        const pct = ativos.length > 0 ? Math.round((comNcm.length / ativos.length) * 100) : 0;
        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => setFiltroNcm("todos")}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{ativos.length}</p>
                <p className="text-xs text-muted-foreground">Produtos ativos</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:ring-2 ring-chart-2/30 transition-all" onClick={() => setFiltroNcm("valido")}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-chart-2">{comNcm.length}</p>
                <p className="text-xs text-muted-foreground">Com NCM válido</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:ring-2 ring-destructive/30 transition-all" onClick={() => setFiltroNcm("sem")}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{semNcm}</p>
                <p className="text-xs text-muted-foreground">Sem NCM / Pendente</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{pct}%</p>
                <p className="text-xs text-muted-foreground">Cobertura NCM</p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => {
              const pendentes = ativos.filter(p => !isNcmValido(p.ncm));
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Cobertura NCM</title>
              <style>body{font-family:Arial,sans-serif;margin:20px;color:#222}h1{font-size:18px;margin-bottom:4px}
              .info{font-size:12px;color:#666;margin-bottom:16px}
              table{width:100%;border-collapse:collapse;font-size:11px}
              th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
              th{background:#f5f5f5;font-weight:600}
              .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
              .ok{background:#dcfce7;color:#166534}.pend{background:#fee2e2;color:#991b1b}
              .summary{display:flex;gap:24px;margin-bottom:16px;font-size:13px}
              .summary div{padding:8px 16px;border-radius:8px;background:#f9fafb;border:1px solid #e5e7eb}
              .summary strong{display:block;font-size:20px}</style></head><body>
              <h1>Relatório de Cobertura NCM</h1>
              <p class="info">Gerado em ${new Date().toLocaleString("pt-BR")} — ${ativos.length} produtos ativos</p>
              <div class="summary">
                <div><strong style="color:#16a34a">${comNcm.length}</strong>Com NCM válido</div>
                <div><strong style="color:#dc2626">${semNcm}</strong>Sem NCM</div>
                <div><strong>${pct}%</strong>Cobertura</div>
              </div>
              <h2 style="font-size:14px;margin-top:20px">Produtos Pendentes (${pendentes.length})</h2>
              <table><thead><tr><th>#</th><th>Código</th><th>Descrição</th><th>Grupo</th><th>NCM Atual</th><th>Status</th></tr></thead>
              <tbody>${pendentes.map((p, i) => `<tr><td>${i + 1}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.grupo || "—"}</td><td>${p.ncm || "—"}</td><td><span class="badge pend">${p.ncm ? "Inválido" : "Não informado"}</span></td></tr>`).join("")}</tbody></table>
              </body></html>`;
              setPdfNcmHtml(html);
              setPdfNcmOpen(true);
            }}>
              <CardContent className="p-3 text-center">
                <FileText size={20} className="mx-auto text-primary mb-1" />
                <p className="text-xs font-medium text-primary">Relatório PDF</p>
                <p className="text-xs text-muted-foreground">Cobertura NCM</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por descrição, código ou barras..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os fornecedores</SelectItem>
                {fornecedoresUnicos.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroNcm} onValueChange={setFiltroNcm}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Status NCM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos NCMs</SelectItem>
                <SelectItem value="valido">✅ NCM válido</SelectItem>
                <SelectItem value="invalido">⚠️ NCM inválido</SelectItem>
                <SelectItem value="sem">❌ Sem NCM</SelectItem>
              </SelectContent>
            </Select>
            <ColumnSelector
              columns={columns}
              onToggle={toggleColumn}
              onReset={resetToDefault}
            />
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setBulkNcmOpen(true)}>
                <Pencil size={12} /> Editar NCM em massa
              </Button>
              <Button size="sm" variant="secondary" className="gap-1 text-xs" onClick={async () => {
                const semNcm = items.filter(p => selectedIds.has(p.id) && (!p.ncm || p.ncm.replace(/\D/g, "").length < 8));
                if (semNcm.length === 0) { toast.info("Todos os produtos selecionados já possuem NCM válido"); return; }
                let count = 0;
                for (const p of semNcm) {
                  const palavras = p.descricao.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                  let melhor: typeof ncmTable[0] | null = null;
                  let melhorScore = 0;
                  for (const n of ncmTable) {
                    const desc = n.descricao.toLowerCase();
                    let score = 0;
                    for (const pl of palavras) { if (desc.includes(pl)) score += pl.length; }
                    if (score > melhorScore) { melhorScore = score; melhor = n; }
                  }
                  if (melhor && melhorScore > 0) {
                    await updateItem(p.id, { ncm: melhor.ncm, cest: melhor.cest, mva: melhor.mva } as Partial<Produto>);
                    count++;
                  }
                }
                toast.success(`NCM sugerido para ${count} de ${semNcm.length} produto(s)`);
                if (user && count > 0) addAuditLog("ncm_auto_sugestao", { id: user.id, nome: user.nome, role: user.role }, `Auto-sugestão NCM: ${count} produto(s) atualizados (seleção)`);
                setSelectedIds(new Set());
              }}>
                <Tag size={12} /> Auto-sugerir NCM
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
            </div>
          )}
          {selectedIds.size === 0 && items.some(p => !p.ncm || p.ncm.replace(/\D/g, "").length < 8) && (
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={async () => {
                const semNcm = items.filter(p => p.ativo && (!p.ncm || p.ncm.replace(/\D/g, "").length < 8));
                if (semNcm.length === 0) return;
                let count = 0;
                for (const p of semNcm) {
                  const palavras = p.descricao.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                  let melhor: typeof ncmTable[0] | null = null;
                  let melhorScore = 0;
                  for (const n of ncmTable) {
                    const desc = n.descricao.toLowerCase();
                    let score = 0;
                    for (const pl of palavras) { if (desc.includes(pl)) score += pl.length; }
                    if (score > melhorScore) { melhorScore = score; melhor = n; }
                  }
                  if (melhor && melhorScore > 0) {
                    await updateItem(p.id, { ncm: melhor.ncm, cest: melhor.cest, mva: melhor.mva } as Partial<Produto>);
                    count++;
                  }
                }
                toast.success(`NCM sugerido automaticamente para ${count} de ${semNcm.length} produto(s) sem NCM`);
                if (user && count > 0) addAuditLog("ncm_auto_sugestao", { id: user.id, nome: user.nome, role: user.role }, `Auto-sugestão NCM em lote: ${count} de ${semNcm.length} produto(s) atualizados`);
              }}>
                <Tag size={14} className="mr-1" /> Auto-sugerir NCM para todos sem NCM ({items.filter(p => p.ativo && (!p.ncm || p.ncm.replace(/\D/g, "").length < 8)).length})
              </Button>
            </div>
          )}

          <div className="table-responsive">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                {visibleColumns.map(col => (
                  <TableHead key={col.key} className={["custoReposicao", "venda", "margemBruta", "margemLiquida", "estoque"].includes(col.key) ? "text-right" : ""}>
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const mb = calcMargemBruta(p.venda, p.custoReposicao || p.custoAquisicao);
                const ml = calcMargemLiquida(p.venda, p.custoReposicao || p.custoAquisicao, p.aliqIcms, p.aliqPis, p.aliqCofins);
                return (
                  <TableRow key={p.id} className={selectedIds.has(p.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                    </TableCell>
                    {visibleColumns.map(col => renderCell(p, col.key, mb, ml))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center text-muted-foreground py-8">Nenhum produto encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </div>
        </CardContent>
      </Card>

      {/* Main Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <Tabs defaultValue="geral">
            <TabsList className="flex flex-wrap h-auto gap-1 w-full">
              <TabsTrigger value="geral" className="text-xs sm:text-sm">Geral</TabsTrigger>
              <TabsTrigger value="classificacao" className="text-xs sm:text-sm">Classificação</TabsTrigger>
              <TabsTrigger value="tributacao" className="text-xs sm:text-sm">Tributação</TabsTrigger>
              <TabsTrigger value="custos" className="text-xs sm:text-sm">Custos</TabsTrigger>
              <TabsTrigger value="composicao" className="text-xs sm:text-sm">Composição</TabsTrigger>
              <TabsTrigger value="desdobramento" className="text-xs sm:text-sm">Desdob.</TabsTrigger>
              <TabsTrigger value="precos" className="text-xs sm:text-sm">Preços</TabsTrigger>
              <TabsTrigger value="etiqueta" className="text-xs sm:text-sm">Etiqueta</TabsTrigger>
            </TabsList>

            {/* GERAL */}
            <TabsContent value="geral" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                <div><Label>Código *</Label><Input value={form.codigo} readOnly className="bg-muted/50 font-mono" /></div>
                <div><Label>Cód. Auxiliar</Label><Input value={form.codigoAuxiliar || ""} onChange={e => setForm({ ...form, codigoAuxiliar: e.target.value })} placeholder="Código auxiliar" /></div>
                <div><Label>Cód. Referência</Label><Input value={form.codigoReferencia || ""} onChange={e => setForm({ ...form, codigoReferencia: e.target.value })} placeholder="Referência fabricante" /></div>
                <div>
                  <Label>Unidade</Label>
                  <div className="flex gap-1">
                    <Select value={form.unidade || "UN"} onValueChange={v => v === "__nova__" ? setNovaUnidadeOpen(true) : setForm({ ...form, unidade: v })}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {todasUnidades.map(u => (
                          <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.descricao}</SelectItem>
                        ))}
                        <SelectItem value="__nova__">+ Nova Unidade...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>

              {/* EAN / Códigos de Barras Múltiplos */}
              <div className="space-y-2">
                <Label>Códigos EAN / Barras</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.barras}
                    onChange={e => setForm({ ...form, barras: e.target.value })}
                    placeholder="EAN principal"
                    className="font-mono"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (form.barras.trim() && !(form.barrasMultiplos || []).includes(form.barras.trim())) {
                      setForm(prev => ({ ...prev, barrasMultiplos: [...(prev.barrasMultiplos || []), prev.barras.trim()], barras: "" }));
                    }
                  }}>
                    <Plus size={14} className="mr-1" />Adicionar
                  </Button>
                </div>
                {(form.barrasMultiplos || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.barrasMultiplos.map((ean, i) => (
                      <Badge key={i} variant="secondary" className="font-mono text-xs gap-1 pr-1">
                        {ean}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={() => setForm(prev => ({ ...prev, barrasMultiplos: prev.barrasMultiplos.filter((_, idx) => idx !== i) }))}
                        >×</button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><Label>Estoque</Label><Input type="number" value={form.estoque} onChange={e => setForm({ ...form, estoque: Number(e.target.value) })} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.ativo ? "ativo" : "inativo"} onValueChange={v => setForm({ ...form, ativo: v === "ativo" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="flex items-center gap-1.5"><Scale size={14} className="text-primary" />Produto de Balança</Label>
                  <div
                    className={`mt-1 flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors ${form.produtoBalanca ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
                    onClick={() => setForm({ ...form, produtoBalanca: !form.produtoBalanca })}
                  >
                    <Checkbox checked={form.produtoBalanca} onCheckedChange={(v) => setForm({ ...form, produtoBalanca: !!v })} />
                    <span className="text-sm font-medium">{form.produtoBalanca ? "Sim" : "Não"}</span>
                  </div>
                </div>
                {form.produtoBalanca && (
                  <div className="flex flex-col gap-1">
                    <Label>Unidade de Medida (Balança)</Label>
                    <Select value={form.unidadeBalanca} onValueChange={(v) => setForm({ ...form, unidadeBalanca: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg - Quilograma</SelectItem>
                        <SelectItem value="g">g - Grama</SelectItem>
                        <SelectItem value="L">L - Litro</SelectItem>
                        <SelectItem value="mL">mL - Mililitro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Fornecedor Principal */}
              <div className="relative">
                <Label>Fornecedor Principal</Label>
                <Input
                  value={form.fornecedor}
                  onChange={e => setForm({ ...form, fornecedor: e.target.value })}
                  placeholder="Digite para buscar fornecedor cadastrado..."
                  autoComplete="off"
                />
                {(form.fornecedor || "").length >= 1 && (() => {
                  const q = form.fornecedor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const matches = fornecedoresCadastrados.filter(f => {
                    const nome = f.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return nome.includes(q) || (f.cpfCnpj && f.cpfCnpj.includes(form.fornecedor));
                  }).slice(0, 8);
                  return matches.length > 0 && !fornecedoresCadastrados.some(f => f.nome === form.fornecedor) ? (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {matches.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center gap-2"
                          onClick={() => setForm({ ...form, fornecedor: f.nome })}
                        >
                          <span className="truncate font-medium">{f.nome}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{f.cpfCnpj}</span>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
            </TabsContent>

            {/* CLASSIFICAÇÃO */}
            <TabsContent value="classificacao" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>NCM</Label>
                  <div className="flex gap-2">
                    <NcmAutocomplete
                      value={form.ncm}
                      ncmTable={ncmTable}
                      onChange={val => setForm(prev => ({ ...prev, ncm: val }))}
                      onSelect={item => selectNcm(item)}
                      placeholder="Digite NCM ou descrição..."
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setNcmSearchOpen(true)}>
                      <Search size={14} className="mr-1" />Lista
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => {
                      if (!form.descricao.trim()) { toast.error("Preencha a descrição do produto primeiro"); return; }
                      const palavras = form.descricao.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                      let melhor: typeof ncmTable[0] | null = null;
                      let melhorScore = 0;
                      for (const n of ncmTable) {
                        const desc = n.descricao.toLowerCase();
                        let score = 0;
                        for (const p of palavras) {
                          if (desc.includes(p)) score += p.length;
                        }
                        if (score > melhorScore) { melhorScore = score; melhor = n; }
                      }
                      if (melhor && melhorScore > 0) {
                        selectNcm(melhor);
                        toast.success(`NCM sugerido: ${melhor.ncm} — ${melhor.descricao}`);
                      } else {
                        toast.info("Nenhum NCM compatível encontrado. Use a busca manual.");
                      }
                    }} title="Sugerir NCM baseado na descrição do produto">
                      <Tag size={14} className="mr-1" />Auto
                    </Button>
                  </div>
                </div>
                <div><Label>CEST</Label><Input value={form.cest} onChange={e => setForm({ ...form, cest: e.target.value })} placeholder="00.000.00" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria || "nenhuma"} onValueChange={v => setForm({ ...form, categoria: v === "nenhuma" ? "" : v, subgrupo: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      {categoriasRaiz.map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategoria</Label>
                  <Select value={form.subgrupo || "nenhuma"} onValueChange={v => setForm({ ...form, subgrupo: v === "nenhuma" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      {getSubcategorias(form.categoria).map(c => (
                        <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Departamento</Label><Input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Família</Label><Input value={form.familia} onChange={e => setForm({ ...form, familia: e.target.value })} /></div>
                <div><Label>Subfamília</Label><Input value={form.subfamilia} onChange={e => setForm({ ...form, subfamilia: e.target.value })} /></div>
                <div><Label>Grupo</Label><Input value={form.grupo} onChange={e => setForm({ ...form, grupo: e.target.value })} /></div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Anotações livres sobre este produto..." />
              </div>
            </TabsContent>

            {/* TRIBUTAÇÃO */}
            <TabsContent value="tributacao" className="space-y-4">
              {/* CST Composto */}
              {form.origemMercadoria && form.cstIcms && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <Badge className="text-sm font-mono px-3 py-1 bg-primary text-primary-foreground">
                    CST {form.origemMercadoria}{form.cstIcms}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Origem <strong>{form.origemMercadoria}</strong> ({["Nacional","Estrangeira (imp. direta)","Estrangeira (merc. interno)","Nacional (40-70% imp.)","Nacional (PPB)","Nacional (≤40% imp.)","Estrangeira (s/ similar)","Estrangeira (s/ similar, merc. int.)","Nacional (>70% imp.)"][parseInt(form.origemMercadoria)] || "?"})
                    {" + "}Tributação <strong>{form.cstIcms}</strong> ({cstIcmsOptions.find(c => c.startsWith(form.cstIcms))?.slice(5) || "?"})
                  </span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Origem da Mercadoria (Tabela A — SINIEF 20/2012)</Label>
                  <Select value={form.origemMercadoria} onValueChange={v => setForm({ ...form, origemMercadoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {origensOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {["1","2","6","7"].includes(form.origemMercadoria) && form.ncm && !form.ncm.startsWith("00") && (
                    <p className="text-xs text-warning mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> Produto com origem estrangeira — verifique NCM e CFOP de importação
                    </p>
                  )}
                </div>
                <div>
                  <Label className="flex items-center gap-1"><MapPin size={12} />UF Tributação</Label>
                  <Select value={form.ufTributacao || "nenhuma"} onValueChange={v => {
                    const uf = v === "nenhuma" ? "" : v;
                    const aliq = getAliquotaByUF(uf);
                    setForm({ ...form, ufTributacao: uf, aliqIcms: aliq ? aliq.aliquota : form.aliqIcms });
                    if (aliq) toast.info(`ICMS ${uf}: ${aliq.aliquota}% aplicado automaticamente`);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione UF..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhuma">Nenhuma</SelectItem>
                      {estados.map(uf => {
                        const aliq = getAliquotaByUF(uf);
                        return <SelectItem key={uf} value={uf}>{uf} — {aliq?.aliquota}%</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CST ICMS</Label>
                  <Select value={form.cstIcms} onValueChange={v => {
                    const cstSemIcms = ["30", "40", "41", "60"];
                    setForm({ ...form, cstIcms: v, aliqIcms: cstSemIcms.includes(v) ? 0 : form.aliqIcms });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cstIcmsOptions.map(c => <SelectItem key={c.slice(0, 2)} value={c.slice(0, 2)}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Alíq. ICMS %</Label>
                    {["30","40","41","60"].includes(form.cstIcms) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-warning/15 text-warning border border-warning/30 cursor-help">
                              Isento CST {form.cstIcms}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            <p className="font-semibold">ICMS: CST {form.cstIcms} — {{"30":"Isenta/não tributada com cobrança de ICMS por ST","40":"Isenta","41":"Não tributada","60":"ICMS cobrado anteriormente por ST"}[form.cstIcms]}</p>
                            <p className="text-muted-foreground mt-1">Alíquota zerada automaticamente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Input type="number" step="0.01" value={form.aliqIcms} onChange={e => { if (!["30","40","41","60"].includes(form.cstIcms)) setForm({ ...form, aliqIcms: Number(e.target.value) }); }} disabled={["30","40","41","60"].includes(form.cstIcms)} className={["30","40","41","60"].includes(form.cstIcms) ? "opacity-50 border-warning/40" : ""} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Alíq. PIS %</Label>
                    {["04","06","07","08","09"].includes(form.cstPis) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-warning/15 text-warning border border-warning/30 cursor-help">
                              Isento CST {form.cstPis}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            <p className="font-semibold">PIS: CST {form.cstPis} — {{"04":"Monofásica — revenda a alíquota zero","06":"Alíquota zero","07":"Isenta da contribuição","08":"Sem incidência da contribuição","09":"Com suspensão da contribuição"}[form.cstPis]}</p>
                            <p className="text-muted-foreground mt-1">Alíquota zerada automaticamente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Input type="number" step="0.01" value={form.aliqPis} onChange={e => { if (!["04","06","07","08","09"].includes(form.cstPis)) setForm({ ...form, aliqPis: Number(e.target.value) }); }} disabled={["04","06","07","08","09"].includes(form.cstPis)} className={["04","06","07","08","09"].includes(form.cstPis) ? "opacity-50 border-warning/40" : ""} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Alíq. COFINS %</Label>
                    {["04","06","07","08","09"].includes(form.cstCofins) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-warning/15 text-warning border border-warning/30 cursor-help">
                              Isento CST {form.cstCofins}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            <p className="font-semibold">COFINS: CST {form.cstCofins} — {{"04":"Monofásica — revenda a alíquota zero","06":"Alíquota zero","07":"Isenta da contribuição","08":"Sem incidência da contribuição","09":"Com suspensão da contribuição"}[form.cstCofins]}</p>
                            <p className="text-muted-foreground mt-1">Alíquota zerada automaticamente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Input type="number" step="0.01" value={form.aliqCofins} onChange={e => { if (!["04","06","07","08","09"].includes(form.cstCofins)) setForm({ ...form, aliqCofins: Number(e.target.value) }); }} disabled={["04","06","07","08","09"].includes(form.cstCofins)} className={["04","06","07","08","09"].includes(form.cstCofins) ? "opacity-50 border-warning/40" : ""} />
                </div>
                <div><Label>Alíq. IPI %</Label><Input type="number" step="0.01" value={form.aliqIpi} onChange={e => setForm({ ...form, aliqIpi: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CST PIS</Label>
                  <Select value={form.cstPis} onValueChange={v => {
                    const cstSemPis = ["04","06","07","08","09"];
                    setForm({ ...form, cstPis: v, aliqPis: cstSemPis.includes(v) ? 0 : form.aliqPis });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["01 - Tributável alíquota básica","02 - Tributável alíquota diferenciada","03 - Tributável alíquota por unidade","04 - Monofásica revenda alíquota zero","05 - Substituição tributária","06 - Alíquota zero","07 - Isenta","08 - Sem incidência","09 - Com suspensão","49 - Outras saídas","50 - Crédito vinculado receita tributada","99 - Outras operações"].map(c => <SelectItem key={c.slice(0,2)} value={c.slice(0,2)}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CST COFINS</Label>
                  <Select value={form.cstCofins} onValueChange={v => {
                    const cstSemCofins = ["04","06","07","08","09"];
                    setForm({ ...form, cstCofins: v, aliqCofins: cstSemCofins.includes(v) ? 0 : form.aliqCofins });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["01 - Tributável alíquota básica","02 - Tributável alíquota diferenciada","03 - Tributável alíquota por unidade","04 - Monofásica revenda alíquota zero","05 - Substituição tributária","06 - Alíquota zero","07 - Isenta","08 - Sem incidência","09 - Com suspensão","49 - Outras saídas","50 - Crédito vinculado receita tributada","99 - Outras operações"].map(c => <SelectItem key={c.slice(0,2)} value={c.slice(0,2)}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>CFOP Interno</Label><Input value={form.cfopInterno} onChange={e => setForm({ ...form, cfopInterno: e.target.value })} placeholder="5102" /></div>
                <div><Label>CFOP Externo</Label><Input value={form.cfopExterno} onChange={e => setForm({ ...form, cfopExterno: e.target.value })} placeholder="6102" /></div>
              </div>
            </TabsContent>

            {/* CUSTOS / PREÇOS */}
            <TabsContent value="custos" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Custo Aquisição (R$)</Label><CurrencyInput value={form.custoAquisicao} onValueChange={v => setForm({ ...form, custoAquisicao: v })} /></div>
                <div><Label>Custo Reposição (R$)</Label><CurrencyInput value={form.custoReposicao} onValueChange={v => setForm({ ...form, custoReposicao: v })} /></div>
                <div><Label>MVA %</Label><Input type="number" step="0.01" value={form.mva} onChange={e => setForm({ ...form, mva: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Preço de Venda (R$)</Label><CurrencyInput value={form.venda} onValueChange={v => setForm({ ...form, venda: v })} /></div>
                <div>
                  <Label>Sugestão Venda (R$)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={formatCurrencyBRL(form.sugestaoVenda)} className="bg-muted font-mono" />
                    <Button type="button" variant="outline" size="icon" onClick={() => setForm(prev => ({ ...prev, venda: prev.sugestaoVenda }))} title="Aplicar sugestão">
                      <Calculator size={14} />
                    </Button>
                  </div>
                </div>
                <div></div>
              </div>
              {/* Margins Display */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Margem Bruta</p>
                  <p className={`text-2xl font-bold ${form.margemBruta < 15 ? "text-destructive" : "text-green-600"}`}>{form.margemBruta}%</p>
                  <p className="text-xs text-muted-foreground">(Venda - Custo) / Venda</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Margem Líquida</p>
                  <p className={`text-2xl font-bold ${form.margemLiquida < 5 ? "text-destructive" : "text-green-600"}`}>{form.margemLiquida}%</p>
                  <p className="text-xs text-muted-foreground">(Venda - Custo - Impostos) / Venda</p>
                </Card>
              </div>
            </TabsContent>

            {/* COMPOSIÇÃO / FICHA TÉCNICA */}
            <TabsContent value="composicao" className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical size={18} className="text-primary" />
                <div>
                  <p className="font-medium text-sm">Ficha Técnica / Composição do Produto</p>
                  <p className="text-xs text-muted-foreground">Defina os insumos e matérias-primas necessárias para fabricar este produto.</p>
                </div>
              </div>

              {/* Buscar produto para adicionar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Adicionar Insumo / Matéria-Prima</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setInsumoRapidoOpen(true)}>
                    <Plus size={14} className="mr-1" /> Criar Insumo Rápido
                  </Button>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={composicaoSearch}
                    onChange={e => setComposicaoSearch(e.target.value)}
                    placeholder="Buscar por descrição, código ou barras..."
                    className="pl-9"
                  />
                </div>
                {composicaoSearch.length >= 1 && (
                  <div className="border rounded-md max-h-[160px] overflow-y-auto">
                    {produtosParaComposicao.slice(0, 10).map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b last:border-b-0"
                        onClick={() => addComposicaoItem(p)}
                      >
                        <div>
                          <span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo}</span>
                          <span>{p.descricao}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{p.unidade}</span>
                          <span className="font-mono text-xs">R$ {(p.custoReposicao || p.custoAquisicao).toFixed(2)}</span>
                          <Plus size={14} className="text-primary" />
                        </div>
                      </div>
                    ))}
                    {produtosParaComposicao.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-3">Nenhum produto encontrado</p>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de composição */}
              {form.composicao.length === 0 && (
                <p className="text-center text-muted-foreground py-6">Nenhum insumo adicionado. Este produto não possui composição.</p>
              )}
              {form.composicao.map((c, i) => (
                <div key={i} className="flex items-end gap-3 p-3 border rounded-md">
                  <div className="flex-[2]">
                    <Label className="text-xs">Insumo</Label>
                    <Input value={c.produtoDescricao} readOnly className="bg-muted/50 text-sm" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Quantidade</Label>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={c.quantidade}
                      onChange={e => updateComposicaoItem(i, "quantidade", Number(e.target.value))}
                    />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Unidade</Label>
                    <Select value={c.unidade} onValueChange={v => updateComposicaoItem(i, "unidade", v)}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {todasUnidades.map(u => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Custo Unit. (R$)</Label>
                    <CurrencyInput value={c.custoUnitario} onValueChange={v => updateComposicaoItem(i, "custoUnitario", v)} />
                  </div>
                  <div className="w-24 text-right">
                    <Label className="text-xs">Subtotal</Label>
                    <p className="font-mono text-sm font-semibold py-2">R$ {(c.custoUnitario * c.quantidade).toFixed(2)}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeComposicaoItem(i)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}

              {/* Resumo de custo */}
              {form.composicao.length > 0 && (
                <Card className="p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Custo Total da Composição</p>
                      <p className="text-xs text-muted-foreground">{form.composicao.length} insumo(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">R$ {custoComposicao.toFixed(2)}</p>
                      {custo > 0 && custoComposicao !== custo && (
                        <p className="text-xs text-muted-foreground">
                          Custo cadastrado: R$ {custo.toFixed(2)} | Diferença: R$ {Math.abs(custoComposicao - custo).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setForm(prev => ({ ...prev, custoReposicao: custoComposicao }));
                        toast.success("Custo de reposição atualizado com base na composição!");
                      }}
                    >
                      <Calculator size={14} className="mr-1" />Aplicar como Custo Reposição
                    </Button>
                  </div>
                </Card>
              )}

              {/* Modal Insumo Rápido */}
              <Dialog open={insumoRapidoOpen} onOpenChange={setInsumoRapidoOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Criar Insumo Rápido</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Descrição *</Label>
                      <Input
                        value={insumoRapido.descricao}
                        onChange={e => setInsumoRapido(prev => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Ex: Farinha de trigo, Parafuso M6..."
                      />
                    </div>
                    <div>
                      <Label>Código de Barras (EAN)</Label>
                      <Input
                        value={insumoRapido.barras}
                        onChange={e => setInsumoRapido(prev => ({ ...prev, barras: e.target.value }))}
                        placeholder="Ex: 7891234567890"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <Label>NCM</Label>
                        <Input
                          value={insumoRapido.ncm}
                          onChange={e => setInsumoRapido(prev => ({ ...prev, ncm: e.target.value }))}
                          placeholder="Digite NCM ou descrição..."
                          autoComplete="off"
                        />
                        {insumoRapido.ncm.length >= 2 && (() => {
                          const terms = insumoRapido.ncm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
                          const sugestoes = ncmTable.filter(n => {
                            const desc = n.descricao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            return terms.every(t => n.ncm.includes(t) || n.cest.includes(t) || desc.includes(t));
                          }).slice(0, 8);
                          return sugestoes.length > 0 && !ncmTable.some(n => n.ncm === insumoRapido.ncm) ? (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {sugestoes.map(n => (
                                <button
                                  key={n.ncm}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center gap-2"
                                  onClick={() => setInsumoRapido(prev => ({ ...prev, ncm: n.ncm }))}
                                >
                                  <span className="truncate"><span className="font-mono font-semibold">{n.ncm}</span> — {n.descricao}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">CEST {n.cest}</span>
                                </button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="relative">
                        <Label>Fornecedor</Label>
                        <Input
                          value={insumoRapido.fornecedor}
                          onChange={e => setInsumoRapido(prev => ({ ...prev, fornecedor: e.target.value }))}
                          placeholder="Digite para buscar fornecedor..."
                          autoComplete="off"
                        />
                        {insumoRapido.fornecedor.length >= 1 && (() => {
                          const q = insumoRapido.fornecedor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                          const matches = fornecedoresCadastrados.filter(f => {
                            const nome = f.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            return nome.includes(q) || (f.cpfCnpj && f.cpfCnpj.includes(insumoRapido.fornecedor));
                          }).slice(0, 8);
                          return matches.length > 0 && !fornecedoresCadastrados.some(f => f.nome === insumoRapido.fornecedor) ? (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {matches.map(f => (
                                <button
                                  key={f.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between items-center gap-2"
                                  onClick={() => setInsumoRapido(prev => ({ ...prev, fornecedor: f.nome }))}
                                >
                                  <span className="truncate font-medium">{f.nome}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">{f.cpfCnpj}</span>
                                </button>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Unidade</Label>
                        <Select value={insumoRapido.unidade} onValueChange={v => setInsumoRapido(prev => ({ ...prev, unidade: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {todasUnidades.map(u => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.descricao}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Custo (R$)</Label>
                        <CurrencyInput value={insumoRapido.custoReposicao} onValueChange={v => setInsumoRapido(prev => ({ ...prev, custoReposicao: v }))} />
                      </div>
                      <div>
                        <Label>Estoque Inicial</Label>
                        <Input
                          type="number"
                          min={0}
                          value={insumoRapido.estoque}
                          onChange={e => setInsumoRapido(prev => ({ ...prev, estoque: Number(e.target.value) }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInsumoRapidoOpen(false)}>Cancelar</Button>
                    <Button type="button" onClick={handleCriarInsumoRapido}>Criar e Adicionar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* DESDOBRAMENTO */}
            <TabsContent value="desdobramento" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Unidade base: <strong>{form.unidade}</strong></p>
                <Button type="button" variant="outline" size="sm" onClick={addDesdobramento}><Plus size={14} className="mr-1" />Adicionar</Button>
              </div>
              {form.desdobramentos.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum desdobramento cadastrado</p>}
              {form.desdobramentos.map((d, i) => (
                <div key={i} className="flex items-end gap-3 p-3 border rounded-md">
                  <div className="flex-1">
                    <Label>Unidade</Label>
                    <Select value={d.unidade} onValueChange={v => updateDesdobramento(i, "unidade", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {todasUnidades.map(u => <SelectItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.descricao}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Fator (qtd de {form.unidade})</Label>
                    <Input type="number" value={d.fator} onChange={e => updateDesdobramento(i, "fator", Number(e.target.value))} />
                  </div>
                  <div className="flex-1">
                    <Label>Cód. Barras</Label>
                    <Input value={d.barras} onChange={e => updateDesdobramento(i, "barras", e.target.value)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeDesdobramento(i)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
              {form.desdobramentos.length > 0 && (
                <Card className="p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Resumo de preços por desdobramento:</p>
                  {form.desdobramentos.map((d, i) => (
                    <p key={i} className="text-sm">1 {d.unidade} = {d.fator} {form.unidade} → R$ {(form.venda * d.fator).toFixed(2)}</p>
                  ))}
                </Card>
              )}
            </TabsContent>

            {/* GRUPO DE PREÇOS */}
            <TabsContent value="precos" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Preço base de venda: <strong>R$ {form.venda.toFixed(2)}</strong></p>
                <Button type="button" variant="outline" size="sm" onClick={addGrupoPreco}><Plus size={14} className="mr-1" />Adicionar Grupo</Button>
              </div>
              {form.grupoPrecos.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum grupo de preços cadastrado</p>}
              {form.grupoPrecos.map((g, i) => (
                <div key={i} className="flex items-end gap-3 p-3 border rounded-md">
                  <div className="flex-1">
                    <Label>Nome do Grupo</Label>
                    <Input value={g.nome} onChange={e => updateGrupoPreco(i, "nome", e.target.value)} placeholder="Ex: Atacado, Funcionário, Revendedor" />
                  </div>
                  <div className="flex-1">
                    <Label>Preço (R$)</Label>
                    <CurrencyInput value={g.preco} onValueChange={v => updateGrupoPreco(i, "preco", v)} />
                  </div>
                  <div className="w-24 text-center">
                    <Label>Desconto</Label>
                    <p className={`text-sm font-bold ${g.preco < form.venda ? "text-green-600" : "text-destructive"}`}>
                      {form.venda > 0 ? (((form.venda - g.preco) / form.venda) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeGrupoPreco(i)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </TabsContent>

            {/* ETIQUETA / PROCOM */}
            <TabsContent value="etiqueta" className="space-y-4">
              <div>
                <Label>Descrição para Etiqueta</Label>
                <Input value={form.etiquetaDescricao} onChange={e => setForm({ ...form, etiquetaDescricao: e.target.value.toUpperCase() })} placeholder="DESCRIÇÃO RESUMIDA PARA ETIQUETA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Rateio (%)</Label><Input type="number" step="0.01" value={form.rateio} onChange={e => setForm({ ...form, rateio: Number(e.target.value) })} /></div>
                <div><Label>Norma PROCOM</Label><Input value={form.normaProcom} onChange={e => setForm({ ...form, normaProcom: e.target.value })} placeholder="Código da norma" /></div>
              </div>
              {/* Preview etiqueta */}
              <Card className="p-4 border-dashed border-2">
                <div className="flex items-center gap-2 mb-2"><Tag size={16} /><span className="font-medium text-sm">Pré-visualização da Etiqueta</span></div>
                <div className="bg-background border rounded p-3 text-center space-y-1">
                  <p className="font-bold text-sm">{form.etiquetaDescricao || form.descricao || "DESCRIÇÃO DO PRODUTO"}</p>
                  <p className="text-xs text-muted-foreground">Cód: {form.codigo || "000"} | {form.barras || "0000000000000"}</p>
                  <p className="text-2xl font-bold">R$ {form.venda.toFixed(2)}</p>
                  {form.unidade && <p className="text-xs text-muted-foreground">{form.unidade}</p>}
                  {form.normaProcom && <p className="text-[10px] text-muted-foreground">PROCOM: {form.normaProcom}</p>}
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NCM Search Dialog */}
      <Dialog open={ncmSearchOpen} onOpenChange={setNcmSearchOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh]">
          <DialogHeader><DialogTitle>Buscar NCM / CEST</DialogTitle></DialogHeader>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por NCM, CEST ou descrição..." value={ncmSearch} onChange={e => setNcmSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="overflow-y-auto max-h-[400px]">
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>CEST</TableHead>
                  <TableHead>MVA %</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncmFiltered.map(n => (
                  <TableRow key={n.ncm} className="cursor-pointer hover:bg-accent" onClick={() => selectNcm(n)}>
                    <TableCell className="font-mono">{n.ncm}</TableCell>
                    <TableCell>{n.descricao}</TableCell>
                    <TableCell className="font-mono">{n.cest || "—"}</TableCell>
                    <TableCell className="font-bold">{n.mva ? `${n.mva}%` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={n.fonte === "local" ? "default" : "secondary"} className="text-xs">
                        {n.fonte === "local" ? "Local" : "Web"}
                      </Badge>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="sm">Usar</Button></TableCell>
                  </TableRow>
                ))}
                {ncmFiltered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">Nenhum NCM encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir este produto?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Unidade Dialog */}
      <Dialog open={novaUnidadeOpen} onOpenChange={setNovaUnidadeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cadastrar Nova Unidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Sigla (ex: CX, KG)</Label>
              <Input value={novaUnidadeSigla} onChange={e => setNovaUnidadeSigla(e.target.value.toUpperCase())} maxLength={4} placeholder="Ex: BT" autoFocus />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={novaUnidadeDescricao} onChange={e => setNovaUnidadeDescricao(e.target.value)} placeholder="Ex: Botijão" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaUnidadeOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUnidade}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edição NCM em Massa */}
      <Dialog open={bulkNcmOpen} onOpenChange={setBulkNcmOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} className="text-primary" />
              Editar NCM em Massa — {selectedIds.size} produto(s)
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Buscar NCM por código ou descrição..."
            value={bulkNcmSearch}
            onChange={e => setBulkNcmSearch(e.target.value)}
            autoFocus
          />
          <div className="flex-1 overflow-auto border border-border rounded-md max-h-[40vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">CEST</TableHead>
                  <TableHead className="w-16">Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ncmTable
                  .filter(n => {
                    if (!bulkNcmSearch.trim()) return false;
                    const q = bulkNcmSearch.toLowerCase();
                    return n.ncm.includes(q) || n.descricao.toLowerCase().includes(q);
                  })
                  .slice(0, 50)
                  .map(n => (
                    <TableRow
                      key={n.ncm}
                      className={cn("cursor-pointer hover:bg-accent", bulkNcmValue === n.ncm && "bg-primary/10")}
                      onClick={() => setBulkNcmValue(n.ncm)}
                    >
                      <TableCell className="font-mono text-xs">{n.ncm}</TableCell>
                      <TableCell className="text-xs">{n.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">{n.cest || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={n.fonte === "local" ? "default" : "secondary"} className="text-xs">
                          {n.fonte === "local" ? "Local" : "Web"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          {bulkNcmValue && (
            <p className="text-sm">NCM selecionado: <span className="font-mono font-bold text-primary">{bulkNcmValue}</span></p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkNcmOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkNcmApply} disabled={!bulkNcmValue}>Aplicar NCM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        open={pdfNcmOpen}
        onClose={() => setPdfNcmOpen(false)}
        htmlContent={pdfNcmHtml}
        title="Relatório de Cobertura NCM"
      />
    </div>
  );
}
