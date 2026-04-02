import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ShieldX, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addAuditLog, checkAndAutoBlock, isUserBlocked } from "@/lib/auditLog";
import { toast } from "sonner";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hasAccess, logout } = useAuth();
  const location = useLocation();
  const lastDeniedRef = useRef<string>("");

  const denied = user ? !hasAccess(location.pathname) : false;
  const blocked = user ? isUserBlocked(user.id) : null;

  useEffect(() => {
    if (denied && user && lastDeniedRef.current !== location.pathname) {
      lastDeniedRef.current = location.pathname;
      addAuditLog("acesso_negado", user, `Rota: ${location.pathname}`);
      
      // Check if auto-block threshold reached
      const wasBlocked = checkAndAutoBlock(user.id, user.nome);
      if (wasBlocked) {
        toast.error("Conta bloqueada temporariamente", {
          description: "Muitas tentativas de acesso negado. Você será desconectado.",
          duration: 5000,
        });
        setTimeout(() => logout(), 2000);
      } else {
        toast.error("Acesso negado", {
          description: `Seu perfil (${user.role}) não tem permissão para acessar ${location.pathname}`,
        });
      }
    }
  }, [denied, user, location.pathname, logout]);

  if (!user) return null;

  if (blocked) {
    const expiresAt = new Date(blocked.expiresAt);
    const minutesLeft = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 60000));
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Ban size={32} className="text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Conta Bloqueada Temporariamente</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Sua conta foi bloqueada automaticamente devido a múltiplas tentativas de acesso a áreas restritas.
          O bloqueio expira em <strong>{minutesLeft} minuto{minutesLeft !== 1 ? "s" : ""}</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          {blocked.reason}
        </p>
        <Button variant="outline" onClick={logout}>
          Sair
        </Button>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX size={32} className="text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Acesso Negado</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Seu perfil (<strong>{user.role}</strong>) não tem permissão para acessar esta página.
          Entre em contato com o administrador do sistema.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
