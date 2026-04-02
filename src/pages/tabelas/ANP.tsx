import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Fuel, Flame, Droplets } from "lucide-react";
import { anpData } from "@/data/anpData";

const categorias = ["Gasolina", "Diesel", "Etanol", "GLP", "GNV", "Querosene", "Lubrificante", "Biodiesel", "Outros"] as const;

export default function ANP() {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const filtrados = useMemo(() => {
    return anpData.filter((item) => {
      const matchCategoria = categoriaFiltro === "todos" || item.categoria === categoriaFiltro;
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    });
  }, [busca, categoriaFiltro]);

  const stats = useMemo(() => ({
    total: anpData.length,
    gasolina: anpData.filter((c) => c.categoria === "Gasolina").length,
    diesel: anpData.filter((c) => c.categoria === "Diesel").length,
    etanol: anpData.filter((c) => c.categoria === "Etanol").length,
  }), []);

  const getBadgeVariant = (cat: string) => {
    switch (cat) {
      case "Gasolina": return "default";
      case "Diesel": return "secondary";
      case "Etanol": return "default";
      case "GLP": return "outline";
      case "GNV": return "secondary";
      case "Biodiesel": return "default";
      default: return "outline";
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Código ANP"
        description="Códigos da Agência Nacional do Petróleo, Gás Natural e Biocombustíveis"
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
            <Fuel className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.gasolina}</p>
            <p className="text-xs text-muted-foreground">Gasolina</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.diesel}</p>
            <p className="text-xs text-muted-foreground">Diesel</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <Droplets className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.etanol}</p>
            <p className="text-xs text-muted-foreground">Etanol</p>
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
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-36">Categoria</TableHead>
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
