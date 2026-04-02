import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, ArrowDownLeft, ArrowUpRight, Globe } from "lucide-react";
import { cfopData, type CfopEntry } from "@/data/cfopData";

const ITEMS_PER_PAGE = 50;

const ambitoLabels: Record<string, string> = {
  dentro_estado: "Dentro do Estado",
  fora_estado: "Fora do Estado",
  internacional: "Internacional",
};

const ambitoIcons: Record<string, React.ElementType> = {
  dentro_estado: ArrowDownLeft,
  fora_estado: ArrowUpRight,
  internacional: Globe,
};

const ambitoPrefixes: Record<string, string[]> = {
  dentro_estado: ["1.", "5."],
  fora_estado: ["2.", "6."],
  internacional: ["3.", "7."],
};

export default function CFOP() {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [ambitoFiltro, setAmbitoFiltro] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    return cfopData.filter((item) => {
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchTipo = tipoFiltro === "todos" || item.tipo === tipoFiltro;
      const matchAmbito = ambitoFiltro === "todos" || item.ambito === ambitoFiltro;
      return matchBusca && matchTipo && matchAmbito;
    });
  }, [busca, tipoFiltro, ambitoFiltro]);

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const paginados = filtrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE);

  const resetPagina = () => setPagina(1);

  const stats = useMemo(() => {
    const entradas = cfopData.filter((c) => c.tipo === "entrada").length;
    const saidas = cfopData.filter((c) => c.tipo === "saida").length;
    return { total: cfopData.length, entradas, saidas };
  }, []);

  return (
    <div className="page-container">
      <PageHeader
        title="Tabela CFOP"
        description="Código Fiscal de Operações e Prestações — Dentro do Estado, Fora do Estado e Internacional"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de CFOPs</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10">
            <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.entradas}</p>
            <p className="text-xs text-muted-foreground">Entradas (1/2/3.xxx)</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10">
            <ArrowUpRight className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.saidas}</p>
            <p className="text-xs text-muted-foreground">Saídas (5/6/7.xxx)</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); resetPagina(); }}
            className="pl-9"
          />
        </div>
        <Select value={tipoFiltro} onValueChange={(v) => { setTipoFiltro(v); resetPagina(); }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ambitoFiltro} onValueChange={(v) => { setAmbitoFiltro(v); resetPagina(); }}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Âmbito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os âmbitos</SelectItem>
            <SelectItem value="dentro_estado">Dentro do Estado (1/5)</SelectItem>
            <SelectItem value="fora_estado">Fora do Estado (2/6)</SelectItem>
            <SelectItem value="internacional">Internacional (3/7)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resultado */}
      <div className="text-sm text-muted-foreground">
        {filtrados.length} CFOP(s) encontrado(s)
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-28">Tipo</TableHead>
                <TableHead className="w-40">Âmbito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Nenhum CFOP encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((item) => {
                  const isGroup = item.descricao === item.descricao.toUpperCase();
                  return (
                    <TableRow key={item.codigo} className={isGroup ? "bg-muted/30 font-semibold" : ""}>
                      <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                      <TableCell className={isGroup ? "text-foreground font-semibold text-xs uppercase tracking-wide" : "text-foreground"}>
                        {item.descricao}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === "entrada" ? "default" : "secondary"} className="text-xs">
                          {item.tipo === "entrada" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {(() => {
                            const Icon = ambitoIcons[item.ambito];
                            return <Icon className="h-3.5 w-3.5" />;
                          })()}
                          {ambitoLabels[item.ambito]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
