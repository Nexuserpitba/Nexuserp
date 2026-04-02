import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, Fingerprint, ShieldCheck, ShieldOff, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  isBiometricAvailable,
  hasBiometricForUser,
  registerBiometric,
  removeBiometric,
} from "@/lib/biometricAuth";
import { addAuditLog } from "@/lib/auditLog";

export default function AlterarSenha() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    const available = isBiometricAvailable();
    setBioAvailable(available);
    if (available && user) {
      setBioRegistered(hasBiometricForUser(user.id));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!senhaAtual.trim()) {
      toast({ title: "Erro", description: "Informe a senha atual.", variant: "destructive" });
      return;
    }
    if (novaSenha.length < 8) {
      toast({ title: "Erro", description: "A nova senha deve ter no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (!/[A-Z]/.test(novaSenha)) {
      toast({ title: "Erro", description: "A senha deve conter ao menos uma letra maiúscula.", variant: "destructive" });
      return;
    }
    if (!/[a-z]/.test(novaSenha)) {
      toast({ title: "Erro", description: "A senha deve conter ao menos uma letra minúscula.", variant: "destructive" });
      return;
    }
    if (!/[0-9]/.test(novaSenha)) {
      toast({ title: "Erro", description: "A senha deve conter ao menos um número.", variant: "destructive" });
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(novaSenha)) {
      toast({ title: "Erro", description: "A senha deve conter ao menos um caractere especial.", variant: "destructive" });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (novaSenha === senhaAtual) {
      toast({ title: "Erro", description: "A nova senha deve ser diferente da atual.", variant: "destructive" });
      return;
    }

    try {
      // Verify current password by re-authenticating
      const { data: session } = await supabase.auth.getSession();
      const email = session?.session?.user?.email;
      if (!email) { toast({ title: "Erro", description: "Sessão expirada.", variant: "destructive" }); return; }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
      if (signInError) { toast({ title: "Erro", description: "Senha atual incorreta.", variant: "destructive" }); return; }

      const { error: updateError } = await supabase.auth.updateUser({ password: novaSenha });
      if (updateError) { toast({ title: "Erro", description: updateError.message, variant: "destructive" }); return; }

      toast({ title: "Sucesso", description: "Senha alterada com sucesso!" });
      if (user) addAuditLog("senha_alterada", user);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar a senha.", variant: "destructive" });
    }
  };

  const handleRegisterBiometric = async () => {
    if (!user) return;

    // Check if running inside an iframe (preview environment)
    if (window.self !== window.top) {
      toast({
        title: "Não disponível",
        description: "A biometria não funciona no modo preview. Abra o app publicado em uma nova aba para cadastrar.",
        variant: "destructive",
      });
      return;
    }

    setBioLoading(true);
    try {
      const ok = await registerBiometric(user.id, user.login, user.nome);
      if (ok) {
        setBioRegistered(true);
        if (user) addAuditLog("biometria_cadastrada", user);
        toast({ title: "Sucesso", description: "Biometria cadastrada! Você pode usar para fazer login." });
      } else {
        toast({
          title: "Não disponível",
          description: "Seu dispositivo não suporta biometria ou o cadastro foi cancelado. Tente em um dispositivo com leitor biométrico.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao cadastrar biometria. Verifique se seu dispositivo suporta autenticação biométrica.",
        variant: "destructive",
      });
    }
    setBioLoading(false);
  };

  const handleRemoveBiometric = () => {
    if (!user) return;
    removeBiometric(user.id);
    setBioRegistered(false);
    addAuditLog("biometria_removida", user);
    toast({ title: "Removido", description: "Biometria removida com sucesso." });
  };

  const PasswordInput = ({ value, onChange, show, onToggle, placeholder }: any) => (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="page-container">
      <PageHeader title="Alterar Senha" description="Altere sua senha de acesso e gerencie biometria" />

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
        {/* Password Card */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Usuário: <strong className="text-foreground">{user?.nome}</strong></span>
              </div>
              <div className="space-y-2">
                <Label>Senha Atual</Label>
                <PasswordInput value={senhaAtual} onChange={setSenhaAtual} show={showAtual} onToggle={() => setShowAtual(!showAtual)} placeholder="Digite sua senha atual" />
              </div>
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <PasswordInput value={novaSenha} onChange={setNovaSenha} show={showNova} onToggle={() => setShowNova(!showNova)} placeholder="Digite a nova senha" />
                {novaSenha && (
                  <div className="space-y-1 mt-1">
                    {[
                      { test: novaSenha.length >= 8, label: "Mínimo 8 caracteres" },
                      { test: /[A-Z]/.test(novaSenha), label: "Letra maiúscula" },
                      { test: /[a-z]/.test(novaSenha), label: "Letra minúscula" },
                      { test: /[0-9]/.test(novaSenha), label: "Número" },
                      { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(novaSenha), label: "Caractere especial" },
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
                <Label>Confirmar Nova Senha</Label>
                <PasswordInput value={confirmarSenha} onChange={setConfirmarSenha} show={showConfirmar} onToggle={() => setShowConfirmar(!showConfirmar)} placeholder="Confirme a nova senha" />
              </div>
              <Button type="submit" className="w-full">Alterar Senha</Button>
            </form>
          </CardContent>
        </Card>

        {/* Biometric Card */}
        {bioAvailable && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Acesso por Biometria</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Use impressão digital ou reconhecimento facial para fazer login sem digitar a senha.
              </p>

              {bioRegistered ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-md bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm font-medium">Biometria ativa</span>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    onClick={handleRemoveBiometric}
                  >
                    <ShieldOff className="h-4 w-4" />
                    Remover Biometria
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleRegisterBiometric}
                  disabled={bioLoading}
                >
                  <Fingerprint className="h-4 w-4" />
                  {bioLoading ? "Aguardando..." : "Cadastrar Biometria"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <div className="flex gap-3 max-w-2xl">
        <Button variant="outline" onClick={() => navigate("/pdv")} className="gap-2"><ArrowLeft size={16} />Voltar</Button>
      </div>
    </div>
  );
}
