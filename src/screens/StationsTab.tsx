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
    return room && room.visibility === 'public' && room.players && Object.keys(room.players).length > 0;
  });

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24">
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-sky-400 tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>{t.activeStationsTitle}</span>
          </h2>
          <span className="text-xs font-mono font-bold text-slate-400">
            {roomCodes.length} {lang === 'ar' ? 'محطة' : 'Stations'}
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
                  return meta ? t[meta.key as keyof typeof t] || c : c;
                })
                .join(' + ');

              const hostName =
                (room.hostUid && playersObj[room.hostUid]?.name) || 'Commander';

              return (
                <div
                  key={code}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-sky-400/20 hover:border-sky-400/50 transition flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1 text-start">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sky-400 text-sm tracking-wider">
                        #{code}
                      </span>
                      <span className="text-xs text-purple-300 font-bold truncate max-w-[140px]">
                        ({catNames || t.catRandom})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span
                        className={`flex items-center gap-1 font-bold ${
                          isPlaying ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
                        <span>{isPlaying ? t.lblRoomStatusInProgress : t.lblRoomStatusWaiting}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{activeCount}/{maxPlayers}</span>
                      </span>

                      <span className="text-slate-500 hidden sm:inline">
                        {t.lblHostTag}: {hostName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playTone(500, 'sine', 0.1);
                      sound.triggerHaptic('light');
                      onJoinRoom(code);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 ${
                      isPlaying
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50'
                        : 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-md shadow-sky-500/20'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t.btnJoinAsSpectator}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t.joinRoom}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-sm text-slate-500 space-y-2">
              <Globe className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
              <div>{t.searchingStations}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
