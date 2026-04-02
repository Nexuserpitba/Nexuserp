import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Plus, Edit, Trash2, Building2, CreditCard, FileText, Settings } from "lucide-react";
import { toast } from "sonner";

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
  layout: string;
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

const bancosDisponiveis = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "341", nome: "Itaú Unibanco" },
  { codigo: "356", nome: "Banco Real" },
  { codigo: "389", nome: "Banco Mercantil do Brasil" },
  { codigo: "399", nome: "HSBC" },
  { codigo: "422", nome: "Safra" },
  { codigo: "745", nome: "Citibank" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
];

const defaultContas: ContaBancaria[] = [];
const defaultModelos: ModeloBoleto[] = [];

export default function ConfigBoletos() {
  const { items: contas, addItem: addConta, updateItem: updateConta, deleteItem: deleteConta } = useLocalStorage<ContaBancaria>("config_contas_bancarias", defaultContas);
  const { items: modelos, addItem: addModelo, updateItem: updateModelo, deleteItem: deleteModelo } = useLocalStorage<ModeloBoleto>("config_modelos_boleto", defaultModelos);

  const [modalConta, setModalConta] = useState(false);
  const [modalModelo, setModalModelo] = useState(false);
  const [editandoConta, setEditandoConta] = useState<ContaBancaria | null>(null);
  const [editandoModelo, setEditandoModelo] = useState<ModeloBoleto | null>(null);

  // Conta form
  const [banco, setBanco] = useState("");
  const [agencia, setAgencia] = useState("");
  const [digitoAgencia, setDigitoAgencia] = useState("");
  const [conta, setConta] = useState("");
  const [digitoConta, setDigitoConta] = useState("");
  const [convenio, setConvenio] = useState("");
  const [carteira, setCarteira] = useState("");
  const [cedente, setCedente] = useState("");
  const [cnpjCedente, setCnpjCedente] = useState("");
  const [enderecoCedente, setEnderecoCedente] = useState("");
  const [cidadeCedente, setCidadeCedente] = useState("");
  const [ufCedente, setUfCedente] = useState("");

  // Modelo form
  const [nomeModelo, setNomeModelo] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [layout, setLayout] = useState("padrao");
  const [instrucao1, setInstrucao1] = useState("Não receber após o vencimento");
  const [instrucao2, setInstrucao2] = useState("Cobrar juros de mora de {juros}% ao dia");
  const [instrucao3, setInstrucao3] = useState("Cobrar multa de {multa}% após o vencimento");
  const [instrucao4, setInstrucao4] = useState("");
  const [instrucao5, setInstrucao5] = useState("");
  const [demonstrativo1, setDemonstrativo1] = useState("");
  const [demonstrativo2, setDemonstrativo2] = useState("");
  const [demonstrativo3, setDemonstrativo3] = useState("");
  const [localPagamento, setLocalPagamento] = useState("Pagável em qualquer banco até o vencimento");
  const [especieDocumento, setEspecieDocumento] = useState("DM");
  const [aceite, setAceite] = useState("N");
  const [jurosMora, setJurosMora] = useState(0.033);
  const [multa, setMulta] = useState(2);
  const [diasProtesto, setDiasProtesto] = useState(0);
  const [modeloPadrao, setModeloPadrao] = useState(false);

  function resetFormConta() {
    setBanco(""); setAgencia(""); setDigitoAgencia(""); setConta(""); setDigitoConta("");
    setConvenio(""); setCarteira(""); setCedente(""); setCnpjCedente("");
    setEnderecoCedente(""); setCidadeCedente(""); setUfCedente("");
    setEditandoConta(null);
  }

  function resetFormModelo() {
    setNomeModelo(""); setContaSelecionada(""); setLayout("padrao");
    setInstrucao1("Não receber após o vencimento");
    setInstrucao2("Cobrar juros de mora de {juros}% ao dia");
    setInstrucao3("Cobrar multa de {multa}% após o vencimento");
    setInstrucao4(""); setInstrucao5("");
    setDemonstrativo1(""); setDemonstrativo2(""); setDemonstrativo3("");
    setLocalPagamento("Pagável em qualquer banco até o vencimento");
    setEspecieDocumento("DM"); setAceite("N");
    setJurosMora(0.033); setMulta(2); setDiasProtesto(0); setModeloPadrao(false);
    setEditandoModelo(null);
  }

  function abrirEditarConta(c: ContaBancaria) {
    setEditandoConta(c);
    setBanco(c.codigoBanco); setAgencia(c.agencia); setDigitoAgencia(c.digitoAgencia);
    setConta(c.conta); setDigitoConta(c.digitoConta); setConvenio(c.convenio);
    setCarteira(c.carteira); setCedente(c.cedente); setCnpjCedente(c.cnpjCedente);
    setEnderecoCedente(c.enderecoCedente); setCidadeCedente(c.cidadeCedente); setUfCedente(c.ufCedente);
    setModalConta(true);
  }

  function abrirEditarModelo(m: ModeloBoleto) {
    setEditandoModelo(m);
    setNomeModelo(m.nome); setContaSelecionada(m.contaBancariaId); setLayout(m.layout);
    setInstrucao1(m.instrucao1); setInstrucao2(m.instrucao2); setInstrucao3(m.instrucao3);
    setInstrucao4(m.instrucao4); setInstrucao5(m.instrucao5);
    setDemonstrativo1(m.demonstrativo1); setDemonstrativo2(m.demonstrativo2); setDemonstrativo3(m.demonstrativo3);
    setLocalPagamento(m.localPagamento); setEspecieDocumento(m.especieDocumento); setAceite(m.aceite);
    setJurosMora(m.jurosMora); setMulta(m.multa); setDiasProtesto(m.diasProtesto); setModeloPadrao(m.padrao);
    setModalModelo(true);
  }

  function salvarConta() {
    if (!banco || !agencia || !conta || !cedente || !cnpjCedente) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    const bancoInfo = bancosDisponiveis.find(b => b.codigo === banco);
    const dados = {
      banco: bancoInfo?.nome || banco,
      codigoBanco: banco, agencia, digitoAgencia, conta, digitoConta,
      convenio, carteira, cedente, cnpjCedente, enderecoCedente, cidadeCedente, ufCedente, ativa: true,
    };
    if (editandoConta) {
      updateConta(editandoConta.id, dados);
      toast.success("Conta atualizada");
    } else {
      addConta(dados as Omit<ContaBancaria, "id">);
      toast.success("Conta cadastrada");
    }
    resetFormConta(); setModalConta(false);
  }

  function salvarModelo() {
    if (!nomeModelo || !contaSelecionada) {
      toast.error("Preencha nome e conta bancária"); return;
    }
    const dados = {
      nome: nomeModelo, contaBancariaId: contaSelecionada, layout,
      instrucao1, instrucao2, instrucao3, instrucao4, instrucao5,
      demonstrativo1, demonstrativo2, demonstrativo3,
      localPagamento, especieDocumento, aceite,
      jurosMora, multa, diasProtesto, padrao: modeloPadrao,
    };
    if (editandoModelo) {
      updateModelo(editandoModelo.id, dados);
      toast.success("Modelo atualizado");
    } else {
      addModelo(dados as Omit<ModeloBoleto, "id">);
      toast.success("Modelo cadastrado");
    }
    resetFormModelo(); setModalModelo(false);
  }

  return (
    <div className="page-container max-w-7xl mx-auto">
      <PageHeader title="Configuração de Boletos" description="Contas bancárias, modelos e parâmetros para emissão de boletos" />

      <Tabs defaultValue="contas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contas" className="gap-2"><Building2 size={14} /> Contas Bancárias</TabsTrigger>
          <TabsTrigger value="modelos" className="gap-2"><FileText size={14} /> Modelos de Boleto</TabsTrigger>
        </TabsList>

        {/* === CONTAS BANCÁRIAS === */}
        <TabsContent value="contas" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetFormConta(); setModalConta(true); }}><Plus size={16} /> Nova Conta</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Carteira</TableHead>
                    <TableHead>Cedente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conta bancária cadastrada</TableCell></TableRow>
                  )}
                  {contas.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.codigoBanco} - {c.banco}</TableCell>
                      <TableCell>{c.agencia}-{c.digitoAgencia}</TableCell>
                      <TableCell>{c.conta}-{c.digitoConta}</TableCell>
                      <TableCell>{c.convenio}</TableCell>
                      <TableCell>{c.carteira}</TableCell>
                      <TableCell>{c.cedente}</TableCell>
                      <TableCell><Badge variant={c.ativa ? "default" : "secondary"}>{c.ativa ? "Ativa" : "Inativa"}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditarConta(c)}><Edit size={14} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => { deleteConta(c.id); toast.success("Conta removida"); }}><Trash2 size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === MODELOS DE BOLETO === */}
        <TabsContent value="modelos" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetFormModelo(); setModalModelo(true); }}><Plus size={16} /> Novo Modelo</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Conta Bancária</TableHead>
                    <TableHead>Juros/Dia</TableHead>
                    <TableHead>Multa</TableHead>
                    <TableHead>Protesto</TableHead>
                    <TableHead>Padrão</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum modelo cadastrado</TableCell></TableRow>
                  )}
                  {modelos.map(m => {
                    const contaRef = contas.find(c => c.id === m.contaBancariaId);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.nome}</TableCell>
                        <TableCell>{contaRef ? `${contaRef.codigoBanco} - Ag ${contaRef.agencia}` : "-"}</TableCell>
                        <TableCell>{m.jurosMora}%</TableCell>
                        <TableCell>{m.multa}%</TableCell>
                        <TableCell>{m.diasProtesto > 0 ? `${m.diasProtesto} dias` : "Não"}</TableCell>
                        <TableCell>{m.padrao ? <Badge>Padrão</Badge> : "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => abrirEditarModelo(m)}><Edit size={14} /></Button>
                            <Button variant="ghost" size="icon" onClick={() => { deleteModelo(m.id); toast.success("Modelo removido"); }}><Trash2 size={14} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL CONTA BANCÁRIA */}
      <Dialog open={modalConta} onOpenChange={v => { if (!v) resetFormConta(); setModalConta(v); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editandoConta ? "Editar" : "Nova"} Conta Bancária</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco *</Label>
                <Select value={banco} onValueChange={setBanco}>
                  <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                  <SelectContent>
                    {bancosDisponiveis.map(b => <SelectItem key={b.codigo} value={b.codigo}>{b.codigo} - {b.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Carteira</Label>
                <Input value={carteira} onChange={e => setCarteira(e.target.value)} placeholder="Ex: 17, 09" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Agência *</Label>
                <Input value={agencia} onChange={e => setAgencia(e.target.value)} placeholder="0001" />
              </div>
              <div className="space-y-2">
                <Label>Dígito Ag.</Label>
                <Input value={digitoAgencia} onChange={e => setDigitoAgencia(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Conta *</Label>
                <Input value={conta} onChange={e => setConta(e.target.value)} placeholder="12345" />
              </div>
              <div className="space-y-2">
                <Label>Dígito Conta</Label>
                <Input value={digitoConta} onChange={e => setDigitoConta(e.target.value)} placeholder="6" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Convênio / Código do Cedente</Label>
              <Input value={convenio} onChange={e => setConvenio(e.target.value)} placeholder="Número do convênio" />
            </div>
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Dados do Cedente (Beneficiário)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social / Nome *</Label>
                  <Input value={cedente} onChange={e => setCedente(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ/CPF *</Label>
                  <Input value={cnpjCedente} onChange={e => setCnpjCedente(e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={enderecoCedente} onChange={e => setEnderecoCedente(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={cidadeCedente} onChange={e => setCidadeCedente(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={ufCedente} onChange={e => setUfCedente(e.target.value)} maxLength={2} placeholder="SP" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetFormConta(); setModalConta(false); }}>Cancelar</Button>
            <Button onClick={salvarConta}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL MODELO BOLETO */}
      <Dialog open={modalModelo} onOpenChange={v => { if (!v) resetFormModelo(); setModalModelo(v); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editandoModelo ? "Editar" : "Novo"} Modelo de Boleto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Modelo *</Label>
                <Input value={nomeModelo} onChange={e => setNomeModelo(e.target.value)} placeholder="Ex: Boleto Padrão" />
              </div>
              <div className="space-y-2">
                <Label>Conta Bancária *</Label>
                <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.codigoBanco} - {c.banco} | Ag {c.agencia}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Espécie Documento</Label>
                <Select value={especieDocumento} onValueChange={setEspecieDocumento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DM">DM - Duplicata Mercantil</SelectItem>
                    <SelectItem value="DS">DS - Duplicata de Serviço</SelectItem>
                    <SelectItem value="NP">NP - Nota Promissória</SelectItem>
                    <SelectItem value="RC">RC - Recibo</SelectItem>
                    <SelectItem value="ME">ME - Mensalidade Escolar</SelectItem>
                    <SelectItem value="OU">OU - Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Aceite</Label>
                <Select value={aceite} onValueChange={setAceite}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">Sim</SelectItem>
                    <SelectItem value="N">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo Padrão</Label>
                <Select value={modeloPadrao ? "sim" : "nao"} onValueChange={v => setModeloPadrao(v === "sim")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CreditCard size={14} /> Encargos</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Juros de Mora (% ao dia)</Label>
                  <Input type="number" step="0.001" value={jurosMora} onChange={e => setJurosMora(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Multa (%)</Label>
                  <Input type="number" step="0.1" value={multa} onChange={e => setMulta(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Dias para Protesto</Label>
                  <Input type="number" value={diasProtesto} onChange={e => setDiasProtesto(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Local de Pagamento</h3>
              <Input value={localPagamento} onChange={e => setLocalPagamento(e.target.value)} />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Instruções ao Caixa (até 5 linhas)</h3>
              <Input value={instrucao1} onChange={e => setInstrucao1(e.target.value)} placeholder="Instrução 1" />
              <Input value={instrucao2} onChange={e => setInstrucao2(e.target.value)} placeholder="Instrução 2" />
              <Input value={instrucao3} onChange={e => setInstrucao3(e.target.value)} placeholder="Instrução 3" />
              <Input value={instrucao4} onChange={e => setInstrucao4(e.target.value)} placeholder="Instrução 4" />
              <Input value={instrucao5} onChange={e => setInstrucao5(e.target.value)} placeholder="Instrução 5" />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Demonstrativo (até 3 linhas)</h3>
              <Input value={demonstrativo1} onChange={e => setDemonstrativo1(e.target.value)} placeholder="Demonstrativo 1" />
              <Input value={demonstrativo2} onChange={e => setDemonstrativo2(e.target.value)} placeholder="Demonstrativo 2" />
              <Input value={demonstrativo3} onChange={e => setDemonstrativo3(e.target.value)} placeholder="Demonstrativo 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetFormModelo(); setModalModelo(false); }}>Cancelar</Button>
            <Button onClick={salvarModelo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
