import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUp, CheckCircle2, AlertTriangle, XCircle, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ncmCestMvaData } from "@/data/ncmCestMva";

interface ProdutoXML {
  codigo: string;
  descricao: string;
  ncm: string;
  ncmCorrigido: string;
  cest: string;
  cestCorrigido: string;
  cfop: string;
  cstIcms: string;
  cstIcmsCorrigido: string;
  cstPis: string;
  cstCofins: string;
  quantidade: string;
  valorUnit: string;
  valorTotal: string;
  divergencias: string[];
  status: "ok" | "alerta" | "erro";
}

interface DadosNFe {
  chave: string;
  numero: string;
  serie: string;
  emitente: string;
  cnpjEmitente: string;
  dataEmissao: string;
  valorTotal: string;
  produtos: ProdutoXML[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportar?: (dados: DadosNFe) => void;
}

export function ImportarXMLEmpresaModal({ open, onOpenChange, onImportar }: Props) {
  const [dadosNFe, setDadosNFe] = useState<DadosNFe | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const xmlText = ev.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, "text/xml");

        // Dados do emitente
        const emit = doc.querySelector("emit");
        const ide = doc.querySelector("ide");
        const infProt = doc.querySelector("infProt");
        const total = doc.querySelector("total ICMSTot");

        const dados: DadosNFe = {
          chave: infProt?.querySelector("chNFe")?.textContent || doc.querySelector("infNFe")?.getAttribute("Id")?.replace("NFe", "") || "",
          numero: ide?.querySelector("nNF")?.textContent || "",
          serie: ide?.querySelector("serie")?.textContent || "",
          emitente: emit?.querySelector("xNome")?.textContent || "",
          cnpjEmitente: emit?.querySelector("CNPJ")?.textContent || "",
          dataEmissao: ide?.querySelector("dhEmi")?.textContent?.substring(0, 10) || "",
          valorTotal: total?.querySelector("vNF")?.textContent || "0",
          produtos: [],
        };

        // Produtos
        const dets = doc.querySelectorAll("det");
        dets.forEach(det => {
          const prod = det.querySelector("prod");
          const imposto = det.querySelector("imposto");
          if (!prod) return;

          const ncmRaw = prod.querySelector("NCM")?.textContent || "";
          const cest = prod.querySelector("CEST")?.textContent || "";
          const ncmFormatado = ncmRaw.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3");
          
          const ncmBase = ncmCestMvaData.find(n => n.ncm === ncmFormatado || n.ncm.replace(/\./g, "") === ncmRaw);
          
          const cstIcmsEl = imposto?.querySelector("ICMS")?.children[0];
          const cstIcms = cstIcmsEl?.querySelector("CST")?.textContent || cstIcmsEl?.querySelector("CSOSN")?.textContent || "";
          const cstPis = imposto?.querySelector("PIS")?.children[0]?.querySelector("CST")?.textContent || "";
          const cstCofins = imposto?.querySelector("COFINS")?.children[0]?.querySelector("CST")?.textContent || "";

          const divergencias: string[] = [];
          let status: "ok" | "alerta" | "erro" = "ok";

          // Validações
          if (!ncmBase) {
            divergencias.push("NCM não encontrado na base");
            status = "alerta";
          }
          if (!cest && ncmBase?.cest) {
            divergencias.push("CEST ausente — preenchimento sugerido");
            status = status === "ok" ? "alerta" : status;
          }
          if (cest && ncmBase && cest !== ncmBase.cest.replace(/\./g, "")) {
            divergencias.push(`CEST divergente: ${cest} ≠ ${ncmBase.cest}`);
            status = "erro";
          }

          dados.produtos.push({
            codigo: prod.querySelector("cProd")?.textContent || "",
            descricao: prod.querySelector("xProd")?.textContent || "",
            ncm: ncmFormatado || ncmRaw,
            ncmCorrigido: ncmBase?.ncm || ncmFormatado || ncmRaw,
            cest,
            cestCorrigido: ncmBase?.cest || cest,
            cfop: prod.querySelector("CFOP")?.textContent || "",
            cstIcms,
            cstIcmsCorrigido: cstIcms,
            cstPis,
            cstCofins,
            quantidade: prod.querySelector("qCom")?.textContent || "0",
            valorUnit: prod.querySelector("vUnCom")?.textContent || "0",
            valorTotal: prod.querySelector("vProd")?.textContent || "0",
            divergencias,
            status,
          });
        });

