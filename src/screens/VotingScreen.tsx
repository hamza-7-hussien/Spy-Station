import React from 'react';
import { dictionary } from '../translations';
import { Language, RoomData } from '../types';
import { sound } from '../audio';
import { DEFAULT_VOTE_SECONDS } from '../gameEngine';
import { AlertCircle, Clock, Eye, FastForward, LogOut, MessageSquare, Send } from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  room: RoomData;
  onCastVote: (targetUid: string) => void;
  onSendVoteChat?: (text: string) => void;
  onLeaveRoom?: () => void;
}

export const VotingScreen: React.FC<Props> = ({
  lang,
  currentUserUid,
  room,
  onCastVote,
  onSendVoteChat,
  onLeaveRoom
}) => {
  const [chatInput, setChatInput] = React.useState('');
  const chatEndRef = React.useRef<HTMLDivElement | null>(null);
  const t = dictionary[lang];
  const playersObj = room.players || {};
  const allPlayers = Object.values(playersObj);
  const activePlayers = allPlayers.filter(p => !p.isSpectator);
  const myPlayer = playersObj[currentUserUid];
  const amSpectator = !!myPlayer?.isSpectator;
  const voteChatList = Object.values(room.voteChat || {});

  const votes = room.votes || {};
  const hasVoted = !!votes[currentUserUid];
  const isDisqualified = !!myPlayer?.disqualifiedVote;
  const canVote = !amSpectator && !hasVoted && !isDisqualified;

  const spectatorCount = allPlayers.filter(p => p.isSpectator).length;
  const voteSeconds = room.voteTimeLeft != null ? room.voteTimeLeft : DEFAULT_VOTE_SECONDS;
  const isFinalSeconds = voteSeconds <= 10 && voteSeconds > 0;
  const lastHeartbeatSecRef = React.useRef<number>(-1);

  React.useEffect(() => {
    if (isFinalSeconds && room.voteTimeLeft !== lastHeartbeatSecRef.current) {
      lastHeartbeatSecRef.current = room.voteTimeLeft!;
      sound.playHeartbeat(true);
    }
  }, [isFinalSeconds, room.voteTimeLeft]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [voteChatList.length]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean || !onSendVoteChat) return;
    sound.triggerHaptic('light');
    onSendVoteChat(clean);
    setChatInput('');
  };

  const handleVote = (targetUid: string) => {
    if (!canVote) return;
    sound.playTone(600, 'sine', 0.12);
    sound.triggerHaptic('medium');
    onCastVote(targetUid);
  };

  const skipVoters = Object.keys(votes)
    .filter(voterUid => votes[voterUid] === 'SKIP')
    .map(voterUid => playersObj[voterUid])
    .filter(Boolean);
  const isMySkip = votes[currentUserUid] === 'SKIP';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 pt-3 text-start">
      <div
        className={`p-5 sm:p-6 rounded-2xl bg-[#111827] border transition-colors space-y-5 ${
          isFinalSeconds ? 'border-rose-500' : 'border-slate-800'
        }`}
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-base font-heading">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{t.voteTitle}</span>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950 border font-mono tabular-nums font-black text-sm ${
              isFinalSeconds ? 'border-rose-500 text-rose-300' : 'border-slate-800 text-sky-300'
            }`}
          >
            <Clock className={`w-4 h-4 ${isFinalSeconds ? 'text-rose-400' : 'text-sky-400'}`} />
            <span>{t.lblVoteTime} {voteSeconds}s</span>
          </div>
        </div>

        {/* 2-Column Body: Suspects List & Live Discussion */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Suspects Column */}
          <div className="lg:col-span-7 space-y-2.5">
            {activePlayers.map(p => {
              const votersForThisPlayer = Object.keys(votes)
                .filter(voterUid => votes[voterUid] === p.uid)
                .map(voterUid => playersObj[voterUid])
                .filter(Boolean);

              const isMyTarget = votes[currentUserUid] === p.uid;
              const isSelf = p.uid === currentUserUid;
              const isBot = !!p.isBot || p.uid.startsWith('bot_');

              return (
                <button
                  key={p.uid}
                  type="button"
                  disabled={!canVote}
                  onClick={() => canVote && handleVote(p.uid)}
                  className={`w-full min-h-[56px] flex items-center justify-between p-3 rounded-xl border transition-colors text-start ${
                    canVote
                      ? 'cursor-pointer hover:border-sky-500/60 hover:bg-slate-900'
                      : 'cursor-default opacity-85'
                  } ${
                    isMyTarget
                      ? 'border-sky-400 bg-sky-950/35'
                      : 'border-slate-800 bg-slate-950/75'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-sm text-white truncate">{p.name || 'Player'}</span>
                      {isSelf && (
                        <span className="text-[11px] font-bold text-sky-400 shrink-0">
                          ({t.lblYou})
                        </span>
                      )}
                      {isBot && (
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                          ({t.botTag})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center -space-x-2 rtl:space-x-reverse shrink-0">
                    {votersForThisPlayer.map(v => (
                      <img
                        key={v.uid}
                        src={v.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${v.uid}`}
                        alt={v.name}
                        title={v.name}
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full border-2 border-[#111827] object-cover"
                      />
                    ))}
                  </div>
                </button>
              );
            })}

            {!amSpectator && (
              <button
                type="button"
                disabled={!canVote}
                onClick={() => handleVote('SKIP')}
                className={`w-full min-h-[52px] flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                  canVote
                    ? 'cursor-pointer hover:border-amber-400/70 hover:bg-slate-900'
                    : 'cursor-default opacity-80'
                } ${
                  isMySkip
                    ? 'border-amber-400 bg-amber-950/30 text-amber-200'
                    : 'border-slate-800 bg-slate-950/75 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <FastForward className="w-4 h-4 text-amber-400" />
                  <span>{t.btnSkipVote}</span>
                </div>

                <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                  {skipVoters.map(v => (
                    <img
                      key={v.uid}
                      src={v.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${v.uid}`}
                      alt={v.name}
                      title={v.name}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full border-2 border-[#111827] object-cover"
                    />
                  ))}
                </div>
              </button>
            )}

            {isDisqualified && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-bold">
                {t.disqualifiedVoteNotice}
              </div>
            )}
          </div>

          {/* Live Voting Discussion Chat */}
          <div className="lg:col-span-5 space-y-2.5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'ar' ? 'نقاش التصويت المباشر' : 'Live Vote Discussion'}</span>
              </span>
              {voteChatList.length > 0 && (
                <span className="font-mono tabular-nums text-xs text-sky-400">{voteChatList.length}</span>
              )}
            </div>

            <div className="h-56 lg:h-64 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              {voteChatList.length > 0 ? (
                voteChatList.map((msg, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-900 leading-relaxed">
                    <span className={`font-bold me-1.5 ${msg.isBot ? 'text-indigo-300' : 'text-sky-400'}`}>
                      {msg.sender}:
                    </span>
                    <span className="text-slate-100">{msg.text}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 py-16 text-xs">
                  {lang === 'ar' ? 'تحدثوا الآن لكشف الجاسوس قبل انتهاء الوقت...' : 'Discuss the clues to spot the spy before time runs out...'}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {!amSpectator && onSendVoteChat && (
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder={lang === 'ar' ? 'اكتب شكوكك أو دافع عن نفسك...' : 'Share your suspicion or defend yourself...'}
                  className="flex-1 min-h-[42px] py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm outline-none focus:border-sky-400 transition placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="min-w-[44px] min-h-[42px] px-3.5 py-2 rounded-xl bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 border border-sky-400/30 transition flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Metadata & Leave */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          {spectatorCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold tabular-nums">
              <Eye className="w-3.5 h-3.5" />
              <span>{spectatorCount} {t.lblSpectatorTag}</span>
            </span>
          ) : (
            <span />
          )}

          {onLeaveRoom && (
            <button
              type="button"
              onClick={onLeaveRoom}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.btnLeaveStation}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
