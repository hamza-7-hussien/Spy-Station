/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
  JoinRequest,
  SabotageAbility
} from './types';
import { getCombinedWordList, wordsDB } from './words';
import { getWordImage } from './wordVisuals';
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
import { TopNotification } from './components/TopNotification';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InviteFriendsModal } from './components/InviteFriendsModal';
import { RankModal } from './components/RankModal';
import { UfoLoader } from './components/UfoLoader';
import { HostJoinApprovalModal } from './components/HostJoinApprovalModal';
import { ApplicantWaitingApprovalModal } from './components/ApplicantWaitingApprovalModal';

const ROUND_ANNOUNCE_MS = 2800;

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('spy_station_lang') as Language) || 'ar';
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

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: 'normal' | 'danger' | 'success';
  } | null>(null);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const roomListenerRef = useRef<(() => void) | null>(null);
  const annListenerRef = useRef<(() => void) | null>(null);
  const turnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voteIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastRoomSnapshotRef = useRef<RoomData | null>(null);

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

  // Sync document direction & language
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('spy_station_lang', lang);
  }, [lang]);

  // Auth listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      if (user) {
        setProfileName(user.displayName || 'Agent');
        setProfileAvatar(user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`);
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

  // User Data & Presence
  useEffect(() => {
    if (!currentUser) return;

    // Realtime Profile Sync
    const profileRef = db.ref(`users/${currentUser.uid}`);
    profileRef.on('value', snap => {
      const data = snap.val();
      if (data) {
        if (data.name) setProfileName(data.name);
        if (data.avatar) setProfileAvatar(data.avatar);
      }
    });

    // Presence
    const statusRef = db.ref(`status/${currentUser.uid}`);
    db.ref('.info/connected').on('value', snap => {
      if (snap.val() === true) {
        statusRef.onDisconnect().set({
          state: 'offline',
          last_changed: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
          statusRef.set({
            state: 'online',
            last_changed: firebase.database.ServerValue.TIMESTAMP
          });
        });
      }
    });

    // Score / XP
    const scoreRef = db.ref(`users/${currentUser.uid}/score`);
    scoreRef.on('value', snap => {
      setUserXp(snap.val() || 0);
    });

    // Friend code lookup & migration
    const codeRef = db.ref(`users/${currentUser.uid}/friendCode`);
    codeRef.once('value').then(async snap => {
      let code = snap.val();
      if (!code || code.length !== 8) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let candidate = '';
        let claimed = false;
        let tries = 0;
        while (!claimed && tries < 25) {
          tries++;
          candidate = '';
          for (let i = 0; i < 8; i++) candidate += chars.charAt(Math.floor(Math.random() * chars.length));
          const res = await db.ref(`friendCodes/${candidate}`).transaction(cur => (cur === null ? currentUser.uid : undefined));
          if (res.committed) claimed = true;
        }
        if (claimed) {
          await db.ref(`users/${currentUser.uid}/friendCode`).set(candidate);
          if (code) await db.ref(`friendCodes/${code}`).remove();
          setMyFriendCode(candidate);
        }
      } else {
        setMyFriendCode(code);
      }
    });

    // Friends list
    const friendsRef = db.ref(`users/${currentUser.uid}/friends`);
    friendsRef.on('value', snap => {
      const f = snap.val() || {};
      setFriends(f);
      // Listen to friends' presence statuses and real-time profile updates
      Object.keys(f).forEach(fUid => {
        db.ref(`status/${fUid}`).on('value', s => {
          const val = s.val();
          setFriendStatuses(prev => ({
            ...prev,
            [fUid]: val && val.state === 'online' ? 'online' : 'offline'
          }));
        });

        // Real-time friend profile sync (name/avatar updates automatically for everyone)
        db.ref(`users/${fUid}`).on('value', uSnap => {
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
        });
      });
    });

    // Sent requests
    db.ref(`users/${currentUser.uid}/sentRequests`).on('value', snap => {
      setSentRequests(snap.val() || {});
    });

    // Incoming friend requests
    db.ref(`users/${currentUser.uid}/friendRequests`).on('value', snap => {
      setFriendRequests(snap.val() || {});
    });

    // Room invites
    db.ref(`users/${currentUser.uid}/roomInvites`).on('value', snap => {
      setRoomInvites(snap.val() || {});
    });

    // Public rooms & Bot Host Auto-Purge
    db.ref('spy_rooms').on('value', snap => {
      const all = snap.val() || {};
      const validRooms: Record<string, RoomData> = {};
      const now = Date.now();

      Object.keys(all).forEach(code => {
        const r = all[code];
        if (!r) return;
        const players = r.players || {};
        const pList = Object.values(players) as PlayerData[];
        const humanList = pList.filter(p => !p.isBot && !p.uid.startsWith('bot_'));
        const hostUid = r.hostUid || '';
        const hostPlayer = hostUid ? players[hostUid] : null;
        const isBotHost = hostUid.startsWith('bot_') || hostPlayer?.isBot === true;

        const createdAt = typeof r.createdAt === 'number' ? r.createdAt : now;
        const ageMs = now - createdAt;

        // If a bot is the host, purge it permanently
        if (isBotHost) {
          db.ref(`spy_rooms/${code}`).remove().catch(() => {});
          return;
        }

        // If no humans exist in the room and it's older than 25 seconds, clean it up
        if (humanList.length === 0 && ageMs > 25000) {
          db.ref(`spy_rooms/${code}`).remove().catch(() => {});
          return;
        }

        if (humanList.length > 0 || ageMs <= 25000) {
          validRooms[code] = r;
        }
      });
      setPublicRooms(validRooms);
    });

    // Check saved room code
    const saved = localStorage.getItem('spy_station_room');
    if (saved) {
      db.ref(`spy_rooms/${saved}`).once('value', s => {
        if (s.exists()) {
          joinRoom(saved);
        } else {
          localStorage.removeItem('spy_station_room');
        }
      });
    }
  }, [currentUser]);

  // Handle Host watchdog
  const isHost = !!(roomData && currentUser && roomData.hostUid === currentUser.uid);

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

  // Timer sync for Host
  useEffect(() => {
    if (!isHost || !currentRoomCode || !roomData) {
      if (turnIntervalRef.current) clearInterval(turnIntervalRef.current);
      if (voteIntervalRef.current) clearInterval(voteIntervalRef.current);
      return;
    }

    // Turn timer
    if (roomData.status === 'playing') {
      if (!turnIntervalRef.current) {
        turnIntervalRef.current = setInterval(async () => {
          const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
          const room = snap.val();
          if (!room || room.status !== 'playing') {
            if (turnIntervalRef.current) clearInterval(turnIntervalRef.current);
            turnIntervalRef.current = null;
            return;
          }
          const left = room.turnTimeLeft != null ? room.turnTimeLeft : room.turnSeconds || 20;
          if (left <= 1) {
            advanceTurn();
          } else {
            db.ref(`spy_rooms/${currentRoomCode}/turnTimeLeft`).set(left - 1);
          }
        }, 1000);
      }
    } else {
      if (turnIntervalRef.current) {
        clearInterval(turnIntervalRef.current);
        turnIntervalRef.current = null;
      }
    }

    // Voting timer
    if (roomData.status === 'voting') {
      if (!voteIntervalRef.current) {
        voteIntervalRef.current = setInterval(async () => {
          const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
          const room = snap.val();
          if (!room || room.status !== 'voting') {
            if (voteIntervalRef.current) clearInterval(voteIntervalRef.current);
            voteIntervalRef.current = null;
            return;
          }

          const activeCount = room.players ? Object.values(room.players).filter((p: unknown) => !(p as PlayerData).isSpectator).length : 0;
          const votesCount = room.votes ? Object.keys(room.votes).length : 0;

          if (room.voteTimeLeft <= 1 || (activeCount > 0 && votesCount >= activeCount)) {
            if (voteIntervalRef.current) clearInterval(voteIntervalRef.current);
            voteIntervalRef.current = null;
            processVoteResults(room);
          } else {
            db.ref(`spy_rooms/${currentRoomCode}/voteTimeLeft`).set(room.voteTimeLeft - 1);
          }
        }, 1000);
      }
    } else {
      if (voteIntervalRef.current) {
        clearInterval(voteIntervalRef.current);
        voteIntervalRef.current = null;
      }
    }

    return () => {
      if (turnIntervalRef.current) clearInterval(turnIntervalRef.current);
      if (voteIntervalRef.current) clearInterval(voteIntervalRef.current);
    };
  }, [isHost, currentRoomCode, roomData?.status]);

  // Award XP at game end
  const awardXP = async (playersObj: Record<string, PlayerData>, spies: string[], winner: 'crew' | 'spies') => {
    const updates: Record<string, number> = {};
    for (const uid in playersObj) {
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
      const isHostBot = !hostPlayer || hostPlayer.isBot || hostUid?.startsWith('bot_');
      if (isHostBot) {
        const firstHuman = Object.values(players).find(p => !p.isBot && !p.uid.startsWith('bot_'));
        if (firstHuman) {
          db.ref(`spy_rooms/${currentRoomCode}/hostUid`).set(firstHuman.uid);
        }
      }
    }

    if (!isHost || !currentRoomCode || !roomData) return;

    // 1. Bot Turns during Gameplay
    if (roomData.status === 'playing') {
      const turnOrder = roomData.turnOrder || [];
      const turnIndex = roomData.turnIndex || 0;
      const currentSpeakerUid = turnOrder[turnIndex];
      const speaker = currentSpeakerUid ? roomData.players?.[currentSpeakerUid] : null;

      if (currentSpeakerUid && (currentSpeakerUid.startsWith('bot_') || speaker?.isBot)) {
        const botTimer = setTimeout(async () => {
          const snap = await db.ref(`spy_rooms/${currentRoomCode}`).once('value');
          const latest = snap.val();
          if (
            latest?.status === 'playing' &&
            latest?.turnOrder?.[latest?.turnIndex || 0] === currentSpeakerUid
          ) {
            const botReactions = [
              'أنا مش الجاسوس! ✋',
              'شاكك فيك جداً! 🧐',
              'التلميح ده عاجبني 👍',
              'والله بريء! 😇',
              'مين الجاسوس؟! 🚨',
              'ركزوا في التلميحات! 🔍'
            ];
            const reaction = botReactions[Math.floor(Math.random() * botReactions.length)];
            await db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).set({
              text: reaction,
              timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            await db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
              uid: currentSpeakerUid,
              sender: speaker?.name || 'Bot Agent',
              avatar: speaker?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentSpeakerUid}`,
              text: reaction,
              round: latest?.round || 1,
              timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            setTimeout(() => {
              db.ref(`spy_rooms/${currentRoomCode}/speechBubbles/${currentSpeakerUid}`).remove().catch(() => {});
            }, 6000);

            setTimeout(() => {
              advanceTurn();
            }, 1500);
          }
        }, 2200);

        return () => clearTimeout(botTimer);
      }
    }

    // 2. Bot Votes during Voting
    if (roomData.status === 'voting') {
      const botsWithoutVotes = Object.values(roomData.players || {}).filter(
        p => (p.isBot || p.uid.startsWith('bot_')) && !p.isSpectator && !roomData.votes?.[p.uid]
      );
      if (botsWithoutVotes.length > 0) {
        const botVoteTimer = setTimeout(() => {
          const activePlayers = Object.values(roomData.players || {}).filter(p => !p.isSpectator);
          botsWithoutVotes.forEach(bot => {
            const targets = activePlayers.filter(p => p.uid !== bot.uid).map(p => p.uid);
            const chosen = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : 'SKIP';
            db.ref(`spy_rooms/${currentRoomCode}/votes/${bot.uid}`).set(chosen);
          });
        }, 2500);
        return () => clearTimeout(botVoteTimer);
      }
    }
  }, [isHost, currentRoomCode, roomData?.status, roomData?.turnIndex, roomData?.votes]);

  // Advance Turn logic
  const advanceTurn = async () => {
    if (!currentRoomCode) return;
    try {
      await db.ref(`spy_rooms/${currentRoomCode}`).transaction(room => {
        if (!room || room.status !== 'playing' || !room.turnOrder) return room;
        const playersObj = room.players || {};
        let nextIndex = (room.turnIndex || 0) + 1;

        while (
          nextIndex < room.turnOrder.length &&
          (!playersObj[room.turnOrder[nextIndex]] || playersObj[room.turnOrder[nextIndex]].isSpectator)
        ) {
          nextIndex++;
        }

        if (nextIndex >= room.turnOrder.length) {
          const currentRoundNum = room.round || 1;
          // Voting triggers every 5 rounds (Round 5, 10, 15...)
          if (currentRoundNum % 5 === 0) {
            room.status = 'voting';
            room.voteTimeLeft = 80;
            room.votes = null;
          } else {
            const activeUids = Object.values(playersObj)
              .filter((p: unknown) => !(p as PlayerData).isSpectator)
              .map((p: unknown) => (p as PlayerData).uid);
            room.round = currentRoundNum + 1;
            room.turnOrder = activeUids;
            room.turnIndex = 0;
            room.turnTimeLeft = room.turnSeconds || 20;
            room.votes = null;
          }
        } else {
          room.turnIndex = nextIndex;
          room.turnTimeLeft = room.turnSeconds || 20;
        }
        room.currentDrawing = null;
        return room;
      });
    } catch {
      // ignore
    }
  };

  // Process Vote Results
  const processVoteResults = async (room: RoomData) => {
    if (!currentRoomCode || !isHost) return;

    try {
      const claim = await db.ref(`spy_rooms/${currentRoomCode}/status`).transaction(status => {
        if (status !== 'voting') return;
        return 'resolving';
      });
      if (!claim.committed) return;

      const votes = room.votes || {};
      const counts: Record<string, number> = {};
      Object.values(votes).forEach(tgt => {
        const key = tgt || 'SKIP';
        counts[key] = (counts[key] || 0) + 1;
      });

      let maxVotes = 0;
      let topCandidates: string[] = [];
      for (const key in counts) {
        if (counts[key] > maxVotes) {
          maxVotes = counts[key];
          topCandidates = [key];
        } else if (counts[key] === maxVotes) {
          topCandidates.push(key);
        }
      }

      const rawEjectedUid =
        maxVotes > 0 && topCandidates.length === 1 && topCandidates[0] !== 'SKIP'
          ? topCandidates[0]
          : null;

      const currentSpies = room.spies || [];
      const playersObj = { ...(room.players || {}) };
      const nextRound = (room.round || 1) + 1;

      // Reset disqualified votes and silences for the next round
      Object.keys(playersObj).forEach(uid => {
        playersObj[uid] = {
          ...playersObj[uid],
          disqualifiedVote: false,
          isSilenced: false
        };
      });

      const ejectedUid = rawEjectedUid;

      if (!ejectedUid) {
        await db.ref(`spy_rooms/${currentRoomCode}`).update({
          status: 'playing',
          round: nextRound,
          turnOrder: Object.values(playersObj).filter(p => !p.isSpectator).map(p => p.uid),
          turnIndex: 0,
          turnTimeLeft: room.gameMode === 'rapid' ? 7 : (room.turnSeconds || 20),
          votes: null,
          currentDrawing: null,
          players: playersObj
        });
        broadcastAnnouncement(t.annNobodyEjected, 'normal');
        return;
      }

      const ejectedName = playersObj[ejectedUid]?.name || '?';
      if (playersObj[ejectedUid]) {
        playersObj[ejectedUid] = { ...playersObj[ejectedUid], isSpectator: true };
      }

      if (currentSpies.includes(ejectedUid)) {
        const updatedSpies = currentSpies.filter(s => s !== ejectedUid);
        if (updatedSpies.length === 0) {
          await db.ref(`spy_rooms/${currentRoomCode}`).update({
            status: 'gameover',
            winnerTeam: 'crew',
            finalSpies: room.spies,
            finalPlayers: playersObj,
            players: playersObj,
            spies: updatedSpies,
            votes: null
          });
          broadcastAnnouncement(t.annCrewWins.replace('{name}', ejectedName), 'success');
          awardXP(playersObj, room.spies || [], 'crew');
          return;
        }

        await db.ref(`spy_rooms/${currentRoomCode}/players`).set(playersObj);
        await db.ref(`spy_rooms/${currentRoomCode}/spies`).set(updatedSpies);
        broadcastAnnouncement(t.annSpyEjectedMoreRemain.replace('{name}', ejectedName), 'danger');

        await db.ref(`spy_rooms/${currentRoomCode}`).update({
          status: 'playing',
          round: nextRound,
          turnOrder: Object.values(playersObj).filter(p => !p.isSpectator).map(p => p.uid),
          turnIndex: 0,
          turnTimeLeft: room.gameMode === 'rapid' ? 7 : (room.turnSeconds || 20),
          votes: null,
          currentDrawing: null
        });
        return;
      }

      await db.ref(`spy_rooms/${currentRoomCode}/players`).set(playersObj);
      const remainingActiveUids = Object.values(playersObj).filter(p => !p.isSpectator).map(p => p.uid);
      const remainingSpiesCount = currentSpies.filter(uid => remainingActiveUids.includes(uid)).length;
      const remainingInnocentCount = remainingActiveUids.length - remainingSpiesCount;

      if (remainingSpiesCount >= remainingInnocentCount) {
        await db.ref(`spy_rooms/${currentRoomCode}`).update({
          status: 'gameover',
          winnerTeam: 'spies',
          finalSpies: room.spies,
          finalPlayers: playersObj,
          votes: null
        });
        broadcastAnnouncement(t.annSpiesWin.replace('{name}', ejectedName), 'danger');
        awardXP(playersObj, room.spies || [], 'spies');
        return;
      }

      broadcastAnnouncement(t.annInnocentEjected.replace('{name}', ejectedName), 'danger');
      await db.ref(`spy_rooms/${currentRoomCode}`).update({
        status: 'playing',
        round: nextRound,
        turnOrder: remainingActiveUids,
        turnIndex: 0,
        turnTimeLeft: room.gameMode === 'rapid' ? 7 : (room.turnSeconds || 20),
        votes: null,
        currentDrawing: null
      });
    } catch {
      await db.ref(`spy_rooms/${currentRoomCode}/status`).set('voting');
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
    const cleanCode = code.toUpperCase();
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

      // If room is public, Host must approve!
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
        allRequestsRef.on('value', allSnap => {
          const allReqs = allSnap.val() || {};
          const myReq = allReqs[currentUser.uid];
          if (!myReq) return;
          const pendingBefore = Object.values(allReqs)
            .filter((r: unknown) => {
              const req = r as { status?: string; timestamp?: number };
              return req && req.status === 'pending' && (req.timestamp || 0) < (myReq.timestamp || 0);
            }).length;
          setPendingJoinApproval(prev => prev ? { ...prev, queuePosition: pendingBefore + 1 } : null);
        });

        // Listen for host decision
        reqRef.on('value', respSnap => {
          const reqData = respSnap.val();
          if (!reqData) return;
          if (reqData.status === 'accepted') {
            reqRef.off();
            allRequestsRef.off();
            setPendingJoinApproval(null);
            joinRoom(cleanCode);
            showToast(t.joinRequestAccepted, 'success');
          } else if (reqData.status === 'rejected') {
            reqRef.off();
            allRequestsRef.off();
            reqRef.remove();
            setPendingJoinApproval(null);
            showToast(t.joinRequestDeclined, 'danger');
          }
        });
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
      showToast(lang === 'ar' ? `تم قبول انضمام ${req.name} للمحطة 🚀` : `Accepted ${req.name} 🚀`, 'success');
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
    showToast(lang === 'ar' ? 'تم رفض طلب الانضمام' : 'Declined join request', 'normal');
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
    const cleanCode = code.toUpperCase();
    setCurrentRoomCode(cleanCode);
    localStorage.setItem('spy_station_room', cleanCode);
    requestWakeLock();

    const playerRef = db.ref(`spy_rooms/${cleanCode}/players/${currentUser.uid}`);
    const existing = await playerRef.once('value');
    if (!existing.exists()) {
      const statusSnap = await db.ref(`spy_rooms/${cleanCode}/status`).once('value');
      const roomStatus = statusSnap.val();
      await playerRef.set({
        uid: currentUser.uid,
        name: profileName || currentUser.displayName || 'Agent',
        avatar: profileAvatar || currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
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
      const data = snap.val();
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

      // Instant Host Migration: Check if host left or disconnected
      const playersObj = data.players || {};
      const activePlayers = Object.values(playersObj)
        .filter((p: unknown) => !(p as PlayerData).isSpectator) as PlayerData[];
      const isGameActive = data.status === 'playing' || data.status === 'voting' || data.status === 'resolving';

      const currentHostUid = data.hostUid;
      const hostPlayer = currentHostUid ? playersObj[currentHostUid] : null;

      if ((!hostPlayer || hostPlayer.isSpectator) && activePlayers.length > 0) {
        const sortedActive = [...activePlayers].sort((a, b) => ((a.joinedAt || 0) - (b.joinedAt || 0)));
        const nextHostUid = sortedActive[0].uid;
        if (currentUser.uid === nextHostUid && currentHostUid !== nextHostUid) {
          db.ref(`spy_rooms/${cleanCode}/hostUid`).set(nextHostUid);
          showToast(t.hostMigratedNotification, 'success');
        }
      }

      // CRITICAL GAME RULE: If game is active and active players drop below 3 (minimum required for Spy Game)
      if (isGameActive && activePlayers.length < 3) {
        const effectiveHostUid = data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
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
        const activeSpies = data.spies.filter((uid: string) => playersObj[uid] && !playersObj[uid].isSpectator);
        if (activeSpies.length === 0) {
          const effectiveHostUid = data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
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
            return;
          }
        }
      }

      // If playing: Sanitize turnOrder if someone left
      if (data.status === 'playing' && data.turnOrder && data.turnOrder.length > 0) {
        const cleanedTurnOrder = data.turnOrder.filter((uid: string) => playersObj[uid] && !playersObj[uid].isSpectator);
        if (cleanedTurnOrder.length > 0 && cleanedTurnOrder.length !== data.turnOrder.length) {
          const effectiveHostUid = data.hostUid && playersObj[data.hostUid] && !playersObj[data.hostUid].isSpectator
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
              turnTimeLeft: data.turnSeconds || 20
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
        setTimeout(() => {
          setAnnouncedRound(null);
        }, ROUND_ANNOUNCE_MS);
      }
    });
    roomListenerRef.current = () => rRef.off();
  };

  const leaveRoom = async () => {
    localStorage.removeItem('spy_station_room');
    releaseWakeLock();
    lastAnnouncedRoundRef.current = 0;
    setAnnouncedRound(null);

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
          .filter((p: unknown) => {
            const pl = p as PlayerData;
            return pl.uid !== uid && !pl.isSpectator && !pl.isBot && !pl.uid.startsWith('bot_');
          })
          .sort((a: unknown, b: unknown) => ((a as PlayerData).joinedAt || 0) - ((b as PlayerData).joinedAt || 0));

        if (remainingHumans.length === 0) {
          // If NO real human players left in the room (e.g. only bots or empty), delete room completely!
          await db.ref(`spy_rooms/${code}`).remove();
        } else {
          // Remove departing player's record
          await db.ref(`spy_rooms/${code}/players/${uid}`).remove();

          // Migrate host if departing player was host, ONLY to a real human player!
          if (wasHost && remainingHumans[0]) {
            await db.ref(`spy_rooms/${code}/hostUid`).set((remainingHumans[0] as PlayerData).uid);
          }

          // If game was active and remaining players drop below minimum 3
          const remainingAll = Object.values(playersObj).filter(
            (p: unknown) => (p as PlayerData).uid !== uid && !(p as PlayerData).isSpectator
          );
          const isGameActive = currentRoomSnapshot?.status === 'playing' ||
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
    const count = Object.keys(playersObj).length;
    const botNames = lang === 'ar'
      ? ['خالد', 'أحمد', 'ليلى', 'سارة', 'عمر', 'محمد', 'ياسمين']
      : ['Khaled', 'Ahmed', 'Layla', 'Sara', 'Omar', 'Mohamed', 'Yasmine'];
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const name = botNames[count % botNames.length];

    sound.playClick();
    await db.ref(`spy_rooms/${currentRoomCode}/players/${botId}`).set({
      uid: botId,
      name: `${name} 🤖`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      joinedAt: Date.now(),
      isSpectator: false,
      isBot: true
    });
    showToast(lang === 'ar' ? `تمت إضافة رائد الفضاء ${name}! 🚀` : `Astronaut ${name} added! 🚀`, 'success');
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
    showToast(lang === 'ar' ? 'تمت إزالة رواد الفضاء التجريبيين 🧹' : 'Test bots removed 🧹', 'normal');
  };

  // Start game flow
  const handleStartGame = async () => {
    if (!currentRoomCode || !roomData) return;
    sound.playClick();

    try {
      const playersObj = { ...(roomData.players || {}) };
      let playersArr = Object.values(playersObj).filter(p => !p.isSpectator);

      // If fewer than 3 players, auto-fill with astronaut bots so mission starts without any blockage!
      if (playersArr.length < 3) {
        showToast(t.lblStartingWithBots, 'normal');
        const needed = 3 - playersArr.length;
        const botNames = lang === 'ar'
          ? ['خالد', 'أحمد', 'ليلى', 'سارة', 'عمر', 'ياسمين']
          : ['Khaled', 'Ahmed', 'Layla', 'Sara', 'Omar', 'Yasmine'];

        const botUpdates: Record<string, PlayerData> = {};
        for (let i = 0; i < needed; i++) {
          const botId = `bot_${Date.now()}_${i}`;
          const name = botNames[i % botNames.length];
          const newBot: PlayerData = {
            uid: botId,
            name: `${name} 🤖`,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
            joinedAt: Date.now(),
            isSpectator: false,
            isBot: true
          };
          botUpdates[botId] = newBot;
          playersObj[botId] = newBot;
        }
        await db.ref(`spy_rooms/${currentRoomCode}/players`).update(botUpdates);
        playersArr = Object.values(playersObj).filter(p => !p.isSpectator);
      }

      const cats =
        roomData.categories && roomData.categories.length > 0
          ? roomData.categories
          : (['players'] as CategoryKey[]);
      const chosenCat = cats[Math.floor(Math.random() * cats.length)];
      const wordList = wordsDB[chosenCat] || wordsDB.players;
      const selectedPair = wordList[Math.floor(Math.random() * wordList.length)];
      const wordImg = getWordImage(selectedPair[0], selectedPair[1], chosenCat);

      const effectiveSpyCount = Math.max(
        1,
        Math.min(roomData.spyCount || 1, Math.max(1, Math.floor(playersArr.length / 2)))
      );
      const spies: string[] = [];
      while (spies.length < Math.min(effectiveSpyCount, playersArr.length - 1)) {
        const randUid = playersArr[Math.floor(Math.random() * playersArr.length)].uid;
        if (!spies.includes(randUid)) spies.push(randUid);
      }
      if (spies.length === 0 && playersArr.length > 0) {
        spies.push(playersArr[0].uid);
      }

      const resetPlayers: Record<string, PlayerData> = {};
      const tacticalAbilities: SabotageAbility[] = [
        'thermal_scan',
        'silence_hack',
        'silver_bullet',
        'signal_scramble'
      ];

      // Chameleon mode: pick a twin word
      const otherPairs = wordList.filter(pair => pair[0] !== selectedPair[0]);
      const chameleonPair =
        otherPairs.length > 0 ? otherPairs[Math.floor(Math.random() * otherPairs.length)] : selectedPair;

      // Undercover mode: pick an undercover protector who knows the spy
      const nonSpies = playersArr.filter(p => !spies.includes(p.uid));
      const undercoverUid =
        roomData.gameMode === 'undercover' && nonSpies.length > 0
          ? nonSpies[Math.floor(Math.random() * nonSpies.length)].uid
          : null;

      playersArr.forEach(p => {
        const isThisSpy = spies.includes(p.uid);
        const playerObj: PlayerData = {
          uid: p.uid,
          name: p.name || 'Agent',
          avatar: p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`,
          isSpectator: false,
          postGame: null,
          role: isThisSpy ? 'spy' : p.uid === undercoverUid ? 'undercover' : 'crew',
          sabotageAbility:
            roomData.gameMode === 'sabotage'
              ? tacticalAbilities[Math.floor(Math.random() * tacticalAbilities.length)]
              : null,
          sabotageUsed: false,
          isSilenced: false,
          disqualifiedVote: false
        };

        if (p.isBot) {
          playerObj.isBot = true;
        }

        if (isThisSpy && roomData.gameMode === 'chameleon') {
          playerObj.chameleonWord = chameleonPair[0];
          playerObj.chameleonWordAr = chameleonPair[1];
        }

        resetPlayers[p.uid] = playerObj;
      });

      const shuffled = playersArr.map(p => p.uid).sort(() => Math.random() - 0.5);
      lastAnnouncedRoundRef.current = 0;
      const initialTurnSeconds = roomData.gameMode === 'rapid' ? 7 : (roomData.turnSeconds || 20);

      await db.ref(`spy_rooms/${currentRoomCode}`).update({
        status: 'playing',
        word: selectedPair[0] || 'Space Station',
        wordAr: selectedPair[1] || 'محطة الفضاء',
        wordCategory: chosenCat || 'players',
        wordImage: wordImg || null,
        spies: spies,
        undercoverUid: undercoverUid || null,
        round: 1,
        turnOrder: shuffled,
        turnIndex: 0,
        turnTimeLeft: initialTurnSeconds,
        turnSeconds: initialTurnSeconds,
        votes: null,
        winnerTeam: null,
        gameChat: null,
        spyChat: null,
        speechBubbles: null,
        scrambleActive: false,
        currentDrawing: null,
        players: resetPlayers
      });

      broadcastAnnouncement(t.annMissionStarted, 'normal');
    } catch (err) {
      console.error('Failed to start mission:', err);
      showToast(lang === 'ar' ? 'حدث خطأ أثناء بدء اللعبة، حاول مرة أخرى' : 'Failed to start game, try again', 'danger');
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
          onToast={showToast}
        />
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

        {/* Room Screens */}
        {isPlaying ? (
          <GameScreen
            lang={lang}
            currentUserUid={currentUser.uid}
            roomCode={currentRoomCode}
            room={roomData}
            onAdvanceTurn={advanceTurn}
            onTriggerEmergencyVote={() => {
              db.ref(`spy_rooms/${currentRoomCode}`).update({
                status: 'voting',
                voteTimeLeft: 80,
                votes: null
              });
              broadcastAnnouncement(t.annEmergencyVote, 'danger');
            }}
            onSendGameClue={word => {
              db.ref(`spy_rooms/${currentRoomCode}/gameChat`).push({
                uid: currentUser.uid,
                sender: currentUser.displayName || 'Agent',
                avatar: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
                text: word,
                round: roomData.round || 1,
                timestamp: firebase.database.ServerValue.TIMESTAMP
              });
              advanceTurn();
            }}
            onSendSpyChat={msg => {
              db.ref(`spy_rooms/${currentRoomCode}/spyChat`).push({
                sender: currentUser.displayName || 'Agent',
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
              const pObj = snap.val() || {};
              const viewing = Object.values(pObj).some((p: unknown) => (p as PlayerData).postGame !== 'inLobby');

              if (!viewing) {
                const reset: Record<string, PlayerData> = {};
                Object.keys(pObj).forEach(uid => {
                  reset[uid] = { ...(pObj[uid] as PlayerData), isSpectator: false, postGame: null };
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
              if (targetPlayer?.isBot || uid.startsWith('bot_')) {
                showToast(lang === 'ar' ? 'لا يمكن تعيين رائد فضاء تجريبي (Bot) كمضيف للروم!' : 'Cannot assign a bot as host!', 'danger');
                return;
              }
              db.ref(`spy_rooms/${currentRoomCode}/hostUid`).set(uid);
            }}
            onKickPlayer={uid => db.ref(`spy_rooms/${currentRoomCode}/players/${uid}`).remove()}
            onSendFriendRequest={async targetUid => {
              await db.ref(`users/${targetUid}/friendRequests/${currentUser.uid}`).set({
                name: currentUser.displayName || 'Agent',
                avatar: currentUser.photoURL || '',
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
                name: currentUser.displayName || 'Agent',
                avatar: currentUser.photoURL || '',
                since: now
              });
              await db.ref(`users/${currentUser.uid}/friendRequests/${uid}`).remove();
              await db.ref(`users/${uid}/sentRequests/${currentUser.uid}`).remove();
              showToast(t.msgFriendAdded, 'success');
            }}
            onSendChatMessage={txt => {
              db.ref(`spy_rooms/${currentRoomCode}/lobbyChat`).push({
                sender: currentUser.displayName || 'Agent',
                text: txt
              });
            }}
            onAcceptJoinRequest={handleAcceptJoinRequest}
            onDeclineJoinRequest={handleDeclineJoinRequest}
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

      {/* Main Tabs */}
      {activeTab === 'home' && (
        <HomeTab
          lang={lang}
          userName={profileName}
          userAvatar={profileAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`}
          userXp={userXp}
          onOpenRank={() => setRankModalOpen(true)}
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
    </div>
  );
}
