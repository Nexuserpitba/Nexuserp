-- Protect sensitive profile fields from self-update by non-admins
-- Use a trigger to revert sensitive fields if user is not admin

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the caller is NOT an admin, revert sensitive fields to old values
  IF NOT public.has_role(auth.uid(), 'administrador') THEN
    NEW.limite_desconto := OLD.limite_desconto;
    NEW.comissao := OLD.comissao;
    NEW.ativo := OLD.ativo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;

CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();