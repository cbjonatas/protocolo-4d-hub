CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  user_agent text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_sessions_select ON public.user_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER user_sessions_updated_at BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registra a sessão do dispositivo atual. Retorna 'ok' ou 'conflict'.
CREATE OR REPLACE FUNCTION public.claim_user_session(p_device_id text, p_force boolean DEFAULT false, p_user_agent text DEFAULT '')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing public.user_sessions;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF coalesce(trim(p_device_id), '') = '' THEN
    RAISE EXCEPTION 'Dispositivo inválido';
  END IF;

  SELECT * INTO v_existing FROM public.user_sessions WHERE user_id = v_uid FOR UPDATE;

  IF v_existing.id IS NOT NULL
     AND v_existing.status = 'active'
     AND v_existing.device_id <> p_device_id
     AND v_existing.last_activity > now() - interval '10 minutes'
     AND NOT p_force THEN
    RETURN 'conflict';
  END IF;

  INSERT INTO public.user_sessions (user_id, device_id, status, user_agent, created_at, last_activity)
  VALUES (v_uid, p_device_id, 'active', coalesce(left(p_user_agent, 400), ''), now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET device_id = excluded.device_id,
        status = 'active',
        user_agent = excluded.user_agent,
        created_at = CASE WHEN public.user_sessions.device_id = excluded.device_id THEN public.user_sessions.created_at ELSE now() END,
        last_activity = now();

  RETURN 'ok';
END;
$$;

-- Valida a sessão do dispositivo e atualiza a última atividade.
CREATE OR REPLACE FUNCTION public.validate_user_session(p_device_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.user_sessions
     SET last_activity = now()
   WHERE user_id = v_uid AND device_id = p_device_id AND status = 'active'
  RETURNING true INTO v_ok;

  RETURN coalesce(v_ok, false);
END;
$$;

-- Encerra a sessão do dispositivo atual (logout).
CREATE OR REPLACE FUNCTION public.release_user_session(p_device_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.user_sessions
     SET status = 'ended'
   WHERE user_id = v_uid AND (device_id = p_device_id OR p_device_id IS NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_user_session(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_user_session(text) TO authenticated;