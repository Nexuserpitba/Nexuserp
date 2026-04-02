import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2, Loader2, ShieldCheck, Upload, X, CheckCircle2, AlertCircle, Download, QrCode, Eye, EyeOff, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { useSupabaseTable } from "@/hooks/useSupabaseTable";
import { empresasMapper } from "@/lib/supabaseMappers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { maskCnpj, maskTelefone, maskCep } from "@/lib/maskUtils";
import { validarCNPJ } from "@/lib/validationUtils";
import { CpfCnpjInput } from "@/components/ui/cpf-cnpj-input";


interface Certificado {
  nome: string;
  validade: string;
  tipo: string;
  arquivo?: string;
  base64?: string;
  senha?: string;
}

interface PixPspConfig {
  psp: string;
  ambiente: string;
  timeoutMs: number;
  proxyHost: string;
  proxyPorta: string;
  proxyUsuario: string;
  proxySenha: string;
  recebedorNome: string;
  recebedorCidade: string;
  recebedorUf: string;
  recebedorCep: string;
  recebedorMcc: string;
  expiracaoCobranca: number;
  permitirEstorno: boolean;
  imprimirComprovante: boolean;
}

interface SmtpConfig {
  servidor: string;
  porta: string;
  usuario: string;
  exigeSenha: boolean;
  senha: string;
  emailResposta: string;
  criptografia: 'TLS' | 'SSL' | 'Nenhuma';
  validarCertificado: boolean;
}

interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regime: string;
  uf: string;
  cidade: string;
  codigoPais: string;
  codigoCidade: string;
  endereco: string;
  bairro: string;
  cep: string;
  telefone: string;
  email: string;
  status: string;
  observacao: string;
  certificado?: Certificado;
  pixPsp?: PixPspConfig;
  smtpConfig?: SmtpConfig;
  selecionada?: boolean;
  finalidadeNfe?: string;
  ambienteNfe?: string;
}

const defaultEmpresas: Empresa[] = [
  {
    id: "1", razaoSocial: "Empresa Exemplo Ltda", nomeFantasia: "Empresa Exemplo", cnpj: "12.345.678/0001-90",
    inscricaoEstadual: "123.456.789.000", inscricaoMunicipal: "12345", regime: "Simples Nacional",
    uf: "SP", cidade: "São Paulo", codigoPais: "1058", codigoCidade: "3550308",
    endereco: "Rua Exemplo, 123", bairro: "Centro", cep: "01000-000",
    telefone: "(11) 3000-0000", email: "contato@exemplo.com.br", status: "Ativa", observacao: "", selecionada: true, finalidadeNfe: "1", ambienteNfe: "2"
  },
  {
    id: "2", razaoSocial: "Comércio Brasil S.A.", nomeFantasia: "Comércio Brasil", cnpj: "98.765.432/0001-10",
    inscricaoEstadual: "987.654.321.000", inscricaoMunicipal: "98765", regime: "Lucro Presumido",
    uf: "RJ", cidade: "Rio de Janeiro", codigoPais: "1058", codigoCidade: "3304557",
    endereco: "Av. Brasil, 456", bairro: "Copacabana", cep: "20000-000",
    telefone: "(21) 3000-0000", email: "contato@comerciobrasil.com.br", status: "Ativa", observacao: "", selecionada: false, finalidadeNfe: "1", ambienteNfe: "2"
  },
  {
    id: "3", razaoSocial: "Distribuidora Norte ME", nomeFantasia: "Dist Norte", cnpj: "11.222.333/0001-44",
    inscricaoEstadual: "111.222.333.000", inscricaoMunicipal: "11222", regime: "Simples Nacional",
    uf: "AM", cidade: "Manaus", codigoPais: "1058", codigoCidade: "1302603",
    endereco: "Rua Norte, 789", bairro: "Distrito Industrial", cep: "69000-000",
    telefone: "(92) 3000-0000", email: "contato@distnorte.com.br", status: "Ativa", observacao: "", selecionada: false, finalidadeNfe: "1", ambienteNfe: "2"
  },
];

const emptyForm: Omit<Empresa, "id"> = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", inscricaoEstadual: "", inscricaoMunicipal: "",
  regime: "Simples Nacional", uf: "", cidade: "", codigoPais: "1058", codigoCidade: "",
  endereco: "", bairro: "", cep: "",
  telefone: "", email: "", status: "Ativa", observacao: "", selecionada: false, finalidadeNfe: "1", ambienteNfe: "2"
};

