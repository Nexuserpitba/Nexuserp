import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Package, Building2, FileText,
  ShoppingCart, Warehouse, DollarSign, Monitor, Settings,
  ChevronRight, BarChart3, Truck, Tag,
  Receipt, FileInput, Calculator, CreditCard, PieChart, MapPin,
  Menu, X, PanelLeftClose, PanelLeft, Shield, Percent,
  LogOut, Wrench, Sun, Moon, Factory, Search, Scale, Handshake, Target, ClipboardList, Phone, CalendarDays, Smartphone, Brain, Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import defaultLogoImg from "@/assets/logo.png";
import { getActiveLogo, getSelectedEmpresaId, LOGO_CHANGED_EVENT } from "@/lib/logoUtils";
import { useAuth, type ModuleId } from "@/contexts/AuthContext";
import { NotificacoesPanel } from "./NotificacoesPanel";
import { useTheme as useThemeHook } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

const roleLabels: Record<string, string> = {
  administrador: "Admin",
  gerente: "Gerente",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
  financeiro: "Financeiro",
  estoquista: "Estoquista",
  tecnico: "Técnico",
  operador: "Operador",
};

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  module?: ModuleId; // explicit module for access control
  children?: { label: string; path: string; icon: React.ElementType; module?: ModuleId }[];
}

