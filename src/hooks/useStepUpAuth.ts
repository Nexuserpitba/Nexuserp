/**
 * NexusERP - Step-Up Auth Hook
 * Gerencia reautenticacao para acoes criticas
 */
import { useState, useCallback, useRef } from "react";
import { stepUpAuth } from "@/lib/authService";
import { toast } from "sonner";

export interface StepUpState {
  pending: boolean;
  acao: string | null;
  resolved: boolean;
  stepUpToken: string | null;
}

export function useStepUpAuth() {
  const [state, setState] = useState<StepUpState>({
    pending: false,
    acao: null,
    resolved: false,
    stepUpToken: null,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const resolveRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);

  /**
   * Inicia fluxo de step-up. Retorna uma Promise que resolve com o step_up_token.
   */
  const iniciarStepUp = useCallback((acao: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      resolveRef.current = { resolve, reject };
      setState({
        pending: true,
        acao,
        resolved: false,
        stepUpToken: null,
      });
      setModalOpen(true);
    });
  }, []);

  /**
   * Confirma step-up com senha
   */
  const confirmarComSenha = useCallback(async (password: string) => {
    if (!state.acao) return;

    try {
      const result = await stepUpAuth({
        metodo: "senha",
        acao: state.acao,
        password,
      });

      setState({
        pending: false,
        acao: null,
        resolved: true,
        stepUpToken: result.step_up_token,
      });
      setModalOpen(false);
      toast.success("Reautenticação confirmada");

      if (resolveRef.current) {
        resolveRef.current.resolve(result.step_up_token);
        resolveRef.current = null;
      }
    } catch (err: any) {
      toast.error("Senha incorreta", { description: err.message });
    }
  }, [state.acao]);

  /**
   * Confirma step-up com biometria
   */
  const confirmarComBiometria = useCallback(async (biometriaToken: string) => {
    if (!state.acao) return;

    try {
      const result = await stepUpAuth({
        metodo: "biometria",
        acao: state.acao,
        biometriaToken,
      });

      setState({
        pending: false,
        acao: null,
        resolved: true,
        stepUpToken: result.step_up_token,
      });
      setModalOpen(false);
      toast.success("Reautenticação confirmada via biometria");

      if (resolveRef.current) {
        resolveRef.current.resolve(result.step_up_token);
        resolveRef.current = null;
      }
    } catch (err: any) {
      toast.error("Falha na biometria", { description: err.message });
    }
  }, [state.acao]);

  /**
   * Cancela step-up
   */
  const cancelar = useCallback(() => {
    setState({
      pending: false,
      acao: null,
      resolved: false,
      stepUpToken: null,
    });
    setModalOpen(false);

    if (resolveRef.current) {
      resolveRef.current.reject(new Error("Reautenticação cancelada"));
      resolveRef.current = null;
    }
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      pending: false,
      acao: null,
      resolved: false,
      stepUpToken: null,
    });
    setModalOpen(false);
    resolveRef.current = null;
  }, []);

  return {
    ...state,
    modalOpen,
    iniciarStepUp,
    confirmarComSenha,
    confirmarComBiometria,
    cancelar,
    reset,
  };
}
