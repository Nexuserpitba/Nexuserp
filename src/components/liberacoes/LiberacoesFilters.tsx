import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarIcon, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LiberacoesFiltersProps {
  dataInicio: Date | undefined;
  dataFim: Date | undefined;
  filtroMotivo: string;
  filtroOperador: string;
  operadores: string[];
  filteredCount: number;
  totalCount: number;
  busca: string;
  onDataInicioChange: (d: Date | undefined) => void;
  onDataFimChange: (d: Date | undefined) => void;
  onFiltroMotivoChange: (v: string) => void;
  onFiltroOperadorChange: (v: string) => void;
  onBuscaChange: (v: string) => void;
}

export default function LiberacoesFilters({
  dataInicio, dataFim, filtroMotivo, filtroOperador, operadores, filteredCount, totalCount, busca,
  onDataInicioChange, onDataFimChange, onFiltroMotivoChange, onFiltroOperadorChange, onBuscaChange,
}: LiberacoesFiltersProps) {
  const hasFilters = !!dataInicio || !!dataFim || filtroMotivo !== "todos" || filtroOperador !== "todos" || busca.trim() !== "";

  const clearAll = () => {
    onDataInicioChange(undefined);
    onDataFimChange(undefined);
    onFiltroMotivoChange("todos");
    onFiltroOperadorChange("todos");
    onBuscaChange("");
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Período:</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !dataInicio && "text-muted-foreground")}>
                <CalendarIcon size={14} />
                {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataInicio} onSelect={onDataInicioChange} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 font-normal", !dataFim && "text-muted-foreground")}>
                <CalendarIcon size={14} />
                {dataFim ? format(dataFim, "dd/MM/yyyy") : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={dataFim} onSelect={onDataFimChange} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(dataInicio || dataFim) && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { onDataInicioChange(undefined); onDataFimChange(undefined); }}>
              <X size={14} /> Limpar datas
            </Button>
          )}

          <div className="flex items-center gap-2 ml-2">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={filtroMotivo} onValueChange={onFiltroMotivoChange}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Filtrar por motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os motivos</SelectItem>
                <SelectItem value="excesso">Excesso de limite</SelectItem>
                <SelectItem value="promo">Crediário com promoção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operadores.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              <Select value={filtroOperador} onValueChange={onFiltroOperadorChange}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Filtrar por operador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os operadores</SelectItem>
                  {operadores.map(op => (
                    <SelectItem key={op} value={op}>{op}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasFilters && (
            <>
              <Badge variant="secondary" className="text-xs">{filteredCount} de {totalCount} registros</Badge>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
                <X size={14} /> Limpar todos os filtros
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
