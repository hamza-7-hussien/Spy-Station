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
  HelpCircle,
  RotateCw,
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
  const [isCardFlipped, setIsCardFlipped] = useState(false);
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

  // Audio timer heartbeat pulse
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

    await db.ref(`spy_rooms/${roomCode}/players/${currentUserUid}`).update({
      sabotageUsed: true
    });

    if (ability === 'thermal_scan') {
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

  // Quick reactions list (comic & expressive, exactly like famous Arabic party games)
  const QUICK_REACTIONS = [
    'والله بريء! 😇',
    'شاكك فيك جداً! 🧐',
    'منين جبت الكلام ده؟ 🤔',
    'أنا مش الجاسوس! ✋',
    'ركزوا في التلميحات! 🔍',
    'مين الجاسوس؟! 🚨',
    'واثق من كلامي! 😎',
    'كلامك مريب! 🤨'
  ];

  // Active players list
  const activeUids = (turnOrder.length > 0 ? turnOrder : Object.keys(playersObj)).filter(
    uid => playersObj[uid] && !playersObj[uid].isSpectator
  );

  // Group players around the Oval table into Top Arc (North), Side Flanks (West & East), and Bottom Arc (South)
  const totalCount = activeUids.length;
  const topCount = Math.max(1, Math.ceil(totalCount / 2));
  const topUids = activeUids.slice(0, topCount);
  const bottomUids = activeUids.slice(topCount);

  // Flip card handler
  const handleFlipCard = () => {
    sound.playClick();
    sound.triggerHaptic('medium');
    setIsCardFlipped(prev => !prev);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-3 pb-20 pt-1 text-start select-none relative z-10">
      {/* Top Station HUD Header */}
      <div className="flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-900/90 border border-sky-500/30 backdrop-blur-xl shadow-lg text-xs font-bold">
        <div className="flex items-center gap-2 text-sky-400">
          <Radar className="w-4 h-4 animate-spin text-sky-400" style={{ animationDuration: '6s' }} />
          <span className="font-heading uppercase tracking-widest text-[11px] sm:text-xs text-white">
            {lang === 'ar' ? 'طاولة الاجتماع الفضائية' : 'Space Council Table'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-[10px]">
            {t.lblRound} {currentRound}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
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
        <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-xs text-cyan-200 flex items-center gap-2">
          <Radar className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
          <div>
            <span className="font-bold text-cyan-300">{lang === 'ar' ? 'العميل السري: ' : 'Undercover: '}</span>
            <span>{t.undercoverAlert.replace('{spyName}', spyNameForUndercover)}</span>
          </div>
        </div>
      )}

      {isChameleonSpy && (
        <div className="p-2 rounded-2xl bg-emerald-950/50 border border-emerald-400/50 text-[11px] text-emerald-200 flex items-center gap-2 shadow-md">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{t.chameleonDecoyHint}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🛸 THE GRAND SPACE COUNCIL OVAL MEETING TABLE (Authentic Design) */}
      {/* ============================================================== */}
      <div className="relative w-full rounded-[40px] sm:rounded-[50px] bg-gradient-to-b from-slate-950 via-[#060c1d] to-[#02050e] border-2 border-sky-500/30 p-4 sm:p-8 shadow-[0_0_60px_rgba(14,165,233,0.18)] overflow-hidden">
        {/* Deep space starlight nebula backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[75%] rounded-[100px] border border-sky-400/10 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-between min-h-[460px] sm:min-h-[500px]">
          {/* ================= TOP ARC ASTRONAUT SEATS ================= */}
          <div className="w-full flex items-center justify-around gap-2 pb-2">
            {topUids.map(uid => {
              const p = playersObj[uid];
              const isTurn = uid === currentTurnUid;
              const bubble = speechBubbles[uid];
              const isSilenced = !!p?.isSilenced;
              return (
                <div key={uid} className="relative flex flex-col items-center group">
                  {/* Dramatic Overhead Spotlight Beam When It's Player's Turn */}
                  {isTurn && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-40 bg-gradient-to-b from-sky-400/40 via-sky-400/10 to-transparent pointer-events-none blur-sm animate-pulse z-0" />
                  )}

                  {/* Floating Speech Bubble Above Astronaut */}
                  {bubble && (
                    <div className="absolute -top-14 z-30 animate-in zoom-in-75 duration-200">
                      <div className="relative px-3 py-1.5 rounded-2xl bg-white text-slate-950 text-xs font-black shadow-[0_4px_25px_rgba(255,255,255,0.6)] border-2 border-sky-400 text-center max-w-[150px] break-words">
                        {bubble.text}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rotate-45 border-r-2 border-b-2 border-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* Astronaut Seat Pod */}
                  <div
                    className={`relative p-2 rounded-3xl border-2 transition-all flex flex-col items-center z-10 ${
                      isTurn
                        ? 'bg-sky-500/25 border-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.7)] scale-110'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Pulsing thruster light on back of seat */}
                    <div
                      className={`absolute -top-1 w-3 h-1.5 rounded-full blur-[2px] transition ${
                        isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/40'
                      }`}
                    />

                    {/* Avatar Portrait */}
                    <div className="relative my-0.5">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p?.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 transition-all ${
                          isTurn ? 'border-sky-300 ring-4 ring-sky-400/50' : 'border-slate-700'
                        }`}
                      />
                      {isTurn && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-400 text-slate-950 shadow-md animate-bounce">
                          <Mic className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {isSilenced && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md">
                          <MuteIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Player Name Pill */}
                    <div className="px-2 py-0.5 mt-1 rounded-full bg-slate-950/90 border border-sky-500/30 flex items-center justify-center gap-1 max-w-[95px] truncate">
                      <span className="text-[10px] sm:text-xs font-black text-sky-200 truncate">
                        {p?.name || 'Agent'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ================= THE OVAL 3D CENTER TABLE ================= */}
          <div className="relative w-full max-w-xl my-auto py-5 px-4 sm:px-8 rounded-[60px] sm:rounded-[80px] bg-gradient-to-b from-[#0e1d3a] via-[#091326] to-[#040813] border-4 border-sky-400/50 shadow-[0_0_50px_rgba(56,189,248,0.25),inset_0_0_40px_rgba(56,189,248,0.15)] flex flex-col items-center justify-center text-center space-y-3.5">
            {/* Table Surface Holographic Radar Lines */}
            <div className="absolute inset-0 rounded-[60px] sm:rounded-[80px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none" />

            {/* Current Turn & Speaker Announcement */}
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/80 border border-sky-400/40 shadow-inner">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-bold text-slate-300">
                  {lang === 'ar' ? 'الدور الآن عند:' : 'Speaking Turn:'}
                </span>
                <span className="text-xs font-black text-sky-300 font-heading">
                  {isMyTurn ? (lang === 'ar' ? 'أنت! (دورك الآن)' : 'YOU! (Your Turn)') : currentSpeaker}
                </span>
              </div>

              {/* Countdown Radar Timer */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-slate-900 border border-sky-500/40 text-sky-400 font-mono text-xs sm:text-sm font-black shadow-inner">
                <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-400 animate-ping' : 'text-sky-400'}`} />
                <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
              </div>
            </div>

            {/* ================= THE BIG FLIP CLEARANCE CARD ================= */}
            <div className="relative w-full max-w-sm">
              <div
                onClick={handleFlipCard}
                className={`relative w-full p-4 rounded-3xl border-2 transition-all duration-300 cursor-pointer select-none ${
                  isCardFlipped
                    ? isSpy && !isChameleonSpy
                      ? 'bg-rose-950/70 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.45)]'
                      : 'bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-sky-400 shadow-[0_0_35px_rgba(56,189,248,0.45)]'
                    : 'bg-slate-950/90 border-slate-700 hover:border-sky-400/70 shadow-lg'
                }`}
              >
                {/* Confidential Stamp / Secret Badge */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>{lang === 'ar' ? 'بطاقة الهوية السرية' : 'Secret Clearance Card'}</span>
                  </span>
                  <span className="text-sky-400 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" />
                    <span>{isCardFlipped ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'كشف' : 'Flip')}</span>
                  </span>
                </div>

                {isCardFlipped ? (
                  amSpectator ? (
                    <div className="py-2 text-xs font-bold text-slate-400">{t.lblSpectatorTag}</div>
                  ) : isSpy && !isChameleonSpy ? (
                    <div className="space-y-1.5 py-1 text-center animate-in zoom-in-90 duration-200">
                      <div className="text-2xl font-black text-rose-400 font-heading tracking-wide">
                        {t.youAreSpy} 🕵️
                      </div>
                      <p className="text-xs font-bold text-rose-300/90">
                        {lang === 'ar' ? 'اسمع التلميحات وخمن الكلمة دون أن تُكشف!' : 'Blend in and guess the word!'}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-1 animate-in zoom-in-90 duration-200">
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
                        <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_0_20px_rgba(56,189,248,0.7)] font-heading">
                          {displayWord}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-black text-sky-300">
                    <HelpCircle className="w-5 h-5 text-sky-400 animate-pulse" />
                    <span>{lang === 'ar' ? 'اضغط هنا لكشف الكلمة السرية 👆' : 'Tap here to reveal secret word 👆'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Silent Drawing Canvas (If in silent mode) */}
            {room.gameMode === 'silent' && (
              <div className="w-full space-y-2 pt-1">
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

            {/* Emergency Vote Button right in the Center Table */}
            {!amSpectator && (
              <button
                onClick={onTriggerEmergencyVote}
                className="py-2 px-5 rounded-full bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 active:scale-95 text-white font-heading font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.5)] transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-white animate-pulse" />
                <span>{lang === 'ar' ? '🚨 كشف الجاسوس / تصويت طارئ' : '🚨 Emergency Accusation Vote'}</span>
              </button>
            )}
          </div>

          {/* ================= BOTTOM ARC ASTRONAUT SEATS ================= */}
          <div className="w-full flex items-center justify-around gap-2 pt-2">
            {bottomUids.map(uid => {
              const p = playersObj[uid];
              const isTurn = uid === currentTurnUid;
              const bubble = speechBubbles[uid];
              const isSilenced = !!p?.isSilenced;
              return (
                <div key={uid} className="relative flex flex-col items-center group">
                  {/* Spotlight Beam */}
                  {isTurn && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-40 bg-gradient-to-b from-sky-400/40 via-sky-400/10 to-transparent pointer-events-none blur-sm animate-pulse z-0" />
                  )}

                  {/* Speech Bubble */}
                  {bubble && (
                    <div className="absolute -top-14 z-30 animate-in zoom-in-75 duration-200">
                      <div className="relative px-3 py-1.5 rounded-2xl bg-white text-slate-950 text-xs font-black shadow-[0_4px_25px_rgba(255,255,255,0.6)] border-2 border-sky-400 text-center max-w-[150px] break-words">
                        {bubble.text}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rotate-45 border-r-2 border-b-2 border-sky-400" />
                      </div>
                    </div>
                  )}

                  {/* Astronaut Seat */}
                  <div
                    className={`relative p-2 rounded-3xl border-2 transition-all flex flex-col items-center z-10 ${
                      isTurn
                        ? 'bg-sky-500/25 border-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.7)] scale-110'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div
                      className={`absolute -top-1 w-3 h-1.5 rounded-full blur-[2px] transition ${
                        isTurn ? 'bg-amber-400 animate-ping' : 'bg-cyan-500/40'
                      }`}
                    />

                    <div className="relative my-0.5">
                      <img
                        src={p?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p?.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 transition-all ${
                          isTurn ? 'border-sky-300 ring-4 ring-sky-400/50' : 'border-slate-700'
                        }`}
                      />
                      {isTurn && (
                        <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-400 text-slate-950 shadow-md animate-bounce">
                          <Mic className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {isSilenced && (
                        <div className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-md">
                          <MuteIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <div className="px-2 py-0.5 mt-1 rounded-full bg-slate-950/90 border border-sky-500/30 flex items-center justify-center gap-1 max-w-[95px] truncate">
                      <span className="text-[10px] sm:text-xs font-black text-sky-200 truncate">
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

      {/* ============================================================== */}
      {/* 💬 BOTTOM INTERACTIVE DOCK (Reactions, Clues & Sabotage) */}
      {/* ============================================================== */}
      <div className="space-y-2 p-3 sm:p-4 rounded-3xl bg-slate-900/95 border border-sky-500/30 backdrop-blur-xl shadow-xl">
        {/* Quick Comic Reaction Chips */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span>{lang === 'ar' ? 'ردود سريعة وفقاعات تفاعلية 💬:' : 'Interactive Reaction Bubbles 💬:'}</span>
          <span className="text-[10px] text-sky-400">
            {lang === 'ar' ? 'تطفو فوراً فوق رأسك' : 'Pops above your avatar'}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {QUICK_REACTIONS.map((reaction, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendSpeechBubble(reaction)}
              className="px-3 py-1.5 rounded-full bg-slate-950 border border-slate-700 hover:border-sky-400 hover:bg-sky-500/20 text-slate-200 hover:text-white text-xs font-black whitespace-nowrap transition active:scale-95 cursor-pointer shadow-sm"
            >
              {reaction}
            </button>
          ))}
        </div>

        {/* Clue Input Form */}
        {room.gameMode !== 'silent' && (
          <form onSubmit={handleClueSubmit} className="flex gap-2 pt-1 border-t border-slate-800">
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
                  ? 'bg-slate-950/90 border-sky-400 text-white focus:ring-1 focus:ring-sky-400'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            />
            <button
              type="submit"
              disabled={!isMyTurn || !!myPlayer.isSilenced}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center cursor-pointer ${
                isMyTurn && !myPlayer.isSilenced
                  ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md hover:brightness-110 active:scale-95'
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

        {/* Tactical Sabotage Trigger (if Sabotage mode) */}
        {room.gameMode === 'sabotage' && !amSpectator && (
          <div className="p-2.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
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
