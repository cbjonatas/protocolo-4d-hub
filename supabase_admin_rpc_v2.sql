-- 1. Remove versões anteriores da função para evitar conflitos de tipos
DROP FUNCTION IF EXISTS public.admin_toggle_enrollment(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_toggle_enrollment(TEXT, TEXT, TEXT);

-- 2. Recria a função aceitando TEXT em todos os campos para resolver problemas de conversão do Supabase
CREATE OR REPLACE FUNCTION public.admin_toggle_enrollment(
  p_user_id TEXT,
  p_course_id_or_slug TEXT,
  p_action TEXT DEFAULT 'enroll'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_uuid UUID;
  v_course_id UUID;
  v_slug TEXT;
BEGIN
  -- 1. Converte o texto para UUID internamente (isso evita o erro de "schema cache" do PostgREST)
  v_user_uuid := p_user_id::UUID;

  -- 2. Resolve o UUID ou Slug do curso
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

  -- 3. Executa a matrícula ou desmatrícula
  IF p_action = 'unenroll' THEN
    DELETE FROM public.enrollments
    WHERE user_id = v_user_uuid AND (course_id = v_course_id OR course_id::text = p_course_id_or_slug);

    RETURN jsonb_build_object('success', true, 'action', 'unenroll', 'course_id', v_course_id);
  ELSE
    INSERT INTO public.enrollments (user_id, course_id)
    VALUES (v_user_uuid, v_course_id)
    ON CONFLICT (user_id, course_id) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'action', 'enroll', 'course_id', v_course_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Dá permissões
GRANT EXECUTE ON FUNCTION public.admin_toggle_enrollment(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_enrollment(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_enrollment(TEXT, TEXT, TEXT) TO service_role;

-- 3. Força a atualização do cache do Supabase
NOTIFY pgrst, 'reload schema';
