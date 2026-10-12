import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { dictionary } from '../translations';
import { Language } from '../types';
import { WifiOff, X } from 'lucide-react';

interface Props {
  lang: Language;
}

export const OfflineIndicator: React.FC<Props> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const t = dictionary[lang];

  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-slate-200 text-[11px] font-bold shadow-lg backdrop-blur-md border border-amber-400/50 animate-in fade-in slide-in-from-top-2 duration-200 select-none">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-amber-200">{t.offlineNotice || 'وضع عدم الاتصال 📡'}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-slate-400 hover:text-white p-0.5 rounded-full cursor-pointer ml-1"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
