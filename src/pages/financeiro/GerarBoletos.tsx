import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Plus, Printer, Search, FileText, Eye, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { printPDF, buildPrintTable, printCurrency } from "@/lib/printUtils";
import { BoletoVisualizacao } from "@/components/boleto/BoletoVisualizacao";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface Pessoa {
  id: string;
  nome: string;
  documento: string;
  tipo: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

interface ContaBancaria {
  id: string;
  banco: string;
  codigoBanco: string;
  agencia: string;
  digitoAgencia: string;
  conta: string;
  digitoConta: string;
  convenio: string;
  carteira: string;
  cedente: string;
  cnpjCedente: string;
  enderecoCedente: string;
  cidadeCedente: string;
  ufCedente: string;
  ativa: boolean;
}

interface ModeloBoleto {
  id: string;
  nome: string;
  contaBancariaId: string;
  instrucao1: string;
  instrucao2: string;
  instrucao3: string;
  instrucao4: string;
  instrucao5: string;
  demonstrativo1: string;
  demonstrativo2: string;
  demonstrativo3: string;
  localPagamento: string;
  especieDocumento: string;
  aceite: string;
  jurosMora: number;
  multa: number;
  diasProtesto: number;
  padrao: boolean;
}

interface BoletoGerado {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteDoc: string;
  modeloId: string;
  contaBancariaId: string;
  nossoNumero: string;
  valor: number;
  vencimento: string;
  emissao: string;
  referencia: string;
  status: "emitido" | "pago" | "vencido" | "cancelado";
  origem: string;
}

const defaultBoletos: BoletoGerado[] = [];

export default function GerarBoletos() {
  const { items: pessoas } = useLocalStorage<Pessoa>("cadastro_pessoas", []);
  const { items: contas } = useLocalStorage<ContaBancaria>("config_contas_bancarias", []);
  const { items: modelos } = useLocalStorage<ModeloBoleto>("config_modelos_boleto", []);
  const { items: boletos, addItem: addBoleto, updateItem: updateBoleto, deleteItem: deleteBoleto } = useLocalStorage<BoletoGerado>("boletos_gerados", defaultBoletos);

  // Buscar parcelas do contas a receber
  const contasReceber = useMemo(() => {
    try {
      const stored = localStorage.getItem("contas_receber");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }, []);

  const [modalNovo, setModalNovo] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [boletoVisualizar, setBoletoVisualizar] = useState<BoletoGerado | null>(null);

  // Form
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteDoc, setClienteDoc] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [referencia, setReferencia] = useState("");
  const [buscaCliente, setBuscaCliente] = useState("");
  const [popoverCliente, setPopoverCliente] = useState(false);

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");

  // Importar do contas a receber
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState<string[]>([]);

  const clientesFiltrados = pessoas.filter(p =>
    p.nome?.toLowerCase().includes(buscaCliente.toLowerCase()) ||
    p.documento?.includes(buscaCliente)
  );

  function gerarNossoNumero(): string {
    const num = Math.floor(Math.random() * 99999999999).toString().padStart(11, "0");
    return num;
  }

  function resetForm() {
    setClienteId(""); setClienteNome(""); setClienteDoc("");
    setModeloId(""); setValor(""); setReferencia("");
    setVencimento(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  }

  function selecionarCliente(p: Pessoa) {
    setClienteId(p.id); setClienteNome(p.nome); setClienteDoc(p.documento);
    setPopoverCliente(false); setBuscaCliente("");
  }

  function salvarBoleto() {
    if (!clienteNome || !valor || !vencimento || !modeloId) {
      toast.error("Preencha cliente, modelo, valor e vencimento"); return;
    }
    const modelo = modelos.find(m => m.id === modeloId);
    addBoleto({
      clienteId, clienteNome, clienteDoc, modeloId,
      contaBancariaId: modelo?.contaBancariaId || "",
      nossoNumero: gerarNossoNumero(),
      valor: parseFloat(valor), vencimento, referencia,
      emissao: format(new Date(), "yyyy-MM-dd"),
      status: "emitido", origem: "manual",
    } as Omit<BoletoGerado, "id">);
    toast.success("Boleto gerado com sucesso!");
    resetForm(); setModalNovo(false);
  }

  function importarContasReceber() {
    if (parcelasSelecionadas.length === 0 || !modeloId) {
      toast.error("Selecione parcelas e um modelo"); return;
    }
    let count = 0;
    contasReceber.forEach((cr: any) => {
      cr.parcelas?.forEach((p: any) => {
        const key = `${cr.id}-${p.numero}`;
        if (parcelasSelecionadas.includes(key) && p.status !== "recebida") {
          addBoleto({
            clienteId: cr.clienteId || "", clienteNome: cr.cliente, clienteDoc: cr.clienteDoc || "",
            modeloId, contaBancariaId: modelos.find(m => m.id === modeloId)?.contaBancariaId || "",
            nossoNumero: gerarNossoNumero(), valor: p.valor, vencimento: p.vencimento,
            emissao: format(new Date(), "yyyy-MM-dd"), referencia: `CR #${cr.id.slice(0, 8)} - Parcela ${p.numero}`,
            status: "emitido", origem: "contas_receber",
          } as Omit<BoletoGerado, "id">);
          count++;
        }
      });
    });
    toast.success(`${count} boleto(s) gerado(s)`);
    setParcelasSelecionadas([]); setModalImportar(false);
  }

  function visualizar(b: BoletoGerado) {
    setBoletoVisualizar(b); setModalVisualizar(true);
  }

  const hoje = format(new Date(), "yyyy-MM-dd");
  const boletosFiltrados = boletos.filter(b => {
    if (filtroStatus !== "todos" && b.status !== filtroStatus) return false;
    if (filtroBusca && !b.clienteNome.toLowerCase().includes(filtroBusca.toLowerCase()) && !b.nossoNumero.includes(filtroBusca)) return false;
    return true;
  }).map(b => ({
    ...b,
    status: b.status === "emitido" && b.vencimento < hoje ? "vencido" as const : b.status,
  }));

  const totalEmitido = boletos.filter(b => b.status === "emitido").reduce((s, b) => s + b.valor, 0);
  const totalVencido = boletos.filter(b => b.status === "emitido" && b.vencimento < hoje).reduce((s, b) => s + b.valor, 0);
  const totalPago = boletos.filter(b => b.status === "pago").reduce((s, b) => s + b.valor, 0);

  const contaRef = (id: string) => contas.find(c => c.id === id);
  const modeloRef = (id: string) => modelos.find(m => m.id === id);

  return (
    <div className="page-container max-w-7xl mx-auto">
      <PageHeader
        title="Boletos"
        description="Geração e controle de boletos bancários"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setParcelasSelecionadas([]); setModalImportar(true); }}>
              <FileText size={16} /> Importar do Contas a Receber
            </Button>
            <Button onClick={() => { resetForm(); setModalNovo(true); }}>
              <Plus size={16} /> Gerar Boleto
            </Button>
          </div>
        }
      />

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-primary/10"><DollarSign className="text-primary" size={20} /></div>
            <div><p className="text-sm text-muted-foreground">Em Aberto</p><p className="text-xl font-bold text-foreground">R$ {totalEmitido.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-destructive/10"><AlertTriangle className="text-destructive" size={20} /></div>
            <div><p className="text-sm text-muted-foreground">Vencidos</p><p className="text-xl font-bold text-destructive">R$ {totalVencido.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-lg bg-accent/10"><CheckCircle className="text-accent" size={20} /></div>
            <div><p className="text-sm text-muted-foreground">Pagos</p><p className="text-xl font-bold text-foreground">R$ {totalPago.toFixed(2)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 mb-4">
        <Input placeholder="Buscar por cliente ou nosso número..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} className="max-w-sm" />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="emitido">Emitidos</SelectItem>
            <SelectItem value="pago">Pagos</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nosso Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boletosFiltrados.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum boleto encontrado</TableCell></TableRow>
              )}
              {boletosFiltrados.map(b => {
                const ct = contaRef(b.contaBancariaId);
                const statusColor = { emitido: "default", pago: "secondary", vencido: "destructive", cancelado: "outline" } as const;
                const statusLabel = { emitido: "Emitido", pago: "Pago", vencido: "Vencido", cancelado: "Cancelado" };
                return (
                  <TableRow key={b.id} className={b.status === "vencido" ? "bg-destructive/5" : ""}>
                    <TableCell className="font-mono text-xs">{b.nossoNumero}</TableCell>
                    <TableCell>
                      <div><span className="font-medium">{b.clienteNome}</span></div>
                      {b.clienteDoc && <div className="text-xs text-muted-foreground">{b.clienteDoc}</div>}
                    </TableCell>
                    <TableCell>{ct ? `${ct.codigoBanco} - ${ct.banco}` : "-"}</TableCell>
                    <TableCell className="text-right font-medium">R$ {b.valor.toFixed(2)}</TableCell>
                    <TableCell>{b.vencimento.split("-").reverse().join("/")}</TableCell>
                    <TableCell>{b.emissao.split("-").reverse().join("/")}</TableCell>
                    <TableCell><Badge variant={statusColor[b.status]}>{statusLabel[b.status]}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{b.origem === "manual" ? "Manual" : "Contas Receber"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => visualizar(b)} title="Visualizar"><Eye size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const ct = contaRef(b.contaBancariaId);
                          printPDF({
                            title: "BOLETO BANCÁRIO",
                            subtitle: `Nosso Número: ${b.nossoNumero} | Vencimento: ${b.vencimento.split("-").reverse().join("/")}`,
                            content: `
                              <div class="info-grid">
                                <div class="info-box"><div class="label">Sacado</div><div class="value" style="font-size:13px">${b.clienteNome}</div></div>
                                <div class="info-box"><div class="label">Documento</div><div class="value" style="font-size:13px">${b.clienteDoc || "-"}</div></div>
                                <div class="info-box"><div class="label">Valor</div><div class="value">${printCurrency(b.valor)}</div></div>
                                <div class="info-box"><div class="label">Banco</div><div class="value" style="font-size:13px">${ct ? `${ct.codigoBanco} - ${ct.banco}` : "-"}</div></div>
                              </div>
                            `,
                          });
                        }} title="Imprimir"><Printer size={14} /></Button>
                        {b.status === "emitido" && (
                          <Button variant="ghost" size="icon" onClick={() => { updateBoleto(b.id, { status: "pago" }); toast.success("Marcado como pago"); }} title="Baixar">
                            <CheckCircle size={14} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MODAL GERAR BOLETO */}
      <Dialog open={modalNovo} onOpenChange={v => { if (!v) resetForm(); setModalNovo(v); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Gerar Boleto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={popoverCliente} onOpenChange={setPopoverCliente}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <Search size={14} className="mr-2" />
                    {clienteNome || "Buscar cliente no cadastro..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0">
                  <Command>
                    <CommandInput placeholder="Nome ou documento..." value={buscaCliente} onValueChange={setBuscaCliente} />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                      <CommandGroup>
                        {clientesFiltrados.slice(0, 10).map(p => (
                          <CommandItem key={p.id} onSelect={() => selecionarCliente(p)}>
                            <div>
                              <span className="font-medium">{p.nome}</span>
                              <span className="text-xs text-muted-foreground ml-2">{p.documento}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Modelo de Boleto *</Label>
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                <SelectContent>
                  {modelos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Referência / Descrição</Label>
              <Input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ex: Fatura 001/2026" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setModalNovo(false); }}>Cancelar</Button>
            <Button onClick={salvarBoleto}>Gerar Boleto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL IMPORTAR CONTAS A RECEBER */}
      <Dialog open={modalImportar} onOpenChange={setModalImportar}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar do Contas a Receber</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modelo de Boleto *</Label>
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                <SelectContent>
                  {modelos.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasReceber.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum título em contas a receber</TableCell></TableRow>
                )}
                {contasReceber.flatMap((cr: any) =>
                  (cr.parcelas || []).filter((p: any) => p.status !== "recebida").map((p: any) => {
                    const key = `${cr.id}-${p.numero}`;
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <Checkbox
                            checked={parcelasSelecionadas.includes(key)}
                            onCheckedChange={checked => {
                              setParcelasSelecionadas(prev =>
                                checked ? [...prev, key] : prev.filter(k => k !== key)
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>{cr.cliente}</TableCell>
                        <TableCell>{p.numero}/{cr.parcelas.length}</TableCell>
                        <TableCell className="text-right">R$ {p.valor.toFixed(2)}</TableCell>
                        <TableCell>{p.vencimento.split("-").reverse().join("/")}</TableCell>
                        <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportar(false)}>Cancelar</Button>
            <Button onClick={importarContasReceber}>Gerar {parcelasSelecionadas.length} Boleto(s)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL VISUALIZAR BOLETO */}
      <Dialog open={modalVisualizar} onOpenChange={setModalVisualizar}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Visualização do Boleto</DialogTitle></DialogHeader>
          {boletoVisualizar && (
            <BoletoVisualizacao
              boleto={boletoVisualizar}
              conta={contaRef(boletoVisualizar.contaBancariaId)}
              modelo={modeloRef(boletoVisualizar.modeloId)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisualizar(false)}>Fechar</Button>
            <Button onClick={() => {
              if (!boletoVisualizar) return;
              const ct = contaRef(boletoVisualizar.contaBancariaId);
              printPDF({
                title: "BOLETO BANCÁRIO",
                subtitle: `Nosso Número: ${boletoVisualizar.nossoNumero} | Vencimento: ${boletoVisualizar.vencimento.split("-").reverse().join("/")}`,
                content: `
                  <div class="info-grid">
                    <div class="info-box"><div class="label">Sacado</div><div class="value" style="font-size:13px">${boletoVisualizar.clienteNome}</div></div>
                    <div class="info-box"><div class="label">Documento</div><div class="value" style="font-size:13px">${boletoVisualizar.clienteDoc || "-"}</div></div>
                    <div class="info-box"><div class="label">Valor</div><div class="value">${printCurrency(boletoVisualizar.valor)}</div></div>
                    <div class="info-box"><div class="label">Banco</div><div class="value" style="font-size:13px">${ct ? `${ct.codigoBanco} - ${ct.banco}` : "-"}</div></div>
                  </div>
                `,
              });
            }}><Printer size={16} /> Imprimir PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
