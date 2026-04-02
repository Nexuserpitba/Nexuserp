import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { insertLiberacao } from "@/components/liberacoes/types";

interface Props {
  open: boolean;
  onClose: () => void;
  itemDescricao: string;
  qtdAnterior: number;
  novaQtd: number;
  onAutorizado: (autorizadoPor: string) => void;
}


export function LiberacaoQuantidadeModal({ open, onClose, itemDescricao, qtdAnterior, novaQtd, onAutorizado }: Props) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLogin(""); setSenha(""); setErro(""); setShowPassword(false); setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleAutorizar = async () => {
    if (!login.trim() || !senha.trim()) { setErro("Preencha login e senha"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "verify-credentials", email: login.trim(), password: senha.trim() },
      });

      if (error || !data?.valid) { setErro(data?.error || "Login ou senha inválidos"); setLoading(false); return; }

      if (data.user.role === "operador") { setErro("Apenas gerentes ou administradores podem autorizar"); setLoading(false); return; }

      insertLiberacao({ operador: "PDV", cliente: itemDescricao, clienteDoc: "", valorAutorizado: novaQtd, limiteDisponivel: qtdAnterior, excedente: 0, motivo: `Alteração de quantidade de ${qtdAnterior} para ${novaQtd} autorizada por ${data.user.nome}` });
      toast.success(`Alteração de quantidade autorizada por ${data.user.nome}`);
      onAutorizado(data.user.nome);
      onClose();
    } catch { setErro("Erro ao verificar credenciais"); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert size={20} />
            Liberação para Alteração de Quantidade
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Item</p>
            <p className="text-sm font-medium truncate">{itemDescricao}</p>
            <div className="flex justify-between text-xs mt-2">
              <span className="text-muted-foreground">Quantidade atual:</span>
              <span className="font-bold">{qtdAnterior}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Nova quantidade:</span>
              <span className="font-bold text-destructive">{novaQtd}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">Informe as credenciais de um gerente ou administrador para autorizar</p>
          <div className="space-y-2">
            <Label>E-mail do autorizador</Label>
            <Input ref={inputRef} value={login} onChange={e => { setLogin(e.target.value); setErro(""); }} placeholder="E-mail" onKeyDown={e => e.key === "Enter" && document.getElementById("lib-qtd-senha")?.focus()} />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <div className="flex gap-2">
              <Input id="lib-qtd-senha" type={showPassword ? "text" : "password"} value={senha} onChange={e => { setSenha(e.target.value); setErro(""); }} placeholder="Senha" onKeyDown={e => e.key === "Enter" && handleAutorizar()} />
              <Button variant="ghost" size="icon" type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</Button>
            </div>
          </div>
          {erro && <p className="text-xs text-destructive font-medium text-center">{erro}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAutorizar} disabled={loading} className="gap-1.5"><ShieldAlert size={14} /> {loading ? "Verificando..." : "Autorizar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
