import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { QrCode, CheckCircle2, Loader2, Copy, RefreshCw, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  valor: number;
  onPagamentoConfirmado: () => void;
}

type PixStatus = "gerando" | "aguardando" | "confirmado" | "expirado" | "erro";

const bancosDisponiveis = [
  // Tradicionais
  { id: "bb", nome: "Banco do Brasil", ispb: "00000000" },
  { id: "bradesco", nome: "Bradesco", ispb: "60746948" },
  { id: "itau", nome: "Itaú Unibanco", ispb: "60701190" },
  { id: "santander", nome: "Santander", ispb: "90400888" },
  { id: "caixa", nome: "Caixa Econômica", ispb: "00360305" },
  // Digitais
  { id: "nubank", nome: "Nubank", ispb: "18236120" },
  { id: "inter", nome: "Banco Inter", ispb: "00416968" },
  { id: "c6", nome: "C6 Bank", ispb: "31872495" },
  { id: "neon", nome: "Neon", ispb: "09089356" },
  { id: "next", nome: "Next (Bradesco)", ispb: "60746948" },
  { id: "original", nome: "Banco Original", ispb: "92894922" },
  { id: "btg", nome: "BTG Pactual", ispb: "30306294" },
  { id: "pan", nome: "Banco Pan", ispb: "59285411" },
  { id: "modal", nome: "Banco Modal", ispb: "30723886" },
  { id: "sofisa", nome: "Sofisa Direto", ispb: "60889128" },
  { id: "bmg", nome: "Banco BMG", ispb: "61186680" },
  { id: "will", nome: "Will Bank", ispb: "23862762" },
  { id: "picpay", nome: "PicPay", ispb: "22896431" },
  { id: "iti", nome: "Iti (Itaú)", ispb: "60701190" },
  { id: "pagbank", nome: "PagBank (PagSeguro)", ispb: "08561701" },
  // Cooperativas
  { id: "sicredi", nome: "Sicredi", ispb: "01181521" },
  { id: "sicoob", nome: "Sicoob", ispb: "02038232" },
  { id: "unicred", nome: "Unicred", ispb: "00315557" },
  { id: "cresol", nome: "Cresol", ispb: "01330387" },
  // Fintechs / Adquirentes
  { id: "mercadopago", nome: "Mercado Pago", ispb: "10573521" },
  { id: "stone", nome: "Stone", ispb: "16501555" },
  { id: "pagseguro", nome: "PagSeguro", ispb: "08561701" },
  { id: "cielo", nome: "Cielo", ispb: "01027058" },
  { id: "rede", nome: "Rede (Itaú)", ispb: "01425787" },
  { id: "getnet", nome: "Getnet (Santander)", ispb: "10440482" },
  { id: "sumup", nome: "SumUp", ispb: "32778350" },
  { id: "iFood", nome: "iFood Pagamentos", ispb: "34747388" },
  { id: "asaas", nome: "Asaas", ispb: "19540550" },
  { id: "gerencianet", nome: "Efí (Gerencianet)", ispb: "09089356" },
];

function getPixConfig() {
  try {
    const s = localStorage.getItem("nfce-config");
    if (!s) return null;
    const c = JSON.parse(s);
    return {
      chaveTipo: c.pixChaveTipo || "cpf",
      chaveValor: c.pixChaveValor || "",
      nome: c.pixNomeBeneficiario || "LOJA_EXEMPLO",
      cidade: c.pixCidade || "BRASILIA",
      banco: c.pixBanco || "bb",
    };
  } catch { return null; }
}

function gerarPixCopiaCola(valor: number, config: ReturnType<typeof getPixConfig>): string {
  const nome = config?.nome || "LOJA_EXEMPLO";
  const cidade = config?.cidade || "BRASILIA";
  const chave = config?.chaveValor || crypto.randomUUID();
  const payload = `00020126580014br.gov.bcb.pix0136${chave}5204000053039865404${valor.toFixed(2)}5802BR59${nome.length.toString().padStart(2,"0")}${nome}60${cidade.length.toString().padStart(2,"0")}${cidade}62070503***6304`;
  return payload;
}

