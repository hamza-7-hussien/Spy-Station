import React, { useState, useRef, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData } from '../types';
import { sound } from '../audio';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { getSecretWordDisplay } from '../words';
import { CATEGORY_STYLES } from '../wordVisuals';
import { CluesHistoryModal } from '../components/CluesHistoryModal';
import { QuickVoiceControls } from '../components/QuickVoiceControls';
import { VoiceUserState } from '../types';
import {
  Clock,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  AlertTriangle,
  Eye,
  Send,
  Shield,
  Brush,
  Trash2,
  Check,
  LogOut,
  Volume2,
  VolumeX,
  Radar,
  Sparkles,
  VolumeX as MuteIcon,
  RotateCw,
  Lock,
  MessageSquare
} from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  isVoiceJoined?: boolean;
  isVoiceMuted?: boolean;
  isVoiceDeafened?: boolean;
  isVoiceSpeaking?: boolean;
  voiceUsers?: Record<string, VoiceUserState>;
  onJoinVoice?: () => void;
  onLeaveVoice?: () => void;
  onToggleVoiceMute?: () => void;
  onToggleVoiceDeafen?: () => void;
  onAdvanceTurn: () => void;
  onTriggerEmergencyVote: () => void;
  onSendGameClue: (word: string, targetRound: number, targetTurnIndex: number) => void;
  onSendSpyChat: (msg: string) => void;
  onAwardCrewXP?: (players: Record<string, PlayerData>, spies: string[]) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
  onLeaveRoom?: () => void;
}

