import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, LogIn, User, ShieldCheck, ArrowLeft, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type SystemUser, type UserRole, defaultDiscountLimits } from "@/contexts/AuthContext";
import {
  isBiometricAvailable,
  authenticateWithBiometric,
} from "@/lib/biometricAuth";

interface PDVLoginProps {
  onLogin: (user: SystemUser) => void;
  onBack: () => void;
}

export function PDVLogin({ onLogin, onBack }: PDVLoginProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvail, setBiometricAvail] = useState(false);

  useEffect(() => {
    setBiometricAvail(isBiometricAvailable());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password.trim()) {
      toast.error("Informe usuário e senha");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: login.trim(),
        password: password.trim(),
      });

      if (error || !data.user) {
        toast.error("Usuário não encontrado ou senha incorreta");
        setLoading(false);
        return;
      }

      // Get profile and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .limit(1)
        .single();

      const role = (roleData?.role as UserRole) || "operador";
      const allowedRoles: UserRole[] = ["operador", "administrador", "supervisor", "vendedor"];

      if (!allowedRoles.includes(role)) {
        toast.error("Usuário sem permissão para PDV");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const sysUser: SystemUser = {
        id: data.user.id,
        nome: profile?.nome || data.user.email || "",
        login: profile?.login || data.user.email || "",
        senha: "",
        role,
        ativo: profile?.ativo ?? true,
        criadoEm: data.user.created_at || new Date().toISOString(),
        limiteDesconto: profile?.limite_desconto ?? defaultDiscountLimits[role],
        comissao: profile?.comissao ?? 0,
        departamento: profile?.departamento || "",
        escala: profile?.escala || "",
        observacoes: profile?.observacoes || "",
      };

      toast.success(`Bem-vindo, ${sysUser.nome}!`);
      onLogin(sysUser);
    } catch {
      toast.error("Erro ao fazer login");
    }
    setLoading(false);
  };

  const handleBiometric = async () => {
    setLoading(true);
    try {
      const userLogin = await authenticateWithBiometric();
      if (!userLogin) {
        toast.error("Biometria não reconhecida");
        setLoading(false);
        return;
      }
      toast.error("Biometria ainda não integrada com Supabase Auth");
    } catch {
      toast.error("Erro ao acessar biometria");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">PDV — Acesso</h1>
          <p className="text-sm text-muted-foreground">Informe suas credenciais para iniciar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="pdv-user">E-mail</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="pdv-user"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu e-mail"
                className="pl-10 h-12 text-base"
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pdv-pass">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="pdv-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="pl-10 h-12 text-base"
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 gap-2 text-base" disabled={loading}>
            <LogIn className="h-5 w-5" />
            {loading ? "Entrando..." : "Entrar no PDV"}
          </Button>
        </form>

        {biometricAvail && (
          <>
            <div className="relative flex items-center justify-center">
              <span className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></span>
              <span className="relative bg-background px-2 text-xs text-muted-foreground">ou</span>
            </div>
            <Button
              variant="outline"
              className="w-full h-12 gap-2 text-base"
              onClick={handleBiometric}
              disabled={loading}
            >
              <Fingerprint className="h-5 w-5" />
              Entrar com Biometria
            </Button>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Use seu e-mail e senha cadastrados no sistema
        </p>

        <div className="flex justify-center">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" /> Voltar ao Sistema
          </Button>
        </div>
      </div>
    </div>
  );
}
