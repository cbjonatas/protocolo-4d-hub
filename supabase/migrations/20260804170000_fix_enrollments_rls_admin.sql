-- Migration: Corrige RLS da tabela enrollments para permitir que admins
-- criem e removam matrículas de qualquer aluno via painel administrativo.
--
-- Problema: A política "enrollments_insert_own" só permitia INSERT quando
-- auth.uid() = user_id, bloqueando o admin de matricular outros usuários.
-- Da mesma forma, não havia política de DELETE para admin, apenas para o
-- próprio usuário.

-- 1. Adicionar política de INSERT para admin
--    Permite que usuários com role 'admin' insiram enrollments para qualquer user_id.
CREATE POLICY "enrollments_insert_admin"
  ON public.enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Adicionar política de DELETE para admin
--    Permite que admins removam matrículas de qualquer aluno.
CREATE POLICY "enrollments_delete_admin"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Adicionar política de DELETE para o próprio aluno (caso não exista)
--    Permite que o aluno remova suas próprias matrículas se necessário.
CREATE POLICY "enrollments_delete_own"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Adicionar política de UPDATE para admin
--    Permite que admins atualizem registros de enrollment.
CREATE POLICY "enrollments_update_admin"
  ON public.enrollments
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Garantir que o role 'authenticated' tem permissão de DELETE na tabela
GRANT DELETE, UPDATE ON public.enrollments TO authenticated;
