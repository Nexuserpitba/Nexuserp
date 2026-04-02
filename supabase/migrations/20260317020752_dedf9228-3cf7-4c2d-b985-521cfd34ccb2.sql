
-- ============================================================
-- Fix RLS policies: restrict overly permissive SELECT/INSERT
-- ============================================================

-- 1. PESSOAS: restrict SELECT to authorized roles only
DROP POLICY IF EXISTS "Authenticated users can read pessoas" ON pessoas;
CREATE POLICY "Authorized roles can read pessoas" ON pessoas
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'supervisor'::app_role, 'vendedor'::app_role, 'financeiro'::app_role, 'operador'::app_role])
  );

-- 2. CONTAS_BANCARIAS: restrict SELECT to financial roles
DROP POLICY IF EXISTS "Authenticated users can read contas_bancarias" ON contas_bancarias;
CREATE POLICY "Finance roles can read contas_bancarias" ON contas_bancarias
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'financeiro'::app_role])
  );

-- 3. EMPRESAS: restrict SELECT to management roles
DROP POLICY IF EXISTS "Authenticated users can read empresas" ON empresas;
CREATE POLICY "Management can read empresas" ON empresas
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'financeiro'::app_role, 'supervisor'::app_role])
  );

-- 4. TRANSPORTADORAS: restrict SELECT to relevant roles
DROP POLICY IF EXISTS "Authenticated users can read transportadoras" ON transportadoras;
CREATE POLICY "Authorized roles can read transportadoras" ON transportadoras
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'supervisor'::app_role, 'estoquista'::app_role, 'financeiro'::app_role])
  );

-- 5. LIBERACOES_GERENCIAIS: restrict SELECT to management
DROP POLICY IF EXISTS "Authenticated can read liberacoes" ON liberacoes_gerenciais;
CREATE POLICY "Management can read liberacoes" ON liberacoes_gerenciais
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role, 'supervisor'::app_role])
  );

-- 6. AUDIT_LOGS: fix SELECT to own records + fix INSERT to enforce user_id
DROP POLICY IF EXISTS "Users can read own audit_logs" ON audit_logs;
CREATE POLICY "Users can read own audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR has_any_role(auth.uid(), ARRAY['administrador'::app_role, 'gerente'::app_role])
  );

DROP POLICY IF EXISTS "Users can insert audit_logs" ON audit_logs;
CREATE POLICY "Users can insert own audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);
