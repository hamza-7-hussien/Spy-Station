/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { auth, db, firebase } from './firebase';
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
  JoinRequest
} from './types';
import { getCombinedWordList, wordsDB, getSmartTwinWord } from './words';
import { AuthScreen } from './screens/AuthScreen';
import { HomeTab } from './screens/HomeTab';
import { StationsTab } from './screens/StationsTab';
import { FriendsTab } from './screens/FriendsTab';
import { SettingsTab } from './screens/SettingsTab';
import { CreateRoomScreen } from './screens/CreateRoomScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
import { VotingScreen } from './screens/VotingScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { RoundAnnounceModal } from './screens/RoundAnnounceModal';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { RankModal } from './components/RankModal';
import { AppBootSkeleton, RoomLobbySkeleton } from './components/Skeletons';
import { HostJoinApprovalModal } from './components/HostJoinApprovalModal';
import { ApplicantWaitingApprovalModal } from './components/ApplicantWaitingApprovalModal';
import { QuickMatchModal } from './components/QuickMatchModal';
import { friendCodeCache, publicRoomsCache, userProfileCache } from './utils/cache';
import { CinematicEjectionOverlay } from './components/CinematicEjectionOverlay';
import {
  generateSmartBotCluePair,
  generateSmartBotVote,
  generateUniqueBotName
} from './aiBot';
import { useVoiceChat } from './hooks/useVoiceChat';
import { MandatoryUpdateModal } from './components/MandatoryUpdateModal';
import { saveAccountProfile } from './utils/savedAccounts';
import {
  DEFAULT_VOTE_SECONDS,
  ROUND_GRACE_MS,
  areAllEligibleVotesSubmitted,
  computeInitialGameSetup,
  computeNextTurnState,
  getEffectiveTurnSeconds,
  getEligibleVoters,
  isBotPlayer,
  resolveVoteOutcome,
  shouldResetGameOverToLobby,
  validateGameStart
} from './gameEngine';

function toFirebaseUpdatePayload(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, val]) => {
    out[key] = val === undefined ? null : val;
  });
  return out;
}

