import { useState, useCallback, useRef, useEffect } from "react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Send, Save, Eye, Building2, User, Package, Truck, CreditCard, 
  FileText, Printer, Download, Search, Loader2, Calculator, 
  FileSignature, Shield, Plus, Trash2, Copy, RefreshCw, Mail, Pencil
} from "lucide-react";
import { gerarXmlNFeBruto } from "@/lib/fiscal/nfeXmlGenerator";
import { format, addDays } from "date-fns";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface NFeItem {
  id: string;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  ipi: number;
  ipiAliquota: number;
  icms: number;
  icmsAliquota: number;
  icmsDesonado: number;
  icmsMotivoDesonercacao: string;
  fcp: number;
  fcpAliquota: number;
  pis: number;
  cofins: number;
  cst: string;
  cest: string;
  isNew?: boolean;
}

interface Produto {
  codigo: string;
  descricao: string;
  ncm: string;
  unidade: string;
  precoVenda: number;
}

interface Cliente {
  id: string;
  cpfCnpj: string;
  nome: string;
  telefone: string;
  email: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  cidade?: string;
  ie: string;
}

interface NFeFormData {
  serie: string;
  numero: string;
  modelo: string;
  tipo: string;
  finalidade: string;
  ambiente: string;
  uf: string;
  municipio: string;
  dataEmissao: string;
  dataSaida: string;
  horaSaida: string;
  
  emitenteCnpj: string;
  emitenteRazaoSocial: string;
  emitenteNomeFantasia: string;
  emitenteIe: string;
  emitenteIm: string;
  emitenteCrt: string;
  emitenteTelefone: string;
  emitenteEmail: string;
  emitenteLogradouro: string;
  emitenteNumero: string;
  emitenteComplemento: string;
  emitenteBairro: string;
  emitenteCep: string;
  emitenteUf: string;
  emitenteMunicipio: string;
  emitenteCodMunicipio: string;
  
  destCpfCnpj: string;
  destNome: string;
  destIe: string;
  destIsencaoIe: string;
  destTelefone: string;
  destEmail: string;
  destLogradouro: string;
  destNumero: string;
  destComplemento: string;
  destBairro: string;
  destCep: string;
  destUf: string;
  destMunicipio: string;
  destCodMunicipio: string;
  destIndicadorIE: string;
  
  transpModalidadeFrete: string;
  transpTransportadoraNome: string;
  transpTransportadoraCnpj: string;
  transpTransportadoraIe: string;
  transpTransportadoraEndereco: string;
  transpTransportadoraMunicipio: string;
  transpVeiculoPlaca: string;
  transpVeiculoUf: string;
  transpVolumeQuantidade: string;
  transpVolumeEspecie: string;
  transpVolumeMarca: string;
  transpVolumeNumeracao: string;
  transpVolumePesoLiquido: string;
  transpVolumePesoBruto: string;
  
  pagForma: string;
  pagTipoIntegracao: string;
  pagValor: string;
  
  totalBaseIcms: string;
  totalIcms: string;
  totalIcmsSt: string;
  totalIpi: string;
  totalPis: string;
  totalCofins: string;
  totalProdutos: string;
  totalFrete: string;
  totalSeguro: string;
  totalDesconto: string;
  totalOutros: string;
  totalGeral: string;
  
  informacoesComplementares: string;
  obsFisco: string;
  regimeTributario: string;
  contabilidadeCnpj: string;
  contabilidadeNome: string;
}

interface Parcela {
  numero: number;
  valor: number;
  vencimento: string;
  dataPagamento: string | null;
  valorRecebido: number;
  status: "aberta" | "recebida" | "parcial" | "vencida";
  formaPagamento: string;
}

interface ContaReceber extends BaseEntity {
  tipo: "manual" | "nfe" | "pdv";
  nfeNumero?: string;
  nfeChave?: string;
  cliente: string;
  clienteDoc: string;
  descricao: string;
  categoria: string;
  centroCusto: string;
  contaContabil: string;
  dataEmissao: string;
  valorTotal: number;
  parcelas: Parcela[];
  observacao: string;
  status: "aberta" | "recebida" | "parcial" | "vencida" | "cancelada";
  historicoContabil: string;
}

interface BaseEntity {
  id: string;
}

const initialForm: NFeFormData = {
  serie: "1",
  numero: "",
  modelo: "55",
  tipo: "1",
  finalidade: "1",
  ambiente: "2",
  uf: "SP",
  municipio: "São Paulo",
  dataEmissao: new Date().toISOString().split("T")[0],
  dataSaida: new Date().toISOString().split("T")[0],
  horaSaida: new Date().toTimeString().slice(0, 5),
  
  emitenteCnpj: "",
  emitenteRazaoSocial: "",
  emitenteNomeFantasia: "",
  emitenteIe: "",
  emitenteIm: "",
  emitenteCrt: "1",
  emitenteTelefone: "",
  emitenteEmail: "",
  emitenteLogradouro: "",
  emitenteNumero: "",
  emitenteComplemento: "",
  emitenteBairro: "",
  emitenteCep: "",
  emitenteUf: "SP",
  emitenteMunicipio: "São Paulo",
  emitenteCodMunicipio: "3550308",
  
  destCpfCnpj: "",
  destNome: "",
  destIe: "",
  destIsencaoIe: "",
  destTelefone: "",
  destEmail: "",
  destLogradouro: "",
  destNumero: "",
  destComplemento: "",
  destBairro: "",
  destCep: "",
  destUf: "SP",
  destMunicipio: "",
  destCodMunicipio: "",
  destIndicadorIE: "9",
  
  transpModalidadeFrete: "9",
  transpTransportadoraNome: "",
  transpTransportadoraCnpj: "",
  transpTransportadoraIe: "",
  transpTransportadoraEndereco: "",
  transpTransportadoraMunicipio: "",
  transpVeiculoPlaca: "",
  transpVeiculoUf: "",
  transpVolumeQuantidade: "",
  transpVolumeEspecie: "",
  transpVolumeMarca: "",
  transpVolumeNumeracao: "",
  transpVolumePesoLiquido: "",
  transpVolumePesoBruto: "",
  
  pagForma: "0",
  pagTipoIntegracao: "1",
  pagValor: "0",
  
  totalBaseIcms: "0.00",
  totalIcms: "0.00",
  totalIcmsSt: "0.00",
  totalIpi: "0.00",
  totalPis: "0.00",
  totalCofins: "0.00",
  totalProdutos: "0.00",
  totalFrete: "0.00",
  totalSeguro: "0.00",
  totalDesconto: "0.00",
  totalOutros: "0.00",
  totalGeral: "0.00",
  
  informacoesComplementares: "",
  obsFisco: "",
  regimeTributario: "1",
  contabilidadeCnpj: "",
  contabilidadeNome: "",
};

const ufOptions = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const cfopOptions = [
  { value: "5101", label: "5101 - Venda de mercadoria" },
  { value: "5102", label: "5102 - Venda de mercadoria - ST" },
  { value: "5115", label: "5115 - Venda de mercadoria não tributada" },
  { value: "5116", label: "5116 - Venda de mercadoria exempta" },
  { value: "5123", label: "5123 - Venda de mercadoria - ST não tributada" },
  { value: "6101", label: "6101 - Devolução de venda" },
  { value: "6102", label: "6102 - Devolução de venda - ST" },
];

const cstIcmsOptions = [
  { value: "00", label: "00 - Tributada integralmente" },
  { value: "10", label: "10 - Tributada com substituição" },
  { value: "20", label: "20 - Com redução de base de cálculo" },
  { value: "30", label: "30 - Isenta / Não tributada" },
  { value: "40", label: "40 - Imune" },
  { value: "41", label: "41 - Não tributada" },
  { value: "50", label: "50 - Suspensa" },
  { value: "51", label: "51 - Diferimento" },
  { value: "60", label: "60 - ICMS-ST retido" },
  { value: "70", label: "70 - Com redução de base e ST" },
  { value: "90", label: "90 - Outras" },
];

const cstIcmsSnOptions = [
  { value: "101", label: "101 - Tributada pelo SN c/ credit. outra UF" },
  { value: "102", label: "102 - Tributada pelo SN sem credit." },
  { value: "103", label: "103 - Isenta SN" },
  { value: "104", label: "104 - Não tributada SN" },
  { value: "105", label: "105 - Suspensa SN" },
  { value: "106", label: "106 - Diferimento" },
  { value: "107", label: "107 - Outros" },
  { value: "201", label: "201 - Trib. SN ST c/ credit. outra UF" },
  { value: "202", label: "202 - Trib. SN ST sem credit." },
  { value: "203", label: "203 - Isenta SN ST" },
  { value: "204", label: "204 - Não tributada SN ST" },
  { value: "205", label: "205 - Suspensa SN ST" },
  { value: "206", label: "206 - Diferimento SN ST" },
  { value: "207", label: "207 - Outros SN ST" },
  { value: "500", label: "500 - ICMS-ST devolução" },
  { value: "900", label: "900 - Outros" },
];

const produtosMock: Produto[] = [
  { codigo: "PROD001", descricao: "Mouse Sem Fio USB", ncm: "8471.60.53", unidade: "UN", precoVenda: 89.90 },
  { codigo: "PROD002", descricao: "Teclado Mecânico RGB", ncm: "8471.60.52", unidade: "UN", precoVenda: 299.90 },
  { codigo: "PROD003", descricao: "Monitor 24 polegadas LED", ncm: "8528.51.10", unidade: "UN", precoVenda: 899.00 },
  { codigo: "PROD004", descricao: "HD Externo 1TB USB 3.0", ncm: "8471.70.12", unidade: "UN", precoVenda: 299.90 },
  { codigo: "PROD005", descricao: "Pendrive 32GB", ncm: "8523.21.00", unidade: "UN", precoVenda: 49.90 },
  { codigo: "PROD006", descricao: "Notebook 15 pol Core i5", ncm: "8471.30.19", unidade: "UN", precoVenda: 2999.00 },
  { codigo: "PROD007", descricao: "Webcam HD 1080p", ncm: "8525.80.19", unidade: "UN", precoVenda: 199.90 },
  { codigo: "PROD008", descricao: "Fone de Ouvido Bluetooth", ncm: "8518.30.00", unidade: "UN", precoVenda: 149.90 },
  { codigo: "PROD009", descricao: "Mousepad Gamer XL", ncm: "3926.90.90", unidade: "UN", precoVenda: 79.90 },
  { codigo: "PROD010", descricao: "Cabo HDMI 2 metros", ncm: "8544.42.00", unidade: "UN", precoVenda: 39.90 },
];

