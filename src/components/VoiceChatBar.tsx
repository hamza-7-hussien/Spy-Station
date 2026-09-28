import React from 'react';
import { dictionary } from '../translations';
import { Language, VoiceUserState } from '../types';
import { Mic, MicOff, PhoneOff, Radio, Volume2, Headphones, VolumeX } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  isJoined: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isSpeaking: boolean;
  voiceUsers: Record<string, VoiceUserState>;
  currentUserUid: string;
  onJoinVoice: () => void;
  onLeaveVoice: () => void;
  onToggleMute: () => void;
  onToggleDeafen?: () => void;
  compact?: boolean;
}

export const VoiceChatBar: React.FC<Props> = ({
  lang,
  isJoined,
  isMuted,
  isDeafened = false,
  isSpeaking,
  voiceUsers,
  currentUserUid,
  onJoinVoice,
  onLeaveVoice,
  onToggleMute,
  onToggleDeafen = () => {},
  compact = false
}) => {
  const t = dictionary[lang];
  const activeVoiceList = Object.values(voiceUsers || {}).filter(u => u.active);
  const activeCount = activeVoiceList.length;

  // Find who is currently speaking among others
  const currentRemoteSpeaker = activeVoiceList.find(u => u.speaking && u.uid !== currentUserUid);

  if (!isJoined) {
    return (
      <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-sky-500/20 backdrop-blur-md shadow-md gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="text-start min-w-0">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
              <span>{t.voiceChat}</span>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono">
                  {activeCount} {lang === 'ar' ? 'متصل' : 'online'}
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 break-words">
              {lang === 'ar' ? 'تحدث واستمع لرواد الفضاء مباشرة' : 'Talk with astronauts in real-time'}
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onJoinVoice();
          }}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer shrink-0"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{t.joinVoice}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-lg backdrop-blur-md ${
        isSpeaking
          ? 'bg-emerald-950/70 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
          : 'bg-slate-900/90 border-sky-400/40'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`p-2 rounded-xl border transition-all shrink-0 ${
            isSpeaking
              ? 'bg-emerald-400 text-slate-950 border-emerald-300 animate-pulse'
              : isMuted
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
              : 'bg-sky-500/20 border-sky-400/40 text-sky-300'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </div>

        <div className="text-start min-w-0">
          <div className="text-xs font-black text-white flex items-center gap-2 flex-wrap">
            <span>{isMuted ? (lang === 'ar' ? 'المايك مكتوم' : 'Mic Muted') : (lang === 'ar' ? 'المايك شغال' : 'Mic Live')}</span>
            {isDeafened && (
              <span className="text-rose-400 text-[10px] font-bold">
                ({lang === 'ar' ? 'السماعة مقفولة' : 'Audio Deafened'})
              </span>
            )}
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          </div>

          <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 break-words">
            {currentRemoteSpeaker ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-emerald-400 animate-bounce" />
                <span>{currentRemoteSpeaker.name} {t.speakingNow}</span>
              </span>
            ) : isSpeaking ? (
              <span className="text-emerald-300 font-bold">
                {lang === 'ar' ? 'صوتك مسموع الآن 🎙️' : 'Your voice is live 🎙️'}
              </span>
            ) : (
              <span>{activeCount} {lang === 'ar' ? 'رواد متصلين بالصوت' : 'astronauts in voice'}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Toggle Mic Button */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleMute();
          }}
          className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-sm ${
            isMuted
              ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50'
              : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50'
          }`}
          title={isMuted ? (lang === 'ar' ? 'إلغاء كتم المايك' : 'Unmute Mic') : (lang === 'ar' ? 'كتم المايك' : 'Mute Mic')}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {isMuted ? (lang === 'ar' ? 'فتح المايك' : 'Unmute') : (lang === 'ar' ? 'كتم المايك' : 'Mute')}
          </span>
        </button>

        {/* Toggle Headphone/Audio Button */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleDeafen();
          }}
          className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-sm ${
            isDeafened
              ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50'
              : 'bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/50'
          }`}
          title={isDeafened ? (lang === 'ar' ? 'تشغيل السماعة' : 'Unmute Audio') : (lang === 'ar' ? 'قفل السماعة' : 'Deafen Audio')}
        >
          {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {isDeafened ? (lang === 'ar' ? 'فتح السماعة' : 'Hear Audio') : (lang === 'ar' ? 'قفل السماعة' : 'Deafen')}
          </span>
        </button>

        {/* Leave Voice Button */}
        <button
          onClick={() => {
            sound.playClick();
            onLeaveVoice();
          }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600/30 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          title={t.leaveVoice}
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
