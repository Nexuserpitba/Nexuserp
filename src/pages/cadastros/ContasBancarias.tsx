import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Search, Building2, Edit, Trash2, Eye, CreditCard, CheckCircle2,
  Copy, ChevronDown, Landmark
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BANCOS_BRASIL, buscarBancos, buscarBancoPorCodigo, bancosPorTipo, TIPO_LABELS, type BancoInfo } from "@/data/bancosBrasil";

// ========== Interfaces ==========
interface ContaBancaria {
  id: string;
  bancocodigo: string;
  tipo: "corrente" | "poupanca" | "pagamento" | "salario";
  agencia: string;
  digitoAgencia: string;
  conta: string;
  digitoConta: string;
  titular: string;
  cpfCnpjTitular: string;
  convenio: string;
  carteira: string;
  apelido: string;
  chavePix: string;
  tipoChavePix: "" | "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
  ativa: boolean;
  padrao: boolean;
  observacoes: string;
}

const EMPTY_FORM: Omit<ContaBancaria, "id"> = {
  bancocodigo: "",
  tipo: "corrente",
  agencia: "",
  digitoAgencia: "",
  conta: "",
  digitoConta: "",
  titular: "",
  cpfCnpjTitular: "",
  convenio: "",
  carteira: "17",
  apelido: "",
  chavePix: "",
  tipoChavePix: "",
  ativa: true,
  padrao: false,
  observacoes: "",
};

const TIPO_CONTA_LABELS: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  pagamento: "Conta Pagamento",
  salario: "Conta Salário",
};

function BancoLogo({ banco }: { banco?: BancoInfo }) {
  if (!banco) return <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs">?</div>;
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
      style={{
        backgroundColor: banco.cor || "hsl(var(--muted))",
        color: banco.corTexto || "hsl(var(--muted-foreground))",
      }}
    >
      {banco.nomeReduzido.substring(0, 3)}
    </div>
  );
}

