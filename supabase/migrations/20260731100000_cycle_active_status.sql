-- Migration: 20260731100000_cycle_active_status.sql
-- Description: Add status column to cycles, update RLS policies, and add activate_cycle and duplicate_cycle RPCs

-- 1. Add status column to cycles
ALTER TABLE public.cycles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'rascunho'
  CHECK (status IN ('ativo', 'rascunho', 'arquivado'));

-- Update existing cycles (set first cycle to 'ativo' and others to 'arquivado')
DO $$
DECLARE
  min_id UUID;
BEGIN
  SELECT id INTO min_id FROM public.cycles ORDER BY sort_order ASC, number ASC LIMIT 1;
  IF min_id IS NOT NULL THEN
    UPDATE public.cycles SET status = 'ativo' WHERE id = min_id;
    UPDATE public.cycles SET status = 'arquivado' WHERE id <> min_id;
  END IF;
END $$;

-- 2. Update RLS policies for cycles
DROP POLICY IF EXISTS "cycles_select" ON public.cycles;

CREATE POLICY "cycles_select" ON public.cycles FOR SELECT TO authenticated
  USING (status = 'ativo' OR public.has_role(auth.uid(), 'admin'));

-- 3. Stored procedure: activate_cycle
CREATE OR REPLACE FUNCTION public.activate_cycle(p_cycle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem ativar ciclos.';
  END IF;

  SELECT course_id INTO v_course_id FROM public.cycles WHERE id = p_cycle_id;
  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado.';
  END IF;

  -- Deactivate previously active cycles for this course
  UPDATE public.cycles
  SET status = 'arquivado'
  WHERE course_id = v_course_id AND id != p_cycle_id AND status = 'ativo';

  -- Set target cycle to 'ativo'
  UPDATE public.cycles
  SET status = 'ativo'
  WHERE id = p_cycle_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_cycle(UUID) TO authenticated;

-- 4. Stored procedure: duplicate_cycle
CREATE OR REPLACE FUNCTION public.duplicate_cycle(p_cycle_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig_cycle RECORD;
  v_new_cycle_id UUID;
  v_next_number INT;
  v_next_sort INT;
  v_lesson RECORD;
  v_new_lesson_id UUID;
  v_material RECORD;
  v_goal RECORD;
  v_new_goal_id UUID;
  v_question RECORD;
  v_new_question_id UUID;
  v_option RECORD;
  v_exam RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem duplicar ciclos.';
  END IF;

  SELECT * INTO v_orig_cycle FROM public.cycles WHERE id = p_cycle_id;
  IF v_orig_cycle IS NULL THEN
    RAISE EXCEPTION 'Ciclo de origem não encontrado.';
  END IF;

  SELECT COALESCE(MAX(number), 0) + 1, COALESCE(MAX(sort_order), 0) + 1
  INTO v_next_number, v_next_sort
  FROM public.cycles
  WHERE course_id = v_orig_cycle.course_id;

  -- Create new cycle with status 'rascunho'
  INSERT INTO public.cycles (course_id, number, title, description, sort_order, status)
  VALUES (
    v_orig_cycle.course_id,
    v_next_number,
    v_orig_cycle.title || ' (Cópia)',
    v_orig_cycle.description,
    v_next_sort,
    'rascunho'
  )
  RETURNING id INTO v_new_cycle_id;

  -- Duplicate lessons & materials
  FOR v_lesson IN SELECT * FROM public.lessons WHERE cycle_id = p_cycle_id ORDER BY sort_order LOOP
    INSERT INTO public.lessons (
      cycle_id, title, description, video_url, video_file_path, release_offset_days, sort_order, is_active
    ) VALUES (
      v_new_cycle_id, v_lesson.title, v_lesson.description, v_lesson.video_url, v_lesson.video_file_path,
      v_lesson.release_offset_days, v_lesson.sort_order, v_lesson.is_active
    ) RETURNING id INTO v_new_lesson_id;

    FOR v_material IN SELECT * FROM public.materials WHERE lesson_id = v_lesson.id ORDER BY sort_order LOOP
      INSERT INTO public.materials (lesson_id, title, file_path, sort_order)
      VALUES (v_new_lesson_id, v_material.title, v_material.file_path, v_material.sort_order);
    END LOOP;
  END LOOP;

  -- Duplicate question_goals, questions & question_options
  FOR v_goal IN SELECT * FROM public.question_goals WHERE cycle_id = p_cycle_id ORDER BY sort_order LOOP
    INSERT INTO public.question_goals (
      cycle_id, title, subject, description, pdf_path, question_count, external_url, release_offset_days, sort_order
    ) VALUES (
      v_new_cycle_id, v_goal.title, v_goal.subject, v_goal.description, v_goal.pdf_path,
      v_goal.question_count, v_goal.external_url, v_goal.release_offset_days, v_goal.sort_order
    ) RETURNING id INTO v_new_goal_id;

    FOR v_question IN SELECT * FROM public.questions WHERE goal_id = v_goal.id ORDER BY order_index LOOP
      INSERT INTO public.questions (
        goal_id, statement, explanation, order_index, is_published
      ) VALUES (
        v_new_goal_id, v_question.statement, v_question.explanation, v_question.order_index, v_question.is_published
      ) RETURNING id INTO v_new_question_id;

      FOR v_option IN SELECT * FROM public.question_options WHERE question_id = v_question.id ORDER BY order_index LOOP
        INSERT INTO public.question_options (
          question_id, label, content, is_correct, order_index
        ) VALUES (
          v_new_question_id, v_option.label, v_option.content, v_option.is_correct, v_option.order_index
        );
      END LOOP;
    END LOOP;
  END LOOP;

  -- Duplicate mock_exams (matching number = v_orig_cycle.number)
  FOR v_exam IN SELECT * FROM public.mock_exams WHERE course_id = v_orig_cycle.course_id AND number = v_orig_cycle.number LOOP
    INSERT INTO public.mock_exams (
      course_id, number, title, description, external_url, pdf_path, answer_key_path, correction_video_url, release_offset_days, sort_order
    ) VALUES (
      v_orig_cycle.course_id, v_next_number, v_exam.title || ' (Cópia)', v_exam.description,
      v_exam.external_url, v_exam.pdf_path, v_exam.answer_key_path, v_exam.correction_video_url,
      v_exam.release_offset_days, v_next_sort
    );
  END LOOP;

  RETURN v_new_cycle_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.duplicate_cycle(UUID) TO authenticated;
