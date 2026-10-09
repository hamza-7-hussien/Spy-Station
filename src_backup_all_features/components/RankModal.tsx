import React from 'react';
import { dictionary } from '../translations';
import { Language, RankTier } from '../types';
import { X, Trophy, Zap } from 'lucide-react';

export const RANK_TIERS: RankTier[] = [
  { min: 0, icon: '🥉', key: 'rankCadet' },
  { min: 100, icon: '🥈', key: 'rankAgent' },
  { min: 300, icon: '🥇', key: 'rankCommander' },
  { min: 700, icon: '💎', key: 'rankEliteCommander' },
  { min: 1500, icon: '🌌', key: 'rankLegend' }
];

export function getRankInfo(xp: number) {
  let currentIndex = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].min) currentIndex = i;
  }
  return {
    current: RANK_TIERS[currentIndex],
    next: RANK_TIERS[currentIndex + 1] || null
  };
}

interface Props {
  lang: Language;
  xp: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RankModal: React.FC<Props> = ({ lang, xp, isOpen, onClose }) => {
  if (!isOpen) return null;
  const t = dictionary[lang];
  const { current, next } = getRankInfo(xp);

  let progressPct = 100;
  let nextText = t.lblMaxRank;

  if (next) {
    const span = next.min - current.min;
    const progressed = xp - current.min;
    progressPct = Math.min(100, Math.max(0, (progressed / span) * 100));
    nextText = `${next.min - xp} ${t.lblXpToNext} ${t[next.key as keyof typeof t] || next.key}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 text-center shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 inset-inline-end-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-6xl my-2 filter drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
          {current.icon}
        </div>

        <h3 className="text-xl font-black text-sky-400 font-heading">
          {t[current.key as keyof typeof t] || current.key}
        </h3>

        <div className="text-sm font-bold text-slate-400 mb-4">{xp} XP</div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5 mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-400 transition-all duration-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="text-xs text-slate-400 font-medium mb-5">{nextText}</div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-start text-xs text-slate-300 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{t.lblHowToEarnXp}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
        >
          {t.btnCancel}
        </button>
      </div>
    </div>
  );
};