export default function ContasBancarias() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loadingContas, setLoadingContas] = useState(true);

  const fromDb = (row: any): ContaBancaria => ({
    id: row.id,
    bancocodigo: row.banco_codigo || "",
    tipo: row.tipo || "corrente",
    agencia: row.agencia || "",
    digitoAgencia: row.digito_agencia || "",
    conta: row.conta || "",
    digitoConta: row.digito_conta || "",
    titular: row.titular || "",
    cpfCnpjTitular: row.cpf_cnpj_titular || "",
    convenio: row.convenio || "",
    carteira: row.carteira || "17",
    apelido: row.apelido || "",
    chavePix: row.chave_pix || "",
    tipoChavePix: row.tipo_chave_pix || "",
    ativa: row.ativa ?? true,
    padrao: row.padrao || false,
    observacoes: row.observacoes || "",
  });

  const toDb = (item: Partial<ContaBancaria>): Record<string, any> => {
    const row: Record<string, any> = {};
    if (item.bancocodigo !== undefined) row.banco_codigo = item.bancocodigo;
    if (item.tipo !== undefined) row.tipo = item.tipo;
    if (item.agencia !== undefined) row.agencia = item.agencia;
    if (item.digitoAgencia !== undefined) row.digito_agencia = item.digitoAgencia;
    if (item.conta !== undefined) row.conta = item.conta;
    if (item.digitoConta !== undefined) row.digito_conta = item.digitoConta;
    if (item.titular !== undefined) row.titular = item.titular;
    if (item.cpfCnpjTitular !== undefined) row.cpf_cnpj_titular = item.cpfCnpjTitular;
    if (item.convenio !== undefined) row.convenio = item.convenio;
    if (item.carteira !== undefined) row.carteira = item.carteira;
    if (item.apelido !== undefined) row.apelido = item.apelido;
    if (item.chavePix !== undefined) row.chave_pix = item.chavePix;
    if (item.tipoChavePix !== undefined) row.tipo_chave_pix = item.tipoChavePix;
    if (item.ativa !== undefined) row.ativa = item.ativa;
    if (item.padrao !== undefined) row.padrao = item.padrao;
    if (item.observacoes !== undefined) row.observacoes = item.observacoes;
    return row;
  };

  useEffect(() => {
    const fetchContas = async () => {
      try {
        const { data, error } = await supabase.from("contas_bancarias").select("*").order("created_at");
        if (error) throw error;
        setContas((data || []).map(fromDb));
      } catch {
        setContas([]);
      } finally {
        setLoadingContas(false);
      }
    };
    fetchContas();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Omit<ContaBancaria, "id"> & { id?: string }>(EMPTY_FORM);
  const [busca, setBusca] = useState("");
  const [bancoPopoverOpen, setBancoPopoverOpen] = useState(false);
  const [bancoBusca, setBancoBusca] = useState("");
  const [tabAtiva, setTabAtiva] = useState("contas");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [buscaBancoLista, setBuscaBancoLista] = useState("");

  // ========== CRUD ==========
  function abrirNovo() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function abrirEdicao(conta: ContaBancaria) {
    setForm(conta);
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.bancocodigo || !form.agencia || !form.conta || !form.titular) {
      toast.error("Preencha banco, agência, conta e titular");
      return;
    }

    if (form.id) {
      const dbData = toDb(form);
      const { error } = await supabase.from("contas_bancarias").update(dbData).eq("id", form.id);
      if (error) { toast.error("Erro ao atualizar", { description: error.message }); return; }
      setContas(prev => prev.map(c => c.id === form.id ? { ...c, ...form, id: c.id } as ContaBancaria : c));
      toast.success("Conta atualizada");
    } else {
      const dbData = toDb(form);
      const { data, error } = await supabase.from("contas_bancarias").insert(dbData).select().single();
      if (error) { toast.error("Erro ao cadastrar", { description: error.message }); return; }
      setContas(prev => [...prev, fromDb(data)]);
      toast.success("Conta cadastrada");
    }
    setDialogOpen(false);
  }

  async function excluir(id: string) {
    const { error } = await supabase.from("contas_bancarias").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir", { description: error.message }); return; }
    setContas(prev => prev.filter(c => c.id !== id));
    toast.success("Conta removida");
  }

  async function definirPadrao(id: string) {
    // Set all to false, then the selected to true
    await supabase.from("contas_bancarias").update({ padrao: false }).neq("id", id);
    const { error } = await supabase.from("contas_bancarias").update({ padrao: true }).eq("id", id);
    if (error) { toast.error("Erro ao definir padrão", { description: error.message }); return; }
    setContas(prev => prev.map(c => ({ ...c, padrao: c.id === id })));
    toast.success("Conta definida como padrão");
  }

  // ========== Filtros ==========
  const contasFiltradas = useMemo(() => {
    if (!busca) return contas;
    const t = busca.toLowerCase();
    return contas.filter(c => {
      const banco = buscarBancoPorCodigo(c.bancocodigo);
      return (
        c.apelido.toLowerCase().includes(t) ||
        c.titular.toLowerCase().includes(t) ||
        c.agencia.includes(t) ||
        c.conta.includes(t) ||
        banco?.nome.toLowerCase().includes(t) ||
        banco?.nomeReduzido.toLowerCase().includes(t)
      );
    });
  }, [contas, busca]);

  const bancosAgrupados = useMemo(() => bancosPorTipo(), []);
  const bancosListaFiltrados = useMemo(() => {
    let lista = buscaBancoLista ? buscarBancos(buscaBancoLista) : BANCOS_BRASIL;
    if (tipoFiltro) lista = lista.filter(b => b.tipo === tipoFiltro);
    return lista;
  }, [buscaBancoLista, tipoFiltro]);

  const bancoSelecionado = form.bancocodigo ? buscarBancoPorCodigo(form.bancocodigo) : undefined;
  const bancosSearchResults = bancoBusca ? buscarBancos(bancoBusca) : BANCOS_BRASIL.slice(0, 30);

  // Stats
  const totalAtivas = contas.filter(c => c.ativa).length;
  const totalInativas = contas.filter(c => !c.ativa).length;
  const contaPadrao = contas.find(c => c.padrao);

  return (
    <div className="page-container">
      <PageHeader
        title="Contas Bancárias"
        description="Cadastro e gestão de contas bancárias da empresa"
        actions={
          <Button onClick={abrirNovo} className="gap-1">
            <Plus size={16} /> Nova Conta
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Landmark size={20} className="text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Contas</p>
              <p className="text-xl font-bold">{contas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Ativas</p>
              <p className="text-xl font-bold">{totalAtivas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><CreditCard size={20} className="text-muted-foreground" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Inativas</p>
              <p className="text-xl font-bold">{totalInativas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Building2 size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Conta Padrão</p>
              <p className="text-sm font-medium truncate">{contaPadrao ? buscarBancoPorCodigo(contaPadrao.bancocodigo)?.nomeReduzido || "-" : "Nenhuma"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="space-y-4">
        <TabsList>
          <TabsTrigger value="contas" className="gap-1"><CreditCard size={14} />Minhas Contas</TabsTrigger>
          <TabsTrigger value="bancos" className="gap-1"><Building2 size={14} />Lista de Bancos</TabsTrigger>
        </TabsList>

        {/* ===== TAB: CONTAS ===== */}
        <TabsContent value="contas">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Contas Cadastradas</CardTitle>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 w-[220px]" />
              </div>
            </CardHeader>
            <CardContent>
              {contasFiltradas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Landmark size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma conta cadastrada</p>
                  <p className="text-sm">Clique em "Nova Conta" para começar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Apelido</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Agência</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead>Pix</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasFiltradas.map(conta => {
                      const banco = buscarBancoPorCodigo(conta.bancocodigo);
                      return (
                        <TableRow key={conta.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <BancoLogo banco={banco} />
                              <div>
                                <p className="font-medium text-sm">{banco?.nomeReduzido || conta.bancocodigo}</p>
                                <p className="text-[10px] text-muted-foreground">{conta.bancocodigo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{conta.apelido || "-"}</TableCell>
                          <TableCell><Badge variant="outline">{TIPO_CONTA_LABELS[conta.tipo]}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{conta.agencia}{conta.digitoAgencia ? `-${conta.digitoAgencia}` : ""}</TableCell>
                          <TableCell className="font-mono text-xs">{conta.conta}{conta.digitoConta ? `-${conta.digitoConta}` : ""}</TableCell>
                          <TableCell>
                            <p className="text-sm">{conta.titular}</p>
                            <p className="text-[10px] text-muted-foreground">{conta.cpfCnpjTitular}</p>
                          </TableCell>
                          <TableCell className="text-xs">{conta.chavePix || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {conta.padrao && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Padrão</Badge>}
                              <Badge variant={conta.ativa ? "default" : "secondary"}>{conta.ativa ? "Ativa" : "Inativa"}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(conta)} title="Editar">
                                <Edit size={14} />
                              </Button>
                              {!conta.padrao && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => definirPadrao(conta.id)} title="Definir como padrão">
                                  <CheckCircle2 size={14} />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir(conta.id)} title="Excluir">
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB: LISTA DE BANCOS ===== */}
        <TabsContent value="bancos">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">Bancos do Brasil</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{BANCOS_BRASIL.length} bancos e instituições cadastradas</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input placeholder="Buscar banco..." value={buscaBancoLista} onChange={e => setBuscaBancoLista(e.target.value)} className="pl-8 w-[200px]" />
                </div>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v} ({bancosAgrupados[k]?.length || 0})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                Exibindo {bancosListaFiltrados.length} de {BANCOS_BRASIL.length} bancos
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {bancosListaFiltrados.map(banco => (
                  <div key={banco.codigo} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm"
                      style={{
                        backgroundColor: banco.cor || "hsl(var(--muted))",
                        color: banco.corTexto || "hsl(var(--muted-foreground))",
                      }}
                    >
                      {banco.nomeReduzido.substring(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{banco.nomeReduzido}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{banco.nome}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{banco.codigo}</Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">{TIPO_LABELS[banco.tipo]?.replace("Banco ", "")}</Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => { navigator.clipboard.writeText(banco.codigo); toast.success(`Código ${banco.codigo} copiado`); }}
                      title="Copiar código"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG: Cadastro/Edição ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Conta Bancária" : "Nova Conta Bancária"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Banco */}
            <div className="col-span-2">
              <Label>Banco *</Label>
              <Popover open={bancoPopoverOpen} onOpenChange={setBancoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                    {bancoSelecionado ? (
                      <div className="flex items-center gap-2">
                        <BancoLogo banco={bancoSelecionado} />
                        <span>{bancoSelecionado.codigo} — {bancoSelecionado.nome}</span>
                      </div>
                    ) : (
                      "Selecione o banco..."
                    )}
                    <ChevronDown size={14} className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar banco por nome ou código..." value={bancoBusca} onValueChange={setBancoBusca} />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty>Nenhum banco encontrado</CommandEmpty>
                      <CommandGroup>
                        {bancosSearchResults.map(banco => (
                          <CommandItem
                            key={banco.codigo}
                            value={`${banco.codigo} ${banco.nome} ${banco.nomeReduzido}`}
                            onSelect={() => {
                              setForm(p => ({ ...p, bancocodigo: banco.codigo }));
                              setBancoPopoverOpen(false);
                              setBancoBusca("");
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <div
                                className="w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                                style={{
                                  backgroundColor: banco.cor || "hsl(var(--muted))",
                                  color: banco.corTexto || "hsl(var(--muted-foreground))",
                                }}
                              >
                                {banco.nomeReduzido.substring(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{banco.codigo} — {banco.nomeReduzido}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{banco.nome}</p>
                              </div>
                              <Badge variant="outline" className="text-[9px] shrink-0">{TIPO_LABELS[banco.tipo]?.replace("Banco ", "")}</Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Tipo conta */}
            <div>
              <Label>Tipo de Conta</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as ContaBancaria["tipo"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_CONTA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apelido */}
            <div>
              <Label>Apelido</Label>
              <Input
                placeholder="Ex: Conta Principal, Recebimentos..."
                value={form.apelido}
                onChange={e => setForm(p => ({ ...p, apelido: e.target.value }))}
              />
            </div>

            {/* Agência */}
            <div>
              <Label>Agência *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0001"
                  value={form.agencia}
                  onChange={e => setForm(p => ({ ...p, agencia: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1"
                />
                <Input
                  placeholder="Díg"
                  value={form.digitoAgencia}
                  onChange={e => setForm(p => ({ ...p, digitoAgencia: e.target.value }))}
                  className="w-16"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Conta */}
            <div>
              <Label>Conta *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="12345"
                  value={form.conta}
                  onChange={e => setForm(p => ({ ...p, conta: e.target.value.replace(/\D/g, "") }))}
                  className="flex-1"
                />
                <Input
                  placeholder="Díg"
                  value={form.digitoConta}
                  onChange={e => setForm(p => ({ ...p, digitoConta: e.target.value }))}
                  className="w-16"
                  maxLength={2}
                />
              </div>
            </div>

            {/* Titular */}
            <div className="col-span-2">
              <Label>Titular da Conta *</Label>
              <Input value={form.titular} onChange={e => setForm(p => ({ ...p, titular: e.target.value }))} />
            </div>

            {/* CPF/CNPJ */}
            <div>
              <Label>CPF/CNPJ do Titular</Label>
              <Input value={form.cpfCnpjTitular} onChange={e => setForm(p => ({ ...p, cpfCnpjTitular: e.target.value }))} />
            </div>

            {/* Convênio */}
            <div>
              <Label>Convênio</Label>
              <Input
                placeholder="Número do convênio"
                value={form.convenio}
                onChange={e => setForm(p => ({ ...p, convenio: e.target.value }))}
              />
            </div>

            {/* Carteira */}
            <div>
              <Label>Carteira</Label>
              <Input value={form.carteira} onChange={e => setForm(p => ({ ...p, carteira: e.target.value }))} />
            </div>

            {/* Chave Pix */}
            <div>
              <Label>Tipo Chave Pix</Label>
              <Select value={form.tipoChavePix} onValueChange={v => setForm(p => ({ ...p, tipoChavePix: v as ContaBancaria["tipoChavePix"] }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Chave Pix</Label>
              <Input
                placeholder="Informe a chave Pix"
                value={form.chavePix}
                onChange={e => setForm(p => ({ ...p, chavePix: e.target.value }))}
              />
            </div>

            {/* Switches */}
            <div className="col-span-2 flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.ativa} onCheckedChange={v => setForm(p => ({ ...p, ativa: v }))} />
                <Label>Conta Ativa</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.padrao} onCheckedChange={v => setForm(p => ({ ...p, padrao: v }))} />
                <Label>Conta Padrão</Label>
              </div>
            </div>

            {/* Observações */}
            <div className="col-span-2">
              <Label>Observações</Label>
              <Input
                placeholder="Observações adicionais..."
                value={form.observacoes}
                onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>{form.id ? "Salvar Alterações" : "Cadastrar Conta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
