import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserX, UserPlus, ArrowLeft, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskTelefone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (cliente: Cliente | null) => void;
  clienteAtual: Cliente | null;
}

function getClientes(): Cliente[] {
  try {
    const stored = localStorage.getItem("pessoas");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p: any) => ({
          id: p.id,
          nome: p.nome || p.razaoSocial || "",
          cpfCnpj: p.cpfCnpj || p.cpf || p.cnpj || "",
          telefone: p.telefone || "",
          endereco: p.endereco || "",
          numero: p.numero || "",
          bairro: p.bairro || "",
          cidade: p.cidade || "",
          uf: p.uf || "",
        }));
      }
    }
  } catch { /* erro ignorado */ }
  return [
    { id: "1", nome: "João da Silva", cpfCnpj: "123.456.789-00", telefone: "(11) 99999-0001", endereco: "Rua das Flores", numero: "100", bairro: "Centro", cidade: "São Paulo", uf: "SP" },
    { id: "2", nome: "Maria Santos", cpfCnpj: "987.654.321-00", telefone: "(11) 99999-0002", endereco: "Av. Brasil", numero: "500", bairro: "Jardim", cidade: "Campinas", uf: "SP" },
    { id: "3", nome: "Empresa ABC Ltda", cpfCnpj: "12.345.678/0001-90", telefone: "(11) 3333-4444", endereco: "Rua Comercial", numero: "250", bairro: "Industrial", cidade: "Guarulhos", uf: "SP" },
  ];
}

