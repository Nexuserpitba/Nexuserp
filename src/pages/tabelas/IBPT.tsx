import { useState, useMemo, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Search, Trash2, Download, Database, FileText, AlertTriangle, Cloud, Loader2, RefreshCw, Settings2, Key } from "lucide-react";
import { ibptData, type IBPTEntry, loadIBPTFromSupabase, getIBPTCache, isCacheFromSupabase } from "@/data/ibptData";
import { exportCSV, type ExportColumn } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";

const IBPT_TOKEN_KEY = "ibpt-api-token";
const IBPT_UF_KEY = "ibpt-api-uf";
const IBPT_CNPJ_KEY = "ibpt-api-cnpj";

function parseIBPTCSV(text: string): IBPTEntry[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(sep).map(h => h.replace(/"/g, "").trim().toLowerCase());
  const iNCM = header.findIndex(h => h === "codigo" || h === "ncm" || h === "código");
  const iDesc = header.findIndex(h => h.includes("descri"));
  const iFed = header.findIndex(h => h.includes("nacionalfederal") || h.includes("federal") || h.includes("aliqnac"));
  const iEst = header.findIndex(h => h.includes("estadual") || h.includes("icms"));
  const iMun = header.findIndex(h => h.includes("municipal") || h.includes("iss"));
  const iTipo = header.findIndex(h => h === "tipo" || h === "ex");
  if (iNCM === -1 || iFed === -1) throw new Error("Arquivo CSV não contém as colunas obrigatórias");
  const entries: IBPTEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.replace(/"/g, "").trim());
    if (!cols[iNCM]) continue;
    if (iTipo !== -1 && cols[iTipo] === "1") continue;
    const ncm = cols[iNCM].replace(/\D/g, "");
    if (ncm.length < 4) continue;
    entries.push({
      ncm,
      descricao: iDesc !== -1 ? cols[iDesc] : "",
      federal: parseFloat((cols[iFed] || "0").replace(",", ".")) || 0,
      estadual: iEst !== -1 ? parseFloat((cols[iEst] || "0").replace(",", ".")) || 0 : 0,
      municipal: iMun !== -1 ? parseFloat((cols[iMun] || "0").replace(",", ".")) || 0 : 0,
    });
  }
  return entries;
}

export default function IBPT() {
  const [busca, setBusca] = useState("");
  const [allData, setAllData] = useState<IBPTEntry[]>(getIBPTCache());
  const [preview, setPreview] = useState<IBPTEntry[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fonte, setFonte] = useState<"supabase" | "interna">("interna");
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [tokenIbpt, setTokenIbpt] = useState(() => localStorage.getItem(IBPT_TOKEN_KEY) || "");
  const [uf, setUf] = useState(() => localStorage.getItem(IBPT_UF_KEY) || "SP");
  const [cnpjIbpt, setCnpjIbpt] = useState(() => localStorage.getItem(IBPT_CNPJ_KEY) || "");
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    loadIBPTFromSupabase().then(data => {
      setAllData(data);
      setFonte(isCacheFromSupabase() ? "supabase" : "interna");
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!busca.trim()) return allData.slice(0, 200);
    const q = busca.toLowerCase();
    return allData.filter(e =>
      e.ncm.includes(q) || e.descricao.toLowerCase().includes(q)
    ).slice(0, 200);
  }, [allData, busca]);

  // Auto-sync via IBPT API (public)
  const handleSync = async () => {
    setSyncing(true);
    toast.info("Sincronizando com IBPT...", {
      description: "Baixando 11.000+ NCMs. Isso pode levar 1-2 minutos.",
      duration: 15000,
    });

    try {
      const { data: session } = await supabase.auth.getSession();
      const authToken = session?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sync-ibpt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            uf: uf.toUpperCase(),
            acao: "sync",
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.erro || "Erro na sincronização");

      toast.success(`Sincronização concluída!`, {
        description: `${result.total?.toLocaleString()} NCMs importados (v${result.versao}) - ${result.uf}`,
      });

      // Reload data
      const data = await loadIBPTFromSupabase();
      setAllData(data);
      setFonte("supabase");
    } catch (err: any) {
      toast.error("Erro na sincronização", { description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Save token config
  const saveConfig = () => {
    localStorage.setItem(IBPT_TOKEN_KEY, tokenIbpt);
    localStorage.setItem(IBPT_UF_KEY, uf);
    localStorage.setItem(IBPT_CNPJ_KEY, cnpjIbpt);
    toast.success("Configuração salva");
    setConfigOpen(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const entries = parseIBPTCSV(text);
        if (entries.length === 0) {
          toast.error("Nenhum registro válido encontrado no arquivo");
          return;
        }
        setPreview(entries);
        toast.info(`${entries.length.toLocaleString()} NCMs encontrados. Confirme a importação.`);
      } catch (err: any) {
        toast.error(err.message || "Erro ao processar arquivo CSV");
      }
    };
    reader.readAsText(file, "UTF-8");
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const csvLines = ["ncm;descricao;federal;estadual;municipal"];
      preview.forEach(e => {
        csvLines.push(`${e.ncm};${e.descricao};${e.federal};${e.estadual};${e.municipal}`);
      });
      const csvContent = csvLines.join("\n");

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/upload-ibpt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            csv_content: csvContent,
            versao: new Date().toISOString().slice(0, 7),
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao enviar dados");

      toast.success(`${result.total?.toLocaleString()} NCMs importados para o Supabase!`);
      const data = await loadIBPTFromSupabase();
      setAllData(data);
      setFonte("supabase");
      setPreview(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Erro ao importar para o Supabase");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    try {
      await (supabase.from("ibpt_dados" as any) as any).delete().neq("ncm", "___");
      setAllData(ibptData);
      setFonte("interna");
      setPreview(null);
      toast.success("Tabela IBPT limpa. Usando dados internos.");
    } catch (err: any) {
      toast.error("Erro ao limpar dados: " + err.message);
    }
  };

  const exportColumns: ExportColumn[] = [
    { header: "NCM", key: "ncm" },
    { header: "Descrição", key: "descricao" },
    { header: "Federal (%)", key: "federal", align: "right" },
    { header: "Estadual (%)", key: "estadual", align: "right" },
    { header: "Municipal (%)", key: "municipal", align: "right" },
  ];

  const handleExportCSV = () => {
    exportCSV({ title: "IBPTax", filename: "ibptax", columns: exportColumns, data: filtered });
    toast.success("CSV exportado!");
  };

  return (
    <div>
      <PageHeader
        title="Tabela IBPTax"
        description="Base de alíquotas aproximadas de tributos por NCM (Lei 12.741/2012)"
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <Database className="mx-auto mb-2 text-primary" size={28} />
            <p className="text-2xl font-bold">{loading ? "..." : allData.length.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">NCMs cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            {fonte === "supabase" ? (
              <Cloud className="mx-auto mb-2 text-primary" size={28} />
            ) : (
              <FileText className="mx-auto mb-2 text-primary" size={28} />
            )}
            <p className="text-2xl font-bold">{fonte === "supabase" ? "Supabase" : "Interna"}</p>
            <p className="text-xs text-muted-foreground">Fonte dos dados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="mx-auto mb-2 text-amber-500" size={28} />
            <p className="text-2xl font-bold">2025.1</p>
            <p className="text-xs text-muted-foreground">Versão da tabela</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Sync + Import Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw size={18} /> Sincronização Automática (IBPT)
          </CardTitle>
          <CardDescription>
            Atualize as alíquotas automaticamente usando o token do IBPT.
            {" "}
            <a href="https://deolhonoimposto.ibpt.org.br" target="_blank" rel="noopener" className="text-primary underline">
              Obtenha seu token em deolhonoimposto.ibpt.org.br
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="gap-2"
            >
              {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {syncing ? "Sincronizando..." : "Sincronizar Agora"}
            </Button>

            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload size={16} /> Importar CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />

            {fonte === "supabase" && (
              <Button variant="destructive" size="sm" onClick={handleClear} className="gap-2">
                <Trash2 size={14} /> Limpar Base
              </Button>
            )}
          </div>

          {/* Token status */}
          {tokenIbpt && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Key size={14} className="text-green-500" />
              <span>Token configurado</span>
              <Badge variant="outline">{uf.toUpperCase()}</Badge>
              {cnpjIbpt && <Badge variant="outline">CNPJ: {cnpjIbpt}</Badge>}
            </div>
          )}

          {/* CSV Preview */}
          {preview && (
            <div className="mt-4 border rounded-md p-3 bg-muted/50">
              <p className="text-sm font-medium mb-2">Pré-visualização (primeiros 10 registros):</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NCM</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Federal %</TableHead>
                      <TableHead className="text-right">Estadual %</TableHead>
                      <TableHead className="text-right">Municipal %</TableHead>
                      <TableHead className="text-right">Total %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 10).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{e.ncm}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{e.descricao}</TableCell>
                        <TableCell className="text-right">{e.federal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{e.estadual.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{e.municipal.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold">{(e.federal + e.estadual + e.municipal).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={confirmImport} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                  {uploading ? "Enviando..." : `Importar ${preview.length.toLocaleString()} NCMs`}
                </Button>
                <Button variant="outline" onClick={() => { setPreview(null); setFileName(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <CardTitle className="text-base">Consulta de Alíquotas por NCM</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Buscar NCM ou descrição..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="pl-9 w-[280px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1">
                <Download size={14} /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NCM</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Federal %</TableHead>
                  <TableHead className="text-right">Estadual %</TableHead>
                  <TableHead className="text-right">Municipal %</TableHead>
                  <TableHead className="text-right">Total %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e, i) => (
                  <TableRow key={`${e.ncm}-${i}`}>
                    <TableCell className="font-mono">
                      <Badge variant="outline">{e.ncm}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[350px] truncate">{e.descricao}</TableCell>
                    <TableCell className="text-right">{e.federal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{e.estadual.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{e.municipal.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">{(e.federal + e.estadual + e.municipal).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {loading ? "Carregando dados do Supabase..." : `Nenhum NCM encontrado para "${busca}"`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length >= 200 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Exibindo os primeiros 200 resultados. Refine a busca para ver mais.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={18} /> Configurar Token IBPT
            </DialogTitle>
            <DialogDescription>
              Insira o token obtido em deolhonoimposto.ibpt.org.br para sincronização automática.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ibpt-token">Token IBPT</Label>
              <Input
                id="ibpt-token"
                value={tokenIbpt}
                onChange={e => setTokenIbpt(e.target.value)}
                placeholder="Cole o token aqui"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ibpt-uf">UF</Label>
                <Input
                  id="ibpt-uf"
                  value={uf}
                  onChange={e => setUf(e.target.value.toUpperCase())}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibpt-cnpj">CNPJ (opcional)</Label>
                <Input
                  id="ibpt-cnpj"
                  value={cnpjIbpt}
                  onChange={e => setCnpjIbpt(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfigOpen(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={saveConfig} disabled={!tokenIbpt.trim()}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
