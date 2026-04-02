import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Scale, RefreshCw, Wifi, WifiOff, Unplug, Radio, Globe, CheckCircle2, AlertTriangle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BalancaConfig {
  ativa: boolean;
  modelo: string;
  porta: string;
  baudRate: string;
  protocolo: string;
  conexao: string;
  ip: string;
  portaTcp: string;
  casasDecimais: string;
  timeout: string;
  toleranciaEstabilidade?: string;
  amostrasEstabilidade?: string;
}

interface PesagemHistorico {
  id: string;
  peso: number;
  timestamp: Date;
  estavel: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (peso: number) => void;
}

function loadBalancaConfig(): BalancaConfig | null {
  try {
    const s = localStorage.getItem("balanca-config");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function loadHistorico(): PesagemHistorico[] {
  try {
    const s = localStorage.getItem("gp_erp_pesagens_turno");
    if (!s) return [];
    const items = JSON.parse(s);
    return items.map((i: any) => ({ ...i, timestamp: new Date(i.timestamp) }));
  } catch {
    return [];
  }
}

function saveHistorico(items: PesagemHistorico[]) {
  localStorage.setItem("gp_erp_pesagens_turno", JSON.stringify(items));
}

/** Parse weight from common scale protocols */
function parseWeightFromData(raw: string, protocolo: string, casasDecimais: number): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").trim();

  if (protocolo === "toledo-prix") {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length >= 4) {
      const value = parseInt(digits, 10) / Math.pow(10, casasDecimais);
      return value > 0 && value < 9999 ? value : null;
    }
  }

  if (protocolo === "filizola-bcr") {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length >= 3) {
      const value = parseInt(digits, 10) / Math.pow(10, casasDecimais);
      return value > 0 && value < 9999 ? value : null;
    }
  }

  const match = cleaned.match(/(\d+[.,]\d+)/);
  if (match) {
    const value = parseFloat(match[1].replace(",", "."));
    return value > 0 && value < 9999 ? value : null;
  }

  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length >= 2) {
    const value = parseInt(digits, 10) / Math.pow(10, casasDecimais);
    return value > 0 && value < 9999 ? value : null;
  }

  return null;
}

const webSerialSupported = typeof navigator !== "undefined" && "serial" in navigator;

