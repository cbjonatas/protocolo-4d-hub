-- Migration: Liberar permissões RLS em enrollments, user_roles e courses,
-- e pré-inserir os cursos dos protocolos mensais no banco de dados.

-- 1. Pre-inserir cursos padrão no banco (Agosto, Setembro, Outubro)
INSERT INTO public.courses (slug, title, description, is_active, sort_order)
VALUES
  ('protocolo-4d', 'Protocolo 4D — Agosto', 'Um protocolo estratégico de preparação com videoaulas, metas de questões e simulados.', true, 1),
  ('protocolo-4d-setembro', 'Protocolo 4D — Setembro', 'Protocolo estratégico do mês de Setembro com novas videoaulas, metas e simulados.', true, 2),
  ('protocolo-4d-outubro', 'Protocolo 4D — Outubro', 'Protocolo estratégico do mês de Outubro focado na reta final de preparação.', true, 3)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  is_active = EXCLUDED.is_active;

-- 2. Remover políticas antigas restritivas de enrollments
DROP POLICY IF EXISTS "enrollments_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_insert_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_delete_own" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_update_admin" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_authenticated_select" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_authenticated_insert" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_authenticated_update" ON public.enrollments;
DROP POLICY IF EXISTS "enrollments_authenticated_delete" ON public.enrollments;

-- 3. Criar políticas permissivas de enrollments para usuários autenticados
CREATE POLICY "enrollments_authenticated_select" ON public.enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "enrollments_authenticated_insert" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "enrollments_authenticated_update" ON public.enrollments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "enrollments_authenticated_delete" ON public.enrollments FOR DELETE TO authenticated USING (true);

-- 4. Ajustar RLS de user_roles para permitir insert/select por usuários autenticados
DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_authenticated_all" ON public.user_roles;
CREATE POLICY "user_roles_authenticated_all" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Ajustar RLS de courses para permitir select/insert/update por usuários autenticados
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_admin_all" ON public.courses;
DROP POLICY IF EXISTS "courses_authenticated_all" ON public.courses;
CREATE POLICY "courses_authenticated_all" ON public.courses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Conceder permissões explícitas de tabela
GRANT ALL ON public.enrollments TO authenticated, service_role;
GRANT ALL ON public.user_roles TO authenticated, service_role;
GRANT ALL ON public.courses TO authenticated, service_role;
