import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, AlertTriangle, CheckCircle2, XCircle, FileUp, Download, Zap, Shield, FileText, ShieldCheck, PieChart as PieChartIcon, CalendarIcon, History, Clock, ChevronDown, Filter, Undo2, ArrowRight, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ncmCestMvaData } from "@/data/ncmCestMva";
import { cClassTribData } from "@/data/cClassTribData";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { ExportButtons } from "@/components/ExportButtons";
import { type ExportOptions } from "@/lib/exportUtils";
import { printPDF, buildPrintTable } from "@/lib/printUtils";

// Same Produto interface used in Produtos.tsx
interface Produto {
  id: string;
  codigo: string;
  barras: string;
  descricao: string;
  ncm: string;
  cest: string;
  grupo: string;
  subgrupo: string;
  departamento: string;
  familia: string;
  subfamilia: string;
  categoria: string;
  origemMercadoria: string;
  cstIcms: string;
  cstPis: string;
  cstCofins: string;
  aliqIcms: number;
  aliqPis: number;
  aliqCofins: number;
  aliqIpi: number;
  cfopInterno: string;
  cfopExterno: string;
  custoAquisicao: number;
  custoReposicao: number;
  mva: number;
  venda: number;
  margemBruta: number;
  margemLiquida: number;
  sugestaoVenda: number;
  estoque: number;
  unidade: string;
  desdobramentos: any[];
  grupoPrecos: any[];
  etiquetaDescricao: string;
  rateio: number;
  normaProcom: string;
  auditoriaCorrigida: boolean;
  auditoriaData?: string;
  camposCorrigidos?: string[];
  ativo: boolean;
}

interface ProdutoAuditado {
  produtoId: string;
  codigo: string;
  descricao: string;
  grupo: string;
  departamento: string;
  ncmAtual: string;
  ncmSugerido: string;
  cestAtual: string;
  cestSugerido: string;
  cstIcms: string;
  cstIcmsSugerido: string;
  cstPis: string;
  cstPisSugerido: string;
  cstCofins: string;
  cstCofinsSugerido: string;
  aliqIcms: number;
  aliqIcmsSt: number;
  mvaOriginal: number;
  aliqPis: number;
  aliqCofins: number;
  aliqIpi: number;
  cstIpi: string;
  cstIpiSugerido: string;
  cstIbs: string;
  cstIbsSugerido: string;
  cstCbs: string;
  cstCbsSugerido: string;
  cClassTrib: string;
  cClassTribSugerido: string;
  aliqIbs: number;
  aliqCbs: number;
  aliqIs: number;
  status: "ok" | "alerta" | "erro";
  divergencias: string[];
  auditoriaCorrigida: boolean;
  auditoriaData?: string;
  camposCorrigidos: string[];
}

interface HistoricoAuditoria {
  id: string;
  data: string;
  tipo: "lote_pis_cofins" | "correcao_individual" | "correcao_total";
  usuario: string;
  quantidadeProdutos: number;
  detalhes: string;
}

interface ResumoCorrecao {
  titulo: string;
  data: string;
  totalProdutos: number;
  campos: Array<{ campo: string; quantidade: number }>;
  antesDepois?: {
    errosAntes: number;
    errosDepois: number;
    alertasAntes: number;
    alertasDepois: number;
    conformesAntes: number;
    conformesDepois: number;
    auditadosAntes: number;
    auditadosDepois: number;
  };
}

function loadHistorico(): HistoricoAuditoria[] {
  try {
    return JSON.parse(localStorage.getItem("historico_auditoria") || "[]");
  } catch { return []; }
}

function saveHistorico(h: HistoricoAuditoria[]) {
  localStorage.setItem("historico_auditoria", JSON.stringify(h));
}

function addHistorico(entry: Omit<HistoricoAuditoria, "id" | "data">) {
  const hist = loadHistorico();
  hist.unshift({ ...entry, id: crypto.randomUUID(), data: new Date().toISOString() });
  saveHistorico(hist.slice(0, 200));
}

