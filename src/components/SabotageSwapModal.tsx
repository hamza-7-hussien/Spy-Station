import React from 'react';
import { dictionary } from '../translations';
import { Language, PlayerData } from '../types';
import { X, ArrowLeftRight } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  currentUserUid: string;
  turnOrder: string[];
  players: Record<string, PlayerData>;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSwap: (targetUid: string) => void;
}

export const SabotageSwapModal: React.FC<Props> = ({
  lang,
  currentUserUid,
  turnOrder,
  players,
  isOpen,
  onClose,
  onConfirmSwap
}) => {
  if (!isOpen) return null;
  const t = dictionary[lang];

  const candidateUids = turnOrder.filter(uid => {
    if (uid === currentUserUid) return false;
    const p = players[uid];
    return p && !p.isSpectator;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-purple-500/30 p-6 shadow-2xl relative text-start">
        <button
          onClick={onClose}
          className="absolute top-4 inset-inline-end-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-purple-400 text-center mb-4 font-heading">
          {t.lblChooseSwapTarget}
        </h3>

        <div className="max-h-[280px] overflow-y-auto space-y-2.5 my-3 pr-1">
          {candidateUids.map(uid => {
            const p = players[uid];
            return (
              <div
                key={uid}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full object-cover border border-purple-400/40"
                  />
                  <span className="font-bold text-sm text-slate-200">{p?.name || 'Player'}</span>
                </div>

                <button
                  onClick={() => {
                    sound.playTone(700, 'triangle', 0.12);
                    onConfirmSwap(uid);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>{t.btnUseCard}</span>
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
        >
          {t.btnCancel}
        </button>
      </div>
    </div>
  );
};
