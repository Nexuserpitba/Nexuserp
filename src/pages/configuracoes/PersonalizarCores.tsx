import { useState, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme, presetPalettes, defaultTheme, fontOptions, fontSizeOptions, spacingOptions, type ThemeConfig } from "@/hooks/useTheme";
import { Palette, RotateCcw, Check, Info, Eye, Monitor, Type, MousePointerClick, PanelLeft, Download, Upload, Share2, Copy, ClipboardPaste, Link, Clock, Moon, ALargeSmall, Space } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

interface ColorFieldProps {
  label: string;
  description: string;
  value: string;
  onChange: (hsl: string) => void;
}

function ColorField({ label, description, value, onChange }: ColorFieldProps) {
  const hex = hslToHex(value);
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={hex}
          onChange={e => onChange(hexToHsl(e.target.value))}
          className="w-10 h-10 rounded-lg border border-border cursor-pointer appearance-none p-0"
          style={{ backgroundColor: hex }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info size={12} className="text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="text-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Input
          value={hex.toUpperCase()}
          onChange={e => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(hexToHsl(v));
          }}
          className="h-7 text-xs font-mono w-24 mt-0.5"
        />
      </div>
    </div>
  );
}

function PreviewCard({ theme }: { theme: ThemeConfig }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Simulated sidebar */}
      <div className="flex h-48">
        <div className="w-14 flex flex-col items-center py-3 gap-2" style={{ backgroundColor: `hsl(${theme.sidebarBg})` }}>
          <div className="w-6 h-6 rounded" style={{ backgroundColor: `hsl(${theme.sidebarActive})` }} />
          <div className="w-5 h-1 rounded-full opacity-50" style={{ backgroundColor: `hsl(${theme.sidebarText})` }} />
          <div className="w-5 h-1 rounded-full opacity-30" style={{ backgroundColor: `hsl(${theme.sidebarText})` }} />
          <div className="w-5 h-1 rounded-full opacity-30" style={{ backgroundColor: `hsl(${theme.sidebarText})` }} />
        </div>
        {/* Main content area */}
        <div className="flex-1 p-3 space-y-2" style={{ backgroundColor: `hsl(${theme.background})` }}>
          <div className="h-3 w-20 rounded" style={{ backgroundColor: `hsl(${theme.foreground})`, opacity: 0.8 }} />
          <div className="rounded-lg p-2 space-y-1.5" style={{ backgroundColor: `hsl(${theme.card})`, border: `1px solid hsl(${theme.border})` }}>
            <div className="h-2 w-16 rounded" style={{ backgroundColor: `hsl(${theme.mutedForeground})` }} />
            <div className="h-6 rounded border" style={{ borderColor: `hsl(${theme.inputBorder})`, backgroundColor: `hsl(${theme.card})` }} />
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-14 rounded text-[8px] flex items-center justify-center font-medium" style={{ backgroundColor: `hsl(${theme.primary})`, color: `hsl(${theme.primaryForeground})` }}>
                Salvar
              </div>
              <div className="h-5 w-14 rounded text-[8px] flex items-center justify-center font-medium" style={{ backgroundColor: `hsl(${theme.muted})`, color: `hsl(${theme.mutedForeground})` }}>
                Cancelar
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <div className="h-4 w-10 rounded text-[7px] flex items-center justify-center" style={{ backgroundColor: `hsl(${theme.success})`, color: "white" }}>OK</div>
            <div className="h-4 w-10 rounded text-[7px] flex items-center justify-center" style={{ backgroundColor: `hsl(${theme.warning})`, color: "white" }}>Aviso</div>
            <div className="h-4 w-10 rounded text-[7px] flex items-center justify-center" style={{ backgroundColor: `hsl(${theme.destructive})`, color: "white" }}>Erro</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonalizarCores() {
  const { theme, setTheme, resetTheme, applyPalette, typography, setTypography, schedule, setSchedule, dark, toggleDarkMode, autoDark, setAutoDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shareCode, setShareCode] = useState("");
  const [importCode, setImportCode] = useState("");

  // Check URL for shared theme on mount
  useState(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#tema=")) {
      try {
        const decoded = JSON.parse(atob(decodeURIComponent(hash.slice(6))));
        applyPalette(decoded);
        toast.success("Tema compartilhado aplicado!");
        window.history.replaceState(null, "", window.location.pathname);
      } catch { /* erro ignorado */ }
    }
  });

  const handleReset = () => {
    resetTheme();
    toast.success("Tema restaurado ao padrão");
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gp-tema.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tema exportado com sucesso");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        applyPalette(imported);
        toast.success("Tema importado com sucesso");
      } catch {
        toast.error("Arquivo JSON inválido");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generateShareLink = () => {
    const encoded = encodeURIComponent(btoa(JSON.stringify(theme)));
    const link = `${window.location.origin}/configuracoes/personalizar-cores#tema=${encoded}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  };

  const generateShareCode = () => {
    const code = btoa(JSON.stringify(theme));
    setShareCode(code);
    navigator.clipboard.writeText(code);
    toast.success("Código copiado para a área de transferência!");
  };

  const applyShareCode = () => {
    if (!importCode.trim()) {
      toast.error("Cole o código de tema primeiro");
      return;
    }
    try {
      const decoded = JSON.parse(atob(importCode.trim()));
      applyPalette(decoded);
      setImportCode("");
      toast.success("Tema aplicado com sucesso!");
    } catch {
      toast.error("Código de tema inválido");
    }
  };

  return (
    <div className="page-container max-w-6xl mx-auto">
      <PageHeader
        title="Personalização de Cores"
        description="Configure a identidade visual do sistema com cores personalizadas"
      />

      {/* Dicas de UX */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Eye size={20} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Dicas de UX para cores</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• <strong>Regra 60-30-10:</strong> 60% cor neutra (fundo), 30% cor secundária (menus/borda), 10% cor de destaque (botões)</li>
                <li>• <strong>Evite preto puro:</strong> Prefira cinza escuro para reduzir fadiga visual</li>
                <li>• <strong>Visualização em tempo real:</strong> As alterações são aplicadas instantaneamente</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Color sections */}
        <div className="lg:col-span-2 space-y-4">
          {/* Menu Lateral */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PanelLeft size={16} />
                Menu Lateral / Topo
              </CardTitle>
              <CardDescription>Cores do menu de navegação</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <ColorField label="Fundo" description="Cor de fundo do menu lateral" value={theme.sidebarBg} onChange={v => setTheme({ sidebarBg: v })} />
              <ColorField label="Texto" description="Cor do texto e ícones do menu" value={theme.sidebarText} onChange={v => setTheme({ sidebarText: v })} />
              <ColorField label="Item Ativo" description="Cor do item selecionado no menu" value={theme.sidebarActive} onChange={v => setTheme({ sidebarActive: v })} />
            </CardContent>
          </Card>

          {/* Cor Primária */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette size={16} />
                Cor Primária
              </CardTitle>
              <CardDescription>Botões principais, links ativos e bordas em foco</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <ColorField label="Primária" description="Cor principal do sistema" value={theme.primary} onChange={v => setTheme({ primary: v })} />
              <ColorField label="Texto Primária" description="Texto sobre a cor primária" value={theme.primaryForeground} onChange={v => setTheme({ primaryForeground: v })} />
            </CardContent>
          </Card>

          {/* Botões */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MousePointerClick size={16} />
                Cores de Botões e Status
              </CardTitle>
              <CardDescription>Salvar, cancelar, sucesso, alerta e erro</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <ColorField label="Sucesso / Ação" description="Botões de salvar e confirmação" value={theme.accent} onChange={v => setTheme({ accent: v })} />
              <ColorField label="Alerta" description="Cor de avisos e advertências" value={theme.warning} onChange={v => setTheme({ warning: v })} />
              <ColorField label="Erro / Cancelar" description="Cor de erro e ações destrutivas" value={theme.destructive} onChange={v => setTheme({ destructive: v })} />
            </CardContent>
          </Card>

          {/* Campos de Entrada */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Type size={16} />
                Campos de Entrada (Inputs)
              </CardTitle>
              <CardDescription>Bordas de campos normais e obrigatórios</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <ColorField label="Borda Normal" description="Borda padrão dos campos" value={theme.inputBorder} onChange={v => setTheme({ inputBorder: v })} />
              <ColorField label="Borda Obrigatório" description="Indicador visual de campos obrigatórios" value={theme.inputRequiredBorder} onChange={v => setTheme({ inputRequiredBorder: v })} />
            </CardContent>
          </Card>

          {/* Fundo da Tela */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor size={16} />
                Fundo da Tela
              </CardTitle>
              <CardDescription>Cores da área de trabalho principal</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-4">
              <ColorField label="Fundo" description="Cor de fundo geral do sistema" value={theme.background} onChange={v => setTheme({ background: v })} />
              <ColorField label="Cartões" description="Fundo de cards e painéis" value={theme.card} onChange={v => setTheme({ card: v })} />
              <ColorField label="Bordas" description="Cor de bordas e divisores" value={theme.border} onChange={v => setTheme({ border: v })} />
              <ColorField label="Texto Principal" description="Cor do texto principal" value={theme.foreground} onChange={v => setTheme({ foreground: v })} />
              <ColorField label="Texto Secundário" description="Cor do texto secundário/sutil" value={theme.mutedForeground} onChange={v => setTheme({ mutedForeground: v })} />
              <ColorField label="Fundo Sutil" description="Fundo de áreas menos destacadas" value={theme.muted} onChange={v => setTheme({ muted: v })} />
            </CardContent>
          </Card>

          {/* Modo Escuro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Moon size={16} />
                Modo Escuro
              </CardTitle>
              <CardDescription>Controle manual, automático pelo sistema operacional ou por horário</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Modo escuro</Label>
                  <p className="text-xs text-muted-foreground">Ativar/desativar manualmente</p>
                </div>
                <Switch checked={dark} onCheckedChange={toggleDarkMode} disabled={autoDark} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Monitor size={14} />
                    Automático (sistema)
                  </Label>
                  <p className="text-xs text-muted-foreground">Seguir a preferência do sistema operacional</p>
                </div>
                <Switch checked={autoDark} onCheckedChange={setAutoDark} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <Label className="text-sm">Agendamento por horário</Label>
                <Switch checked={schedule.enabled} onCheckedChange={v => setSchedule({ enabled: v })} disabled={autoDark} />
              </div>
              {schedule.enabled && !autoDark && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Ativar escuro às</Label>
                    <Select value={String(schedule.startHour)} onValueChange={v => setSchedule({ startHour: Number(v) })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Desativar escuro às</Label>
                    <Select value={String(schedule.endHour)} onValueChange={v => setSchedule({ endHour: Number(v) })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>{String(i).padStart(2, "0")}:00</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    <Clock size={12} className="inline mr-1" />
                    Modo escuro das {String(schedule.startHour).padStart(2, "0")}:00 às {String(schedule.endHour).padStart(2, "0")}:00
                    {dark ? " — Ativo agora" : " — Inativo agora"}
                  </p>
                </div>
              )}

              {autoDark && (
                <p className="text-xs text-muted-foreground">
                  <Monitor size={12} className="inline mr-1" />
                  Seguindo preferência do sistema — {dark ? "escuro ativo" : "claro ativo"}
                </p>
              )}
            </CardContent>
          </Card>


          {/* Tipografia e Espaçamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ALargeSmall size={16} />
                Tipografia e Espaçamento
              </CardTitle>
              <CardDescription>Fonte, tamanho do texto e espaçamento do layout</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Fonte</Label>
                <Select value={typography.fontFamily} onValueChange={v => setTypography({ fontFamily: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fontOptions.map(f => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Tamanho do Texto</Label>
                <Select value={typography.fontSize} onValueChange={v => setTypography({ fontSize: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label} ({f.value})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Espaçamento</Label>
                <Select value={typography.spacing} onValueChange={v => setTypography({ spacing: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {spacingOptions.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border p-3 mt-2" style={{ fontFamily: typography.fontFamily }}>
                <p className="text-sm font-medium">Pré-visualização da fonte</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview + Palettes */}
        <div className="space-y-4">
          {/* Live Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye size={16} />
                Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PreviewCard theme={theme} />
            </CardContent>
          </Card>

          {/* Preset Palettes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Palette size={16} />
                Paletas Prontas
              </CardTitle>
              <CardDescription>Combinações de cores sugeridas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {presetPalettes.map(p => {
                const preview = { ...defaultTheme, ...p.theme };
                return (
                  <button
                    key={p.name}
                    onClick={() => { applyPalette(p.theme); toast.success(`Paleta "${p.name}" aplicada`); }}
                    className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="flex gap-1">
                        {[preview.primary, preview.sidebarBg, preview.accent].map((c, i) => (
                          <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: `hsl(${c})` }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Export / Import / Reset */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download size={16} />
                Exportar / Importar
              </CardTitle>
              <CardDescription>Salve ou carregue suas configurações de tema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" onClick={handleExport} className="w-full gap-2">
                <Download size={14} />
                Exportar Tema (JSON)
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full gap-2">
                <Upload size={14} />
                Importar Tema (JSON)
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </CardContent>
          </Card>

          {/* Share */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 size={16} />
                Compartilhar Tema
              </CardTitle>
              <CardDescription>Compartilhe via link ou código</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={generateShareLink} className="w-full gap-2 text-xs">
                <Link size={14} />
                Copiar Link de Compartilhamento
              </Button>
              <Button variant="outline" onClick={generateShareCode} className="w-full gap-2 text-xs">
                <Copy size={14} />
                Gerar Código do Tema
              </Button>
              {shareCode && (
                <div className="p-2 rounded-md bg-muted">
                  <p className="text-[10px] text-muted-foreground mb-1">Código copiado:</p>
                  <p className="text-[9px] font-mono break-all text-foreground leading-tight max-h-16 overflow-y-auto">{shareCode}</p>
                </div>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">Aplicar código recebido:</p>
              <Input
                placeholder="Cole o código aqui..."
                value={importCode}
                onChange={e => setImportCode(e.target.value)}
                className="text-xs font-mono h-8"
              />
              <Button variant="outline" onClick={applyShareCode} className="w-full gap-2 text-xs">
                <ClipboardPaste size={14} />
                Aplicar Código
              </Button>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={handleReset} className="w-full gap-2">
            <RotateCcw size={14} />
            Restaurar Padrão
          </Button>
        </div>
      </div>
    </div>
  );
}
