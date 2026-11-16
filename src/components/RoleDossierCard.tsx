import React, { useState } from 'react';
import { Shield, AlertTriangle, Eye, EyeOff, Users } from 'lucide-react';
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
  roomGameMode,
  fellowSpiesNames,
  protectedSpyName,
  t
}) => {
  const [isHidden, setIsHidden] = useState(false);

  const isEffectiveSpy = isSpy && !isChameleonSpy;
  const catStyle = wordCategory ? CATEGORY_STYLES[wordCategory as CategoryKey] : undefined;
  const categoryLabel = catStyle
    ? (lang === 'ar' ? catStyle.titleAr : catStyle.titleEn)
    : wordCategory;

  const toggleVisibility = () => {
    sound.playTactileClick();
    sound.triggerHaptic('light');
    setIsHidden(prev => !prev);
  };

  return (
    <div
      className={`w-full rounded-2xl border p-4 sm:p-5 transition-colors select-none ${
        amSpectator
          ? 'bg-slate-900/90 border-slate-800'
          : isEffectiveSpy
          ? 'bg-rose-950/35 border-rose-500/40'
          : 'bg-[#111827] border-slate-700/80'
      }`}
    >
      {/* Top Row: Role label + single privacy Hide/Show toggle */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-bold">
          {amSpectator ? (
            <>
              <Eye className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-300">{t.lblSpectatorTag}</span>
            </>
          ) : isEffectiveSpy ? (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-rose-300">{t.youAreSpy}</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-sky-300">{t.youAreCrew}</span>
            </>
          )}
        </div>

        {!amSpectator && (
          <button
            type="button"
            onClick={toggleVisibility}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            {isHidden ? (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.secretWordToggleShow || (lang === 'ar' ? 'إظهار' : 'Show')}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>{t.secretWordToggleHide || (lang === 'ar' ? 'إخفاء' : 'Hide')}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="pt-4 text-center space-y-2.5">
        {amSpectator ? (
          <p className="text-xs text-slate-400 py-2">
            {lang === 'ar'
              ? 'تشاهد هذه الجولة دون المشاركة في التلميحات أو التصويت.'
              : 'Observing this match without participating in clues or voting.'}
          </p>
        ) : isHidden ? (
          <div className="py-5 space-y-1.5">
            <div className="text-lg font-bold text-slate-400 tracking-widest font-mono">
              ••••••••••
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'تم إخفاء البطاقة مؤقتاً — اضغط إظهار لعرضها مجدداً'
                : 'Card hidden for privacy — tap Show to reveal'}
            </p>
          </div>
        ) : isEffectiveSpy ? (
          <div className="space-y-2 py-1">
            <div className="text-2xl sm:text-3xl font-black font-heading text-rose-400 tracking-wide">
              {t.youAreSpy}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {t.lblBlendInHint}
            </p>

            {roomGameMode === 'mole' && fellowSpiesNames.length > 0 && (
              <div className="mt-3 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-rose-500/30 text-xs text-slate-200 inline-flex items-center gap-2 flex-wrap justify-center">
                <Users className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-slate-400 font-semibold">{t.lblFellowSpies}</span>
                <span className="font-bold text-white">{fellowSpiesNames.join(' ، ')}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {categoryLabel && (
              <div className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-sky-400 tracking-wide">
                {catStyle?.icon && <span className="text-sm leading-none">{catStyle.icon}</span>}
                <span>{t.categoryPrefix} {categoryLabel}</span>
              </div>
            )}

            <div className="text-xs text-slate-400 font-semibold">
              {t.secretWordLabel}
            </div>

            <div className="text-3xl sm:text-4xl font-black text-white font-heading tracking-wide break-words leading-tight py-1">
              {displayWord || '---'}
            </div>

            {protectedSpyName && (
              <div className="mt-2 px-3.5 py-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-100 inline-flex items-center gap-2 flex-wrap justify-center">
                <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-indigo-300 font-semibold">{t.protectedSpyLabel || t.lblUndercoverTag}</span>
                <span className="font-black text-white">{protectedSpyName}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
