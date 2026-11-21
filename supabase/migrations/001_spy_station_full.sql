-- ============================================================================
-- SPY STATION — HARDENED POSTGRESQL + RLS + SERVER RPC SCHEMA (SUPABASE)
-- Designed for zero client-side cheating:
--   1. room_secrets is REVOKEd from clients; only returned via SECURITY DEFINER RPCs
--   2. profiles.score and custom_categories.play_count cannot be spoofed directly
--   3. Composite B-tree indexes + keyset/limit pagination for fast mobile loads
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES & FRIEND CODES
CREATE TABLE IF NOT EXISTS public.profiles (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  avatar TEXT NOT NULL DEFAULT '',
  friend_code TEXT UNIQUE NOT NULL CHECK (char_length(friend_code) = 8),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Separate sensitive presence table synced by owner
CREATE TABLE IF NOT EXISTS public.player_presence (
  uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('online', 'offline')) DEFAULT 'offline',
  last_changed TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FRIENDSHIPS & REQUESTS
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  recipient_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sender_uid, recipient_uid),
  CHECK (sender_uid <> recipient_uid)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  user_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  friend_uid UUID NOT NULL REFERENCES public.profiles(uid) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_uid, friend_uid),
  CHECK (user_uid <> friend_uid)
);

-- 3. CUSTOM & COMMUNITY CATEGORIES (Sporcle-style Creator Studio)
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

-- 4. GAME ROOMS & PLAYERS (Public Room State Only — NO secret words or spy arrays!)
CREATE TABLE IF NOT EXISTS public.rooms (
  code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{6}$'),
  host_uid UUID NOT NULL REFERENCES public.profiles(uid),
  original_host_uid UUID REFERENCES public.profiles(uid),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'playing', 'voting', 'spy_guess', 'gameover')) DEFAULT 'waiting',
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')) DEFAULT 'public',
  game_mode TEXT NOT NULL CHECK (game_mode IN ('normal', 'chameleon', 'rapid', 'mole', 'undercover')) DEFAULT 'normal',
  categories TEXT[] NOT NULL DEFAULT ARRAY['players'],
  custom_category_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  allow_spy_last_chance BOOLEAN NOT NULL DEFAULT false,
  spy_count INTEGER NOT NULL DEFAULT 1 CHECK (spy_count BETWEEN 1 AND 6),
  max_players INTEGER NOT NULL DEFAULT 8 CHECK (max_players BETWEEN 3 AND 20),
  turn_seconds INTEGER NOT NULL DEFAULT 20 CHECK (turn_seconds BETWEEN 7 AND 60),
  round_num INTEGER NOT NULL DEFAULT 1,
  turn_order TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  turn_index INTEGER NOT NULL DEFAULT 0,
  turn_ends_at TIMESTAMPTZ,
  turn_grace_until TIMESTAMPTZ,
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
  revealed_spies TEXT[],
  ejection_event JSONB,
  ejection_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rooms_public_waiting
  ON public.rooms (visibility, created_at DESC)
  WHERE visibility = 'public';

CREATE TABLE IF NOT EXISTS public.room_players (
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  uid TEXT NOT NULL, -- supports human UUIDs or bot_<id> managed by host
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  avatar TEXT NOT NULL DEFAULT '',
  is_bot BOOLEAN NOT NULL DEFAULT false,
  is_spectator BOOLEAN NOT NULL DEFAULT false,
  post_game TEXT CHECK (post_game IN ('inLobby')),
  missed_turns INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_code, uid)
);

CREATE TABLE IF NOT EXISTS public.room_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(code) ON DELETE CASCADE,
  sender_uid TEXT NOT NULL,
  sender_name TEXT NOT NULL,
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

-- 5. LOCKED ANTI-CHEAT SECRETS TABLE (ZERO DIRECT CLIENT ACCESS)
CREATE TABLE IF NOT EXISTS public.room_secrets (
  room_code TEXT PRIMARY KEY REFERENCES public.rooms(code) ON DELETE CASCADE,
  secret_word TEXT NOT NULL,
  secret_word_ar TEXT NOT NULL,
  chameleon_word TEXT,
  chameleon_word_ar TEXT,
  spies TEXT[] NOT NULL,
  undercover_uid TEXT
);

REVOKE ALL ON public.room_secrets FROM anon, authenticated, PUBLIC;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL CLIENT-READABLE TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_secrets ENABLE ROW LEVEL SECURITY;

-- Profiles: Authenticated users can read; only owner can update non-score fields
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (uid = auth.uid() AND score = 0);

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Trigger prevents direct client tampering with profiles.score
CREATE OR REPLACE FUNCTION public.guard_profile_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.score IS DISTINCT FROM OLD.score AND current_setting('app.allow_score_rpc', true) IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Score updates must run through server match resolution';
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

-- Friend Requests
CREATE POLICY friend_req_select ON public.friend_requests
  FOR SELECT TO authenticated USING (sender_uid = auth.uid() OR recipient_uid = auth.uid());
CREATE POLICY friend_req_insert ON public.friend_requests
  FOR INSERT TO authenticated WITH CHECK (sender_uid = auth.uid());
CREATE POLICY friend_req_delete ON public.friend_requests
  FOR DELETE TO authenticated USING (sender_uid = auth.uid() OR recipient_uid = auth.uid());

