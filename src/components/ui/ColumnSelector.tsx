import { Columns3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnConfig } from "@/hooks/useColumnPreferences";

interface ColumnSelectorProps {
  columns: ColumnConfig[];
  onToggle: (key: string) => void;
  onReset: () => void;
  label?: string;
}

export function ColumnSelector({
  columns,
  onToggle,
  onReset,
  label = "Colunas",
}: ColumnSelectorProps) {
  const visibleCount = columns.filter((c) => c.visible).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Columns3 className="mr-2 h-4 w-4" />
          {label} ({visibleCount}/{columns.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel>Selecionar Colunas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            className="capitalize"
            checked={column.visible}
            onCheckedChange={() => onToggle(column.key)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={false}
          onCheckedChange={onReset}
          className="text-muted-foreground"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restaurar Padrão
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