        setDadosNFe(dados);
        toast.success(`XML processado: ${dados.produtos.length} produtos encontrados`);
      } catch {
        toast.error("Erro ao processar o arquivo XML");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleImportar = () => {
    if (dadosNFe && onImportar) {
      onImportar(dadosNFe);
    }
    toast.success("Produtos importados com correções aplicadas!");
    setDadosNFe(null);
    onOpenChange(false);
  };

  const totalDivergencias = dadosNFe?.produtos.filter(p => p.status !== "ok").length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar XML NF-e — Correção Automática</DialogTitle>
        </DialogHeader>

        {!dadosNFe ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Importe um XML de NF-e para entrada automática de produtos com correção de NCM, CEST e tributação.
            </p>
            <div className="border-2 border-dashed rounded-lg p-10 text-center">
              <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <Label htmlFor="xml-empresa" className="cursor-pointer text-primary hover:underline text-lg">
                Selecionar XML NF-e
              </Label>
              <Input id="xml-empresa" type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
              <p className="text-xs text-muted-foreground mt-2">Formatos aceitos: XML de NF-e (procNFe_v4.00)</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Dados da NF-e */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 rounded-lg p-3">
              <div>
                <div className="text-[10px] text-muted-foreground">Número</div>
                <div className="font-mono text-sm">{dadosNFe.numero}/{dadosNFe.serie}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Emitente</div>
                <div className="text-sm truncate">{dadosNFe.emitente}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">CNPJ</div>
                <div className="font-mono text-sm">{dadosNFe.cnpjEmitente}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Valor Total</div>
                <div className="font-mono text-sm font-bold">R$ {parseFloat(dadosNFe.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Resumo */}
            <div className="flex gap-3">
              <Badge variant="outline">{dadosNFe.produtos.length} produtos</Badge>
              {totalDivergencias > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />{totalDivergencias} com divergências
                </Badge>
              )}
            </div>

            {/* Tabela de produtos */}
            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead>CEST</TableHead>
                    <TableHead>CFOP</TableHead>
                    <TableHead>CST</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosNFe.produtos.map((p, i) => (
                    <TableRow key={i} className={p.status === "erro" ? "bg-red-500/5" : p.status === "alerta" ? "bg-amber-500/5" : ""}>
                      <TableCell className="text-xs max-w-[200px] truncate">{p.descricao}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.ncm}
                        {p.ncm !== p.ncmCorrigido && <div className="text-emerald-400 text-[10px]">→ {p.ncmCorrigido}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.cest || <span className="text-red-400">—</span>}
                        {p.cest !== p.cestCorrigido && p.cestCorrigido && <div className="text-emerald-400 text-[10px]">→ {p.cestCorrigido}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.cfop}</TableCell>
                      <TableCell className="font-mono text-xs">{p.cstIcms}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        R$ {parseFloat(p.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {p.status === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {p.status === "alerta" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {p.status === "erro" && <XCircle className="w-4 h-4 text-red-400" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Divergências */}
            {totalDivergencias > 0 && (
              <div className="border border-amber-500/30 rounded-lg p-3 bg-amber-500/5">
                <h4 className="text-sm font-semibold text-amber-400 mb-2">Correções a serem aplicadas:</h4>
                <ul className="space-y-1 text-xs">
                  {dadosNFe.produtos.filter(p => p.divergencias.length > 0).flatMap(p =>
                    p.divergencias.map((d, i) => (
                      <li key={`${p.codigo}-${i}`} className="flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                        <span><strong>{p.descricao.substring(0, 30)}</strong>: {d}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setDadosNFe(null); }}>Cancelar</Button>
              <Button onClick={handleImportar}>
                <CheckCircle2 className="w-4 h-4 mr-2" />Importar com Correções
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
