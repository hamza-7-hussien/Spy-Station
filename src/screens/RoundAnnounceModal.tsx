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
    <div className="fixed top-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-slate-950/95 border-2 border-sky-400 text-white shadow-[0_0_35px_rgba(56,189,248,0.5)] backdrop-blur-xl">
        <Rocket className="w-5 h-5 text-sky-400 animate-bounce" />
        <div className="text-xs uppercase tracking-widest font-mono text-sky-300 font-bold">
          MISSION UPDATE:
        </div>
        <div className="text-base sm:text-lg font-black font-heading tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-300">
          {t.lblRound} {round}
        </div>
      </div>
    </div>
  );
};
