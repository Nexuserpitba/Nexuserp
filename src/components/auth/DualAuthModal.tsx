/**
 * NexusERP - Dual Auth Modal
 * Modal de dupla autorizacao (operador + gerente)
 * Exibe estado de espera e permite ao gerente aprovar/negar
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
import {
  ShieldCheck,
  ShieldX,
  Fingerprint,
  Lock,
  Clock,
  X,
  UserCheck,
  Loader2,
} from "lucide-react";
import { isBiometricAvailable, hasAnyBiometric, authenticateWithBiometric } from "@/lib/biometricAuth";

// ========== OPERADOR: Aguardando aprovacao ==========
interface DualAuthWaitingProps {
  open: boolean;
  acao: string;
  acaoLabel?: string;
  autorizacaoId: string | null;
  onCancel: () => void;
}

const ACAO_LABELS: Record<string, string> = {
  CANCELAR_VENDA: "Cancelar Venda",
  ESTORNO: "Estorno Financeiro",
  SANGRIA: "Sangria de Caixa",
  DESCONTO_ALTO: "Desconto Elevado",
  CANCELAR_NFE: "Cancelar NF-e",
};

export function DualAuthWaiting({
  open,
  acao,
  acaoLabel,
  autorizacaoId,
  onCancel,
}: DualAuthWaitingProps) {
  const [countdown, setCountdown] = useState(120);
  const label = acaoLabel || ACAO_LABELS[acao] || acao;

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

  useEffect(() => {
    if (open) setCountdown(120);
  }, [open]);

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
            <UserCheck size={18} className="text-blue-500" />
            Aguardando Autorizacao
          </DialogTitle>
          <DialogDescription>
            A acao <strong>{label}</strong> requer aprovacao de um gerente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-center py-4">
          {/* Spinner animado */}
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Loader2 size={32} className="text-blue-500 animate-spin" />
          </div>

          <p className="text-sm font-medium text-foreground">
            Aguardando biometria ou senha do gerente...
          </p>

          <p className="text-xs text-muted-foreground">
            Um gerente ou supervisor deve autenticar-se no leitor biométrico
            ou informar sua senha para aprovar esta acao.
          </p>

          {autorizacaoId && (
            <p className="text-xs text-muted-foreground font-mono">
              ID: {autorizacaoId.slice(0, 8)}...
            </p>
          )}

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} />
            <span>Expira em {formatTime(countdown)}</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={onCancel}>
          <X size={14} /> Cancelar Solicitacao
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ========== GERENTE: Painel de aprovacao ==========
interface DualAuthApproveProps {
  open: boolean;
  autorizacao: {
    id: string;
    acao: string;
    motivo?: string;
    detalhes?: Record<string, unknown>;
    expira_em: string;
    operador: { nome: string } | null;
  } | null;
  onApprove: (params: {
    autorizacaoId: string;
    aprovar: boolean;
    metodo: "senha" | "biometria";
    password?: string;
    biometriaToken?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function DualAuthApprove({
  open,
  autorizacao,
  onApprove,
  onClose,
}: DualAuthApproveProps) {
  const [password, setPassword] = useState("");
  const [metodo, setMetodo] = useState<"senha" | "biometria">("senha");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    setBiometricAvailable(isBiometricAvailable() && hasAnyBiometric());
  }, []);

  useEffect(() => {
    if (open) {
      setPassword("");
      setLoading(false);
      setMetodo("senha");
    }
  }, [open]);

  if (!autorizacao) return null;

  const acaoLabel = ACAO_LABELS[autorizacao.acao] || autorizacao.acao;

  const handleConfirm = async (aprovar: boolean) => {
    setLoading(true);
    try {
      if (metodo === "biometria") {
        const token = await authenticateWithBiometric();
        if (!token) {
          setLoading(false);
          return;
        }
        await onApprove({
          autorizacaoId: autorizacao.id,
          aprovar,
          metodo: "biometria",
          biometriaToken: token,
        });
      } else {
        if (!password.trim()) {
          setLoading(false);
          return;
        }
        await onApprove({
          autorizacaoId: autorizacao.id,
          aprovar,
          metodo: "senha",
          password,
        });
      }
    } catch {
      // Erro tratado pelo hook
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            Autorizar Acao
          </DialogTitle>
          <DialogDescription>
            Confirme sua identidade para aprovar ou negar esta solicitacao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p><strong>Acao:</strong> {acaoLabel}</p>
            <p><strong>Solicitado por:</strong> {autorizacao.operador?.nome || "Desconhecido"}</p>
            {autorizacao.motivo && <p><strong>Motivo:</strong> {autorizacao.motivo}</p>}
            {autorizacao.detalhes?.valor !== undefined && (
              <p><strong>Valor:</strong> R$ {Number(autorizacao.detalhes.valor).toFixed(2)}</p>
            )}
          </div>

          {/* Method selector */}
          <div className="flex gap-2">
            <Button
              variant={metodo === "senha" ? "default" : "outline"}
              className="flex-1 gap-2"
              size="sm"
              onClick={() => setMetodo("senha")}
            >
              <Lock size={14} /> Senha
            </Button>
            {biometricAvailable && (
              <Button
                variant={metodo === "biometria" ? "default" : "outline"}
                className="flex-1 gap-2"
                size="sm"
                onClick={() => setMetodo("biometria")}
              >
                <Fingerprint size={14} /> Biometria
              </Button>
            )}
          </div>

          {metodo === "senha" && (
            <div className="space-y-2">
              <Label htmlFor="dual-password">Sua senha de gerente</Label>
              <Input
                id="dual-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoFocus
                autoComplete="current-password"
              />
            </div>
          )}

          {metodo === "biometria" && (
            <p className="text-xs text-muted-foreground text-center">
              Coloque seu dedo no leitor biométrico ou use WebAuthn.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleConfirm(false)}
            disabled={loading}
          >
            <ShieldX size={14} /> Negar
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => handleConfirm(true)}
            disabled={loading || (metodo === "senha" && !password.trim())}
          >
            <ShieldCheck size={14} /> {loading ? "Verificando..." : "Aprovar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
