import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

export interface NCMImportado {
  codigo: string;
  descricao: string;
}

interface ImportarNCMModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportar: (dados: NCMImportado[]) => void;
}

export function ImportarNCMModal({ open, onOpenChange, onImportar }: ImportarNCMModalProps) {
  const [dados, setDados] = useState<NCMImportado[]>([]);
  const [arquivo, setArquivo] = useState<string>("");
  const [erro, setErro] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setDados([]);
    setArquivo("");
    setErro("");
  };

  const detectColumns = (headers: string[]): { codigoIdx: number; descricaoIdx: number } => {
    const lower = headers.map(h => (h || "").toString().toLowerCase().trim());
    
    let codigoIdx = lower.findIndex(h => 
      h === "código" || h === "codigo" || h === "ncm" || h === "código ncm" || 
      h === "codigo ncm" || h === "cod" || h === "code" || h === "Código"
    );
    if (codigoIdx === -1) codigoIdx = 0;

    let descricaoIdx = lower.findIndex(h => 
      h === "descrição" || h === "descricao" || h === "desc" || h === "description" || 
      h === "denominação" || h === "denominacao" || h === "nome"
    );
    if (descricaoIdx === -1) descricaoIdx = lower.length > 1 ? 1 : -1;

    return { codigoIdx, descricaoIdx };
  };

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      setErro("Formato não suportado. Use .xlsx, .xls ou .csv");
      return;
    }

    setLoading(true);
    setErro("");
    setArquivo(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error("No sheet");
        const json: string[][] = [];
        sheet.eachRow((row) => {
          const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
          json.push(vals.map(v => String(v ?? "")));
        });

        if (json.length < 2) {
          setErro("Planilha vazia ou sem dados suficientes");
          setLoading(false);
          return;
        }

        const headers = json[0] as string[];
        const { codigoIdx, descricaoIdx } = detectColumns(headers);

        const parsed: NCMImportado[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as string[];
          if (!row || !row[codigoIdx]) continue;
          
          const codigo = String(row[codigoIdx]).replace(/\D/g, "").trim();
          const descricao = descricaoIdx >= 0 ? String(row[descricaoIdx] || "").trim() : "";
          
          if (codigo.length >= 2) {
            parsed.push({ codigo, descricao });
          }
        }

        if (parsed.length === 0) {
          setErro("Nenhum NCM válido encontrado na planilha");
        } else {
          setDados(parsed);
          toast.success(`${parsed.length} NCMs carregados da planilha`);
        }
      } catch {
        setErro("Erro ao processar o arquivo. Verifique o formato.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImportar = () => {
    onImportar(dados);
    toast.success(`${dados.length} NCMs importados com sucesso!`);
    resetState();
    onOpenChange(false);
  };

  const preview = dados.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary" />
            Importar NCM via Excel
          </DialogTitle>
          <DialogDescription>
            Selecione um arquivo .xlsx, .xls ou .csv com as colunas: Código (NCM) e Descrição
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
            <Upload size={28} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {arquivo ? arquivo : "Clique para selecionar ou arraste o arquivo"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv</p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {loading && (
            <p className="text-sm text-muted-foreground text-center animate-pulse">
              Processando planilha...
            </p>
          )}

          {erro && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle size={16} className="text-destructive" />
              <p className="text-sm text-destructive">{erro}</p>
            </div>
          )}

          {dados.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <p className="text-sm font-medium">
                  {dados.length} NCMs prontos para importação
                </p>
                <Badge variant="outline" className="ml-auto">{arquivo}</Badge>
              </div>

              <div className="border border-border rounded-md overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Código NCM</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs font-semibold">{item.codigo}</TableCell>
                        <TableCell className="text-sm">{item.descricao}</TableCell>
                      </TableRow>
                    ))}
                    {dados.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-2">
                          ... e mais {dados.length - 10} registros
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleImportar} disabled={dados.length === 0}>
            <FileSpreadsheet size={14} className="mr-1" />
            Importar {dados.length > 0 ? `(${dados.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
