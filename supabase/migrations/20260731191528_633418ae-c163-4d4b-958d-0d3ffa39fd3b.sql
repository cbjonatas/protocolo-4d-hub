-- 1) BACKUP
CREATE SCHEMA IF NOT EXISTS backup_20260731;
CREATE TABLE backup_20260731.courses AS SELECT * FROM public.courses;
CREATE TABLE backup_20260731.cycles AS SELECT * FROM public.cycles;
CREATE TABLE backup_20260731.lessons AS SELECT * FROM public.lessons;
CREATE TABLE backup_20260731.materials AS SELECT * FROM public.materials;
CREATE TABLE backup_20260731.question_goals AS SELECT * FROM public.question_goals;
CREATE TABLE backup_20260731.questions AS SELECT * FROM public.questions;
CREATE TABLE backup_20260731.question_options AS SELECT * FROM public.question_options;
CREATE TABLE backup_20260731.mock_exams AS SELECT * FROM public.mock_exams;
CREATE TABLE backup_20260731.enrollments AS SELECT * FROM public.enrollments;
CREATE TABLE backup_20260731.profiles AS SELECT * FROM public.profiles;
CREATE TABLE backup_20260731.user_roles AS SELECT * FROM public.user_roles;
CREATE TABLE backup_20260731.lesson_progress AS SELECT * FROM public.lesson_progress;
CREATE TABLE backup_20260731.goal_progress AS SELECT * FROM public.goal_progress;
CREATE TABLE backup_20260731.exam_progress AS SELECT * FROM public.exam_progress;
CREATE TABLE backup_20260731.question_attempts AS SELECT * FROM public.question_attempts;
CREATE TABLE backup_20260731.question_answers AS SELECT * FROM public.question_answers;

