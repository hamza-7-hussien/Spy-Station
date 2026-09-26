import React, { useState, useRef, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData } from '../types';
import { sound } from '../audio';
import { db } from '../firebase';
import { WordVisualCard } from '../components/WordVisualCard';
import { CATEGORY_STYLES } from '../wordVisuals';
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
  LogOut
} from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  onAdvanceTurn: () => void;
  onTriggerEmergencyVote: () => void;
  onUseSabotageCard: () => void;
  onOpenSabotageSwap: () => void;
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
  onUseSabotageCard,
  onOpenSabotageSwap,
  onSendGameClue,
  onSendSpyChat,
  onToast,
  onLeaveRoom
}) => {
  const [clueInput, setClueInput] = useState('');
  const [spyInput, setSpyInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const t = dictionary[lang];
  const playersObj = room.players || {};
  const myPlayer = playersObj[currentUserUid] || ({} as PlayerData);
  const amSpectator = !!myPlayer.isSpectator;
  const isSpy = (room.spies || []).includes(currentUserUid);

  const displayWord =
    lang === 'ar' ? room.wordAr || room.word : room.word || room.wordAr;

  const turnOrder = room.turnOrder || [];
  const turnIndex = room.turnIndex || 0;
  const currentTurnUid = turnOrder[turnIndex];
  const currentSpeaker = playersObj[currentTurnUid]?.name || '...';
  const isMyTurn = !amSpectator && currentTurnUid === currentUserUid;

  const currentRound = room.round || 1;
  const timeLeft = room.turnTimeLeft != null ? room.turnTimeLeft : room.turnSeconds || 20;

  // Fellow spies in Mole mode
  const fellowSpies = (room.spies || [])
    .filter(uid => uid !== currentUserUid)
    .map(uid => playersObj[uid]?.name)
    .filter(Boolean);

  // Spectator count
  const spectatorCount = Object.values(playersObj).filter(p => p.isSpectator).length;

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
    sound.playTone(300, 'sine', 0.1);
    db.ref(`spy_rooms/${roomCode}/currentDrawing`).set(null);
  };

  const finishDrawingTurn = () => {
    if (!isMyTurn) return;
    sound.playTone(500, 'triangle', 0.1);
    onAdvanceTurn();
  };

  const handleClueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    onSendGameClue(clean);
    setClueInput('');
  };

  const handleSpySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spyInput.trim()) {
      onSendSpyChat(spyInput.trim());
      setSpyInput('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 pt-2 text-start">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-sky-500/30 backdrop-blur-2xl shadow-2xl space-y-4">
        {/* Round Header */}
        <div className="flex items-center justify-between text-xs font-bold text-purple-400">
          <span className="font-heading tracking-widest uppercase">
            {t.lblRound} {currentRound}
          </span>

          <div className="flex items-center gap-2">
            {spectatorCount > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                <Eye className="w-3.5 h-3.5" />
                <span>{spectatorCount}</span>
              </span>
            )}

            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 text-[11px] font-bold transition cursor-pointer"
                title={t.btnLeaveStation}
              >
                <LogOut className="w-3 h-3" />
                <span>{t.btnLeaveStation}</span>
              </button>
            )}
          </div>
        </div>

        {/* Secret Role / Word Card */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border text-center transition-all ${
            amSpectator
              ? 'bg-slate-950/70 border-slate-700 text-slate-400'
              : isSpy
              ? 'bg-rose-950/40 border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.35)]'
              : 'bg-sky-950/40 border-sky-400/50 shadow-[0_0_25px_rgba(56,189,248,0.35)]'
          }`}
        >
          {amSpectator ? (
            <div className="text-base font-bold text-slate-400">{t.lblSpectatorTag}</div>
          ) : isSpy ? (
            <div className="space-y-1">
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-heading">
                {t.youAreSpy}
              </div>
              <p className="text-xs text-rose-300/80">
                {lang === 'ar' ? 'اسمع التلميحات وخمن الكلمة!' : 'Listen carefully & blend in!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-widest text-sky-400 font-bold">
                {t.theWordIs}
              </div>
              <div className="flex items-center justify-center gap-3 sm:gap-4 my-1">
                {/* Visual card for word (Jobs strictly excluded) */}
                <WordVisualCard
                  wordEn={room.word}
                  wordAr={room.wordAr}
                  category={room.wordCategory}
                  imageUrl={room.wordImage}
                  size="md"
                />
                <div className="text-start">
                  {room.wordCategory && (
                    <div className="text-[11px] font-bold text-sky-400/90 mb-0.5 flex items-center gap-1">
                      <span>{CATEGORY_STYLES[room.wordCategory]?.icon}</span>
                      <span>
                        {lang === 'ar'
                          ? CATEGORY_STYLES[room.wordCategory]?.titleAr
                          : CATEGORY_STYLES[room.wordCategory]?.titleEn}
                      </span>
                    </div>
                  )}
                  <div className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] font-heading leading-tight">
                    {displayWord}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mole Network Fellow Spies */}
        {isSpy && !amSpectator && room.gameMode === 'mole' && (
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-xs text-purple-200">
            <span className="font-bold">{t.lblFellowSpies} </span>
            <span>{fellowSpies.length > 0 ? fellowSpies.join(', ') : t.lblNone}</span>
          </div>
        )}

        {/* Turn Status Box */}
        <div
          className={`p-3.5 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all flex items-center justify-between ${
            isMyTurn
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.35)] animate-pulse'
              : 'bg-slate-950/60 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${isMyTurn ? 'text-sky-400 animate-bounce' : 'text-slate-500'}`} />
            {currentTurnUid && playersObj[currentTurnUid] && (
              <img
                src={playersObj[currentTurnUid]?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentTurnUid}`}
                alt={currentSpeaker}
                className="w-5 h-5 rounded-full object-cover border border-sky-400/40 shrink-0"
              />
            )}
            <span>
              {isMyTurn ? t.lblYourTurn : t.lblWaitingForTurn.replace('{name}', currentSpeaker)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-sky-400 font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Sabotage Card Box */}
        {room.gameMode === 'sabotage' && !amSpectator && myPlayer.sabotageCard && (
          <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-purple-300 block">
                {t.lblYourSabotageCard}
              </span>
              <span className="text-xs font-bold text-white">
                {t[`card${myPlayer.sabotageCard === 'revote' ? 'Revote' : myPlayer.sabotageCard === 'immunity' ? 'Immunity' : 'Swap'}` as keyof typeof t]}
                {myPlayer.sabotageUsed ? ` (${t.lblCardUsed})` : ''}
              </span>
            </div>

            <button
              disabled={!!myPlayer.sabotageUsed}
              onClick={() => {
                if (myPlayer.sabotageCard === 'swap') onOpenSabotageSwap();
                else onUseSabotageCard();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                myPlayer.sabotageUsed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:brightness-110 active:scale-95 shadow-md'
              }`}
            >
              {t.btnUseCard}
            </button>
          </div>
        )}

        {/* Emergency Vote Button - Only visible when it's your turn */}
        {!amSpectator && isMyTurn && (
          <button
            onClick={onTriggerEmergencyVote}
            className="w-full py-2.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>{t.btnEmergencyVote}</span>
          </button>
        )}

        {/* Silent Station Live Canvas */}
        {room.gameMode === 'silent' && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Brush className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.lblSilentDrawHint}</span>
            </div>

            <canvas
              ref={canvasRef}
              width={320}
              height={180}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className={`w-full aspect-[16/9] rounded-2xl bg-slate-950/90 border border-sky-400/30 touch-none block ${
                isMyTurn ? 'cursor-crosshair shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'cursor-default'
              }`}
            />

            {isMyTurn && (
              <div className="flex gap-2">
                <button
                  onClick={clearCanvas}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.btnClearDrawing}</span>
                </button>
                <button
                  onClick={finishDrawingTurn}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t.btnDoneDrawing}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Regular Game Clues Chat */}
        {room.gameMode !== 'silent' && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="h-28 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              {room.gameChat && Object.values(room.gameChat).length > 0 ? (
                Object.values(room.gameChat).map((msg, i) => (
                  <div key={i} className="p-1.5 rounded-xl bg-slate-900/60 leading-relaxed">
                    <span className="font-bold text-sky-400 me-1.5">{msg.sender}:</span>
                    <span className="text-slate-100 font-bold">{msg.text}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-6 text-xs">
                  {lang === 'ar' ? 'تلميحات اللاعبين ستظهر هنا كلمة بكلمة 🎤' : 'Player clues will appear here turn-by-turn 🎤'}
                </div>
              )}
            </div>

            <form onSubmit={handleClueSubmit} className="flex gap-2">
              <input
                type="text"
                disabled={!isMyTurn}
                value={clueInput}
                onChange={e => setClueInput(e.target.value)}
                placeholder={isMyTurn ? t.lblChatPlaceholder : t.lblWaitingForTurn.replace('{name}', currentSpeaker)}
                className={`flex-1 py-2.5 px-3.5 rounded-xl border text-xs outline-none transition ${
                  isMyTurn
                    ? 'bg-slate-950/90 border-sky-400/50 text-white focus:border-sky-400'
                    : 'bg-slate-950/40 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              />
              <button
                type="submit"
                disabled={!isMyTurn}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center ${
                  isMyTurn
                    ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 cursor-pointer shadow-md'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Mole Network Private Spy Chat */}
        {isSpy && !amSpectator && room.gameMode === 'mole' && (
          <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2 mt-3">
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
      </div>
    </div>
  );
};
