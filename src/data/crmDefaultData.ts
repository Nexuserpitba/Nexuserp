import { Lead, Atividade } from "@/types/crm";

export const defaultLeads: Lead[] = [
  {
    id: "lead-1", nome: "Maria Silva", email: "maria@empresa.com", telefone: "(11) 99999-1111",
    empresa: "Silva Comércio LTDA", origem: "indicacao", etapa: "proposta", valor: 45000,
    responsavel: "João", observacoes: "Interessada em sistema completo", dataCriacao: "2026-03-01",
    dataAtualizacao: "2026-03-10", probabilidade: 70, prioridade: "alta"
  },
  {
    id: "lead-2", nome: "Carlos Oliveira", email: "carlos@tech.com", telefone: "(21) 98888-2222",
    empresa: "Tech Solutions SA", origem: "site", etapa: "qualificacao", valor: 28000,
    responsavel: "Ana", observacoes: "Veio pelo formulário do site", dataCriacao: "2026-03-05",
    dataAtualizacao: "2026-03-12", probabilidade: 40, prioridade: "media"
  },
  {
    id: "lead-3", nome: "Fernanda Costa", email: "fernanda@varejo.com", telefone: "(31) 97777-3333",
    empresa: "Varejo Express", origem: "evento", etapa: "negociacao", valor: 62000,
    responsavel: "João", observacoes: "Contato na feira de tecnologia", dataCriacao: "2026-02-20",
    dataAtualizacao: "2026-03-14", probabilidade: 85, prioridade: "alta"
  },
  {
    id: "lead-4", nome: "Roberto Almeida", email: "roberto@dist.com", telefone: "(41) 96666-4444",
    empresa: "Distribuidora Norte", origem: "telefone", etapa: "prospeccao", valor: 15000,
    responsavel: "Ana", observacoes: "Primeiro contato por telefone", dataCriacao: "2026-03-12",
    dataAtualizacao: "2026-03-12", probabilidade: 20, prioridade: "baixa"
  },
  {
    id: "lead-5", nome: "Juliana Mendes", email: "juliana@food.com", telefone: "(51) 95555-5555",
    empresa: "Food Service Brasil", origem: "rede_social", etapa: "fechado_ganho", valor: 38000,
    responsavel: "João", observacoes: "Venda concluída com sucesso", dataCriacao: "2026-02-01",
    dataAtualizacao: "2026-03-08", probabilidade: 100, prioridade: "alta"
  },
  {
    id: "lead-6", nome: "André Santos", email: "andre@log.com", telefone: "(61) 94444-6666",
    empresa: "Logística Rápida", origem: "indicacao", etapa: "fechado_perdido", valor: 22000,
    responsavel: "Ana", observacoes: "Optou pela concorrência", dataCriacao: "2026-02-10",
    dataAtualizacao: "2026-03-05", probabilidade: 0, prioridade: "media", motivoPerda: "Preço"
  },
  {
    id: "lead-7", nome: "Patricia Lima", email: "patricia@mode.com", telefone: "(71) 93333-7777",
    empresa: "Moda Elegance", origem: "site", etapa: "proposta", valor: 33000,
    responsavel: "João", observacoes: "Aguardando retorno da proposta", dataCriacao: "2026-03-08",
    dataAtualizacao: "2026-03-15", probabilidade: 60, prioridade: "media"
  },
  {
    id: "lead-8", nome: "Lucas Ferreira", email: "lucas@auto.com", telefone: "(81) 92222-8888",
    empresa: "AutoPeças Central", origem: "telefone", etapa: "qualificacao", valor: 51000,
    responsavel: "Ana", observacoes: "Grande potencial, múltiplas filiais", dataCriacao: "2026-03-10",
    dataAtualizacao: "2026-03-14", probabilidade: 35, prioridade: "alta"
  },
];

export const defaultAtividades: Atividade[] = [
  {
    id: "atv-1", leadId: "lead-1", tipo: "reuniao", titulo: "Apresentação do sistema",
    descricao: "Reunião online para demonstração completa", dataAgendada: "2026-03-18",
    status: "pendente", responsavel: "João"
  },
  {
    id: "atv-2", leadId: "lead-3", tipo: "ligacao", titulo: "Negociação de valores",
    descricao: "Ligar para alinhar condições comerciais", dataAgendada: "2026-03-16",
    status: "pendente", responsavel: "João"
  },
  {
    id: "atv-3", leadId: "lead-2", tipo: "email", titulo: "Enviar material informativo",
    descricao: "Enviar PDF com funcionalidades e cases", dataAgendada: "2026-03-15",
    dataConclusao: "2026-03-15", status: "concluida", responsavel: "Ana"
  },
  {
    id: "atv-4", leadId: "lead-7", tipo: "follow_up", titulo: "Acompanhar proposta",
    descricao: "Verificar se analisou a proposta enviada", dataAgendada: "2026-03-17",
    status: "pendente", responsavel: "João"
  },
  {
    id: "atv-5", leadId: "lead-8", tipo: "visita", titulo: "Visita técnica",
    descricao: "Visitar filial principal para levantamento", dataAgendada: "2026-03-20",
    status: "pendente", responsavel: "Ana"
  },
  {
    id: "atv-6", leadId: "lead-4", tipo: "ligacao", titulo: "Primeiro contato qualificação",
    descricao: "Entender necessidades e orçamento", dataAgendada: "2026-03-14",
    status: "atrasada", responsavel: "Ana"
  },
];
