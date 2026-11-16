import React, { useState, useRef, useEffect, useCallback } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData, VoiceUserState } from '../types';
import { sound } from '../audio';
import { RoleDossierCard } from '../components/RoleDossierCard';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { getSecretWordDisplay } from '../words';
import { getEffectiveTurnSeconds } from '../gameEngine';
import { CluesHistoryModal } from '../components/CluesHistoryModal';
import { QuickVoiceControls } from '../components/QuickVoiceControls';
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
  VolumeX as MuteIcon,
  Lock,
  MessageSquare,
  Zap,
  Music,
  FastForward,
  RotateCcw
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
  onJoinVoice?: (startMuted?: boolean) => void;
  onLeaveVoice?: () => void;
  onToggleVoiceMute?: () => void;
  onToggleVoiceDeafen?: () => void;
  onAdvanceTurn: () => void;
  onTriggerEmergencyVote: () => void;
  onSendGameClue: (word: string, targetRound: number, targetTurnIndex: number) => void;
  onSkipTurn?: (targetRound: number, targetTurnIndex: number) => void;
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
  onToggleVoiceMute = () => {},
  onToggleVoiceDeafen = () => {},
  onAdvanceTurn,
  onTriggerEmergencyVote,
  onSendGameClue,
  onSkipTurn,
  onSendSpyChat,
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
  const timeLeft = room.turnTimeLeft != null ? room.turnTimeLeft : effectiveTurnDuration;

  const isUndercover = room.gameMode === 'undercover' && room.undercoverUid === currentUserUid;
  const spyNameForUndercover = (room.spies || [])
    .map(sUid => playersObj[sUid]?.name)
    .filter(Boolean)
    .join(' · ') || 'Unknown';

  const spectatorCount = Object.values(playersObj).filter(p => p.isSpectator).length;
  const cluesList = Object.values(room.gameChat || {});
  const activeUids = (turnOrder.length > 0 ? turnOrder : Object.keys(playersObj)).filter(
    uid => playersObj[uid] && !playersObj[uid].isSpectator
  );

  // Flexible emergency vote: available on player's turn OR once round 1 reaches halfway / round >= 2
  const completedCount = Object.keys(room.completedTurnsThisRound || {}).length;
  const canEmergencyVote =
    !amSpectator &&
    (isMyTurn || currentRound >= 2 || completedCount >= Math.max(1, Math.floor(activeUids.length / 2)));

  // Listen to speech bubbles
  useEffect(() => {
    const bubblesRef = db.ref(`spy_rooms/${roomCode}/speechBubbles`);
    const onBubbles = (snap: firebase.database.DataSnapshot) => {
      setSpeechBubbles(snap.val() || {});
    };
    bubblesRef.on('value', onBubbles);
    return () => {
      bubblesRef.off('value', onBubbles);
      if (bubbleCleanupTimerRef.current) clearTimeout(bubbleCleanupTimerRef.current);
    };
  }, [roomCode]);

  // Blackout Protocol Audio Alert (Fair non-blocking comms-jamming surge)
  const isBlackoutActive = !!room.blackoutActive;
  useEffect(() => {
    if (isBlackoutActive) {
      sound.playBlackoutAlarm();
      sound.playGlitchStatic();
      sound.triggerHaptic('medium');
    }
  }, [isBlackoutActive]);

  // Audio timer countdown pulse
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

  const drawStrokesOnCanvas = useCallback((strokes: Array<Array<{ x: number; y: number }>>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width || 420;
    const cssHeight = rect.height || 210;
    const targetW = Math.round(cssWidth * dpr);
    const targetH = Math.round(cssHeight * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (!stroke || stroke.length === 0) return;
      ctx.beginPath();
      stroke.forEach((pt, i) => {
        const x = pt.x * cssWidth;
        const y = pt.y * cssHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }, []);

  useEffect(() => {
    if (room.gameMode !== 'silent') return;
    if (!isDrawingRef.current) {
      const remoteStrokes = room.currentDrawing || [];
      localStrokesRef.current = remoteStrokes;
      setStrokeCount(remoteStrokes.length);
      drawStrokesOnCanvas(remoteStrokes);
    }
  }, [room.currentDrawing, room.gameMode, drawStrokesOnCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMyTurn || room.gameMode !== 'silent') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));

    isDrawingRef.current = true;
    const updated = [...localStrokesRef.current, [{ x, y }, { x, y }]];
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
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(updated.length > 0 ? updated : null).catch(() => {});
  };

  const clearCanvas = () => {
    if (!isMyTurn) return;
    sound.playClick();
    localStrokesRef.current = [];
    setStrokeCount(0);
    drawStrokesOnCanvas([]);
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(null).catch(() => {});
  };

  const finishDrawingTurn = async () => {
    if (!isMyTurn) return;
    sound.playClick();
    if (localStrokesRef.current.length > 0) {
      await db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(localStrokesRef.current).catch(() => {});
    }
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

    const normalizeMatch = (val: string) =>
      val
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '');

    const cleanNorm = normalizeMatch(clean);
    const matchesSecret = (candidateEn?: string, candidateAr?: string) => {
      const enNorm = normalizeMatch(candidateEn || '');
      const arNorm = normalizeMatch(candidateAr || '');
      if (enNorm && cleanNorm === enNorm) return true;
      if (arNorm) {
        if (cleanNorm === arNorm) return true;
        if (cleanNorm.replace(/^ال/, '') === arNorm.replace(/^ال/, '')) return true;
      }
      return false;
    };

    if (!isSpy) {
      if (matchesSecret(room.word, room.wordAr)) {
        return onToast(t.errCannotTypeSecretWord, 'danger');
      }
    } else if (isChameleonSpy) {
      if (matchesSecret(myPlayer.chameleonWord, myPlayer.chameleonWordAr)) {
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

  const lastDrawingStrokes =
    room.gameMode === 'silent' && strokeCount === 0 && room.lastDrawing?.strokes?.length
      ? room.lastDrawing.strokes
      : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-20 pt-1 text-start select-none relative z-10">
      {/* Non-blocking Blackout Comms-Jamming Banner */}
      {isBlackoutActive && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <Zap className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{t.blackoutAlert}</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums font-bold text-rose-300 shrink-0">
            BLACKOUT
          </span>
        </div>
      )}

      {/* Top Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#111827] border border-slate-800 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sky-400 shrink-0">
            <Radar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
            <span className="font-heading font-bold text-xs sm:text-sm text-white">
              {t.lblStation}
            </span>
            <span className="font-mono tabular-nums font-black text-xs sm:text-sm text-sky-400">
              #{roomCode}
            </span>
          </div>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-xs font-mono tabular-nums font-bold text-slate-300 whitespace-nowrap">
            {t.lblRound} {currentRound}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsHistoryOpen(true);
            }}
            className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-xs font-bold transition cursor-pointer shrink-0"
            title={t.btnChatHistory}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">{t.btnChatHistory}</span>
            {cluesList.length > 0 && (
              <span className="font-mono tabular-nums text-[11px] font-black text-sky-400">
                {cluesList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsBgmMuted(sound.toggleBgm())}
            className={`min-w-[36px] min-h-[36px] p-2 rounded-xl border transition cursor-pointer shrink-0 flex items-center justify-center ${
              isBgmMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
            }`}
            title={isBgmMuted ? t.musicOn : t.musicOff}
          >
            <Music className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMuted(sound.toggleMute())}
            className={`min-w-[36px] min-h-[36px] p-2 rounded-xl border transition cursor-pointer shrink-0 flex items-center justify-center ${
              isMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? t.sfxOn : t.sfxOff}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {spectatorCount > 0 && (
            <span className="flex items-center gap-1 px-2 text-slate-400 text-xs font-mono tabular-nums shrink-0">
              <Eye className="w-3.5 h-3.5" />
              <span>{spectatorCount}</span>
            </span>
          )}

          {onLeaveRoom && (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 transition cursor-pointer shrink-0 flex items-center justify-center"
              title={t.btnLeaveStation}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Gameplay Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Turn Spotlight + Role Dossier Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Turn Banner */}
          <div
            className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 ${
              isMyTurn
                ? 'bg-sky-950/45 border-sky-400'
                : 'bg-[#111827] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isMyTurn
                    ? 'bg-sky-400 text-slate-950 border-sky-300'
                    : 'bg-slate-900 text-sky-400 border-slate-800'
                }`}
              >
                <Mic className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold text-slate-400">
                  {t.lblCurrentTurn}
                </div>
                <div className="text-sm sm:text-base font-black text-white font-heading leading-tight break-words">
                  {isMyTurn ? (
                    <span className="text-sky-300">{t.lblYourTurnGiveClue}</span>
                  ) : (
                    <span>{currentSpeaker}</span>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono tabular-nums font-black text-sm shrink-0 ${
                timeLeft <= 5
                  ? 'bg-rose-950/90 border-rose-500 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-sky-300'
              }`}
            >
              <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-400' : 'text-sky-400'}`} />
              <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
            </div>
          </div>

          {/* Direct Secret Word & Role Card (no fingerprint scanner, no chameleon spoiler) */}
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

          {/* Undercover Alert (for Crew guardian) */}
          {isUndercover && (
            <div className="p-3 rounded-xl bg-indigo-950/45 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{t.undercoverAlert.replace('{spyName}', spyNameForUndercover)}</span>
            </div>
          )}

          {/* Mole Network Private Spy Comms */}
          {isSpy && !amSpectator && room.gameMode === 'mole' && (
            <div className="p-4 rounded-2xl bg-[#111827] border border-rose-500/35 space-y-2.5">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.lblSpyNetwork}</span>
              </div>

              <div className="h-24 overflow-y-auto space-y-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                {room.spyChat && Object.values(room.spyChat).length > 0 ? (
                  Object.values(room.spyChat).map((msg, i) => (
                    <div key={i} className="p-1.5 rounded-lg bg-slate-900">
                      <span className="font-bold text-rose-300 me-1.5">{msg.sender}:</span>
                      <span className="text-slate-200">{msg.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 py-4 text-xs">
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
                  className="flex-1 min-h-[40px] py-1.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-rose-400"
                />
                <button
                  type="submit"
                  className="min-w-[44px] min-h-[40px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Crew Roster + Turn Input / Silent Canvas + Emergency Vote */}
        <div className="lg:col-span-7 space-y-4">
          {/* Crew Roster */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>{t.lblSpaceCrew}</span>
              <span className="font-mono tabular-nums text-sky-400">
                {activeUids.length} {t.lblAstronautsCount}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {activeUids.map((uid, seatIdx) => {
                const p = playersObj[uid];
                const isTurn = uid === currentTurnUid;
                const hasPlayedTurn = !!room.completedTurnsThisRound?.[uid];
                const bubble = speechBubbles[uid];
                const isSilenced = !!p?.isSilenced;
                const isMe = uid === currentUserUid;
                const isBot = !!p?.isBot || uid.startsWith('bot_');

                const userVoice = voiceUsers?.[uid];
                const isUserSpeaking = !!userVoice?.speaking;
                const isUserMuted = userVoice ? !!userVoice.muted : true;
                const isUserDeafened = userVoice ? !!userVoice.deafened : false;
                const isFellowMoleSpy = isSpy && room.gameMode === 'mole' && (room.spies || []).includes(uid) && !isMe;

                // During Blackout jamming surge, briefly mask attribution visually on other players
                const hideNameForBlackout = isBlackoutActive && !isMe;

                return (
                  <div
                    key={uid}
                    className={`relative p-3 rounded-xl border transition-colors flex flex-col items-center justify-center text-center ${
                      isUserSpeaking
                        ? 'bg-emerald-950/35 border-emerald-400 z-20'
                        : isTurn
                        ? 'bg-sky-500/15 border-sky-400 z-20'
                        : isMe
                        ? 'bg-slate-950/90 border-sky-500/40'
                        : 'bg-slate-950/75 border-slate-800'
                    }`}
                  >
                    <span
                      className={`absolute top-1.5 inset-inline-start-1.5 font-mono tabular-nums text-[10px] font-bold ${
                        isTurn
                          ? 'text-sky-300'
                          : hasPlayedTurn
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      #{seatIdx + 1}
                    </span>

                    {hasPlayedTurn && !isTurn && (
                      <span
                        title={lang === 'ar' ? 'أرسل تلميحه' : 'Clue submitted'}
                        className="absolute top-1.5 inset-inline-end-1.5 text-emerald-400"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    )}

                    {/* Floating Speech Bubble */}
                    {bubble && (
                      <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                        <div className="relative px-2.5 py-1 rounded-xl bg-white text-slate-950 text-xs font-black shadow-lg border border-sky-400 text-center max-w-[150px] break-words leading-tight">
                          {bubble.text}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-sky-400" />
                        </div>
                      </div>
                    )}

                    <div className="relative mb-1.5 mt-2">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={hideNameForBlackout ? 'Agent' : p?.name}
                        referrerPolicy="no-referrer"
                        className={`w-11 h-11 rounded-xl object-cover border transition-all ${
                          hideNameForBlackout
                            ? 'opacity-45 grayscale border-rose-800'
                            : isUserSpeaking
                            ? 'border-2 border-emerald-400'
                            : isTurn
                            ? 'border-2 border-sky-400'
                            : 'border-slate-700'
                        }`}
                      />
                      {isSilenced && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white">
                          <MuteIcon className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-1 max-w-[100px]">
                      <span className={`text-xs font-bold text-center truncate leading-tight ${hideNameForBlackout ? 'text-rose-400/70' : 'text-white'}`}>
                        {hideNameForBlackout ? '???' : (p?.name || 'Agent')}
                      </span>
                      {isFellowMoleSpy && !hideNameForBlackout && (
                        <span title={t.lblFellowSpyBadge} className="shrink-0">
                          <Shield className="w-3 h-3 text-rose-400" />
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 min-h-[14px]">
                      {isMe ? t.lblYou : isBot ? t.botTag : ''}
                    </div>

                    {!isBot && (
                      <div className="flex items-center justify-center gap-2 mt-1.5 pt-1 border-t border-slate-800/80 w-full">
                        <button
                          type="button"
                          onClick={isMe ? onToggleVoiceMute : undefined}
                          className={`p-1 ${isMe ? 'cursor-pointer hover:text-white' : 'cursor-default'}`}
                        >
                          {!isUserMuted ? (
                            <Mic className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <MicOff className="w-3 h-3 text-rose-400/80" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={isMe ? onToggleVoiceDeafen : undefined}
                          className={`p-1 ${isMe ? 'cursor-pointer hover:text-white' : 'cursor-default'}`}
                        >
                          {!isUserDeafened ? (
                            <Headphones className="w-3 h-3 text-sky-400" />
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

          {/* Bottom Action Console */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
            {/* Silent Drawing Canvas */}
            {room.gameMode === 'silent' && (
              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Brush className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.lblSilentDrawHint}</span>
                  </span>
                  {lastDrawingStrokes && (
                    <span className="text-[11px] text-slate-400">
                      {t.lastDrawingLabel}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className={`w-full aspect-[2/1] rounded-xl bg-slate-950 border touch-none block ${
                      isMyTurn ? 'border-sky-400 cursor-crosshair' : 'border-slate-800 cursor-default'
                    }`}
                  />

                  {lastDrawingStrokes && !isMyTurn && (
                    <svg
                      viewBox="0 0 100 50"
                      className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
                      preserveAspectRatio="none"
                    >
                      {lastDrawingStrokes.map((stroke, idx) => (
                        <polyline
                          key={idx}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={(stroke || []).map(pt => `${(pt.x * 100).toFixed(1)},${(pt.y * 50).toFixed(1)}`).join(' ')}
                        />
                      ))}
                    </svg>
                  )}
                </div>

                {isMyTurn ? (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={undoLastStroke}
                      disabled={strokeCount === 0}
                      className="min-h-[44px] py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.undoStroke}</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="min-h-[44px] py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.btnClearDrawing}</span>
                    </button>
                    <button
                      type="button"
                      onClick={finishDrawingTurn}
                      className="min-h-[44px] py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t.btnDoneDrawing}</span>
                    </button>
                  </div>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-sky-300 flex items-center justify-center gap-2">
                    <Brush className="w-3.5 h-3.5 text-sky-400" />
                    <span>
                      {t.drawingLiveNotice ? t.drawingLiveNotice.replace('{name}', currentSpeaker) : `${currentSpeaker}...`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Text Clue Input Bar */}
            {room.gameMode !== 'silent' && (
              <div>
                {isMyTurn ? (
                  <form onSubmit={handleClueSubmit} className="space-y-2.5">
                    <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t.lblEnterClue}</span>
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
                        className="flex-1 min-w-0 min-h-[46px] py-2.5 px-3.5 rounded-xl bg-slate-950 border-2 border-sky-400 text-white font-bold text-sm outline-none transition placeholder:text-slate-500"
                      />
                      <button
                        type="submit"
                        disabled={!!myPlayer.isSilenced}
                        className="min-h-[46px] px-4 sm:px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>{t.btnSend}</span>
                      </button>
                      {onSkipTurn && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            onSkipTurn(currentRound, turnIndex);
                          }}
                          title={t.skipTurnTooltip}
                          className="min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shrink-0"
                        >
                          <FastForward className="w-4 h-4" />
                          <span className="hidden sm:inline">{t.btnPass}</span>
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="py-2.5 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>
                      {t.lblListeningTo ? t.lblListeningTo.replace('{name}', currentSpeaker) : `Listening to ${currentSpeaker}...`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Forced Emoji Clues if Silenced */}
            {isMyTurn && myPlayer.isSilenced && (
              <div className="flex items-center gap-2 pt-1 justify-center flex-wrap">
                <span className="text-xs font-bold text-rose-300">
                  {t.lblForcedEmoji}
                </span>
                {['🍕', '⚽', '🚗', '🦁', '🎬', '🎮', '✈️', '⚡'].map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClue(emoji)}
                    className="min-w-[40px] min-h-[40px] p-1.5 text-lg rounded-lg bg-slate-950 border border-slate-800 hover:border-sky-400 transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Emergency Vote */}
            {!amSpectator && (
              <div className="pt-3 border-t border-slate-800">
                {canEmergencyVote ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onTriggerEmergencyVote();
                    }}
                    className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>{t.lblEmergencyVoteBtn || t.btnEmergencyVote}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-xs font-semibold">
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>{t.emergencyVoteOnlyMyTurn}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
