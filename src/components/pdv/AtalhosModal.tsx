import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const atalhos = [
  { grupo: "Teclas de Função (F1-F12)", items: [
    { tecla: "F1", desc: "Ajuda (Atalhos)" },
    { tecla: "F2", desc: "Consulta Rápida" },
    { tecla: "F3", desc: "Modo Orçamento" },
    { tecla: "F4", desc: "Finalizar Venda" },
    { tecla: "F5", desc: "Buscar Produto" },
    { tecla: "F6", desc: "Cancelar Venda" },
    { tecla: "F7", desc: "Excluir Último Item" },
    { tecla: "F8", desc: "Selecionar Cliente" },
    { tecla: "F9", desc: "Lançar Valor" },
    { tecla: "F10", desc: "Nova Venda" },
    { tecla: "F11", desc: "Reimprimir Cupom" },
    { tecla: "F12", desc: "Captura de Peso" },
  ]},
  { grupo: "Operações (Ctrl)", items: [
    { tecla: "Ctrl+S", desc: "Sangria" },
    { tecla: "Ctrl+U", desc: "Suprimento" },
    { tecla: "Ctrl+T", desc: "Gerenciar Turno" },
    { tecla: "Ctrl+F", desc: "Fechamento de Caixa" },
    { tecla: "Ctrl+G", desc: "Abrir Gaveta" },
    { tecla: "Ctrl+L", desc: "Trocar Operador" },
    { tecla: "Ctrl+N", desc: "Novo Produto" },
    { tecla: "Ctrl+Shift+B", desc: "Produtos de Balança" },
  ]},
  { grupo: "Navegação", items: [
    { tecla: "Shift+C", desc: "Cadastrar Cliente" },
    { tecla: "Shift+V", desc: "Trocar Vendedor" },
    { tecla: "ESC", desc: "Voltar / Fechar modal" },
  ]},
];

export function AtalhosModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard size={18} /> Atalhos de Teclado — PDV
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {atalhos.map(g => (
            <div key={g.grupo}>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{g.grupo}</h3>
              <div className="space-y-1.5">
                {g.items.map(a => (
                  <div key={a.tecla} className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono font-bold text-foreground">
                      {a.tecla}
                    </kbd>
                    <span className="text-xs text-muted-foreground">{a.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
