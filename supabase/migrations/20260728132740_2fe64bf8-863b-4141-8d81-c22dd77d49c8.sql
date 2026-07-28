
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER ROLES
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ============================================================
-- CATALOG: COURSES / CYCLES / LESSONS / MATERIALS / GOALS / EXAMS
-- ============================================================
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cover_url TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cycles TO authenticated;
GRANT ALL ON public.cycles TO service_role;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  release_offset_days INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.question_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  question_count INT NOT NULL DEFAULT 0,
  external_url TEXT NOT NULL DEFAULT '',
  release_offset_days INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_goals TO authenticated;
GRANT ALL ON public.question_goals TO service_role;
ALTER TABLE public.question_goals ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  release_offset_days INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mock_exams TO authenticated;
GRANT ALL ON public.mock_exams TO service_role;
ALTER TABLE public.mock_exams ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ENROLLMENTS + PROGRESS
-- ============================================================
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.goal_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.question_goals(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, goal_id)
);
GRANT SELECT, INSERT, DELETE ON public.goal_progress TO authenticated;
GRANT ALL ON public.goal_progress TO service_role;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.exam_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.mock_exams(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_id)
);
GRANT SELECT, INSERT, DELETE ON public.exam_progress TO authenticated;
GRANT ALL ON public.exam_progress TO service_role;
ALTER TABLE public.exam_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================
-- profiles: user manages own, admin sees all
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- user_roles: user reads own, admin reads all (admin-write via service role)
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- catalog: everyone authenticated can read active items; admin sees/edits all
CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "cycles_select" ON public.cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_admin_all" ON public.cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lessons_select" ON public.lessons FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "materials_select" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "materials_admin_all" ON public.materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "goals_select" ON public.question_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "goals_admin_all" ON public.question_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exams_select" ON public.mock_exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "exams_admin_all" ON public.mock_exams FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- enrollments: user sees/creates own; admin sees all
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "enrollments_insert_own" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- progress: user manages own; admin reads all
CREATE POLICY "lesson_progress_select" ON public.lesson_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lesson_progress_insert_own" ON public.lesson_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lesson_progress_delete_own" ON public.lesson_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "goal_progress_select" ON public.goal_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "goal_progress_insert_own" ON public.goal_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goal_progress_delete_own" ON public.goal_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "exam_progress_select" ON public.exam_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exam_progress_insert_own" ON public.exam_progress FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exam_progress_delete_own" ON public.exam_progress FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + role + enrollment on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _protocol_id UUID;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, whatsapp)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', '')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;

  SELECT id INTO _protocol_id FROM public.courses WHERE slug = 'protocolo-4d' LIMIT 1;
  IF _protocol_id IS NOT NULL THEN
    INSERT INTO public.enrollments (user_id, course_id) VALUES (NEW.id, _protocol_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED: PROTOCOLO 4D
-- ============================================================
DO $$
DECLARE
  course_id UUID;
  c1 UUID; c2 UUID; c3 UUID; c4 UUID;
BEGIN
  INSERT INTO public.courses (slug, title, description, is_active, sort_order)
  VALUES ('protocolo-4d', 'PROTOCOLO 4D',
    'Um protocolo estratégico de preparação com videoaulas, metas de questões e simulados para potencializar sua preparação.',
    true, 1)
  RETURNING id INTO course_id;

  INSERT INTO public.cycles (course_id, number, title, description, sort_order)
    VALUES (course_id, 1, 'CICLO 1 — Diagnóstico', 'Ponto de partida da sua preparação.', 1) RETURNING id INTO c1;
  INSERT INTO public.cycles (course_id, number, title, description, sort_order)
    VALUES (course_id, 2, 'CICLO 2 — Direção', 'Construindo consistência de estudo.', 2) RETURNING id INTO c2;
  INSERT INTO public.cycles (course_id, number, title, description, sort_order)
    VALUES (course_id, 3, 'CICLO 3 — Densidade', 'Aprofundando e revisando o conteúdo.', 3) RETURNING id INTO c3;
  INSERT INTO public.cycles (course_id, number, title, description, sort_order)
    VALUES (course_id, 4, 'CICLO 4 — Domínio', 'Alta performance para a prova.', 4) RETURNING id INTO c4;

  INSERT INTO public.lessons (cycle_id, title, description, release_offset_days, sort_order) VALUES
    (c1, 'Videoaula 01 — Semana 01', 'Abertura do Protocolo 4D e diagnóstico inicial.', 0, 1),
    (c2, 'Videoaula 02 — Semana 02', 'Construindo direção estratégica de estudo.', 7, 1),
    (c3, 'Videoaula 03 — Semana 03', 'Densidade: aprofundamento e revisão inteligente.', 14, 1),
    (c4, 'Videoaula 04 — Semana 04', 'Domínio total: reta final rumo à aprovação.', 21, 1);

  INSERT INTO public.question_goals (cycle_id, title, description, question_count, release_offset_days, sort_order) VALUES
    (c1, 'META 01', 'Resolva a meta de questões da Semana 01.', 50, 0, 1),
    (c2, 'META 02', 'Resolva a meta de questões da Semana 02.', 75, 7, 1),
    (c3, 'META 03', 'Resolva a meta de questões da Semana 03.', 100, 14, 1),
    (c4, 'META 04', 'Resolva a meta de questões da Semana 04.', 150, 21, 1);

  INSERT INTO public.mock_exams (course_id, number, title, description, release_offset_days, sort_order) VALUES
    (course_id, 1, 'SIMULADO 01', 'Simulado do Ciclo 1 — Diagnóstico.', 0, 1),
    (course_id, 2, 'SIMULADO 02', 'Simulado do Ciclo 2 — Direção.', 7, 2),
    (course_id, 3, 'SIMULADO 03', 'Simulado do Ciclo 3 — Densidade.', 14, 3),
    (course_id, 4, 'SIMULADO 04', 'Simulado do Ciclo 4 — Domínio.', 21, 4);
END $$;
