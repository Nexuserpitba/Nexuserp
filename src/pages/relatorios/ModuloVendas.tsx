import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, BarChart3, Users, TrendingUp, CreditCard, ShoppingCart, DollarSign, Receipt } from "lucide-react";

const reports = [
  {
    title: "Vendas por Forma de Pagamento",
    description: "Análise de vendas agrupadas por método de pagamento com gráficos de distribuição",
    icon: CreditCard,
    path: "/relatorios/vendas-forma-pagamento",
    color: "hsl(var(--chart-1))",
  },
  {
    title: "Vendas por Vendedor",
    description: "Ranking de performance dos vendedores com metas e comissões",
    icon: Users,
    path: "/relatorios/vendas-vendedor",
    color: "hsl(var(--chart-2))",
  },
  {
    title: "Vendas Diárias",
    description: "Evolução temporal das vendas com cálculo automático de tendências",
    icon: TrendingUp,
    path: "/relatorios/vendas-diarias",
    color: "hsl(var(--chart-3))",
  },
  {
    title: "Curva ABC de Produtos",
    description: "Classificação de produtos pela lei de Pareto (A: 80%, B: 15%, C: 5%)",
    icon: BarChart3,
    path: "/relatorios/vendas-produto-curva-abc",
    color: "hsl(var(--chart-4))",
  },
  {
    title: "Vendas por Cliente",
    description: "Análise de frequência de compra, ticket médio e concentração de faturamento",
    icon: PieChart,
    path: "/relatorios/vendas-cliente",
    color: "hsl(var(--chart-5))",
  },
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useKPIs() {
  return useMemo(() => {
    const now = new Date();
    const inicio = startOfMonth(now);
    const fim = endOfMonth(now);

    try {
      const vendas: Array<{ data?: string; dataVenda?: string; total?: number; valorTotal?: number }> =
        JSON.parse(localStorage.getItem("vendas_pdv") || "[]");

      const vendasMes = vendas.filter((v) => {
        const dateStr = v.data || v.dataVenda;
        if (!dateStr) return false;
        try {
          return isWithinInterval(parseISO(dateStr), { start: inicio, end: fim });
        } catch {
          return false;
        }
      });

      const totalVendas = vendasMes.length;
      const faturamento = vendasMes.reduce((s, v) => s + (v.total || v.valorTotal || 0), 0);
      const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;

      return { totalVendas, faturamento, ticketMedio };
    } catch {
      return { totalVendas: 0, faturamento: 0, ticketMedio: 0 };
    }
  }, []);
}

export default function ModuloVendas() {
  const navigate = useNavigate();
  const { totalVendas, faturamento, ticketMedio } = useKPIs();

  return (
    <div className="page-container">
      <PageHeader
        title="Relatórios de Vendas"
        description="Painel centralizado com todos os relatórios de vendas do sistema"
      />

      {/* KPIs do mês atual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas no Mês</p>
              <p className="text-2xl font-bold text-foreground">{totalVendas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento no Mês</p>
              <p className="text-2xl font-bold text-foreground">{formatBRL(faturamento)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Receipt size={22} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-2xl font-bold text-foreground">{formatBRL(ticketMedio)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card
            key={report.path}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-border/60"
            onClick={() => navigate(report.path)}
          >
            <CardHeader className="pb-2 flex flex-row items-start gap-3">
              <div
                className="p-2.5 rounded-lg shrink-0"
                style={{ backgroundColor: `${report.color}20`, color: report.color }}
              >
                <report.icon size={22} />
              </div>
              <CardTitle className="text-base leading-tight">{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
