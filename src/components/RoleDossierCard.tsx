import React, { useState, useEffect } from 'react';
import { Fingerprint, Pin, Sparkles, Shield, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';
import { CATEGORY_STYLES } from '../wordVisuals';
import { CategoryKey } from '../types';

interface RoleDossierCardProps {
  lang: Language;
  isSpy: boolean;
  isChameleonSpy: boolean;
  amSpectator: boolean;
  displayWord: string;
  wordCategory?: string;
  roomGameMode?: string;
  fellowSpiesNames: string[];
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
  t
}) => {
  const [isPinned, setIsPinned] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  const isFlipped = isPinned || isHolding;

  // Play reveal sound effect when flipping open
  useEffect(() => {
    if (isFlipped) {
      sound.playCardFlip();
      if (!amSpectator) {
        if (isSpy && !isChameleonSpy) {
          sound.playSpyRevealSting();
        } else {
          sound.playCrewRevealChirp();
        }
      }
    }
  }, [isFlipped, isSpy, isChameleonSpy, amSpectator]);

  const handlePointerDown = () => {
    if (!isPinned) {
      setIsHolding(true);
      sound.playBiometricScan();
    }
  };

  const handlePointerUp = () => {
    if (!isPinned) {
      setIsHolding(false);
      sound.triggerHaptic('light');
    }
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playTactileClick();
    setIsPinned(prev => !prev);
  };

  const isEffectiveSpy = isSpy && !isChameleonSpy;

  return (
    <div className="w-full perspective-1000 select-none my-1">
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          if (!isPinned) setIsHolding(false);
        }}
        onPointerCancel={() => {
          if (!isPinned) setIsHolding(false);
        }}
        className={`relative w-full rounded-3xl transition-transform duration-500 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{ minHeight: '160px' }}
      >
        {/* ========================================================= */}
        {/* 🪪 FRONT FACE: UNREVEALED TOP-SECRET BIOMETRIC DOSSIER */}
        {/* ========================================================= */}
        <div className="absolute inset-0 w-full h-full backface-hidden p-4 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 border-2 border-slate-700/80 hover:border-cyan-500/60 shadow-2xl flex flex-col justify-between overflow-hidden">
          {/* Animated laser scanner line while holding */}
          {isHolding && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(56,189,248,1)] animate-laser-sweep pointer-events-none" />
          )}

          {/* Top Dossier Header */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-mono tracking-wider text-[11px] uppercase">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-slate-300">
                {lang === 'ar' ? 'ملف المهمة المشفر' : 'CLASSIFIED DOSSIER'}
              </span>
            </div>

            <div className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-cyan-300">
              LEVEL 05 // SEC
            </div>
          </div>

          {/* Central Fingerprint Scanner */}
          <div className="flex flex-col items-center justify-center my-auto py-2 text-center">
            <div className="relative w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] group-hover:scale-105 transition-transform">
              <Fingerprint className="w-8 h-8 animate-pulse text-cyan-400" />
              <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-ping opacity-40" />
            </div>

            <div className="mt-2.5 text-xs sm:text-sm font-black font-heading text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t.lblHoldScanner || (lang === 'ar' ? 'المس أو اضغط مطولاً لكشف هويتك' : 'Hold or Tap to Reveal Role')}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5">
              {t.lblReleaseScanner || (lang === 'ar' ? 'ارفع إصبعك لإخفاء الهوية مجدداً' : 'Release to re-conceal identity')}
            </span>
          </div>

          {/* Bottom Prompt / Lock Pin CTA */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>{lang === 'ar' ? 'محتوى فائق السرية' : 'STRICTLY CONFIDENTIAL'}</span>
            </span>
            <button
              type="button"
              onClick={togglePin}
              className="px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <Pin className="w-3 h-3 text-cyan-400" />
              <span>{t.lblPin || (lang === 'ar' ? 'تثبيت' : 'Pin')}</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🎭 BACK FACE: REVEALED IDENTITY CARD (SPY OR CREW MEMBER) */}
        {/* ========================================================= */}
        <div
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 p-4 rounded-3xl border-2 flex flex-col justify-between overflow-hidden shadow-2xl ${
            isEffectiveSpy
              ? 'bg-gradient-to-br from-red-950 via-zinc-950 to-neutral-950 border-rose-500/90 shadow-[0_0_50px_rgba(244,63,94,0.6)]'
              : 'bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950 border-cyan-400/90 shadow-[0_0_50px_rgba(56,189,248,0.5)]'
          }`}
        >
          {/* ======================================================= */}
          {/* ⚡ SPY BROKEN SCREEN OVERLAY & SCANLINES */}
          {/* ======================================================= */}
          {isEffectiveSpy && (
            <>
              {/* Cracked Glass SVG Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="20" x2="80" y2="90" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="80" y1="90" x2="160" y2="40" stroke="#f43f5e" strokeWidth="2" />
                <line x1="80" y1="90" x2="95" y2="150" stroke="#f43f5e" strokeWidth="1.5" />
                <line x1="160" y1="40" x2="260" y2="120" stroke="#f43f5e" strokeWidth="1" />
                <line x1="160" y1="40" x2="210" y2="10" stroke="#f43f5e" strokeWidth="1.5" />
                <line x1="95" y1="150" x2="40" y2="200" stroke="#f43f5e" strokeWidth="1" />
                <line x1="260" y1="120" x2="320" y2="180" stroke="#f43f5e" strokeWidth="2" />
                <circle cx="80" cy="90" r="4" fill="#f43f5e" className="animate-ping" />
              </svg>

              {/* Red Laser Scanning Beam */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_rgba(244,63,94,1)] animate-laser-sweep pointer-events-none" />
            </>
          )}

          {/* Top Header & Unpin Action */}
          <div className="relative z-10 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase">
              {isEffectiveSpy ? (
                <span className="flex items-center gap-1 text-rose-400 font-black animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span>{lang === 'ar' ? '🚨 بروتوكول التسلل السري' : '🚨 INFILTRATION BREACH'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-cyan-300 font-black">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{lang === 'ar' ? '🛸 تصريح طاقم السفينة' : '🛸 CREW CLEARANCE VALID'}</span>
                </span>
              )}
            </div>

            {/* Pin / Freeze Button */}
            <button
              type="button"
              onClick={togglePin}
              className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                isPinned
                  ? isEffectiveSpy
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-sm'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={isPinned ? t.lblPinned : t.lblPin}
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'rotate-45' : ''}`} />
              <span>{isPinned ? (t.lblPinned || (lang === 'ar' ? 'مثبّت' : 'Pinned')) : (t.lblPin || (lang === 'ar' ? 'تثبيت' : 'Pin'))}</span>
            </button>
          </div>

          {/* ======================================================= */}
          {/* 🎯 MAIN ROLE PRESENTATION */}
          {/* ======================================================= */}
          <div className="relative z-10 my-auto py-1 text-center">
            {amSpectator ? (
              <div className="py-2 text-xs font-bold text-slate-400">
                {t.lblSpectatorTag || (lang === 'ar' ? 'أنت في وضع المشاهدة 👁️' : 'Spectator Mode 👁️')}
              </div>
            ) : isEffectiveSpy ? (
              /* SPY CARD INTERIOR */
              <div className="space-y-1">
                {/* Classified Red Rubber Stamp */}
                <div className="inline-block px-3 py-0.5 rounded-lg border-2 border-dashed border-rose-500 text-rose-400 font-mono text-[11px] font-black uppercase tracking-widest rotate-[-2deg] shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-glitch">
                  {lang === 'ar' ? '⚠️ سري للغاية // جاسوس' : 'TOP SECRET // CLASSIFIED SPY'}
                </div>

                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-heading tracking-wide flex items-center justify-center gap-2 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
                  <span>{t.youAreSpy || (lang === 'ar' ? 'أنت الجاسوس!' : 'You Are The Spy!')}</span>
                  <span className="text-3xl">🕵️‍♂️</span>
                </div>

                <p className="text-xs font-bold text-rose-200/90 leading-tight">
                  {t.lblBlendInHint || (lang === 'ar' ? 'مهمتك: الاندماج ومعرفة الكلمة دون أن تكشفك العيون!' : 'Mission: Blend in, deduce the secret word, do not get caught!')}
                </p>

                {roomGameMode === 'mole' && fellowSpiesNames.length > 0 && (
                  <div className="mt-2 p-1.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-[11px] text-purple-200">
                    <span className="font-bold text-purple-300">{t.lblFellowSpies || (lang === 'ar' ? 'شركاؤك في التجسس: ' : 'Fellow Spies: ')}</span>
                    <span className="font-mono font-bold text-white">{fellowSpiesNames.join(' ، ')}</span>
                  </div>
                )}
              </div>
            ) : (
              /* CREW MEMBER CARD INTERIOR */
              <div className="space-y-1 flex flex-col items-center">
                {wordCategory && (
                  <div className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-1.5">
                    <span>{CATEGORY_STYLES[wordCategory as CategoryKey]?.icon}</span>
                    <span>
                      {wordCategory && CATEGORY_STYLES[wordCategory as CategoryKey]
                        ? (lang === 'ar' ? CATEGORY_STYLES[wordCategory as CategoryKey].titleAr : CATEGORY_STYLES[wordCategory as CategoryKey].titleEn)
                        : wordCategory}
                    </span>
                  </div>
                )}

                <div className="text-2xl sm:text-4xl font-black text-white font-heading tracking-wide break-words max-w-full text-center leading-tight drop-shadow-[0_0_25px_rgba(56,189,248,0.8)]">
                  {displayWord || t.secretWordLabel || (lang === 'ar' ? 'الكلمة السرية' : 'Secret Word')}
                </div>

                <p className="text-[11px] font-bold text-cyan-200/80">
                  {lang === 'ar'
                    ? 'أنت من طاقم المحطة! استمع جيداً للتلميحات لكشف الجاسوس المتسلل.'
                    : 'You are Crew Member! Pay close attention to clues to catch the infiltrator.'}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Flip Reminder */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 font-mono">
            <span className="flex items-center gap-1">
              <EyeOff className="w-3 h-3 text-slate-400" />
              <span>{lang === 'ar' ? 'انقر للتثبيت أو الإخفاء' : 'Tap to pin or conceal'}</span>
            </span>
            <span className="text-slate-500">
              {isEffectiveSpy ? '⚠️ ROGUE CODE' : '🛸 AUTH // 07'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
