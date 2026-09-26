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
      ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-[0_10px_35px_rgba(244,63,94,0.45)]'
      : toast.type === 'success'
      ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-[0_10px_35px_rgba(16,185,129,0.45)]'
      : 'bg-slate-900/90 border-sky-400/80 text-sky-100 shadow-[0_10px_35px_rgba(56,189,248,0.45)]';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-[92vw] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl font-bold text-sm text-center ${bgBorder}`}>
        {toast.type === 'danger' ? (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
        ) : toast.type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <Satellite className="w-5 h-5 text-sky-400 shrink-0 animate-pulse" />
        )}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
