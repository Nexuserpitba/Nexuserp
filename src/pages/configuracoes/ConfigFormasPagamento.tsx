import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CreditCard, ArrowLeft } from "lucide-react";

interface FormaPagamento {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;       // dinheiro, credito, debito, pix, cheque, boleto, outros
  ativo: boolean;
  tef: boolean;        // requer integração TEF
  troco: boolean;      // permite troco
  maxParcelas: number;
  taxaOperadora: number;
  codigoFiscal: string; // código fiscal conforme tabela SEFAZ (01-99)
}

const tiposFiscais = [
  { cod: "01", desc: "Dinheiro" },
  { cod: "02", desc: "Cheque" },
  { cod: "03", desc: "Cartão de Crédito" },
  { cod: "04", desc: "Cartão de Débito" },
  { cod: "05", desc: "Crédito Loja" },
  { cod: "10", desc: "Vale Alimentação" },
  { cod: "11", desc: "Vale Refeição" },
  { cod: "12", desc: "Vale Presente" },
  { cod: "13", desc: "Vale Combustível" },
  { cod: "15", desc: "Boleto Bancário" },
  { cod: "16", desc: "Depósito Bancário" },
  { cod: "17", desc: "PIX" },
  { cod: "99", desc: "Outros" },
];

const defaultFormas: FormaPagamento[] = [
  { id: "1", codigo: "01", descricao: "Dinheiro", tipo: "dinheiro", ativo: true, tef: false, troco: true, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "01" },
  { id: "2", codigo: "02", descricao: "Cartão de Crédito", tipo: "credito", ativo: true, tef: true, troco: false, maxParcelas: 12, taxaOperadora: 2.5, codigoFiscal: "03" },
  { id: "3", codigo: "03", descricao: "Cartão de Débito", tipo: "debito", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 1.5, codigoFiscal: "04" },
  { id: "4", codigo: "04", descricao: "PIX", tipo: "pix", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "17" },
  { id: "5", codigo: "05", descricao: "Crediário", tipo: "crediario", ativo: true, tef: false, troco: false, maxParcelas: 12, taxaOperadora: 0, codigoFiscal: "05" },
  { id: "6", codigo: "06", descricao: "Vale Alimentação", tipo: "vale_alimentacao", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.5, codigoFiscal: "10" },
  { id: "7", codigo: "07", descricao: "Vale Refeição", tipo: "vale_refeicao", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.5, codigoFiscal: "11" },
  { id: "8", codigo: "08", descricao: "Convênio", tipo: "convenio", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "99" },
  { id: "9", codigo: "09", descricao: "Cheque", tipo: "cheque", ativo: false, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "02" },
  { id: "10", codigo: "10", descricao: "Vale Presente", tipo: "vale_presente", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.0, codigoFiscal: "12" },
  { id: "11", codigo: "11", descricao: "Vale Combustível", tipo: "vale_combustivel", ativo: true, tef: true, troco: false, maxParcelas: 1, taxaOperadora: 3.0, codigoFiscal: "13" },
  { id: "12", codigo: "12", descricao: "Depósito Bancário", tipo: "deposito", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "16" },
  { id: "13", codigo: "13", descricao: "Boleto Bancário", tipo: "boleto", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "15" },
];

const emptyForma: Omit<FormaPagamento, "id"> = {
  codigo: "", descricao: "", tipo: "dinheiro", ativo: true, tef: false, troco: false, maxParcelas: 1, taxaOperadora: 0, codigoFiscal: "01",
};

