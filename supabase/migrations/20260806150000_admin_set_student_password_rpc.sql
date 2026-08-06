-- Migration: Criar função RPC para admin redefinir senha de aluno
CREATE OR REPLACE FUNCTION public.admin_set_student_password(p_user_id UUID, p_new_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Verificar se o chamador da função é um administrador
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: Apenas administradores podem alterar senhas.');
  END IF;

  -- Atualizar a senha criptografada do usuário
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION public.admin_set_student_password(UUID, TEXT) TO authenticated;
