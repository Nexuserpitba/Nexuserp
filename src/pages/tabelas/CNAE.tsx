import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, Layers } from "lucide-react";
import { cnaeData, secaoLabels } from "@/data/cnaeData";

const ITEMS_PER_PAGE = 50;

export default function CNAE() {
  const [busca, setBusca] = useState("");
  const [secaoFiltro, setSecaoFiltro] = useState<string>("todos");
  const [pagina, setPagina] = useState(1);

  const secoes = useMemo(() => {
    const unique = [...new Set(cnaeData.map((c) => c.secao))].sort();
    return unique;
  }, []);

  const filtrados = useMemo(() => {
    return cnaeData.filter((item) => {
      const matchBusca =
        !busca ||
        item.codigo.includes(busca) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());
      const matchSecao = secaoFiltro === "todos" || item.secao === secaoFiltro;
      return matchBusca && matchSecao;
    });
  }, [busca, secaoFiltro]);

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const paginados = filtrados.slice((pagina - 1) * ITEMS_PER_PAGE, pagina * ITEMS_PER_PAGE);

  const resetPagina = () => setPagina(1);

  const statsPorSecao = useMemo(() => {
    const map: Record<string, number> = {};
    cnaeData.forEach((c) => {
      map[c.secao] = (map[c.secao] || 0) + 1;
    });
    return map;
  }, []);

  return (
    <div className="page-container">
      <PageHeader
        title="Tabela CNAE"
        description="Classificação Nacional de Atividades Econômicas — IBGE"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{cnaeData.length}</p>
            <p className="text-xs text-muted-foreground">Total de CNAEs</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-accent">
            <Layers className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{secoes.length}</p>
            <p className="text-xs text-muted-foreground">Seções (A-U)</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{filtrados.length}</p>
            <p className="text-xs text-muted-foreground">Resultados filtrados</p>
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
        <Select value={secaoFiltro} onValueChange={(v) => { setSecaoFiltro(v); resetPagina(); }}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Seção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as seções</SelectItem>
            {secoes.map((s) => (
              <SelectItem key={s} value={s}>
                Seção {s} - {secaoLabels[s]?.substring(0, 40)}... ({statsPorSecao[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-28">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32">Seção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    Nenhum CNAE encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                paginados.map((item) => (
                  <TableRow key={item.codigo}>
                    <TableCell className="font-mono font-semibold text-foreground">{item.codigo}</TableCell>
                    <TableCell className="text-foreground">{item.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.secao}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
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
