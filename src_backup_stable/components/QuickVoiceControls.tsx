import React from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
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
  compact?: boolean;
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
  compact = false,
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

  // Compact mode uses fixed dimensions so buttons never resize or wrap
  const isIconOnly = compact || size === 'sm';
  const btnClasses = isIconOnly
    ? 'w-8 h-8 rounded-xl p-0 flex items-center justify-center shrink-0'
    : 'px-2.5 py-1.5 text-xs rounded-2xl flex items-center justify-center gap-1.5 shrink-0';

  return (
    <div className={`flex items-center gap-1.5 select-none shrink-0 ${className}`}>
      {/* 🎙️ VOICE CHAT MICROPHONE BUTTON */}
      <button
        type="button"
        onClick={handleMicClick}
        title={
          !isJoined
            ? (lang === 'ar' ? 'تشغيل المايك (المحادثة الصوتية)' : 'Turn on Mic (Voice Chat)')
            : isMuted
            ? (lang === 'ar' ? 'المايك مكتوم - اضغط لفتحه' : 'Mic Muted - Tap to unmute')
            : (lang === 'ar' ? 'المايك شغال - اضغط لكتمه' : 'Mic Live - Tap to mute')
        }
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold ${btnClasses} ${
          isMicLive
            ? 'bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]'
            : isJoined && isMuted
            ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-500/50'
            : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40'
        }`}
      >
        {isMicLive ? (
          <>
            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-slate-950' : 'text-slate-950'}`} />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
                {lang === 'ar' ? 'المايك' : 'Mic'}
              </span>
            )}
          </>
        ) : isJoined && isMuted ? (
          <>
            <MicOff className="w-3.5 h-3.5 text-amber-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
                {lang === 'ar' ? 'مكتوم' : 'Muted'}
              </span>
            )}
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
                {lang === 'ar' ? 'المايك' : 'Mic'}
              </span>
            )}
          </>
        )}
      </button>

      {/* 🎧 VOICE CHAT HEADPHONES (DEAFEN/UNDEAFEN) BUTTON */}
      <button
        type="button"
        onClick={handleHeadphoneClick}
        title={
          !isJoined
            ? (lang === 'ar' ? 'تشغيل سماعة المحادثة الصوتية للاستماع' : 'Turn on Voice Audio')
            : isDeafened
            ? (lang === 'ar' ? 'سماعة المحادثة مقفولة - اضغط للاستماع للاعبين' : 'Voice Audio Muted - Tap to hear players')
            : (lang === 'ar' ? 'سماعة المحادثة شغالة - اضغط لكتم صوت اللاعبين' : 'Voice Audio Live - Tap to mute players')
        }
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold ${btnClasses} ${
          isAudioLive
            ? 'bg-cyan-400 text-slate-950 border-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
            : isJoined && isDeafened
            ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/60'
            : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
        }`}
      >
        {isAudioLive ? (
          <>
            <Headphones className="w-3.5 h-3.5 text-slate-950" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
                {lang === 'ar' ? 'السماعة' : 'Audio'}
              </span>
            )}
          </>
        ) : isJoined && isDeafened ? (
          <>
            <HeadphoneOff className="w-3.5 h-3.5 text-rose-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} text-rose-300`}>
                {lang === 'ar' ? 'صوت مقفول' : 'Deafened'}
              </span>
            )}
          </>
        ) : (
          <>
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''}`}>
                {lang === 'ar' ? 'السماعة' : 'Audio'}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
