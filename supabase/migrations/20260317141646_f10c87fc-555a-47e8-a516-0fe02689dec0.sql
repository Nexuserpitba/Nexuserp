
-- Tabela de configuração do relatório semanal
CREATE TABLE public.weekly_report_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo boolean NOT NULL DEFAULT false,
  destinatarios text[] NOT NULL DEFAULT '{}',
  relatorios_ativos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_report_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage weekly_report_config" ON public.weekly_report_config
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));

CREATE POLICY "Admins can read weekly_report_config" ON public.weekly_report_config
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));

-- Tabela de histórico de e-mails enviados
CREATE TABLE public.email_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario text NOT NULL,
  assunto text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'enviado',
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_send_history" ON public.email_send_history
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));

CREATE POLICY "Admins can read email_send_history" ON public.email_send_history
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));
