import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint, Wifi, Link, Unlink, Activity, Settings, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BiometriaConfig {
  id: string;
  dispositivoNome: string;
  dispositivoIp: string;
  dispositivoPorta: number;
  softwareIntegracao: string;
  webhookUrl: string;
  ativo: boolean;
}

interface BiometriaUsuario {
  id: string;
  userId: string;
  biometriaId: string;
  nomeDispositivo: string;
  ativo: boolean;
  userName?: string;
}

interface BiometriaEvento {
  id: string;
  biometriaId: string;
  userId?: string;
  eventoTipo: string;
  status: string;
  createdAt: string;
  userName?: string;
}

interface UserProfile {
  id: string;
  nome: string;
  login: string;
  ativo: boolean;
}

export default function BiometriaHardware() {
  const [config, setConfig] = useState<BiometriaConfig | null>(null);
  const [usuarios, setUsuarios] = useState<BiometriaUsuario[]>([]);
  const [eventos, setEventos] = useState<BiometriaEvento[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [biometriaIdInput, setBiometriaIdInput] = useState("");

  const [configForm, setConfigForm] = useState({
    dispositivoNome: "CM 351",
    dispositivoIp: "",
    dispositivoPorta: 9000,
    softwareIntegracao: "InControl Web",
    webhookUrl: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConfig(), loadVinculos(), loadEventos(), loadProfiles()]);
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    const { data } = await supabase
      .from("biometria_config")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      const cfg: BiometriaConfig = {
        id: data.id,
        dispositivoNome: data.dispositivo_nome,
        dispositivoIp: data.dispositivo_ip || "",
        dispositivoPorta: data.dispositivo_porta,
        softwareIntegracao: data.software_integracao,
        webhookUrl: data.webhook_url || "",
        ativo: data.ativo,
      };
      setConfig(cfg);
      setConfigForm({
        dispositivoNome: cfg.dispositivoNome,
        dispositivoIp: cfg.dispositivoIp,
        dispositivoPorta: cfg.dispositivoPorta,
        softwareIntegracao: cfg.softwareIntegracao,
        webhookUrl: cfg.webhookUrl,
      });
    }
  };

  const loadVinculos = async () => {
    const { data } = await supabase
      .from("biometria_usuarios")
      .select("*")
      .eq("ativo", true);

    if (data) {
      const vinculos: BiometriaUsuario[] = data.map((d) => ({
        id: d.id,
        userId: d.user_id,
        biometriaId: d.biometria_id,
        nomeDispositivo: d.nome_dispositivo || "",
        ativo: d.ativo,
      }));
      setUsuarios(vinculos);
    }
  };

  const loadEventos = async () => {
    const { data } = await supabase
      .from("biometria_eventos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const evts: BiometriaEvento[] = data.map((d) => ({
        id: d.id,
        biometriaId: d.biometria_id,
        userId: d.user_id || undefined,
        eventoTipo: d.evento_tipo,
        status: d.status,
        createdAt: d.created_at,
      }));
      setEventos(evts);
    }
  };

  const loadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, login, ativo")
      .eq("ativo", true);

    if (data) {
      setProfiles(data as UserProfile[]);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase
          .from("biometria_config")
          .update({
            dispositivo_nome: configForm.dispositivoNome,
            dispositivo_ip: configForm.dispositivoIp,
            dispositivo_porta: configForm.dispositivoPorta,
            software_integracao: configForm.softwareIntegracao,
            webhook_url: configForm.webhookUrl,
          })
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("biometria_config")
          .insert({
            dispositivo_nome: configForm.dispositivoNome,
            dispositivo_ip: configForm.dispositivoIp,
            dispositivo_porta: configForm.dispositivoPorta,
            software_integracao: configForm.softwareIntegracao,
            webhook_url: configForm.webhookUrl,
            ativo: true,
          });

        if (error) throw error;
      }

      toast.success("Configuração salva com sucesso!");
      await loadConfig();
    } catch (err: any) {
      toast.error("Erro ao salvar configuração", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const vincularUsuario = async () => {
    if (!selectedUserId || !biometriaIdInput) {
      toast.error("Selecione um usuário e informe o ID biométrico");
      return;
    }

    try {
      const { error } = await supabase
        .from("biometria_usuarios")
        .insert({
          user_id: selectedUserId,
          biometria_id: biometriaIdInput,
          dispositivo_id: config?.id,
          nome_dispositivo: config?.dispositivoNome,
          ativo: true,
        });

      if (error) throw error;

      toast.success("Usuário vinculado com sucesso!");
      setDialogOpen(false);
      setSelectedUserId("");
      setBiometriaIdInput("");
      await loadVinculos();
    } catch (err: any) {
      toast.error("Erro ao vincular usuário", { description: err.message });
    }
  };

  const desvincularUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("biometria_usuarios")
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Usuário desvinculado com sucesso!");
      await loadVinculos();
    } catch (err: any) {
      toast.error("Erro ao desvincular usuário", { description: err.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sucesso":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case "nao_identificado":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Não Identificado</Badge>;
      case "usuario_inativo":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Usuário Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return "-";
    const profile = profiles.find((p) => p.id === userId);
    return profile?.nome || userId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração Biométrica"
        description="Configure o leitor biométrico Intelbras CM 351 e vincule usuários"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração do Dispositivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuração do Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Dispositivo</Label>
              <Input
                value={configForm.dispositivoNome}
                onChange={(e) => setConfigForm({ ...configForm, dispositivoNome: e.target.value })}
                placeholder="CM 351"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IP do Dispositivo</Label>
                <Input
                  value={configForm.dispositivoIp}
                  onChange={(e) => setConfigForm({ ...configForm, dispositivoIp: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              <div className="space-y-2">
                <Label>Porta</Label>
                <Input
                  type="number"
                  value={configForm.dispositivoPorta}
                  onChange={(e) => setConfigForm({ ...configForm, dispositivoPorta: parseInt(e.target.value) || 9000 })}
                  placeholder="9000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Software de Integração</Label>
              <Select
                value={configForm.softwareIntegracao}
                onValueChange={(v) => setConfigForm({ ...configForm, softwareIntegracao: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="InControl Web">InControl Web</SelectItem>
                  <SelectItem value="Defense IA">Defense IA</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL do Webhook (para receber eventos)</Label>
              <Input
                value={configForm.webhookUrl}
                onChange={(e) => setConfigForm({ ...configForm, webhookUrl: e.target.value })}
                placeholder="https://..."
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Configure esta URL no software Intelbras para receber eventos
              </p>
            </div>
            <Button onClick={saveConfig} disabled={saving} className="w-full">
              <Wifi className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </CardContent>
        </Card>

        {/* Status da Integração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Status da Integração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm">Dispositivo Configurado</span>
              {config?.dispositivoIp ? (
                <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Sim</Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Não</Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm">Usuários Vinculados</span>
              <Badge variant="outline">{usuarios.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm">Eventos Registrados</span>
              <Badge variant="outline">{eventos.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <span className="text-sm">Último Evento</span>
              <span className="text-sm text-muted-foreground">
                {eventos[0] ? new Date(eventos[0].createdAt).toLocaleString("pt-BR") : "Nenhum"}
              </span>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Como Configurar:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Instale o software Intelbras (InControl Web ou Defense IA)</li>
                <li>Conecte o CM 351 via IP na rede</li>
                <li>Cadastre as digitais no equipamento</li>
                <li>Configure o webhook no software Intelbras</li>
                <li>Vincule os IDs biométricos aos usuários aqui</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usuários Vinculados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Usuários Vinculados
          </CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Link className="w-4 h-4 mr-2" />
            Vincular Usuário
          </Button>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário vinculado ao leitor biométrico</p>
              <p className="text-sm">Clique em "Vincular Usuário" para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>ID Biométrico</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{getUserName(u.userId)}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{u.biometriaId}</code>
                    </TableCell>
                    <TableCell>{u.nomeDispositivo || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => desvincularUsuario(u.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log de Eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Log de Eventos Biométricos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum evento registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>ID Biométrico</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventos.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">
                      {new Date(e.createdAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{e.biometriaId}</code>
                    </TableCell>
                    <TableCell>{getUserName(e.userId)}</TableCell>
                    <TableCell className="capitalize">{e.eventoTipo}</TableCell>
                    <TableCell>{getStatusBadge(e.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para vincular usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5" />
              Vincular Usuário ao Leitor Biométrico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.login})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID Biométrico (do equipamento)</Label>
              <Input
                value={biometriaIdInput}
                onChange={(e) => setBiometriaIdInput(e.target.value)}
                placeholder="Ex: 1, 2, 3 ou código do usuário no CM 351"
              />
              <p className="text-xs text-muted-foreground">
                Este é o ID que o leitor CM 351 atribui ao usuário ao cadastrar a digital
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={vincularUsuario}>
              <Fingerprint className="w-4 h-4 mr-2" />
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
