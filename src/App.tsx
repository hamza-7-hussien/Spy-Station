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
import { SciFiAirlockDoors } from './components/SciFiAirlockDoors';
import { BottomNav } from './components/BottomNav';
import { TopNotification } from './components/TopNotification';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { RankModal } from './components/RankModal';
import { UfoLoader } from './components/UfoLoader';
import { HostJoinApprovalModal } from './components/HostJoinApprovalModal';
import { ApplicantWaitingApprovalModal } from './components/ApplicantWaitingApprovalModal';
import { QuickMatchModal } from './components/QuickMatchModal';
import { CinematicEjectionOverlay } from './components/CinematicEjectionOverlay';
import {
  generateBotSilentDrawing,
  generateSmartBotClue,
  generateSmartBotVote,
  generateUniqueBotName
} from './aiBot';
import { useVoiceChat } from './hooks/useVoiceChat';
import { MandatoryUpdateModal } from './components/MandatoryUpdateModal';
import {
  BLACKOUT_DURATION_MS,
  DEFAULT_VOTE_SECONDS,
  areAllEligibleVotesSubmitted,
  computeInitialGameSetup,
  computeNextTurnState,
  getEffectiveTurnSeconds,
  getEligibleVoters,
  isBotPlayer,
  resolveVoteOutcome,
  shouldResetGameOverToLobby,
  shouldTriggerBlackout,
  validateGameStart
} from './gameEngine';

function toFirebaseUpdatePayload(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, val]) => {
    out[key] = val === undefined ? null : val;
  });
  return out;
}

