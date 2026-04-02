import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, RotateCcw, FileText, Type, Mail, Plus, Trash2, Clock, History, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "config_relatorios";
const DEFAULT_FOOTER = "Sistema NexusERP";

interface ConfigRelatoriosData {
  rodapeTexto: string;
  cabecalhoTitulo: string;
  cabecalhoSubtitulo: string;
}

const AVAILABLE_REPORTS = [
  { id: "vendas_diarias", nome: "Vendas Diárias" },
  { id: "vendas_vendedor", nome: "Vendas por Vendedor" },
  { id: "vendas_pagamento", nome: "Vendas por Forma de Pagamento" },
  { id: "vendas_cliente", nome: "Vendas por Cliente" },
  { id: "curva_abc", nome: "Curva ABC de Produtos" },
  { id: "descontos", nome: "Relatório de Descontos" },
  { id: "estoque_zerado", nome: "Produtos com Estoque Zerado" },
  { id: "cobertura_ncm", nome: "Cobertura NCM" },
  { id: "pesagens", nome: "Relatório de Pesagens" },
  { id: "producao", nome: "Relatório de Produção" },
  { id: "produtividade_tecnicos", nome: "Produtividade de Técnicos" },
];

function loadConfig(): ConfigRelatoriosData {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      rodapeTexto: stored.rodapeTexto ?? DEFAULT_FOOTER,
      cabecalhoTitulo: stored.cabecalhoTitulo ?? "",
      cabecalhoSubtitulo: stored.cabecalhoSubtitulo ?? "",
    };
  } catch {
    return { rodapeTexto: DEFAULT_FOOTER, cabecalhoTitulo: "", cabecalhoSubtitulo: "" };
  }
}

interface EmailHistoryRow {
  id: string;
  destinatario: string;
  assunto: string;
  tipo: string;
  status: string;
  erro: string | null;
  created_at: string;
}

