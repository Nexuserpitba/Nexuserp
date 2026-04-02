import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { cestData, segmentosCest, totalCestItems } from "@/data/cestData";

const ITEMS_PER_PAGE = 50;

export default function CEST() {
  const [busca, setBusca] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const filtrados = useMemo(() => {
    return cestData.filter(item => {
      if (filtroSegmento !== "todos" && item.segmento !== filtroSegmento) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return item.cest.includes(q) || item.ncm.includes(q) || item.descricao.toLowerCase().includes(q);
      }
      return true;
    });
  }, [busca, filtroSegmento]);

  const cestsUnicos = useMemo(() => new Set(filtrados.map(i => i.cest)).size, [filtrados]);

  const totalPages = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const paginados = filtrados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExportCSV = () => {
    const header = "CEST;NCM;Descrição;Segmento\n";
    const rows = filtrados.map(i =>
      `${i.cest};${i.ncm};${i.descricao};${segmentosCest[i.segmento] || i.segmento}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabela_cest.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Tabela CEST"
        description="Código Especificador da Substituição Tributária — Convênio ICMS 142/18"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalCestItems}</p>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{cestsUnicos}</p>
            <p className="text-xs text-muted-foreground">CESTs filtrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{Object.keys(segmentosCest).length}</p>
            <p className="text-xs text-muted-foreground">Segmentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">CONFAZ</p>
            <p className="text-xs text-muted-foreground">Fonte oficial</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Consulta CEST
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download size={14} className="mr-1" /> Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por CEST, NCM ou descrição..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filtroSegmento} onValueChange={v => { setFiltroSegmento(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter size={14} className="mr-1" />
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os segmentos</SelectItem>
                {Object.entries(segmentosCest).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-md overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">CEST</TableHead>
                  <TableHead className="w-28">NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-44">Segmento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum CEST encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginados.map((item, idx) => (
                    <TableRow key={`${item.cest}-${idx}`}>
                      <TableCell className="font-mono text-xs font-semibold">{item.cest}</TableCell>
                      <TableCell className="font-mono text-xs">{item.ncm}</TableCell>
                      <TableCell className="text-sm">{item.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {item.segmento} - {segmentosCest[item.segmento]?.split(",")[0] || item.segmento}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({filtrados.length} itens)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