const clientesMock: Cliente[] = [
  { id: "1", cpfCnpj: "123.456.789-00", nome: "João Silva Santos", telefone: "(11) 99999-1111", email: "joao@email.com", logradouro: "Rua das Flores", numero: "100", complemento: "Apto 1", bairro: "Centro", cep: "01000-000", uf: "SP", municipio: "São Paulo", ie: "123.456.789" },
  { id: "2", cpfCnpj: "98.765.432/0001-10", nome: "Empresa Teste Ltda", telefone: "(11) 3333-4444", email: "contato@empresa.com", logradouro: "Av. Paulista", numero: "1000", complemento: "Sala 50", bairro: "Bela Vista", cep: "01310-100", uf: "SP", municipio: "São Paulo", ie: "456.789.123" },
  { id: "3", cpfCnpj: "111.222.333-44", nome: "Maria Oliveira", telefone: "(21) 98888-7777", email: "maria@email.com", logradouro: "Av. Rio Branco", numero: "50", complemento: "", bairro: "Centro", cep: "20090-000", uf: "RJ", municipio: "Rio de Janeiro", ie: "" },
  { id: "4", cpfCnpj: "55.666.777/0001-88", nome: "Comercial Brasil", telefone: "(31) 3232-5656", email: "vendas@comercial.com", logradouro: "Av. Amazonas", numero: "5000", complemento: "Galpão 2", bairro: "Savassi", cep: "30180-000", uf: "MG", municipio: "Belo Horizonte", ie: "789.654.123" },
  { id: "5", cpfCnpj: "777.888.999-00", nome: "Pedro Santos", telefone: "(41) 97777-6666", email: "pedro@email.com", logradouro: "Rua XV de Novembro", numero: "200", complemento: "", bairro: "Centro", cep: "80020-000", uf: "PR", municipio: "Curitiba", ie: "" },
];

