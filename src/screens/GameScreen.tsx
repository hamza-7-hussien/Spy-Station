import React, { useState, useRef, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData, CategoryKey } from '../types';
import { sound } from '../audio';
import { RoleDossierCard } from '../components/RoleDossierCard';

import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { getSecretWordDisplay, CATEGORY_META } from '../words';
import { getEffectiveTurnSeconds } from '../gameEngine';
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
  MessageSquare,
  Zap,
  Music,
  RotateCcw
} from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  serverTimeOffsetMs?: number;
  isVoiceJoined?: boolean;
  isVoiceMuted?: boolean;
  isVoiceDeafened?: boolean;
  isVoiceSpeaking?: boolean;
  voiceUsers?: Record<string, VoiceUserState>;
  onJoinVoice?: (startMuted?: boolean) => void;
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
  serverTimeOffsetMs = 0,
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
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [isBgmMuted, setIsBgmMuted] = useState(sound.isBgmMuted());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, { text: string; timestamp: number }>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now() + serverTimeOffsetMs);
  const localStrokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const isDrawingRef = useRef<boolean>(false);
  const lastPulseSecondRef = useRef<number>(-1);
  const lastDrawingSyncRef = useRef<number>(0);
  const bubbleCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const hasAlreadyPlayedThisRound = !!room.completedTurnsThisRound?.[currentUserUid];
  const isMyTurn = !amSpectator && currentTurnUid === currentUserUid && !hasAlreadyPlayedThisRound;

  const currentRound = room.round || 1;
  const effectiveTurnDuration = getEffectiveTurnSeconds(room.gameMode, room.turnSeconds);

  useEffect(() => {
    setNowTs(Date.now() + serverTimeOffsetMs);
    const id = setInterval(() => setNowTs(Date.now() + serverTimeOffsetMs), 250);
    return () => clearInterval(id);
  }, [serverTimeOffsetMs]);

  const isFreezeActive =
    (typeof room.ejectionEndsAt === 'number' && room.ejectionEndsAt > nowTs) ||
    (typeof room.turnGraceUntil === 'number' && room.turnGraceUntil > nowTs);

  const timeLeft = isFreezeActive
    ? effectiveTurnDuration
    : typeof room.turnEndsAt === 'number' && room.turnEndsAt > 0
    ? Math.max(0, Math.ceil((room.turnEndsAt - nowTs) / 1000))
    : room.turnTimeLeft != null
    ? room.turnTimeLeft
    : effectiveTurnDuration;

  // Undercover Agent role info (supports 1 or more spies)
  const isUndercover = room.gameMode === 'undercover' && room.undercoverUid === currentUserUid;
  const spyNameForUndercover = (room.spies || [])
    .map(sUid => playersObj[sUid]?.name)
    .filter(Boolean)
    .join(' ، ') || 'Unknown';

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
      if (bubbleCleanupTimerRef.current) {
        clearTimeout(bubbleCleanupTimerRef.current);
      }
    };
  }, [roomCode]);

  // Blackout Protocol State for GameScreen (Audio alarm + comms jamming without spoiling roles)
  const isBlackoutActive = !!room.blackoutActive;

  useEffect(() => {
    if (isBlackoutActive) {
      sound.playBlackoutAlarm();
      sound.playGlitchStatic();
      sound.triggerHaptic('heavy');
    }
  }, [isBlackoutActive]);

  // Audio timer countdown pulse (High-tension ticking in final seconds)
  useEffect(() => {
    if (timeLeft !== lastPulseSecondRef.current) {
      lastPulseSecondRef.current = timeLeft;
      if (timeLeft <= 10 && timeLeft > 0) {
        sound.playCountdownTick(timeLeft);
      } else if (timeLeft === 0) {
        sound.playTimeoutBuzzer();
      }
    }
  }, [timeLeft]);

  const drawStrokesOnCanvas = (strokes: Array<Array<{ x: number; y: number }>>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.max(320, Math.round((rect.width || 320) * dpr));
    const targetH = Math.max(160, Math.round((rect.height || 160) * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(2.5, 3 * dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
  };

  // Silent drawing synchronization
  useEffect(() => {
    if (room.gameMode !== 'silent') return;
    if (!isDrawingRef.current) {
      const remoteStrokes = room.currentDrawing || [];
      localStrokesRef.current = remoteStrokes;
      setStrokeCount(remoteStrokes.length);
      drawStrokesOnCanvas(remoteStrokes);
    }
  }, [room.currentDrawing, room.gameMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore if unsupported
    }
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    isDrawingRef.current = true;
    const updated = [...localStrokesRef.current, [{ x, y }]];
    localStrokesRef.current = updated;
    setStrokeCount(updated.length);
    drawStrokesOnCanvas(updated);
    lastDrawingSyncRef.current = Date.now();
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(updated).catch(() => {});
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isMyTurn || room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    const existing = localStrokesRef.current;
    if (existing.length > 0) {
      existing[existing.length - 1] = [...existing[existing.length - 1], { x, y }];
      drawStrokesOnCanvas(existing);

      const now = Date.now();
      if (now - lastDrawingSyncRef.current >= 90) {
        lastDrawingSyncRef.current = now;
        db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(existing).catch(() => {});
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (isMyTurn && room.gameMode === 'silent' && localStrokesRef.current.length > 0) {
      db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(localStrokesRef.current).catch(() => {});
    }
  };

  const undoLastStroke = () => {
    if (!isMyTurn || localStrokesRef.current.length === 0) return;
    sound.playClick();
    const updated = localStrokesRef.current.slice(0, -1);
    localStrokesRef.current = updated;
    setStrokeCount(updated.length);
    drawStrokesOnCanvas(updated);
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(updated.length ? updated : null).catch(() => {});
  };

  const clearCanvas = () => {
    if (!isMyTurn) return;
    sound.playClick();
    localStrokesRef.current = [];
    setStrokeCount(0);
    drawStrokesOnCanvas([]);
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(null).catch(() => {});
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
      if (bubbleCleanupTimerRef.current) clearTimeout(bubbleCleanupTimerRef.current);
      bubbleCleanupTimerRef.current = setTimeout(() => {
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
      return onToast(t.msgSilenced, 'danger');
    }

    const clean = clueInput.trim();
    if (!clean) return;

    if (/\s/.test(clean)) {
      return onToast(t.errOneWordOnly, 'danger');
    }

    // Crew/Undercover cannot type the secret word; Chameleon spy cannot type their own decoy word
    // (avoid blocking the real secret word for a non-crew spy, which would reveal it!)
    if (!isSpy) {
      const secretWordEn = (room.word || '').trim().toLowerCase();
      const secretWordAr = (room.wordAr || '').trim();
      if (
        (secretWordEn && clean.toLowerCase() === secretWordEn) ||
        (secretWordAr && clean === secretWordAr)
      ) {
        return onToast(t.errCannotTypeSecretWord, 'danger');
      }
    } else if (isChameleonSpy) {
      const decoyEn = (myPlayer.chameleonWord || '').trim().toLowerCase();
      const decoyAr = (myPlayer.chameleonWordAr || '').trim();
      if (
        (decoyEn && clean.toLowerCase() === decoyEn) ||
        (decoyAr && clean === decoyAr)
      ) {
        return onToast(t.errCannotTypeSecretWord, 'danger');
      }
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
  const completedCount = Object.keys(room.completedTurnsThisRound || {}).length;
  const canEmergencyVote =
    !amSpectator &&
    (isMyTurn || currentRound >= 2 || completedCount >= Math.max(1, Math.floor(activeUids.length / 2)));

  return (
    <div className={`w-full max-w-3xl mx-auto space-y-3.5 pb-10 pt-1 text-start select-none relative z-10 transition-colors duration-500 ${
      isBlackoutActive ? 'saturate-125' : ''
    }`}>
      {/* Non-blocking Blackout Protocol Comms Jamming Banner (Never spoils word or spies) */}
      {isBlackoutActive && (
        <div className="w-full px-4 py-2.5 rounded-2xl bg-rose-950/90 border border-rose-500/70 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.45)] flex items-center justify-between gap-2 animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span className="font-heading font-black text-xs sm:text-sm truncate">
              {lang === 'ar'
                ? '⚡ بروتوكول التعتيم: تشويش مؤقت وإخفاء الهويات!'
                : '⚡ BLACKOUT PROTOCOL: Temporary comms & identity jamming!'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/50 text-[10px] font-mono font-black shrink-0">
            BLACKOUT
          </span>
        </div>
      )}

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
              {t.lblStation}
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

          {/* Background Music (BGM) Toggle */}
          <button
            onClick={() => {
              const bgmMuted = sound.toggleBgm();
              setIsBgmMuted(bgmMuted);
            }}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer shrink-0 ${
              isBgmMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300'
                : 'bg-indigo-950/70 border-indigo-500/60 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.35)]'
            }`}
            title={isBgmMuted ? t.musicOn : t.musicOff}
          >
            <Music className={`w-3.5 h-3.5 ${!isBgmMuted ? 'text-indigo-400 animate-pulse' : ''}`} />
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
            title={isMuted ? t.sfxOn : t.sfxOff}
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

      {/* Role Warning (Undercover Only — Chameleon Spy receives NO spoiler hint) */}
      {isUndercover && (
        <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 shadow-md text-xs text-cyan-200 flex items-center gap-2">
          <Radar className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <div>
            <span className="font-bold text-cyan-300">{t.lblUndercoverTag}</span>
            <span>{t.undercoverAlert.replace('{spyName}', spyNameForUndercover)}</span>
          </div>
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
              {t.lblCurrentTurn || 'Current Speaking Turn'}
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-white font-heading leading-tight break-words">
              {isMyTurn ? (
                <span className="text-sky-300 flex flex-wrap items-center gap-1">
                  <span>{t.lblYourTurnGiveClue || '👉 YOUR TURN! Give your clue'}</span>
                </span>
              ) : (
                <span className="break-words">{currentSpeaker}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tactical HUD Circular & Digital Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-black text-sm shrink-0 transition-all ${
            timeLeft <= 5
              ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse ring-2 ring-rose-500/40'
              : 'bg-slate-950/90 border-sky-500/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
          }`}
        >
          {/* Mini Tactical Circular SVG Gauge */}
          <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="9"
                className="stroke-slate-800"
                strokeWidth="2.5"
                fill="none"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                className={`${timeLeft <= 5 ? 'stroke-rose-500' : 'stroke-sky-400'} transition-all duration-1000 ease-linear`}
                strokeWidth="2.5"
                strokeDasharray="56.5"
                strokeDashoffset={56.5 * (1 - Math.max(0, Math.min(1, timeLeft / effectiveTurnDuration)))}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <Clock className={`w-2.5 h-2.5 absolute ${timeLeft <= 5 ? 'text-rose-400' : 'text-sky-400'}`} />
          </div>

          <span className="text-sm tracking-wider">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          {timeLeft <= 5 && (
            <span className="text-[10px] px-1 py-0.2 rounded bg-rose-500 text-black font-extrabold tracking-tighter">
              !
            </span>
          )}
        </div>
      </div>

      {/* Role Dossier Card (Direct Cosmic Reveal without Hold/Hide buttons) */}
      <RoleDossierCard
        lang={lang}
        isSpy={isSpy}
        isChameleonSpy={isChameleonSpy}
        amSpectator={amSpectator}
        displayWord={displayWord || ''}
        wordCategory={room.wordCategory}
        roomGameMode={room.gameMode}
        fellowSpiesNames={(room.spies || [])
          .filter(sUid => sUid !== currentUserUid)
          .map(sUid => playersObj[sUid]?.name || 'Agent')}
        protectedSpyName={isUndercover ? spyNameForUndercover : null}
        t={t as unknown as Record<string, string>}
      />

      {/* ============================================================== */}
      {/* 👥 ASTRONAUT CREW ROSTER (Clean, comfortable grid) */}
      {/* ============================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/85 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span>{t.lblSpaceCrew || 'Space Crew Roster 🛸'}</span>
          <span className="text-[11px] text-sky-400 font-mono">
            {activeUids.length} {t.lblAstronautsCount || 'Astronauts'}
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
                      isBlackoutActive
                        ? 'opacity-20 grayscale brightness-50 border-rose-900 filter blur-[1px]'
                        : isVoiceSpeaking
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

                {/* Player Name + Mole Badge (Hidden during blackout protocol) */}
                <div className="flex items-center justify-center gap-1 max-w-[95px]">
                  <span className={`text-[11px] font-bold text-center truncate leading-tight ${
                    isBlackoutActive ? 'text-rose-500/40 tracking-widest' : 'text-white'
                  }`}>
                    {isBlackoutActive ? '██████' : (p?.name || 'Agent')}
                  </span>
                  {isFellowMoleSpy && !isBlackoutActive && (
                    <span title={t.lblFellowSpyBadge || 'Fellow Spy'} className="text-[10px]">
                      🕵️
                    </span>
                  )}
                </div>

                {isMe && (
                  <span className="text-[9px] font-bold text-sky-400">
                    ({t.lblYou || 'You'})
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
                            ? t.unmuteMicTooltip
                            : t.muteMicTooltip
                          : !isUserMuted
                          ? t.micLive
                          : t.micMuted
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
                            ? t.hearAudioTooltip
                            : t.deafenTooltip
                          : !isUserDeafened
                          ? t.audioLive
                          : t.audioDeafened
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
          <div className="w-full space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Brush className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.lblSilentDrawHint}</span>
              </div>
              {strokeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-[10px] font-mono text-sky-300">
                  {strokeCount} {lang === 'ar' ? 'خط' : 'strokes'}
                </span>
              )}
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`w-full aspect-[2/1] rounded-2xl bg-slate-950/90 border border-sky-400/40 touch-none block ${
                isMyTurn ? 'cursor-crosshair shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'cursor-default'
              }`}
            />

            {isMyTurn ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={undoLastStroke}
                  disabled={strokeCount === 0}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.undoStroke || (lang === 'ar' ? 'تراجع' : 'Undo')}</span>
                </button>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.btnClearDrawing}</span>
                </button>
                <button
                  type="button"
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
                  {t.drawingLiveNotice ? t.drawingLiveNotice.replace('{name}', currentSpeaker) : `${currentSpeaker}...`}
                </span>
              </div>
            )}

            {/* Latest Finished Sketch Preview in Silent Mode */}
            {room.lastDrawing?.strokes && room.lastDrawing.strokes.length > 0 && (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-300 min-w-0">
                  <div className="text-sky-400">{t.lastDrawingLabel || (lang === 'ar' ? 'آخر رسمة مرسلة:' : 'Latest Sketch:')}</div>
                  <div className="truncate text-slate-200">{isBlackoutActive ? '████' : room.lastDrawing.sender}</div>
                </div>
                <div className="w-28 h-14 rounded-xl bg-slate-900 border border-sky-500/30 p-1 shrink-0">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {room.lastDrawing.strokes.map((stroke, idx) => {
                      if (!stroke || stroke.length === 0) return null;
                      return (
                        <polyline
                          key={idx}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={stroke.map(pt => `${pt.x * 200},${pt.y * 100}`).join(' ')}
                        />
                      );
                    })}
                  </svg>
                </div>
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
                  <span>{t.lblEnterClue || 'Enter your clue (one word only):'}</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled={!!myPlayer.isSilenced}
                    value={clueInput}
                    onChange={e => setClueInput(e.target.value)}
                    placeholder={
                      myPlayer.isSilenced
                        ? t.msgSilenced
                        : (t.lblChatPlaceholder || t.clueInputPlaceholder)
                    }
                    className="flex-1 min-w-0 py-3 px-3.5 rounded-2xl bg-slate-950/90 border-2 border-sky-400 text-white font-bold text-sm outline-none focus:ring-2 focus:ring-sky-400/50 transition placeholder:text-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!!myPlayer.isSilenced}
                    className="px-4 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition shadow-lg shadow-sky-500/25 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t.btnSend || 'Send'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-2 text-center text-xs text-slate-400 font-bold flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>
                  {t.lblListeningTo ? t.lblListeningTo.replace('{name}', currentSpeaker) : `Listening to ${currentSpeaker}...`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Forced Emoji Clues if Silenced */}
        {isMyTurn && myPlayer.isSilenced && (
          <div className="flex items-center gap-2 pt-1 justify-center">
            <span className="text-[11px] font-bold text-rose-300">
              {t.lblForcedEmoji}
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

        {/* Emergency Vote */}
        {!amSpectator && (
          <div className="pt-2 border-t border-slate-800/80">
            {canEmergencyVote ? (
              <button
                onClick={() => {
                  sound.playClick();
                  onTriggerEmergencyVote();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(225,29,72,0.45)] transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                <span>{t.lblEmergencyVoteBtn || t.btnEmergencyVote}</span>
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
                {t.lblSpyComms}
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
