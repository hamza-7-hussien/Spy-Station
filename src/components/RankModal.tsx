import React from 'react';
import { dictionary } from '../translations';
import { Language, RankTier } from '../types';
import { X, Zap, Award, Shield, Compass, Star, Crown } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export const RANK_TIERS: RankTier[] = [
  { min: 0, icon: 'cadet', key: 'rankCadet' },
  { min: 100, icon: 'officer', key: 'rankOfficer' },
  { min: 300, icon: 'commander', key: 'rankCommander' },
  { min: 700, icon: 'master', key: 'rankMaster' },
  { min: 1500, icon: 'legend', key: 'rankLegend' }
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

function renderTierIcon(iconKey: string) {
  switch (iconKey) {
    case 'officer':
      return <Shield className="w-9 h-9 text-sky-400" />;
    case 'commander':
      return <Compass className="w-9 h-9 text-indigo-400" />;
    case 'master':
      return <Star className="w-9 h-9 text-amber-400" />;
    case 'legend':
      return <Crown className="w-9 h-9 text-amber-300" />;
    default:
      return <Award className="w-9 h-9 text-slate-300" />;
  }
}

interface Props {
  lang: Language;
  xp: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RankModal: React.FC<Props> = ({ lang, xp, isOpen, onClose }) => {
  useBodyScrollLock(isOpen);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in overscroll-contain select-none"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#111827] border border-slate-800 p-6 text-center shadow-2xl relative overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] absolute top-3 inset-inline-end-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
          {renderTierIcon(current.icon)}
        </div>

        <h3 className="text-xl font-black text-white font-heading">
          {t[current.key as keyof typeof t] || current.key}
        </h3>

        <div className="text-sm font-bold text-sky-400 font-mono tabular-nums mt-1 mb-4">
          {xp} XP
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-2">
          <div
            className="h-full rounded-full bg-sky-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="text-xs text-slate-400 font-medium mb-5">{nextText}</div>

        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-start text-xs text-slate-300 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>{t.lblHowToEarnXp}</span>
        </div>

        <button
          onClick={onClose}
          className="w-full min-h-[44px] mt-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition cursor-pointer"
        >
          {t.closeBtn || t.btnCancel}
        </button>
      </div>
    </div>
  );
};
