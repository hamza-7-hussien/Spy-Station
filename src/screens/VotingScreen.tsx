import React from 'react';
import { dictionary } from '../translations';
import { Language, RoomData } from '../types';
import { sound } from '../audio';
import { AlertCircle, Clock, FastForward, Eye } from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  room: RoomData;
  onCastVote: (targetUid: string) => void;
}

export const VotingScreen: React.FC<Props> = ({ lang, currentUserUid, room, onCastVote }) => {
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

  const handleVote = (targetUid: string) => {
    if (!canVote) return;
    sound.playTone(600, 'sine', 0.12);
    sound.triggerHaptic('medium');
    onCastVote(targetUid);
  };

  // Find who voted for skip
  const skipVoters = Object.keys(votes)
    .filter(voterUid => votes[voterUid] === 'SKIP')
    .map(voterUid => playersObj[voterUid])
    .filter(Boolean);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-20 pt-4 text-start">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 backdrop-blur-2xl shadow-2xl space-y-4 text-center">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{t.voteTitle}</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-sky-400 font-mono font-black text-lg pt-1">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>
              {t.lblVoteTime} {room.voteTimeLeft != null ? room.voteTimeLeft : 80}s
            </span>
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

            return (
              <div
                key={p.uid}
                onClick={() => canVote && handleVote(p.uid)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  canVote
                    ? 'cursor-pointer hover:border-purple-400/60 hover:bg-slate-800/80 active:scale-[0.99]'
                    : 'cursor-default'
                } ${
                  isMyTarget
                    ? 'border-sky-400 bg-sky-500/15 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`}
                    alt="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-purple-400/40"
                  />
                  <span className="font-bold text-sm text-slate-100">{p.name || 'Player'}</span>
                </div>

                {/* Live mini avatars of players who voted for this person */}
                <div className="flex items-center -space-x-2">
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

        {/* Disqualified notice if applicable */}
        {isDisqualified && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 font-bold">
            {lang === 'ar'
              ? '⚠️ تم سحب حق التصويت منك في هذه الجولة بسبب اتهام خاطئ بالرصاصة الفضية!'
              : '⚠️ Your vote is disabled this round due to an incorrect Silver Bullet accusation!'}
          </div>
        )}

        {/* Skip Vote Button */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            disabled={!canVote}
            onClick={() => handleVote('SKIP')}
            className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              canVote
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer active:scale-95'
                : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
            }`}
          >
            <FastForward className="w-4 h-4 text-purple-400" />
            <span>{t.btnSkipVote}</span>
          </button>

          {skipVoters.length > 0 && (
            <div className="flex items-center gap-1 pt-1">
              <span className="text-[11px] text-slate-400 font-bold">{t.btnSkipVote}:</span>
              <div className="flex items-center -space-x-1.5">
                {skipVoters.map(v => (
                  <img
                    key={v.uid}
                    src={v.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${v.uid}`}
                    alt={v.name}
                    title={v.name}
                    className="w-6 h-6 rounded-full border border-sky-400 object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {spectatorCount > 0 && (
          <div className="text-center pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <Eye className="w-3.5 h-3.5" />
              <span>
                {spectatorCount} {t.lblSpectatorTag}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
