import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ETAPAS_FUNIL } from "@/types/crm";
import { Mail, Save, Eye, Plus, Trash2, Copy, Info, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailTemplate {
  id: string;
  etapa: string;
  assunto: string;
  corpo: string;
  ativo: boolean;
  diasAposEntrada: number;
}

const VARIAVEIS = [
  { key: "{{lead_nome}}", desc: "Nome do lead" },
  { key: "{{lead_empresa}}", desc: "Empresa do lead" },
  { key: "{{responsavel}}", desc: "Responsável" },
  { key: "{{etapa}}", desc: "Etapa atual" },
  { key: "{{valor}}", desc: "Valor do negócio" },
  { key: "{{data_criacao}}", desc: "Data de criação" },
];

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl-1", etapa: "prospeccao", assunto: "Olá {{lead_nome}}, podemos ajudar sua empresa!",
    corpo: "Olá {{lead_nome}},\n\nSou {{responsavel}} e gostaria de apresentar nossas soluções para a {{lead_empresa}}.\n\nPodemos agendar uma conversa rápida?\n\nAtenciosamente,\n{{responsavel}}",
    ativo: true, diasAposEntrada: 1,
  },
  {
    id: "tpl-2", etapa: "qualificacao", assunto: "{{lead_nome}}, preparamos algo especial para você",
    corpo: "Olá {{lead_nome}},\n\nApós nossa conversa, preparamos um material personalizado para a {{lead_empresa}}.\n\nGostaríamos de agendar uma demonstração.\n\nAbraços,\n{{responsavel}}",
    ativo: true, diasAposEntrada: 2,
  },
  {
    id: "tpl-3", etapa: "proposta", assunto: "Proposta comercial - {{lead_empresa}}",
    corpo: "Prezado(a) {{lead_nome}},\n\nSegue em anexo nossa proposta comercial no valor de {{valor}}.\n\nEstou à disposição para esclarecer qualquer dúvida.\n\nAtenciosamente,\n{{responsavel}}",
    ativo: true, diasAposEntrada: 0,
  },
  {
    id: "tpl-4", etapa: "negociacao", assunto: "{{lead_nome}}, vamos fechar juntos?",
    corpo: "Olá {{lead_nome}},\n\nGostaria de retomar nossa negociação sobre a proposta para a {{lead_empresa}}.\n\nTemos condições especiais para fechamento nesta semana.\n\nConte comigo,\n{{responsavel}}",
    ativo: true, diasAposEntrada: 3,
  },
];

const STORAGE_KEY = "gp_erp_crm_email_templates";

function getTemplates(): EmailTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return DEFAULT_TEMPLATES;
  } catch { return DEFAULT_TEMPLATES; }
}