-- 2) ADMIN ROLE
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role FROM public.profiles p
WHERE p.email = 'admin@protocolo4d.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3) DUPLICATE COURSE
CREATE OR REPLACE FUNCTION public.duplicate_course(p_course_id uuid, p_new_title text, p_new_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_course uuid;
  v_slug text;
  v_i int := 1;
  c record;
  cy record;
  l record;
  g record;
  q record;
  v_new_cycle uuid;
  v_new_lesson uuid;
  v_new_goal uuid;
  v_new_question uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem duplicar cursos';
  END IF;

  SELECT * INTO c FROM public.courses WHERE id = p_course_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Curso não encontrado'; END IF;

  v_slug := COALESCE(NULLIF(trim(p_new_slug), ''), c.slug || '-copia');
  WHILE EXISTS (SELECT 1 FROM public.courses WHERE slug = v_slug) LOOP
    v_i := v_i + 1;
    v_slug := COALESCE(NULLIF(trim(p_new_slug), ''), c.slug || '-copia') || '-' || v_i;
  END LOOP;

  INSERT INTO public.courses (slug, title, description, cover_url, is_active, sort_order)
  VALUES (v_slug, COALESCE(NULLIF(trim(p_new_title), ''), c.title || ' - CÓPIA'),
          c.description, c.cover_url, false,
          COALESCE((SELECT MAX(sort_order) + 1 FROM public.courses), 1))
  RETURNING id INTO v_new_course;

  FOR cy IN SELECT * FROM public.cycles WHERE course_id = p_course_id ORDER BY sort_order LOOP
    INSERT INTO public.cycles (course_id, number, title, description, sort_order)
    VALUES (v_new_course, cy.number, cy.title, cy.description, cy.sort_order)
    RETURNING id INTO v_new_cycle;

    FOR l IN SELECT * FROM public.lessons WHERE cycle_id = cy.id ORDER BY sort_order LOOP
      INSERT INTO public.lessons (cycle_id, title, description, video_url, video_file_path, release_offset_days, sort_order, is_active)
      VALUES (v_new_cycle, l.title, l.description, l.video_url, l.video_file_path, l.release_offset_days, l.sort_order, l.is_active)
      RETURNING id INTO v_new_lesson;

      INSERT INTO public.materials (lesson_id, title, file_path, sort_order)
      SELECT v_new_lesson, m.title, m.file_path, m.sort_order
      FROM public.materials m WHERE m.lesson_id = l.id;
    END LOOP;

    FOR g IN SELECT * FROM public.question_goals WHERE cycle_id = cy.id ORDER BY sort_order LOOP
      INSERT INTO public.question_goals (cycle_id, title, description, question_count, external_url, release_offset_days, sort_order, subject, pdf_path)
      VALUES (v_new_cycle, g.title, g.description, g.question_count, g.external_url, g.release_offset_days, g.sort_order, g.subject, g.pdf_path)
      RETURNING id INTO v_new_goal;

      FOR q IN SELECT * FROM public.questions WHERE goal_id = g.id ORDER BY order_index LOOP
        INSERT INTO public.questions (goal_id, statement, explanation, order_index, is_published)
        VALUES (v_new_goal, q.statement, q.explanation, q.order_index, q.is_published)
        RETURNING id INTO v_new_question;

        INSERT INTO public.question_options (question_id, label, content, is_correct, order_index)
        SELECT v_new_question, o.label, o.content, o.is_correct, o.order_index
        FROM public.question_options o WHERE o.question_id = q.id;
      END LOOP;
    END LOOP;
  END LOOP;

  INSERT INTO public.mock_exams (course_id, number, title, description, external_url, release_offset_days, sort_order, correction_url, answer_key_url, pdf_path, answer_key_path, correction_video_url)
  SELECT v_new_course, e.number, e.title, e.description, e.external_url, e.release_offset_days, e.sort_order, e.correction_url, e.answer_key_url, e.pdf_path, e.answer_key_path, e.correction_video_url
  FROM public.mock_exams e WHERE e.course_id = p_course_id;

  RETURN v_new_course;
END; $$;

REVOKE ALL ON FUNCTION public.duplicate_course(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_course(uuid, text, text) TO authenticated;

-- 4) DELETE COURSE
CREATE OR REPLACE FUNCTION public.delete_course(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycles uuid[];
  v_lessons uuid[];
  v_goals uuid[];
  v_questions uuid[];
  v_exams uuid[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir cursos';
  END IF;

  SELECT COALESCE(array_agg(id), '{}') INTO v_cycles FROM public.cycles WHERE course_id = p_course_id;
  SELECT COALESCE(array_agg(id), '{}') INTO v_lessons FROM public.lessons WHERE cycle_id = ANY(v_cycles);
  SELECT COALESCE(array_agg(id), '{}') INTO v_goals FROM public.question_goals WHERE cycle_id = ANY(v_cycles);
  SELECT COALESCE(array_agg(id), '{}') INTO v_questions FROM public.questions WHERE goal_id = ANY(v_goals);
  SELECT COALESCE(array_agg(id), '{}') INTO v_exams FROM public.mock_exams WHERE course_id = p_course_id;

  DELETE FROM public.question_answers WHERE question_id = ANY(v_questions)
     OR attempt_id IN (SELECT id FROM public.question_attempts WHERE goal_id = ANY(v_goals));
  DELETE FROM public.question_attempts WHERE goal_id = ANY(v_goals);
  DELETE FROM public.question_options WHERE question_id = ANY(v_questions);
  DELETE FROM public.questions WHERE id = ANY(v_questions);
  DELETE FROM public.goal_progress WHERE goal_id = ANY(v_goals);
  DELETE FROM public.question_goals WHERE id = ANY(v_goals);
  DELETE FROM public.lesson_progress WHERE lesson_id = ANY(v_lessons);
  DELETE FROM public.materials WHERE lesson_id = ANY(v_lessons);
  DELETE FROM public.lessons WHERE id = ANY(v_lessons);
  DELETE FROM public.cycles WHERE id = ANY(v_cycles);
  DELETE FROM public.exam_progress WHERE exam_id = ANY(v_exams);
  DELETE FROM public.mock_exams WHERE id = ANY(v_exams);
  DELETE FROM public.enrollments WHERE course_id = p_course_id;
  DELETE FROM public.courses WHERE id = p_course_id;
END; $$;

REVOKE ALL ON FUNCTION public.delete_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_course(uuid) TO authenticated;