const menuItems: MenuItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", module: "dashboard" },
  { label: "BI Inteligente", icon: Brain, path: "/bi", module: "bi" },
  {
    label: "Cadastros", icon: Users, module: "cadastros", children: [
      { label: "Empresas", path: "/cadastros/empresas", icon: Building2 },
      { label: "Pessoas", path: "/cadastros/pessoas", icon: Users },
      { label: "Transportadoras", path: "/cadastros/transportadoras", icon: Truck },
      { label: "Cidades", path: "/cadastros/cidades", icon: MapPin },
    ]
  },
  {
    label: "Produtos e Estoque", icon: Package, module: "produtos_estoque", children: [
      { label: "Produtos", path: "/cadastros/produtos", icon: Package },
      { label: "Categorias", path: "/cadastros/categorias", icon: Tag },
      { label: "Ordem de Produção", path: "/producao/ordens", icon: Factory, module: "producao" },
      { label: "Dashboard Produção", path: "/producao/dashboard", icon: BarChart3, module: "producao" },
      { label: "Preços Especiais", path: "/comercial/precos-especiais", icon: DollarSign, module: "comercial" },
      { label: "Grupos de Desconto", path: "/comercial/grupos-desconto", icon: Tag, module: "comercial" },
      { label: "Promoções", path: "/comercial/promocoes", icon: Percent, module: "comercial" },
      { label: "Movimentações", path: "/estoque/movimentacoes", icon: Warehouse },
      { label: "Inventário", path: "/estoque/inventario", icon: Package },
      { label: "Transferências", path: "/estoque/transferencias", icon: Truck },
    ]
  },
  {
    label: "Fiscal - NF-e", icon: FileText, module: "fiscal_nfe", children: [
      { label: "Emissão NF-e", path: "/fiscal/emissao-nfe", icon: FileText },
      { label: "Gestão de NFe", path: "/fiscal/gestao-nfe", icon: FileText },
      { label: "Importação NF-e/NFC-e/CT-e", path: "/fiscal/importacao-documentos", icon: FileInput },
      { label: "Gestão de XML", path: "/fiscal/gestao-xml", icon: FileInput },
      { label: "Regras Tributárias", path: "/fiscal/regras-tributarias", icon: Calculator },
      { label: "Tabela NCM/CEST/MVA", path: "/fiscal/tabela-ncm", icon: FileText },
    ]
  },
  {
    label: "Fiscal - NFS-e", icon: Receipt, module: "fiscal_nfse", children: [
      { label: "Emissão NFS-e", path: "/fiscal/emissao-nfse", icon: Receipt },
      { label: "Consulta NFS-e", path: "/fiscal/consulta-nfse", icon: FileText },
      { label: "Cancelamento NFS-e", path: "/fiscal/cancelamento-nfse", icon: FileInput },
    ]
  },
  {
    label: "Fiscal - Geral", icon: Calculator, module: "fiscal_nfe", children: [
      { label: "Reforma Tributária", path: "/fiscal/reforma-tributaria", icon: Receipt },
      { label: "Apuração", path: "/fiscal/apuracao", icon: PieChart },
      { label: "Auditoria Fiscal", path: "/fiscal/auditoria", icon: Calculator },
      { label: "DRE", path: "/fiscal/dre", icon: BarChart3 },
      { label: "SPED Fiscal", path: "/fiscal/sped-fiscal", icon: FileText },
      { label: "SPED Contribuições", path: "/fiscal/sped-contribuicoes", icon: FileText },
      { label: "Sintegra", path: "/fiscal/sintegra", icon: FileText },
    ]
  },
  {
    label: "Compras", icon: ShoppingCart, module: "compras", children: [
      { label: "Dashboard Compras", path: "/compras/dashboard", icon: BarChart3 },
      { label: "Pedidos de Compra", path: "/compras/pedidos", icon: ShoppingCart },
      { label: "Recebimento", path: "/compras/recebimento", icon: Receipt },
      { label: "Perdas", path: "/compras/perdas", icon: Package },
      { label: "Faltas de Mercadorias", path: "/compras/faltas", icon: ShoppingCart },
    ]
  },
  {
    label: "CRM", icon: Handshake, module: "crm", children: [
      { label: "Dashboard CRM", path: "/crm", icon: Target },
      { label: "Funil de Vendas", path: "/crm/funil", icon: BarChart3 },
      { label: "Leads", path: "/crm/leads", icon: Users },
      { label: "Atividades", path: "/crm/atividades", icon: ClipboardList },
      { label: "Relatórios", path: "/crm/relatorios", icon: PieChart },
      { label: "Automações", path: "/crm/automacoes", icon: Wrench },
      { label: "Templates E-mail", path: "/crm/templates-email", icon: FileText },
      { label: "Calendário", path: "/crm/calendario", icon: CalendarDays },
      { label: "Metas Comerciais", path: "/crm/metas", icon: Target },
      { label: "Desempenho Vendedores", path: "/crm/desempenho", icon: BarChart3 },
      { label: "Comissões", path: "/crm/comissoes", icon: DollarSign },
    ]
  },
  {
    label: "Serviços", icon: Wrench, module: "servicos", children: [
      { label: "Ordens de Serviço", path: "/servicos/ordens", icon: Wrench },
      { label: "Técnicos", path: "/servicos/tecnicos", icon: Users },
    ]
  },
  {
    label: "Financeiro", icon: DollarSign, module: "financeiro", children: [
      { label: "Contas Bancárias", path: "/cadastros/contas-bancarias", icon: CreditCard, module: "financeiro" },
      { label: "Contas a Pagar", path: "/financeiro/contas-pagar", icon: CreditCard },
      { label: "Contas a Receber", path: "/financeiro/contas-receber", icon: DollarSign },
      { label: "Boletos", path: "/financeiro/boletos", icon: FileText },
      { label: "Config. Boletos", path: "/financeiro/config-boletos", icon: Receipt },
      { label: "Integração CNAB", path: "/financeiro/cnab", icon: FileInput },
      { label: "Fluxo de Caixa", path: "/financeiro/fluxo-caixa", icon: BarChart3 },
      { label: "PIX Recebidos", path: "/financeiro/pix", icon: Smartphone },
      { label: "Cartões", path: "/financeiro/cartoes", icon: CreditCard },
      { label: "Consiliação Cartões", path: "/financeiro/consiliacao-cartoes", icon: Calculator },
    ]
  },
  { label: "PDV", icon: Monitor, path: "/pdv", module: "pdv" },
  {
    label: "Configurações", icon: Settings, module: "configuracoes", children: [
      { label: "Geral", path: "/configuracoes", icon: Settings },
      { label: "Logo da Empresa", path: "/configuracoes/logo", icon: Tag },
      { label: "Etiquetas", path: "/configuracoes/etiquetas", icon: Tag },
      { label: "NF-e", path: "/configuracoes/nfe", icon: FileText },
      { label: "Liberações Gerenciais", path: "/configuracoes/log-liberacoes", icon: Shield },
      { label: "Usuários", path: "/configuracoes/usuarios", icon: Users },
      { label: "Permissões por Módulo", path: "/configuracoes/permissoes", icon: Shield },
      { label: "Alterar Senha", path: "/configuracoes/alterar-senha", icon: Shield },
      { label: "Log de Auditoria", path: "/configuracoes/log-auditoria", icon: Shield },
      { label: "Relatório de Segurança", path: "/configuracoes/relatorio-seguranca", icon: Shield },
      { label: "Integração Biométrica", path: "/configuracoes/biometria", icon: Fingerprint },
      { label: "Personalizar Cores", path: "/configuracoes/personalizar-cores", icon: Tag },
      { label: "Relatórios", path: "/configuracoes/relatorios", icon: FileText },
    ]
  },
  {
    label: "Tabelas", icon: FileText, module: "tabelas", children: [
      { label: "Lista Coletor", path: "/tabelas/lista-coletor", icon: FileText },
      { label: "CFOP", path: "/tabelas/cfop", icon: FileText },
      { label: "CNAE", path: "/tabelas/cnae", icon: FileText },
      { label: "CST", path: "/tabelas/cst", icon: FileText },
      { label: "Feriados", path: "/tabelas/feriados", icon: FileText },
      { label: "PAF", path: "/tabelas/paf", icon: FileText },
      { label: "Metas", path: "/tabelas/metas", icon: FileText },
      { label: "Postal", path: "/tabelas/postal", icon: FileText },
      { label: "NCM", path: "/tabelas/ncm", icon: FileText },
      { label: "TIPI", path: "/tabelas/tipi", icon: FileText },
      { label: "Unidade de Mercadorias", path: "/tabelas/unidade-mercadorias", icon: FileText },
      { label: "Gênero Mercadoria/Serviços", path: "/tabelas/genero-mercadoria", icon: FileText },
      { label: "Ajuste Documentos e Receitas", path: "/tabelas/ajuste-documentos", icon: FileText },
      { label: "CEST", path: "/tabelas/cest", icon: FileText },
      { label: "Tipo de Entrega", path: "/tabelas/tipo-entrega", icon: FileText },
      { label: "Códigos PIS/Cofins", path: "/tabelas/pis-cofins", icon: FileText },
      { label: "Denominação Comum Brasileira", path: "/tabelas/dcb", icon: FileText },
      { label: "Código ANP", path: "/tabelas/anp", icon: FileText },
      { label: "POS", path: "/tabelas/pos", icon: FileText },
      { label: "Benefício Fiscal", path: "/tabelas/beneficio-fiscal", icon: FileText },
      { label: "CST IBS CBS", path: "/tabelas/cst-ibs-cbs", icon: FileText },
      { label: "cCredPres", path: "/tabelas/ccredpres", icon: FileText },
      { label: "cClassTrib", path: "/tabelas/cclasstrib", icon: FileText },
      { label: "IBPTax (Tributos)", path: "/tabelas/ibpt", icon: FileText },
    ]
  },
  {
    label: "Relatórios", icon: BarChart3, module: "relatorios",
    children: [
      { label: "Módulo Vendas", path: "/relatorios/modulo-vendas", icon: BarChart3 },
      { label: "Vendas por Forma Pgto", path: "/relatorios/vendas-forma-pagamento", icon: PieChart },
      { label: "Vendas por Vendedor", path: "/relatorios/vendas-vendedor", icon: BarChart3 },
      { label: "Vendas Diárias", path: "/relatorios/vendas-diarias", icon: BarChart3 },
      { label: "Curva ABC Produtos", path: "/relatorios/vendas-produto-curva-abc", icon: BarChart3 },
      { label: "Vendas por Cliente", path: "/relatorios/vendas-cliente", icon: Users },
      { label: "Módulo Serviços", path: "/relatorios/modulo-servicos", icon: Wrench },
      { label: "Produtividade Técnicos", path: "/relatorios/produtividade-tecnicos", icon: Wrench },
      { label: "Descontos Concedidos", path: "/relatorios/descontos", icon: BarChart3 },
      { label: "Relatório Produção", path: "/relatorios/producao", icon: BarChart3 },
      { label: "Pesagens do Turno", path: "/relatorios/pesagens", icon: Scale },
      { label: "Histórico Custos XML", path: "/relatorios/historico-custos-xml", icon: BarChart3 },
    ]
  },
];

