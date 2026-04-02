import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, ClipboardList, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const reports = [
  {
    title: "Produtividade de Técnicos",
    description: "Ranking de performance com volume de OS concluídas, faturamento e tempo médio de atendimento",
    icon: Users,
    path: "/relatorios/produtividade-tecnicos",
    color: "hsl(var(--chart-1))",
  },
  {
    title: "Ordens de Serviço",
    description: "Gestão completa do ciclo de vida das OS com acompanhamento técnico e histórico",
    icon: ClipboardList,
    path: "/servicos/ordens-servico",
    color: "hsl(var(--chart-2))",
  },
];

interface OSData {
  status?: string;
  dataAbertura?: string;
}

function useOSData() {
  return useMemo(() => {
    try {
      const ordens: OSData[] = JSON.parse(localStorage.getItem("ordens_servico") || "[]");
      const total = ordens.length;
      const concluidas = ordens.filter((o) => o.status === "Concluída").length;
      const emAndamento = ordens.filter((o) => o.status === "Em Andamento").length;
      const abertas = ordens.filter((o) => o.status === "Aberta").length;

      // Evolução mensal dos últimos 6 meses
      const now = new Date();
      const chartData = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(now, 5 - i);
        const mesKey = format(date, "yyyy-MM");
        const mesLabel = format(date, "MMM/yy", { locale: ptBR });

        const doMes = ordens.filter((o) => {
          if (!o.dataAbertura) return false;
          try { return format(parseISO(o.dataAbertura), "yyyy-MM") === mesKey; } catch { return false; }
        });

        return {
          mes: mesLabel,
          abertas: doMes.filter((o) => o.status === "Aberta").length,
          emAndamento: doMes.filter((o) => o.status === "Em Andamento").length,
          concluidas: doMes.filter((o) => o.status === "Concluída").length,
          canceladas: doMes.filter((o) => o.status === "Cancelada").length,
        };
      });

      return { total, concluidas, emAndamento, abertas, chartData };
    } catch {
      return { total: 0, concluidas: 0, emAndamento: 0, abertas: 0, chartData: [] };
    }
  }, []);
}

export default function ModuloServicos() {
  const navigate = useNavigate();
  const { total, concluidas, emAndamento, abertas, chartData } = useOSData();

  const kpis = [
    { label: "Total de OS", value: total, icon: ClipboardList, colorClass: "bg-primary/10 text-primary" },
    { label: "Concluídas", value: concluidas, icon: CheckCircle, colorClass: "bg-emerald-500/10 text-emerald-500" },
    { label: "Em Andamento", value: emAndamento, icon: Clock, colorClass: "bg-amber-500/10 text-amber-500" },
    { label: "Abertas", value: abertas, icon: AlertTriangle, colorClass: "bg-destructive/10 text-destructive" },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Relatórios de Serviços"
        description="Painel centralizado com relatórios de ordens de serviço e produtividade técnica"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg shrink-0 ${kpi.colorClass}`}>
                <kpi.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráfico de evolução mensal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução Mensal de OS (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="abertas" name="Abertas" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="emAndamento" name="Em Andamento" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} stackId="a" />
                <Bar dataKey="canceladas" name="Canceladas" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
