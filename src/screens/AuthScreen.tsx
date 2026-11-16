import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { auth, db, firebase } from '../firebase';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { LanguageSelectorBar } from '../components/LanguageSelectorModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Globe, Mail, Lock, User as UserIcon, LogIn, KeyRound, X, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface Props {
  lang: Language;
  onToggleLanguage?: () => void;
  onChangeLanguage?: (l: Language) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

export const AuthScreen: React.FC<Props> = ({
  lang,
  onToggleLanguage,
  onChangeLanguage,
  onToast
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useBodyScrollLock(resetModalOpen);

  const t = dictionary[lang];

  const sanitizeRtdbKey = (raw: string): string => {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[.#$[\]/\s]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'agent';
  };

  const syncUserProfileToDb = async (user: firebase.User | null, preferredName?: string) => {
    if (!user) return;
    try {
      const snap = await db.ref(`users/${user.uid}`).once('value');
      const existing = snap.val() || {};
      const resolvedName =
        preferredName ||
        existing.name ||
        user.displayName ||
        (user.email ? user.email.split('@')[0] : 'Agent');
      const resolvedAvatar =
        existing.avatar ||
        user.photoURL ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(resolvedName || user.uid)}`;

      const updates: Record<string, unknown> = {
        name: resolvedName,
        avatar: resolvedAvatar
      };
      if (!existing.createdAt) {
        updates.createdAt = firebase.database.ServerValue.TIMESTAMP;
      }
      await db.ref(`users/${user.uid}`).update(updates);
    } catch {
      // Non-blocking
    }
  };

  const mapAuthError = (err: { code?: string; message?: string }): string => {
    const code = err.code || '';
    if (
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential' ||
      code === 'auth/invalid-login-credentials'
    ) {
      return lang === 'ar'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. لو حسابك قديم أو مسجل بـ Google، سجل بـ Google أو أنشئ حساباً جديداً.'
        : t.errWrongCredentials;
    }
    if (code === 'auth/user-not-found') return t.errEmailNotFound;
    if (code === 'auth/email-already-in-use') return t.errEmailInUse;
    if (code === 'auth/weak-password') return t.errWeakPassword;
    if (code === 'auth/invalid-email') return t.errInvalidEmail;
    if (code === 'auth/network-request-failed') return t.errNoInternet;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return t.googleCancelNotice;
    }
    if (code === 'auth/popup-blocked') {
      return lang === 'ar'
        ? 'المتصفح حظر نافذة Google المنبثقة. اسمح بالنوافذ المنبثقة أو افتح اللعبة في تبويب مستقل.'
        : 'Popup blocked by browser. Please allow popups or open the app in a standalone tab.';
    }
    if (code === 'auth/unauthorized-domain') {
      return lang === 'ar'
        ? 'هذا النطاق غير مضاف في Authorized Domains بـ Firebase Authentication.'
        : 'This domain is not listed in Firebase Authorized Domains.';
    }
    if (code === 'auth/operation-not-allowed') {
      return lang === 'ar'
        ? 'طريقة تسجيل الدخول هذه غير مفعلة في إعدادات Firebase Authentication.'
        : 'This sign-in method is not enabled in Firebase Authentication.';
    }
    if (code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/web-storage-unsupported') {
      return lang === 'ar'
        ? 'بيئة العرض الحالية لا تدعم نافذة Google هنا؛ سجل بالبريد وكلمة المرور أو افتح الرابط في المتصفح.'
        : 'This embedded view restricts Google popups; sign in with email & password or open in your browser.';
    }
    if (code === 'auth/account-exists-with-different-credential') {
      return lang === 'ar'
        ? 'هذا البريد مسجل بطريقة دخول أخرى. جرب تسجيل الدخول عبر Google.'
        : 'An account already exists with a different sign-in method. Try Google Sign-In.';
    }
    if (code === 'auth/too-many-requests') {
      return t.tooManyAttemptsNotice;
    }
    return err.message || t.errActionFailed;
  };

  const handleGoogleSignIn = async () => {
    try {
      sound.playTone(550, 'sine', 0.1);
      setLoading(true);
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await auth.signInWithPopup(provider);
      await syncUserProfileToDb(result.user);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
      const isCapacitorNative =
        typeof window !== 'undefined' &&
        Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());

      if (
        !isInIframe &&
        !isCapacitorNative &&
        (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await auth.signInWithRedirect(provider);
          return;
        } catch (redirectErr: unknown) {
          onToast(mapAuthError(redirectErr as { code?: string; message?: string }), 'danger');
          return;
        }
      }

      onToast(mapAuthError(error), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.triggerHaptic('medium');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanPassword.trim()) {
      return onToast(t.errFillFields, 'danger');
    }

    if (cleanPassword.length < 6) {
      return onToast(t.errWeakPassword, 'danger');
    }

    setLoading(true);

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

      if (isSignUp) {
        if (!cleanUsername) {
          setLoading(false);
          return onToast(t.errUsernameRequired, 'danger');
        }

        const safeUsernameKey = sanitizeRtdbKey(cleanUsername);
        try {
          const snap = await db.ref(`usernames/${safeUsernameKey}`).once('value');
          if (snap.exists()) {
            setLoading(false);
            return onToast(t.errUsernameTaken, 'danger');
          }
        } catch {
          // Best-effort uniqueness check
        }

        const res = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

        if (res.user) {
          await res.user.updateProfile({ displayName: cleanUsername, photoURL: avatar }).catch(() => {});
          await db.ref(`usernames/${safeUsernameKey}`).set(true).catch(() => {});
          await syncUserProfileToDb(res.user, cleanUsername);
        }
      } else {
        const res = await auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
        await syncUserProfileToDb(res.user);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      onToast(mapAuthError(error), 'danger');
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#090d16] relative z-10">
      {/* Header Controls */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-20 max-w-5xl mx-auto">
        <PWAInstallButton lang={lang} variant="compact" />

        {onChangeLanguage ? (
          <LanguageSelectorBar
            lang={lang}
            onChangeLanguage={onChangeLanguage}
            variant="inline"
            className="bg-[#111827] border border-slate-800 px-3 py-1 rounded-xl"
          />
        ) : (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111827] border border-slate-800 text-sky-400 text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        )}
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-sm rounded-2xl bg-[#111827] border border-slate-800 p-6 sm:p-7 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-slate-950 border border-slate-800">
          <svg viewBox="0 0 120 90" className="w-10 h-8" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="56" rx="54" ry="14" fill="#6366f1" />
            <ellipse cx="60" cy="34" rx="26" ry="22" fill="#38bdf8" />
            <circle cx="24" cy="56" r="4" fill="#fef08a" />
            <circle cx="60" cy="62" r="4.5" fill="#fef08a" />
            <circle cx="96" cy="56" r="4" fill="#fef08a" />
          </svg>
        </div>

        <h1 className="text-2xl font-black font-heading text-white tracking-tight mb-1">
          {t.appTitle}
        </h1>
        <p className="text-xs font-semibold text-slate-400 mb-6">
          {t.appSub}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-start">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@station.com"
              autoComplete="email"
              required
              className="w-full min-h-[46px] py-2.5 ps-10 pe-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={6}
              required
              className="w-full min-h-[46px] py-2.5 ps-10 pe-10 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 -translate-y-1/2 inset-inline-end-2.5 text-slate-400 hover:text-sky-300 transition cursor-pointer p-1.5"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {!isSignUp && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email.trim());
                  setResetModalOpen(true);
                }}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>{t.forgotPassword}</span>
              </button>
            </div>
          )}

          {isSignUp && (
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t.lblUsernamePlaceholder}
                required
                className="w-full min-h-[46px] py-2.5 ps-10 pe-4 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] mt-2 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-black text-sm transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSignUp ? t.signup : t.loginBtn}</span>
          </button>
        </form>

        <div className="flex items-center gap-3 my-4 text-xs font-semibold text-slate-500">
          <div className="flex-1 h-px bg-slate-800" />
          <span>{lang === 'ar' ? 'أو الدخول عبر Google' : 'Or with Google'}</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>{t.googleAuth}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-xs font-semibold text-slate-400 hover:text-sky-300 cursor-pointer underline underline-offset-4 transition"
        >
          {isSignUp ? t.toggleAuthToLogin : t.toggleAuthToSignup}
        </button>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#111827] border border-slate-800 p-6 shadow-2xl relative text-start overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="absolute top-4 inset-inline-end-4 w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>{t.forgotPassword}</span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {t.resetPasswordPrompt}
            </p>

            {resetSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
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
                  className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-sky-400"
                />

                <p className="text-xs text-slate-400 leading-relaxed">
                  {lang === 'ar'
                    ? 'إذا كنت أنشأت حسابك عبر Google، سيصلك رابط لإنشاء كلمة مرور للدخول بالبريد أيضاً.'
                    : 'If you created your account with Google, this link lets you set a password for email sign-in too.'}
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 min-h-[42px] py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    {resetLoading ? '...' : t.btnSendReset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="min-h-[42px] py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
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
