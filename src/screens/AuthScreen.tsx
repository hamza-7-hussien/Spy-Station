import React, { useState, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { auth, db, firebase } from '../firebase';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { LanguageSelectorBar } from '../components/LanguageSelectorModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  getSavedAccounts,
  saveAccountProfile,
  removeSavedAccount,
  SavedAccountProfile
} from '../utils/savedAccounts';
import {
  Globe,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  KeyRound,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  ArrowRight
} from 'lucide-react';

interface NativeGoogleAuthResult {
  status: 'idToken' | 'loginHint' | 'cancelled' | 'error';
  idToken?: string;
  email?: string;
  message?: string;
}

declare global {
  interface Window {
    SpyStationNative?: {
      signInWithGoogle?: (loginHint?: string) => void;
    };
    __onNativeGoogleAuthResult?: (payload: NativeGoogleAuthResult) => void;
  }
}

interface Props {
  lang: Language;
  onToggleLanguage?: () => void;
  onChangeLanguage?: (l: Language) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

type AuthScreenMode = 'saved' | 'login' | 'signup';

export const AuthScreen: React.FC<Props> = ({
  lang,
  onToggleLanguage,
  onChangeLanguage,
  onToast
}) => {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountProfile[]>(() => getSavedAccounts());
  const [mode, setMode] = useState<AuthScreenMode>(() => (getSavedAccounts().length > 0 ? 'saved' : 'login'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ msg: string; kind: 'error' | 'info' } | null>(null);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useBodyScrollLock(resetModalOpen);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const t = dictionary[lang];
  const isRtl = lang === 'ar';

  const syncUserProfileToDb = async (
    user: firebase.User,
    explicitName?: string,
    providerType: 'google' | 'password' = 'password'
  ) => {
    const cleanName =
      (explicitName || '').trim() ||
      user.displayName ||
      (user.email ? user.email.split('@')[0] : 'Agent');
    const avatar =
      user.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName || user.uid)}`;

    let finalName = cleanName;
    let finalAvatar = avatar;

    try {
      const snap = await db.ref(`users/${user.uid}`).once('value');
      const existing = snap.val() || {};
      const patch: Record<string, unknown> = {};
      if (!existing.name || explicitName) patch.name = cleanName;
      if (!existing.avatar) patch.avatar = avatar;
      if (!existing.createdAt) patch.createdAt = firebase.database.ServerValue.TIMESTAMP;
      if (Object.keys(patch).length > 0) {
        await db.ref(`users/${user.uid}`).update(patch);
      }
      finalName = existing.name || cleanName;
      finalAvatar = existing.avatar || avatar;
    } catch {
      // ignore non-fatal RTDB sync errors
    }

    if (user.email) {
      saveAccountProfile({
        uid: user.uid,
        email: user.email,
        name: finalName,
        avatar: finalAvatar,
        provider: providerType
      });
    }
  };

  const mapAuthError = (err: { code?: string; message?: string }): string => {
    const code = err.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return t.errWrongCredentials;
    }
    if (code === 'auth/user-not-found') {
      return t.errEmailNotFound;
    }
    if (code === 'auth/email-already-in-use') {
      return t.errEmailInUse;
    }
    if (code === 'auth/weak-password') {
      return t.errWeakPassword;
    }
    if (code === 'auth/invalid-email') {
      return t.errInvalidEmail;
    }
    if (code === 'auth/network-request-failed') {
      return t.errNoInternet;
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return t.googleCancelNotice || (isRtl ? 'تم إلغاء نافذة الدخول عبر Google.' : 'Google sign-in popup was cancelled.');
    }
    if (code === 'auth/unauthorized-domain') {
      return isRtl
        ? 'هذا النطاق غير مصرح به في إعدادات Firebase.'
        : 'Domain not authorized in Firebase Auth.';
    }
    if (code === 'auth/too-many-requests') {
      return t.tooManyAttemptsNotice || (isRtl
        ? 'محاولات متكررة، انتظر دقيقة أو ادخل عبر Google.'
        : 'Too many attempts. Try Google Sign-In or wait a moment.');
    }
    return err.message || t.errActionFailed;
  };

  const requestNativeGoogleAccount = (loginHint?: string): Promise<NativeGoogleAuthResult | null> =>
    new Promise(resolve => {
      if (typeof window === 'undefined' || !window.SpyStationNative?.signInWithGoogle) {
        resolve(null);
        return;
      }

      let settled = false;
      const timerId = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          delete window.__onNativeGoogleAuthResult;
          resolve({ status: 'cancelled' });
        }
      }, 120000);

      window.__onNativeGoogleAuthResult = payload => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        delete window.__onNativeGoogleAuthResult;
        resolve(payload || { status: 'cancelled' });
      };

      try {
        window.SpyStationNative.signInWithGoogle(loginHint || '');
      } catch {
        if (!settled) {
          settled = true;
          window.clearTimeout(timerId);
          delete window.__onNativeGoogleAuthResult;
          resolve(null);
        }
      }
    });

  const signInWithGoogleResilient = async (
    provider: firebase.auth.GoogleAuthProvider
  ): Promise<firebase.auth.UserCredential | null> => {
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    try {
      return await auth.signInWithPopup(provider);
    } catch (popupErr: unknown) {
      const pErr = popupErr as { code?: string };
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      if (
        !isInIframe &&
        (pErr.code === 'auth/popup-blocked' || pErr.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        await auth.signInWithRedirect(provider);
        return null;
      }
      throw popupErr;
    }
  };

  const handleGoogleSignIn = async (loginHint?: string) => {
    if (loading || googleLoading) return;
    try {
      sound.playTone(550, 'sine', 0.08);
      setAuthFeedback(null);
      setGoogleLoading(true);
      setLoading(true);

      const nativeResult = await requestNativeGoogleAccount(loginHint);
      if (nativeResult) {
        if (nativeResult.status === 'cancelled') {
          setAuthFeedback({
            msg: t.googleCancelNotice || (isRtl ? 'تم إلغاء اختيار الحساب.' : 'Google account selection was cancelled.'),
            kind: 'info'
          });
          return;
        }
        if (nativeResult.status === 'idToken' && nativeResult.idToken) {
          await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
          const credential = firebase.auth.GoogleAuthProvider.credential(nativeResult.idToken);
          const credRes = await auth.signInWithCredential(credential);
          if (credRes?.user) {
            await syncUserProfileToDb(credRes.user, undefined, 'google');
          }
          return;
        }
        if (nativeResult.status === 'loginHint' && nativeResult.email) {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ login_hint: nativeResult.email });
          const res = await signInWithGoogleResilient(provider);
          if (res?.user) {
            await syncUserProfileToDb(res.user, undefined, 'google');
          }
          return;
        }
        if (nativeResult.status === 'error' && nativeResult.message) {
          setAuthFeedback({ msg: nativeResult.message, kind: 'error' });
          onToast(nativeResult.message, 'danger');
          return;
        }
      }

      const provider = new firebase.auth.GoogleAuthProvider();
      if (loginHint) {
        provider.setCustomParameters({ login_hint: loginHint });
      } else {
        provider.setCustomParameters({ prompt: 'select_account' });
      }
      const res = await signInWithGoogleResilient(provider);
      if (res?.user) {
        await syncUserProfileToDb(res.user, undefined, 'google');
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const msg = mapAuthError(error);
      setAuthFeedback({ msg, kind: 'error' });
      onToast(msg, 'danger');
    } finally {
      setGoogleLoading(false);
      setLoading(false);
    }
  };

  const handleSavedContinue = (account: SavedAccountProfile) => {
    sound.triggerHaptic('medium');
    if (account.provider === 'google') {
      handleGoogleSignIn(account.email);
    } else {
      setEmail(account.email);
      setPassword('');
      setMode('login');
      setAuthFeedback({
        msg: isRtl ? 'أدخل كلمة المرور للمتابعة باسم ' + account.name : `Enter password to continue as ${account.name}`,
        kind: 'info'
      });
    }
  };

  const handleRemoveSaved = (e: React.MouseEvent, uidOrEmail: string) => {
    e.stopPropagation();
    sound.playClick();
    const remaining = removeSavedAccount(uidOrEmail);
    setSavedAccounts(remaining);
    if (remaining.length === 0) {
      setMode('login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    sound.triggerHaptic('medium');
    setAuthFeedback(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanUsername = username.trim();
    const isSignUp = mode === 'signup';

    if (!cleanEmail || !cleanPassword) {
      setAuthFeedback({ msg: t.errFillFields, kind: 'error' });
      return onToast(t.errFillFields, 'danger');
    }

    const isGoogleEmail = cleanEmail.endsWith('@gmail.com') || cleanEmail.endsWith('@googlemail.com');

    setLoading(true);

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      if (isSignUp) {
        if (!cleanUsername) {
          setLoading(false);
          setAuthFeedback({ msg: t.errUsernameRequired, kind: 'error' });
          return onToast(t.errUsernameRequired, 'danger');
        }

        const snap = await db.ref('usernames/' + cleanUsername.toLowerCase()).once('value');
        if (snap.exists()) {
          setLoading(false);
          setAuthFeedback({ msg: t.errUsernameTaken, kind: 'error' });
          return onToast(t.errUsernameTaken, 'danger');
        }

        if (isGoogleEmail) {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ login_hint: cleanEmail, prompt: 'select_account' });
          const result = await signInWithGoogleResilient(provider);
          if (!result) return;

          if (!result.user || result.user.email?.toLowerCase() !== cleanEmail) {
            await auth.signOut();
            setLoading(false);
            const mismatchMsg = isRtl
              ? 'فشل التحقق: حساب Google لا يطابق البريد المدخل!'
              : 'Verification failed: Google account does not match entered email.';
            setAuthFeedback({ msg: mismatchMsg, kind: 'error' });
            return onToast(mismatchMsg, 'danger');
          }

          if (cleanPassword.length >= 6) {
            try {
              const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, cleanPassword);
              await result.user.linkWithCredential(cred);
            } catch {
              try {
                await result.user.updatePassword(cleanPassword);
              } catch {
                // ignore
              }
            }
          }

          const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
          await db.ref('usernames/' + cleanUsername.toLowerCase()).set(true);
          await result.user.updateProfile({ displayName: cleanUsername, photoURL: avatar });
          await syncUserProfileToDb(result.user, cleanUsername, 'google');
        } else {
          const res = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
          const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
          await db.ref('usernames/' + cleanUsername.toLowerCase()).set(true);
          if (res.user) {
            await res.user.updateProfile({ displayName: cleanUsername, photoURL: avatar });
            await syncUserProfileToDb(res.user, cleanUsername, 'password');
          }
        }
      } else {
        try {
          const res = await auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
          if (res.user) {
            await syncUserProfileToDb(res.user, undefined, 'password');
          }
        } catch (signInErr: unknown) {
          const sErr = signInErr as { code?: string; message?: string };

          if (
            isGoogleEmail &&
            (sErr.code === 'auth/user-not-found' ||
              sErr.code === 'auth/wrong-password' ||
              sErr.code === 'auth/invalid-credential' ||
              sErr.code === 'auth/account-exists-with-different-credential')
          ) {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ login_hint: cleanEmail, prompt: 'select_account' });
            const result = await signInWithGoogleResilient(provider);
            if (!result) return;

            if (!result.user || result.user.email?.toLowerCase() !== cleanEmail) {
              await auth.signOut();
              setLoading(false);
              const mismatchMsg = isRtl
                ? 'فشل التحقق: حساب Google لا يطابق البريد المدخل!'
                : 'Verification failed: Google account does not match entered email.';
              setAuthFeedback({ msg: mismatchMsg, kind: 'error' });
              return onToast(mismatchMsg, 'danger');
            }

            if (cleanPassword.length >= 6) {
              try {
                const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, cleanPassword);
                await result.user.linkWithCredential(cred);
              } catch {
                try {
                  await result.user.updatePassword(cleanPassword);
                } catch {
                  // ignore
                }
              }
            }
            await syncUserProfileToDb(result.user, undefined, 'google');
            return;
          }

          try {
            const methods = await auth.fetchSignInMethodsForEmail(cleanEmail);
            if (methods && methods.includes('google.com') && !methods.includes('password')) {
              const provider = new firebase.auth.GoogleAuthProvider();
              provider.setCustomParameters({ login_hint: cleanEmail });
              const result = await signInWithGoogleResilient(provider);
              if (result?.user) {
                if (cleanPassword.length >= 6) {
                  try {
                    const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, cleanPassword);
                    await result.user.linkWithCredential(cred);
                  } catch {
                    // ignore
                  }
                }
                await syncUserProfileToDb(result.user, undefined, 'google');
              }
              return;
            }
          } catch {
            // ignore
          }

          throw sErr;
        }
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const msg = mapAuthError(error);
      setAuthFeedback({ msg, kind: 'error' });
      onToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = (resetEmail || email).trim().toLowerCase();
    if (!mail) {
      return onToast(t.errFillFields, 'danger');
    }

    setResetLoading(true);
    sound.triggerHaptic('light');

    try {
      await auth.sendPasswordResetEmail(mail);
      setResetSent(true);
      onToast(t.msgResetSent, 'success');
      setTimeout(() => {
        setResetModalOpen(false);
        setResetSent(false);
      }, 3500);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      onToast(mapAuthError(error), 'danger');
    } finally {
      setResetLoading(false);
    }
  };

  const primarySaved = savedAccounts[0] || null;
  const otherSaved = savedAccounts.slice(1);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-between px-4 pt-3 pb-4 overflow-hidden overscroll-none relative z-10 bg-[#030712]">
      {/* Compact Language switcher & PWA install header inside non-scrolling flow */}
      <div className="w-full max-w-sm flex items-center justify-between shrink-0 z-20 pt-[env(safe-area-inset-top,0px)]">
        <PWAInstallButton lang={lang} variant="compact" />

        {onChangeLanguage ? (
          <LanguageSelectorBar
            lang={lang}
            onChangeLanguage={onChangeLanguage}
            variant="inline"
            className="bg-slate-900/95 border border-sky-400/30 px-3 py-1 rounded-full shadow-lg"
          />
        ) : (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 border border-sky-400/30 text-sky-400 text-xs font-bold shadow-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isRtl ? 'English' : 'العربية'}</span>
          </button>
        )}
      </div>

      {/* Main Centered Auth Card (Instagram-grade clean layout) */}
      <div className="w-full max-w-sm my-auto rounded-[28px] bg-slate-900 border border-sky-500/25 p-5 sm:p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Brand Header */}
        <div className="relative w-14 h-14 mx-auto mb-2.5 flex items-center justify-center rounded-2xl bg-slate-950 border border-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.3)]">
          <svg viewBox="0 0 120 90" className="w-9 h-7" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="56" rx="54" ry="14" fill="#6366f1" />
            <ellipse cx="60" cy="34" rx="26" ry="22" fill="#38bdf8" />
            <circle cx="24" cy="56" r="4" fill="#fef08a" />
            <circle cx="60" cy="62" r="4.5" fill="#fef08a" />
            <circle cx="96" cy="56" r="4" fill="#fef08a" />
          </svg>
        </div>

        <h1 className="text-xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-sky-400 tracking-wider mb-0.5">
          {t.appTitle}
        </h1>
        <p className="text-[11px] font-bold text-slate-400 tracking-wider mb-3.5">
          {t.appSub}
        </p>

        {/* Inline Feedback Banner */}
        {authFeedback && (
          <div
            className={`mb-3 px-3 py-2 rounded-2xl text-[11px] font-bold text-start border ${
              authFeedback.kind === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
            }`}
          >
            {authFeedback.msg}
          </div>
        )}

        {/* INSTAGRAM-STYLE SAVED ACCOUNTS VIEW */}
        {mode === 'saved' && primarySaved ? (
          <div className="space-y-3">
            {/* Hero 1-Tap Profile Card */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex flex-col items-center relative">
              <button
                type="button"
                onClick={(e) => handleRemoveSaved(e, primarySaved.uid)}
                title={isRtl ? 'إزالة الحساب المحفوظ' : 'Remove saved account'}
                className="absolute top-2.5 inset-inline-end-2.5 w-7 h-7 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 flex items-center justify-center transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="relative mb-2.5">
                <img
                  src={primarySaved.avatar}
                  alt={primarySaved.name}
                  className="w-16 h-16 rounded-full object-cover bg-slate-900 border-2 border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                />
                {primarySaved.provider === 'google' && (
                  <span className="absolute -bottom-0.5 -end-0.5 w-6 h-6 rounded-full bg-white border-2 border-slate-950 flex items-center justify-center shadow">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </span>
                )}
              </div>

              <div className="text-sm font-black text-white truncate max-w-full">
                {primarySaved.name}
              </div>
              <div className="text-[11px] font-medium text-slate-400 truncate max-w-full mb-3">
                {primarySaved.email}
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleSavedContinue(primarySaved)}
                className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isRtl ? 'جاري التحقق من Google...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <span>
                    {isRtl ? `المتابعة باسم ${primarySaved.name}` : `Continue as ${primarySaved.name}`}
                  </span>
                )}
              </button>
            </div>

            {/* Additional Saved Accounts */}
            {otherSaved.length > 0 && (
              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                {otherSaved.map((acc) => (
                  <div
                    key={acc.uid}
                    onClick={() => !loading && handleSavedContinue(acc)}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-sky-500/40 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-8 h-8 rounded-full object-cover bg-slate-900 border border-slate-700 shrink-0"
                      />
                      <div className="text-start min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">{acc.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSaved(e, acc.uid)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                      aria-label="Remove account"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions: Google switcher & use another account */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGoogleSignIn()}
                className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span className="truncate">{isRtl ? 'حساب Google آخر' : 'Other Google'}</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setAuthFeedback(null);
                  setEmail('');
                  setPassword('');
                  setMode('login');
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{isRtl ? 'حساب آخر' : 'Switch account'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuthFeedback(null);
                setMode('signup');
              }}
              className="mt-1 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer underline underline-offset-4 transition"
            >
              {t.toggleAuthToSignup}
            </button>
          </div>
        ) : (
          /* STANDARD LOGIN / SIGNUP VIEW */
          <>
            {savedAccounts.length > 0 && (
              <div className="flex justify-start mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthFeedback(null);
                    setMode('saved');
                  }}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
                  <span>{isRtl ? 'الرجوع للحسابات المحفوظة' : 'Back to saved accounts'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2.5 text-start">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@station.com"
                  required
                  className="w-full py-2.5 ps-10 pe-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full py-2.5 ps-10 pe-10 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute top-1/2 -translate-y-1/2 inset-inline-end-3 text-slate-500 hover:text-sky-400 p-1 cursor-pointer"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email.trim());
                      setResetModalOpen(true);
                    }}
                    className="text-[11px] font-semibold text-sky-400/90 hover:text-sky-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{t.forgotPassword}</span>
                  </button>
                </div>
              )}

              {mode === 'signup' && (
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t.lblUsernamePlaceholder}
                    required
                    className="w-full py-2.5 ps-10 pe-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && !googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{mode === 'signup' ? t.signup : t.loginBtn}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3 text-xs font-bold text-slate-500">
              <div className="flex-1 h-px bg-slate-800" />
              <span>{isRtl ? 'أو' : 'OR'}</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={() => handleGoogleSignIn()}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                  <span>{isRtl ? 'جاري التحقق...' : 'Connecting...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{t.googleAuth}</span>
                </>
              )}
            </button>

            <div
              onClick={() => {
                setAuthFeedback(null);
                setMode(mode === 'signup' ? 'login' : 'signup');
              }}
              className="mt-3 text-xs font-semibold text-slate-400 hover:text-sky-300 cursor-pointer underline underline-offset-4 transition"
            >
              {mode === 'signup' ? t.toggleAuthToLogin : t.toggleAuthToSignup}
            </div>
          </>
        )}
      </div>

      {/* Bottom spacer for symmetrical vertical balance */}
      <div className="shrink-0 h-1" />

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 shadow-2xl relative text-start overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="absolute top-4 inset-inline-end-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2 text-sky-400 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>{t.forgotPassword}</span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t.resetPasswordPrompt}
            </p>

            {resetSent ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{t.msgResetSent}</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetPassword} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="name@station.com"
                  required
                  className="w-full py-3 px-4 rounded-2xl bg-slate-950 border border-sky-400/30 text-white text-sm outline-none focus:border-sky-400"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-bold text-xs shadow-lg hover:opacity-90 transition cursor-pointer"
                  >
                    {resetLoading ? '...' : t.btnSendReset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="py-3 px-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    {t.btnCancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
