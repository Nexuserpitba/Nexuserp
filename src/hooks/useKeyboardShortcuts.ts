import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export interface KeyboardShortcut {
  keys: string; // display string e.g. "Alt+D"
  label: string;
  path: string;
}

export const shortcuts: KeyboardShortcut[] = [
  { keys: "Alt+D", label: "Dashboard", path: "/" },
  { keys: "Alt+V", label: "PDV", path: "/pdv" },
  { keys: "Alt+P", label: "Produtos", path: "/cadastros/produtos" },
  { keys: "Alt+E", label: "Empresas", path: "/cadastros/empresas" },
  { keys: "Alt+C", label: "Pessoas (Clientes)", path: "/cadastros/pessoas" },
  { keys: "Alt+F", label: "Financeiro - Contas a Receber", path: "/financeiro/contas-receber" },
  { keys: "Alt+G", label: "Financeiro - Contas a Pagar", path: "/financeiro/contas-pagar" },
  { keys: "Alt+N", label: "Emissão NF-e", path: "/fiscal/emissao-nfe" },
  { keys: "Alt+S", label: "Emissão NFS-e", path: "/fiscal/emissao-nfse" },
  { keys: "Alt+R", label: "Relatórios - Módulo Vendas", path: "/relatorios/modulo-vendas" },
  { keys: "Alt+O", label: "Ordens de Serviço", path: "/servicos/ordens" },
  { keys: "Alt+I", label: "Inventário", path: "/estoque/inventario" },
  { keys: "Alt+A", label: "Auditoria Fiscal", path: "/fiscal/auditoria" },
];

export function useKeyboardShortcuts(onOpenHelp?: () => void) {
  const navigate = useNavigate();

  const handler = useCallback((e: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.target as HTMLElement)?.isContentEditable) return;

    // Alt+? or Alt+H → show help
    if (e.altKey && (e.key === "?" || e.key === "h" || e.key === "H")) {
      e.preventDefault();
      onOpenHelp?.();
      return;
    }

    if (!e.altKey || e.ctrlKey || e.metaKey) return;

    const keyMap: Record<string, string> = {};
    for (const s of shortcuts) {
      const key = s.keys.split("+").pop()!.toLowerCase();
      keyMap[key] = s.path;
    }

    const pressed = e.key.toLowerCase();
    if (keyMap[pressed]) {
      e.preventDefault();
      navigate(keyMap[pressed]);
      const shortcut = shortcuts.find(s => s.keys.split("+").pop()!.toLowerCase() === pressed);
      if (shortcut) {
        toast.info(`${shortcut.label}`, { duration: 1500 });
      }
    }
  }, [navigate, onOpenHelp]);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
