import React, { useState } from 'react';
import { Language } from '../types';
import { SUPPORTED_LANGUAGES, dictionary } from '../translations';
import { sound } from '../audio';
import { Globe, Check, Search, X, Sparkles } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const t = dictionary[lang];

  const currentMeta =
    SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q)
    );
  });

  const handleSelect = (code: Language) => {
    sound.playTone(520, 'sine', 0.1);
    sound.triggerHaptic('light');
    onChangeLanguage(code);
    setModalOpen(false);
  };

  return (
    <>
      {/* Selector Row: Word "Language" on one side, Button with chosen language beside it */}
      <div
        className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
          variant === 'card'
            ? 'bg-slate-950/70 border-slate-800 hover:border-sky-500/40'
            : 'bg-transparent border-transparent p-0'
        } ${className}`}
      >
        {/* Label: "Language / لغة" */}
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
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 active:scale-95 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
        >
          <span className="text-sm">{currentMeta.flag}</span>
          <span className="font-heading tracking-wide">{currentMeta.nativeName}</span>
          <span className="text-[10px] text-sky-400/80 uppercase font-mono">
            ({currentMeta.code})
          </span>
        </button>
      </div>

      {/* 🌐 20+ Languages Selector Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-3xl bg-slate-900 border-2 border-sky-400/40 shadow-2xl shadow-sky-500/10 overflow-hidden text-start">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-white">
                    {lang === 'ar' ? 'اختر لغة اللعبة' : 'Select Game Language'}
                  </h3>
                  <p className="text-[11px] font-bold text-sky-400">
                    {SUPPORTED_LANGUAGES.length} {lang === 'ar' ? 'لغة مدعومة حول العالم 🌍' : 'Supported Global Languages 🌍'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800/80">
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'بحث في اللغات الـ 22...'
                      : 'Search across 22 languages...'
                  }
                  className="w-full py-2 ps-9 pe-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white font-bold text-xs outline-none focus:border-sky-400 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Language Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredLanguages.map(item => {
                const isSelected = item.code === lang;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between text-start cursor-pointer group ${
                      isSelected
                        ? 'bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-1 ring-sky-400'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {item.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-white truncate flex items-center gap-1.5">
                          <span>{item.nativeName}</span>
                          {item.dir === 'rtl' && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                              RTL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.name} • {item.label}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono group-hover:text-sky-400 transition">
                        {item.code.toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'ar' ? 'يتم حفظ لغتك المفضلة تلقائياً' : 'Language saved automatically'}</span>
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition"
              >
                {t.btnCancel || 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
