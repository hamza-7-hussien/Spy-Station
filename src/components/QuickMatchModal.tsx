import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { sound } from '../audio';
import { Language, PlayerData } from '../types';
import { Users, X, Radio, Loader2, Zap } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasLaunchedRef = useRef<boolean>(false);
  const countdownStartedRef = useRef<boolean>(false);

  const cleanUpMatchmaking = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const roomCode = activeRoomRef.current;
    if (roomCode && !hasLaunchedRef.current) {
      try {
        await supabase.rpc('leave_room_clean', { p_room_code: roomCode });
      } catch {
        // ignore
      }
    }

    activeRoomRef.current = null;
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

      const cutoffIso = new Date(Date.now() - 120000).toISOString();
      const { data: openRooms, error } = await supabase
        .from('rooms')
        .select('code, max_players, is_quick_match, room_players(uid)')
        .eq('visibility', 'public')
        .eq('status', 'waiting')
        .gte('created_at', cutoffIso)
        .order('is_quick_match', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      let targetCode: string | null = null;
      for (const r of openRooms || []) {
        const playersArr = Array.isArray(r.room_players) ? r.room_players : [];
        const pCount = playersArr.length;
        const cap = Math.min(r.max_players || 4, targetPlayersCount);
        if (pCount > 0 && pCount < cap) {
          targetCode = r.code;
          break;
        }
      }

      if (targetCode) {
        await joinExistingRoom(targetCode);
      } else {
        await createNewQueueRoom();
      }
    } catch (err) {
      console.warn('Matchmaking error:', err);
      onToast(lang === 'ar' ? 'فشل الاتصال ببرج المراقبة' : 'Matchmaking connection error', 'danger');
      onClose();
    }
  };

  const joinExistingRoom = async (code: string) => {
    const { data, error } = await supabase.rpc('join_room_safe', {
      p_room_code: code,
      p_name: currentUserName,
      p_avatar: currentUserAvatar
    });

    if (error || !data?.ok) {
      await createNewQueueRoom();
      return;
    }

    activeRoomRef.current = code;
    setStatusText('room_found');
    listenToRoom(code);
  };

  const createNewQueueRoom = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const { error: roomErr } = await supabase.from('rooms').insert({
      code,
      name: lang === 'ar' ? `مباراة سريعة #${code}` : `Quick Match #${code}`,
      original_host_uid: currentUserUid,
      host_uid: currentUserUid,
      host_name: currentUserName,
      status: 'waiting',
      visibility: 'public',
      is_quick_match: true,
      max_players: targetPlayersCount,
      spy_count: 1,
      turn_seconds: 20,
      game_mode: 'normal',
      categories: ['players', 'food', 'places', 'movies', 'games', 'animals', 'jobs', 'singers']
    });

    if (roomErr) throw roomErr;

    const { error: playerErr } = await supabase.from('room_players').insert({
      room_code: code,
      uid: currentUserUid,
      name: currentUserName,
      avatar: currentUserAvatar,
      is_spectator: false,
      is_bot: false,
      post_game: 'inLobby'
    });

    if (playerErr) throw playerErr;

    activeRoomRef.current = code;
    setStatusText('room_found');
    listenToRoom(code);
  };

  const refreshRoomSnapshot = async (code: string) => {
    const [{ data: roomRow }, { data: playerRows }] = await Promise.all([
      supabase.from('rooms').select('status').eq('code', code).maybeSingle(),
      supabase
        .from('room_players')
        .select('uid, name, avatar, joined_at, is_spectator, is_bot')
        .eq('room_code', code)
        .order('joined_at', { ascending: true })
    ]);

    const playersList: PlayerData[] = (playerRows || []).map(p => ({
      uid: p.uid,
      name: p.name,
      avatar: p.avatar,
      joinedAt: p.joined_at ? new Date(p.joined_at).getTime() : Date.now(),
      isSpectator: p.is_spectator,
      isBot: p.is_bot
    }));

    setJoinedPlayers(playersList);

    if (roomRow?.status === 'playing') {
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

  const listenToRoom = (code: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    refreshRoomSnapshot(code);

    const channel = supabase
      .channel(`quick-match:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        () => refreshRoomSnapshot(code)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_code=eq.${code}` },
        () => refreshRoomSnapshot(code)
      )
      .subscribe();

    channelRef.current = channel;
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 animate-in fade-in duration-200 select-none overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div
        className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-6 text-center overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
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

        <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-500/30 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full border border-sky-400/20" />
          <div className="absolute inset-6 rounded-full border border-amber-400/40 animate-spin duration-[4000ms]" />
          <div className="absolute inset-0 flex items-center justify-center animate-spin duration-[2500ms]">
            <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-amber-300 origin-right ml-auto shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          </div>
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
                        loading="lazy"
                        decoding="async"
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
