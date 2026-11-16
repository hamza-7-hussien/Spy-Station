import React, { useEffect, useState } from 'react';
import { sound } from '../audio';
import { Language } from '../types';
import { dictionary } from '../translations';
import { ShieldAlert, Sparkles, Lock, HeartCrack } from 'lucide-react';

interface Props {
  lang: Language;
  ejectedPlayerName: string;
  ejectedPlayerAvatar?: string;
  isSpy: boolean;
  onComplete: () => void;
}

export const CinematicEjectionOverlay: React.FC<Props> = ({
  lang,
  ejectedPlayerName,
  ejectedPlayerAvatar,
  isSpy,
  onComplete
}) => {
  const t = dictionary[lang];
  const [animStage, setAnimStage] = useState<'appear' | 'action' | 'verdict'>('appear');
  const onCompleteRef = React.useRef(onComplete);
  const soundPlayedRef = React.useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // 1. Initial dramatic entrance -> Action (Cage slam or Tears) at 700ms
    const t1 = setTimeout(() => {
      setAnimStage('action');
      if (!soundPlayedRef.current) {
        soundPlayedRef.current = true;
        if (isSpy) {
          sound.playCageSlam();
        } else {
          sound.playSadTearsSound();
        }
      }
    }, 700);

    // 2. Reveal Verdict Banner at 1800ms
    const t2 = setTimeout(() => {
      setAnimStage('verdict');
    }, 1800);

    // 3. Complete and dismiss after exactly 5 seconds (5000ms) as requested
    const t3 = setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isSpy]); // Stable dependency, never re-runs on parent re-renders

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl overflow-hidden select-none animate-in fade-in duration-300">
      {/* Moving Cosmic Stars Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute w-1 h-1 bg-white rounded-full top-[15%] left-[20%] animate-ping" />
        <div className="absolute w-1.5 h-1.5 bg-sky-300 rounded-full top-[40%] left-[80%] animate-pulse" />
        <div className="absolute w-1 h-1 bg-amber-200 rounded-full top-[70%] left-[30%] animate-ping" />
        <div className="absolute w-2 h-2 bg-rose-400 rounded-full top-[25%] left-[65%] animate-pulse" />
      </div>

      {/* CENTER STAGE: Player in the Middle */}
      <div className="relative flex flex-col items-center justify-center z-20">
        {/* Avatar Container */}
        <div className="relative flex items-center justify-center">
          {/* Avatar Image */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-slate-900 border-4 border-slate-700 overflow-hidden shadow-2xl relative z-10">
            {ejectedPlayerAvatar ? (
              <img
                src={ejectedPlayerAvatar}
                alt={ejectedPlayerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                👨‍🚀
              </div>
            )}
          </div>

          {/* 🚨 CASE 1: SPY -> LASER / IRON PRISON CAGE DROPS FROM ABOVE */}
          {isSpy && (
            <div
              className={`absolute -inset-3 z-30 pointer-events-none transition-all duration-500 ease-out flex flex-col justify-between ${
                animStage === 'appear'
                  ? '-translate-y-[280%] opacity-0 scale-125'
                  : 'translate-y-0 opacity-100 scale-100'
              }`}
            >
              {/* Cage Top Bar */}
              <div className="w-full h-3 bg-gradient-to-r from-rose-700 via-rose-500 to-rose-700 rounded-t-xl border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)]" />

              {/* Vertical Laser Prison Bars */}
              <div className="w-full h-full flex justify-around px-1 py-0.5 bg-rose-950/20 backdrop-blur-[1px] border-x-2 border-rose-500 shadow-[inset_0_0_20px_rgba(244,63,94,0.4)]">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-full bg-gradient-to-b from-rose-400 via-amber-300 to-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,1)] animate-pulse"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>

              {/* Cage Bottom Bar + Padlock */}
              <div className="relative w-full h-3 bg-gradient-to-r from-rose-700 via-rose-500 to-rose-700 rounded-b-xl border-2 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.8)] flex items-center justify-center">
                <div className="absolute -bottom-4 w-7 h-7 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.8)]">
                  <Lock className="w-4 h-4 fill-amber-400" />
                </div>
              </div>
            </div>
          )}

          {/* 😭 CASE 2: INNOCENT -> ANIMATED TEARS STREAMING DOWN */}
          {!isSpy && animStage !== 'appear' && (
            <div className="absolute inset-0 z-30 pointer-events-none flex justify-around px-4">
              {/* Left Eye Tears */}
              <div className="relative w-3 h-full flex flex-col items-center">
                <span className="text-xl animate-bounce">💧</span>
                <div className="w-1 h-12 bg-sky-400/80 rounded-full shadow-[0_0_8px_rgba(56,189,248,1)] animate-pulse" />
                <span className="text-sm mt-1 animate-ping">💧</span>
              </div>

              {/* Right Eye Tears */}
              <div className="relative w-3 h-full flex flex-col items-center">
                <span className="text-xl animate-bounce" style={{ animationDelay: '150ms' }}>💧</span>
                <div className="w-1 h-12 bg-sky-400/80 rounded-full shadow-[0_0_8px_rgba(56,189,248,1)] animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="text-sm mt-1 animate-ping" style={{ animationDelay: '250ms' }}>💧</span>
              </div>
            </div>
          )}
        </div>

        {/* Player Name Badge */}
        <div className="mt-4 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-white shadow-lg">
          {ejectedPlayerName}
        </div>
      </div>

      {/* Dramatic Verdict Banner */}
      <div className="mt-8 max-w-md mx-auto text-center px-6 space-y-3 z-20">
        {animStage === 'verdict' && (
          <div
            className={`p-4 rounded-3xl border-2 backdrop-blur-xl animate-in zoom-in-95 duration-400 shadow-2xl ${
              isSpy
                ? 'bg-rose-950/85 border-rose-500 text-rose-100 shadow-[0_0_35px_rgba(244,63,94,0.5)]'
                : 'bg-slate-900/90 border-sky-400 text-sky-100 shadow-[0_0_35px_rgba(56,189,248,0.4)]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black font-heading">
              {isSpy ? (
                <>
                  <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />
                  <span>{t.spyCapturedTitle || 'Spy Captured In Prison Cage! 🕵️🔒'}</span>
                </>
              ) : (
                <>
                  <HeartCrack className="w-6 h-6 text-rose-400 animate-pulse" />
                  <span>{t.innocentAccusedTitle || 'Innocent Was Accused! 😭💔'}</span>
                </>
              )}
            </div>

            <p className="text-xs font-bold opacity-85 mt-1.5">
              {isSpy
                ? (t.spyCapturedMsg || 'Station secured! Spy {name} was locked up.').replace('{name}', ejectedPlayerName)
                : (t.innocentAccusedMsg || 'Sadly {name} was innocent and crying!').replace('{name}', ejectedPlayerName)
              }
            </p>
          </div>
        )}
      </div>

      {/* 5-Second Cinematic Progress Bar */}
      <div className="absolute bottom-6 inset-x-8 max-w-xs mx-auto h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50 z-20">
        <div
          className={`h-full animate-ejection-progress ${
            isSpy
              ? 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-400'
              : 'bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-300'
          }`}
        />
      </div>
    </div>
  );
};
