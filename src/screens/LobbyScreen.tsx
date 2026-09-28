import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, PlayerData, FriendEntry, JoinRequest, VoiceUserState } from '../types';
import { CATEGORY_META } from '../words';
import { Copy, Users, Settings, UserPlus, Play, LogOut, Send, Crown, Check, X, ShieldAlert, Bot, Trash2, Mic, MicOff, Headphones, HeadphoneOff, Clock } from 'lucide-react';
import { sound } from '../audio';
import { QuickVoiceControls } from '../components/QuickVoiceControls';

interface Props {
  lang: Language;
  currentUserUid: string;
  roomCode: string;
  room: RoomData;
  isHost: boolean;
  friends: Record<string, FriendEntry>;
  sentRequests: Record<string, boolean>;
  friendRequests: Record<string, unknown>;
  isVoiceJoined?: boolean;
  isVoiceMuted?: boolean;
  isVoiceDeafened?: boolean;
  isVoiceSpeaking?: boolean;
  voiceUsers?: Record<string, VoiceUserState>;
  onJoinVoice?: () => void;
  onLeaveVoice?: () => void;
  onToggleVoiceMute?: () => void;
  onToggleVoiceDeafen?: () => void;
  onCopyRoomCode: () => void;
  onOpenEditRoom: () => void;
  onOpenInviteFriends: () => void;
  onStartGame: () => void;
  onAddBot?: () => void;
  onRemoveBots?: () => void;
  onLeaveRoom: () => void;
  onMakeHost: (uid: string) => void;
  onKickPlayer: (uid: string) => void;
  onSendFriendRequest: (uid: string) => void;
  onAcceptFriendRequest: (uid: string) => void;
  onSendChatMessage: (text: string) => void;
  onAcceptJoinRequest?: (uid: string) => void;
  onDeclineJoinRequest?: (uid: string) => void;
  onToast?: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
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
  isVoiceJoined = false,
  isVoiceMuted = false,
  isVoiceDeafened = false,
  isVoiceSpeaking = false,
  voiceUsers = {},
  onJoinVoice = () => {},
  onLeaveVoice = () => {},
  onToggleVoiceMute = () => {},
  onToggleVoiceDeafen = () => {},
  onCopyRoomCode,
  onOpenEditRoom,
  onOpenInviteFriends,
  onStartGame,
  onAddBot,
  onRemoveBots,
  onLeaveRoom,
  onMakeHost,
  onKickPlayer,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onSendChatMessage,
  onAcceptJoinRequest,
  onDeclineJoinRequest,
  onToast = () => {}
}) => {
  const [chatMsg, setChatMsg] = useState('');
  const [isStartingGame, setIsStartingGame] = useState(false);
  const t = dictionary[lang];

  const playersObj = room.players || {};
  const playersArr = Object.values(playersObj);
  const activeCount = playersArr.length;
  const maxPlayers = room.maxPlayers || 20;

  // Check if all human players are in the lobby before allowing start
  const humanPlayers = playersArr.filter(p => !p.isBot && !p.uid.startsWith('bot_'));
  const allPlayersInLobby = humanPlayers.every(
    p => room.status === 'waiting' || p.postGame === 'inLobby'
  );

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

  const getFriendButton = (uid: string, isBot?: boolean) => {
    if (uid === currentUserUid || isBot || uid.startsWith('bot_')) return null;
    // If already friends: show nothing next to them
    if (friends && friends[uid]) {
      return null;
    }
    if (sentRequests && sentRequests[uid]) {
      return (
        <span
          title={lang === 'ar' ? 'طلب صداقة معلق' : 'Friend request pending'}
          className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full shrink-0"
        >
          {t.btnPending}
        </span>
      );
    }
    if (friendRequests && friendRequests[uid]) {
      return (
        <button
          onClick={() => onAcceptFriendRequest(uid)}
          className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full hover:bg-emerald-500/30 transition cursor-pointer shrink-0"
        >
          {t.tagRequestReceived}
        </button>
      );
    }
    return (
      <button
        onClick={() => onSendFriendRequest(uid)}
        className="p-1 rounded-lg text-sky-300 bg-sky-500/15 hover:bg-sky-500/30 border border-sky-400/30 transition cursor-pointer shrink-0"
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
            {t.modePrefix}{' '}
            {room.gameMode === 'mole'
              ? t.modeMoleNetwork
              : room.gameMode === 'chameleon'
              ? t.modeChameleon
              : room.gameMode === 'rapid'
              ? t.modeRapid
              : room.gameMode === 'undercover'
              ? t.modeUndercover
              : room.gameMode === 'silent'
              ? t.modeSilentStation
              : t.modeNormal}
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

            {/* Test Bots Quick Add Row */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddBot}
                className="flex-1 py-2 px-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Bot className="w-4 h-4 text-sky-400" />
                <span>{t.btnAddBot}</span>
              </button>
              {playersArr.some(p => p.isBot) && (
                <button
                  type="button"
                  onClick={onRemoveBots}
                  className="py-2 px-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  title={t.btnRemoveBots}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              disabled={isStartingGame || !allPlayersInLobby}
              onClick={async () => {
                if (!allPlayersInLobby) {
                  sound.playTone(280, 'sawtooth', 0.1);
                  onToast(
                    lang === 'ar'
                      ? 'لا يمكن بدء الجولة! هناك لاعبون لم يعودوا إلى اللوبي بعد.'
                      : 'Cannot start mission! Some players have not returned to the lobby yet.',
                    'danger'
                  );
                  return;
                }
                sound.playClick();
                sound.triggerHaptic('medium');
                setIsStartingGame(true);
                try {
                  await onStartGame();
                } finally {
                  setTimeout(() => setIsStartingGame(false), 2500);
                }
              }}
              className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wider uppercase shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                !allPlayersInLobby
                  ? 'bg-slate-900 border-2 border-amber-500/50 text-amber-300 opacity-80 cursor-not-allowed'
                  : isStartingGame
                  ? 'bg-slate-700 text-slate-300 opacity-80 cursor-wait shadow-sky-500/25'
                  : 'bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-sky-500/25'
              }`}
            >
              {!allPlayersInLobby ? (
                <>
                  <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>
                    {lang === 'ar'
                      ? 'بانتظار عودة الجميع للوبي...'
                      : 'Waiting for all to return to lobby...'}
                  </span>
                </>
              ) : (
                <>
                  <Play className={`w-4 h-4 fill-current ${isStartingGame ? 'animate-spin' : ''}`} />
                  <span>
                    {isStartingGame
                      ? lang === 'ar'
                        ? 'جاري إطلاق المهمة...'
                        : 'Launching Mission...'
                      : t.btnStartGame}
                  </span>
                </>
              )}
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
                      <div className="font-bold text-xs text-white break-words">{req.name}</div>
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
              const isBot = p.isBot || p.uid.startsWith('bot_');
              const isMe = p.uid === currentUserUid;
              const isInLobby = room.status === 'waiting' || p.postGame === 'inLobby' || isBot;

              const userVoice = voiceUsers?.[p.uid];
              const isSpeaking = !!userVoice?.speaking;
              const isUserMuted = userVoice ? !!userVoice.muted : true;
              const isUserDeafened = userVoice ? !!userVoice.deafened : false;

              return (
                <div
                  key={p.uid}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all gap-2 ${
                    !isInLobby
                      ? 'opacity-35 grayscale contrast-50 bg-slate-950/30 border-slate-900 shadow-none'
                      : isSpeaking
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  {/* Left: Avatar + Name + Badges */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                    <div className="relative shrink-0">
                      <img
                        src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                        alt="avatar"
                        className={`w-8 h-8 rounded-full object-cover transition-all ${
                          !isInLobby
                            ? 'opacity-40 grayscale border border-slate-800'
                            : isSpeaking
                            ? 'border-2 border-emerald-400 ring-4 ring-emerald-400/40 animate-pulse'
                            : 'border border-sky-400/40'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                      <span className={`font-bold text-xs truncate ${!isInLobby ? 'text-slate-500' : 'text-slate-200'}`}>
                        {p.name || 'Player'}
                      </span>
                      {p.uid === room.hostUid && (
                        <span title="Host" className="shrink-0">
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        </span>
                      )}

                      {getFriendButton(p.uid, isBot)}
                    </div>
                  </div>

                  {/* Right: Actions aligned to the right (Voice controls for self, Voice status for others, Host controls) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Live Voice Status for Other Human Players */}
                    {!isBot && !isMe && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
                        <span
                          title={
                            !isUserMuted
                              ? (lang === 'ar' ? 'المايك مفتوح' : 'Mic Live')
                              : (lang === 'ar' ? 'المايك مكتوم' : 'Mic Muted')
                          }
                          className="flex items-center justify-center"
                        >
                          {!isUserMuted ? (
                            <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'text-emerald-400 animate-bounce' : 'text-emerald-400'}`} />
                          ) : (
                            <MicOff className="w-3.5 h-3.5 text-rose-400/80" />
                          )}
                        </span>
                        <span
                          title={
                            !isUserDeafened
                              ? (lang === 'ar' ? 'السماعة مفتوحة (يستمع)' : 'Audio Live')
                              : (lang === 'ar' ? 'السماعة مقفولة' : 'Audio Deafened')
                          }
                          className="flex items-center justify-center"
                        >
                          {!isUserDeafened ? (
                            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <HeadphoneOff className="w-3.5 h-3.5 text-rose-400/80" />
                          )}
                        </span>
                      </div>
                    )}

                    {/* Voice Controls on User's Row */}
                    {isMe && (
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
                    )}

                    {isHost && p.uid !== currentUserUid && (
                      <div className="flex items-center gap-1 shrink-0">
                        {!isBot && (
                          <button
                            onClick={() => onMakeHost(p.uid)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition cursor-pointer"
                            title={lang === 'ar' ? 'ترقية لمضيف' : 'Promote to Host'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onKickPlayer(p.uid)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title={lang === 'ar' ? 'طرد من الروم' : 'Kick from Station'}
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
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
