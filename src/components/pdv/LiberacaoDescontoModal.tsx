import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type UserRole, defaultDiscountLimits } from "@/contexts/AuthContext";
import { insertLiberacao } from "@/components/liberacoes/types";

interface Props {
  open: boolean;
  onClose: () => void;
  descontoSolicitado: number;
  limiteOperador: number;
  itemDescricao: string;
  onAutorizado: (autorizadoPor: string) => void;
}


export function LiberacaoDescontoModal({ open, onClose, descontoSolicitado, limiteOperador, itemDescricao, onAutorizado }: Props) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLogin("");
      setSenha("");
      setErro("");
      setShowPassword(false);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAutorizar = async () => {
    if (!login.trim() || !senha.trim()) {
      setErro("Preencha login e senha");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "verify-credentials", email: login.trim(), password: senha.trim() },
      });

      if (error || !data?.valid) {
        setErro(data?.error || "Login ou senha inválidos");
        setLoading(false);
        return;
      }

      const user = data.user;

      if (user.role === "operador") {
        setErro("Apenas gerentes ou administradores podem autorizar");
        setLoading(false);
        return;
      }

      const userMax = user.limiteDesconto ?? defaultDiscountLimits[user.role as UserRole] ?? 0;
      if (descontoSolicitado > userMax) {
        setErro(`${user.nome} também não tem permissão (limite: ${userMax}%)`);
        setLoading(false);
        return;
      }

      insertLiberacao({ operador: "PDV", cliente: itemDescricao, clienteDoc: "", valorAutorizado: descontoSolicitado, limiteDisponivel: 0, excedente: 0, motivo: `Desconto de ${descontoSolicitado}% autorizado por ${user.nome}` });
      toast.success(`Desconto de ${descontoSolicitado}% autorizado por ${user.nome}`);
      onAutorizado(user.nome);
      onClose();
    } catch {
      setErro("Erro ao verificar credenciais");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert size={20} />
            Liberação Gerencial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Item</p>
            <p className="text-sm font-medium truncate">{itemDescricao}</p>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-muted-foreground">Desconto solicitado:</span>
              <span className="font-bold text-destructive">{descontoSolicitado}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Limite do operador:</span>
              <span className="font-bold">{limiteOperador}%</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Informe as credenciais de um gerente ou administrador para autorizar
          </p>

          <div className="space-y-2">
            <Label>E-mail do autorizador</Label>
            <Input
              ref={inputRef}
              value={login}
              onChange={e => { setLogin(e.target.value); setErro(""); }}
              placeholder="E-mail"
              onKeyDown={e => e.key === "Enter" && document.getElementById("lib-senha")?.focus()}
            />
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="flex gap-2">
              <Input
                id="lib-senha"
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={e => { setSenha(e.target.value); setErro(""); }}
                placeholder="Senha"
                onKeyDown={e => e.key === "Enter" && handleAutorizar()}
              />
              <Button variant="ghost" size="icon" type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          {erro && (
            <p className="text-xs text-destructive font-medium text-center">{erro}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAutorizar} disabled={loading} className="gap-1.5">
            <ShieldAlert size={14} /> {loading ? "Verificando..." : "Autorizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
