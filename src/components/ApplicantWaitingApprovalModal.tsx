import React from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { Globe, X, Clock } from 'lucide-react';

interface Props {
  lang: Language;
  roomCode: string;
  hostName: string;
  queuePosition?: number;
  onCancel: () => void;
}

export const ApplicantWaitingApprovalModal: React.FC<Props> = ({
  lang,
  roomCode,
  hostName,
  queuePosition = 1,
  onCancel
}) => {
  const t = dictionary[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/40 p-6 text-center space-y-5 shadow-[0_0_40px_rgba(56,189,248,0.25)] animate-in zoom-in-95">
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
          <Globe className="w-8 h-8 text-sky-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-white font-heading">
            {t.joinRequestPending}
          </h3>
          
          {queuePosition > 1 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? `أنت في قائمة الانتظار (دورك رقم ${queuePosition})`
                  : `You are #${queuePosition} in waiting line`}
              </span>
            </div>
          )}

          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? `تم إرسال طلب الانضمام للمحطة ${roomCode}. قائد المحطة (${hostName}) يراجع الطلبات واحداً تلو الآخر بالترتيب.`
              : `Join request sent to station ${roomCode}. Station commander (${hostName}) reviews requests one by one.`}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>{t.btnCancelRequest}</span>
        </button>
      </div>
    </div>
  );
};
