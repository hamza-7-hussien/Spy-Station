import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, FriendEntry, FriendRequest, RoomInvite } from '../types';
import { Copy, UserPlus, Trash2, Check, X, Users, Inbox, Gamepad2 } from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  myFriendCode: string;
  friends: Record<string, FriendEntry>;
  friendStatuses: Record<string, 'online' | 'offline'>;
  friendRequests: Record<string, FriendRequest>;
  roomInvites: Record<string, RoomInvite>;
  onCopyCode: () => void;
  onSendRequest: (code: string) => void;
  onAcceptRequest: (uid: string) => void;
  onDeclineRequest: (uid: string) => void;
  onRemoveFriend: (uid: string) => void;
  onJoinFromInvite: (fromUid: string, roomCode: string) => void;
  onDismissInvite: (fromUid: string) => void;
}

export const FriendsTab: React.FC<Props> = ({
  lang,
  myFriendCode,
  friends,
  friendStatuses,
  friendRequests,
  roomInvites,
  onCopyCode,
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onJoinFromInvite,
  onDismissInvite
}) => {
  const [subtab, setSubtab] = useState<'myFriends' | 'requests' | 'invites'>('myFriends');
  const [targetId, setTargetId] = useState('');
  const [deleteConfirmFriend, setDeleteConfirmFriend] = useState<{ uid: string; name: string; avatar: string } | null>(null);
  const t = dictionary[lang];

  const reqCount = Object.keys(friendRequests || {}).length;
  const invCount = Object.keys(roomInvites || {}).length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetId.trim()) {
      sound.triggerHaptic('light');
      onSendRequest(targetId.trim().toUpperCase());
      setTargetId('');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24">
      {/* Custom Delete Friend Modal */}
      {deleteConfirmFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-3xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl text-center space-y-4 relative">
            <div className="relative mx-auto w-16 h-16">
              <img
                src={deleteConfirmFriend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${deleteConfirmFriend.uid}`}
                alt="Friend avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-rose-500/60 shadow-lg shadow-rose-500/30 bg-slate-950"
              />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{deleteConfirmFriend.name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar' ? 'هل تريد إزالة هذا الصديق من قائمتك؟' : 'Remove this agent from your friends?'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => setDeleteConfirmFriend(null)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                onClick={() => {
                  sound.triggerHaptic('medium');
                  onRemoveFriend(deleteConfirmFriend.uid);
                  setDeleteConfirmFriend(null);
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-5">
        <h2 className="text-sm font-bold text-sky-400 text-center font-heading">
          {t.friendsTitle} 👥
        </h2>

        {/* Your ID Card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-purple-500/30">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t.lblYourFriendCode}
            </div>
            <div className="font-mono font-black text-xl text-sky-400 tracking-widest mt-0.5">
              {myFriendCode || '--------'}
            </div>
          </div>
          <button
            onClick={onCopyCode}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.btnCopyCode}</span>
          </button>
        </div>

        {/* Add by ID */}
        <form onSubmit={handleAddSubmit} className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400">
            {t.lblAddFriendId}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetId}
              onChange={e => setTargetId(e.target.value.toUpperCase())}
              placeholder={t.lblFriendIdPlaceholder}
              maxLength={8}
              className="flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-slate-950/90 border border-sky-400/25 focus:border-sky-400 text-white font-mono font-bold tracking-wider text-xs sm:text-sm uppercase outline-none transition placeholder:tracking-normal placeholder:font-sans placeholder:text-[11px] sm:placeholder:text-xs placeholder:text-slate-400 placeholder:normal-case"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Subtabs */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setSubtab('myFriends')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              subtab === 'myFriends'
                ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.subtabMyFriends}</span>
          </button>

          <button
            onClick={() => setSubtab('requests')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 relative ${
              subtab === 'requests'
                ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>{t.subtabRequests}</span>
            {reqCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                {reqCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubtab('invites')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 relative ${
              subtab === 'invites'
                ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{t.subtabInvites}</span>
            {invCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center">
                {invCount}
              </span>
            )}
          </button>
        </div>

        {/* Content: My Friends */}
        {subtab === 'myFriends' && (
          <div className="space-y-2">
            {Object.keys(friends || {}).length > 0 ? (
              Object.keys(friends).map(uid => {
                const f = friends[uid];
                const isOnline = friendStatuses[uid] === 'online';
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={f.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover border border-sky-400/40"
                      />
                      <div className="text-start">
                        <div className="font-bold text-sm text-slate-200">{f.name || 'Friend'}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : 'bg-slate-600'
                            }`}
                          />
                          <span>{isOnline ? t.lblOnline : t.lblOffline}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmFriend({ uid, name: f.name || 'Friend', avatar: f.avatar || '' })}
                      className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title={t.btnRemoveFriend}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">{t.lblNoFriendsYet}</div>
            )}
          </div>
        )}

        {/* Content: Requests */}
        {subtab === 'requests' && (
          <div className="space-y-2">
            {Object.keys(friendRequests || {}).length > 0 ? (
              Object.keys(friendRequests).map(uid => {
                const r = friendRequests[uid];
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={r.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover border border-purple-400/40"
                      />
                      <div className="text-start">
                        <div className="font-bold text-sm text-slate-200">{r.name || 'User'}</div>
                        <div className="text-[11px] text-slate-400">
                          {lang === 'ar' ? 'طلب صداقة جديد' : 'New friend request'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onAcceptRequest(uid)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.btnAccept}</span>
                      </button>
                      <button
                        onClick={() => onDeclineRequest(uid)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                {t.lblNoPendingRequests}
              </div>
            )}
          </div>
        )}

        {/* Content: Invites */}
        {subtab === 'invites' && (
          <div className="space-y-2">
            {Object.keys(roomInvites || {}).length > 0 ? (
              Object.keys(roomInvites).map(uid => {
                const inv = roomInvites[uid];
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={inv.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover border border-sky-400/40"
                      />
                      <div className="text-start">
                        <div className="font-bold text-sm text-slate-200">{inv.fromName}</div>
                        <div className="text-[11px] text-purple-300 font-mono font-bold">
                          #{inv.roomCode}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onJoinFromInvite(uid, inv.roomCode)}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>{t.btnJoinInvite}</span>
                      </button>
                      <button
                        onClick={() => onDismissInvite(uid)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                {t.lblNoPendingInvites}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
