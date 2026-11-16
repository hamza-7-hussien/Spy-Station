import React, { useEffect, useState, useRef } from 'react';
import { db, firebase } from '../firebase';
import { sound } from '../audio';
import { Language, PlayerData } from '../types';
import { Zap, X, Users, Radio, Loader2 } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  const [joinedPlayers, setJoinedPlayers] = useState<PlayerData[]>([]);
  const [targetPlayersCount] = useState<number>(4);
  const [countdown, setCountdown] = useState<number | null>(null);

  const activeRoomRef = useRef<string | null>(null);
  const isHostRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roomListenerRef = useRef<(() => void) | null>(null);
  const hasLaunchedRef = useRef<boolean>(false);
  const countdownStartedRef = useRef<boolean>(false);

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
      setJoinedPlayers([]);
      setCountdown(null);
      hasLaunchedRef.current = false;
      countdownStartedRef.current = false;
      return;
    }

    sound.playTone(600, 'triangle', 0.15);
    sound.triggerHaptic('medium');

    setSearchingSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setSearchingSeconds(prev => prev + 1);
    }, 1000);

    startMatchmaking();

    return () => {
      cleanUpMatchmaking();
    };
  }, [isOpen]);

  const startMatchmaking = async () => {
    try {
      setStatusText('scanning');

      const queueSnap = await db.ref('spy_quick_match_queue').once('value');
      const queueRooms = queueSnap.val() || {};
      const now = Date.now();

      let targetCode: string | null = null;

      for (const code in queueRooms) {
        const info = queueRooms[code];
        if (now - (info.createdAt || 0) < 120000) {
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

      if (!targetCode) {
        const publicSnap = await db.ref('spy_rooms').orderByChild('visibility').equalTo('public').limitToLast(10).once('value');
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
        joinExistingRoom(targetCode);
      } else {
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
    setStatusText('room_found');

    const playerData: PlayerData = {
      uid: currentUserUid,
      name: currentUserName,
      avatar: currentUserAvatar,
      joinedAt: Date.now(),
      isSpectator: false,
      postGame: 'inLobby'
    };

    const pRef = db.ref(`spy_rooms/${code}/players/${currentUserUid}`);
    await pRef.set(playerData);
    pRef.onDisconnect().remove();
    listenToRoom(code);
  };

  const createNewQueueRoom = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    activeRoomRef.current = code;
    isHostRef.current = true;
    setStatusText('room_found');

    const playerData: PlayerData = {
      uid: currentUserUid,
      name: currentUserName,
      avatar: currentUserAvatar,
      joinedAt: Date.now(),
      isSpectator: false,
      postGame: 'inLobby'
    };

    const newRoom = {
      roomCode: code,
      name: lang === 'ar' ? `مباراة سريعة #${code}` : `Quick Match #${code}`,
      originalHostUid: currentUserUid,
      hostUid: currentUserUid,
      status: 'waiting',
      visibility: 'public',
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

      if (room.status === 'playing') {
        hasLaunchedRef.current = true;
        sound.playMatchFound();
        onMatchFound(code);
        onClose();
        return;
      }

      if (playersList.length >= targetPlayersCount) {
        setStatusText('launching');
        if (!countdownStartedRef.current) {
          countdownStartedRef.current = true;
          sound.playMatchFound();
          setCountdown(3);
        }
      }
    };

    roomRef.on('value', onRoomChange);
    roomListenerRef.current = () => roomRef.off('value', onRoomChange);
  };

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
      hasLaunchedRef.current = true;
      if (activeRoomRef.current) {
        onMatchFound(activeRoomRef.current);
      }
      onClose();
    }
  }, [countdown, onMatchFound, onClose]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200 select-none overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div
        className="relative w-full max-w-md p-6 rounded-2xl bg-[#111827] border border-slate-700 shadow-2xl space-y-5 text-center overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div className="text-start">
              <h3 className="font-heading font-black text-base text-white">
                {lang === 'ar' ? 'انطلاق: لعب سريع أونلاين' : 'Quick Matchmaking'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                {lang === 'ar' ? 'مطابقة تلقائية مع لاعبين حقيقيين' : 'Auto-match with real players'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Radar Indicator */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-500/25" />
          <div className="absolute inset-3 rounded-full border border-sky-500/20" />
          <img
            src={currentUserAvatar}
            alt={currentUserName}
            className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-amber-500/60 object-cover relative z-10"
          />
        </div>

        <div className="space-y-1.5">
          <div className="font-mono text-2xl font-black text-amber-400 tracking-wider tabular-nums">
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
                : 'Room found! Waiting for players...'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'ar' ? 'طاقم الرحلة' : 'Squad Slots'}</span>
            </span>
            <span className="font-mono text-amber-400 tabular-nums">
              {joinedPlayers.length} / {targetPlayersCount}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map(slotIdx => {
              const player = joinedPlayers[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition ${
                    player
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-500 border-dashed'
                  }`}
                >
                  {player ? (
                    <>
                      <img
                        src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                        alt={player.name}
                        className="w-8 h-8 rounded-full border border-amber-400"
                      />
                      <span className="text-[10px] font-bold truncate max-w-full">
                        {player.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                      </div>
                      <span className="text-[9px] font-mono opacity-60">
                        {lang === 'ar' ? 'بحث...' : 'Wait...'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-700"
        >
          {lang === 'ar' ? 'إلغاء البحث' : 'Cancel Matchmaking'}
        </button>
      </div>
    </div>
  );
};
