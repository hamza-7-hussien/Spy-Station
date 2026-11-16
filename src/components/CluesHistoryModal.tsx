import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { MessageSquare, X, Clock } from 'lucide-react';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ClueEntry {
  uid?: string;
  sender: string;
  avatar?: string;
  text: string;
  round?: number;
  timestamp?: number;
  drawingStrokes?: Array<Array<{ x: number; y: number }>> | null;
}

interface Props {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  gameChat?: Record<string, ClueEntry>;
  currentUserUid: string;
}

const MiniDrawingPreview: React.FC<{ strokes: Array<Array<{ x: number; y: number }>> }> = ({ strokes }) => {
  return (
    <svg
      viewBox="0 0 100 50"
      className="w-28 h-14 rounded-lg bg-slate-950 border border-slate-800 shrink-0"
    >
      {strokes.map((stroke, idx) => {
        if (!stroke || stroke.length === 0) return null;
        const points = stroke.map(pt => `${(pt.x * 100).toFixed(1)},${(pt.y * 50).toFixed(1)}`).join(' ');
        if (stroke.length === 1) {
          return (
            <circle
              key={idx}
              cx={stroke[0].x * 100}
              cy={stroke[0].y * 50}
              r={1.6}
              fill="#38bdf8"
            />
          );
        }
        return (
          <polyline
            key={idx}
            points={points}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
};

export const CluesHistoryModal: React.FC<Props> = ({
  lang,
  isOpen,
  onClose,
  gameChat = {},
  currentUserUid
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const t = dictionary[lang];
  const cluesList: (ClueEntry & { id: string })[] = Object.entries(gameChat || {}).map(([id, entry]) => ({
    id,
    ...entry
  }));

  cluesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain select-none"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-sm sm:text-base text-white flex items-center gap-2">
                <span>{t.chatHistoryTitle}</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 font-mono text-xs tabular-nums">
                  {cluesList.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'سجل كافة التلميحات والرسومات عبر الجولات'
                  : 'Chronological log of all clues and sketches'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          data-scrollable="true"
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-5 space-y-4 text-start"
          onWheel={(e) => e.stopPropagation()}
        >
          {rounds.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 text-slate-500">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <MessageSquare className="w-7 h-7 text-slate-400" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-300">
                {t.lblNoCluesYet}
              </div>
            </div>
          ) : (
            rounds.map(roundNum => (
              <div key={roundNum} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-slate-800" />
                  <span className="text-xs font-heading font-bold text-sky-400 uppercase tracking-wider">
                    {t.lblRound} {roundNum}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-800" />
                </div>

                <div className="space-y-2">
                  {groupedByRound[roundNum].map((clue, idx) => {
                    const isMe = clue.uid === currentUserUid;
                    const timeStr = clue.timestamp
                      ? new Date(clue.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';
                    const hasDrawing = Array.isArray(clue.drawingStrokes) && clue.drawingStrokes.length > 0;

                    return (
                      <div
                        key={clue.id || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isMe
                            ? 'bg-sky-950/30 border-sky-500/35'
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={clue.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${clue.uid || clue.sender}`}
                            alt={clue.sender}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-white truncate">
                                {clue.sender}
                              </span>
                              {isMe && (
                                <span className="text-[10px] font-bold text-sky-400">
                                  ({t.lblYou})
                                </span>
                              )}
                            </div>
                            {timeStr && (
                              <div className="text-[10px] text-slate-500 font-mono tabular-nums flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{timeStr}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {hasDrawing ? (
                          <MiniDrawingPreview strokes={clue.drawingStrokes!} />
                        ) : (
                          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm font-bold max-w-[200px] break-words text-center">
                            {clue.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="min-h-[40px] py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
