
CREATE TABLE public.ibpt_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncm text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  federal numeric NOT NULL DEFAULT 0,
  estadual numeric NOT NULL DEFAULT 0,
  municipal numeric NOT NULL DEFAULT 0,
  versao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ncm)
);

ALTER TABLE public.ibpt_dados ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated can read ibpt_dados"
  ON public.ibpt_dados FOR SELECT TO authenticated
  USING (true);

-- Only admins/gerentes can manage
CREATE POLICY "Admins can manage ibpt_dados"
  ON public.ibpt_dados FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));