export default function EmissaoNFe() {
  const [form, setForm] = useState<NFeFormData>(initialForm);
  const [items, setItems] = useState<NFeItem[]>([]);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nfeEmitida, setNfeEmitida] = useState<{ numero: string; protocolo: string; dataEmissao: string; chaveAcesso: string; status: string } | null>(null);
  const [emitidaDialogOpen, setEmitidaDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<NFeItem | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("emitente");
  const [cancelamentoDialogOpen, setCancelamentoDialogOpen] = useState(false);
  const [cancelamentoJustificativa, setCancelamentoJustificativa] = useState("");
  const [cceDialogOpen, setCceDialogOpen] = useState(false);
  const [cceCorrecao, setCceCorrecao] = useState("");
  const [emitindo, setEmitindo] = useState(false);
  
  const [contasReceberDialogOpen, setContasReceberDialogOpen] = useState(false);
  const [finNumParcelas, setFinNumParcelas] = useState("1");
  const [finIntervalo, setFinIntervalo] = useState("30");
  const [finVencimento, setFinVencimento] = useState<string>(new Date().toISOString().split("T")[0]);
  const [finParcelasGeradas, setFinParcelasGeradas] = useState<Parcela[]>([]);
  
  const { addItem: addContaReceber } = useLocalStorage<ContaReceber>("contas_receber", []);
  
  const [empresaAtiva, setEmpresaAtiva] = useState<any>(null);
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState<Produto[]>([]);

  const [searchProduto, setSearchProduto] = useState("");
  const [produtoResults, setProdutoResults] = useState<Produto[]>([]);
  const [showProdutoResults, setShowProdutoResults] = useState(false);
  
  const [searchCliente, setSearchCliente] = useState("");
  const [clienteResults, setClienteResults] = useState<Cliente[]>([]);
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [produtoDialogOpen, setProdutoDialogOpen] = useState(false);
  const [clienteSearchTerm, setClienteSearchTerm] = useState("");
  const [produtoSearchTerm, setProdutoSearchTerm] = useState("");
  
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fDate = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: empresaData } = await supabase.from("empresas").select("*").eq("selecionada", true).limit(1).single();
        if (empresaData) {
          setEmpresaAtiva(empresaData);
          const emp = empresaData as any;
          setForm(prev => ({
            ...prev,
            finalidade: emp.finalidade_nfe || "1",
            ambiente: emp.ambiente_nfe || "2",
            emitenteCnpj: emp.cnpj || "",
            emitenteRazaoSocial: emp.razao_social || "",
            emitenteNomeFantasia: emp.nome_fantasia || "",
            emitenteIe: emp.inscricao_estadual || "",
            emitenteIm: emp.inscricao_municipal || "",
            emitenteTelefone: emp.telefone || "",
            emitenteEmail: emp.email || "",
            emitenteLogradouro: emp.endereco || "",
            emitenteNumero: emp.numero || "",
            emitenteComplemento: emp.complemento || "",
            emitenteBairro: emp.bairro || "",
            emitenteCep: emp.cep || "",
            emitenteUf: emp.uf || "SP",
            emitenteMunicipio: emp.cidade || "",
            emitenteCodMunicipio: emp.codigo_cidade || "",
          }));
        }
        const { data: pessoasData } = await supabase.from("pessoas").select("*").order("nome", { ascending: true });
        if (pessoasData) setClientesCadastrados(pessoasData.map((p: any) => ({
          id: p.id, cpfCnpj: p.cpf_cnpj || "", nome: p.nome || "", telefone: p.telefone || "", email: p.email || "",
          logradouro: p.endereco || p.logradouro || "", numero: p.numero || "", complemento: p.complemento || "", bairro: p.bairro || "",
          cep: p.cep || "", uf: p.uf || "", municipio: p.cidade || "", ie: p.inscricao_estadual || ""
        })));
        const { data: produtosData } = await supabase.from("produtos").select("*").order("descricao", { ascending: true });
        if (produtosData) setProdutosCadastrados(produtosData.map((p: any) => ({
          codigo: p.codigo || "", 
          descricao: p.descricao || "", 
          ncm: p.ncm || "", 
          unidade: p.unidade || "UN", 
          precoVenda: p.preco_venda_sugerido || p.venda || p.preco_venda || p.preco_unitario || 0
        })));
      } catch (err) {
        console.warn("Erro ao carregar dados", err);
      }
    };
    loadData();
  }, []);

  const handleChange = useCallback((field: keyof NFeFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Trigger financeiro dialog if payment method is Boleto (9) or Credito Loja (4)
    if (field === "pagForma" && (value === "4" || value === "9")) {
      setContasReceberDialogOpen(true);
    }
  }, []);

  const buscarCnpj = useCallback(async (cnpj: string, tipo: "emitente" | "destinatario") => {
    const limpo = cnpj.replace(/\D/g, "");
    if (limpo.length !== 14 && limpo.length !== 11) {
      toast({ title: "CNPJ/CPF inválido", description: "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos).", variant: "destructive" });
      return;
    }
    setBuscandoCnpj(true);
    try {
      if (limpo.length === 14) {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
        if (!res.ok) throw new Error("CNPJ não encontrado");
        const data = await res.json();
        
        const codIbge = data.codigo_municipio ? String(data.codigo_municipio) : (data.codigo_matriz_filial ? data.codigo_matriz_filial.toString().slice(0, 7) : "3550308");
        
        const logradouro = data.logradouro || data.endereco?.logradouro || "";
        const bairro = data.bairro || data.endereco?.bairro || "";
        const cep = data.cep || data.endereco?.cep || "";
        const municipio = data.municipio || data.endereco?.municipio || "";
        const uf = data.uf || data.endereco?.uf || "SP";
        
        if (tipo === "emitente") {
          setForm(prev => ({
            ...prev,
            emitenteRazaoSocial: data.razao_social || prev.emitenteRazaoSocial,
            emitenteNomeFantasia: data.nome_fantasia || prev.emitenteNomeFantasia,
            emitenteTelefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\D/g, "") : prev.emitenteTelefone,
            emitenteEmail: data.email || prev.emitenteEmail,
            emitenteLogradouro: logradouro,
            emitenteNumero: data.numero || "",
            emitenteComplemento: data.complemento || "",
            emitenteBairro: bairro,
            emitenteCep: cep,
            emitenteUf: uf,
            emitenteMunicipio: municipio,
            emitenteCodMunicipio: codIbge,
          }));
        } else {
          setForm(prev => ({
            ...prev,
            destNome: data.razao_social || data.nome_fantasia || "",
            destTelefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\D/g, "") : "",
            destEmail: data.email || "",
            destLogradouro: logradouro,
            destNumero: data.numero || "",
            destComplemento: data.complemento || "",
            destBairro: bairro,
            destCep: cep,
            destUf: uf,
            destMunicipio: municipio,
            destCodMunicipio: codIbge,
            destIe: data.inscricao_estadual || "",
            destIndicadorIE: "1",
          }));
        }
        toast({ title: "CNPJ encontrado!", description: `${data.razao_social}` });
      } else {
        toast({ title: "CPF", description: "Busca por CPF não disponível na Receita Federal.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro na busca", description: "CNPJ não encontrado na base da Receita Federal.", variant: "destructive" });
    } finally {
      setBuscandoCnpj(false);
    }
  }, [toast]);

  const buscarCep = useCallback(async (cep: string, tipo: "emitente" | "destinatario") => {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${limpo}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      const codIbge = data.ibge || "3550308";
      
      if (tipo === "emitente") {
        setForm(prev => ({
          ...prev,
          emitenteLogradouro: data.street || prev.emitenteLogradouro,
          emitenteBairro: data.neighborhood || prev.emitenteBairro,
          emitenteMunicipio: data.city || prev.emitenteMunicipio,
          emitenteUf: data.state || prev.emitenteUf,
          emitenteCep: data.cep || prev.emitenteCep,
          emitenteCodMunicipio: codIbge,
        }));
      } else {
        setForm(prev => ({
          ...prev,
          destLogradouro: data.street || prev.destLogradouro,
          destBairro: data.neighborhood || prev.destBairro,
          destMunicipio: data.city || prev.destMunicipio,
          destUf: data.state || prev.destUf,
          destCep: data.cep || prev.destCep,
          destCodMunicipio: codIbge,
        }));
      }
      toast({ title: "CEP encontrado!", description: `${data.street}, ${data.city}/${data.state}` });
    } catch {
      toast({ title: "CEP não encontrado", variant: "destructive" });
    } finally {
      setBuscandoCep(false);
    }
  }, [toast]);

  const searchProdutos = useCallback((query: string) => {
    setSearchProduto(query);
    if (query.length >= 2) {
      const results = produtosCadastrados.filter(p => 
        (p.codigo || "").toLowerCase().includes(query.toLowerCase()) ||
        (p.descricao || "").toLowerCase().includes(query.toLowerCase())
      );
      setProdutoResults(results);
      setShowProdutoResults(true);
    } else {
      setShowProdutoResults(false);
    }
  }, [produtosCadastrados]);

  const selectProduto = useCallback((produto: Produto) => {
    const novoItem: NFeItem = {
      id: Date.now().toString(),
      codigo: produto.codigo,
      descricao: produto.descricao,
      ncm: produto.ncm || "",
      cfop: "5101",
      unidade: produto.unidade || "UN",
      quantidade: 1,
      valorUnitario: produto.precoVenda || 0,
      valorTotal: produto.precoVenda || 0,
      ipi: 0,
      ipiAliquota: 0,
      icms: (produto.precoVenda || 0) * 0.18,
      icmsAliquota: 18,
      icmsDesonado: 0,
      icmsMotivoDesonercacao: "",
      fcp: 0,
      fcpAliquota: 0,
      pis: (produto.precoVenda || 0) * 0.0165,
      cofins: (produto.precoVenda || 0) * 0.076,
      cst: "00",
      cest: "",
    };
    setItems(prev => [...prev, novoItem]);
    setSearchProduto("");
    setShowProdutoResults(false);
    toast({ title: "Produto adicionado", description: produto.descricao });
  }, [toast]);

  const searchClientes = useCallback((query: string) => {
    setSearchCliente(query);
    setClienteSearchTerm(query);
    if (query.length >= 2) {
      const results = clientesCadastrados.filter(c => 
        (c.cpfCnpj || "").includes(query) ||
        (c.nome || "").toLowerCase().includes(query.toLowerCase())
      );
      setClienteResults(results);
      setShowClienteResults(true);
    } else {
      setShowClienteResults(false);
    }
  }, [clientesCadastrados]);

  const selectCliente = useCallback((cliente: Cliente) => {
    setForm(prev => ({
      ...prev,
      destCpfCnpj: cliente.cpfCnpj,
      destNome: cliente.nome,
      destIe: cliente.ie,
      destTelefone: cliente.telefone,
      destEmail: cliente.email,
      destLogradouro: cliente.logradouro,
      destNumero: cliente.numero,
      destComplemento: cliente.complemento,
      destBairro: cliente.bairro,
      destCep: cliente.cep,
      destUf: cliente.uf,
      destMunicipio: cliente.municipio,
      destIndicadorIE: cliente.ie ? "1" : "9",
    }));
    setSearchCliente("");
    setShowClienteResults(false);
    toast({ title: "Cliente selecionado", description: cliente.nome });
  }, [toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      const isInputField = tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.key === "F2" && !clienteDialogOpen) {
        if (isInputField) {
          e.preventDefault();
        }
        setClienteDialogOpen(true);
      }
      if (e.key === "F3" && !produtoDialogOpen) {
        if (isInputField) {
          e.preventDefault();
        }
        const searchInput = document.getElementById("search-produto-input");
        if (searchInput) {
          searchInput.focus();
        }
        setProdutoDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clienteDialogOpen, produtoDialogOpen]);

  const adicionarItem = useCallback(() => {
    setProdutoDialogOpen(true);
  }, []);

  const atualizarItem = useCallback((item: NFeItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? item : i));
    setItemDialogOpen(false);
    setEditItem(null);
  }, []);

  const removerItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const duplicarItem = useCallback((item: NFeItem) => {
    const novoItem: NFeItem = {
      ...item,
      id: Date.now().toString(),
    };
    setItems(prev => [...prev, novoItem]);
  }, []);

  const calcularTotais = useCallback(() => {
    let totalProdutos = 0;
    let totalIcms = 0;
    let totalPis = 0;
    let totalCofins = 0;
    let totalIpi = 0;
    let baseIcms = 0;

    items.forEach(item => {
      totalProdutos += item.valorTotal;
      totalIcms += item.icms;
      totalPis += item.pis;
      totalCofins += item.cofins;
      totalIpi += item.ipi;
      baseIcms += item.valorTotal;
    });

    const totalGeral = totalProdutos + 
      parseFloat(form.totalFrete || "0") + 
      parseFloat(form.totalSeguro || "0") + 
      parseFloat(form.totalOutros || "0") - 
      parseFloat(form.totalDesconto || "0");

    setForm(prev => ({
      ...prev,
      totalProdutos: totalProdutos.toFixed(2),
      totalIcms: totalIcms.toFixed(2),
      totalPis: totalPis.toFixed(2),
      totalCofins: totalCofins.toFixed(2),
      totalIpi: totalIpi.toFixed(2),
      totalBaseIcms: baseIcms.toFixed(2),
      totalGeral: totalGeral.toFixed(2),
    }));
  }, [items, form.totalFrete, form.totalSeguro, form.totalOutros, form.totalDesconto]);

  useEffect(() => {
    calcularTotais();
  }, [items, calcularTotais]);

  const handleEmitir = useCallback(async () => {
    if (!form.emitenteCnpj || !form.emitenteRazaoSocial) {
      toast({ title: "Dados do Emitente", description: "Preencha CNPJ e Razão Social do emitente.", variant: "destructive" });
      return;
    }
    if (!form.destCpfCnpj || !form.destNome) {
      toast({ title: "Dados do Destinatário", description: "Preencha CPF/CNPJ e nome do destinatário.", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "Itens da NF-e", description: "Adicione pelo menos um item na nota.", variant: "destructive" });
      return;
    }

    setEmitindo(true);
    
    try {
      const { xml, chaveAcesso } = gerarXmlNFeBruto(form, items, { parcelas: finParcelasGeradas });
      const { base64: certificadoBase64 = "", senha: certificadoSenha = "" } = empresaAtiva?.certificado || {};
      
      // Use 127.0.0.1 if walking on localhost to avoid some DNS issues, otherwise use hostname
      const host = (window.location.hostname === 'localhost') ? '127.0.0.1' : window.location.hostname;
      const backendUrl = `http://${host}:3001/api/sefaz/emitir`;

      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xmlBruto: xml,
          ambiente: form.ambiente,
          uf: form.uf,
          chaveAcesso,
          certificadoBase64,
          certificadoSenha 
        })
      });

      const data = await response.json();
      if (!response.ok || data.erro) throw new Error(data.erro || "Falha na comunicação com o Servidor Fiscal (Backend).");

      const protocolo = data.protocolo || String(Date.now()).slice(-15);
      const xmlAssinado = data.xmlAssinado || xml;

      setNfeEmitida({ 
        numero: form.numero || "1", 
        protocolo, 
        dataEmissao: new Date().toLocaleString("pt-BR"),
        chaveAcesso,
        status: data.mensagem || "100 - Autorizado o uso da NF-e"
      });
      
      setEmitidaDialogOpen(true);
      toast({ title: "NF-e Emitida!", description: `NF-e ${chaveAcesso} autorizada. Prot: ${protocolo}` });

      const blob = new Blob([xmlAssinado], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NFe${chaveAcesso}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        const printBtn = document.getElementById("btn-print-nfe");
        if (printBtn) printBtn.click();
      }, 500);

      // Salvar XML no banco de dados
      try {
        await supabase.from("xml_fiscais").insert({
          empresa_id: empresaAtiva?.id,
          chave_acesso: chaveAcesso,
          numero: form.numero || "1",
          serie: form.serie || "1",
          tipo_documento: "NF-e",
          status_sefaz: "autorizado",
          status_processamento: "processado",
          data_emissao: new Date().toISOString(),
          data_importacao: new Date().toISOString(),
          emitente_cnpj: form.emitenteCnpj,
          emitente_razao: form.emitenteRazaoSocial,
          emitente_fantasia: form.emitenteNomeFantasia,
          emitente_uf: form.uf,
          destinatario_cnpj: form.destCpfCnpj,
          destinatario_razao: form.destNome,
          valor_total: Number(form.totalGeral) || 0,
          valor_produtos: Number(form.totalProdutos) || 0,
          valor_icms: Number(form.totalIcms) || 0,
          valor_ipi: Number(form.totalIpi) || 0,
          valor_pis: Number(form.totalPis) || 0,
          valor_cofins: Number(form.totalCofins) || 0,
          valor_frete: Number(form.totalFrete) || 0,
          valor_desconto: Number(form.totalDesconto) || 0,
          xml_bruto: xmlAssinado,
          dados_processados: {
            itens: items.map((item: any) => ({
              codigo_produto: item.codigo,
              descricao: item.descricao,
              ncm: item.ncm,
              cfop: item.cfop,
              quantidade: item.quantidade,
              valor_unitario: item.valorUnitario,
              valor_total: item.valorTotal,
              cst_icms: item.cstIcms,
              aliq_icms: item.aliqIcms,
              valor_icms: item.valorIcms,
              cst_pis: item.cstPis,
              aliq_pis: item.aliqPis,
              valor_pis: item.valorPis,
              cst_cofins: item.cstCofins,
              aliq_cofins: item.aliqCofins,
              valor_cofins: item.valorCofins,
            })),
            natOp: "VENDA MERCADORIA",
            infAdicionais: form.informacoesComplementares || "",
          },
        });
        console.log("XML da NF-e salvo no banco de dados");
      } catch (saveError) {
        console.error("Erro ao salvar XML no banco:", saveError);
      }

    } catch (err: any) {
      toast({ title: "Rejeição SEFAZ / Erro HTTP", description: err.message || "Erro ao emitir", variant: "destructive" });
    } finally {
      setEmitindo(false);
    }
  }, [form, items, empresaAtiva, toast]);

    const handleSalvarRascunho = useCallback(() => {
    toast({ title: "Rascunho Salvo", description: "NF-e salva como rascunho." });
  }, [toast]);

  const handleNovaNota = useCallback(() => {
    // Increment note number locally for the next one
    const nextNum = String(Number(form.numero || "0") + 1);
    
    // Reset form but keep emitente and some basic settings
    setForm(prev => ({
      ...initialForm,
      numero: nextNum,
      serie: prev.serie,
      ambiente: prev.ambiente,
      emitenteCnpj: prev.emitenteCnpj,
      emitenteRazaoSocial: prev.emitenteRazaoSocial,
      emitenteNomeFantasia: prev.emitenteNomeFantasia,
      emitenteIe: prev.emitenteIe,
      emitenteIm: prev.emitenteIm,
      emitenteCrt: prev.emitenteCrt,
      emitenteTelefone: prev.emitenteTelefone,
      emitenteEmail: prev.emitenteEmail,
      emitenteLogradouro: prev.emitenteLogradouro,
      emitenteNumero: prev.emitenteNumero,
      emitenteComplemento: prev.emitenteComplemento,
      emitenteBairro: prev.emitenteBairro,
      emitenteCep: prev.emitenteCep,
      emitenteUf: prev.emitenteUf,
      emitenteMunicipio: prev.emitenteMunicipio,
      emitenteCodMunicipio: prev.emitenteCodMunicipio,
    }));
    
    setItems([]);
    setNfeEmitida(null);
    setEmitidaDialogOpen(false);
    setActiveTab("destinatario"); // Go to recipient for the next note
    
    toast({ title: "Nova Nota", description: "Formulário resetado para a próxima emissão." });
  }, [form.numero, toast]);

  const handlePrint = useCallback((autoPrint = true) => {
    const num = nfeEmitida?.numero || form.numero || '000';
    const chave = nfeEmitida?.chaveAcesso || '00000000000000000000000000000000000000000000';
    
    // Formatting helper
    const fDt = (val: string) => val ? val.split('-').reverse().join('/') : '';
    const fCur = (val: string|number) => Number(val).toFixed(2).replace('.', ',');

    const getPagamentoLabel = (forma: string) => {
      const labels: Record<string, string> = {
        "0": "DINHEIRO", "1": "CHEQUE", "2": "CARTÃO DE CRÉDITO", "3": "CARTÃO DE DÉBITO",
        "4": "CRÉDITO LOJA", "5": "VALE ALIMENTAÇÃO", "6": "VALE REFEIÇÃO", "7": "VALE PRESENTE",
        "8": "VALE COMBUSTÍVEL", "9": "BOLETO BANCÁRIO", "10": "DEPÓSITO BANCÁRIO",
        "11": "PIX", "12": "TRANSFERÊNCIA", "13": "COUPON", "14": "OUTROS"
      };
      return labels[forma] || "OUTROS";
    };

    const content = `
      <div style="font-family: Arial, sans-serif; font-size: 8px; width: 100%; max-width: 800px; margin: 0 auto; color: #000; box-sizing: border-box;">
        
        <!-- RECIBO -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
          <tr>
            <td colspan="2" style="border: 1px solid #000; padding: 2px 4px; font-size: 8px;">
              RECEBEMOS DE ${form.emitenteRazaoSocial} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: ${fDt(form.dataEmissao)} VALOR TOTAL: R$ ${fCur(form.totalGeral)} DESTINATÁRIO: ${form.destNome}
            </td>
            <td rowspan="2" style="border: 1px solid #000; width: 150px; text-align: center; font-size: 16px; font-weight: bold; vertical-align: middle;">
              NF-e<br/>
              <span style="font-size: 11px; font-weight: normal;">Nº. ${num}</span><br/>
              <span style="font-size: 11px; font-weight: normal;">Série ${form.serie}</span>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 120px;">
              <div style="font-size: 6px;">DATA DE RECEBIMENTO</div>
              <div style="height: 15px;"></div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
              <div style="height: 15px;"></div>
            </td>
          </tr>
        </table>

        <!-- HEADER EMITENTE / DANFE / CHAVE -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr>
            <td rowspan="3" style="border: 1px solid #000; padding: 4px; width: 40%; vertical-align: top;">
              <div style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">${form.emitenteRazaoSocial}</div>
              <div style="font-size: 9px; line-height: 1.2; text-align: center;">
                ${form.emitenteLogradouro}, ${form.emitenteNumero} ${form.emitenteComplemento}<br/>
                ${form.emitenteBairro} - ${form.emitenteCep}<br/>
                ${form.emitenteMunicipio} - ${form.emitenteUf}<br/>
                Fone/Fax: ${form.emitenteTelefone}
              </div>
            </td>
            <td rowspan="3" style="border: 1px solid #000; padding: 4px; width: 20%; text-align: center; vertical-align: top;">
              <div style="font-size: 16px; font-weight: bold;">DANFE</div>
              <div style="font-size: 8px; margin-bottom: 5px;">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</div>
              <div style="text-align: left; font-size: 9px; margin-left: 5px;">
                0 - ENTRADA<br/>
                1 - SAÍDA
              </div>
              <div style="float: right; border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 12px; margin-top: -15px; margin-right: 5px;">
                ${form.tipo}
              </div>
              <div style="margin-top: 10px; font-size: 10px; font-weight: bold;">
                Nº. ${num}<br/>
                SÉRIE ${form.serie}<br/>
                Folha 1/1
              </div>
            </td>
            <td style="border: 1px solid #000; padding: 4px; padding-bottom: 0; width: 40%; text-align: center; vertical-align: top;">
              <div style="font-size: 6px; text-align: left;">CHAVE DE ACESSO</div>
              <img src="https://barcodeapi.org/api/128/${chave}" style="width: 90%; height: 35px; margin-top: 2px;"/>
              <div style="text-align: center; font-size: 9px; font-weight: bold; letter-spacing: 0.5px; margin-top: 2px;">
                ${chave.replace(/(\d{4})/g, '$1 ')}
              </div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 4px; text-align: center;">
              <div style="font-size: 8px;">
                Consulta de autenticidade no portal nacional da NF-e<br/>
                www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
              </div>
            </td>
          </tr>
        </table>

        <!-- NATUREZA DA OPERAÇÃO / PROTOCOLO -->
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 60%;">
              <div style="font-size: 6px;">NATUREZA DA OPERAÇÃO</div>
              <div style="font-size: 9px; font-weight: bold; text-transform: uppercase;">Venda de mercadoria</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 40%;">
              <div style="font-size: 6px;">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
              <div style="font-size: 9px; font-weight: bold;">${nfeEmitida?.protocolo || ''} - ${nfeEmitida?.dataEmissao || ''}</div>
            </td>
          </tr>
        </table>

        <!-- INSCRIÇÃO ESTADUAL / IE SUBST / CNPJ -->
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 33%;">
              <div style="font-size: 6px;">INSCRIÇÃO ESTADUAL</div>
              <div style="font-size: 9px; font-weight: bold;">${form.emitenteIe}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 33%;">
              <div style="font-size: 6px;">INSC. ESTADUAL DO SUBST. TRIBUTÁRIO</div>
              <div style="font-size: 9px; font-weight: bold;"></div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 34%;">
              <div style="font-size: 6px;">CNPJ</div>
              <div style="font-size: 9px; font-weight: bold;">${form.emitenteCnpj}</div>
            </td>
          </tr>
        </table>

        <!-- DESTINATÁRIO -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px;">DESTINATÁRIO / REMETENTE</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 60%;">
              <div style="font-size: 6px;">NOME / RAZÃO SOCIAL</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destNome}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 25%;">
              <div style="font-size: 6px;">CNPJ / CPF</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destCpfCnpj}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">DATA DA EMISSÃO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${fDt(form.dataEmissao)}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 45%;">
              <div style="font-size: 6px;">ENDEREÇO</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destLogradouro}, ${form.destNumero}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 25%;">
              <div style="font-size: 6px;">BAIRRO / DISTRITO</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destBairro}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">CEP</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.destCep}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">DATA DA SAÍDA</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${fDt(form.dataSaida)}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 45%;">
              <div style="font-size: 6px;">MUNICÍPIO</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destMunicipio}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 5%;">
              <div style="font-size: 6px;">UF</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.destUf}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 20%;">
              <div style="font-size: 6px;">FONE / FAX</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destTelefone}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">INSCRIÇÃO ESTADUAL</div>
              <div style="font-size: 9px; font-weight: bold;">${form.destIe}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">HORA DA SAÍDA</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.horaSaida}</div>
            </td>
          </tr>
        </table>

        <!-- CÁLCULO DO IMPOSTO -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px;">CÁLCULO DO IMPOSTO</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">BASE DE CÁLCULO DO ICMS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalBaseIcms)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DO ICMS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalIcms)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">BASE DE CÁLC. ICMS S.T.</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">0,00</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DO ICMS SUBST.</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">0,00</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR IMP. IMPORT.</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">0,00</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DO PIS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalPis)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR TOTAL DOS PRODUTOS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalProdutos)}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DO FRETE</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalFrete)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DO SEGURO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalSeguro)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">DESCONTO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalDesconto)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">OUTRAS DESPESAS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalOutros)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR TOTAL DO IPI</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalIpi)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR DA COFINS</div>
              <div style="font-size: 9px; font-weight: bold; text-align: right;">${fCur(form.totalCofins)}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">VALOR TOTAL DA NOTA</div>
              <div style="font-size: 11px; font-weight: bold; text-align: right;">${fCur(form.totalGeral)}</div>
            </td>
          </tr>
        </table>

        <!-- FATURA / DUPLICATAS -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px;">FATURA / DUPLICATAS</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; min-height: 20px;">
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${finParcelasGeradas.length > 0
                  ? finParcelasGeradas.map(p => `
                    <div style="border: 1px solid #ccc; padding: 2px 5px; min-width: 100px; margin-bottom: 2px;">
                      <div style="font-size: 6px;">NÚMERO / VENC. / VALOR</div>
                      <div style="font-size: 8px; font-weight: bold;">${p.numero} - ${fDate(p.vencimento)} - ${fCur(p.valor)}</div>
                    </div>
                  `).join('')
                  : `<div style="font-size: 9px; padding: 5px;">PAGAMENTO À VISTA - TOTAL: ${fCur(form.totalGeral)}</div>`
                }
              </div>
            </td>
          </tr>
        </table>

        <!-- TRANSPORTADOR -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px;">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 40%;">
              <div style="font-size: 6px;">NOME / RAZÃO SOCIAL</div>
              <div style="font-size: 9px; font-weight: bold;">${form.transpTransportadoraNome || (form.transpModalidadeFrete === "3" ? form.emitenteRazaoSocial : 'O MESMO')}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">FRETE POR CONTA</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpModalidadeFrete === "9" ? "(9) Sem Frete" : form.transpModalidadeFrete}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">CÓDIGO ANTT</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;"></div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 10%;">
              <div style="font-size: 6px;">PLACA DO VEÍCULO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVeiculoPlaca}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 5%;">
              <div style="font-size: 6px;">UF</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVeiculoUf}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 15%;">
              <div style="font-size: 6px;">CNPJ / CPF</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpTransportadoraCnpj || (form.transpModalidadeFrete === "3" ? form.emitenteCnpj : '')}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 45%;">
              <div style="font-size: 6px;">ENDEREÇO</div>
              <div style="font-size: 9px; font-weight: bold;">${form.transpTransportadoraEndereco}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 25%;">
              <div style="font-size: 6px;">MUNICÍPIO</div>
              <div style="font-size: 9px; font-weight: bold;">${form.transpTransportadoraMunicipio}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 5%;">
              <div style="font-size: 6px;">UF</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;"></div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px; width: 25%;">
              <div style="font-size: 6px;">INSCRIÇÃO ESTADUAL</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpTransportadoraIe}</div>
            </td>
          </tr>
        </table>
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
          <tr>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">QUANTIDADE</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumeQuantidade || '1'}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">ESPÉCIE</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumeEspecie || 'VOL'}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">MARCA</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumeMarca || ''}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">NUMERAÇÃO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumeNumeracao || ''}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">PESO BRUTO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumePesoBruto || '0,000'}</div>
            </td>
            <td style="border: 1px solid #000; padding: 2px 4px;">
              <div style="font-size: 6px;">PESO LÍQUIDO</div>
              <div style="font-size: 9px; font-weight: bold; text-align: center;">${form.transpVolumePesoLiquido || '0,000'}</div>
            </td>
          </tr>
        </table>

        <!-- PRODUTOS -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 4px; margin-bottom: 1px;">DADOS DOS PRODUTOS / SERVIÇOS</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 7px;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 2px;">CÓDIGO<br/>PRODUTO</th>
              <th style="border: 1px solid #000; padding: 2px;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
              <th style="border: 1px solid #000; padding: 2px;">NCM/SH</th>
              <th style="border: 1px solid #000; padding: 2px;">CST</th>
              <th style="border: 1px solid #000; padding: 2px;">CFOP</th>
              <th style="border: 1px solid #000; padding: 2px;">UN</th>
              <th style="border: 1px solid #000; padding: 2px;">QUANT</th>
              <th style="border: 1px solid #000; padding: 2px;">VALOR<br/>UNIT</th>
              <th style="border: 1px solid #000; padding: 2px;">VALOR<br/>TOTAL</th>
              <th style="border: 1px solid #000; padding: 2px;">B.CALC<br/>ICMS</th>
              <th style="border: 1px solid #000; padding: 2px;">VALOR<br/>ICMS</th>
              <th style="border: 1px solid #000; padding: 2px;">VALOR<br/>IPI</th>
              <th style="border: 1px solid #000; padding: 2px;">ALIQ.<br/>ICMS</th>
              <th style="border: 1px solid #000; padding: 2px;">ALIQ.<br/>IPI</th>
            </tr>
          </thead>
          <tbody style="border-bottom: 1px solid #000;">
            ${items.map(item => `
              <tr>
                <td style="border-right: 1px dashed #000; border-left: 1px solid #000; padding: 2px 4px;">${item.codigo}</td>
                <td style="border-right: 1px dashed #000; padding: 2px 4px;">${item.descricao}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: center;">${item.ncm.replace(/\D/g, '')}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: center;">${item.cst}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: center;">${item.cfop}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: center;">${item.unidade}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${item.quantidade.toFixed(4).replace('.', ',')}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.valorUnitario)}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.valorTotal)}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.valorTotal)}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.icms)}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.ipi)}</td>
                <td style="border-right: 1px dashed #000; padding: 2px; text-align: right;">${fCur(item.icmsAliquota)}</td>
                <td style="border-right: 1px solid #000; padding: 2px; text-align: right;">${fCur(item.ipiAliquota)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- DADOS ADICIONAIS -->
        <div style="font-size: 7px; font-weight: bold; margin-top: 5px; margin-bottom: 2px;">DADOS ADICIONAIS</div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 1px solid #000; padding: 4px; width: 70%; vertical-align: top; height: 80px;">
              <div style="font-size: 6px;">INFORMAÇÕES COMPLEMENTARES</div>
              <div style="font-size: 8px;">
                FORMA DE PAGAMENTO: ${getPagamentoLabel(form.pagForma)}<br/>
                ${form.informacoesComplementares}<br/>
                ${form.obsFisco}
              </div>
            </td>
            <td style="border: 1px solid #000; padding: 4px; width: 30%; vertical-align: top;">
              <div style="font-size: 6px;">RESERVADO AO FISCO</div>
            </td>
          </tr>
        </table>
        
        ${form.ambiente === "2" ? '<div class="watermark">SEM VALOR FISCAL<br/>AMBIENTE DE HOMOLOGAÇÃO</div>' : ''}
      </div>
    `;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>DANFE - NF-e ${num}</title>
    <style>
      body { margin: 0; background: #525659; display: flex; justify-content: center; padding: 20px; font-family: Arial, sans-serif; }
      .page { 
        background: white; 
        width: 210mm; 
        min-height: 297mm; 
        padding: 10mm; 
        box-shadow: 0 0 15px rgba(0,0,0,0.5); 
        position: relative;
        box-sizing: border-box;
      }
      .no-print-header {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 50px;
        background: #323639;
        display: flex;
        align-items: center;
        padding: 0 20px;
        z-index: 2000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      }
      .btn-print {
        background: #2563eb;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 13px;
      }
      .btn-print:hover { background: #1d4ed8; }

      @media print { 
        @page { size: A4 portrait; margin: 0; } 
        body { background: white; padding: 0; display: block; }
        .page { box-shadow: none; padding: 5mm; width: 100%; border: none; }
        .no-print-header { display: none; }
      }
      .watermark {
        position: absolute;
        top: 450px;
        left: 0;
        right: 0;
        font-size: 50px;
        color: rgba(150, 150, 150, 0.2);
        z-index: 1000;
        text-align: center;
        pointer-events: none;
        font-family: 'Times New Roman', serif;
        transform: rotate(-30deg);
        line-height: 1.2;
      }
    </style>
    </head>
    <body style="margin-top: 60px;">
      <div class="no-print-header">
        <button class="btn-print" onclick="window.print()">Imprimir DANFE (PDF)</button>
        <span style="color: white; margin-left: 20px; font-size: 14px;">NF-e nº ${num}</span>
      </div>
      <div class="page">${content}</div>
    </body>
    </html>`);
    win.document.close();
    if (autoPrint) {
      setTimeout(() => win.print(), 800);
    }
  }, [form, items, nfeEmitida]);

  const handleEnviarEmail = useCallback(() => {
    toast({ title: "E-mail enviado", description: "NF-e enviada por e-mail ao destinatário." });
  }, [toast]);

  const ambienteCor = form.ambiente === "1" 
    ? "bg-green-600 hover:bg-green-700 border-green-600" 
    : "bg-orange-500 hover:bg-orange-600 border-orange-500";

  return (
    <div className="page-container">
      <PageHeader 
        title="Emissão de NF-e" 
        description="Nota Fiscal Eletrônica — Modelo 55" 
      />

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Badge variant="outline">Modelo 55</Badge>
        <Badge variant="outline">NF-e</Badge>
        <Badge className={`${form.ambiente === "1" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"} text-white border-none`}>
          {form.ambiente === "1" ? "🟢 Produção" : "🟠 Homologação"}
        </Badge>
        <Badge variant={form.tipo === "1" ? "default" : "destructive"}>
          {form.tipo === "1" ? "Saída" : "Entrada"}
        </Badge>
        <Badge variant="outline" className="text-xs">
          F2 = Buscar Cliente (no destinatário) | F3 = Buscar Produto (na lista)
        </Badge>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label>Série</Label>
              <Input value={form.serie} onChange={e => handleChange("serie", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número da Nota</Label>
              <Input value={form.numero} onChange={e => handleChange("numero", e.target.value)} placeholder="000" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={form.modelo} disabled />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => handleChange("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Saída</SelectItem>
                  <SelectItem value="0">0 - Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dat. Emissão</Label>
              <Input type="date" value={form.dataEmissao} onChange={e => handleChange("dataEmissao", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dat. Saída</Label>
              <Input type="date" value={form.dataSaida} onChange={e => handleChange("dataSaida", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora Saída</Label>
              <Input type="time" value={form.horaSaida} onChange={e => handleChange("horaSaida", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto">
          <TabsTrigger value="emitente" className="gap-1 py-2"><Building2 size={14} />Emitente</TabsTrigger>
          <TabsTrigger value="destinatario" className="gap-1"><User size={14} />Destinatário</TabsTrigger>
          <TabsTrigger value="produtos" className="gap-1"><Package size={14} />Produtos</TabsTrigger>
          <TabsTrigger value="transporte" className="gap-1"><Truck size={14} />Transporte</TabsTrigger>
          <TabsTrigger value="pagamento" className="gap-1"><CreditCard size={14} />Pagamento</TabsTrigger>
          <TabsTrigger value="informacoes" className="gap-1"><Calculator size={14} />Info. Adicionais</TabsTrigger>
        </TabsList>

        <TabsContent value="emitente">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emitente</CardTitle>
              <CardDescription>Dados do estabelecimento emissor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={form.emitenteCnpj} 
                      onChange={e => handleChange("emitenteCnpj", e.target.value)} 
                      placeholder="00.000.000/0000-00" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => buscarCnpj(form.emitenteCnpj, "emitente")}
                      disabled={buscandoCnpj}
                    >
                      {buscandoCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.emitenteRazaoSocial} onChange={e => handleChange("emitenteRazaoSocial", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.emitenteNomeFantasia} onChange={e => handleChange("emitenteNomeFantasia", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inscrição Estadual</Label>
                    <Input value={form.emitenteIe} onChange={e => handleChange("emitenteIe", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Inscrição Municipal</Label>
                    <Input value={form.emitenteIm} onChange={e => handleChange("emitenteIm", e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.emitenteTelefone} onChange={e => handleChange("emitenteTelefone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.emitenteEmail} onChange={e => handleChange("emitenteEmail", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.emitenteLogradouro} onChange={e => handleChange("emitenteLogradouro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.emitenteNumero} onChange={e => handleChange("emitenteNumero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.emitenteComplemento} onChange={e => handleChange("emitenteComplemento", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input value={form.emitenteCep} onChange={e => handleChange("emitenteCep", e.target.value)} placeholder="00000-000" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => buscarCep(form.emitenteCep, "emitente")}
                      disabled={buscandoCep}
                    >
                      {buscandoCep ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.emitenteBairro} onChange={e => handleChange("emitenteBairro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input value={form.emitenteMunicipio} onChange={e => handleChange("emitenteMunicipio", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select value={form.emitenteUf} onValueChange={v => handleChange("emitenteUf", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ufOptions.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DESTINATÁRIO */}
        <TabsContent value="destinatario">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Destinatário</CardTitle>
              <CardDescription>Dados do cliente/recebedor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Label>Buscar Cliente (F2)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="search-cliente-input"
                    value={searchCliente}
                    onChange={e => searchClientes(e.target.value)}
                    placeholder="Digite nome ou CPF/CNPJ do cliente..."
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Search size={16} />
                  </Button>
                </div>
                {showClienteResults && clienteResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {clienteResults.map(cliente => (
                      <div 
                        key={cliente.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => selectCliente(cliente)}
                      >
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {cliente.cpfCnpj} - {cliente.municipio}/{cliente.uf}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CPF/CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="dest-cpfcnpj-input"
                      value={form.destCpfCnpj} 
                      onChange={e => handleChange("destCpfCnpj", e.target.value)} 
                      placeholder="CPF ou CNPJ" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => buscarCnpj(form.destCpfCnpj, "destinatario")}
                      disabled={buscandoCnpj}
                    >
                      {buscandoCnpj ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome/Razão Social *</Label>
                  <Input id="dest-nome-input" value={form.destNome} onChange={e => handleChange("destNome", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Indicador IE</Label>
                  <Select value={form.destIndicadorIE} onValueChange={v => handleChange("destIndicadorIE", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Contribuinte ICMS</SelectItem>
                      <SelectItem value="2">2 - Contribuiente Isento</SelectItem>
                      <SelectItem value="9">9 - Não contribuinte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Inscrição Estadual</Label>
                  <Input value={form.destIe} onChange={e => handleChange("destIe", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.destTelefone} onChange={e => handleChange("destTelefone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.destEmail} onChange={e => handleChange("destEmail", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.destLogradouro} onChange={e => handleChange("destLogradouro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.destNumero} onChange={e => handleChange("destNumero", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.destComplemento} onChange={e => handleChange("destComplemento", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input value={form.destCep} onChange={e => handleChange("destCep", e.target.value)} placeholder="00000-000" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => buscarCep(form.destCep, "destinatario")}
                      disabled={buscandoCep}
                    >
                      {buscandoCep ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.destBairro} onChange={e => handleChange("destBairro", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Município</Label>
                  <Input value={form.destMunicipio} onChange={e => handleChange("destMunicipio", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select value={form.destUf} onValueChange={v => handleChange("destUf", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ufOptions.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUTOS */}
        <TabsContent value="produtos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Itens da NF-e</CardTitle>
                <CardDescription>Produtos/serviços comercializados</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Input 
                    id="search-produto-input"
                    value={searchProduto}
                    onChange={e => searchProdutos(e.target.value)}
                    placeholder="Buscar produto (F3)..."
                  />
                  {showProdutoResults && produtoResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {produtoResults.map(produto => (
                        <div 
                          key={produto.codigo}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => selectProduto(produto)}
                        >
                          <div className="font-medium">{produto.descricao}</div>
                          <div className="text-sm text-muted-foreground">
                            {produto.codigo} - R$ {produto.precoVenda.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button onClick={adicionarItem} size="sm" className="gap-1">
                  <Plus size={14} /> Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>Nenhum item adicionado</p>
                  <p className="text-sm">Use F3 ou digite para buscar produtos</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>NCM</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Vl. Unit.</TableHead>
                      <TableHead className="text-right">Vl. Total</TableHead>
                      <TableHead className="text-right">ICMS</TableHead>
                      <TableHead className="w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.codigo}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.descricao}</TableCell>
                        <TableCell>{item.ncm}</TableCell>
                        <TableCell>{item.cfop}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">R$ {item.valorUnitario.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {item.valorTotal.toFixed(2)}</TableCell>
                        <TableCell className="text-right">R$ {item.icms.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditItem(item); setItemDialogOpen(true); }}>
                              <Pencil size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicarItem(item)}>
                              <Copy size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removerItem(item.id)}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Totais */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Base ICMS</p>
                  <p className="font-bold">R$ {form.totalBaseIcms}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor ICMS</p>
                  <p className="font-bold">R$ {form.totalIcms}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor PIS</p>
                  <p className="font-bold">R$ {form.totalPis}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor COFINS</p>
                  <p className="font-bold">R$ {form.totalCofins}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Valor IPI</p>
                  <p className="font-bold">R$ {form.totalIpi}</p>
                </div>
                <div className={`text-center p-3 rounded-lg border-2 ${form.ambiente === "1" ? "bg-green-100 border-green-500" : "bg-orange-100 border-orange-500"}`}>
                  <p className={`text-xs ${form.ambiente === "1" ? "text-green-700" : "text-orange-700"}`}>Total NF-e</p>
                  <p className={`font-black text-lg ${form.ambiente === "1" ? "text-green-700" : "text-orange-700"}`}>R$ {form.totalGeral}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSPORTE */}
        <TabsContent value="transporte">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transporte</CardTitle>
              <CardDescription>Dados do transporte e entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modalidade de Frete</Label>
                  <Select value={form.transpModalidadeFrete} onValueChange={v => handleChange("transpModalidadeFrete", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Frete por conta do remetente (CIF)</SelectItem>
                      <SelectItem value="1">1 - Frete por conta do destinatário (FOB)</SelectItem>
                      <SelectItem value="2">2 - Frete por conta de terceiros</SelectItem>
                      <SelectItem value="3">3 - Transporte próprio por conta do remetente</SelectItem>
                      <SelectItem value="4">4 - Transporte próprio por conta do destinatário</SelectItem>
                      <SelectItem value="9">9 - Sem frete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Transportadora</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={form.transpTransportadoraCnpj} onChange={e => handleChange("transpTransportadoraCnpj", e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome/Razão Social</Label>
                    <Input value={form.transpTransportadoraNome} onChange={e => handleChange("transpTransportadoraNome", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Inscrição Estadual</Label>
                    <Input value={form.transpTransportadoraIe} onChange={e => handleChange("transpTransportadoraIe", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input value={form.transpTransportadoraEndereco} onChange={e => handleChange("transpTransportadoraEndereco", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Volumes</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input value={form.transpVolumeQuantidade} onChange={e => handleChange("transpVolumeQuantidade", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Espécie</Label>
                    <Input value={form.transpVolumeEspecie} onChange={e => handleChange("transpVolumeEspecie", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input value={form.transpVolumeMarca} onChange={e => handleChange("transpVolumeMarca", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Numeração</Label>
                    <Input value={form.transpVolumeNumeracao} onChange={e => handleChange("transpVolumeNumeracao", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Peso Líquido (kg)</Label>
                    <Input value={form.transpVolumePesoLiquido} onChange={e => handleChange("transpVolumePesoLiquido", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso Bruto (kg)</Label>
                    <Input value={form.transpVolumePesoBruto} onChange={e => handleChange("transpVolumePesoBruto", e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Valores do Transporte</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Valor do Frete (R$)</Label>
                    <CurrencyInput 
                      value={parseFloat(form.totalFrete) || 0} 
                      onValueChange={v => handleChange("totalFrete", String(v))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Seguro (R$)</Label>
                    <CurrencyInput 
                      value={parseFloat(form.totalSeguro) || 0} 
                      onValueChange={v => handleChange("totalSeguro", String(v))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Outros Valores (R$)</Label>
                    <CurrencyInput 
                      value={parseFloat(form.totalOutros) || 0} 
                      onValueChange={v => handleChange("totalOutros", String(v))} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAGAMENTO */}
        <TabsContent value="pagamento">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamento</CardTitle>
              <CardDescription>Forma e condições de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.pagForma} onValueChange={v => handleChange("pagForma", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Dinheiro</SelectItem>
                      <SelectItem value="1">1 - Cheque</SelectItem>
                      <SelectItem value="2">2 - Cartão de Crédito</SelectItem>
                      <SelectItem value="3">3 - Cartão de Débito</SelectItem>
                      <SelectItem value="4">4 - Crédito Loja</SelectItem>
                      <SelectItem value="5">5 - Vale Alimentação</SelectItem>
                      <SelectItem value="6">6 - Vale Refeição</SelectItem>
                      <SelectItem value="7">7 - Vale Presente</SelectItem>
                      <SelectItem value="8">8 - Vale Combustível</SelectItem>
                      <SelectItem value="9">9 - Boleto Bancário</SelectItem>
                      <SelectItem value="10">10 - Depósito Bancário</SelectItem>
                      <SelectItem value="11">11 - PIX</SelectItem>
                      <SelectItem value="12">12 - Transferência</SelectItem>
                      <SelectItem value="13">13 - Coupon</SelectItem>
                      <SelectItem value="14">14 - Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Integração</Label>
                  <Select value={form.pagTipoIntegracao} onValueChange={v => handleChange("pagTipoIntegracao", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Pagamento Integrado</SelectItem>
                      <SelectItem value="2">2 - Pagamento não integrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <CurrencyInput 
                    value={parseFloat(form.pagValor) || parseFloat(form.totalGeral)} 
                    onValueChange={v => handleChange("pagValor", String(v))} 
                  />
                </div>
              </div>
              
              {form.pagForma !== "0" && (
                <div className="pt-4 border-t mt-4">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="gap-2"
                    onClick={() => setContasReceberDialogOpen(true)}
                  >
                    <Calculator size={16} /> Gerar Parcelas no Contas a Receber
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Clique para configurar o parcelamento para esta Nota Fiscal.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INFORMAÇÕES ADICIONAIS */}
        <TabsContent value="informacoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Adicionais</CardTitle>
              <CardDescription>Dados complementares e observações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Informações Complementares</Label>
                <Textarea 
                  rows={4} 
                  value={form.informacoesComplementares} 
                  onChange={e => handleChange("informacoesComplementares", e.target.value)}
                  placeholder="Observações adicionais para a NF-e..."
                />
              </div>
              <div className="space-y-2">
                <Label>Observações Fiscais</Label>
                <Textarea 
                  rows={3} 
                  value={form.obsFisco} 
                  onChange={e => handleChange("obsFisco", e.target.value)}
                  placeholder="Informações de interesse do fisco..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 justify-end mt-6">
        <Button variant="outline" onClick={handleSalvarRascunho}>
          <Save size={16} className="mr-2" /> Salvar Rascunho
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (items.length === 0 || !form.emitenteCnpj || !form.destCpfCnpj) {
              toast({ title: "Dados insuficientes", description: "Preencha emitente, destinatário e pelo menos um produto para visualizar.", variant: "destructive" });
              return;
            }
            handlePrint(false);
          }}
        >
          <Eye size={16} className="mr-2" /> Pré-visualizar
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (items.length === 0 || !form.emitenteCnpj || !form.destCpfCnpj) {
              toast({ title: "Dados insuficientes", description: "Preencha emitente, destinatário e pelo menos um produto para imprimir.", variant: "destructive" });
              return;
            }
            handlePrint(true);
          }}
        >
          <Printer size={16} className="mr-2" /> Imprimir
        </Button>
        {nfeEmitida ? (
          <Button variant="outline" onClick={handleEnviarEmail}>
            <Mail size={16} className="mr-2" /> Enviar E-mail
          </Button>
        ) : (
          <Button variant="outline" disabled className="opacity-50 cursor-not-allowed">
            <Mail size={16} className="mr-2" /> Enviar E-mail
          </Button>
        )}
        <Button onClick={handleEmitir} className={`gap-2 ${ambienteCor}`}>
          <Send size={16} /> Emitir NF-e
        </Button>
      </div>

      {/* Dialog Item */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input 
                  value={editItem.codigo} 
                  onChange={e => setEditItem({...editItem, codigo: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>CFOP</Label>
                <Select value={editItem.cfop} onValueChange={v => setEditItem({...editItem, cfop: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cfopOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição do Produto</Label>
                <Input 
                  value={editItem.descricao} 
                  onChange={e => setEditItem({...editItem, descricao: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>NCM</Label>
                <Input 
                  value={editItem.ncm} 
                  onChange={e => setEditItem({...editItem, ncm: e.target.value})}
                  placeholder="0000.00.00"
                />
              </div>
              <div className="space-y-2">
                <Label>CEST</Label>
                <Input 
                  value={editItem.cest} 
                  onChange={e => setEditItem({...editItem, cest: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={editItem.unidade} onValueChange={v => setEditItem({...editItem, unidade: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">UN - Unidade</SelectItem>
                    <SelectItem value="KG">KG - Quilograma</SelectItem>
                    <SelectItem value="LT">LT - Litro</SelectItem>
                    <SelectItem value="CX">CX - Caixa</SelectItem>
                    <SelectItem value="PC">PC - Peça</SelectItem>
                    <SelectItem value="M">M - Metro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input 
                  type="number"
                  value={editItem.quantidade} 
                  onChange={e => {
                    const qtd = parseFloat(e.target.value) || 0;
                    const total = qtd * editItem.valorUnitario;
                    const icms = total * (editItem.icmsAliquota / 100);
                    const pis = total * 0.0165;
                    const cofins = total * 0.076;
                    setEditItem({...editItem, quantidade: qtd, valorTotal: total, icms, pis, cofins});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <CurrencyInput 
                  value={editItem.valorUnitario} 
                  onValueChange={v => {
                    const total = v * editItem.quantidade;
                    const icms = total * (editItem.icmsAliquota / 100);
                    const pis = total * 0.0165;
                    const cofins = total * 0.076;
                    setEditItem({...editItem, valorUnitario: v, valorTotal: total, icms, pis, cofins});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>CST ICMS</Label>
                <Select value={editItem.cst} onValueChange={v => setEditItem({...editItem, cst: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(form.emitenteCrt === "1" ? cstIcmsSnOptions : cstIcmsOptions).map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíquota ICMS (%)</Label>
                <Input 
                  type="number"
                  value={editItem.icmsAliquota} 
                  onChange={e => {
                    const aliq = parseFloat(e.target.value) || 0;
                    const icms = editItem.valorTotal * (aliq / 100);
                    setEditItem({...editItem, icmsAliquota: aliq, icms: icms});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>ICMS Desonerado (R$)</Label>
                <Input 
                  type="number"
                  value={editItem.icmsDesonado} 
                  onChange={e => setEditItem({...editItem, icmsDesonado: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Motivo Desoneração</Label>
                <Select value={editItem.icmsMotivoDesonercacao} onValueChange={v => setEditItem({...editItem, icmsMotivoDesonercacao: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - ST conj. trib. SN</SelectItem>
                    <SelectItem value="2">2 -ST conj. trib. SN c/ credit.</SelectItem>
                    <SelectItem value="3">3 -ST conj. trib. SN s/ credit.</SelectItem>
                    <SelectItem value="4">4 -ST conj. trib. ext. SN</SelectItem>
                    <SelectItem value="5">5 -ST RP</SelectItem>
                    <SelectItem value="6">6 -ST não trib.</SelectItem>
                    <SelectItem value="7">7 -ST simples NAC.</SelectItem>
                    <SelectItem value="8">8 -ST fundo combate pob.</SelectItem>
                    <SelectItem value="9">9 - outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíquota FCP (%)</Label>
                <Input 
                  type="number"
                  value={editItem.fcpAliquota} 
                  onChange={e => {
                    const aliq = parseFloat(e.target.value) || 0;
                    const fcp = editItem.valorTotal * (aliq / 100);
                    setEditItem({...editItem, fcpAliquota: aliq, fcp: fcp});
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor FCP (R$)</Label>
                <Input 
                  type="number"
                  value={editItem.fcp} 
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setItemDialogOpen(false); setEditItem(null); }}>Cancelar</Button>
            <Button onClick={() => editItem && atualizarItem(editItem)}>Salvar Item</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog NF-e Emitida */}
      <Dialog open={emitidaDialogOpen} onOpenChange={setEmitidaDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <FileText size={20} /> NF-e Emitida com Sucesso!
            </DialogTitle>
          </DialogHeader>
          {nfeEmitida && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Número</p>
                    <p className="font-bold text-lg">{nfeEmitida.numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Série</p>
                    <p className="font-bold">{form.serie}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Protocolo</p>
                    <p className="font-mono">{nfeEmitida.protocolo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/hora</p>
                    <p>{nfeEmitida.dataEmissao}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chave de Acesso</Label>
                <Input value={nfeEmitida.chaveAcesso} readOnly className="font-mono text-xs" />
              </div>
              <div className="text-center py-2">
                <Badge variant="default" className="text-sm py-1 px-4">
                  {nfeEmitida.status}
                </Badge>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t mt-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="destructive" onClick={() => setCancelamentoDialogOpen(true)}>
                Cancelar NF-e
              </Button>
              <Button variant="secondary" onClick={() => setCceDialogOpen(true)}>
                Carta de Correção
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setEmitidaDialogOpen(false)}>Fechar</Button>
              <Button variant="default" onClick={handleNovaNota} className="bg-blue-600 hover:bg-blue-700">
                <Plus size={16} className="mr-2" /> Nova Nota
              </Button>
              <Button id="btn-print-nfe" onClick={() => handlePrint(false)}>
                <Printer size={16} className="mr-2" /> Visualizar/Imprimir DANFE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelamentoDialogOpen} onOpenChange={setCancelamentoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar NF-e</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Justificativa de Cancelamento (Mín. 15 caracteres)</Label>
              <Textarea 
                value={cancelamentoJustificativa} 
                onChange={e => setCancelamentoJustificativa(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setCancelamentoDialogOpen(false)}>Voltar</Button>
            <Button variant="destructive" onClick={() => {
              if (cancelamentoJustificativa.length < 15) {
                toast({ title: "Atenção", description: "A justificativa deve ter no mínimo 15 caracteres.", variant: "destructive" });
                return;
              }
              toast({ title: "NF-e Cancelada", description: "O evento de cancelamento foi registrado com sucesso." });
              setNfeEmitida(prev => prev ? { ...prev, status: "135 - Evento Registrado (Cancelamento)" } : null);
              setCancelamentoDialogOpen(false);
            }}>Confirmar Cancelamento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cceDialogOpen} onOpenChange={setCceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carta de Correção Eletrônica (CC-e)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Correção a ser considerada (Mín. 15 caracteres)</Label>
              <Textarea 
                value={cceCorrecao} 
                onChange={e => setCceCorrecao(e.target.value)}
                placeholder="Informe a correção..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                A Carta de Correção é disciplinada pelo § 1º-A do art. 7º do Convênio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularização de erro ocorrido na emissão de documento fiscal.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setCceDialogOpen(false)}>Voltar</Button>
            <Button onClick={() => {
              if (cceCorrecao.length < 15) {
                toast({ title: "Atenção", description: "A correção deve ter no mínimo 15 caracteres.", variant: "destructive" });
                return;
              }
              toast({ title: "CC-e Emitida", description: "Carta de correção vinculada à NF-e com sucesso." });
              setCceDialogOpen(false);
            }}>Emitir CC-e</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Busca Cliente (F2) */}
      <Dialog open={clienteDialogOpen} onOpenChange={(open) => {
        setClienteDialogOpen(open);
        if (open) {
          setClienteSearchTerm("");
          setClienteResults(clientesCadastrados);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={clienteSearchTerm}
                onChange={e => {
                  const term = e.target.value;
                  setClienteSearchTerm(term);
                  if (term.length >= 2) {
                    const results = clientesCadastrados.filter(c => 
                      (c.cpfCnpj || "").includes(term) ||
                      (c.nome || "").toLowerCase().includes(term.toLowerCase())
                    );
                    setClienteResults(results);
                  } else if (term.length === 0) {
                    setClienteResults(clientesCadastrados);
                  }
                }}
                placeholder="Digite nome ou CPF/CNPJ..."
                autoFocus
              />
              <Button onClick={() => {
                setClienteDialogOpen(false);
                window.location.href = "/cadastros/pessoas?novo=true";
              }} variant="default">
                <Plus size={16} className="mr-1" /> Novo
              </Button>
            </div>
            <div className="border rounded-md max-h-96 overflow-auto">
              {clienteResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Nenhum cliente encontrado</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead className="w-20">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clienteResults.map(cliente => (
                      <TableRow key={cliente.id}>
                        <TableCell>{cliente.cpfCnpj}</TableCell>
                        <TableCell>{cliente.nome}</TableCell>
                        <TableCell>{(cliente.cidade || "")}/{(cliente.uf || "")}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => {
                            selectCliente(cliente);
                            setClienteDialogOpen(false);
                          }}>
                            Selecionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Busca Produto (F3) */}
      <Dialog open={produtoDialogOpen} onOpenChange={(open) => {
        setProdutoDialogOpen(open);
        if (open) {
          setProdutoSearchTerm("");
          setProdutoResults(produtosCadastrados);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buscar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={produtoSearchTerm}
                onChange={e => {
                  const term = e.target.value;
                  setProdutoSearchTerm(term);
                  if (term.length >= 2) {
                    const results = produtosCadastrados.filter(p => 
                      (p.codigo || "").toLowerCase().includes(term.toLowerCase()) ||
                      (p.descricao || "").toLowerCase().includes(term.toLowerCase())
                    );
                    setProdutoResults(results);
                  } else if (term.length === 0) {
                    setProdutoResults(produtosCadastrados);
                  }
                }}
                placeholder="Digite código ou descrição do produto..."
                autoFocus
              />
              <Button onClick={() => {
                setProdutoDialogOpen(false);
                window.location.href = "/cadastros/produtos?novo=true";
              }} variant="default">
                <Plus size={16} className="mr-1" /> Novo
              </Button>
            </div>
            <div className="border rounded-md max-h-96 overflow-auto">
              {produtoResults.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Nenhum produto encontrado</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>NCM</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="w-20">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtoResults.map(produto => (
                      <TableRow key={produto.codigo}>
                        <TableCell>{produto.codigo}</TableCell>
                        <TableCell>{produto.descricao}</TableCell>
                        <TableCell>{produto.ncm}</TableCell>
                        <TableCell className="text-right">R$ {produto.precoVenda.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => {
                            selectProduto(produto);
                            setProdutoDialogOpen(false);
                          }}>
                            Selecionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Contas a Receber */}
      <Dialog open={contasReceberDialogOpen} onOpenChange={setContasReceberDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator size={20} /> Gerar Contas a Receber
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p><strong>Cliente:</strong> {form.destNome}</p>
              <p><strong>Valor Total:</strong> R$ {form.totalGeral}</p>
              <p><strong>Forma:</strong> {form.pagForma === "9" ? "Boleto Bancário" : "Crédito Loja"}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nº Parcelas</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={finNumParcelas} 
                  onChange={e => setFinNumParcelas(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Intervalo (dias)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={finIntervalo} 
                  onChange={e => setFinIntervalo(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>1º Vencimento</Label>
                <Input 
                  type="date" 
                  value={finVencimento} 
                  onChange={e => setFinVencimento(e.target.value)} 
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => {
                const valorTotal = parseFloat(form.totalGeral) || 0;
                const numP = parseInt(finNumParcelas) || 1;
                const intervalo = parseInt(finIntervalo) || 30;
                
                if (!finVencimento) {
                  toast({ title: "Erro", description: "Configure o 1º Vencimento.", variant: "destructive" });
                  return;
                }
                
                const vencInicial = new Date(finVencimento + "T12:00:00");
                const valorParcela = Math.floor(valorTotal / numP * 100) / 100;
                const resto = Math.round((valorTotal - valorParcela * numP) * 100) / 100;
                
                const novasParcelas: Parcela[] = Array.from({ length: numP }, (_, i) => ({
                  numero: i + 1,
                  valor: i === 0 ? valorParcela + resto : valorParcela,
                  vencimento: format(addDays(vencInicial, i * intervalo), "yyyy-MM-dd"),
                  dataPagamento: null,
                  valorRecebido: 0,
                  status: "aberta",
                  formaPagamento: form.pagForma === "9" ? "Boleto" : "Crédito Loja",
                }));
                
                setFinParcelasGeradas(novasParcelas);
              }}
            >
              Gerar Parcelas
            </Button>

            {finParcelasGeradas.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parc.</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finParcelasGeradas.map(p => (
                      <TableRow key={p.numero}>
                        <TableCell>{p.numero}/{finParcelasGeradas.length}</TableCell>
                        <TableCell>{format(new Date(p.vencimento + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="text-right">R$ {p.valor.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setContasReceberDialogOpen(false)}>Cancelar</Button>
            <Button 
              type="button"
              onClick={() => {
                const valorTotal = parseFloat(form.totalGeral);
                const numP = parseInt(finNumParcelas) || 1;
                const intervalo = parseInt(finIntervalo) || 30;
                
                if (!finVencimento) {
                  toast({ title: "Erro", description: "Configure o 1º Vencimento.", variant: "destructive" });
                  return;
                }
                
                const vencInicial = new Date(finVencimento + "T12:00:00");
                const valorParcela = Math.floor(valorTotal / numP * 100) / 100;
                const resto = Math.round((valorTotal - valorParcela * numP) * 100) / 100;
                
                const parcelas = Array.from({ length: numP }, (_, i) => ({
                  numero: i + 1,
                  valor: i === 0 ? valorParcela + resto : valorParcela,
                  vencimento: format(addDays(vencInicial, i * intervalo), "yyyy-MM-dd"),
                  dataPagamento: null,
                  valorRecebido: 0,
                  status: "aberta",
                  formaPagamento: form.pagForma === "9" ? "Boleto" : "Crédito Loja",
                }));
                
                const novaConta = {
                  id: crypto.randomUUID(),
                  tipo: "nfe" as const,
                  nfeNumero: form.numero || "",
                  cliente: form.destNome || "Consumidor",
                  clienteDoc: form.destCpfCnpj || "",
                  descricao: `Venda NF-e ${form.numero || "Rascunho"} — ${items.length} itens`,
                  categoria: "Venda de Mercadorias",
                  centroCusto: "CC01 - Loja Matriz",
                  contaContabil: form.pagForma === "9" ? "1.1.2.02 - Duplicatas a Receber" : "1.1.2.01 - Clientes a Receber",
                  dataEmissao: form.dataEmissao || new Date().toISOString().split("T")[0],
                  valorTotal: valorTotal,
                  parcelas: parcelas,
                  observacao: "Gerado automaticamente pela emissão de NF-e",
                  status: "aberta" as const,
                  historicoContabil: `Receita de venda NF-e ${form.numero}`,
                };
                
                const key = "contas_receber";
                const stored = localStorage.getItem(key);
                const existing = stored ? JSON.parse(stored) : [];
                const updated = [...existing, novaConta];
                localStorage.setItem(key, JSON.stringify(updated));
                
                toast({ title: "Financeiro Gerado", description: `${parcelas.length} parcelas registradas no Contas a Receber.` });
                setContasReceberDialogOpen(false);
              }}
            >
              Salvar Financeiro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}