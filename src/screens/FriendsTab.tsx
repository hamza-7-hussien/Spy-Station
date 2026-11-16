import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, FriendEntry, FriendRequest, RoomInvite } from '../types';
import { Copy, UserPlus, Trash2, Check, X, Users, Inbox, Gamepad2 } from 'lucide-react';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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

  useBodyScrollLock(!!deleteConfirmFriend);
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
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-28 pt-2">
      {deleteConfirmFriend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmFriend(null);
          }}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl text-center space-y-4 overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <img
              src={deleteConfirmFriend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${deleteConfirmFriend.uid}`}
              alt={deleteConfirmFriend.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 mx-auto rounded-2xl object-cover border border-rose-500/40 bg-slate-950"
            />
            <div>
              <h3 className="font-bold text-base text-white">{deleteConfirmFriend.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{t.confirmDeleteFriend}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmFriend(null)}
                className="min-h-[42px] py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                {t.btnCancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.triggerHaptic('medium');
                  onRemoveFriend(deleteConfirmFriend.uid);
                  setDeleteConfirmFriend(null);
                }}
                className="min-h-[42px] py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.btnDelete}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6 rounded-2xl bg-[#111827] border border-slate-800 space-y-5">
        <h2 className="text-base font-bold text-white font-heading flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-400" />
          <span>{t.friendsTitle}</span>
        </h2>

        {/* Your Friend Code */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-400">
              {t.lblYourFriendCode}
            </div>
            <div className="font-mono tabular-nums font-black text-xl text-sky-400 tracking-widest mt-0.5">
              {myFriendCode || '--------'}
            </div>
          </div>
          <button
            type="button"
            onClick={onCopyCode}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{t.btnCopyCode}</span>
          </button>
        </div>

        {/* Add by Code */}
        <form onSubmit={handleAddSubmit} className="space-y-1.5 text-start">
          <label className="text-xs font-bold text-slate-300 block">
            {t.lblAddFriendId}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetId}
              onChange={e => setTargetId(e.target.value.toUpperCase())}
              placeholder={t.lblFriendIdPlaceholder}
              maxLength={8}
              className="flex-1 min-w-0 min-h-[44px] py-2 px-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white font-mono font-bold tracking-wider text-xs sm:text-sm uppercase outline-none transition placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500 placeholder:normal-case"
            />
            <button
              type="submit"
              className="min-w-[48px] min-h-[44px] px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-black text-xs transition flex items-center justify-center cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Subtabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSubtab('myFriends')}
            className={`flex-1 min-h-[38px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              subtab === 'myFriends'
                ? 'bg-sky-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.subtabMyFriends}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubtab('requests')}
            className={`flex-1 min-h-[38px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              subtab === 'requests'
                ? 'bg-sky-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>{t.subtabRequests}</span>
            {reqCount > 0 && (
              <span className="font-mono tabular-nums font-black text-[11px] text-rose-500">
                ({reqCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubtab('invites')}
            className={`flex-1 min-h-[38px] py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              subtab === 'invites'
                ? 'bg-sky-400 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{t.subtabInvites}</span>
            {invCount > 0 && (
              <span className="font-mono tabular-nums font-black text-[11px] text-indigo-400">
                ({invCount})
              </span>
            )}
          </button>
        </div>

        {/* My Friends */}
        {subtab === 'myFriends' && (
          <div className="space-y-2">
            {Object.keys(friends || {}).length > 0 ? (
              Object.keys(friends).map(uid => {
                const f = friends[uid];
                const isOnline = friendStatuses[uid] === 'online';
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={f.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={f.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="text-start min-w-0">
                        <div className="font-bold text-sm text-white truncate">{f.name || 'Friend'}</div>
                        <div className={`text-xs font-semibold ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isOnline ? t.lblOnline : t.lblOffline}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmFriend({ uid, name: f.name || 'Friend', avatar: f.avatar || '' })}
                      className="min-w-[38px] min-h-[38px] p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition flex items-center justify-center cursor-pointer"
                      title={t.btnRemoveFriend}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">{t.lblNoFriendsYet}</div>
            )}
          </div>
        )}

        {/* Requests */}
        {subtab === 'requests' && (
          <div className="space-y-2">
            {Object.keys(friendRequests || {}).length > 0 ? (
              Object.keys(friendRequests).map(uid => {
                const r = friendRequests[uid];
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={r.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={r.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="text-start min-w-0">
                        <div className="font-bold text-sm text-white truncate">{r.name || 'User'}</div>
                        <div className="text-xs text-slate-400">{t.newFriendRequest}</div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAcceptRequest(uid)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{t.btnAccept}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineRequest(uid)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 text-xs transition flex items-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">{t.lblNoPendingRequests}</div>
            )}
          </div>
        )}

        {/* Invites */}
        {subtab === 'invites' && (
          <div className="space-y-2">
            {Object.keys(roomInvites || {}).length > 0 ? (
              Object.keys(roomInvites).map(uid => {
                const inv = roomInvites[uid];
                return (
                  <div
                    key={uid}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={inv.fromAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`}
                        alt={inv.fromName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="text-start min-w-0">
                        <div className="font-bold text-sm text-white truncate">{inv.fromName}</div>
                        <div className="text-xs text-sky-400 font-mono tabular-nums font-bold">
                          #{inv.roomCode}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onJoinFromInvite(uid, inv.roomCode)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black transition flex items-center gap-1 cursor-pointer"
                      >
                        <Gamepad2 className="w-3.5 h-3.5" />
                        <span>{t.btnJoinInvite}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissInvite(uid)}
                        className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition flex items-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">{t.lblNoPendingInvites}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
