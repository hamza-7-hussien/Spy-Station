import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, CategoryKey } from '../types';
import { CATEGORY_META } from '../words';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getRankInfo } from '../components/RankModal';
import { LogIn, KeyRound, ChevronRight, Zap, Award } from 'lucide-react';

interface Props {
  lang: Language;
  userName: string;
  userAvatar: string;
  userXp: number;
  onOpenRank: () => void;
  onOpenQuickMatch: () => void;
  onOpenCreateRoom: (cat: CategoryKey | 'random') => void;
  onJoinRoom: (code: string) => void;
}

export const HomeTab: React.FC<Props> = ({
  lang,
  userName,
  userAvatar,
  userXp,
  onOpenRank,
  onOpenQuickMatch,
  onOpenCreateRoom,
  onJoinRoom
}) => {
  const [roomCode, setRoomCode] = useState('');
  const t = dictionary[lang];
  const rank = getRankInfo(userXp);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.triggerHaptic('light');
    if (roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-28 pt-2">
      {/* Top Profile & Brand Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800">
        <div className="flex items-center gap-3.5 min-w-0">
          <img
            src={userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`}
            alt={userName}
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-base text-white truncate">
              {userName}
            </div>
            <button
              type="button"
              onClick={onOpenRank}
              className="mt-0.5 text-xs text-slate-400 hover:text-sky-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{t[rank.current.key as keyof typeof t] || rank.current.key}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-slate-300">{userXp} XP</span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-500 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <PWAInstallButton lang={lang} variant="compact" />
          <div className="text-end">
            <div className="text-sm font-black font-heading text-white tracking-wide">
              SPY STATION
            </div>
            <div className="text-[11px] text-slate-400">
              {t.appSub}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Categories Card (Primary Focal Area) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white font-heading">
              {t.chooseCategory}
            </h2>
            <span className="text-xs text-slate-400 tabular-nums">
              {t.categoriesCount}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {(Object.keys(CATEGORY_META) as CategoryKey[]).map(catKey => {
              const meta = CATEGORY_META[catKey];
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => {
                    sound.playTone(450, 'sine', 0.1);
                    sound.triggerHaptic('light');
                    onOpenCreateRoom(catKey);
                  }}
                  className="group min-h-[84px] p-3 rounded-xl bg-slate-950/75 border border-slate-800 hover:border-sky-500/60 hover:bg-slate-900 active:scale-[0.98] transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5"
                >
                  <span className="text-2xl leading-none group-hover:scale-110 transition-transform" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-full">
                    {t[meta.key as keyof typeof t] || meta.key}
                  </span>
                </button>
              );
            })}

            {/* Random category button */}
            <button
              type="button"
              onClick={() => {
                sound.playTone(520, 'sine', 0.12);
                sound.triggerHaptic('medium');
                onOpenCreateRoom('random');
              }}
              className="group min-h-[84px] p-3 rounded-xl bg-slate-950/90 border border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/30 active:scale-[0.98] transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5"
            >
              <span className="text-2xl leading-none group-hover:scale-110 transition-transform" aria-hidden="true">
                🎲
              </span>
              <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 truncate max-w-full">
                {t.catRandom}
              </span>
            </button>
          </div>
        </div>

        {/* Join by Code & Quick Match Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          {/* Join by Code */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <KeyRound className="w-4 h-4 text-sky-400 shrink-0" />
              <h3>{t.lblJoinTitle}</h3>
            </div>

            <form onSubmit={handleJoin} className="space-y-2.5">
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase())}
                placeholder={t.lblJoinPlaceholder}
                maxLength={6}
                className="w-full min-h-[46px] py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 text-white font-mono font-bold tracking-widest text-center text-sm uppercase outline-none transition placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500 placeholder:normal-case"
              />
              <button
                type="submit"
                className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.joinRoom}</span>
              </button>
            </form>
          </div>

          {/* Quick Online Match */}
          <div className="p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white">
                {t.quickMatchTitle}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t.quickMatchSub}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenQuickMatch();
              }}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{t.btnLaunchFast}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
