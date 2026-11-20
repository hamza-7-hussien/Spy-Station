import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, FriendEntry, FriendRequest, RoomInvite } from '../types';
import { Copy, UserPlus, Trash2, Check, X, Users, Inbox, Gamepad2, ChevronDown } from 'lucide-react';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { FriendsListSkeleton } from '../components/Skeletons';

const FRIENDS_PAGE_SIZE = 15;

interface Props {
  lang: Language;
  myFriendCode: string;
  friends: Record<string, FriendEntry>;
  friendStatuses: Record<string, 'online' | 'offline'>;
  friendRequests: Record<string, FriendRequest>;
  roomInvites: Record<string, RoomInvite>;
  isLoading?: boolean;
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
  isLoading = false,
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
  const [friendsVisibleLimit, setFriendsVisibleLimit] = useState(FRIENDS_PAGE_SIZE);
  const [requestsVisibleLimit, setRequestsVisibleLimit] = useState(FRIENDS_PAGE_SIZE);
  const [invitesVisibleLimit, setInvitesVisibleLimit] = useState(FRIENDS_PAGE_SIZE);
  const [deleteConfirmFriend, setDeleteConfirmFriend] = useState<{ uid: string; name: string; avatar: string } | null>(null);

  useBodyScrollLock(!!deleteConfirmFriend);

  const t = dictionary[lang];

  const friendKeys = Object.keys(friends || {});
  const reqKeys = Object.keys(friendRequests || {});
  const invKeys = Object.keys(roomInvites || {});
  const reqCount = reqKeys.length;
  const invCount = invKeys.length;

  const visibleFriendKeys = friendKeys.slice(0, friendsVisibleLimit);
  const visibleReqKeys = reqKeys.slice(0, requestsVisibleLimit);
  const visibleInvKeys = invKeys.slice(0, invitesVisibleLimit);

  const loadMoreText = (remaining: number) =>
    lang === 'ar'
      ? `عرض المزيد (+${remaining})`
      : lang === 'es'
      ? `Cargar más (+${remaining})`
      : lang === 'fr'
      ? `Afficher plus (+${remaining})`
      : lang === 'de'
      ? `Mehr laden (+${remaining})`
      : `Load more (+${remaining})`;

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 animate-in fade-in duration-150 overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteConfirmFriend(null);
          }}
        >
          <div
            className="w-full max-w-xs rounded-3xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl text-center space-y-4 relative overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto w-16 h-16">
              <img
                src={deleteConfirmFriend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${deleteConfirmFriend.uid}`}
                alt="Friend avatar"
                loading="lazy"
                decoding="async"
                className="w-16 h-16 rounded-full object-cover border-2 border-rose-500/60 shadow-lg shadow-rose-500/30 bg-slate-950"
              />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{deleteConfirmFriend.name}</h3>
              <p className="text-xs text-slate-400 mt-1">
                {t.confirmDeleteFriend}
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
                <span>{t.btnDelete}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-5 rounded-3xl bg-slate-900 border border-sky-500/25 shadow-xl space-y-5">
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
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Subtabs */}
        <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setSubtab('myFriends')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 relative cursor-pointer ${
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
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 relative cursor-pointer ${
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
            {isLoading && friendKeys.length === 0 ? (
              <FriendsListSkeleton count={4} />
            ) : friendKeys.length > 0 ? (
              <>
                {visibleFriendKeys.map(uid => {
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
                          loading="lazy"
                          decoding="async"
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
                })}
                {friendKeys.length > friendsVisibleLimit && (
                  <button
                    type="button"
                    onClick={() => setFriendsVisibleLimit(l => l + FRIENDS_PAGE_SIZE)}
                    className="w-full min-h-[42px] py-2 px-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>{loadMoreText(friendKeys.length - friendsVisibleLimit)}</span>
                  </button>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">{t.lblNoFriendsYet}</div>
            )}
          </div>
        )}

        {/* Content: Requests */}
        {subtab === 'requests' && (
          <div className="space-y-2">
            {isLoading && reqKeys.length === 0 ? (
              <FriendsListSkeleton count={3} />
            ) : reqKeys.length > 0 ? (
              <>
                {visibleReqKeys.map(uid => {
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
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-full object-cover border border-purple-400/40"
                        />
                        <div className="text-start">
                          <div className="font-bold text-sm text-slate-200">{r.name || 'User'}</div>
                          <div className="text-[11px] text-slate-400">
                            {t.newFriendRequest}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => onAcceptRequest(uid)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t.btnAccept}</span>
                        </button>
                        <button
                          onClick={() => onDeclineRequest(uid)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {reqKeys.length > requestsVisibleLimit && (
                  <button
                    type="button"
                    onClick={() => setRequestsVisibleLimit(l => l + FRIENDS_PAGE_SIZE)}
                    className="w-full min-h-[42px] py-2 px-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>{loadMoreText(reqKeys.length - requestsVisibleLimit)}</span>
                  </button>
                )}
              </>
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
            {isLoading && invKeys.length === 0 ? (
              <FriendsListSkeleton count={3} />
            ) : invKeys.length > 0 ? (
              <>
                {visibleInvKeys.map(uid => {
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
                          loading="lazy"
                          decoding="async"
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
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md cursor-pointer"
                        >
                          <Gamepad2 className="w-3.5 h-3.5" />
                          <span>{t.btnJoinInvite}</span>
                        </button>
                        <button
                          onClick={() => onDismissInvite(uid)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {invKeys.length > invitesVisibleLimit && (
                  <button
                    type="button"
                    onClick={() => setInvitesVisibleLimit(l => l + FRIENDS_PAGE_SIZE)}
                    className="w-full min-h-[42px] py-2 px-4 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>{loadMoreText(invKeys.length - invitesVisibleLimit)}</span>
                  </button>
                )}
              </>
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
