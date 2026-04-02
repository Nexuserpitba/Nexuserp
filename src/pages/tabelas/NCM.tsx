import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Filter, Download, BookOpen, Upload, Globe, Loader2, Database, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useCallback } from "react";
import { ncmCestMvaData, segmentos, totalNcmItems } from "@/data/ncmCestMva";
import { ImportarNCMModal, type NCMImportado } from "@/components/tabelas/ImportarNCMModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ITEMS_PER_PAGE = 50;

type NcmWebRow = {
  id: string;
  codigo: string;
  descricao: string;
  created_at: string;
};

export default function NCMTabela() {
  const [busca, setBusca] = useState("");
  const [filtroSegmento, setFiltroSegmento] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importados, setImportados] = useState<NCMImportado[]>([]);
  const [buscaWeb, setBuscaWeb] = useState("");
  const [loadingWeb, setLoadingWeb] = useState(false);
  const [ncmWebData, setNcmWebData] = useState<NcmWebRow[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkStatus, setBulkStatus] = useState("");
  const { toast } = useToast();

  // Load persisted NCMs from Supabase
  const loadNcmWeb = useCallback(async () => {
    setLoadingDb(true);
    try {
      let all: NcmWebRow[] = [];
      let from = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("ncm_web" as any)
          .select("id, codigo, descricao, created_at")
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const rows = (data || []) as unknown as NcmWebRow[];
        all = [...all, ...rows];
        hasMore = rows.length === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      setNcmWebData(all);
    } catch (err) {
      console.error("Erro ao carregar NCMs do banco:", err);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadNcmWeb();
  }, [loadNcmWeb]);

  // Single search import
  const handleImportarWeb = async () => {
    if (!buscaWeb.trim()) {
      toast({ title: "Informe um código NCM ou termo de busca", variant: "destructive" });
      return;
    }
    setLoadingWeb(true);
    try {
      const isCode = /^\d+$/.test(buscaWeb.replace(/\./g, ""));
      const body = isCode
        ? { codigo: buscaWeb.replace(/\./g, ""), salvar: true }
        : { descricao: buscaWeb, salvar: true };

      const { data, error } = await supabase.functions.invoke("fetch-ncm-web", { body });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar NCMs");

      const count = data.data?.length || 0;
      if (count === 0) {
        toast({ title: "Nenhum NCM encontrado para esta busca" });
        return;
      }

      toast({
        title: `${count} NCM(s) importado(s) e salvo(s)`,
        description: "Dados persistidos no banco de dados",
      });
      setBuscaWeb("");
      await loadNcmWeb();
    } catch (err: any) {
      console.error("Erro ao importar NCM da web:", err);
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
    } finally {
      setLoadingWeb(false);
    }
  };

  // Bulk import all NCMs
  const handleBulkImport = async () => {
    setBulkImporting(true);
    setBulkProgress(10);
    setBulkStatus("Conectando à BrasilAPI...");
    try {
      setBulkProgress(20);
      setBulkStatus("Baixando todos os NCMs da BrasilAPI...");

      const { data, error } = await supabase.functions.invoke("fetch-ncm-web", {
        body: { bulk: true, salvar: true },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro na importação em lote");

      setBulkProgress(80);
      setBulkStatus(`Salvos ${data.saved || data.total} NCMs no banco...`);

      // Invalidate autocomplete cache & reload from DB
      try { localStorage.removeItem("ncm_autocomplete_cache"); } catch { /* erro ignorado */ }
      await loadNcmWeb();

      setBulkProgress(100);
      setBulkStatus("Importação concluída!");

      toast({
        title: `Importação em lote concluída!`,
        description: `${data.saved || data.total} NCMs importados da BrasilAPI e salvos no banco.`,
      });
    } catch (err: any) {
      console.error("Erro na importação em lote:", err);
      toast({ title: "Erro na importação em lote", description: err.message, variant: "destructive" });
      setBulkStatus("Erro na importação");
    } finally {
      setTimeout(() => {
        setBulkImporting(false);
        setBulkProgress(0);
        setBulkStatus("");
      }, 2000);
    }
  };

  // Combine all data sources
  const todosNCMs = useMemo(() => {
    const base = ncmCestMvaData.map(i => ({ ncm: i.ncm, descricao: i.descricao, segmento: i.segmento, cest: i.cest, fonte: "local" }));
    const fromDb = ncmWebData.map(i => ({ ncm: i.codigo, descricao: i.descricao, segmento: "", cest: "", fonte: "web" }));
    const fromImport = importados.map(i => ({ ncm: i.codigo, descricao: i.descricao, segmento: "", cest: "", fonte: "excel" }));

    // Deduplicate by NCM code, preferring local data
    const map = new Map<string, typeof base[0]>();
    for (const item of [...fromDb, ...fromImport, ...base]) {
      if (!map.has(item.ncm) || item.fonte === "local") {
        map.set(item.ncm, item);
      }
    }
    return Array.from(map.values());
  }, [importados, ncmWebData]);

  const filtrados = useMemo(() => {
    return todosNCMs.filter(item => {
      if (filtroSegmento !== "todos" && item.segmento !== filtroSegmento) return false;
      if (busca) {
        const q = busca.toLowerCase();
        return item.ncm.includes(q) || item.descricao.toLowerCase().includes(q);
      }
      return true;
    });
  }, [busca, filtroSegmento, todosNCMs]);

  const ncmsUnicos = useMemo(() => new Set(filtrados.map(i => i.ncm)).size, [filtrados]);

  const totalPages = Math.ceil(filtrados.length / ITEMS_PER_PAGE);
  const paginados = filtrados.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleExportExcel = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("NCM");
    sheet.columns = [
      { header: "NCM", key: "ncm", width: 15 },
      { header: "Descrição", key: "descricao", width: 60 },
      { header: "Segmento", key: "segmento", width: 25 },
      { header: "CEST", key: "cest", width: 15 },
      { header: "Fonte", key: "fonte", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const i of filtrados) {
      sheet.addRow({ ncm: i.ncm, descricao: i.descricao, segmento: segmentos[i.segmento] || i.segmento, cest: i.cest, fonte: i.fonte });
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tabela_ncm.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Tabela NCM"
        description="Nomenclatura Comum do Mercosul — classificação fiscal de mercadorias"
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{todosNCMs.length}</p>
            <p className="text-xs text-muted-foreground">Total de NCMs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{ncmsUnicos}</p>
            <p className="text-xs text-muted-foreground">NCMs filtrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{ncmWebData.length}</p>
            <p className="text-xs text-muted-foreground">NCMs da web (banco)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent-foreground">
              <Database size={20} className="inline mr-1" />
              {loadingDb ? "..." : "OK"}
            </p>
            <p className="text-xs text-muted-foreground">Banco de dados</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import Progress */}
      {bulkImporting && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                {bulkStatus}
              </p>
              <span className="text-xs text-muted-foreground">{bulkProgress}%</span>
            </div>
            <Progress value={bulkProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              Consulta NCM
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
                <Upload size={14} className="mr-1" /> Importar Tabela
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download size={14} className="mr-1" /> Exportar Tabela
              </Button>
              <Button
                size="sm"
                onClick={handleBulkImport}
                disabled={bulkImporting}
                className="bg-primary text-primary-foreground"
              >
                {bulkImporting ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <CloudDownload size={14} className="mr-1" />
                )}
                Importar Todos (Web)
              </Button>
            </div>
          </div>
          {/* Importar da Web - busca individual */}
          <div className="flex items-center gap-2 mt-2">
            <Globe size={16} className="text-primary shrink-0" />
            <Input
              placeholder="Código NCM ou descrição para buscar na web..."
              value={buscaWeb}
              onChange={e => setBuscaWeb(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleImportarWeb()}
              className="flex-1"
            />
            <Button size="sm" variant="outline" onClick={handleImportarWeb} disabled={loadingWeb}>
              {loadingWeb ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Globe size={14} className="mr-1" />}
              Buscar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código NCM ou descrição..."
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
                  <TableHead className="w-32">NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-40">Segmento</TableHead>
                  <TableHead className="w-28">CEST</TableHead>
                  <TableHead className="w-20">Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum NCM encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginados.map((item, idx) => (
                    <TableRow key={`${item.ncm}-${idx}`}>
                      <TableCell className="font-mono text-xs font-semibold">{item.ncm}</TableCell>
                      <TableCell className="text-sm">{item.descricao}</TableCell>
                      <TableCell>
                        {item.segmento ? (
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {item.segmento} - {segmentos[item.segmento]?.split(",")[0] || item.segmento}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.cest || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.fonte === "local" ? "default" : item.fonte === "web" ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {item.fonte === "local" ? "Local" : item.fonte === "web" ? "Web" : "Excel"}
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

      <ImportarNCMModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportar={(dados) => setImportados(prev => [...prev, ...dados])}
      />
    </div>
  );
}
