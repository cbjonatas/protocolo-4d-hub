-- Migration: 20260731110000_duplicate_course.sql
-- Description: Add duplicate_course RPC procedure for duplicating entire monthly protocol courses

CREATE OR REPLACE FUNCTION public.duplicate_course(p_course_id UUID, p_new_title TEXT, p_new_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig_course RECORD;
  v_new_course_id UUID;
  v_cycle RECORD;
  v_new_cycle_id UUID;
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
    RAISE EXCEPTION 'Apenas administradores podem duplicar cursos.';
  END IF;

  SELECT * INTO v_orig_course FROM public.courses WHERE id = p_course_id;
  IF v_orig_course IS NULL THEN
    RAISE EXCEPTION 'Curso de origem não encontrado.';
  END IF;

  -- Create new course in draft mode (is_active = false)
  INSERT INTO public.courses (slug, title, description, cover_url, is_active, sort_order)
  VALUES (
    p_new_slug,
    p_new_title,
    v_orig_course.description,
    v_orig_course.cover_url,
    false,
    (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.courses)
  )
  RETURNING id INTO v_new_course_id;

  -- Duplicate all cycles of this course
  FOR v_cycle IN SELECT * FROM public.cycles WHERE course_id = p_course_id ORDER BY sort_order LOOP
    INSERT INTO public.cycles (course_id, number, title, description, sort_order, status)
    VALUES (
      v_new_course_id,
      v_cycle.number,
      v_cycle.title,
      v_cycle.description,
      v_cycle.sort_order,
      'ativo'
    )
    RETURNING id INTO v_new_cycle_id;

    -- Duplicate lessons & materials
    FOR v_lesson IN SELECT * FROM public.lessons WHERE cycle_id = v_cycle.id ORDER BY sort_order LOOP
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

    -- Duplicate question_goals, questions & options
    FOR v_goal IN SELECT * FROM public.question_goals WHERE cycle_id = v_cycle.id ORDER BY sort_order LOOP
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

    -- Duplicate mock_exams
    FOR v_exam IN SELECT * FROM public.mock_exams WHERE course_id = p_course_id AND number = v_cycle.number LOOP
      INSERT INTO public.mock_exams (
        course_id, number, title, description, external_url, pdf_path, answer_key_path, correction_video_url, release_offset_days, sort_order
      ) VALUES (
        v_new_course_id, v_cycle.number, v_exam.title, v_exam.description,
        v_exam.external_url, v_exam.pdf_path, v_exam.answer_key_path, v_exam.correction_video_url,
        v_exam.release_offset_days, v_exam.sort_order
      );
    END LOOP;
  END LOOP;

  RETURN v_new_course_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.duplicate_course(UUID, TEXT, TEXT) TO authenticated;
