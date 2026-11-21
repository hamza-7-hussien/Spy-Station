import React, { useState, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { supabase, GOOGLE_OAUTH_CLIENT_ID } from '../supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { LanguageSelectorBar } from '../components/LanguageSelectorModal';
import { GoogleSignInSheet, GoogleLogoSvg } from '../components/GoogleSignInSheet';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import spyStationBanner from '../assets/images/spy_station_banner_1790955326030.webp';
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
  KeyRound,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Users,
  ShieldAlert
} from 'lucide-react';

interface Props {
  lang: Language;
  onToggleLanguage?: () => void;
  onChangeLanguage?: (l: Language) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

type AuthScreenMode = 'saved' | 'login' | 'signup';

const AUTH_COPY: Record<
  Language,
  {
    continueAs: string;
    switchAccount: string;
    continueWithGoogle: string;
    connectingGoogle: string;
    orDivider: string;
    enterPasswordFor: string;
    notYou: string;
    backToSaved: string;
    createAccountTitle: string;
    loginSubtitle: string;
    signupSubtitle: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    popupBlockedNotice: string;
    retryGoogleBtn: string;
    showcaseTitle: string;
    showcaseDesc: string;
    showcaseMeta: string;
    passwordLoginCta: string;
    signingIn: string;
    creatingAccount: string;
  }
> = {
  ar: {
    continueAs: 'المتابعة باسم {name}',
    switchAccount: 'تبديل الحساب',
    continueWithGoogle: 'المتابعة باستخدام Google',
    connectingGoogle: 'جاري تسجيل الدخول عبر Google...',
    orDivider: 'أو',
    enterPasswordFor: 'أدخل كلمة المرور للمتابعة',
    notYou: 'لست {name}؟',
    backToSaved: 'الحسابات المحفوظة',
    createAccountTitle: 'إنشاء حساب عميل جديد',
    loginSubtitle: 'سجّل دخولك للانضمام إلى الغرف والأصدقاء فوراً',
    signupSubtitle: 'أنشئ ملفك التكتيكي وابدأ كشف الجواسيس',
    emailPlaceholder: 'البريد الإلكتروني',
    passwordPlaceholder: 'كلمة المرور',
    popupBlockedNotice: 'تم حظر نافذة Google المنبثقة أو إغلاقها. اسمح بالنوافذ المنبثقة ثم حاول مجدداً.',
    retryGoogleBtn: 'إعادة المحاولة عبر Google',
    showcaseTitle: 'من هو الجاسوس؟',
    showcaseDesc: 'تحدَّ أصدقاءك أونلاين في جولات ذكاء وتلميح وتصويت مباشر داخل المحطة الفضائية.',
    showcaseMeta: 'غرف عامة وخاصة · دردشة صوتية · تصويت مباشر',
    passwordLoginCta: 'تسجيل الدخول',
    signingIn: 'جاري الدخول...',
    creatingAccount: 'جاري إنشاء الحساب...'
  },
  en: {
    continueAs: 'Continue as {name}',
    switchAccount: 'Switch accounts',
    continueWithGoogle: 'Continue with Google',
    connectingGoogle: 'Connecting to Google...',
    orDivider: 'OR',
    enterPasswordFor: 'Enter your password to continue',
    notYou: 'Not {name}?',
    backToSaved: 'Saved accounts',
    createAccountTitle: 'Create your agent account',
    loginSubtitle: 'Sign in to join live stations and play with friends',
    signupSubtitle: 'Set up your profile and start exposing the spy',
    emailPlaceholder: 'Email address',
    passwordPlaceholder: 'Password',
    popupBlockedNotice: 'Google sign-in window was blocked or closed before finishing.',
    retryGoogleBtn: 'Try Google again',
    showcaseTitle: 'Who is the Spy?',
    showcaseDesc: 'Outsmart friends in real-time tactical clue rounds, live voice channels, and emergency ejections.',
    showcaseMeta: 'Public & Private Rooms · Voice Comms · Live Voting',
    passwordLoginCta: 'Log in',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...'
  },
  es: {
    continueAs: 'Continuar como {name}',
    switchAccount: 'Cambiar de cuenta',
    continueWithGoogle: 'Continuar con Google',
    connectingGoogle: 'Conectando con Google...',
    orDivider: 'O',
    enterPasswordFor: 'Ingresa tu contraseña para continuar',
    notYou: '¿No eres {name}?',
    backToSaved: 'Cuentas guardadas',
    createAccountTitle: 'Crear cuenta de agente',
    loginSubtitle: 'Inicia sesión para unirte a estaciones y jugar con amigos',
    signupSubtitle: 'Crea tu perfil y comienza a descubrir al espía',
    emailPlaceholder: 'Correo electrónico',
    passwordPlaceholder: 'Contraseña',
    popupBlockedNotice: 'La ventana de Google fue bloqueada o cerrada antes de finalizar.',
    retryGoogleBtn: 'Reintentar con Google',
    showcaseTitle: '¿Quién es el Espía?',
    showcaseDesc: 'Desafía a tus amigos en rondas tácticas de pistas, voz en vivo y votaciones de emergencia.',
    showcaseMeta: 'Salas Públicas y Privadas · Voz · Votación en Vivo',
    passwordLoginCta: 'Iniciar sesión',
    signingIn: 'Iniciando sesión...',
    creatingAccount: 'Creando cuenta...'
  },
  fr: {
    continueAs: 'Continuer en tant que {name}',
    switchAccount: 'Changer de compte',
    continueWithGoogle: 'Continuer avec Google',
    connectingGoogle: 'Connexion à Google...',
    orDivider: 'OU',
    enterPasswordFor: 'Entrez votre mot de passe pour continuer',
    notYou: 'Pas {name} ?',
    backToSaved: 'Comptes enregistrés',
    createAccountTitle: 'Créer un compte agent',
    loginSubtitle: 'Connectez-vous pour rejoindre les stations et vos amis',
    signupSubtitle: 'Créez votre profil et démasquez l’espion',
    emailPlaceholder: 'Adresse e-mail',
    passwordPlaceholder: 'Mot de passe',
    popupBlockedNotice: 'La fenêtre Google a été bloquée ou fermée avant la fin.',
    retryGoogleBtn: 'Réessayer avec Google',
    showcaseTitle: 'Qui est l’Espion ?',
    showcaseDesc: 'Affrontez vos amis en temps réel avec des indices, le chat vocal et le vote d’urgence.',
    showcaseMeta: 'Salles Publiques & Privées · Audio · Vote en Direct',
    passwordLoginCta: 'Se connecter',
    signingIn: 'Connexion...',
    creatingAccount: 'Création du compte...'
  },
  de: {
    continueAs: 'Weiter als {name}',
    switchAccount: 'Konto wechseln',
    continueWithGoogle: 'Mit Google fortfahren',
    connectingGoogle: 'Mit Google verbinden...',
    orDivider: 'ODER',
    enterPasswordFor: 'Passwort eingeben, um fortzufahren',
    notYou: 'Nicht {name}?',
    backToSaved: 'Gespeicherte Konten',
    createAccountTitle: 'Agentenkonto erstellen',
    loginSubtitle: 'Melde dich an, um Stationen und Freunden beizutreten',
    signupSubtitle: 'Erstelle dein Profil und enttarne den Spion',
    emailPlaceholder: 'E-Mail-Adresse',
    passwordPlaceholder: 'Passwort',
    popupBlockedNotice: 'Das Google-Anmeldefenster wurde blockiert oder vorzeitig geschlossen.',
    retryGoogleBtn: 'Google erneut versuchen',
    showcaseTitle: 'Wer ist der Spion?',
    showcaseDesc: 'Spiele live mit Freunden in taktischen Hinweisrunden, Sprachchat und Notfall-Abstimmungen.',
    showcaseMeta: 'Öffentliche & Private Räume · Sprachchat · Live-Voting',
    passwordLoginCta: 'Anmelden',
    signingIn: 'Anmeldung läuft...',
    creatingAccount: 'Konto wird erstellt...'
  }
};

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

