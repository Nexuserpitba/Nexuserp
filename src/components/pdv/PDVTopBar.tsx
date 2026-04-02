import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Settings, ShieldCheck, ShieldAlert, Monitor, UserCog, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getActiveLogo, getSelectedEmpresaId } from "@/lib/logoUtils";

interface NFCeConfig {
  ambiente?: string;
  cscToken?: string;
  certificadoValidade?: string;
  contingenciaAtiva?: boolean;
  numeroCaixa?: string;
}

interface EmpresaCadastro {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  selecionada?: boolean;
}

interface Props {
  clock: string;
  operador: string;
  onTrocarOperador?: () => void;
  pdvDark?: boolean;
  onTogglePdvDark?: () => void;
}

function loadNFCeConfig(): NFCeConfig | null {
  try {
    const s = localStorage.getItem("nfce-config");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function loadEmpresaSelecionada(): EmpresaCadastro | null {
  try {
    const s = localStorage.getItem("empresas");
    if (!s) return null;
    const empresas: EmpresaCadastro[] = JSON.parse(s);
    return empresas.find(e => e.selecionada) || empresas[0] || null;
  } catch {
    return null;
  }
}

export function PDVTopBar({ clock, operador, onTrocarOperador, pdvDark, onTogglePdvDark }: Props) {
  const navigate = useNavigate();
  const config = loadNFCeConfig();
  const empresa = loadEmpresaSelecionada();

  const ambienteLabel = config?.ambiente === "1" ? "PRODUÇÃO" : "HOMOLOGAÇÃO";
  const ambienteColor = config?.ambiente === "1" ? "bg-accent text-accent-foreground" : "bg-amber-500 text-white";
  const hasCSC = !!config?.cscToken;
  const hasCert = !!config?.certificadoValidade;
  const isContingencia = config?.contingenciaAtiva;
  const numeroCaixa = config?.numeroCaixa || "001";
  const sefazOk = hasCSC && hasCert && !isContingencia;

  const empresaNome = empresa?.nomeFantasia || empresa?.razaoSocial || "EMPRESA NÃO CADASTRADA";
  const empresaCnpj = empresa?.cnpj || "";

  const empresaId = getSelectedEmpresaId() ?? undefined;
  const logoSrc = getActiveLogo(empresaId);

  return (
    <div className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo da empresa */}
        {logoSrc ? (
          <img src={logoSrc} alt="Logo" className="h-8 w-auto max-w-[120px] object-contain" />
        ) : (
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Monitor size={16} className="text-primary" />
          </div>
        )}
        
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
          <span className="text-foreground font-black text-xs tracking-tight">
            CAIXA {numeroCaixa}
          </span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-foreground/90 text-[10px] font-semibold truncate max-w-[220px] leading-none">
            {empresaNome}
          </span>
          {empresaCnpj && (
            <span className="text-muted-foreground text-[9px] font-mono leading-none mt-0.5">
              {empresaCnpj}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {sefazOk ? (
          <ShieldCheck size={13} className="text-accent" />
        ) : (
          <ShieldAlert size={13} className="text-amber-400" />
        )}
        <Badge className={`${ambienteColor} text-[9px] px-1.5 py-0 h-4 border-0`}>
          {ambienteLabel}
        </Badge>
        {isContingencia && (
          <Badge className="bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0 h-4 border-0">
            CONTINGÊNCIA
          </Badge>
        )}

        <div className="h-4 w-px bg-border" />
        <button
          onClick={onTrocarOperador}
          className="flex items-center gap-1 hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
          title="Trocar Operador (Ctrl+L)"
        >
          <UserCog size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground text-[10px]">
            Op: <strong className="text-foreground">{operador}</strong>
          </span>
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="text-foreground font-mono text-xs font-bold tabular-nums">{clock}</span>

        {onTogglePdvDark && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-6 w-6"
            onClick={onTogglePdvDark}
            title={pdvDark ? "Modo Claro (Ctrl+D)" : "Modo Escuro PDV (Ctrl+D)"}
          >
            {pdvDark ? <Sun size={13} /> : <Moon size={13} />}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-6 w-6"
          onClick={() => navigate("/configuracoes/nfce")}
          title="Configurações"
        >
          <Settings size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-destructive/20 hover:text-destructive h-6 w-6"
          onClick={() => navigate("/")}
          title="Sair (ESC)"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
