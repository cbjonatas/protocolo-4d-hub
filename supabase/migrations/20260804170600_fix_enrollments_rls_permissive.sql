-- Migration: Permitir acesso completo a enrollments para todos os usuários autenticados
-- e atualizar a função public.has_role para reconhecer e-mails de admin.

-- 1. Atualizar public.has_role para checar e-mails de admin caso o usuário não esteja na tabela user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email TEXT;
BEGIN
  -- Checagem 1: Verificar tabela user_roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- Checagem 2: Fallback para e-mails de administrador se o papel for 'admin'
  IF _role = 'admin' THEN
    SELECT email INTO _email FROM auth.users WHERE id = _user_id;
    IF _email IS NOT NULL AND (
      LOWER(_email) = 'admin@protocolo4d.com' OR
      LOWER(_email) = 'professorjonatasg@gmail.com' OR
      LOWER(_email) LIKE '%admin%'
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Garantir permissões de EXECUTE na função
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

-- 3. Remover políticas antigas da tabela enrollments
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_allow_authenticated_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_allow_authenticated_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_allow_authenticated_update" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_allow_authenticated_delete" ON public.enrollments;

-- 4. Criar políticas permissivas para usuários autenticados na tabela enrollments
CREATE POLICY "enrollments_authenticated_select" ON public.enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "enrollments_authenticated_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "enrollments_authenticated_update" ON public.enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "enrollments_authenticated_delete" ON public.enrollments FOR DELETE TO authenticated USING (true);

-- 5. Conceder todas as permissões de tabela para authenticated e service_role
GRANT ALL ON public.enrollments TO authenticated, service_role;
