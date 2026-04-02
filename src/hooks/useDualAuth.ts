/**
 * NexusERP - Dual Auth Hook
 * Gerencia dupla autorizacao (operador + gerente)
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  solicitarAutorizacao,
  confirmarAutorizacao,
  getAutorizacoesPendentes,
  conectarStreamBiometria,
} from "@/lib/authService";
import { toast } from "sonner";

export interface DualAuthState {
  pending: boolean;
  autorizacaoId: string | null;
  acao: string | null;
  status: "PENDENTE" | "APROVADO" | "NEGADO" | "EXPIRADO" | null;
  gerente: string | null;
}

export function useDualAuth() {
  const [state, setState] = useState<DualAuthState>({
    pending: false,
    autorizacaoId: null,
    acao: null,
    status: null,
    gerente: null,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [pendentes, setPendentes] = useState<any[]>([]);
  const resolveRef = useRef<{
    resolve: (autorizacaoId: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Limpa polling ao desmontar
   */
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  /**
   * Inicia fluxo de dual auth. Retorna Promise que resolve com o autorizacao_id aprovado.
   */
  const iniciarDualAuth = useCallback((
    acao: string,
    motivo?: string,
    detalhes?: Record<string, unknown>
  ): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Solicitar autorizacao ao backend
        const result = await solicitarAutorizacao({ acao, motivo, detalhes });

        resolveRef.current = { resolve, reject };

        setState({
          pending: true,
          autorizacaoId: result.autorizacao_id,
          acao,
          status: "PENDENTE",
          gerente: null,
        });
        setModalOpen(true);

        toast.info("Autorização solicitada", {
          description: "Aguardando confirmação de gerente...",
        });

        // Iniciar polling para verificar status
        const terminalId = localStorage.getItem("terminal-id") || "default";

        // Tentar SSE primeiro
        const closeSSE = conectarStreamBiometria(terminalId, (evento) => {
          if (
            evento.tipo === "autorizacao_aprovada" &&
            evento.autorizacao_id === result.autorizacao_id
          ) {
            handleAprovado(result.autorizacao_id, evento.gerente as string);
            closeSSE();
          } else if (
            evento.tipo === "autorizacao_negada" &&
            evento.autorizacao_id === result.autorizacao_id
          ) {
            handleNegado();
            closeSSE();
          }
        });

        // Fallback: polling a cada 2 segundos
        pollingRef.current = setInterval(async () => {
          try {
            const pendentesData = await getAutorizacoesPendentes();
            const found = pendentesData.find(a => a.id === result.autorizacao_id);

            if (!found) {
              // Pode ter sido aprovada ou expirada
              // Verificar se expirou
              if (new Date(result.expira_em) < new Date()) {
                handleExpirado();
                closeSSE();
              }
            }
          } catch {
            // Ignorar erros de polling
          }
        }, 2000);

        // Timeout de 120 segundos
        setTimeout(() => {
          if (state.pending && state.autorizacaoId === result.autorizacao_id) {
            handleExpirado();
            closeSSE();
          }
        }, 120000);

      } catch (err: any) {
        toast.error("Erro ao solicitar autorização", { description: err.message });
        reject(err);
      }
    });
  }, []);

  const handleAprovado = useCallback((autorizacaoId: string, gerente: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState({
      pending: false,
      autorizacaoId,
      acao: null,
      status: "APROVADO",
      gerente,
    });
    setModalOpen(false);
    toast.success("Autorização aprovada", {
      description: `Autorizado por ${gerente}`,
    });

    if (resolveRef.current) {
      resolveRef.current.resolve(autorizacaoId);
      resolveRef.current = null;
    }
  }, []);

  const handleNegado = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState(prev => ({
      ...prev,
      pending: false,
      status: "NEGADO",
    }));
    setModalOpen(false);
    toast.error("Autorização negada pelo gerente");

    if (resolveRef.current) {
      resolveRef.current.reject(new Error("Autorização negada"));
      resolveRef.current = null;
    }
  }, []);

  const handleExpirado = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState(prev => ({
      ...prev,
      pending: false,
      status: "EXPIRADO",
    }));
    setModalOpen(false);
    toast.warning("Autorização expirada", {
      description: "Tempo de 120 segundos esgotado",
    });

    if (resolveRef.current) {
      resolveRef.current.reject(new Error("Autorização expirada"));
      resolveRef.current = null;
    }
  }, []);

  /**
   * Cancela dual auth
   */
  const cancelar = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState({
      pending: false,
      autorizacaoId: null,
      acao: null,
      status: null,
      gerente: null,
    });
    setModalOpen(false);

    if (resolveRef.current) {
      resolveRef.current.reject(new Error("Autorização cancelada"));
      resolveRef.current = null;
    }
  }, []);

  /**
   * Carregar autorizacoes pendentes (para painel do gerente)
   */
  const carregarPendentes = useCallback(async () => {
    const data = await getAutorizacoesPendentes();
    setPendentes(data);
    return data;
  }, []);

  /**
   * Gerente confirma autorizacao
   */
  const gerenteConfirmar = useCallback(async (params: {
    autorizacaoId: string;
    aprovar: boolean;
    metodo: "senha" | "biometria";
    password?: string;
    biometriaToken?: string;
  }) => {
    const result = await confirmarAutorizacao(params);

    if (result.sucesso) {
      toast.success(params.aprovar ? "Autorização aprovada" : "Autorização negada");
      await carregarPendentes();
    }

    return result;
  }, [carregarPendentes]);

  /**
   * Reset
   */
  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setState({
      pending: false,
      autorizacaoId: null,
      acao: null,
      status: null,
      gerente: null,
    });
    setModalOpen(false);
    resolveRef.current = null;
  }, []);

  return {
    ...state,
    modalOpen,
    pendentes,
    iniciarDualAuth,
    cancelar,
    carregarPendentes,
    gerenteConfirmar,
    reset,
  };
}