function seedProdutos(): Produto[] {
  const seeds: Array<{ desc: string; ncm: string; cest: string; grupo: string; dept: string; cstIcms: string; cstPis: string; cstCofins: string; aliqIcms: number; aliqPis: number; aliqCofins: number }> = [
    { desc: "REFRIGERANTE COCA-COLA 2L", ncm: "2202.10.00", cest: "03.011.00", grupo: "Bebidas", dept: "Mercearia", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 18, aliqPis: 0, aliqCofins: 0 },
    { desc: "CERVEJA PILSEN 350ML", ncm: "2203.00.00", cest: "03.001.00", grupo: "Bebidas", dept: "Mercearia", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 25, aliqPis: 0, aliqCofins: 0 },
    { desc: "ÁGUA MINERAL 500ML", ncm: "2201.10.00", cest: "03.025.00", grupo: "Bebidas", dept: "Mercearia", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "ARROZ TIPO 1 5KG", ncm: "1006.30.21", cest: "", grupo: "Alimentos", dept: "Mercearia", cstIcms: "41", cstPis: "06", cstCofins: "06", aliqIcms: 0, aliqPis: 0, aliqCofins: 0 },
    { desc: "FEIJÃO CARIOCA 1KG", ncm: "0713.33.19", cest: "", grupo: "Alimentos", dept: "Mercearia", cstIcms: "41", cstPis: "06", cstCofins: "06", aliqIcms: 0, aliqPis: 0, aliqCofins: 0 },
    { desc: "ÓLEO DE SOJA 900ML", ncm: "1507.90.11", cest: "", grupo: "Alimentos", dept: "Mercearia", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "SABÃO EM PÓ 1KG", ncm: "3402.20.00", cest: "", grupo: "Limpeza", dept: "Higiene e Limpeza", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "DETERGENTE LÍQUIDO 500ML", ncm: "3402.90.39", cest: "", grupo: "Limpeza", dept: "Higiene e Limpeza", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "SHAMPOO 350ML", ncm: "3305.10.00", cest: "20.001.00", grupo: "Higiene Pessoal", dept: "Higiene e Limpeza", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 25, aliqPis: 2.1, aliqCofins: 9.65 },
    { desc: "CREME DENTAL 90G", ncm: "3306.10.00", cest: "20.002.00", grupo: "Higiene Pessoal", dept: "Higiene e Limpeza", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 25, aliqPis: 0, aliqCofins: 0 },
    { desc: "NOTEBOOK LENOVO 15.6", ncm: "8471.30.19", cest: "", grupo: "Informática", dept: "Tecnologia", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "MOUSE WIRELESS", ncm: "8471.60.53", cest: "", grupo: "Informática", dept: "Tecnologia", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "TECLADO USB ABNT2", ncm: "8471.60.52", cest: "", grupo: "Informática", dept: "Tecnologia", cstIcms: "00", cstPis: "50", cstCofins: "50", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "SMARTPHONE SAMSUNG 128GB", ncm: "8517.13.00", cest: "21.053.00", grupo: "Eletrônicos", dept: "Tecnologia", cstIcms: "60", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "FONE DE OUVIDO BLUETOOTH", ncm: "8518.30.00", cest: "", grupo: "Eletrônicos", dept: "Tecnologia", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "PARAFUSO SEXTAVADO M8", ncm: "7318.15.00", cest: "", grupo: "Ferragens", dept: "Construção", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "CIMENTO CP-II 50KG", ncm: "2523.29.10", cest: "", grupo: "Materiais", dept: "Construção", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "TINTA ACRÍLICA 18L", ncm: "3209.10.10", cest: "", grupo: "Materiais", dept: "Construção", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "PNEU 175/70 R13", ncm: "4011.10.00", cest: "16.001.00", grupo: "Autopeças", dept: "Automotivo", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 12, aliqPis: 0, aliqCofins: 0 },
    { desc: "ÓLEO MOTOR 5W30 1L", ncm: "2710.19.32", cest: "06.001.00", grupo: "Autopeças", dept: "Automotivo", cstIcms: "60", cstPis: "04", cstCofins: "04", aliqIcms: 25, aliqPis: 0, aliqCofins: 0 },
    { desc: "FILTRO DE AR MOTOR", ncm: "8421.31.00", cest: "", grupo: "Autopeças", dept: "Automotivo", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "CAMISA POLO MASCULINA M", ncm: "6105.10.00", cest: "", grupo: "Vestuário", dept: "Moda", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "CALÇA JEANS FEMININA 40", ncm: "6204.62.00", cest: "", grupo: "Vestuário", dept: "Moda", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "TÊNIS CORRIDA MASCULINO", ncm: "6404.11.00", cest: "", grupo: "Calçados", dept: "Moda", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "DIPIRONA SÓDICA 500MG", ncm: "3004.90.69", cest: "", grupo: "Medicamentos", dept: "Saúde", cstIcms: "40", cstPis: "07", cstCofins: "07", aliqIcms: 0, aliqPis: 0, aliqCofins: 0 },
    { desc: "VITAMINA C 1G EFERVESCENTE", ncm: "2106.90.30", cest: "", grupo: "Suplementos", dept: "Saúde", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "RAÇÃO CÃO ADULTO 15KG", ncm: "2309.10.00", cest: "", grupo: "Pet", dept: "Pet Shop", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 12, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "AREIA HIGIÊNICA GATOS 4KG", ncm: "6815.99.90", cest: "", grupo: "Pet", dept: "Pet Shop", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "CADERNO UNIVERSITÁRIO 200FL", ncm: "4820.20.00", cest: "", grupo: "Papelaria", dept: "Escritório", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
    { desc: "CANETA ESFEROGRÁFICA AZUL", ncm: "9608.10.00", cest: "", grupo: "Papelaria", dept: "Escritório", cstIcms: "00", cstPis: "01", cstCofins: "01", aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6 },
  ];

  return seeds.map((s, i) => ({
    id: crypto.randomUUID(),
    codigo: String(1001 + i),
    barras: `789${String(1001 + i).padStart(10, "0")}`,
    descricao: s.desc,
    ncm: s.ncm,
    cest: s.cest,
    grupo: s.grupo,
    subgrupo: "",
    departamento: s.dept,
    familia: "",
    subfamilia: "",
    categoria: "",
    origemMercadoria: "0",
    cstIcms: s.cstIcms,
    cstPis: s.cstPis,
    cstCofins: s.cstCofins,
    aliqIcms: s.aliqIcms,
    aliqPis: s.aliqPis,
    aliqCofins: s.aliqCofins,
    aliqIpi: 0,
    cfopInterno: "5102",
    cfopExterno: "6102",
    custoAquisicao: Math.round(Math.random() * 100 * 100) / 100,
    custoReposicao: 0,
    mva: 0,
    venda: Math.round(Math.random() * 200 * 100) / 100,
    margemBruta: 0,
    margemLiquida: 0,
    sugestaoVenda: 0,
    estoque: Math.floor(Math.random() * 500),
    unidade: "UN",
    desdobramentos: [],
    grupoPrecos: [],
    etiquetaDescricao: s.desc,
    rateio: 0,
    normaProcom: "",
    auditoriaCorrigida: false,
    ativo: true,
  }));
}

function loadProdutos(): Produto[] {
  try {
    const stored = localStorage.getItem("produtos");
    const prods = stored ? JSON.parse(stored) : [];
    if (prods.length === 0) {
      const seeded = seedProdutos();
      saveProdutos(seeded);
      return seeded;
    }
    return prods;
  } catch {
    return [];
  }
}

function saveProdutos(produtos: Produto[]) {
  localStorage.setItem("produtos", JSON.stringify(produtos));
}

function auditarProduto(p: Produto): ProdutoAuditado {
  const ncmBase = ncmCestMvaData.find(n => n.ncm === p.ncm || n.ncm.replace(/\./g, "") === p.ncm.replace(/\./g, ""));
  const divergencias: string[] = [];
  let status: "ok" | "alerta" | "erro" = "ok";

  const cestSugerido = ncmBase?.cest || p.cest;
  const ncmSugerido = ncmBase?.ncm || p.ncm;

  // Check CEST
  if (!p.cest && ncmBase?.cest) {
    divergencias.push("CEST ausente — deveria ser " + ncmBase.cest);
    status = "erro";
  } else if (p.cest && ncmBase?.cest && p.cest !== ncmBase.cest) {
    divergencias.push(`CEST divergente: atual=${p.cest}, esperado=${ncmBase.cest}`);
    status = "erro";
  }

  // Check NCM format
  if (p.ncm && !p.ncm.includes(".") && p.ncm.length === 8) {
    divergencias.push("NCM sem formatação de pontos");
    if (status === "ok") status = "alerta";
  }

  // Validate origin vs NCM compatibility (Ajuste SINIEF 20/2012)
  const origemEstrangeira = ["1", "2", "6", "7"].includes(p.origemMercadoria);
  const origemNacional = ["0", "3", "4", "5", "8"].includes(p.origemMercadoria);
  const ncmClean = p.ncm.replace(/\./g, "");

  // NCMs starting with 00 are services (not goods) — skip origin validation
  if (ncmClean && !ncmClean.startsWith("00")) {
    // Chapters 84-85 (machines/electronics) with foreign origin should use CFOP de importação
    if (origemEstrangeira && p.cfopInterno && p.cfopInterno.startsWith("5") && !p.cfopInterno.startsWith("5") === false) {
      // Basic: foreign goods typically need import-related CFOPs
    }

    // Validate: if origin is foreign (1,2,6,7), the product should NOT have typical national-only NCMs
    // Chapters 01-24 (agriculture/food) with foreign origin and no CEST may indicate misclassification
    if (origemEstrangeira && p.cstIcms === "60") {
      // ST with foreign goods is unusual for certain NCMs
      const chapterNum = parseInt(ncmClean.substring(0, 2));
      if (chapterNum >= 1 && chapterNum <= 24 && !p.cest) {
        divergencias.push("Origem estrangeira com CST 60 (ST) e sem CEST — verificar classificação");
        if (status === "ok") status = "alerta";
      }
    }

    // Validate: national origin (0) with NCM chapters that are commonly imported (e.g., 27xx petroleum)
    // This is informational only
    if (p.origemMercadoria === "0") {
      const importChapters = ["8517", "8471", "8473", "8528", "8521"]; // electronics typically imported
      const ncmPrefix = ncmClean.substring(0, 4);
      if (importChapters.includes(ncmPrefix) && p.origemMercadoria === "0") {
        // Common but worth flagging as info
        divergencias.push("NCM de produto frequentemente importado com origem 0 (Nacional) — confirme a origem");
        if (status === "ok") status = "alerta";
      }
    }

    // Validate: origin code not set or invalid
    if (!p.origemMercadoria && p.origemMercadoria !== "0") {
      divergencias.push("Código de origem da mercadoria não informado (Tabela A — SINIEF 20/2012)");
      status = "erro";
    }
  }

  // Suggest CSTs based on NCM segment
  let cstIcmsSugerido = p.cstIcms;
  let cstPisSugerido = p.cstPis;
  let cstCofinsSugerido = p.cstCofins;
  let cstIpiSugerido = "50";
  let cstIbsSugerido = "000";
  let cstCbsSugerido = "000";
  let cClassTribSugerido = "00";

  // Basic heuristic: if product has MVA, it likely has ICMS-ST
  if (ncmBase && ncmBase.mvaOriginal > 0 && p.cstIcms === "00") {
    cstIcmsSugerido = "10";
    divergencias.push("CST ICMS deve considerar ST (MVA encontrada)");
    status = "erro";
  }

  // Check if product looks like cesta básica (alimentos básicos)
  if (p.ncm.startsWith("1006") || p.ncm.startsWith("1001") || p.ncm.startsWith("0402")) {
    cstPisSugerido = "06";
    cstCofinsSugerido = "06";
    cstIpiSugerido = "53";
    cstIbsSugerido = "041";
    cstCbsSugerido = "041";
    cClassTribSugerido = "04";
    if (p.cstPis !== "06") {
      divergencias.push("PIS/COFINS deveria ser alíquota zero (cesta básica)");
      status = "erro";
    }
  }

  // Medicamentos
  if (p.ncm.startsWith("3004") || p.ncm.startsWith("3003")) {
    cstPisSugerido = "04";
    cstCofinsSugerido = "04";
    cstIcmsSugerido = "60";
    cstIpiSugerido = "53";
    cstIbsSugerido = "042";
    cstCbsSugerido = "042";
    cClassTribSugerido = "04";
    if (p.cstIcms !== "60") {
      divergencias.push("CST ICMS deve ser 60 (ST medicamentos)");
      status = "erro";
    }
  }

  // Combustíveis
  if (p.ncm.startsWith("2710") || p.ncm.startsWith("2711")) {
    cClassTribSugerido = "05";
    cstIbsSugerido = "020";
    cstCbsSugerido = "020";
  }

  // Bebidas alcoólicas / refrigerantes
  if (p.ncm.startsWith("2203") || p.ncm.startsWith("2202") || p.ncm.startsWith("2208")) {
    cClassTribSugerido = "05";
    cstIbsSugerido = "030";
    cstCbsSugerido = "030";
  }

  return {
    produtoId: p.id,
    codigo: p.codigo,
    descricao: p.descricao,
    grupo: p.grupo || "",
    departamento: p.departamento || "",
    ncmAtual: p.ncm,
    ncmSugerido,
    cestAtual: p.cest,
    cestSugerido,
    cstIcms: p.cstIcms,
    cstIcmsSugerido,
    cstPis: p.cstPis,
    cstPisSugerido,
    cstCofins: p.cstCofins,
    cstCofinsSugerido,
    cstIpi: "50",
    cstIpiSugerido,
    cstIbs: "",
    cstIbsSugerido,
    cstCbs: "",
    cstCbsSugerido,
    cClassTrib: "",
    cClassTribSugerido,
    aliqIcms: ["30","40","41","60"].includes(cstIcmsSugerido) ? 0 : p.aliqIcms,
    aliqIcmsSt: 0,
    mvaOriginal: ncmBase?.mvaOriginal || p.mva || 0,
    aliqPis: ["04","06","07","08","09"].includes(cstPisSugerido) ? 0 : p.aliqPis,
    aliqCofins: ["04","06","07","08","09"].includes(cstCofinsSugerido) ? 0 : p.aliqCofins,
    aliqIpi: p.aliqIpi,
    aliqIbs: 0,
    aliqCbs: 0,
    aliqIs: 0,
    status: divergencias.length === 0 ? "ok" : status,
    divergencias,
    auditoriaCorrigida: p.auditoriaCorrigida || false,
    auditoriaData: p.auditoriaData,
    camposCorrigidos: p.camposCorrigidos || [],
  };
}

const AuditoriaFiscal = () => {
  const { user } = useAuth();
  const nomeUsuario = user?.nome || "Operador";

  // Read query param filter from Dashboard drill-down
  const searchParams = new URLSearchParams(window.location.search);
  const filtroInicial = searchParams.get("filtro") || "";

  const [produtos, setProdutos] = useState<ProdutoAuditado[]>(() => {
    const prods = loadProdutos();
    return prods.map(auditarProduto);
  });
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>(() => {
    if (filtroInicial) return "erro";
    return "todos";
  });
  const [filtroDivergencia, setFiltroDivergencia] = useState<string>(() => filtroInicial || "");
  const [filtroAuditado, setFiltroAuditado] = useState<string>("todos");
  const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");
  const [filtroDepartamento, setFiltroDepartamento] = useState<string>("todos");
  const [filtrosIsencao, setFiltrosIsencao] = useState<string[]>(() => {
    if (filtroInicial === "pis_cofins") return ["monofasica", "aliquota_zero", "isenta", "sem_incidencia", "suspensao", "tributada"];
    return [];
  });
  const [tabAtiva, setTabAtiva] = useState("visao-geral");
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoAuditado | null>(null);
  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [modalXml, setModalXml] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined);
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined);
  const [modalConfirmLote, setModalConfirmLote] = useState(false);
  const [modalConfirmAudit, setModalConfirmAudit] = useState(false);
  const [modalEscolherAuditoria, setModalEscolherAuditoria] = useState(false);
  const [pendingAuditAction, setPendingAuditAction] = useState<{ label: string; produtos: ProdutoAuditado[] } | null>(null);
  const [historico, setHistorico] = useState<HistoricoAuditoria[]>(loadHistorico);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [filtroTipoHist, setFiltroTipoHist] = useState<string>("todos");
  const [filtroUsuarioHist, setFiltroUsuarioHist] = useState<string>("todos");
  const [undoSnapshot, setUndoSnapshot] = useState<{ label: string; produtos: Produto[] } | null>(null);
  const [ultimoResumoCorrecao, setUltimoResumoCorrecao] = useState<ResumoCorrecao | null>(null);
  const [ultimosCorrigidosIds, setUltimosCorrigidosIds] = useState<Set<string>>(new Set());
  const [filtroUltimaAuditoria, setFiltroUltimaAuditoria] = useState(false);

  const recarregarProdutos = useCallback(() => {
    const prods = loadProdutos();
    setProdutos(prods.map(auditarProduto));
    toast.success(`${prods.length} produtos carregados do cadastro!`);
  }, []);

  const filtrados = useMemo(() => {
    return produtos.filter(p => {
      if (filtroUltimaAuditoria && !ultimosCorrigidosIds.has(p.produtoId)) return false;
      if (filtroStatus !== "todos" && p.status !== filtroStatus) return false;
      if (filtroAuditado === "sim" && !p.auditoriaCorrigida) return false;
      if (filtroAuditado === "nao" && (p.auditoriaCorrigida || p.status === "ok")) return false;
      if (filtroAuditado === "conforme" && (p.status !== "ok" || p.auditoriaCorrigida)) return false;
      if (filtroGrupo !== "todos" && p.grupo !== filtroGrupo) return false;
      if (filtroDepartamento !== "todos" && p.departamento !== filtroDepartamento) return false;
      if (filtroDivergencia) {
        const divText = p.divergencias.join(" ").toLowerCase();
        if (filtroDivergencia === "ncm" && !divText.includes("ncm")) return false;
        if (filtroDivergencia === "cst" && !divText.includes("cst")) return false;
        if (filtroDivergencia === "icms" && !divText.includes("icms")) return false;
        if (filtroDivergencia === "outros" && (divText.includes("ncm") || divText.includes("cst") || divText.includes("icms"))) return false;
      }
      if (filtrosIsencao.length > 0) {
        const cstIsencaoMap: Record<string, string[]> = {
          monofasica: ["04"],
          aliquota_zero: ["06"],
          isenta: ["07"],
          sem_incidencia: ["08"],
          suspensao: ["09"],
          tributada: ["01", "02", "03"],
        };
        const allowedCsts = filtrosIsencao.flatMap(f => cstIsencaoMap[f] || []);
        if (!allowedCsts.includes(p.cstPisSugerido) && !allowedCsts.includes(p.cstCofinsSugerido)) return false;
      }
      if (busca) {
        const q = busca.toLowerCase();
        return p.codigo.includes(q) || p.descricao.toLowerCase().includes(q) || p.ncmAtual.includes(q);
      }
      return true;
    });
  }, [produtos, busca, filtroStatus, filtrosIsencao, filtroDivergencia, filtroAuditado, filtroGrupo, filtroDepartamento, filtroUltimaAuditoria, ultimosCorrigidosIds]);

  const grupos = useMemo(() => [...new Set(produtos.map(p => p.grupo).filter(Boolean))].sort(), [produtos]);
  const departamentos = useMemo(() => [...new Set(produtos.map(p => p.departamento).filter(Boolean))].sort(), [produtos]);

  const operacoesAuditoriaEmLote = useMemo(() => {
    const operacoes: Array<{ secao: string; label: string; produtos: ProdutoAuditado[]; pendentes: number }> = [];

    const adicionarOperacao = (secao: string, label: string, lista: ProdutoAuditado[]) => {
      const pendentes = lista.filter(p => p.status !== "ok").length;
      if (pendentes > 0) operacoes.push({ secao, label, produtos: lista, pendentes });
    };

    adicionarOperacao("Geral", "Todos os produtos", produtos);
    adicionarOperacao("Geral", "Produtos filtrados", filtrados);

    grupos.forEach((g) => {
      adicionarOperacao("Por grupo", `Grupo: ${g}`, produtos.filter(p => p.grupo === g));
    });

    departamentos.forEach((d) => {
      adicionarOperacao("Por departamento", `Departamento: ${d}`, produtos.filter(p => p.departamento === d));
    });

    adicionarOperacao("Por tributação", "CST ICMS divergente", produtos.filter(p => p.cstIcms !== p.cstIcmsSugerido));
    adicionarOperacao("Por tributação", "CST PIS/COFINS divergente", produtos.filter(p => p.cstPis !== p.cstPisSugerido || p.cstCofins !== p.cstCofinsSugerido));
    adicionarOperacao("Por tributação", "NCM/CEST divergente", produtos.filter(p => p.ncmAtual !== p.ncmSugerido || p.cestAtual !== p.cestSugerido));

    return operacoes;
  }, [produtos, filtrados, grupos, departamentos]);

  const stats = useMemo(() => ({
    total: produtos.length,
    ok: produtos.filter(p => p.status === "ok").length,
    alerta: produtos.filter(p => p.status === "alerta").length,
    erro: produtos.filter(p => p.status === "erro").length,
    corrigidos: produtos.filter(p => p.auditoriaCorrigida).length,
  }), [produtos]);

  const percentCorrigido = useMemo(() => {
    const comDivergencia = produtos.filter(p => p.status !== "ok").length;
    if (comDivergencia === 0) return 100;
    return Math.round((stats.corrigidos / (comDivergencia || 1)) * 100);
  }, [produtos, stats.corrigidos]);

  const produtosGrafico = useMemo(() => {
    if (!dataInicio && !dataFim) return produtos;
    return produtos.filter(p => {
      if (!p.auditoriaData) return false;
      const d = new Date(p.auditoriaData);
      if (dataInicio && d < dataInicio) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (d > fim) return false;
      }
      return true;
    });
  }, [produtos, dataInicio, dataFim]);

  const statsIsencao = useMemo(() => {
    const map: Record<string, { label: string; csts: string[]; count: number }> = {
      monofasica: { label: "Monofásica (04)", csts: ["04"], count: 0 },
      aliquota_zero: { label: "Alíq. Zero (06)", csts: ["06"], count: 0 },
      isenta: { label: "Isenta (07)", csts: ["07"], count: 0 },
      sem_incidencia: { label: "S/ Incidência (08)", csts: ["08"], count: 0 },
      suspensao: { label: "Suspensão (09)", csts: ["09"], count: 0 },
      tributada: { label: "Tributada (01-03)", csts: ["01", "02", "03"], count: 0 },
    };
    produtos.forEach(p => {
      for (const [, v] of Object.entries(map)) {
        if (v.csts.includes(p.cstPisSugerido) || v.csts.includes(p.cstCofinsSugerido)) {
          v.count++;
          break;
        }
      }
    });
    return Object.entries(map).map(([key, v]) => ({ key, label: v.label, count: v.count }));
  }, [produtos]);

  const statsCstPisComparativo = useMemo(() => {
    const cstMap: Record<string, { atual: number; sugerido: number }> = {};
    produtosGrafico.forEach(p => {
      const atual = p.cstPis || "—";
      const sugerido = p.cstPisSugerido || "—";
      if (!cstMap[atual]) cstMap[atual] = { atual: 0, sugerido: 0 };
      cstMap[atual].atual++;
      if (!cstMap[sugerido]) cstMap[sugerido] = { atual: 0, sugerido: 0 };
      cstMap[sugerido].sugerido++;
    });
    return Object.entries(cstMap)
      .map(([cst, v]) => ({ cst, atual: v.atual, sugerido: v.sugerido }))
      .sort((a, b) => a.cst.localeCompare(b.cst));
  }, [produtosGrafico]);

  const statsCstCofinsComparativo = useMemo(() => {
    const cstMap: Record<string, { atual: number; sugerido: number }> = {};
    produtosGrafico.forEach(p => {
      const atual = p.cstCofins || "—";
      const sugerido = p.cstCofinsSugerido || "—";
      if (!cstMap[atual]) cstMap[atual] = { atual: 0, sugerido: 0 };
      cstMap[atual].atual++;
      if (!cstMap[sugerido]) cstMap[sugerido] = { atual: 0, sugerido: 0 };
      cstMap[sugerido].sugerido++;
    });
    return Object.entries(cstMap)
      .map(([cst, v]) => ({ cst, atual: v.atual, sugerido: v.sugerido }))
      .sort((a, b) => a.cst.localeCompare(b.cst));
  }, [produtosGrafico]);

  const chartExportOptions: ExportOptions = useMemo(() => ({
    title: "Auditoria Fiscal — Dados dos Gráficos",
    subtitle: "Distribuição CST PIS/COFINS — Atual vs Sugerido",
    filename: "auditoria-graficos",
    columns: [
      { header: "Tipo", key: "tipo" },
      { header: "CST", key: "cst" },
      { header: "Qtd Atual", key: "atual", align: "right" as const },
      { header: "Qtd Sugerido", key: "sugerido", align: "right" as const },
    ],
    data: [
      ...statsCstPisComparativo.map(r => ({ tipo: "PIS", cst: r.cst, atual: r.atual, sugerido: r.sugerido })),
      ...statsCstCofinsComparativo.map(r => ({ tipo: "COFINS", cst: r.cst, atual: r.atual, sugerido: r.sugerido })),
    ],
    summaryRows: statsIsencao.filter(s => s.count > 0).map(s => ({ label: s.label, value: String(s.count) })),
  }), [statsCstPisComparativo, statsCstCofinsComparativo, statsIsencao]);

  const exportarDivergenciasPDF = useCallback(async () => {
    const pendentes = produtos.filter(p => p.status !== "ok" && !p.auditoriaCorrigida);
    if (pendentes.length === 0) {
      toast.info("Nenhuma divergência pendente para exportar.");
      return;
    }

    const headers = [
      { label: "Código", align: "left" as const },
      { label: "Descrição", align: "left" as const },
      { label: "Status", align: "center" as const },
      { label: "NCM Atual", align: "left" as const },
      { label: "NCM Sugerido", align: "left" as const },
      { label: "CST PIS", align: "center" as const },
      { label: "Sugerido", align: "center" as const },
      { label: "CST COFINS", align: "center" as const },
      { label: "Sugerido", align: "center" as const },
      { label: "Divergências", align: "left" as const },
    ];

    const rows = pendentes.map(p => ({
      cells: [
        p.codigo,
        p.descricao.substring(0, 30),
        p.status === "erro" ? "❌ ERRO" : "⚠️ ALERTA",
        p.ncmAtual,
        p.ncmAtual !== p.ncmSugerido ? `→ ${p.ncmSugerido}` : "—",
        p.cstPis,
        p.cstPis !== p.cstPisSugerido ? `→ ${p.cstPisSugerido}` : "—",
        p.cstCofins,
        p.cstCofins !== p.cstCofinsSugerido ? `→ ${p.cstCofinsSugerido}` : "—",
        p.divergencias.join("; ").substring(0, 60),
      ],
      className: p.status === "erro" ? "negative" : "",
    }));

    const content = buildPrintTable(headers, rows);
    const summaryHtml = `
      <div class="info-grid">
        <div class="info-box"><div class="label">Total Pendentes</div><div class="value">${pendentes.length}</div></div>
        <div class="info-box"><div class="label">Erros Críticos</div><div class="value negative">${pendentes.filter(p => p.status === "erro").length}</div></div>
        <div class="info-box"><div class="label">Alertas</div><div class="value" style="color:#d97706">${pendentes.filter(p => p.status === "alerta").length}</div></div>
        <div class="info-box"><div class="label">Progresso Geral</div><div class="value">${percentCorrigido}%</div></div>
      </div>`;

    await printPDF({
      title: "Relatório de Divergências Pendentes",
      subtitle: `${pendentes.length} produto(s) com divergência não corrigida — Auditoria Fiscal`,
      content: summaryHtml + content,
      extraStyles: `
        .negative td { color: #dc2626; }
        tr:nth-child(even) { background: #fafafa; }
      `,
    });
    toast.success("Relatório PDF de divergências gerado!");
  }, [produtos, percentCorrigido]);

  const calcularCamposCorrigidos = (p: ProdutoAuditado): string[] => {
    const campos: string[] = [];
    if (p.ncmAtual !== p.ncmSugerido) campos.push("NCM");
    if ((p.cestAtual || "") !== (p.cestSugerido || "")) campos.push("CEST");
    if (p.cstIcms !== p.cstIcmsSugerido) campos.push("CST ICMS");
    if (p.cstPis !== p.cstPisSugerido) campos.push("CST PIS");
    if (p.cstCofins !== p.cstCofinsSugerido) campos.push("CST COFINS");
    return campos;
  };

  const salvarCorrecaoNoCadastro = useCallback((auditado: ProdutoAuditado, campos?: string[]) => {
    const allProdutos = loadProdutos();
    const updated = allProdutos.map(p => {
      if (p.id !== auditado.produtoId) return p;
      return {
        ...p,
        ncm: auditado.ncmSugerido,
        cest: auditado.cestSugerido,
        cstIcms: auditado.cstIcmsSugerido,
        cstPis: auditado.cstPisSugerido,
        cstCofins: auditado.cstCofinsSugerido,
        mva: auditado.mvaOriginal,
        auditoriaCorrigida: true,
        auditoriaData: new Date().toISOString(),
        camposCorrigidos: campos || auditado.camposCorrigidos,
      };
    });
    saveProdutos(updated);
  }, []);

  const aplicarCorrecao = (produtoId: string) => {
    setProdutos(prev => prev.map(p => {
      if (p.produtoId !== produtoId) return p;
      const campos = calcularCamposCorrigidos(p);
      const corrigido = {
        ...p,
        ncmAtual: p.ncmSugerido,
        cestAtual: p.cestSugerido,
        cstIcms: p.cstIcmsSugerido,
        cstPis: p.cstPisSugerido,
        cstCofins: p.cstCofinsSugerido,
        cstIpi: p.cstIpiSugerido,
        cstIbs: p.cstIbsSugerido,
        cstCbs: p.cstCbsSugerido,
        cClassTrib: p.cClassTribSugerido,
        status: "ok" as const,
        divergencias: [],
        auditoriaCorrigida: true,
        camposCorrigidos: campos,
      };
      salvarCorrecaoNoCadastro(corrigido, campos);
      return corrigido;
    }));
    addHistorico({ tipo: "correcao_individual", usuario: nomeUsuario, quantidadeProdutos: 1, detalhes: `Produto ${produtoSelecionado?.codigo || produtoId} corrigido manualmente` });
    setHistorico(loadHistorico());
    toast.success("Correção aplicada e salva no cadastro de produtos!");
  };

  // Notificação automática quando 100% corrigido
  const prevPercentRef = useRef(percentCorrigido);
  useEffect(() => {
    if (percentCorrigido === 100 && prevPercentRef.current < 100 && produtos.length > 0) {
      toast.success("🎉 Todas as divergências foram corrigidas!", {
        description: `${stats.corrigidos} produto(s) auditados com sucesso. A base fiscal está 100% conforme.`,
        duration: 8000,
      });
    }
    prevPercentRef.current = percentCorrigido;
  }, [percentCorrigido, produtos.length, stats.corrigidos]);

  // Salvar snapshot antes de operações em lote para permitir desfazer
  const salvarSnapshotUndo = useCallback((label: string) => {
    const snapshot = loadProdutos();
    setUndoSnapshot({ label, produtos: snapshot });
  }, []);

  const montarResumoCorrecao = (titulo: string, itens: ProdutoAuditado[], snapshotAntes?: { erros: number; alertas: number; conformes: number; auditados: number }): ResumoCorrecao => {
    const contadores = {
      ncm: 0, cest: 0, cstIcms: 0, cstPis: 0, cstCofins: 0, cstIpi: 0, cstIbsCbs: 0, cClassTrib: 0,
    };

    itens.forEach((p) => {
      if (p.ncmAtual !== p.ncmSugerido) contadores.ncm++;
      if ((p.cestAtual || "") !== (p.cestSugerido || "")) contadores.cest++;
      if (p.cstIcms !== p.cstIcmsSugerido) contadores.cstIcms++;
      if (p.cstPis !== p.cstPisSugerido) contadores.cstPis++;
      if (p.cstCofins !== p.cstCofinsSugerido) contadores.cstCofins++;
      if (p.cstIpi !== p.cstIpiSugerido) contadores.cstIpi++;
      if (p.cstIbs !== p.cstIbsSugerido || p.cstCbs !== p.cstCbsSugerido) contadores.cstIbsCbs++;
      if (p.cClassTrib !== p.cClassTribSugerido) contadores.cClassTrib++;
    });

    const pendentesCorrigidos = itens.length;

    return {
      titulo,
      data: new Date().toISOString(),
      totalProdutos: pendentesCorrigidos,
      campos: [
        { campo: "NCM", quantidade: contadores.ncm },
        { campo: "CEST", quantidade: contadores.cest },
        { campo: "CST ICMS", quantidade: contadores.cstIcms },
        { campo: "CST PIS", quantidade: contadores.cstPis },
        { campo: "CST COFINS", quantidade: contadores.cstCofins },
        { campo: "CST IPI", quantidade: contadores.cstIpi },
        { campo: "CST IBS/CBS", quantidade: contadores.cstIbsCbs },
        { campo: "cClassTrib", quantidade: contadores.cClassTrib },
      ].filter((item) => item.quantidade > 0),
      antesDepois: snapshotAntes ? {
        errosAntes: snapshotAntes.erros,
        errosDepois: Math.max(0, snapshotAntes.erros - pendentesCorrigidos),
        alertasAntes: snapshotAntes.alertas,
        alertasDepois: snapshotAntes.alertas,
        conformesAntes: snapshotAntes.conformes,
        conformesDepois: snapshotAntes.conformes + pendentesCorrigidos,
        auditadosAntes: snapshotAntes.auditados,
        auditadosDepois: snapshotAntes.auditados + pendentesCorrigidos,
      } : undefined,
    };
  };

  const resumoParaTextoHistorico = (resumo: ResumoCorrecao) => {
    const textoCampos = resumo.campos.length > 0
      ? resumo.campos.map(c => `${c.campo}: ${c.quantidade}`).join(" | ")
      : "Sem campos alterados";

    return `${resumo.titulo} — ${resumo.totalProdutos} produto(s) | ${textoCampos}`;
  };

  const desfazerUltimaAuditoria = useCallback(() => {
    if (!undoSnapshot) return;
    saveProdutos(undoSnapshot.produtos);
    setProdutos(undoSnapshot.produtos.map(auditarProduto));
    addHistorico({ tipo: "correcao_total", usuario: nomeUsuario, quantidadeProdutos: undoSnapshot.produtos.length, detalhes: `Desfeita a última auditoria em lote: "${undoSnapshot.label}"` });
    setHistorico(loadHistorico());
    setUltimoResumoCorrecao(null);
    setUltimosCorrigidosIds(new Set());
    setFiltroUltimaAuditoria(false);
    toast.success(`Auditoria "${undoSnapshot.label}" desfeita com sucesso!`);
    setUndoSnapshot(null);
  }, [undoSnapshot, nomeUsuario]);

  // Correção em lote apenas CST PIS/COFINS
  const aplicarCorrecaoLotePisCofins = useCallback(() => {
    const pendentes = produtos.filter(p => p.cstPis !== p.cstPisSugerido || p.cstCofins !== p.cstCofinsSugerido);
    if (pendentes.length === 0) {
      toast.info("Nenhuma divergência de CST PIS/COFINS encontrada.");
      return;
    }

    const titulo = `CST PIS/COFINS em lote (${pendentes.length} produtos)`;
    salvarSnapshotUndo(titulo);

    const resumo: ResumoCorrecao = {
      titulo,
      data: new Date().toISOString(),
      totalProdutos: pendentes.length,
      campos: [
        { campo: "CST PIS", quantidade: pendentes.filter(p => p.cstPis !== p.cstPisSugerido).length },
        { campo: "CST COFINS", quantidade: pendentes.filter(p => p.cstCofins !== p.cstCofinsSugerido).length },
      ].filter(c => c.quantidade > 0),
      antesDepois: {
        errosAntes: stats.erro,
        errosDepois: Math.max(0, stats.erro - pendentes.length),
        alertasAntes: stats.alerta,
        alertasDepois: stats.alerta,
        conformesAntes: stats.ok,
        conformesDepois: stats.ok + pendentes.length,
        auditadosAntes: stats.corrigidos,
        auditadosDepois: stats.corrigidos + pendentes.length,
      },
    };

    const allProdutos = loadProdutos();
    const corrigidosIds = new Set<string>();
    pendentes.forEach(a => {
      const p = allProdutos.find(pr => pr.id === a.produtoId);
      if (p) {
        const campos: string[] = [];
        if (p.cstPis !== a.cstPisSugerido) campos.push("CST PIS");
        if (p.cstCofins !== a.cstCofinsSugerido) campos.push("CST COFINS");
        p.cstPis = a.cstPisSugerido;
        p.cstCofins = a.cstCofinsSugerido;
        p.auditoriaCorrigida = true;
        p.auditoriaData = new Date().toISOString();
        p.camposCorrigidos = campos;
        corrigidosIds.add(a.produtoId);
      }
    });
    saveProdutos(allProdutos);

    setProdutos(prev => prev.map(p => {
      if (p.cstPis === p.cstPisSugerido && p.cstCofins === p.cstCofinsSugerido) return p;
      const campos: string[] = [];
      if (p.cstPis !== p.cstPisSugerido) campos.push("CST PIS");
      if (p.cstCofins !== p.cstCofinsSugerido) campos.push("CST COFINS");
      const updated = { ...p, cstPis: p.cstPisSugerido, cstCofins: p.cstCofinsSugerido, auditoriaCorrigida: true, camposCorrigidos: campos };
      const remainingDiv = p.divergencias.filter(d => !d.includes("PIS") && !d.includes("COFINS") && !d.includes("cesta básica"));
      if (remainingDiv.length === 0 && p.ncmAtual === p.ncmSugerido && p.cestAtual === p.cestSugerido && p.cstIcms === p.cstIcmsSugerido) {
        return { ...updated, status: "ok" as const, divergencias: [] };
      }
      return { ...updated, divergencias: remainingDiv };
    }));

    setUltimosCorrigidosIds(corrigidosIds);
    setUltimoResumoCorrecao(resumo);
    addHistorico({
      tipo: "lote_pis_cofins",
      usuario: nomeUsuario,
      quantidadeProdutos: pendentes.length,
      detalhes: resumoParaTextoHistorico(resumo),
    });
    setHistorico(loadHistorico());
    toast.success(`CST PIS/COFINS corrigido em ${pendentes.length} produto(s)!`);
    setModalConfirmLote(false);
  }, [produtos, salvarSnapshotUndo, nomeUsuario]);

  const aplicarCorrecoesFiltradas = useCallback((produtosFiltrados: ProdutoAuditado[], label = "Auditoria em lote") => {
    const pendentes = produtosFiltrados.filter(p => p.status !== "ok");
    if (pendentes.length === 0) {
      toast.info("Nenhuma divergência encontrada nos produtos selecionados.");
      return;
    }

    const titulo = `${label} (${pendentes.length} produtos)`;
    const snapshotAntes = { erros: stats.erro, alertas: stats.alerta, conformes: stats.ok, auditados: stats.corrigidos };
    const resumo = montarResumoCorrecao(titulo, pendentes, snapshotAntes);
    salvarSnapshotUndo(titulo);

    const allProdutos = loadProdutos();
    const camposMap = new Map<string, string[]>();
    pendentes.forEach(a => {
      const campos = calcularCamposCorrigidos(a);
      camposMap.set(a.produtoId, campos);
      const p = allProdutos.find(pr => pr.id === a.produtoId);
      if (p) {
        p.ncm = a.ncmSugerido;
        p.cest = a.cestSugerido;
        p.cstIcms = a.cstIcmsSugerido;
        p.cstPis = a.cstPisSugerido;
        p.cstCofins = a.cstCofinsSugerido;
        p.mva = a.mvaOriginal;
        p.auditoriaCorrigida = true;
        p.auditoriaData = new Date().toISOString();
        p.camposCorrigidos = campos;
      }
    });
    saveProdutos(allProdutos);

    const pendentesIds = new Set(pendentes.map(p => p.produtoId));
    setProdutos(prev => prev.map(p => {
      if (!pendentesIds.has(p.produtoId)) return p;
      return {
        ...p,
        ncmAtual: p.ncmSugerido,
        cestAtual: p.cestSugerido,
        cstIcms: p.cstIcmsSugerido,
        cstPis: p.cstPisSugerido,
        cstCofins: p.cstCofinsSugerido,
        cstIpi: p.cstIpiSugerido,
        cstIbs: p.cstIbsSugerido,
        cstCbs: p.cstCbsSugerido,
        cClassTrib: p.cClassTribSugerido,
        status: "ok" as const,
        divergencias: [],
        auditoriaCorrigida: true,
        camposCorrigidos: camposMap.get(p.produtoId) || [],
      };
    }));

    setUltimosCorrigidosIds(pendentesIds);
    setUltimoResumoCorrecao(resumo);
    addHistorico({
      tipo: "correcao_total",
      usuario: nomeUsuario,
      quantidadeProdutos: pendentes.length,
      detalhes: resumoParaTextoHistorico(resumo),
    });
    setHistorico(loadHistorico());
    toast.success(`${pendentes.length} produto(s) corrigidos e salvos!`);
  }, [nomeUsuario, salvarSnapshotUndo]);

  const solicitarAuditoria = (label: string, produtosFiltrados: ProdutoAuditado[]) => {
    const pendentes = produtosFiltrados.filter(p => p.status !== "ok");
    if (pendentes.length === 0) {
      toast.info("Nenhuma divergência encontrada nos produtos selecionados.");
      return;
    }
    setModalEscolherAuditoria(false);
    setPendingAuditAction({ label, produtos: produtosFiltrados });
    setTimeout(() => setModalConfirmAudit(true), 100);
  };

  const confirmarAuditoria = () => {
    if (pendingAuditAction) {
      aplicarCorrecoesFiltradas(pendingAuditAction.produtos, pendingAuditAction.label);
    }
    setModalConfirmAudit(false);
    setPendingAuditAction(null);
  };

  const handleImportarXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const xmlText = ev.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");
        const dets = doc.querySelectorAll("det");
        if (dets.length === 0) {
          toast.error("Nenhum produto encontrado no XML");
          return;
        }

        const allProdutos = loadProdutos();
        let novos = 0;
        let atualizados = 0;

        dets.forEach((det) => {
          const prod = det.querySelector("prod");
          const imposto = det.querySelector("imposto");
          if (!prod) return;

          const ncmRaw = prod.querySelector("NCM")?.textContent || "";
          const cest = prod.querySelector("CEST")?.textContent || "";
          const descricao = prod.querySelector("xProd")?.textContent || "";
          const codigo = prod.querySelector("cProd")?.textContent || "";
          const ncmFormatado = ncmRaw.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3");

          const cstIcmsEl = imposto?.querySelector("ICMS")?.children[0];
          const cstIcms = cstIcmsEl?.querySelector("CST")?.textContent || cstIcmsEl?.querySelector("CSOSN")?.textContent || "";
          const cstPis = imposto?.querySelector("PIS")?.children[0]?.querySelector("CST")?.textContent || "";
          const cstCofins = imposto?.querySelector("COFINS")?.children[0]?.querySelector("CST")?.textContent || "";

          // Check if product exists by code
          const existing = allProdutos.find(p => p.codigo === codigo);
          if (existing) {
            existing.ncm = ncmFormatado || existing.ncm;
            existing.cest = cest || existing.cest;
            existing.cstIcms = cstIcms || existing.cstIcms;
            existing.cstPis = cstPis || existing.cstPis;
            existing.cstCofins = cstCofins || existing.cstCofins;
            existing.auditoriaCorrigida = false;
            atualizados++;
          } else {
            allProdutos.push({
              id: crypto.randomUUID(),
              codigo, barras: "", descricao,
              ncm: ncmFormatado || ncmRaw, cest,
              grupo: "", subgrupo: "", departamento: "", familia: "", subfamilia: "", categoria: "",
              origemMercadoria: "0", cstIcms, cstPis, cstCofins,
              aliqIcms: 18, aliqPis: 1.65, aliqCofins: 7.6, aliqIpi: 0,
              cfopInterno: "5102", cfopExterno: "6102",
              custoAquisicao: 0, custoReposicao: 0, mva: 0,
              venda: 0, margemBruta: 0, margemLiquida: 0, sugestaoVenda: 0,
              estoque: 0, unidade: "UN",
              desdobramentos: [], grupoPrecos: [],
              etiquetaDescricao: descricao.toUpperCase(), rateio: 0, normaProcom: "",
              auditoriaCorrigida: false, ativo: true,
            });
            novos++;
          }
        });

        saveProdutos(allProdutos);
        setProdutos(allProdutos.map(auditarProduto));
        toast.success(`XML importado! ${novos} novos, ${atualizados} atualizados`);
        setModalXml(false);
      } catch {
        toast.error("Erro ao processar o XML");
      }
    };
    reader.readAsText(file);
  };

  const cstPisDescricao: Record<string, string> = {
    "04": "Monofásica", "06": "Alíq. zero", "07": "Isenta", "08": "Sem incidência", "09": "Suspensão",
  };

  const exportOptions: ExportOptions = useMemo(() => ({
    title: "Auditoria Fiscal",
    subtitle: `${stats.total} produtos analisados — ${stats.erro} erros, ${stats.alerta} alertas, ${stats.ok} conformes`,
    filename: "auditoria-fiscal",
    columns: [
      { header: "Código", key: "codigo" },
      { header: "Descrição", key: "descricao" },
      { header: "NCM", key: "ncmAtual", format: (v, r) => r.ncmAtual !== r.ncmSugerido ? `${r.ncmAtual} → ${r.ncmSugerido}` : v },
      { header: "CEST", key: "cestAtual", format: (v, r) => r.cestAtual !== r.cestSugerido ? `${r.cestAtual || '(vazio)'} → ${r.cestSugerido}` : v || '-' },
      { header: "CST ICMS", key: "cstIcms", format: (v, r) => r.cstIcms !== r.cstIcmsSugerido ? `${r.cstIcms} → ${r.cstIcmsSugerido}` : v },
      { header: "CST PIS", key: "cstPis", format: (v, r) => {
        const desc = cstPisDescricao[r.cstPisSugerido] || "";
        const sug = r.cstPis !== r.cstPisSugerido ? ` → ${r.cstPisSugerido}` : "";
        return `${v}${sug}${desc ? ` (${desc})` : ""}`;
      }},
      { header: "CST COFINS", key: "cstCofins", format: (v, r) => {
        const desc = cstPisDescricao[r.cstCofinsSugerido] || "";
        const sug = r.cstCofins !== r.cstCofinsSugerido ? ` → ${r.cstCofinsSugerido}` : "";
        return `${v}${sug}${desc ? ` (${desc})` : ""}`;
      }},
      { header: "Alíq. PIS", key: "aliqPis", align: "right", format: (v) => `${v}%` },
      { header: "Alíq. COFINS", key: "aliqCofins", align: "right", format: (v) => `${v}%` },
      { header: "Status", key: "status", format: (v) => v === "ok" ? "✓ OK" : v === "alerta" ? "⚠ Alerta" : "✗ Erro" },
      { header: "Divergências", key: "divergencias", format: (v) => (v as string[]).join("; ") },
    ],
    data: filtrados,
    summaryRows: [
      { label: "Total", value: String(stats.total) },
      { label: "Conformes", value: String(stats.ok) },
      { label: "Alertas", value: String(stats.alerta) },
      { label: "Erros", value: String(stats.erro) },
      { label: "Auditados", value: String(stats.corrigidos) },
    ],
  }), [filtrados, stats]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
      case "alerta": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Alerta</Badge>;
      case "erro": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default: return null;
    }
  };

  const abrirDetalhe = (p: ProdutoAuditado) => {
    setProdutoSelecionado(p);
    setModalDetalhe(true);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Auditoria Fiscal"
        description="Análise e correção de NCM, CEST e tributação — correções são salvas diretamente no cadastro de produtos"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Produtos</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-emerald-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.ok}</div>
            <div className="text-xs text-muted-foreground">Conformes</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-amber-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.alerta}</div>
            <div className="text-xs text-muted-foreground">Alertas</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.erro}</div>
            <div className="text-xs text-muted-foreground">Erros</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.corrigidos}</div>
            <div className="text-xs text-muted-foreground">Já Auditados</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-3 space-y-2 text-xs">
          <p className="text-muted-foreground">
            <strong className="text-foreground">Legenda de auditoria:</strong> <strong>Auditado: Sim</strong> = corrigido pela auditoria; <strong>Conforme</strong> = já estava correto e não precisou ajuste; <strong>Não</strong> = divergência pendente.
          </p>
        </CardContent>
      </Card>

      {/* Resumo Visual Antes/Depois da Auditoria */}
      {ultimoResumoCorrecao && (
        <Card className="bg-card border-primary/30 overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              Resumo da Última Auditoria: {ultimoResumoCorrecao.titulo}
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {format(new Date(ultimoResumoCorrecao.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* Before/After Stats */}
            {ultimoResumoCorrecao.antesDepois && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Erros", antes: ultimoResumoCorrecao.antesDepois.errosAntes, depois: ultimoResumoCorrecao.antesDepois.errosDepois, corAntes: "text-destructive", corDepois: "text-emerald-400" },
                  { label: "Alertas", antes: ultimoResumoCorrecao.antesDepois.alertasAntes, depois: ultimoResumoCorrecao.antesDepois.alertasDepois, corAntes: "text-amber-400", corDepois: "text-amber-400" },
                  { label: "Conformes", antes: ultimoResumoCorrecao.antesDepois.conformesAntes, depois: ultimoResumoCorrecao.antesDepois.conformesDepois, corAntes: "text-muted-foreground", corDepois: "text-emerald-400" },
                  { label: "Auditados", antes: ultimoResumoCorrecao.antesDepois.auditadosAntes, depois: ultimoResumoCorrecao.antesDepois.auditadosDepois, corAntes: "text-muted-foreground", corDepois: "text-primary" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-muted/20 p-3 text-center space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{item.label}</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className={cn("text-lg font-bold", item.corAntes)}>{item.antes}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={cn("text-lg font-bold", item.corDepois)}>{item.depois}</span>
                    </div>
                    {item.antes !== item.depois && (
                      <p className="text-[10px] text-emerald-400 font-medium">
                        {item.depois < item.antes ? `−${item.antes - item.depois}` : `+${item.depois - item.antes}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Campos Corrigidos por Tipo */}
            {ultimoResumoCorrecao.campos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Campos corrigidos por tipo:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ultimoResumoCorrecao.campos.map((campo) => {
                    const percent = Math.round((campo.quantidade / ultimoResumoCorrecao.totalProdutos) * 100);
                    return (
                      <div key={campo.campo} className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-foreground">{campo.campo}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{campo.quantidade}</Badge>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground text-right">{percent}% dos produtos</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {ultimoResumoCorrecao.totalProdutos} produto(s) corrigidos
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats por Grupo e Departamento */}
      {produtos.length > 0 && (grupos.length > 0 || departamentos.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {grupos.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium">Produtos por Grupo</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="space-y-1.5">
                  {grupos.map(g => {
                    const total = produtos.filter(p => p.grupo === g).length;
                    const diverg = produtos.filter(p => p.grupo === g && p.status !== "ok").length;
                    return (
                      <div key={g} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[60%]">{g}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{total}</Badge>
                          {diverg > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{diverg} div.</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          {departamentos.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium">Produtos por Departamento</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <div className="space-y-1.5">
                  {departamentos.map(d => {
                    const total = produtos.filter(p => p.departamento === d).length;
                    const diverg = produtos.filter(p => p.departamento === d && p.status !== "ok").length;
                    return (
                      <div key={d} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[60%]">{d}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{total}</Badge>
                          {diverg > 0 && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">{diverg} div.</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Indicador de Progresso de Correções */}
      {produtos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <ShieldCheck size={16} className="text-primary" />
                      <span className="text-sm font-medium">Progresso de Correções</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1 p-3">
                    <p className="font-semibold mb-1">Detalhes das Pendências</p>
                    <p>🔴 Erros: {stats.erro} produto(s) com divergência crítica</p>
                    <p>🟡 Alertas: {stats.alerta} produto(s) com alerta</p>
                    <p>✅ Corrigidos: {stats.corrigidos} produto(s) já auditados</p>
                    <p>🟢 Conformes: {stats.ok} produto(s) sem divergência</p>
                    <hr className="border-border my-1" />
                    <p className="text-muted-foreground">Pendentes: {stats.erro + stats.alerta - stats.corrigidos > 0 ? stats.erro + stats.alerta - stats.corrigidos : 0} produto(s)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">{percentCorrigido}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => exportarDivergenciasPDF()}
                >
                  <FileText size={13} className="mr-1" /> Relatório Pendências
                </Button>
              </div>
            </div>
            <Progress value={percentCorrigido} className="h-3" />
            <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground">
              <span>{stats.corrigidos} corrigido(s)</span>
              <span>{produtos.filter(p => p.status !== "ok").length} com divergência(s)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico Evolução das Correções */}
      {historico.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History size={14} /> Evolução das Correções ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  const grouped: Record<string, { individual: number; lote: number; total: number }> = {};
                  historico.slice().reverse().forEach(h => {
                    const dia = format(new Date(h.data), "dd/MM");
                    if (!grouped[dia]) grouped[dia] = { individual: 0, lote: 0, total: 0 };
                    if (h.tipo === "correcao_individual") grouped[dia].individual += h.quantidadeProdutos;
                    else if (h.tipo === "lote_pis_cofins") grouped[dia].lote += h.quantidadeProdutos;
                    else grouped[dia].total += h.quantidadeProdutos;
                  });
                  return Object.entries(grouped).map(([dia, v]) => ({ dia, ...v }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                  <Legend />
                  <Line type="monotone" dataKey="individual" name="Individual" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="lote" name="Lote PIS/COFINS" stroke="hsl(var(--chart-2, 173 58% 39%))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="total" name="Correção Total" stroke="hsl(var(--chart-5, 27 87% 67%))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro por Período dos Gráficos */}
      {produtos.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Período dos gráficos:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left text-xs", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left text-xs", !dataFim && "text-muted-foreground")}>
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
              Limpar período
            </Button>
          )}
          {(dataInicio || dataFim) && (
            <Badge variant="secondary" className="text-xs">{produtosGrafico.length} produto(s) no período</Badge>
          )}
        </div>
      )}

      {/* Stats Isenção PIS/COFINS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {statsIsencao.map(s => (
          <Card
            key={s.key}
            className={cn(
              "bg-card border-border cursor-pointer transition-all hover:border-primary/50",
              filtrosIsencao.includes(s.key) && "border-primary ring-1 ring-primary/30"
            )}
            onClick={() => setFiltrosIsencao(prev =>
              prev.includes(s.key) ? prev.filter(v => v !== s.key) : [...prev, s.key]
            )}
          >
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-foreground">{s.count}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico Distribuição PIS/COFINS */}
      {produtos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon size={14} /> Distribuição por Tipo de Isenção PIS/COFINS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsIsencao.filter(s => s.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statsIsencao.filter(s => s.count > 0).map((_, i) => (
                      <Cell key={i} fill={[
                        "hsl(var(--primary))",
                        "hsl(var(--chart-2, 173 58% 39%))",
                        "hsl(var(--chart-3, 197 37% 24%))",
                        "hsl(var(--chart-4, 43 74% 66%))",
                        "hsl(var(--chart-5, 27 87% 67%))",
                        "hsl(var(--chart-1, 12 76% 61%))",
                      ][i % 6]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico Barras CST PIS Atual vs Sugerido */}
      {produtos.length > 0 && statsCstPisComparativo.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon size={14} /> CST PIS — Atual vs Sugerido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsCstPisComparativo} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="cst" tick={{ fontSize: 11 }} label={{ value: "CST", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                  <Legend />
                  <Bar dataKey="atual" name="Atual" fill="hsl(var(--chart-5, 27 87% 67%))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sugerido" name="Sugerido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico Barras CST COFINS Atual vs Sugerido */}
      {produtos.length > 0 && statsCstCofinsComparativo.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChartIcon size={14} /> CST COFINS — Atual vs Sugerido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsCstCofinsComparativo} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="cst" tick={{ fontSize: 11 }} label={{ value: "CST", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
                  />
                  <Legend />
                  <Bar dataKey="atual" name="Atual" fill="hsl(var(--chart-3, 197 37% 24%))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sugerido" name="Sugerido" fill="hsl(var(--chart-2, 173 58% 39%))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exportar dados dos gráficos */}
      {produtos.length > 0 && (
        <div className="flex justify-end">
          <ExportButtons options={chartExportOptions} inline />
        </div>
      )}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, descrição ou NCM..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ok">Conformes</SelectItem>
            <SelectItem value="alerta">Alertas</SelectItem>
            <SelectItem value="erro">Erros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroAuditado} onValueChange={setFiltroAuditado}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Auditado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sim">Auditado: Sim</SelectItem>
            <SelectItem value="nao">Auditado: Não</SelectItem>
            <SelectItem value="conforme">Conforme (já estava correto)</SelectItem>
          </SelectContent>
        </Select>
        {grupos.length > 0 && (
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grupo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Grupos</SelectItem>
              {grupos.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {departamentos.length > 0 && (
          <Select value={filtroDepartamento} onValueChange={setFiltroDepartamento}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Departamentos</SelectItem>
              {departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between text-sm">
              {filtrosIsencao.length === 0 ? "Todas isenções" : `${filtrosIsencao.length} selecionado(s)`}
              {filtrosIsencao.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{filtrosIsencao.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2" align="start">
            <div className="space-y-1">
              {[
                { value: "monofasica", label: "Monofásica (04)" },
                { value: "aliquota_zero", label: "Alíquota Zero (06)" },
                { value: "isenta", label: "Isenta (07)" },
                { value: "sem_incidencia", label: "Sem Incidência (08)" },
                { value: "suspensao", label: "Suspensão (09)" },
                { value: "tributada", label: "Tributada (01-03)" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm">
                  <Checkbox
                    checked={filtrosIsencao.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      setFiltrosIsencao(prev =>
                        checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value)
                      );
                    }}
                  />
                  {opt.label}
                </label>
              ))}
              {filtrosIsencao.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full text-xs mt-1" onClick={() => setFiltrosIsencao([])}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <Button variant="outline" onClick={recarregarProdutos}>
          <Search className="w-4 h-4 mr-2" />Recarregar
        </Button>
        <Button variant="outline" onClick={() => setModalXml(true)}>
          <FileUp className="w-4 h-4 mr-2" />Importar XML
        </Button>
        <ExportButtons options={exportOptions} />
        {produtos.some(p => p.cstPis !== p.cstPisSugerido || p.cstCofins !== p.cstCofinsSugerido) && (
          <Button variant="outline" onClick={() => setModalConfirmLote(true)} className="border-primary/50 text-primary hover:bg-primary/10">
            <Zap className="w-4 h-4 mr-2" />Corrigir CST PIS/COFINS ({produtos.filter(p => p.cstPis !== p.cstPisSugerido || p.cstCofins !== p.cstCofinsSugerido).length})
          </Button>
        )}

        {undoSnapshot && (
          <Button variant="outline" onClick={desfazerUltimaAuditoria} className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5">
            <Undo2 className="w-4 h-4" />
            Desfazer Última Auditoria
          </Button>
        )}

        <Button className="gap-1.5" onClick={() => setModalEscolherAuditoria(true)} disabled={operacoesAuditoriaEmLote.length === 0}>
          <ShieldCheck className="w-4 h-4" />
          Auditar Produtos
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        </Button>

        <Button variant="outline" onClick={() => setModalHistorico(true)}>
          <History className="w-4 h-4 mr-2" />Histórico
        </Button>

        {ultimosCorrigidosIds.size > 0 && (
          <Button
            variant={filtroUltimaAuditoria ? "default" : "outline"}
            onClick={() => setFiltroUltimaAuditoria(prev => !prev)}
            className="gap-1.5"
          >
            <Filter className="w-4 h-4" />
            {filtroUltimaAuditoria ? "Mostrando última auditoria" : `Última auditoria (${ultimosCorrigidosIds.size})`}
            {filtroUltimaAuditoria && (
              <XCircle className="w-3.5 h-3.5 ml-0.5" onClick={(e) => { e.stopPropagation(); setFiltroUltimaAuditoria(false); }} />
            )}
          </Button>
        )}
      </div>

      {filtroDivergencia && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-xs text-muted-foreground">Filtro ativo:</span>
          <Badge variant="secondary" className="gap-1.5 text-xs">
            <span className={cn("h-2 w-2 rounded-full inline-block", filtroDivergencia === "ncm" ? "bg-chart-1" : filtroDivergencia === "cst" ? "bg-chart-2" : filtroDivergencia === "icms" ? "bg-chart-3" : "bg-chart-4")} />
            {filtroDivergencia === "ncm" ? "NCM" : filtroDivergencia === "cst" ? "CST" : filtroDivergencia === "icms" ? "ICMS" : filtroDivergencia === "outros" ? "Outros" : filtroDivergencia.toUpperCase()}
            <button onClick={() => setFiltroDivergencia("")} className="ml-1 hover:text-destructive"><XCircle size={12} /></button>
          </Badge>
          <span className="text-xs text-muted-foreground">({filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""})</span>
        </div>
      )}

      <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg text-xs sm:text-sm">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="tributacao-atual">Tributos Atuais</TabsTrigger>
          <TabsTrigger value="reforma">Reforma Tributária</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral">
          <Card>
            <CardContent className="p-0">
              <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>CEST</TableHead>
                    <TableHead>CST ICMS</TableHead>
                    <TableHead>CST PIS/COF</TableHead>
                    <TableHead>Alíq. PIS/COF</TableHead>
                    <TableHead>Correções Aplicadas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {produtos.length === 0 ? "Nenhum produto no cadastro. Importe um XML ou cadastre produtos primeiro." : "Nenhum resultado para o filtro aplicado."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtrados.map(p => (
                    <TableRow key={p.produtoId} className={p.status === "erro" ? "bg-red-500/5" : p.status === "alerta" ? "bg-amber-500/5" : ""}>
                      <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{p.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.ncmAtual}
                        {p.ncmAtual !== p.ncmSugerido && (
                          <div className="text-emerald-400 text-[10px]">→ {p.ncmSugerido}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.cestAtual || <span className="text-red-400">vazio</span>}
                        {p.cestAtual !== p.cestSugerido && p.cestSugerido && (
                          <div className="text-emerald-400 text-[10px]">→ {p.cestSugerido}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.cstIcms}
                        {p.cstIcms !== p.cstIcmsSugerido && (
                          <div className="text-emerald-400 text-[10px]">→ {p.cstIcmsSugerido}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <span className={["04","06","07","08","09"].includes(p.cstPisSugerido) ? "text-warning" : ""}>{p.aliqPis}%</span>
                                {" / "}
                                <span className={["04","06","07","08","09"].includes(p.cstCofinsSugerido) ? "text-warning" : ""}>{p.aliqCofins}%</span>
                                {(["04","06","07","08","09"].includes(p.cstPisSugerido) || ["04","06","07","08","09"].includes(p.cstCofinsSugerido)) && (
                                  <div className="text-[10px] text-warning">Isento</div>
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <p className="font-semibold mb-1">PIS: CST {p.cstPisSugerido} — {{"04":"Monofásica revenda alíquota zero","06":"Alíquota zero","07":"Isenta","08":"Sem incidência","09":"Com suspensão"}[p.cstPisSugerido] || "Tributável"}</p>
                              <p className="font-semibold">COFINS: CST {p.cstCofinsSugerido} — {{"04":"Monofásica revenda alíquota zero","06":"Alíquota zero","07":"Isenta","08":"Sem incidência","09":"Com suspensão"}[p.cstCofinsSugerido] || "Tributável"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {p.auditoriaCorrigida && p.camposCorrigidos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.camposCorrigidos.map((campo) => (
                              <Badge key={campo} variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                {campo}
                              </Badge>
                            ))}
                          </div>
                        ) : p.auditoriaCorrigida ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                            <ShieldCheck className="w-3 h-3" />Corrigido
                          </Badge>
                        ) : p.status === "ok" ? (
                          <span className="text-[10px] text-muted-foreground">Já correto</span>
                        ) : (
                          <span className="text-[10px] text-destructive/70">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => abrirDetalhe(p)}>
                            <FileText className="w-3 h-3" />
                          </Button>
                          {p.status !== "ok" && (
                            <Button size="sm" variant="ghost" onClick={() => aplicarCorrecao(p.produtoId)} className="text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tributos Atuais */}
        <TabsContent value="tributacao-atual">
          <Card>
            <CardContent className="p-0">
              <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">ICMS</TableHead>
                    <TableHead className="text-center">MVA%</TableHead>
                    <TableHead className="text-center">PIS</TableHead>
                    <TableHead className="text-center">COFINS</TableHead>
                    <TableHead className="text-center">IPI</TableHead>
                    <TableHead className="text-center">CST ICMS</TableHead>
                    <TableHead>Auditado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(p => (
                    <TableRow key={p.produtoId}>
                      <TableCell className="max-w-[180px] truncate text-xs">{p.descricao}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{p.aliqIcms}%</TableCell>
                      <TableCell className="text-center font-mono text-xs">{p.mvaOriginal > 0 ? `${p.mvaOriginal}%` : "-"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{p.aliqPis}%</TableCell>
                      <TableCell className="text-center font-mono text-xs">{p.aliqCofins}%</TableCell>
                      <TableCell className="text-center font-mono text-xs">{p.aliqIpi > 0 ? `${p.aliqIpi}%` : "-"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {p.cstIcms}
                        {p.cstIcms !== p.cstIcmsSugerido && <span className="text-amber-400 ml-1">⚠</span>}
                      </TableCell>
                      <TableCell>
                        {p.auditoriaCorrigida ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Sim (corrigido)</Badge>
                        ) : p.status === "ok" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20 text-[10px]">Conforme (já correto)</Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive/70 border-destructive/30 text-[10px]">Não</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reforma Tributária */}
        <TabsContent value="reforma">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Cenários Reforma Tributária — IBS, CBS, IS + cClassTrib
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead className="text-center">cClassTrib</TableHead>
                    <TableHead className="text-center">CST IBS</TableHead>
                    <TableHead className="text-center">CST CBS</TableHead>
                    <TableHead className="text-center">Alíq. IBS</TableHead>
                    <TableHead className="text-center">Alíq. CBS</TableHead>
                    <TableHead className="text-center">Alíq. IS</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map(p => {
                    const cct = cClassTribData.find(c => c.codigo === p.cClassTribSugerido);
                    return (
                      <TableRow key={p.produtoId}>
                        <TableCell className="max-w-[180px] truncate text-xs">{p.descricao}</TableCell>
                        <TableCell className="font-mono text-xs">{p.ncmAtual}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {p.cClassTrib || "—"}
                            {p.cClassTrib !== p.cClassTribSugerido && (
                              <span className="text-emerald-400 ml-1">→{p.cClassTribSugerido}</span>
                            )}
                          </Badge>
                          {cct && <div className="text-[9px] text-muted-foreground mt-1 max-w-[150px] truncate">{cct.descricao.substring(0, 50)}</div>}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {p.cstIbs || "—"}
                          {p.cstIbs !== p.cstIbsSugerido && (
                            <div className="text-emerald-400 text-[10px]">→{p.cstIbsSugerido}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">
                          {p.cstCbs || "—"}
                          {p.cstCbs !== p.cstCbsSugerido && (
                            <div className="text-emerald-400 text-[10px]">→{p.cstCbsSugerido}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs">{p.aliqIbs > 0 ? `${p.aliqIbs}%` : "0%"}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{p.aliqCbs > 0 ? `${p.aliqCbs}%` : "0%"}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{p.aliqIs > 0 ? `${p.aliqIs}%` : "-"}</TableCell>
                        <TableCell>{getStatusBadge(p.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={modalEscolherAuditoria} onOpenChange={setModalEscolherAuditoria}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Selecionar operação de auditoria em lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha uma operação para corrigir automaticamente os produtos com divergências.
            </p>
            {operacoesAuditoriaEmLote.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Nenhuma operação disponível no momento. Todos os produtos estão conformes.
              </div>
            ) : (
              <ScrollArea className="max-h-[360px] pr-3">
                <div className="space-y-3">
                  {["Geral", "Por grupo", "Por departamento", "Por tributação"].map((secao) => {
                    const ops = operacoesAuditoriaEmLote.filter(op => op.secao === secao);
                    if (ops.length === 0) return null;

                    return (
                      <div key={secao} className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{secao}</p>
                        {ops.map((op) => (
                          <Button
                            key={`${secao}-${op.label}`}
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => solicitarAuditoria(op.label, op.produtos)}
                          >
                            <span className="truncate pr-2">{op.label}</span>
                            <Badge variant="secondary" className="text-[10px]">{op.pendentes}</Badge>
                          </Button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalEscolherAuditoria(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhe */}
      <Dialog open={modalDetalhe} onOpenChange={setModalDetalhe}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe Auditoria — {produtoSelecionado?.descricao}</DialogTitle>
          </DialogHeader>
          {produtoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <div className="font-mono">{produtoSelecionado.codigo}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>{getStatusBadge(produtoSelecionado.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Auditado</Label>
                  <div>
                    {produtoSelecionado.auditoriaCorrigida ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
                        <ShieldCheck className="w-3 h-3" />Sim
                      </Badge>
                    ) : produtoSelecionado.status === "ok" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20 gap-1">
                        <CheckCircle2 className="w-3 h-3" />Conforme (já correto)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive/70 border-destructive/30 gap-1">
                        <XCircle className="w-3 h-3" />Não
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-sm">Classificação Fiscal</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "NCM", atual: produtoSelecionado.ncmAtual, sugerido: produtoSelecionado.ncmSugerido },
                    { label: "CEST", atual: produtoSelecionado.cestAtual, sugerido: produtoSelecionado.cestSugerido },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="text-right font-mono text-xs">
                        <div>{item.atual || <span className="text-red-400">vazio</span>}</div>
                        {item.atual !== item.sugerido && item.sugerido && (
                          <div className="text-emerald-400">→ {item.sugerido}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-sm">Tributos (ICMS, PIS, COFINS, IPI)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "CST ICMS", atual: produtoSelecionado.cstIcms, sugerido: produtoSelecionado.cstIcmsSugerido },
                    { label: "CST PIS", atual: produtoSelecionado.cstPis, sugerido: produtoSelecionado.cstPisSugerido },
                    { label: "CST COFINS", atual: produtoSelecionado.cstCofins, sugerido: produtoSelecionado.cstCofinsSugerido },
                    { label: "CST IPI", atual: produtoSelecionado.cstIpi, sugerido: produtoSelecionado.cstIpiSugerido },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="text-right font-mono text-xs">
                        <div>{item.atual}</div>
                        {item.atual !== item.sugerido && (
                          <div className="text-emerald-400">→ {item.sugerido}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />Reforma Tributária (IBS, CBS, IS)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { label: "CST IBS", atual: produtoSelecionado.cstIbs, sugerido: produtoSelecionado.cstIbsSugerido },
                    { label: "CST CBS", atual: produtoSelecionado.cstCbs, sugerido: produtoSelecionado.cstCbsSugerido },
                    { label: "cClassTrib", atual: produtoSelecionado.cClassTrib, sugerido: produtoSelecionado.cClassTribSugerido },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">{item.label}</span>
                      <div className="text-right font-mono text-xs">
                        <div>{item.atual || <span className="text-red-400">vazio</span>}</div>
                        {item.atual !== item.sugerido && (
                          <div className="text-emerald-400">→ {item.sugerido}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {produtoSelecionado.divergencias.length > 0 && (
                <div className="border border-red-500/30 rounded-lg p-3 bg-red-500/5">
                  <h4 className="font-semibold text-sm text-red-400 mb-2">Divergências Encontradas</h4>
                  <ul className="space-y-1">
                    {produtoSelecionado.divergencias.map((d, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {produtoSelecionado.status !== "ok" && (
                <Button className="w-full" onClick={() => { aplicarCorrecao(produtoSelecionado.produtoId); setModalDetalhe(false); }}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Aplicar Correções e Salvar no Cadastro
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Importar XML */}
      <Dialog open={modalXml} onOpenChange={setModalXml}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar XML NF-e</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione um XML de NF-e. Produtos serão importados/atualizados no cadastro e auditados automaticamente.
            </p>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileUp className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <Label htmlFor="xml-upload" className="cursor-pointer text-primary hover:underline">
                Clique para selecionar o XML
              </Label>
              <Input id="xml-upload" type="file" accept=".xml" onChange={handleImportarXML} className="hidden" />
              <p className="text-xs text-muted-foreground mt-1">Arquivos .xml de NF-e (procNFe, NFe)</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação Correção em Lote PIS/COFINS */}
      <AlertDialog open={modalConfirmLote} onOpenChange={setModalConfirmLote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Correção em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a aplicar as sugestões de CST PIS/COFINS em{" "}
              <span className="font-bold text-foreground">
                {produtos.filter(p => p.cstPis !== p.cstPisSugerido || p.cstCofins !== p.cstCofinsSugerido).length} produto(s)
              </span>.
              Esta ação atualizará o cadastro de produtos. Se necessário, use o botão "Desfazer Última Auditoria" para reverter a última operação em lote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md bg-muted p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">Resumo das alterações:</p>
            <p>• CST PIS será atualizado para o valor sugerido pela auditoria</p>
            <p>• CST COFINS será atualizado para o valor sugerido pela auditoria</p>
            <p>• Produtos serão marcados como "Auditado"</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aplicarCorrecaoLotePisCofins}>
              Confirmar Correção
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Histórico de Auditoria */}
      <Dialog open={modalHistorico} onOpenChange={setModalHistorico}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Histórico de Auditoria
            </DialogTitle>
          </DialogHeader>
          {/* Filtros */}
          <div className="flex gap-2">
            <Select value={filtroTipoHist} onValueChange={setFiltroTipoHist}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="correcao_individual">Individual</SelectItem>
                <SelectItem value="lote_pis_cofins">Lote PIS/COFINS</SelectItem>
                <SelectItem value="correcao_total">Correção Total</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroUsuarioHist} onValueChange={setFiltroUsuarioHist}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {[...new Set(historico.map(h => h.usuario))].map(u => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="max-h-[400px]">
            {(() => {
              const filtrado = historico.filter(h =>
                (filtroTipoHist === "todos" || h.tipo === filtroTipoHist) &&
                (filtroUsuarioHist === "todos" || h.usuario === filtroUsuarioHist)
              );
              return filtrado.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <History className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum registro de auditoria</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtrado.map(h => (
                  <div key={h.id} className="py-3 px-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={h.tipo === "correcao_total" ? "default" : h.tipo === "lote_pis_cofins" ? "secondary" : "outline"} className="text-[10px]">
                        {h.tipo === "correcao_total" ? "Correção Total" : h.tipo === "lote_pis_cofins" ? "Lote PIS/COFINS" : "Individual"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(h.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">{h.detalhes}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>👤 {h.usuario}</span>
                      <span>📦 {h.quantidadeProdutos} produto(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            );
            })()}
          </ScrollArea>
          {historico.length > 0 && (
            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { saveHistorico([]); setHistorico([]); toast.success("Histórico limpo!"); }}>
                Limpar Histórico
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
                  const headers = [
                    { label: "Data/Hora", align: "left" as const },
                    { label: "Tipo", align: "center" as const },
                    { label: "Usuário", align: "left" as const },
                    { label: "Produtos", align: "right" as const },
                    { label: "Detalhes", align: "left" as const },
                  ];
                  const rows = historico.map(h => ({
                    cells: [
                      format(new Date(h.data), "dd/MM/yyyy HH:mm"),
                      h.tipo === "correcao_total" ? "Correção Total" : h.tipo === "lote_pis_cofins" ? "Lote PIS/COFINS" : "Individual",
                      h.usuario,
                      String(h.quantidadeProdutos),
                      h.detalhes,
                    ],
                  }));
                  await printPDF({
                    title: "Histórico de Auditoria Fiscal",
                    subtitle: `${historico.length} registro(s)`,
                    content: buildPrintTable(headers, rows),
                  });
                  toast.success("PDF do histórico gerado!");
                }}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={async () => {
                  const wb = new ExcelJS.Workbook();
                  const ws = wb.addWorksheet("Histórico");
                  ws.addRow(["Data/Hora", "Tipo", "Usuário", "Produtos", "Detalhes"]);
                  historico.forEach(h => {
                    ws.addRow([
                      format(new Date(h.data), "dd/MM/yyyy HH:mm"),
                      h.tipo === "correcao_total" ? "Correção Total" : h.tipo === "lote_pis_cofins" ? "Lote PIS/COFINS" : "Individual",
                      h.usuario,
                      h.quantidadeProdutos,
                      h.detalhes,
                    ]);
                  });
                  const buffer = await wb.xlsx.writeBuffer();
                  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "historico-auditoria.xlsx");
                  toast.success("Excel do histórico exportado!");
                }}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Excel
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de Auditoria em Lote */}
      <AlertDialog open={modalConfirmAudit} onOpenChange={setModalConfirmAudit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Auditoria em Lote</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você está prestes a aplicar correções automáticas em:</p>
              <p className="font-semibold text-foreground">{pendingAuditAction?.label}</p>
              <p><strong>{pendingAuditAction?.produtos.filter(p => p.status !== "ok").length}</strong> produto(s) com divergência serão corrigidos e salvos no cadastro.</p>
              <p className="text-muted-foreground text-xs">Após confirmar, você ainda pode reverter a última operação pelo botão "Desfazer Última Auditoria".</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAuditAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAuditoria}>
              <ShieldCheck className="w-4 h-4 mr-2" />Confirmar Auditoria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AuditoriaFiscal;
