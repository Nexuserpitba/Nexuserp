import { Suspense, lazy, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { AnimatePresence } from "framer-motion";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages
const PDV = lazy(() => import("./pages/PDV"));
const Instalar = lazy(() => import("./pages/Instalar"));
const BIDashboard = lazy(() => import("./pages/BIDashboard"));
const WebhookIntelbras = lazy(() => import("./pages/WebhookIntelbras"));

// Cadastros
const Empresas = lazy(() => import("./pages/cadastros/Empresas"));
const Pessoas = lazy(() => import("./pages/cadastros/Pessoas"));
const Produtos = lazy(() => import("./pages/cadastros/Produtos"));
const Categorias = lazy(() => import("./pages/cadastros/Categorias"));
const Cidades = lazy(() => import("./pages/cadastros/Cidades"));
const Transportadoras = lazy(() => import("./pages/cadastros/Transportadoras"));
const ContasBancarias = lazy(() => import("./pages/cadastros/ContasBancarias"));
const Tecnicos = lazy(() => import("./pages/cadastros/Tecnicos"));

// Fiscal
const EmissaoNFe = lazy(() => import("./pages/fiscal/EmissaoNFe"));
const RegrasTributarias = lazy(() => import("./pages/fiscal/RegrasTributarias"));
const TabelaNCM = lazy(() => import("./pages/fiscal/TabelaNCM"));
const ReformaTributaria = lazy(() => import("./pages/fiscal/ReformaTributaria"));
const Apuracao = lazy(() => import("./pages/fiscal/Apuracao"));
const EmissaoNFSe = lazy(() => import("./pages/fiscal/EmissaoNFSe"));
const ConsultaNFSe = lazy(() => import("./pages/fiscal/ConsultaNFSe"));
const CancelamentoNFSe = lazy(() => import("./pages/fiscal/CancelamentoNFSe"));
const AuditoriaFiscal = lazy(() => import("./pages/fiscal/AuditoriaFiscal"));
const DRE = lazy(() => import("./pages/fiscal/DRE"));
const SpedFiscal = lazy(() => import("./pages/fiscal/SpedFiscal"));
const SpedContribuicoes = lazy(() => import("./pages/fiscal/SpedContribuicoes"));
const Sintegra = lazy(() => import("./pages/fiscal/Sintegra"));
const GestaoXML = lazy(() => import("./pages/fiscal/GestaoXML"));
const GestaoNFe = lazy(() => import("./pages/fiscal/GestaoNFe"));
const ImportacaoDocumentos = lazy(() => import("./pages/fiscal/ImportacaoDocumentos"));

// Financeiro
const ContasPagar = lazy(() => import("./pages/financeiro/ContasPagar"));
const ContasReceber = lazy(() => import("./pages/financeiro/ContasReceber"));
const ConfigBoletos = lazy(() => import("./pages/financeiro/ConfigBoletos"));
const GerarBoletos = lazy(() => import("./pages/financeiro/GerarBoletos"));
const FluxoCaixa = lazy(() => import("./pages/financeiro/FluxoCaixa"));
const IntegracaoCNAB = lazy(() => import("./pages/financeiro/IntegracaoCNAB"));
const ControlePix = lazy(() => import("./pages/financeiro/ControlePix"));
const ControleCartoes = lazy(() => import("./pages/financeiro/ControleCartoes"));
const ConsiliacaoCartoes = lazy(() => import("./pages/financeiro/ConsiliacaoCartoes"));

// Estoque
const Movimentacoes = lazy(() => import("./pages/estoque/Movimentacoes"));
const InventarioEstoque = lazy(() => import("./pages/estoque/Inventario"));
const TransferenciasEstoque = lazy(() => import("./pages/estoque/Transferencias"));

// Compras
const PedidosCompra = lazy(() => import("./pages/compras/PedidosCompra"));
const RecebimentoMercadorias = lazy(() => import("./pages/compras/RecebimentoMercadorias"));
const Perdas = lazy(() => import("./pages/compras/Perdas"));
const FaltasMercadorias = lazy(() => import("./pages/compras/FaltasMercadorias"));
const DashboardCompras = lazy(() => import("./pages/compras/DashboardCompras"));

// Serviços
const OrdensServico = lazy(() => import("./pages/servicos/OrdensServico"));
const OrdensProducao = lazy(() => import("./pages/producao/OrdensProducao"));
const DashboardProducao = lazy(() => import("./pages/producao/DashboardProducao"));

// Comercial
const PrecosEspeciais = lazy(() => import("./pages/comercial/PrecosEspeciais"));
const GruposDesconto = lazy(() => import("./pages/comercial/GruposDesconto"));
const Promocoes = lazy(() => import("./pages/comercial/Promocoes"));

// Relatórios
const VendasFormaPagamento = lazy(() => import("./pages/relatorios/VendasFormaPagamento"));
const VendasVendedor = lazy(() => import("./pages/relatorios/VendasVendedor"));
const VendasDiarias = lazy(() => import("./pages/relatorios/VendasDiarias"));
const VendasProdutoCurvaABC = lazy(() => import("./pages/relatorios/VendasProdutoCurvaABC"));
const VendasCliente = lazy(() => import("./pages/relatorios/VendasCliente"));
const ProdutividadeTecnicos = lazy(() => import("./pages/relatorios/ProdutividadeTecnicos"));
const ModuloVendas = lazy(() => import("./pages/relatorios/ModuloVendas"));
const ModuloServicos = lazy(() => import("./pages/relatorios/ModuloServicos"));
const RelatorioDescontos = lazy(() => import("./pages/relatorios/RelatorioDescontos"));
const RelatorioProducao = lazy(() => import("./pages/relatorios/RelatorioProducao"));
const RelatorioPesagens = lazy(() => import("./pages/relatorios/RelatorioPesagens"));
const HistoricoCustosXML = lazy(() => import("./pages/relatorios/HistoricoCustosXML"));

// Configurações
const ConfigBalanca = lazy(() => import("./pages/configuracoes/ConfigBalanca"));
const ConfigEtiquetas = lazy(() => import("./pages/configuracoes/ConfigEtiquetas"));
const ConfigTEF = lazy(() => import("./pages/configuracoes/ConfigTEF"));
const ConfigNFCe = lazy(() => import("./pages/configuracoes/ConfigNFCe"));
const ConfigNFe = lazy(() => import("./pages/configuracoes/ConfigNFe"));
const ConfigFormasPagamento = lazy(() => import("./pages/configuracoes/ConfigFormasPagamento"));
const ConfigLogo = lazy(() => import("./pages/configuracoes/ConfigLogo"));
const LogLiberacoesGerenciais = lazy(() => import("./pages/configuracoes/LogLiberacoesGerenciais"));
const GerenciarUsuarios = lazy(() => import("./pages/configuracoes/GerenciarUsuarios"));
const AlterarSenha = lazy(() => import("./pages/configuracoes/AlterarSenha"));
const LogAuditoria = lazy(() => import("./pages/configuracoes/LogAuditoria"));
const PersonalizarCores = lazy(() => import("./pages/configuracoes/PersonalizarCores"));
const ConfigRelatorios = lazy(() => import("./pages/configuracoes/ConfigRelatorios"));
const PermissoesModulos = lazy(() => import("./pages/configuracoes/PermissoesModulos"));
const RelatorioSeguranca = lazy(() => import("./pages/configuracoes/RelatorioSeguranca"));
const BiometriaHardware = lazy(() => import("./pages/configuracoes/BiometriaHardware"));

// CRM
const CRMDashboard = lazy(() => import("./pages/crm/CRMDashboard"));
const CRMFunil = lazy(() => import("./pages/crm/CRMFunil"));
const CRMLeads = lazy(() => import("./pages/crm/CRMLeads"));
const CRMAtividades = lazy(() => import("./pages/crm/CRMAtividades"));
const CRMRelatorios = lazy(() => import("./pages/crm/CRMRelatorios"));
const CRMAutomacoes = lazy(() => import("./pages/crm/CRMAutomacoes"));
const CRMTemplatesEmail = lazy(() => import("./pages/crm/CRMTemplatesEmail"));
const CRMCalendario = lazy(() => import("./pages/crm/CRMCalendario"));
const CRMMetas = lazy(() => import("./pages/crm/CRMMetas"));
const CRMDesempenhoVendedores = lazy(() => import("./pages/crm/CRMDesempenhoVendedores"));
const CRMComissoes = lazy(() => import("./pages/crm/CRMComissoes"));

// Tabelas
const CFOP = lazy(() => import("./pages/tabelas/CFOP"));
const CNAE = lazy(() => import("./pages/tabelas/CNAE"));
const CST = lazy(() => import("./pages/tabelas/CST"));
const CstIbsCbs = lazy(() => import("./pages/tabelas/CstIbsCbs"));
const CCredPres = lazy(() => import("./pages/tabelas/CCredPres"));
const CClassTrib = lazy(() => import("./pages/tabelas/CClassTrib"));
const PisCofins = lazy(() => import("./pages/tabelas/PisCofins"));
const DCB = lazy(() => import("./pages/tabelas/DCB"));
const ANP = lazy(() => import("./pages/tabelas/ANP"));
const BeneficioFiscal = lazy(() => import("./pages/tabelas/BeneficioFiscal"));
const NCMTabela = lazy(() => import("./pages/tabelas/NCM"));
const CEST = lazy(() => import("./pages/tabelas/CEST"));
const IBPTTabela = lazy(() => import("./pages/tabelas/IBPT"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/instalar" element={<Instalar />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {!user ? <Route path="*" element={<Login />} /> : (
          <>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/pdv" element={<PDV />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/bi" element={<ProtectedRoute><BIDashboard /></ProtectedRoute>} />
              <Route path="/cadastros/empresas" element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
              <Route path="/cadastros/pessoas" element={<ProtectedRoute><Pessoas /></ProtectedRoute>} />
              <Route path="/cadastros/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
              <Route path="/cadastros/categorias" element={<ProtectedRoute><Categorias /></ProtectedRoute>} />
              <Route path="/cadastros/transportadoras" element={<ProtectedRoute><Transportadoras /></ProtectedRoute>} />
              <Route path="/cadastros/cidades" element={<ProtectedRoute><Cidades /></ProtectedRoute>} />
              <Route path="/cadastros/contas-bancarias" element={<ProtectedRoute><ContasBancarias /></ProtectedRoute>} />
              <Route path="/fiscal/emissao-nfe" element={<ProtectedRoute><EmissaoNFe /></ProtectedRoute>} />
              <Route path="/fiscal/entrada-nfe" element={<ProtectedRoute><PlaceholderPage title="Entrada NF-e" description="Importe e gerencie notas de entrada" /></ProtectedRoute>} />
              <Route path="/fiscal/regras-tributarias" element={<ProtectedRoute><RegrasTributarias /></ProtectedRoute>} />
              <Route path="/fiscal/tabela-ncm" element={<ProtectedRoute><TabelaNCM /></ProtectedRoute>} />
              <Route path="/fiscal/reforma-tributaria" element={<ProtectedRoute><ReformaTributaria /></ProtectedRoute>} />
              <Route path="/fiscal/apuracao" element={<ProtectedRoute><Apuracao /></ProtectedRoute>} />
              <Route path="/fiscal/emissao-nfse" element={<ProtectedRoute><EmissaoNFSe /></ProtectedRoute>} />
              <Route path="/fiscal/consulta-nfse" element={<ProtectedRoute><ConsultaNFSe /></ProtectedRoute>} />
              <Route path="/fiscal/cancelamento-nfse" element={<ProtectedRoute><CancelamentoNFSe /></ProtectedRoute>} />
              <Route path="/fiscal/auditoria" element={<ProtectedRoute><AuditoriaFiscal /></ProtectedRoute>} />
              <Route path="/fiscal/dre" element={<ProtectedRoute><DRE /></ProtectedRoute>} />
              <Route path="/fiscal/sped-fiscal" element={<ProtectedRoute><SpedFiscal /></ProtectedRoute>} />
              <Route path="/fiscal/sped-contribuicoes" element={<ProtectedRoute><SpedContribuicoes /></ProtectedRoute>} />
              <Route path="/fiscal/sintegra" element={<ProtectedRoute><Sintegra /></ProtectedRoute>} />
              <Route path="/fiscal/gestao-xml" element={<ProtectedRoute><GestaoXML /></ProtectedRoute>} />
              <Route path="/fiscal/gestao-nfe" element={<ProtectedRoute><GestaoNFe /></ProtectedRoute>} />
              <Route path="/fiscal/importacao-documentos" element={<ProtectedRoute><ImportacaoDocumentos /></ProtectedRoute>} />
              <Route path="/comercial/precos-especiais" element={<ProtectedRoute><PrecosEspeciais /></ProtectedRoute>} />
              <Route path="/comercial/grupos-desconto" element={<ProtectedRoute><GruposDesconto /></ProtectedRoute>} />
              <Route path="/comercial/promocoes" element={<ProtectedRoute><Promocoes /></ProtectedRoute>} />
              <Route path="/compras/dashboard" element={<ProtectedRoute><DashboardCompras /></ProtectedRoute>} />
              <Route path="/compras/pedidos" element={<ProtectedRoute><PedidosCompra /></ProtectedRoute>} />
              <Route path="/compras/recebimento" element={<ProtectedRoute><RecebimentoMercadorias /></ProtectedRoute>} />
              <Route path="/compras/perdas" element={<ProtectedRoute><Perdas /></ProtectedRoute>} />
              <Route path="/compras/faltas" element={<ProtectedRoute><FaltasMercadorias /></ProtectedRoute>} />
              <Route path="/crm" element={<ProtectedRoute><CRMDashboard /></ProtectedRoute>} />
              <Route path="/crm/funil" element={<ProtectedRoute><CRMFunil /></ProtectedRoute>} />
              <Route path="/crm/leads" element={<ProtectedRoute><CRMLeads /></ProtectedRoute>} />
              <Route path="/crm/atividades" element={<ProtectedRoute><CRMAtividades /></ProtectedRoute>} />
              <Route path="/crm/relatorios" element={<ProtectedRoute><CRMRelatorios /></ProtectedRoute>} />
              <Route path="/crm/automacoes" element={<ProtectedRoute><CRMAutomacoes /></ProtectedRoute>} />
              <Route path="/crm/templates-email" element={<ProtectedRoute><CRMTemplatesEmail /></ProtectedRoute>} />
              <Route path="/crm/calendario" element={<ProtectedRoute><CRMCalendario /></ProtectedRoute>} />
              <Route path="/crm/metas" element={<ProtectedRoute><CRMMetas /></ProtectedRoute>} />
              <Route path="/crm/desempenho" element={<ProtectedRoute><CRMDesempenhoVendedores /></ProtectedRoute>} />
              <Route path="/crm/comissoes" element={<ProtectedRoute><CRMComissoes /></ProtectedRoute>} />
              <Route path="/servicos/ordens" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
              <Route path="/producao/ordens" element={<ProtectedRoute><OrdensProducao /></ProtectedRoute>} />
              <Route path="/producao/dashboard" element={<ProtectedRoute><DashboardProducao /></ProtectedRoute>} />
              <Route path="/servicos/tecnicos" element={<ProtectedRoute><Tecnicos /></ProtectedRoute>} />
              <Route path="/estoque/movimentacoes" element={<ProtectedRoute><Movimentacoes /></ProtectedRoute>} />
              <Route path="/estoque/inventario" element={<ProtectedRoute><InventarioEstoque /></ProtectedRoute>} />
              <Route path="/estoque/transferencias" element={<ProtectedRoute><TransferenciasEstoque /></ProtectedRoute>} />
              <Route path="/financeiro/contas-pagar" element={<ProtectedRoute><ContasPagar /></ProtectedRoute>} />
              <Route path="/financeiro/contas-receber" element={<ProtectedRoute><ContasReceber /></ProtectedRoute>} />
              <Route path="/financeiro/boletos" element={<ProtectedRoute><GerarBoletos /></ProtectedRoute>} />
              <Route path="/financeiro/config-boletos" element={<ProtectedRoute><ConfigBoletos /></ProtectedRoute>} />
              <Route path="/financeiro/fluxo-caixa" element={<ProtectedRoute><FluxoCaixa /></ProtectedRoute>} />
              <Route path="/financeiro/cnab" element={<ProtectedRoute><IntegracaoCNAB /></ProtectedRoute>} />
              <Route path="/financeiro/pix" element={<ProtectedRoute><ControlePix /></ProtectedRoute>} />
              <Route path="/financeiro/cartoes" element={<ProtectedRoute><ControleCartoes /></ProtectedRoute>} />
              <Route path="/financeiro/consiliacao-cartoes" element={<ProtectedRoute><ConsiliacaoCartoes /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><PlaceholderPage title="Relatórios" description="Relatórios fiscais, contábeis e gerenciais" /></ProtectedRoute>} />
              <Route path="/relatorios/modulo-vendas" element={<ProtectedRoute><ModuloVendas /></ProtectedRoute>} />
              <Route path="/relatorios/vendas-forma-pagamento" element={<ProtectedRoute><VendasFormaPagamento /></ProtectedRoute>} />
              <Route path="/relatorios/vendas-vendedor" element={<ProtectedRoute><VendasVendedor /></ProtectedRoute>} />
              <Route path="/relatorios/vendas-diarias" element={<ProtectedRoute><VendasDiarias /></ProtectedRoute>} />
              <Route path="/relatorios/vendas-produto-curva-abc" element={<ProtectedRoute><VendasProdutoCurvaABC /></ProtectedRoute>} />
              <Route path="/relatorios/vendas-cliente" element={<ProtectedRoute><VendasCliente /></ProtectedRoute>} />
              <Route path="/relatorios/produtividade-tecnicos" element={<ProtectedRoute><ProdutividadeTecnicos /></ProtectedRoute>} />
              <Route path="/relatorios/modulo-servicos" element={<ProtectedRoute><ModuloServicos /></ProtectedRoute>} />
              <Route path="/relatorios/descontos" element={<ProtectedRoute><RelatorioDescontos /></ProtectedRoute>} />
              <Route path="/relatorios/producao" element={<ProtectedRoute><RelatorioProducao /></ProtectedRoute>} />
              <Route path="/relatorios/pesagens" element={<ProtectedRoute><RelatorioPesagens /></ProtectedRoute>} />
              <Route path="/relatorios/historico-custos-xml" element={<ProtectedRoute><HistoricoCustosXML /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><PlaceholderPage title="Configurações" description="Configurações gerais do sistema" /></ProtectedRoute>} />
              <Route path="/configuracoes/logo" element={<ProtectedRoute><ConfigLogo /></ProtectedRoute>} />
              <Route path="/configuracoes/balanca" element={<ProtectedRoute><ConfigBalanca /></ProtectedRoute>} />
              <Route path="/configuracoes/etiquetas" element={<ProtectedRoute><ConfigEtiquetas /></ProtectedRoute>} />
              <Route path="/configuracoes/tef" element={<ProtectedRoute><ConfigTEF /></ProtectedRoute>} />
              <Route path="/configuracoes/nfce" element={<ProtectedRoute><ConfigNFCe /></ProtectedRoute>} />
              <Route path="/configuracoes/nfe" element={<ProtectedRoute><ConfigNFe /></ProtectedRoute>} />
              <Route path="/configuracoes/formas-pagamento" element={<ProtectedRoute><ConfigFormasPagamento /></ProtectedRoute>} />
              <Route path="/configuracoes/log-liberacoes" element={<ProtectedRoute><LogLiberacoesGerenciais /></ProtectedRoute>} />
              <Route path="/configuracoes/usuarios" element={<ProtectedRoute><GerenciarUsuarios /></ProtectedRoute>} />
              <Route path="/configuracoes/alterar-senha" element={<ProtectedRoute><AlterarSenha /></ProtectedRoute>} />
              <Route path="/configuracoes/log-auditoria" element={<ProtectedRoute><LogAuditoria /></ProtectedRoute>} />
              <Route path="/configuracoes/personalizar-cores" element={<ProtectedRoute><PersonalizarCores /></ProtectedRoute>} />
              <Route path="/configuracoes/relatorios" element={<ProtectedRoute><ConfigRelatorios /></ProtectedRoute>} />
              <Route path="/configuracoes/permissoes" element={<ProtectedRoute><PermissoesModulos /></ProtectedRoute>} />
              <Route path="/configuracoes/relatorio-seguranca" element={<ProtectedRoute><RelatorioSeguranca /></ProtectedRoute>} />
              <Route path="/configuracoes/biometria" element={<ProtectedRoute><BiometriaHardware /></ProtectedRoute>} />
              <Route path="/configuracoes/webhook-intelbras" element={<ProtectedRoute><WebhookIntelbras /></ProtectedRoute>} />
              <Route path="/tabelas/lista-coletor" element={<ProtectedRoute><PlaceholderPage title="Lista Coletor" description="Gerenciar listas de coletor" /></ProtectedRoute>} />
              <Route path="/tabelas/cfop" element={<ProtectedRoute><CFOP /></ProtectedRoute>} />
              <Route path="/tabelas/cnae" element={<ProtectedRoute><CNAE /></ProtectedRoute>} />
              <Route path="/tabelas/cst" element={<ProtectedRoute><CST /></ProtectedRoute>} />
              <Route path="/tabelas/feriados" element={<ProtectedRoute><PlaceholderPage title="Feriados" description="Gerenciar feriados nacionais e regionais" /></ProtectedRoute>} />
              <Route path="/tabelas/paf" element={<ProtectedRoute><PlaceholderPage title="PAF" description="Programa Aplicativo Fiscal" /></ProtectedRoute>} />
              <Route path="/tabelas/metas" element={<ProtectedRoute><PlaceholderPage title="Metas" description="Gerenciar metas comerciais" /></ProtectedRoute>} />
              <Route path="/tabelas/postal" element={<ProtectedRoute><PlaceholderPage title="Postal" description="Tabela de códigos postais" /></ProtectedRoute>} />
              <Route path="/tabelas/ncm" element={<ProtectedRoute><NCMTabela /></ProtectedRoute>} />
              <Route path="/tabelas/tipi" element={<ProtectedRoute><PlaceholderPage title="TIPI" description="Tabela de Incidência do IPI" /></ProtectedRoute>} />
              <Route path="/tabelas/unidade-mercadorias" element={<ProtectedRoute><PlaceholderPage title="Unidade de Mercadorias" description="Unidades de medida de mercadorias" /></ProtectedRoute>} />
              <Route path="/tabelas/genero-mercadoria" element={<ProtectedRoute><PlaceholderPage title="Gênero Mercadoria/Serviços" description="Gêneros de mercadorias e serviços" /></ProtectedRoute>} />
              <Route path="/tabelas/ajuste-documentos" element={<ProtectedRoute><PlaceholderPage title="Ajuste Documentos e Receitas" description="Ajustes de documentos e receitas fiscais" /></ProtectedRoute>} />
              <Route path="/tabelas/cest" element={<ProtectedRoute><CEST /></ProtectedRoute>} />
              <Route path="/tabelas/tipo-entrega" element={<ProtectedRoute><PlaceholderPage title="Tipo de Entrega" description="Tipos de entrega disponíveis" /></ProtectedRoute>} />
              <Route path="/tabelas/pis-cofins" element={<ProtectedRoute><PisCofins /></ProtectedRoute>} />
              <Route path="/tabelas/dcb" element={<ProtectedRoute><DCB /></ProtectedRoute>} />
              <Route path="/tabelas/anp" element={<ProtectedRoute><ANP /></ProtectedRoute>} />
              <Route path="/tabelas/pos" element={<ProtectedRoute><PlaceholderPage title="POS" description="Configurações de POS" /></ProtectedRoute>} />
              <Route path="/tabelas/beneficio-fiscal" element={<ProtectedRoute><BeneficioFiscal /></ProtectedRoute>} />
              <Route path="/tabelas/cst-ibs-cbs" element={<ProtectedRoute><CstIbsCbs /></ProtectedRoute>} />
              <Route path="/tabelas/ccredpres" element={<ProtectedRoute><CCredPres /></ProtectedRoute>} />
              <Route path="/tabelas/cclasstrib" element={<ProtectedRoute><CClassTrib /></ProtectedRoute>} />
              <Route path="/tabelas/ibpt" element={<ProtectedRoute><IBPTTabela /></ProtectedRoute>} />
              
            </Route>
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </Suspense>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AnimatePresence>
          {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        </AnimatePresence>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
