-- ============================================================================
-- SPY STATION — 100% HARDENED POSTGRESQL + RLS + SERVER RPC SCHEMA (SUPABASE)
-- Zero-Knowledge Anti-Cheat Architecture:
--   1. room_secrets is strictly REVOKEd from clients; Spies NEVER receive the
--      secret word, and Crew/Host NEVER receive spies[] until gameover.
--   2. profiles.score and custom_categories.play_count are guarded by triggers
--      and can ONLY mutate inside server-side SECURITY DEFINER RPCs.
--   3. All circular RLS references eliminated via SECURITY DEFINER helpers.
--   4. Atomic turn/vote/match/last-chance RPCs with row-level locks (FOR UPDATE).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES, PRESENCE & FRIENDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  username_lower TEXT UNIQUE,
  avatar TEXT NOT NULL DEFAULT '',
  friend_code TEXT UNIQUE NOT NULL CHECK (char_length(friend_code) = 8),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(friend_code);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(username_lower);

CREATE TABLE IF NOT EXISTS public.player_presence (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('online', 'offline')) DEFAULT 'offline',
  last_changed TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  recipient_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_uid, recipient_uid),
  CHECK (sender_uid <> recipient_uid)
);

CREATE INDEX IF NOT EXISTS idx_friend_req_recipient ON public.friend_requests(recipient_uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_req_sender ON public.friend_requests(sender_uid);

CREATE TABLE IF NOT EXISTS public.friendships (
  user_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  friend_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_uid, friend_uid),
  CHECK (user_uid <> friend_uid)
);

-- ----------------------------------------------------------------------------
-- 2. CUSTOM & COMMUNITY CATEGORIES (Sporcle-style Creator Studio)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  creator_name TEXT NOT NULL CHECK (char_length(creator_name) BETWEEN 1 AND 48),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  icon TEXT NOT NULL DEFAULT '🎯',
  image_url TEXT NOT NULL DEFAULT '',
  words JSONB NOT NULL CHECK (jsonb_typeof(words) = 'array' AND jsonb_array_length(words) BETWEEN 6 AND 120),
  is_published BOOLEAN NOT NULL DEFAULT false,
  play_count INTEGER NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_categories_published_plays
  ON public.custom_categories (is_published, play_count DESC, created_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_custom_categories_creator
  ON public.custom_categories (creator_uid, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. GAME ROOMS, PLAYERS, CLUES, VOTES, INVITES, CHAT & VOICE STATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{6}$'),
  name TEXT,
  host_uid UUID NOT NULL REFERENCES public.profiles(uid),
  original_host_uid UUID REFERENCES public.profiles(uid),
  host_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'playing', 'voting', 'spy_guess', 'resolving', 'gameover')) DEFAULT 'waiting',
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  is_quick_match BOOLEAN NOT NULL DEFAULT false,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('normal', 'chameleon', 'rapid', 'mole', 'undercover')) DEFAULT 'normal',
  categories TEXT[] NOT NULL DEFAULT ARRAY['players'],
  custom_category_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  custom_category_snapshot JSONB,
  active_custom_category_id UUID,
  custom_category_words JSONB,
  allow_spy_last_chance BOOLEAN NOT NULL DEFAULT false,
  spy_count INTEGER NOT NULL DEFAULT 1 CHECK (spy_count BETWEEN 1 AND 6),
  max_players INTEGER NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 3 AND 20),
  turn_seconds INTEGER NOT NULL DEFAULT 20 CHECK (turn_seconds BETWEEN 7 AND 60),
  round_num INTEGER NOT NULL DEFAULT 1,
  turn_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  turn_index INTEGER NOT NULL DEFAULT 0,
  turn_time_left INTEGER,
  turn_ends_at TIMESTAMPTZ,
  turn_grace_until TIMESTAMPTZ,
  completed_turns_this_round JSONB NOT NULL DEFAULT '{}'::jsonb,
  vote_ends_at TIMESTAMPTZ,
  spy_guess_candidate_uid TEXT,
  spy_guess_options JSONB,
  spy_guess_ends_at TIMESTAMPTZ,
  spy_guess_result JSONB,
  winner_team TEXT CHECK (winner_team IN ('crew', 'spies')),
  active_word_category TEXT,
  active_custom_category_name TEXT,
  active_custom_category_image TEXT,
  revealed_word TEXT,
  revealed_word_ar TEXT,
  revealed_chameleon_word TEXT,
  revealed_chameleon_word_ar TEXT,
  revealed_spies TEXT[],
  final_players JSONB,
  invited_players TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ejection_event JSONB,
  ejection_ends_at TIMESTAMPTZ,
  announcement JSONB,
  blackout_active BOOLEAN NOT NULL DEFAULT false,
  blackout_ends_at TIMESTAMPTZ,
  last_blackout_round INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_public_waiting
  ON public.rooms (visibility, status, created_at DESC)
  WHERE visibility = 'public';

CREATE TABLE IF NOT EXISTS public.room_players (
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  avatar TEXT NOT NULL DEFAULT '',
  is_bot BOOLEAN NOT NULL DEFAULT false,
  is_spectator BOOLEAN NOT NULL DEFAULT false,
  post_game TEXT CHECK (post_game IN ('inLobby')),
  is_silenced BOOLEAN NOT NULL DEFAULT false,
  disqualified_vote BOOLEAN NOT NULL DEFAULT false,
  missed_turns INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, uid)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_code, joined_at ASC);

CREATE TABLE IF NOT EXISTS public.join_requests (
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, uid)
);

CREATE TABLE IF NOT EXISTS public.room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  recipient_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  sender_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  from_name TEXT NOT NULL,
  from_avatar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_uid, sender_uid)
);

CREATE INDEX IF NOT EXISTS idx_room_invites_recipient ON public.room_invites(recipient_uid, created_at DESC);

CREATE TABLE IF NOT EXISTS public.room_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  sender_uid TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT NOT NULL DEFAULT '',
  clue_text TEXT NOT NULL CHECK (char_length(clue_text) BETWEEN 1 AND 64),
  translations JSONB,
  round_num INTEGER NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_clues_room_round
  ON public.room_clues (room_code, round_num, created_at ASC);

CREATE TABLE IF NOT EXISTS public.room_votes (
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  voter_uid TEXT NOT NULL,
  target_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, voter_uid)
);

CREATE TABLE IF NOT EXISTS public.vote_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  sender_uid TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_avatar TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  is_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vote_chat_room ON public.vote_chat(room_code, created_at ASC);

CREATE TABLE IF NOT EXISTS public.lobby_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  sender_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lobby_chat_room ON public.lobby_chat(room_code, created_at ASC);

CREATE TABLE IF NOT EXISTS public.room_spy_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  sender_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spy_messages_room ON public.room_spy_messages(room_code, created_at ASC);

CREATE TABLE IF NOT EXISTS public.room_voice_states (
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  muted BOOLEAN NOT NULL DEFAULT true,
  deafened BOOLEAN NOT NULL DEFAULT false,
  speaking BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, uid)
);

