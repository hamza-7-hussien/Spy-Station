import React, { useEffect, useState } from 'react';
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
  onSendVoteChat?: (msg: string) => void;
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
  const [chatMsg, setChatMsg] = useState('');
  const [nowTs, setNowTs] = useState(() => Date.now());
  const t = dictionary[lang];
  const playersObj = room.players || {};
  const allPlayers = Object.values(playersObj);
  const activePlayers = allPlayers.filter(p => !p.isSpectator);
  const myPlayer = playersObj[currentUserUid];
  const amSpectator = !!myPlayer?.isSpectator;

  const votes = room.votes || {};
  const hasVoted = !!votes[currentUserUid];
  const isDisqualified = !!myPlayer?.disqualifiedVote;
  const canVote = !amSpectator && !hasVoted && !isDisqualified;

  const spectatorCount = allPlayers.filter(p => p.isSpectator).length;

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const computedTimeLeft =
    typeof room.voteEndsAt === 'number' && room.voteEndsAt > 0
      ? Math.max(0, Math.ceil((room.voteEndsAt - nowTs) / 1000))
      : room.voteTimeLeft != null
      ? room.voteTimeLeft
      : DEFAULT_VOTE_SECONDS;

  const isFinalSeconds = computedTimeLeft <= 10 && computedTimeLeft > 0;
  const lastHeartbeatSecRef = React.useRef<number>(-1);

  React.useEffect(() => {
    if (isFinalSeconds && computedTimeLeft !== lastHeartbeatSecRef.current) {
      lastHeartbeatSecRef.current = computedTimeLeft;
      sound.playHeartbeat(true);
    }
  }, [isFinalSeconds, computedTimeLeft]);

  const handleVote = (targetUid: string) => {
    if (!canVote) return;
    sound.playTone(600, 'sine', 0.12);
    sound.triggerHaptic('medium');
    onCastVote(targetUid);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatMsg.trim();
    if (!clean || !onSendVoteChat) return;
    sound.playClick();
    onSendVoteChat(clean);
    setChatMsg('');
  };

  const skipVoters = Object.keys(votes)
    .filter(voterUid => votes[voterUid] === 'SKIP')
    .map(voterUid => playersObj[voterUid])
    .filter(Boolean);
  const isMySkip = votes[currentUserUid] === 'SKIP';

  const voteMessages = Object.values(room.voteChat || {})
    .filter(m => !m.isBot)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-8 pt-2 text-start">
      <div
        className={`p-5 sm:p-6 rounded-3xl bg-slate-900/90 backdrop-blur-2xl transition-all duration-300 space-y-4 text-center ${
          isFinalSeconds
            ? 'border-2 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.65)] ring-2 ring-rose-500/40'
            : 'border border-rose-500/40 shadow-2xl'
        }`}
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t.voteTitle}</span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-black/60 border font-mono font-black text-base transition-all ${
                isFinalSeconds
                  ? 'border-rose-400 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse'
                  : 'border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-sky-300'
              }`}
            >
              <Clock
                className={`w-4 h-4 ${isFinalSeconds ? 'text-rose-400 animate-spin' : 'text-sky-400 animate-spin'}`}
                style={{ animationDuration: isFinalSeconds ? '1.5s' : '8s' }}
              />
              <span>
                {t.lblVoteTime} {computedTimeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Players to Vote on */}
        <div className="grid grid-cols-1 gap-2.5 pt-2">
          {activePlayers.map(p => {
            const votersForThisPlayer = Object.keys(votes)
              .filter(voterUid => votes[voterUid] === p.uid)
              .map(voterUid => playersObj[voterUid])
              .filter(Boolean);

            const isMyTarget = votes[currentUserUid] === p.uid;
            const isSelf = p.uid === currentUserUid;
            const isSelectable = canVote;

            return (
              <div
                key={p.uid}
                onClick={() => isSelectable && handleVote(p.uid)}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isSelectable
                    ? 'cursor-pointer hover:border-purple-400/80 hover:bg-slate-800/80 active:scale-[0.99]'
                    : 'cursor-default opacity-85'
                } ${
                  isMyTarget
                    ? 'border-sky-400 bg-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.35)] ring-2 ring-sky-400/50'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-purple-400/40"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-100">{p.name || 'Player'}</span>
                    {isSelf && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 font-bold">
                        {t.lblYou || 'You'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                  {votersForThisPlayer.map(v => (
                    <img
                      key={v.uid}
                      src={v.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${v.uid}`}
                      alt={v.name}
                      title={v.name}
                      className="w-7 h-7 rounded-full border-2 border-purple-400 object-cover shadow-md"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Skip Vote Button */}
        {!amSpectator && (
          <button
            type="button"
            disabled={!canVote}
            onClick={() => handleVote('SKIP')}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              canVote
                ? 'cursor-pointer hover:border-amber-400/70 hover:bg-slate-800/80 active:scale-[0.99]'
                : 'cursor-default opacity-80'
            } ${
              isMySkip
                ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                : 'border-slate-800 bg-slate-950/60 text-slate-300'
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
                  className="w-7 h-7 rounded-full border-2 border-amber-400 object-cover shadow-md"
                />
              ))}
            </div>
          </button>
        )}

        {/* Human Players Discussion Chat (Optional, Zero Bot Messages) */}
        {onSendVoteChat && !amSpectator && (
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-sky-500/20 text-start space-y-2">
            <div className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'ar' ? 'نقاش اللاعبين قبل التصويت' : 'Live Discussion'}</span>
            </div>
            {voteMessages.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                {voteMessages.map((m, idx) => (
                  <div key={idx} className="px-2 py-1 rounded-xl bg-slate-900/90 text-slate-200">
                    <span className="font-bold text-sky-300 me-1.5">{m.sender}:</span>
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب رسالة سريعة...' : 'Write a quick note...'}
                className="flex-1 min-w-0 py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-sky-500 text-slate-950 font-black text-xs hover:brightness-110 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {isDisqualified && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-bold">
            {t.disqualifiedVoteNotice || '⚠️ Your vote is disabled this round!'}
          </div>
        )}

        {spectatorCount > 0 && (
          <div className="text-center pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <Eye className="w-3.5 h-3.5" />
              <span>
                {spectatorCount} {t.lblSpectatorTag}
              </span>
            </span>
          </div>
        )}

        {onLeaveRoom && (
          <button
            type="button"
            onClick={onLeaveRoom}
            className="w-full py-2.5 rounded-2xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.btnLeaveStation}</span>
          </button>
        )}
      </div>
    </div>
  );
};
