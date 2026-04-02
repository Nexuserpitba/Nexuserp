import { useNavigate } from "react-router-dom";

interface Props {
  caixaOcupado: boolean;
  itemCount: number;
  onFinalizar: () => void;
  onBuscarProduto: () => void;
  onCancelar: () => void;
  onExcluirItem: () => void;
  onCliente: () => void;
  onLancarValor: () => void;
  onNovaVenda: () => void;
  onBuscarPeso: () => void;
  onModoOrcamento: () => void;
  onSangria: () => void;
  onSuprimento: () => void;
  onFechamento: () => void;
  onTurno: () => void;
  onReimprimir: () => void;
  onConsultaRapida: () => void;
  onAbrirGaveta: () => void;
}

interface Atalho {
  tecla: string;
  label: string;
  action: () => void;
  grupo: "vendas" | "operacoes";
}

export function PDVStatusBar({
  caixaOcupado, itemCount,
  onFinalizar, onBuscarProduto, onCancelar, onExcluirItem,
  onCliente, onLancarValor, onNovaVenda, onBuscarPeso, onModoOrcamento,
  onSangria, onSuprimento, onFechamento, onTurno, onReimprimir,
  onConsultaRapida, onAbrirGaveta,
}: Props) {
  const navigate = useNavigate();

  const atalhos: Atalho[] = [
    // F1-F12 organizadas
    { tecla: "F1", label: "Ajuda", action: () => {}, grupo: "vendas" },
    { tecla: "F2", label: "Consulta", action: onConsultaRapida, grupo: "vendas" },
    { tecla: "F3", label: "Orçamento", action: onModoOrcamento, grupo: "vendas" },
    { tecla: "F4", label: "Finalizar", action: onFinalizar, grupo: "vendas" },
    { tecla: "F5", label: "Produtos", action: onBuscarProduto, grupo: "vendas" },
    { tecla: "F6", label: "Cancelar", action: onCancelar, grupo: "vendas" },
    { tecla: "F7", label: "Excl.Item", action: onExcluirItem, grupo: "vendas" },
    { tecla: "F8", label: "Cliente", action: onCliente, grupo: "vendas" },
    { tecla: "F9", label: "Lançar", action: onLancarValor, grupo: "vendas" },
    { tecla: "F10", label: "Nova Venda", action: onNovaVenda, grupo: "vendas" },
    { tecla: "F11", label: "Reimprimir", action: onReimprimir, grupo: "vendas" },
    { tecla: "F12", label: "Peso", action: onBuscarPeso, grupo: "vendas" },
  ];

  return (
    <div className="flex flex-col shrink-0">
      {/* Status bar */}
      <div className={`h-6 flex items-center justify-center ${caixaOcupado ? "bg-primary" : "bg-muted"}`}>
        <span className={`font-bold text-[10px] tracking-[0.3em] uppercase ${caixaOcupado ? "text-primary-foreground" : "text-muted-foreground"}`}>
          {caixaOcupado ? `CAIXA OCUPADO — ${itemCount} ITEM(NS)` : "CAIXA LIVRE"}
        </span>
      </div>

      {/* Atalhos F1-F12 organizados */}
      <div className="bg-card border-t border-border px-2 py-0.5 flex items-center justify-center gap-0">
        {atalhos.map((a, i) => (
          <button
            key={a.tecla}
            onClick={a.action}
            className="text-[9px] font-mono px-1 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground flex items-center gap-0.5"
          >
            <span className="font-bold text-foreground/80 bg-muted px-1 rounded text-[8px]">{a.tecla}</span>
            <span>{a.label}</span>
          </button>
        ))}
        <div className="h-3 w-px bg-border mx-1" />
        <button onClick={onSangria} className="text-[9px] font-mono px-1 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
          <span className="font-bold text-foreground/80 bg-muted px-1 rounded text-[8px]">Ctrl+S</span> Sangria
        </button>
        <button onClick={onTurno} className="text-[9px] font-mono px-1 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
          <span className="font-bold text-foreground/80 bg-muted px-1 rounded text-[8px]">Ctrl+T</span> Turno
        </button>
        <button onClick={onFechamento} className="text-[9px] font-mono px-1 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground">
          <span className="font-bold text-foreground/80 bg-muted px-1 rounded text-[8px]">Ctrl+F</span> Fechar
        </button>
        <button onClick={() => navigate("/")} className="text-[9px] font-mono px-1 py-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground">
          <span className="font-bold text-foreground/80 bg-muted px-1 rounded text-[8px]">ESC</span> Sair
        </button>
      </div>
    </div>
  );
}
