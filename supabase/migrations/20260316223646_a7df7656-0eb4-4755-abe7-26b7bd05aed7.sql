
-- Helper function: check if user has any of several roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- ============================================
-- EMPRESAS: gerentes podem editar
-- ============================================
CREATE POLICY "Gerentes can manage empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente']::app_role[]));

-- ============================================
-- CATEGORIAS: gerentes, supervisores e estoquistas podem gerenciar
-- ============================================
CREATE POLICY "Staff can manage categorias"
  ON public.categorias FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));

-- ============================================
-- PESSOAS: gerentes, supervisores, vendedores, financeiros podem gerenciar
-- ============================================
CREATE POLICY "Staff can manage pessoas"
  ON public.pessoas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','vendedor','financeiro']::app_role[]));

-- ============================================
-- PRODUTOS: gerentes, supervisores e estoquistas podem gerenciar
-- ============================================
CREATE POLICY "Staff can manage produtos"
  ON public.produtos FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));

-- ============================================
-- CONTAS BANCÁRIAS: gerentes e financeiros podem gerenciar
-- ============================================
CREATE POLICY "Finance can manage contas_bancarias"
  ON public.contas_bancarias FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente','financeiro']::app_role[]));

-- ============================================
-- TRANSPORTADORAS: gerentes, supervisores e estoquistas podem gerenciar
-- ============================================
CREATE POLICY "Staff can manage transportadoras"
  ON public.transportadoras FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','estoquista']::app_role[]));

-- ============================================
-- CIDADES: gerentes podem gerenciar
-- ============================================
CREATE POLICY "Gerentes can manage cidades"
  ON public.cidades FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['administrador','gerente']::app_role[]));
