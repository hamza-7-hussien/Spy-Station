import React from 'react';
import { QuickVoiceControls } from './QuickVoiceControls';
import { Language } from '../types';

interface Props {
  lang: Language;
  isJoined: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
  onJoinVoice: () => void;
  onToggleVoiceMute: () => void;
  onToggleVoiceDeafen?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const QuickMicButton: React.FC<Props> = ({
  lang,
  isJoined,
  isMuted,
  isDeafened = false,
  isSpeaking = false,
  onJoinVoice,
  onToggleVoiceMute,
  onToggleVoiceDeafen = () => {},
  className = '',
  size = 'md'
}) => {
  return (
    <QuickVoiceControls
      lang={lang}
      isJoined={isJoined}
      isMuted={isMuted}
      isDeafened={isDeafened}
      isSpeaking={isSpeaking}
      onJoinVoice={onJoinVoice}
      onToggleVoiceMute={onToggleVoiceMute}
      onToggleVoiceDeafen={onToggleVoiceDeafen}
      className={className}
      size={size}
    />
  );
};
