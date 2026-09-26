import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';

interface Props {
  lang: Language;
  round: number;
}

export const RoundAnnounceModal: React.FC<Props> = ({ lang, round }) => {
  const t = dictionary[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-4 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className="text-xs uppercase tracking-[0.4em] font-bold text-sky-400 animate-pulse">
          SPY STATION TRANSMISSION
        </div>
        <div className="text-5xl sm:text-7xl font-black font-heading tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-300 to-sky-400 drop-shadow-[0_0_40px_rgba(56,189,248,0.7)] animate-in zoom-in-50 duration-500">
          {t.lblRound} {round}
        </div>
      </div>
    </div>
  );
};
