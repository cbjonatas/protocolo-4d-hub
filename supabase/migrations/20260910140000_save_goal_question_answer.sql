-- Migration: Suporte ao salvamento automático de respostas e progresso em Metas de Questões

-- 1. Políticas RLS de UPDATE e DELETE em question_answers (caso não existam)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'question_answers' AND policyname = 'qans_update_own'
  ) THEN
    CREATE POLICY qans_update_own ON public.question_answers FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'question_answers' AND policyname = 'qans_delete_own'
  ) THEN
    CREATE POLICY qans_delete_own ON public.question_answers FOR DELETE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.question_attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid())
      );
  END IF;
END $$;

-- 2. Função RPC atômica: Salvar/atualizar resposta de questão da meta
CREATE OR REPLACE FUNCTION public.save_goal_question_answer(
  p_goal_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid,
  p_total_questions integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_attempt_id uuid;
  v_is_correct boolean := false;
  v_answer_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  -- 1. Identifica se a opção escolhida é a correta
  SELECT coalesce(is_correct, false) INTO v_is_correct
    FROM public.question_options
   WHERE id = p_selected_option_id;

  -- 2. Localiza tentativa em andamento (finished_at IS NULL) ou cria uma nova
  SELECT id INTO v_attempt_id
    FROM public.question_attempts
   WHERE user_id = v_uid AND goal_id = p_goal_id AND finished_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_attempt_id IS NULL THEN
    INSERT INTO public.question_attempts (user_id, goal_id, total, correct_count, finished_at)
    VALUES (v_uid, p_goal_id, coalesce(p_total_questions, 0), 0, NULL)
    RETURNING id INTO v_attempt_id;
  ELSIF p_total_questions IS NOT NULL AND p_total_questions > 0 THEN
    UPDATE public.question_attempts
       SET total = p_total_questions
     WHERE id = v_attempt_id;
  END IF;

  -- 3. Insere ou atualiza a resposta (sem duplicatas)
  SELECT id INTO v_answer_id
    FROM public.question_answers
   WHERE attempt_id = v_attempt_id AND question_id = p_question_id
   LIMIT 1;

  IF v_answer_id IS NOT NULL THEN
    UPDATE public.question_answers
       SET selected_option_id = p_selected_option_id,
           is_correct = v_is_correct,
           created_at = now()
     WHERE id = v_answer_id;
  ELSE
    INSERT INTO public.question_answers (attempt_id, question_id, selected_option_id, is_correct, created_at)
    VALUES (v_attempt_id, p_question_id, p_selected_option_id, v_is_correct, now())
    RETURNING id INTO v_answer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'answer_id', v_answer_id,
    'is_correct', v_is_correct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_goal_question_answer(uuid, uuid, uuid, integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
