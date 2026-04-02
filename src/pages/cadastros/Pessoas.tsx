import { CurrencyInput } from "@/components/ui/currency-input";
import { ExportButtons } from "@/components/ExportButtons";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, UserPlus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { pessoasMapper } from "@/lib/supabaseMappers";
import { maskCpfCnpj, maskTelefone, maskCep } from "@/lib/maskUtils";
import { validarCpfCnpj } from "@/lib/validationUtils";
import { CpfCnpjInput } from "@/components/ui/cpf-cnpj-input";

interface GrupoDesconto {
  id: string;
  nome: string;
  ativo: boolean;
}

interface PrecoEspecial {
  id: string;
  descricao: string;
  ativo: boolean;
}

function loadGruposDesconto(): GrupoDesconto[] {
  try {
    const stored = localStorage.getItem("grupos_desconto");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function loadPrecosEspeciais(): PrecoEspecial[] {
  try {
    const stored = localStorage.getItem("precos_especiais");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}
import { toast } from "sonner";

interface Referencia {
  nome: string;
  telefone: string;
  relacao: string;
}

interface DadosBancarios {
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  pix: string;
}

interface Pessoa {
  id: string;
  nome: string;
  cpfCnpj: string;
  tipo: string;
  status: string;
  // Dados pessoais
  rg: string;
  dataNascimento: string;
  email: string;
  sexo: string;
  estadoCivil: string;
  profissao: string;
  // Endereço
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  // Contato
  telefone: string;
  celular: string;
  // Financeiro
  limiteCredito: number;
  limiteCheque: number;
  limiteConvenio: number;
  limitePrazo: number;
  debitos: number;
  // Comercial
  grupoDesconto: string;
  precosEspeciais: string;
  // Referências e bancários
  referencias: Referencia[];
  dadosBancarios: DadosBancarios;
  // Razão social (PJ)
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  observacao: string;
}

const defaultPessoas: Pessoa[] = [
  {
    id: "1", nome: "João Silva", cpfCnpj: "123.456.789-00", tipo: "Cliente", status: "Ativo",
    rg: "12.345.678-9", dataNascimento: "1990-05-15", email: "joao@email.com", sexo: "M", estadoCivil: "Solteiro", profissao: "Desenvolvedor",
    cep: "01001-000", logradouro: "Praça da Sé", numero: "100", complemento: "", bairro: "Sé", cidade: "São Paulo", uf: "SP",
    telefone: "(11) 3333-0000", celular: "(11) 99999-0000",
    limiteCredito: 5000, limiteCheque: 2000, limiteConvenio: 1000, limitePrazo: 3000, debitos: 150,
    grupoDesconto: "VIP", precosEspeciais: "",
    referencias: [{ nome: "Carlos", telefone: "(11) 98888-0000", relacao: "Amigo" }],
    dadosBancarios: { banco: "Banco do Brasil", agencia: "1234", conta: "56789-0", tipoConta: "Corrente", pix: "joao@email.com" },
    razaoSocial: "", nomeFantasia: "", inscricaoEstadual: "", observacao: "",
  },
  {
    id: "2", nome: "Maria Distribuidora Ltda", cpfCnpj: "12.345.678/0001-90", tipo: "Fornecedor", status: "Ativo",
    rg: "", dataNascimento: "", email: "contato@maria.com", sexo: "", estadoCivil: "", profissao: "",
    cep: "80000-000", logradouro: "Rua XV de Novembro", numero: "500", complemento: "Sala 10", bairro: "Centro", cidade: "Curitiba", uf: "PR",
    telefone: "(41) 3333-0000", celular: "(41) 98888-0000",
    limiteCredito: 20000, limiteCheque: 10000, limiteConvenio: 5000, limitePrazo: 15000, debitos: 0,
    grupoDesconto: "Atacado", precosEspeciais: "Tabela B",
    referencias: [], dadosBancarios: { banco: "", agencia: "", conta: "", tipoConta: "Corrente", pix: "" },
    razaoSocial: "Maria Distribuidora Ltda", nomeFantasia: "Maria Dist.", inscricaoEstadual: "123456789", observacao: "",
  },
];

const emptyReferencia: Referencia = { nome: "", telefone: "", relacao: "" };
const emptyBancarios: DadosBancarios = { banco: "", agencia: "", conta: "", tipoConta: "Corrente", pix: "" };

const emptyForm: Omit<Pessoa, "id"> = {
  nome: "", cpfCnpj: "", tipo: "Cliente", status: "Ativo",
  rg: "", dataNascimento: "", email: "", sexo: "", estadoCivil: "", profissao: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  telefone: "", celular: "",
  limiteCredito: 0, limiteCheque: 0, limiteConvenio: 0, limitePrazo: 0, debitos: 0,
  grupoDesconto: "", precosEspeciais: "",
  referencias: [{ ...emptyReferencia }],
  dadosBancarios: { ...emptyBancarios },
  razaoSocial: "", nomeFantasia: "", inscricaoEstadual: "", observacao: "",
};

const statusBadge: Record<string, string> = {
  Ativo: "bg-green-500/10 text-green-600",
  Inativo: "bg-muted text-muted-foreground",
  Incompleto: "bg-yellow-500/10 text-yellow-600",
};

const tipoBadgeColor: Record<string, string> = {
  Cliente: "bg-primary/10 text-primary",
  Fornecedor: "bg-orange-500/10 text-orange-600",
  Transportadora: "bg-accent/10 text-accent-foreground",
};

export default function Pessoas() {
  const [search, setSearch] = useState("");
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Pessoa>({
    table: "pessoas",
    mapper: pessoasMapper,
    defaultData: defaultPessoas,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Pessoa, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const lastCepBuscado = useRef("");
  const lastCnpjBuscado = useRef("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [gruposDesconto, setGruposDesconto] = useState<GrupoDesconto[]>([]);
  const [precosEspeciais, setPrecosEspeciais] = useState<PrecoEspecial[]>([]);
  const navigate = useNavigate();

  const converterEmLead = (p: Pessoa) => {
    const leads = JSON.parse(localStorage.getItem("gp_erp_crm_leads") || "[]");
    const jaExiste = leads.some((l: any) => l.pessoaId === p.id);
    if (jaExiste) { toast.info("Esta pessoa já possui um lead vinculado no CRM."); return; }
    const hoje = new Date().toISOString().split('T')[0];
    const novoLead = {
      id: crypto.randomUUID(),
      nome: p.nome, email: p.email, telefone: p.celular || p.telefone,
      empresa: p.nomeFantasia || p.razaoSocial || p.nome,
      origem: 'indicacao' as const, etapa: 'prospeccao' as const,
      valor: 0, responsavel: '', pessoaId: p.id,
      observacoes: `Convertido do cadastro de pessoas. CPF/CNPJ: ${p.cpfCnpj}`,
      dataCriacao: hoje, dataAtualizacao: hoje, probabilidade: 20, prioridade: 'media' as const,
    };
    leads.push(novoLead);
    localStorage.setItem("gp_erp_crm_leads", JSON.stringify(leads));
    toast.success("Pessoa convertida em lead com sucesso!");
    navigate("/crm/leads");
  };

  useEffect(() => {
    setGruposDesconto(loadGruposDesconto());
    setPrecosEspeciais(loadPrecosEspeciais());
  }, [dialogOpen]);

  // Auto-busca CNPJ quando completo e válido
  useEffect(() => {
    const digits = form.cpfCnpj.replace(/\D/g, "");
    if (digits.length === 14 && digits !== lastCnpjBuscado.current && !editingId) {
      const { valid } = validarCpfCnpj(form.cpfCnpj);
      if (valid) buscarCnpj(form.cpfCnpj);
    }
  }, [form.cpfCnpj]);

  const filtered = items.filter(p => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || p.cpfCnpj.includes(search);
    const matchStatus = filterStatus === "Todos" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Auto-busca CEP quando completo
  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length === 8 && digits !== lastCepBuscado.current) {
      lastCepBuscado.current = digits;
      buscarCep();
    }
  }, [form.cep]);

  const openNew = () => { lastCnpjBuscado.current = ""; lastCepBuscado.current = ""; setForm({ ...emptyForm, referencias: [{ ...emptyReferencia }], dadosBancarios: { ...emptyBancarios } }); setEditingId(null); setDialogOpen(true); };
  const openEdit = (p: Pessoa) => {
    const { id, ...rest } = p;
    setForm({ ...rest, referencias: rest.referencias?.length ? rest.referencias : [{ ...emptyReferencia }], dadosBancarios: rest.dadosBancarios || { ...emptyBancarios } });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nome || !form.cpfCnpj) { toast.error("Preencha Nome e CPF/CNPJ"); return; }
    const cpfCnpjResult = validarCpfCnpj(form.cpfCnpj);
    if (!cpfCnpjResult.valid) { toast.error(cpfCnpjResult.message); return; }
    if (editingId) {
      updateItem(editingId, form);
      toast.success("Pessoa atualizada!");
    } else {
      addItem(form as Omit<Pessoa, "id">);
      toast.success("Pessoa cadastrada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { deleteItem(id); setDeleteConfirm(null); toast.success("Pessoa excluída!"); };

  const buscarCnpj = async (cnpjOverride?: string) => {
    const cnpjClean = (cnpjOverride || form.cpfCnpj).replace(/\D/g, "");
    if (cnpjClean.length !== 14) { if (!cnpjOverride) toast.error("CNPJ inválido"); return; }
    if (cnpjClean === lastCnpjBuscado.current) return;
    lastCnpjBuscado.current = cnpjClean;
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        nome: data.nome_fantasia || data.razao_social || prev.nome,
        razaoSocial: data.razao_social || "",
        nomeFantasia: data.nome_fantasia || "",
        logradouro: data.logradouro || "",
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.municipio || "",
        uf: data.uf || "",
        cep: data.cep || "",
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : prev.telefone,
        email: data.email || prev.email,
      }));
      toast.success("Dados do CNPJ carregados!");
    } catch {
      toast.error("CNPJ não encontrado");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const buscarCep = async () => {
    const cepClean = form.cep.replace(/\D/g, "");
    if (cepClean.length !== 8) { toast.error("CEP inválido"); return; }
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cepClean}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(prev => ({
        ...prev,
        logradouro: data.street || "",
        bairro: data.neighborhood || "",
        cidade: data.city || "",
        uf: data.state || "",
      }));
      toast.success("Endereço encontrado!");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setBuscandoCep(false);
    }
  };

  const updateRef = (idx: number, field: keyof Referencia, value: string) => {
    const refs = [...form.referencias];
    refs[idx] = { ...refs[idx], [field]: value };
    setForm({ ...form, referencias: refs });
  };

  const addRef = () => setForm({ ...form, referencias: [...form.referencias, { ...emptyReferencia }] });
  const removeRef = (idx: number) => setForm({ ...form, referencias: form.referencias.filter((_, i) => i !== idx) });

  const isPJ = form.cpfCnpj.replace(/\D/g, "").length > 11;

  return (
    <div className="page-container">
      <PageHeader
        title="Pessoas"
        description="Clientes, fornecedores, transportadoras e outros cadastros"
        actions={
          <div className="flex gap-2 flex-wrap">
            <ExportButtons options={{
              title: "Cadastro de Pessoas",
              filename: `Pessoas_${new Date().toISOString().split("T")[0]}`,
              columns: [
                { header: "Nome", key: "nome" },
                { header: "CPF/CNPJ", key: "cpfCnpj" },
                { header: "Tipo", key: "tipo" },
                { header: "Status", key: "status" },
                { header: "Cidade/UF", key: "_cidade", format: (_: any, row: any) => `${row.cidade || ""}/${row.uf || ""}` },
                { header: "Celular", key: "celular" },
                { header: "Débitos", key: "debitos", align: "right", format: (v: number) => `R$ ${(v || 0).toFixed(2)}` },
              ],
              data: filtered,
            }} />
            <Button onClick={openNew} size="sm"><Plus size={16} className="mr-2" /> Nova Pessoa</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Incompleto">Incompleto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Celular</TableHead>
                <TableHead>Débitos</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="font-mono text-sm">{p.cpfCnpj}</TableCell>
                  <TableCell><Badge variant="secondary" className={`border-0 ${tipoBadgeColor[p.tipo] || ""}`}>{p.tipo}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className={`border-0 ${statusBadge[p.status] || ""}`}>{p.status}</Badge></TableCell>
                  <TableCell>{p.cidade}/{p.uf}</TableCell>
                  <TableCell>{p.celular || p.telefone}</TableCell>
                  <TableCell className={p.debitos > 0 ? "text-destructive font-semibold" : ""}>
                    {p.debitos > 0 ? `R$ ${p.debitos.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(p)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => converterEmLead(p)}><UserPlus size={14} className="mr-2" />Converter em Lead</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(p.id)}><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma pessoa encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog principal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle></DialogHeader>

          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              <TabsTrigger value="bancario">Bancário</TabsTrigger>
              <TabsTrigger value="referencias">Referências</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
            </TabsList>

            {/* ABA GERAL */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2">
                  <Label>CPF/CNPJ *</Label>
                  <div className="flex gap-2">
                    <CpfCnpjInput value={form.cpfCnpj} onChange={v => setForm({ ...form, cpfCnpj: v })} className="flex-1" />
                    {form.cpfCnpj.replace(/\D/g, "").length === 14 && (
                      <Button variant="outline" size="sm" onClick={() => buscarCnpj()} disabled={buscandoCnpj} className="shrink-0">
                        {buscandoCnpj ? <Loader2 size={14} className="animate-spin" /> : "Buscar CNPJ"}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="Transportadora">Transportadora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label>Nome / Nome Fantasia *</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                {isPJ && <div><Label>Razão Social</Label><Input value={form.razaoSocial} onChange={e => setForm({ ...form, razaoSocial: e.target.value })} /></div>}
                {isPJ && <div><Label>Inscrição Estadual</Label><Input value={form.inscricaoEstadual} onChange={e => setForm({ ...form, inscricaoEstadual: e.target.value })} /></div>}
              </div>

              {!isPJ && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div><Label>RG</Label><Input value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></div>
                  <div><Label>Data Nascimento</Label><Input type="date" value={form.dataNascimento} onChange={e => setForm({ ...form, dataNascimento: e.target.value })} /></div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={form.sexo} onValueChange={v => setForm({ ...form, sexo: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {!isPJ && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label>Estado Civil</Label>
                    <Select value={form.estadoCivil} onValueChange={v => setForm({ ...form, estadoCivil: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Profissão</Label><Input value={form.profissao} onChange={e => setForm({ ...form, profissao: e.target.value })} /></div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" noUpperCase /></div>
                <div><Label>Celular</Label><Input value={form.celular} onChange={e => setForm({ ...form, celular: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" noUpperCase /></div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <Label>Status:</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Incompleto">Incompleto</SelectItem>
                  </SelectContent>
                </Select>
               </div>

              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Anotações livres sobre esta pessoa..." />
              </div>
            </TabsContent>

            {/* ABA ENDEREÇO */}
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input value={form.cep} onChange={e => setForm({ ...form, cep: maskCep(e.target.value) })} placeholder="00000-000" noUpperCase />
                    <Button variant="outline" size="sm" onClick={buscarCep} disabled={buscandoCep} className="shrink-0">
                      {buscandoCep ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2"><Label>Logradouro</Label><Input value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} /></div>
                <div><Label>Número</Label><Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div><Label>Complemento</Label><Input value={form.complemento} onChange={e => setForm({ ...form, complemento: e.target.value })} /></div>
                <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
                  <div><Label>UF</Label><Input value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })} maxLength={2} /></div>
                </div>
              </div>
            </TabsContent>

            {/* ABA FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label>Limite de Crédito (R$)</Label><CurrencyInput value={form.limiteCredito} onValueChange={v => setForm({ ...form, limiteCredito: v })} /></div>
                <div><Label>Limite Cheque (R$)</Label><CurrencyInput value={form.limiteCheque} onValueChange={v => setForm({ ...form, limiteCheque: v })} /></div>
                <div><Label>Limite a Prazo (R$)</Label><CurrencyInput value={form.limitePrazo} onValueChange={v => setForm({ ...form, limitePrazo: v })} /></div>
                <div><Label>Limite Convênio (R$)</Label><CurrencyInput value={form.limiteConvenio} onValueChange={v => setForm({ ...form, limiteConvenio: v })} /></div>
              </div>
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Débitos do Cliente (R$)</Label>
                    <CurrencyInput value={form.debitos} onValueChange={v => setForm({ ...form, debitos: v })} />
                    {form.debitos > 0 && <p className="text-sm text-destructive mt-1">Cliente possui débitos pendentes</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA BANCÁRIO */}
            <TabsContent value="bancario" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label>Banco</Label><Input value={form.dadosBancarios.banco} onChange={e => setForm({ ...form, dadosBancarios: { ...form.dadosBancarios, banco: e.target.value } })} /></div>
                <div><Label>Agência</Label><Input value={form.dadosBancarios.agencia} onChange={e => setForm({ ...form, dadosBancarios: { ...form.dadosBancarios, agencia: e.target.value } })} /></div>
                <div><Label>Conta</Label><Input value={form.dadosBancarios.conta} onChange={e => setForm({ ...form, dadosBancarios: { ...form.dadosBancarios, conta: e.target.value } })} /></div>
                <div>
                  <Label>Tipo de Conta</Label>
                  <Select value={form.dadosBancarios.tipoConta} onValueChange={v => setForm({ ...form, dadosBancarios: { ...form.dadosBancarios, tipoConta: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrente">Corrente</SelectItem>
                      <SelectItem value="Poupança">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Chave PIX</Label><Input value={form.dadosBancarios.pix} onChange={e => setForm({ ...form, dadosBancarios: { ...form.dadosBancarios, pix: e.target.value } })} /></div>
            </TabsContent>

            {/* ABA REFERÊNCIAS */}
            <TabsContent value="referencias" className="space-y-4 mt-4">
              {form.referencias.map((ref, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Referência {idx + 1}</span>
                    {form.referencias.length > 1 && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeRef(idx)}><Trash2 size={14} /></Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><Label>Nome</Label><Input value={ref.nome} onChange={e => updateRef(idx, "nome", e.target.value)} /></div>
                    <div><Label>Telefone</Label><Input value={ref.telefone} onChange={e => updateRef(idx, "telefone", e.target.value)} /></div>
                    <div>
                      <Label>Relação</Label>
                      <Select value={ref.relacao} onValueChange={v => updateRef(idx, "relacao", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Familiar">Familiar</SelectItem>
                          <SelectItem value="Amigo">Amigo</SelectItem>
                          <SelectItem value="Comercial">Comercial</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRef}><Plus size={14} className="mr-2" />Adicionar Referência</Button>
            </TabsContent>

            {/* ABA COMERCIAL */}
            <TabsContent value="comercial" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Grupo de Desconto</Label>
                  <Select
                    value={form.grupoDesconto}
                    onValueChange={v => setForm({ ...form, grupoDesconto: v === "__clear__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">Nenhum</SelectItem>
                      {gruposDesconto.filter(g => g.ativo).map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gruposDesconto.filter(g => g.ativo).length === 0 
                      ? "Nenhum grupo cadastrado. Cadastre em Comercial > Grupos de Desconto" 
                      : `${gruposDesconto.filter(g => g.ativo).length} grupo(s) disponível(is)`}
                  </p>
                </div>
                <div>
                  <Label>Preço Especial</Label>
                  <Select
                    value={form.precosEspeciais}
                    onValueChange={v => setForm({ ...form, precosEspeciais: v === "__clear__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione um preço especial" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">Tabela Padrão</SelectItem>
                      {precosEspeciais.filter(p => p.ativo).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.descricao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {precosEspeciais.filter(p => p.ativo).length === 0 
                      ? "Nenhum preço especial cadastrado. Cadastre em Comercial > Preços Especiais" 
                      : `${precosEspeciais.filter(p => p.ativo).length} preço(s) especial(is) disponível(is)`}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir esta pessoa?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
