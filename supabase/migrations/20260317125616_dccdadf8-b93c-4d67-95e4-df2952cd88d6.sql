
CREATE TABLE public.ncm_web (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text NOT NULL DEFAULT '',
  data_inicio text DEFAULT '',
  data_fim text DEFAULT '',
  tipo_ato text DEFAULT '',
  numero_ato text DEFAULT '',
  ano_ato text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ncm_web ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read ncm_web" ON public.ncm_web
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage ncm_web" ON public.ncm_web
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role]));
