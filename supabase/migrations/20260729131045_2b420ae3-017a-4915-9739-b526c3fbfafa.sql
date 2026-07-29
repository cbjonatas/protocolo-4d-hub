
-- Extend existing tables
ALTER TABLE public.question_goals
  ADD COLUMN IF NOT EXISTS subject text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pdf_path text NOT NULL DEFAULT '';

ALTER TABLE public.mock_exams
  ADD COLUMN IF NOT EXISTS pdf_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS answer_key_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS correction_video_url text NOT NULL DEFAULT '';

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_file_path text NOT NULL DEFAULT '';

-- questions
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES public.question_goals(id) ON DELETE CASCADE,
  statement text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_select ON public.questions FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY questions_admin_all ON public.questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- question_options
CREATE TABLE public.question_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  content text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY qopts_select ON public.question_options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = question_id AND (q.is_published OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY qopts_admin_all ON public.question_options FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- question_attempts
CREATE TABLE public.question_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  goal_id uuid NOT NULL REFERENCES public.question_goals(id) ON DELETE CASCADE,
  total integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY qatt_select ON public.question_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY qatt_insert_own ON public.question_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY qatt_update_own ON public.question_attempts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY qatt_delete_own ON public.question_attempts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- question_answers
CREATE TABLE public.question_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid NOT NULL REFERENCES public.question_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES public.question_options(id) ON DELETE SET NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_answers TO authenticated;
GRANT ALL ON public.question_answers TO service_role;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY qans_select ON public.question_answers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.id = attempt_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );
CREATE POLICY qans_insert_own ON public.question_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
  );

CREATE INDEX questions_goal_idx ON public.questions(goal_id, order_index);
CREATE INDEX qopts_question_idx ON public.question_options(question_id, order_index);
CREATE INDEX qatt_user_goal_idx ON public.question_attempts(user_id, goal_id);
CREATE INDEX qans_attempt_idx ON public.question_answers(attempt_id);
