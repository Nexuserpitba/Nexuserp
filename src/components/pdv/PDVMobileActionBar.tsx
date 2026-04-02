import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Search, DollarSign, UserPlus, X, Plus,
  MoreHorizontal, Scale, Printer, ArrowRightLeft, LogOut,
  Receipt, Clock, Wallet, BoxIcon
} from "lucide-react";
import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose
} from "@/components/ui/drawer";

interface Props {
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
  onSair: () => void;
}

export function PDVMobileActionBar(props: Props) {
  const [showMore, setShowMore] = useState(false);

  const moreActions = [
    { icon: Receipt, label: "Orçamento", action: props.onModoOrcamento },
    { icon: X, label: "Cancelar Venda", action: props.onCancelar, destructive: true },
    { icon: BoxIcon, label: "Excluir Item", action: props.onExcluirItem },
    { icon: Scale, label: "Capturar Peso", action: props.onBuscarPeso },
    { icon: Wallet, label: "Lançar Valor", action: props.onLancarValor },
    { icon: ArrowRightLeft, label: "Sangria", action: props.onSangria },
    { icon: Plus, label: "Suprimento", action: props.onSuprimento },
    { icon: Clock, label: "Turno", action: props.onTurno },
    { icon: DollarSign, label: "Fechar Caixa", action: props.onFechamento },
    { icon: Printer, label: "Reimprimir", action: props.onReimprimir },
    { icon: Search, label: "Consulta Rápida", action: props.onConsultaRapida },
    { icon: LogOut, label: "Sair", action: props.onSair, destructive: true },
  ];

  return (
    <>
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-area-bottom">
        <div className="grid grid-cols-5 gap-0">
          <MobileActionBtn icon={Search} label="Produtos" onClick={props.onBuscarProduto} />
          <MobileActionBtn icon={UserPlus} label="Cliente" onClick={props.onCliente} />
          <MobileActionBtn
            icon={ShoppingCart}
            label={props.itemCount > 0 ? `Finalizar (${props.itemCount})` : "Finalizar"}
            onClick={props.onFinalizar}
            primary
          />
          <MobileActionBtn icon={Plus} label="Nova Venda" onClick={props.onNovaVenda} />
          <MobileActionBtn icon={MoreHorizontal} label="Mais" onClick={() => setShowMore(true)} />
        </div>
      </div>

      {/* More actions drawer */}
      <Drawer open={showMore} onOpenChange={setShowMore}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ações do PDV</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-2 p-4 pb-8">
            {moreActions.map(a => (
              <DrawerClose key={a.label} asChild>
                <button
                  onClick={() => { setShowMore(false); setTimeout(a.action, 150); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors ${
                    a.destructive
                      ? "hover:bg-destructive/10 text-destructive"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <a.icon size={22} />
                  <span className="text-xs font-medium">{a.label}</span>
                </button>
              </DrawerClose>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function MobileActionBtn({
  icon: Icon, label, onClick, primary
}: { icon: any; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-2.5 px-1 transition-colors active:scale-95 ${
        primary
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground active:text-foreground active:bg-muted"
      }`}
    >
      <Icon size={20} />
      <span className="text-[9px] font-semibold mt-0.5 leading-tight text-center truncate w-full">
        {label}
      </span>
    </button>
  );
}
