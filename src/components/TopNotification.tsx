import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

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
      ? 'bg-rose-950/95 border-rose-500/60 text-rose-100'
      : toast.type === 'success'
      ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100'
      : 'bg-[#111827]/95 border-slate-700 text-slate-100';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] max-w-sm pointer-events-none transition-all duration-200 animate-in fade-in slide-in-from-top-2">
      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border backdrop-blur-md font-semibold text-xs text-center shadow-lg ${bgBorder}`}>
        {toast.type === 'danger' ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        ) : toast.type === 'success' ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        )}
        <span className="truncate max-w-[280px]">{toast.message}</span>
      </div>
    </div>
  );
};
