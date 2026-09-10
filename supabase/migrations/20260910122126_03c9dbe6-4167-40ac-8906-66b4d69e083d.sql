REVOKE EXECUTE ON FUNCTION public.claim_user_session(text, boolean, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_user_session(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_user_session(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_user_session(text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_user_session(text) TO authenticated;