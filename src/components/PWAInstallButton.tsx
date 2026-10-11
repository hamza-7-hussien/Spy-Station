import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Download, Smartphone, X } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  variant?: 'prominent' | 'compact' | 'pill';
  className?: string;
}

export const PWAInstallButton: React.FC<Props> = ({ lang, variant = 'prominent', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const t = dictionary[lang];

  if (isInstalled) {
    if (variant === 'pill') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          {t.appInstalledBadge}
        </span>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    sound.playTone(480, 'triangle', 0.1);
    sound.triggerHaptic('medium');
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      {variant === 'prominent' ? (
        <button
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>{t.installAppBtn}</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-400/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 text-xs font-bold transition cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{t.installAppBtn}</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 shadow-2xl relative text-start">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 inset-inline-end-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-sky-500/30">
              <Smartphone className="w-6 h-6 text-slate-950" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">{t.iosInstallTitle}</h3>
            
            <div className="space-y-3 my-4 text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <p>{t.iosInstallStep1}</p>
              <p>{t.iosInstallStep2}</p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
            >
              {t.iosInstallClose}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
