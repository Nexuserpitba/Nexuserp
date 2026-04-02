import { Lead, Atividade } from "@/types/crm";

export interface LeadScore {
  total: number;
  breakdown: {
    valor: number;
    probabilidade: number;
    etapa: number;
    prioridade: number;
    tempoFunil: number;
    atividades: number;
  };
  rank: 'quente' | 'morno' | 'frio';
}

const ETAPA_SCORES: Record<string, number> = {
  prospeccao: 5,
  qualificacao: 15,
  proposta: 25,
  negociacao: 35,
  fechado_ganho: 40,
  fechado_perdido: 0,
};

export function calcularScore(lead: Lead, atividades: Atividade[]): LeadScore {
  // Valor (0-20pts) - normalizado em 100k
  const valorScore = Math.min(20, Math.round((lead.valor / 100000) * 20));

  // Probabilidade (0-15pts)
  const probScore = Math.round((lead.probabilidade / 100) * 15);

  // Etapa (0-40pts)
  const etapaScore = ETAPA_SCORES[lead.etapa] ?? 0;

  // Prioridade (0-10pts)
  const prioridadeScore = lead.prioridade === 'alta' ? 10 : lead.prioridade === 'media' ? 5 : 2;

  // Tempo no funil - penaliza leads parados (0 a -10pts, capped at 0 minimum contribution)
  const diasNoFunil = Math.round((Date.now() - new Date(lead.dataAtualizacao).getTime()) / (1000 * 60 * 60 * 24));
  const tempoScore = Math.max(-10, -Math.floor(diasNoFunil / 3));

  // Atividades vinculadas (0-15pts)
  const atvLead = atividades.filter(a => a.leadId === lead.id);
  const atvScore = Math.min(15, atvLead.length * 3 + atvLead.filter(a => a.status === 'concluida').length * 2);

  const total = Math.max(0, Math.min(100, valorScore + probScore + etapaScore + prioridadeScore + tempoScore + atvScore));

  const rank: LeadScore['rank'] = total >= 65 ? 'quente' : total >= 35 ? 'morno' : 'frio';

  return {
    total,
    breakdown: {
      valor: valorScore,
      probabilidade: probScore,
      etapa: etapaScore,
      prioridade: prioridadeScore,
      tempoFunil: tempoScore,
      atividades: atvScore,
    },
    rank,
  };
}
