import React from 'react';
import { dictionary } from '../translations';
import { Language, RoomData } from '../types';
import { CATEGORY_META } from '../words';
import { Globe, Users, Play, Eye } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  publicRooms: Record<string, RoomData>;
  onJoinRoom: (code: string) => void;
}

export const StationsTab: React.FC<Props> = ({ lang, publicRooms, onJoinRoom }) => {
  const t = dictionary[lang];
  const roomCodes = Object.keys(publicRooms || {}).filter(code => {
    const room = publicRooms[code];
    if (!room || room.visibility !== 'public' || !room.players) return false;
    const playersList = Object.values(room.players);
    if (playersList.length === 0) return false;
    const maxPlayers = room.maxPlayers || 20;
    const isFull = playersList.length >= maxPlayers;
    const isWaiting = room.status === 'waiting';
    return isWaiting && !isFull;
  });

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-28 pt-2">
      <div className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 font-heading">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{t.activeStationsTitle}</span>
          </h2>
          <span className="text-xs font-mono tabular-nums font-bold text-slate-400">
            {roomCodes.length} {t.lblStationsCount}
          </span>
        </div>

        <div className="space-y-3">
          {roomCodes.length > 0 ? (
            roomCodes.map(code => {
              const room = publicRooms[code];
              const playersObj = room.players || {};
              const activeCount = Object.values(playersObj).filter(p => !p.isSpectator).length;
              const maxPlayers = room.maxPlayers || 20;
              const isPlaying = room.status === 'playing' || room.status === 'voting';

              const cats = room.categories || [];
              const catNames = cats
                .map(c => {
                  const meta = CATEGORY_META[c];
                  const label = meta ? t[meta.key as keyof typeof t] || c : c;
                  return meta?.icon ? `${meta.icon} ${label}` : label;
                })
                .join(' · ');

              const hostName =
                (room.hostUid && playersObj[room.hostUid]?.name) || 'Commander';

              return (
                <div
                  key={code}
                  className="p-4 rounded-xl bg-slate-950/75 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 text-start min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono tabular-nums font-black text-sky-400 text-sm tracking-wider shrink-0">
                        #{code}
                      </span>
                      <span className="text-xs text-slate-300 font-semibold truncate max-w-[260px]">
                        {catNames || `🎲 ${t.catRandom}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className={`font-semibold ${isPlaying ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isPlaying ? t.lblRoomStatusInProgress : t.lblRoomStatusWaiting}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono tabular-nums">
                        <Users className="w-3.5 h-3.5" />
                        <span>{activeCount}/{maxPlayers}</span>
                      </span>
                      <span className="hidden sm:inline text-slate-500 truncate max-w-[140px]">
                        · {t.lblHostTag}: {hostName}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTone(500, 'sine', 0.1);
                      sound.triggerHaptic('light');
                      onJoinRoom(code);
                    }}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                      isPlaying
                        ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                        : 'bg-sky-400 text-slate-950 hover:bg-sky-300 active:scale-[0.98]'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.btnJoinAsSpectator}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>{t.joinRoom}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-sm text-slate-500 space-y-2.5">
              <Globe className="w-8 h-8 text-slate-600 mx-auto" />
              <div>{t.searchingStations}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
