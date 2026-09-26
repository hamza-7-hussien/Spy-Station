import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { MessageSquare, X, Clock, User, ShieldAlert, Sparkles } from 'lucide-react';
import { sound } from '../audio';

interface ClueEntry {
  uid?: string;
  sender: string;
  avatar?: string;
  text: string;
  round?: number;
  timestamp?: number;
}

interface Props {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  gameChat?: Record<string, ClueEntry>;
  currentUserUid: string;
}

export const CluesHistoryModal: React.FC<Props> = ({
  lang,
  isOpen,
  onClose,
  gameChat = {},
  currentUserUid
}) => {
  if (!isOpen) return null;

  const t = dictionary[lang];
  const cluesList: (ClueEntry & { id: string })[] = Object.entries(gameChat || {}).map(([id, entry]) => ({
    id,
    ...entry
  }));

  // Sort chronologically
  cluesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Group by round
  const groupedByRound: Record<number, typeof cluesList> = {};
  cluesList.forEach(clue => {
    const roundNum = clue.round || 1;
    if (!groupedByRound[roundNum]) groupedByRound[roundNum] = [];
    groupedByRound[roundNum].push(clue);
  });

  const rounds = Object.keys(groupedByRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-gradient-to-b from-slate-900 via-[#0b1329] to-[#040817] border-2 border-sky-500/40 shadow-[0_0_50px_rgba(56,189,248,0.25)] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-sky-500/20 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base text-white flex items-center gap-2">
                <span>{t.chatHistoryTitle}</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-xs border border-sky-400/30">
                  {cluesList.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar' ? 'سجل كافة التلميحات والمحادثات التي قيلت عبر الجولات' : 'Full chronological log of clues given across rounds'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clues List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-start">
          {rounds.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700/60">
                <MessageSquare className="w-8 h-8 text-slate-400 opacity-60" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-400">
                {t.lblNoCluesYet}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                {lang === 'ar' ? 'عندما يقول أي لاعب تلميحه في دوره، سيظهر هنا فوراً بالترتيب الزمني.' : 'When any player provides a clue during their turn, it will be logged here.'}
              </p>
            </div>
          ) : (
            rounds.map(roundNum => (
              <div key={roundNum} className="space-y-2.5">
                {/* Round Divider Header */}
                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
                  <span className="px-3 py-1 rounded-full bg-sky-950/80 border border-sky-400/40 text-sky-300 font-heading font-black text-xs uppercase tracking-wider shadow-sm">
                    {lang === 'ar' ? `الجولة ${roundNum}` : `Round ${roundNum}`}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-sky-500/30 to-transparent" />
                </div>

                {/* Round Clues */}
                <div className="space-y-2">
                  {groupedByRound[roundNum].map((clue, idx) => {
                    const isMe = clue.uid === currentUserUid;
                    const timeStr = clue.timestamp
                      ? new Date(clue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={clue.id || idx}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isMe
                            ? 'bg-sky-950/40 border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                            : 'bg-slate-950/70 border-slate-800'
                        }`}
                      >
                        {/* Player Info */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={clue.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${clue.uid || clue.sender}`}
                            alt={clue.sender}
                            className={`w-9 h-9 rounded-full object-cover border shrink-0 ${
                              isMe ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-700'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-black text-xs text-white truncate">
                                {clue.sender}
                              </span>
                              {isMe && (
                                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/40 text-[9px] font-bold">
                                  {lang === 'ar' ? 'أنت' : 'You'}
                                </span>
                              )}
                            </div>
                            {timeStr && (
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{timeStr}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Clue Word / Clue Text */}
                        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-sky-400/40 text-sky-200 text-xs sm:text-sm font-black tracking-wide shadow-inner max-w-[160px] truncate text-center">
                          "{clue.text}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-sky-500/20 bg-slate-950/70 flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق السجل' : 'Close History'}
          </button>
        </div>
      </div>
    </div>
  );
};
