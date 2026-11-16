import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, RoomData, FriendEntry, VoiceUserState } from '../types';
import { CATEGORY_META } from '../words';
import {
  Copy,
  Users,
  Settings,
  UserPlus,
  Play,
  LogOut,
  Send,
  Crown,
  Check,
  X,
  Bot,
  Trash2,
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { sound } from '../audio';
import { QuickVoiceControls } from '../components/QuickVoiceControls';
import { getMinRequiredPlayers } from '../gameEngine';

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
  onJoinVoice?: (startMuted?: boolean) => void;
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
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const lobbyChatCount = Object.keys(room.lobbyChat || {}).length;
  const t = dictionary[lang];

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [lobbyChatCount]);

  const playersObj = room.players || {};
  const playersArr = Object.values(playersObj);
  const activeCount = playersArr.length;
  const maxPlayers = room.maxPlayers || 20;
  const isRoomFull = activeCount >= maxPlayers;

  const spyCount = room.spyCount || 1;
  const minRequiredPlayers = getMinRequiredPlayers(room.gameMode, spyCount);
  const hasEnoughPlayers = activeCount >= minRequiredPlayers;

  const humanPlayers = playersArr.filter(p => !p.isBot && !p.uid.startsWith('bot_'));
  const allPlayersInLobby = humanPlayers.every(
    p => room.status === 'waiting' || p.postGame === 'inLobby'
  );

  const cats = room.categories || [];
  const catNames = cats
    .map(c => {
      const meta = CATEGORY_META[c];
      const label = meta ? t[meta.key as keyof typeof t] || c : c;
      return meta?.icon ? `${meta.icon} ${label}` : label;
    })
    .join(' · ');

  const pendingRequests = Object.values(room.joinRequests || {}).filter(
    r => r && r.status === 'pending'
  );

  const modeLabel =
    room.gameMode === 'mole'
      ? t.modeMoleNetwork
      : room.gameMode === 'chameleon'
      ? t.modeChameleon
      : room.gameMode === 'rapid'
      ? t.modeRapid
      : room.gameMode === 'undercover'
      ? t.modeUndercover
      : room.gameMode === 'silent'
      ? t.modeSilentStation
      : room.gameMode === 'blackout'
      ? t.modeBlackout
      : t.modeNormal;

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
    if (friends && friends[uid]) return null;
    if (sentRequests && sentRequests[uid]) {
      return (
        <span className="text-[11px] font-semibold text-slate-400 shrink-0">
          {t.btnPending}
        </span>
      );
    }
    if (friendRequests && friendRequests[uid]) {
      return (
        <button
          type="button"
          onClick={() => onAcceptFriendRequest(uid)}
          className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer shrink-0"
        >
          {t.tagRequestReceived}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onSendFriendRequest(uid)}
        className="p-1.5 rounded-lg text-sky-400 hover:bg-sky-500/15 transition cursor-pointer shrink-0"
        title={t.addFriendTooltip}
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 pb-20 pt-2 text-start">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Station Header, Metadata & Host Controls */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-5">
          {/* Frequency Code */}
          <div className="text-center space-y-2 pb-4 border-b border-slate-800">
            <div className="text-xs font-semibold text-slate-400">
              {t.stationCode}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono tabular-nums font-black text-3xl sm:text-4xl text-sky-400 tracking-[0.2em]">
                {roomCode}
              </span>
              <button
                type="button"
                onClick={onCopyRoomCode}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-900 border border-slate-800 text-sky-400 hover:text-white hover:border-slate-700 flex items-center justify-center transition cursor-pointer"
                title={t.btnCopyCode}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs font-semibold text-slate-200 leading-relaxed">
              {catNames || `🎲 ${t.catRandom}`}
            </div>
            <div className="text-xs text-slate-400">
              {t.modePrefix} <span className="text-slate-200 font-semibold">{modeLabel}</span>
            </div>
          </div>

          {/* Host controls */}
          {isHost && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenEditRoom}
                  className="min-h-[42px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-sky-400" />
                  <span>{t.btnEditRoom}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenInviteFriends}
                  className="min-h-[42px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>{t.btnInviteFriends}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAddBot}
                  disabled={isRoomFull}
                  className={`flex-1 min-h-[42px] py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    isRoomFull
                      ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-700 text-sky-300 cursor-pointer'
                  }`}
                >
                  <Bot className="w-4 h-4 text-sky-400" />
                  <span>
                    {isRoomFull
                      ? t.stationFullBadge.replace('{current}', maxPlayers.toString()).replace('{max}', maxPlayers.toString())
                      : t.btnAddBot}
                  </span>
                </button>
                {playersArr.some(p => p.isBot) && (
                  <button
                    type="button"
                    onClick={onRemoveBots}
                    className="min-h-[42px] py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    title={t.btnRemoveBots}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!hasEnoughPlayers && (
                <div className="py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="tabular-nums">
                    {t.minPlayersNotice
                      .replace('{min}', minRequiredPlayers.toString())
                      .replace('{active}', activeCount.toString())
                      .replace('{spies}', spyCount.toString())}
                  </span>
                </div>
              )}

              <button
                type="button"
                disabled={isStartingGame || !allPlayersInLobby || !hasEnoughPlayers}
                onClick={async () => {
                  if (!hasEnoughPlayers) {
                    sound.playTone(280, 'sawtooth', 0.1);
                    onToast(t.notEnoughPlayersToast, 'danger');
                    return;
                  }
                  if (!allPlayersInLobby) {
                    sound.playTone(280, 'sawtooth', 0.1);
                    onToast(t.notAllInLobbyToast, 'danger');
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
                className={`w-full min-h-[48px] py-3 rounded-xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                  !hasEnoughPlayers
                    ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    : !allPlayersInLobby
                    ? 'bg-slate-900 border border-amber-500/40 text-amber-300 cursor-not-allowed'
                    : isStartingGame
                    ? 'bg-slate-700 text-slate-300 cursor-wait'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950 active:scale-[0.99]'
                }`}
              >
                {!hasEnoughPlayers ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="tabular-nums">
                      {t.waitingForPlayers
                        .replace('{min}', minRequiredPlayers.toString())
                        .replace('{active}', activeCount.toString())}
                    </span>
                  </>
                ) : !allPlayersInLobby ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{t.waitingReturn}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isStartingGame ? t.launchingMission : t.btnStartGame}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Pending Join Requests for Host */}
          {isHost && pendingRequests.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-sky-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                <span>{t.joinRequestTitle}</span>
                <span className="font-mono tabular-nums text-sky-400">{pendingRequests.length}</span>
              </div>

              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div
                    key={req.uid}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-slate-800 gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={req.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.uid}`}
                        alt={req.name}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{req.name}</div>
                        <div className="text-[11px] text-slate-400">{t.joinRequestPrompt}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAcceptJoinRequest?.(req.uid)}
                        className="min-h-[36px] py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{t.btnAccept}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineJoinRequest?.(req.uid)}
                        className="min-h-[36px] py-1.5 px-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/35 text-rose-300 font-bold text-xs flex items-center transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leave Room Button */}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.btnLeaveStation}</span>
          </button>
        </div>

        {/* Right Column: Crew Roster & Lobby Chat */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#111827] border border-slate-800 space-y-5">
          {/* Crew members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>{t.txtAstronauts}</span>
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                {activeCount} / {maxPlayers}
              </span>
            </div>

            <div className="max-h-[280px] overflow-y-auto space-y-2 pe-1">
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
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors gap-2 ${
                      !isInLobby
                        ? 'opacity-40 bg-slate-950/40 border-slate-900'
                        : isSpeaking
                        ? 'bg-emerald-950/30 border-emerald-500/60'
                        : 'bg-slate-950/75 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <img
                        src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className={`w-9 h-9 rounded-lg object-cover shrink-0 ${
                          isSpeaking ? 'border-2 border-emerald-400' : 'border border-slate-700'
                        }`}
                      />
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                        <span className={`font-bold text-xs sm:text-sm truncate ${!isInLobby ? 'text-slate-500' : 'text-slate-100'}`}>
                          {p.name || 'Player'}
                        </span>
                        {isBot && (
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            ({t.botTag})
                          </span>
                        )}
                        {p.uid === room.hostUid && (
                          <span title="Host" className="shrink-0">
                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          </span>
                        )}
                        {getFriendButton(p.uid, isBot)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isBot && !isMe && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                          <span title={!isUserMuted ? t.micLive : t.micMuted}>
                            {!isUserMuted ? (
                              <Mic className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <MicOff className="w-3.5 h-3.5 text-rose-400/80" />
                            )}
                          </span>
                          <span title={!isUserDeafened ? t.audioLive : t.audioDeafened}>
                            {!isUserDeafened ? (
                              <Headphones className="w-3.5 h-3.5 text-sky-400" />
                            ) : (
                              <HeadphoneOff className="w-3.5 h-3.5 text-rose-400/80" />
                            )}
                          </span>
                        </div>
                      )}

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
                              type="button"
                              onClick={() => onMakeHost(p.uid)}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition cursor-pointer"
                              title={t.promoteToHostTooltip}
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onKickPlayer(p.uid)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title={t.kickFromStationTooltip}
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
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <div className="h-36 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              {room.lobbyChat && Object.values(room.lobbyChat).length > 0 ? (
                Object.values(room.lobbyChat).map((msg, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-900/75 leading-relaxed">
                    <span className="font-bold text-sky-400 me-1.5">{msg.sender}:</span>
                    <span className="text-slate-200">{msg.text}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-8 text-xs">
                  {t.stationCommsHint}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                placeholder={t.typeMessagePlaceholder}
                className="flex-1 min-h-[42px] py-2 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm outline-none focus:border-sky-400 transition placeholder:text-slate-500"
              />
              <button
                type="submit"
                className="min-w-[44px] min-h-[42px] px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-400/30 transition flex items-center justify-center cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
