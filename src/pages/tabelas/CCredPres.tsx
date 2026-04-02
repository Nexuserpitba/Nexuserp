import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Award, RefreshCw } from "lucide-react";
import { cCredPresData } from "@/data/cCredPresData";

const categorias = ["Crédito Presumido", "Crédito Outorgado", "Transição", "Outros"] as const;

export default function CCredPres() {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const filtrados = useMemo(() => {
    return cCredPresData.filter((item) => {
      const matchCategoria = categoriaFiltro === "todos" || item.categoria === categoriaFiltro;
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [busca, categoriaFiltro]);

  const stats = useMemo(() => ({
    total: cCredPresData.length,
    presumido: cCredPresData.filter((c) => c.categoria === "Crédito Presumido").length,
    outorgado: cCredPresData.filter((c) => c.categoria === "Crédito Outorgado").length,
    transicao: cCredPresData.filter((c) => c.categoria === "Transição").length,
  }), []);

  const getBadgeVariant = (cat: string) => {
    switch (cat) {
      case "Crédito Presumido": return "default";
      case "Crédito Outorgado": return "secondary";
      case "Transição": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="cCredPres"
        description="Tabela de Crédito Presumido — Reforma Tributária (LC 214/2025)"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de códigos</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <Award className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.presumido}</p>
            <p className="text-xs text-muted-foreground">Crédito Presumido</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.outorgado}</p>
            <p className="text-xs text-muted-foreground">Crédito Outorgado</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <RefreshCw className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.transicao}</p>
            <p className="text-xs text-muted-foreground">Transição</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        {filtrados.length} código(s) encontrado(s)
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-40">Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Nenhum código encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((item, idx) => (
                <TableRow key={`${item.codigo}-${idx}`}>
                  <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                  <TableCell className="text-foreground">{item.descricao}</TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(item.categoria)} className="text-xs">
                      {item.categoria}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
