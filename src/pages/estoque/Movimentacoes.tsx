import { ExportButtons } from "@/components/ExportButtons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, Package, Filter, Percent } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

interface Movimentacao {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  motivo: string;
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
  custoUnitario: number;
  documentoRef: string;
  observacao: string;
  usuario: string;
}

const motivos = {
  entrada: ["Compra", "Devolução de Cliente", "Ajuste de Inventário", "Bonificação", "Transferência Recebida", "Produção", "Outras Entradas"],
  saida: ["Venda", "Devolução ao Fornecedor", "Ajuste de Inventário", "Perda/Avaria", "Transferência Enviada", "Consumo Interno", "Outras Saídas"],
};

const defaultMovimentacoes: Movimentacao[] = [
  { id: "1", data: "2026-03-07T10:30", tipo: "entrada", motivo: "Compra", produtoCodigo: "001", produtoDescricao: "Smartphone X Pro 128GB", quantidade: 50, custoUnitario: 1100, documentoRef: "NF-e 123456", observacao: "", usuario: "Admin" },
  { id: "2", data: "2026-03-07T11:15", tipo: "saida", motivo: "Venda", produtoCodigo: "001", produtoDescricao: "Smartphone X Pro 128GB", quantidade: 2, custoUnitario: 1100, documentoRef: "PDV 00045", observacao: "", usuario: "Admin" },
  { id: "3", data: "2026-03-06T14:00", tipo: "entrada", motivo: "Devolução de Cliente", produtoCodigo: "002", produtoDescricao: "Notebook Ultra 15 i7", quantidade: 1, custoUnitario: 3200, documentoRef: "DEV 0012", observacao: "Produto com defeito", usuario: "Admin" },
  { id: "4", data: "2026-03-06T09:00", tipo: "saida", motivo: "Perda/Avaria", produtoCodigo: "003", produtoDescricao: "Fone Bluetooth ANC", quantidade: 3, custoUnitario: 120, documentoRef: "", observacao: "Danificados no transporte", usuario: "Admin" },
];

