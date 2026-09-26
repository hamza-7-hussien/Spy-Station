import React, { useState, useRef, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData, SabotageAbility } from '../types';
import { sound } from '../audio';
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { WordVisualCard } from '../components/WordVisualCard';
import { CATEGORY_STYLES } from '../wordVisuals';
import { SabotageActionModal } from '../components/SabotageActionModal';
import {
  Clock,
  Mic,
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
  Zap,
  VolumeX as MuteIcon,
  Crosshair,
  Radio,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  onAdvanceTurn: () => void;
  onTriggerEmergencyVote: () => void;
  onUseSabotageCard?: () => void;
  onOpenSabotageSwap?: () => void;
  onSendGameClue: (word: string) => void;
  onSendSpyChat: (msg: string) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
  onLeaveRoom?: () => void;
}

export const GameScreen: React.FC<Props> = ({
  lang,
  currentUserUid,
  roomCode,
  room,
  onAdvanceTurn,
  onTriggerEmergencyVote,
  onSendGameClue,
  onSendSpyChat,
  onToast,
  onLeaveRoom
}) => {
  const [clueInput, setClueInput] = useState('');
  const [spyInput, setSpyInput] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(true);
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [activeSabotageModal, setActiveSabotageModal] = useState<SabotageAbility | null>(null);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, { text: string; timestamp: number }>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPulseSecondRef = useRef<number>(-1);

  const t = dictionary[lang];
  const playersObj = room.players || {};
  const myPlayer = playersObj[currentUserUid] || ({} as PlayerData);
  const amSpectator = !!myPlayer.isSpectator;
  const isSpy = (room.spies || []).includes(currentUserUid);

  // Chameleon mode: If spy, show decoy twin word
  const isChameleonSpy = isSpy && room.gameMode === 'chameleon';
  const displayWord = isChameleonSpy
    ? lang === 'ar'
      ? myPlayer.chameleonWordAr || room.wordAr || room.word
      : myPlayer.chameleonWord || room.word || room.wordAr
    : lang === 'ar'
    ? room.wordAr || room.word
    : room.word || room.wordAr;

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

  // Fellow spies in Mole mode
  const fellowSpies = (room.spies || [])
    .filter(uid => uid !== currentUserUid)
    .map(uid => playersObj[uid]?.name)
    .filter(Boolean);

  // Spectator count
  const spectatorCount = Object.values(playersObj).filter(p => p.isSpectator).length;

  // Listen to live Speech Bubbles in RTDB
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

  // Audio timer heartbeat pulse (gentle, only fast in last 5 seconds)
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

  // Broadcast a speech bubble for this player
  const sendSpeechBubble = async (text: string) => {
    sound.playBubblePop();
    sound.triggerHaptic('light');
    try {
      await db.ref(`spy_rooms/${roomCode}/speechBubbles/${currentUserUid}`).set({
        text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      // Auto-clear after 7 seconds
      setTimeout(() => {
        db.ref(`spy_rooms/${roomCode}/speechBubbles/${currentUserUid}`).remove().catch(() => {});
      }, 7000);
    } catch {
      // ignore
    }
  };

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    onSendGameClue(clean);
    setClueInput('');
  };

  const handleEmojiClue = (emoji: string) => {
    sendSpeechBubble(emoji);
    onSendGameClue(emoji);
    // Remove silence after fulfilling turn
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

  // Sabotage Execution
  const handleExecuteSabotage = async (targetUid: string) => {
    if (!activeSabotageModal || !currentUserUid) return;
    const ability = activeSabotageModal;
    setActiveSabotageModal(null);

    // Mark ability used
    await db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}`).update({
      sabotageUsed: true
    });

    if (ability === 'thermal_scan') {
      // Find index in turnOrder to check immediate neighbors
      const order = room.turnOrder || [];
      const idx = order.indexOf(targetUid);
      if (idx !== -1) {
        const leftIdx = (idx - 1 + order.length) % order.length;
        const rightIdx = (idx + 1) % order.length;
        const leftUid = order[leftIdx];
        const rightUid = order[rightIdx];
        const spies = room.spies || [];
        const isNeighborSpy = spies.includes(leftUid) || spies.includes(rightUid);

        if (isNeighborSpy) {
          sendSpeechBubble('⚠️ رادار الفحص يرصد جاسوساً مجاوراً!');
          onToast(
            lang === 'ar'
              ? '📡 نتائج الرادار الحراري: تم رصد توقيع حراري لجاسوس يجلس بجوار هذا اللاعب مباشرة!'
              : '📡 Thermal Scan Result: A spy sits directly adjacent to this player!',
            'danger'
          );
        } else {
          onToast(
            lang === 'ar'
              ? '📡 نتائج الرادار الحراري: لا يوجد جواسيس مجاورين لهذا اللاعب.'
              : '📡 Thermal Scan Result: Immediate neighbors are clear.',
            'success'
          );
        }
      }
    } else if (ability === 'silence_hack') {
      await db.ref(`spy_rooms/${roomCode}/players/${targetUid}/isSilenced`).set(true);
      const targetName = playersObj[targetUid]?.name || 'Agent';
      onToast(
        lang === 'ar'
          ? `🤐 تم كتم ${targetName}! سيُجبر على التلميح بالإيموجي في دوره.`
          : `🤐 ${targetName} has been silenced! Emojis only on next turn.`,
        'normal'
      );
    } else if (ability === 'silver_bullet') {
      const isTargetSpy = (room.spies || []).includes(targetUid);
      const targetName = playersObj[targetUid]?.name || 'Agent';
      if (isTargetSpy) {
        sound.playSpyChord();
        // Spies revealed! Crew victory
        await db.ref(`spy_rooms/${roomCode}`).update({
          status: 'gameover',
          winnerTeam: 'crew',
          finalSpies: room.spies,
          finalPlayers: playersObj,
          votes: null,
          announcement: {
            msg:
              lang === 'ar'
                ? `🎯 أصابت الرصاصة الفضية الجاسوس ${targetName}! انتصر الطاقم الفضائي!`
                : `🎯 Silver Bullet eliminated spy ${targetName}! Crew wins!`,
            type: 'success',
            timestamp: firebase.database.ServerValue.TIMESTAMP
          }
        });
      } else {
        sound.playClick();
        await db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}/disqualifiedVote`).set(true);
        sendSpeechBubble('❌ تهمتي كانت خاطئة!');
        onToast(
          lang === 'ar'
            ? `❌ ${targetName} مواطن بريء! تم سحب حق التصويت منك في هذه الجولة!`
            : `❌ ${targetName} was innocent! Your vote is forfeited this round!`,
          'danger'
        );
      }
    }
  };

  const handleExecuteScramble = async () => {
    setActiveSabotageModal(null);
    sound.playSabotageScan();
    await db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}/sabotageUsed`).set(true);
    await db.ref(`spy_rooms/${roomCode}/scrambleActive`).set(true);
    sendSpeechBubble('⚡ تشويش راداري شامل!');
    onToast(lang === 'ar' ? '⚡ تم تشويش أجهزة الاتصال بنجاح!' : '⚡ Signal scrambler activated!', 'danger');
    setTimeout(() => {
      db.ref(`spy_rooms/${roomCode}/scrambleActive`).set(false).catch(() => {});
    }, 9000);
  };

  // Quick reactions list matching the user's uploaded reference image
  const QUICK_REACTIONS = [
    t.quickReaction1,
    t.quickReaction2,
    t.quickReaction3,
    t.quickReaction4,
    t.quickReaction5,
    t.quickReaction6
  ];

  // Active players sorted according to turnOrder
  const activeUids = (turnOrder.length > 0 ? turnOrder : Object.keys(playersObj)).filter(
    uid => playersObj[uid] && !playersObj[uid].isSpectator
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 pt-1 text-start select-none relative z-10">
      {/* Top Station Flight HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl shadow-lg text-xs font-bold">
        <div className="flex items-center gap-2 text-sky-400">
          <Radar className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="font-heading uppercase tracking-widest text-[11px] sm:text-xs">
            {lang === 'ar' ? 'طاولة الاجتماع الفضائية' : 'Space Council Hub'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-[10px]">
            {t.lblRound} {currentRound}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              const muted = sound.toggleMute();
              setIsMuted(muted);
            }}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isMuted
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-400'
                : 'bg-sky-950/40 border-sky-500/40 text-sky-400 hover:bg-sky-500/20'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {spectatorCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              <Eye className="w-3 h-3 text-slate-400" />
              <span>{spectatorCount}</span>
            </span>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 text-[11px] font-bold transition cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>{t.btnLeaveStation}</span>
            </button>
          )}
        </div>
      </div>

      {/* Undercover & Chameleon Alerts */}
      {isUndercover && (
        <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs text-cyan-200 flex items-center gap-2.5">
          <Radar className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
          <div>
            <div className="font-black text-cyan-300 font-heading">
              {lang === 'ar' ? 'أنت العميل السري (الملاك الحارس) 🕶️' : 'You are the Undercover Agent 🕶️'}
            </div>
            <div className="text-[11px] text-cyan-200/90">
              {t.undercoverAlert.replace('{spyName}', spyNameForUndercover)}
            </div>
          </div>
        </div>
      )}

      {isChameleonSpy && (
        <div className="p-2.5 rounded-2xl bg-emerald-950/50 border border-emerald-400/50 text-[11px] text-emerald-200 flex items-center gap-2 shadow-md">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.chameleonDecoyHint}</span>
        </div>
      )}

      {/* MAIN SPACE COUNCIL MEETING TABLE (Matching uploaded visual directly) */}
      <div className="relative w-full rounded-3xl bg-gradient-to-b from-slate-950 via-[#070e20] to-slate-950 border border-sky-500/40 p-3 sm:p-6 shadow-[0_0_50px_rgba(14,165,233,0.15)] overflow-hidden">
        {/* Animated Cosmic Background Grid & Nebulas */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Circular Table Stage */}
        <div className="relative z-10 space-y-6">
          {/* Top Half Astronaut Seats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 justify-items-center">
            {activeUids.slice(0, Math.ceil(activeUids.length / 2)).map(uid => {
              const p = playersObj[uid];
              const isTurn = uid === currentTurnUid;
              const bubble = speechBubbles[uid];
              const isSilenced = !!p?.isSilenced;
              return (
                <div key={uid} className="relative flex flex-col items-center group w-full max-w-[170px]">
                  {/* Speech Bubble Floating Over Astronaut Seat */}
                  {bubble && (
                    <div className="absolute -top-12 z-30 animate-in zoom-in-75 slide-in-from-bottom-2 duration-200 max-w-[160px]">
                      <div className="relative px-3 py-1.5 rounded-2xl bg-white text-slate-950 text-[11px] sm:text-xs font-black shadow-[0_4px_20px_rgba(255,255,255,0.4)] border border-sky-400 text-center break-words">
                        {bubble.text}
                        {/* Speech Pointer Tail */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* Astronaut Space Pod / Hover Seat */}
                  <div
                    className={`relative w-full p-2.5 rounded-2xl border transition-all flex flex-col items-center text-center ${
                      isTurn
                        ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-105'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Glowing Thrusters at the Back of the Seat */}
                    <div className="absolute -top-1.5 flex gap-3">
                      <div
                        className={`w-2 h-2 rounded-full blur-[2px] transition ${
                          isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/50'
                        }`}
                      />
                      <div
                        className={`w-2 h-2 rounded-full blur-[2px] transition ${
                          isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/50'
                        }`}
                      />
                    </div>

                    {/* Astronaut Avatar & Visor */}
                    <div className="relative my-1">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p?.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 transition-all ${
                          isTurn
                            ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] ring-2 ring-sky-300'
                            : 'border-slate-700'
                        }`}
                      />
                      {isTurn && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-500 text-slate-950 shadow-md animate-bounce">
                          <Mic className="w-3 h-3" />
                        </div>
                      )}
                      {isSilenced && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md">
                          <MuteIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Holographic Cockpit Screen in Front of Player */}
                    <div className="w-full px-1.5 py-0.5 mt-1 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-center gap-1 shadow-inner">
                      <span className="text-[11px] font-black text-sky-200 truncate max-w-[100px]">
                        {p?.name || 'Agent'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CENTER TABLE HUB & HOLOGRAPHIC CONSOLE */}
          <div className="relative mx-auto max-w-lg p-5 sm:p-6 rounded-3xl bg-slate-900/90 border-2 border-sky-400/50 shadow-[0_0_40px_rgba(56,189,248,0.25)] text-center space-y-4 backdrop-blur-2xl">
            {/* Table Name Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-[11px] font-bold text-sky-300 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>{lang === 'ar' ? 'محطة الجواسيس - غرفة العمليات' : 'Spy Station Operations Hub'}</span>
            </div>

            {/* Current Turn Banner */}
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${isMyTurn ? 'bg-sky-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  <Mic className="w-4 h-4" />
                </div>
                <div className="text-start">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">
                    {lang === 'ar' ? 'دور اللاعب:' : 'Current Speaker:'}
                  </div>
                  <div className="text-xs sm:text-sm font-black text-white">
                    {isMyTurn ? t.lblYourTurn : currentSpeaker}
                  </div>
                </div>
              </div>

              {/* Digital Countdown Timer */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-sky-500/30 font-mono text-sm sm:text-base font-black text-sky-400 shadow-inner">
                <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-sky-400'}`} />
                <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
              </div>
            </div>

            {/* Secret Word & Card Reveal Console */}
            <div className="relative">
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  amSpectator
                    ? 'bg-slate-950/70 border-slate-700 text-slate-400'
                    : isSpy && !isChameleonSpy
                    ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
                    : 'bg-sky-950/40 border-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    {amSpectator ? t.lblSpectatorTag : isSpy && !isChameleonSpy ? t.youAreSpy : t.theWordIs}
                  </span>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsWordRevealed(r => !r);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition"
                    title={isWordRevealed ? 'Hide' : 'Reveal'}
                  >
                    {isWordRevealed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isWordRevealed ? (
                  amSpectator ? (
                    <div className="py-2 text-xs font-bold text-slate-400">{t.lblSpectatorTag}</div>
                  ) : isSpy && !isChameleonSpy ? (
                    <div className="space-y-1 py-1">
                      <div className="text-xl sm:text-2xl font-black text-rose-400 font-heading">
                        {t.youAreSpy} 🕵️
                      </div>
                      <p className="text-xs text-rose-300/80">
                        {lang === 'ar' ? 'اسمع التلميحات وخمن الكلمة دون أن تُكشف!' : 'Blend in and guess the word!'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-1">
                      <WordVisualCard
                        wordEn={room.word}
                        wordAr={room.wordAr}
                        category={room.wordCategory}
                        imageUrl={room.wordImage}
                        size="md"
                      />
                      <div className="text-start">
                        {room.wordCategory && (
                          <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                            <span>{CATEGORY_STYLES[room.wordCategory]?.icon}</span>
                            <span>
                              {lang === 'ar'
                                ? CATEGORY_STYLES[room.wordCategory]?.titleAr
                                : CATEGORY_STYLES[room.wordCategory]?.titleEn}
                            </span>
                          </div>
                        )}
                        <div className="text-xl sm:text-2xl font-black text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] font-heading">
                          {displayWord}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="py-2 text-xs font-bold text-slate-500 italic">
                    {lang === 'ar' ? 'تم حجب البطاقة (اضغط للإظهار)' : 'Word hidden (tap to reveal)'}
                  </div>
                )}
              </div>
            </div>

            {/* Silent Mode Canvas */}
            {room.gameMode === 'silent' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 justify-center">
                  <Brush className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t.lblSilentDrawHint}</span>
                </div>

                <canvas
                  ref={canvasRef}
                  width={320}
                  height={160}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  className={`w-full aspect-[2/1] rounded-2xl bg-slate-950/90 border border-sky-400/40 touch-none block ${
                    isMyTurn ? 'cursor-crosshair shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'cursor-default'
                  }`}
                />

                {isMyTurn && (
                  <div className="flex gap-2">
                    <button
                      onClick={clearCanvas}
                      className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.btnClearDrawing}</span>
                    </button>
                    <button
                      onClick={finishDrawingTurn}
                      className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1 transition cursor-pointer shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.btnDoneDrawing}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tactical Sabotage Trigger Buttons */}
            {room.gameMode === 'sabotage' && !amSpectator && (
              <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
                <div className="text-start space-y-0.5">
                  <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                    {t.lblYourSabotageAbility}
                  </div>
                  <div className="text-xs font-black text-white">
                    {myPlayer.sabotageAbility === 'thermal_scan'
                      ? t.sabotageThermalScan
                      : myPlayer.sabotageAbility === 'silence_hack'
                      ? t.sabotageSilenceHack
                      : myPlayer.sabotageAbility === 'silver_bullet'
                      ? t.sabotageSilverBullet
                      : t.sabotageSignalScramble}
                    {myPlayer.sabotageUsed ? ` (${t.lblSabotageUsed})` : ''}
                  </div>
                </div>

                <button
                  disabled={!!myPlayer.sabotageUsed}
                  onClick={() => {
                    const ab = myPlayer.sabotageAbility || 'thermal_scan';
                    setActiveSabotageModal(ab);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md ${
                    myPlayer.sabotageUsed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-110 active:scale-95'
                  }`}
                >
                  {t.btnUseSabotage}
                </button>
              </div>
            )}

            {/* Emergency Vote Button on Center Table (Visible on turn) */}
            {!amSpectator && isMyTurn && (
              <button
                onClick={onTriggerEmergencyVote}
                className="w-full py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-lg animate-pulse"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{t.btnEmergencyVote}</span>
              </button>
            )}
          </div>

          {/* Bottom Half Astronaut Seats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 justify-items-center">
            {activeUids.slice(Math.ceil(activeUids.length / 2)).map(uid => {
              const p = playersObj[uid];
              const isTurn = uid === currentTurnUid;
              const bubble = speechBubbles[uid];
              const isSilenced = !!p?.isSilenced;
              return (
                <div key={uid} className="relative flex flex-col items-center group w-full max-w-[170px]">
                  {/* Speech Bubble */}
                  {bubble && (
                    <div className="absolute -top-12 z-30 animate-in zoom-in-75 slide-in-from-bottom-2 duration-200 max-w-[160px]">
                      <div className="relative px-3 py-1.5 rounded-2xl bg-white text-slate-950 text-[11px] sm:text-xs font-black shadow-[0_4px_20px_rgba(255,255,255,0.4)] border border-sky-400 text-center break-words">
                        {bubble.text}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* Astronaut Space Pod / Hover Seat */}
                  <div
                    className={`relative w-full p-2.5 rounded-2xl border transition-all flex flex-col items-center text-center ${
                      isTurn
                        ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-105'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="absolute -top-1.5 flex gap-3">
                      <div
                        className={`w-2 h-2 rounded-full blur-[2px] transition ${
                          isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/50'
                        }`}
                      />
                      <div
                        className={`w-2 h-2 rounded-full blur-[2px] transition ${
                          isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/50'
                        }`}
                      />
                    </div>

                    <div className="relative my-1">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p?.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 transition-all ${
                          isTurn
                            ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.8)] ring-2 ring-sky-300'
                            : 'border-slate-700'
                        }`}
                      />
                      {isTurn && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-500 text-slate-950 shadow-md animate-bounce">
                          <Mic className="w-3 h-3" />
                        </div>
                      )}
                      {isSilenced && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md">
                          <MuteIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="w-full px-1.5 py-0.5 mt-1 rounded-lg bg-sky-950/60 border border-sky-500/30 flex items-center justify-center gap-1 shadow-inner">
                      <span className="text-[11px] font-black text-sky-200 truncate max-w-[100px]">
                        {p?.name || 'Agent'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK SPEECH REACTION CHIPS (Directly inspired by speech bubbles in the photo) */}
      <div className="space-y-2 p-3 sm:p-4 rounded-3xl bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span>{lang === 'ar' ? 'فقاعات تفاعلية سريعة 💬:' : 'Quick Reaction Bubbles 💬:'}</span>
          <span className="text-[10px] text-sky-400">
            {lang === 'ar' ? 'تظهر مباشرة فوق مقعدك الفضائي' : 'Pops up above your space pod'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_REACTIONS.map((reaction, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendSpeechBubble(reaction)}
              className="px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-sky-500/20 border border-slate-700 hover:border-sky-400 text-slate-200 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
            >
              {reaction}
            </button>
          ))}
        </div>

        {/* Clue Input Form */}
        {room.gameMode !== 'silent' && (
          <form onSubmit={handleClueSubmit} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              disabled={!isMyTurn || !!myPlayer.isSilenced}
              value={clueInput}
              onChange={e => setClueInput(e.target.value)}
              placeholder={
                myPlayer.isSilenced
                  ? lang === 'ar'
                    ? 'أنت مكتوم! اختر إيموجي للتلميح'
                    : 'Silenced! Use emoji clues below'
                  : isMyTurn
                  ? t.lblChatPlaceholder
                  : t.lblWaitingForTurn.replace('{name}', currentSpeaker)
              }
              className={`flex-1 py-2 px-3.5 rounded-xl border text-xs outline-none transition ${
                isMyTurn && !myPlayer.isSilenced
                  ? 'bg-slate-950/90 border-sky-400/50 text-white focus:border-sky-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            />
            <button
              type="submit"
              disabled={!isMyTurn || !!myPlayer.isSilenced}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer ${
                isMyTurn && !myPlayer.isSilenced
                  ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Emoji Clue Shortcuts if silenced */}
        {isMyTurn && myPlayer.isSilenced && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-rose-300">
              {lang === 'ar' ? 'تلميح إيموجي إجباري:' : 'Forced Emoji Clue:'}
            </span>
            {['🍕', '⚽', '🚗', '🦁', '🎬', '🎮', '✈️', '⚡'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClue(emoji)}
                className="p-1 text-base hover:scale-125 transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mole Network Private Spy Comms */}
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

      {/* Sabotage Action Modal */}
      {activeSabotageModal && (
        <SabotageActionModal
          lang={lang}
          currentUserUid={currentUserUid}
          ability={activeSabotageModal}
          turnOrder={turnOrder}
          players={playersObj}
          isOpen={!!activeSabotageModal}
          onClose={() => setActiveSabotageModal(null)}
          onExecute={handleExecuteSabotage}
          onExecuteScramble={handleExecuteScramble}
        />
      )}
    </div>
  );
};