export default function ConfigFormasPagamento() {
  const navigate = useNavigate();
  const [formas, setFormas] = useState<FormaPagamento[]>(() => {
    try {
      const s = localStorage.getItem("formas-pagamento");
      if (s) {
        const stored: FormaPagamento[] = JSON.parse(s);
        const defaultMap = new Map(defaultFormas.map(f => [f.id, f]));
        // Sincronizar tipo das formas padrão e detectar crediário por descrição
        const updated = stored.map(f => {
          const def = defaultMap.get(f.id);
          if (def) return { ...f, tipo: def.tipo };
          const desc = (f.descricao || "").toLowerCase();
          if ((desc.includes("crediário") || desc.includes("crediario")) && f.tipo !== "crediario") {
            return { ...f, tipo: "crediario" };
          }
          return f;
        });
        // Adicionar formas padrão que não existem
        const storedIds = new Set(updated.map(f => f.id));
        const missing = defaultFormas.filter(f => !storedIds.has(f.id));
        const merged = [...updated, ...missing];
        localStorage.setItem("formas-pagamento", JSON.stringify(merged));
        return merged;
      }
      return defaultFormas;
    } catch { return defaultFormas; }
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState<FormaPagamento | null>(null);

  const save = (data: FormaPagamento[]) => {
    setFormas(data);
    localStorage.setItem("formas-pagamento", JSON.stringify(data));
  };

  const handleSave = () => {
    if (!editData) return;
    if (!editData.descricao.trim()) { toast.error("Informe a descrição"); return; }
    if (editData.id) {
      save(formas.map(f => f.id === editData.id ? editData : f));
    } else {
      save([...formas, { ...editData, id: crypto.randomUUID() }]);
    }
    setEditOpen(false);
    toast.success("Forma de pagamento salva!");
  };

  const handleDelete = (id: string) => {
    save(formas.filter(f => f.id !== id));
    toast.success("Forma de pagamento removida");
  };

  const openNew = () => { setEditData({ ...emptyForma, id: "" } as any); setEditOpen(true); };
  const openEdit = (f: FormaPagamento) => { setEditData({ ...f }); setEditOpen(true); };

  return (
    <div className="page-container">
      <PageHeader
        title="Formas de Pagamento"
        description="Configure as formas de pagamento aceitas no PDV e NFC-e"
        actions={<Button onClick={openNew} className="gap-2"><Plus size={16} /> Nova Forma</Button>}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard className="text-primary" size={24} />
            <div>
              <CardTitle>Formas de Pagamento Cadastradas</CardTitle>
              <CardDescription>Código fiscal conforme tabela SEFAZ (tPag) para NF-e/NFC-e</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cód. Fiscal (tPag)</TableHead>
                <TableHead className="text-center">TEF</TableHead>
                <TableHead className="text-center">Troco</TableHead>
                <TableHead className="text-center">Parcelas</TableHead>
                <TableHead className="text-right">Taxa %</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formas.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono">{f.codigo}</TableCell>
                  <TableCell className="font-medium">{f.descricao}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${f.tipo === "crediario" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      {f.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{f.codigoFiscal} - {tiposFiscais.find(t => t.cod === f.codigoFiscal)?.desc || ""}</TableCell>
                  <TableCell className="text-center">{f.tef ? "✓" : "—"}</TableCell>
                  <TableCell className="text-center">{f.troco ? "✓" : "—"}</TableCell>
                  <TableCell className="text-center">{f.maxParcelas}</TableCell>
                  <TableCell className="text-right font-mono">{f.taxaOperadora.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={f.ativo} onCheckedChange={v => save(formas.map(x => x.id === f.id ? { ...x, ativo: v } : x))} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}><Trash2 size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editData?.id ? "Editar" : "Nova"} Forma de Pagamento</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input value={editData.codigo} onChange={e => setEditData({ ...editData, codigo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={editData.descricao} onChange={e => setEditData({ ...editData, descricao: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={editData.tipo} onValueChange={v => setEditData({ ...editData, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Cartão Crédito</SelectItem>
                      <SelectItem value="debito">Cartão Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="crediario">Crediário</SelectItem>
                      <SelectItem value="vale_alimentacao">Vale Alimentação</SelectItem>
                      <SelectItem value="vale_refeicao">Vale Refeição</SelectItem>
                      <SelectItem value="vale_presente">Vale Presente</SelectItem>
                      <SelectItem value="vale_combustivel">Vale Combustível</SelectItem>
                      <SelectItem value="convenio">Convênio</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código Fiscal (tPag)</Label>
                  <Select value={editData.codigoFiscal} onValueChange={v => setEditData({ ...editData, codigoFiscal: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposFiscais.map(t => <SelectItem key={t.cod} value={t.cod}>{t.cod} - {t.desc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Máx. Parcelas</Label>
                  <Input type="number" min="1" value={editData.maxParcelas} onChange={e => setEditData({ ...editData, maxParcelas: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxa Operadora (%)</Label>
                <Input type="number" step="0.01" value={editData.taxaOperadora} onChange={e => setEditData({ ...editData, taxaOperadora: parseFloat(e.target.value) || 0 })} className="max-w-[200px]" />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={editData.ativo} onCheckedChange={v => setEditData({ ...editData, ativo: v })} />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editData.tef} onCheckedChange={v => setEditData({ ...editData, tef: v })} />
                  <Label>Requer TEF</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editData.troco} onCheckedChange={v => setEditData({ ...editData, troco: v })} />
                  <Label>Permite Troco</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
