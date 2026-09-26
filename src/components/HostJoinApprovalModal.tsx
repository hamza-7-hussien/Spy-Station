import React from 'react';
import { dictionary } from '../translations';
import { Language, JoinRequest } from '../types';
import { Globe, Check, X, Users } from 'lucide-react';

interface Props {
  lang: Language;
  request: JoinRequest;
  queueIndex?: number;
  queueTotal?: number;
  onAccept: (uid: string) => void;
  onDecline: (uid: string) => void;
}

export const HostJoinApprovalModal: React.FC<Props> = ({
  lang,
  request,
  queueIndex = 1,
  queueTotal = 1,
  onAccept,
  onDecline
}) => {
  const t = dictionary[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-sky-400 p-6 text-center space-y-4 shadow-[0_0_40px_rgba(56,189,248,0.3)] animate-in zoom-in-95">
        {/* Header / Queue status */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 uppercase tracking-widest">
            <Globe className="w-4 h-4 animate-pulse" />
            <span>{t.joinRequestTitle}</span>
          </div>
          {queueTotal > 1 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[11px] font-bold">
              <Users className="w-3 h-3" />
              <span>{lang === 'ar' ? `${queueIndex} من ${queueTotal}` : `${queueIndex} of ${queueTotal}`}</span>
            </span>
          )}
        </div>

        <div className="relative inline-block">
          <img
            src={request.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${request.uid}`}
            alt={request.name}
            className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]"
          />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center font-bold text-xs">
            🛰️
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black text-white font-heading">{request.name}</h3>
          <p className="text-xs text-slate-400">
            {lang === 'ar'
              ? `يطلب الانضمام للمحطة (${queueTotal > 1 ? `يوجد ${queueTotal} طلبات بالانتظار بالترتيب` : 'طلب انضمام جديد'})`
              : t.joinRequestPrompt}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => onAccept(request.uid)}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{t.btnAccept}</span>
          </button>

          <button
            onClick={() => onDecline(request.uid)}
            className="py-3 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>{t.btnDecline}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
