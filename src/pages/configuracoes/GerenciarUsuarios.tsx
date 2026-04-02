import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, Eye, EyeOff, ArrowLeft, Settings2, Loader2, Info, Lock, FlaskConical, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserRole, type ModuleId, defaultDiscountLimits, ALL_MODULES, getRoleModulePermissions, saveRoleModulePermissions } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

interface SupabaseUser {
  id: string;
  email: string;
  nome: string;
  login: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
  limiteDesconto: number;
  comissao: number;
  departamento: string;
  escala: string;
  observacoes: string;
}

const roleLabels: Record<UserRole, string> = {
  administrador: "Administrador",
  gerente: "Gerente",
  supervisor: "Supervisor",
  vendedor: "Vendedor",
  financeiro: "Financeiro",
  estoquista: "Estoquista",
  tecnico: "Técnico",
  operador: "Operador de Caixa",
};

const roleColors: Record<UserRole, string> = {
  administrador: "bg-destructive text-destructive-foreground",
  gerente: "bg-primary text-primary-foreground",
  supervisor: "bg-accent text-accent-foreground",
  vendedor: "bg-chart-2 text-white",
  financeiro: "bg-chart-4 text-white",
  estoquista: "bg-chart-3 text-white",
  tecnico: "bg-chart-5 text-white",
  operador: "bg-secondary text-secondary-foreground",
};

const roleDescriptions: Record<UserRole, string> = {
  administrador: "Acesso total ao sistema",
  gerente: "Relatórios, financeiro, cadastros e estoque",
  supervisor: "PDV, cadastros, estoque e comercial",
  vendedor: "PDV, clientes, produtos e CRM",
  financeiro: "Financeiro, fiscal e relatórios",
  estoquista: "Produtos, estoque e compras",
  tecnico: "Ordens de serviço e clientes",
  operador: "PDV, vendas e consulta de produtos/clientes",
};

const departamentos = [
  "Administrativo", "Comercial", "Financeiro", "Estoque", "Produção",
  "TI", "Logística", "Atendimento", "RH", "Outro",
];

