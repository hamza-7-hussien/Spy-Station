import React, { useEffect } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData } from '../types';
import confetti from 'canvas-confetti';
import { sound } from '../audio';
import { getSecretWordDisplay } from '../words';
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
    if (isCrewWinner) {
      sound.playVictoryCelebration();
    } else {
      sound.playSpyRevealSting();
    }

    try {
      confetti({
        particleCount: isCrewWinner ? 90 : 45,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  }, [isCrewWinner]);

  const catStyle = room.wordCategory ? CATEGORY_STYLES[room.wordCategory] : undefined;
  const chameleonSpy =
    room.gameMode === 'chameleon'
      ? spyUids.map(uid => allPlayers[uid]).find(p => p && (p.chameleonWord || p.chameleonWordAr))
      : null;
  const decoyDisplay = chameleonSpy
    ? getSecretWordDisplay(chameleonSpy.chameleonWord, chameleonSpy.chameleonWordAr, room.wordCategory, lang)
    : '';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-20 pt-4 text-start">
      <div className="p-6 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl space-y-5 text-center">
        <div
          className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border ${
            isCrewWinner
              ? 'bg-sky-400/15 border-sky-400/40 text-sky-400'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
          }`}
        >
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
          {isCrewWinner ? t.crewWonTitle : t.spiesWonTitle}
        </h2>

        {/* Revealed Secret Word */}
        {(room.word || room.wordAr) && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-1.5 text-center">
            <span className="text-xs text-sky-400 font-bold">
              {t.secretWordWas}
            </span>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {catStyle?.icon && (
                <span className="text-xl leading-none" aria-hidden="true">
                  {catStyle.icon}
                </span>
              )}
              <span className="text-2xl sm:text-3xl font-black text-white font-heading break-words">
                {getSecretWordDisplay(room.word, room.wordAr, room.wordCategory, lang)}
              </span>
            </div>
            {decoyDisplay && (
              <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/35 text-xs text-emerald-300 font-bold">
                {t.decoyWordLabel} {decoyDisplay}
              </div>
            )}
          </div>
        )}

        {/* Teams Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
          {/* Spies Team */}
          <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/30 space-y-2.5">
            <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>{t.spiesTeamLabel}</span>
            </div>

            <div className="space-y-2">
              {spyUids.map(uid => {
                const p = allPlayers[uid];
                if (!p) return null;
                const isInLobby = p.postGame === 'inLobby';
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                      <span className="font-bold text-slate-100 truncate">{p.name}</span>
                    </div>
                    <span className={`text-[11px] font-semibold shrink-0 ${isInLobby ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isInLobby ? t.lblInLobbyTag : t.lblInGameTag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crew Team */}
          <div className="p-4 rounded-xl bg-sky-950/25 border border-sky-500/30 space-y-2.5">
            <div className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{t.crewTeamLabel}</span>
            </div>

            <div className="space-y-2">
              {Object.keys(allPlayers)
                .filter(uid => !spyUids.includes(uid))
                .map(uid => {
                  const p = allPlayers[uid];
                  if (!p) return null;
                  const isInLobby = p.postGame === 'inLobby';
                  return (
                    <div
                      key={uid}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-lg object-cover shrink-0"
                        />
                        <span className="font-bold text-slate-100 truncate">{p.name}</span>
                      </div>
                      <span className={`text-[11px] font-semibold shrink-0 ${isInLobby ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isInLobby ? t.lblInLobbyTag : t.lblInGameTag}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onReturnToLobby}
            className="min-h-[46px] py-2.5 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.btnReturnLobby}</span>
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="min-h-[46px] py-2.5 px-4 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/35 text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.btnLeaveGame}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
