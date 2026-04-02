import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, Save, RotateCcw } from "lucide-react";
import {
  type UserRole,
  type ModuleId,
  ALL_MODULES,
  getRoleModulePermissions,
  saveRoleModulePermissions,
  useAuth,
} from "@/contexts/AuthContext";
import { addAuditLog } from "@/lib/auditLog";

const roles: { id: UserRole; label: string; color: string }[] = [
  { id: "gerente", label: "Gerente", color: "bg-primary text-primary-foreground" },
  { id: "supervisor", label: "Supervisor", color: "bg-accent text-accent-foreground" },
  { id: "vendedor", label: "Vendedor", color: "bg-chart-2 text-white" },
  { id: "financeiro", label: "Financeiro", color: "bg-chart-4 text-white" },
  { id: "estoquista", label: "Estoquista", color: "bg-chart-3 text-white" },
  { id: "tecnico", label: "Técnico", color: "bg-chart-5 text-white" },
  { id: "operador", label: "Operador de Caixa", color: "bg-secondary text-secondary-foreground" },
];

export default function PermissoesModulos() {
  const { user } = useAuth();
  const [perms, setPerms] = useState<Record<UserRole, ModuleId[]>>(() => getRoleModulePermissions());
  const [dirty, setDirty] = useState(false);

  const toggle = (role: UserRole, mod: ModuleId) => {
    setPerms(prev => {
      const current = prev[role] || [];
      const next = current.includes(mod) ? current.filter(m => m !== mod) : [...current, mod];
      return { ...prev, [role]: next };
    });
    setDirty(true);
  };

  const handleSave = () => {
    saveRoleModulePermissions(perms);
    if (user) {
      const changedRoles = roles.map(r => r.label).join(", ");
      addAuditLog("permissoes_alteradas", user, `Perfis atualizados: ${changedRoles}`);
    }
    setDirty(false);
    toast.success("Permissões salvas com sucesso!");
  };

  const handleReset = () => {
    localStorage.removeItem("role-module-permissions");
    setPerms(getRoleModulePermissions());
    if (user) addAuditLog("permissoes_restauradas", user, "Permissões restauradas ao padrão");
    setDirty(false);
    toast.info("Permissões restauradas para o padrão");
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Permissões por Módulo"
        description="Configure o acesso granular de cada perfil aos módulos do sistema"
      />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield size={16} className="text-primary" />
          <span>Administrador tem acesso total (não configurável)</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw size={14} /> Restaurar Padrão
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty} className="gap-1.5">
            <Save size={14} /> Salvar Permissões
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium sticky left-0 bg-muted/50 z-10 min-w-[160px]">Módulo</th>
              {roles.map(r => (
                <th key={r.id} className="p-3 text-center min-w-[100px]">
                  <Badge className={r.color}>{r.label}</Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_MODULES.map(mod => (
              <tr key={mod.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3 font-medium sticky left-0 bg-background z-10">{mod.label}</td>
                {roles.map(r => (
                  <td key={r.id} className="p-3 text-center">
                    <Switch
                      checked={(perms[r.id] || []).includes(mod.id)}
                      onCheckedChange={() => toggle(r.id, mod.id)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        As alterações afetam imediatamente o menu e o controle de acesso de rotas para cada perfil.
      </p>
    </div>
  );
}
