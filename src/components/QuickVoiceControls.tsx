import React from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff } from 'lucide-react';
import { sound } from '../audio';
import { Language } from '../types';
import { dictionary } from '../translations';

interface Props {
  lang: Language;
  isJoined: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  onJoinVoice: (startMuted?: boolean) => void;
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
  const t = dictionary[lang];

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    sound.triggerHaptic('medium');
    if (!isJoined) {
      onJoinVoice(false);
    } else {
      onToggleVoiceMute();
    }
  };

  const handleHeadphoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    sound.triggerHaptic('medium');
    if (!isJoined) {
      onJoinVoice(true);
    } else {
      onToggleVoiceDeafen();
    }
  };

  const isMicLive = isJoined && !isMuted;
  const isAudioLive = !isDeafened;

  const isIconOnly = compact || size === 'sm';
  const btnClasses = isIconOnly
    ? 'w-8 h-8 rounded-xl p-0 flex items-center justify-center shrink-0'
    : 'px-2.5 py-1.5 text-xs rounded-2xl flex items-center justify-center gap-1.5 shrink-0';

  return (
    <div className={`flex items-center gap-1.5 select-none shrink-0 ${className}`}>
      {/* Microphone Button: OFF (muted) by default, turns ON when tapped */}
      <button
        type="button"
        onClick={handleMicClick}
        title={isMicLive ? t.muteMicTooltip : t.unmuteMicTooltip}
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold ${btnClasses} ${
          isMicLive
            ? 'bg-emerald-400 text-slate-950 border-2 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
            : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-600'
        }`}
      >
        {isMicLive ? (
          <>
            <Mic className={`w-3.5 h-3.5 text-slate-950 ${isSpeaking ? 'animate-bounce' : ''}`} />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
                {t.micLive}
              </span>
            )}
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5 text-rose-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} text-slate-300`}>
                {t.micMuted}
              </span>
            )}
          </>
        )}
      </button>

      {/* Headphones Button: ON (listening) by default, toggles deafened state when tapped */}
      <button
        type="button"
        onClick={handleHeadphoneClick}
        title={isAudioLive ? t.deafenTooltip : t.hearAudioTooltip}
        className={`transition-all duration-200 active:scale-95 cursor-pointer font-bold ${btnClasses} ${
          isAudioLive
            ? 'bg-cyan-400 text-slate-950 border-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.55)]'
            : 'bg-rose-950/70 hover:bg-rose-900/70 text-rose-300 border border-rose-500/60'
        }`}
      >
        {isAudioLive ? (
          <>
            <Headphones className="w-3.5 h-3.5 text-slate-950" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} font-black text-slate-950`}>
                {t.audioLive}
              </span>
            )}
          </>
        ) : (
          <>
            <HeadphoneOff className="w-3.5 h-3.5 text-rose-400" />
            {!isIconOnly && (
              <span className={`${hideLabelsOnMobile ? 'hidden sm:inline' : ''} text-rose-300`}>
                {t.audioDeafened}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
