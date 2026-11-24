/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { User as SupabaseUser, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { sound } from './audio';
import { dictionary } from './translations';
import {
  Language,
  RoomData,
  PlayerData,
  CategoryKey,
  GameMode,
  FriendEntry,
  FriendRequest,
  RoomInvite,
  JoinRequest,
  CustomCategory,
  CustomCategoryWord,
  RoomCustomCategorySnapshot,
  MissionDossier
} from './types';
import { wordsDB } from './words';
import { AuthScreen } from './screens/AuthScreen';
import { HomeTab } from './screens/HomeTab';
import { StationsTab } from './screens/StationsTab';
import { FriendsTab } from './screens/FriendsTab';
import { CategoriesTab } from './screens/CategoriesTab';
import { SettingsTab } from './screens/SettingsTab';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { VotingScreen } from './screens/VotingScreen';
import { SpyLastChanceScreen } from './screens/SpyLastChanceScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { RoundAnnounceModal } from './screens/RoundAnnounceModal';
import { BottomNav, NavTabId } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { RankModal } from './components/RankModal';
import { AppBootSkeleton, RoomLobbySkeleton } from './components/Skeletons';
import { HostJoinApprovalModal } from './components/HostJoinApprovalModal';
import { ApplicantWaitingApprovalModal } from './components/ApplicantWaitingApprovalModal';
import { QuickMatchModal } from './components/QuickMatchModal';
import {
  customCategoriesCache,
  publicRoomsCache,
  userProfileCache
} from './utils/cache';
import { CinematicEjectionOverlay } from './components/CinematicEjectionOverlay';
import {
  generateUniqueBotName,
  getBotClueBankForWord,
  getBotSpyClueBank
} from './aiBot';
import { useVoiceChat } from './hooks/useVoiceChat';
import { MandatoryUpdateModal } from './components/MandatoryUpdateModal';
import { saveAccountProfile } from './utils/savedAccounts';
import {
  areAllEligibleVotesSubmitted,
  getEffectiveTurnSeconds,
  getEligibleVoters,
  isBotPlayer,
  shouldResetGameOverToLobby,
  shuffleArray,
  validateGameStart
} from './gameEngine';

const CURRENT_APP_VERSION = '3.1.4';
const ROUND_ANNOUNCE_MS = 2400;

function toMs(val?: string | number | null): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val) {
    const parsed = Date.parse(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getUserMeta(user: SupabaseUser) {
  const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
  const name =
    (meta.full_name || meta.name || (user.email ? user.email.split('@')[0] : 'Agent') || 'Agent').trim() ||
    'Agent';
  const avatar =
    meta.avatar_url ||
    meta.picture ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || user.id)}`;
  const provider: 'google' | 'password' =
    user.app_metadata?.provider === 'google' ||
    user.identities?.some(i => i.provider === 'google')
      ? 'google'
      : 'password';
  return { name, avatar, provider };
}

interface SqlProfileRow {
  uid: string;
  name: string;
  avatar: string;
  friend_code?: string;
  score?: number;
}

interface SqlCategoryRow {
  id: string;
  creator_uid: string;
  creator_name: string;
  name: string;
  icon?: string | null;
  image_url?: string | null;
  words?: CustomCategoryWord[] | null;
  is_published?: boolean;
  play_count?: number;
  created_at?: string;
  updated_at?: string;
}

function mapCategoryRow(row: SqlCategoryRow): CustomCategory {
  return {
    id: row.id,
    creatorUid: row.creator_uid,
    creatorName: row.creator_name || 'Agent',
    name: row.name,
    icon: row.icon || '🎯',
    image: row.image_url || undefined,
    words: Array.isArray(row.words) ? row.words : [],
    isPublished: Boolean(row.is_published),
    playCount: Number(row.play_count) || 0,
    createdAt: toMs(row.created_at) || Date.now(),
    updatedAt: toMs(row.updated_at) || Date.now()
  };
}

interface SqlRoomRow {
  code: string;
  host_uid: string;
  original_host_uid?: string | null;
  host_name?: string | null;
  status: RoomData['status'];
  visibility: 'public' | 'private';
  is_quick_match?: boolean;
  game_mode: GameMode;
  categories?: CategoryKey[] | null;
  custom_category_ids?: string[] | null;
  custom_category_snapshot?: Record<string, RoomCustomCategorySnapshot> | null;
  active_custom_category_id?: string | null;
  custom_category_words?: CustomCategoryWord[] | null;
  allow_spy_last_chance?: boolean;
  spy_count: number;
  max_players: number;
  turn_seconds: number;
  round_num?: number;
  turn_order?: string[] | null;
  turn_index?: number | null;
  turn_time_left?: number | null;
  turn_ends_at?: string | null;
  turn_grace_until?: string | null;
  completed_turns_this_round?: Record<string, boolean> | null;
  vote_ends_at?: string | null;
  spy_guess_candidate_uid?: string | null;
  spy_guess_options?: CustomCategoryWord[] | null;
  spy_guess_ends_at?: string | null;
  spy_guess_result?: RoomData['spyGuessResult'];
  winner_team?: 'crew' | 'spies' | null;
  active_word_category?: CategoryKey | null;
  active_custom_category_name?: string | null;
  active_custom_category_image?: string | null;
  revealed_word?: string | null;
  revealed_word_ar?: string | null;
  revealed_spies?: string[] | null;
  final_players?: Record<string, PlayerData> | null;
  ejection_event?: RoomData['ejectionEvent'];
  ejection_ends_at?: string | null;
  announcement?: RoomData['announcement'];
  blackout_active?: boolean;
  blackout_ends_at?: string | null;
  last_blackout_round?: number;
  created_at?: string | null;
}

interface SqlPlayerRow {
  uid: string;
  name: string;
  avatar: string;
  is_bot?: boolean;
  is_spectator?: boolean;
  post_game?: 'inLobby' | null;
  is_silenced?: boolean;
  disqualified_vote?: boolean;
  missed_turns?: number;
  joined_at?: string;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('spy_station_lang') as Language | null;
    return saved && ['en', 'ar', 'es', 'fr', 'de'].includes(saved) ? saved : 'en';
  });

  // Mandatory update check: seed current version on fresh visit so new players aren't blocked
  const [mandatoryUpdateAvailable, setMandatoryUpdateAvailable] = useState<boolean>(() => {
    const installed = localStorage.getItem('spy_station_installed_version');
    if (!installed) {
      localStorage.setItem('spy_station_installed_version', CURRENT_APP_VERSION);
      return false;
    }
    return installed !== CURRENT_APP_VERSION;
  });

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [profileName, setProfileName] = useState('Agent');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [userXp, setUserXp] = useState(0);

  // Navigation
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [inCreateModal, setInCreateModal] = useState(false);
  const [createInitialCategory, setCreateInitialCategory] = useState<CategoryKey | 'random'>('players');
  const [createInitialCustomCategoryId, setCreateInitialCustomCategoryId] = useState<string | null>(null);
  const [isEditingRoom, setIsEditingRoom] = useState(false);

  // In-room state
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [missionDossier, setMissionDossier] = useState<MissionDossier | null>(null);
  const [announcedRound, setAnnouncedRound] = useState<number | null>(null);
  const lastAnnouncedRoundRef = useRef<number>(0);
  const [pendingJoinApproval, setPendingJoinApproval] = useState<{
    code: string;
    hostName: string;
    queuePosition?: number;
  } | null>(null);

  // Friends & Presence
  const [myFriendCode, setMyFriendCode] = useState('--------');
  const [friends, setFriends] = useState<Record<string, FriendEntry>>({});
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [friendRequests, setFriendRequests] = useState<Record<string, FriendRequest>>({});
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [roomInvites, setRoomInvites] = useState<Record<string, RoomInvite>>({});

  // Public rooms
  const [publicRooms, setPublicRooms] = useState<Record<string, RoomData>>(() => publicRoomsCache.get('latest') || {});
  const [publicRoomsLoading, setPublicRoomsLoading] = useState(true);
  const [stationsLimit, setStationsLimit] = useState(12);
  const [hasMoreStations, setHasMoreStations] = useState(false);

  // Custom & Community Categories
  const [myCategories, setMyCategories] = useState<CustomCategory[]>([]);
  const [communityCategories, setCommunityCategories] = useState<CustomCategory[]>(() => {
    const cached = customCategoriesCache.get('latest');
    return cached ? Object.values(cached).filter(c => c.isPublished) : [];
  });
  const [customCatsLoading, setCustomCatsLoading] = useState(true);
  const [communityCatLimit, setCommunityCatLimit] = useState(12);
  const [hasMoreCommunityCats, setHasMoreCommunityCats] = useState(false);

  // Modals
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [quickMatchModalOpen, setQuickMatchModalOpen] = useState(false);

  // Dynamic Adaptive Espionage Background Music
  useEffect(() => {
    if (!roomData) {
      sound.setBgmMode('ambient');
      return;
    }
    if (roomData.status === 'playing' || roomData.status === 'voting' || roomData.status === 'spy_guess') {
      sound.setBgmMode('suspense');
    } else {
      sound.setBgmMode('ambient');
    }
  }, [roomData?.status]);

  // Global Tactile Button Click Audio Feedback
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, [role="button"], a, input[type="checkbox"], input[type="radio"]');
      if (interactive) {
        sound.playTactileClick();
      }
    };
    window.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  const [activeEjection, setActiveEjection] = useState<{
    uid: string;
    name: string;
    avatar?: string;
    isSpy: boolean;
    timestamp: number;
  } | null>(null);
  const lastSeenEjectionTimestampRef = useRef<number>(0);
  const completedEjectionsRef = useRef<Set<number>>(new Set());

  const handleEjectionComplete = useCallback(() => {
    setActiveEjection(null);
  }, []);

  const roundAnnounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const roomRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spyGuessIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTurnTickRunningRef = useRef(false);
  const isVoteTickRunningRef = useRef(false);
  const isResolvingVotesRef = useRef(false);
  const isResolvingSpyGuessRef = useRef(false);
  const advancingTurnKeyRef = useRef<string | null>(null);
  const dossierRef = useRef<MissionDossier | null>(null);
  const dossierPhaseKeyRef = useRef<string>('');
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const serverTimeOffsetRef = useRef(0);
  const getServerNow = useCallback(() => Date.now() + serverTimeOffsetRef.current, []);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastRoomSnapshotRef = useRef<RoomData | null>(null);
  const pendingReqChannelRef = useRef<RealtimeChannel | null>(null);
  const profileNameRef = useRef(profileName);
  const profileAvatarRef = useRef(profileAvatar);

  // Synchronize clock against Postgres server clock_timestamp()
  useEffect(() => {
    const syncClock = async () => {
      try {
        const t0 = Date.now();
        const { data, error } = await supabase.rpc('get_server_now_ms');
        const t1 = Date.now();
        if (!error && typeof data === 'number') {
          const rttMid = Math.round((t0 + t1) / 2);
          const offset = data - rttMid;
          serverTimeOffsetRef.current = offset;
          setServerTimeOffsetMs(offset);
        }
      } catch {
        // ignore clock sync errors
      }
    };
    syncClock();
    const id = setInterval(syncClock, 180000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    profileNameRef.current = profileName;
    profileAvatarRef.current = profileAvatar;
  }, [profileName, profileAvatar]);

  const t = dictionary[lang];

  // In-game floating top notifications are disabled per user preference
  const showToast = (_message: string, _type: 'normal' | 'danger' | 'success' = 'normal') => {};

  const voice = useVoiceChat({
    roomCode: currentRoomCode || '',
    currentUserUid: currentUser?.id || '',
    currentUserName: profileName || (currentUser ? getUserMeta(currentUser).name : 'Agent'),
    onToast: showToast,
    permissionErrorMsg: t.voicePermissionError
  });

  // Auto-join voice room in listen-only mode (Mic OFF, Headphones ON) when entering a room
  const voiceAutoJoinedRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentRoomCode || !currentUser?.id) {
      voiceAutoJoinedRoomRef.current = null;
      return;
    }
    if (voiceAutoJoinedRoomRef.current !== currentRoomCode) {
      voiceAutoJoinedRoomRef.current = currentRoomCode;
      voice.joinVoice(true);
    }
  }, [currentRoomCode, currentUser?.id, voice.joinVoice]);

  // Sync document direction & language
  useEffect(() => {
    document.documentElement.lang = lang;
    const isRtl = lang === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    localStorage.setItem('spy_station_lang', lang);
  }, [lang]);

  // Periodic and on-mount check for remote app updates
  useEffect(() => {
    const checkUpdate = () => {
      fetch(`./version.json?_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.version) {
            const installed = localStorage.getItem('spy_station_installed_version');
            if (!installed) {
              localStorage.setItem('spy_station_installed_version', data.version);
            } else if (installed !== data.version) {
              setMandatoryUpdateAvailable(true);
            }
          }
        })
        .catch(() => {});
    };

    checkUpdate();
    const interval = setInterval(checkUpdate, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auth listener & persistent session maintenance (Supabase Auth)
  useEffect(() => {
    let mounted = true;

    const applySessionUser = (user: SupabaseUser | null) => {
      if (!mounted) return;
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('spy_station_has_session', 'true');
        const meta = getUserMeta(user);
        setProfileName(meta.name);
        setProfileAvatar(meta.avatar);

        if (user.email) {
          saveAccountProfile({
            uid: user.id,
            email: user.email,
            name: meta.name,
            avatar: meta.avatar,
            provider: meta.provider
          });
        }
      } else {
        localStorage.removeItem('spy_station_has_session');
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      applySessionUser(data.session?.user ?? null);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      applySessionUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Screen Wake Lock
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // ignore
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // Load & sync profile, presence, friends, requests, and room invites
  const reloadSocialData = useCallback(async (user: SupabaseUser) => {
    const uid = user.id;
    try {
      const [
        { data: friendsRows },
        { data: reqIncoming },
        { data: reqSent },
        { data: inviteRows }
      ] = await Promise.all([
        supabase.from('friendships').select('friend_uid, created_at').eq('user_uid', uid),
        supabase.from('friend_requests').select('sender_uid, created_at').eq('recipient_uid', uid),
        supabase.from('friend_requests').select('recipient_uid').eq('sender_uid', uid),
        supabase.from('room_invites').select('sender_uid, room_code, from_name, from_avatar, created_at').eq('recipient_uid', uid)
      ]);

      const friendUids = (friendsRows || []).map(r => r.friend_uid as string);
      const senderUids = (reqIncoming || []).map(r => r.sender_uid as string);
      const lookupUids = Array.from(new Set([...friendUids, ...senderUids]));

      const profileMap: Record<string, SqlProfileRow> = {};
      if (lookupUids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('uid, name, avatar, friend_code')
          .in('uid', lookupUids);
        (profs || []).forEach(p => {
          profileMap[p.uid] = p as SqlProfileRow;
          userProfileCache.set(p.uid, { name: p.name, avatar: p.avatar, friendCode: p.friend_code });
        });
      }

      const nextFriends: Record<string, FriendEntry> = {};
      (friendsRows || []).forEach(row => {
        const fUid = row.friend_uid as string;
        const prof = profileMap[fUid];
        nextFriends[fUid] = {
          name: prof?.name || 'Agent',
          avatar: prof?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fUid}`,
          since: toMs(row.created_at) || Date.now()
        };
      });
      setFriends(nextFriends);
      setFriendsLoading(false);

      // Load friend online presence
      if (friendUids.length > 0) {
        const { data: presRows } = await supabase
          .from('player_presence')
          .select('uid, state, last_changed')
          .in('uid', friendUids);
        const now = Date.now();
        const nextStatuses: Record<string, 'online' | 'offline'> = {};
        (presRows || []).forEach(pr => {
          const lastMs = toMs(pr.last_changed) || 0;
          const fresh = now - lastMs < 150000;
          nextStatuses[pr.uid as string] = pr.state === 'online' && fresh ? 'online' : 'offline';
        });
        setFriendStatuses(nextStatuses);
      } else {
        setFriendStatuses({});
      }

      const nextIncoming: Record<string, FriendRequest> = {};
      (reqIncoming || []).forEach(r => {
        const sUid = r.sender_uid as string;
        const prof = profileMap[sUid];
        nextIncoming[sUid] = {
          name: prof?.name || 'Agent',
          avatar: prof?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sUid}`,
          timestamp: toMs(r.created_at) || Date.now()
        };
      });
      setFriendRequests(nextIncoming);

      const nextSent: Record<string, boolean> = {};
      (reqSent || []).forEach(r => {
        nextSent[r.recipient_uid as string] = true;
      });
      setSentRequests(nextSent);

      const nextInvites: Record<string, RoomInvite> = {};
      (inviteRows || []).forEach(inv => {
        const sUid = inv.sender_uid as string;
        nextInvites[sUid] = {
          roomCode: inv.room_code as string,
          fromName: (inv.from_name as string) || 'Agent',
          fromAvatar: (inv.from_avatar as string) || '',
          timestamp: toMs(inv.created_at) || Date.now()
        };
      });
      setRoomInvites(nextInvites);
    } catch {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setFriends({});
      setFriendStatuses({});
      setFriendRequests({});
      setSentRequests({});
      setRoomInvites({});
      setPublicRooms({});
      setUserXp(0);
      setMyFriendCode('--------');
      return;
    }

    let isCancelled = false;
    const uid = currentUser.id;
    const meta = getUserMeta(currentUser);

    // 1. Ensure & fetch user profile + XP + friendCode via atomic server RPC
    supabase
      .rpc('ensure_user_profile', {
        p_name: meta.name,
        p_avatar: meta.avatar,
        p_claim_username: false
      })
      .then(({ data }) => {
        if (isCancelled || !data) return;
        const prof = data as SqlProfileRow;
        if (prof.name) setProfileName(prof.name);
        if (prof.avatar) setProfileAvatar(prof.avatar);
        if (typeof prof.score === 'number') setUserXp(prof.score);
        if (prof.friend_code) setMyFriendCode(prof.friend_code);

        userProfileCache.set(uid, {
          name: prof.name,
          avatar: prof.avatar,
          friendCode: prof.friend_code
        });

        if (currentUser.email) {
          saveAccountProfile({
            uid,
            email: currentUser.email,
            name: prof.name || meta.name,
            avatar: prof.avatar || meta.avatar,
            provider: meta.provider
          });
        }
      }, () => {});

    // 2. Presence heartbeat
    const pushPresence = (state: 'online' | 'offline') => {
      supabase
        .from('player_presence')
        .upsert({ uid, state, last_changed: new Date().toISOString() }, { onConflict: 'uid' })
        .then(() => {}, () => {});
    };
    pushPresence('online');
    const presenceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pushPresence('online');
      }
    }, 45000);

    const onVisChange = () => {
      pushPresence(document.visibilityState === 'visible' ? 'online' : 'offline');
    };
    document.addEventListener('visibilitychange', onVisChange);

    // 3. Initial load of social graph
    setFriendsLoading(true);
    reloadSocialData(currentUser);

    // 4. Realtime social + profile channel
    const socialChannel = supabase
      .channel(`user-social:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `uid=eq.${uid}` },
        payload => {
          const row = payload.new as SqlProfileRow | undefined;
          if (!row) return;
          if (row.name) setProfileName(row.name);
          if (row.avatar) setProfileAvatar(row.avatar);
          if (typeof row.score === 'number') setUserXp(row.score);
          if (row.friend_code) setMyFriendCode(row.friend_code);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `user_uid=eq.${uid}` },
        () => reloadSocialData(currentUser)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `recipient_uid=eq.${uid}` },
        () => reloadSocialData(currentUser)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_uid=eq.${uid}` },
        () => reloadSocialData(currentUser)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_invites', filter: `recipient_uid=eq.${uid}` },
        () => reloadSocialData(currentUser)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_presence' },
        payload => {
          const row = payload.new as { uid?: string; state?: string; last_changed?: string } | undefined;
          if (!row?.uid || row.uid === uid) return;
          setFriendStatuses(prev => {
            if (!(row.uid! in prev) && !(row.uid! in friends)) return prev;
            return {
              ...prev,
              [row.uid!]: row.state === 'online' ? 'online' : 'offline'
            };
          });
        }
      )
      .subscribe();

    // 5. Restore previous room if saved and still valid
    const savedRoom = localStorage.getItem('spy_station_room');
    if (savedRoom) {
      supabase
        .rpc('lookup_room_for_join', { p_code: savedRoom })
        .then(({ data }) => {
          if (isCancelled) return;
          const info = data as { exists?: boolean; isMember?: boolean; visibility?: string; isInvited?: boolean } | null;
          if (info?.exists && (info.isMember || info.visibility === 'public' || info.isInvited)) {
            joinRoom(savedRoom);
          } else {
            localStorage.removeItem('spy_station_room');
          }
        }, () => {
          localStorage.removeItem('spy_station_room');
        });
    }

    return () => {
      isCancelled = true;
      clearInterval(presenceInterval);
      document.removeEventListener('visibilitychange', onVisChange);
      pushPresence('offline');
      supabase.removeChannel(socialChannel);
    };
  }, [currentUser?.id]);

  // Public Stations loader & realtime listener (only active while browsing Stations tab)
  const fetchPublicStations = useCallback(async () => {
    try {
      const { data: rows, error } = await supabase
        .from('rooms')
        .select('code, host_uid, host_name, status, visibility, game_mode, categories, custom_category_ids, custom_category_snapshot, max_players, spy_count, turn_seconds, allow_spy_last_chance, created_at, room_players(uid, name, avatar, is_bot, is_spectator, joined_at)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(stationsLimit);

      if (error) throw error;

      const validRooms: Record<string, RoomData> = {};
      const now = Date.now();

      (rows || []).forEach(r => {
        const rawPlayers = Array.isArray(r.room_players) ? (r.room_players as SqlPlayerRow[]) : [];
        const playersMap: Record<string, PlayerData> = {};
        rawPlayers.forEach(p => {
          playersMap[p.uid] = {
            uid: p.uid,
            name: p.name,
            avatar: p.avatar,
            joinedAt: toMs(p.joined_at),
            isBot: p.is_bot,
            isSpectator: p.is_spectator
          };
        });

        const humanList = rawPlayers.filter(p => !p.is_bot && !p.uid.startsWith('bot_'));
        const createdAt = toMs(r.created_at) || now;
        const ageMs = now - createdAt;

        if (humanList.length === 0 && ageMs > 25000) {
          return;
        }

        validRooms[r.code as string] = {
          hostUid: r.host_uid as string,
          status: r.status as RoomData['status'],
          visibility: r.visibility as 'public' | 'private',
          gameMode: r.game_mode as GameMode,
          categories: (r.categories as CategoryKey[]) || ['players'],
          customCategoryIds: (r.custom_category_ids as string[]) || [],
          customCategorySnapshot: (r.custom_category_snapshot as Record<string, RoomCustomCategorySnapshot>) || undefined,
          maxPlayers: r.max_players as number,
          spyCount: r.spy_count as number,
          turnSeconds: r.turn_seconds as number,
          allowSpyLastChance: Boolean(r.allow_spy_last_chance),
          createdAt,
          players: playersMap
        };
      });

      setHasMoreStations((rows || []).length >= stationsLimit);
      setPublicRooms(validRooms);
      setPublicRoomsLoading(false);
      publicRoomsCache.set('latest', validRooms);
    } catch {
      setPublicRoomsLoading(false);
    }
  }, [stationsLimit]);

  useEffect(() => {
    if (!currentUser || currentRoomCode || activeTab !== 'stations') {
      return;
    }

    const cachedRooms = publicRoomsCache.get('latest');
    if (cachedRooms && Object.keys(cachedRooms).length > 0) {
      setPublicRooms(cachedRooms);
      setPublicRoomsLoading(false);
    } else {
      setPublicRoomsLoading(true);
    }

    fetchPublicStations();

    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fetchPublicStations(), 250);
    };

    const channel = supabase
      .channel('public-stations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, scheduleRefresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentRoomCode, activeTab, fetchPublicStations]);

  // Custom & Community Categories loader & realtime subscription
  const fetchCustomCategories = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [{ data: myRows }, { data: pubRows }] = await Promise.all([
        supabase
          .from('custom_categories')
          .select('*')
          .eq('creator_uid', currentUser.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('custom_categories')
          .select('*')
          .eq('is_published', true)
          .order('play_count', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(communityCatLimit)
      ]);

      const myList = (myRows || []).map(r => mapCategoryRow(r as SqlCategoryRow));
      const pubList = (pubRows || []).map(r => mapCategoryRow(r as SqlCategoryRow));

      setMyCategories(myList);
      setCommunityCategories(pubList);
      setHasMoreCommunityCats(pubList.length >= communityCatLimit);
      setCustomCatsLoading(false);

      const nextCache: Record<string, CustomCategory> = {};
      [...myList, ...pubList].forEach(c => {
        nextCache[c.id] = c;
      });
      customCategoriesCache.set('latest', nextCache);
    } catch {
      setCustomCatsLoading(false);
    }
  }, [currentUser?.id, communityCatLimit]);

  useEffect(() => {
    if (!currentUser) {
      setMyCategories([]);
      setCommunityCategories([]);
      return;
    }

    const cached = customCategoriesCache.get('latest');
    if (cached && Object.keys(cached).length > 0) {
      const vals = Object.values(cached);
      setMyCategories(vals.filter(c => c.creatorUid === currentUser.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setCommunityCategories(vals.filter(c => c.isPublished).sort((a, b) => (b.playCount || 0) - (a.playCount || 0) || (b.createdAt || 0) - (a.createdAt || 0)));
      setCustomCatsLoading(false);
    } else {
      setCustomCatsLoading(true);
    }

    fetchCustomCategories();

    const channel = supabase
      .channel('custom-categories-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_categories' }, () => {
        fetchCustomCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, fetchCustomCategories]);

  const allAvailableCustomCategories = React.useMemo(() => {
    const map = new Map<string, CustomCategory>();
    myCategories.forEach(c => map.set(c.id, c));
    communityCategories.forEach(c => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    return Array.from(map.values());
  }, [myCategories, communityCategories]);

  const isHost = !!(roomData && currentUser && roomData.hostUid === currentUser.id);

  // Listen for Cinematic Space Ejection Events (strictly runs once per ejection event)
  useEffect(() => {
    const ev = roomData?.ejectionEvent;
    if (
      ev &&
      ev.timestamp &&
      !completedEjectionsRef.current.has(ev.timestamp) &&
      ev.timestamp > lastSeenEjectionTimestampRef.current
    ) {
      lastSeenEjectionTimestampRef.current = ev.timestamp;
      completedEjectionsRef.current.add(ev.timestamp);
      setActiveEjection(ev);
    }
  }, [roomData?.ejectionEvent]);

  // Host & GameOver Watchdog (uses Postgres RPCs safely)
  useEffect(() => {
    if (!currentRoomCode || !currentUser) {
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
      return;
    }

    watchdogIntervalRef.current = setInterval(() => {
      const data = lastRoomSnapshotRef.current;
      if (!data || !currentRoomCode) return;
      const playersObj = data.players || {};
      const currentHost = data.hostUid;
      const hostP = currentHost ? playersObj[currentHost] : null;

      const activeList = Object.values(playersObj)
        .filter(p => !p.isSpectator && !isBotPlayer(p))
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

      if ((!hostP || hostP.isSpectator || isBotPlayer(hostP, currentHost)) && activeList.length > 0) {
        if (currentUser.id === activeList[0].uid && currentHost !== activeList[0].uid) {
          supabase.rpc('claim_host_if_needed', { p_room_code: currentRoomCode }).then(() => {}, () => {});
        }
      }

      const activeAll = Object.values(playersObj).filter(p => !p.isSpectator);
      const isGameActive = data.status === 'playing' || data.status === 'voting' || data.status === 'resolving';
      if (isGameActive && activeAll.length < 3) {
        const effectiveHost =
          currentHost && playersObj[currentHost] && !playersObj[currentHost].isSpectator
            ? currentHost
            : activeList[0]?.uid;
        if (currentUser.id === effectiveHost) {
          supabase
            .rpc('reset_room_to_lobby', { p_room_code: currentRoomCode, p_reason: t.gameAbortedNotEnoughPlayers })
            .then(() => {}, () => {});
        }
      }
    }, 1500);

    return () => {
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
    };
  }, [currentRoomCode, currentUser?.id, t.gameAbortedNotEnoughPlayers]);

  // Advance Turn RPC wrapper
  const advanceTurn = async (expectedTurnIndex?: number, wasTimeout: boolean = false, expectedRound?: number) => {
    if (!currentRoomCode) return;
    const lockKey = `${currentRoomCode}:${expectedRound ?? 'any'}:${expectedTurnIndex ?? 'any'}`;
    if (advancingTurnKeyRef.current === lockKey) return;
    advancingTurnKeyRef.current = lockKey;

    try {
      const speakerUid = lastRoomSnapshotRef.current?.turnOrder?.[lastRoomSnapshotRef.current?.turnIndex || 0];
      const speakerName = (speakerUid && lastRoomSnapshotRef.current?.players?.[speakerUid]?.name) || 'Agent';

      await supabase.rpc('advance_room_turn', {
        p_room_code: currentRoomCode,
        p_expected_turn_index: expectedTurnIndex ?? null,
        p_was_timeout: wasTimeout,
        p_expected_round: expectedRound ?? null,
        p_timeout_msg: wasTimeout ? t.annTurnTimedOut.replace('{name}', speakerName) : null
      });
    } catch {
      // ignore transient errors; watchdog retries cleanly
    } finally {
      if (advancingTurnKeyRef.current === lockKey) {
        advancingTurnKeyRef.current = null;
      }
    }
  };

  // Resolve Votes RPC wrapper (Runs atomically inside Postgres!)
  const processVoteResults = async (_roomFallback?: RoomData | null) => {
    if (!currentRoomCode || !isHost || isResolvingVotesRef.current) return;
    isResolvingVotesRef.current = true;
    try {
      await supabase.rpc('resolve_room_votes', { p_room_code: currentRoomCode });
    } catch {
      // keep status in 'voting' so watchdog retries
    } finally {
      isResolvingVotesRef.current = false;
    }
  };

  // Submit Spy Last-Chance Guess RPC wrapper
  const handleSubmitSpyGuess = async (guessedWordEn: string | null) => {
    if (!currentRoomCode || isResolvingSpyGuessRef.current) return;
    isResolvingSpyGuessRef.current = true;
    try {
      await supabase.rpc('submit_spy_last_chance_guess', {
        p_room_code: currentRoomCode,
        p_guessed_word: guessedWordEn
      });
    } catch {
      // allow retry safely
    } finally {
      isResolvingSpyGuessRef.current = false;
    }
  };

  // Host-authoritative Turn, Vote & Spy-Guess Countdown Watchdog (synchronized to Postgres server clock)
  useEffect(() => {
    if (!isHost || !currentRoomCode || !roomData) {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
      if (voteIntervalRef.current) {
        clearInterval(voteIntervalRef.current);
        voteIntervalRef.current = null;
      }
      if (spyGuessIntervalRef.current) {
        clearInterval(spyGuessIntervalRef.current);
        spyGuessIntervalRef.current = null;
      }
      isTurnTickRunningRef.current = false;
      isVoteTickRunningRef.current = false;
      return;
    }

    if (roomData.status === 'playing') {
      if (!turnIntervalRef.current) {
        turnIntervalRef.current = setInterval(async () => {
          if (isTurnTickRunningRef.current) return;
          isTurnTickRunningRef.current = true;
          try {
            const room = lastRoomSnapshotRef.current;
            if (!room || room.status !== 'playing') return;

            const now = getServerNow();
            if ((room.ejectionEndsAt && now < room.ejectionEndsAt) || (room.turnGraceUntil && now < room.turnGraceUntil)) {
              return;
            }

            const turnOrder = room.turnOrder || [];
            const turnIdx = room.turnIndex || 0;
            const currentSpeakerUid = turnOrder[turnIdx];
            const currentSpeaker = currentSpeakerUid ? room.players?.[currentSpeakerUid] : null;

            if (
              turnOrder.length === 0 ||
              !currentSpeakerUid ||
              !currentSpeaker ||
              currentSpeaker.isSpectator ||
              room.completedTurnsThisRound?.[currentSpeakerUid]
            ) {
              await advanceTurn(turnIdx, false, room.round);
              return;
            }

            const isBotTurn = isBotPlayer(currentSpeaker, currentSpeakerUid);
            const timeoutMarginMs = isBotTurn ? 0 : 600;
            if (room.turnEndsAt && now >= room.turnEndsAt + timeoutMarginMs) {
              await advanceTurn(room.turnIndex, true, room.round);
            }
          } catch {
            // ignore transient errors
          } finally {
            isTurnTickRunningRef.current = false;
          }
        }, 500);
      }
    } else {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
      isTurnTickRunningRef.current = false;
    }

    if (roomData.status === 'voting') {
      if (!voteIntervalRef.current) {
        voteIntervalRef.current = setInterval(async () => {
          if (isVoteTickRunningRef.current || isResolvingVotesRef.current) return;
          isVoteTickRunningRef.current = true;
          try {
            const room = lastRoomSnapshotRef.current;
            if (!room || room.status !== 'voting') return;
            const now = getServerNow();
            if (areAllEligibleVotesSubmitted(room) || (room.voteEndsAt && now >= room.voteEndsAt)) {
              await processVoteResults(room);
            }
          } catch {
            // ignore transient errors
          } finally {
            isVoteTickRunningRef.current = false;
          }
        }, 500);
      }
    } else {
      if (voteIntervalRef.current) {
        clearInterval(voteIntervalRef.current);
        voteIntervalRef.current = null;
      }
      isVoteTickRunningRef.current = false;
    }

    if (roomData.status === 'spy_guess') {
      if (!spyGuessIntervalRef.current) {
        spyGuessIntervalRef.current = setInterval(async () => {
          if (isResolvingSpyGuessRef.current) return;
          try {
            const room = lastRoomSnapshotRef.current;
            if (!room || room.status !== 'spy_guess') return;
            const now = getServerNow();
            if (room.spyGuessEndsAt && now >= room.spyGuessEndsAt) {
              await handleSubmitSpyGuess(null);
            }
          } catch {
            // ignore transient errors
          }
        }, 450);
      }
    } else {
      if (spyGuessIntervalRef.current) {
        clearInterval(spyGuessIntervalRef.current);
        spyGuessIntervalRef.current = null;
      }
    }

    return () => {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
      if (voteIntervalRef.current) {
        clearInterval(voteIntervalRef.current);
        voteIntervalRef.current = null;
      }
      if (spyGuessIntervalRef.current) {
        clearInterval(spyGuessIntervalRef.current);
        spyGuessIntervalRef.current = null;
      }
      isTurnTickRunningRef.current = false;
      isVoteTickRunningRef.current = false;
    };
  }, [isHost, currentRoomCode, roomData?.status]);

  // Bot Speaking Automation (Executes securely INSIDE Postgres so Host never learns spies/words!)
  const currentSpeakerUid = roomData?.turnOrder?.[roomData?.turnIndex || 0];
  useEffect(() => {
    if (!isHost || !currentRoomCode || roomData?.status !== 'playing' || !currentSpeakerUid) return;

    const speaker = roomData.players?.[currentSpeakerUid];
    if (!isBotPlayer(speaker, currentSpeakerUid)) return;

    const targetRound = roomData.round || 1;
    const targetTurnIndex = roomData.turnIndex || 0;

    if (roomData.completedTurnsThisRound?.[currentSpeakerUid]) {
      advanceTurn(targetTurnIndex, false, targetRound);
      return;
    }

    let cancelled = false;
    const serverNow = getServerNow();
    const ejectionRemaining =
      roomData.ejectionEndsAt && roomData.ejectionEndsAt > serverNow
        ? roomData.ejectionEndsAt - serverNow
        : 0;
    const graceRemaining =
      roomData.turnGraceUntil && roomData.turnGraceUntil > serverNow
        ? roomData.turnGraceUntil - serverNow
        : 0;
    const waitOffset = Math.max(ejectionRemaining, graceRemaining);
    const botThinkDelay =
      roomData.gameMode === 'rapid'
        ? Math.max(900, waitOffset + 400)
        : Math.max(1600, waitOffset + 800);

    const botTimer = setTimeout(async () => {
      if (cancelled) return;
      try {
        await supabase.rpc('run_bot_turn_action', {
          p_room_code: currentRoomCode,
          p_bot_uid: currentSpeakerUid,
          p_expected_round: targetRound,
          p_expected_turn_index: targetTurnIndex
        });
      } catch {
        // Watchdog recovers automatically if needed
      }
    }, botThinkDelay);

    return () => {
      cancelled = true;
      clearTimeout(botTimer);
    };
  }, [isHost, currentRoomCode, roomData?.status, roomData?.round, roomData?.turnIndex, currentSpeakerUid]);

  // Bot Voting Automation (Runs inside Postgres without exposing spy list)
  const eligibleVotersForBots = roomData?.status === 'voting' ? getEligibleVoters(roomData.players) : [];
  const unvotedBotsKey = eligibleVotersForBots
    .filter(p => isBotPlayer(p) && !roomData?.votes?.[p.uid])
    .map(p => p.uid)
    .sort()
    .join(',');
  const unvotedHumansCount = eligibleVotersForBots.filter(
    p => !isBotPlayer(p) && !roomData?.votes?.[p.uid]
  ).length;

  useEffect(() => {
    if (!isHost || !currentRoomCode || roomData?.status !== 'voting' || !unvotedBotsKey) return;

    let cancelled = false;
    const delayMs = unvotedHumansCount === 0 ? 550 : 1600;

    const timerId = setTimeout(async () => {
      if (cancelled) return;
      try {
        await supabase.rpc('run_bot_votes', {
          p_room_code: currentRoomCode,
          p_batch_all: unvotedHumansCount === 0
        });
      } catch {
        // Watchdog retries safely
      }
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [isHost, currentRoomCode, roomData?.status, unvotedBotsKey, unvotedHumansCount]);

  // Immediate Vote Result Resolution (Triggers right when every eligible player has voted)
  const allEligibleVotesSubmitted =
    isHost &&
    !!currentRoomCode &&
    roomData?.status === 'voting' &&
    areAllEligibleVotesSubmitted(roomData);

  useEffect(() => {
    if (!allEligibleVotesSubmitted) return;
    const resolveTimer = setTimeout(() => {
      processVoteResults(lastRoomSnapshotRef.current);
    }, 300);
    return () => clearTimeout(resolveTimer);
  }, [allEligibleVotesSubmitted, currentRoomCode]);

  // Bot Spy Last-Chance Guess Automation (Runs inside Postgres!)
  useEffect(() => {
    if (!isHost || !currentRoomCode || roomData?.status !== 'spy_guess') return;
    const candidateUid = roomData.spyGuessCandidateUid;
    if (!candidateUid) return;
    const candidatePlayer = roomData.players?.[candidateUid] || roomData.finalPlayers?.[candidateUid];
    if (!isBotPlayer(candidatePlayer, candidateUid)) return;

    const serverNow = getServerNow();
    const waitEjection =
      roomData.ejectionEndsAt && roomData.ejectionEndsAt > serverNow
        ? roomData.ejectionEndsAt - serverNow
        : 0;
    const delayMs = waitEjection + 1800;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      supabase.rpc('run_bot_spy_guess', { p_room_code: currentRoomCode }).then(() => {}, () => {});
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isHost, currentRoomCode, roomData?.status, roomData?.spyGuessCandidateUid, roomData?.ejectionEndsAt]);

  // Hydrate full Zero-Knowledge RoomData snapshot from normalized Postgres tables
  const loadRoomState = useCallback(async (cleanCode: string, activeUid: string) => {
    try {
      const { data: roomRowRaw, error: rErr } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (rErr || !roomRowRaw) {
        leaveRoom();
        return;
      }

      const roomRow = roomRowRaw as SqlRoomRow;

      // Sync mission dossier on active match phase/round changes
      const inActiveMatch = roomRow.status === 'playing' || roomRow.status === 'voting' || roomRow.status === 'spy_guess';
      const phaseKey = `${cleanCode}:${roomRow.status}:${roomRow.round_num || 1}`;
      let activeDossier = dossierRef.current;

      if (inActiveMatch) {
        if (!activeDossier || activeDossier.role === 'waiting' || dossierPhaseKeyRef.current !== phaseKey) {
          const { data: dData } = await supabase.rpc('get_my_mission_dossier', { p_room_code: cleanCode });
          if (dData) {
            activeDossier = dData as MissionDossier;
            dossierRef.current = activeDossier;
            dossierPhaseKeyRef.current = phaseKey;
            setMissionDossier(activeDossier);
          }
        }
      } else {
        activeDossier = null;
        dossierRef.current = null;
        dossierPhaseKeyRef.current = '';
        setMissionDossier(null);
      }

      const isSpyViewer = activeDossier?.role === 'spy';

      const [
        { data: playerRows },
        { data: joinReqRows },
        { data: clueRows },
        { data: voteRows },
        { data: voteChatRows },
        { data: lobbyChatRows },
        spyRes
      ] = await Promise.all([
        supabase.from('room_players').select('*').eq('room_code', cleanCode).order('joined_at', { ascending: true }),
        roomRow.host_uid === activeUid
          ? supabase.from('join_requests').select('*').eq('room_code', cleanCode).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase.from('room_clues').select('*').eq('room_code', cleanCode).order('created_at', { ascending: true }),
        supabase.from('room_votes').select('*').eq('room_code', cleanCode),
        supabase.from('vote_chat').select('*').eq('room_code', cleanCode).order('created_at', { ascending: true }),
        supabase.from('lobby_chat').select('*').eq('room_code', cleanCode).order('created_at', { ascending: true }),
        isSpyViewer && roomRow.game_mode === 'mole'
          ? supabase.from('room_spy_messages').select('*').eq('room_code', cleanCode).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] })
      ]);

      const playersMap: Record<string, PlayerData> = {};
      (playerRows || []).forEach(pr => {
        const p = pr as SqlPlayerRow;
        playersMap[p.uid] = {
          uid: p.uid,
          name: p.name,
          avatar: p.avatar,
          joinedAt: toMs(p.joined_at),
          isSpectator: p.is_spectator,
          isBot: p.is_bot,
          postGame: p.post_game || null,
          isSilenced: p.is_silenced,
          disqualifiedVote: p.disqualified_vote,
          missedTurns: p.missed_turns
        };
      });

      if (!playersMap[activeUid]) {
        showToast(t.msgRemovedFromStation, 'danger');
        leaveRoom();
        return;
      }

      // Apply personal dossier safely without leaking opponents' secrets
      let spiesList: string[] | undefined = undefined;
      let secretWord: string | undefined = undefined;
      let secretWordAr: string | undefined = undefined;
      let undercoverUid: string | null = null;
      let finalPlayers: Record<string, PlayerData> | undefined = undefined;
      let finalSpies: string[] | undefined = undefined;

      if (roomRow.status === 'gameover') {
        secretWord = roomRow.revealed_word || undefined;
        secretWordAr = roomRow.revealed_word_ar || undefined;
        spiesList = roomRow.revealed_spies || [];
        finalSpies = roomRow.revealed_spies || [];
        if (roomRow.final_players) {
          finalPlayers = roomRow.final_players;
        }
      } else if (activeDossier && activeDossier.role !== 'waiting') {
        if (activeDossier.role === 'spy') {
          spiesList =
            activeDossier.fellowSpies && activeDossier.fellowSpies.length > 0
              ? activeDossier.fellowSpies
              : [activeUid];
          if (roomRow.game_mode === 'chameleon' && playersMap[activeUid]) {
            playersMap[activeUid].chameleonWord = activeDossier.word || '';
            playersMap[activeUid].chameleonWordAr = activeDossier.wordAr || '';
          }
        } else {
          secretWord = activeDossier.word || undefined;
          secretWordAr = activeDossier.wordAr || undefined;
          if (activeDossier.role === 'undercover') {
            undercoverUid = activeUid;
            spiesList = activeDossier.protectedSpyUid ? [activeDossier.protectedSpyUid] : [];
          } else {
            spiesList = [];
          }
        }
      }

      const joinReqMap: Record<string, JoinRequest> = {};
      (joinReqRows || []).forEach((jr: Record<string, unknown>) => {
        const uidKey = jr.uid as string;
        joinReqMap[uidKey] = {
          uid: uidKey,
          name: (jr.name as string) || 'Agent',
          avatar: (jr.avatar as string) || '',
          status: (jr.status as JoinRequest['status']) || 'pending',
          timestamp: toMs(jr.created_at as string) || Date.now()
        };
      });

      const gameChatMap: NonNullable<RoomData['gameChat']> = {};
      (clueRows || []).forEach((c: Record<string, unknown>) => {
        gameChatMap[c.id as string] = {
          uid: c.sender_uid as string,
          sender: c.sender_name as string,
          avatar: c.sender_avatar as string,
          text: c.clue_text as string,
          translations: c.translations as { ar: string; en: string } | undefined,
          isBot: Boolean(c.is_bot),
          round: Number(c.round_num) || 1,
          timestamp: toMs(c.created_at as string) || Date.now()
        };
      });

      const votesMap: Record<string, string> = {};
      (voteRows || []).forEach((v: Record<string, unknown>) => {
        votesMap[v.voter_uid as string] = v.target_uid as string;
      });

      const voteChatMap: NonNullable<RoomData['voteChat']> = {};
      (voteChatRows || []).forEach((vc: Record<string, unknown>) => {
        voteChatMap[vc.id as string] = {
          uid: vc.sender_uid as string,
          sender: vc.sender_name as string,
          avatar: vc.sender_avatar as string,
          text: vc.text as string,
          isBot: Boolean(vc.is_bot),
          timestamp: toMs(vc.created_at as string) || Date.now()
        };
      });

      const lobbyChatMap: NonNullable<RoomData['lobbyChat']> = {};
      (lobbyChatRows || []).forEach((lc: Record<string, unknown>) => {
        lobbyChatMap[lc.id as string] = {
          sender: lc.sender_name as string,
          text: lc.text as string
        };
      });

      const spyChatMap: NonNullable<RoomData['spyChat']> = {};
      ((spyRes as { data?: Record<string, unknown>[] })?.data || []).forEach(sc => {
        spyChatMap[sc.id as string] = {
          sender: sc.sender_name as string,
          text: sc.text as string
        };
      });

      const assembled: RoomData = {
        status: roomRow.status,
        originalHostUid: roomRow.original_host_uid || undefined,
        hostUid: roomRow.host_uid,
        categories: roomRow.categories || ['players'],
        customCategoryIds: roomRow.custom_category_ids || [],
        customCategorySnapshot: roomRow.custom_category_snapshot || undefined,
        activeCustomCategoryId: roomRow.active_custom_category_id || undefined,
        customCategoryWords: roomRow.custom_category_words || undefined,
        wordCustomCategoryName: roomRow.active_custom_category_name || undefined,
        wordCustomCategoryImage: roomRow.active_custom_category_image || undefined,
        allowSpyLastChance: Boolean(roomRow.allow_spy_last_chance),
        spyGuessCandidateUid: roomRow.spy_guess_candidate_uid || null,
        spyGuessOptions: roomRow.spy_guess_options || null,
        spyGuessEndsAt: toMs(roomRow.spy_guess_ends_at) ?? null,
        spyGuessResult: roomRow.spy_guess_result || null,
        spyCount: roomRow.spy_count,
        maxPlayers: roomRow.max_players,
        turnSeconds: roomRow.turn_seconds,
        visibility: roomRow.visibility,
        gameMode: roomRow.game_mode,
        createdAt: toMs(roomRow.created_at) || Date.now(),
        word: secretWord,
        wordAr: secretWordAr,
        wordCategory: (roomRow.active_word_category as CategoryKey) || undefined,
        spies: spiesList,
        undercoverUid,
        round: roomRow.round_num || 1,
        turnOrder: roomRow.turn_order || [],
        turnIndex: roomRow.turn_index || 0,
        turnTimeLeft: roomRow.turn_time_left ?? null,
        turnEndsAt: toMs(roomRow.turn_ends_at) ?? null,
        turnGraceUntil: toMs(roomRow.turn_grace_until) ?? null,
        completedTurnsThisRound: roomRow.completed_turns_this_round || {},
        voteEndsAt: toMs(roomRow.vote_ends_at) ?? null,
        votes: Object.keys(votesMap).length > 0 ? votesMap : null,
        winnerTeam: roomRow.winner_team || null,
        finalSpies,
        finalPlayers,
        players: playersMap,
        lobbyChat: lobbyChatMap,
        gameChat: gameChatMap,
        voteChat: Object.keys(voteChatMap).length > 0 ? voteChatMap : null,
        spyChat: spyChatMap,
        joinRequests: joinReqMap,
        announcement: roomRow.announcement || undefined,
        blackoutActive: Boolean(roomRow.blackout_active),
        blackoutEndsAt: toMs(roomRow.blackout_ends_at) ?? null,
        lastBlackoutRound: roomRow.last_blackout_round || 0,
        isQuickMatch: Boolean(roomRow.is_quick_match),
        ejectionEndsAt: toMs(roomRow.ejection_ends_at) ?? null,
        ejectionEvent: roomRow.ejection_event || null
      };

      lastRoomSnapshotRef.current = assembled;
      setRoomData(assembled);

      // Waiting lobby resets
      if (assembled.status === 'waiting') {
        lastSeenEjectionTimestampRef.current = 0;
        completedEjectionsRef.current.clear();
        if (playersMap[activeUid]?.isSpectator) {
          supabase
            .from('room_players')
            .update({ is_spectator: false })
            .eq('room_code', cleanCode)
            .eq('uid', activeUid)
            .then(() => {}, () => {});
        }
      }

      // If gameover and all remaining humans have returned to lobby, reset room cleanly
      if (
        assembled.status === 'gameover' &&
        activeUid === assembled.hostUid &&
        shouldResetGameOverToLobby(assembled.players)
      ) {
        supabase.rpc('reset_room_to_lobby', { p_room_code: cleanCode }).then(() => {}, () => {});
        return;
      }

      // Round transition popup announcement (once per round)
      if (assembled.status !== 'playing') {
        lastAnnouncedRoundRef.current = 0;
        setAnnouncedRound(null);
      } else if (assembled.round && assembled.round > lastAnnouncedRoundRef.current) {
        lastAnnouncedRoundRef.current = assembled.round;
        setAnnouncedRound(assembled.round);
        sound.playChime([[523, 0, 0.15], [659, 120, 0.15], [784, 240, 0.3]], 'sine');
        if (roundAnnounceTimerRef.current) clearTimeout(roundAnnounceTimerRef.current);
        roundAnnounceTimerRef.current = setTimeout(() => {
          setAnnouncedRound(null);
        }, ROUND_ANNOUNCE_MS);
      }
    } catch {
      // Transient load failure; next realtime tick retries
    }
  }, []);

  // Request to Join Room (Public lobby rooms require Host approval)
  const handleRequestJoinRoom = async (code: string) => {
    if (!currentUser) return;
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) return;

    try {
      const { data, error } = await supabase.rpc('lookup_room_for_join', { p_code: cleanCode });
      if (error || !data?.exists) {
        showToast(t.errStationNotExist, 'danger');
        return;
      }

      const info = data as {
        exists: boolean;
        status: string;
        visibility: string;
        hostUid: string;
        hostName?: string;
        isMember?: boolean;
        isInvited?: boolean;
      };

      if (
        info.hostUid === currentUser.id ||
        info.isMember ||
        info.isInvited ||
        info.status === 'playing' ||
        info.status === 'voting' ||
        info.status === 'spy_guess' ||
        info.visibility === 'private'
      ) {
        joinRoom(cleanCode);
        return;
      }

      // Public room in waiting lobby -> Host must approve
      const hostName = info.hostName || 'Commander';
      await supabase.from('join_requests').upsert(
        {
          room_code: cleanCode,
          uid: currentUser.id,
          name: profileNameRef.current || getUserMeta(currentUser).name,
          avatar: profileAvatarRef.current || getUserMeta(currentUser).avatar,
          status: 'pending'
        },
        { onConflict: 'room_code,uid' }
      );

      setPendingJoinApproval({ code: cleanCode, hostName, queuePosition: 1 });
      showToast(t.joinRequestPending, 'normal');

      if (pendingReqChannelRef.current) {
        supabase.removeChannel(pendingReqChannelRef.current);
      }

      const channel = supabase
        .channel(`join-req:${cleanCode}:${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'join_requests',
            filter: `room_code=eq.${cleanCode}`
          },
          payload => {
            const row = payload.new as { uid?: string; status?: string } | undefined;
            if (!row || row.uid !== currentUser.id) return;
            if (row.status === 'accepted') {
              supabase.removeChannel(channel);
              pendingReqChannelRef.current = null;
              setPendingJoinApproval(null);
              joinRoom(cleanCode);
              showToast(t.joinRequestAccepted, 'success');
            } else if (row.status === 'rejected') {
              supabase.removeChannel(channel);
              pendingReqChannelRef.current = null;
              supabase
                .from('join_requests')
                .delete()
                .eq('room_code', cleanCode)
                .eq('uid', currentUser.id)
                .then(() => {}, () => {});
              setPendingJoinApproval(null);
              showToast(t.joinRequestDeclined, 'danger');
            }
          }
        )
        .subscribe();

      pendingReqChannelRef.current = channel;
    } catch {
      showToast(t.errStationNotExist, 'danger');
    }
  };

  const handleCancelJoinRequest = async () => {
    if (pendingJoinApproval && currentUser) {
      if (pendingReqChannelRef.current) {
        supabase.removeChannel(pendingReqChannelRef.current);
        pendingReqChannelRef.current = null;
      }
      supabase
        .from('join_requests')
        .delete()
        .eq('room_code', pendingJoinApproval.code)
        .eq('uid', currentUser.id)
        .then(() => {}, () => {});
      setPendingJoinApproval(null);
    }
  };

  const handleAcceptJoinRequest = async (applicantUid: string) => {
    if (!currentRoomCode) return;
    sound.playTone(600, 'sine', 0.1);
    await supabase.rpc('accept_join_request', {
      p_room_code: currentRoomCode,
      p_applicant_uid: applicantUid
    });
    setTimeout(() => {
      if (currentRoomCode) {
        supabase
          .from('join_requests')
          .delete()
          .eq('room_code', currentRoomCode)
          .eq('uid', applicantUid)
          .then(() => {}, () => {});
      }
    }, 1500);
  };

  const handleDeclineJoinRequest = async (applicantUid: string) => {
    if (!currentRoomCode) return;
    sound.playTone(300, 'sine', 0.1);
    await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('room_code', currentRoomCode)
      .eq('uid', applicantUid);
    setTimeout(() => {
      if (currentRoomCode) {
        supabase
          .from('join_requests')
          .delete()
          .eq('room_code', currentRoomCode)
          .eq('uid', applicantUid)
          .then(() => {}, () => {});
      }
    }, 1500);
  };

  // Join Room lifecycle
  const joinRoom = async (code: string) => {
    if (!currentUser) return;
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCurrentRoomCode(cleanCode);
    localStorage.setItem('spy_station_room', cleanCode);
    requestWakeLock();

    const meta = getUserMeta(currentUser);
    const joinRes = await supabase.rpc('join_room_safe', {
      p_room_code: cleanCode,
      p_name: profileNameRef.current || meta.name,
      p_avatar: profileAvatarRef.current || meta.avatar
    });

    if (joinRes.error || !joinRes.data?.ok) {
      showToast(t.toastStationNotFound, 'danger');
      leaveRoom();
      return;
    }

    if (roomChannelRef.current) {
      supabase.removeChannel(roomChannelRef.current);
      roomChannelRef.current = null;
    }

    await loadRoomState(cleanCode, currentUser.id);

    const scheduleRoomRefresh = () => {
      if (roomRefreshTimerRef.current) clearTimeout(roomRefreshTimerRef.current);
      roomRefreshTimerRef.current = setTimeout(() => {
        loadRoomState(cleanCode, currentUser.id);
      }, 65);
    };

    const channel = supabase
      .channel(`room-live:${cleanCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_clues', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_votes', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vote_chat', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_chat', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_spy_messages', filter: `room_code=eq.${cleanCode}` }, scheduleRoomRefresh)
      .subscribe();

    roomChannelRef.current = channel;
  };

  const leaveRoom = async () => {
    voice.leaveVoice();
    localStorage.removeItem('spy_station_room');
    releaseWakeLock();
    lastAnnouncedRoundRef.current = 0;
    setAnnouncedRound(null);
    lastSeenEjectionTimestampRef.current = 0;
    completedEjectionsRef.current.clear();
    setActiveEjection(null);
    advancingTurnKeyRef.current = null;
    isResolvingVotesRef.current = false;
    dossierRef.current = null;
    dossierPhaseKeyRef.current = '';
    setMissionDossier(null);

    if (roundAnnounceTimerRef.current) {
      clearTimeout(roundAnnounceTimerRef.current);
      roundAnnounceTimerRef.current = null;
    }
    if (roomRefreshTimerRef.current) {
      clearTimeout(roomRefreshTimerRef.current);
      roomRefreshTimerRef.current = null;
    }
    if (roomChannelRef.current) {
      supabase.removeChannel(roomChannelRef.current);
      roomChannelRef.current = null;
    }

    const code = currentRoomCode;
    lastRoomSnapshotRef.current = null;
    setCurrentRoomCode(null);
    setRoomData(null);
    setActiveTab('home');

    if (code && currentUser?.id) {
      try {
        await supabase.rpc('leave_room_clean', { p_room_code: code });
      } catch (err) {
        console.error('Error during room leave cleanup:', err);
      }
    }
  };

  // Save / Delete Custom Category CRUD Handlers
  const handleSaveCustomCategory = async (payload: {
    id?: string;
    name: string;
    icon: string;
    image?: string;
    words: CustomCategoryWord[];
    isPublished: boolean;
  }) => {
    if (!currentUser) return;
    const nowIso = new Date().toISOString();

    if (payload.id) {
      await supabase
        .from('custom_categories')
        .update({
          name: payload.name,
          icon: payload.icon || '🎯',
          image_url: payload.image || '',
          words: payload.words,
          is_published: payload.isPublished,
          updated_at: nowIso
        })
        .eq('id', payload.id)
        .eq('creator_uid', currentUser.id);
    } else {
      await supabase.from('custom_categories').insert({
        creator_uid: currentUser.id,
        creator_name: profileNameRef.current || getUserMeta(currentUser).name,
        name: payload.name,
        icon: payload.icon || '🎯',
        image_url: payload.image || '',
        words: payload.words,
        is_published: payload.isPublished,
        play_count: 0
      });
    }

    await fetchCustomCategories();
  };

  const handleDeleteCustomCategory = async (catId: string) => {
    if (!currentUser || !catId) return;
    await supabase
      .from('custom_categories')
      .delete()
      .eq('id', catId)
      .eq('creator_uid', currentUser.id);

    const cached = customCategoriesCache.get('latest');
    if (cached && cached[catId]) {
      const next = { ...cached };
      delete next[catId];
      customCategoriesCache.set('latest', next);
    }
    await fetchCustomCategories();
  };

  // Create or Edit room flow
  const handleConfirmRoomConfig = async (config: {
    visibility: 'public' | 'private';
    categories: CategoryKey[];
    customCategoryIds: string[];
    gameMode: GameMode;
    maxPlayers: number;
    spyCount: number;
    turnSeconds: number;
    allowSpyLastChance: boolean;
  }) => {
    if (!currentUser) return;
    setInCreateModal(false);
    setCreateInitialCustomCategoryId(null);

    const snapshotMap: Record<string, RoomCustomCategorySnapshot> = {};
    (config.customCategoryIds || []).forEach(cId => {
      const found =
        allAvailableCustomCategories.find(c => c.id === cId) ||
        roomData?.customCategorySnapshot?.[cId];
      if (found && found.words?.length) {
        snapshotMap[cId] = {
          id: cId,
          name: found.name,
          icon: found.icon || '🎯',
          ...(found.image ? { image: found.image } : {}),
          words: found.words
        };
      }
    });

    if (isEditingRoom && currentRoomCode) {
      await supabase
        .from('rooms')
        .update({
          visibility: config.visibility,
          categories: config.categories,
          custom_category_ids: config.customCategoryIds || [],
          custom_category_snapshot: Object.keys(snapshotMap).length > 0 ? snapshotMap : null,
          game_mode: config.gameMode,
          max_players: config.maxPlayers,
          spy_count: config.spyCount,
          turn_seconds: config.turnSeconds,
          allow_spy_last_chance: Boolean(config.allowSpyLastChance)
        })
        .eq('code', currentRoomCode);

      setIsEditingRoom(false);
      showToast(t.msgSettingsSaved, 'success');
    } else {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const meta = getUserMeta(currentUser);
      const myName = profileNameRef.current || meta.name;
      const myAvatar = profileAvatarRef.current || meta.avatar;

      const { error: rErr } = await supabase.from('rooms').insert({
        code,
        original_host_uid: currentUser.id,
        host_uid: currentUser.id,
        host_name: myName,
        status: 'waiting',
        visibility: config.visibility,
        game_mode: config.gameMode,
        categories: config.categories,
        custom_category_ids: config.customCategoryIds || [],
        custom_category_snapshot: Object.keys(snapshotMap).length > 0 ? snapshotMap : null,
        allow_spy_last_chance: Boolean(config.allowSpyLastChance),
        spy_count: config.spyCount,
        max_players: config.maxPlayers,
        turn_seconds: config.turnSeconds
      });

      if (rErr) {
        showToast(t.errActionFailed, 'danger');
        return;
      }

      await supabase.from('room_players').insert({
        room_code: code,
        uid: currentUser.id,
        name: myName,
        avatar: myAvatar,
        is_spectator: false,
        is_bot: false
      });

      joinRoom(code);
    }
  };

  // Add simulated bot astronaut
  const handleAddBot = async () => {
    if (!currentRoomCode || !roomData) return;
    const playersObj = roomData.players || {};
    const currentCount = Object.keys(playersObj).length;
    const maxP = roomData.maxPlayers || 20;
    if (currentCount >= maxP) return;

    const name = generateUniqueBotName(playersObj, lang);
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sound.playClick();
    await supabase.from('room_players').insert({
      room_code: currentRoomCode,
      uid: botId,
      name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      is_spectator: false,
      is_bot: true
    });
  };

  const handleRemoveBots = async () => {
    if (!currentRoomCode || !roomData) return;
    sound.playClick();
    await supabase
      .from('room_players')
      .delete()
      .eq('room_code', currentRoomCode)
      .eq('is_bot', true);
  };

  // Start game flow (Server picks word, chameleon decoy & spies inside Postgres!)
  const handleStartGame = async () => {
    if (!currentRoomCode || !roomData) return;
    sound.playClick();

    try {
      const validation = validateGameStart(roomData);
      if (!validation.ok) return;

      const builtInCats = roomData.categories || [];
      const customIds = roomData.customCategoryIds || [];
      const customPool: RoomCustomCategorySnapshot[] = [];
      customIds.forEach(cId => {
        const snapDeck = roomData.customCategorySnapshot?.[cId];
        const liveDeck = allAvailableCustomCategories.find(c => c.id === cId);
        const resolvedDeck = liveDeck || snapDeck;
        if (resolvedDeck && resolvedDeck.words && resolvedDeck.words.length > 0) {
          customPool.push({
            id: cId,
            name: resolvedDeck.name,
            icon: resolvedDeck.icon || '🎯',
            ...(resolvedDeck.image ? { image: resolvedDeck.image } : {}),
            words: resolvedDeck.words
          });
        }
      });

      type PoolChoice =
        | { kind: 'builtin'; cat: CategoryKey }
        | { kind: 'custom'; deck: RoomCustomCategorySnapshot };
      const combinedPool: PoolChoice[] = [
        ...builtInCats.map(cat => ({ kind: 'builtin' as const, cat })),
        ...customPool.map(deck => ({ kind: 'custom' as const, deck }))
      ];
      if (combinedPool.length === 0) {
        combinedPool.push({ kind: 'builtin', cat: 'players' });
      }

      const pickedChoice = combinedPool[Math.floor(Math.random() * combinedPool.length)];
      let chosenCat: CategoryKey = 'players';
      let candidates: Array<{ en: string; ar: string; botCrewClues: Array<{ en: string; ar: string }> }> = [];
      let customCatId: string | null = null;
      let customCatName: string | null = null;
      let customCatImage: string | null = null;
      let customWords: CustomCategoryWord[] | null = null;

      if (pickedChoice.kind === 'custom') {
        const deck = pickedChoice.deck;
        const shuffledDeck = shuffleArray(deck.words).slice(0, 24);
        candidates = shuffledDeck.map(w => ({
          en: w.en,
          ar: w.ar || w.en,
          botCrewClues: getBotClueBankForWord(w.en, w.ar || w.en, 'players')
        }));
        customCatId = deck.id;
        customCatName = deck.name;
        customCatImage = deck.image || null;
        customWords = deck.words;
      } else {
        chosenCat = pickedChoice.cat;
        const rawList = wordsDB[chosenCat] || wordsDB.players;
        const shuffledList = shuffleArray(rawList).slice(0, 24);
        candidates = shuffledList.map(([en, ar]) => ({
          en,
          ar: ar || en,
          botCrewClues: getBotClueBankForWord(en, ar || en, chosenCat)
        }));
      }

      lastAnnouncedRoundRef.current = 0;
      lastSeenEjectionTimestampRef.current = 0;
      completedEjectionsRef.current.clear();

      const { error } = await supabase.rpc('start_room_match', {
        p_room_code: currentRoomCode,
        p_word_category: chosenCat,
        p_word_candidates: candidates,
        p_custom_cat_id: customCatId,
        p_custom_cat_name: customCatName,
        p_custom_cat_image: customCatImage,
        p_custom_words: customWords,
        p_bot_spy_clues: getBotSpyClueBank(chosenCat),
        p_ann_msg: t.annMissionStarted
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to start mission:', err);
      showToast(t.toastGameStartError, 'danger');
    }
  };

  if (loading) {
    return <AppBootSkeleton lang={lang} />;
  }

  if (!currentUser) {
    return (
      <>
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <AuthScreen
          lang={lang}
          onToggleLanguage={() => setLang(l => (l === 'ar' ? 'en' : 'ar'))}
          onChangeLanguage={l => setLang(l)}
          onToast={showToast}
        />
        {mandatoryUpdateAvailable && (
          <MandatoryUpdateModal
            lang={lang}
            targetVersion={CURRENT_APP_VERSION}
            onUpdateCompleted={() => setMandatoryUpdateAvailable(false)}
          />
        )}
      </>
    );
  }

  if (inCreateModal) {
    return (
      <div className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-none flex flex-col items-center justify-start p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] bg-[#030712] relative">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <CreateRoomScreen
          lang={lang}
          initialCategory={createInitialCategory}
          initialCustomCategoryId={createInitialCustomCategoryId}
          customCategories={allAvailableCustomCategories}
          isEditing={isEditingRoom}
          initialValues={
            isEditingRoom && roomData
              ? {
                  visibility: roomData.visibility,
                  categories: roomData.categories,
                  customCategoryIds: roomData.customCategoryIds,
                  gameMode:
                    (roomData.gameMode as string) === 'silent' || (roomData.gameMode as string) === 'blackout'
                      ? 'normal'
                      : roomData.gameMode,
                  maxPlayers: roomData.maxPlayers,
                  spyCount: roomData.spyCount,
                  turnSeconds: roomData.turnSeconds,
                  allowSpyLastChance: roomData.allowSpyLastChance
                }
              : undefined
          }
          onConfirm={handleConfirmRoomConfig}
          onCancel={() => {
            setInCreateModal(false);
            setIsEditingRoom(false);
            setCreateInitialCustomCategoryId(null);
          }}
          onToast={showToast}
        />
      </div>
    );
  }

  if (currentRoomCode && !roomData) {
    return <RoomLobbySkeleton lang={lang} roomCode={currentRoomCode} />;
  }

  if (currentRoomCode && roomData) {
    const isPlaying = roomData.status === 'playing';
    const isVoting = roomData.status === 'voting';
    const isSpyGuess = roomData.status === 'spy_guess';
    const isGameOver = roomData.status === 'gameover';
    const myPlayer = (roomData.players || {})[currentUser.id];

    return (
      <div className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-none flex flex-col items-center justify-start p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] bg-[#030712] relative selection:bg-sky-500/30">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />

        <InviteFriendsModal
          lang={lang}
          currentUserUid={currentUser.id}
          currentUserName={profileName}
          currentUserAvatar={profileAvatar}
          roomCode={currentRoomCode}
          friends={friends}
          friendStatuses={friendStatuses}
          currentRoomPlayers={roomData.players || {}}
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          onToast={showToast}
        />

        {announcedRound !== null && <RoundAnnounceModal lang={lang} round={announcedRound} />}

        {isPlaying ? (
          <GameScreen
            lang={lang}
            currentUserUid={currentUser.id}
            roomCode={currentRoomCode}
            room={roomData}
            serverTimeOffsetMs={serverTimeOffsetMs}
            isVoiceJoined={voice.isJoined}
            isVoiceMuted={voice.isMuted}
            isVoiceDeafened={voice.isDeafened}
            isVoiceSpeaking={voice.isSpeaking}
            voiceUsers={voice.voiceUsers}
            onJoinVoice={voice.joinVoice}
            onLeaveVoice={voice.leaveVoice}
            onToggleVoiceMute={voice.toggleMute}
            onToggleVoiceDeafen={voice.toggleDeafen}
            onAdvanceTurn={() => advanceTurn(roomData?.turnIndex, false, roomData?.round)}
            onTriggerEmergencyVote={() => {
              supabase
                .rpc('trigger_emergency_vote', {
                  p_room_code: currentRoomCode,
                  p_ann_msg: t.annEmergencyVote
                })
                .then(() => {}, () => {});
            }}
            onSendGameClue={(word, targetRound, targetTurnIndex) => {
              supabase
                .rpc('submit_room_clue', {
                  p_room_code: currentRoomCode,
                  p_word: word,
                  p_target_round: targetRound,
                  p_target_turn_index: targetTurnIndex
                })
                .then(() => {}, () => {});
            }}
            onAwardCrewXP={() => {}}
            onSendSpyChat={msg => {
              supabase
                .from('room_spy_messages')
                .insert({
                  room_code: currentRoomCode,
                  sender_uid: currentUser.id,
                  sender_name: profileNameRef.current || 'Agent',
                  text: msg
                })
                .then(() => {}, () => {});
            }}
            onToast={showToast}
            onLeaveRoom={leaveRoom}
          />
        ) : isVoting ? (
          <VotingScreen
            lang={lang}
            currentUserUid={currentUser.id}
            room={roomData}
            serverTimeOffsetMs={serverTimeOffsetMs}
            onCastVote={target => {
              supabase
                .from('room_votes')
                .upsert(
                  { room_code: currentRoomCode, voter_uid: currentUser.id, target_uid: target },
                  { onConflict: 'room_code,voter_uid' }
                )
                .then(() => {}, () => {});
            }}
            onSendVoteChat={txt => {
              supabase
                .from('vote_chat')
                .insert({
                  room_code: currentRoomCode,
                  sender_uid: currentUser.id,
                  sender_name: profileNameRef.current || 'Agent',
                  sender_avatar: profileAvatarRef.current || '',
                  text: txt,
                  is_bot: false
                })
                .then(() => {}, () => {});
            }}
          />
        ) : isSpyGuess ? (
          <SpyLastChanceScreen
            lang={lang}
            currentUserUid={currentUser.id}
            room={roomData}
            serverTimeOffsetMs={serverTimeOffsetMs}
            onSubmitGuess={opt => handleSubmitSpyGuess(opt.en)}
          />
        ) : isGameOver && myPlayer?.postGame !== 'inLobby' ? (
          <GameOverScreen
            lang={lang}
            room={roomData}
            onReturnToLobby={async () => {
              await supabase.rpc('return_to_lobby_after_game', { p_room_code: currentRoomCode });
            }}
            onLeaveRoom={leaveRoom}
          />
        ) : (
          <LobbyScreen
            lang={lang}
            currentUserUid={currentUser.id}
            roomCode={currentRoomCode}
            room={roomData}
            isHost={isHost}
            friends={friends}
            sentRequests={sentRequests}
            friendRequests={friendRequests}
            isVoiceJoined={voice.isJoined}
            isVoiceMuted={voice.isMuted}
            isVoiceDeafened={voice.isDeafened}
            isVoiceSpeaking={voice.isSpeaking}
            voiceUsers={voice.voiceUsers}
            onJoinVoice={voice.joinVoice}
            onLeaveVoice={voice.leaveVoice}
            onToggleVoiceMute={voice.toggleMute}
            onToggleVoiceDeafen={voice.toggleDeafen}
            onCopyRoomCode={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(currentRoomCode);
              }
            }}
            onOpenEditRoom={() => {
              setIsEditingRoom(true);
              setInCreateModal(true);
            }}
            onOpenInviteFriends={() => setInviteModalOpen(true)}
            onStartGame={handleStartGame}
            onAddBot={handleAddBot}
            onRemoveBots={handleRemoveBots}
            onLeaveRoom={leaveRoom}
            onMakeHost={uid => {
              const targetPlayer = roomData?.players?.[uid];
              if (isBotPlayer(targetPlayer, uid)) return;
              supabase
                .from('rooms')
                .update({ host_uid: uid, host_name: targetPlayer?.name || 'Commander' })
                .eq('code', currentRoomCode)
                .then(() => {}, () => {});
            }}
            onKickPlayer={uid => {
              supabase
                .from('room_players')
                .delete()
                .eq('room_code', currentRoomCode)
                .eq('uid', uid)
                .then(() => {}, () => {});
            }}
            onSendFriendRequest={async targetUid => {
              await supabase.from('friend_requests').upsert(
                { sender_uid: currentUser.id, recipient_uid: targetUid },
                { onConflict: 'sender_uid,recipient_uid' }
              );
              reloadSocialData(currentUser);
            }}
            onAcceptFriendRequest={async uid => {
              await supabase.rpc('accept_friend_request', { p_sender_uid: uid });
              reloadSocialData(currentUser);
            }}
            onSendChatMessage={txt => {
              supabase
                .from('lobby_chat')
                .insert({
                  room_code: currentRoomCode,
                  sender_uid: currentUser.id,
                  sender_name: profileNameRef.current || 'Agent',
                  text: txt
                })
                .then(() => {}, () => {});
            }}
            onAcceptJoinRequest={handleAcceptJoinRequest}
            onDeclineJoinRequest={handleDeclineJoinRequest}
            onToast={showToast}
          />
        )}

        {isHost && roomData && (() => {
          const pendingList = Object.values(roomData.joinRequests || {})
            .filter((r: unknown): r is JoinRequest => !!r && (r as JoinRequest).status === 'pending')
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const activeReq = pendingList[0] || null;
          return activeReq ? (
            <HostJoinApprovalModal
              lang={lang}
              request={activeReq}
              queueIndex={1}
              queueTotal={pendingList.length}
              onAccept={handleAcceptJoinRequest}
              onDecline={handleDeclineJoinRequest}
            />
          ) : null;
        })()}

        {activeEjection && (
          <CinematicEjectionOverlay
            key={activeEjection.timestamp}
            lang={lang}
            ejectedPlayerName={activeEjection.name}
            ejectedPlayerAvatar={activeEjection.avatar}
            isSpy={activeEjection.isSpy}
            onComplete={handleEjectionComplete}
          />
        )}
      </div>
    );
  }

  const badgeCount = Object.keys(friendRequests || {}).length + Object.keys(roomInvites || {}).length;

  return (
    <div className="h-full max-h-full w-full flex flex-col overflow-hidden bg-[#030712] relative selection:bg-sky-500/30">
      <div className="stars-overlay" />
      <OfflineIndicator lang={lang} />

      <RankModal
        lang={lang}
        xp={userXp}
        isOpen={rankModalOpen}
        onClose={() => setRankModalOpen(false)}
      />

      <QuickMatchModal
        lang={lang}
        currentUserUid={currentUser.id}
        currentUserName={profileName}
        currentUserAvatar={profileAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`}
        isOpen={quickMatchModalOpen}
        onClose={() => setQuickMatchModalOpen(false)}
        onMatchFound={code => {
          joinRoom(code);
        }}
        onToast={showToast}
      />

      {activeEjection && (
        <CinematicEjectionOverlay
          key={activeEjection.timestamp}
          lang={lang}
          ejectedPlayerName={activeEjection.name}
          ejectedPlayerAvatar={activeEjection.avatar}
          isSpy={activeEjection.isSpy}
          onComplete={handleEjectionComplete}
        />
      )}

      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-none px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-4 relative z-10">
        {activeTab === 'home' && (
          <HomeTab
            lang={lang}
            userName={profileName}
            userAvatar={profileAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.id}`}
            userXp={userXp}
            onOpenRank={() => setRankModalOpen(true)}
            onOpenQuickMatch={() => setQuickMatchModalOpen(true)}
            onOpenCreateRoom={cat => {
              setCreateInitialCategory(cat);
              setCreateInitialCustomCategoryId(null);
              setIsEditingRoom(false);
              setInCreateModal(true);
            }}
            onJoinRoom={handleRequestJoinRoom}
          />
        )}

        {activeTab === 'stations' && (
          <StationsTab
            lang={lang}
            publicRooms={publicRooms}
            isLoading={publicRoomsLoading}
            hasMore={hasMoreStations}
            onLoadMore={() => setStationsLimit(l => l + 12)}
            onJoinRoom={handleRequestJoinRoom}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsTab
            lang={lang}
            myFriendCode={myFriendCode}
            friends={friends}
            friendStatuses={friendStatuses}
            friendRequests={friendRequests}
            roomInvites={roomInvites}
            isLoading={friendsLoading}
            onCopyCode={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(myFriendCode);
              }
            }}
            onSendRequest={async code => {
              const { data: status } = await supabase.rpc('send_friend_request_by_code', {
                p_code: code.trim().toUpperCase()
              });
              if (status === 'sent') {
                reloadSocialData(currentUser);
                showToast(t.msgRequestSent, 'success');
              } else if (status === 'cannot_add_self') {
                showToast(t.errCannotAddSelf, 'danger');
              } else if (status === 'already_friends') {
                showToast(t.errAlreadyFriends, 'danger');
              } else if (status === 'already_sent') {
                showToast(t.errRequestAlreadySent, 'danger');
              } else {
                showToast(t.errFriendCodeNotFound, 'danger');
              }
            }}
            onAcceptRequest={async fromUid => {
              await supabase.rpc('accept_friend_request', { p_sender_uid: fromUid });
              reloadSocialData(currentUser);
              showToast(t.msgFriendAdded, 'success');
            }}
            onDeclineRequest={async fromUid => {
              await supabase
                .from('friend_requests')
                .delete()
                .eq('sender_uid', fromUid)
                .eq('recipient_uid', currentUser.id);
              reloadSocialData(currentUser);
            }}
            onRemoveFriend={async uid => {
              await supabase.rpc('remove_friendship', { p_friend_uid: uid });
              reloadSocialData(currentUser);
              showToast(t.msgFriendRemoved);
            }}
            onJoinFromInvite={async (fromUid, rCode) => {
              await supabase
                .from('room_invites')
                .delete()
                .eq('recipient_uid', currentUser.id)
                .eq('sender_uid', fromUid);
              reloadSocialData(currentUser);
              joinRoom(rCode);
            }}
            onDismissInvite={async fromUid => {
              await supabase
                .from('room_invites')
                .delete()
                .eq('recipient_uid', currentUser.id)
                .eq('sender_uid', fromUid);
              reloadSocialData(currentUser);
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesTab
            lang={lang}
            currentUserUid={currentUser.id}
            currentUserName={profileName}
            myCategories={myCategories}
            communityCategories={communityCategories}
            isLoading={customCatsLoading}
            hasMoreCommunity={hasMoreCommunityCats}
            onLoadMoreCommunity={() => setCommunityCatLimit(l => l + 12)}
            onSaveCategory={handleSaveCustomCategory}
            onDeleteCategory={handleDeleteCustomCategory}
            onPlayCategory={catId => {
              setCreateInitialCustomCategoryId(catId);
              setIsEditingRoom(false);
              setInCreateModal(true);
            }}
            onToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            lang={lang}
            userId={currentUser.id}
            userName={profileName}
            userAvatar={profileAvatar}
            onUpdateProfile={async (newName, newAvatar) => {
              setProfileName(newName);
              setProfileAvatar(newAvatar);

              const isWebUrl =
                typeof newAvatar === 'string' &&
                (newAvatar.startsWith('http://') || newAvatar.startsWith('https://'));

              await Promise.all([
                supabase
                  .from('profiles')
                  .update({
                    name: newName,
                    avatar: newAvatar,
                    updated_at: new Date().toISOString()
                  })
                  .eq('uid', currentUser.id),
                supabase.auth.updateUser({
                  data: {
                    full_name: newName,
                    name: newName,
                    ...(isWebUrl ? { avatar_url: newAvatar } : {})
                  }
                })
              ]).catch(() => {});

              userProfileCache.set(currentUser.id, {
                name: newName,
                avatar: newAvatar,
                friendCode: myFriendCode
              });

              if (currentRoomCode) {
                supabase
                  .from('room_players')
                  .update({ name: newName, avatar: newAvatar })
                  .eq('room_code', currentRoomCode)
                  .eq('uid', currentUser.id)
                  .then(() => {}, () => {});

                if (roomData && roomData.hostUid === currentUser.id) {
                  supabase
                    .from('rooms')
                    .update({ host_name: newName })
                    .eq('code', currentRoomCode)
                    .then(() => {}, () => {});
                }
              }
            }}
            onChangeLanguage={l => setLang(l)}
            onLogout={async () => {
              try {
                await supabase
                  .from('player_presence')
                  .upsert({ uid: currentUser.id, state: 'offline', last_changed: new Date().toISOString() }, { onConflict: 'uid' });
              } catch {
                // Ignore presence write failure on sign-out
              } finally {
                await supabase.auth.signOut();
              }
            }}
            onToast={showToast}
          />
        )}
      </main>

      {pendingJoinApproval && (
        <ApplicantWaitingApprovalModal
          lang={lang}
          roomCode={pendingJoinApproval.code}
          hostName={pendingJoinApproval.hostName}
          queuePosition={pendingJoinApproval.queuePosition}
          onCancel={handleCancelJoinRequest}
        />
      )}

      <BottomNav
        lang={lang}
        currentTab={activeTab}
        badgeCount={badgeCount}
        onSelectTab={setActiveTab}
      />

      {mandatoryUpdateAvailable && (
        <MandatoryUpdateModal
          lang={lang}
          targetVersion={CURRENT_APP_VERSION}
          onUpdateCompleted={() => setMandatoryUpdateAvailable(false)}
        />
      )}
    </div>
  );
}
