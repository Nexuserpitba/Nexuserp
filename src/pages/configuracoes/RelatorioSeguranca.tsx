import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/components/ExportButtons";
import { ShieldAlert, CalendarIcon, X, ArrowLeft, TrendingUp, Users, MapPin, Ban, Unlock, Settings2 } from "lucide-react";
import { getAuditLogs, getActionLabel, getBlockedUsers, unblockUser, addAuditLog, getBlockConfig, saveBlockConfig, type BlockConfig } from "@/lib/auditLog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function RelatorioSeguranca() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState<Date | undefined>(() => subDays(new Date(), 30));
  const [dataFim, setDataFim] = useState<Date | undefined>(() => new Date());
  const [periodo, setPeriodo] = useState("30");
  const [refreshKey, setRefreshKey] = useState(0);
  const [blockCfg, setBlockCfg] = useState<BlockConfig>(() => getBlockConfig());
  const [allDenied, setAllDenied] = useState<any[]>([]);

  useEffect(() => {
    getAuditLogs().then(logs => {
      setAllDenied(logs.filter(l => l.action === "acesso_negado"));
    });
  }, [refreshKey]);

  const handlePeriodo = (val: string) => {
    setPeriodo(val);
    if (val !== "custom") {
      const days = parseInt(val);
      setDataInicio(subDays(new Date(), days));
      setDataFim(new Date());
    }
  };

  const denied = useMemo(() => {
    let logs = allDenied;
    if (dataInicio) logs = logs.filter(l => new Date(l.timestamp) >= startOfDay(dataInicio));
    if (dataFim) logs = logs.filter(l => new Date(l.timestamp) <= endOfDay(dataFim));
    return logs;
  }, [allDenied, dataInicio, dataFim]);

  // KPIs
  const totalDenied = denied.length;
  const uniqueUsers = new Set(denied.map(l => l.userId)).size;
  const uniqueRoutes = new Set(denied.map(l => l.detail?.replace("Rota: ", "") || "")).size;

  // By user
  const byUser = useMemo(() => {
    const map = new Map<string, { name: string; role: string; count: number }>();
    denied.forEach(l => {
      const existing = map.get(l.userId) || { name: l.userName, role: l.userRole, count: 0 };
      existing.count++;
      map.set(l.userId, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [denied]);

  // By route
  const byRoute = useMemo(() => {
    const map = new Map<string, number>();
    denied.forEach(l => {
      const route = l.detail?.replace("Rota: ", "") || "desconhecida";
      map.set(route, (map.get(route) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count);
  }, [denied]);

  // By day (timeline)
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    denied.forEach(l => {
      const day = format(new Date(l.timestamp), "dd/MM");
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
  }, [denied]);

  const exportOptions = useMemo(() => ({
    title: "Relatório de Segurança - Acessos Negados",
    filename: "relatorio-seguranca",
    subtitle: `${dataInicio ? format(dataInicio, "dd/MM/yyyy") : ""} a ${dataFim ? format(dataFim, "dd/MM/yyyy") : ""}`,
    columns: [
      { header: "Data/Hora", key: "dataHora" },
      { header: "Usuário", key: "usuario" },
      { header: "Perfil", key: "perfil" },
      { header: "Rota", key: "rota" },
    ],
    data: denied.map(l => ({
      dataHora: format(new Date(l.timestamp), "dd/MM/yyyy HH:mm:ss"),
      usuario: l.userName,
      perfil: l.userRole,
      rota: l.detail?.replace("Rota: ", "") || "—",
    })),
    summaryRows: [
      { label: "Total de tentativas", value: totalDenied.toString() },
      { label: "Usuários envolvidos", value: uniqueUsers.toString() },
      { label: "Rotas diferentes", value: uniqueRoutes.toString() },
    ],
  }), [denied, dataInicio, dataFim, totalDenied, uniqueUsers, uniqueRoutes]);

  return (
    <div className="page-container">
      <PageHeader
        title="Relatório de Segurança"
        description="Monitoramento de tentativas de acesso não autorizado"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={periodo} onValueChange={handlePeriodo}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5", !dataInicio && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Início"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataInicio} onSelect={(d) => { setDataInicio(d); setPeriodo("custom"); }} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-1.5", !dataFim && "text-muted-foreground")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {dataFim ? format(dataFim, "dd/MM/yyyy") : "Fim"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dataFim} onSelect={(d) => { setDataFim(d); setPeriodo("custom"); }} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Badge variant="outline" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          {totalDenied} ocorrências
        </Badge>

        <div className="ml-auto">
          <ExportButtons options={exportOptions} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert size={24} className="text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Bloqueios</p>
              <p className="text-3xl font-bold font-mono">{totalDenied}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Usuários Envolvidos</p>
              <p className="text-3xl font-bold font-mono">{uniqueUsers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center">
              <MapPin size={24} className="text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rotas Diferentes</p>
              <p className="text-3xl font-bold font-mono">{uniqueRoutes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalDenied === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldAlert size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhuma tentativa de acesso negado registrada</p>
            <p className="text-sm">No período selecionado não houve bloqueios de acesso.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Timeline chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp size={18} className="text-primary" />
                Evolução por Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line type="monotone" dataKey="count" name="Bloqueios" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: "hsl(var(--destructive))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By user bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users size={18} className="text-primary" />
                  Bloqueios por Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byUser.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" fontSize={12} stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="count" name="Bloqueios" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* By route pie chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin size={18} className="text-primary" />
                  Bloqueios por Rota
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={byRoute.slice(0, 6)}
                      dataKey="count"
                      nameKey="route"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ route, count }) => `${route} (${count})`}
                      labelLine={false}
                      fontSize={11}
                    >
                      {byRoute.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead className="text-center">Bloqueios</TableHead>
                      <TableHead>Rotas Acessadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byUser.map((u, i) => {
                      const userRoutes = denied
                        .filter(l => l.userName === u.name)
                        .map(l => l.detail?.replace("Rota: ", "") || "")
                        .filter((v, idx, arr) => arr.indexOf(v) === idx);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="capitalize text-muted-foreground">{u.role}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">{u.count}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {userRoutes.join(", ")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Blocked users section */}
      {(() => {
        const blocked = getBlockedUsers().filter(b => new Date(b.expiresAt) > new Date());
        if (blocked.length === 0) return null;
        return (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <Ban size={18} />
                Usuários Bloqueados Atualmente ({blocked.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Bloqueado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocked.map(b => {
                      const minutesLeft = Math.max(1, Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / 60000));
                      return (
                        <TableRow key={b.userId}>
                          <TableCell className="font-medium">{b.userName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.reason}</TableCell>
                          <TableCell className="text-sm">{format(new Date(b.blockedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{minutesLeft} min</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => {
                                unblockUser(b.userId);
                                if (user) addAuditLog("desbloqueio_manual", user, `Desbloqueou: ${b.userName}`);
                                toast.success(`${b.userName} desbloqueado com sucesso`);
                                setRefreshKey(k => k + 1);
                              }}
                            >
                              <Unlock size={14} /> Desbloquear
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Block config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 size={18} className="text-primary" />
            Configuração do Bloqueio Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="block-enabled" className="text-sm">Bloqueio automático ativo</Label>
            <Switch
              id="block-enabled"
              checked={blockCfg.enabled}
              onCheckedChange={v => {
                const next = { ...blockCfg, enabled: v };
                setBlockCfg(next);
                saveBlockConfig(next);
                toast.success(v ? "Bloqueio automático ativado" : "Bloqueio automático desativado");
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Máx. tentativas antes do bloqueio</Label>
              <Input
                type="number"
                min={3}
                max={50}
                value={blockCfg.maxAttempts}
                onChange={e => {
                  const next = { ...blockCfg, maxAttempts: Math.max(3, parseInt(e.target.value) || 10) };
                  setBlockCfg(next);
                  saveBlockConfig(next);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Janela de tempo (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={1440}
                value={blockCfg.windowMinutes}
                onChange={e => {
                  const next = { ...blockCfg, windowMinutes: Math.max(5, parseInt(e.target.value) || 60) };
                  setBlockCfg(next);
                  saveBlockConfig(next);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duração do bloqueio (minutos)</Label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={blockCfg.blockMinutes}
                onChange={e => {
                  const next = { ...blockCfg, blockMinutes: Math.max(1, parseInt(e.target.value) || 30) };
                  setBlockCfg(next);
                  saveBlockConfig(next);
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Quando ativo, usuários com <strong>{blockCfg.maxAttempts}</strong> ou mais acessos negados em{" "}
            <strong>{blockCfg.windowMinutes} minutos</strong> serão bloqueados automaticamente por{" "}
            <strong>{blockCfg.blockMinutes} minutos</strong>.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
    </div>
  );
}
