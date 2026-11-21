import React from 'react';
import { Language } from '../types';
import { SavedAccountProfile } from '../utils/savedAccounts';
import { X, Mail, UserPlus, Trash2, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  lang: Language;
  savedAccounts: SavedAccountProfile[];
  loadingAccountKey: string | null;
  onClose: () => void;
  onSelectSavedAccount: (account: SavedAccountProfile) => void;
  onRemoveSavedAccount: (e: React.MouseEvent, uidOrEmail: string) => void;
  onContinueWithNewGoogle: () => void;
  onSwitchToEmailLogin: () => void;
  onSwitchToSignUp: () => void;
}

const SHEET_COPY: Record<
  Language,
  {
    title: string;
    subtitle: string;
    addGoogle: string;
    useEmail: string;
    createAccount: string;
    googleBadge: string;
    passwordBadge: string;
    removeTitle: string;
    connecting: string;
    securityNote: string;
  }
> = {
  ar: {
    title: 'اختيار حساب للدخول',
    subtitle: 'اختر حساباً محفوظاً أو أدخل بحساب Google جديد',
    addGoogle: 'المتابعة بحساب Google آخر',
    useEmail: 'الدخول بالبريد الإلكتروني وكلمة المرور',
    createAccount: 'إنشاء حساب جديد',
    googleBadge: 'Google',
    passwordBadge: 'البريد',
    removeTitle: 'إزالة الحساب',
    connecting: 'جاري الاتصال بـ Google...',
    securityNote: 'مصادقة آمنة ومشفرة عبر Google و Supabase'
  },
  en: {
    title: 'Choose an account',
    subtitle: 'Pick a saved profile or continue with another Google account',
    addGoogle: 'Continue with another Google account',
    useEmail: 'Log in with email & password',
    createAccount: 'Create new account',
    googleBadge: 'Google',
    passwordBadge: 'Email',
    removeTitle: 'Remove account',
    connecting: 'Connecting to Google...',
    securityNote: 'Secured by Google Identity & Supabase Auth'
  },
  es: {
    title: 'Elegir una cuenta',
    subtitle: 'Selecciona una cuenta guardada o entra con otra cuenta de Google',
    addGoogle: 'Continuar con otra cuenta de Google',
    useEmail: 'Iniciar sesión con correo y contraseña',
    createAccount: 'Crear cuenta nueva',
    googleBadge: 'Google',
    passwordBadge: 'Correo',
    removeTitle: 'Eliminar cuenta',
    connecting: 'Conectando con Google...',
    securityNote: 'Protegido por Google y Supabase Auth'
  },
  fr: {
    title: 'Choisir un compte',
    subtitle: 'Sélectionnez un profil enregistré ou utilisez un autre compte Google',
    addGoogle: 'Continuer avec un autre compte Google',
    useEmail: 'Connexion par e-mail et mot de passe',
    createAccount: 'Créer un nouveau compte',
    googleBadge: 'Google',
    passwordBadge: 'E-mail',
    removeTitle: 'Supprimer le compte',
    connecting: 'Connexion à Google...',
    securityNote: 'Sécurisé par Google et Supabase Auth'
  },
  de: {
    title: 'Konto auswählen',
    subtitle: 'Wähle ein gespeichertes Profil oder melde dich mit Google an',
    addGoogle: 'Mit anderem Google-Konto fortfahren',
    useEmail: 'Mit E-Mail & Passwort anmelden',
    createAccount: 'Neues Konto erstellen',
    googleBadge: 'Google',
    passwordBadge: 'E-Mail',
    removeTitle: 'Konto entfernen',
    connecting: 'Verbindung mit Google...',
    securityNote: 'Gesichert durch Google & Supabase Auth'
  }
};

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const GoogleSignInSheet: React.FC<Props> = ({
  open,
  lang,
  savedAccounts,
  loadingAccountKey,
  onClose,
  onSelectSavedAccount,
  onRemoveSavedAccount,
  onContinueWithNewGoogle,
  onSwitchToEmailLogin,
  onSwitchToSignUp
}) => {
  if (!open) return null;

  const copy = SHEET_COPY[lang] || SHEET_COPY.en;
  const isRtl = lang === 'ar';
  const isAnyLoading = loadingAccountKey !== null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150 overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isAnyLoading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-sheet-title"
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-800 shadow-2xl overflow-hidden text-start"
      >
        {/* Mobile bottom-sheet drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 sm:pt-5 pb-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="account-sheet-title" className="text-base font-bold text-white truncate">
              {copy.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {copy.subtitle}
            </p>
          </div>
          <button
            type="button"
            disabled={isAnyLoading}
            onClick={onClose}
            aria-label="Close"
            className="min-w-[44px] min-h-[44px] -me-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 max-h-[75dvh] overflow-y-auto">
          {/* Saved Accounts List */}
          {savedAccounts.length > 0 && (
            <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              {savedAccounts.map((acc) => {
                const isRowLoading = loadingAccountKey === acc.uid;
                return (
                  <div
                    key={acc.uid}
                    className="flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-slate-900/90 transition"
                  >
                    <button
                      type="button"
                      disabled={isAnyLoading}
                      onClick={() => onSelectSavedAccount(acc)}
                      className="flex-1 min-w-0 min-h-[44px] flex items-center gap-3 text-start cursor-pointer disabled:opacity-60"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={acc.avatar}
                          alt={acc.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover bg-slate-900 border border-slate-700"
                        />
                        {acc.provider === 'google' && (
                          <span className="absolute -bottom-0.5 -end-0.5 w-4.5 h-4.5 rounded-full bg-white border border-slate-900 flex items-center justify-center shadow">
                            <GoogleLogoSvg className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-100 truncate">
                          {acc.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                          <span className="truncate">{acc.email}</span>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0 text-slate-500">
                            {acc.provider === 'google' ? copy.googleBadge : copy.passwordBadge}
                          </span>
                        </div>
                      </div>

                      {isRowLoading ? (
                        <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                      ) : (
                        <ChevronRight
                          className={`w-4 h-4 text-slate-500 shrink-0 ${isRtl ? 'rotate-180' : ''}`}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isAnyLoading}
                      onClick={(e) => onRemoveSavedAccount(e, acc.uid)}
                      title={copy.removeTitle}
                      aria-label={copy.removeTitle}
                      className="min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Primary Google Sign-In Action */}
          <button
            type="button"
            disabled={isAnyLoading}
            onClick={onContinueWithNewGoogle}
            className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-sm transition cursor-pointer disabled:opacity-60"
          >
            {loadingAccountKey === '__new_google__' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-700 shrink-0" />
                <span className="truncate">{copy.connecting}</span>
              </>
            ) : (
              <>
                <GoogleLogoSvg className="w-5 h-5 shrink-0" />
                <span className="truncate">{copy.addGoogle}</span>
              </>
            )}
          </button>

          {/* Secondary Account Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={isAnyLoading}
              onClick={onSwitchToEmailLogin}
              className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate">{copy.useEmail}</span>
            </button>

            <button
              type="button"
              disabled={isAnyLoading}
              onClick={onSwitchToSignUp}
              className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{copy.createAccount}</span>
            </button>
          </div>

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{copy.securityNote}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
