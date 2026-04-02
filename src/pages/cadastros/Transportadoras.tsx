import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { transportadorasMapper } from "@/lib/supabaseMappers";
import { maskCpfCnpj, maskTelefone, maskCep } from "@/lib/maskUtils";
import { validarCpfCnpj } from "@/lib/validationUtils";
import { CpfCnpjInput } from "@/components/ui/cpf-cnpj-input";
import { Plus, Pencil, Trash2, Search, Truck, MapPin, FileText, Car } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Veiculo {
  placa: string;
  uf: string;
  rntrc: string;
  tipoVeiculo: string;
  tipoCarroceria: string;
  capacidadeKg: number;
  capacidadeM3: number;
  tpiRod: string;
}

interface Transportadora {
  id: string;
  // Dados gerais
  tipoPessoa: string;
  cpfCnpj: string;
  inscEstadual: string;
  razaoSocial: string;
  nomeFantasia: string;
  rntrc: string;
  tipoTransportador: string;
  situacao: string;
  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  uf: string;
  pais: string;
  codigoPais: string;
  // Contato
  telefone: string;
  email: string;
  responsavel: string;
  // CT-e
  modalFrete: string;
  taf: string;
  regTrib: string;
  // Veículos
  veiculos: Veiculo[];
  // Obs
  observacoes: string;
}

const ufs = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

const tiposVeiculo = [
  { value: "0", label: "0 - Tração" },
  { value: "1", label: "1 - Reboque" },
];

const tiposCarroceria = [
  { value: "00", label: "00 - Não aplicável" },
  { value: "01", label: "01 - Aberta" },
  { value: "02", label: "02 - Fechada/Baú" },
  { value: "03", label: "03 - Granelera" },
  { value: "04", label: "04 - Porta Container" },
  { value: "05", label: "05 - Sider" },
];

const tiposRodado = [
  { value: "01", label: "01 - Truck" },
  { value: "02", label: "02 - Toco" },
  { value: "03", label: "03 - Cavalo Mecânico" },
  { value: "04", label: "04 - Van" },
  { value: "05", label: "05 - Utilitário" },
  { value: "06", label: "06 - Outros" },
];

const modalidadesFrete = [
  { value: "0", label: "0 - Rodoviário" },
  { value: "1", label: "1 - Aéreo" },
  { value: "2", label: "2 - Aquaviário" },
  { value: "3", label: "3 - Ferroviário" },
  { value: "4", label: "4 - Dutoviário" },
  { value: "5", label: "5 - Multimodal" },
];

const regimesTributarios = [
  { value: "1", label: "1 - Simples Nacional" },
  { value: "2", label: "2 - SN Excesso Sublimite" },
  { value: "3", label: "3 - Regime Normal" },
];

const tiposTransportador = [
  { value: "0", label: "ETC - Empresa Transp. de Carga" },
  { value: "1", label: "TAC - Transp. Autônomo de Carga" },
  { value: "2", label: "CTC - Coop. Transp. de Carga" },
];

const defaultTransportadoras: Transportadora[] = [
  {
    id: "1", tipoPessoa: "J", cpfCnpj: "12.345.678/0001-90", inscEstadual: "123456789",
    razaoSocial: "Transportadora Rápida Ltda", nomeFantasia: "Trans Rápida", rntrc: "12345678",
    tipoTransportador: "0", situacao: "Ativo",
    cep: "01001-000", logradouro: "Rua das Flores", numero: "100", complemento: "Galpão A",
    bairro: "Centro", codigoMunicipio: "3550308", municipio: "São Paulo", uf: "SP",
    pais: "Brasil", codigoPais: "1058",
    telefone: "(11) 3333-4444", email: "contato@transrapida.com.br", responsavel: "João Silva",
    modalFrete: "0", taf: "", regTrib: "3",
    veiculos: [
      { placa: "ABC1D23", uf: "SP", rntrc: "12345678", tipoVeiculo: "0", tipoCarroceria: "02", capacidadeKg: 12000, capacidadeM3: 45, tpiRod: "01" }
    ],
    observacoes: ""
  },
];

const emptyVeiculo: Veiculo = {
  placa: "", uf: "SP", rntrc: "", tipoVeiculo: "0", tipoCarroceria: "00", capacidadeKg: 0, capacidadeM3: 0, tpiRod: "01"
};