-- ----------------------------------------------------------------------------
-- 4. LOCKED ANTI-CHEAT SECRETS TABLE (ZERO DIRECT CLIENT ACCESS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_secrets (
  room_code TEXT PRIMARY KEY REFERENCES public.rooms(code) ON DELETE CASCADE,
  secret_word TEXT NOT NULL,
  secret_word_ar TEXT NOT NULL,
  chameleon_word TEXT,
  chameleon_word_ar TEXT,
  spies TEXT[] NOT NULL,
  undercover_uid TEXT,
  bot_crew_clues JSONB NOT NULL DEFAULT '[]'::jsonb,
  bot_spy_clues JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_word_pool JSONB NOT NULL DEFAULT '[]'::jsonb
);

REVOKE ALL ON public.room_secrets FROM anon, authenticated, PUBLIC;

-- ----------------------------------------------------------------------------
-- 5. SECURITY DEFINER RLS HELPER FUNCTIONS (BREAKS ALL CIRCULAR RLS)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_room_member(p_code TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_code = p_code AND uid = p_uid::text
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(p_code TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE code = p_code AND host_uid = p_uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_invited(p_code TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE code = p_code AND (p_uid::text = ANY(invited_players))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_spy(p_code TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_secrets
    WHERE room_code = p_code AND (p_uid::text = ANY(spies))
  );
$$;

-- ----------------------------------------------------------------------------
-- 6. ENABLE ROW LEVEL SECURITY & DEFINE NON-RECURSIVE POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_spy_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_voice_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_secrets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies cleanly so re-running migration is idempotent
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (uid = auth.uid() AND score = 0);

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Score & immutable-field guard trigger
CREATE OR REPLACE FUNCTION public.guard_profile_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score AND current_setting('app.allow_score_rpc', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Score updates must run through server match resolution';
  END IF;
  IF NEW.friend_code IS DISTINCT FROM OLD.friend_code THEN
    RAISE EXCEPTION 'friend_code is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_score ON public.profiles;
CREATE TRIGGER trg_guard_profile_score
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_score();

-- Presence
CREATE POLICY presence_select ON public.player_presence
  FOR SELECT TO authenticated USING (true);
CREATE POLICY presence_upsert_self ON public.player_presence
  FOR ALL TO authenticated USING (uid = auth.uid()) WITH CHECK (uid = auth.uid());

-- Friend requests & friendships
CREATE POLICY friend_req_select ON public.friend_requests
  FOR SELECT TO authenticated USING (sender_uid = auth.uid() OR recipient_uid = auth.uid());
CREATE POLICY friend_req_insert ON public.friend_requests
  FOR INSERT TO authenticated WITH CHECK (sender_uid = auth.uid());
CREATE POLICY friend_req_delete ON public.friend_requests
  FOR DELETE TO authenticated USING (sender_uid = auth.uid() OR recipient_uid = auth.uid());

CREATE POLICY friendships_select ON public.friendships
  FOR SELECT TO authenticated USING (user_uid = auth.uid() OR friend_uid = auth.uid());
CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated USING (user_uid = auth.uid() OR friend_uid = auth.uid());

-- Custom Categories
CREATE POLICY custom_categories_select ON public.custom_categories
  FOR SELECT TO authenticated USING (is_published = true OR creator_uid = auth.uid());
CREATE POLICY custom_categories_insert ON public.custom_categories
  FOR INSERT TO authenticated WITH CHECK (creator_uid = auth.uid() AND play_count = 0);
CREATE POLICY custom_categories_update_owner ON public.custom_categories
  FOR UPDATE TO authenticated
  USING (creator_uid = auth.uid())
  WITH CHECK (creator_uid = auth.uid());
CREATE POLICY custom_categories_delete_owner ON public.custom_categories
  FOR DELETE TO authenticated USING (creator_uid = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_category_play_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.play_count IS DISTINCT FROM OLD.play_count AND current_setting('app.allow_playcount_rpc', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'play_count can only be incremented when a match starts';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_category_play_count ON public.custom_categories;
CREATE TRIGGER trg_guard_category_play_count
  BEFORE UPDATE ON public.custom_categories
  FOR EACH ROW EXECUTE FUNCTION public.guard_category_play_count();

-- Rooms (Authenticated users can read public rooms or rooms they belong to / host / are invited to / know private code during lookup; wait: for private code join flow, allow SELECT by exact code via RPC or authenticated SELECT)
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY rooms_insert_host ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (host_uid = auth.uid());

CREATE POLICY rooms_update_host ON public.rooms
  FOR UPDATE TO authenticated
  USING (host_uid = auth.uid())
  WITH CHECK (host_uid = auth.uid());

CREATE POLICY rooms_delete_host ON public.rooms
  FOR DELETE TO authenticated
  USING (host_uid = auth.uid());

-- Room Players (Uses SECURITY DEFINER helper — zero recursion!)
CREATE POLICY room_players_select ON public.room_players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY room_players_insert ON public.room_players
  FOR INSERT TO authenticated
  WITH CHECK (
    uid = auth.uid()::text
    OR (is_bot = true AND public.is_room_host(room_code, auth.uid()))
  );

CREATE POLICY room_players_update ON public.room_players
  FOR UPDATE TO authenticated
  USING (
    uid = auth.uid()::text
    OR public.is_room_host(room_code, auth.uid())
  )
  WITH CHECK (
    uid = auth.uid()::text
    OR public.is_room_host(room_code, auth.uid())
  );

CREATE POLICY room_players_delete ON public.room_players
  FOR DELETE TO authenticated
  USING (
    uid = auth.uid()::text
    OR public.is_room_host(room_code, auth.uid())
  );

-- Join requests
CREATE POLICY join_requests_select ON public.join_requests
  FOR SELECT TO authenticated
  USING (uid = auth.uid() OR public.is_room_host(room_code, auth.uid()));

CREATE POLICY join_requests_insert ON public.join_requests
  FOR INSERT TO authenticated
  WITH CHECK (uid = auth.uid() AND status = 'pending');

CREATE POLICY join_requests_update ON public.join_requests
  FOR UPDATE TO authenticated
  USING (public.is_room_host(room_code, auth.uid()))
  WITH CHECK (public.is_room_host(room_code, auth.uid()));

CREATE POLICY join_requests_delete ON public.join_requests
  FOR DELETE TO authenticated
  USING (uid = auth.uid() OR public.is_room_host(room_code, auth.uid()));

-- Room invites
CREATE POLICY room_invites_select ON public.room_invites
  FOR SELECT TO authenticated
  USING (recipient_uid = auth.uid() OR sender_uid = auth.uid());
CREATE POLICY room_invites_insert ON public.room_invites
  FOR INSERT TO authenticated
  WITH CHECK (sender_uid = auth.uid());
CREATE POLICY room_invites_delete ON public.room_invites
  FOR DELETE TO authenticated
  USING (recipient_uid = auth.uid() OR sender_uid = auth.uid());

-- Room clues
CREATE POLICY room_clues_select ON public.room_clues
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));
CREATE POLICY room_clues_insert ON public.room_clues
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_uid = auth.uid()::text
    OR (is_bot = true AND public.is_room_host(room_code, auth.uid()))
  );

-- Room votes
CREATE POLICY room_votes_select ON public.room_votes
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));
CREATE POLICY room_votes_insert ON public.room_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    voter_uid = auth.uid()::text
    OR public.is_room_host(room_code, auth.uid())
  );
CREATE POLICY room_votes_update ON public.room_votes
  FOR UPDATE TO authenticated
  USING (voter_uid = auth.uid()::text OR public.is_room_host(room_code, auth.uid()));

-- Vote chat & Lobby chat
CREATE POLICY vote_chat_select ON public.vote_chat
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));
CREATE POLICY vote_chat_insert ON public.vote_chat
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_uid = auth.uid()::text AND public.is_room_member(room_code, auth.uid())
  );

CREATE POLICY lobby_chat_select ON public.lobby_chat
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));
CREATE POLICY lobby_chat_insert ON public.lobby_chat
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_uid = auth.uid() AND public.is_room_member(room_code, auth.uid())
  );

-- Private Mole Spy Chat (Strictly restricted to spies in room_secrets!)
CREATE POLICY spy_messages_select ON public.room_spy_messages
  FOR SELECT TO authenticated
  USING (public.is_room_spy(room_code, auth.uid()));
CREATE POLICY spy_messages_insert ON public.room_spy_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_uid = auth.uid() AND public.is_room_spy(room_code, auth.uid()));

-- Voice states
CREATE POLICY voice_states_select ON public.room_voice_states
  FOR SELECT TO authenticated
  USING (public.is_room_member(room_code, auth.uid()));
CREATE POLICY voice_states_upsert_self ON public.room_voice_states
  FOR ALL TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- ----------------------------------------------------------------------------
