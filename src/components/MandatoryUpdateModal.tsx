import React, { useState } from 'react';
import { Language } from '../types';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';

interface Props {
  lang: Language;
  targetVersion: string;
  onUpdateCompleted: () => void;
}

const UPDATE_STRINGS = {
  ar: {
    title: 'يتوفر تحديث جديد للتطبيق',
    badge: 'إصدار جديد',
    sub: 'تم إصدار نسخة محدثة تتضمن تحسينات على اللعب والاستقرار.',
    reqNotice: 'اضغط على الزر أدناه لتثبيت التحديث وإعادة التشغيل.',
    btnUpdate: 'تحديث الآن وإعادة التشغيل',
    updating: 'جاري التحديث...',
    tip: 'سيتم إعادة تحميل التطبيق فوراً بأحدث إصدار.'
  },
  en: {
    title: 'New App Update Available',
    badge: 'New Version',
    sub: 'A newer version with gameplay and stability fixes is ready.',
    reqNotice: 'Tap below to install the update and reload.',
    btnUpdate: 'Update & Reload',
    updating: 'Updating...',
    tip: 'The app will reload immediately with the latest release.'
  },
  de: {
    title: 'Neues App-Update verfügbar',
    badge: 'Neue Version',
    sub: 'Eine neue Version mit Verbesserungen ist bereit.',
    reqNotice: 'Tippe unten, um das Update zu installieren.',
    btnUpdate: 'Aktualisieren & Neu laden',
    updating: 'Wird aktualisiert...',
    tip: 'Die App wird sofort neu geladen.'
  },
  fr: {
    title: 'Nouvelle mise à jour disponible',
    badge: 'Nouvelle Version',
    sub: 'Une version mise à jour est prête.',
    reqNotice: 'Appuyez ci-dessous pour installer et recharger.',
    btnUpdate: 'Mettre à jour',
    updating: 'Mise à jour...',
    tip: 'L’application sera rechargée immédiatement.'
  },
  es: {
    title: 'Nueva actualización disponible',
    badge: 'Nueva Versión',
    sub: 'Hay una nueva versión lista para instalar.',
    reqNotice: 'Pulsa abajo para instalar y recargar.',
    btnUpdate: 'Actualizar ahora',
    updating: 'Actualizando...',
    tip: 'La aplicación se recargará de inmediato.'
  }
};

export const MandatoryUpdateModal: React.FC<Props> = ({
  lang,
  targetVersion,
  onUpdateCompleted
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const strings = UPDATE_STRINGS[lang] || UPDATE_STRINGS.en;

  useBodyScrollLock(true);

  const handleApplyUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    sound.triggerHaptic('heavy');

    try {
      if ('caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(key => caches.delete(key)));
        } catch {
          // ignore
        }
      }

      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.update().catch(() => {});
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch {
          // ignore
        }
      }

      localStorage.setItem('spy_station_installed_version', targetVersion);
      localStorage.setItem('spy_station_last_update_ts', Date.now().toString());

      setTimeout(() => {
        onUpdateCompleted();
        window.location.reload();
      }, 600);
    } catch {
      localStorage.setItem('spy_station_installed_version', targetVersion);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 select-none overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl p-6 text-center overflow-hidden overscroll-contain"
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <ArrowUpCircle className="w-7 h-7" />
        </div>

        <div className="text-xs font-mono font-bold text-sky-400 mb-2">
          {strings.badge} v{targetVersion}
        </div>

        <h2 className="text-xl font-black font-heading text-white mb-2">
          {strings.title}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
          {strings.sub}
        </p>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium mb-5">
          {strings.reqNotice}
        </div>

        <button
          type="button"
          onClick={handleApplyUpdate}
          disabled={isUpdating}
          className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>{strings.updating}</span>
            </>
          ) : (
            <span>{strings.btnUpdate}</span>
          )}
        </button>

        <p className="text-[11px] text-slate-500 mt-3">
          {strings.tip}
        </p>
      </div>
    </div>
  );
};
