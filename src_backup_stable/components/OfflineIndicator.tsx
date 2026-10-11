import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { dictionary } from '../translations';
import { Language } from '../types';
import { WifiOff } from 'lucide-react';

interface Props {
  lang: Language;
}

export const OfflineIndicator: React.FC<Props> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600/90 text-white text-xs font-bold shadow-xl backdrop-blur-md border border-rose-400/40 animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>{dictionary[lang].offlineNotice}</span>
    </div>
  );
};
