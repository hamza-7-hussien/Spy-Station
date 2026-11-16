import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Radio } from 'lucide-react';

interface Props {
  lang: Language;
  round: number;
}

export const RoundAnnounceModal: React.FC<Props> = ({ lang, round }) => {
  const t = dictionary[lang];

  return (
    <div className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-3 animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#111827] border border-sky-500/50 text-white shadow-2xl">
        <Radio className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="text-xs sm:text-sm font-black font-heading text-sky-200 tabular-nums">
          {t.lblRound} {round}
        </span>
      </div>
    </div>
  );
};
