import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import defaultLogoImg from "@/assets/logo.png";
import { getActiveLogo, getSelectedEmpresaId, LOGO_CHANGED_EVENT } from "@/lib/logoUtils";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logoSrc, setLogoSrc] = useState(() => getActiveLogo(getSelectedEmpresaId() ?? undefined) || defaultLogoImg);

  useEffect(() => {
    const update = () => setLogoSrc(getActiveLogo(getSelectedEmpresaId() ?? undefined) || defaultLogoImg);
    window.addEventListener(LOGO_CHANGED_EVENT, update);
    return () => window.removeEventListener(LOGO_CHANGED_EVENT, update);
  }, []);

  // Check for recovery event in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Supabase will handle the session via onAuthStateChange
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("A senha deve ter ao menos 8 caracteres"); return; }
    if (!/[A-Z]/.test(newPassword)) { toast.error("A senha deve conter ao menos uma letra maiúscula"); return; }
    if (!/[a-z]/.test(newPassword)) { toast.error("A senha deve conter ao menos uma letra minúscula"); return; }
    if (!/[0-9]/.test(newPassword)) { toast.error("A senha deve conter ao menos um número"); return; }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) { toast.error("A senha deve conter ao menos um caractere especial"); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não conferem"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("Erro ao redefinir senha", { description: error.message });
    } else {
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/"), 2000);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-muted/50 p-4">
        <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/10 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Senha Redefinida!</h2>
            <p className="text-sm text-muted-foreground">Redirecionando para o login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-muted/50 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-background flex items-center justify-center overflow-hidden">
            <img src={logoSrc} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <CardTitle className="text-lg font-bold text-foreground">Redefinir Senha</CardTitle>
          <p className="text-xs text-muted-foreground">Defina sua nova senha de acesso</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nova senha</Label>
              <Input id="new-pass" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nova senha" autoFocus />
              {newPassword && (
                <div className="space-y-1 mt-1">
                  {[
                    { test: newPassword.length >= 8, label: "Mínimo 8 caracteres" },
                    { test: /[A-Z]/.test(newPassword), label: "Letra maiúscula" },
                    { test: /[a-z]/.test(newPassword), label: "Letra minúscula" },
                    { test: /[0-9]/.test(newPassword), label: "Número" },
                    { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword), label: "Caractere especial" },
                  ].map(({ test, label }) => (
                    <p key={label} className={`text-[11px] flex items-center gap-1.5 ${test ? "text-green-600" : "text-muted-foreground"}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${test ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      {label}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
              <Input id="confirm-pass" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirme a nova senha" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <KeyRound size={16} /> {loading ? "Redefinindo..." : "Redefinir Senha"}
            </Button>
            <button type="button" className="w-full text-xs text-primary hover:underline" onClick={() => navigate("/")}>
              Voltar ao login
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
