
-- Fix permissive INSERT policy on xml_fiscal_logs
DROP POLICY "Authenticated can insert xml_fiscal_logs" ON public.xml_fiscal_logs;
CREATE POLICY "Staff can insert xml_fiscal_logs" ON public.xml_fiscal_logs FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['administrador','gerente','supervisor','financeiro','estoquista','operador','vendedor']::app_role[]));
