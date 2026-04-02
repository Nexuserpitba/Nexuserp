import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileUp, FileDown, Download, Upload, Eye, Trash2, Search, Plus,
  Building2, CheckCircle2, AlertTriangle, Clock, FileText, CreditCard, DollarSign, ExternalLink,
  Folder, FolderOpen, ChevronRight, ChevronDown
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { toast } from "sonner";
import { format } from "date-fns";
import {
  BANCOS_SUPORTADOS,
  gerarRemessaCobranca240,
  gerarRemessaPagamento240,
  gerarRemessaCobranca400,
  parseRetorno,
  type CnabFormato,
  type CnabOperacao,
  type ArquivoCnab,
  type RemessaCobrancaItem,
  type RemessaPagamentoItem,
  type CnabHeaderArquivo,
  type CnabDetalheCobranca,
  type CnabDetalhePagamento,
  type CnabRetornoItem,
} from "@/lib/cnab";
import { buscarBancoPorCodigo } from "@/data/bancosBrasil";

// Tipo compartilhado com Cadastro de Contas Bancárias
interface ContaBancariaShared {
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
  tipoChavePix: string;
  ativa: boolean;
  padrao: boolean;
  observacoes: string;
}

// ========== Mock Data ==========
function gerarMockCobranca(): RemessaCobrancaItem[] {
  const nomes = ["Maria Silva", "João Pereira", "Empresa ABC Ltda", "Carlos Santos", "Ana Costa", "Tech Solutions ME"];
  const hoje = new Date();
  return nomes.map((nome, i) => ({
    id: `cob-${i + 1}`,
    selecionado: false,
    nossoNumero: `${String(i + 1).padStart(10, "0")}`,
    clienteNome: nome,
    clienteDoc: i % 2 === 0 ? `${String(11111111111 + i * 1111)}` : `${String(11222333000100 + i * 111)}`,
    valor: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
    vencimento: format(new Date(hoje.getTime() + (i + 5) * 86400000), "yyyy-MM-dd"),
    emissao: format(hoje, "yyyy-MM-dd"),
    descricao: `Parcela ${i + 1}/6 - Pedido #${1000 + i}`,
  }));
}

function gerarMockPagamento(): RemessaPagamentoItem[] {
  const fornecedores = ["Distribuidora XYZ", "Fornecedor Alpha", "Logística Beta", "Serviços Gama"];
  const hoje = new Date();
  return fornecedores.map((nome, i) => ({
    id: `pag-${i + 1}`,
    selecionado: false,
    favorecidoNome: nome,
    favorecidoDoc: `${String(22333444000100 + i * 1000)}`,
    bancoFavorecido: ["341", "237", "001", "033"][i],
    agenciaFavorecido: `${1000 + i}`,
    contaFavorecido: `${50000 + i * 1111}`,
    valor: parseFloat((Math.random() * 10000 + 500).toFixed(2)),
    dataPagamento: format(new Date(hoje.getTime() + (i + 2) * 86400000), "yyyy-MM-dd"),
    descricao: `NF-e ${5000 + i} - ${nome}`,
  }));
}