export default function Movimentacoes() {
  const { items, addItem } = useLocalStorage<Movimentacao>("movimentacoes_estoque", defaultMovimentacoes);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [filtroPromo, setFiltroPromo] = useState(false);

  // Lookup de produtos com promoção ativa (from promocoes module)
  const produtosComPromo = useMemo(() => {
    try {
      const stored = localStorage.getItem("promocoes");
      const promocoes: any[] = stored ? JSON.parse(stored) : [];
      const set = new Set<string>();
      promocoes.forEach(pr => {
        if (pr.status === "ABERTO") {
          (pr.produtos || []).forEach((p: any) => set.add(p.produtoCodigo));
        }
      });
      return set;
    } catch { return new Set<string>(); }
  }, [items]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "entrada" as "entrada" | "saida",
    motivo: "",
    produtoCodigo: "",
    produtoDescricao: "",
    quantidade: "",
    custoUnitario: "",
    documentoRef: "",
    observacao: "",
  });

  const filtered = items
    .filter(m => filtroTipo === "todos" || m.tipo === filtroTipo)
    .filter(m => !filtroPromo || produtosComPromo.has(m.produtoCodigo))
    .filter(m =>
      m.produtoDescricao.toLowerCase().includes(search.toLowerCase()) ||
      m.produtoCodigo.includes(search) ||
      m.motivo.toLowerCase().includes(search.toLowerCase()) ||
      m.documentoRef.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const totalEntradas = items.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.quantidade * m.custoUnitario, 0);
  const totalSaidas = items.filter(m => m.tipo === "saida").reduce((s, m) => s + m.quantidade * m.custoUnitario, 0);

  const resetForm = () => {
    setForm({ tipo: "entrada", motivo: "", produtoCodigo: "", produtoDescricao: "", quantidade: "", custoUnitario: "", documentoRef: "", observacao: "" });
  };

  const handleSave = () => {
    if (!form.produtoDescricao || !form.quantidade || !form.motivo) {
      toast.error("Preencha produto, quantidade e motivo");
      return;
    }
    addItem({
      data: new Date().toISOString(),
      tipo: form.tipo,
      motivo: form.motivo,
      produtoCodigo: form.produtoCodigo,
      produtoDescricao: form.produtoDescricao,
      quantidade: parseFloat(form.quantidade),
      custoUnitario: parseFloat(form.custoUnitario) || 0,
      documentoRef: form.documentoRef,
      observacao: form.observacao,
      usuario: "Admin",
    });
    toast.success(`${form.tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso`);
    setModalOpen(false);
    resetForm();
  };

  return (
    <div className="page-container">
      <PageHeader title="Movimentações de Estoque" description="Registre e consulte entradas e saídas de produtos" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Movimentações</p>
              <p className="text-xl font-bold">{items.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><ArrowUpCircle className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Entradas</p>
              <p className="text-xl font-bold text-green-600">R$ {totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><ArrowDownCircle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Saídas</p>
              <p className="text-xl font-bold text-destructive">R$ {totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por produto, motivo ou documento..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
              <SelectTrigger className="w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={filtroPromo ? "default" : "outline"}
              size="sm"
              className="gap-1.5 whitespace-nowrap"
              onClick={() => setFiltroPromo(!filtroPromo)}
            >
              <Percent className="h-3.5 w-3.5" />
              Promoção
              {filtroPromo && produtosComPromo.size > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5 border-0">{filtered.length}</Badge>
              )}
            </Button>
            <ExportButtons options={{
              title: "Movimentações de Estoque",
              filename: `Movimentacoes_Estoque_${new Date().toISOString().split("T")[0]}`,
              columns: [
                { header: "Data", key: "data", format: (v: string) => new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) },
                { header: "Tipo", key: "tipo", format: (v: string) => v === "entrada" ? "Entrada" : "Saída" },
                { header: "Produto", key: "produtoDescricao" },
                { header: "Motivo", key: "motivo" },
                { header: "Qtd", key: "quantidade", align: "right" },
                { header: "Custo Unit.", key: "custoUnitario", align: "right", format: (v: number) => `R$ ${v.toFixed(2)}` },
                { header: "Total", key: "_total", align: "right", format: (_: any, row: any) => `R$ ${(row.quantidade * row.custoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              ],
              data: filtered,
              summaryRows: [
                { label: "Total Entradas", value: `R$ ${totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
                { label: "Total Saídas", value: `R$ ${totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
              ],
            }} />
            <Button onClick={() => { resetForm(); setModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nova Movimentação</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Custo Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Documento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma movimentação encontrada</TableCell></TableRow>
              ) : filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">{new Date(m.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>
                    <Badge variant={m.tipo === "entrada" ? "default" : "destructive"} className="gap-1">
                      {m.tipo === "entrada" ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
                      {m.tipo === "entrada" ? "Entrada" : "Saída"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-xs mr-1">{m.produtoCodigo}</span>
                    {m.produtoDescricao}
                    {produtosComPromo.has(m.produtoCodigo) && (
                      <Badge variant="outline" className="ml-2 text-[9px] h-4 px-1.5 gap-0.5 border-primary/40 text-primary">
                        <Percent size={8} />Promo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{m.motivo}</TableCell>
                  <TableCell className="text-right font-medium">{m.quantidade}</TableCell>
                  <TableCell className="text-right">R$ {m.custoUnitario.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">R$ {(m.quantidade * m.custoUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-muted-foreground">{m.documentoRef || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: any) => setForm(f => ({ ...f, tipo: v, motivo: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Motivo *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {motivos[form.tipo].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Código</Label>
                <Input value={form.produtoCodigo} onChange={e => setForm(f => ({ ...f, produtoCodigo: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Descrição do Produto *</Label>
                <Input value={form.produtoDescricao} onChange={e => setForm(f => ({ ...f, produtoDescricao: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantidade *</Label>
                <Input type="number" min="0" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))} />
              </div>
              <div>
                <Label>Custo Unitário</Label>
                <Input type="number" min="0" step="0.01" value={form.custoUnitario} onChange={e => setForm(f => ({ ...f, custoUnitario: e.target.value }))} />
              </div>
              <div>
                <Label>Doc. Referência</Label>
                <Input value={form.documentoRef} onChange={e => setForm(f => ({ ...f, documentoRef: e.target.value }))} placeholder="NF-e, PDV..." />
              </div>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
