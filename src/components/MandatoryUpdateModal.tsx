import React, { useState } from 'react';
import { Language } from '../types';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Sparkles, RefreshCw, Rocket, Zap } from 'lucide-react';

interface Props {
  lang: Language;
  targetVersion: string;
  onUpdateCompleted: () => void;
}

const UPDATE_STRINGS = {
  ar: {
    title: 'تحديث جديد للمحطة متوفر! 🚀',
    badge: 'إصدار جديد',
    sub: 'يتوفر إصدار جديد من اللعبة. يجب التحديث للمتابعة.',
    reqNotice: '⚠️ تحديث إلزامي: اضغط على الزر أدناه لتحديث اللعبة وإعادة تشغيلها مباشرة.',
    btnUpdate: 'تحديث اللعبة الآن وإعادة التشغيل 🚀',
    updating: 'جاري تثبيت التحديث... ⚡',
    tip: 'سيتم إعادة تشغيل اللعبة فوراً بأحدث إصدار.'
  },
  en: {
    title: 'New Station Update Available! 🚀',
    badge: 'New Release',
    sub: 'A new game version is ready. Please update to proceed.',
    reqNotice: '⚠️ Mandatory Update: Tap the button below to update and restart the station.',
    btnUpdate: 'Update & Restart Station 🚀',
    updating: 'Installing update... ⚡',
    tip: 'The station will automatically restart into the latest release.'
  },
  de: {
    title: 'Neues Stations-Update Verfügbar! 🚀',
    badge: 'Neue Version',
    sub: 'Eine neue Version des Spiels ist verfügbar. Bitte aktualisieren, um fortzufahren.',
    reqNotice: '⚠️ Pflicht-Update: Klicke unten, um die Station zu aktualisieren und neu zu starten.',
    btnUpdate: 'Station Jetzt Aktualisieren & Neustarten 🚀',
    updating: 'Update wird installiert... ⚡',
    tip: 'Die Station startet sofort mit der neuesten Version neu.'
  },
  fr: {
    title: 'Nouvelle Mise à Jour Disponible ! 🚀',
    badge: 'Nouvelle Version',
    sub: 'Une nouvelle version du jeu est prête. Veuillez mettre à jour pour continuer.',
    reqNotice: '⚠️ Mise à jour obligatoire : appuyez sur le bouton ci-dessous pour mettre à jour et redémarrer.',
    btnUpdate: 'Mettre à Jour & Redémarrer la Station 🚀',
    updating: 'Installation de la mise à jour... ⚡',
    tip: 'La station redémarrera automatiquement avec la dernière version.'
  },
  es: {
    title: '¡Nueva Actualización Disponible! 🚀',
    badge: 'Nueva Versión',
    sub: 'Una nueva versión del juego está lista. Por favor actualiza para continuar.',
    reqNotice: '⚠️ Actualización obligatoria: toca el botón abajo para actualizar y reiniciar la estación.',
    btnUpdate: 'Actualizar y Reiniciar la Estación 🚀',
    updating: 'Instalando actualización... ⚡',
    tip: 'La estación se reiniciará automáticamente con la última versión.'
  }
};

export const MandatoryUpdateModal: React.FC<Props> = ({
  lang,
  targetVersion,
  onUpdateCompleted
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const strings = UPDATE_STRINGS[lang] || UPDATE_STRINGS.en;

  // Lock background scroll completely during mandatory update screen
  useBodyScrollLock(true);

  const handleApplyUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    sound.triggerHaptic('heavy');
    sound.playChime([[440, 0, 0.1], [660, 90, 0.15], [880, 180, 0.25]], 'sine');

    try {
      // 1. Clear application CacheStorage
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        } catch (e) {
          console.warn('Cache clear note:', e);
        }
      }

      // 2. Update service worker if registered
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.update().catch(() => {});
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (e) {
          console.warn('Service worker update note:', e);
        }
      }

      // 3. Mark version in localStorage
      localStorage.setItem('spy_station_installed_version', targetVersion);
      localStorage.setItem('spy_station_last_update_ts', Date.now().toString());

      // 4. Brief pause for UI feedback then reload
      setTimeout(() => {
        onUpdateCompleted();
        window.location.reload();
      }, 700);
    } catch {
      localStorage.setItem('spy_station_installed_version', targetVersion);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 select-none overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div
        className="relative w-full max-w-md rounded-[32px] bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-sky-400/50 shadow-[0_0_60px_rgba(56,189,248,0.25)] p-6 sm:p-7 text-center overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Animated Badge & Icon */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-3xl bg-slate-950 border-2 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.4)]">
          <div className="absolute inset-[-4px] rounded-3xl border border-dashed border-sky-400/60 animate-spin-slow pointer-events-none" />
          <Rocket className="w-10 h-10 text-sky-400 animate-pulse" />
        </div>

        {/* Version Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{strings.badge} v{targetVersion}</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black font-heading text-white mb-2 tracking-wide">
          {strings.title}
        </h2>

        {/* Subtitle - Clean, without detailing specific update features */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
          {strings.sub}
        </p>

        {/* Mandatory warning notice box */}
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold mb-5 text-start flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{strings.reqNotice}</span>
        </div>

        {/* Big Update Button - Only way into the game */}
        <button
          type="button"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 hover:brightness-110 active:scale-95 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(56,189,248,0.4)] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
              <span>{strings.updating}</span>
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 text-slate-950" />
              <span>{strings.btnUpdate}</span>
            </>
          )}
        </button>

        {/* Hint text below */}
        <p className="text-[10px] text-slate-400 mt-3 font-medium">
          {strings.tip}
        </p>
      </div>
    </div>
  );
};