interface EnderecoRapido {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

function salvarClienteRapido(nome: string, cpfCnpj: string, telefone: string, rg: string, endereco?: EnderecoRapido): Cliente {
  const id = crypto.randomUUID();
  const novaPessoa: Record<string, any> = {
    id,
    nome,
    cpfCnpj,
    telefone,
    rg,
    tipo: "fisica",
    ativo: true,
    dataCadastro: new Date().toISOString().slice(0, 10),
  };
  if (endereco) {
    novaPessoa.cep = endereco.cep;
    novaPessoa.endereco = endereco.endereco;
    novaPessoa.numero = endereco.numero;
    novaPessoa.complemento = endereco.complemento;
    novaPessoa.bairro = endereco.bairro;
    novaPessoa.cidade = endereco.cidade;
    novaPessoa.uf = endereco.uf;
  }

  try {
    const stored = localStorage.getItem("pessoas");
    const pessoas = stored ? JSON.parse(stored) : [];
    pessoas.push(novaPessoa);
    localStorage.setItem("pessoas", JSON.stringify(pessoas));
  } catch { /* erro ignorado */ }

  return { id, nome, cpfCnpj, telefone, endereco: endereco?.endereco, numero: endereco?.numero, bairro: endereco?.bairro, cidade: endereco?.cidade, uf: endereco?.uf };
}

export function SelecionarClienteModal({ open, onClose, onSelect, clienteAtual }: Props) {
  const [busca, setBusca] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [modoCadastro, setModoCadastro] = useState(false);

  // Formulário rápido
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [novoCep, setNovoCep] = useState("");
  const [novoEndereco, setNovoEndereco] = useState("");
  const [novoBairro, setNovoBairro] = useState("");
  const [novoCidade, setNovoCidade] = useState("");
  const [novoUf, setNovoUf] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [novoNumero, setNovoNumero] = useState("");
  const [novoComplemento, setNovoComplemento] = useState("");
  const [novoRg, setNovoRg] = useState("");

  useEffect(() => {
    if (open) {
      setBusca("");
      setModoCadastro(false);
      setNovoNome("");
      setNovoCpf("");
      setNovoTelefone("");
      setNovoCep(""); setNovoEndereco(""); setNovoBairro(""); setNovoCidade(""); setNovoUf("");
      setNovoNumero(""); setNovoComplemento(""); setNovoRg("");
      setClientes(getClientes());
    }
  }, [open]);

  const buscarCnpj = async (cnpjMasked: string) => {
    const digits = cnpjMasked.replace(/\D/g, "");
    if (digits.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNovoNome(data.razao_social || data.nome_fantasia || "");
      if (data.ddd_telefone_1) setNovoTelefone(maskTelefone(data.ddd_telefone_1.replace(/\D/g, "")));
      toast.success("CNPJ encontrado!", { description: data.razao_social });
    } catch {
      toast.info("CNPJ não encontrado na base pública");
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const handleCpfChange = (value: string) => {
    const masked = maskCpfCnpj(value);
    setNovoCpf(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length === 14) {
      buscarCnpj(masked);
    }
  };

  const buscarCep = async (cepMasked: string) => {
    const digits = cepMasked.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNovoEndereco(data.street || "");
      setNovoBairro(data.neighborhood || "");
      setNovoCidade(data.city || "");
      setNovoUf(data.state || "");
      toast.success("CEP encontrado!", { description: `${data.city} - ${data.state}` });
    } catch {
      toast.info("CEP não encontrado");
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const masked = maskCep(value);
    setNovoCep(masked);
    if (masked.replace(/\D/g, "").length === 8) {
      buscarCep(masked);
    }
  };

  const filtrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const q = busca.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) || c.cpfCnpj.includes(q)
    );
  }, [busca, clientes]);

  const handleCadastroRapido = () => {
    if (!novoNome.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    if (!novoCpf.trim()) {
      toast.error("Informe o CPF/CNPJ do cliente");
      return;
    }
    if (!novoRg.trim()) {
      toast.error("Informe o RG do cliente (obrigatório para crediário)");
      return;
    }
    // Verificar duplicidade
    const duplicado = clientes.find(c => c.cpfCnpj === novoCpf.trim());
    if (duplicado) {
      toast.warning("CPF/CNPJ já cadastrado!", { description: `Cliente: ${duplicado.nome}` });
      onSelect(duplicado);
      onClose();
      return;
    }

    const enderecoData = novoCep ? { cep: novoCep, endereco: novoEndereco, numero: novoNumero, complemento: novoComplemento, bairro: novoBairro, cidade: novoCidade, uf: novoUf } : undefined;
    const novo = salvarClienteRapido(novoNome.trim(), novoCpf.trim(), novoTelefone.trim(), novoRg.trim(), enderecoData);
    toast.success("Cliente cadastrado com sucesso!", { description: novo.nome });
    onSelect(novo);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            {modoCadastro ? "Cadastro Rápido de Cliente" : "Selecionar Cliente - F8"}
          </DialogTitle>
        </DialogHeader>

        {modoCadastro ? (
          <>
            <Button variant="ghost" size="sm" className="self-start gap-1 text-muted-foreground" onClick={() => setModoCadastro(false)}>
              <ArrowLeft size={14} /> Voltar à lista
            </Button>
            <div className="space-y-3">
              <div>
                <Label htmlFor="novo-nome">Nome *</Label>
                <Input id="novo-nome" placeholder="Nome completo do cliente" value={novoNome} onChange={e => setNovoNome(e.target.value)} autoFocus />
              </div>
              <div>
                <Label htmlFor="novo-cpf">CPF/CNPJ *</Label>
                <div className="relative">
                  <Input id="novo-cpf" placeholder="000.000.000-00" value={novoCpf} onChange={e => handleCpfChange(e.target.value)} />
                  {buscandoCnpj && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">CNPJ com 14 dígitos busca automaticamente</p>
              </div>
              <div>
                <Label htmlFor="novo-rg">RG *</Label>
                <Input id="novo-rg" placeholder="Número do RG" value={novoRg} onChange={e => setNovoRg(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="novo-tel">Telefone</Label>
                <Input id="novo-tel" placeholder="(00) 00000-0000" value={novoTelefone} onChange={e => setNovoTelefone(maskTelefone(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="novo-cep">CEP</Label>
                <div className="relative">
                  <Input id="novo-cep" placeholder="00000-000" value={novoCep} onChange={e => handleCepChange(e.target.value)} />
                  {buscandoCep && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
                </div>
              </div>
              {(novoEndereco || novoCidade) && (
                <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                  {novoEndereco && <p><span className="text-muted-foreground">Endereço:</span> {novoEndereco}</p>}
                  {novoBairro && <p><span className="text-muted-foreground">Bairro:</span> {novoBairro}</p>}
                  {novoCidade && <p><span className="text-muted-foreground">Cidade:</span> {novoCidade} - {novoUf}</p>}
                </div>
              )}
              {(novoEndereco || novoCep) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="novo-numero">Número</Label>
                    <Input id="novo-numero" placeholder="Nº" value={novoNumero} onChange={e => setNovoNumero(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="novo-complemento">Complemento</Label>
                    <Input id="novo-complemento" placeholder="Apto, Sala..." value={novoComplemento} onChange={e => setNovoComplemento(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setModoCadastro(false)}>Cancelar</Button>
              <Button onClick={handleCadastroRapido} className="gap-1">
                <UserPlus size={14} /> Cadastrar e Selecionar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {clienteAtual && (
              <div className="flex items-center justify-between bg-primary/10 rounded-lg px-4 py-2">
                <span className="text-sm">Atual: <strong>{clienteAtual.nome}</strong></span>
                <Button variant="ghost" size="sm" onClick={() => { onSelect(null); onClose(); }} className="gap-1 text-destructive">
                  <UserX size={14} /> Remover
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nome ou CPF/CNPJ..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                autoFocus
                className="flex-1"
              />
              <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => setModoCadastro(true)}>
                <UserPlus size={14} /> Novo
              </Button>
            </div>
            <div className="flex-1 overflow-auto border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Telefone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        <p>Nenhum cliente encontrado</p>
                        <Button variant="link" className="gap-1 mt-2" onClick={() => setModoCadastro(true)}>
                          <UserPlus size={14} /> Cadastrar novo cliente
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtrados.map(c => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => { onSelect(c); onClose(); }}
                      >
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="font-mono text-xs">{c.cpfCnpj}</TableCell>
                        <TableCell className="text-sm">{c.telefone}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
