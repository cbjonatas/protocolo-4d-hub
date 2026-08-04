-- Migration: Criar funcao RPC de alta prioridade (SECURITY DEFINER)
-- para alternar matricula de alunos ignorando todas as restricoes RLS.

CREATE OR REPLACE FUNCTION public.admin_toggle_enrollment(
  p_user_id UUID,
  p_course_id_or_slug TEXT,
  p_action TEXT DEFAULT 'enroll'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_slug TEXT;
BEGIN
  -- 1. Resolver slug ou UUID do curso
  IF p_course_id_or_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_course_id := p_course_id_or_slug::UUID;
  ELSE
    v_slug := CASE p_course_id_or_slug
      WHEN 'protocolo-agosto' THEN 'protocolo-4d'
      WHEN 'protocolo-setembro' THEN 'protocolo-4d-setembro'
      WHEN 'protocolo-outubro' THEN 'protocolo-4d-outubro'
      ELSE p_course_id_or_slug
    END;

    SELECT id INTO v_course_id FROM public.courses WHERE slug = v_slug LIMIT 1;

    IF v_course_id IS NULL THEN
      INSERT INTO public.courses (slug, title, description, is_active)
      VALUES (v_slug, 'Protocolo 4D — ' || v_slug, 'Protocolo estratégico de preparação em Informática.', true)
      ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
      RETURNING id INTO v_course_id;
    END IF;
  END IF;

  -- 2. Executar acao (enroll ou unenroll)
  IF p_action = 'unenroll' THEN
    DELETE FROM public.enrollments
    WHERE user_id = p_user_id AND (course_id = v_course_id OR course_id::text = p_course_id_or_slug);

    RETURN jsonb_build_object('success', true, 'action', 'unenroll', 'course_id', v_course_id);
  ELSE
    INSERT INTO public.enrollments (user_id, course_id)
    VALUES (p_user_id, v_course_id)
    ON CONFLICT (user_id, course_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'action', 'enroll', 'course_id', v_course_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Conceder permissao de execucao para todos os papeis
GRANT EXECUTE ON FUNCTION public.admin_toggle_enrollment(UUID, TEXT, TEXT) TO authenticated, anon, service_role;
