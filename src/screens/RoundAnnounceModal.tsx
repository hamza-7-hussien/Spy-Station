import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Rocket } from 'lucide-react';

interface Props {
  lang: Language;
  round: number;
}

export const RoundAnnounceModal: React.FC<Props> = ({ lang, round }) => {
  const t = dictionary[lang];

  return (
    <div className="fixed top-3 inset-x-0 z-50 flex justify-center pointer-events-none px-3 animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/95 border border-sky-400 text-white shadow-[0_0_25px_rgba(56,189,248,0.4)] backdrop-blur-xl">
        <Rocket className="w-4 h-4 text-sky-400 animate-bounce" />
        <span className="text-[10px] uppercase tracking-wider font-mono text-sky-300 font-bold">
          MISSION UPDATE:
        </span>
        <span className="text-xs sm:text-sm font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-300">
          {t.lblRound} {round}
        </span>
      </div>
    </div>
  );
};