const escalas = ["5x2", "6x1", "12x36", "Livre", "Outro"];

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "administrador";
  const isGerente = currentUser?.role === "gerente";
  const canDelete = isAdmin;
  const canCreateAdmin = isAdmin;
  const canEditAdmin = isAdmin;
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<SupabaseUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [busca, setBusca] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<UserRole>("operador");
  const [ativo, setAtivo] = useState(true);
  const [limiteDesconto, setLimiteDesconto] = useState("");
  const [comissao, setComissao] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [escala, setEscala] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [useCustomModules, setUseCustomModules] = useState(false);
  const [modulosPermitidos, setModulosPermitidos] = useState<ModuleId[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "list-users" },
      });
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (err: any) {
      toast.error("Erro ao carregar usuários: " + (err.message || ""));
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetForm = () => {
    setNome(""); setEmail(""); setSenha(""); setRole("operador");
    setAtivo(true); setShowPassword(false); setLimiteDesconto("");
    setComissao(""); setDepartamento(""); setEscala(""); setObservacoes("");
    setUseCustomModules(false); setModulosPermitidos([]);
  };

  const openNew = () => { setEditUser(null); resetForm(); setEditOpen(true); };

  const openEdit = (u: SupabaseUser) => {
    setEditUser(u); setNome(u.nome); setEmail(u.email || u.login); setSenha("");
    setRole(u.role); setAtivo(u.ativo); setShowPassword(false);
    setLimiteDesconto(u.limiteDesconto !== undefined ? String(u.limiteDesconto) : "");
    setComissao(u.comissao !== undefined ? String(u.comissao) : "");
    setDepartamento(u.departamento || ""); setEscala(u.escala || "");
    setObservacoes(u.observacoes || "");
    setUseCustomModules(false);
    setModulosPermitidos([]);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !email.trim()) { toast.error("Preencha nome e e-mail"); return; }
    if (!editUser && !senha.trim()) { toast.error("Informe uma senha para o novo usuário"); return; }

    setSaving(true);
    try {
      const descLimit = limiteDesconto.trim() !== "" ? Math.min(100, Math.max(0, parseFloat(limiteDesconto) || 0)) : defaultDiscountLimits[role];
      const comissaoVal = comissao.trim() !== "" ? Math.min(100, Math.max(0, parseFloat(comissao) || 0)) : 0;

      if (editUser) {
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: {
            action: "update-user",
            userId: editUser.id,
            email: email.trim(),
            password: senha.trim() || undefined,
            nome: nome.trim(),
            role,
            ativo,
            limiteDesconto: descLimit,
            comissao: comissaoVal,
            departamento,
            escala,
            observacoes: observacoes.trim(),
          },
        });
        if (error) {
          let errMsg = "Falha ao atualizar usuário";
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              errMsg = body?.error || errMsg;
            } else if (error.message) {
              errMsg = error.message;
            }
          } catch { /* erro ignorado */ }
          throw new Error(errMsg);
        }
        if (data?.error) throw new Error(data.error);
        toast.success("Usuário atualizado");
      } else {
        const { data, error } = await supabase.functions.invoke("manage-users", {
          body: {
            action: "create-user",
            email: email.trim(),
            password: senha.trim(),
            nome: nome.trim(),
            role,
            ativo,
            limiteDesconto: descLimit,
            comissao: comissaoVal,
            departamento,
            escala,
            observacoes: observacoes.trim(),
          },
        });
        if (error) {
          // Parse error body from FunctionsHttpError
          let errMsg = "Falha ao criar usuário";
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              errMsg = body?.error || errMsg;
            } else if (error.message) {
              errMsg = error.message;
            }
          } catch { /* erro ignorado */ }
          throw new Error(errMsg);
        }
        if (data?.error) throw new Error(data.error);
        toast.success("Usuário criado");
      }
      setEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha ao salvar"));
    }
    setSaving(false);
  };

  const handleDelete = async (u: SupabaseUser) => {
    if (u.id === currentUser?.id) { toast.error("Não é possível excluir o próprio usuário"); return; }
    if (!confirm(`Excluir o usuário ${u.nome}?`)) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete-user", userId: u.id },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Usuário excluído");
      fetchUsers();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Falha ao excluir"));
    }
  };

  const [customRolesPerms, setCustomRolesPerms] = useState<Record<UserRole, ModuleId[]>>(getRoleModulePermissions());

  const handleToggleModule = (r: UserRole, modId: ModuleId) => {
    setCustomRolesPerms(prev => {
      const current = prev[r] || [];
      const next = current.includes(modId) 
        ? current.filter(m => m !== modId)
        : [...current, modId];
      return { ...prev, [r]: next };
    });
  };

  const handleSaveAllPerms = () => {
    saveRoleModulePermissions(customRolesPerms);
    toast.success("Permissões de perfis atualizadas com sucesso!");
    // Recarregar a página ou notificar contexto se necessário
    setTimeout(() => window.location.reload(), 1000);
  };

  const [dbHealth, setDbHealth] = useState<{ checked: boolean; ok: boolean; error?: string }>({ checked: false, ok: false });

  const checkDbHealth = async () => {
    setDbHealth(prev => ({ ...prev, checked: false }));
    try {
      // Tenta chamar a função RPC de teste (ou apenas uma que sabemos que criamos)
      const { error } = await supabase.rpc('bulk_update_produtos_codigo' as any, { p_updates: [] });
      if (error && error.message.includes("does not exist")) {
        setDbHealth({ checked: true, ok: false, error: "Função RPC 'bulk_update_produtos_codigo' não encontrada." });
      } else {
        setDbHealth({ checked: true, ok: true });
      }
    } catch (err: any) {
      setDbHealth({ checked: true, ok: false, error: err.message });
    }
  };

  useEffect(() => {
    checkDbHealth();
  }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return users;
    const q = busca.toLowerCase();
    return users.filter(u => u.nome.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.departamento || "").toLowerCase().includes(q));
  }, [busca, users]);

  return (
    <div className="page-container">
      <PageHeader title="Gerenciar Usuários" description="Controle de acesso, perfis e configurações do sistema" />

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="usuarios" className="gap-2"><Shield size={16} /> Usuários</TabsTrigger>
          <TabsTrigger value="permissoes" className="gap-2"><Settings2 size={16} /> Permissões de Perfis</TabsTrigger>
          <TabsTrigger value="saude" className="gap-2"><FlaskConical size={16} /> Saúde do Banco</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          {isGerente && (
            <div className="flex items-start gap-3 border border-border rounded-lg p-3 bg-muted/50">
              <Info size={18} className="text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Permissões do perfil Gerente</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">✅ Listar usuários</span>
                  <span className="flex items-center gap-1">✅ Criar usuários (exceto admin)</span>
                  <span className="flex items-center gap-1">✅ Editar usuários (exceto admin)</span>
                  <span className="flex items-center gap-1 text-destructive">🔒 Excluir usuários</span>
                  <span className="flex items-center gap-1 text-destructive">🔒 Criar/promover a Administrador</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(roleLabels) as UserRole[]).map(r => {
              const count = users.filter(u => u.role === r && u.ativo).length;
              return (
                <div key={r} className="border border-border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={roleColors[r]}>{roleLabels[r]}</Badge>
                    <span className="text-lg font-bold font-mono">{count}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{roleDescriptions[r]}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Input placeholder="Buscar por nome, e-mail ou departamento..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
            <Button onClick={openNew} className="gap-1.5 ml-auto"><Plus size={16} /> Novo Usuário</Button>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="animate-spin" size={20} /> Carregando usuários...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="hidden md:table-cell">Departamento</TableHead>
                    <TableHead className="hidden md:table-cell">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                  ) : filtrados.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="font-mono text-sm">{u.email}</TableCell>
                      <TableCell><Badge className={roleColors[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.departamento || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{u.comissao ? `${u.comissao}%` : "—"}</TableCell>
                      <TableCell><Badge variant={u.ativo ? "default" : "secondary"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <TooltipProvider>
                            {(!canEditAdmin && u.role === "administrador") ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled><Lock size={14} className="text-muted-foreground" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Gerentes não podem editar administradores</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
                            )}
                            {canDelete ? (
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(u)} disabled={u.id === currentUser?.id}><Trash2 size={14} /></Button>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled><Trash2 size={14} className="text-muted-foreground" /></Button>
                                </TooltipTrigger>
                                <TooltipContent>Apenas administradores podem excluir</TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="permissoes" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Configuração Global de Módulos</AlertTitle>
            <AlertDescription>
              Aqui você define quais módulos cada cargo pode acessar por padrão. Administradores sempre têm acesso total.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.keys(roleLabels) as UserRole[]).filter(r => r !== 'administrador').map(r => (
              <Card key={r} className="flex flex-col">
                <CardContent className="p-4 flex-1">
                  <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <Badge className={roleColors[r]}>{roleLabels[r]}</Badge>
                    <Shield size={16} className="text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {ALL_MODULES.map(mod => (
                      <div key={mod.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`mod-${r}-${mod.id}`} 
                          checked={(customRolesPerms[r] || []).includes(mod.id)}
                          onCheckedChange={() => handleToggleModule(r, mod.id)}
                        />
                        <label 
                          htmlFor={`mod-${r}-${mod.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {mod.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end p-4 bg-muted/30 rounded-lg border border-dashed">
            <Button onClick={handleSaveAllPerms} className="gap-2">
              <Settings2 size={16} /> Salvar Todas as Permissões
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="saude" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold">Saúde das Permissões do Banco de Dados</h3>
                    <p className="text-sm text-muted-foreground">Verificação das funções e políticas RLS necessárias para o sistema.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={checkDbHealth} className="gap-2">
                    <RefreshCw size={14} /> Atualizar Status
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${dbHealth.ok ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {dbHealth.ok ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                      </div>
                      <div>
                        <p className="font-medium">Funções de Atualização em Massa</p>
                        <p className="text-xs text-muted-foreground">RPC: bulk_update_produtos_codigo</p>
                      </div>
                    </div>
                    <div>
                      {dbHealth.ok ? (
                        <Badge className="bg-green-500">Operacional</Badge>
                      ) : (
                        <Badge variant="destructive">Não Encontrada</Badge>
                      )}
                    </div>
                  </div>

                  {!dbHealth.ok && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Ação Necessária!</AlertTitle>
                      <AlertDescription>
                        Identificamos que as funções de banco necessárias para a re-sequenciação e outras operações em massa não estão instaladas.
                        <div className="mt-4 p-3 bg-destructive/10 rounded border border-destructive/20 text-xs font-mono">
                          Para resolver, execute o script SQL de permissões no Supabase.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {dbHealth.ok && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-700 flex items-center gap-3">
                      <ShieldCheck size={18} />
                      As permissões de banco de dados parecem estar configuradas corretamente.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={v => !v && setEditOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              {editUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Nome completo *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>{editUser ? "Nova senha (opcional)" : "Senha *"}</Label>
                <div className="flex gap-1">
                  <Input type={showPassword ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} placeholder={editUser ? "Deixe em branco para manter" : "Senha"} />
                  <Button variant="ghost" size="icon" type="button" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Perfil de acesso *</Label>
                <Select value={role} onValueChange={v => setRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(roleLabels) as UserRole[]).map(r => (
                      <SelectItem key={r} value={r} disabled={!canCreateAdmin && r === "administrador"}>
                        <div className="flex items-center gap-2">
                          <Shield size={14} />
                          {roleLabels[r]}
                          {!canCreateAdmin && r === "administrador" && <Lock size={12} className="text-muted-foreground ml-1" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={departamento} onValueChange={setDepartamento}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input type="number" min="0" max="100" step="0.5" value={comissao} onChange={e => setComissao(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Limite desconto (%)</Label>
                <Input type="number" min="0" max="100" step="any" value={limiteDesconto} onChange={e => setLimiteDesconto(e.target.value)} placeholder={`${defaultDiscountLimits[role]}%`} />
              </div>
              <div className="space-y-2">
                <Label>Escala</Label>
                <Select value={escala} onValueChange={setEscala}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {escalas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {role !== "administrador" && (
              <div className="space-y-3 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 size={16} className="text-primary" />
                    <Label className="font-medium">Permissões personalizadas</Label>
                  </div>
                  <Switch checked={useCustomModules} onCheckedChange={(v) => {
                    setUseCustomModules(v);
                    if (v && modulosPermitidos.length === 0) {
                      const rolePerms = getRoleModulePermissions();
                      setModulosPermitidos(rolePerms[role] || []);
                    }
                  }} />
                </div>
                {useCustomModules && (
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_MODULES.map(mod => (
                      <label key={mod.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1">
                        <input type="checkbox" className="rounded border-border" checked={modulosPermitidos.includes(mod.id)} onChange={(e) => {
                          setModulosPermitidos(prev => e.target.checked ? [...prev, mod.id] : prev.filter(m => m !== mod.id));
                        }} />
                        {mod.label}
                      </label>
                    ))}
                  </div>
                )}
                {!useCustomModules && (
                  <p className="text-xs text-muted-foreground">Usando permissões padrão do perfil ({roleLabels[role]})</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações sobre o usuário" />
            </div>

            <div className="flex items-center justify-between">
              <Label>Usuário ativo</Label>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin mr-1" />}
              {editUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
