import React, { useEffect, useState, useRef } from 'react';
import { db, firebase } from '../firebase';
import { sound } from '../audio';
import { Language, PlayerData } from '../types';
import { Zap, X, Users, Radio, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  currentUserName: string;
  currentUserAvatar: string;
  isOpen: boolean;
  onClose: () => void;
  onMatchFound: (roomCode: string) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

export const QuickMatchModal: React.FC<Props> = ({
  lang,
  currentUserUid,
  currentUserName,
  currentUserAvatar,
  isOpen,
  onClose,
  onMatchFound,
  onToast
}) => {
  const [searchingSeconds, setSearchingSeconds] = useState(0);
  const [statusText, setStatusText] = useState<'scanning' | 'room_found' | 'launching'>('scanning');
  const [matchedRoomCode, setMatchedRoomCode] = useState<string | null>(null);
  const [joinedPlayers, setJoinedPlayers] = useState<PlayerData[]>([]);
  const [targetPlayersCount] = useState<number>(4);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeRoomRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roomListenerRef = useRef<(() => void) | null>(null);
  const hasLaunchedRef = useRef<boolean>(false);

  // Clean exit helper
  const cleanUpMatchmaking = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (searchPollIntervalRef.current) clearInterval(searchPollIntervalRef.current);
    if (roomListenerRef.current) {
      roomListenerRef.current();
      roomListenerRef.current = null;
    }

    const roomCode = activeRoomRef.current;
    if (roomCode && !hasLaunchedRef.current) {
      try {
        const playerRef = db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}`);
        await playerRef.remove();

        // Check if room became empty
        const snap = await db.ref(`spy_rooms/${roomCode}/players`).once('value');
        if (!snap.exists() || Object.keys(snap.val() || {}).length === 0) {
          await db.ref(`spy_rooms/${roomCode}`).remove();
          await db.ref(`spy_quick_match_queue/${roomCode}`).remove();
        }
      } catch {
        // ignore
      }
    }

    activeRoomRef.current = null;
    isHostRef.current = false;
  };

  useEffect(() => {
    if (!isOpen) {
      cleanUpMatchmaking();
      setSearchingSeconds(0);
      setStatusText('scanning');
      setMatchedRoomCode(null);
      setJoinedPlayers([]);
      setCountdown(null);
      hasLaunchedRef.current = false;
      return;
    }

    sound.playTone(600, 'triangle', 0.15);
    sound.triggerHaptic('medium');

    // 1. Timer ticker
    setSearchingSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setSearchingSeconds(prev => prev + 1);
    }, 1000);

    // 2. Start Matchmaking algorithm
    startMatchmaking();

    return () => {
      cleanUpMatchmaking();
    };
  }, [isOpen]);

  const startMatchmaking = async () => {
    try {
      setStatusText('scanning');

      // Step A: Search for active quick match queue rooms in Firebase
      const queueSnap = await db.ref('spy_quick_match_queue').once('value');
      const queueRooms = queueSnap.val() || {};
      const now = Date.now();

      let targetCode: string | null = null;

      // Find an existing quick match room created in the last 2 minutes that is still waiting and not full
      for (const code in queueRooms) {
        const info = queueRooms[code];
        if (now - (info.createdAt || 0) < 120000) {
          // Check actual room
          const rSnap = await db.ref(`spy_rooms/${code}`).once('value');
          const rData = rSnap.val();
          if (rData && rData.status === 'waiting') {
            const players = rData.players || {};
            const pCount = Object.keys(players).length;
            if (pCount < (rData.maxPlayers || 4)) {
              targetCode = code;
              break;
            }
          }
        }
      }

      // If no queue room, also check public rooms waiting for players
      if (!targetCode) {
        const publicSnap = await db.ref('spy_rooms').orderByChild('isPublic').equalTo(true).limitToLast(10).once('value');
        const pubRooms = publicSnap.val() || {};
        for (const code in pubRooms) {
          const rData = pubRooms[code];
          if (rData && rData.status === 'waiting') {
            const pCount = Object.keys(rData.players || {}).length;
            if (pCount < (rData.maxPlayers || 20) && pCount < targetPlayersCount) {
              targetCode = code;
              break;
            }
          }
        }
      }

      if (targetCode) {
        // Found an open room! Join as player
        joinExistingRoom(targetCode);
      } else {
        // No room available: create a new Quick Match queue room and wait for others
        createNewQueueRoom();
      }
    } catch (err) {
      console.warn('Matchmaking error:', err);
      onToast(lang === 'ar' ? 'فشل الاتصال ببرج المراقبة' : 'Matchmaking connection error', 'danger');
      onClose();
    }
  };

  const joinExistingRoom = async (code: string) => {
    activeRoomRef.current = code;
    isHostRef.current = false;
    setMatchedRoomCode(code);
    setStatusText('room_found');

    const playerData: PlayerData = {
      uid: currentUserUid,
      name: currentUserName,
      avatar: currentUserAvatar,
      isSpectator: false,
      postGame: 'inLobby'
    };

    await db.ref(`spy_rooms/${code}/players/${currentUserUid}`).set(playerData);
    listenToRoom(code);
  };

  const createNewQueueRoom = async () => {
    // Generate clean alphanumeric code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    activeRoomRef.current = code;
    isHostRef.current = true;
    setMatchedRoomCode(code);
    setStatusText('room_found');

    const playerData: PlayerData = {
      uid: currentUserUid,
      name: currentUserName,
      avatar: currentUserAvatar,
      isSpectator: false,
      postGame: 'inLobby'
    };

    const newRoom = {
      roomCode: code,
      name: lang === 'ar' ? `مباراة سريعة #${code}` : `Quick Match #${code}`,
      hostUid: currentUserUid,
      status: 'waiting',
      isPublic: true,
      isQuickMatch: true,
      maxPlayers: targetPlayersCount,
      spyCount: 1,
      turnSeconds: 20,
      gameMode: 'normal',
      categories: ['players', 'food', 'places', 'movies', 'games', 'animals', 'jobs', 'singers'],
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      players: {
        [currentUserUid]: playerData
      }
    };

    await db.ref(`spy_rooms/${code}`).set(newRoom);
    await db.ref(`spy_quick_match_queue/${code}`).set({
      createdAt: Date.now(),
      hostUid: currentUserUid
    });

    listenToRoom(code);
  };

  const listenToRoom = (code: string) => {
    const roomRef = db.ref(`spy_rooms/${code}`);

    const onRoomChange = (snap: firebase.database.DataSnapshot) => {
      const room = snap.val();
      if (!room) return;

      const playersObj = room.players || {};
      const playersList = Object.values(playersObj) as PlayerData[];
      setJoinedPlayers(playersList);

      // Check if room has been launched or reached required players
      if (room.status === 'playing') {
        hasLaunchedRef.current = true;
        sound.playMatchFound();
        onMatchFound(code);
        onClose();
        return;
      }

      // If we have enough players (4 or targetPlayersCount), start countdown
      if (playersList.length >= targetPlayersCount) {
        setStatusText('launching');
        if (countdown === null) {
          sound.playMatchFound();
          setCountdown(3);
        }
      }
    };

    roomRef.on('value', onRoomChange);
    roomListenerRef.current = () => roomRef.off('value', onRoomChange);
  };

  // Launch countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      sound.playTimerPulse(true);
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      // Launch game!
      hasLaunchedRef.current = true;
      if (activeRoomRef.current) {
        onMatchFound(activeRoomRef.current);
      }
      onClose();
    }
  }, [countdown, onMatchFound, onClose]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-6 text-center overflow-hidden">
        {/* Radar Background Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="text-start">
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                {lang === 'ar' ? 'انطلاق: لعب سريع أونلاين' : 'Quick Matchmaking'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                {lang === 'ar' ? 'مطابقة تلقائية مع لاعبين حقيقيين' : 'Auto-match with real astronauts'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Central Animated Sci-Fi Radar */}
        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
          {/* Outer Rotating Radar Ring */}
          <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full border border-sky-400/20" />
          <div className="absolute inset-6 rounded-full border border-amber-400/40 animate-spin duration-[4000ms]" />

          {/* Radar Sweep Line */}
          <div className="absolute inset-0 flex items-center justify-center animate-spin duration-[2500ms]">
            <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-amber-300 origin-right ml-auto shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          </div>

          {/* Center Avatar or Pulse */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full p-1 bg-gradient-to-tr from-amber-500 to-sky-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <img
                src={currentUserAvatar}
                alt={currentUserName}
                className="w-full h-full rounded-full bg-slate-900 object-cover"
              />
            </div>
          </div>
        </div>

        {/* Searching Status & Timer */}
        <div className="space-y-1">
          <div className="font-mono text-2xl font-black text-amber-400 tracking-wider">
            {formatTimer(searchingSeconds)}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>
              {countdown !== null
                ? lang === 'ar'
                  ? `اكتمل الطاقم! تبدأ المباراة خلال ${countdown}...`
                  : `Squad Full! Launching in ${countdown}...`
                : statusText === 'scanning'
                ? lang === 'ar'
                  ? 'جاري فحص الترددات والبحث عن لاعبين...'
                  : 'Scanning frequencies for active players...'
                : lang === 'ar'
                ? 'تم العثور على الغرفة! بانتظار اكتمال الطاقم...'
                : 'Room found! Waiting for astronauts...'}
            </span>
          </div>
        </div>

        {/* Real-Time Astronauts Found Slots */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'ar' ? 'طاقم الرحلة' : 'Astronaut Squad'}</span>
            </span>
            <span className="font-mono text-amber-400">
              {joinedPlayers.length} / {targetPlayersCount}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(slotIdx => {
              const player = joinedPlayers[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                    player
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900 border-slate-800/80 text-slate-500 border-dashed'
                  }`}
                >
                  {player ? (
                    <>
                      <img
                        src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                        alt={player.name}
                        className="w-8 h-8 rounded-full border border-amber-400 shadow-sm"
                      />
                      <span className="text-[10px] font-bold truncate max-w-full">
                        {player.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      </div>
                      <span className="text-[9px] font-mono opacity-50">
                        {lang === 'ar' ? 'بحث...' : 'Search...'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-300 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
        >
          {lang === 'ar' ? 'إلغاء البحث عن مباراة' : 'Cancel Matchmaking'}
        </button>
      </div>
    </div>
  );
};
