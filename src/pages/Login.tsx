import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, LogIn, User, Fingerprint, KeyRound, UserPlus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getActiveLogo, getSelectedEmpresaId, LOGO_CHANGED_EVENT } from "@/lib/logoUtils";
import { isBiometricAvailable, hasAnyBiometric, authenticateWithBiometric } from "@/lib/biometricAuth";
import { supabase } from "@/integrations/supabase/client";
import { pollEventosBiometria } from "@/lib/authService";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginBiometria, signup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [hwBiometricWaiting, setHwBiometricWaiting] = useState(false);

  // Signup state
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupNome, setSignupNome] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const cleanupPollRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setBiometricReady(isBiometricAvailable() && hasAnyBiometric());
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (cleanupPollRef.current) cleanupPollRef.current();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    setLoading(true);
    const ok = await login(username.trim(), password.trim());
    if (!ok) {
      toast.error("E-mail ou senha inválidos");
    } else {
      toast.success("Login realizado com sucesso!");
      navigate("/", { replace: true });
    }
    setLoading(false);
  };

  // Login via hardware biometric (Intelbras CM 351)
  const handleHardwareBiometric = async () => {
    setHwBiometricWaiting(true);
    const terminalId = localStorage.getItem("terminal-id") || "default";

    toast.info("Aguardando biometria...", {
      description: "Coloque seu dedo no leitor Intelbras CM 351",
      duration: 15000,
    });

    // Start polling for biometric events
    cleanupPollRef.current = pollEventosBiometria(
      terminalId,
      async (evento) => {
        if (evento.tipo === "biometria_reconhecida" && evento.token) {
          // Stop polling
          if (cleanupPollRef.current) {
            cleanupPollRef.current();
            cleanupPollRef.current = null;
          }

          try {
            const ok = await loginBiometria(evento.token as string);
            if (ok) {
              toast.success("Login biométrico realizado!");
              navigate("/", { replace: true });
            } else {
              toast.error("Falha na autenticação biométrica");
            }
          } catch (err: any) {
            toast.error("Erro no login biométrico", { description: err.message });
          }
          setHwBiometricWaiting(false);
        }
      },
      1500
    );

    // Timeout after 30 seconds
    setTimeout(() => {
      if (cleanupPollRef.current) {
        cleanupPollRef.current();
        cleanupPollRef.current = null;
        setHwBiometricWaiting(false);
        toast.warning("Tempo esgotado", {
          description: "Nenhuma biometria detectada. Tente novamente.",
        });
      }
    }, 30000);
  };

  // Login via browser WebAuthn biometric
  const handleBiometric = async () => {
    setLoading(true);
    try {
      const userLogin = await authenticateWithBiometric();
      if (!userLogin) {
        toast.error("Biometria não reconhecida");
        setLoading(false);
        return;
      }
      // WebAuthn identifies user but needs Supabase auth
      // Try to login with the stored credential
      toast.error("Login biométrico requer autenticação Supabase. Use e-mail e senha ou o leitor Intelbras.");
    } catch {
      toast.error("Erro ao acessar biometria");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) { toast.error("Informe seu e-mail"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Erro ao enviar e-mail", { description: error.message });
    } else {
      setResetSent(true);
      toast.success("E-mail de redefinição enviado!");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupNome.trim() || !signupEmail.trim() || !signupPassword.trim()) {
      toast.error("Preencha todos os campos"); return;
    }
    if (signupPassword.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres"); return;
    }
    if (signupPassword !== signupConfirm) {
      toast.error("As senhas não conferem"); return;
    }

    setLoading(true);
    const ok = await signup(signupEmail.trim(), signupPassword, signupNome.trim());
    if (ok) {
      toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      setSignupOpen(false);
    } else {
      toast.error("Erro ao criar conta. Verifique os dados.");
    }
    setLoading(false);
  };

  const cancelHwBiometric = () => {
    if (cleanupPollRef.current) {
      cleanupPollRef.current();
      cleanupPollRef.current = null;
    }
    setHwBiometricWaiting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted via-background to-muted/50 p-4">
      <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-32 h-32 flex items-center justify-center overflow-hidden">
            <motion.img key="/logo-nexuserp.svg" src="/logo-nexuserp.svg" alt="NexusERP Logo" className="w-full h-full object-contain" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">NexusERP</CardTitle>
          <p className="text-xs text-muted-foreground tracking-wide">A tecnologia em suas mãos</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium flex items-center gap-1.5">
                <User size={14} /> E-mail
              </Label>
              <Input
                id="username"
                type="email"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Digite seu e-mail"
                autoFocus
                autoComplete="username"
                noUpperCase
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium flex items-center gap-1.5">
                <Lock size={14} /> Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-between items-center">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setSignupOpen(true); setSignupNome(""); setSignupEmail(""); setSignupPassword(""); setSignupConfirm(""); }}
              >
                Criar conta
              </button>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => { setForgotOpen(true); setResetEmail(""); setResetSent(false); }}
              >
                Esqueci minha senha
              </button>
            </div>
            <Button type="submit" className="w-full h-11 gap-2 text-base" disabled={loading || hwBiometricWaiting}>
              <LogIn size={18} />
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          {/* Biometric options */}
          {(biometricReady || true) && (
            <div className="mt-4">
              <div className="relative flex items-center justify-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <span className="relative bg-card px-2 text-xs text-muted-foreground">ou</span>
              </div>

              {/* Hardware biometric (Intelbras CM 351) */}
              {hwBiometricWaiting ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Aguardando biometria no leitor...</span>
                  </div>
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Fingerprint size={24} className="text-primary" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={cancelHwBiometric}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 gap-2 text-base"
                    onClick={handleHardwareBiometric}
                    disabled={loading}
                  >
                    <Fingerprint size={20} />
                    Biometria Intelbras (CM 351)
                  </Button>

                  {biometricReady && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-9 gap-2 text-sm"
                      onClick={handleBiometric}
                      disabled={loading}
                    >
                      <Fingerprint size={16} />
                      Biometria do navegador (WebAuthn)
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signup Dialog */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={18} /> Criar Conta
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova conta.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={signupNome} onChange={e => setSignupNome(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-2">
              <Label>Confirmar senha</Label>
              <Input type="password" value={signupConfirm} onChange={e => setSignupConfirm(e.target.value)} placeholder="Repita a senha" />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <UserPlus size={16} /> {loading ? "Criando..." : "Criar Conta"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={18} /> Esqueci minha senha
            </DialogTitle>
            <DialogDescription>
              Informe seu e-mail para receber o link de redefinição.
            </DialogDescription>
          </DialogHeader>
          {resetSent ? (
            <div className="text-center space-y-3 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Mail size={24} className="text-green-600" />
              </div>
              <p className="text-sm text-foreground font-medium">E-mail enviado!</p>
              <p className="text-xs text-muted-foreground">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setForgotOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <KeyRound size={16} /> {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
