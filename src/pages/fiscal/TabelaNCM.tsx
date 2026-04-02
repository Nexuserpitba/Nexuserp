import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { ncmCestMvaData, segmentos, totalNcmItems } from "@/data/ncmCestMva";

const ITEMS_PER_PAGE = 50;

export default function TabelaNCM() {
  const [search, setSearch] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<string>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return ncmCestMvaData.filter(item => {
      if (filtroSegmento !== "all" && item.segmento !== filtroSegmento) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.ncm.includes(q) ||
          item.cest.includes(q) ||
          item.descricao.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, filtroSegmento]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExportExcel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("NCM_CEST_MVA");
    sheet.columns = [
      { header: "NCM", key: "ncm", width: 15 },
      { header: "CEST", key: "cest", width: 15 },
      { header: "Descrição", key: "descricao", width: 60 },
      { header: "Segmento", key: "segmento", width: 25 },
      { header: "MVA Original", key: "mvaOriginal", width: 14 },
      { header: "MVA 4%", key: "mva4", width: 12 },
      { header: "MVA 7%", key: "mva7", width: 12 },
      { header: "MVA 12%", key: "mva12", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const i of filtered) {
      sheet.addRow({ ncm: i.ncm, cest: i.cest, descricao: i.descricao, segmento: segmentos[i.segmento] || i.segmento, mvaOriginal: i.mvaOriginal, mva4: i.mvaAjustado4, mva7: i.mvaAjustado7, mva12: i.mvaAjustado12 });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabela_ncm_cest_mva.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <PageHeader title="Tabela NCM / CEST / MVA" description="Base completa de classificação fiscal com MVA original e ajustado por alíquota interestadual" />

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalNcmItems}</p>
            <p className="text-xs text-muted-foreground">Total de NCMs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{Object.keys(segmentos).length}</p>
            <p className="text-xs text-muted-foreground">Segmentos CEST</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Resultados filtrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">SEFAZ</p>
            <p className="text-xs text-muted-foreground">Fonte dos dados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database size={18} className="text-primary" />
              Consulta NCM / CEST / MVA
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download size={14} className="mr-1" /> Exportar Tabela
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por NCM, CEST ou descrição..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={filtroSegmento} onValueChange={v => { setFiltroSegmento(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-64">
                <Filter size={14} className="mr-1" />
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os segmentos</SelectItem>
                {Object.entries(segmentos).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border border-border rounded-md overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">NCM</TableHead>
                  <TableHead className="w-28">CEST</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-32">Segmento</TableHead>
                  <TableHead className="text-right w-20">MVA %</TableHead>
                  <TableHead className="text-right w-20">4%</TableHead>
                  <TableHead className="text-right w-20">7%</TableHead>
                  <TableHead className="text-right w-20">12%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((item, idx) => (
                    <TableRow key={`${item.cest}-${idx}`}>
                      <TableCell className="font-mono text-xs">{item.ncm}</TableCell>
                      <TableCell className="font-mono text-xs">{item.cest}</TableCell>
                      <TableCell className="text-sm">{item.descricao}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {item.segmento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">{item.mvaOriginal.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.mvaAjustado4.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.mvaAjustado7.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{item.mvaAjustado12.toFixed(1)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({filtered.length} itens)
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
