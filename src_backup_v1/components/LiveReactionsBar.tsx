import React, { useState } from 'react';
import { Volume2, Sparkles, Flame, ChevronUp, ChevronDown } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  lang: Language;
  onSendReaction: (emoji: string) => void;
  onTriggerSfx: (soundType: 'dramatic' | 'alarm' | 'heartbeat' | 'laugh' | 'applause') => void;
}

const EMOJIS = ['🧐', '😱', '🤥', '🍿', '🎯', '🚀', '💀', '🔥'];

export const LiveReactionsBar: React.FC<Props> = ({
  lang,
  onSendReaction,
  onTriggerSfx
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sfxCooldown, setSfxCooldown] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    sound.playBubblePop();
    sound.triggerHaptic('light');
    onSendReaction(emoji);
  };

  const handleSfxClick = (type: 'dramatic' | 'alarm' | 'heartbeat' | 'laugh' | 'applause') => {
    if (sfxCooldown) return;
    setSfxCooldown(true);
    sound.triggerHaptic('medium');
    onTriggerSfx(type);
    setTimeout(() => setSfxCooldown(false), 3000);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-2">
      <div className="rounded-2xl bg-slate-950/80 border border-purple-500/30 backdrop-blur-xl p-2 shadow-xl shadow-purple-950/30 transition-all">
        {/* Top Mini Bar with Emojis */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 scrollbar-none">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-lg sm:text-xl rounded-xl bg-slate-900/80 hover:bg-purple-900/40 hover:scale-125 active:scale-95 transition-transform cursor-pointer border border-slate-800 shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Toggle Soundboard button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsExpanded(!isExpanded);
            }}
            className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
              isExpanded
                ? 'bg-purple-600/30 border-purple-400 text-purple-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'أصوات' : 'SFX'}</span>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded SFX Soundboard Panel */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-800/80 grid grid-cols-5 gap-1.5 animate-in slide-in-from-top-2 duration-150">
            <button
              disabled={sfxCooldown}
              onClick={() => handleSfxClick('dramatic')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition cursor-pointer ${
                sfxCooldown
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : 'bg-red-950/40 border-red-500/30 hover:bg-red-900/50 hover:border-red-400'
              }`}
            >
              <span className="text-base">😱</span>
              <span className="text-[10px] font-bold text-red-200 truncate w-full">
                {lang === 'ar' ? 'صدمة!' : 'Sting'}
              </span>
            </button>

            <button
              disabled={sfxCooldown}
              onClick={() => handleSfxClick('alarm')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition cursor-pointer ${
                sfxCooldown
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : 'bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-400'
              }`}
            >
              <span className="text-base">🚨</span>
              <span className="text-[10px] font-bold text-amber-200 truncate w-full">
                {lang === 'ar' ? 'إنذار!' : 'Alarm'}
              </span>
            </button>

            <button
              disabled={sfxCooldown}
              onClick={() => handleSfxClick('heartbeat')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition cursor-pointer ${
                sfxCooldown
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : 'bg-rose-950/40 border-rose-500/30 hover:bg-rose-900/50 hover:border-rose-400'
              }`}
            >
              <span className="text-base">💓</span>
              <span className="text-[10px] font-bold text-rose-200 truncate w-full">
                {lang === 'ar' ? 'توتر' : 'Tension'}
              </span>
            </button>

            <button
              disabled={sfxCooldown}
              onClick={() => handleSfxClick('laugh')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition cursor-pointer ${
                sfxCooldown
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : 'bg-yellow-950/40 border-yellow-500/30 hover:bg-yellow-900/50 hover:border-yellow-400'
              }`}
            >
              <span className="text-base">🤡</span>
              <span className="text-[10px] font-bold text-yellow-200 truncate w-full">
                {lang === 'ar' ? 'ضحك' : 'Laugh'}
              </span>
            </button>

            <button
              disabled={sfxCooldown}
              onClick={() => handleSfxClick('applause')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition cursor-pointer ${
                sfxCooldown
                  ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800'
                  : 'bg-sky-950/40 border-sky-500/30 hover:bg-sky-900/50 hover:border-sky-400'
              }`}
            >
              <span className="text-base">👏</span>
              <span className="text-[10px] font-bold text-sky-200 truncate w-full">
                {lang === 'ar' ? 'تصفيق' : 'Applause'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
