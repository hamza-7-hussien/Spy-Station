import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData, FriendEntry, JoinRequest } from '../types';
import { CATEGORY_META } from '../words';
import { Copy, Users, Settings, UserPlus, Play, LogOut, Send, Crown, Check, X, ShieldAlert } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  isHost: boolean;
  friends: Record<string, FriendEntry>;
  sentRequests: Record<string, boolean>;
  friendRequests: Record<string, unknown>;
  onCopyRoomCode: () => void;
  onOpenEditRoom: () => void;
  onOpenInviteFriends: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onMakeHost: (uid: string) => void;
  onKickPlayer: (uid: string) => void;
  onSendFriendRequest: (uid: string) => void;
  onAcceptFriendRequest: (uid: string) => void;
  onSendChatMessage: (text: string) => void;
  onAcceptJoinRequest?: (uid: string) => void;
  onDeclineJoinRequest?: (uid: string) => void;
}

export const LobbyScreen: React.FC<Props> = ({
  lang,
  currentUserUid,
  roomCode,
  room,
  isHost,
  friends,
  sentRequests,
  friendRequests,
  onCopyRoomCode,
  onOpenEditRoom,
  onOpenInviteFriends,
  onStartGame,
  onLeaveRoom,
  onMakeHost,
  onKickPlayer,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onSendChatMessage,
  onAcceptJoinRequest,
  onDeclineJoinRequest
}) => {
  const [chatMsg, setChatMsg] = useState('');
  const t = dictionary[lang];

  const playersObj = room.players || {};
  const playersArr = Object.values(playersObj);
  const activeCount = playersArr.filter(p => !p.isSpectator).length;
  const maxPlayers = room.maxPlayers || 20;

  const cats = room.categories || [];
  const catNames = cats
    .map(c => {
      const meta = CATEGORY_META[c];
      return meta ? t[meta.key as keyof typeof t] || c : c;
    })
    .join(' + ');

  const pendingRequests = Object.values(room.joinRequests || {}).filter(
    r => r && r.status === 'pending'
  );

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMsg.trim()) {
      sound.triggerHaptic('light');
      onSendChatMessage(chatMsg.trim());
      setChatMsg('');
    }
  };

  const getFriendButton = (uid: string) => {
    if (uid === currentUserUid) return null;
    if (friends && friends[uid]) {
      return (
        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/20">
          {t.tagAlreadyFriend}
        </span>
      );
    }
    if (sentRequests && sentRequests[uid]) {
      return (
        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {t.btnPending}
        </span>
      );
    }
    if (friendRequests && friendRequests[uid]) {
      return (
        <button
          onClick={() => onAcceptFriendRequest(uid)}
          className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full hover:bg-emerald-500/30 transition cursor-pointer"
        >
          {t.tagRequestReceived}
        </button>
      );
    }
    return (
      <button
        onClick={() => onSendFriendRequest(uid)}
        className="p-1 rounded-lg text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 transition cursor-pointer"
        title={lang === 'ar' ? 'إضافة كصديق' : 'Add Friend'}
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 pt-2 text-start">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/85 border border-sky-500/30 backdrop-blur-2xl shadow-2xl space-y-4">
        {/* Frequency Code */}
        <div className="text-center space-y-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {t.stationCode}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-black text-3xl sm:text-4xl text-sky-400 tracking-[0.25em] drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]">
              {roomCode}
            </span>
            <button
              onClick={onCopyRoomCode}
              className="p-2 rounded-xl text-sky-400 hover:text-white hover:bg-sky-500/10 transition active:scale-95"
              title={t.btnCopyCode}
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs font-bold text-purple-300">
            {t.categoryPrefix} {catNames || t.catRandom}
          </div>
          <div className="text-[11px] font-bold text-slate-400">
            {t.modePrefix} {t[`mode${room.gameMode === 'mole' ? 'MoleNetwork' : room.gameMode === 'silent' ? 'SilentStation' : room.gameMode === 'sabotage' ? 'Sabotage' : 'Normal'}` as keyof typeof t]}
          </div>
        </div>

        {/* Host controls */}
        {isHost && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenEditRoom}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Settings className="w-4 h-4 text-sky-400" />
                <span>{t.btnEditRoom}</span>
              </button>
              <button
                onClick={onOpenInviteFriends}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <UserPlus className="w-4 h-4 text-purple-400" />
                <span>{t.btnInviteFriends}</span>
              </button>
            </div>

            <button
              onClick={onStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 text-slate-950 font-black text-sm tracking-wider uppercase shadow-lg shadow-sky-500/25 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{t.btnStartGame}</span>
            </button>
          </div>
        )}

        {/* Pending Join Requests for Host (Public Room Approval) */}
        {isHost && pendingRequests.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-400/50 space-y-3 shadow-lg animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-sky-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                <span>{t.joinRequestTitle}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-400/30 font-mono">
                {pendingRequests.length}
              </span>
            </div>

            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div
                  key={req.uid}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.uid}`}
                      alt={req.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-sky-400/50 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{req.name}</div>
                      <div className="text-[10px] text-slate-400">{t.joinRequestPrompt}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onAcceptJoinRequest?.(req.uid)}
                      className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 transition shadow-md hover:brightness-110 active:scale-95 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{t.btnAccept}</span>
                    </button>
                    <button
                      onClick={() => onDeclineJoinRequest?.(req.uid)}
                      className="py-1.5 px-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crew members list */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.txtAstronauts}</span>
            </span>
            <span>
              {activeCount} / {maxPlayers}
            </span>
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {playersArr.map(p => {
              const isInLobby = p.postGame === 'inLobby' || (!p.postGame && room.status === 'waiting');
              return (
                <div
                  key={p.uid}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover border border-sky-400/40 shrink-0"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="font-bold text-xs text-slate-200 truncate">{p.name || 'Player'}</span>
                      {p.uid === room.hostUid && (
                        <span title="Host">
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </span>
                      )}
                      {/* In Lobby vs In Game Badge */}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          isInLobby
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isInLobby ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                        <span>{isInLobby ? t.lblInLobbyTag : t.lblInGameTag}</span>
                      </span>
                      {getFriendButton(p.uid)}
                    </div>
                  </div>

                  {isHost && p.uid !== currentUserUid && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onMakeHost(p.uid)}
                        className="p-1 rounded-lg text-amber-400 hover:bg-amber-400/10 transition"
                        title={lang === 'ar' ? 'ترقية لمضيف' : 'Promote to Host'}
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onKickPlayer(p.uid)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                        title={lang === 'ar' ? 'طرد من الروم' : 'Kick from Station'}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Lobby Chat */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="h-28 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
            {room.lobbyChat && Object.values(room.lobbyChat).length > 0 ? (
              Object.values(room.lobbyChat).map((msg, i) => (
                <div key={i} className="p-1.5 rounded-xl bg-slate-900/60 leading-relaxed">
                  <span className="font-bold text-sky-400 me-1.5">{msg.sender}:</span>
                  <span className="text-slate-200">{msg.text}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-500 py-6 text-xs">
                {lang === 'ar' ? 'شات المحطة متاح للجميع 🛰️' : 'Station comms available for all 🛰️'}
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              type="text"
              value={chatMsg}
              onChange={e => setChatMsg(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs outline-none focus:border-sky-400 transition placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-400/30 transition flex items-center justify-center cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Leave Room Button */}
        <button
          onClick={onLeaveRoom}
          className="w-full py-2.5 rounded-2xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t.btnLeaveStation}</span>
        </button>
      </div>
    </div>
  );
};