const emptyForm = (): Omit<Transportadora, "id"> => ({
  tipoPessoa: "J", cpfCnpj: "", inscEstadual: "", razaoSocial: "", nomeFantasia: "", rntrc: "",
  tipoTransportador: "0", situacao: "Ativo",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  codigoMunicipio: "", municipio: "", uf: "SP", pais: "Brasil", codigoPais: "1058",
  telefone: "", email: "", responsavel: "",
  modalFrete: "0", taf: "", regTrib: "3",
  veiculos: [],
  observacoes: ""
});

export default function Transportadoras() {
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Transportadora>({
    table: "transportadoras",
    mapper: transportadorasMapper,
    defaultData: defaultTransportadoras,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Transportadora, "id">>(emptyForm());
  const [search, setSearch] = useState("");
  const lastCnpjBuscado = useRef("");
  const lastCepBuscado = useRef("");

  // Auto-busca CNPJ quando completo e válido
  useEffect(() => {
    const digits = form.cpfCnpj.replace(/\D/g, "");
    if (digits.length === 14 && digits !== lastCnpjBuscado.current && !editingId) {
      const { valid } = validarCpfCnpj(form.cpfCnpj);
      if (valid) {
        lastCnpjBuscado.current = digits;
        buscarCnpj();
      }
    }
  }, [form.cpfCnpj]);


  // Auto-busca CEP quando completo
  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length === 8 && digits !== lastCepBuscado.current) {
      lastCepBuscado.current = digits;
      buscarCep();
    }
  }, [form.cep]);

  const filtered = items.filter(t =>
    t.razaoSocial.toLowerCase().includes(search.toLowerCase()) ||
    t.cpfCnpj.includes(search) ||
    t.nomeFantasia.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { lastCnpjBuscado.current = ""; lastCepBuscado.current = ""; setForm(emptyForm()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (t: Transportadora) => {
    const { id, ...rest } = t;
    setForm(rest);
    setEditingId(id);
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.razaoSocial || !form.cpfCnpj) {
      toast({ title: "Erro", description: "Razão Social e CPF/CNPJ são obrigatórios", variant: "destructive" });
      return;
    }
    const cpfCnpjResult = validarCpfCnpj(form.cpfCnpj);
    if (!cpfCnpjResult.valid) {
      toast({ title: "Erro", description: cpfCnpjResult.message, variant: "destructive" });
      return;
    }
    if (!form.rntrc) {
      toast({ title: "Atenção", description: "RNTRC é obrigatório para emissão de CT-e", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateItem(editingId, form);
      toast({ title: "Transportadora atualizada" });
    } else {
      addItem(form);
      toast({ title: "Transportadora cadastrada" });
    }
    setDialogOpen(false);
  };

  const remove = (id: string) => { deleteItem(id); toast({ title: "Transportadora removida" }); };

  // Veículos helpers
  const addVeiculo = () => setForm(prev => ({ ...prev, veiculos: [...prev.veiculos, { ...emptyVeiculo }] }));
  const removeVeiculo = (i: number) => setForm(prev => ({ ...prev, veiculos: prev.veiculos.filter((_, idx) => idx !== i) }));
  const updateVeiculo = (i: number, field: keyof Veiculo, value: string | number) => {
    setForm(prev => ({
      ...prev,
      veiculos: prev.veiculos.map((v, idx) => idx === i ? { ...v, [field]: value } : v)
    }));
  };

  // CNPJ lookup
  const buscarCnpj = async () => {
    const cnpjLimpo = form.cpfCnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      toast({ title: "Erro", description: "Digite um CNPJ válido com 14 dígitos", variant: "destructive" });
      return;
    }
    try {
      toast({ title: "Buscando CNPJ..." });
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (res.ok) {
        const d = await res.json();
        setForm(prev => ({
          ...prev,
          razaoSocial: d.razao_social || prev.razaoSocial,
          nomeFantasia: d.nome_fantasia || prev.nomeFantasia,
          cep: d.cep || prev.cep,
          logradouro: d.logradouro || prev.logradouro,
          numero: d.numero || prev.numero,
          complemento: d.complemento || prev.complemento,
          bairro: d.bairro || prev.bairro,
          municipio: d.municipio || prev.municipio,
          uf: d.uf || prev.uf,
          telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0,2)}) ${d.ddd_telefone_1.slice(2)}` : prev.telefone,
          email: d.email || prev.email,
        }));
        toast({ title: "CNPJ encontrado", description: d.razao_social });
      } else {
        toast({ title: "Erro", description: "CNPJ não encontrado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao consultar CNPJ", variant: "destructive" });
    }
  };

  // CEP lookup
  const buscarCep = async () => {
    if (form.cep.replace(/\D/g, "").length !== 8) return;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${form.cep.replace(/\D/g, "")}`);
      if (res.ok) {
        const data = await res.json();
        setForm(prev => ({
          ...prev,
          logradouro: data.street || prev.logradouro,
          bairro: data.neighborhood || prev.bairro,
          municipio: data.city || prev.municipio,
          uf: data.state || prev.uf,
          codigoMunicipio: data.city_ibge || prev.codigoMunicipio,
        }));
        toast({ title: "CEP encontrado" });
      }
    } catch { /* silently fail */ }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Transportadoras"
        description="Cadastro de transportadores conforme exigências SEFAZ para emissão de CT-e"
        actions={<Button onClick={openNew}><Plus size={16} /> Nova Transportadora</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-muted-foreground" />
            <Input placeholder="Buscar por razão social, nome fantasia ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>RNTRC</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Veículos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma transportadora encontrada</TableCell></TableRow>
              ) : filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-sm">{t.cpfCnpj}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-muted-foreground" />
                      {t.razaoSocial}
                    </div>
                    {t.nomeFantasia && <span className="text-xs text-muted-foreground">{t.nomeFantasia}</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{t.rntrc || "—"}</TableCell>
                  <TableCell>{t.uf}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="border-0 text-xs">
                      {tiposTransportador.find(tp => tp.value === t.tipoTransportador)?.label.split(" - ")[0] || t.tipoTransportador}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{t.veiculos.length} veículo(s)</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.situacao === "Ativo" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t.situacao}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 size={14} /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Transportadora" : "Nova Transportadora"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-2">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="fiscal">Fiscal/CT-e</TabsTrigger>
              <TabsTrigger value="veiculos">Veículos</TabsTrigger>
              <TabsTrigger value="obs">Observações</TabsTrigger>
            </TabsList>

            {/* DADOS GERAIS */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo Pessoa *</Label>
                  <Select value={form.tipoPessoa} onValueChange={v => setForm({ ...form, tipoPessoa: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="J">Jurídica (CNPJ)</SelectItem>
                      <SelectItem value="F">Física (CPF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>{form.tipoPessoa === "J" ? "CNPJ" : "CPF"} *</Label>
                    <CpfCnpjInput value={form.cpfCnpj} onChange={v => setForm({ ...form, cpfCnpj: v })} />
                  </div>
                  {form.tipoPessoa === "J" && (
                    <Button type="button" variant="outline" size="sm" onClick={buscarCnpj}>
                      <Search size={14} className="mr-1" /> Buscar
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Razão Social *</Label><Input value={form.razaoSocial} onChange={e => setForm({ ...form, razaoSocial: e.target.value })} /></div>
                <div><Label>Nome Fantasia</Label><Input value={form.nomeFantasia} onChange={e => setForm({ ...form, nomeFantasia: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Inscrição Estadual</Label><Input value={form.inscEstadual} onChange={e => setForm({ ...form, inscEstadual: e.target.value })} /></div>
                <div>
                  <Label>RNTRC (ANTT) *</Label>
                  <Input value={form.rntrc} onChange={e => setForm({ ...form, rntrc: e.target.value })} placeholder="Registro Nacional" />
                </div>
                <div>
                  <Label>Tipo Transportador</Label>
                  <Select value={form.tipoTransportador} onValueChange={v => setForm({ ...form, tipoTransportador: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposTransportador.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })} placeholder="(00) 0000-0000" noUpperCase /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
              </div>
              <div>
                <Label>Situação</Label>
                <Select value={form.situacao} onValueChange={v => setForm({ ...form, situacao: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* ENDEREÇO */}
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>CEP</Label>
                    <Input value={form.cep} onChange={e => setForm({ ...form, cep: maskCep(e.target.value) })} placeholder="00000-000" noUpperCase />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={buscarCep}>
                    <MapPin size={14} className="mr-1" /> Buscar
                  </Button>
                </div>
                <div>
                  <Label>UF</Label>
                  <Select value={form.uf} onValueChange={v => setForm({ ...form, uf: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ufs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Cód. Município (IBGE)</Label><Input value={form.codigoMunicipio} onChange={e => setForm({ ...form, codigoMunicipio: e.target.value })} placeholder="0000000" /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2"><Label>Logradouro</Label><Input value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} /></div>
                <div><Label>Número</Label><Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} /></div>
                <div><Label>Complemento</Label><Input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} /></div>
                <div><Label>Município</Label><Input value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>País</Label><Input value={form.pais} onChange={e => setForm({ ...form, pais: e.target.value })} /></div>
                  <div><Label>Cód. País</Label><Input value={form.codigoPais} onChange={e => setForm({ ...form, codigoPais: e.target.value })} placeholder="1058" /></div>
                </div>
              </div>
            </TabsContent>

            {/* FISCAL / CT-e */}
            <TabsContent value="fiscal" className="space-y-4 mt-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className="text-primary" />
                  <span className="font-medium text-sm">Campos obrigatórios para CT-e (SEFAZ)</span>
                </div>
                <p className="text-xs text-muted-foreground">RNTRC, Regime Tributário e Modal de Frete são exigidos para emissão do Conhecimento de Transporte Eletrônico.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modal de Frete *</Label>
                  <Select value={form.modalFrete} onValueChange={v => setForm({ ...form, modalFrete: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {modalidadesFrete.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Regime Tributário *</Label>
                  <Select value={form.regTrib} onValueChange={v => setForm({ ...form, regTrib: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {regimesTributarios.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>TAF (Termo Aut. Fretamento)</Label><Input value={form.taf} onChange={e => setForm({ ...form, taf: e.target.value })} placeholder="Opcional para fretamento" /></div>
                <div><Label>RNTRC (ANTT) *</Label><Input value={form.rntrc} onChange={e => setForm({ ...form, rntrc: e.target.value })} className="font-mono" /></div>
              </div>
            </TabsContent>

            {/* VEÍCULOS */}
            <TabsContent value="veiculos" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-primary" />
                  <span className="font-medium text-sm">Frota cadastrada ({form.veiculos.length})</span>
                </div>
                <Button size="sm" variant="outline" onClick={addVeiculo}><Plus size={14} className="mr-1" /> Adicionar Veículo</Button>
              </div>

              {form.veiculos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum veículo cadastrado. Adicione ao menos um para CT-e.
                </div>
              ) : form.veiculos.map((v, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Veículo {i + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeVeiculo(i)}><Trash2 size={14} /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div><Label className="text-xs">Placa *</Label><Input value={v.placa} onChange={e => updateVeiculo(i, "placa", e.target.value)} placeholder="ABC1D23" className="font-mono" /></div>
                      <div>
                        <Label className="text-xs">UF Placa</Label>
                        <Select value={v.uf} onValueChange={val => updateVeiculo(i, "uf", val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ufs.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">RNTRC Veículo</Label><Input value={v.rntrc} onChange={e => updateVeiculo(i, "rntrc", e.target.value)} /></div>
                      <div>
                        <Label className="text-xs">Tipo Rodado</Label>
                        <Select value={v.tpiRod} onValueChange={val => updateVeiculo(i, "tpiRod", val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{tiposRodado.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Tipo Veículo</Label>
                        <Select value={v.tipoVeiculo} onValueChange={val => updateVeiculo(i, "tipoVeiculo", val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{tiposVeiculo.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tipo Carroceria</Label>
                        <Select value={v.tipoCarroceria} onValueChange={val => updateVeiculo(i, "tipoCarroceria", val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{tiposCarroceria.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Capacidade (Kg)</Label><Input type="number" value={v.capacidadeKg} onChange={e => updateVeiculo(i, "capacidadeKg", Number(e.target.value))} /></div>
                      <div><Label className="text-xs">Capacidade (m³)</Label><Input type="number" value={v.capacidadeM3} onChange={e => updateVeiculo(i, "capacidadeM3", Number(e.target.value))} /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* OBSERVAÇÕES */}
            <TabsContent value="obs" className="space-y-4 mt-4">
              <div>
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={5} placeholder="Observações gerais sobre a transportadora..." />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
