import React, { useState } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES, dictionary } from '../translations';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Globe, Check, X } from 'lucide-react';

interface Props {
  lang: Language;
  onChangeLanguage: (newLang: Language) => void;
  className?: string;
  variant?: 'inline' | 'card';
}

export const LanguageSelectorBar: React.FC<Props> = ({
  lang,
  onChangeLanguage,
  className = '',
  variant = 'card'
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const t = dictionary[lang];

  // Lock background scroll when language modal is open
  useBodyScrollLock(modalOpen);

  const currentMeta =
    SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: Language) => {
    sound.playTone(520, 'sine', 0.1);
    sound.triggerHaptic('light');
    onChangeLanguage(code);
    setModalOpen(false);
  };

  return (
    <>
      {/* Selector Row: Compact & snug */}
      <div
        className={`flex items-center justify-between gap-2.5 p-2 rounded-2xl border transition-all ${
          variant === 'card'
            ? 'bg-slate-950/70 border-slate-800 hover:border-sky-500/40 shadow-sm'
            : 'bg-transparent border-transparent p-0'
        } ${className}`}
      >
        {/* Label */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{currentMeta.label || t.lblLangSimple || 'Language'}</span>
        </div>

        {/* Button with chosen language */}
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            sound.triggerHaptic('light');
            setModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 active:scale-95 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
        >
          <span className="text-base leading-none">{currentMeta.flag}</span>
          <span className="font-heading tracking-wide">{currentMeta.nativeName}</span>
          <span className="text-[10px] text-sky-400/80 uppercase font-mono">
            ({currentMeta.code})
          </span>
        </button>
      </div>

      {/* Snug & Compact 5-Languages Selector Modal - No excess whitespace */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-xs sm:max-w-sm rounded-2xl bg-slate-900 border-2 border-sky-400/40 shadow-2xl shadow-sky-500/20 overflow-hidden text-start animate-in zoom-in-95 duration-150 overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Minimal Tight Header */}
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <h3 className="font-heading font-black text-xs text-white">
                  {lang === 'ar' ? 'اختر لغة اللعبة' : 'Select Language'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Language List - Snug, tightly fitted with ZERO wasted whitespace */}
            <div
              data-scrollable="true"
              className="p-2 space-y-1 overflow-y-auto max-h-[70vh] overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
            >
              {SUPPORTED_LANGUAGES.map(item => {
                const isSelected = item.code === lang;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`w-full p-2 rounded-xl border transition-all flex items-center justify-between text-start cursor-pointer group ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)] ring-1 ring-sky-400'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl leading-none group-hover:scale-110 transition-transform">
                        {item.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                          <span>{item.nativeName}</span>
                          {item.dir === 'rtl' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                              RTL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.name}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono group-hover:text-sky-400 transition font-bold px-1.5">
                        {item.code.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
