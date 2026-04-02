import { CurrencyInput } from "@/components/ui/currency-input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Pencil, Save, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { estados, loadAliquotas, saveAliquotas, defaultAliquotasEstados, type AliquotaEstado } from "@/data/aliquotasEstados";

export default function RegrasTributarias() {
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [aliquotas, setAliquotas] = useState<AliquotaEstado[]>(loadAliquotas());
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<AliquotaEstado | null>(null);

  const filtered = aliquotas.filter(d => {
    if (filtroEstado && filtroEstado !== "all" && d.estado !== filtroEstado) return false;
    if (search && !d.estado.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (item: AliquotaEstado) => {
    setEditItem({ ...item });
    setEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    const updated = aliquotas.map(a => a.estado === editItem.estado ? editItem : a);
    setAliquotas(updated);
    saveAliquotas(updated);
    setEditDialog(false);
    toast.success(`Alíquota do estado ${editItem.estado} atualizada!`);
  };

  const handleReset = () => {
    setAliquotas([...defaultAliquotasEstados]);
    saveAliquotas(defaultAliquotasEstados);
    toast.success("Alíquotas restauradas para os valores padrão");
  };

  // Simulador state
  const [simValor, setSimValor] = useState(100);
  const [simOrigem, setSimOrigem] = useState("SP");
  const [simDestino, setSimDestino] = useState("MG");
  const [simMva, setSimMva] = useState(40);
  const [simResult, setSimResult] = useState<{ icmsOrigem: number; icmsDestino: number; baseCalcST: number; icmsST: number; difal: number; fcp: number } | null>(null);

  const calcular = () => {
    const origem = aliquotas.find(a => a.estado === simOrigem);
    const destino = aliquotas.find(a => a.estado === simDestino);
    if (!origem || !destino) return;

    const sulSudeste = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
    const aliqInter = sulSudeste.includes(simOrigem) && !sulSudeste.includes(simDestino) ? 7 : 12;
    const icmsOrigem = simValor * (aliqInter / 100);
    const baseCalcST = simValor * (1 + simMva / 100);
    const icmsDestino = baseCalcST * (destino.aliquota / 100);
    const icmsST = icmsDestino - icmsOrigem;
    const difal = simValor * ((destino.aliquota - aliqInter) / 100);
    const fcp = simValor * (destino.fcp / 100);

    setSimResult({ icmsOrigem, icmsDestino: destino.aliquota, baseCalcST, icmsST: Math.max(0, icmsST), difal: Math.max(0, difal), fcp });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Regras Tributárias"
        description="Alíquotas ICMS, MVA, DIFAL e CFOP por estado — vinculadas ao cadastro de produtos"
        actions={
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw size={16} className="mr-2" />Restaurar Padrão
          </Button>
        }
      />

      {/* Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            As alíquotas definidas aqui são automaticamente aplicadas no <strong>Cadastro de Produtos</strong> ao selecionar o estado (UF) na aba de Tributação.
            Clique em <Pencil size={12} className="inline" /> para editar a alíquota de um estado.
          </p>
        </CardContent>
      </Card>

      {/* Alíquotas internas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alíquotas ICMS por Estado</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar estado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-32">
                <Filter size={14} className="mr-1" />
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="table-responsive">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">ICMS (%)</TableHead>
                <TableHead className="text-right">FCP (%)</TableHead>
                <TableHead className="text-right">Total (%)</TableHead>
                <TableHead className="text-right">Interestadual S/SE</TableHead>
                <TableHead className="text-right">Interestadual Outros</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(d => (
                <TableRow key={d.estado}>
                  <TableCell>
                    <Badge variant="outline" className="font-bold">{d.estado}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{d.aliquota.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono">{d.fcp.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono font-bold">{(d.aliquota + d.fcp).toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono">{d.aliqInterestadualSul}%</TableCell>
                  <TableCell className="text-right font-mono">{d.aliqInterestadualOutros}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Pencil size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Simulador */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Simulador de Cálculo ICMS-ST / DIFAL</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Valor Produto</label>
              <CurrencyInput value={simValor} onValueChange={v => setSimValor(v)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado Origem</label>
              <Select value={simOrigem} onValueChange={setSimOrigem}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Estado Destino</label>
              <Select value={simDestino} onValueChange={setSimDestino}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estados.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">MVA (%)</label>
              <Input type="number" value={simMva} onChange={e => setSimMva(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={calcular}><Save size={14} className="mr-2" />Calcular</Button>

          {simResult && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">ICMS Origem</p>
                <p className="text-lg font-bold font-mono">R$ {simResult.icmsOrigem.toFixed(2)}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Alíq. ICMS Destino</p>
                <p className="text-lg font-bold font-mono">{simResult.icmsDestino.toFixed(1)}%</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Base Cálc. ST</p>
                <p className="text-lg font-bold font-mono">R$ {simResult.baseCalcST.toFixed(2)}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">ICMS-ST</p>
                <p className="text-lg font-bold font-mono text-primary">R$ {simResult.icmsST.toFixed(2)}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">DIFAL</p>
                <p className="text-lg font-bold font-mono">R$ {simResult.difal.toFixed(2)}</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-xs text-muted-foreground">FCP</p>
                <p className="text-lg font-bold font-mono">R$ {simResult.fcp.toFixed(2)}</p>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Alíquota — {editItem?.estado}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ICMS Interno (%)</Label>
                  <Input type="number" step="0.1" value={editItem.aliquota} onChange={e => setEditItem({ ...editItem, aliquota: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>FCP (%)</Label>
                  <Input type="number" step="0.1" value={editItem.fcp} onChange={e => setEditItem({ ...editItem, fcp: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Interestadual S/SE (%)</Label>
                  <Input type="number" step="0.1" value={editItem.aliqInterestadualSul} onChange={e => setEditItem({ ...editItem, aliqInterestadualSul: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Interestadual Outros (%)</Label>
                  <Input type="number" step="0.1" value={editItem.aliqInterestadualOutros} onChange={e => setEditItem({ ...editItem, aliqInterestadualOutros: Number(e.target.value) })} />
                </div>
              </div>
              <Card className="p-3 bg-muted/50">
                <p className="text-sm">Total (ICMS + FCP): <strong>{(editItem.aliquota + editItem.fcp).toFixed(1)}%</strong></p>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}><Save size={14} className="mr-2" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
