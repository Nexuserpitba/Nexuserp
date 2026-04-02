import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addAuditLog } from "@/lib/auditLog";
import { getPermissoesUsuario } from "@/lib/permissionService";
import { loginComSenha, loginComBiometria, logoutBackend } from "@/lib/authService";
import type { User } from "@supabase/supabase-js";

export type UserRole = "administrador" | "gerente" | "operador" | "vendedor" | "supervisor" | "financeiro" | "estoquista" | "tecnico";

export interface SystemUser {
  id: string;
  nome: string;
  login: string;
  senha: string;
  role: UserRole;
  ativo: boolean;
  criadoEm: string;
  limiteDesconto?: number;
  comissao?: number;
  departamento?: string;
  escala?: string;
  observacoes?: string;
  modulosPermitidos?: ModuleId[];
  /** RBAC granular permissions */
  permissoes?: string[];
}

export const defaultDiscountLimits: Record<UserRole, number> = {
  administrador: 100,
  gerente: 30,
  supervisor: 20,
  vendedor: 10,
  financeiro: 5,
  estoquista: 5,
  tecnico: 5,
  operador: 5,
};

// ===== Module Permissions System =====
export const ALL_MODULES = [
  { id: "dashboard", label: "Dashboard", path: "/" },
  { id: "bi", label: "BI Inteligente", path: "/bi" },
  { id: "cadastros", label: "Cadastros", path: "/cadastros" },
  { id: "produtos_estoque", label: "Produtos e Estoque", path: "/estoque" },
  { id: "pdv", label: "PDV", path: "/pdv" },
  { id: "fiscal_nfe", label: "Fiscal - NF-e", path: "/fiscal" },
  { id: "fiscal_nfse", label: "Fiscal - NFS-e", path: "/fiscal/nfse" },
  { id: "financeiro", label: "Financeiro", path: "/financeiro" },
  { id: "compras", label: "Compras", path: "/compras" },
  { id: "relatorios", label: "Relatórios", path: "/relatorios" },
  { id: "comercial", label: "Comercial", path: "/comercial" },
  { id: "crm", label: "CRM", path: "/crm" },
  { id: "servicos", label: "Serviços", path: "/servicos" },
  { id: "producao", label: "Produção", path: "/producao" },
  { id: "tabelas", label: "Tabelas Fiscais", path: "/tabelas" },
  { id: "configuracoes", label: "Configurações", path: "/configuracoes" },
] as const;

export type ModuleId = typeof ALL_MODULES[number]["id"];

const defaultRoleModules: Record<UserRole, ModuleId[]> = {
  administrador: ALL_MODULES.map(m => m.id),
  gerente: ["dashboard", "bi", "cadastros", "produtos_estoque", "financeiro", "relatorios", "comercial", "crm", "compras", "configuracoes"],
  supervisor: ["dashboard", "bi", "cadastros", "produtos_estoque", "pdv", "relatorios", "comercial", "crm"],
  vendedor: ["dashboard", "pdv", "cadastros", "comercial", "crm"],
  financeiro: ["dashboard", "bi", "financeiro", "fiscal_nfe", "fiscal_nfse", "relatorios", "tabelas"],
  estoquista: ["dashboard", "cadastros", "produtos_estoque", "compras"],
  tecnico: ["dashboard", "servicos", "cadastros"],
  operador: ["dashboard", "pdv", "cadastros"],
};

export function getRoleModulePermissions(): Record<UserRole, ModuleId[]> {
  try {
    const s = localStorage.getItem("role-module-permissions");
    if (s) {
      const parsed = JSON.parse(s);
      return { ...defaultRoleModules, ...parsed };
    }
  } catch { /* erro ignorado */ }
  return { ...defaultRoleModules };
}