export function BuscarPesoModal({ open, onClose, onConfirm }: Props) {
  const [peso, setPeso] = useState("");
  const [status, setStatus] = useState<"idle" | "lendo" | "sucesso" | "erro" | "conectando">("idle");
  const [config] = useState<BalancaConfig | null>(loadBalancaConfig);
  const [serialConnected, setSerialConnected] = useState(false);
  const [tcpConnected, setTcpConnected] = useState(false);
  const [autoPolling, setAutoPolling] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [pesoEstavel, setPesoEstavel] = useState(false);
  const [historico, setHistorico] = useState<PesagemHistorico[]>(loadHistorico);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [reconnectCountdown, setReconnectCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const pollingRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const weightSamplesRef = useRef<number[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPortRef = useRef<any>(null);
  const balancaAtiva = config?.ativa ?? false;
  const casasDecimais = Number(config?.casasDecimais ?? 3);
  const conexaoTipo = config?.conexao ?? "serial";
  const stabilityTolerance = Number(config?.toleranciaEstabilidade ?? 5) / 1000;
  const stabilitySamples = Number(config?.amostrasEstabilidade ?? 5);

  const checkStability = useCallback((newWeight: number) => {
    const samples = weightSamplesRef.current;
    samples.push(newWeight);
    if (samples.length > stabilitySamples) samples.shift();

    if (samples.length >= stabilitySamples) {
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      setPesoEstavel((max - min) <= stabilityTolerance);
    } else {
      setPesoEstavel(false);
    }
  }, [stabilityTolerance, stabilitySamples]);

  // Cleanup on close/unmount — keep serial/TCP connected across modal open/close
  useEffect(() => {
    if (open) {
      setPeso("");
      setStatus(isConnected ? "idle" : "idle");
      setPesoEstavel(false);
      weightSamplesRef.current = [];
      setHistorico(loadHistorico());
    } else {
      stopPolling();
      clearReconnectTimer();
      // NÃO desconecta serial/TCP ao fechar — mantém conexão persistente
    }
    return () => {
      // Desconecta apenas no unmount do componente (saída do PDV)
      stopPolling();
      disconnectSerial();
      disconnectTcp();
      clearReconnectTimer();
    };
  }, [open]);

  // Auto-polling effect
  useEffect(() => {
    if (autoPolling && open && (serialConnected || tcpConnected) && balancaAtiva) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [autoPolling, open, serialConnected, tcpConnected, balancaAtiva]);

  // === SERIAL ===
  const disconnectSerial = async () => {
    try {
      if (readerRef.current) { await readerRef.current.cancel(); readerRef.current = null; }
      if (portRef.current) { await portRef.current.close(); portRef.current = null; }
    } catch { /* ignore */ }
    setSerialConnected(false);
  };

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setReconnectCountdown(0);
  };

  const tryReconnectSerial = useCallback(async (port: any) => {
    if (!port || !open) return;
    const maxAttempts = 5;
    const attempt = reconnectAttempts + 1;
    if (attempt > maxAttempts) {
      toast.error(`Reconexão falhou após ${maxAttempts} tentativas. Reconecte manualmente.`);
      setReconnectAttempts(0);
      return;
    }
    setReconnectAttempts(attempt);
    setStatus("conectando");
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    const delaySec = Math.round(delay / 1000);
    setReconnectCountdown(delaySec);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setReconnectCountdown(prev => { if (prev <= 1) { clearInterval(countdownRef.current!); countdownRef.current = null; return 0; } return prev - 1; });
    }, 1000);
    reconnectTimerRef.current = setTimeout(async () => {
      try {
        await port.open({ baudRate: parseInt(config?.baudRate || "9600", 10) });
        portRef.current = port;
        setSerialConnected(true);
        setStatus("idle");
        setReconnectAttempts(0);
        toast.success("Porta serial reconectada!");
      } catch {
        if (autoReconnect && open) tryReconnectSerial(port);
        else { setStatus("erro"); setReconnectAttempts(0); }
      }
    }, delay);
  }, [config, open, reconnectAttempts, autoReconnect]);

  const connectSerial = useCallback(async () => {
    if (!webSerialSupported) { toast.error("Seu navegador não suporta Web Serial API. Use Chrome/Edge."); return; }
    try {
      setStatus("conectando");
      clearReconnectTimer();
      setReconnectAttempts(0);
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: parseInt(config?.baudRate || "9600", 10) });
      portRef.current = port;
      lastPortRef.current = port;
      setSerialConnected(true);
      setStatus("idle");
      toast.success("Porta serial conectada!");
    } catch (err: any) {
      setStatus("erro");
      setSerialConnected(false);
      if (err?.name === "NotFoundError") return;
      if (err?.message?.includes("Failed to open serial port")) {
        toast.error("Porta serial não pôde ser aberta. Verifique se:\n• A porta não está em uso por outro programa\n• O cabo está conectado corretamente\n• Você tem permissão de acesso à porta", { duration: 8000 });
        if (autoReconnect && lastPortRef.current) tryReconnectSerial(lastPortRef.current);
      } else if (err?.message?.includes("disallowed by permissions policy")) {
        toast.error("Web Serial bloqueada neste contexto. Abra o sistema pela URL direta (não em iframe).", { duration: 8000 });
      } else {
        toast.error("Falha ao conectar: " + (err?.message || "Erro desconhecido"));
      }
    }
  }, [config, autoReconnect, tryReconnectSerial]);

  const readSerialOnce = useCallback(async (): Promise<number | null> => {
    if (!portRef.current) return null;
    const timeout = Number(config?.timeout ?? 5000);
    const protocolo = config?.protocolo ?? "generico";
    try {
      const reader = portRef.current.readable.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let result: number | null = null;

      if (protocolo === "toledo-prix") {
        try { const writer = portRef.current.writable.getWriter(); await writer.write(new Uint8Array([0x05])); writer.releaseLock(); } catch { }
      }

      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, timeout));
      const readPromise = (async () => {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const pesoLido = parseWeightFromData(buffer, protocolo, casasDecimais);
          if (pesoLido !== null) { result = pesoLido; break; }
          if (buffer.length > 200) buffer = buffer.slice(-100);
        }
      })();

      await Promise.race([readPromise, timeoutPromise]);
      readerRef.current = null;
      reader.releaseLock();
      return result;
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Erro leitura serial:", err);
      return null;
    }
  }, [config, casasDecimais]);

  // === TCP/IP via WebSocket bridge ===
  const connectTcp = useCallback(() => {
    const ip = config?.ip || "";
    const porta = config?.portaTcp || "9100";
    if (!ip) { toast.error("Configure o endereço IP da balança."); return; }
    setStatus("conectando");
    const wsUrl = `ws://${ip}:${porta}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => { setTcpConnected(true); setStatus("idle"); toast.success(`Conectado via TCP/IP: ${ip}:${porta}`); };
      ws.onmessage = (event) => {
        const data = typeof event.data === "string" ? event.data : "";
        const pesoLido = parseWeightFromData(data, config?.protocolo ?? "generico", casasDecimais);
        if (pesoLido !== null) { setPeso(pesoLido.toFixed(casasDecimais)); checkStability(pesoLido); setStatus("sucesso"); }
      };
      ws.onerror = () => { setStatus("erro"); setTcpConnected(false); toast.error(`Falha na conexão TCP/IP com ${ip}:${porta}.`); };
      ws.onclose = () => { setTcpConnected(false); if (pollingRef.current) setPollingActive(false); };
    } catch (err: any) {
      setStatus("erro");
      toast.error("Erro ao conectar TCP/IP: " + (err?.message || "Erro"));
    }
  }, [config, casasDecimais, checkStability]);

  const disconnectTcp = () => {
    try { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } } catch { }
    setTcpConnected(false);
  };

  const readTcpOnce = useCallback((): Promise<number | null> => {
    return new Promise((resolve) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { resolve(null); return; }
      const protocolo = config?.protocolo ?? "generico";
      const timeout = Number(config?.timeout ?? 5000);
      if (protocolo === "toledo-prix") wsRef.current.send(String.fromCharCode(0x05));
      let resolved = false;
      const handler = (event: MessageEvent) => {
        if (resolved) return;
        const data = typeof event.data === "string" ? event.data : "";
        const pesoLido = parseWeightFromData(data, protocolo, casasDecimais);
        if (pesoLido !== null) { resolved = true; wsRef.current?.removeEventListener("message", handler); resolve(pesoLido); }
      };
      wsRef.current.addEventListener("message", handler);
      setTimeout(() => { if (!resolved) { resolved = true; wsRef.current?.removeEventListener("message", handler); resolve(null); } }, timeout);
    });
  }, [config, casasDecimais]);

  // === POLLING ===
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setPollingActive(true);
    const poll = async () => {
      while (pollingRef.current) {
        let pesoLido: number | null = null;
        if (serialConnected && portRef.current) pesoLido = await readSerialOnce();
        else if (tcpConnected && wsRef.current) pesoLido = await readTcpOnce();
        if (pesoLido !== null && pollingRef.current) {
          setPeso(pesoLido.toFixed(casasDecimais));
          checkStability(pesoLido);
          setStatus("sucesso");
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      setPollingActive(false);
    };
    poll();
  }, [serialConnected, tcpConnected, readSerialOnce, readTcpOnce, casasDecimais, checkStability]);

  const stopPolling = () => { pollingRef.current = false; setPollingActive(false); };

  // === LEITURA ÚNICA ===
  const lerBalanca = useCallback(async () => {
    if (!balancaAtiva) { setStatus("erro"); return; }
    setStatus("lendo");

    if (serialConnected && portRef.current) {
      const pesoLido = await readSerialOnce();
      if (pesoLido !== null) { setPeso(pesoLido.toFixed(casasDecimais)); checkStability(pesoLido); setStatus("sucesso"); toast.success(`Peso capturado: ${pesoLido.toFixed(casasDecimais)} kg`); }
      else { setStatus("erro"); toast.error("Timeout: nenhum dado recebido da balança."); }
      return;
    }

    if (tcpConnected && wsRef.current) {
      const pesoLido = await readTcpOnce();
      if (pesoLido !== null) { setPeso(pesoLido.toFixed(casasDecimais)); checkStability(pesoLido); setStatus("sucesso"); toast.success(`Peso capturado: ${pesoLido.toFixed(casasDecimais)} kg`); }
      else { setStatus("erro"); toast.error("Timeout: nenhum dado recebido da balança."); }
      return;
    }

    // Fallback: simulação
    setTimeout(() => {
      const pesoSimulado = (Math.random() * 5 + 0.1).toFixed(casasDecimais);
      setPeso(pesoSimulado);
      checkStability(parseFloat(pesoSimulado));
      setStatus("sucesso");
      toast.info("Peso simulado (conecte a balança para leitura real)");
    }, 1500);
  }, [balancaAtiva, serialConnected, tcpConnected, readSerialOnce, readTcpOnce, casasDecimais, checkStability]);

  const addToHistorico = (pesoVal: number, estavel: boolean) => {
    const entry: PesagemHistorico = { id: crypto.randomUUID(), peso: pesoVal, timestamp: new Date(), estavel };
    const updated = [entry, ...historico].slice(0, 50);
    setHistorico(updated);
    saveHistorico(updated);
  };

  const clearHistorico = () => { setHistorico([]); saveHistorico([]); };

  const handleConfirm = () => {
    const p = parseFloat(peso);
    if (!p || p <= 0) return;
    stopPolling();
    addToHistorico(p, pesoEstavel);
    onConfirm(p);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "F1") { e.preventDefault(); lerBalanca(); }
  };

  const isConnected = serialConnected || tcpConnected;
  const pesoNumerico = parseFloat(peso);
  const pesoValido = pesoNumerico > 0;
  const isFromScale = isConnected && status === "sucesso";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { stopPolling(); onClose(); } }}>
      <DialogContent className="max-w-lg" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Buscar Peso - Ctrl+B
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Status da balança */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              {balancaAtiva ? <Wifi className="h-4 w-4 text-accent-foreground" /> : <WifiOff className="h-4 w-4 text-destructive" />}
              <span className="text-sm font-medium">
                {balancaAtiva ? `Balança ${config?.modelo?.toUpperCase()}` : "Balança não configurada"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isConnected && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1 border-primary/50 text-primary">
                  {serialConnected ? <><Unplug size={10} /> Serial</> : <><Globe size={10} /> TCP</>}
                </Badge>
              )}
              {pollingActive && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1 border-primary/50 text-primary animate-pulse">
                  <Radio size={10} /> Auto
                </Badge>
              )}
              <Badge variant={balancaAtiva ? "default" : "secondary"}>
                {balancaAtiva ? (isConnected ? "Conectada" : "Ativa") : "Inativa"}
              </Badge>
            </div>
          </div>

          {/* Conexão */}
          {balancaAtiva && (
            <div className="flex gap-2">
              {conexaoTipo === "serial" ? (
                !serialConnected ? (
                  <Button onClick={connectSerial} variant="outline" className="flex-1 gap-2 text-xs" disabled={status === "conectando"}>
                    <Unplug size={14} />
                    {status === "conectando" ? "Conectando..." : "Conectar Serial"}
                  </Button>
                ) : (
                  <Button onClick={() => { stopPolling(); disconnectSerial(); }} variant="outline" className="flex-1 gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Unplug size={14} /> Desconectar Serial
                  </Button>
                )
              ) : (
                !tcpConnected ? (
                  <Button onClick={connectTcp} variant="outline" className="flex-1 gap-2 text-xs" disabled={status === "conectando"}>
                    <Globe size={14} />
                    {status === "conectando" ? "Conectando..." : `Conectar TCP ${config?.ip || ""}:${config?.portaTcp || "9100"}`}
                  </Button>
                ) : (
                  <Button onClick={() => { stopPolling(); disconnectTcp(); }} variant="outline" className="flex-1 gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
                    <Globe size={14} /> Desconectar TCP
                  </Button>
                )
              )}
            </div>
          )}

          {/* Auto-polling toggle */}
          {balancaAtiva && isConnected && (
            <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Radio size={14} className={pollingActive ? "text-primary animate-pulse" : "text-muted-foreground"} />
                <Label htmlFor="auto-polling" className="text-xs font-medium cursor-pointer">Leitura contínua (auto-polling)</Label>
              </div>
              <Switch id="auto-polling" checked={autoPolling} onCheckedChange={setAutoPolling} />
            </div>
          )}

          {balancaAtiva && conexaoTipo === "serial" && !webSerialSupported && (
            <p className="text-xs text-muted-foreground text-center bg-muted/50 p-2 rounded">
              Web Serial API não disponível. Use Chrome ou Edge para leitura serial.
            </p>
          )}

          {/* Peso Display + Estabilidade */}
          <div className={`text-center p-5 rounded-xl border-2 bg-primary/5 transition-colors ${pollingActive ? "border-primary" : "border-primary/30"}`}>
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
              {pollingActive ? "Peso em Tempo Real" : "Peso Lido"}
            </span>
            <div className="text-5xl font-mono font-bold text-primary mt-2">
              {peso || `0.${"0".repeat(casasDecimais)}`}
            </div>
            <span className="text-sm text-muted-foreground">kg</span>

            {/* Indicador de estabilidade */}
            {isFromScale && pesoValido && (
              <div className={`mt-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-full py-1.5 px-3 mx-auto w-fit ${
                pesoEstavel
                  ? "bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30"
                  : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 animate-pulse"
              }`}>
                {pesoEstavel ? (
                  <><CheckCircle2 size={14} /> Peso Estável</>
                ) : (
                  <><AlertTriangle size={14} /> Peso Instável — Aguarde</>
                )}
              </div>
            )}
          </div>

          {/* Botão ler balança (manual) */}
          {!pollingActive && (
            <Button onClick={lerBalanca} className="w-full gap-2" variant="outline" disabled={status === "lendo" || status === "conectando"}>
              <RefreshCw className={`h-4 w-4 ${status === "lendo" ? "animate-spin" : ""}`} />
              {status === "lendo" ? "Lendo balança..." : "Ler Balança (F1)"}
            </Button>
          )}

          {/* Input manual */}
          <div>
            <Label className="text-xs">Peso manual (kg)</Label>
            <Input
              type="number"
              step={`0.${"0".repeat(casasDecimais - 1)}1`}
              min="0"
              value={peso}
              onChange={e => { setPeso(e.target.value); setStatus("idle"); setPesoEstavel(true); weightSamplesRef.current = []; if (autoPolling) setAutoPolling(false); }}
              placeholder="Digite o peso manualmente..."
              className="font-mono text-lg font-bold text-right mt-1"
              autoFocus
            />
          </div>

          {/* Histórico de pesagens do turno */}
          {historico.length > 0 && (
            <div className="border border-border rounded-lg">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock size={12} /> Pesagens do Turno ({historico.length})
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={clearHistorico}>
                  <Trash2 size={12} className="mr-1" /> Limpar
                </Button>
              </div>
              <ScrollArea className="max-h-32">
                <div className="divide-y divide-border">
                  {historico.slice(0, 10).map((h) => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{h.peso.toFixed(casasDecimais)} kg</span>
                        {h.estavel ? (
                          <CheckCircle2 size={12} className="text-green-500" />
                        ) : (
                          <AlertTriangle size={12} className="text-yellow-500" />
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {h.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {!balancaAtiva && (
            <p className="text-xs text-muted-foreground text-center">
              Configure a balança em Configurações &gt; Balança para leitura automática.
            </p>
          )}

          {/* Reconexão visual */}
          {status === "conectando" && reconnectAttempts > 0 && (
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5 animate-pulse">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <RefreshCw size={14} className="animate-spin" />
                Reconectando... Tentativa {reconnectAttempts}/5
              </div>
              {reconnectCountdown > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative h-2 w-32 rounded-full bg-muted overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, (1 - reconnectCountdown / 10) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{reconnectCountdown}s</span>
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => { clearReconnectTimer(); setReconnectAttempts(0); setStatus("idle"); }}>
                Cancelar reconexão
              </Button>
            </div>
          )}

          {status === "erro" && (
            <div className="text-center space-y-2">
              <p className="text-xs text-destructive">
                Falha na leitura. Verifique a conexão da balança ou use o campo manual.
              </p>
              {balancaAtiva && !isConnected && conexaoTipo === "serial" && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { clearReconnectTimer(); setReconnectAttempts(0); connectSerial(); }}>
                    <RefreshCw size={12} /> Tentar Reconectar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { stopPolling(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!pesoValido}>
            {isFromScale && !pesoEstavel ? (
              <><AlertTriangle size={14} className="mr-1" /> Confirmar (Instável)</>
            ) : (
              "Confirmar Peso"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
