import React from 'react';
import { AlertCircle, CheckCircle2, Satellite } from 'lucide-react';

interface Props {
  toast: {
    message: string;
    type: 'normal' | 'danger' | 'success';
  } | null;
}

export const TopNotification: React.FC<Props> = ({ toast }) => {
  if (!toast) return null;

  const bgBorder =
    toast.type === 'danger'
      ? 'bg-rose-950/95 border-rose-500/80 text-rose-100 shadow-[0_4px_20px_rgba(244,63,94,0.35)]'
      : toast.type === 'success'
      ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100 shadow-[0_4px_20px_rgba(16,185,129,0.35)]'
      : 'bg-slate-900/95 border-sky-400/80 text-sky-100 shadow-[0_4px_20px_rgba(56,189,248,0.35)]';

  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[9999] max-w-sm pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border backdrop-blur-xl font-bold text-[11px] text-center shadow-md ${bgBorder}`}>
        {toast.type === 'danger' ? (
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
        ) : toast.type === 'success' ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
        ) : (
          <Satellite className="w-3 h-3 text-sky-400 shrink-0 animate-pulse" />
        )}
        <span className="truncate max-w-[280px]">{toast.message}</span>
      </div>
    </div>
  );
};
