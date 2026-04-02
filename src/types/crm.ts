export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  origem: 'site' | 'indicacao' | 'telefone' | 'rede_social' | 'evento' | 'outro';
  etapa: 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';
  valor: number;
  responsavel: string;
  pessoaId?: string;
  produtosInteresse?: string[];
  observacoes: string;
  dataCriacao: string;
  dataAtualizacao: string;
  motivoPerda?: string;
  probabilidade: number;
  prioridade: 'baixa' | 'media' | 'alta';
}

export interface Atividade {
  id: string;
  leadId: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'visita' | 'tarefa' | 'follow_up';
  titulo: string;
  descricao: string;
  dataAgendada: string;
  dataConclusao?: string;
  status: 'pendente' | 'concluida' | 'cancelada' | 'atrasada';
  responsavel: string;
}

export const ETAPAS_FUNIL: { key: Lead['etapa']; label: string; cor: string }[] = [
  { key: 'prospeccao', label: 'Prospecção', cor: 'bg-blue-500' },
  { key: 'qualificacao', label: 'Qualificação', cor: 'bg-amber-500' },
  { key: 'proposta', label: 'Proposta', cor: 'bg-purple-500' },
  { key: 'negociacao', label: 'Negociação', cor: 'bg-orange-500' },
  { key: 'fechado_ganho', label: 'Fechado (Ganho)', cor: 'bg-green-500' },
  { key: 'fechado_perdido', label: 'Fechado (Perdido)', cor: 'bg-red-500' },
];

export const ORIGENS: { key: Lead['origem']; label: string }[] = [
  { key: 'site', label: 'Site' },
  { key: 'indicacao', label: 'Indicação' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'rede_social', label: 'Rede Social' },
  { key: 'evento', label: 'Evento' },
  { key: 'outro', label: 'Outro' },
];

export const TIPOS_ATIVIDADE: { key: Atividade['tipo']; label: string }[] = [
  { key: 'ligacao', label: 'Ligação' },
  { key: 'email', label: 'E-mail' },
  { key: 'reuniao', label: 'Reunião' },
  { key: 'visita', label: 'Visita' },
  { key: 'tarefa', label: 'Tarefa' },
  { key: 'follow_up', label: 'Follow-up' },
];
