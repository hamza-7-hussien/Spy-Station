import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, FriendEntry } from '../types';
import { X, UserPlus, Check } from 'lucide-react';
import { db, firebase } from '../firebase';
import { sound } from '../audio';

interface Props {
  lang: Language;
  currentUserUid: string;
  currentUserName: string;
  currentUserAvatar: string;
  roomCode: string;
  friends: Record<string, FriendEntry>;
  friendStatuses: Record<string, 'online' | 'offline'>;
  currentRoomPlayers: Record<string, unknown>;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

export const InviteFriendsModal: React.FC<Props> = ({
  lang,
  currentUserUid,
  currentUserName,
  currentUserAvatar,
  roomCode,
  friends,
  friendStatuses,
  currentRoomPlayers,
  isOpen,
  onClose,
  onToast
}) => {
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  if (!isOpen) return null;
  const t = dictionary[lang];

  const handleInvite = async (friendUid: string, friendName: string) => {
    try {
      sound.playTone(600, 'sine', 0.1);
      sound.triggerHaptic('light');
      await db.ref(`users/${friendUid}/roomInvites/${currentUserUid}`).set({
        roomCode: roomCode,
        fromName: currentUserName,
        fromAvatar: currentUserAvatar,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      setInvited(prev => ({ ...prev, [friendUid]: true }));
      onToast(t.msgInviteSent.replace('{name}', friendName), 'success');
    } catch {
      onToast(t.errActionFailed, 'danger');
    }
  };

  const friendUids = Object.keys(friends || {}).filter(uid => !currentRoomPlayers[uid]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 shadow-2xl relative text-start">
        <button
          onClick={onClose}
          className="absolute top-4 inset-inline-end-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white text-center mb-4 font-heading">
          {t.btnInviteFriends} 👥
        </h3>

        <div className="max-h-[300px] overflow-y-auto space-y-2.5 my-3 pr-1">
          {friendUids.length > 0 ? (
            friendUids.map(uid => {
              const friend = friends[uid];
              const isOnline = friendStatuses[uid] === 'online';
              const isPending = !!invited[uid];

              return (
                <div
                  key={uid}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                      alt="avatar"
                      className="w-9 h-9 rounded-full object-cover border border-sky-400/40"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-200">{friend.name || 'Friend'}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
                          }`}
                        />
                        <span>{isOnline ? t.lblOnline : t.lblOffline}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isPending}
                    onClick={() => handleInvite(uid, friend.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      isPending
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 hover:brightness-110 active:scale-95'
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.btnPending}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t.btnInvite}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">
              {t.lblNoFriendsToInvite}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
        >
          {t.btnCancel}
        </button>
      </div>
    </div>
  );
};