// ========== Componente Principal ==========
export default function IntegracaoCNAB() {
  const navigate = useNavigate();

  // Lê contas do cadastro compartilhado (localStorage "contas-bancarias")
  const [contas, setContas] = useState<ContaBancariaShared[]>(() => {
    try { return JSON.parse(localStorage.getItem("contas-bancarias") || "[]"); } catch { return []; }
  });

  // Recarrega contas quando a janela ganha foco
  useEffect(() => {
    const handler = () => {
      try { setContas(JSON.parse(localStorage.getItem("contas-bancarias") || "[]")); } catch { /* */ }
    };
    window.addEventListener("focus", handler);
    window.addEventListener("storage", handler);
    return () => { window.removeEventListener("focus", handler); window.removeEventListener("storage", handler); };
  }, []);

  const contasAtivas = contas.filter(c => c.ativa);

  const [arquivos, setArquivos] = useState<ArquivoCnab[]>(() => {
    try { return JSON.parse(localStorage.getItem("cnab-arquivos") || "[]"); } catch { return []; }
  });

  const saveArquivos = (updater: (prev: ArquivoCnab[]) => ArquivoCnab[]) => {
    setArquivos(prev => { const next = updater(prev); localStorage.setItem("cnab-arquivos", JSON.stringify(next)); return next; });
  };
  const [contaSelecionada, setContaSelecionada] = useState<string>("");
  const [formatoSelecionado, setFormatoSelecionado] = useState<CnabFormato>("240");

  const [itensCobranca, setItensCobranca] = useState<RemessaCobrancaItem[]>(() => gerarMockCobranca());
  const [itensPagamento, setItensPagamento] = useState<RemessaPagamentoItem[]>(() => gerarMockPagamento());

  const [retornoItens, setRetornoItens] = useState<CnabRetornoItem[]>([]);
  const [retornoDialogOpen, setRetornoDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewContent, setViewContent] = useState("");
  const [busca, setBusca] = useState("");
  const [tabAtiva, setTabAtiva] = useState("remessa-cobranca");
  const [pastasAbertas, setPastasAbertas] = useState<Record<string, boolean>>({
    remessa_cobranca: true,
    remessa_pagamento: true,
    retorno_cobranca: true,
  });

  const togglePasta = (pasta: string) => {
    setPastasAbertas(prev => ({ ...prev, [pasta]: !prev[pasta] }));
  };

  function getContaAtiva(): ContaBancariaShared | undefined {
    return contasAtivas.find(c => c.id === contaSelecionada) || contasAtivas.find(c => c.padrao) || contasAtivas[0];
  }

  // ========== Gerar Remessa Cobrança ==========
  function gerarRemessaCobranca() {
    const conta = getContaAtiva();
    if (!conta) { toast.error("Cadastre uma conta bancária antes de gerar remessas"); return; }
    const selecionados = itensCobranca.filter(i => i.selecionado);
    if (selecionados.length === 0) { toast.error("Selecione ao menos um título"); return; }

    const bancoInfo = buscarBancoPorCodigo(conta.bancocodigo);

    const header: CnabHeaderArquivo = {
      codigoBanco: conta.bancocodigo,
      loteServico: "0001",
      tipoRegistro: "0",
      tipoOperacao: "R",
      tipoServico: "01",
      formaLancamento: "01",
      layoutVersao: "087",
      nomeEmpresa: conta.titular,
      cnpjEmpresa: conta.cpfCnpjTitular,
      agencia: conta.agencia,
      conta: conta.conta,
      digitoConta: conta.digitoConta,
      nomeEmpresaBanco: bancoInfo?.nome || "",
      dataGeracao: format(new Date(), "yyyy-MM-dd"),
      horaGeracao: format(new Date(), "HH:mm"),
      sequencialArquivo: arquivos.filter(a => a.tipo === "remessa_cobranca").length + 1,
      convenio: conta.convenio,
    };

    const detalhes: CnabDetalheCobranca[] = selecionados.map(item => ({
      nossoNumero: item.nossoNumero,
      seuNumero: item.id,
      dataVencimento: item.vencimento,
      valorTitulo: item.valor,
      sacadoNome: item.clienteNome,
      sacadoDoc: item.clienteDoc,
      sacadoEndereco: "",
      sacadoCidade: "",
      sacadoUF: "",
      sacadoCEP: "",
      especieDoc: "DM",
      dataEmissao: item.emissao,
      jurosMora: 0,
      multa: 0,
      desconto: 0,
      instrucao1: "",
      instrucao2: "",
    }));

    const conteudo = formatoSelecionado === "240"
      ? gerarRemessaCobranca240(header, detalhes)
      : gerarRemessaCobranca400(header, detalhes);

    const nomeArquivo = `REM_COB_${conta.bancocodigo}_${format(new Date(), "yyyyMMdd_HHmmss")}.rem`;

    const novoArquivo: ArquivoCnab = {
      id: crypto.randomUUID(),
      tipo: "remessa_cobranca",
      formato: formatoSelecionado,
      banco: conta.bancocodigo,
      dataGeracao: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      sequencial: header.sequencialArquivo,
      qtdRegistros: selecionados.length,
      valorTotal: selecionados.reduce((s, i) => s + i.valor, 0),
      status: "gerado",
      nomeArquivo,
      conteudo,
    };

    saveArquivos(prev => [novoArquivo, ...prev]);
    downloadArquivo(conteudo, nomeArquivo);
    setPastasAbertas(prev => ({ ...prev, remessa_cobranca: true }));
    setTabAtiva("historico");
    toast.success(`Remessa salva na pasta "Remessa Cobrança" — ${selecionados.length} títulos`, {
      description: nomeArquivo,
    });
  }

  // ========== Gerar Remessa Pagamento ==========
  function gerarRemessaPagamento() {
    const conta = getContaAtiva();
    if (!conta) { toast.error("Cadastre uma conta bancária antes de gerar remessas"); return; }
    const selecionados = itensPagamento.filter(i => i.selecionado);
    if (selecionados.length === 0) { toast.error("Selecione ao menos um pagamento"); return; }

    if (formatoSelecionado === "400") {
      toast.error("CNAB 400 não suporta remessa de pagamentos. Use CNAB 240.");
      return;
    }

    const bancoInfo = buscarBancoPorCodigo(conta.bancocodigo);

    const header: CnabHeaderArquivo = {
      codigoBanco: conta.bancocodigo,
      loteServico: "0001",
      tipoRegistro: "0",
      tipoOperacao: "R",
      tipoServico: "20",
      formaLancamento: "03",
      layoutVersao: "087",
      nomeEmpresa: conta.titular,
      cnpjEmpresa: conta.cpfCnpjTitular,
      agencia: conta.agencia,
      conta: conta.conta,
      digitoConta: conta.digitoConta,
      nomeEmpresaBanco: bancoInfo?.nome || "",
      dataGeracao: format(new Date(), "yyyy-MM-dd"),
      horaGeracao: format(new Date(), "HH:mm"),
      sequencialArquivo: arquivos.filter(a => a.tipo === "remessa_pagamento").length + 1,
      convenio: conta.convenio,
    };

    const detalhes: CnabDetalhePagamento[] = selecionados.map(item => ({
      favorecidoNome: item.favorecidoNome,
      favorecidoDoc: item.favorecidoDoc,
      bancoFavorecido: item.bancoFavorecido,
      agenciaFavorecido: item.agenciaFavorecido,
      contaFavorecido: item.contaFavorecido,
      digitoContaFavorecido: "0",
      valorPagamento: item.valor,
      dataPagamento: item.dataPagamento,
      finalidade: item.descricao,
      tipoMovimento: "000",
    }));

    const conteudo = gerarRemessaPagamento240(header, detalhes);
    const nomeArquivo = `REM_PAG_${conta.bancocodigo}_${format(new Date(), "yyyyMMdd_HHmmss")}.rem`;

    const novoArquivo: ArquivoCnab = {
      id: crypto.randomUUID(),
      tipo: "remessa_pagamento",
      formato: "240",
      banco: conta.bancocodigo,
      dataGeracao: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
      sequencial: header.sequencialArquivo,
      qtdRegistros: selecionados.length,
      valorTotal: selecionados.reduce((s, i) => s + i.valor, 0),
      status: "gerado",
      nomeArquivo,
      conteudo,
    };

    saveArquivos(prev => [novoArquivo, ...prev]);
    downloadArquivo(conteudo, nomeArquivo);
    setPastasAbertas(prev => ({ ...prev, remessa_pagamento: true }));
    setTabAtiva("historico");
    toast.success(`Remessa salva na pasta "Remessa Pagamento" — ${selecionados.length} registros`, {
      description: nomeArquivo,
    });
  }

  // ========== Importar Retorno ==========
  function handleImportarRetorno(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const conteudo = ev.target?.result as string;
      try {
        const { formato, itens } = parseRetorno(conteudo);

        const novoArquivo: ArquivoCnab = {
          id: crypto.randomUUID(),
          tipo: "retorno_cobranca",
          formato,
          banco: conteudo.substring(0, 3).replace(/\D/g, "").padStart(3, "0"),
          dataGeracao: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          sequencial: 0,
          qtdRegistros: itens.length,
          valorTotal: itens.reduce((s, i) => s + i.valorPago, 0),
          status: "processado",
          nomeArquivo: file.name,
          itensRetorno: itens,
        };

        saveArquivos(prev => [novoArquivo, ...prev]);
        setRetornoItens(itens);
        setRetornoDialogOpen(true);
        setPastasAbertas(prev => ({ ...prev, retorno_cobranca: true }));
        toast.success(`Retorno salvo na pasta "Retorno Cobrança" — ${itens.length} registros`, {
          description: file.name,
        });
      } catch {
        toast.error("Erro ao processar arquivo de retorno");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function downloadArquivo(conteudo: string, nomeArquivo: string) {
    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelectAll(items: { selecionado: boolean }[], setter: (fn: (prev: any[]) => any[]) => void) {
    const allSelected = items.every(i => i.selecionado);
    setter(prev => prev.map(i => ({ ...i, selecionado: !allSelected })));
  }

  function formatarValor(valor: number): string {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatarData(data: string): string {
    if (!data) return "-";
    return data.split("-").reverse().join("/").substring(0, 10);
  }

  const bancoNome = (cod: string) => {
    const info = buscarBancoPorCodigo(cod);
    return info?.nomeReduzido || BANCOS_SUPORTADOS[cod]?.nome || cod;
  };

  const statusBadge = (status: ArquivoCnab["status"]) => {
    const map = {
      gerado: { label: "Gerado", variant: "secondary" as const, icon: Clock },
      enviado: { label: "Enviado", variant: "default" as const, icon: FileUp },
      processado: { label: "Processado", variant: "default" as const, icon: CheckCircle2 },
      erro: { label: "Erro", variant: "destructive" as const, icon: AlertTriangle },
    };
    const s = map[status];
    return <Badge variant={s.variant} className="gap-1"><s.icon size={12} />{s.label}</Badge>;
  };

  const tipoBadge = (tipo: CnabOperacao) => {
    const map = {
      remessa_cobranca: { label: "Rem. Cobrança", color: "bg-primary/10 text-primary" },
      retorno_cobranca: { label: "Ret. Cobrança", color: "bg-emerald-500/10 text-emerald-700" },
      remessa_pagamento: { label: "Rem. Pagamento", color: "bg-amber-500/10 text-amber-700" },
    };
    const t = map[tipo];
    return <Badge className={`${t.color} border-0`}>{t.label}</Badge>;
  };

  // ========== Stats ==========
  const totalRemessas = arquivos.filter(a => a.tipo !== "retorno_cobranca").length;
  const totalRetornos = arquivos.filter(a => a.tipo === "retorno_cobranca").length;
  const valorTotalRemessas = arquivos.filter(a => a.tipo !== "retorno_cobranca").reduce((s, a) => s + a.valorTotal, 0);
  const valorTotalRetornos = arquivos.filter(a => a.tipo === "retorno_cobranca").reduce((s, a) => s + a.valorTotal, 0);

  // ========== Render Pasta (Folder) ==========
  function renderPasta(tipo: CnabOperacao, label: string, Icon: React.ElementType, iconColor: string, iconBg: string) {
    const arquivosPasta = arquivos
      .filter(a => a.tipo === tipo)
      .filter(a => !busca || a.nomeArquivo.toLowerCase().includes(busca.toLowerCase()) || bancoNome(a.banco).toLowerCase().includes(busca.toLowerCase()));

    const total = arquivos.filter(a => a.tipo === tipo).length;
    const valorTotal = arquivos.filter(a => a.tipo === tipo).reduce((s, a) => s + a.valorTotal, 0);
    const aberta = pastasAbertas[tipo] ?? true;

    if (total === 0 && !aberta) return null;

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Folder header */}
        <button
          onClick={() => togglePasta(tipo)}
          className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
        >
          <div className={`p-1.5 rounded-md ${iconBg}`}>
            {aberta ? <FolderOpen size={18} className={iconColor} /> : <Folder size={18} className={iconColor} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{label}</span>
              <Badge variant="secondary" className="text-xs">{total} {total === 1 ? "arquivo" : "arquivos"}</Badge>
            </div>
            {total > 0 && (
              <p className="text-xs text-muted-foreground">Total: R$ {formatarValor(valorTotal)}</p>
            )}
          </div>
          {aberta ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
        </button>

        {/* Folder content */}
        {aberta && (
          <div className="border-t">
            {arquivosPasta.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <Icon size={24} className="mx-auto mb-2 opacity-30" />
                {total === 0 ? "Pasta vazia — nenhum arquivo gerado" : "Nenhum resultado para a busca"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arquivosPasta.map(arq => (
                    <TableRow key={arq.id}>
                      <TableCell className="font-mono text-xs">{arq.nomeArquivo}</TableCell>
                      <TableCell><Badge variant="outline">{arq.formato}</Badge></TableCell>
                      <TableCell className="text-xs">{bancoNome(arq.banco)}</TableCell>
                      <TableCell className="text-xs">{arq.dataGeracao}</TableCell>
                      <TableCell className="text-center">{arq.qtdRegistros}</TableCell>
                      <TableCell className="text-right font-medium">R$ {formatarValor(arq.valorTotal)}</TableCell>
                      <TableCell>{statusBadge(arq.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {arq.conteudo && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewContent(arq.conteudo!); setViewOpen(true); }}>
                              <Eye size={14} />
                            </Button>
                          )}
                          {arq.itensRetorno && arq.itensRetorno.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRetornoItens(arq.itensRetorno!); setRetornoDialogOpen(true); }}>
                              <FileDown size={14} />
                            </Button>
                          )}
                          {arq.conteudo && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadArquivo(arq.conteudo!, arq.nomeArquivo)}>
                              <Download size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { saveArquivos(prev => prev.filter(a => a.id !== arq.id)); toast.success("Arquivo removido"); }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </div>
    );
  }

  const contaAtiva = getContaAtiva();
  const bancoContaAtiva = contaAtiva ? buscarBancoPorCodigo(contaAtiva.bancocodigo) : undefined;

  return (
    <div className="page-container">
      <PageHeader
        title="Integração CNAB"
        description="Movimentação bancária via arquivos CNAB 240/400"
        actions={
          <Button variant="outline" onClick={() => navigate("/cadastros/contas-bancarias")} className="gap-1">
            <Building2 size={16} /> Gerenciar Contas
            <ExternalLink size={14} />
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><FileUp size={20} className="text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Remessas</p>
              <p className="text-xl font-bold">{totalRemessas}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><FileDown size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Retornos</p>
              <p className="text-xl font-bold">{totalRetornos}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><DollarSign size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Remessas</p>
              <p className="text-lg font-bold">R$ {formatarValor(valorTotalRemessas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CreditCard size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Valor Retornos</p>
              <p className="text-lg font-bold">R$ {formatarValor(valorTotalRetornos)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuração rápida — Conta Bancária integrada */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
        <div className="flex-1 min-w-[280px]">
          <Label className="text-xs">Conta Bancária</Label>
          {contasAtivas.length === 0 ? (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">Nenhuma conta ativa cadastrada.</p>
              <Button variant="link" size="sm" className="gap-1 p-0 h-auto" onClick={() => navigate("/cadastros/contas-bancarias")}>
                <Plus size={14} /> Cadastrar conta
              </Button>
            </div>
          ) : (
            <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a conta bancária">
                  {contaAtiva && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: bancoContaAtiva?.cor || "hsl(var(--muted))",
                          color: bancoContaAtiva?.corTexto || "hsl(var(--muted-foreground))",
                        }}
                      >
                        {bancoContaAtiva?.nomeReduzido?.substring(0, 2) || "?"}
                      </div>
                      <span className="truncate">
                        {bancoContaAtiva?.nomeReduzido || contaAtiva.bancocodigo}
                        {contaAtiva.apelido ? ` — ${contaAtiva.apelido}` : ""}
                        {" · Ag "}
                        {contaAtiva.agencia}
                        {" / Cc "}
                        {contaAtiva.conta}
                        {contaAtiva.padrao ? " ⭐" : ""}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contasAtivas.map(c => {
                  const banco = buscarBancoPorCodigo(c.bancocodigo);
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: banco?.cor || "hsl(var(--muted))",
                            color: banco?.corTexto || "hsl(var(--muted-foreground))",
                          }}
                        >
                          {banco?.nomeReduzido?.substring(0, 2) || "?"}
                        </div>
                        <span>
                          {banco?.nomeReduzido || c.bancocodigo}
                          {c.apelido ? ` — ${c.apelido}` : ""}
                          {" · Ag "}
                          {c.agencia}
                          {" / Cc "}
                          {c.conta}
                          {c.padrao ? " ⭐" : ""}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="text-xs">Formato</Label>
          <Select value={formatoSelecionado} onValueChange={v => setFormatoSelecionado(v as CnabFormato)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="240">CNAB 240</SelectItem>
              <SelectItem value="400">CNAB 400</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conta ativa info card */}
      {contaAtiva && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm"
                style={{
                  backgroundColor: bancoContaAtiva?.cor || "hsl(var(--muted))",
                  color: bancoContaAtiva?.corTexto || "hsl(var(--muted-foreground))",
                }}
              >
                {bancoContaAtiva?.nomeReduzido?.substring(0, 3) || "?"}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {bancoContaAtiva?.nome || contaAtiva.bancocodigo}
                  {contaAtiva.apelido ? ` — ${contaAtiva.apelido}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ag: {contaAtiva.agencia}{contaAtiva.digitoAgencia ? `-${contaAtiva.digitoAgencia}` : ""}
                  {" · "}Cc: {contaAtiva.conta}{contaAtiva.digitoConta ? `-${contaAtiva.digitoConta}` : ""}
                  {contaAtiva.convenio ? ` · Conv: ${contaAtiva.convenio}` : ""}
                  {contaAtiva.carteira ? ` · Cart: ${contaAtiva.carteira}` : ""}
                  {" · "}Titular: {contaAtiva.titular}
                </p>
              </div>
            </div>
            {contaAtiva.padrao && <Badge variant="outline" className="text-xs">Conta Padrão</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="remessa-cobranca" className="gap-1"><FileUp size={14} />Rem. Cobrança</TabsTrigger>
          <TabsTrigger value="remessa-pagamento" className="gap-1"><CreditCard size={14} />Rem. Pagamento</TabsTrigger>
          <TabsTrigger value="retorno" className="gap-1"><FileDown size={14} />Importar Retorno</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1"><FileText size={14} />Histórico</TabsTrigger>
        </TabsList>

        {/* ===== REMESSA COBRANÇA ===== */}
        <TabsContent value="remessa-cobranca">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Títulos para Remessa de Cobrança</CardTitle>
              <Button onClick={gerarRemessaCobranca} className="gap-1" disabled={contasAtivas.length === 0}>
                <Download size={16} /> Gerar Remessa {formatoSelecionado}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={itensCobranca.length > 0 && itensCobranca.every(i => i.selecionado)}
                        onCheckedChange={() => toggleSelectAll(itensCobranca, setItensCobranca)}
                      />
                    </TableHead>
                    <TableHead>Nosso Nº</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensCobranca.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={item.selecionado}
                          onCheckedChange={() => setItensCobranca(prev => prev.map((i, j) => j === idx ? { ...i, selecionado: !i.selecionado } : i))}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.nossoNumero}</TableCell>
                      <TableCell className="font-medium">{item.clienteNome}</TableCell>
                      <TableCell className="text-xs">{item.clienteDoc}</TableCell>
                      <TableCell>{formatarData(item.vencimento)}</TableCell>
                      <TableCell className="text-right font-medium">R$ {formatarValor(item.valor)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.descricao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 text-sm text-muted-foreground">
                {itensCobranca.filter(i => i.selecionado).length} de {itensCobranca.length} selecionados
                {" — Total: R$ "}
                {formatarValor(itensCobranca.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== REMESSA PAGAMENTO ===== */}
        <TabsContent value="remessa-pagamento">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pagamentos para Remessa</CardTitle>
              <Button onClick={gerarRemessaPagamento} className="gap-1" disabled={contasAtivas.length === 0}>
                <Download size={16} /> Gerar Remessa Pagamento
              </Button>
            </CardHeader>
            <CardContent>
              {formatoSelecionado === "400" && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center gap-2">
                  <AlertTriangle size={16} /> CNAB 400 não suporta remessa de pagamentos. Altere para CNAB 240.
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={itensPagamento.length > 0 && itensPagamento.every(i => i.selecionado)}
                        onCheckedChange={() => toggleSelectAll(itensPagamento, setItensPagamento)}
                      />
                    </TableHead>
                    <TableHead>Favorecido</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Ag/Conta</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensPagamento.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={item.selecionado}
                          onCheckedChange={() => setItensPagamento(prev => prev.map((i, j) => j === idx ? { ...i, selecionado: !i.selecionado } : i))}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.favorecidoNome}</TableCell>
                      <TableCell className="text-xs">{item.favorecidoDoc}</TableCell>
                      <TableCell className="text-xs">{bancoNome(item.bancoFavorecido)}</TableCell>
                      <TableCell className="text-xs">{item.agenciaFavorecido} / {item.contaFavorecido}</TableCell>
                      <TableCell>{formatarData(item.dataPagamento)}</TableCell>
                      <TableCell className="text-right font-medium">R$ {formatarValor(item.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 text-sm text-muted-foreground">
                {itensPagamento.filter(i => i.selecionado).length} de {itensPagamento.length} selecionados
                {" — Total: R$ "}
                {formatarValor(itensPagamento.filter(i => i.selecionado).reduce((s, i) => s + i.valor, 0))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== IMPORTAR RETORNO ===== */}
        <TabsContent value="retorno">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Importar Arquivo de Retorno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-xl p-12 text-center">
                <Upload size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Arraste o arquivo de retorno ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mb-4">Suporta CNAB 240 e CNAB 400 (detecção automática)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ret,.txt,.rem"
                  className="hidden"
                  onChange={handleImportarRetorno}
                />
                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload size={16} /> Selecionar Arquivo
                </Button>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-2">Bancos Suportados</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.values(BANCOS_SUPORTADOS).map(banco => (
                    <div key={banco.codigo} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: banco.cor, color: banco.corTexto }}
                      >
                        {banco.sigla}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{banco.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{banco.formatos.join(" / ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HISTÓRICO ===== */}
        <TabsContent value="historico">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pastas de Arquivos CNAB</CardTitle>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-8 w-[200px]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pasta: Remessa Cobrança */}
              {renderPasta("remessa_cobranca", "Remessa Cobrança", FileUp, "text-primary", "bg-primary/10")}
              {/* Pasta: Remessa Pagamento */}
              {renderPasta("remessa_pagamento", "Remessa Pagamento", CreditCard, "text-amber-600", "bg-amber-500/10")}
              {/* Pasta: Retorno */}
              {renderPasta("retorno_cobranca", "Retorno Cobrança", FileDown, "text-emerald-600", "bg-emerald-500/10")}

              {arquivos.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Folder size={48} className="mx-auto mb-3 opacity-40" />
                  <p>Nenhum arquivo gerado ou importado</p>
                  <p className="text-xs mt-1">Gere uma remessa ou importe um retorno para começar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG: Visualizar Arquivo ===== */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conteúdo do Arquivo CNAB</DialogTitle>
          </DialogHeader>
          <pre className="text-[10px] font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[60vh] whitespace-pre leading-relaxed">
            {viewContent}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Retorno detalhes ===== */}
      <Dialog open={retornoDialogOpen} onOpenChange={setRetornoDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Retorno — {retornoItens.length} registros</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nosso Nº</TableHead>
                  <TableHead>Seu Nº</TableHead>
                  <TableHead>Sacado</TableHead>
                  <TableHead>Ocorrência</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Título</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead className="text-right">Tarifas</TableHead>
                  <TableHead>Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retornoItens.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{item.nossoNumero}</TableCell>
                    <TableCell className="text-xs">{item.seuNumero}</TableCell>
                    <TableCell>{item.sacadoNome}</TableCell>
                    <TableCell>
                      <Badge variant={item.codigoOcorrencia === "06" ? "default" : "secondary"} className="text-xs">
                        {item.codigoOcorrencia} — {item.descricaoOcorrencia}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatarData(item.dataOcorrencia)}</TableCell>
                    <TableCell className="text-right">R$ {formatarValor(item.valorTitulo)}</TableCell>
                    <TableCell className="text-right font-medium">R$ {formatarValor(item.valorPago)}</TableCell>
                    <TableCell className="text-right text-xs">R$ {formatarValor(item.tarifas)}</TableCell>
                    <TableCell className="text-xs">{formatarData(item.dataCredito)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetornoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