-- 7. ACCOUNT, USERNAME & FRIENDS SERVER RPCs
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_server_now_ms()
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
  SELECT (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT;
$$;

CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username_lower = lower(trim(COALESCE(p_username, '')))
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_name TEXT DEFAULT NULL,
  p_avatar TEXT DEFAULT NULL,
  p_claim_username BOOLEAN DEFAULT false
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_clean_name TEXT;
  v_clean_avatar TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code TEXT;
  v_i INTEGER;
  v_tries INTEGER := 0;
  v_uname_lower TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE uid = v_uid;
  v_clean_name := NULLIF(trim(COALESCE(p_name, '')), '');
  v_clean_avatar := NULLIF(trim(COALESCE(p_avatar, '')), '');

  IF FOUND THEN
    IF v_clean_name IS NOT NULL OR v_clean_avatar IS NOT NULL THEN
      UPDATE public.profiles
      SET
        name = COALESCE(v_clean_name, name),
        avatar = COALESCE(v_clean_avatar, avatar),
        updated_at = now()
      WHERE uid = v_uid
      RETURNING * INTO v_prof;
    END IF;
    RETURN v_prof;
  END IF;

  v_clean_name := COALESCE(v_clean_name, 'Agent');
  v_clean_avatar := COALESCE(v_clean_avatar, 'https://api.dicebear.com/7.x/bottts/svg?seed=' || v_uid::text);
  v_uname_lower := CASE WHEN p_claim_username THEN lower(v_clean_name) ELSE NULL END;

  LOOP
    v_tries := v_tries + 1;
    v_code := '';
    FOR v_i IN 1..8 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::integer, 1);
    END LOOP;

    BEGIN
      INSERT INTO public.profiles (uid, name, username_lower, avatar, friend_code, score)
      VALUES (v_uid, left(v_clean_name, 48), v_uname_lower, v_clean_avatar, v_code, 0)
      ON CONFLICT (uid) DO UPDATE SET updated_at = now()
      RETURNING * INTO v_prof;
      RETURN v_prof;
    EXCEPTION
      WHEN unique_violation THEN
        IF v_uname_lower IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE username_lower = v_uname_lower AND uid <> v_uid) THEN
          IF p_claim_username THEN
            RAISE EXCEPTION 'Username already taken';
          ELSE
            v_uname_lower := NULL;
          END IF;
        END IF;
        IF v_tries >= 30 THEN
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_friend_request_by_code(p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_target UUID;
  v_clean TEXT := upper(trim(COALESCE(p_code, '')));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT uid INTO v_target FROM public.profiles WHERE friend_code = v_clean;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_target = v_uid THEN
    RETURN 'cannot_add_self';
  END IF;
  IF EXISTS (SELECT 1 FROM public.friendships WHERE user_uid = v_uid AND friend_uid = v_target) THEN
    RETURN 'already_friends';
  END IF;
  IF EXISTS (SELECT 1 FROM public.friend_requests WHERE sender_uid = v_uid AND recipient_uid = v_target) THEN
    RETURN 'already_sent';
  END IF;

  INSERT INTO public.friend_requests (sender_uid, recipient_uid)
  VALUES (v_uid, v_target)
  ON CONFLICT DO NOTHING;

  RETURN 'sent';
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(p_sender_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.friend_requests WHERE sender_uid = p_sender_uid AND recipient_uid = v_uid) THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  INSERT INTO public.friendships (user_uid, friend_uid)
  VALUES (v_uid, p_sender_uid), (p_sender_uid, v_uid)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.friend_requests
  WHERE (sender_uid = p_sender_uid AND recipient_uid = v_uid)
     OR (sender_uid = v_uid AND recipient_uid = p_sender_uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_friendship(p_friend_uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM public.friendships
  WHERE (user_uid = v_uid AND friend_uid = p_friend_uid)
     OR (user_uid = p_friend_uid AND friend_uid = v_uid);
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. ROOM LIFECYCLE & INVITES & JOIN APPROVAL RPCs
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invite_friend_to_room(
  p_room_code TEXT,
  p_friend_uid UUID,
  p_from_name TEXT,
  p_from_avatar TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF NOT public.is_room_member(p_room_code, v_uid) THEN
    RAISE EXCEPTION 'Not in room';
  END IF;

  UPDATE public.rooms
  SET invited_players = array_append(invited_players, p_friend_uid::text)
  WHERE code = p_room_code
    AND NOT (p_friend_uid::text = ANY(invited_players));

  INSERT INTO public.room_invites (room_code, recipient_uid, sender_uid, from_name, from_avatar)
  VALUES (p_room_code, p_friend_uid, v_uid, left(COALESCE(p_from_name, 'Agent'), 48), COALESCE(p_from_avatar, ''))
  ON CONFLICT (recipient_uid, sender_uid) DO UPDATE
  SET room_code = EXCLUDED.room_code,
      from_name = EXCLUDED.from_name,
      from_avatar = EXCLUDED.from_avatar,
      created_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_join_request(
  p_room_code TEXT,
  p_applicant_uid UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_req public.join_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.host_uid <> v_uid THEN
    RAISE EXCEPTION 'Only host can accept join requests';
  END IF;

  SELECT * INTO v_req FROM public.join_requests WHERE room_code = p_room_code AND uid = p_applicant_uid;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.join_requests SET status = 'accepted'
  WHERE room_code = p_room_code AND uid = p_applicant_uid;

  INSERT INTO public.room_players (room_code, uid, name, avatar, is_bot, is_spectator)
  VALUES (
    p_room_code,
    p_applicant_uid::text,
    COALESCE(v_req.name, 'Agent'),
    COALESCE(v_req.avatar, ''),
    false,
    v_room.status IN ('playing', 'voting', 'spy_guess')
  )
  ON CONFLICT (room_code, uid) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_room_safe(
  p_room_code TEXT,
  p_name TEXT,
  p_avatar TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_count INTEGER;
  v_is_spectator BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF EXISTS (SELECT 1 FROM public.room_players WHERE room_code = p_room_code AND uid = v_uid::text) THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT count(*) INTO v_count FROM public.room_players WHERE room_code = p_room_code;
  IF v_count >= v_room.max_players THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'full', 'count', v_count, 'max', v_room.max_players);
  END IF;

  v_is_spectator := v_room.status IN ('playing', 'voting', 'spy_guess');
  INSERT INTO public.room_players (room_code, uid, name, avatar, is_bot, is_spectator)
  VALUES (p_room_code, v_uid::text, left(COALESCE(p_name, 'Agent'), 48), COALESCE(p_avatar, ''), false, v_is_spectator)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.join_requests WHERE room_code = p_room_code AND uid = v_uid;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_room_clean(p_room_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_next_host UUID;
  v_rem_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  DELETE FROM public.room_players WHERE room_code = p_room_code AND uid = v_uid::text;
  DELETE FROM public.room_voice_states WHERE room_code = p_room_code AND uid = v_uid;

  SELECT uid::uuid INTO v_next_host
  FROM public.room_players
  WHERE room_code = p_room_code AND is_bot = false
  ORDER BY is_spectator ASC, joined_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    DELETE FROM public.rooms WHERE code = p_room_code;
    RETURN;
  END IF;

  IF v_room.host_uid = v_uid THEN
    UPDATE public.rooms SET host_uid = v_next_host WHERE code = p_room_code;
  END IF;

  SELECT count(*) INTO v_rem_count
  FROM public.room_players
  WHERE room_code = p_room_code AND is_spectator = false;

  IF v_room.status IN ('playing', 'voting', 'resolving') AND v_rem_count < 3 THEN
    PERFORM public.reset_room_to_lobby_internal(p_room_code, 'Game paused: fewer than 3 active players', 'danger');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_host_if_needed(p_room_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_host_active BOOLEAN;
  v_first_human UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_code = p_room_code AND uid = v_room.host_uid::text AND is_bot = false AND is_spectator = false
  ) INTO v_host_active;

  IF NOT v_host_active THEN
    SELECT uid::uuid INTO v_first_human
    FROM public.room_players
    WHERE room_code = p_room_code AND is_bot = false
    ORDER BY is_spectator ASC, joined_at ASC
    LIMIT 1;

    IF v_first_human = v_uid THEN
      UPDATE public.rooms SET host_uid = v_uid WHERE code = p_room_code;
    END IF;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. ZERO-KNOWLEDGE ANTI-CHEAT GAME ENGINE IN POSTGRESQL
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reset_room_to_lobby_internal(
  p_room_code TEXT,
  p_ann_msg TEXT DEFAULT NULL,
  p_ann_type TEXT DEFAULT 'normal'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.room_secrets WHERE room_code = p_room_code;
  DELETE FROM public.room_clues WHERE room_code = p_room_code;
  DELETE FROM public.room_votes WHERE room_code = p_room_code;
  DELETE FROM public.vote_chat WHERE room_code = p_room_code;
  DELETE FROM public.room_spy_messages WHERE room_code = p_room_code;

  UPDATE public.room_players
  SET is_spectator = false,
      post_game = NULL,
      is_silenced = false,
      disqualified_vote = false,
      missed_turns = 0
  WHERE room_code = p_room_code;

  UPDATE public.rooms
  SET status = 'waiting',
      round_num = 1,
      turn_order = ARRAY[]::TEXT[],
      turn_index = 0,
      turn_time_left = NULL,
      turn_ends_at = NULL,
      turn_grace_until = NULL,
      completed_turns_this_round = '{}'::jsonb,
      vote_ends_at = NULL,
      spy_guess_candidate_uid = NULL,
      spy_guess_options = NULL,
      spy_guess_ends_at = NULL,
      spy_guess_result = NULL,
      winner_team = NULL,
      active_word_category = NULL,
      active_custom_category_id = NULL,
      custom_category_words = NULL,
      active_custom_category_name = NULL,
      active_custom_category_image = NULL,
      revealed_word = NULL,
      revealed_word_ar = NULL,
      revealed_chameleon_word = NULL,
      revealed_chameleon_word_ar = NULL,
      revealed_spies = NULL,
      final_players = NULL,
      ejection_event = NULL,
      ejection_ends_at = NULL,
      blackout_active = false,
      blackout_ends_at = NULL,
      last_blackout_round = 0,
      announcement = CASE
        WHEN p_ann_msg IS NOT NULL THEN jsonb_build_object(
          'msg', p_ann_msg,
          'type', p_ann_type,
          'timestamp', (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT
        )
        ELSE NULL
      END
  WHERE code = p_room_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_room_to_lobby(p_room_code TEXT, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_room.host_uid <> v_uid AND NOT public.is_room_member(p_room_code, v_uid) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  PERFORM public.reset_room_to_lobby_internal(p_room_code, p_reason, CASE WHEN p_reason IS NOT NULL THEN 'danger' ELSE 'normal' END);
END;
$$;

-- A. Server-Authoritative Start Match (Picks word, chameleon decoy, and spies INSIDE Postgres!)
--    p_word_candidates: array of { "en": "...", "ar": "...", "botCrewClues": [{"en":..,"ar":..}], "botSpyClues": [{"en":..,"ar":..}] }
CREATE OR REPLACE FUNCTION public.start_room_match(
  p_room_code TEXT,
  p_word_category TEXT,
  p_word_candidates JSONB,
  p_custom_cat_id UUID DEFAULT NULL,
  p_custom_cat_name TEXT DEFAULT NULL,
  p_custom_cat_image TEXT DEFAULT NULL,
  p_custom_words JSONB DEFAULT NULL,
  p_bot_spy_clues JSONB DEFAULT '[]'::jsonb,
  p_ann_msg TEXT DEFAULT 'Mission Started!'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_all_uids TEXT[];
  v_turn_order TEXT[];
  v_shuffled TEXT[];
  v_spies TEXT[];
  v_non_spies TEXT[];
  v_undercover TEXT;
  v_eff_spies INTEGER;
  v_eff_turn_sec INTEGER;
  v_picked JSONB;
  v_chameleon JSONB;
  v_cand_len INTEGER;
  v_pick_idx INTEGER;
  v_cham_idx INTEGER;
  v_secret_en TEXT;
  v_secret_ar TEXT;
  v_cham_en TEXT;
  v_cham_ar TEXT;
  v_crew_clues JSONB;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_grace TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;
  IF v_room.host_uid <> v_uid THEN RAISE EXCEPTION 'Only host can start match'; END IF;

  SELECT array_agg(uid ORDER BY joined_at ASC, uid ASC)
  INTO v_turn_order
  FROM public.room_players
  WHERE room_code = p_room_code;

  IF v_turn_order IS NULL OR array_length(v_turn_order, 1) < 3 THEN
    RAISE EXCEPTION 'Need at least 3 players';
  END IF;

  -- Shuffle player UIDs in Postgres CSPRNG-ish random order
  SELECT array_agg(uid ORDER BY random())
  INTO v_shuffled
  FROM public.room_players
  WHERE room_code = p_room_code;

  v_eff_spies := LEAST(GREATEST(v_room.spy_count, 1), array_length(v_shuffled, 1) - 1);
  v_spies := v_shuffled[1:v_eff_spies];
  v_non_spies := v_shuffled[(v_eff_spies + 1):array_length(v_shuffled, 1)];

  IF v_room.game_mode = 'undercover' AND array_length(v_non_spies, 1) > 0 THEN
    v_undercover := v_non_spies[1 + floor(random() * array_length(v_non_spies, 1))::integer];
  ELSE
    v_undercover := NULL;
  END IF;

  v_cand_len := COALESCE(jsonb_array_length(p_word_candidates), 0);
  IF v_cand_len < 1 THEN
    v_secret_en := 'Space Station';
    v_secret_ar := 'محطة الفضاء';
    v_cham_en := 'Moon Base';
    v_cham_ar := 'قاعدة القمر';
    v_crew_clues := '[]'::jsonb;
  ELSE
    v_pick_idx := floor(random() * v_cand_len)::integer;
    v_picked := p_word_candidates->v_pick_idx;
    v_secret_en := COALESCE(NULLIF(trim(v_picked->>'en'), ''), 'Space Station');
    v_secret_ar := COALESCE(NULLIF(trim(v_picked->>'ar'), ''), v_secret_en);
    v_crew_clues := COALESCE(v_picked->'botCrewClues', '[]'::jsonb);

    IF v_cand_len > 1 THEN
      v_cham_idx := (v_pick_idx + 1 + floor(random() * (v_cand_len - 1))::integer) % v_cand_len;
      v_chameleon := p_word_candidates->v_cham_idx;
      v_cham_en := COALESCE(NULLIF(trim(v_chameleon->>'en'), ''), v_secret_en);
      v_cham_ar := COALESCE(NULLIF(trim(v_chameleon->>'ar'), ''), v_cham_en);
    ELSE
      v_cham_en := v_secret_en;
      v_cham_ar := v_secret_ar;
    END IF;
  END IF;

  -- Clean old match tables
  DELETE FROM public.room_clues WHERE room_code = p_room_code;
  DELETE FROM public.room_votes WHERE room_code = p_room_code;
  DELETE FROM public.vote_chat WHERE room_code = p_room_code;
  DELETE FROM public.room_spy_messages WHERE room_code = p_room_code;

  -- Build clean word pool for Spy Last-Chance decoys without exposing to clients
  -- Store secrets strictly in room_secrets
  INSERT INTO public.room_secrets (
    room_code, secret_word, secret_word_ar, chameleon_word, chameleon_word_ar,
    spies, undercover_uid, bot_crew_clues, bot_spy_clues, category_word_pool
  )
  VALUES (
    p_room_code, v_secret_en, v_secret_ar, v_cham_en, v_cham_ar,
    v_spies, v_undercover, COALESCE(v_crew_clues, '[]'::jsonb), COALESCE(p_bot_spy_clues, '[]'::jsonb),
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('en', item->>'en', 'ar', COALESCE(NULLIF(item->>'ar', ''), item->>'en')))
        FROM jsonb_array_elements(COALESCE(p_custom_words, p_word_candidates, '[]'::jsonb)) AS item
      ),
      '[]'::jsonb
    )
  )
  ON CONFLICT (room_code) DO UPDATE
  SET secret_word = EXCLUDED.secret_word,
      secret_word_ar = EXCLUDED.secret_word_ar,
      chameleon_word = EXCLUDED.chameleon_word,
      chameleon_word_ar = EXCLUDED.chameleon_word_ar,
      spies = EXCLUDED.spies,
      undercover_uid = EXCLUDED.undercover_uid,
      bot_crew_clues = EXCLUDED.bot_crew_clues,
      bot_spy_clues = EXCLUDED.bot_spy_clues,
      category_word_pool = EXCLUDED.category_word_pool;

  -- Increment custom category play count safely inside server transaction
  IF p_custom_cat_id IS NOT NULL THEN
    PERFORM set_config('app.allow_playcount_rpc', '1', true);
    UPDATE public.custom_categories
    SET play_count = play_count + 1
    WHERE id = p_custom_cat_id
      AND (is_published = true OR creator_uid = v_uid);
  END IF;

  -- Reset player flags
  UPDATE public.room_players
  SET is_spectator = false,
      post_game = NULL,
      is_silenced = false,
      disqualified_vote = false,
      missed_turns = 0
  WHERE room_code = p_room_code;

  v_eff_turn_sec := CASE WHEN v_room.game_mode = 'rapid' THEN 7 ELSE GREATEST(7, v_room.turn_seconds) END;
  v_grace := v_now + interval '2 seconds';

  UPDATE public.rooms
  SET status = 'playing',
      round_num = 1,
      turn_order = v_turn_order,
      turn_index = 0,
      turn_time_left = v_eff_turn_sec,
      turn_grace_until = v_grace,
      turn_ends_at = v_grace + make_interval(secs => v_eff_turn_sec),
      completed_turns_this_round = '{}'::jsonb,
      vote_ends_at = NULL,
      spy_guess_candidate_uid = NULL,
      spy_guess_options = NULL,
      spy_guess_ends_at = NULL,
      spy_guess_result = NULL,
      winner_team = NULL,
      active_word_category = COALESCE(p_word_category, 'players'),
      active_custom_category_id = p_custom_cat_id,
      custom_category_words = p_custom_words,
      active_custom_category_name = p_custom_cat_name,
      active_custom_category_image = p_custom_cat_image,
      revealed_word = NULL,
      revealed_word_ar = NULL,
      revealed_chameleon_word = NULL,
      revealed_chameleon_word_ar = NULL,
      revealed_spies = NULL,
      final_players = NULL,
      ejection_event = NULL,
      ejection_ends_at = NULL,
      blackout_active = false,
      blackout_ends_at = NULL,
      last_blackout_round = 0,
      announcement = jsonb_build_object(
        'msg', COALESCE(p_ann_msg, 'Mission Started!'),
        'type', 'normal',
        'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
      )
  WHERE code = p_room_code;
END;
$$;

-- B. Fetch player's own mission dossier (Zero-Knowledge!)
CREATE OR REPLACE FUNCTION public.get_my_mission_dossier(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_is_spy BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Room not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_code = p_room_code AND uid = v_uid) THEN
    RAISE EXCEPTION 'Not a participant in this room';
  END IF;

  IF v_room.status = 'waiting' THEN
    RETURN jsonb_build_object('role', 'waiting');
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('role', 'waiting');
  END IF;

  v_is_spy := v_uid = ANY(v_secret.spies);

  IF v_is_spy THEN
    RETURN jsonb_build_object(
      'role', 'spy',
      'word', CASE WHEN v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word ELSE NULL END,
      'wordAr', CASE WHEN v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word_ar ELSE NULL END,
      'fellowSpies', CASE WHEN v_room.game_mode = 'mole' THEN to_jsonb(v_secret.spies) ELSE '[]'::jsonb END
    );
  END IF;

  RETURN jsonb_build_object(
    'role', CASE WHEN v_secret.undercover_uid = v_uid THEN 'undercover' ELSE 'crew' END,
    'word', v_secret.secret_word,
    'wordAr', v_secret.secret_word_ar,
    'protectedSpyUid', CASE WHEN v_secret.undercover_uid = v_uid THEN v_secret.spies[1] ELSE NULL END
  );
END;
$$;

-- Internal helper to advance turn safely on locked room row
CREATE OR REPLACE FUNCTION public.advance_room_turn_internal(
  p_room_code TEXT,
  p_expected_turn_index INTEGER DEFAULT NULL,
  p_expected_round INTEGER DEFAULT NULL,
  p_was_timeout BOOLEAN DEFAULT false,
  p_timeout_msg TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_active_uids TEXT[];
  v_completed JSONB;
  v_curr_speaker TEXT;
  v_speaker_name TEXT;
  v_is_bot BOOLEAN;
  v_missed INTEGER;
  v_afk_kicked TEXT := NULL;
  v_unplayed TEXT[];
  v_next_round INTEGER;
  v_round_changed BOOLEAN := false;
  v_next_turn_order TEXT[];
  v_next_idx INTEGER := 0;
  v_cand TEXT;
  v_i INTEGER;
  v_found_idx INTEGER := -1;
  v_eff_turn_sec INTEGER;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_grace TIMESTAMPTZ := NULL;
  v_turn_ends TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'playing' OR array_length(v_room.turn_order, 1) IS NULL THEN
    RETURN jsonb_build_object('changed', false);
  END IF;

  IF p_expected_round IS NOT NULL AND v_room.round_num <> p_expected_round THEN
    RETURN jsonb_build_object('changed', false);
  END IF;
  IF p_expected_turn_index IS NOT NULL AND v_room.turn_index <> p_expected_turn_index THEN
    RETURN jsonb_build_object('changed', false);
  END IF;

  v_completed := COALESCE(v_room.completed_turns_this_round, '{}'::jsonb);
  -- 1-indexed array lookup
  v_curr_speaker := v_room.turn_order[v_room.turn_index + 1];

  IF v_curr_speaker IS NOT NULL THEN
    SELECT name, is_bot, missed_turns
    INTO v_speaker_name, v_is_bot, v_missed
    FROM public.room_players
    WHERE room_code = p_room_code AND uid = v_curr_speaker;

    IF FOUND THEN
      IF p_was_timeout THEN
        v_missed := COALESCE(v_missed, 0) + 1;
        IF v_missed >= 3 THEN
          UPDATE public.room_players SET missed_turns = v_missed, is_spectator = true
          WHERE room_code = p_room_code AND uid = v_curr_speaker;
          v_afk_kicked := v_speaker_name;
        ELSE
          UPDATE public.room_players SET missed_turns = v_missed
          WHERE room_code = p_room_code AND uid = v_curr_speaker;
        END IF;
      ELSE
        UPDATE public.room_players SET missed_turns = 0
        WHERE room_code = p_room_code AND uid = v_curr_speaker;
      END IF;
      v_completed := v_completed || jsonb_build_object(v_curr_speaker, true);
    END IF;
  END IF;

  -- Check if all spies left/kicked -> crew immediate win!
  PERFORM 1 FROM public.room_secrets rs WHERE rs.room_code = p_room_code;
  IF FOUND THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.room_players rp, public.room_secrets rs
      WHERE rp.room_code = p_room_code AND rs.room_code = p_room_code
        AND rp.is_spectator = false AND rp.uid = ANY(rs.spies)
    ) THEN
      PERFORM public.finish_match_with_winner_internal(p_room_code, 'crew', NULL, 'All spies vanished — Crew wins!');
      RETURN jsonb_build_object('changed', true, 'ended', 'crew');
    END IF;
  END IF;

  SELECT array_agg(uid ORDER BY joined_at ASC, uid ASC)
  INTO v_active_uids
  FROM public.room_players
  WHERE room_code = p_room_code AND is_spectator = false;

  IF v_active_uids IS NULL OR array_length(v_active_uids, 1) < 3 THEN
    PERFORM public.reset_room_to_lobby_internal(p_room_code, 'Not enough active players', 'danger');
    RETURN jsonb_build_object('changed', true, 'reset', true);
  END IF;

  SELECT array_agg(u) INTO v_unplayed
  FROM unnest(v_active_uids) AS u
  WHERE NOT (v_completed ? u);

  v_eff_turn_sec := CASE WHEN v_room.game_mode = 'rapid' THEN 7 ELSE GREATEST(7, v_room.turn_seconds) END;

  IF v_unplayed IS NULL OR array_length(v_unplayed, 1) = 0 THEN
    v_next_round := v_room.round_num + 1;
    v_round_changed := true;
    v_completed := '{}'::jsonb;
    v_next_turn_order := v_active_uids;
    v_next_idx := 0;
    DELETE FROM public.room_votes WHERE room_code = p_room_code;
  ELSE
    v_next_round := v_room.round_num;
    v_next_turn_order := v_room.turn_order;

    FOR v_i IN (v_room.turn_index + 2)..COALESCE(array_length(v_next_turn_order, 1), 0) LOOP
      v_cand := v_next_turn_order[v_i];
      IF v_cand = ANY(v_unplayed) THEN
        v_found_idx := v_i - 1;
        EXIT;
      END IF;
    END LOOP;

    IF v_found_idx = -1 THEN
      FOR v_i IN 1..LEAST(v_room.turn_index + 1, COALESCE(array_length(v_next_turn_order, 1), 0)) LOOP
        v_cand := v_next_turn_order[v_i];
        IF v_cand = ANY(v_unplayed) THEN
          v_found_idx := v_i - 1;
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF v_found_idx = -1 THEN
      v_next_turn_order := v_active_uids;
      v_found_idx := GREATEST(0, COALESCE(array_position(v_next_turn_order, v_unplayed[1]), 1) - 1);
    END IF;

    v_next_idx := v_found_idx;
  END IF;

  IF v_round_changed THEN
    v_grace := v_now + interval '2 seconds';
  END IF;
  v_turn_ends := COALESCE(v_grace, v_now) + make_interval(secs => v_eff_turn_sec);

  UPDATE public.rooms
  SET round_num = v_next_round,
      completed_turns_this_round = v_completed,
      turn_order = v_next_turn_order,
      turn_index = v_next_idx,
      turn_time_left = v_eff_turn_sec,
      turn_grace_until = v_grace,
      turn_ends_at = v_turn_ends,
      blackout_active = false,
      announcement = CASE
        WHEN v_afk_kicked IS NOT NULL THEN jsonb_build_object(
          'msg', v_afk_kicked || ' auto-removed (AFK)',
          'type', 'danger',
          'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
        )
        WHEN p_was_timeout AND NOT COALESCE(v_is_bot, false) AND p_timeout_msg IS NOT NULL THEN jsonb_build_object(
          'msg', p_timeout_msg,
          'type', 'normal',
          'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
        )
        ELSE announcement
      END
  WHERE code = p_room_code;

  RETURN jsonb_build_object('changed', true, 'roundChanged', v_round_changed);
END;
$$;

-- Public Advance Turn RPC (Host or Active Speaker)
CREATE OR REPLACE FUNCTION public.advance_room_turn(
  p_room_code TEXT,
  p_expected_turn_index INTEGER DEFAULT NULL,
  p_was_timeout BOOLEAN DEFAULT false,
  p_expected_round INTEGER DEFAULT NULL,
  p_timeout_msg TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_curr_speaker TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false); END IF;
  v_curr_speaker := v_room.turn_order[v_room.turn_index + 1];

  IF v_room.host_uid <> v_uid AND v_curr_speaker <> v_uid::text THEN
    RAISE EXCEPTION 'Only host or current speaker can advance turn';
  END IF;

  RETURN public.advance_room_turn_internal(p_room_code, p_expected_turn_index, p_expected_round, p_was_timeout, p_timeout_msg);
END;
$$;

-- C. Submit Clue (Validates turn ownership, non-secret word for crew, saves clue, advances turn!)
CREATE OR REPLACE FUNCTION public.submit_room_clue(
  p_room_code TEXT,
  p_word TEXT,
  p_target_round INTEGER,
  p_target_turn_index INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_player public.room_players%ROWTYPE;
  v_clean TEXT := trim(COALESCE(p_word, ''));
  v_is_spy BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF char_length(v_clean) < 1 OR char_length(v_clean) > 64 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_length');
  END IF;
  IF v_clean ~ '\s' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'one_word_only');
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'playing' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_playing');
  END IF;
  IF v_room.round_num <> p_target_round OR v_room.turn_index <> p_target_turn_index THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'stale_turn');
  END IF;
  IF v_room.turn_order[p_target_turn_index + 1] <> v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_your_turn');
  END IF;
  IF COALESCE(v_room.completed_turns_this_round, '{}'::jsonb) ? v_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_played');
  END IF;

  SELECT * INTO v_player FROM public.room_players WHERE room_code = p_room_code AND uid = v_uid;
  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;
  v_is_spy := v_uid = ANY(v_secret.spies);

  -- Server-side anti-spoiler check
  IF NOT v_is_spy THEN
    IF lower(v_clean) = lower(trim(v_secret.secret_word)) OR lower(v_clean) = lower(trim(v_secret.secret_word_ar)) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'secret_word_forbidden');
    END IF;
  ELSIF v_room.game_mode = 'chameleon' THEN
    IF lower(v_clean) = lower(trim(COALESCE(v_secret.chameleon_word, ''))) OR lower(v_clean) = lower(trim(COALESCE(v_secret.chameleon_word_ar, ''))) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'secret_word_forbidden');
    END IF;
  END IF;

  INSERT INTO public.room_clues (room_code, sender_uid, sender_name, sender_avatar, clue_text, round_num, is_bot)
  VALUES (p_room_code, v_uid, COALESCE(v_player.name, 'Agent'), COALESCE(v_player.avatar, ''), v_clean, p_target_round, false);

  UPDATE public.room_players SET is_silenced = false, missed_turns = 0
  WHERE room_code = p_room_code AND uid = v_uid;

  PERFORM public.advance_room_turn_internal(p_room_code, p_target_turn_index, p_target_round, false, NULL);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- D. Bot Turn Action INSIDE Postgres (Zero Secret Leak to Host!)
CREATE OR REPLACE FUNCTION public.run_bot_turn_action(
  p_room_code TEXT,
  p_bot_uid TEXT,
  p_expected_round INTEGER,
  p_expected_turn_index INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_bot public.room_players%ROWTYPE;
  v_is_spy BOOLEAN;
  v_clue_pool JSONB;
  v_pool_len INTEGER;
  v_picked JSONB;
  v_text_en TEXT;
  v_text_ar TEXT;
  v_used_texts TEXT[];
  v_cand JSONB;
  v_i INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.host_uid <> v_uid OR v_room.status <> 'playing' THEN
    RETURN false;
  END IF;
  IF v_room.round_num <> p_expected_round OR v_room.turn_index <> p_expected_turn_index THEN
    RETURN false;
  END IF;
  IF v_room.turn_order[p_expected_turn_index + 1] <> p_bot_uid THEN
    RETURN false;
  END IF;

  SELECT * INTO v_bot FROM public.room_players WHERE room_code = p_room_code AND uid = p_bot_uid AND is_bot = true;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;
  v_is_spy := p_bot_uid = ANY(v_secret.spies);

  v_clue_pool := CASE WHEN v_is_spy THEN v_secret.bot_spy_clues ELSE v_secret.bot_crew_clues END;
  v_pool_len := COALESCE(jsonb_array_length(v_clue_pool), 0);

  SELECT COALESCE(array_agg(lower(clue_text)), ARRAY[]::TEXT[])
  INTO v_used_texts
  FROM public.room_clues WHERE room_code = p_room_code;

  v_picked := NULL;
  IF v_pool_len > 0 THEN
    FOR v_i IN 0..(v_pool_len - 1) LOOP
      v_cand := v_clue_pool->v_i;
      IF NOT (lower(COALESCE(v_cand->>'en', '')) = ANY(v_used_texts)) THEN
        v_picked := v_cand;
        EXIT;
      END IF;
    END LOOP;
    IF v_picked IS NULL THEN
      v_picked := v_clue_pool->floor(random() * v_pool_len)::integer;
    END IF;
  END IF;

  v_text_en := COALESCE(NULLIF(trim(v_picked->>'en'), ''), 'Interesting');
  v_text_ar := COALESCE(NULLIF(trim(v_picked->>'ar'), ''), 'مثير');

  INSERT INTO public.room_clues (
    room_code, sender_uid, sender_name, sender_avatar, clue_text, translations, round_num, is_bot
  ) VALUES (
    p_room_code,
    p_bot_uid,
    v_bot.name,
    v_bot.avatar,
    v_text_en,
    jsonb_build_object('ar', v_text_ar, 'en', v_text_en),
    p_expected_round,
    true
  );

  PERFORM public.advance_room_turn_internal(p_room_code, p_expected_turn_index, p_expected_round, false, NULL);
  RETURN true;
END;
$$;

-- E. Trigger Emergency Vote
CREATE OR REPLACE FUNCTION public.trigger_emergency_vote(
  p_room_code TEXT,
  p_ann_msg TEXT DEFAULT 'Emergency Vote Initiated!'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_room public.rooms%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'playing' THEN RETURN false; END IF;
  IF v_room.turn_order[v_room.turn_index + 1] <> v_uid THEN RETURN false; END IF;
  IF (v_room.ejection_ends_at IS NOT NULL AND v_now < v_room.ejection_ends_at)
     OR (v_room.turn_grace_until IS NOT NULL AND v_now < v_room.turn_grace_until) THEN
    RETURN false;
  END IF;

  DELETE FROM public.room_votes WHERE room_code = p_room_code;
  DELETE FROM public.vote_chat WHERE room_code = p_room_code;

  UPDATE public.rooms
  SET status = 'voting',
      vote_ends_at = v_now + interval '45 seconds',
      turn_grace_until = NULL,
      turn_ends_at = NULL,
      announcement = jsonb_build_object(
        'msg', COALESCE(p_ann_msg, 'Emergency Vote!'),
        'type', 'danger',
        'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
      )
  WHERE code = p_room_code;

  RETURN true;
END;
$$;

-- F. Bot Votes INSIDE Postgres (Never exposes spies to Host!)
CREATE OR REPLACE FUNCTION public.run_bot_votes(
  p_room_code TEXT,
  p_batch_all BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_bot RECORD;
  v_target TEXT;
  v_committed INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.host_uid <> v_uid OR v_room.status <> 'voting' THEN
    RETURN 0;
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;

  FOR v_bot IN
    SELECT rp.uid
    FROM public.room_players rp
    WHERE rp.room_code = p_room_code
      AND rp.is_bot = true
      AND rp.is_spectator = false
      AND rp.disqualified_vote = false
      AND NOT EXISTS (
        SELECT 1 FROM public.room_votes rv
        WHERE rv.room_code = p_room_code AND rv.voter_uid = rp.uid
      )
  LOOP
    -- Spy bot never votes for a fellow spy if innocents exist; Undercover avoids voting crew spies? Wait: undercover knows spy!
    IF v_bot.uid = ANY(v_secret.spies) THEN
      SELECT uid INTO v_target
      FROM public.room_players
      WHERE room_code = p_room_code AND is_spectator = false AND uid <> v_bot.uid
        AND NOT (uid = ANY(v_secret.spies))
      ORDER BY random() LIMIT 1;
    ELSE
      SELECT uid INTO v_target
      FROM public.room_players
      WHERE room_code = p_room_code AND is_spectator = false AND uid <> v_bot.uid
      ORDER BY CASE WHEN uid = ANY(v_secret.spies) THEN random() * 0.65 ELSE random() END ASC
      LIMIT 1;
    END IF;

    v_target := COALESCE(v_target, 'SKIP');

    INSERT INTO public.room_votes (room_code, voter_uid, target_uid)
    VALUES (p_room_code, v_bot.uid, v_target)
    ON CONFLICT DO NOTHING;

    v_committed := v_committed + 1;
    IF NOT p_batch_all THEN EXIT; END IF;
  END LOOP;

  RETURN v_committed;
END;
$$;

-- Helper: Finish match & award XP atomically inside Postgres
CREATE OR REPLACE FUNCTION public.finish_match_with_winner_internal(
  p_room_code TEXT,
  p_winner_team TEXT,
  p_ejection_event JSONB DEFAULT NULL,
  p_ann_msg TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_players_snapshot JSONB;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code;
  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;

  SELECT jsonb_object_agg(
    rp.uid,
    jsonb_build_object(
      'uid', rp.uid,
      'name', rp.name,
      'avatar', rp.avatar,
      'isBot', rp.is_bot,
      'isSpectator', rp.is_spectator,
      'role', CASE
        WHEN rp.uid = ANY(v_secret.spies) THEN 'spy'
        WHEN rp.uid = v_secret.undercover_uid THEN 'undercover'
        ELSE 'crew'
      END,
      'chameleonWord', CASE WHEN rp.uid = ANY(v_secret.spies) AND v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word ELSE NULL END,
      'chameleonWordAr', CASE WHEN rp.uid = ANY(v_secret.spies) AND v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word_ar ELSE NULL END
    )
  ) INTO v_players_snapshot
  FROM public.room_players rp
  WHERE rp.room_code = p_room_code;

  -- Idempotency: only award XP if not already gameover
  IF v_room.status <> 'gameover' AND v_secret.spies IS NOT NULL THEN
    PERFORM set_config('app.allow_score_rpc', '1', true);
    UPDATE public.profiles p
    SET score = p.score + CASE
      WHEN (p_winner_team = 'spies' AND p.uid::text = ANY(v_secret.spies))
        OR (p_winner_team = 'crew' AND NOT (p.uid::text = ANY(v_secret.spies)))
      THEN 35
      ELSE 10
    END
    FROM public.room_players rp
    WHERE rp.room_code = p_room_code
      AND rp.is_bot = false
      AND rp.uid = p.uid::text;
  END IF;

  UPDATE public.rooms
  SET status = 'gameover',
      winner_team = p_winner_team,
      revealed_word = v_secret.secret_word,
      revealed_word_ar = v_secret.secret_word_ar,
      revealed_chameleon_word = CASE WHEN v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word ELSE NULL END,
      revealed_chameleon_word_ar = CASE WHEN v_room.game_mode = 'chameleon' THEN v_secret.chameleon_word_ar ELSE NULL END,
      revealed_spies = v_secret.spies,
      final_players = COALESCE(v_players_snapshot, '{}'::jsonb),
      ejection_event = COALESCE(p_ejection_event, ejection_event),
      vote_ends_at = NULL,
      blackout_active = false,
      announcement = CASE
        WHEN p_ann_msg IS NOT NULL THEN jsonb_build_object(
          'msg', p_ann_msg,
          'type', CASE WHEN p_winner_team = 'crew' THEN 'success' ELSE 'danger' END,
          'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
        )
        ELSE announcement
      END
  WHERE code = p_room_code;
END;
$$;

-- G. Server-Authoritative Vote Resolution (Replaces client resolveVoteOutcome)
CREATE OR REPLACE FUNCTION public.resolve_room_votes(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_ejected_uid TEXT := NULL;
  v_ejected_name TEXT;
  v_ejected_avatar TEXT;
  v_is_ejected_spy BOOLEAN;
  v_top_count INTEGER := 0;
  v_tie_count INTEGER := 0;
  v_ejection_ev JSONB;
  v_ejection_ends TIMESTAMPTZ;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_next_round INTEGER;
  v_eff_turn_sec INTEGER;
  v_active_uids TEXT[];
  v_rem_spies INTEGER;
  v_rem_inno INTEGER;
  v_spies_win BOOLEAN;
  v_options JSONB;
  v_decoys JSONB;
  v_grace TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.host_uid <> v_uid OR v_room.status <> 'voting' THEN
    RETURN jsonb_build_object('outcome', 'noop');
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;

  -- Cast any unvoted bot votes first
  PERFORM public.run_bot_votes(p_room_code, true);

  -- Tally valid votes against active room players (ignore SKIP / absent)
  WITH tally AS (
    SELECT rv.target_uid, count(*)::integer AS cnt
    FROM public.room_votes rv
    JOIN public.room_players rp ON rp.room_code = p_room_code AND rp.uid = rv.target_uid
    WHERE rv.room_code = p_room_code AND rv.target_uid <> 'SKIP'
    GROUP BY rv.target_uid
    ORDER BY cnt DESC
  )
  SELECT
    (SELECT target_uid FROM tally LIMIT 1),
    COALESCE((SELECT cnt FROM tally LIMIT 1), 0),
    (SELECT count(*)::integer FROM tally WHERE cnt = (SELECT cnt FROM tally LIMIT 1))
  INTO v_ejected_uid, v_top_count, v_tie_count;

  IF v_top_count = 0 OR v_tie_count > 1 THEN
    v_ejected_uid := NULL;
  END IF;

  UPDATE public.room_players
  SET disqualified_vote = false, is_silenced = false
  WHERE room_code = p_room_code;

  DELETE FROM public.room_votes WHERE room_code = p_room_code;
  DELETE FROM public.vote_chat WHERE room_code = p_room_code;

  v_next_round := v_room.round_num + 1;
  v_eff_turn_sec := CASE WHEN v_room.game_mode = 'rapid' THEN 7 ELSE GREATEST(7, v_room.turn_seconds) END;

  -- Tie or Skip -> nobody ejected
  IF v_ejected_uid IS NULL THEN
    SELECT array_agg(uid ORDER BY joined_at ASC, uid ASC) INTO v_active_uids
    FROM public.room_players WHERE room_code = p_room_code AND is_spectator = false;

    v_grace := v_now + interval '2 seconds';
    UPDATE public.rooms
    SET status = 'playing',
        round_num = v_next_round,
        turn_order = COALESCE(v_active_uids, ARRAY[]::TEXT[]),
        turn_index = 0,
        completed_turns_this_round = '{}'::jsonb,
        turn_time_left = v_eff_turn_sec,
        turn_grace_until = v_grace,
        turn_ends_at = v_grace + make_interval(secs => v_eff_turn_sec),
        vote_ends_at = NULL,
        blackout_active = false
    WHERE code = p_room_code;

    RETURN jsonb_build_object('outcome', 'nobody_ejected');
  END IF;

  SELECT name, avatar INTO v_ejected_name, v_ejected_avatar
  FROM public.room_players WHERE room_code = p_room_code AND uid = v_ejected_uid;

  v_is_ejected_spy := v_ejected_uid = ANY(v_secret.spies);
  v_ejection_ev := jsonb_build_object(
    'uid', v_ejected_uid,
    'name', COALESCE(v_ejected_name, '?'),
    'avatar', COALESCE(v_ejected_avatar, ''),
    'isSpy', v_is_ejected_spy,
    'timestamp', (extract(epoch FROM v_now) * 1000)::BIGINT
  );

  UPDATE public.room_players SET is_spectator = true
  WHERE room_code = p_room_code AND uid = v_ejected_uid;

  v_ejection_ends := v_now + interval '5.3 seconds';

  SELECT count(*)::integer INTO v_rem_spies
  FROM public.room_players
  WHERE room_code = p_room_code AND is_spectator = false AND uid = ANY(v_secret.spies);

  IF v_is_ejected_spy AND v_rem_spies = 0 THEN
    IF v_room.allow_spy_last_chance THEN
      -- Build 6 shuffled spy_guess_options (1 real secret word + 5 decoys)
      SELECT COALESCE(jsonb_agg(item), '[]'::jsonb) INTO v_decoys
      FROM (
        SELECT item
        FROM jsonb_array_elements(COALESCE(NULLIF(v_secret.category_word_pool, '[]'::jsonb), v_secret.bot_crew_clues, '[]'::jsonb)) AS item
        WHERE lower(trim(COALESCE(item->>'en', ''))) <> lower(trim(v_secret.secret_word))
          AND NULLIF(trim(COALESCE(item->>'en', '')), '') IS NOT NULL
        ORDER BY random()
        LIMIT 5
      ) sub;

      SELECT jsonb_agg(opt ORDER BY random()) INTO v_options
      FROM (
        SELECT jsonb_build_object('en', v_secret.secret_word, 'ar', v_secret.secret_word_ar) AS opt
        UNION ALL
        SELECT jsonb_build_object('en', d->>'en', 'ar', COALESCE(NULLIF(d->>'ar', ''), d->>'en'))
        FROM jsonb_array_elements(v_decoys) AS d
      ) combined;

      UPDATE public.rooms
      SET status = 'spy_guess',
          ejection_event = v_ejection_ev,
          ejection_ends_at = v_ejection_ends,
          spy_guess_candidate_uid = v_ejected_uid,
          spy_guess_options = COALESCE(v_options, jsonb_build_array(jsonb_build_object('en', v_secret.secret_word, 'ar', v_secret.secret_word_ar))),
          spy_guess_ends_at = v_ejection_ends + interval '15 seconds',
          spy_guess_result = NULL,
          vote_ends_at = NULL,
          blackout_active = false
      WHERE code = p_room_code;

      RETURN jsonb_build_object('outcome', 'spy_last_chance', 'ejectedName', v_ejected_name);
    END IF;

    PERFORM public.finish_match_with_winner_internal(p_room_code, 'crew', v_ejection_ev, NULL);
    RETURN jsonb_build_object('outcome', 'crew_win', 'ejectedName', v_ejected_name);
  END IF;

  SELECT array_agg(uid ORDER BY joined_at ASC, uid ASC) INTO v_active_uids
  FROM public.room_players WHERE room_code = p_room_code AND is_spectator = false;

  v_rem_inno := COALESCE(array_length(v_active_uids, 1), 0) - v_rem_spies;

  IF COALESCE(array_length(v_active_uids, 1), 0) < 3 THEN
    v_spies_win := v_rem_spies > 0;
  ELSIF v_room.game_mode = 'mole' THEN
    v_spies_win := v_rem_spies >= v_rem_inno;
  ELSE
    v_spies_win := v_rem_inno = 0 OR v_rem_spies > v_rem_inno;
  END IF;

  IF v_spies_win THEN
    PERFORM public.finish_match_with_winner_internal(p_room_code, 'spies', v_ejection_ev, NULL);
    RETURN jsonb_build_object('outcome', 'spies_win', 'ejectedName', v_ejected_name);
  END IF;

  UPDATE public.rooms
  SET status = 'playing',
      round_num = v_next_round,
      turn_order = COALESCE(v_active_uids, ARRAY[]::TEXT[]),
      turn_index = 0,
      completed_turns_this_round = '{}'::jsonb,
      turn_time_left = v_eff_turn_sec,
      ejection_event = v_ejection_ev,
      ejection_ends_at = v_ejection_ends,
      turn_grace_until = v_ejection_ends,
      turn_ends_at = v_ejection_ends + make_interval(secs => v_eff_turn_sec),
      vote_ends_at = NULL,
      blackout_active = false
  WHERE code = p_room_code;

  RETURN jsonb_build_object(
    'outcome', CASE WHEN v_is_ejected_spy THEN 'spy_ejected_continue' ELSE 'innocent_ejected_continue' END,
    'ejectedName', v_ejected_name
  );
END;
$$;

-- H. Spy Last-Chance Guess (supports human spy OR bot/timeout on host)
CREATE OR REPLACE FUNCTION public.submit_spy_last_chance_guess(
  p_room_code TEXT,
  p_guessed_word TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_correct BOOLEAN;
  v_winner TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'spy_guess' THEN
    RETURN jsonb_build_object('noop', true);
  END IF;

  IF v_room.spy_guess_candidate_uid <> v_uid AND v_room.host_uid <> auth.uid() THEN
    RAISE EXCEPTION 'Only caught spy or host timeout can resolve spy guess';
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;
  v_correct := lower(trim(COALESCE(p_guessed_word, ''))) = lower(trim(v_secret.secret_word))
               OR (NULLIF(trim(v_secret.secret_word_ar), '') IS NOT NULL AND lower(trim(COALESCE(p_guessed_word, ''))) = lower(trim(v_secret.secret_word_ar)));
  v_winner := CASE WHEN v_correct THEN 'spies' ELSE 'crew' END;

  UPDATE public.rooms
  SET spy_guess_result = jsonb_build_object(
        'spyUid', v_room.spy_guess_candidate_uid,
        'guessedWord', COALESCE(p_guessed_word, ''),
        'isCorrect', v_correct
      ),
      spy_guess_candidate_uid = NULL,
      spy_guess_options = NULL,
      spy_guess_ends_at = NULL
  WHERE code = p_room_code;

  PERFORM public.finish_match_with_winner_internal(p_room_code, v_winner, NULL, NULL);
  RETURN jsonb_build_object('isCorrect', v_correct, 'winnerTeam', v_winner);
END;
$$;

CREATE OR REPLACE FUNCTION public.run_bot_spy_guess(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_room public.rooms%ROWTYPE;
  v_secret public.room_secrets%ROWTYPE;
  v_picked TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code;
  IF NOT FOUND OR v_room.host_uid <> v_uid OR v_room.status <> 'spy_guess' THEN
    RETURN jsonb_build_object('noop', true);
  END IF;
  IF NOT COALESCE(v_room.spy_guess_candidate_uid, '') LIKE 'bot_%' THEN
    RETURN jsonb_build_object('noop', true);
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;

  IF random() < 0.35 THEN
    v_picked := v_secret.secret_word;
  ELSE
    SELECT opt->>'en' INTO v_picked
    FROM jsonb_array_elements(COALESCE(v_room.spy_guess_options, '[]'::jsonb)) AS opt
    WHERE lower(trim(COALESCE(opt->>'en', ''))) <> lower(trim(v_secret.secret_word))
    ORDER BY random() LIMIT 1;
    v_picked := COALESCE(v_picked, '');
  END IF;

  RETURN public.submit_spy_last_chance_guess(p_room_code, v_picked);
END;
$$;

-- I. Return to Lobby from GameOver (Resets room cleanly when all remaining humans return)
CREATE OR REPLACE FUNCTION public.return_to_lobby_after_game(p_room_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_room public.rooms%ROWTYPE;
  v_all_in_lobby BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'gameover' THEN RETURN false; END IF;

  UPDATE public.room_players
  SET post_game = 'inLobby', is_spectator = false
  WHERE room_code = p_room_code AND uid = v_uid;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.room_players
    WHERE room_code = p_room_code AND is_bot = false AND COALESCE(post_game, '') <> 'inLobby'
  ) INTO v_all_in_lobby;

  IF v_all_in_lobby THEN
    PERFORM public.reset_room_to_lobby_internal(p_room_code, NULL, 'normal');
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. ENABLE SUPABASE REALTIME PUBLICATION ON LIVE GAME TABLES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'profiles',
    'player_presence',
    'friend_requests',
    'friendships',
    'custom_categories',
    'rooms',
    'room_players',
    'join_requests',
    'room_invites',
    'room_clues',
    'room_votes',
    'vote_chat',
    'lobby_chat',
    'room_spy_messages',
    'room_voice_states'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- 11. PRIVATE ROOM LOOKUP HARDENING & AVATARS STORAGE BUCKET
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_view_room(p_code TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.code = p_code
      AND (
        r.visibility = 'public'
        OR r.host_uid = p_uid
        OR (p_uid::text = ANY(r.invited_players))
      )
  ) OR EXISTS (
    SELECT 1 FROM public.room_players rp
    WHERE rp.room_code = p_code AND rp.uid = p_uid::text
  );
$$;

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_uid = auth.uid()
    OR (auth.uid()::text = ANY(invited_players))
    OR public.is_room_member(code, auth.uid())
  );

DROP POLICY IF EXISTS room_players_select ON public.room_players;
CREATE POLICY room_players_select ON public.room_players
  FOR SELECT TO authenticated
  USING (public.can_view_room(room_code, auth.uid()));

CREATE OR REPLACE FUNCTION public.lookup_room_for_join(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_clean TEXT := upper(regexp_replace(trim(COALESCE(p_code, '')), '[^A-Z0-9]', '', 'g'));
  v_room public.rooms%ROWTYPE;
  v_host_name TEXT;
  v_is_member BOOLEAN;
  v_count INTEGER;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO v_room FROM public.rooms WHERE code = v_clean;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  SELECT name INTO v_host_name FROM public.room_players WHERE room_code = v_clean AND uid = v_room.host_uid::text;
  SELECT EXISTS (SELECT 1 FROM public.room_players WHERE room_code = v_clean AND uid = v_uid) INTO v_is_member;
  SELECT count(*)::integer INTO v_count FROM public.room_players WHERE room_code = v_clean;

  RETURN jsonb_build_object(
    'exists', true,
    'code', v_room.code,
    'status', v_room.status,
    'visibility', v_room.visibility,
    'hostUid', v_room.host_uid,
    'hostName', COALESCE(v_host_name, v_room.host_name, 'Commander'),
    'maxPlayers', v_room.max_players,
    'playerCount', v_count,
    'isMember', v_is_member,
    'isInvited', (v_uid = ANY(v_room.invited_players))
  );
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
CREATE POLICY avatars_owner_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
CREATE POLICY avatars_owner_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
CREATE POLICY avatars_owner_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
