-- Fix overly permissive INSERT policy on liberacoes_gerenciais
-- Replace WITH CHECK (true) with role-based check
DROP POLICY IF EXISTS "Authenticated can insert liberacoes" ON public.liberacoes_gerenciais;

CREATE POLICY "Authorized roles can insert liberacoes"
ON public.liberacoes_gerenciais
FOR INSERT
TO authenticated
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'supervisor'::app_role, 'operador'::app_role, 'vendedor'::app_role])
);