const CURRENT_APP_VERSION = '2.9.2';
const ROUND_ANNOUNCE_MS = 2400;

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
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [profileName, setProfileName] = useState('Agent');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [userXp, setUserXp] = useState(0);

  // Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'stations' | 'friends' | 'settings'>('home');
  const [inCreateModal, setInCreateModal] = useState(false);
  const [createInitialCategory, setCreateInitialCategory] = useState<CategoryKey | 'random'>('players');
  const [isEditingRoom, setIsEditingRoom] = useState(false);

  // In-room state
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
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

  // Public rooms (SWR-cached + indexed + paginated)
  const [publicRooms, setPublicRooms] = useState<Record<string, RoomData>>(() => publicRoomsCache.get('latest') || {});
  const [publicRoomsLoading, setPublicRoomsLoading] = useState(true);
  const [stationsLimit, setStationsLimit] = useState(12);
  const [hasMoreStations, setHasMoreStations] = useState(false);

  // Modals
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [quickMatchModalOpen, setQuickMatchModalOpen] = useState(false);

  // Dynamic Adaptive Espionage Background Music (Ambient vs Suspense)
  useEffect(() => {
    if (!roomData) {
      sound.setBgmMode('ambient');
      return;
    }
    if (roomData.status === 'playing' || roomData.status === 'voting') {
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
  const roomListenerRef = useRef<(() => void) | null>(null);
  const annListenerRef = useRef<(() => void) | null>(null);
  const turnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTurnTickRunningRef = useRef(false);
  const isVoteTickRunningRef = useRef(false);
  const isResolvingVotesRef = useRef(false);
  const advancingTurnKeyRef = useRef<string | null>(null);
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);
  const serverTimeOffsetRef = useRef(0);
  const getServerNow = useCallback(() => Date.now() + serverTimeOffsetRef.current, []);
  const purgedRoomsRef = useRef<Map<string, number>>(new Map());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastRoomSnapshotRef = useRef<RoomData | null>(null);
  const pendingReqCleanupsRef = useRef<(() => void) | null>(null);
  const activeFriendListenersRef = useRef<(() => void)[]>([]);
  const profileNameRef = useRef(profileName);
  const profileAvatarRef = useRef(profileAvatar);

  useEffect(() => {
    const offsetRef = db.ref('.info/serverTimeOffset');
    const onOffset = (snap: firebase.database.DataSnapshot) => {
      const val = Number(snap.val()) || 0;
      serverTimeOffsetRef.current = val;
      setServerTimeOffsetMs(val);
    };
    offsetRef.on('value', onOffset);
    return () => {
      offsetRef.off('value', onOffset);
    };
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
    currentUserUid: currentUser?.uid || '',
    currentUserName: profileName || currentUser?.displayName || 'Agent',
    onToast: showToast,
    permissionErrorMsg: t.voicePermissionError
  });

  // Auto-join voice room in listen-only mode (Mic OFF, Headphones ON) when entering a room
  const voiceAutoJoinedRoomRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentRoomCode || !currentUser?.uid) {
      voiceAutoJoinedRoomRef.current = null;
      return;
    }
    if (voiceAutoJoinedRoomRef.current !== currentRoomCode) {
      voiceAutoJoinedRoomRef.current = currentRoomCode;
      voice.joinVoice(true);
    }
  }, [currentRoomCode, currentUser?.uid, voice.joinVoice]);

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
    const interval = setInterval(checkUpdate, 60000); // Check every 60s
    return () => clearInterval(interval);
  }, []);

  // Auth listener with redirect recovery, RTDB profile bootstrap, and persistent session maintenance
  useEffect(() => {
    auth
      .getRedirectResult()
      .then(res => {
        if (res?.user) {
          const u = res.user;
          const fallbackName = u.displayName || (u.email ? u.email.split('@')[0] : 'Agent');
          const fallbackAvatar =
            u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackName || u.uid)}`;
          db.ref(`users/${u.uid}`)
            .once('value')
            .then(snap => {
              const val = snap.val() || {};
              const patch: Record<string, unknown> = {};
              if (!val.name) patch.name = fallbackName;
              if (!val.avatar) patch.avatar = fallbackAvatar;
              if (!val.createdAt) patch.createdAt = firebase.database.ServerValue.TIMESTAMP;
              if (Object.keys(patch).length > 0) {
                db.ref(`users/${u.uid}`).update(patch).catch(() => {});
              }
            })
            .catch(() => {});
        }
      })
      .catch(err => {
        if (err?.message) {
          console.warn('Redirect sign-in notice:', err);
        }
      });

    const unsub = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('spy_station_has_session', 'true');
        const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'Agent');
        const fallbackAvatar =
          user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fallbackName || user.uid)}`;

        setProfileName(fallbackName);
        setProfileAvatar(fallbackAvatar);
        user.getIdToken(false).catch(() => {});

        const providerKind = user.providerData?.some(p => p?.providerId === 'google.com')
          ? 'google'
          : 'password';
        if (user.email) {
          saveAccountProfile({
            uid: user.uid,
            email: user.email,
            name: fallbackName,
            avatar: fallbackAvatar,
            provider: providerKind
          });
        }

        db.ref(`users/${user.uid}`)
          .once('value')
          .then(snap => {
            const val = snap.val() || {};
            const patch: Record<string, unknown> = {};
            if (!val.name) patch.name = fallbackName;
            if (!val.avatar) patch.avatar = fallbackAvatar;
            if (!val.createdAt) patch.createdAt = firebase.database.ServerValue.TIMESTAMP;
            if (Object.keys(patch).length > 0) {
              db.ref(`users/${user.uid}`).update(patch).catch(() => {});
            }
            if (user.email) {
              saveAccountProfile({
                uid: user.uid,
                email: user.email,
                name: val.name || fallbackName,
                avatar: val.avatar || fallbackAvatar,
                provider: providerKind
              });
            }
          })
          .catch(() => {});
      } else {
        localStorage.removeItem('spy_station_has_session');
      }
      setLoading(false);
    });
    return () => unsub();
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

  // User Data & Presence (with proper listener cleanup on logout/unmount)
  useEffect(() => {
    if (!currentUser) {
      setFriends({});
      setFriendStatuses({});
      setFriendRequests({});
      setSentRequests({});
      setRoomInvites({});
      setPublicRooms({});
      return;
    }

    let isCancelled = false;

    // Realtime Profile Sync
    const profileRef = db.ref(`users/${currentUser.uid}`);
    const onProfileChange = (snap: firebase.database.DataSnapshot) => {
      const data = snap.val();
      if (data) {
        if (data.name) setProfileName(data.name);
        if (data.avatar) setProfileAvatar(data.avatar);
        userProfileCache.set(currentUser.uid, {
          name: data.name,
          avatar: data.avatar,
          friendCode: data.friendCode
        });
        if (currentUser.email) {
          saveAccountProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            name: data.name || currentUser.displayName || currentUser.email.split('@')[0] || 'Agent',
            avatar: data.avatar || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
            provider: currentUser.providerData?.some(p => p?.providerId === 'google.com') ? 'google' : 'password'
          });
        }
      }
    };
    profileRef.on('value', onProfileChange);

    // Presence
    const statusRef = db.ref(`status/${currentUser.uid}`);
    const connectedRef = db.ref('.info/connected');
    const onConnectedChange = (snap: firebase.database.DataSnapshot) => {
      if (snap.val() === true) {
        statusRef
          .onDisconnect()
          .set({
            state: 'offline',
            last_changed: firebase.database.ServerValue.TIMESTAMP
          })
          .then(() => {
            if (!isCancelled) {
              statusRef.set({
                state: 'online',
                last_changed: firebase.database.ServerValue.TIMESTAMP
              });
            }
          })
          .catch(() => {});
      }
    };
    connectedRef.on('value', onConnectedChange);

    // Score / XP
    const scoreRef = db.ref(`users/${currentUser.uid}/score`);
    const onScoreChange = (snap: firebase.database.DataSnapshot) => {
      setUserXp(snap.val() || 0);
    };
    scoreRef.on('value', onScoreChange);

    // Friend code lookup & migration
    const codeRef = db.ref(`users/${currentUser.uid}/friendCode`);
    codeRef.once('value').then(async snap => {
      if (isCancelled) return;
      const code = snap.val();
      if (!code || code.length !== 8) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let candidate = '';
        let claimed = false;
        let tries = 0;
        while (!claimed && tries < 25 && !isCancelled) {
          tries++;
          candidate = '';
          for (let i = 0; i < 8; i++) candidate += chars.charAt(Math.floor(Math.random() * chars.length));
          const res = await db
            .ref(`friendCodes/${candidate}`)
            .transaction(cur => (cur === null ? currentUser.uid : undefined));
          if (res.committed) claimed = true;
        }
        if (claimed && !isCancelled) {
          await db.ref(`users/${currentUser.uid}/friendCode`).set(candidate);
          if (code) await db.ref(`friendCodes/${code}`).remove();
          setMyFriendCode(candidate);
        }
      } else {
        setMyFriendCode(code);
      }
    }).catch(() => {});

    // Friends list (TTL-cached profile hydration + bounded presence subscriptions to eliminate N+1 reads)
    setFriendsLoading(true);
    const friendsRef = db.ref(`users/${currentUser.uid}/friends`);
    const onFriendsChange = (snap: firebase.database.DataSnapshot) => {
      const f = (snap.val() || {}) as Record<string, FriendEntry>;
      const friendUids = Object.keys(f);

      // Apply cached friend profiles synchronously first
      const hydrated: Record<string, FriendEntry> = { ...f };
      const staleUids: string[] = [];
      for (const fUid of friendUids) {
        const cached = userProfileCache.get(fUid);
        if (cached) {
          hydrated[fUid] = {
            ...hydrated[fUid],
            name: cached.name || hydrated[fUid].name,
            avatar: cached.avatar || hydrated[fUid].avatar
          };
        } else {
          staleUids.push(fUid);
        }
      }
      setFriends(hydrated);
      setFriendsLoading(false);

      activeFriendListenersRef.current.forEach(cleanup => cleanup());
      activeFriendListenersRef.current = [];

      // Bound live presence listeners to active set to prevent listener explosion
      friendUids.slice(0, 40).forEach(fUid => {
        const sRef = db.ref(`status/${fUid}`);
        const onStatus = (s: firebase.database.DataSnapshot) => {
          const val = s.val();
          setFriendStatuses(prev => ({
            ...prev,
            [fUid]: val && val.state === 'online' ? 'online' : 'offline'
          }));
        };
        sRef.on('value', onStatus);
        activeFriendListenersRef.current.push(() => sRef.off('value', onStatus));
      });

      // Batch fetch only uncached/expired friend profiles in parallel (instead of N persistent profile listeners)
      if (staleUids.length > 0) {
        Promise.all(
          staleUids.slice(0, 30).map(fUid =>
            db
              .ref(`users/${fUid}`)
              .once('value')
              .then(uSnap => ({ fUid, uData: uSnap.val() }))
              .catch(() => null)
          )
        ).then(results => {
          if (isCancelled) return;
          const patches: Record<string, { name?: string; avatar?: string }> = {};
          for (const res of results) {
            if (!res || !res.uData) continue;
            userProfileCache.set(res.fUid, {
              name: res.uData.name,
              avatar: res.uData.avatar,
              friendCode: res.uData.friendCode
            });
            patches[res.fUid] = {
              name: res.uData.name,
              avatar: res.uData.avatar
            };
          }
          if (Object.keys(patches).length > 0) {
            setFriends(prev => {
              let changed = false;
              const next = { ...prev };
              for (const [fUid, patch] of Object.entries(patches)) {
                if (!next[fUid]) continue;
                const nextName = patch.name || next[fUid].name;
                const nextAvatar = patch.avatar || next[fUid].avatar;
                if (next[fUid].name !== nextName || next[fUid].avatar !== nextAvatar) {
                  next[fUid] = { ...next[fUid], name: nextName, avatar: nextAvatar };
                  changed = true;
                }
              }
              return changed ? next : prev;
            });
          }
        });
      }
    };
    friendsRef.on('value', onFriendsChange);

    // Sent requests
    const sentReqRef = db.ref(`users/${currentUser.uid}/sentRequests`);
    const onSentReq = (snap: firebase.database.DataSnapshot) => {
      setSentRequests(snap.val() || {});
    };
    sentReqRef.on('value', onSentReq);

    // Incoming friend requests
    const friendReqRef = db.ref(`users/${currentUser.uid}/friendRequests`);
    const onFriendReq = (snap: firebase.database.DataSnapshot) => {
      setFriendRequests(snap.val() || {});
    };
    friendReqRef.on('value', onFriendReq);

    // Room invites
    const invitesRef = db.ref(`users/${currentUser.uid}/roomInvites`);
    const onInvites = (snap: firebase.database.DataSnapshot) => {
      setRoomInvites(snap.val() || {});
    };
    invitesRef.on('value', onInvites);

    // Check saved room code on initial auth restore
    const saved = localStorage.getItem('spy_station_room');
    if (saved) {
      db.ref(`spy_rooms/${saved}`).once('value', s => {
        if (isCancelled) return;
        if (s.exists()) {
          joinRoom(saved);
        } else {
          localStorage.removeItem('spy_station_room');
        }
      });
    }

    return () => {
      isCancelled = true;
      profileRef.off('value', onProfileChange);
      connectedRef.off('value', onConnectedChange);
      scoreRef.off('value', onScoreChange);
      friendsRef.off('value', onFriendsChange);
      sentReqRef.off('value', onSentReq);
      friendReqRef.off('value', onFriendReq);
      invitesRef.off('value', onInvites);
      activeFriendListenersRef.current.forEach(cleanup => cleanup());
      activeFriendListenersRef.current = [];
    };
  }, [currentUser]);

  // Indexed, paginated, SWR-cached Public Stations listener (only active while browsing Stations tab)
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

    const roomsQuery = db
      .ref('spy_rooms')
      .orderByChild('visibility')
      .equalTo('public')
      .limitToLast(stationsLimit);

    const onRoomsChange = (snap: firebase.database.DataSnapshot) => {
      const all = snap.val() || {};
      const rawCount = Object.keys(all).length;
      const validRooms: Record<string, RoomData> = {};
      const staleDeletePaths: Record<string, null> = {};
      const now = Date.now();

      Object.keys(all).forEach(code => {
        const r = all[code];
        if (!r) return;
        const players = r.players || {};
        const pList = Object.values(players) as PlayerData[];
        const humanList = pList.filter(p => !isBotPlayer(p));
        const hostUid = r.hostUid || '';
        const hostPlayer = hostUid ? players[hostUid] : null;
        const isBotHost = hostUid.startsWith('bot_') || hostPlayer?.isBot === true;

        const createdAt = typeof r.createdAt === 'number' ? r.createdAt : now;
        const ageMs = now - createdAt;

        const lastPurge = purgedRoomsRef.current.get(code) || 0;
        const canAttemptPurge = now - lastPurge > 10000;

        if (isBotHost || (humanList.length === 0 && ageMs > 25000)) {
          if (canAttemptPurge) {
            purgedRoomsRef.current.set(code, now);
            staleDeletePaths[`spy_rooms/${code}`] = null;
          }
          return;
        }

        if (humanList.length > 0 || ageMs <= 25000) {
          validRooms[code] = r;
        }
      });

      if (Object.keys(staleDeletePaths).length > 0) {
        db.ref().update(staleDeletePaths).catch(() => {});
      }

      setHasMoreStations(rawCount >= stationsLimit);
      setPublicRooms(validRooms);
      setPublicRoomsLoading(false);
      publicRoomsCache.set('latest', validRooms);
    };

    roomsQuery.on('value', onRoomsChange, () => {
      setPublicRoomsLoading(false);
    });
    return () => {
      roomsQuery.off('value', onRoomsChange);
    };
  }, [currentUser, currentRoomCode, activeTab, stationsLimit]);

  // Handle Host watchdog
  const isHost = !!(roomData && currentUser && roomData.hostUid === currentUser.uid);

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
        .filter(p => !p.isSpectator)
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

      if ((!hostP || hostP.isSpectator) && activeList.length > 0) {
        const newHost = activeList[0].uid;
        if (currentUser.uid === newHost && currentHost !== newHost) {
          db.ref(`spy_rooms/${currentRoomCode}/hostUid`).set(newHost);
          showToast(t.hostMigratedNotification, 'success');
        }
      }

      // Check if game is in progress but active players dropped below 3
      const isGameActive = data.status === 'playing' || data.status === 'voting' || data.status === 'resolving';
      if (isGameActive && activeList.length < 3) {
        const effectiveHost = currentHost && playersObj[currentHost] && !playersObj[currentHost].isSpectator
          ? currentHost
          : activeList[0]?.uid;
        if (currentUser.uid === effectiveHost) {
          db.ref(`spy_rooms/${currentRoomCode}`).update({
            status: 'waiting',
            round: 1,
            spies: null,
            undercoverUid: null,
            word: null,
            wordAr: null,
            turnOrder: null,
            turnIndex: 0,
            turnTimeLeft: null,
            turnEndsAt: null,
            turnGraceUntil: null,
            voteTimeLeft: null,
            voteEndsAt: null,
            votes: null,
            voteChat: null,
            currentDrawing: null,
            lastDrawing: null,
            blackoutActive: false,
            blackoutEndsAt: null,
            winnerTeam: null,
            announcement: {
              msg: t.gameAbortedNotEnoughPlayers,
              type: 'danger',
              timestamp: firebase.database.ServerValue.TIMESTAMP
            }
          });
        }
      }
    }, 1000);

    return () => {
      if (watchdogIntervalRef.current) clearInterval(watchdogIntervalRef.current);
    };
  }, [currentRoomCode, currentUser]);

  // Advance Turn logic (Guarded against stale turn/round and RTDB child contention)
  const advanceTurn = async (expectedTurnIndex?: number, wasTimeout: boolean = false, expectedRound?: number) => {
    if (!currentRoomCode) return;
    const lockKey = `${currentRoomCode}:${expectedRound ?? 'any'}:${expectedTurnIndex ?? 'any'}`;
    if (advancingTurnKeyRef.current === lockKey) return;
    advancingTurnKeyRef.current = lockKey;

    try {
      const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
      const typedRoom = snap.val() as RoomData | null;
      if (!typedRoom || typedRoom.status !== 'playing') return;

      const resolvedRound = expectedRound ?? typedRoom.round ?? 1;
      const speakerUid = typedRoom.turnOrder?.[typedRoom.turnIndex || 0];
      const speakerPlayer = speakerUid ? typedRoom.players?.[speakerUid] : null;

      const result = computeNextTurnState(typedRoom, {
        expectedTurnIndex,
        expectedRound: resolvedRound,
        wasTimeout,
        now: getServerNow()
      });
      if (!result.changed) return;

      const turnPatch: Record<string, unknown> = {
        players: result.room.players,
        round: result.room.round,
        completedTurnsThisRound: result.room.completedTurnsThisRound ?? null,
        turnOrder: result.room.turnOrder,
        turnIndex: result.room.turnIndex,
        turnTimeLeft: result.room.turnTimeLeft ?? null,
        turnGraceUntil: result.room.turnGraceUntil ?? null,
        turnEndsAt: result.room.turnEndsAt ?? null,
        votes: result.room.votes ?? null
      };

      await db.ref(`spy_rooms/${currentRoomCode}`).update(turnPatch);

      if (result.afkKickedName) {
        broadcastAnnouncement(
          lang === 'ar'
            ? `تم استبعاد ${result.afkKickedName} تلقائياً لعدم التفاعل لمدة 3 جولات متتالية`
            : `${result.afkKickedName} was auto-kicked for being inactive for 3 rounds`,
          'danger'
        );
      } else if (wasTimeout && speakerPlayer && !isBotPlayer(speakerPlayer, speakerUid)) {
        broadcastAnnouncement(
          t.annTurnTimedOut.replace('{name}', speakerPlayer.name || 'Agent'),
          'normal'
        );
      }
    } catch {
      // ignore transient network errors
    } finally {
      if (advancingTurnKeyRef.current === lockKey) {
        advancingTurnKeyRef.current = null;
      }
    }
  };

  // Process Vote Results (Reads fresh votes from RTDB, resolves immediately with server timestamp)
  const processVoteResults = async (_roomFallback?: RoomData | null) => {
    if (!currentRoomCode || !isHost || isResolvingVotesRef.current) return;
    isResolvingVotesRef.current = true;

    try {
      const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
      const latestRoom = snap.val() as RoomData | null;
      if (!latestRoom || latestRoom.status !== 'voting') return;

      // Ensure any unvoted bots still cast a real vote if timer expired
      const eligibleVoters = getEligibleVoters(latestRoom.players);
      const unvotedBots = eligibleVoters.filter(p => isBotPlayer(p) && !latestRoom.votes?.[p.uid]);
      if (unvotedBots.length > 0) {
        const spies = latestRoom.spies || [];
        const activePlayers = Object.values(latestRoom.players || {}).filter(p => !p.isSpectator);
        const nextVotes = { ...(latestRoom.votes || {}) };
        for (const bot of unvotedBots) {
          nextVotes[bot.uid] = generateSmartBotVote({
            botUid: bot.uid,
            isSpy: spies.includes(bot.uid),
            isUndercover: latestRoom.undercoverUid === bot.uid,
            activePlayers,
            spies,
            gameChat: latestRoom.gameChat,
            word: latestRoom.word,
            wordAr: latestRoom.wordAr,
            wordCategory: latestRoom.wordCategory
          });
        }
        latestRoom.votes = nextVotes;
      }

      const resolution = resolveVoteOutcome(latestRoom, getServerNow());
      await db
        .ref(`spy_rooms/${currentRoomCode}`)
        .update(toFirebaseUpdatePayload(resolution.nextRoomFields as Record<string, unknown>));

      const playersObj = (resolution.nextRoomFields.players as Record<string, PlayerData>) || latestRoom.players || {};
      const ejectedName = resolution.ejectedName || '?';

      if (resolution.outcome === 'nobody_ejected') {
        broadcastAnnouncement(t.annNobodyEjected, 'normal');
      } else if (resolution.outcome === 'crew_win') {
        broadcastAnnouncement(t.annCrewWins.replace('{name}', ejectedName), 'success');
        awardXP(playersObj, latestRoom.spies || [], 'crew');
      } else if (resolution.outcome === 'spy_ejected_continue') {
        broadcastAnnouncement(t.annSpyEjectedMoreRemain.replace('{name}', ejectedName), 'danger');
      } else if (resolution.outcome === 'spies_win') {
        broadcastAnnouncement(t.annSpiesWin.replace('{name}', ejectedName), 'danger');
        awardXP(playersObj, latestRoom.spies || [], 'spies');
      } else if (resolution.outcome === 'innocent_ejected_continue') {
        broadcastAnnouncement(t.annInnocentEjected.replace('{name}', ejectedName), 'danger');
      }
    } catch {
      // keep status in 'voting' so retry succeeds cleanly
    } finally {
      isResolvingVotesRef.current = false;
    }
  };

  // Host-authoritative Turn & Vote Countdown Watchdog (synchronized to Firebase server time)
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
      isTurnTickRunningRef.current = false;
      isVoteTickRunningRef.current = false;
      return;
    }

    // Playing watchdog (Blackout cleanup, invalid speaker recovery, turn timeout enforcement)
    if (roomData.status === 'playing') {
      if (!turnIntervalRef.current) {
        turnIntervalRef.current = setInterval(async () => {
          if (isTurnTickRunningRef.current) return;
          isTurnTickRunningRef.current = true;
          try {
            const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
            const room = snap.val() as RoomData | null;
            if (!room || room.status !== 'playing') return;

            const now = getServerNow();

            // Pause turn countdown while cinematic ejection overlay or round-start grace is active
            if ((room.ejectionEndsAt && now < room.ejectionEndsAt) || (room.turnGraceUntil && now < room.turnGraceUntil)) {
              return;
            }

            const turnOrder = room.turnOrder || [];
            const turnIdx = room.turnIndex || 0;
            const currentSpeakerUid = turnOrder[turnIdx];
            const currentSpeaker = currentSpeakerUid ? room.players?.[currentSpeakerUid] : null;

            // Self-heal if turn pointer lands on an empty/spectator slot or completed speaker
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

            const defaultTurnSeconds = getEffectiveTurnSeconds(room.gameMode, room.turnSeconds);
            if (!room.turnEndsAt || room.turnEndsAt <= 0) {
              await db.ref(`spy_rooms/${currentRoomCode}`).update({
                turnEndsAt: now + defaultTurnSeconds * 1000,
                turnTimeLeft: defaultTurnSeconds
              });
              return;
            }

            const isBotTurn = isBotPlayer(currentSpeaker, currentSpeakerUid);
            const timeoutMarginMs = isBotTurn ? 0 : 600;
            if (now >= room.turnEndsAt + timeoutMarginMs) {
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

    // Voting watchdog (Ensures deadline exists & triggers resolution immediately when all voted or expired)
    if (roomData.status === 'voting') {
      if (!voteIntervalRef.current) {
        voteIntervalRef.current = setInterval(async () => {
          if (isVoteTickRunningRef.current || isResolvingVotesRef.current) return;
          isVoteTickRunningRef.current = true;
          try {
            const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
            const room = snap.val() as RoomData | null;
            if (!room || room.status !== 'voting') return;

            const now = getServerNow();
            if (!room.voteEndsAt || room.voteEndsAt <= 0) {
              await db.ref(`spy_rooms/${currentRoomCode}/voteEndsAt`).set(now + DEFAULT_VOTE_SECONDS * 1000);
              return;
            }

            if (areAllEligibleVotesSubmitted(room) || now >= room.voteEndsAt) {
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

    return () => {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
      if (voteIntervalRef.current) {
        clearInterval(voteIntervalRef.current);
        voteIntervalRef.current = null;
      }
      isTurnTickRunningRef.current = false;
      isVoteTickRunningRef.current = false;
    };
  }, [isHost, currentRoomCode, roomData?.status]);

  // Award XP at game end (batched parallel reads + single atomic multi-path write)
  const awardXP = async (playersObj: Record<string, PlayerData>, spies: string[], winner: 'crew' | 'spies') => {
    const humanUids = Object.keys(playersObj).filter(
      uid => !uid.startsWith('bot_') && !playersObj[uid]?.isBot
    );
    if (humanUids.length === 0) return;

    const scoreResults = await Promise.all(
      humanUids.map(uid =>
        db
          .ref(`users/${uid}/score`)
          .once('value')
          .then(snap => ({ uid, currentScore: Number(snap.val()) || 0 }))
          .catch(() => null)
      )
    );

    const updates: Record<string, number> = {};
    for (const res of scoreResults) {
      if (!res) continue;
      const isSpy = spies.includes(res.uid);
      const isWinner = (winner === 'crew' && !isSpy) || (winner === 'spies' && isSpy);
      const gain = 10 + (isWinner ? 25 : 0);
      updates[`users/${res.uid}/score`] = res.currentScore + gain;
    }

    if (Object.keys(updates).length > 0) {
      db.ref().update(updates).catch(() => {});
    }
  };

  // Auto-heal bot host -> assign to first human
  useEffect(() => {
    if (currentRoomCode && roomData) {
      const players = roomData.players || {};
      const hostUid = roomData.hostUid;
      const hostPlayer = hostUid ? players[hostUid] : null;
      const isHostBot = !hostPlayer || isBotPlayer(hostPlayer, hostUid);
      if (isHostBot) {
        const firstHuman = Object.values(players).find(p => !isBotPlayer(p));
        if (firstHuman) {
          db.ref(`spy_rooms/${currentRoomCode}/hostUid`).set(firstHuman.uid);
        }
      }
    }
  }, [currentRoomCode, roomData?.hostUid, roomData?.players]);

  // Bot Speaking Automation (Isolated from voting & freeze timestamps so timers never cancel mid-turn)
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
    let botTimer: ReturnType<typeof setTimeout> | null = null;
    let advanceTimer: ReturnType<typeof setTimeout> | null = null;

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

    botTimer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
        if (cancelled) return;
        const latest = snap.val() as RoomData | null;
        if (
          !latest ||
          latest.status !== 'playing' ||
          (latest.round || 1) !== targetRound ||
          (latest.turnIndex || 0) !== targetTurnIndex ||
          latest.turnOrder?.[targetTurnIndex] !== currentSpeakerUid
        ) {
          return;
        }

        if (latest.completedTurnsThisRound?.[currentSpeakerUid]) {
          await advanceTurn(targetTurnIndex, false, targetRound);
          return;
        }

        const latestSpeaker = latest.players?.[currentSpeakerUid];
        const isBotSpy = (latest.spies || []).includes(currentSpeakerUid);

        const prevClues: string[] = [];
        Object.values(latest.gameChat || {}).forEach(c => {
          if (c?.text) prevClues.push(c.text);
          if (c?.translations?.ar) prevClues.push(c.translations.ar);
          if (c?.translations?.en) prevClues.push(c.translations.en);
        });

        const cluePair = generateSmartBotCluePair({
          isSpy: isBotSpy,
          word: latest.word || '',
          wordAr: latest.wordAr || '',
          category: latest.wordCategory || 'places',
          language: lang,
          previousClues: prevClues,
          gameMode: latest.gameMode,
          chameleonWord: latestSpeaker?.chameleonWord,
          chameleonWordAr: latestSpeaker?.chameleonWordAr
        });

        await db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).set({
          text: cluePair.en,
          translations: { ar: cluePair.ar, en: cluePair.en },
          isBot: true,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        await db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
          uid: currentSpeakerUid,
          sender: latestSpeaker?.name || speaker?.name || 'Bot Agent',
          avatar:
            latestSpeaker?.avatar ||
            speaker?.avatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSpeakerUid}`,
          text: cluePair.en,
          translations: { ar: cluePair.ar, en: cluePair.en },
          isBot: true,
          round: targetRound,
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        setTimeout(() => {
          db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).remove().catch(() => {});
        }, 5500);

        advanceTimer = setTimeout(() => {
          if (!cancelled) advanceTurn(targetTurnIndex, false, targetRound);
        }, latest.gameMode === 'rapid' ? 650 : 900);
      } catch {
        // Turn watchdog recovers automatically if anything transient fails
      }
    }, botThinkDelay);

    return () => {
      cancelled = true;
      if (botTimer) clearTimeout(botTimer);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  }, [isHost, currentRoomCode, roomData?.status, roomData?.round, roomData?.turnIndex, currentSpeakerUid]);

  // Bot Voting Automation (Votes promptly — and immediately in a batch once all humans have voted)
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
        const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
        if (cancelled) return;
        const latest = snap.val() as RoomData | null;
        if (!latest || latest.status !== 'voting') return;

        const eligible = getEligibleVoters(latest.players);
        const remainingBots = eligible.filter(p => isBotPlayer(p) && !latest.votes?.[p.uid]);
        if (remainingBots.length === 0) return;

        const humansPending = eligible.filter(p => !isBotPlayer(p) && !latest.votes?.[p.uid]).length;
        const botsToCommit = humansPending === 0 ? remainingBots : [remainingBots[0]];
        const activePlayers = Object.values(latest.players || {}).filter(p => !p.isSpectator);
        const spies = latest.spies || [];
        const updates: Record<string, string> = {};

        for (const bot of botsToCommit) {
          updates[`spy_rooms/${currentRoomCode}/votes/${bot.uid}`] = generateSmartBotVote({
            botUid: bot.uid,
            isSpy: spies.includes(bot.uid),
            isUndercover: latest.undercoverUid === bot.uid,
            activePlayers,
            spies,
            gameChat: latest.gameChat,
            word: latest.word,
            wordAr: latest.wordAr,
            wordCategory: latest.wordCategory
          });
        }

        await db.ref().update(updates);
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

  const broadcastAnnouncement = (msg: string, type: 'normal' | 'danger' | 'success' = 'normal') => {
    if (!currentRoomCode) return;
    db.ref(`spy_rooms/${currentRoomCode}/announcement`).set({
      msg,
      type,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  };

  // Request to Join Room (Public rooms require Host approval)
  const handleRequestJoinRoom = async (code: string) => {
    if (!currentUser) return;
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    try {
      const snap = await db.ref(`spy_rooms/${cleanCode}`).once('value');
      const room = snap.val();
      if (!room) {
        showToast(t.errStationNotExist, 'danger');
        return;
      }

      // If user is already the host or already in the room, join directly
      if (room.hostUid === currentUser.uid || (room.players && room.players[currentUser.uid])) {
        joinRoom(cleanCode);
        return;
      }

      // If user was invited to this room, admit them directly without host approval
      if (room.invitedPlayers && room.invitedPlayers[currentUser.uid]) {
        joinRoom(cleanCode);
        return;
      }

      // If game is in progress (playing or voting), enter immediately as spectator without interrupting host
      if (room.status === 'playing' || room.status === 'voting') {
        joinRoom(cleanCode);
        return;
      }

      // If room is public and in lobby, Host must approve!
      if (room.visibility === 'public') {
        const hostName = (room.hostUid && room.players?.[room.hostUid]?.name) || 'Commander';
        const reqRef = db.ref(`spy_rooms/${cleanCode}/joinRequests/${currentUser.uid}`);
        await reqRef.set({
          uid: currentUser.uid,
          name: profileName || currentUser.displayName || 'Agent',
          avatar: profileAvatar || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
          status: 'pending',
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        reqRef.onDisconnect().remove();

        setPendingJoinApproval({ code: cleanCode, hostName, queuePosition: 1 });
        showToast(t.joinRequestPending, 'normal');

        // Track live queue position among pending requests
        const allRequestsRef = db.ref(`spy_rooms/${cleanCode}/joinRequests`);
        const onAllReqs = (allSnap: firebase.database.DataSnapshot) => {
          const allReqs = allSnap.val() || {};
          const myReq = allReqs[currentUser.uid];
          if (!myReq) return;
          const pendingBefore = Object.values(allReqs)
            .filter((r: unknown) => {
              const req = r as { status?: string; timestamp?: number };
              return req && req.status === 'pending' && (req.timestamp || 0) < (myReq.timestamp || 0);
            }).length;
          setPendingJoinApproval(prev => prev ? { ...prev, queuePosition: pendingBefore + 1 } : null);
        };
        allRequestsRef.on('value', onAllReqs);

        // Listen for host decision
        const onDecision = (respSnap: firebase.database.DataSnapshot) => {
          const reqData = respSnap.val();
          if (!reqData) return;
          if (reqData.status === 'accepted') {
            reqRef.off('value', onDecision);
            allRequestsRef.off('value', onAllReqs);
            pendingReqCleanupsRef.current = null;
            setPendingJoinApproval(null);
            joinRoom(cleanCode);
            showToast(t.joinRequestAccepted, 'success');
          } else if (reqData.status === 'rejected') {
            reqRef.off('value', onDecision);
            allRequestsRef.off('value', onAllReqs);
            pendingReqCleanupsRef.current = null;
            reqRef.remove().catch(() => {});
            setPendingJoinApproval(null);
            showToast(t.joinRequestDeclined, 'danger');
          }
        };
        reqRef.on('value', onDecision);

        pendingReqCleanupsRef.current = () => {
          reqRef.off('value', onDecision);
          allRequestsRef.off('value', onAllReqs);
        };
        return;
      }

      // Private room with direct code -> join directly
      joinRoom(cleanCode);
    } catch {
      showToast(t.errStationNotExist, 'danger');
    }
  };

  const handleCancelJoinRequest = async () => {
    if (pendingJoinApproval && currentUser) {
      if (pendingReqCleanupsRef.current) {
        pendingReqCleanupsRef.current();
        pendingReqCleanupsRef.current = null;
      }
      db.ref(`spy_rooms/${pendingJoinApproval.code}/joinRequests/${currentUser.uid}`).remove().catch(() => {});
      setPendingJoinApproval(null);
    }
  };

  const handleAcceptJoinRequest = async (applicantUid: string) => {
    if (!currentRoomCode) return;
    const req = roomData?.joinRequests?.[applicantUid];
    sound.playTone(600, 'sine', 0.1);
    await db.ref(`spy_rooms/${currentRoomCode}/joinRequests/${applicantUid}/status`).set('accepted');
    if (req) {
      await db.ref(`spy_rooms/${currentRoomCode}/players/${applicantUid}`).set({
        uid: applicantUid,
        name: req.name || 'Agent',
        avatar: req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${applicantUid}`,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        isSpectator: !!(roomData?.status === 'playing' || roomData?.status === 'voting')
      });
      showToast(t.toastAcceptedJoin.replace('{name}', req.name), 'success');
    }
    // Clean up processed request so the host modal advances sequentially to the next applicant
    setTimeout(() => {
      if (currentRoomCode) {
        db.ref(`spy_rooms/${currentRoomCode}/joinRequests/${applicantUid}`).remove().catch(() => {});
      }
    }, 1500);
  };

  const handleDeclineJoinRequest = async (applicantUid: string) => {
    if (!currentRoomCode) return;
    sound.playTone(300, 'sine', 0.1);
    await db.ref(`spy_rooms/${currentRoomCode}/joinRequests/${applicantUid}/status`).set('rejected');
    showToast(t.toastDeclinedJoin, 'normal');
    // Clean up processed request so the host modal advances sequentially to the next applicant
    setTimeout(() => {
      if (currentRoomCode) {
        db.ref(`spy_rooms/${currentRoomCode}/joinRequests/${applicantUid}`).remove().catch(() => {});
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

    const playerRef = db.ref(`spy_rooms/${cleanCode}/players/${currentUser.uid}`);
    await playerRef.onDisconnect().cancel().catch(() => {});

    const existing = await playerRef.once('value');
    if (!existing.exists()) {
      const roomSnap = await db.ref(`spy_rooms/${cleanCode}`).once('value');
      const rData = roomSnap.val();
      if (!rData) {
        showToast(t.toastStationNotFound, 'danger');
        leaveRoom();
        return;
      }
      const existingPlayers = rData.players || {};
      const currentCount = Object.keys(existingPlayers).length;
      const maxP = rData.maxPlayers || 20;
      if (currentCount >= maxP) {
        showToast(
          lang === 'ar'
            ? `عذراً، هذه المحطة الفضائية ممتلئة بالكامل (${currentCount}/${maxP})!`
            : `Sorry, this space station is full (${currentCount}/${maxP})!`,
          'danger'
        );
        leaveRoom();
        return;
      }
      const roomStatus = rData.status;
      await playerRef.set({
        uid: currentUser.uid,
        name: profileNameRef.current || currentUser.displayName || 'Agent',
        avatar:
          profileAvatarRef.current ||
          currentUser.photoURL ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
        joinedAt: firebase.database.ServerValue.TIMESTAMP,
        isSpectator: !!(roomStatus === 'playing' || roomStatus === 'voting')
      });
    }

    // On disconnect remove
    playerRef.onDisconnect().remove();

    if (annListenerRef.current) {
      annListenerRef.current();
      annListenerRef.current = null;
    }

    // Main room data listener
    if (roomListenerRef.current) roomListenerRef.current();
    const rRef = db.ref(`spy_rooms/${cleanCode}`);
    rRef.on('value', snap => {
      const data = snap.val() as RoomData | null;
      if (!data) {
        leaveRoom();
        return;
      }
      lastRoomSnapshotRef.current = data;
      setRoomData(data);

      if (!data.players || !data.players[currentUser.uid]) {
        showToast(t.msgRemovedFromStation, 'danger');
        leaveRoom();
        return;
      }

      // In waiting lobby, ensure every player is an active astronaut & reset ejection tracking
      if (data.status === 'waiting') {
        lastSeenEjectionTimestampRef.current = 0;
        completedEjectionsRef.current.clear();
        if (data.players[currentUser.uid]?.isSpectator) {
          db.ref(`spy_rooms/${cleanCode}/players/${currentUser.uid}/isSpectator`).set(false).catch(() => {});
        }
      }

      // If gameover and all remaining humans have returned to lobby, reset room back to waiting
      if (data.status === 'gameover' && currentUser.uid === data.hostUid && shouldResetGameOverToLobby(data.players)) {
        const resetPlayers: Record<string, PlayerData> = {};
        Object.entries(data.players || {}).forEach(([pUid, pl]) => {
          resetPlayers[pUid] = { ...pl, isSpectator: false, postGame: null };
        });
        db.ref(`spy_rooms/${cleanCode}`).update({
          status: 'waiting',
          winnerTeam: null,
          votes: null,
          spies: null,
          undercoverUid: null,
          word: null,
          wordAr: null,
          round: null,
          turnOrder: null,
          turnIndex: null,
          turnTimeLeft: null,
          turnEndsAt: null,
          turnGraceUntil: null,
          voteEndsAt: null,
          voteChat: null,
          currentDrawing: null,
          lastDrawing: null,
          ejectionEvent: null,
          ejectionEndsAt: null,
          blackoutActive: false,
          blackoutEndsAt: null,
          completedTurnsThisRound: null,
          players: resetPlayers
        }).catch(() => {});
        return;
      }

      // Instant Host Migration: Check if host left or disconnected
      const playersObj = data.players || {};
      const activePlayers = Object.values(playersObj).filter(p => !p.isSpectator);
      const isGameActive = data.status === 'playing' || data.status === 'voting' || data.status === 'resolving';

      const currentHostUid = data.hostUid;
      const hostPlayer = currentHostUid ? playersObj[currentHostUid] : null;

      if ((!hostPlayer || hostPlayer.isSpectator) && activePlayers.length > 0) {
        const sortedActive = [...activePlayers].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
        const nextHostUid = sortedActive[0].uid;
        if (currentUser.uid === nextHostUid && currentHostUid !== nextHostUid) {
          db.ref(`spy_rooms/${cleanCode}/hostUid`).set(nextHostUid);
          showToast(t.hostMigratedNotification, 'success');
        }
      }

      // CRITICAL GAME RULE: If game is active and active players drop below 3
      if (isGameActive && activePlayers.length < 3) {
        const effectiveHostUid =
          data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
            ? data.hostUid
            : activePlayers[0]?.uid;

        if (currentUser.uid === effectiveHostUid) {
          db.ref(`spy_rooms/${cleanCode}`).update({
            status: 'waiting',
            round: 1,
            spies: null,
            undercoverUid: null,
            word: null,
            wordAr: null,
            turnOrder: null,
            turnIndex: 0,
            turnTimeLeft: null,
            turnEndsAt: null,
            turnGraceUntil: null,
            voteTimeLeft: null,
            voteEndsAt: null,
            votes: null,
            currentDrawing: null,
            lastDrawing: null,
            ejectionEvent: null,
            ejectionEndsAt: null,
            blackoutActive: false,
            blackoutEndsAt: null,
            completedTurnsThisRound: null,
            winnerTeam: null,
            announcement: {
              msg: t.gameAbortedNotEnoughPlayers,
              type: 'danger',
              timestamp: firebase.database.ServerValue.TIMESTAMP
            }
          });
        }
        return;
      }

      // If playing: Check if all spies left -> crew wins immediately
      if (data.status === 'playing' && data.spies && data.spies.length > 0) {
        const activeSpies = data.spies.filter(uid => playersObj[uid] && !playersObj[uid].isSpectator);
        if (activeSpies.length === 0) {
          const effectiveHostUid =
            data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
              ? data.hostUid
              : activePlayers[0]?.uid;
          if (currentUser.uid === effectiveHostUid) {
            db.ref(`spy_rooms/${cleanCode}`).update({
              status: 'gameover',
              winnerTeam: 'crew',
              finalSpies: data.spies,
              finalPlayers: playersObj,
              votes: null,
              announcement: {
                msg: t.annSpiesGoneCrewWins,
                type: 'success',
                timestamp: firebase.database.ServerValue.TIMESTAMP
              }
            });
            awardXP(playersObj, data.spies || [], 'crew');
            return;
          }
        }
      }

      // If playing: Sanitize turnOrder if someone left, preserving the current speaker's turn
      if (data.status === 'playing' && data.turnOrder && data.turnOrder.length > 0) {
        const cleanedTurnOrder = data.turnOrder.filter(uid => playersObj[uid] && !playersObj[uid].isSpectator);
        if (cleanedTurnOrder.length > 0 && cleanedTurnOrder.length !== data.turnOrder.length) {
          const effectiveHostUid =
            data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
              ? data.hostUid
              : activePlayers[0]?.uid;
          if (currentUser.uid === effectiveHostUid) {
            const currentSpeakerUid = data.turnOrder[data.turnIndex || 0];
            const preservedIndex = currentSpeakerUid ? cleanedTurnOrder.indexOf(currentSpeakerUid) : -1;
            if (preservedIndex >= 0) {
              db.ref(`spy_rooms/${cleanCode}`).update({
                turnOrder: cleanedTurnOrder,
                turnIndex: preservedIndex
              });
            } else {
              let nextIndex = data.turnIndex || 0;
              if (nextIndex >= cleanedTurnOrder.length) nextIndex = 0;
              db.ref(`spy_rooms/${cleanCode}`).update({
                turnOrder: cleanedTurnOrder,
                turnIndex: nextIndex,
                turnTimeLeft: getEffectiveTurnSeconds(data.gameMode, data.turnSeconds)
              });
            }
          }
        }
      }

      // Reset announced round if not in playing
      if (data.status !== 'playing') {
        lastAnnouncedRoundRef.current = 0;
        setAnnouncedRound(null);
      }

      // Check round transition for popup announcement - ONLY ONCE per round!
      if (data.status === 'playing' && data.round && data.round > lastAnnouncedRoundRef.current) {
        lastAnnouncedRoundRef.current = data.round;
        setAnnouncedRound(data.round);
        sound.playChime([[523, 0, 0.15], [659, 120, 0.15], [784, 240, 0.3]], 'sine');
        if (roundAnnounceTimerRef.current) {
          clearTimeout(roundAnnounceTimerRef.current);
        }
        roundAnnounceTimerRef.current = setTimeout(() => {
          setAnnouncedRound(null);
        }, ROUND_ANNOUNCE_MS);
      }
    });
    roomListenerRef.current = () => rRef.off();
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
    if (roundAnnounceTimerRef.current) {
      clearTimeout(roundAnnounceTimerRef.current);
      roundAnnounceTimerRef.current = null;
    }

    const code = currentRoomCode;
    const uid = currentUser?.uid;
    const currentRoomSnapshot = roomData;

    // 1. Immediately detach listeners so remote events don't pull the client back
    if (roomListenerRef.current) {
      roomListenerRef.current();
      roomListenerRef.current = null;
    }
    if (annListenerRef.current) {
      annListenerRef.current();
      annListenerRef.current = null;
    }

    // 2. Instantly reset local state so the user exits the room to Home without any delay or freeze
    setCurrentRoomCode(null);
    setRoomData(null);
    setActiveTab('home');
    showToast(t.msgLeftStation);

    // 3. Perform database cleanup asynchronously and safely
    if (code && uid) {
      try {
        const wasHost = !!(currentRoomSnapshot && currentRoomSnapshot.hostUid === uid);
        const playersObj = currentRoomSnapshot?.players || {};
        const remainingHumans = Object.values(playersObj)
          .filter(pl => pl.uid !== uid && !pl.isSpectator && !isBotPlayer(pl))
          .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

        if (remainingHumans.length === 0) {
          await db.ref(`spy_rooms/${code}`).remove();
        } else {
          await db.ref(`spy_rooms/${code}/players/${uid}`).remove();

          if (wasHost && remainingHumans[0]) {
            await db.ref(`spy_rooms/${code}/hostUid`).set(remainingHumans[0].uid);
          }

          // If room was on gameover and remaining human players are all inLobby, reset room to waiting
          if (currentRoomSnapshot?.status === 'gameover') {
            const remainingPlayersMap: Record<string, PlayerData> = {};
            Object.entries(playersObj).forEach(([pUid, pl]) => {
              if (pUid !== uid) remainingPlayersMap[pUid] = pl;
            });
            if (shouldResetGameOverToLobby(remainingPlayersMap)) {
              const resetPlayers: Record<string, PlayerData> = {};
              Object.entries(remainingPlayersMap).forEach(([pUid, pl]) => {
                resetPlayers[pUid] = { ...pl, isSpectator: false, postGame: null };
              });
              await db.ref(`spy_rooms/${code}`).update({
                status: 'waiting',
                winnerTeam: null,
                votes: null,
                spies: null,
                undercoverUid: null,
                word: null,
                wordAr: null,
                round: null,
                turnOrder: null,
                turnIndex: null,
                turnTimeLeft: null,
                turnEndsAt: null,
                turnGraceUntil: null,
                voteEndsAt: null,
                currentDrawing: null,
                lastDrawing: null,
                ejectionEvent: null,
                ejectionEndsAt: null,
                blackoutActive: false,
                blackoutEndsAt: null,
                completedTurnsThisRound: null,
                players: resetPlayers
              });
            }
            return;
          }

          const remainingAll = Object.values(playersObj).filter(p => p.uid !== uid && !p.isSpectator);
          const isGameActive =
            currentRoomSnapshot?.status === 'playing' ||
            currentRoomSnapshot?.status === 'voting' ||
            currentRoomSnapshot?.status === 'resolving';

          if (isGameActive && remainingAll.length < 3) {
            await db.ref(`spy_rooms/${code}`).update({
              status: 'waiting',
              round: 1,
              spies: null,
              undercoverUid: null,
              word: null,
              wordAr: null,
              wordCategory: null,
              wordImage: null,
              turnOrder: null,
              turnIndex: 0,
              turnTimeLeft: null,
              turnEndsAt: null,
              turnGraceUntil: null,
              voteTimeLeft: null,
              voteEndsAt: null,
              votes: null,
              currentDrawing: null,
              lastDrawing: null,
              ejectionEvent: null,
              ejectionEndsAt: null,
              blackoutActive: false,
              blackoutEndsAt: null,
              completedTurnsThisRound: null,
              winnerTeam: null,
              announcement: {
                msg: t.gameAbortedNotEnoughPlayers,
                type: 'danger',
                timestamp: firebase.database.ServerValue.TIMESTAMP
              }
            });
          }
        }
      } catch (err) {
        console.error('Error during room leave cleanup:', err);
      }
    }
  };

  // Create room flow
  const handleConfirmRoomConfig = async (config: {
    visibility: 'public' | 'private';
    categories: CategoryKey[];
    gameMode: GameMode;
    maxPlayers: number;
    spyCount: number;
    turnSeconds: number;
  }) => {
    if (!currentUser) return;
    setInCreateModal(false);

    if (isEditingRoom && currentRoomCode) {
      await db.ref(`spy_rooms/${currentRoomCode}`).update({
        ...config
      });
      setIsEditingRoom(false);
      showToast(t.msgSettingsSaved, 'success');
    } else {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));

      const initialHostPlayer: PlayerData = {
        uid: currentUser.uid,
        name: profileName || currentUser.displayName || 'Agent',
        avatar: profileAvatar || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
        joinedAt: Date.now(),
        isSpectator: false,
        isBot: false
      };

      await db.ref(`spy_rooms/${code}`).set({
        status: 'waiting',
        originalHostUid: currentUser.uid,
        hostUid: currentUser.uid,
        categories: config.categories,
        spyCount: config.spyCount,
        maxPlayers: config.maxPlayers,
        turnSeconds: config.turnSeconds,
        visibility: config.visibility,
        gameMode: config.gameMode,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: {
          [currentUser.uid]: initialHostPlayer
        }
      });

      joinRoom(code);
    }
  };

  // Add simulated bot astronaut for easy testing & solo play
  const handleAddBot = async () => {
    if (!currentRoomCode || !roomData) return;
    const playersObj = roomData.players || {};
    const currentCount = Object.keys(playersObj).length;
    const maxP = roomData.maxPlayers || 20;
    if (currentCount >= maxP) {
      showToast(
        lang === 'ar'
          ? `لا يمكن إضافة رائد فضاء تجريبي: تم بلوغ الحد الأقصى للمحطة (${maxP} لاعبين)!`
          : `Cannot add bot: Station max capacity reached (${maxP} players)!`,
        'danger'
      );
      return;
    }

    const name = generateUniqueBotName(playersObj, lang);
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    sound.playClick();
    await db.ref(`spy_rooms/${currentRoomCode}/players/${botId}`).set({
      uid: botId,
      name: name,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      joinedAt: Date.now(),
      isSpectator: false,
      isBot: true
    });
    showToast(t.toastBotAdded.replace('{name}', name), 'success');
  };

  const handleRemoveBots = async () => {
    if (!currentRoomCode || !roomData) return;
    const playersObj = roomData.players || {};
    const updates: Record<string, null> = {};
    Object.keys(playersObj).forEach(uid => {
      if (playersObj[uid].isBot || uid.startsWith('bot_')) {
        updates[`spy_rooms/${currentRoomCode}/players/${uid}`] = null;
      }
    });
    sound.playClick();
    await db.ref().update(updates);
    showToast(t.toastBotsRemoved, 'normal');
  };

  // Start game flow
  const handleStartGame = async () => {
    if (!currentRoomCode || !roomData) return;
    sound.playClick();

    try {
      const validation = validateGameStart(roomData);
      if (!validation.ok) {
        if (validation.reason === 'players_not_in_lobby') {
          showToast(
            lang === 'ar'
              ? 'لا يمكن بدء الجيم حتى يعود جميع اللاعبين إلى اللوبي!'
              : 'Cannot start game until all players return to lobby!',
            'danger'
          );
          return;
        }
        const spyCount = roomData.spyCount || 1;
        const isMole = roomData.gameMode === 'mole';
        showToast(
          lang === 'ar'
            ? `لا يمكن بدء اللعبة: إعدادات الروم تتطلب ${validation.minRequired} لاعبين على الأقل (${spyCount} ${spyCount === 1 ? 'جاسوس' : 'جواسيس'}${isMole ? ' • شبكة العملاء' : ''})! الموجود حالياً: ${validation.activeCount}. يمكنك إضافة بوتات أو دعوة أصدقاء.`
            : `Cannot start: Room settings require at least ${validation.minRequired} players (${spyCount} spies${isMole ? ' • Mole Network' : ''})! Currently: ${validation.activeCount}.`,
          'danger'
        );
        return;
      }

      const cats =
        roomData.categories && roomData.categories.length > 0
          ? roomData.categories
          : (['players'] as CategoryKey[]);
      const chosenCat = cats[Math.floor(Math.random() * cats.length)];
      const wordList = wordsDB[chosenCat] || wordsDB.players;
      const selectedPair = wordList[Math.floor(Math.random() * wordList.length)];
      const chameleonPair = getSmartTwinWord(selectedPair, chosenCat || 'players', wordList);

      const setup = computeInitialGameSetup({
        room: roomData,
        wordPair: selectedPair,
        wordCategory: chosenCat,
        chameleonPair
      });

      lastAnnouncedRoundRef.current = 0;
      lastSeenEjectionTimestampRef.current = 0;
      completedEjectionsRef.current.clear();
      const now = getServerNow();
      const turnGraceUntil = now + ROUND_GRACE_MS;
      const turnEndsAt = turnGraceUntil + setup.turnTimeLeft * 1000;

      await db.ref(`spy_rooms/${currentRoomCode}`).update({
        status: 'playing',
        word: selectedPair[0] || 'Space Station',
        wordAr: selectedPair[1] || 'محطة الفضاء',
        wordCategory: chosenCat || 'players',
        wordImage: null,
        spies: setup.spies,
        undercoverUid: setup.undercoverUid,
        round: 1,
        completedTurnsThisRound: null,
        blackoutActive: false,
        blackoutEndsAt: null,
        lastBlackoutRound: 0,
        ejectionEvent: null,
        ejectionEndsAt: null,
        turnOrder: setup.turnOrder,
        turnIndex: 0,
        turnTimeLeft: setup.turnTimeLeft,
        turnGraceUntil,
        turnEndsAt,
        votes: null,
        voteEndsAt: null,
        voteChat: null,
        winnerTeam: null,
        gameChat: null,
        spyChat: null,
        speechBubbles: null,
        scrambleActive: false,
        currentDrawing: null,
        lastDrawing: null,
        players: setup.players
      });

      broadcastAnnouncement(t.annMissionStarted, 'normal');
    } catch (err) {
      console.error('Failed to start mission:', err);
      showToast(t.toastGameStartError, 'danger');
    }
  };

  // Loading state: render structured Skeleton UI instead of blank wait
  if (loading) {
    return <AppBootSkeleton lang={lang} />;
  }

  // Not logged in -> Auth Screen
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

  // Create or Edit Room Configuration Modal
  if (inCreateModal) {
    return (
      <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden overscroll-none flex flex-col items-center justify-start p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] bg-[#030712] relative">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <CreateRoomScreen
          lang={lang}
          initialCategory={createInitialCategory}
          isEditing={isEditingRoom}
          initialValues={
            isEditingRoom && roomData
              ? {
                  visibility: roomData.visibility,
                  categories: roomData.categories,
                  gameMode:
                    (roomData.gameMode as string) === 'silent' || (roomData.gameMode as string) === 'blackout'
                      ? 'normal'
                      : roomData.gameMode,
                  maxPlayers: roomData.maxPlayers,
                  spyCount: roomData.spyCount,
                  turnSeconds: roomData.turnSeconds
                }
              : undefined
          }
          onConfirm={handleConfirmRoomConfig}
          onCancel={() => {
            setInCreateModal(false);
            setIsEditingRoom(false);
          }}
          onToast={showToast}
        />
      </div>
    );
  }

  // Joining room transition skeleton (prevents flicker back to HomeTab before RTDB room snapshot arrives)
  if (currentRoomCode && !roomData) {
    return <RoomLobbySkeleton lang={lang} roomCode={currentRoomCode} />;
  }

  // In Room Flow
  if (currentRoomCode && roomData) {
    const isPlaying = roomData.status === 'playing';
    const isVoting = roomData.status === 'voting';
    const isGameOver = roomData.status === 'gameover';
    const myPlayer = (roomData.players || {})[currentUser.uid];

    return (
      <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden overscroll-none flex flex-col items-center justify-start p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] bg-[#030712] relative selection:bg-sky-500/30">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />

        {/* Modals for In-Room */}
        <InviteFriendsModal
          lang={lang}
          currentUserUid={currentUser.uid}
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

        {announcedRound !== null && (
          <RoundAnnounceModal lang={lang} round={announcedRound} />
        )}

        {/* Room Screens */}
        {isPlaying ? (
          <GameScreen
            lang={lang}
            currentUserUid={currentUser.uid}
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
              const snapRoom = lastRoomSnapshotRef.current;
              const now = getServerNow();
              const activeSpeakerUid = snapRoom?.turnOrder?.[snapRoom?.turnIndex || 0];
              if (
                !snapRoom ||
                snapRoom.status !== 'playing' ||
                activeSpeakerUid !== currentUser.uid ||
                (snapRoom.ejectionEndsAt && now < snapRoom.ejectionEndsAt) ||
                (snapRoom.turnGraceUntil && now < snapRoom.turnGraceUntil)
              ) {
                showToast(t.emergencyVoteOnlyMyTurn, 'danger');
                return;
              }
              db.ref(`spy_rooms/${currentRoomCode}`).update({
                status: 'voting',
                voteTimeLeft: DEFAULT_VOTE_SECONDS,
                voteEndsAt: now + DEFAULT_VOTE_SECONDS * 1000,
                turnGraceUntil: null,
                turnEndsAt: null,
                votes: null,
                voteChat: null
              });
              broadcastAnnouncement(t.annEmergencyVote, 'danger');
            }}
            onSendGameClue={(word, targetRound, targetTurnIndex) => {
              const snapRoom = lastRoomSnapshotRef.current;
              if (
                snapRoom?.status !== 'playing' ||
                snapRoom?.round !== targetRound ||
                snapRoom?.turnIndex !== targetTurnIndex ||
                snapRoom?.turnOrder?.[targetTurnIndex] !== currentUser.uid ||
                snapRoom?.completedTurnsThisRound?.[currentUser.uid]
              ) {
                return;
              }

              const senderName = profileNameRef.current || currentUser.displayName || 'Agent';
              const senderAvatar =
                profileAvatarRef.current ||
                currentUser.photoURL ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`;

              db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
                uid: currentUser.uid,
                sender: senderName,
                avatar: senderAvatar,
                text: word,
                isBot: false,
                round: targetRound,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              db.ref(`spy_rooms/${currentRoomCode}/players/${currentUser.uid}/missedTurns`).set(0).catch(() => {});
              advanceTurn(targetTurnIndex, false, targetRound);
            }}
            onAwardCrewXP={(pObj, spies) => {
              awardXP(pObj, spies, 'crew');
            }}
            onSendSpyChat={msg => {
              db.ref(`spy_rooms/${currentRoomCode}/spyChat`).push({
                sender: profileNameRef.current || currentUser.displayName || 'Agent',
                text: msg
              });
            }}
            onToast={showToast}
            onLeaveRoom={leaveRoom}
          />
        ) : isVoting ? (
          <VotingScreen
            lang={lang}
            currentUserUid={currentUser.uid}
            room={roomData}
            serverTimeOffsetMs={serverTimeOffsetMs}
            onCastVote={target => {
              db.ref(`spy_rooms/${currentRoomCode}/votes/${currentUser.uid}`).set(target);
              showToast(t.msgVoteRecorded, 'success');
            }}
            onSendVoteChat={txt => {
              db.ref(`spy_rooms/${currentRoomCode}/voteChat`).push({
                uid: currentUser.uid,
                sender: profileNameRef.current || currentUser.displayName || 'Agent',
                avatar: profileAvatarRef.current || currentUser.photoURL || '',
                text: txt,
                isBot: false,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
            }}
          />
        ) : isGameOver && myPlayer?.postGame !== 'inLobby' ? (
          <GameOverScreen
            lang={lang}
            room={roomData}
            onReturnToLobby={async () => {
              await db.ref(`spy_rooms/${currentRoomCode}/players/${currentUser.uid}`).update({
                postGame: 'inLobby'
              });
              const snap = await db.ref(`spy_rooms/${currentRoomCode}/players`).once('value');
              const pObj = (snap.val() || {}) as Record<string, PlayerData>;

              if (shouldResetGameOverToLobby(pObj)) {
                const reset: Record<string, PlayerData> = {};
                Object.keys(pObj).forEach(uid => {
                  reset[uid] = { ...pObj[uid], isSpectator: false, postGame: null };
                });
                await db.ref(`spy_rooms/${currentRoomCode}`).update({
                  status: 'waiting',
                  winnerTeam: null,
                  votes: null,
                  spies: null,
                  undercoverUid: null,
                  word: null,
                  wordAr: null,
                  round: null,
                  turnOrder: null,
                  turnIndex: null,
                  turnTimeLeft: null,
                  turnEndsAt: null,
                  turnGraceUntil: null,
                  voteEndsAt: null,
                  voteChat: null,
                  currentDrawing: null,
                  lastDrawing: null,
                  ejectionEvent: null,
                  ejectionEndsAt: null,
                  blackoutActive: false,
                  blackoutEndsAt: null,
                  completedTurnsThisRound: null,
                  players: reset
                });
              }
            }}
            onLeaveRoom={leaveRoom}
          />
        ) : (
          <LobbyScreen
            lang={lang}
            currentUserUid={currentUser.uid}
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
                showToast(t.msgCodeCopied, 'success');
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
              if (isBotPlayer(targetPlayer, uid)) {
                showToast(t.toastCannotAssignBotHost, 'danger');
                return;
              }
              db.ref(`spy_rooms/${currentRoomCode}/hostUid`).set(uid);
            }}
            onKickPlayer={uid => db.ref(`spy_rooms/${currentRoomCode}/players/${uid}`).remove()}
            onSendFriendRequest={async targetUid => {
              await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).set({
                name: profileNameRef.current || currentUser.displayName || 'Agent',
                avatar: profileAvatarRef.current || currentUser.photoURL || '',
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              await db.ref(`users/${currentUser.uid}/sentRequests/${targetUid}`).set(true);
              showToast(t.msgRequestSent, 'success');
            }}
            onAcceptFriendRequest={async uid => {
              const req = friendRequests[uid];
              const now = firebase.database.ServerValue.TIMESTAMP;
              await db.ref(`users/${currentUser.uid}/friends/${uid}`).set({
                name: req?.name || 'Friend',
                avatar: req?.avatar || '',
                since: now
              });
              await db.ref(`users/${uid}/friends/${currentUser.uid}`).set({
                name: profileNameRef.current || currentUser.displayName || 'Agent',
                avatar: profileAvatarRef.current || currentUser.photoURL || '',
                since: now
              });
              await db.ref(`users/${currentUser.uid}/friendRequests/${uid}`).remove();
              await db.ref(`users/${uid}/sentRequests/${currentUser.uid}`).remove();
              showToast(t.msgFriendAdded, 'success');
            }}
            onSendChatMessage={txt => {
              db.ref(`spy_rooms/${currentRoomCode}/lobbyChat`).push({
                sender: profileNameRef.current || currentUser.displayName || 'Agent',
                text: txt
              });
            }}
            onAcceptJoinRequest={handleAcceptJoinRequest}
            onDeclineJoinRequest={handleDeclineJoinRequest}
            onToast={showToast}
          />
        )}

        {/* Host Approval Popup Modal - Sorted strictly FIFO by timestamp */}
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

        {/* Cinematic Ejection Overlay in room */}
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

  const badgeCount =
    Object.keys(friendRequests || {}).length + Object.keys(roomInvites || {}).length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-[#030712] relative selection:bg-sky-500/30">
      <div className="stars-overlay" />
      <OfflineIndicator lang={lang} />

      <RankModal
        lang={lang}
        xp={userXp}
        isOpen={rankModalOpen}
        onClose={() => setRankModalOpen(false)}
      />

      {/* Quick Matchmaking Modal */}
      <QuickMatchModal
        lang={lang}
        currentUserUid={currentUser.uid}
        currentUserName={profileName}
        currentUserAvatar={profileAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`}
        isOpen={quickMatchModalOpen}
        onClose={() => setQuickMatchModalOpen(false)}
        onMatchFound={code => {
          joinRoom(code);
        }}
        onToast={showToast}
      />

      {/* Cinematic Ejection Overlay */}
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

      {/* Main Scrollable Viewport above Anchored BottomNav */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden overscroll-none px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-4 relative z-10">
        {activeTab === 'home' && (
          <HomeTab
          lang={lang}
          userName={profileName}
          userAvatar={profileAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`}
          userXp={userXp}
          onOpenRank={() => setRankModalOpen(true)}
          onOpenQuickMatch={() => setQuickMatchModalOpen(true)}
          onOpenCreateRoom={cat => {
            setCreateInitialCategory(cat);
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
              showToast(t.msgCodeCopied, 'success');
            }
          }}
          onSendRequest={async code => {
            let targetUid = friendCodeCache.get(code);
            if (!targetUid) {
              const codeSnap = await db.ref(`friendCodes/${code}`).once('value');
              if (!codeSnap.exists()) return showToast(t.errFriendCodeNotFound, 'danger');
              targetUid = codeSnap.val();
              if (targetUid) friendCodeCache.set(code, targetUid);
            }
            if (!targetUid) return showToast(t.errFriendCodeNotFound, 'danger');
            if (targetUid === currentUser.uid) return showToast(t.errCannotAddSelf, 'danger');
            if (friends[targetUid]) return showToast(t.errAlreadyFriends, 'danger');
            if (sentRequests[targetUid]) return showToast(t.errRequestAlreadySent, 'danger');

            await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).set({
              name: profileName || currentUser.displayName || 'Agent',
              avatar: profileAvatar || currentUser.photoURL || '',
              timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            await db.ref(`users/${currentUser.uid}/sentRequests/${targetUid}`).set(true);
            showToast(t.msgRequestSent, 'success');
          }}
          onAcceptRequest={async fromUid => {
            const req = friendRequests[fromUid];
            const now = firebase.database.ServerValue.TIMESTAMP;
            await db.ref(`users/${currentUser.uid}/friends/${fromUid}`).set({
              name: req?.name || 'Friend',
              avatar: req?.avatar || '',
              since: now
            });
            await db.ref(`users/${fromUid}/friends/${currentUser.uid}`).set({
              name: profileName || currentUser.displayName || 'Agent',
              avatar: profileAvatar || currentUser.photoURL || '',
              since: now
            });
            await db.ref(`users/${currentUser.uid}/friendRequests/${fromUid}`).remove();
            await db.ref(`users/${fromUid}/sentRequests/${currentUser.uid}`).remove();
            showToast(t.msgFriendAdded, 'success');
          }}
          onDeclineRequest={async fromUid => {
            await db.ref(`users/${currentUser.uid}/friendRequests/${fromUid}`).remove();
            await db.ref(`users/${fromUid}/sentRequests/${currentUser.uid}`).remove();
          }}
          onRemoveFriend={async uid => {
            await db.ref(`users/${currentUser.uid}/friends/${uid}`).remove();
            await db.ref(`users/${uid}/friends/${currentUser.uid}`).remove();
            showToast(t.msgFriendRemoved);
          }}
          onJoinFromInvite={async (fromUid, rCode) => {
            await db.ref(`users/${currentUser.uid}/roomInvites/${fromUid}`).remove();
            joinRoom(rCode);
          }}
          onDismissInvite={async fromUid => {
            await db.ref(`users/${currentUser.uid}/roomInvites/${fromUid}`).remove();
          }}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          lang={lang}
          userId={currentUser.uid}
          userName={profileName}
          userAvatar={profileAvatar}
          onUpdateProfile={async (newName, newAvatar) => {
            setProfileName(newName);
            setProfileAvatar(newAvatar);
            try {
              const isWebUrl = typeof newAvatar === 'string' && (newAvatar.startsWith('http://') || newAvatar.startsWith('https://'));
              await currentUser.updateProfile({
                displayName: newName,
                ...(isWebUrl ? { photoURL: newAvatar } : {})
              });
            } catch (authErr) {
              console.warn('Firebase Auth profile update notice:', authErr);
            }

            // 1. Update user profile in RTDB & refresh local cache
            await db.ref(`users/${currentUser.uid}`).update({
              name: newName,
              avatar: newAvatar
            });
            userProfileCache.set(currentUser.uid, { name: newName, avatar: newAvatar, friendCode: myFriendCode });

            // 2. Synchronize new name/avatar to all friends' records in a SINGLE atomic multi-path write (no N+1 loop)
            try {
              const friendUids = Object.keys(friends || {});
              const targetUids = friendUids.length > 0
                ? friendUids
                : Object.keys((await db.ref(`users/${currentUser.uid}/friends`).once('value')).val() || {});
              if (targetUids.length > 0) {
                const multiUpdates: Record<string, string> = {};
                for (const fUid of targetUids) {
                  multiUpdates[`users/${fUid}/friends/${currentUser.uid}/name`] = newName;
                  multiUpdates[`users/${fUid}/friends/${currentUser.uid}/avatar`] = newAvatar;
                }
                await db.ref().update(multiUpdates);
              }
            } catch (syncErr) {
              console.warn('Friends sync notice:', syncErr);
            }

            // 3. Update current active room player and host name
            if (currentRoomCode) {
              await db.ref(`spy_rooms/${currentRoomCode}/players/${currentUser.uid}`).update({
                name: newName,
                avatar: newAvatar
              }).catch(() => {});

              if (roomData && roomData.hostUid === currentUser.uid) {
                await db.ref(`spy_rooms/${currentRoomCode}/hostName`).set(newName).catch(() => {});
              }
            }
          }}
          onChangeLanguage={l => setLang(l)}
          onLogout={() => auth.signOut()}
          onToast={showToast}
        />
      )}

      </main>

      {/* Applicant Waiting Approval Modal */}
      {pendingJoinApproval && (
        <ApplicantWaitingApprovalModal
          lang={lang}
          roomCode={pendingJoinApproval.code}
          hostName={pendingJoinApproval.hostName}
          queuePosition={pendingJoinApproval.queuePosition}
          onCancel={handleCancelJoinRequest}
        />
      )}

      {/* Bottom Nav Bar */}
      <BottomNav
        lang={lang}
        currentTab={activeTab}
        badgeCount={badgeCount}
        onSelectTab={setActiveTab}
      />

      {/* 🚀 Mandatory Game Update Modal: Blocks app until user taps update & restarts */}
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