export function saveRoleModulePermissions(perms: Record<UserRole, ModuleId[]>) {
  localStorage.setItem("role-module-permissions", JSON.stringify(perms));
}

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginBiometria: (biometriaToken: string) => Promise<boolean>;
  signup: (email: string, password: string, nome: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  isAllowed: (requiredRoles: UserRole[]) => boolean;
  hasAccess: (path: string) => boolean;
  hasModule: (moduleId: ModuleId) => boolean;
  /** RBAC: check granular permission */
  hasPermissao: (codigo: string) => boolean;
  /** Reload permissions from backend */
  reloadPermissoes: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getModuleForPath(path: string): ModuleId | null {
  if (path === "/") return "dashboard";
  if (path.startsWith("/pdv")) return "pdv";
  if (path.startsWith("/cadastros/contas-bancarias")) return "financeiro";
  if (path.startsWith("/cadastros/produtos") || path.startsWith("/cadastros/categorias")) return "produtos_estoque";
  if (path.startsWith("/cadastros")) return "cadastros";
  if (path.startsWith("/estoque")) return "produtos_estoque";
  if (path.startsWith("/producao")) return "producao";
  if (path.startsWith("/fiscal/nfse") || path.startsWith("/fiscal/emissao-nfse") || path.startsWith("/fiscal/consulta-nfse") || path.startsWith("/fiscal/cancelamento-nfse")) return "fiscal_nfse";
  if (path.startsWith("/fiscal")) return "fiscal_nfe";
  if (path.startsWith("/financeiro")) return "financeiro";
  if (path.startsWith("/compras")) return "compras";
  if (path.startsWith("/relatorios")) return "relatorios";
  if (path.startsWith("/comercial")) return "comercial";
  if (path.startsWith("/crm")) return "crm";
  if (path.startsWith("/servicos")) return "servicos";
  if (path.startsWith("/tabelas")) return "tabelas";
  if (path.startsWith("/configuracoes")) return "configuracoes";
  return null;
}

/** Build a SystemUser from Supabase profile + role data */
async function buildSystemUser(
  authUser: User,
  profile: any,
  role: UserRole
): Promise<SystemUser> {
  // Fetch granular RBAC permissions
  let permissoes: string[] = [];
  try {
    const perms = await getPermissoesUsuario(authUser.id);
    permissoes = perms.map(p => p.codigo);
  } catch {
    // Fallback: permissions will be loaded on demand
  }

  return {
    id: authUser.id,
    nome: profile?.nome || authUser.email || "",
    login: profile?.login || authUser.email || "",
    senha: "",
    role,
    ativo: profile?.ativo ?? true,
    criadoEm: authUser.created_at || new Date().toISOString(),
    limiteDesconto: profile?.limite_desconto ?? defaultDiscountLimits[role],
    comissao: profile?.comissao ?? 0,
    departamento: profile?.departamento || "",
    escala: profile?.escala || "",
    observacoes: profile?.observacoes || "",
    permissoes,
  };
}

async function fetchUserData(authUser: User): Promise<SystemUser | null> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .limit(1)
      .single();

    const role = (roleData?.role as UserRole) || "operador";
    return await buildSystemUser(authUser, profile, role);
  } catch {
    return null;
  }
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const sysUser = await fetchUserData(session.user);
            setUser(sysUser);
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check existing Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const sysUser = await fetchUserData(session.user);
        setUser(sysUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) return false;

      const sysUser = await fetchUserData(data.user);
      if (sysUser) {
        setUser(sysUser);
        addAuditLog("login", sysUser);

        // Sync with backend for terminal session
        const terminalId = localStorage.getItem("terminal-id");
        if (terminalId) {
          try {
            await loginComSenha(email, password, terminalId);
          } catch {
            // Backend sync is optional
          }
        }

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const loginBiometria = useCallback(async (biometriaToken: string): Promise<boolean> => {
    try {
      const terminalId = localStorage.getItem("terminal-id") || "default";
      const result = await loginComBiometria(biometriaToken, terminalId);

      if (!result.sucesso) return false;

      // After backend auth, sign in to Supabase session too
      // The user should already have a Supabase session from the biometric webhook
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const sysUser = await fetchUserData(session.user);
        if (sysUser) {
          setUser(sysUser);
          addAuditLog("login_biometria", sysUser);
          return true;
        }
      }

      // Fallback: build user from backend response
      const sysUser: SystemUser = {
        id: result.usuario.id,
        nome: result.usuario.nome,
        login: result.usuario.email || result.usuario.nome,
        senha: "",
        role: (result.usuario.role as UserRole) || "operador",
        ativo: true,
        criadoEm: new Date().toISOString(),
        permissoes: result.permissoes,
      };
      setUser(sysUser);
      addAuditLog("login_biometria", sysUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, nome: string, role: UserRole = "operador"): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome, login: email, role },
        },
      });

      if (error || !data.user) return false;
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) addAuditLog("logout", user);
    try { await supabase.auth.signOut(); } catch { /* erro ignorado */ }
    try { await logoutBackend(); } catch { /* erro ignorado */ }
    setUser(null);
  }, [user]);

  const isAllowed = useCallback((requiredRoles: UserRole[]): boolean => {
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }, [user]);

  const hasModule = useCallback((moduleId: ModuleId): boolean => {
    if (!user) return false;
    if (user.role === "administrador") return true;
    if (user.modulosPermitidos && user.modulosPermitidos.length > 0) {
      return user.modulosPermitidos.includes(moduleId);
    }
    const perms = getRoleModulePermissions();
    return (perms[user.role] || []).includes(moduleId);
  }, [user]);

  const hasAccess = useCallback((path: string): boolean => {
    if (!user) return false;
    if (user.role === "administrador") return true;
    const mod = getModuleForPath(path);
    if (!mod) return true;
    return hasModule(mod);
  }, [user, hasModule]);

  const hasPermissao = useCallback((codigo: string): boolean => {
    if (!user) return false;
    if (user.role === "administrador") return true;
    return (user.permissoes || []).includes(codigo);
  }, [user]);

  const reloadPermissoes = useCallback(async () => {
    if (!user) return;
    try {
      const perms = await getPermissoesUsuario(user.id);
      setUser(prev => prev ? { ...prev, permissoes: perms.map(p => p.codigo) } : null);
    } catch {
      // Silently fail
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginBiometria,
      signup,
      logout,
      isAllowed,
      hasAccess,
      hasModule,
      hasPermissao,
      reloadPermissoes,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
