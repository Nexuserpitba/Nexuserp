
-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id text NOT NULL DEFAULT '',
  user_name text NOT NULL DEFAULT '',
  user_role text NOT NULL DEFAULT '',
  detail text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage audit_logs" ON public.audit_logs
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));

CREATE POLICY "Users can insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs (action);

-- Liberações gerenciais table
CREATE TABLE public.liberacoes_gerenciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador text NOT NULL DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  cliente_doc text DEFAULT '',
  valor_autorizado numeric DEFAULT 0,
  limite_disponivel numeric DEFAULT 0,
  excedente numeric DEFAULT 0,
  motivo text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liberacoes_gerenciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage liberacoes" ON public.liberacoes_gerenciais
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'supervisor'::app_role]));

CREATE POLICY "Authenticated can insert liberacoes" ON public.liberacoes_gerenciais
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can read liberacoes" ON public.liberacoes_gerenciais
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_liberacoes_created_at ON public.liberacoes_gerenciais (created_at DESC);
