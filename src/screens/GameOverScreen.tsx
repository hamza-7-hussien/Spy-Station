import React, { useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData } from '../types';
import confetti from 'canvas-confetti';
import { sound } from '../audio';
import { WordVisualCard } from '../components/WordVisualCard';
import { CATEGORY_STYLES } from '../wordVisuals';
import { Trophy, RotateCcw, LogOut, Shield, Users } from 'lucide-react';

interface Props {
  lang: Language;
  room: RoomData;
  onReturnToLobby: () => void;
  onLeaveRoom: () => void;
}

export const GameOverScreen: React.FC<Props> = ({
  lang,
  room,
  onReturnToLobby,
  onLeaveRoom
}) => {
  const t = dictionary[lang];
  const winner = room.winnerTeam;
  const isCrewWinner = winner === 'crew';

  // Real-time merge: always reflect live player state (like postGame: 'inLobby')
  const currentPlayers = room.players || {};
  const finalPlayers = room.finalPlayers || {};
  const allPlayers: Record<string, PlayerData> = {};
  const allUids = Array.from(new Set([...Object.keys(finalPlayers), ...Object.keys(currentPlayers)]));
  allUids.forEach(uid => {
    allPlayers[uid] = {
      ...(finalPlayers[uid] || {}),
      ...(currentPlayers[uid] || {})
    };
  });

  const spyUids = room.finalSpies || room.spies || [];

  useEffect(() => {
    // Fire celebratory confetti & chime
    sound.playChime([[523, 0, 0.15], [659, 120, 0.15], [784, 240, 0.35]], 'sine');
    sound.triggerHaptic('heavy');

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 pt-4 text-start">
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-sky-500/30 backdrop-blur-2xl shadow-2xl space-y-5 text-center">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-gradient-to-tr from-sky-500 to-purple-500 shadow-[0_0_30px_rgba(56,189,248,0.5)]">
          <Trophy className="w-8 h-8 text-slate-950 fill-current" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-300 to-sky-400 animate-shine">
          {isCrewWinner ? t.crewWonTitle : t.spiesWonTitle}
        </h2>

        {/* Revealed Secret Word Card */}
        {(room.word || room.wordAr) && (
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-sky-500/30 flex items-center justify-center gap-3.5 shadow-inner">
            <WordVisualCard
              wordEn={room.word}
              wordAr={room.wordAr}
              category={room.wordCategory}
              imageUrl={room.wordImage}
              size="md"
            />
            <div className="text-start">
              <span className="text-[10px] uppercase tracking-widest text-sky-400 font-bold block">
                {lang === 'ar' ? 'الكلمة السرية للمهمة كانت' : 'Mission secret word was'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {room.wordCategory && (
                  <span className="text-xs text-sky-300/80 font-bold">
                    {CATEGORY_STYLES[room.wordCategory]?.icon}
                  </span>
                )}
                <span className="text-xl sm:text-2xl font-black text-white font-heading">
                  {lang === 'ar' ? room.wordAr || room.word : room.word || room.wordAr}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Spies Team */}
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-start space-y-2">
          <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>{t.spiesTeamLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {spyUids.map(uid => {
              const p = allPlayers[uid];
              if (!p) return null;
              const isInLobby = p.postGame === 'inLobby';
              return (
                <div
                  key={uid}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-rose-500/30 text-xs"
                >
                  <img
                    src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                    alt={p.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span className="font-bold text-slate-200">{p.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                      isInLobby
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isInLobby ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    <span>{isInLobby ? t.lblInLobbyTag : t.lblInGameTag}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crew Team */}
        <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 text-start space-y-2">
          <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{t.crewTeamLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.keys(allPlayers)
              .filter(uid => !spyUids.includes(uid))
              .map(uid => {
                const p = allPlayers[uid];
                if (!p) return null;
                const isInLobby = p.postGame === 'inLobby';
                return (
                  <div
                    key={uid}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-sky-500/30 text-xs"
                  >
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                      alt={p.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                    <span className="font-bold text-slate-200">{p.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                        isInLobby
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isInLobby ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                      <span>{isInLobby ? t.lblInLobbyTag : t.lblInGameTag}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <button
            onClick={onReturnToLobby}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.btnReturnLobby}</span>
          </button>

          <button
            onClick={onLeaveRoom}
            className="py-3 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.btnLeaveGame}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
