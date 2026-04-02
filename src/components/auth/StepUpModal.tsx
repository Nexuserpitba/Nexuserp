/**
 * NexusERP - Step-Up Auth Modal
 * Modal para reautenticacao em acoes criticas (senha ou biometria)
 */
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Lock, ShieldAlert, X, Timer } from "lucide-react";
import { isBiometricAvailable, hasAnyBiometric, authenticateWithBiometric } from "@/lib/biometricAuth";

interface StepUpModalProps {
  open: boolean;
  acao: string;
  acaoLabel?: string;
  onConfirmSenha: (password: string) => void;
  onConfirmBiometria: (token: string) => void;
  onCancel: () => void;
}

const ACAO_LABELS: Record<string, string> = {
  CANCELAR_VENDA: "Cancelar Venda",
  ESTORNO: "Estorno Financeiro",
  SANGRIA: "Sangria de Caixa",
  DESCONTO_ALTO: "Desconto Elevado",
  CANCELAR_NFE: "Cancelar NF-e",
  ALTERAR_PRECO: "Alterar Preco",
  GERENCIAR_USUARIOS: "Gerenciar Usuarios",
  GERENCIAR_PERMISSOES: "Gerenciar Permissoes",
};

export function StepUpModal({
  open,
  acao,
  acaoLabel,
  onConfirmSenha,
  onConfirmBiometria,
  onCancel,
}: StepUpModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [metodo, setMetodo] = useState<"senha" | "biometria">("senha");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [countdown, setCountdown] = useState(120);

  const label = acaoLabel || ACAO_LABELS[acao] || acao;

  useEffect(() => {
    setBiometricAvailable(isBiometricAvailable() && hasAnyBiometric());
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!open) {
      setCountdown(120);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onCancel]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPassword("");
      setLoading(false);
      setMetodo("senha");
      setCountdown(120);
    }
  }, [open]);

  const handleSenhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    await onConfirmSenha(password);
    setLoading(false);
    setPassword("");
  };

  const handleBiometria = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBiometric();
      if (result) {
        // WebAuthn retorna o login, mas precisamos do token do backend
        // Neste caso, o usuario deve usar o hardware biométrico Intelbras
        // O token vem via webhook polling
        onConfirmBiometria(result);
      }
    } catch {
      // Erro tratado pelo hook
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-500" />
            Reautenticacao Necessaria
          </DialogTitle>
          <DialogDescription>
            A acao <strong>{label}</strong> requer confirmacao de identidade.
          </DialogDescription>
        </DialogHeader>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Timer size={14} />
          <span>Expira em {formatTime(countdown)}</span>
        </div>

        {/* Method selector */}
        <div className="flex gap-2">
          <Button
            variant={metodo === "senha" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => setMetodo("senha")}
          >
            <Lock size={14} /> Senha
          </Button>
          {biometricAvailable && (
            <Button
              variant={metodo === "biometria" ? "default" : "outline"}
              className="flex-1 gap-2"
              onClick={() => setMetodo("biometria")}
            >
              <Fingerprint size={14} /> Biometria
            </Button>
          )}
        </div>

        {/* Password form */}
        {metodo === "senha" && (
          <form onSubmit={handleSenhaSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stepup-password">Sua senha</Label>
              <Input
                id="stepup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                <X size={14} /> Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !password.trim()}>
                <Lock size={14} /> {loading ? "Verificando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        )}

        {/* Biometric */}
        {metodo === "biometria" && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Coloque seu dedo no leitor biométrico Intelbras CM 351
            </p>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Fingerprint size={32} className="text-primary" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                <X size={14} /> Cancelar
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleBiometria}
                disabled={loading}
              >
                <Fingerprint size={14} /> {loading ? "Aguardando..." : "Usar WebAuthn"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
