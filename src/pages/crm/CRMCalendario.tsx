import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { Lead, Atividade, TIPOS_ATIVIDADE } from "@/types/crm";
import { defaultLeads, defaultAtividades } from "@/data/crmDefaultData";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Phone, Mail, Calendar, MapPin, ClipboardList, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, addMonths, subMonths, isToday,
  addWeeks, subWeeks, addDays, subDays, eachHourOfInterval, startOfDay, endOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = 'month' | 'week' | 'day';

const tipoIcons: Record<string, React.ElementType> = {
  ligacao: Phone, email: Mail, reuniao: Calendar, visita: MapPin, tarefa: ClipboardList, follow_up: RotateCcw,
};

const tipoColors: Record<string, string> = {
  ligacao: "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200",
  email: "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-200",
  reuniao: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200",
  visita: "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-200",
  tarefa: "bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-200",
  follow_up: "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200",
};

const statusDot: Record<string, string> = {
  pendente: "bg-amber-500",
  concluida: "bg-green-500",
  cancelada: "bg-muted-foreground",
  atrasada: "bg-red-500",
};

const CRMCalendario = () => {
  const { items: atividades, updateItem } = useLocalStorage<Atividade>("gp_erp_crm_atividades", defaultAtividades);
  const { items: leads } = useLocalStorage<Lead>("gp_erp_crm_leads", defaultLeads);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [dragId, setDragId] = useState<string | null>(null);
  const { toast } = useToast();

  const getLeadNome = (id: string) => leads.find(l => l.id === id)?.nome || '';

  const atividadesPorDia = useMemo(() => {
    const map: Record<string, Atividade[]> = {};
    atividades.forEach(a => {
      const key = a.dataAgendada;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [atividades]);

  const navegar = (dir: number) => {
    if (view === 'month') setDataAtual(dir > 0 ? addMonths(dataAtual, 1) : subMonths(dataAtual, 1));
    else if (view === 'week') setDataAtual(dir > 0 ? addWeeks(dataAtual, 1) : subWeeks(dataAtual, 1));
    else setDataAtual(dir > 0 ? addDays(dataAtual, 1) : subDays(dataAtual, 1));
  };

  const tituloNav = () => {
    if (view === 'month') return format(dataAtual, "MMMM yyyy", { locale: ptBR });
    if (view === 'week') {
      const s = startOfWeek(dataAtual, { weekStartsOn: 0 });
      const e = endOfWeek(dataAtual, { weekStartsOn: 0 });
      return `${format(s, "dd/MM")} — ${format(e, "dd/MM/yyyy")}`;
    }
    return format(dataAtual, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDrop = useCallback((e: React.DragEvent, dia: Date) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const novaData = format(dia, 'yyyy-MM-dd');
    const atv = atividades.find(a => a.id === id);
    if (atv && atv.dataAgendada !== novaData) {
      updateItem(id, { dataAgendada: novaData });
      toast({ title: "Atividade reagendada", description: `Movida para ${format(dia, "dd/MM/yyyy")}` });
    }
    setDragId(null);
  }, [atividades, updateItem, toast]);

  const renderAtividade = (atv: Atividade, compact = false) => {
    const Icon = tipoIcons[atv.tipo] || ClipboardList;
    return (
      <div
        key={atv.id}
        draggable
        onDragStart={(e) => handleDragStart(e, atv.id)}
        className={cn(
          "px-1.5 py-0.5 rounded border cursor-grab active:cursor-grabbing flex items-center gap-1 truncate",
          compact ? "text-[10px]" : "text-xs py-1",
          tipoColors[atv.tipo],
          dragId === atv.id && "opacity-50",
        )}
        title={`${atv.titulo} — ${getLeadNome(atv.leadId)}`}
      >
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot[atv.status])} />
        <Icon className={cn("shrink-0", compact ? "w-2.5 h-2.5" : "w-3 h-3")} />
        <span className="truncate">{atv.titulo}</span>
        {!compact && <span className="text-[10px] opacity-70 ml-auto shrink-0">{getLeadNome(atv.leadId)}</span>}
      </div>
    );
  };

  // ===== MONTH VIEW =====
  const diasMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(dataAtual), { weekStartsOn: 0 });
    const fim = endOfWeek(endOfMonth(dataAtual), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: inicio, end: fim });
  }, [dataAtual]);

  // ===== WEEK VIEW =====
  const diasSemana = useMemo(() => {
    const s = startOfWeek(dataAtual, { weekStartsOn: 0 });
    const e = endOfWeek(dataAtual, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: s, end: e });
  }, [dataAtual]);

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-4">
      <PageHeader title="Calendário CRM" description="Visualize e reagende atividades arrastando entre os dias" />

      <Card className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navegar(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">{tituloNav()}</h2>
            <Button variant="outline" size="icon" onClick={() => navegar(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setDataAtual(new Date())}>Hoje</Button>
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <Button key={v} variant={view === v ? 'default' : 'outline'} size="sm" onClick={() => setView(v)}>
                {{ month: 'Mês', week: 'Semana', day: 'Dia' }[v]}
              </Button>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mb-3">
          {TIPOS_ATIVIDADE.map(t => {
            const Icon = tipoIcons[t.key] || ClipboardList;
            return (
              <Badge key={t.key} variant="outline" className={cn("text-[10px] gap-1", tipoColors[t.key])}>
                <Icon className="w-3 h-3" /> {t.label}
              </Badge>
            );
          })}
        </div>

        {/* ===== MONTH VIEW ===== */}
        {view === 'month' && (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map(d => (
              <div key={d} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
            {diasMes.map(dia => {
              const key = format(dia, 'yyyy-MM-dd');
              const atvDia = atividadesPorDia[key] || [];
              return (
                <div
                  key={key}
                  className={cn(
                    "bg-background min-h-[100px] p-1 transition-colors",
                    !isSameMonth(dia, dataAtual) && "opacity-40",
                    isToday(dia) && "ring-2 ring-primary/30 ring-inset",
                    dragId && "hover:bg-accent/30",
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dia)}
                >
                  <div className={cn("text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday(dia) && "bg-primary text-primary-foreground")}>
                    {format(dia, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {atvDia.slice(0, 3).map(atv => renderAtividade(atv, true))}
                    {atvDia.length > 3 && <div className="text-[9px] text-muted-foreground text-center">+{atvDia.length - 3} mais</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== WEEK VIEW ===== */}
        {view === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {diasSemana.map(dia => {
              const key = format(dia, 'yyyy-MM-dd');
              const atvDia = atividadesPorDia[key] || [];
              return (
                <div
                  key={key}
                  className={cn(
                    "bg-muted/20 rounded-lg p-2 min-h-[300px] border transition-colors",
                    isToday(dia) && "ring-2 ring-primary/40",
                    dragId && "hover:bg-accent/20",
                  )}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, dia)}
                >
                  <div className="text-center mb-2">
                    <div className="text-[10px] text-muted-foreground uppercase">{format(dia, 'EEE', { locale: ptBR })}</div>
                    <div className={cn("text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                      isToday(dia) && "bg-primary text-primary-foreground")}>
                      {format(dia, 'd')}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {atvDia.map(atv => renderAtividade(atv, false))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== DAY VIEW ===== */}
        {view === 'day' && (
          <div
            className={cn("bg-muted/10 rounded-lg p-4 min-h-[400px] border", dragId && "hover:bg-accent/20")}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, dataAtual)}
          >
            <div className="text-center mb-4">
              <div className={cn("text-2xl font-bold inline-flex items-center justify-center w-12 h-12 rounded-full",
                isToday(dataAtual) && "bg-primary text-primary-foreground")}>
                {format(dataAtual, 'd')}
              </div>
              <div className="text-sm text-muted-foreground capitalize mt-1">
                {format(dataAtual, "EEEE", { locale: ptBR })}
              </div>
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              {(atividadesPorDia[format(dataAtual, 'yyyy-MM-dd')] || []).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">Nenhuma atividade neste dia</p>
              )}
              {(atividadesPorDia[format(dataAtual, 'yyyy-MM-dd')] || []).map(atv => {
                const Icon = tipoIcons[atv.tipo] || ClipboardList;
                return (
                  <div
                    key={atv.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, atv.id)}
                    className={cn(
                      "p-3 rounded-lg border flex items-start gap-3 cursor-grab active:cursor-grabbing",
                      tipoColors[atv.tipo],
                      dragId === atv.id && "opacity-50",
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", statusDot[atv.status])} />
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{atv.titulo}</p>
                      <p className="text-xs opacity-70">{getLeadNome(atv.leadId)}</p>
                      {atv.descricao && <p className="text-xs mt-1 opacity-60">{atv.descricao}</p>}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {TIPOS_ATIVIDADE.find(t => t.key === atv.tipo)?.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CRMCalendario;