const emptyPixPsp: PixPspConfig = {
  psp: "", ambiente: "producao", timeoutMs: 1800,
  proxyHost: "", proxyPorta: "", proxyUsuario: "", proxySenha: "",
  recebedorNome: "", recebedorCidade: "", recebedorUf: "", recebedorCep: "", recebedorMcc: "0",
  expiracaoCobranca: 86400, permitirEstorno: false, imprimirComprovante: true,
};

const pspList = [
  "Banco do Brasil", "Bradesco", "Itaú Unibanco", "Santander", "Caixa Econômica",
  "Nubank", "Banco Inter", "C6 Bank", "PagBank (PagSeguro)", "Mercado Pago",
  "Stone", "Cielo", "Rede (Itaú)", "Getnet (Santander)", "SumUp",
  "Efí (Gerencianet)", "Asaas", "PicPay", "Sicredi", "Sicoob",
];
const emptySmtpConfig: SmtpConfig = {
  servidor: "", porta: "587", usuario: "", exigeSenha: true, senha: "", emailResposta: "",
  criptografia: "TLS", validarCertificado: true,
};


function cleanCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

export default function Empresas() {
  const [search, setSearch] = useState("");
  const { items, loading, addItem, updateItem, deleteItem } = useSupabaseTable<Empresa>({
    table: "empresas",
    mapper: empresasMapper,
    defaultData: defaultEmpresas,
  });

  // Salvar empresas no localStorage para uso nos relatórios
  useEffect(() => {
    if (items.length > 0) {
      const empresasParaSalvar = items.map(e => ({
        ...e,
        razao_social: e.razaoSocial,
        nome_fantasia: e.nomeFantasia,
        inscricao_estadual: e.inscricaoEstadual,
        selecionada: e.selecionada,
      }));
      localStorage.setItem("empresas", JSON.stringify(empresasParaSalvar));
    }
  }, [items]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Empresa, "id">>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const lastCnpjBuscado = useRef("");
  const lastCepBuscado = useRef("");

  // Auto-busca CNPJ quando completo e válido
  useEffect(() => {
    const digits = form.cnpj.replace(/\D/g, "");
    if (digits.length === 14 && digits !== lastCnpjBuscado.current && !editingId) {
      if (validarCNPJ(form.cnpj)) {
        lastCnpjBuscado.current = digits;
        buscarCnpj();
      }
    }
  }, [form.cnpj]);

  // Auto-busca CEP quando completo (8 dígitos)
  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length === 8 && digits !== lastCepBuscado.current) {
      lastCepBuscado.current = digits;
      buscarCep(digits);
    }
  }, [form.cep]);

  const buscarCep = async (digits: string) => {
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.erro) throw new Error();

      setForm(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
        codigoCidade: data.ibge || prev.codigoCidade,
      }));
      
      // Auto-insere a cidade na base se não existir
      if (data.uf && data.ibge && data.localidade) {
        supabase.from("cidades").select("codigo_ibge").eq("codigo_ibge", data.ibge).single().then(({ data: c }) => {
          if (!c) supabase.from("cidades").insert({ codigo_ibge: data.ibge, nome: data.localidade, uf: data.uf }).then(() => setCidadesVersion(v => v + 1));
        });
      }

      toast.success("CEP encontrado!", { description: `${data.localidade} - ${data.uf}` });
    } catch {
      toast.info("CEP não encontrado na base pública");
    } finally {
      setBuscandoCep(false);
    }
  };
  const [certForm, setCertForm] = useState<Certificado>({ nome: "", validade: "", tipo: "A1" });
  const [pixPspForm, setPixPspForm] = useState<PixPspConfig>(emptyPixPsp);
  const [showProxySenha, setShowProxySenha] = useState(false);
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>(emptySmtpConfig);
  const [showSmtpSenha, setShowSmtpSenha] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState("");
  const [cidadeDialogOpen, setCidadeDialogOpen] = useState(false);
  const [cidadeForm, setCidadeForm] = useState({ nome: "", codigoIbge: "" });
  const [importandoCidades, setImportandoCidades] = useState(false);
  const [cidadesVersion, setCidadesVersion] = useState(0);
  

  const [cidadesCadastradas, setCidadesCadastradas] = useState<{ id: string; nome: string; codigoIbge: string; uf: string }[]>([]);

  useEffect(() => {
    if (!form.uf) { setCidadesCadastradas([]); return; }
    void cidadesVersion;
    const fetchCidades = async () => {
      try {
        const { data } = await supabase.from("cidades").select("*").eq("uf", form.uf).order("nome");
        if (data) setCidadesCadastradas(data.map(c => ({ id: c.id, nome: c.nome, codigoIbge: c.codigo_ibge || "", uf: c.uf })));
      } catch {
        setCidadesCadastradas([]);
      }
    };
    fetchCidades();
  }, [form.uf, cidadesVersion]);

  const salvarCidadeInline = async () => {
    if (!cidadeForm.nome || !cidadeForm.codigoIbge) { toast.error("Preencha nome e código IBGE"); return; }
    try {
      const { data, error } = await supabase.from("cidades").insert({ nome: cidadeForm.nome, codigo_ibge: cidadeForm.codigoIbge, uf: form.uf }).select().single();
      if (error) throw error;
      setCidadesVersion(v => v + 1);
      setForm(prev => ({ ...prev, cidade: data.nome, codigoCidade: data.codigo_ibge || "" }));
      setCidadeDialogOpen(false);
      setCidadeForm({ nome: "", codigoIbge: "" });
      toast.success("Cidade cadastrada!");
    } catch (err: any) {
      toast.error("Erro ao salvar cidade", { description: err.message });
    }
  };

  const importarCidadesDaUf = async () => {
    if (!form.uf) { toast.error("Selecione uma UF primeiro"); return; }
    setImportandoCidades(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${form.uf}?providers=dados-abertos-br,gov,wikipedia`);
      const data: any[] = await res.json();
      const { data: existentes } = await supabase.from("cidades").select("codigo_ibge").eq("uf", form.uf);
      const existentesSet = new Set((existentes || []).map(c => c.codigo_ibge));
      const novas = data
        .filter(m => !existentesSet.has(String(m.codigo_ibge)))
        .map(m => ({ nome: m.nome, codigo_ibge: String(m.codigo_ibge), uf: form.uf }));
      if (novas.length > 0) {
        const { error } = await supabase.from("cidades").insert(novas);
        if (error) throw error;
      }
      setCidadesVersion(v => v + 1);
      toast.success(`${novas.length} cidades importadas para ${form.uf}!`);
    } catch { toast.error("Erro ao importar cidades"); }
    finally { setImportandoCidades(false); }
  };

  const empresaAtiva = items.find(e => e.selecionada);

  const filtered = items.filter(e =>
    e.razaoSocial.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search)
  );

  const buildRecebedorFromEmpresa = (e: Partial<Empresa>): Partial<PixPspConfig> => ({
    recebedorNome: e.razaoSocial || "",
    recebedorCidade: e.cidade || "",
    recebedorUf: e.uf || "",
    recebedorCep: e.cep || "",
  });

  const openNew = () => {
    lastCnpjBuscado.current = "";
    lastCepBuscado.current = "";
    setForm(emptyForm);
    setCertForm({ nome: "", validade: "", tipo: "A1" });
    // Busca empresa ativa para preencher recebedor
    const ativa = items.find(emp => emp.selecionada);
    const recebedor = ativa ? buildRecebedorFromEmpresa(ativa) : {};
    setPixPspForm({ ...emptyPixPsp, ...recebedor });
    setSmtpForm(emptySmtpConfig);
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (e: Empresa) => {
    lastCnpjBuscado.current = e.cnpj.replace(/\\D/g, "");
    lastCepBuscado.current = e.cep.replace(/\\D/g, "");
    setForm({ ...e });
    setCertForm(e.certificado || { nome: "", validade: "", tipo: "A1" });
    // Se não tem pixPsp salvo, preenche recebedor com dados da própria empresa
    const pspSalvo = e.pixPsp;
    const recebedor = buildRecebedorFromEmpresa(e);
    setPixPspForm(pspSalvo ? { ...pspSalvo, ...(pspSalvo.recebedorNome ? {} : recebedor) } : { ...emptyPixPsp, ...recebedor });
    setSmtpForm(e.smtpConfig || emptySmtpConfig);
    setEditingId(e.id);
    setDialogOpen(true);
  };

  const buscarCnpj = async () => {
    const cnpjLimpo = cleanCnpj(form.cnpj);
    if (cnpjLimpo.length !== 14) { toast.error("CNPJ inválido. Informe 14 dígitos."); return; }

    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();

      setForm(prev => ({
        ...prev,
        razaoSocial: data.razao_social || prev.razaoSocial,
        nomeFantasia: data.nome_fantasia || data.razao_social || prev.nomeFantasia,
        uf: data.uf || prev.uf,
        cidade: data.municipio || prev.cidade,
        codigoCidade: data.codigo_municipio_ibge ? String(data.codigo_municipio_ibge) : prev.codigoCidade,
        codigoPais: "1058",
        endereco: `${data.logradouro || ""} ${data.numero || ""}`.trim() || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cep: data.cep ? data.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : prev.cep,
        telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : prev.telefone,
        email: data.email || prev.email,
      }));
      toast.success("Dados do CNPJ carregados!");
    } catch {
      toast.error("Não foi possível buscar o CNPJ. Verifique e tente novamente.");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const normalizeSmtpConfig = (smtp: SmtpConfig): SmtpConfig | null => {
    if (!smtp.servidor) return null;

    let host = smtp.servidor.trim()
      .replace(/^smtps?:\/\//i, "")
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .trim();

    if (host.includes("@")) {
      host = host.split("@").pop()?.trim() ?? "";
    }

    const hostParts = host.split(":");
    if (hostParts.length > 1) {
      const maybePort = hostParts[hostParts.length - 1];
      if (/^\d+$/.test(maybePort)) {
        host = hostParts.slice(0, -1).join(":").trim();
      }
    }

    if (!host) return null;

    const porta = parseInt(String(smtp.porta), 10);
    const portaValida = Number.isInteger(porta) && porta > 0 && porta <= 65535;
    const portaFinal = portaValida ? String(porta) : (smtp.criptografia === "SSL" ? "465" : "587");

    let criptografia = smtp.criptografia;
    if (!criptografia || !["TLS", "SSL", "Nenhuma"].includes(criptografia)) {
      criptografia = porta === 465 ? "SSL" : "TLS";
    }

    return { ...smtp, servidor: host, porta: portaFinal, criptografia };
  };

  const handleSave = () => {
    if (!form.razaoSocial || !form.cnpj) { toast.error("Preencha Razão Social e CNPJ"); return; }
    if (!validarCNPJ(form.cnpj)) { toast.error("CNPJ inválido. Verifique o dígito verificador."); return; }

    let smtpNormalizado: SmtpConfig | undefined;
    if (smtpForm.servidor) {
      const normalized = normalizeSmtpConfig(smtpForm);
      if (!normalized) {
        toast.error("Servidor SMTP inválido. Informe no formato smtp.seudominio.com (sem http:// e sem :porta).");
        return;
      }
      smtpNormalizado = normalized;
      if (smtpNormalizado.servidor !== smtpForm.servidor || smtpNormalizado.porta !== smtpForm.porta) {
        setSmtpForm(smtpNormalizado);
        toast.info(`SMTP normalizado: ${smtpNormalizado.servidor}:${smtpNormalizado.porta}`);
      }
    }

    const data = { ...form, certificado: certForm.nome ? certForm : undefined, pixPsp: pixPspForm.psp ? pixPspForm : undefined, smtpConfig: smtpNormalizado };
    if (editingId) {
      updateItem(editingId, data);
      toast.success("Empresa atualizada!");
    } else {
      addItem(data as Omit<Empresa, "id">);
      toast.success("Empresa cadastrada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { deleteItem(id); setDeleteConfirm(null); toast.success("Empresa excluída!"); };

  const selecionarEmpresa = (id: string) => {
    items.forEach(e => updateItem(e.id, { selecionada: e.id === id }));
    toast.success("Empresa selecionada como ativa!");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Empresas"
        description="Gerencie as empresas cadastradas no sistema"
        actions={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {empresaAtiva && (
              <Badge variant="outline" className="text-sm py-1 px-3 gap-1.5 border-primary/30 bg-primary/5 justify-center">
                <Building2 size={14} />
                Ativa: {empresaAtiva.nomeFantasia || empresaAtiva.razaoSocial}
              </Badge>
            )}
            
            <Button onClick={openNew} className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Nova Empresa</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por razão social ou CNPJ..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="table-responsive">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Regime Tributário</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id} className={e.selecionada ? "bg-primary/5" : ""}>
                  <TableCell>
                    {e.selecionada ? (
                      <CheckCircle2 size={16} className="text-primary" />
                    ) : (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => selecionarEmpresa(e.id)} title="Selecionar como ativa">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-muted-foreground" />
                      <div>
                        <div>{e.razaoSocial}</div>
                        {e.nomeFantasia && <div className="text-xs text-muted-foreground">{e.nomeFantasia}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{e.cnpj}</TableCell>
                  <TableCell>{e.regime}</TableCell>
                  <TableCell>{e.cidade}/{e.uf}</TableCell>
                  <TableCell>
                    {e.certificado?.nome ? (
                      <Badge variant="secondary" className="bg-success/10 text-success border-0 gap-1">
                        <ShieldCheck size={12} /> {e.certificado.tipo}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 gap-1">
                        <AlertCircle size={12} /> Sem cert.
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-success/10 text-success border-0">{e.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => selecionarEmpresa(e.id)}>
                          <CheckCircle2 size={14} className="mr-2" />Selecionar como ativa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(e)}><Pencil size={14} className="mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(e.id)}><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma empresa encontrada</TableCell></TableRow>
              )}
            </TableBody>
          </div>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="dados" className="flex-1">Dados Gerais</TabsTrigger>
              <TabsTrigger value="endereco" className="flex-1">Endereço</TabsTrigger>
              <TabsTrigger value="certificado" className="flex-1">Certificado</TabsTrigger>
              <TabsTrigger value="pixpsp" className="flex-1 gap-1"><QrCode size={14} /> PIX / PSP</TabsTrigger>
              <TabsTrigger value="smtp" className="flex-1 gap-1"><Mail size={14} /> E-mail SMTP</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              {/* CNPJ com busca */}
              <div>
                <Label>CNPJ *</Label>
                <div className="flex gap-2">
                  <CpfCnpjInput
                    value={form.cnpj}
                    onChange={v => setForm({ ...form, cnpj: v })}
                    mode="cnpj"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={buscarCnpj} disabled={buscandoCnpj} className="shrink-0">
                    {buscandoCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    <span className="ml-1.5">Buscar</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Digite o CNPJ e clique em Buscar para preencher automaticamente</p>
              </div>
              <div><Label>Razão Social *</Label><Input value={form.razaoSocial} onChange={e => setForm({ ...form, razaoSocial: e.target.value })} /></div>
              <div><Label>Nome Fantasia</Label><Input value={form.nomeFantasia} onChange={e => setForm({ ...form, nomeFantasia: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Inscrição Estadual</Label><Input value={form.inscricaoEstadual} onChange={e => setForm({ ...form, inscricaoEstadual: e.target.value })} /></div>
                <div><Label>Inscrição Municipal</Label><Input value={form.inscricaoMunicipal} onChange={e => setForm({ ...form, inscricaoMunicipal: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Regime Tributário</Label>
                  <Select value={form.regime} onValueChange={v => setForm({ ...form, regime: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                      <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                      <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                      <SelectItem value="MEI">MEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Inativa">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Finalidade da NF-e</Label>
                  <Select value={form.finalidadeNfe} onValueChange={v => setForm({ ...form, finalidadeNfe: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - NF-e Normal</SelectItem>
                      <SelectItem value="2">2 - NF-e Complementar</SelectItem>
                      <SelectItem value="3">3 - NF-e de Ajuste</SelectItem>
                      <SelectItem value="4">4 - Devolução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ambiente NF-e</Label>
                  <Select value={form.ambienteNfe} onValueChange={v => setForm({ ...form, ambienteNfe: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Produção</SelectItem>
                      <SelectItem value="2">2 - Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: maskTelefone(e.target.value) })} placeholder="(00) 0000-0000" noUpperCase /></div>
                <div><Label>E-mail</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" /></div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={3} value={form.observacao || ""} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Anotações livres sobre esta empresa..." />
              </div>
            </TabsContent>

            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div>
                <Label>CEP</Label>
                <div className="relative">
                  <Input value={form.cep} onChange={e => setForm({ ...form, cep: maskCep(e.target.value) })} placeholder="00000-000" noUpperCase />
                  {buscandoCep && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">CEP com 8 dígitos busca endereço automaticamente</p>
              </div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Bairro</Label><Input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} /></div>
                <div>
                  <Label>Cidade</Label>
                  <div className="flex gap-1.5">
                    <Select
                      value={form.codigoCidade || ""}
                      onValueChange={v => {
                        const cid = cidadesCadastradas.find(c => c.codigoIbge === v);
                        setForm({ ...form, cidade: cid?.nome || "", codigoCidade: v });
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={form.uf ? (cidadesCadastradas.length === 0 ? "Nenhuma cidade cadastrada" : "Selecione a cidade") : "Selecione a UF primeiro"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {cidadesCadastradas.map(c => (
                          <SelectItem key={c.codigoIbge} value={c.codigoIbge}>
                            {c.nome} ({c.codigoIbge})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={!form.uf} onClick={() => { setCidadeForm({ nome: "", codigoIbge: "" }); setCidadeDialogOpen(true); }} title="Cadastrar cidade">
                      <Plus size={16} />
                    </Button>
                    <Button type="button" variant="outline" size="icon" className="shrink-0" disabled={!form.uf || importandoCidades} onClick={importarCidadesDaUf} title="Importar todas as cidades da UF">
                      {importandoCidades ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    </Button>
                  </div>
                  {form.uf && cidadesCadastradas.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Clique em ↓ para importar cidades de {form.uf}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>UF</Label>
                  <Select value={form.uf} onValueChange={v => setForm({ ...form, uf: v, cidade: "", codigoCidade: "" })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cód. País (BACEN)</Label>
                  <Input value={form.codigoPais} onChange={e => setForm({ ...form, codigoPais: e.target.value })} placeholder="1058" />
                  <p className="text-xs text-muted-foreground mt-1">Brasil = 1058</p>
                </div>
                <div>
                  <Label>Cód. Município (IBGE)</Label>
                  <Input value={form.codigoCidade} readOnly className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Preenchido ao selecionar cidade</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="certificado" className="space-y-4 mt-4">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck size={16} className="text-primary" />
                  Certificado Digital
                </div>
                <div>
                  <Label>Tipo do Certificado</Label>
                  <Select value={certForm.tipo} onValueChange={v => setCertForm({ ...certForm, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A1">A1 (Arquivo)</SelectItem>
                      <SelectItem value="A3">A3 (Token/Cartão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nome/Descrição do Certificado</Label><Input value={certForm.nome} onChange={e => setCertForm({ ...certForm, nome: e.target.value })} placeholder="Ex: Certificado e-CNPJ" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Validade</Label><Input type="date" value={certForm.validade} onChange={e => setCertForm({ ...certForm, validade: e.target.value })} /></div>
                  <div><Label>Senha do Certificado</Label><Input type="password" value={certForm.senha || ""} onChange={e => setCertForm({ ...certForm, senha: e.target.value })} placeholder="Senha do arquivo .pfx" /></div>
                </div>
                {certForm.tipo === "A1" && (
                  <div>
                    <Label>Arquivo do Certificado (.pfx)</Label>
                    {certForm.arquivo ? (
                      <div className="border rounded-lg p-4 flex items-center justify-between bg-success/5 border-success/30">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={18} className="text-success" />
                          <div>
                            <p className="text-sm font-medium">{certForm.arquivo}</p>
                            <p className="text-xs text-muted-foreground">Certificado carregado</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setCertForm({ ...certForm, arquivo: undefined })}>
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer block">
                        <Upload size={24} className="mx-auto mb-2" />
                        <p className="text-sm">Clique ou arraste o arquivo .pfx aqui</p>
                        <p className="text-xs mt-1">(Armazenamento local — arquivo salvo apenas no navegador)</p>
                        <input
                          type="file"
                          accept=".pfx,.p12"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64String = (event.target?.result as string).split(',')[1];
                                setCertForm({ 
                                  ...certForm, 
                                  arquivo: file.name, 
                                  nome: certForm.nome || file.name.replace(/\.(pfx|p12)$/i, ""),
                                  base64: base64String
                                });
                                toast.success(`Certificado "\${file.name}" importado com sucesso!`);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
                {certForm.tipo === "A3" && (
                  <div className="bg-warning/10 text-warning rounded-lg p-3 text-sm">
                    Certificados A3 utilizam token físico ou cartão. Certifique-se de que o driver está instalado.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pixpsp" className="space-y-4 mt-4">
              {/* PSP */}
              <fieldset className="border rounded-lg p-4 space-y-3">
                <legend className="text-sm font-medium px-2 flex items-center gap-1.5"><QrCode size={14} className="text-primary" /> PSP</legend>
                <div>
                  <Label>PSP (Provedor de Serviços de Pagamento) *</Label>
                  <Select value={pixPspForm.psp} onValueChange={v => setPixPspForm({ ...pixPspForm, psp: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o PSP" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {pspList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ambiente</Label>
                    <Select value={pixPspForm.ambiente} onValueChange={v => setPixPspForm({ ...pixPspForm, ambiente: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="homologacao">Homologação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Timeout (ms)</Label>
                    <Input type="number" value={pixPspForm.timeoutMs} onChange={e => setPixPspForm({ ...pixPspForm, timeoutMs: Number(e.target.value) })} />
                  </div>
                </div>
              </fieldset>

              {/* Proxy */}
              <fieldset className="border rounded-lg p-4 space-y-3">
                <legend className="text-sm font-medium px-2">Proxy</legend>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><Label>Host</Label><Input value={pixPspForm.proxyHost} onChange={e => setPixPspForm({ ...pixPspForm, proxyHost: e.target.value })} placeholder="Ex: proxy.empresa.com" /></div>
                  <div><Label>Porta</Label><Input value={pixPspForm.proxyPorta} onChange={e => setPixPspForm({ ...pixPspForm, proxyPorta: e.target.value })} placeholder="8080" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Usuário</Label><Input value={pixPspForm.proxyUsuario} onChange={e => setPixPspForm({ ...pixPspForm, proxyUsuario: e.target.value })} /></div>
                  <div>
                    <Label>Senha</Label>
                    <div className="relative">
                      <Input type={showProxySenha ? "text" : "password"} value={pixPspForm.proxySenha} onChange={e => setPixPspForm({ ...pixPspForm, proxySenha: e.target.value })} />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowProxySenha(!showProxySenha)}>
                        {showProxySenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-4">
                {/* Recebedor */}
                <fieldset className="border rounded-lg p-4 space-y-3">
                  <legend className="text-sm font-medium px-2">Recebedor</legend>
                  <div><Label>Nome</Label><Input value={pixPspForm.recebedorNome} onChange={e => setPixPspForm({ ...pixPspForm, recebedorNome: e.target.value })} placeholder="Razão Social" /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2"><Label>Cidade</Label><Input value={pixPspForm.recebedorCidade} onChange={e => setPixPspForm({ ...pixPspForm, recebedorCidade: e.target.value })} /></div>
                    <div>
                      <Label>UF</Label>
                      <Select value={pixPspForm.recebedorUf} onValueChange={v => setPixPspForm({ ...pixPspForm, recebedorUf: v })}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>CEP</Label><Input value={pixPspForm.recebedorCep} onChange={e => setPixPspForm({ ...pixPspForm, recebedorCep: e.target.value })} placeholder="00000-000" /></div>
                    <div><Label>MCC</Label><Input value={pixPspForm.recebedorMcc} onChange={e => setPixPspForm({ ...pixPspForm, recebedorMcc: e.target.value })} placeholder="0" /></div>
                  </div>
                </fieldset>

                {/* Configurações */}
                <fieldset className="border rounded-lg p-4 space-y-3">
                  <legend className="text-sm font-medium px-2">Configurações</legend>
                  <div>
                    <Label>Expiração da Cobrança (s)</Label>
                    <Input type="number" value={pixPspForm.expiracaoCobranca} onChange={e => setPixPspForm({ ...pixPspForm, expiracaoCobranca: Number(e.target.value) })} />
                    <p className="text-xs text-muted-foreground mt-1">86400 = 24 horas</p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="permitirEstorno" checked={pixPspForm.permitirEstorno} onCheckedChange={v => setPixPspForm({ ...pixPspForm, permitirEstorno: !!v })} />
                      <Label htmlFor="permitirEstorno" className="text-sm cursor-pointer">Permitir Estorno na Finalizadora</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="imprimirComprovante" checked={pixPspForm.imprimirComprovante} onCheckedChange={v => setPixPspForm({ ...pixPspForm, imprimirComprovante: !!v })} />
                      <Label htmlFor="imprimirComprovante" className="text-sm cursor-pointer">Imprimir Comprovante no PDV</Label>
                    </div>
                  </div>
                </fieldset>
              </div>
            </TabsContent>

            <TabsContent value="smtp" className="space-y-4 mt-4">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail size={16} className="text-primary" />
                  Servidor de E-mail (SMTP)
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label>Servidor SMTP *</Label>
                    <Input value={smtpForm.servidor} onChange={e => setSmtpForm({ ...smtpForm, servidor: e.target.value })} placeholder="Ex: smtp.gmail.com" />
                  </div>
                  <div>
                    <Label>Porta *</Label>
                    <Input value={smtpForm.porta} onChange={e => setSmtpForm({ ...smtpForm, porta: e.target.value })} placeholder="587" />
                  </div>
                  <div>
                    <Label>Criptografia</Label>
                    <Select value={smtpForm.criptografia} onValueChange={v => {
                      const porta = v === 'SSL' ? '465' : v === 'TLS' ? '587' : smtpForm.porta;
                      setSmtpForm({ ...smtpForm, criptografia: v as SmtpConfig['criptografia'], porta });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TLS">TLS (STARTTLS)</SelectItem>
                        <SelectItem value="SSL">SSL/TLS</SelectItem>
                        <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Usuário (Login)</Label>
                  <Input value={smtpForm.usuario} onChange={e => setSmtpForm({ ...smtpForm, usuario: e.target.value })} placeholder="Ex: usuario@empresa.com.br" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="smtpExigeSenha" checked={smtpForm.exigeSenha} onCheckedChange={v => setSmtpForm({ ...smtpForm, exigeSenha: !!v })} />
                  <Label htmlFor="smtpExigeSenha" className="text-sm cursor-pointer">SMTP exige autenticação (senha)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="smtpValidarCert" checked={smtpForm.validarCertificado} onCheckedChange={v => setSmtpForm({ ...smtpForm, validarCertificado: !!v })} />
                  <Label htmlFor="smtpValidarCert" className="text-sm cursor-pointer">Validar certificado do servidor</Label>
                </div>
                {smtpForm.exigeSenha && (
                  <div>
                    <Label>Senha</Label>
                    <div className="relative">
                      <Input type={showSmtpSenha ? "text" : "password"} value={smtpForm.senha} onChange={e => setSmtpForm({ ...smtpForm, senha: e.target.value })} placeholder="Senha do servidor SMTP" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowSmtpSenha(!showSmtpSenha)}>
                        {showSmtpSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label>E-mail de Resposta (Reply-To)</Label>
                  <Input type="email" value={smtpForm.emailResposta} onChange={e => setSmtpForm({ ...smtpForm, emailResposta: e.target.value })} placeholder="Ex: contato@empresa.com.br" />
                  <p className="text-xs text-muted-foreground mt-1">E-mail que os destinatários verão para responder</p>
                </div>

                {/* Teste SMTP */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail size={16} className="text-primary" />
                    Testar Conexão SMTP
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={smtpTestEmail}
                      onChange={e => setSmtpTestEmail(e.target.value)}
                      placeholder="Digite o e-mail de destino para teste"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={testingSmtp || !smtpForm.servidor || !smtpTestEmail}
                      onClick={async () => {
                        if (!smtpForm.servidor || !smtpForm.porta) {
                          toast.error("Preencha servidor e porta SMTP");
                          return;
                        }
                        if (!smtpTestEmail) {
                          toast.error("Informe o e-mail de destino para teste");
                          return;
                        }
                        setTestingSmtp(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("send-smtp-email", {
                            body: {
                              smtp: smtpForm,
                              to: smtpTestEmail,
                              isTest: true,
                            },
                          });
                          if (error) throw error;
                          if (data?.error) throw new Error(data.error);
                          toast.success("E-mail de teste enviado com sucesso! Verifique a caixa de entrada.");
                        } catch (err: any) {
                          toast.error("Falha ao enviar e-mail de teste", { description: err.message });
                        } finally {
                          setTestingSmtp(false);
                        }
                      }}
                      className="shrink-0 gap-1.5"
                    >
                      {testingSmtp ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      Enviar Teste
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Um e-mail de teste será enviado usando as configurações acima</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">Deseja realmente excluir esta empresa? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cadastro de Cidade Inline */}
      <Dialog open={cidadeDialogOpen} onOpenChange={setCidadeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Cidade - {form.uf}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Cidade *</Label>
              <Input value={cidadeForm.nome} onChange={e => setCidadeForm({ ...cidadeForm, nome: e.target.value })} placeholder="Ex: São Paulo" />
            </div>
            <div>
              <Label>Código IBGE *</Label>
              <Input value={cidadeForm.codigoIbge} onChange={e => setCidadeForm({ ...cidadeForm, codigoIbge: e.target.value.replace(/\D/g, "") })} placeholder="Ex: 3550308" />
              <p className="text-xs text-muted-foreground mt-1">Código de 7 dígitos do IBGE</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCidadeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={salvarCidadeInline}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  );
}
