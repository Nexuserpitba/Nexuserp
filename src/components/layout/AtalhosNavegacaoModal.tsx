import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shortcuts } from "@/hooks/useKeyboardShortcuts";
import { Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtalhosNavegacaoModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard size={18} className="text-primary" />
            Atalhos de Navegação
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 mb-2">
            <span className="text-xs text-muted-foreground">Abrir esta ajuda</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">Alt</kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">H</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 mb-3">
            <span className="text-xs text-muted-foreground">Buscar no menu</span>
            <div className="flex gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">Ctrl</kbd>
              <span className="text-[10px] text-muted-foreground">+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">K</kbd>
            </div>
          </div>
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
              <span className="text-sm text-foreground">{s.label}</span>
              <div className="flex gap-1 shrink-0">
                {s.keys.split("+").map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono font-medium text-foreground">{k}</kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Pressione <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">Alt+H</kbd> a qualquer momento para ver os atalhos
        </p>
      </DialogContent>
    </Dialog>
  );
}
