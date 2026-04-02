-- Recreate the function with audit logging for escalation attempts
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin boolean;
  _attempted_changes text[];
BEGIN
  _is_admin := public.has_role(auth.uid(), 'administrador');
  
  IF NOT _is_admin THEN
    _attempted_changes := ARRAY[]::text[];
    
    IF NEW.limite_desconto IS DISTINCT FROM OLD.limite_desconto THEN
      _attempted_changes := array_append(_attempted_changes, 
        format('limite_desconto: %s -> %s', OLD.limite_desconto, NEW.limite_desconto));
      NEW.limite_desconto := OLD.limite_desconto;
    END IF;
    
    IF NEW.comissao IS DISTINCT FROM OLD.comissao THEN
      _attempted_changes := array_append(_attempted_changes, 
        format('comissao: %s -> %s', OLD.comissao, NEW.comissao));
      NEW.comissao := OLD.comissao;
    END IF;
    
    IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
      _attempted_changes := array_append(_attempted_changes, 
        format('ativo: %s -> %s', OLD.ativo, NEW.ativo));
      NEW.ativo := OLD.ativo;
    END IF;
    
    IF array_length(_attempted_changes, 1) > 0 THEN
      INSERT INTO public.audit_logs (action, user_id, user_name, user_role, detail)
      VALUES (
        'escalacao_privilegio_bloqueada',
        COALESCE(auth.uid()::text, 'unknown'),
        COALESCE(NEW.nome, 'unknown'),
        (SELECT COALESCE(ur.role::text, 'unknown') FROM public.user_roles ur WHERE ur.user_id = auth.uid() LIMIT 1),
        format('Tentativa de alteração de campos protegidos no perfil %s: %s', 
               NEW.id, array_to_string(_attempted_changes, '; '))
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;

CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_fields();