export default function CRMTemplatesEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(getTemplates);
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id || "");
  const [preview, setPreview] = useState(false);

  const selected = templates.find(t => t.id === selectedId);

  const save = (updated: EmailTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleUpdate = (field: keyof EmailTemplate, value: any) => {
    if (!selected) return;
    const updated = templates.map(t => t.id === selected.id ? { ...t, [field]: value } : t);
    save(updated);
  };

  const handleAdd = () => {
    const novo: EmailTemplate = {
      id: crypto.randomUUID(),
      etapa: "prospeccao",
      assunto: "Novo template",
      corpo: "Olá {{lead_nome}},\n\n\n\nAtenciosamente,\n{{responsavel}}",
      ativo: false,
      diasAposEntrada: 1,
    };
    const updated = [...templates, novo];
    save(updated);
    setSelectedId(novo.id);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    save(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || "");
    toast.success("Template removido");
  };

  const handleDuplicate = (t: EmailTemplate) => {
    const novo = { ...t, id: crypto.randomUUID(), assunto: `${t.assunto} (cópia)`, ativo: false };
    const updated = [...templates, novo];
    save(updated);
    setSelectedId(novo.id);
    toast.success("Template duplicado");
  };

  const getEtapaLabel = (key: string) => ETAPAS_FUNIL.find(e => e.key === key)?.label || key;
  const getEtapaCor = (key: string) => ETAPAS_FUNIL.find(e => e.key === key)?.cor || "bg-muted";

  const renderPreview = (text: string) => {
    return text
      .replace(/\{\{lead_nome\}\}/g, "Maria Silva")
      .replace(/\{\{lead_empresa\}\}/g, "Silva Comércio LTDA")
      .replace(/\{\{responsavel\}\}/g, "João")
      .replace(/\{\{etapa\}\}/g, "Proposta")
      .replace(/\{\{valor\}\}/g, "R$ 45.000,00")
      .replace(/\{\{data_criacao\}\}/g, "01/03/2026");
  };

  const etapasAtivas = ['prospeccao', 'qualificacao', 'proposta', 'negociacao'];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Templates de E-mail CRM"
        description="Configure mensagens automáticas por etapa do funil de vendas"
      />

      {/* Cloud notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CloudOff size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Envio automático requer Lovable Cloud</p>
            <p className="text-xs text-muted-foreground mt-1">
              Os templates estão prontos para uso. Quando o Lovable Cloud for habilitado, os e-mails serão
              enviados automaticamente aos leads conforme a configuração de cada etapa.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lista de templates */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Templates</CardTitle>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleAdd}>
                <Plus size={12} className="mr-1" /> Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {etapasAtivas.map(etapa => {
              const tpls = templates.filter(t => t.etapa === etapa);
              if (tpls.length === 0) return null;
              return (
                <div key={etapa}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">
                    {getEtapaLabel(etapa)}
                  </p>
                  {tpls.map(t => (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        selectedId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      )}
                      onClick={() => { setSelectedId(t.id); setPreview(false); }}
                    >
                      <Mail size={14} className={cn("shrink-0", t.ativo ? "text-primary" : "text-muted-foreground")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{t.assunto}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t.diasAposEntrada === 0 ? "Imediato" : `${t.diasAposEntrada} dia(s) após entrada`}
                        </p>
                      </div>
                      {!t.ativo && <Badge variant="outline" className="text-[8px] h-4 px-1">Inativo</Badge>}
                    </div>
                  ))}
                </div>
              );
            })}
            {templates.filter(t => !etapasAtivas.includes(t.etapa)).length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-2">Outros</p>
                {templates.filter(t => !etapasAtivas.includes(t.etapa)).map(t => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      selectedId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                    onClick={() => { setSelectedId(t.id); setPreview(false); }}
                  >
                    <Mail size={14} className="text-muted-foreground shrink-0" />
                    <p className="text-xs truncate flex-1">{t.assunto}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {preview ? "Pré-visualização" : "Editor"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {selected && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleDuplicate(selected)}>
                      <Copy size={12} className="mr-1" /> Duplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDelete(selected.id)}>
                      <Trash2 size={12} className="mr-1" /> Excluir
                    </Button>
                    <Button size="sm" variant={preview ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPreview(!preview)}>
                      <Eye size={12} className="mr-1" /> {preview ? "Editar" : "Preview"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-muted-foreground text-center py-8">Selecione ou crie um template</p>
            ) : preview ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                  <p className="text-sm font-medium">{renderPreview(selected.assunto)}</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/20 whitespace-pre-wrap text-sm">
                  {renderPreview(selected.corpo)}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Etapa do Funil</Label>
                    <Select value={selected.etapa} onValueChange={v => handleUpdate("etapa", v)}>
                      <SelectTrigger className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {etapasAtivas.map(e => (
                          <SelectItem key={e} value={e}>{getEtapaLabel(e)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Enviar após (dias)</Label>
                    <Input
                      type="number" min={0} max={30}
                      value={selected.diasAposEntrada}
                      onChange={e => handleUpdate("diasAposEntrada", Number(e.target.value))}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <Switch checked={selected.ativo} onCheckedChange={v => handleUpdate("ativo", v)} />
                    <Label className="text-xs">{selected.ativo ? "Ativo" : "Inativo"}</Label>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Assunto</Label>
                  <Input
                    value={selected.assunto}
                    onChange={e => handleUpdate("assunto", e.target.value)}
                    className="mt-1 text-xs"
                    noUpperCase
                  />
                </div>

                <div>
                  <Label className="text-xs">Corpo do E-mail</Label>
                  <Textarea
                    value={selected.corpo}
                    onChange={e => handleUpdate("corpo", e.target.value)}
                    className="mt-1 text-xs min-h-[180px] font-mono"
                    noUpperCase
                  />
                </div>

                {/* Variáveis disponíveis */}
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                    <Info size={12} /> Variáveis disponíveis (clique para copiar)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIAVEIS.map(v => (
                      <Badge
                        key={v.key}
                        variant="secondary"
                        className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(v.key);
                          toast.success(`"${v.key}" copiado!`);
                        }}
                      >
                        {v.key} <span className="ml-1 text-muted-foreground">({v.desc})</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button size="sm" onClick={() => toast.success("Template salvo com sucesso!")} className="w-full sm:w-auto">
                  <Save size={14} className="mr-1" /> Salvar Template
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
