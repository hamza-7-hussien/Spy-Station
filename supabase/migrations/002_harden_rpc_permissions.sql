-- Spy Station Security Hardening Migration (002)
-- 1. Lock search_path on remaining public functions
ALTER FUNCTION public.guard_profile_score() SET search_path = public;
ALTER FUNCTION public.guard_category_play_count() SET search_path = public;
ALTER FUNCTION public.get_server_now_ms() SET search_path = public;

-- 2. Restrict SECURITY DEFINER function execution strictly by role
DO $$
DECLARE
  fn RECORD;
  fn_sig TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
  LOOP
    fn_sig := format('public.%I(%s)', fn.proname, fn.args);

    IF fn.proname IN (
      'reset_room_to_lobby_internal',
      'advance_room_turn_internal',
      'finish_match_with_winner_internal'
    ) THEN
      -- Internal server helpers: never directly callable over REST/RPC
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn_sig);
    ELSIF fn.proname = 'is_username_available' THEN
      -- Needed pre-login during registration validation
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_sig);
    ELSE
      -- Authenticated-only RPCs & RLS predicates
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn_sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
    END IF;
  END LOOP;
END;
$$;
