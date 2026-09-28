import React from 'react';
import { Mic, MicOff, Headphones, VolumeX } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';

interface Props {
  lang: Language;
  isJoined: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  onJoinVoice: () => void;
  onToggleVoiceMute: () => void;
  onToggleVoiceDeafen: () => void;
  className?: string;
  size?: 'sm' | 'md';
  hideLabelsOnMobile?: boolean;
}

export const QuickVoiceControls: React.FC<Props> = ({
  lang,
  isJoined,
  isMuted,
  isDeafened = false,
  isSpeaking = false,
  onJoinVoice,
  onToggleVoiceMute,
  onToggleVoiceDeafen,
  className = '',
  size = 'md',
  hideLabelsOnMobile = true
}) => {
  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    sound.triggerHaptic('medium');
    if (!isJoined) {
      onJoinVoice();
    } else {
      onToggleVoiceMute();
    }
  };

  const handleHeadphoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    sound.triggerHaptic('medium');
    if (!isJoined) {
      onJoinVoice();
    } else {
      onToggleVoiceDeafen();
    }
  };

  const isMicLive = isJoined && !isMuted;
  const isAudioLive = isJoined && !isDeafened;

  const btnPadding = size === 'sm' ? 'px-2 py-1 text-xs rounded-xl' : 'px-2.5 py-1.5 text-xs rounded-2xl';

  return (
    <div className={`flex items-center gap-1.5 select-none ${className}`}>
      {/* 🎙️ MICROPHONE BUTTON */}
      <button
        type="button"
        onClick={handleMicClick}
        title={
          !isJoined
            ? (lang === 'ar' ? 'تشغيل المايك (اضغط للتحدث)' : 'Turn on Mic (Tap to speak)')
            : isMuted
            ? (lang === 'ar' ? 'المايك مكتوم - اضغط لفتحه' : 'Mic Muted - Tap to unmute')
            : (lang === 'ar' ? 'المايك شغال - اضغط لكتمه' : 'Mic Live - Tap to mute')
        }
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold flex items-center justify-center gap-1 shrink-0 ${btnPadding} ${
          isMicLive
            ? 'bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
            : isJoined && isMuted
            ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/50'
            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/50'
        }`}
      >
        {isMicLive ? (
          <>
            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-slate-950' : 'text-slate-950'}`} />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
              {lang === 'ar' ? 'المايك' : 'Mic'}
            </span>
          </>
        ) : isJoined && isMuted ? (
          <>
            <MicOff className="w-3.5 h-3.5 text-amber-400" />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
              {lang === 'ar' ? 'مكتوم' : 'Muted'}
            </span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
              {lang === 'ar' ? 'المايك' : 'Mic'}
            </span>
          </>
        )}
      </button>

      {/* 🎧 HEADPHONE / SPEAKER BUTTON */}
      <button
        type="button"
        onClick={handleHeadphoneClick}
        title={
          !isJoined
            ? (lang === 'ar' ? 'تشغيل الصوت للاستماع' : 'Turn on Audio')
            : isDeafened
            ? (lang === 'ar' ? 'السماعة مقفولة - اضغط للاستماع' : 'Audio Muted - Tap to hear')
            : (lang === 'ar' ? 'السماعة شغالة - اضغط لكتم الصوت' : 'Audio Live - Tap to mute')
        }
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold flex items-center justify-center gap-1 shrink-0 ${btnPadding} ${
          isAudioLive
            ? 'bg-cyan-500 text-slate-950 border-2 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
            : isJoined && isDeafened
            ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/60'
            : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/50'
        }`}
      >
        {isAudioLive ? (
          <>
            <Headphones className="w-3.5 h-3.5 text-slate-950" />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
              {lang === 'ar' ? 'السماعة' : 'Audio'}
            </span>
          </>
        ) : isJoined && isDeafened ? (
          <>
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} text-rose-300`}>
              {lang === 'ar' ? 'صوت مقفول' : 'Deafened'}
            </span>
          </>
        ) : (
          <>
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
            <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
              {lang === 'ar' ? 'السماعة' : 'Audio'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
