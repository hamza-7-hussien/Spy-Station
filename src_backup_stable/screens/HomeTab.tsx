import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, CategoryKey } from '../types';
import { CATEGORY_META } from '../words';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getRankInfo } from '../components/RankModal';
import { LogIn, Sparkles, KeyRound } from 'lucide-react';

interface Props {
  lang: Language;
  userName: string;
  userAvatar: string;
  userXp: number;
  onOpenRank: () => void;
  onOpenCreateRoom: (cat: CategoryKey | 'random') => void;
  onJoinRoom: (code: string) => void;
}

export const HomeTab: React.FC<Props> = ({
  lang,
  userName,
  userAvatar,
  userXp,
  onOpenRank,
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
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24">
      {/* Profile Bar */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-sky-400/30 backdrop-blur-xl shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <img
            src={userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`}
            alt="avatar"
            className="w-11 h-11 rounded-full object-cover border-2 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]"
          />
          <div>
            <div className="font-bold text-sm text-sky-300 flex items-center gap-1.5">
              <span>{userName}</span>
            </div>
            <button
              onClick={onOpenRank}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer underline underline-offset-2 decoration-dotted"
            >
              <span>{rank.current.icon}</span>
              <span>{t[rank.current.key as keyof typeof t] || rank.current.key}</span>
              <span>• {userXp} XP</span>
            </button>
          </div>
        </div>

        <div className="text-end">
          <div className="text-sm font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-400 tracking-wider">
            SPY STATION
          </div>
          <PWAInstallButton lang={lang} variant="compact" className="mt-1" />
        </div>
      </div>

      {/* Categories Card */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.chooseCategory}</span>
          </h2>
          <span className="text-[11px] font-bold text-purple-400">
            {lang === 'ar' ? '8 فئات + عشوائي' : '8 Categories + Random'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(CATEGORY_META) as CategoryKey[]).map(catKey => {
            const meta = CATEGORY_META[catKey];
            return (
              <button
                key={catKey}
                onClick={() => {
                  sound.playTone(450, 'sine', 0.1);
                  sound.triggerHaptic('light');
                  onOpenCreateRoom(catKey);
                }}
                className="group p-3.5 rounded-2xl bg-slate-950/60 border border-sky-500/20 hover:border-purple-400/60 hover:bg-purple-950/20 hover:-translate-y-1 active:translate-y-0 transition cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 shadow-md shadow-black/20"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {meta.icon}
                </span>
                <span className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors">
                  {t[meta.key as keyof typeof t] || meta.key}
                </span>
              </button>
            );
          })}

          {/* Random category button */}
          <button
            onClick={() => {
              sound.playTone(520, 'sine', 0.12);
              sound.triggerHaptic('medium');
              onOpenCreateRoom('random');
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/60 border border-purple-500/30 hover:border-purple-400 hover:-translate-y-1 active:translate-y-0 transition cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 shadow-md"
          >
            <span className="text-2xl">🎲</span>
            <span className="text-xs font-bold text-purple-300">{t.catRandom}</span>
          </button>
        </div>

        <hr className="border-slate-800 my-4" />

        {/* Join by Code */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2 flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.lblJoinTitle}</span>
          </h3>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder={t.lblJoinPlaceholder}
              maxLength={6}
              className="flex-1 min-w-0 py-3 px-3 rounded-2xl bg-slate-950/90 border border-sky-400/25 focus:border-sky-400 text-white font-mono font-bold tracking-widest text-center text-sm uppercase outline-none focus:shadow-[0_0_15px_rgba(56,189,248,0.25)] transition placeholder:tracking-normal placeholder:font-sans placeholder:text-[11px] sm:placeholder:text-xs placeholder:text-slate-400 placeholder:normal-case"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{t.joinRoom}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
