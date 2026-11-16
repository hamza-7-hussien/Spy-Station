import React, { useEffect, useState } from 'react';
import { sound } from '../audio';
import { Language } from '../types';
import { dictionary } from '../translations';
import { ShieldAlert, Lock, HeartCrack, User } from 'lucide-react';

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
    }, 650);

    const t2 = setTimeout(() => {
      setAnimStage('verdict');
    }, 1600);

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
  }, [isSpy]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#070a12]/95 backdrop-blur-xl overflow-hidden select-none animate-in fade-in duration-200">
      <div className="relative flex flex-col items-center justify-center z-20">
        <div className="relative flex items-center justify-center">
          <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-900 border-2 overflow-hidden shadow-2xl relative z-10 ${
            isSpy ? 'border-rose-500/70' : 'border-slate-700'
          }`}>
            {ejectedPlayerAvatar ? (
              <img
                src={ejectedPlayerAvatar}
                alt={ejectedPlayerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <User className="w-12 h-12" />
              </div>
            )}
          </div>

          {isSpy && (
            <div
              className={`absolute -inset-2.5 z-30 pointer-events-none transition-all duration-500 ease-out flex flex-col justify-between ${
                animStage === 'appear'
                  ? '-translate-y-[260%] opacity-0 scale-110'
                  : 'translate-y-0 opacity-100 scale-100'
              }`}
            >
              <div className="w-full h-2.5 bg-rose-600 rounded-t-lg border border-rose-400" />
              <div className="w-full h-full flex justify-around px-1.5 py-0.5 bg-rose-950/20 border-x border-rose-500/80">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-full bg-rose-500/80 rounded-full"
                  />
                ))}
              </div>
              <div className="relative w-full h-2.5 bg-rose-600 rounded-b-lg border border-rose-400 flex items-center justify-center">
                <div className="absolute -bottom-3.5 w-6 h-6 rounded-full bg-slate-950 border border-amber-400 flex items-center justify-center text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-white">
          {ejectedPlayerName}
        </div>
      </div>

      <div className="mt-7 max-w-md mx-auto text-center px-6 z-20 min-h-[100px]">
        {animStage === 'verdict' && (
          <div
            className={`p-4 rounded-2xl border animate-in zoom-in-95 duration-300 ${
              isSpy
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-100'
                : 'bg-[#111827] border-slate-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-black font-heading">
              {isSpy ? (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{t.spyCapturedTitle}</span>
                </>
              ) : (
                <>
                  <HeartCrack className="w-5 h-5 text-sky-400 shrink-0" />
                  <span>{t.innocentAccusedTitle}</span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-1.5">
              {isSpy
                ? t.spyCapturedMsg.replace('{name}', ejectedPlayerName)
                : t.innocentAccusedMsg.replace('{name}', ejectedPlayerName)}
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 inset-x-8 max-w-xs mx-auto h-1.5 rounded-full bg-slate-800 overflow-hidden z-20">
        <div
          className={`h-full animate-ejection-progress ${
            isSpy ? 'bg-rose-500' : 'bg-sky-400'
          }`}
        />
      </div>
    </div>
  );
};