export const GameScreen: React.FC<Props> = ({
  lang,
  currentUserUid,
  roomCode,
  room,
  isVoiceJoined = false,
  isVoiceMuted = false,
  isVoiceDeafened = false,
  isVoiceSpeaking = false,
  voiceUsers = {},
  onJoinVoice = () => {},
  onLeaveVoice = () => {},
  onToggleVoiceMute = () => {},
  onToggleVoiceDeafen = () => {},
  onAdvanceTurn,
  onTriggerEmergencyVote,
  onSendGameClue,
  onSendSpyChat,
  onAwardCrewXP,
  onToast,
  onLeaveRoom
}) => {
  const [clueInput, setClueInput] = useState('');
  const [spyInput, setSpyInput] = useState('');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, { text: string; timestamp: number }>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPulseSecondRef = useRef<number>(-1);

  const t = dictionary[lang];
  const playersObj = room.players || {};
  const myPlayer = playersObj[currentUserUid] || ({} as PlayerData);
  const amSpectator = !!myPlayer.isSpectator;
  const isSpy = (room.spies || []).includes(currentUserUid);

  // Chameleon mode decoy word or regular word display using strict bilingual rules
  const isChameleonSpy = isSpy && room.gameMode === 'chameleon';
  const displayWord = isChameleonSpy
    ? getSecretWordDisplay(myPlayer.chameleonWord, myPlayer.chameleonWordAr, room.wordCategory, lang)
    : getSecretWordDisplay(room.word, room.wordAr, room.wordCategory, lang);

  const turnOrder = room.turnOrder || [];
  const turnIndex = room.turnIndex || 0;
  const currentTurnUid = turnOrder[turnIndex];
  const currentSpeaker = playersObj[currentTurnUid]?.name || '...';
  const isMyTurn = !amSpectator && currentTurnUid === currentUserUid;

  const currentRound = room.round || 1;
  const timeLeft = room.turnTimeLeft != null ? room.turnTimeLeft : room.turnSeconds || 20;

  // Undercover Agent role info
  const isUndercover = room.gameMode === 'undercover' && room.undercoverUid === currentUserUid;
  const firstSpyUid = (room.spies || [])[0];
  const spyNameForUndercover = firstSpyUid ? playersObj[firstSpyUid]?.name || 'Unknown' : 'Unknown';

  // Spectator count
  const spectatorCount = Object.values(playersObj).filter(p => p.isSpectator).length;

  // Clues list
  const cluesList = Object.values(room.gameChat || {});

  // Listen to speech bubbles
  useEffect(() => {
    const bubblesRef = db.ref(`spy_rooms/${roomCode}/speechBubbles`);
    const onBubbles = (snap: firebase.database.DataSnapshot) => {
      const val = snap.val() || {};
      setSpeechBubbles(val);
    };
    bubblesRef.on('value', onBubbles);
    return () => {
      bubblesRef.off('value', onBubbles);
    };
  }, [roomCode]);

  // Audio timer pulse
  useEffect(() => {
    if (timeLeft !== lastPulseSecondRef.current) {
      lastPulseSecondRef.current = timeLeft;
      if (timeLeft <= 5 && timeLeft > 0) {
        sound.playTimerPulse(true);
      } else if (timeLeft > 5 && timeLeft % 4 === 0) {
        sound.playTimerPulse(false);
      }
    }
  }, [timeLeft]);

  // Silent drawing synchronization
  useEffect(() => {
    if (room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokes = room.currentDrawing || [];
    strokes.forEach(stroke => {
      if (!stroke || stroke.length === 0) return;
      ctx.beginPath();
      stroke.forEach((pt, i) => {
        const x = pt.x * w;
        const y = pt.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, [room.currentDrawing, room.gameMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setIsDrawing(true);
    const existing = room.currentDrawing || [];
    const newStroke = [{ x, y }];
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set([...existing, newStroke]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMyTurn || room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const existing = [...(room.currentDrawing || [])];
    if (existing.length > 0) {
      const currentStroke = [...existing[existing.length - 1], { x, y }];
      existing[existing.length - 1] = currentStroke;
      db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(existing);
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!isMyTurn) return;
    sound.playClick();
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(null);
  };

  const finishDrawingTurn = () => {
    if (!isMyTurn) return;
    sound.playClick();
    onAdvanceTurn();
  };

  const sendSpeechBubble = async (text: string) => {
    sound.playBubblePop();
    sound.triggerHaptic('light');
    try {
      await db.ref(`spy_rooms/${roomCode}/speechBubbles/${currentUserUid}`).set({
        text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      setTimeout(() => {
        db.ref(`spy_rooms/${roomCode}/speechBubbles/${currentUserUid}`).remove().catch(() => {});
      }, 6000);
    } catch {
      // ignore
    }
  };

  // Reset clue input when turn passes or round changes
  useEffect(() => {
    if (!isMyTurn) {
      setClueInput('');
    }
  }, [isMyTurn, turnIndex, currentRound]);

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn) return;

    if (myPlayer.isSilenced) {
      return onToast(
        lang === 'ar' ? 'أنت خاضع لبروتوكول الصمت! استخدم الإيموجي فقط.' : 'You are silenced! Use emojis only.',
        'danger'
      );
    }

    const clean = clueInput.trim();
    if (!clean) return;

    if (/\s/.test(clean)) {
      return onToast(t.errOneWordOnly, 'danger');
    }

    const secretWordEn = (room.word || '').trim().toLowerCase();
    const secretWordAr = (room.wordAr || '').trim();
    if (
      (secretWordEn && clean.toLowerCase() === secretWordEn) ||
      (secretWordAr && clean === secretWordAr)
    ) {
      return onToast(t.errCannotTypeSecretWord, 'danger');
    }

    sendSpeechBubble(clean);
    onSendGameClue(clean, currentRound, turnIndex);
    setClueInput('');
  };

  const handleEmojiClue = (emoji: string) => {
    if (!isMyTurn) return;
    sendSpeechBubble(emoji);
    onSendGameClue(emoji, currentRound, turnIndex);
    if (myPlayer.isSilenced) {
      db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}/isSilenced`).set(false);
    }
  };

  const handleSpySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spyInput.trim()) {
      onSendSpyChat(spyInput.trim());
      setSpyInput('');
    }
  };

  // Active players list
  const activeUids = (turnOrder.length > 0 ? turnOrder : Object.keys(playersObj)).filter(
    uid => playersObj[uid] && !playersObj[uid].isSpectator
  );

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3.5 pb-24 pt-1 text-start select-none relative z-10">
      {/* ============================================================== */}
      {/* 🚀 TOP CLEAN STATUS BAR */}
      {/* ============================================================== */}
      <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-sky-500/25 backdrop-blur-xl shadow-lg gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
            <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
            <span className="font-heading font-black text-xs sm:text-sm text-white">
              {lang === 'ar' ? 'المحطة' : 'STATION'}
            </span>
            <span className="font-mono font-black text-xs sm:text-sm text-sky-400">
              #{roomCode}
            </span>
          </div>
          <span className="px-1.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 font-mono text-[10px] sm:text-[11px] shrink-0 font-bold whitespace-nowrap">
            {t.lblRound} {currentRound}
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Voice Controls (Microphone + Headphone side-by-side) */}
          <QuickVoiceControls
            lang={lang}
            isJoined={isVoiceJoined}
            isMuted={isVoiceMuted}
            isDeafened={isVoiceDeafened}
            isSpeaking={isVoiceSpeaking}
            onJoinVoice={onJoinVoice}
            onToggleVoiceMute={onToggleVoiceMute}
            onToggleVoiceDeafen={onToggleVoiceDeafen}
            size="sm"
            compact={true}
          />

          {/* Dedicated Chat History Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsHistoryOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-300 text-xs font-black transition cursor-pointer shadow-sm active:scale-95 shrink-0"
            title={t.btnChatHistory}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">{t.btnChatHistory}</span>
            {cluesList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-sky-400 text-slate-950 text-[10px] font-mono font-black">
                {cluesList.length}
              </span>
            )}
          </button>

          {/* Game Sound SFX Toggle (Completely Independent from Voice Chat) */}
          <button
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer shrink-0 ${
              isMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={
              isMuted
                ? (lang === 'ar' ? 'تشغيل مؤثرات صوت اللعبة (مستقل عن الفويس)' : 'Unmute Game SFX (Independent from voice)')
                : (lang === 'ar' ? 'كتم مؤثرات صوت اللعبة (مستقل عن الفويس)' : 'Mute Game SFX (Independent from voice)')
            }
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {spectatorCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] shrink-0">
              <Eye className="w-3 h-3 text-slate-400" />
              <span>{spectatorCount}</span>
            </span>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="p-1.5 sm:p-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition cursor-pointer shrink-0"
              title={t.btnLeaveStation}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Role Warnings (Undercover / Chameleon) */}
      {isUndercover && (
        <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 shadow-md text-xs text-cyan-200 flex items-center gap-2">
          <Radar className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <div>
            <span className="font-bold text-cyan-300">{lang === 'ar' ? 'العميل السري: ' : 'Undercover: '}</span>
            <span>{t.undercoverAlert.replace('{spyName}', spyNameForUndercover)}</span>
          </div>
        </div>
      )}

      {isChameleonSpy && (
        <div className="p-2.5 rounded-2xl bg-emerald-950/50 border border-emerald-400/50 text-xs text-emerald-200 flex items-center gap-2 shadow-md">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.chameleonDecoyHint}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎯 HERO TURN SPOTLIGHT & TIMER BANNER */}
      {/* ============================================================== */}
      <div
        className={`p-4 rounded-3xl border-2 transition-all flex items-center justify-between gap-3 shadow-xl ${
          isMyTurn
            ? 'bg-gradient-to-r from-sky-950/90 via-indigo-950/80 to-sky-950/90 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.3)] animate-pulse'
            : 'bg-slate-900/85 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isMyTurn
                ? 'bg-sky-400 text-slate-950 border-sky-300 font-black shadow-md'
                : 'bg-slate-800 text-sky-400 border-slate-700'
            }`}
          >
            <Mic className={`w-5 h-5 ${isMyTurn ? 'animate-bounce' : ''}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {lang === 'ar' ? 'الدور الحالي لإعطاء التلميح' : 'Current Speaking Turn'}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-white font-heading leading-tight break-words">
              {isMyTurn ? (
                <span className="text-sky-300 flex flex-wrap items-center gap-1">
                  <span>{lang === 'ar' ? '👉 دورك الآن! أعطِ تلميحك' : '👉 YOUR TURN! Give your clue'}</span>
                </span>
              ) : (
                <span className="break-words">{currentSpeaker}</span>
              )}
            </div>
          </div>
        </div>

        {/* Timer Ring / Box */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border font-mono font-black text-sm shrink-0 shadow-inner ${
            timeLeft <= 5
              ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-ping'
              : 'bg-slate-950 border-sky-500/30 text-sky-300'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-400" />
          <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🪪 COMPACT SECRET CLEARANCE CARD (Flip to reveal) */}
      {/* ============================================================== */}
      <div
        onClick={() => {
          sound.playClick();
          sound.triggerHaptic('medium');
          setIsCardFlipped(prev => !prev);
        }}
        className={`p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-lg select-none ${
          isCardFlipped
            ? isSpy && !isChameleonSpy
              ? 'bg-rose-950/70 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
              : 'bg-gradient-to-r from-sky-950/90 via-slate-900 to-indigo-950/90 border-sky-400/80 shadow-[0_0_25px_rgba(56,189,248,0.25)]'
            : 'bg-slate-950/80 border-slate-800 hover:border-sky-500/50'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'ar' ? 'بطاقة الهوية السرية' : 'Secret Clearance'}</span>
          </span>
          <span className="text-sky-400 flex items-center gap-1 text-[11px]">
            <RotateCw className="w-3 h-3" />
            <span>{isCardFlipped ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'كشف' : 'Tap to reveal')}</span>
          </span>
        </div>

        {isCardFlipped ? (
          amSpectator ? (
            <div className="py-2 text-xs font-bold text-slate-400 text-center">{t.lblSpectatorTag}</div>
          ) : isSpy && !isChameleonSpy ? (
            <div className="py-1 text-center animate-in zoom-in-95 duration-150">
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-heading tracking-wide">
                {t.youAreSpy} 🕵️
              </div>
              <p className="text-xs font-bold text-rose-300/80 mt-0.5">
                {lang === 'ar' ? 'اسمع تلميحات الرواد وخمن الكلمة دون أن تُكشف!' : 'Blend in and guess the secret word!'}
              </p>
              {room.gameMode === 'mole' && (room.spies || []).length > 1 && (
                <div className="mt-2 p-2 rounded-xl bg-purple-950/70 border border-purple-500/40 text-xs text-purple-200">
                  <span className="font-bold text-purple-300">{lang === 'ar' ? 'شركاؤك في شبكة الجواسيس: ' : 'Fellow Spies: '}</span>
                  <span>
                    {(room.spies || [])
                      .filter(sUid => sUid !== currentUserUid)
                      .map(sUid => playersObj[sUid]?.name || 'Agent')
                      .join('، ')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1.5 py-2 animate-in zoom-in-95 duration-150 text-center">
              {room.wordCategory && (
                <div className="text-xs font-bold text-sky-400 flex items-center justify-center gap-1.5">
                  <span>{CATEGORY_STYLES[room.wordCategory]?.icon}</span>
                  <span>
                    {lang === 'ar'
                      ? CATEGORY_STYLES[room.wordCategory]?.titleAr
                      : CATEGORY_STYLES[room.wordCategory]?.titleEn}
                  </span>
                </div>
              )}
              <div className="text-xl sm:text-3xl md:text-4xl font-black text-white font-heading tracking-wide break-words max-w-full text-center leading-tight">
                {displayWord || (lang === 'ar' ? 'كلمة سرية' : 'Secret Word')}
              </div>
              {isChameleonSpy && (
                <div className="mt-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-400/40 text-[11px] font-bold text-emerald-300">
                  {lang === 'ar'
                    ? '🦎 أنت الحرباء: هذه كلمتك التوأم المضللة، تكلم بثقة وحذر دون كشف نفسك!'
                    : '🦎 You are the Chameleon: This is your twin decoy word, blend in!'}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-sky-300">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>{lang === 'ar' ? 'اضغط هنا لكشف الكلمة السرية 👆' : 'Tap here to reveal your secret card 👆'}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 👥 ASTRONAUT CREW ROSTER (Clean, comfortable grid) */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/85 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span>{lang === 'ar' ? 'طاقم المحطة الفضائية 🛸' : 'Space Crew Roster 🛸'}</span>
          <span className="text-[11px] text-sky-400 font-mono">
            {activeUids.length} {lang === 'ar' ? 'رواد' : 'Astronauts'}
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
          {activeUids.map(uid => {
            const p = playersObj[uid];
            const isTurn = uid === currentTurnUid;
            const bubble = speechBubbles[uid];
            const isSilenced = !!p?.isSilenced;
            const isMe = uid === currentUserUid;
            const isBot = !!p?.isBot || uid.startsWith('bot_');

            const userVoice = voiceUsers?.[uid];
            const isVoiceSpeaking = !!userVoice?.speaking;
            const isUserMuted = userVoice ? !!userVoice.muted : true;
            const isUserDeafened = userVoice ? !!userVoice.deafened : false;
            const isFellowMoleSpy = isSpy && room.gameMode === 'mole' && (room.spies || []).includes(uid) && !isMe;

            return (
              <div
                key={uid}
                className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center justify-center text-center ${
                  isVoiceSpeaking
                    ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-105 z-20'
                    : isTurn
                    ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-105 z-20'
                    : isMe
                    ? 'bg-slate-950/80 border-sky-500/40'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                {/* Floating Speech Bubble Above Avatar */}
                {bubble && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in zoom-in-75 duration-200">
                    <div className="relative px-2.5 py-1 rounded-2xl bg-white text-slate-950 text-[11px] font-black shadow-xl border-2 border-sky-400 text-center max-w-[160px] break-words leading-tight">
                      {bubble.text}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r-2 border-b-2 border-sky-400" />
                    </div>
                  </div>
                )}

                {/* Avatar Portrait - Clean with NO mic badge overlay */}
                <div className="relative mb-1">
                  <img
                    src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                    alt={p?.name}
                    className={`w-12 h-12 rounded-full object-cover border-2 transition-all ${
                      isVoiceSpeaking
                        ? 'border-emerald-300 ring-4 ring-emerald-400 animate-pulse'
                        : isTurn
                        ? 'border-sky-300 ring-4 ring-sky-400/40'
                        : isMe
                        ? 'border-sky-400'
                        : 'border-slate-700'
                    }`}
                  />
                  {isSilenced && (
                    <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md">
                      <MuteIcon className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Player Name + Mole Badge */}
                <div className="flex items-center justify-center gap-1 max-w-[95px]">
                  <span className="text-[11px] font-bold text-white text-center truncate leading-tight">
                    {p?.name || 'Agent'}
                  </span>
                  {isFellowMoleSpy && (
                    <span title={lang === 'ar' ? 'شريكك في التجسس' : 'Fellow Spy'} className="text-[10px]">
                      🕵️
                    </span>
                  )}
                </div>

                {isMe && (
                  <span className="text-[9px] font-bold text-sky-400">
                    ({lang === 'ar' ? 'أنت' : 'You'})
                  </span>
                )}

                {/* Voice Status Pill: Mic & Headphone for all real players */}
                {!isBot && (
                  <div className="flex items-center justify-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800">
                    <button
                      type="button"
                      onClick={isMe ? onToggleVoiceMute : undefined}
                      className={`flex items-center justify-center ${isMe ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
                      title={
                        isMe
                          ? isUserMuted
                            ? (lang === 'ar' ? 'المايك مكتوم - اضغط لفتحه' : 'Unmute Mic')
                            : (lang === 'ar' ? 'المايك شغال - اضغط لكتمه' : 'Mute Mic')
                          : !isUserMuted
                          ? (lang === 'ar' ? 'المايك مفتوح' : 'Mic Live')
                          : (lang === 'ar' ? 'المايك مكتوم' : 'Mic Muted')
                      }
                    >
                      {!isUserMuted ? (
                        <Mic className={`w-3 h-3 ${isVoiceSpeaking ? 'text-emerald-400 animate-bounce' : 'text-emerald-400'}`} />
                      ) : (
                        <MicOff className="w-3 h-3 text-rose-400/80" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={isMe ? onToggleVoiceDeafen : undefined}
                      className={`flex items-center justify-center ${isMe ? 'cursor-pointer hover:scale-110 transition' : 'cursor-default'}`}
                      title={
                        isMe
                          ? isUserDeafened
                            ? (lang === 'ar' ? 'السماعة مقفولة - اضغط للاستماع' : 'Hear Audio')
                            : (lang === 'ar' ? 'السماعة شغالة - اضغط لكتم صوت اللاعبين' : 'Deafen')
                          : !isUserDeafened
                          ? (lang === 'ar' ? 'السماعة مفتوحة (يستمع)' : 'Audio Live')
                          : (lang === 'ar' ? 'السماعة مقفولة' : 'Audio Deafened')
                      }
                    >
                      {!isUserDeafened ? (
                        <Headphones className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <HeadphoneOff className="w-3 h-3 text-rose-400/80" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🎮 BOTTOM ACTION CONSOLE (Clean, context-aware) */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/95 border border-sky-500/30 backdrop-blur-xl shadow-2xl space-y-3.5">
        {/* Silent Drawing Canvas (If Silent Mode) */}
        {room.gameMode === 'silent' && (
          <div className="w-full space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 justify-center">
              <Brush className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.lblSilentDrawHint}</span>
            </div>

            <canvas
              ref={canvasRef}
              width={320}
              height={150}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`w-full aspect-[2/1] rounded-2xl bg-slate-950/90 border border-sky-400/40 touch-none block ${
                isMyTurn ? 'cursor-crosshair shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'cursor-default'
              }`}
            />

            {isMyTurn ? (
              <div className="flex gap-2">
                <button
                  onClick={clearCanvas}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.btnClearDrawing}</span>
                </button>
                <button
                  onClick={finishDrawingTurn}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.btnDoneDrawing}</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-1.5 px-3 rounded-xl bg-slate-950/60 border border-sky-500/20 text-xs font-bold text-sky-300 flex items-center justify-center gap-2 animate-pulse">
                <Brush className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {lang === 'ar'
                    ? `جاري رسم التلميح مباشرة بواسطة: [${currentSpeaker}]...`
                    : `${currentSpeaker} is drawing their clue live...`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Input Bar or Waiting Message */}
        {room.gameMode !== 'silent' && (
          <div>
            {isMyTurn ? (
              <form onSubmit={handleClueSubmit} className="space-y-2">
                <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-sky-400" />
                  <span>{lang === 'ar' ? 'اكتب تلميحك الذكي (كلمة واحدة فقط):' : 'Enter your clue (one word only):'}</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={!!myPlayer.isSilenced}
                    value={clueInput}
                    onChange={e => setClueInput(e.target.value)}
                    placeholder={
                      myPlayer.isSilenced
                        ? lang === 'ar'
                          ? 'أنت مكتوم! اختر إيموجي للتلميح'
                          : 'Silenced! Use emoji clues below'
                        : t.lblChatPlaceholder
                    }
                    className="flex-1 py-3 px-4 rounded-2xl bg-slate-950/90 border-2 border-sky-400 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-sky-400/50 transition placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!!myPlayer.isSilenced}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إرسال التلميح' : 'Send'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>
                  {lang === 'ar'
                    ? `استمع بانتباه لتلميح [${currentSpeaker}]...`
                    : `Listening to ${currentSpeaker}'s clue...`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Forced Emoji Clues if Silenced */}
        {isMyTurn && myPlayer.isSilenced && (
          <div className="flex items-center gap-2 pt-1 justify-center">
            <span className="text-[11px] font-bold text-rose-300">
              {lang === 'ar' ? 'تلميح إيموجي إجباري:' : 'Forced Emoji Clue:'}
            </span>
            {['🍕', '⚽', '🚗', '🦁', '🎬', '🎮', '✈️', '⚡'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClue(emoji)}
                className="p-1.5 text-lg hover:scale-125 transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* ============================================================== */}
        {/* 🚨 EMERGENCY VOTE: ONLY ACTIVE ON PLAYER'S TURN! */}
        {/* ============================================================== */}
        {!amSpectator && (
          <div className="pt-2 border-t border-slate-800/80">
            {isMyTurn ? (
              <button
                onClick={() => {
                  sound.playClick();
                  onTriggerEmergencyVote();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(225,29,72,0.45)] transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                <span>{lang === 'ar' ? '🚨 كشف الجاسوس / توجيه اتهام طارئ' : '🚨 Emergency Accusation Vote'}</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-slate-950/50 border border-slate-800 text-slate-500 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>{t.emergencyVoteOnlyMyTurn}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mole Network Private Spy Comms (If Mole Mode & User is Spy) */}
      {isSpy && !amSpectator && room.gameMode === 'mole' && (
        <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2">
          <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>{t.lblSpyNetwork}</span>
          </div>

          <div className="h-20 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-950/80 border border-purple-500/20 text-xs">
            {room.spyChat && Object.values(room.spyChat).length > 0 ? (
              Object.values(room.spyChat).map((msg, i) => (
                <div key={i} className="p-1 rounded-lg bg-purple-900/20">
                  <span className="font-bold text-purple-300 me-1.5">{msg.sender}:</span>
                  <span className="text-slate-200">{msg.text}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-3 text-[11px]">
                {lang === 'ar' ? 'شات سري بين الجواسيس فقط 🕵️' : 'Secret spy comms channel 🕵️'}
              </div>
            )}
          </div>

          <form onSubmit={handleSpySubmit} className="flex gap-2">
            <input
              type="text"
              value={spyInput}
              onChange={e => setSpyInput(e.target.value)}
              placeholder={t.lblSpyChatPlaceholder}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-950/80 border border-purple-500/30 text-white text-xs outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
            >
              🕵️
            </button>
          </form>
        </div>
      )}

      {/* Chat & Clues History Modal */}
      <CluesHistoryModal
        lang={lang}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        gameChat={room.gameChat}
        currentUserUid={currentUserUid}
      />
    </div>
  );
};
