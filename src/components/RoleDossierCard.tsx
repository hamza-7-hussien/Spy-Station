import React, { useEffect, useRef } from 'react';
import { Shield, AlertTriangle, Eye } from 'lucide-react';
import { sound } from '../audio';
import { CategoryKey, Language } from '../types';
import { CATEGORY_STYLES } from '../wordVisuals';

interface RoleDossierCardProps {
  lang: Language;
  isSpy: boolean;
  isChameleonSpy: boolean;
  amSpectator: boolean;
  displayWord: string;
  wordCategory?: string;
  wordCategoryLabel?: string | null;
  wordCategoryImage?: string | null;
  roomGameMode?: string;
  fellowSpiesNames: string[];
  protectedSpyName?: string | null;
  t: Record<string, string>;
}

export const RoleDossierCard: React.FC<RoleDossierCardProps> = ({
  lang,
  isSpy,
  isChameleonSpy,
  amSpectator,
  displayWord,
  wordCategory,
  wordCategoryLabel,
  wordCategoryImage,
  roomGameMode,
  fellowSpiesNames,
  protectedSpyName,
  t
}) => {
  const isEffectiveSpy = isSpy && !isChameleonSpy;
  const lastSoundKeyRef = useRef<string>('');

  // Play subtle reveal audio once when a new round/role begins
  useEffect(() => {
    const key = `${isEffectiveSpy}-${displayWord}-${amSpectator}`;
    if (key === lastSoundKeyRef.current) return;
    lastSoundKeyRef.current = key;
    if (!amSpectator) {
      if (isEffectiveSpy) {
        sound.playSpyRevealSting();
      } else {
        sound.playCrewRevealChirp();
      }
    }
  }, [isEffectiveSpy, displayWord, amSpectator]);

  const catStyle = wordCategory ? CATEGORY_STYLES[wordCategory as CategoryKey] : undefined;
  const catLabel = wordCategoryLabel
    ? wordCategoryLabel
    : catStyle
    ? lang === 'ar'
      ? catStyle.titleAr
      : catStyle.titleEn
    : wordCategory;

  return (
    <div className="w-full select-none my-1">
      <div
        className={`relative w-full p-4 sm:p-5 rounded-3xl border-2 flex flex-col justify-between overflow-hidden shadow-2xl ${
          amSpectator
            ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-950 border-slate-700/80'
            : isEffectiveSpy
            ? 'bg-gradient-to-br from-red-950 via-zinc-950 to-neutral-950 border-rose-500/90 shadow-[0_0_40px_rgba(244,63,94,0.45)]'
            : 'bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 border-cyan-400/90 shadow-[0_0_40px_rgba(56,189,248,0.4)]'
        }`}
        style={{ minHeight: '148px' }}
      >
        {/* Spy Cracked Glass & Laser Beam Visuals */}
        {!amSpectator && isEffectiveSpy && (
          <>
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-35" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="20" x2="80" y2="90" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="80" y1="90" x2="160" y2="40" stroke="#f43f5e" strokeWidth="2" />
              <line x1="80" y1="90" x2="95" y2="150" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="160" y1="40" x2="260" y2="120" stroke="#f43f5e" strokeWidth="1" />
              <line x1="160" y1="40" x2="210" y2="10" stroke="#f43f5e" strokeWidth="1.5" />
              <line x1="95" y1="150" x2="40" y2="200" stroke="#f43f5e" strokeWidth="1" />
              <circle cx="80" cy="90" r="4" fill="#f43f5e" className="animate-ping" />
            </svg>
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,1)] animate-laser-sweep pointer-events-none" />
          </>
        )}

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between text-xs font-bold mb-2">
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase">
            {amSpectator ? (
              <span className="flex items-center gap-1 text-slate-400 font-bold">
                <Eye className="w-3.5 h-3.5" />
                <span>{t.lblSpectatorTag || (lang === 'ar' ? 'وضع المشاهدة' : 'SPECTATOR MODE')}</span>
              </span>
            ) : isEffectiveSpy ? (
              <span className="flex items-center gap-1 text-rose-400 font-black animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span>{lang === 'ar' ? '🚨 تنبيه تسلل سري' : '🚨 INFILTRATION ALERT'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-cyan-300 font-black">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'ar' ? '🛸 تصريح طاقم المحطة' : '🛸 CREW CLEARANCE VALID'}</span>
              </span>
            )}
          </div>

          <span className="text-[10px] font-mono text-slate-400/90">
            {amSpectator ? 'OBS // 00' : isEffectiveSpy ? '⚠️ ROGUE' : '🛸 AUTH // 07'}
          </span>
        </div>

        {/* Main Direct Role / Word Display (No Hide/Show toggle & No Fingerprint cover) */}
        <div className="relative z-10 my-auto py-1 text-center">
          {amSpectator ? (
            <div className="py-2 text-xs font-bold text-slate-400">
              {t.lblSpectatorTag || (lang === 'ar' ? 'أنت في وضع المشاهدة 👁️' : 'Spectator Mode 👁️')}
            </div>
          ) : isEffectiveSpy ? (
            <div className="space-y-1.5">
              <div className="inline-block px-3 py-0.5 rounded-lg border-2 border-dashed border-rose-500 text-rose-400 font-mono text-[11px] font-black uppercase tracking-widest rotate-[-1deg] shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                {lang === 'ar' ? '⚠️ سري للغاية // جاسوس' : 'TOP SECRET // CLASSIFIED SPY'}
              </div>

              <div className="text-2xl sm:text-3xl font-black text-rose-400 font-heading tracking-wide flex items-center justify-center gap-2 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
                <span>{t.youAreSpy || (lang === 'ar' ? 'أنت الجاسوس!' : 'You Are The Spy!')}</span>
                <span className="text-3xl">🕵️‍♂️</span>
              </div>

              <p className="text-xs font-bold text-rose-200/90 leading-tight">
                {t.lblBlendInHint || (lang === 'ar' ? 'راقب تلميحات الطاقم وخمّن الكلمة السرية دون أن تُكشف!' : 'Watch crew clues and deduce the secret word without getting caught!')}
              </p>

              {roomGameMode === 'mole' && fellowSpiesNames.length > 0 && (
                <div className="mt-2 p-1.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-[11px] text-purple-200">
                  <span className="font-bold text-purple-300">{t.lblFellowSpies || (lang === 'ar' ? 'شركاؤك في التجسس: ' : 'Fellow Spies: ')}</span>
                  <span className="font-mono font-bold text-white">{fellowSpiesNames.join(' ، ')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 flex flex-col items-center">
              {(wordCategory || wordCategoryLabel) && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-xs font-bold text-cyan-300">
                  {wordCategoryImage ? (
                    <img
                      src={wordCategoryImage}
                      alt={catLabel || ''}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <span>{catStyle?.icon || '🎯'}</span>
                  )}
                  <span>{catLabel}</span>
                </div>
              )}

              <div className="text-3xl sm:text-4xl font-black text-white font-heading tracking-wide break-words max-w-full text-center leading-tight drop-shadow-[0_0_25px_rgba(56,189,248,0.85)] py-0.5">
                {displayWord || t.secretWordLabel || (lang === 'ar' ? 'الكلمة السرية' : 'Secret Word')}
              </div>

              {protectedSpyName ? (
                <div className="mt-1 px-3 py-1 rounded-xl bg-cyan-950/80 border border-cyan-400/50 text-[11px] font-bold text-cyan-200">
                  🛡️ {lang === 'ar' ? `العميل السري — مهمتك حماية: ${protectedSpyName}` : `Undercover Protector — Protect: ${protectedSpyName}`}
                </div>
              ) : (
                <p className="text-[11px] font-bold text-cyan-200/80">
                  {lang === 'ar'
                    ? 'أنت من طاقم المحطة! أعطِ تلميحاً ذكياً دون كشف الكلمة.'
                    : 'You are Crew Member! Give a smart clue without revealing the word.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
