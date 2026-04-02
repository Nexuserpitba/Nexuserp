import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Scale, Landmark } from "lucide-react";
import { cstIbsCbsData } from "@/data/cstIbsCbsData";

const categorias = ["Tributação", "Isenção/Imunidade", "Redução", "Diferimento", "Suspensão", "Crédito", "Outros"] as const;

export default function CstIbsCbs() {
  const [busca, setBusca] = useState("");
  const [abaAtiva, setAbaAtiva] = useState("Ambos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const filtrados = useMemo(() => {
    return cstIbsCbsData.filter((item) => {
      const matchTipo = abaAtiva === "Ambos" ? true : item.tipo === abaAtiva || item.tipo === "Ambos";
      const matchCategoria = categoriaFiltro === "todos" || item.categoria === categoriaFiltro;
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      return matchTipo && matchCategoria && matchBusca;
    });
  }, [busca, abaAtiva, categoriaFiltro]);

  const stats = useMemo(() => ({
    total: cstIbsCbsData.length,
    ibs: cstIbsCbsData.filter((c) => c.tipo === "IBS" || c.tipo === "Ambos").length,
    cbs: cstIbsCbsData.filter((c) => c.tipo === "CBS" || c.tipo === "Ambos").length,
  }), []);

  return (
    <div className="page-container">
      <PageHeader
        title="CST IBS / CBS"
        description="Código de Situação Tributária do IBS e CBS — Reforma Tributária (EC 132/2023)"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Landmark className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.ibs}</p>
            <p className="text-xs text-muted-foreground">Códigos IBS (Estadual/Municipal)</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.cbs}</p>
            <p className="text-xs text-muted-foreground">Códigos CBS (Federal)</p>
          </div>
        </div>
      </div>

      {/* Tabs + Filtros */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <TabsList>
            <TabsTrigger value="Ambos">Todos</TabsTrigger>
            <TabsTrigger value="IBS">IBS</TabsTrigger>
            <TabsTrigger value="CBS">CBS</TabsTrigger>
          </TabsList>
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

        {["Ambos", "IBS", "CBS"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="text-sm text-muted-foreground mb-3">
              {filtrados.length} código(s) encontrado(s)
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-28">Tributo</TableHead>
                    <TableHead className="w-36">Categoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Nenhum código encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map((item, idx) => (
                      <TableRow key={`${item.tipo}-${item.codigo}-${idx}`}>
                        <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                        <TableCell className="text-foreground">{item.descricao}</TableCell>
                        <TableCell>
                          <Badge variant={item.tipo === "IBS" ? "default" : item.tipo === "CBS" ? "secondary" : "outline"} className="text-xs">
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{item.categoria}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