  // Inline Instagram-style password prompt for saved password account
  const [inlinePasswordAccount, setInlinePasswordAccount] = useState<SavedAccountProfile | null>(null);
  const [inlinePassword, setInlinePassword] = useState('');
  const [showInlinePassword, setShowInlinePassword] = useState(false);

  // Account Switcher & Google Sheet modal
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [loadingAccountKey, setLoadingAccountKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{
    msg: string;
    kind: 'error' | 'info';
    showGoogleRetry?: boolean;
  } | null>(null);

  // Password reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [bannerError, setBannerError] = useState(false);

  useBodyScrollLock(resetModalOpen || accountSheetOpen);

  useEffect(() => {
    setSavedAccounts(getSavedAccounts());
  }, []);

  const t = dictionary[lang];
  const copy = AUTH_COPY[lang] || AUTH_COPY.en;
  const isRtl = lang === 'ar';

  const syncUserProfileToDb = async (
    user: SupabaseUser,
    explicitName?: string,
    providerType: 'google' | 'password' = 'password',
    claimUsername = false
  ) => {
    const meta = (user.user_metadata || {}) as Record<string, string | undefined>;
    const cleanName =
      (explicitName || '').trim() ||
      meta.full_name ||
      meta.name ||
      (user.email ? user.email.split('@')[0] : 'Agent');
    const avatar =
      meta.avatar_url ||
      meta.picture ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName || user.id)}`;

    let finalName = cleanName;
    let finalAvatar = avatar;

    try {
      const { data: prof } = await supabase.rpc('ensure_user_profile', {
        p_name: explicitName ? cleanName : null,
        p_avatar: avatar,
        p_claim_username: claimUsername
      });
      if (prof) {
        finalName = (prof as { name?: string }).name || cleanName;
        finalAvatar = (prof as { avatar?: string }).avatar || avatar;
      }
    } catch {
      // Non-fatal profile sync notice; App.tsx also ensures profile on session change
    }

    if (user.email) {
      saveAccountProfile({
        uid: user.id,
        email: user.email,
        name: finalName,
        avatar: finalAvatar,
        provider: providerType
      });
    }
  };

  const mapAuthError = (err: { code?: string; message?: string; status?: number }): { msg: string; showGoogleRetry?: boolean } => {
    const code = (err.code || '').toLowerCase();
    const message = (err.message || '').toLowerCase();

    if (
      code.includes('invalid_credentials') ||
      message.includes('invalid login credentials') ||
      message.includes('invalid password')
    ) {
      return { msg: t.errWrongCredentials };
    }
    if (code.includes('user_not_found') || message.includes('user not found')) {
      return { msg: t.errEmailNotFound };
    }
    if (
      code.includes('email_exists') ||
      code.includes('user_already_exists') ||
      message.includes('already registered') ||
      message.includes('already exists')
    ) {
      return { msg: t.errEmailInUse };
    }
    if (code.includes('weak_password') || message.includes('password should be')) {
      return { msg: t.errWeakPassword };
    }
    if (code.includes('invalid_email') || message.includes('unable to validate email') || message.includes('invalid email')) {
      return { msg: t.errInvalidEmail };
    }
    if (message.includes('username already taken')) {
      return { msg: t.errUsernameTaken };
    }
    if (message.includes('failed to fetch') || message.includes('network')) {
      return { msg: t.errNoInternet };
    }
    if (message.includes('popup') || message.includes('cancel')) {
      return {
        msg: t.googleCancelNotice || copy.popupBlockedNotice,
        showGoogleRetry: true
      };
    }
    if (err.status === 429 || code.includes('over_request_rate_limit') || message.includes('rate limit') || message.includes('too many')) {
      return {
        msg:
          t.tooManyAttemptsNotice ||
          (isRtl
            ? 'محاولات متكررة، انتظر دقيقة أو سجّل عبر Google.'
            : 'Too many attempts. Try Google or wait a moment.')
      };
    }
    return { msg: err.message || t.errActionFailed };
  };

  const triggerNativeAndroidGoogleSignIn = (): Promise<
    | { status: 'success'; idToken: string }
    | { status: 'cancel' }
    | { status: 'error'; code: number; message?: string }
  > => {
    return new Promise((resolve) => {
      const nativeAuth = (
        window as unknown as {
          SpyStationNativeAuth?: {
            isSupported?: () => boolean;
            signInWithGoogle?: (webClientId: string) => void;
          };
        }
      ).SpyStationNativeAuth;

      if (!nativeAuth?.isSupported?.() || !nativeAuth?.signInWithGoogle) {
        resolve({ status: 'error', code: -99, message: 'Native auth unavailable' });
        return;
      }

      let settled = false;
      const cleanup = () => {
        window.removeEventListener('spy-native-google-result', onResult as EventListener);
        clearTimeout(timeoutId);
      };

      const onResult = (ev: CustomEvent<{ status?: string; idToken?: string; code?: number; message?: string }>) => {
        if (settled) return;
        settled = true;
        cleanup();
        const detail = ev.detail || {};
        if (detail.status === 'success' && detail.idToken) {
          resolve({ status: 'success', idToken: detail.idToken });
        } else if (detail.status === 'cancel') {
          resolve({ status: 'cancel' });
        } else {
          resolve({
            status: 'error',
            code: typeof detail.code === 'number' ? detail.code : -1,
            message: detail.message
          });
        }
      };

      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ status: 'cancel' });
      }, 120000);

      window.addEventListener('spy-native-google-result', onResult as EventListener);
      nativeAuth.signInWithGoogle(GOOGLE_OAUTH_CLIENT_ID);
    });
  };

  // Single-step Google Auth: uses Native Android Account Picker inside APK (choose account -> Continue, zero password/2FA) and OAuth redirect on Web
  const signInWithGoogleAccount = async (
    loginHint?: string,
    trackingKey = '__new_google__',
    forceWebFallback = false
  ) => {
    if (loading || googleLoading) return;
    try {
      sound.playTone(560, 'sine', 0.08);
      sound.triggerHaptic('medium');
      setAuthFeedback(null);
      setGoogleLoading(true);
      setLoading(true);
      setLoadingAccountKey(trackingKey);

      const nativeAuth = (
        window as unknown as {
          SpyStationNativeAuth?: { isSupported?: () => boolean };
        }
      ).SpyStationNativeAuth;

      if (!forceWebFallback && nativeAuth?.isSupported?.() && GOOGLE_OAUTH_CLIENT_ID) {
        const nativeRes = await triggerNativeAndroidGoogleSignIn();
        if (nativeRes.status === 'success') {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: nativeRes.idToken
          });
          if (error) throw error;
          if (data?.user) {
            await syncUserProfileToDb(data.user, undefined, 'google');
            setAccountSheetOpen(false);
          }
          return;
        }
        if (nativeRes.status === 'cancel') {
          return;
        }
        // Fallback to web OAuth flow if Play Services native fails
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: loginHint ? { login_hint: loginHint } : { prompt: 'select_account' }
        }
      });
      if (error) throw error;
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string; status?: number };
      const mapped = mapAuthError(error);
      setAuthFeedback({
        msg: mapped.msg,
        kind: (error.message || '').toLowerCase().includes('cancel') ? 'info' : 'error',
        showGoogleRetry: mapped.showGoogleRetry
      });
    } finally {
      setGoogleLoading(false);
      setLoading(false);
      setLoadingAccountKey(null);
    }
  };

  const handleSavedAccountAction = (account: SavedAccountProfile) => {
    sound.triggerHaptic('medium');
    setAuthFeedback(null);
    if (account.provider === 'google') {
      signInWithGoogleAccount(account.email, account.uid);
    } else {
      setAccountSheetOpen(false);
      if (mode === 'saved' && primarySaved?.uid === account.uid) {
        setInlinePasswordAccount(account);
        setInlinePassword('');
      } else {
        setEmail(account.email);
        setPassword('');
        setMode('login');
        setAuthFeedback({
          msg: `${copy.enterPasswordFor} (${account.name})`,
          kind: 'info'
        });
      }
    }
  };

  const handleInlinePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePasswordAccount || loading) return;
    const cleanPassword = inlinePassword.trim();
    if (!cleanPassword) {
      setAuthFeedback({ msg: t.errFillFields, kind: 'error' });
      return onToast(t.errFillFields, 'danger');
    }

    setLoading(true);
    setAuthFeedback(null);
    sound.triggerHaptic('medium');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: inlinePasswordAccount.email,
        password: cleanPassword
      });
      if (error) throw error;
      if (data.user) {
        await syncUserProfileToDb(data.user, undefined, 'password');
      }
    } catch (err: unknown) {
      const mapped = mapAuthError(err as { code?: string; message?: string; status?: number });
      setAuthFeedback({ msg: mapped.msg, kind: 'error' });
      onToast(mapped.msg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = (e: React.MouseEvent, uidOrEmail: string) => {
    e.stopPropagation();
    sound.playClick();
    const remaining = removeSavedAccount(uidOrEmail);
    setSavedAccounts(remaining);
    if (inlinePasswordAccount?.uid === uidOrEmail) {
      setInlinePasswordAccount(null);
      setInlinePassword('');
    }
    if (remaining.length === 0) {
      setAccountSheetOpen(false);
      setMode('login');
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
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

    setLoading(true);

    try {
      if (isSignUp) {
        if (!cleanUsername) {
          setLoading(false);
          setAuthFeedback({ msg: t.errUsernameRequired, kind: 'error' });
          return onToast(t.errUsernameRequired, 'danger');
        }

        const { data: available } = await supabase.rpc('is_username_available', {
          p_username: cleanUsername
        });
        if (available === false) {
          setLoading(false);
          setAuthFeedback({ msg: t.errUsernameTaken, kind: 'error' });
          return onToast(t.errUsernameTaken, 'danger');
        }

        const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            data: {
              full_name: cleanUsername,
              name: cleanUsername,
              avatar_url: avatar
            }
          }
        });
        if (error) throw error;

        if (data.user) {
          await syncUserProfileToDb(data.user, cleanUsername, 'password', true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });
        if (error) throw error;
        if (data.user) {
          await syncUserProfileToDb(data.user, undefined, 'password');
        }
      }
    } catch (err: unknown) {
      const mapped = mapAuthError(err as { code?: string; message?: string; status?: number });
      setAuthFeedback({ msg: mapped.msg, kind: 'error' });
      onToast(mapped.msg, 'danger');
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
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setResetSent(true);
      onToast(t.msgResetSent, 'success');
      setTimeout(() => {
        setResetModalOpen(false);
        setResetSent(false);
      }, 3000);
    } catch (err: unknown) {
      const mapped = mapAuthError(err as { code?: string; message?: string; status?: number });
      onToast(mapped.msg, 'danger');
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleButtonTap = () => {
    const nativeAuth = (
      window as unknown as {
        SpyStationNativeAuth?: { isSupported?: () => boolean };
      }
    ).SpyStationNativeAuth;
    if (nativeAuth?.isSupported?.()) {
      signInWithGoogleAccount();
      return;
    }

    const savedGoogleAccounts = savedAccounts.filter((a) => a.provider === 'google');
    if (savedGoogleAccounts.length > 0 && mode !== 'saved') {
      sound.playClick();
      setAccountSheetOpen(true);
      return;
    }
    signInWithGoogleAccount();
  };

  const primarySaved = savedAccounts[0] || null;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col justify-between bg-[#030712] text-slate-100 overflow-hidden overscroll-none relative z-10">
      {/* Subtle radial atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),transparent_55%)]"
      />

      {/* Top Utility Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2 flex items-center justify-between gap-4 shrink-0 relative z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 120 90" className="w-6 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <ellipse cx="60" cy="56" rx="54" ry="14" fill="#6366f1" />
              <ellipse cx="60" cy="34" rx="26" ry="22" fill="#38bdf8" />
              <circle cx="24" cy="56" r="4" fill="#fef08a" />
              <circle cx="60" cy="62" r="4.5" fill="#fef08a" />
              <circle cx="96" cy="56" r="4" fill="#fef08a" />
            </svg>
          </div>
          <span className="font-heading font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap shrink-0">
            {t.appTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton lang={lang} variant="compact" />
          {onChangeLanguage ? (
            <LanguageSelectorBar
              lang={lang}
              onChangeLanguage={onChangeLanguage}
              variant="inline"
              className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full min-h-[40px]"
            />
          ) : (
            <button
              type="button"
              onClick={onToggleLanguage}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-900 border border-slate-800 text-sky-400 text-xs font-bold hover:bg-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Globe className="w-4 h-4" />
              <span>{isRtl ? 'English' : 'العربية'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Stage */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
        {/* Desktop Showcase Panel */}
        <section className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 aspect-[4/3] relative">
          {!bannerError ? (
            <img
              src={spyStationBanner}
              alt="Spy Station Orbital Deck"
              referrerPolicy="no-referrer"
              decoding="async"
              onError={() => setBannerError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center">
              <ShieldAlert className="w-16 h-16 text-sky-400/30" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/15" />

          <div className="relative z-10 mt-auto p-7 text-start space-y-2.5">
            <h2 className="text-2xl font-bold font-heading text-white leading-tight">
              {copy.showcaseTitle}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              {copy.showcaseDesc}
            </p>
            <div className="pt-1 text-xs font-medium text-sky-300/90">
              {copy.showcaseMeta}
            </div>
          </div>
        </section>

        {/* Auth Container */}
        <section className="col-span-1 lg:col-span-6 w-full max-w-md mx-auto">
          <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 shadow-2xl">
            {/* Inline Feedback Banner */}
            {authFeedback && (
              <div
                className={`mb-4 px-4 py-3 rounded-2xl text-xs font-semibold text-start border space-y-2 ${
                  authFeedback.kind === 'error'
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                    : 'bg-sky-950/60 border-sky-500/40 text-sky-200'
                }`}
              >
                <p className="leading-relaxed">{authFeedback.msg}</p>
                {authFeedback.showGoogleRetry && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => signInWithGoogleAccount()}
                    className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs inline-flex items-center gap-2 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <GoogleLogoSvg className="w-3.5 h-3.5" />
                    <span>{copy.retryGoogleBtn}</span>
                  </button>
                )}
              </div>
            )}

            {/* INSTAGRAM-STYLE SAVED ACCOUNT WELCOME HUB */}
            {mode === 'saved' && primarySaved ? (
              <div className="text-center space-y-5">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold font-heading text-white">
                    {t.appTitle}
                  </h1>
                  <p className="text-xs text-slate-400">
                    {t.appSub}
                  </p>
                </div>

                {/* Primary Profile Ring & Info */}
                <div className="flex flex-col items-center pt-1">
                  <div className="relative mb-3">
                    <div className="p-1 rounded-full bg-gradient-to-tr from-sky-400 via-indigo-400 to-sky-400">
                      <img
                        src={primarySaved.avatar}
                        alt={primarySaved.name}
                        referrerPolicy="no-referrer"
                        decoding="async"
                        className="w-20 h-20 rounded-full object-cover bg-slate-950 border-2 border-slate-900"
                      />
                    </div>
                    {primarySaved.provider === 'google' && (
                      <span
                        title="Google"
                        className="absolute bottom-0.5 end-0.5 w-7 h-7 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center shadow-md"
                      >
                        <GoogleLogoSvg className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                  <div className="text-base font-bold text-white truncate max-w-full">
                    {primarySaved.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate max-w-full mt-0.5">
                    {primarySaved.email}
                  </div>
                </div>

                {/* Inline password entry when tapping Continue on a password-saved account */}
                {inlinePasswordAccount && inlinePasswordAccount.uid === primarySaved.uid ? (
                  <form onSubmit={handleInlinePasswordSubmit} className="space-y-3 text-start">
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                      <input
                        type={showInlinePassword ? 'text' : 'password'}
                        value={inlinePassword}
                        onChange={(e) => setInlinePassword(e.target.value)}
                        placeholder={copy.passwordPlaceholder}
                        autoFocus
                        required
                        className="w-full min-h-[48px] py-3 ps-11 pe-12 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInlinePassword((s) => !s)}
                        className="absolute top-1/2 -translate-y-1/2 end-1.5 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-sky-400 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInlinePasswordAccount(null);
                          setInlinePassword('');
                        }}
                        className="min-h-[40px] text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                      >
                        {t.btnCancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(primarySaved.email);
                          setResetModalOpen(true);
                        }}
                        className="min-h-[40px] text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{copy.signingIn}</span>
                        </>
                      ) : (
                        <span>{copy.passwordLoginCta}</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-2.5">
                    {/* Hero Primary Continue CTA */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSavedAccountAction(primarySaved)}
                      className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-60"
                    >
                      {googleLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{copy.connectingGoogle}</span>
                        </>
                      ) : (
                        <>
                          {primarySaved.provider === 'google' && (
                            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                              <GoogleLogoSvg className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="truncate">
                            {copy.continueAs.replace('{name}', primarySaved.name)}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Switch Account Sheet Trigger */}
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        sound.playClick();
                        setAccountSheetOpen(true);
                      }}
                      className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <Users className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{copy.switchAccount}</span>
                    </button>
                  </div>
                )}

                {/* Bottom subtle links */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAuthFeedback(null);
                      setInlinePasswordAccount(null);
                      setMode('login');
                    }}
                    className="min-h-[44px] text-slate-400 hover:text-white font-medium cursor-pointer truncate"
                  >
                    {copy.notYou.replace('{name}', primarySaved.name)}
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAuthFeedback(null);
                      setInlinePasswordAccount(null);
                      setMode('signup');
                    }}
                    className="min-h-[44px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {t.signup}
                  </button>
                </div>
              </div>
            ) : (
              /* MODERN SOCIAL-FIRST LOGIN / SIGNUP VIEW */
              <div className="space-y-4">
                {savedAccounts.length > 0 && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAuthFeedback(null);
                      setMode('saved');
                    }}
                    className="min-h-[40px] -mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                    <span>{copy.backToSaved}</span>
                  </button>
                )}

                <div className="text-center space-y-1">
                  <h1 className="text-xl font-bold font-heading text-white">
                    {mode === 'signup' ? copy.createAccountTitle : t.appTitle}
                  </h1>
                  <p className="text-xs text-slate-400">
                    {mode === 'signup' ? copy.signupSubtitle : copy.loginSubtitle}
                  </p>
                </div>

                {/* Primary Google Sign-In CTA (Big-App Social-First Hierarchy) */}
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleButtonTap}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-700 shrink-0" />
                      <span>{copy.connectingGoogle}</span>
                    </>
                  ) : (
                    <>
                      <GoogleLogoSvg className="w-5 h-5 shrink-0" />
                      <span>{copy.continueWithGoogle}</span>
                    </>
                  )}
                </button>

                {/* Clean Hairline Divider */}
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span>{copy.orDivider}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3 text-start">
                  {mode === 'signup' && (
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder={t.lblUsernamePlaceholder}
                        required
                        maxLength={32}
                        className="w-full min-h-[48px] py-3 ps-11 pe-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={copy.emailPlaceholder}
                      required
                      className="w-full min-h-[48px] py-3 ps-11 pe-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={copy.passwordPlaceholder}
                      required
                      minLength={6}
                      className="w-full min-h-[48px] py-3 ps-11 pe-12 rounded-2xl bg-slate-950 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute top-1/2 -translate-y-1/2 end-1.5 w-10 h-10 flex items-center justify-center text-slate-400 hover:text-sky-400 cursor-pointer"
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
                        className="min-h-[36px] text-xs font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{t.forgotPassword}</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    {loading && !googleLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{mode === 'signup' ? copy.creatingAccount : copy.signingIn}</span>
                      </>
                    ) : (
                      <span>{mode === 'signup' ? t.signup : copy.passwordLoginCta}</span>
                    )}
                  </button>
                </form>

                {/* Switch Login / Sign Up */}
                <div className="pt-2 border-t border-slate-800/80 text-center">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setAuthFeedback(null);
                      setMode(mode === 'signup' ? 'login' : 'signup');
                    }}
                    className="min-h-[44px] text-xs font-semibold text-slate-300 hover:text-sky-400 transition cursor-pointer"
                  >
                    {mode === 'signup' ? t.toggleAuthToLogin : t.toggleAuthToSignup}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Bottom Safe-Area Spacer */}
      <footer className="pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-1 text-center text-[11px] text-slate-600 shrink-0 relative z-10">
        <span>Spy Station · Online Social Deduction</span>
      </footer>

      {/* Instagram-style Account Switcher & Google Picker Sheet */}
      <GoogleSignInSheet
        open={accountSheetOpen}
        lang={lang}
        savedAccounts={savedAccounts}
        loadingAccountKey={loadingAccountKey}
        onClose={() => setAccountSheetOpen(false)}
        onSelectSavedAccount={handleSavedAccountAction}
        onRemoveSavedAccount={handleRemoveSaved}
        onContinueWithNewGoogle={() => signInWithGoogleAccount(undefined, '__new_google__')}
        onSwitchToEmailLogin={() => {
          setAccountSheetOpen(false);
          setInlinePasswordAccount(null);
          setEmail('');
          setPassword('');
          setMode('login');
        }}
        onSwitchToSignUp={() => {
          setAccountSheetOpen(false);
          setInlinePasswordAccount(null);
          setMode('signup');
        }}
      />

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative text-start overscroll-contain">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              aria-label="Close"
              className="absolute top-3.5 end-3.5 min-w-[44px] min-h-[44px] rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
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
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{t.msgResetSent}</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetPassword} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@station.com"
                  required
                  className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm outline-none focus:border-sky-400"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-60"
                  >
                    {resetLoading ? '...' : t.btnSendReset}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition cursor-pointer"
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