function flattenItems(items: MenuItem[]): { label: string; path: string; icon: React.ElementType; group?: string }[] {
  const result: { label: string; path: string; icon: React.ElementType; group?: string }[] = [];
  for (const item of items) {
    if (item.path) result.push({ label: item.label, path: item.path, icon: item.icon });
    if (item.children) {
      for (const child of item.children) {
        result.push({ label: child.label, path: child.path, icon: child.icon, group: item.label });
      }
    }
  }
  return result;
}

const allFlatItems = flattenItems(menuItems);

function normalize(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const submenuVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: "auto", opacity: 1, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

/* ── Single nav link ── */
function SidebarLink({ item, collapsed, isActive: active }: { item: { label: string; path: string; icon: React.ElementType }; collapsed: boolean; isActive: boolean }) {
  const content = (
    <NavLink
      to={item.path}
      className={cn(
        "group flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
        collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "px-3 py-2",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon size={17} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

/* ── Collapsible group ── */
function SidebarGroup({ item, collapsed, openMenus, toggleMenu, location, badgeCounts }: {
  item: MenuItem;
  collapsed: boolean;
  openMenus: string[];
  toggleMenu: (label: string) => void;
  location: ReturnType<typeof useLocation>;
  badgeCounts?: Record<string, number>;
}) {
  const open = openMenus.includes(item.label);
  const childActive = item.children?.some(c => location.pathname.startsWith(c.path));

  const trigger = (
    <button
      onClick={() => !collapsed && toggleMenu(item.label)}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-200",
        collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "px-3 py-2",
        childActive
          ? "text-sidebar-primary bg-sidebar-primary/10"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon size={18} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left truncate">{item.label}</span>
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-sidebar-foreground/30"
          >
            <ChevronRight size={14} />
          </motion.span>
        </>
      )}
    </button>
  );

  return (
    <div>
      {collapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="p-0 rounded-xl overflow-hidden" align="start">
            <div className="py-2 min-w-[200px] bg-popover">
              <p className="px-3 pb-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">{item.label}</p>
              <div className="space-y-0.5 px-1">
                {item.children?.map(child => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-all duration-150",
                      location.pathname.startsWith(child.path)
                        ? "text-primary font-semibold bg-primary/10"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <child.icon size={14} className="shrink-0" />
                    <span>{child.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      {!collapsed && (
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key={item.label}
              variants={submenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="mt-0.5 ml-[22px] space-y-0.5 border-l border-sidebar-border/30 pl-3">
                {item.children?.map((child, i) => {
                  const isChildActive = location.pathname.startsWith(child.path);
                  return (
                    <motion.div
                      key={child.path}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025, duration: 0.18 }}
                    >
                      <NavLink
                        to={child.path}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-all duration-150",
                          isChildActive
                            ? "text-sidebar-primary bg-sidebar-primary/12 font-semibold"
                            : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/40"
                        )}
                      >
                        <child.icon size={14} className="shrink-0" />
                        <span className="truncate flex-1">{child.label}</span>
                        {badgeCounts && child.path && badgeCounts[child.path] > 0 && (
                          <span className="ml-auto shrink-0 text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5 leading-none animate-pulse">
                            {badgeCounts[child.path]}
                          </span>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/* ── Search results ── */
function SearchResults({ query, onSelect }: { query: string; onSelect: () => void }) {
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  const results = useMemo(() => {
    if (!terms.length) return [];
    return allFlatItems.filter(item => {
      const text = normalize(item.label + " " + (item.group || ""));
      return terms.every(t => text.includes(t));
    }).slice(0, 8);
  }, [terms]);

  if (!terms.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="px-3 pb-2"
    >
      {results.length === 0 ? (
        <p className="text-[11px] text-sidebar-foreground/40 px-2 py-3 text-center">Nenhum resultado</p>
      ) : (
        <div className="space-y-0.5">
          {results.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onSelect}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150"
            >
              <item.icon size={14} className="shrink-0 opacity-60" />
              <div className="min-w-0 flex-1">
                <span className="truncate block font-medium">{item.label}</span>
                {item.group && (
                  <span className="text-[10px] text-sidebar-foreground/30 truncate block">{item.group}</span>
                )}
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Sidebar ── */
export function AppSidebar() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const { user, logout, hasAccess, hasModule } = useAuth();
  const { dark, toggleDarkMode } = useThemeHook();

  // NCM invalid count for badge
  const [ncmInvalidCount, setNcmInvalidCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase.from("produtos" as any) as any)
          .select("ncm")
          .eq("ativo", true);
        if (data) {
          const invalid = data.filter((p: any) => !p.ncm || p.ncm.replace(/\D/g, "").length < 8).length;
          setNcmInvalidCount(invalid);
        }
      } catch {
        // erro ignorado
      }
    })();
  }, [location.pathname]);

  const [logoImg, setLogoImg] = useState(() => {
    const empresaId = getSelectedEmpresaId();
    return getActiveLogo(empresaId ?? undefined) || defaultLogoImg;
  });

  useEffect(() => {
    const updateLogo = () => {
      const empresaId = getSelectedEmpresaId();
      setLogoImg(getActiveLogo(empresaId ?? undefined) || defaultLogoImg);
    };
    window.addEventListener(LOGO_CHANGED_EVENT, updateLogo);
    return () => window.removeEventListener(LOGO_CHANGED_EVENT, updateLogo);
  }, []);

  useEffect(() => { setMobileOpen(false); setSearchQuery(""); }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && window.innerWidth >= 768) setCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-open active group
  useEffect(() => {
    for (const item of menuItems) {
      if (item.children?.some(c => location.pathname.startsWith(c.path))) {
        setOpenMenus(prev => prev.includes(item.label) ? prev : [...prev, item.label]);
        break;
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (collapsed) setCollapsed(false);
        setTimeout(() => document.getElementById("sidebar-search")?.focus(), 100);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed]);

  const toggleMenu = (label: string) => {
    setOpenMenus(prev =>
      prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
    );
  };

  const isActive = (path?: string) => path === location.pathname;
  const isSearching = searchQuery.trim().length > 0;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className={cn(
        "flex items-center shrink-0 border-b border-sidebar-border/30",
        collapsed ? "justify-center h-16 px-2" : "h-16 px-4"
      )}>
        {collapsed ? (
          <motion.img
            key="/logo-nexuserp.svg"
            src="/logo-nexuserp.svg"
            alt="NexusERP"
            className="w-10 h-10 object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <motion.img
              key="/logo-nexuserp.svg"
              src="/logo-nexuserp.svg"
              alt="NexusERP"
              className="w-10 h-10 object-contain shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-sidebar-primary font-bold text-sm tracking-wide">NexusERP</span>
              <span className="text-[9px] text-sidebar-foreground/30 font-medium tracking-[0.15em] uppercase">A tecnologia em suas mãos</span>
            </div>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              <NotificacoesPanel />
              {!isMobile && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1.5 rounded-lg hover:bg-sidebar-accent/80 text-sidebar-foreground/35 hover:text-sidebar-accent-foreground transition-all duration-200"
                >
                  <PanelLeftClose size={16} />
                </button>
              )}
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-sidebar-accent border border-sidebar-border/40 flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-primary-foreground hover:bg-sidebar-primary transition-all duration-200 shadow-lg"
          >
            <PanelLeft size={12} />
          </button>
        )}
      </div>

      {/* ── Search ── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1.5 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sidebar-foreground/25" />
            <input
              id="sidebar-search"
              type="text"
              placeholder="Buscar... (Ctrl+K)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-8 text-[12px] rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30 text-sidebar-foreground placeholder:text-sidebar-foreground/25 focus:outline-none focus:ring-2 focus:ring-sidebar-primary/40 focus:border-transparent transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sidebar-foreground/25 hover:text-sidebar-foreground/60 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-2 pt-3 pb-1 shrink-0 flex justify-center">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => { setCollapsed(false); setTimeout(() => document.getElementById("sidebar-search")?.focus(), 150); }}
                className="p-2.5 rounded-xl text-sidebar-foreground/35 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground transition-all duration-200"
              >
                <Search size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>Buscar (Ctrl+K)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* ── Navigation ── */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <SearchResults key="search" query={searchQuery} onSelect={() => setSearchQuery("")} />
          ) : (
            <nav key="nav" className={cn("py-2 space-y-0.5", collapsed ? "px-2" : "px-2.5")}>
              {menuItems.map((item) => {
                // Module-level filtering
                if (item.module && !hasModule(item.module)) return null;
                if (item.path && !item.module && !hasAccess(item.path)) return null;
                
                if (item.children) {
                  const visibleChildren = item.children.filter(c => {
                    // Child-level module override takes priority
                    if (c.module) return hasModule(c.module);
                    // Otherwise inherit parent module (already checked) or check path
                    if (item.module) return true;
                    return hasAccess(c.path);
                  });
                  if (visibleChildren.length === 0) return null;
                  const filteredItem = { ...item, children: visibleChildren };
                  return (
                    <SidebarGroup
                      key={item.label}
                      item={filteredItem}
                      collapsed={collapsed}
                      openMenus={openMenus}
                      toggleMenu={toggleMenu}
                      location={location}
                      badgeCounts={{ "/cadastros/produtos": ncmInvalidCount }}
                    />
                  );
                }
                return (
                  <SidebarLink
                    key={item.path}
                    item={item as { label: string; path: string; icon: React.ElementType }}
                    collapsed={collapsed}
                    isActive={isActive(item.path)}
                  />
                );
              })}
            </nav>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* ── Footer ── */}
      {user && (
        <div className={cn(
          "shrink-0 border-t border-sidebar-border/30",
          collapsed ? "p-2" : "px-3 py-3"
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button onClick={toggleDarkMode} className="p-2 rounded-xl hover:bg-sidebar-accent/80 text-sidebar-foreground/45 hover:text-sidebar-accent-foreground transition-all duration-200">
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>{dark ? "Modo Claro" : "Modo Escuro"}</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button onClick={logout} className="p-2 rounded-xl hover:bg-destructive/15 text-sidebar-foreground/45 hover:text-destructive transition-all duration-200">
                    <LogOut size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>Sair</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary/15 flex items-center justify-center text-sidebar-primary font-bold text-xs shrink-0">
                {user.nome?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-sidebar-foreground truncate">{user.nome}</p>
                <p className="text-[10px] text-sidebar-foreground/35 font-medium">{roleLabels[user.role] || user.role}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={toggleDarkMode} className="p-1.5 rounded-lg hover:bg-sidebar-accent/80 text-sidebar-foreground/35 hover:text-sidebar-accent-foreground transition-all duration-200" title={dark ? "Modo Claro" : "Modo Escuro"}>
                  {dark ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                <button onClick={logout} className="p-1.5 rounded-lg hover:bg-destructive/15 text-sidebar-foreground/35 hover:text-destructive transition-all duration-200" title="Sair">
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ── Mobile drawer ── */
  if (isMobile) {
    return (
      <>
        <div className="fixed top-3 left-3 z-50 flex items-center gap-2">
          <button onClick={() => setMobileOpen(true)} className="p-2.5 rounded-xl bg-card border border-border shadow-lg text-foreground hover:bg-muted transition-all duration-200" aria-label="Abrir menu">
            <Menu size={20} />
          </button>
          <div className="bg-card border border-border shadow-lg rounded-xl">
            <NotificacoesPanel />
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className={cn(
            "fixed top-0 left-0 z-50 h-full w-72 bg-sidebar flex flex-col transition-transform duration-300 shadow-2xl rounded-r-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-sidebar-accent/80 text-sidebar-foreground/45 hover:text-sidebar-accent-foreground transition-all duration-200 z-10"
          >
            <X size={18} />
          </button>
          {sidebarContent}
        </aside>
      </>
    );
  }

  /* ── Desktop sidebar ── */
  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border/30 transition-all duration-300 sticky top-0 shrink-0",
        collapsed ? "w-[60px]" : "w-[250px]"
      )}
    >
      {sidebarContent}
    </aside>
  );
}