export default function ConfigRelatorios() {
  const [config, setConfig] = useState<ConfigRelatoriosData>(loadConfig);
  const [ativo, setAtivo] = useState(false);
  const [destinatarios, setDestinatarios] = useState<string[]>([""]);
  const [relatoriosAtivos, setRelatoriosAtivos] = useState<string[]>([]);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [history, setHistory] = useState<EmailHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Load weekly config from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("weekly_report_config" as any)
          .select("*")
          .limit(1)
          .single();
        if (data) {
          const d = data as any;
          setConfigId(d.id);
          setAtivo(d.ativo ?? false);
          setDestinatarios(d.destinatarios?.length ? d.destinatarios : [""]);
          setRelatoriosAtivos(d.relatorios_ativos ?? []);
        }
      } catch { /* erro ignorado */ }
      setLoadingWeekly(false);
    })();
  }, []);

  // Load email history
  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      try {
        const { data } = await supabase
          .from("email_send_history" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (data) setHistory(data as any);
      } catch { /* erro ignorado */ }
      setLoadingHistory(false);
    })();
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast.success("Configurações de relatórios salvas com sucesso!");
  };

  const handleReset = () => {
    const defaults: ConfigRelatoriosData = { rodapeTexto: DEFAULT_FOOTER, cabecalhoTitulo: "", cabecalhoSubtitulo: "" };
    setConfig(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    toast.info("Configurações restauradas para o padrão.");
  };

  const update = (field: keyof ConfigRelatoriosData, value: string) =>
    setConfig((prev) => ({ ...prev, [field]: value }));

  const handleSaveWeekly = async () => {
    const validEmails = destinatarios.filter(e => e.trim());
    if (ativo && validEmails.length === 0) {
      toast.error("Adicione pelo menos um destinatário.");
      return;
    }
    if (ativo && relatoriosAtivos.length === 0) {
      toast.error("Selecione pelo menos um relatório.");
      return;
    }

    setSavingWeekly(true);
    try {
      const payload = {
        ativo,
        destinatarios: validEmails.length ? validEmails : [],
        relatorios_ativos: relatoriosAtivos,
        updated_at: new Date().toISOString(),
      };

      if (configId) {
        await supabase
          .from("weekly_report_config" as any)
          .update(payload)
          .eq("id", configId);
      } else {
        const { data } = await supabase
          .from("weekly_report_config" as any)
          .insert(payload)
          .select("id")
          .single();
        if (data) setConfigId((data as any).id);
      }
      toast.success("Configurações de envio semanal salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar configuração semanal", { description: err.message });
    }
    setSavingWeekly(false);
  };

  const addDestinatario = () => setDestinatarios(prev => [...prev, ""]);
  const removeDestinatario = (idx: number) => setDestinatarios(prev => prev.filter((_, i) => i !== idx));
  const updateDestinatario = (idx: number, value: string) =>
    setDestinatarios(prev => prev.map((d, i) => (i === idx ? value : d)));

  const toggleRelatorio = (id: string) => {
    setRelatoriosAtivos(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleResend = async (row: EmailHistoryRow) => {
    setResendingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-report-email", {
        body: {
          to: row.destinatario,
          subject: row.assunto,
          html: `<p>Reenvio automático do relatório: ${row.assunto}</p>`,
          reportType: row.assunto,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("email_send_history" as any).insert({
        destinatario: row.destinatario,
        assunto: row.assunto,
        tipo: row.tipo,
        status: "enviado",
      });
      toast.success(`E-mail reenviado para ${row.destinatario}!`);
      // Refresh history
      const { data: updated } = await supabase
        .from("email_send_history" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (updated) setHistory(updated as any);
    } catch (err: any) {
      toast.error("Falha ao reenviar", { description: err.message });
      await supabase.from("email_send_history" as any).insert({
        destinatario: row.destinatario,
        assunto: row.assunto,
        tipo: row.tipo,
        status: "falhou",
        erro: err.message,
      });
    }
    setResendingId(null);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Configurações de Relatórios"
        description="Personalize o layout dos relatórios PDF, configure o envio semanal e veja o histórico"
      />

      <Tabs defaultValue="layout" className="space-y-4">
        <TabsList>
          <TabsTrigger value="layout"><Type size={16} className="mr-1" /> Layout PDF</TabsTrigger>
          <TabsTrigger value="semanal"><Mail size={16} className="mr-1" /> Envio Semanal</TabsTrigger>
          <TabsTrigger value="historico"><History size={16} className="mr-1" /> Histórico</TabsTrigger>
        </TabsList>

        {/* ===== ABA LAYOUT PDF ===== */}
        <TabsContent value="layout" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type size={18} /> Cabeçalho dos Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cabecalhoTitulo">Título personalizado</Label>
                <Input id="cabecalhoTitulo" value={config.cabecalhoTitulo} onChange={(e) => update("cabecalhoTitulo", e.target.value)} placeholder="Ex: Soluções em Tecnologia" maxLength={80} />
                <p className="text-xs text-muted-foreground">Exibido acima do título do relatório.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cabecalhoSubtitulo">Subtítulo personalizado</Label>
                <Input id="cabecalhoSubtitulo" value={config.cabecalhoSubtitulo} onChange={(e) => update("cabecalhoSubtitulo", e.target.value)} placeholder="Ex: Sistema de Gestão Empresarial" maxLength={100} />
                <p className="text-xs text-muted-foreground">Exibido abaixo do título personalizado.</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-2 uppercase font-semibold">Pré-visualização do cabeçalho</p>
                <div className="border-b-2 border-foreground/80 pb-3 text-left">
                  {config.cabecalhoTitulo && <p className="text-sm font-bold uppercase tracking-wide">{config.cabecalhoTitulo}</p>}
                  {config.cabecalhoSubtitulo && <p className="text-xs text-muted-foreground">{config.cabecalhoSubtitulo}</p>}
                  <p className="text-base font-bold uppercase mt-1">Nome do Relatório</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText size={18} /> Rodapé dos Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rodapeTexto">Texto do rodapé</Label>
                <Input id="rodapeTexto" value={config.rodapeTexto} onChange={(e) => update("rodapeTexto", e.target.value)} placeholder={DEFAULT_FOOTER} maxLength={120} />
                <p className="text-xs text-muted-foreground">Máximo de 120 caracteres.</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Pré-visualização do rodapé</p>
                <div className="border-t border-border pt-2 text-center text-xs text-muted-foreground">
                  {config.rodapeTexto || DEFAULT_FOOTER} — Documento gerado em {new Date().toLocaleString("pt-BR")}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
            <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1" /> Restaurar Padrão</Button>
          </div>
        </TabsContent>

        {/* ===== ABA ENVIO SEMANAL ===== */}
        <TabsContent value="semanal" className="space-y-4">
          {loadingWeekly ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Clock size={18} /> Envio Semanal Automático</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Ativar envio semanal</p>
                      <p className="text-xs text-muted-foreground">Relatórios enviados toda segunda-feira às 8h via SMTP da empresa ativa.</p>
                    </div>
                    <Switch checked={ativo} onCheckedChange={setAtivo} />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Mail size={14} /> Destinatários</Label>
                    {destinatarios.map((email, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input type="email" value={email} onChange={(e) => updateDestinatario(idx, e.target.value)} placeholder="email@exemplo.com" />
                        {destinatarios.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeDestinatario(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addDestinatario}><Plus className="h-4 w-4 mr-1" /> Adicionar destinatário</Button>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><FileText size={14} /> Relatórios incluídos</Label>
                    <div className="grid gap-2">
                      {AVAILABLE_REPORTS.map((rel) => (
                        <div key={rel.id} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5">
                          <span className="text-sm">{rel.nome}</span>
                          <Switch checked={relatoriosAtivos.includes(rel.id)} onCheckedChange={() => toggleRelatorio(rel.id)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSaveWeekly} disabled={savingWeekly}>
                {savingWeekly ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar Configuração Semanal
              </Button>
            </>
          )}
        </TabsContent>

        {/* ===== ABA HISTÓRICO ===== */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><History size={18} /> Histórico de E-mails Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum e-mail enviado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(row.created_at).toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-sm">{row.destinatario}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{row.assunto}</TableCell>
                          <TableCell>
                            <Badge variant={row.tipo === "semanal" ? "default" : "secondary"} className="text-xs">
                              {row.tipo === "semanal" ? "Semanal" : "Manual"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {row.status === "enviado" ? (
                              <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 size={14} /> Enviado</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-destructive" title={row.erro || ""}><XCircle size={14} /> Falhou</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.status === "falhou" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(row)}
                                disabled={resendingId === row.id}
                                className="h-7 text-xs"
                              >
                                {resendingId === row.id ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}
                                Reenviar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
