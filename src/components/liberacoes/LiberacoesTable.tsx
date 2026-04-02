import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Search, Trash2, Download, FileText, FileSpreadsheet, MessageCircle, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LogLiberacao } from "./types";

type SortKey = "data" | "operador" | "cliente" | "clienteDoc" | "valorAutorizado" | "limiteDisponivel" | "excedente" | "motivo";
type SortDir = "asc" | "desc";

interface LiberacoesTableProps {
  logs: LogLiberacao[];
  filtered: LogLiberacao[];
  busca: string;
  onBuscaChange: (v: string) => void;
  onLimpar: () => void;
  onExportarCSV: () => void;
  onExportarExcel: () => void;
  onExportarPDF: () => void;
  onWhatsApp: () => void;
  onImprimir: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function LiberacoesTable({
  logs, filtered, busca, onBuscaChange, onLimpar, onExportarCSV, onExportarExcel, onExportarPDF, onWhatsApp, onImprimir,
}: LiberacoesTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "data" ? "desc" : "asc"); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    return arr.sort((a, b) => {
      switch (sortKey) {
        case "data": return dir * (new Date(a.data).getTime() - new Date(b.data).getTime());
        case "valorAutorizado": return dir * (a.valorAutorizado - b.valorAutorizado);
        case "limiteDisponivel": return dir * (a.limiteDisponivel - b.limiteDisponivel);
        case "excedente": return dir * (a.excedente - b.excedente);
        case "operador": return dir * a.operador.localeCompare(b.operador);
        case "cliente": return dir * a.cliente.localeCompare(b.cliente);
        case "clienteDoc": return dir * a.clienteDoc.localeCompare(b.clienteDoc);
        case "motivo": return dir * (a.motivo || "").localeCompare(b.motivo || "");
        default: return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handlePageSizeChange = (v: string) => {
    setPageSize(Number(v));
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" />
            <div>
              <CardTitle className="text-base">Histórico de Liberações</CardTitle>
              <CardDescription>{logs.length} registro(s)</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" disabled={filtered.length === 0} onClick={() => {
                const header = "Data/Hora\tOperador\tCliente\tCPF/CNPJ\tValor Autorizado\tLimite Disponível\tExcedente\tMotivo";
                const rows = filtered.map(l =>
                  `${new Date(l.data).toLocaleDateString("pt-BR")} ${new Date(l.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\t${l.operador}\t${l.cliente}\t${l.clienteDoc}\tR$ ${l.valorAutorizado.toFixed(2)}\tR$ ${l.limiteDisponivel.toFixed(2)}\tR$ ${l.excedente.toFixed(2)}\t${l.motivo || "Excesso de limite"}`
                );
                navigator.clipboard.writeText([header, ...rows].join("\n"));
                toast.success("Relatório copiado para a área de transferência!");
              }}>
                <Copy size={14} /> Copiar
              </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download size={14} /> Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExportarPDF}>
                  <FileText className="h-4 w-4 mr-2" /> Imprimir / PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportarExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportarCSV}>
                  <Download className="h-4 w-4 mr-2" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" /> Enviar por WhatsApp
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1" disabled={logs.length === 0}>
                  <Trash2 size={14} /> Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar histórico de liberações?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Todos os {logs.length} registro(s) de liberações gerenciais serão excluídos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onLimpar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={e => { onBuscaChange(e.target.value); setPage(1); }}
            placeholder="Buscar por cliente, operador ou CPF..."
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck size={40} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhuma liberação registrada</p>
            <p className="text-sm text-muted-foreground mt-1">As liberações gerenciais realizadas no PDV aparecerão aqui.</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {([
                      ["data", "Data / Hora", ""],
                      ["operador", "Operador", ""],
                      ["cliente", "Cliente", ""],
                      ["clienteDoc", "CPF/CNPJ", ""],
                      ["valorAutorizado", "Valor Autorizado", "text-right"],
                      ["limiteDisponivel", "Limite Disponível", "text-right"],
                      ["excedente", "Excedente", "text-right"],
                      ["motivo", "Motivo", ""],
                    ] as [SortKey, string, string][]).map(([key, label, cls]) => (
                      <TableHead key={key} className={cn("cursor-pointer select-none", cls)} onClick={() => toggleSort(key)}>
                        <span className="inline-flex items-center gap-1">
                          {label} <SortIcon col={key} />
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {new Date(l.data).toLocaleDateString("pt-BR")} {new Date(l.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{l.operador}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{l.cliente}</TableCell>
                      <TableCell className="text-xs font-mono">{l.clienteDoc}</TableCell>
                      <TableCell className="text-right font-mono font-bold">R$ {l.valorAutorizado.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">R$ {l.limiteDisponivel.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-mono text-xs">R$ {l.excedente.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={l.motivo?.includes("promoção") ? "outline" : "secondary"} className={cn("text-xs", l.motivo?.includes("promoção") && "border-amber-500 text-amber-700 dark:text-amber-400")}>
                          {l.motivo || "Excesso de limite"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Exibindo {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} de {sorted.length}</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-[75px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>por página</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                  <ChevronLeft size={16} />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (safePage <= 3) p = i + 1;
                  else if (safePage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = safePage - 2 + i;
                  return (
                    <Button key={p} variant={p === safePage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(p)}>
                      {p}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}