function gerarQRCodeSVG(data: string, size: number = 200): string {
  // Generate a deterministic QR-like pattern from the data string
  const modules = 25;
  const cellSize = size / modules;
  let rects = "";

  // Simple hash-based pattern for visual representation
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Fixed position patterns (corners)
      const isFinderPattern =
        (row < 7 && col < 7) ||
        (row < 7 && col >= modules - 7) ||
        (row >= modules - 7 && col < 7);

      const isFinderBorder =
        isFinderPattern && (
          row === 0 || row === 6 || col === 0 || col === 6 ||
          (row >= modules - 7 && (row === modules - 7 || row === modules - 1)) ||
          (col >= modules - 7 && (col === modules - 7 || col === modules - 1)) ||
          row === 0 || col === 0
        );

      const isFinderCenter =
        isFinderPattern && (
          (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
          (row >= 2 && row <= 4 && col >= modules - 5 && col <= modules - 3) ||
          (row >= modules - 5 && row <= modules - 3 && col >= 2 && col <= 4)
        );

      // Data pattern based on hash
      const charCode = data.charCodeAt((row * modules + col) % data.length);
      const isData = !isFinderPattern && ((charCode * (row + 1) * (col + 1)) % 3 === 0);

      if (isFinderBorder || isFinderCenter || isData) {
        rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="hsl(var(--foreground))"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    ${rects}
  </svg>`;
}

export function PixQRCodeModal({ open, onClose, valor, onPagamentoConfirmado }: Props) {
  const pixConfig = getPixConfig();

  const [bancoSelecionado, setBancoSelecionado] = useState(() => pixConfig?.banco || "bb");
  const [status, setStatus] = useState<PixStatus>("gerando");
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [tempoRestante, setTempoRestante] = useState(300); // 5 minutos
  const [txId, setTxId] = useState("");

  const banco = bancosDisponiveis.find(b => b.id === bancoSelecionado);

  const gerarCobranca = useCallback(() => {
    setStatus("gerando");
    setTempoRestante(300);
    setTxId(`TX${Date.now().toString(36).toUpperCase()}`);

    // Simula geração da cobrança PIX
    setTimeout(() => {
      const payload = gerarPixCopiaCola(valor, pixConfig);
      setPixCopiaCola(payload);
      setStatus("aguardando");
      toast.info("QR Code PIX gerado! Aguardando pagamento...");
    }, 1500);
  }, [valor, bancoSelecionado]);

  // Gera cobrança ao abrir
  useEffect(() => {
    if (open) {
      gerarCobranca();
    }
    return () => {
      setStatus("gerando");
      setPixCopiaCola("");
    };
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (status !== "aguardando") return;
    if (tempoRestante <= 0) {
      setStatus("expirado");
      return;
    }
    const interval = setInterval(() => {
      setTempoRestante(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status, tempoRestante]);

  // Simula polling de confirmação (em produção seria via webhook/API do banco)
  useEffect(() => {
    if (status !== "aguardando") return;
    // Simula confirmação após 8-15 segundos
    const delay = 8000 + Math.random() * 7000;
    const timeout = setTimeout(() => {
      setStatus("confirmado");
      toast.success("Pagamento PIX confirmado!");
      setTimeout(() => onPagamentoConfirmado(), 1500);
    }, delay);
    return () => clearTimeout(timeout);
  }, [status, onPagamentoConfirmado]);

  const copiarPixCopiaCola = () => {
    navigator.clipboard.writeText(pixCopiaCola).then(() => {
      toast.success("PIX Copia e Cola copiado!");
    }).catch(() => {
      toast.error("Erro ao copiar");
    });
  };

  const formatTempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const statusColor: Record<PixStatus, string> = {
    gerando: "bg-muted text-muted-foreground",
    aguardando: "bg-amber-500/20 text-amber-600",
    confirmado: "bg-green-500/20 text-green-600",
    expirado: "bg-destructive/20 text-destructive",
    erro: "bg-destructive/20 text-destructive",
  };

  const statusLabel: Record<PixStatus, string> = {
    gerando: "Gerando QR Code...",
    aguardando: "Aguardando Pagamento",
    confirmado: "Pagamento Confirmado!",
    expirado: "QR Code Expirado",
    erro: "Erro na Cobrança",
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && status !== "confirmado" && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="text-primary" size={22} />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Valor */}
          <div className="text-center bg-muted/50 rounded-lg p-3">
            <span className="text-sm text-muted-foreground">Valor a pagar</span>
            <p className="text-3xl font-bold font-mono text-primary">R$ {valor.toFixed(2)}</p>
          </div>

          {/* Banco selecionado */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Building2 size={12} /> Instituição recebedora
            </Label>
            <Select value={bancoSelecionado} onValueChange={(v) => { setBancoSelecionado(v); }} disabled={status === "aguardando" || status === "confirmado"}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bancosDisponiveis.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge className={statusColor[status]}>{statusLabel[status]}</Badge>
            {status === "aguardando" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Clock size={12} />
                {formatTempo(tempoRestante)}
              </span>
            )}
            {txId && <span className="text-[10px] text-muted-foreground font-mono">TX: {txId}</span>}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            {status === "gerando" && (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="animate-spin text-primary" size={40} />
              </div>
            )}
            {status === "aguardando" && pixCopiaCola && (
              <div className="relative p-3 bg-white rounded-xl shadow-md border border-border">
                <div
                  dangerouslySetInnerHTML={{ __html: gerarQRCodeSVG(pixCopiaCola, 200) }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white rounded-full p-1.5 shadow">
                    <QrCode size={20} className="text-primary" />
                  </div>
                </div>
              </div>
            )}
            {status === "confirmado" && (
              <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-green-50 dark:bg-green-950/20 rounded-lg gap-2">
                <CheckCircle2 size={60} className="text-green-600" />
                <span className="text-green-700 dark:text-green-400 font-bold text-sm">PAGO</span>
              </div>
            )}
            {status === "expirado" && (
              <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-muted rounded-lg gap-2">
                <Clock size={40} className="text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Expirado</span>
              </div>
            )}
          </div>

          {/* Copia e Cola */}
          {status === "aguardando" && pixCopiaCola && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">PIX Copia e Cola</Label>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded px-2 py-1.5 text-[10px] font-mono break-all max-h-14 overflow-y-auto text-muted-foreground">
                  {pixCopiaCola}
                </div>
                <Button variant="outline" size="sm" onClick={copiarPixCopiaCola} className="gap-1 shrink-0">
                  <Copy size={14} /> Copiar
                </Button>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2">
            {status === "expirado" && (
              <Button onClick={gerarCobranca} className="flex-1 gap-1">
                <RefreshCw size={14} /> Gerar Novo QR Code
              </Button>
            )}
            {status !== "confirmado" && (
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
            )}
          </div>

          {/* Info */}
          <p className="text-[10px] text-center text-muted-foreground">
            {banco?.nome} • ISPB: {banco?.ispb}
            {pixConfig?.chaveValor && ` • Chave: ${pixConfig.chaveTipo.toUpperCase()} ${pixConfig.chaveValor.substring(0, 8)}...`}
            {pixConfig?.nome && ` • ${pixConfig.nome}`}
          </p>
          {!pixConfig?.chaveValor && (
            <p className="text-[10px] text-center text-amber-600">
              ⚠ Chave PIX não configurada. Acesse Configuração NFC-e → Operação.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
