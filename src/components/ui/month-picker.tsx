import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MonthPicker({ value, onChange, placeholder = "Selecione o mês", className }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedYear = value ? parseInt(value.split("-")[0]) : new Date().getFullYear();
  const parsedMonth = value ? parseInt(value.split("-")[1]) - 1 : -1;
  const [viewYear, setViewYear] = React.useState(parsedYear);

  React.useEffect(() => {
    if (value) {
      setViewYear(parseInt(value.split("-")[0]));
    }
  }, [value]);

  const handleSelect = (monthIndex: number) => {
    const m = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${m}`);
    setOpen(false);
  };

  const displayText = value
    ? `${MONTHS[parsedMonth]} / ${parsedYear}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-3 pointer-events-auto" align="start">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{viewYear}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewYear(y => y + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, i) => {
            const isSelected = parsedMonth === i && parsedYear === viewYear;
            return (
              <Button
                key={month}
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn("text-xs h-8", isSelected && "font-bold")}
                onClick={() => handleSelect(i)}
              >
                {month.slice(0, 3)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
