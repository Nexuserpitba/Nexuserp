import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, ClipboardList, ArrowLeft, ChevronLeft, ChevronRight, CalendarIcon, X } from "lucide-react";
import { toast } from "sonner";
import { getAuditLogs, clearAuditLogs, getActionLabel, AuditEntry } from "@/lib/auditLog";
import { ExportButtons } from "@/components/ExportButtons";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

const actionColors: Record<string, string> = {
  login: "bg-primary/15 text-primary",
  login_biometria: "bg-primary/15 text-primary",
  logout: "bg-muted text-muted-foreground",
  pdv_login: "bg-primary/15 text-primary",
  pdv_logout: "bg-muted text-muted-foreground",
  pdv_troca_operador: "bg-accent text-accent-foreground",
  senha_alterada: "bg-destructive/15 text-destructive",
  biometria_cadastrada: "bg-primary/15 text-primary",
  biometria_removida: "bg-destructive/15 text-destructive",
  pdv_alterar_quantidade: "bg-accent text-accent-foreground",
  pdv_alterar_preco: "bg-destructive/15 text-destructive",
  permissoes_alteradas: "bg-chart-4/15 text-chart-4",
  permissoes_restauradas: "bg-chart-3/15 text-chart-3",
  acesso_negado: "bg-destructive/15 text-destructive",
  ncm_auto_sugestao: "bg-chart-3/15 text-chart-3",
  ncm_edicao_massa: "bg-chart-4/15 text-chart-4",
};

const actionFilterOptions: { value: string; label: string }[] = [
  { value: "todas", label: "Todas as ações" },
  { value: "login", label: "Login no sistema" },
  { value: "logout", label: "Logout do sistema" },
  { value: "login_biometria", label: "Login por biometria" },
  { value: "pdv_login", label: "Login no PDV" },
  { value: "pdv_logout", label: "Logout do PDV" },
  { value: "pdv_troca_operador", label: "Troca de operador" },
  { value: "senha_alterada", label: "Senha alterada" },
  { value: "biometria_cadastrada", label: "Biometria cadastrada" },
  { value: "biometria_removida", label: "Biometria removida" },
  { value: "pdv_alterar_quantidade", label: "Alteração de quantidade" },
  { value: "pdv_alterar_preco", label: "Alteração de preço" },
  { value: "permissoes_alteradas", label: "Permissões alteradas" },
  { value: "permissoes_restauradas", label: "Permissões restauradas" },
  { value: "acesso_negado", label: "Acesso negado" },
  { value: "ncm_auto_sugestao", label: "NCM auto-sugestão" },
  { value: "ncm_edicao_massa", label: "NCM edição em massa" },
];

export default function LogAuditoria() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  useEffect(() => { getAuditLogs().then(setLogs); }, []);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("todas");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  const filtered = useMemo(() => {
    let result = logs;
    if (actionFilter !== "todas") {
      result = result.filter(l => l.action === actionFilter);
    }
    if (dataInicio) {
      const start = startOfDay(dataInicio);
      result = result.filter(l => new Date(l.timestamp) >= start);
    }
    if (dataFim) {
      const end = endOfDay(dataFim);
      result = result.filter(l => new Date(l.timestamp) <= end);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          getActionLabel(l.action).toLowerCase().includes(q) ||
          (l.detail && l.detail.toLowerCase().includes(q))
      );
    }
    return result;
  }, [logs, search, actionFilter, dataInicio, dataFim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  // Reset page when filters change
  useMemo(() => { setPage(1); }, [search, actionFilter, dataInicio, dataFim]);

  const handleClear = async () => {
    await clearAuditLogs();
    setLogs([]);
    toast.success("Log de auditoria limpo");
  };

  const exportSubtitle = [
    actionFilter !== "todas" ? `Ação: ${actionFilterOptions.find(o => o.value === actionFilter)?.label}` : "",
    search.trim() ? `Busca: "${search}"` : "",
    dataInicio ? `De: ${format(dataInicio, "dd/MM/yyyy")}` : "",
    dataFim ? `Até: ${format(dataFim, "dd/MM/yyyy")}` : "",
  ].filter(Boolean).join(" | ") || undefined;

  const exportOptions = useMemo(() => ({
    title: "Log de Auditoria",
    filename: "log-auditoria",
    subtitle: exportSubtitle,
    columns: [
      { header: "Data/Hora", key: "dataHora" },
      { header: "Ação", key: "acao" },
      { header: "Usuário", key: "usuario" },
      { header: "Perfil", key: "perfil" },
      { header: "Detalhe", key: "detalhe" },
    ],
    data: filtered.map(log => ({
      dataHora: format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss"),
      acao: getActionLabel(log.action),
      usuario: log.userName,
      perfil: log.userRole,
      detalhe: log.detail || "—",
    })),
    summaryRows: [
      { label: "Total de registros", value: filtered.length.toString() },
    ],
  }), [filtered, exportSubtitle]);

  return (
    <div className="page-container">
      <PageHeader
        title="Log de Auditoria"
        description="Registro de login, logout e operações do sistema"
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou detalhe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                {actionFilterOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5", !dataInicio && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data inicial"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1.5", !dataFim && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data final"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {(dataInicio || dataFim) && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDataInicio(undefined); setDataFim(undefined); }}>
                <X className="h-4 w-4" />
              </Button>
            )}
            <Badge variant="outline" className="gap-1">
              <ClipboardList className="h-3 w-3" />
              {filtered.length} registros
            </Badge>
            <ExportButtons options={exportOptions} />
            <Button variant="destructive" size="sm" className="gap-1" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>

          <div className="rounded-md border max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">{log.userRole}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.detail || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Exibindo {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filtered.length)} de {filtered.length}</span>
                <Select value={pageSize.toString()} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">{safePage} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
