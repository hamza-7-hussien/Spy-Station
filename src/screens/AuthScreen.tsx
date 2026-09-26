import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { auth, db, firebase } from '../firebase';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Globe, Mail, Lock, User as UserIcon, Sparkles, KeyRound, X, CheckCircle2 } from 'lucide-react';

interface Props {
  lang: Language;
  onToggleLanguage: () => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

export const AuthScreen: React.FC<Props> = ({ lang, onToggleLanguage, onToast }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const t = dictionary[lang];

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
    if (code === 'auth/popup-closed-by-user') {
      return lang === 'ar' ? 'تم إلغاء نافذة الدخول عبر جوجل.' : 'Google sign-in popup was cancelled.';
    }
    if (code === 'auth/too-many-requests') {
      return lang === 'ar'
        ? 'تم حظر المحاولات مؤقتاً لتكرارها. جرب تسجيل الدخول عبر Google أو انتظر دقيقة.'
        : 'Too many attempts. Please try Google Sign-In or wait a moment.';
    }
    return err.message || t.errActionFailed;
  };

  const handleGoogleSignIn = async () => {
    try {
      sound.playTone(550, 'sine', 0.1);
      setLoading(true);
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      onToast(mapAuthError(error), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.triggerHaptic('medium');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanUsername = username.trim();

    if (!cleanEmail || !cleanPassword) {
      return onToast(t.errFillFields, 'danger');
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!cleanUsername) {
          setLoading(false);
          return onToast(t.errUsernameRequired, 'danger');
        }

        const snap = await db.ref('usernames/' + cleanUsername.toLowerCase()).once('value');
        if (snap.exists()) {
          setLoading(false);
          return onToast(t.errUsernameTaken, 'danger');
        }

        const res = await auth.createUserWithEmailAndPassword(cleanEmail, cleanPassword);
        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
        await db.ref('usernames/' + cleanUsername.toLowerCase()).set(true);
        if (res.user) {
          await res.user.updateProfile({ displayName: cleanUsername, photoURL: avatar });
          await db.ref(`users/${res.user.uid}`).update({
            name: cleanUsername,
            avatar,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });
        }
      } else {
        try {
          await auth.signInWithEmailAndPassword(cleanEmail, cleanPassword);
        } catch (signInErr: unknown) {
          const sErr = signInErr as { code?: string; message?: string };
          // Check if user originally signed up with Google
          try {
            const methods = await auth.fetchSignInMethodsForEmail(cleanEmail);
            if (methods && methods.includes('google.com') && !methods.includes('password')) {
              onToast(
                lang === 'ar'
                  ? 'هذا الحساب مسجل عبر Google! جاري فتح Google للتحقق وربط كلمة المرور هذه بحسابك لتسجيل دخولك بها دائماً...'
                  : 'Account registered with Google! Verifying with Google to link this password for future direct logins...',
                'normal'
              );
              const provider = new firebase.auth.GoogleAuthProvider();
              provider.setCustomParameters({ login_hint: cleanEmail });
              const result = await auth.signInWithPopup(provider);
              if (result.user && cleanPassword.length >= 6) {
                try {
                  const cred = firebase.auth.EmailAuthProvider.credential(cleanEmail, cleanPassword);
                  await result.user.linkWithCredential(cred);
                  onToast(
                    lang === 'ar'
                      ? 'تم ربط كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بها مباشرة في أي وقت.'
                      : 'Password linked successfully! You can now sign in with your email & password.',
                    'success'
                  );
                } catch (linkErr) {
                  console.warn('Could not auto-link password credential:', linkErr);
                }
              }
              return;
            }
          } catch (checkErr) {
            console.warn('fetchSignInMethods error:', checkErr);
          }
          throw sErr;
        }
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      const msg = mapAuthError(error);
      onToast(msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = (resetEmail || email).trim();
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative z-10">
      {/* Language switcher & PWA install header */}
      <div className="fixed top-4 left-4 right-4 flex items-center justify-between z-20">
        <PWAInstallButton lang={lang} variant="compact" />

        <button
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-sky-400/30 text-sky-400 text-xs font-bold shadow-lg shadow-sky-500/20 backdrop-blur-md hover:bg-slate-800 transition cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm rounded-[32px] bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-sky-500/30 p-7 shadow-2xl backdrop-blur-2xl relative overflow-hidden text-center">
        {/* Glow backdrop inside card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Cyber Logo Badge */}
        <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-slate-950 border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.45)]">
          <div className="absolute inset-[-4px] rounded-full border border-dashed border-purple-400 animate-spin-slow pointer-events-none opacity-60" />
          <svg viewBox="0 0 120 90" className="w-12 h-10" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="60" cy="56" rx="54" ry="14" fill="#6366f1" />
            <ellipse cx="60" cy="34" rx="26" ry="22" fill="#38bdf8" />
            <circle cx="24" cy="56" r="4" fill="#fef08a" />
            <circle cx="60" cy="62" r="4.5" fill="#fef08a" />
            <circle cx="96" cy="56" r="4" fill="#fef08a" />
          </svg>
        </div>

        <h1 className="text-2xl font-black font-heading text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-300 to-sky-400 animate-shine tracking-wider mb-1">
          {t.appTitle}
        </h1>
        <p className="text-[11px] font-bold text-sky-400/80 tracking-widest uppercase mb-6">
          {t.appSub}
        </p>

        {/* Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm flex items-center justify-center gap-3 shadow-lg shadow-white/10 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer mb-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>{t.googleAuth}</span>
        </button>

        <p className="text-[10px] text-slate-400 mb-4 font-semibold">
          {lang === 'ar' ? '💡 مسجل بجوجل من قبل؟ اضغط الزر أعلاه للدخول الفوري' : '💡 Signed in with Google before? Tap above for instant access'}
        </p>

        <div className="flex items-center gap-3 my-3 text-xs font-bold text-slate-500">
          <div className="flex-1 h-px bg-slate-800" />
          <span>{lang === 'ar' ? 'أو بالبريد وكلمة المرور' : 'OR WITH PASSWORD'}</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-start">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@station.com"
              required
              className="w-full py-3 ps-10 pe-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 focus:border-sky-400 text-white text-sm outline-none transition focus:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full py-3 ps-10 pe-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 focus:border-sky-400 text-white text-sm outline-none transition focus:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
            />
          </div>

          {/* Forgot / Set Password Link */}
          {!isSignUp && (
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

          {isSignUp && (
            <div className="relative animate-in fade-in duration-200">
              <UserIcon className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={lang === 'ar' ? 'اسم اللاعب 👤' : 'Agent Username 👤'}
                required
                className="w-full py-3 ps-10 pe-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 focus:border-sky-400 text-white text-sm outline-none transition focus:shadow-[0_0_15px_rgba(56,189,248,0.25)]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isSignUp ? t.signup : t.loginBtn}</span>
          </button>
        </form>

        <div
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-xs font-semibold text-slate-400 hover:text-sky-300 cursor-pointer underline underline-offset-4 transition"
        >
          {isSignUp ? t.toggleAuthToLogin : t.toggleAuthToSignup}
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-sky-500/30 p-6 shadow-2xl relative text-start">
            <button
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

                <p className="text-[11px] text-slate-400">
                  {lang === 'ar'
                    ? '💡 إذا كنت أنشأت حسابك بجوجل، سيصلك رابط لإنشاء كلمة مرور لحسابك حتى تتمكن من الدخول بالإيميل والباسورد أيضاً.'
                    : '💡 If you created your account with Google, this link allows you to create a password so you can sign in with email & password as well.'}
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 hover:opacity-90 transition cursor-pointer"
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
