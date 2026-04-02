import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LogLiberacao, loadLogs, clearLiberacoes } from "@/components/liberacoes/types";
import LiberacoesFilters from "@/components/liberacoes/LiberacoesFilters";
import LiberacoesKPIs from "@/components/liberacoes/LiberacoesKPIs";
import LiberacoesCharts from "@/components/liberacoes/LiberacoesCharts";
import LiberacoesTable from "@/components/liberacoes/LiberacoesTable";
import { exportPDF, exportExcel, exportCSV, shareWhatsApp, type ExportColumn } from "@/lib/exportUtils";
export default function LogLiberacoesGerenciais() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<LogLiberacao[]>([]);
  useEffect(() => { loadLogs().then(setLogs); }, []);
  const [busca, setBusca] = useState(() => searchParams.get("busca") || "");
  const [dataInicio, setDataInicio] = useState<Date | undefined>(() => {
    const v = searchParams.get("inicio");
    return v ? new Date(v) : undefined;
  });
  const [dataFim, setDataFim] = useState<Date | undefined>(() => {
    const v = searchParams.get("fim");
    return v ? new Date(v) : undefined;
  });
  const [filtroMotivo, setFiltroMotivo] = useState<string>(() => searchParams.get("motivo") || "todos");
  const [filtroOperador, setFiltroOperador] = useState<string>(() => searchParams.get("operador") || "todos");
  const reportRef = useRef<HTMLDivElement>(null);

  const operadores = useMemo(() => {
    const set = new Set(logs.map(l => l.operador));
    return Array.from(set).sort();
  }, [logs]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (busca.trim()) params.set("busca", busca);
    if (dataInicio) params.set("inicio", dataInicio.toISOString().slice(0, 10));
    if (dataFim) params.set("fim", dataFim.toISOString().slice(0, 10));
    if (filtroMotivo !== "todos") params.set("motivo", filtroMotivo);
    if (filtroOperador !== "todos") params.set("operador", filtroOperador);
    setSearchParams(params, { replace: true });
  }, [busca, dataInicio, dataFim, filtroMotivo, filtroOperador, setSearchParams]);

  const filtered = useMemo(() => {
    let result = logs;
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      inicio.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.data) >= inicio);
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.data) <= fim);
    }
    if (filtroMotivo !== "todos") {
      if (filtroMotivo === "excesso") {
        result = result.filter(l => !l.motivo || l.motivo.includes("limite"));
      } else if (filtroMotivo === "promo") {
        result = result.filter(l => l.motivo?.includes("promoção"));
      }
    }
    if (filtroOperador !== "todos") {
      result = result.filter(l => l.operador === filtroOperador);
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(l =>
        l.cliente.toLowerCase().includes(q) ||
        l.operador.toLowerCase().includes(q) ||
        l.clienteDoc.includes(q)
      );
    }
    return result;
  }, [logs, busca, dataInicio, dataFim, filtroMotivo, filtroOperador]);

  // Chart data
  const dadosPorPeriodo = useMemo(() => {
    const map: Record<string, { data: string; total: number; qtd: number }> = {};
    filtered.forEach(l => {
      const dia = new Date(l.data).toLocaleDateString("pt-BR");
      if (!map[dia]) map[dia] = { data: dia, total: 0, qtd: 0 };
      map[dia].total += l.valorAutorizado;
      map[dia].qtd += 1;
    });
    return Object.values(map).slice(-30);
  }, [filtered]);

  const dadosPorOperador = useMemo(() => {
    const map: Record<string, { name: string; value: number; qtd: number }> = {};
    filtered.forEach(l => {
      if (!map[l.operador]) map[l.operador] = { name: l.operador, value: 0, qtd: 0 };
      map[l.operador].value += l.valorAutorizado;
      map[l.operador].qtd += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const dadosPorCliente = useMemo(() => {
    const map: Record<string, { name: string; value: number; qtd: number }> = {};
    filtered.forEach(l => {
      const key = l.clienteDoc || l.cliente;
      if (!map[key]) map[key] = { name: l.cliente, value: 0, qtd: 0 };
      map[key].value += l.valorAutorizado;
      map[key].qtd += 1;
    });
    return Object.values(map).sort((a, b) => b.qtd - a.qtd).slice(0, 6);
  }, [filtered]);

  const totalGeral = useMemo(() => filtered.reduce((a, l) => a + l.valorAutorizado, 0), [filtered]);
  const totalExcedente = useMemo(() => filtered.reduce((a, l) => a + l.excedente, 0), [filtered]);

  const limparLogs = async () => {
    await clearLiberacoes();
    setLogs([]);
    toast.success("Histórico de liberações limpo");
  };

  const exportColumns: ExportColumn[] = [
    { header: "Data / Hora", key: "data", format: (v) => `${new Date(v).toLocaleDateString("pt-BR")} ${new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` },
    { header: "Operador", key: "operador" },
    { header: "Cliente", key: "cliente" },
    { header: "CPF/CNPJ", key: "clienteDoc" },
    { header: "Valor Autorizado", key: "valorAutorizado", align: "right", format: (v) => `R$ ${Number(v).toFixed(2)}` },
    { header: "Limite Disponível", key: "limiteDisponivel", align: "right", format: (v) => `R$ ${Number(v).toFixed(2)}` },
    { header: "Excedente", key: "excedente", align: "right", format: (v) => `R$ ${Number(v).toFixed(2)}` },
    { header: "Motivo", key: "motivo", format: (v) => v || "Excesso de limite" },
  ];

  const periodoLabel = [
    dataInicio || dataFim
      ? `Período: ${dataInicio ? format(dataInicio, "dd/MM/yyyy") : "início"} a ${dataFim ? format(dataFim, "dd/MM/yyyy") : "atual"}`
      : "Todos os registros",
    filtroOperador !== "todos" ? `Operador: ${filtroOperador}` : null,
    filtroMotivo !== "todos" ? `Motivo: ${filtroMotivo === "excesso" ? "Excesso de limite" : "Crediário com promoção"}` : null,
  ].filter(Boolean).join(" | ");

  const getExportOptions = () => ({
    title: "Relatório de Liberações Gerenciais",
    subtitle: periodoLabel,
    filename: `liberacoes-gerenciais-${new Date().toISOString().slice(0, 10)}`,
    columns: exportColumns,
    data: filtered.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    summaryRows: [
      { label: "Total de Liberações", value: String(filtered.length) },
      { label: "Valor Total Autorizado", value: `R$ ${totalGeral.toFixed(2)}` },
      { label: "Total Excedente", value: `R$ ${totalExcedente.toFixed(2)}` },
      { label: "Clientes Distintos", value: String(new Set(filtered.map(l => l.clienteDoc)).size) },
    ],
  });

  const exportarPDF = () => {
    if (filtered.length === 0) { toast.warning("Nenhum registro para exportar"); return; }
    exportPDF(getExportOptions());
    toast.success("Relatório PDF gerado!");
  };

  const exportarCSV = () => {
    if (filtered.length === 0) { toast.warning("Nenhum registro para exportar"); return; }
    exportCSV(getExportOptions());
    toast.success("CSV exportado!");
  };

  const exportarExcel = () => {
    if (filtered.length === 0) { toast.warning("Nenhum registro para exportar"); return; }
    exportExcel(getExportOptions());
    toast.success("Arquivo Excel exportado!");
  };

  const compartilharWhatsApp = () => {
    if (filtered.length === 0) { toast.warning("Nenhum registro para compartilhar"); return; }
    shareWhatsApp(getExportOptions());
  };

  return (
    <div className="page-container">
      <PageHeader title="Relatório de Liberações Gerenciais" description="Análise de autorizações para vendas em crediário acima do limite" />

      <div ref={reportRef}>
        <LiberacoesFilters
          dataInicio={dataInicio}
          dataFim={dataFim}
          filtroMotivo={filtroMotivo}
          filtroOperador={filtroOperador}
          operadores={operadores}
          filteredCount={filtered.length}
          totalCount={logs.length}
          busca={busca}
          onDataInicioChange={setDataInicio}
          onDataFimChange={setDataFim}
          onFiltroMotivoChange={setFiltroMotivo}
          onFiltroOperadorChange={setFiltroOperador}
          onBuscaChange={setBusca}
        />

        {filtered.length > 0 && (
          <LiberacoesKPIs
            totalLiberacoes={logs.length}
            totalGeral={totalGeral}
            totalExcedente={totalExcedente}
            clientesDistintos={new Set(filtered.map(l => l.clienteDoc)).size}
          />
        )}

        {filtered.length > 0 && (
          <LiberacoesCharts
            dadosPorPeriodo={dadosPorPeriodo}
            dadosPorOperador={dadosPorOperador}
            dadosPorCliente={dadosPorCliente}
          />
        )}
      </div>

      <LiberacoesTable
        logs={logs}
        filtered={filtered}
        busca={busca}
        onBuscaChange={setBusca}
        onLimpar={limparLogs}
        onExportarCSV={exportarCSV}
        onExportarExcel={exportarExcel}
        onExportarPDF={exportarPDF}
        onWhatsApp={compartilharWhatsApp}
        onImprimir={exportarPDF}
      />

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
