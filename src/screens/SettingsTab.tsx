import React, { useState, useEffect } from 'react';
import { dictionary } from '../translations';
import { Language } from '../types';
import { storage, auth, firebase } from '../firebase';
import { sound } from '../audio';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Settings,
  Upload,
  Volume2,
  Globe,
  LogOut,
  Smartphone,
  User as UserIcon,
  Sparkles,
  Link as LinkIcon,
  Lock,
  KeyRound
} from 'lucide-react';

interface Props {
  lang: Language;
  userId: string;
  userName: string;
  userAvatar: string;
  onUpdateProfile: (name: string, avatar: string) => Promise<void>;
  onChangeLanguage: (l: Language) => void;
  onLogout: () => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

// Curated Cyber & Space Avatar presets
const AVATAR_PRESETS = [
  { id: 'astro1', label: 'Astronaut', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=astro-alpha' },
  { id: 'alien1', label: 'Alien', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alien-zeta' },
  { id: 'cyber1', label: 'Cyborg', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cyber-v' },
  { id: 'robot1', label: 'Robot', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=neon-droid' },
  { id: 'cat1', label: 'Cosmic Cat', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=space-neko' },
  { id: 'spy1', label: 'Agent', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=secret-spy' },
  { id: 'pilot1', label: 'Commander', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=star-pilot' },
  { id: 'hacker1', label: 'Hacker', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=matrix-ghost' },
];

/**
 * Resizes an image file to a compressed square avatar using HTML5 Canvas.
 * This guarantees 100% reliable image storage without relying on external bucket rules.
 */
function compressImageToDataUrl(file: File, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        // Center-crop into square
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, maxSize, maxSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SettingsTab: React.FC<Props> = ({
  lang,
  userId,
  userName,
  userAvatar,
  onUpdateProfile,
  onChangeLanguage,
  onLogout,
  onToast
}) => {
  const { isInstalled } = usePWAInstall();
  const [name, setName] = useState(userName);
  const [avatarUrl, setAvatarUrl] = useState(userAvatar);
  const [volume, setVolume] = useState(sound.getVolume());
  const [uploading, setUploading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const t = dictionary[lang];

  // Sync state whenever props change
  useEffect(() => {
    setName(userName);
  }, [userName]);

  useEffect(() => {
    setAvatarUrl(userAvatar);
  }, [userAvatar]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return onToast(t.errPhotoUpload, 'danger');
    }

    setUploading(true);
    sound.triggerHaptic('light');

    try {
      // 1. Process client-side to a compressed 256x256 WebP/JPEG data url
      const compressedDataUrl = await compressImageToDataUrl(file, 256);
      setAvatarUrl(compressedDataUrl);

      // 2. Immediately save the compressed photo to user profile
      await onUpdateProfile(name.trim() || userName, compressedDataUrl);
      onToast(t.msgPhotoUploaded, 'success');

      // 3. If Firebase Storage is available, upload in background to save permanent URL
      if (storage) {
        try {
          const fileRef = storage.ref(`avatars/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
          await fileRef.put(file);
          const downloadUrl = await fileRef.getDownloadURL();
          setAvatarUrl(downloadUrl);
          await onUpdateProfile(name.trim() || userName, downloadUrl);
        } catch (storageErr) {
          console.warn('Storage background upload skipped, kept data URL:', storageErr);
        }
      }
    } catch (err) {
      console.error('Photo upload process failed:', err);
      onToast(t.errPhotoUpload, 'danger');
    } finally {
      setUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    sound.triggerHaptic('light');
    setAvatarUrl(presetUrl);
    try {
      await onUpdateProfile(name.trim() || userName, presetUrl);
      onToast(t.msgSettingsSaved, 'success');
    } catch {
      onToast(t.errActionFailed, 'danger');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    sound.setVolume(val);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPassword.trim();
    if (!clean || clean.length < 6) {
      return onToast(t.errWeakPassword, 'danger');
    }

    setPasswordLoading(true);
    sound.triggerHaptic('light');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error(lang === 'ar' ? 'غير مسجل الدخول' : 'Not logged in');
      const email = user.email;
      if (!email) throw new Error(lang === 'ar' ? 'لا يوجد بريد إلكتروني مرتبط بحسابك' : 'No email associated with account');

      try {
        const cred = firebase.auth.EmailAuthProvider.credential(email, clean);
        await user.linkWithCredential(cred);
      } catch (linkErr: unknown) {
        const lErr = linkErr as { code?: string };
        if (lErr.code === 'auth/provider-already-linked') {
          await user.updatePassword(clean);
        } else {
          await user.updatePassword(clean);
        }
      }

      setNewPassword('');
      onToast(
        lang === 'ar'
          ? 'تم تفعيل كلمة المرور لحسابك بنجاح! يمكنك الآن تسجيل الدخول بالإيميل والباسورد مباشرة دون الحاجة لجوجل.'
          : 'Password saved! You can now log in directly with your email & password without needing Google.',
        'success'
      );
    } catch (err: unknown) {
      const error = err as { message?: string };
      onToast(error.message || t.errActionFailed, 'danger');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-24">
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-sky-500/25 backdrop-blur-xl shadow-xl space-y-6 text-start">
        <h2 className="text-sm font-bold text-sky-400 text-center font-heading flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" />
          <span>{t.settingsTitle}</span>
        </h2>

        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover border-2 border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.4)] bg-slate-950"
              onError={e => {
                // fallback if broken URL
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId || 'agent'}`;
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/75 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-sky-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="w-full space-y-3">
            <label className="text-xs font-bold text-slate-400 block text-center">
              {t.lblUploadAvatar}
            </label>

            {/* File Upload Button */}
            <div className="flex gap-2">
              <label className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/40 hover:border-sky-400 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-sky-500/10 active:scale-[0.98]">
                <Upload className="w-4 h-4 text-sky-400" />
                <span>
                  {uploading
                    ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
                    : (lang === 'ar' ? 'رفع صورة من المعرض / الكاميرا 📷' : 'Upload photo from gallery / camera 📷')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            {/* Direct URL input */}
            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 text-slate-500 absolute top-1/2 -translate-y-1/2 inset-inline-start-3.5 pointer-events-none" />
              <input
                type="text"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                onBlur={async () => {
                  const clean = avatarUrl.trim();
                  if (clean && clean !== userAvatar) {
                    try {
                      await onUpdateProfile(name.trim() || userName, clean);
                      onToast(t.msgSettingsSaved, 'success');
                    } catch {
                      onToast(t.errActionFailed, 'danger');
                    }
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder={t.lblAvatarUrlPlaceholder}
                className="w-full py-2.5 ps-10 pe-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-white text-xs outline-none focus:border-sky-400 transition"
              />
            </div>

            {/* Presets Gallery */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 block">
                {t.lblAvatarPresets}
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {AVATAR_PRESETS.map(preset => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      title={preset.label}
                      className={`relative p-1 rounded-xl bg-slate-950/80 border transition hover:scale-105 cursor-pointer ${
                        isSelected
                          ? 'border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)] ring-1 ring-sky-400'
                          : 'border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-9 h-9 mx-auto rounded-lg object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.lblUsernamePlaceholder}</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={async () => {
              const clean = name.trim();
              if (clean && clean !== userName) {
                try {
                  await onUpdateProfile(clean, avatarUrl || userAvatar);
                  onToast(t.msgSettingsSaved, 'success');
                } catch {
                  onToast(t.errActionFailed, 'danger');
                }
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-slate-950/80 border border-sky-400/25 focus:border-sky-400 text-white text-sm outline-none transition"
          />
        </div>

        {/* Volume */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.lblSound}</span>
            </span>
            <span className="font-mono text-sky-400 font-bold">
              {Math.round(volume * 100)}%
            </span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-sky-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{t.lblLang}</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChangeLanguage('ar')}
              className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                lang === 'ar'
                  ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              العربية (RTL)
            </button>
            <button
              onClick={() => onChangeLanguage('en')}
              className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              English (LTR)
            </button>
          </div>
        </div>

        {/* App Installation Banner - only shown when not installed */}
        {!isInstalled && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 to-slate-950 border border-sky-400/30 space-y-3">
            <div className="flex items-center gap-2.5 text-sky-300 font-bold text-xs">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>{t.installAppHeader}</span>
            </div>
            <PWAInstallButton lang={lang} variant="prominent" className="w-full" />
          </div>
        )}

        {/* Password setup / update card for email login */}
        <form onSubmit={handleSetPassword} className="p-4 rounded-2xl bg-slate-950/70 border border-sky-500/25 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'كلمة المرور (للدخول المباشر بالإيميل)' : 'Password (For Direct Email Login)'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'إذا أنشأت حسابك بجوجل، يمكنك تعيين كلمة مرور هنا لتدخل بالإيميل والباسورد مباشرة دون الحاجة للضغط على زر جوجل كل مرة.'
              : 'Set or update your password here so you can log in directly using your email and password.'}
          </p>
          <div className="flex gap-2 pt-1">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={lang === 'ar' ? 'كلمة المرور الجديدة (6 خانات فأكثر)' : 'New password (6+ chars)'}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-sky-400 transition"
            />
            <button
              type="submit"
              disabled={passwordLoading || !newPassword.trim()}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-95 disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{passwordLoading ? '...' : (lang === 'ar' ? 'حفظ 🔒' : 'Save 🔒')}</span>
            </button>
          </div>
        </form>

        {/* Check for Updates / Force Reload */}
        <button
          onClick={async () => {
            sound.playTone(520, 'sine', 0.1);
            onToast(lang === 'ar' ? 'جاري تحديث التطبيق وتفريغ الكاش...' : 'Updating & refreshing cache...', 'normal');
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) {
                  await reg.unregister();
                }
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                for (const k of keys) {
                  await caches.delete(k);
                }
              }
            } catch {
              // ignore
            }
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }}
          className="w-full py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-sky-400 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تحديث التطبيق ومسح الذاكرة المؤقتة' : 'Check for Updates & Clear Cache'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-3.5 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.logout}</span>
        </button>
      </div>
    </div>
  );
};
