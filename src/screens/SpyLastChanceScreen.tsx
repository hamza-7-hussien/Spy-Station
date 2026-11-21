import React, { useEffect, useState } from 'react';
import { dictionary } from '../translations';
import { CustomCategoryWord, Language, RoomData } from '../types';
import { sound } from '../audio';
import { SPY_GUESS_SECONDS } from '../gameEngine';
import { Crosshair, Clock, ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  room: RoomData;
  serverTimeOffsetMs?: number;
  onSubmitGuess: (option: CustomCategoryWord) => void;
}

export const SpyLastChanceScreen: React.FC<Props> = ({
  lang,
  currentUserUid,
  room,
  serverTimeOffsetMs = 0,
  onSubmitGuess
}) => {
  const t = dictionary[lang];
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const candidateUid = room.spyGuessCandidateUid || '';
  const isCaughtSpy = candidateUid === currentUserUid;
  const spyPlayer = candidateUid ? (room.players?.[candidateUid] || room.finalPlayers?.[candidateUid]) : null;
  const spyName = spyPlayer?.name || 'Spy';
  const options = room.spyGuessOptions || [];

  const getInitialSeconds = () => {
    const now = Date.now() + serverTimeOffsetMs;
    if (room.spyGuessEndsAt && room.spyGuessEndsAt > 0) {
      const rem = Math.ceil((room.spyGuessEndsAt - now) / 1000);
      return Math.max(0, Math.min(SPY_GUESS_SECONDS, rem));
    }
    return SPY_GUESS_SECONDS;
  };

  const [timeLeft, setTimeLeft] = useState<number>(getInitialSeconds);
  const [isEjectionFreezing, setIsEjectionFreezing] = useState<boolean>(() => {
    const now = Date.now() + serverTimeOffsetMs;
    return !!(room.ejectionEndsAt && room.ejectionEndsAt > now);
  });

  useEffect(() => {
    const syncTimer = () => {
      const now = Date.now() + serverTimeOffsetMs;
      if (room.ejectionEndsAt && room.ejectionEndsAt > now) {
        setIsEjectionFreezing(true);
        setTimeLeft(SPY_GUESS_SECONDS);
        return;
      }
      setIsEjectionFreezing(false);
      if (room.spyGuessEndsAt && room.spyGuessEndsAt > 0) {
        const rem = Math.max(0, Math.ceil((room.spyGuessEndsAt - now) / 1000));
        setTimeLeft(rem);
      }
    };
    syncTimer();
    const timer = setInterval(syncTimer, 250);
    return () => clearInterval(timer);
  }, [room.ejectionEndsAt, room.spyGuessEndsAt, serverTimeOffsetMs]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 pt-2 text-start">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.28)] space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white font-heading truncate">
                {t.spyGuessTitle}
              </h2>
              <p className="text-xs text-rose-200/80">
                {isCaughtSpy
                  ? t.spyGuessSub
                  : t.spyGuessWaiting.replace('{name}', spyName)}
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl font-mono font-black text-sm tabular-nums flex items-center gap-1.5 shrink-0 border ${
              timeLeft <= 5 && !isEjectionFreezing
                ? 'bg-rose-500/25 border-rose-400 text-rose-300 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-amber-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Caught Spy Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
          <img
            src={spyPlayer?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${candidateUid}`}
            alt={spyName}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-full object-cover border-2 border-rose-400 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">{spyName}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>{room.wordCustomCategoryName || room.wordCategory || ''}</span>
            </div>
          </div>
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
        </div>

        {/* 6 Candidate Word Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((opt, idx) => {
            const label = lang === 'ar' ? (opt.ar || opt.en) : (opt.en || opt.ar);
            const isPicked = selectedWord === opt.en;
            return (
              <button
                key={`${opt.en}-${idx}`}
                type="button"
                disabled={!isCaughtSpy || !!selectedWord || isEjectionFreezing}
                onClick={() => {
                  if (!isCaughtSpy || selectedWord || isEjectionFreezing) return;
                  sound.playTone(580, 'sine', 0.12);
                  sound.triggerHaptic('medium');
                  setSelectedWord(opt.en);
                  onSubmitGuess(opt);
                }}
                className={`min-h-[54px] p-3.5 rounded-2xl border text-center font-bold text-sm transition flex items-center justify-center gap-2 ${
                  isPicked
                    ? 'bg-rose-500/30 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                    : isCaughtSpy && !isEjectionFreezing
                    ? 'bg-slate-950/90 border-sky-500/35 hover:border-rose-400 hover:bg-rose-950/30 text-slate-100 cursor-pointer active:scale-95'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 cursor-not-allowed opacity-85'
                }`}
              >
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>

        {!isCaughtSpy && (
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center text-xs text-slate-300 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t.spyGuessWaiting.replace('{name}', spyName)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
