import React, { useState } from 'react';
import { Language } from '../types';
import { sound } from '../audio';
import { Sparkles, RefreshCw, Rocket, ShieldCheck, Zap } from 'lucide-react';

interface Props {
  lang: Language;
  targetVersion: string;
  onUpdateCompleted: () => void;
}

const UPDATE_STRINGS = {
  ar: {
    title: 'تحديث جديد للمحطة متوفر! 🚀',
    badge: 'إصدار جديد',
    sub: 'تم إطلاق تحديث جديد للعبة يتضمن تحسينات شاملة في اللغات وإصلاحات مهمة.',
    reqNotice: '⚠️ تحديث إلزامي: يجب تحديث اللعبة الآن للتمكن من الدخول وبدء المهمات.',
    features: [
      'تعريب وترجمة كاملة لجميع اللغات (الألمانية، الفرنسية، الإسبانية، الإنجليزية، العربية)',
      'تحسين الواجهات وتنسيق واختيار اللغات بانسيابية وسرعة',
      'تحديث استقرار المحطة ومزامنة الفلك المباشر'
    ],
    btnUpdate: 'تحديث اللعبة الآن وإعادة التشغيل 🚀',
    updating: 'جاري تثبيت التحديث وتحديث الذاكرة المؤقتة... ⚡',
    tip: 'سيتم إعادة تشغيل اللعبة فوراً بأحدث إصدار.'
  },
  en: {
    title: 'New Station Update Available! 🚀',
    badge: 'New Release',
    sub: 'A mandatory galactic update is ready with comprehensive multi-language support and stability fixes.',
    reqNotice: '⚠️ Mandatory Update: You must update the station now to enter and participate in missions.',
    features: [
      'Complete, fluent translations across German, French, Spanish, Arabic & English',
      'Refined, compact language selector without excessive spacing',
      'Enhanced network stability & realtime synchronization'
    ],
    btnUpdate: 'Update & Restart Station 🚀',
    updating: 'Installing update & flushing orbital cache... ⚡',
    tip: 'The station will automatically restart into the latest release.'
  },
  de: {
    title: 'Neues Stations-Update Verfügbar! 🚀',
    badge: 'Neue Version',
    sub: 'Ein neues galaktisches Update steht bereit mit vollständiger deutscher Übersetzung und Systemoptimierungen.',
    reqNotice: '⚠️ Pflicht-Update: Du musst die Station jetzt aktualisieren, um beizutreten und Missionen zu starten.',
    features: [
      '100% vollständige deutsche Sprachunterstützung in allen Menüs und Funkprotokollen',
      'Kompakter, schlanker Sprachwechsler ohne unnötige Abstände',
      'Verbesserte Netzwerkstabilität & Echtzeit-Synchronisation'
    ],
    btnUpdate: 'Station Jetzt Aktualisieren & Neustarten 🚀',
    updating: 'Update wird installiert & Cache bereinigt... ⚡',
    tip: 'Die Station startet sofort mit der neuesten Version neu.'
  },
  fr: {
    title: 'Nouvelle Mise à Jour Disponible ! 🚀',
    badge: 'Nouvelle Version',
    sub: 'Une mise à jour galactique obligatoire est prête avec prise en charge intégrale du français et correctifs.',
    reqNotice: '⚠️ Mise à jour obligatoire : vous devez mettre à jour la station maintenant pour entrer.',
    features: [
      'Traduction française complète de tous les onglets, menus et journaux de bord',
      'Sélecteur de langue compact et épuré sans espaces superflus',
      'Stabilité réseau améliorée & synchronisation en temps réel'
    ],
    btnUpdate: 'Mettre à Jour & Redémarrer la Station 🚀',
    updating: 'Installation de la mise à jour & purge du cache... ⚡',
    tip: 'La station redémarrera automatiquement avec la dernière version.'
  },
  es: {
    title: '¡Nueva Actualización de la Estación! 🚀',
    badge: 'Nueva Versión',
    sub: 'Una actualización obligatoria está lista con soporte multilingüe completo y mejoras de estabilidad.',
    reqNotice: '⚠️ Actualización obligatoria: debes actualizar la estación ahora para ingresar y jugar.',
    features: [
      'Traducciones completas y pulidas en todos los idiomas',
      'Selector de idioma compacto y elegante sin espacios vacíos',
      'Mayor estabilidad de red y sincronización en tiempo real'
    ],
    btnUpdate: 'Actualizar y Reiniciar la Estación 🚀',
    updating: 'Instalando actualización y limpiando caché... ⚡',
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-[32px] bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-sky-400/50 shadow-[0_0_60px_rgba(56,189,248,0.25)] p-6 sm:p-7 text-center overflow-hidden">
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

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
          {strings.sub}
        </p>

        {/* Mandatory warning notice box */}
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-bold mb-4 text-start flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{strings.reqNotice}</span>
        </div>

        {/* Highlights List */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-start space-y-2 mb-5">
          {strings.features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
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