const CURRENT_APP_VERSION = '2.5.1';
const ROUND_ANNOUNCE_MS = 2800;

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('spy_station_lang') as Language) || 'ar';
  });

  // Mandatory update enforcement: requires tapping the update button to enter
  const [mandatoryUpdateAvailable, setMandatoryUpdateAvailable] = useState<boolean>(() => {
    const installed = localStorage.getItem('spy_station_installed_version');
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
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [friendRequests, setFriendRequests] = useState<Record<string, FriendRequest>>({});
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});
  const [roomInvites, setRoomInvites] = useState<Record<string, RoomInvite>>({});

  // Public rooms
  const [publicRooms, setPublicRooms] = useState<Record<string, RoomData>>({});

  // Modals
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [quickMatchModalOpen, setQuickMatchModalOpen] = useState(false);
  const [airlockOpen, setAirlockOpen] = useState(true);
  const wasPlayingRef = useRef(false);

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

  // Screen Transition: Airlock Doors Opening on Game Start
  useEffect(() => {
    const isPlaying = roomData?.status === 'playing';
    if (isPlaying && !wasPlayingRef.current) {
      setAirlockOpen(false);
      const timer = window.setTimeout(() => {
        setAirlockOpen(true);
      }, 150);
      return () => window.clearTimeout(timer);
    }
    wasPlayingRef.current = isPlaying;
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

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: 'normal' | 'danger' | 'success';
  } | null>(null);

  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundAnnounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomListenerRef = useRef<(() => void) | null>(null);
  const annListenerRef = useRef<(() => void) | null>(null);
  const turnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voteIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchdogIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTurnTickRunningRef = useRef(false);
  const isVoteTickRunningRef = useRef(false);
  const purgedRoomsRef = useRef<Map<string, number>>(new Map());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastRoomSnapshotRef = useRef<RoomData | null>(null);
  const pendingReqCleanupsRef = useRef<(() => void) | null>(null);
  const activeFriendListenersRef = useRef<(() => void)[]>([]);
  const scheduledBotVotesRef = useRef<Set<string>>(new Set());
  const profileNameRef = useRef(profileName);
  const profileAvatarRef = useRef(profileAvatar);

  useEffect(() => {
    profileNameRef.current = profileName;
    profileAvatarRef.current = profileAvatar;
  }, [profileName, profileAvatar]);

  const t = dictionary[lang];

  const showToast = (message: string, type: 'normal' | 'danger' | 'success' = 'normal') => {
    if (type === 'danger') sound.playChime([[380, 0, 0.12], [300, 90, 0.18]], 'triangle');
    else if (type === 'success') sound.playChime([[600, 0, 0.1], [880, 90, 0.18]], 'sine');
    else sound.playTone(540, 'sine', 0.1);

    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const voice = useVoiceChat({
    roomCode: currentRoomCode || '',
    currentUserUid: currentUser?.uid || '',
    currentUserName: profileName || currentUser?.displayName || 'Agent',
    onToast: showToast,
    permissionErrorMsg: t.voicePermissionError
  });

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
            if (installed !== data.version) {
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

  // Auth listener with persistent session maintenance
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        localStorage.setItem('spy_station_has_session', 'true');
        setProfileName(user.displayName || 'Agent');
        setProfileAvatar(user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`);
        // Ensure auth token remains valid and refreshed
        user.getIdToken(false).catch(() => {});
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

    // Friends list
    const friendsRef = db.ref(`users/${currentUser.uid}/friends`);
    const onFriendsChange = (snap: firebase.database.DataSnapshot) => {
      const f = snap.val() || {};
      setFriends(f);

      activeFriendListenersRef.current.forEach(cleanup => cleanup());
      activeFriendListenersRef.current = [];

      Object.keys(f).forEach(fUid => {
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

        const uRef = db.ref(`users/${fUid}`);
        const onProfile = (uSnap: firebase.database.DataSnapshot) => {
          const uData = uSnap.val();
          if (uData && (uData.name || uData.avatar)) {
            setFriends(prev => {
              if (!prev[fUid]) return prev;
              if (prev[fUid].name === uData.name && prev[fUid].avatar === uData.avatar) return prev;
              return {
                ...prev,
                [fUid]: {
                  ...prev[fUid],
                  name: uData.name || prev[fUid].name,
                  avatar: uData.avatar || prev[fUid].avatar
                }
              };
            });
          }
        };
        uRef.on('value', onProfile);
        activeFriendListenersRef.current.push(() => uRef.off('value', onProfile));
      });
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

  // Scoped Public Stations listener: only active while browsing Stations tab (not in-game)
  useEffect(() => {
    if (!currentUser || currentRoomCode || activeTab !== 'stations') {
      return;
    }

    const roomsRef = db.ref('spy_rooms');
    const onRoomsChange = (snap: firebase.database.DataSnapshot) => {
      const all = snap.val() || {};
      const validRooms: Record<string, RoomData> = {};
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

        if (isBotHost) {
          if (canAttemptPurge) {
            purgedRoomsRef.current.set(code, now);
            db.ref(`spy_rooms/${code}`).remove().catch(() => {});
          }
          return;
        }

        if (humanList.length === 0 && ageMs > 25000) {
          if (canAttemptPurge) {
            purgedRoomsRef.current.set(code, now);
            db.ref(`spy_rooms/${code}`).remove().catch(() => {});
          }
          return;
        }

        if (humanList.length > 0 || ageMs <= 25000) {
          validRooms[code] = r;
        }
      });

      setPublicRooms(validRooms);
    };

    roomsRef.on('value', onRoomsChange);
    return () => {
      roomsRef.off('value', onRoomsChange);
    };
  }, [currentUser, currentRoomCode, activeTab]);

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
            word: null,
            wordAr: null,
            turnOrder: null,
            turnIndex: 0,
            turnTimeLeft: null,
            voteTimeLeft: null,
            votes: null,
            currentDrawing: null,
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

  // Timer sync for Host (re-entrancy guarded, pauses during ejection cinematic)
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

    // Turn timer
    if (roomData.status === 'playing') {
      if (!turnIntervalRef.current) {
        turnIntervalRef.current = setInterval(async () => {
          if (isTurnTickRunningRef.current) return;
          isTurnTickRunningRef.current = true;
          try {
            const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
            const room = snap.val() as RoomData | null;
            if (!room || room.status !== 'playing') {
              if (turnIntervalRef.current) {
                clearInterval(turnIntervalRef.current);
                turnIntervalRef.current = null;
              }
              return;
            }

            const now = Date.now();

            // Clear blackout cleanly when duration expires
            if (room.blackoutActive && (!room.blackoutEndsAt || now >= room.blackoutEndsAt)) {
              await db.ref(`spy_rooms/${currentRoomCode}`).update({
                blackoutActive: false,
                blackoutEndsAt: null
              });
            }

            // Pause turn countdown while cinematic ejection overlay is playing
            if (room.ejectionEndsAt && now < room.ejectionEndsAt) {
              return;
            } else if (room.ejectionEndsAt && now >= room.ejectionEndsAt) {
              await db.ref(`spy_rooms/${currentRoomCode}/ejectionEndsAt`).set(null);
            }

            const defaultTurnSeconds = getEffectiveTurnSeconds(room.gameMode, room.turnSeconds);
            const left = room.turnTimeLeft != null ? room.turnTimeLeft : defaultTurnSeconds;

            // Host-authoritative Blackout Protocol Trigger
            if (shouldTriggerBlackout(room, left)) {
              await db.ref(`spy_rooms/${currentRoomCode}`).update({
                blackoutActive: true,
                blackoutEndsAt: now + BLACKOUT_DURATION_MS,
                lastBlackoutRound: room.round || 1
              });
            }

            if (left <= 1) {
              await advanceTurn(room.turnIndex, true);
            } else {
              await db.ref(`spy_rooms/${currentRoomCode}/turnTimeLeft`).set(left - 1);
            }
          } catch {
            // ignore transient read/write errors
          } finally {
            isTurnTickRunningRef.current = false;
          }
        }, 1000);
      }
    } else {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
      isTurnTickRunningRef.current = false;
    }

    // Voting timer
    if (roomData.status === 'voting') {
      if (!voteIntervalRef.current) {
        voteIntervalRef.current = setInterval(async () => {
          if (isVoteTickRunningRef.current) return;
          isVoteTickRunningRef.current = true;
          try {
            const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
            const room = snap.val() as RoomData | null;
            if (!room || room.status !== 'voting') {
              if (voteIntervalRef.current) {
                clearInterval(voteIntervalRef.current);
                voteIntervalRef.current = null;
              }
              return;
            }

            const eligibleVoters = getEligibleVoters(room.players);
            const unvotedBots = eligibleVoters.filter(p => isBotPlayer(p) && !room.votes?.[p.uid]);
            const unvotedHumansCount = eligibleVoters.filter(p => !isBotPlayer(p) && !room.votes?.[p.uid]).length;
            const currentVoteTimeLeft = room.voteTimeLeft ?? DEFAULT_VOTE_SECONDS;

            // Commit bot votes once all eligible humans voted or timer <= 2s
            if (unvotedBots.length > 0 && (currentVoteTimeLeft <= 2 || unvotedHumansCount === 0)) {
              const spies = room.spies || [];
              const botVoteUpdates: Record<string, string> = {};
              const nextVotes = { ...(room.votes || {}) };
              unvotedBots.forEach(bot => {
                const isBotSpy = spies.includes(bot.uid);
                const target = generateSmartBotVote({
                  botUid: bot.uid,
                  isSpy: isBotSpy,
                  activePlayers: Object.values(room.players || {}).filter(p => !p.isSpectator),
                  spies,
                  gameChat: room.gameChat
                });
                botVoteUpdates[`spy_rooms/${currentRoomCode}/votes/${bot.uid}`] = target;
                nextVotes[bot.uid] = target;
              });
              room.votes = nextVotes;
              await db.ref().update(botVoteUpdates);
            }

            if (currentVoteTimeLeft <= 1 || areAllEligibleVotesSubmitted(room)) {
              if (voteIntervalRef.current) {
                clearInterval(voteIntervalRef.current);
                voteIntervalRef.current = null;
              }
              await processVoteResults(room);
            } else {
              await db.ref(`spy_rooms/${currentRoomCode}/voteTimeLeft`).set(currentVoteTimeLeft - 1);
            }
          } catch {
            // ignore transient read/write errors
          } finally {
            isVoteTickRunningRef.current = false;
          }
        }, 1000);
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

  // Award XP at game end
  const awardXP = async (playersObj: Record<string, PlayerData>, spies: string[], winner: 'crew' | 'spies') => {
    const updates: Record<string, number> = {};
    for (const uid in playersObj) {
      if (uid.startsWith('bot_') || playersObj[uid]?.isBot) continue;
      const isSpy = spies.includes(uid);
      const isWinner = (winner === 'crew' && !isSpy) || (winner === 'spies' && isSpy);
      const gain = 10 + (isWinner ? 25 : 0);
      try {
        const snap = await db.ref(`users/${uid}/score`).once('value');
        updates[`users/${uid}/score`] = (snap.val() || 0) + gain;
      } catch {
        // ignore
      }
    }
    if (Object.keys(updates).length > 0) {
      db.ref().update(updates).catch(() => {});
    }
  };

  // Bot Automation Effect (Handled by Host)
  useEffect(() => {
    // Auto-heal: If host is a bot or missing, auto-reassign to first human
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

    if (!isHost || !currentRoomCode || !roomData) return;

    let botTimer: ReturnType<typeof setTimeout> | null = null;
    let advanceTimer: ReturnType<typeof setTimeout> | null = null;

    // 1. Bot Turns during Gameplay
    if (roomData.status === 'playing') {
      const turnOrder = roomData.turnOrder || [];
      const turnIndex = roomData.turnIndex || 0;
      const currentSpeakerUid = turnOrder[turnIndex];
      const speaker = currentSpeakerUid ? roomData.players?.[currentSpeakerUid] : null;

      if (currentSpeakerUid && isBotPlayer(speaker, currentSpeakerUid)) {
        if (roomData.completedTurnsThisRound?.[currentSpeakerUid]) {
          advanceTurn(turnIndex);
          return;
        }

        const ejectionRemaining =
          roomData.ejectionEndsAt && roomData.ejectionEndsAt > Date.now()
            ? roomData.ejectionEndsAt - Date.now()
            : 0;
        const botThinkDelay = Math.max(2000, ejectionRemaining + 1200);

        botTimer = setTimeout(async () => {
          const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
          const latest = snap.val() as RoomData | null;
          if (
            latest?.status === 'playing' &&
            latest?.turnOrder?.[latest?.turnIndex || 0] === currentSpeakerUid
          ) {
            if (latest?.completedTurnsThisRound?.[currentSpeakerUid]) {
              advanceTurn(latest?.turnIndex);
              return;
            }
            const latestSpeaker = latest?.players?.[currentSpeakerUid];
            const isBotSpy = (latest?.spies || []).includes(currentSpeakerUid);

            if (latest.gameMode === 'silent') {
              // Silent Radar Mode: bots draw strokes on the canvas without text clues
              const strokes = generateBotSilentDrawing(latest?.wordCategory || 'players', isBotSpy);
              await db.ref(`spy_rooms/${currentRoomCode}/currentDrawing`).set(strokes);
              advanceTimer = setTimeout(() => {
                advanceTurn(latest?.turnIndex);
              }, 1800);
              return;
            }

            const prevClues = Object.values(latest?.gameChat || {}).map(c => c.text || '');
            const smartClue = generateSmartBotClue({
              isSpy: isBotSpy,
              word: latest?.word || '',
              wordAr: latest?.wordAr || '',
              category: latest?.wordCategory || 'places',
              language: lang,
              previousClues: prevClues,
              gameMode: latest?.gameMode,
              chameleonWord: latestSpeaker?.chameleonWord,
              chameleonWordAr: latestSpeaker?.chameleonWordAr
            });

            // STRICT CONSTRAINT: Bots can ONLY say a single word (no spaces, no punctuation)
            const singleWordClue =
              (smartClue || '')
                .trim()
                .split(/\s+/)[0]
                .replace(/[،,.:;!?"'()[\]{}<>\\/]/g, '')
                .trim() || (lang === 'ar' ? 'معروف' : 'known');

            await db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).set({
              text: singleWordClue,
              timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            await db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
              uid: currentSpeakerUid,
              sender: latestSpeaker?.name || speaker?.name || 'Bot Agent',
              avatar:
                latestSpeaker?.avatar ||
                speaker?.avatar ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSpeakerUid}`,
              text: singleWordClue,
              round: latest?.round || 1,
              timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            setTimeout(() => {
              db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).remove().catch(() => {});
            }, 6000);

            advanceTimer = setTimeout(() => {
              advanceTurn(latest?.turnIndex);
            }, 1200);
          }
        }, botThinkDelay);

        return () => {
          if (botTimer) clearTimeout(botTimer);
          if (advanceTimer) clearTimeout(advanceTimer);
        };
      }
    }

    // 2. Bot Votes during Voting (Staggered and respecting disqualifiedVote)
    if (roomData.status === 'voting') {
      const botsWithoutVotes = Object.values(roomData.players || {}).filter(
        p => isBotPlayer(p) && !p.isSpectator && !p.disqualifiedVote && !roomData.votes?.[p.uid]
      );
      botsWithoutVotes.forEach((bot, botIdx) => {
        if (scheduledBotVotesRef.current.has(bot.uid)) return;
        scheduledBotVotesRef.current.add(bot.uid);

        const delay = 1800 + botIdx * 1200 + Math.random() * 800;
        setTimeout(async () => {
          if (!currentRoomCode) return;
          const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
          const latest = snap.val() as RoomData | null;
          if (latest?.status === 'voting' && !latest?.votes?.[bot.uid] && !latest?.players?.[bot.uid]?.disqualifiedVote) {
            const activePlayers = Object.values(latest.players || {}).filter(p => !p.isSpectator);
            const spies = latest.spies || [];
            const isBotSpy = spies.includes(bot.uid);
            const chosenTarget = generateSmartBotVote({
              botUid: bot.uid,
              isSpy: isBotSpy,
              activePlayers,
              spies,
              gameChat: latest.gameChat
            });
            await db.ref(`spy_rooms/${currentRoomCode}/votes/${bot.uid}`).set(chosenTarget);
          }
        }, delay);
      });
    } else {
      scheduledBotVotesRef.current.clear();
    }

    return () => {
      if (botTimer) clearTimeout(botTimer);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  }, [
    isHost,
    currentRoomCode,
    roomData?.status,
    roomData?.turnIndex,
    roomData?.round,
    roomData?.turnOrder?.[roomData?.turnIndex || 0],
    roomData?.ejectionEndsAt
  ]);

  // Advance Turn logic (Guarded to guarantee at most ONE turn per player/bot per round)
  const advanceTurn = async (expectedTurnIndex?: number, wasTimeout: boolean = false) => {
    if (!currentRoomCode) return;
    try {
      let afkKickedName: string | null = null;
      await db.ref(`spy_rooms/${currentRoomCode}`).transaction(room => {
        if (!room) return room;
        const result = computeNextTurnState(room as RoomData, {
          expectedTurnIndex,
          wasTimeout
        });
        if (!result.changed) return room;
        afkKickedName = result.afkKickedName;

        const cleanRoom = { ...result.room } as Record<string, unknown>;
        Object.keys(cleanRoom).forEach(k => {
          if (cleanRoom[k] === undefined) delete cleanRoom[k];
        });
        return cleanRoom;
      });

      if (afkKickedName) {
        broadcastAnnouncement(
          lang === 'ar'
            ? `تم استبعاد ${afkKickedName} تلقائياً لعدم التفاعل لمدة 3 جولات متتالية ⚠️`
            : `${afkKickedName} was auto-kicked for being inactive for 3 rounds ⚠️`,
          'danger'
        );
      }
    } catch {
      // ignore
    }
  };

  // Process Vote Results (Atomic transition via resolveVoteOutcome)
  const processVoteResults = async (room: RoomData) => {
    if (!currentRoomCode || !isHost) return;

    try {
      const claim = await db.ref(`spy_rooms/${currentRoomCode}/status`).transaction(status => {
        if (status !== 'voting') return;
        return 'resolving';
      });
      if (!claim.committed) return;

      const resolution = resolveVoteOutcome(room, Date.now());
      await db
        .ref(`spy_rooms/${currentRoomCode}`)
        .update(toFirebaseUpdatePayload(resolution.nextRoomFields as Record<string, unknown>));

      const playersObj = (resolution.nextRoomFields.players as Record<string, PlayerData>) || room.players || {};
      const ejectedName = resolution.ejectedName || '?';

      if (resolution.outcome === 'nobody_ejected') {
        broadcastAnnouncement(t.annNobodyEjected, 'normal');
      } else if (resolution.outcome === 'crew_win') {
        broadcastAnnouncement(t.annCrewWins.replace('{name}', ejectedName), 'success');
        awardXP(playersObj, room.spies || [], 'crew');
      } else if (resolution.outcome === 'spy_ejected_continue') {
        broadcastAnnouncement(t.annSpyEjectedMoreRemain.replace('{name}', ejectedName), 'danger');
      } else if (resolution.outcome === 'spies_win') {
        broadcastAnnouncement(t.annSpiesWin.replace('{name}', ejectedName), 'danger');
        awardXP(playersObj, room.spies || [], 'spies');
      } else if (resolution.outcome === 'innocent_ejected_continue') {
        broadcastAnnouncement(t.annInnocentEjected.replace('{name}', ejectedName), 'danger');
      }
    } catch {
      await db.ref(`spy_rooms/${currentRoomCode}/status`).set('voting').catch(() => {});
    }
  };

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

    // Announcement listener
    if (annListenerRef.current) annListenerRef.current();
    const annRef = db.ref(`spy_rooms/${cleanCode}/announcement`);
    annRef.on('value', snap => {
      const ann = snap.val();
      if (ann && ann.msg && ann.timestamp && Date.now() - ann.timestamp < 3500) {
        showToast(ann.msg, ann.type);
      }
    });
    annListenerRef.current = () => annRef.off();

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

      // In waiting lobby, ensure every player is an active astronaut (not spectator)
      if (data.status === 'waiting' && data.players[currentUser.uid]?.isSpectator) {
        db.ref(`spy_rooms/${cleanCode}/players/${currentUser.uid}/isSpectator`).set(false).catch(() => {});
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
          word: null,
          wordAr: null,
          round: null,
          turnOrder: null,
          turnIndex: null,
          turnTimeLeft: null,
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
            word: null,
            wordAr: null,
            turnOrder: null,
            turnIndex: 0,
            turnTimeLeft: null,
            voteTimeLeft: null,
            votes: null,
            currentDrawing: null,
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

      // If playing: Sanitize turnOrder if someone left
      if (data.status === 'playing' && data.turnOrder && data.turnOrder.length > 0) {
        const cleanedTurnOrder = data.turnOrder.filter(uid => playersObj[uid] && !playersObj[uid].isSpectator);
        if (cleanedTurnOrder.length > 0 && cleanedTurnOrder.length !== data.turnOrder.length) {
          const effectiveHostUid =
            data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
              ? data.hostUid
              : activePlayers[0]?.uid;
          if (currentUser.uid === effectiveHostUid) {
            let nextIndex = data.turnIndex || 0;
            if (nextIndex >= cleanedTurnOrder.length) {
              nextIndex = 0;
            }
            db.ref(`spy_rooms/${cleanCode}`).update({
              turnOrder: cleanedTurnOrder,
              turnIndex: nextIndex,
              turnTimeLeft: getEffectiveTurnSeconds(data.gameMode, data.turnSeconds)
            });
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
                word: null,
                wordAr: null,
                round: null,
                turnOrder: null,
                turnIndex: null,
                turnTimeLeft: null,
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
              word: null,
              wordAr: null,
              wordCategory: null,
              wordImage: null,
              turnOrder: null,
              turnIndex: 0,
              turnTimeLeft: null,
              voteTimeLeft: null,
              votes: null,
              currentDrawing: null,
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
        votes: null,
        winnerTeam: null,
        gameChat: null,
        spyChat: null,
        speechBubbles: null,
        scrambleActive: false,
        currentDrawing: null,
        players: setup.players
      });

      broadcastAnnouncement(t.annMissionStarted, 'normal');
    } catch (err) {
      console.error('Failed to start mission:', err);
      showToast(t.toastGameStartError, 'danger');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#030712] text-slate-100">
        <UfoLoader />
        <div className="mt-4 text-xs font-bold text-sky-400 font-heading tracking-widest uppercase animate-pulse">
          SPY STATION INITIALIZING...
        </div>
      </div>
    );
  }

  // Not logged in -> Auth Screen
  if (!currentUser) {
    return (
      <>
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <TopNotification toast={toast} />
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
      <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 bg-[#030712] relative overflow-x-hidden">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <TopNotification toast={toast} />
        <CreateRoomScreen
          lang={lang}
          initialCategory={createInitialCategory}
          isEditing={isEditingRoom}
          initialValues={
            isEditingRoom && roomData
              ? {
                  visibility: roomData.visibility,
                  categories: roomData.categories,
                  gameMode: roomData.gameMode,
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

  // In Room Flow
  if (currentRoomCode && roomData) {
    const isPlaying = roomData.status === 'playing';
    const isVoting = roomData.status === 'voting';
    const isGameOver = roomData.status === 'gameover';
    const myPlayer = (roomData.players || {})[currentUser.uid];

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 bg-[#030712] relative overflow-x-hidden selection:bg-sky-500/30">
        <div className="stars-overlay" />
        <OfflineIndicator lang={lang} />
        <TopNotification toast={toast} />

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
        <SciFiAirlockDoors
          isOpen={airlockOpen}
          label={lang === 'ar' ? 'بوابة المحطة 07 // بدء الجولة' : 'STATION AIRLOCK // MISSION START'}
          sublabel={lang === 'ar' ? 'تم تأكيد الهوية والتصريح الأمني' : 'SECURITY CLEARANCE CONFIRMED'}
        />

        {/* Room Screens */}
        {isPlaying ? (
          <GameScreen
            lang={lang}
            currentUserUid={currentUser.uid}
            roomCode={currentRoomCode}
            room={roomData}
            isVoiceJoined={voice.isJoined}
            isVoiceMuted={voice.isMuted}
            isVoiceDeafened={voice.isDeafened}
            isVoiceSpeaking={voice.isSpeaking}
            voiceUsers={voice.voiceUsers}
            onJoinVoice={voice.joinVoice}
            onLeaveVoice={voice.leaveVoice}
            onToggleVoiceMute={voice.toggleMute}
            onToggleVoiceDeafen={voice.toggleDeafen}
            onAdvanceTurn={() => advanceTurn(roomData?.turnIndex)}
            onTriggerEmergencyVote={() => {
              db.ref(`spy_rooms/${currentRoomCode}`).update({
                status: 'voting',
                voteTimeLeft: DEFAULT_VOTE_SECONDS,
                votes: null
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
                round: targetRound,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              db.ref(`spy_rooms/${currentRoomCode}/players/${currentUser.uid}/missedTurns`).set(0).catch(() => {});
              advanceTurn(targetTurnIndex);
            }}
            onSkipTurn={(targetRound, targetTurnIndex) => {
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

              const pName = profileNameRef.current || currentUser.displayName || 'Agent';
              const pAvatar =
                profileAvatarRef.current ||
                currentUser.photoURL ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`;
              const skipMsg = lang === 'ar' ? '⏩ تفويت الدور' : '⏩ Pass Turn';
              db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentUser.uid}`).set({
                text: skipMsg,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
                uid: currentUser.uid,
                sender: pName,
                avatar: pAvatar,
                text: skipMsg,
                round: targetRound,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              setTimeout(() => {
                db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentUser.uid}`).remove().catch(() => {});
              }, 4000);
              advanceTurn(targetTurnIndex);
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
            onCastVote={target => {
              db.ref(`spy_rooms/${currentRoomCode}/votes/${currentUser.uid}`).set(target);
              showToast(t.msgVoteRecorded, 'success');
            }}
            onLeaveRoom={leaveRoom}
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
                  word: null,
                  wordAr: null,
                  round: null,
                  turnOrder: null,
                  turnIndex: null,
                  turnTimeLeft: null,
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
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 bg-[#030712] relative overflow-x-hidden selection:bg-sky-500/30">
      <div className="stars-overlay" />
      <OfflineIndicator lang={lang} />
      <TopNotification toast={toast} />

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

      {/* Main Tabs */}
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
          onCopyCode={() => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(myFriendCode);
              showToast(t.msgCodeCopied, 'success');
            }
          }}
          onSendRequest={async code => {
            const codeSnap = await db.ref(`friendCodes/${code}`).once('value');
            if (!codeSnap.exists()) return showToast(t.errFriendCodeNotFound, 'danger');
            const targetUid = codeSnap.val();
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

            // 1. Update user profile in RTDB
            await db.ref(`users/${currentUser.uid}`).update({
              name: newName,
              avatar: newAvatar
            });

            // 2. Synchronize new name/avatar to all friends' records so it updates for everyone
            try {
              const friendsSnap = await db.ref(`users/${currentUser.uid}/friends`).once('value');
              const fList = friendsSnap.val() || {};
              const friendUids = Object.keys(fList);
              for (const fUid of friendUids) {
                db.ref(`users/${fUid}/friends/${currentUser.uid}`).update({
                  name: newName,
                  avatar: newAvatar
                }).catch(() => {});
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
