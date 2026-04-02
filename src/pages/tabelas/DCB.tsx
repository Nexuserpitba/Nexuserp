import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Pill, Syringe, Heart } from "lucide-react";
import { dcbData } from "@/data/dcbData";

const categorias = [
  "Analgésico/Antipirético", "Antibiótico", "Anti-inflamatório", "Anti-hipertensivo",
  "Antidiabético", "Antidepressivo", "Hormônio", "Vitamina/Suplemento",
  "Anticoagulante", "Antiviral", "Vacina", "Outros"
] as const;

export default function DCB() {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const filtrados = useMemo(() => {
    return dcbData.filter((item) => {
      const matchCategoria = categoriaFiltro === "todos" || item.categoria === categoriaFiltro;
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.denominacao.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [busca, categoriaFiltro]);

  const stats = useMemo(() => ({
    total: dcbData.length,
    antibioticos: dcbData.filter((c) => c.categoria === "Antibiótico").length,
    antihipertensivos: dcbData.filter((c) => c.categoria === "Anti-hipertensivo").length,
    vitaminas: dcbData.filter((c) => c.categoria === "Vitamina/Suplemento").length,
  }), []);

  const getBadgeVariant = (cat: string) => {
    switch (cat) {
      case "Antibiótico": return "default";
      case "Anti-inflamatório": return "secondary";
      case "Anti-hipertensivo": return "default";
      case "Antidiabético": return "secondary";
      case "Vacina": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Denominação Comum Brasileira (DCB)"
        description="Tabela de denominações comuns de fármacos e insumos farmacêuticos — ANVISA"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de denominações</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <Pill className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.antibioticos}</p>
            <p className="text-xs text-muted-foreground">Antibióticos</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.antihipertensivos}</p>
            <p className="text-xs text-muted-foreground">Anti-hipertensivos</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <Syringe className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.vitaminas}</p>
            <p className="text-xs text-muted-foreground">Vitaminas/Suplementos</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou denominação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-full sm:w-56">
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
        {filtrados.length} denominação(ões) encontrada(s)
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Denominação</TableHead>
              <TableHead className="w-48">Categoria</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  Nenhuma denominação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((item, idx) => (
                <TableRow key={`${item.codigo}-${idx}`}>
                  <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                  <TableCell className="text-foreground">{item.denominacao}</TableCell>
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