-- Friendships
CREATE POLICY friendships_select ON public.friendships
  FOR SELECT TO authenticated USING (user_uid = auth.uid() OR friend_uid = auth.uid());
CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated USING (user_uid = auth.uid() OR friend_uid = auth.uid());

-- Custom Categories: Public published or owned by user; ONLY owner can edit/delete
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

-- Guard custom_categories.play_count from client tampering
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

-- Rooms & Room Players & Clues & Votes
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR host_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_code = rooms.code AND rp.uid = auth.uid()::text
    )
  );

CREATE POLICY rooms_insert_host ON public.rooms
  FOR INSERT TO authenticated WITH CHECK (host_uid = auth.uid());

CREATE POLICY rooms_update_host ON public.rooms
  FOR UPDATE TO authenticated USING (host_uid = auth.uid()) WITH CHECK (host_uid = auth.uid());

CREATE POLICY room_players_select ON public.room_players
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms r
      WHERE r.code = room_players.room_code
      AND (
        r.visibility = 'public'
        OR r.host_uid = auth.uid()
        OR EXISTS (SELECT 1 FROM public.room_players self WHERE self.room_code = r.code AND self.uid = auth.uid()::text)
      )
    )
  );

CREATE POLICY room_players_insert ON public.room_players
  FOR INSERT TO authenticated
  WITH CHECK (
    uid = auth.uid()::text
    OR (is_bot = true AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = room_players.room_code AND r.host_uid = auth.uid()))
  );

CREATE POLICY room_players_delete ON public.room_players
  FOR DELETE TO authenticated
  USING (
    uid = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = room_players.room_code AND r.host_uid = auth.uid())
  );

CREATE POLICY room_clues_select ON public.room_clues
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.room_players rp WHERE rp.room_code = room_clues.room_code AND rp.uid = auth.uid()::text));

CREATE POLICY room_clues_insert ON public.room_clues
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_uid = auth.uid()::text
    OR (is_bot = true AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = room_clues.room_code AND r.host_uid = auth.uid()))
  );

CREATE POLICY room_votes_select ON public.room_votes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.room_players rp WHERE rp.room_code = room_votes.room_code AND rp.uid = auth.uid()::text));

CREATE POLICY room_votes_insert ON public.room_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    voter_uid = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.rooms r WHERE r.code = room_votes.room_code AND r.host_uid = auth.uid())
  );

-- ============================================================================
-- ANTI-CHEAT SECURITY DEFINER RPC FUNCTIONS
-- ============================================================================

-- A. Fetch player's own role & word (Spies NEVER receive secret_word from the DB!)
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_code = p_room_code AND uid = v_uid) THEN
    RAISE EXCEPTION 'Not a participant in this room';
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

-- B. Atomically increment play_count ONLY when a match starts with a custom category
CREATE OR REPLACE FUNCTION public.increment_category_play_count(p_category_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM set_config('app.allow_playcount_rpc', '1', true);
  UPDATE public.custom_categories
  SET play_count = play_count + 1
  WHERE id = p_category_id
    AND (is_published = true OR creator_uid = auth.uid())
  RETURNING play_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- C. Submit Spy Last-Chance Guess on the server and reveal winner atomically
CREATE OR REPLACE FUNCTION public.submit_spy_last_chance_guess(
  p_room_code TEXT,
  p_guessed_word TEXT
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
  SELECT * INTO v_room FROM public.rooms WHERE code = p_room_code FOR UPDATE;
  IF NOT FOUND OR v_room.status <> 'spy_guess' THEN
    RAISE EXCEPTION 'Room is not in spy_guess state';
  END IF;

  IF v_room.spy_guess_candidate_uid <> v_uid AND v_room.host_uid <> auth.uid() THEN
    RAISE EXCEPTION 'Only the caught spy can submit the last-chance guess';
  END IF;

  SELECT * INTO v_secret FROM public.room_secrets WHERE room_code = p_room_code;
  v_correct := lower(trim(COALESCE(p_guessed_word, ''))) = lower(trim(v_secret.secret_word));
  v_winner := CASE WHEN v_correct THEN 'spies' ELSE 'crew' END;

  UPDATE public.rooms
  SET
    status = 'gameover',
    winner_team = v_winner,
    revealed_word = v_secret.secret_word,
    revealed_word_ar = v_secret.secret_word_ar,
    revealed_spies = v_secret.spies,
    spy_guess_result = jsonb_build_object(
      'spyUid', v_room.spy_guess_candidate_uid,
      'guessedWord', COALESCE(p_guessed_word, ''),
      'isCorrect', v_correct
    ),
    spy_guess_candidate_uid = NULL,
    spy_guess_options = NULL,
    spy_guess_ends_at = NULL
  WHERE code = p_room_code;

  -- Award XP inside the same atomic transaction
  PERFORM set_config('app.allow_score_rpc', '1', true);
  UPDATE public.profiles p
  SET score = p.score + CASE
    WHEN (v_winner = 'spies' AND p.uid::text = ANY(v_secret.spies))
      OR (v_winner = 'crew' AND NOT (p.uid::text = ANY(v_secret.spies)))
    THEN 35
    ELSE 10
  END
  FROM public.room_players rp
  WHERE rp.room_code = p_room_code
    AND rp.is_bot = false
    AND rp.uid = p.uid::text;

  RETURN jsonb_build_object('isCorrect', v_correct, 'winnerTeam', v_winner);
END;
$$;
