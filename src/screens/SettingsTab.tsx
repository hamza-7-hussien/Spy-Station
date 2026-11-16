import React, { useState, useEffect } from 'react';
import { dictionary, SUPPORTED_LANGUAGES } from '../translations';
import { Language } from '../types';
import { storage } from '../firebase';
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
  Loader2,
  Music,
  Check
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
  const [bgmVolume, setBgmVolume] = useState(sound.getBgmVolume());
  const [isBgmMuted, setIsBgmMuted] = useState(sound.isBgmMuted());
  const [uploading, setUploading] = useState(false);
  const t = dictionary[lang];

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
      const compressedDataUrl = await compressImageToDataUrl(file, 256);
      setAvatarUrl(compressedDataUrl);
      await onUpdateProfile(name.trim() || userName, compressedDataUrl);
      onToast(t.msgPhotoUploaded, 'success');

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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-28 px-1">
      <div className="p-6 sm:p-7 rounded-2xl bg-[#111827] border border-slate-800 shadow-2xl space-y-6 text-start">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-base font-black text-white font-heading flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Settings className="w-4 h-4" />
            </div>
            <span>{t.settingsTitle}</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">v2.6.0</span>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-[#090d16] p-4 rounded-xl border border-slate-800">
          <div className="relative shrink-0">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`}
              alt="Avatar"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-700 bg-slate-900"
              onError={e => {
                const target = e.target as HTMLImageElement;
                if (!target.dataset.fallbackApplied) {
                  target.dataset.fallbackApplied = 'true';
                  target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${userId || 'agent'}`;
                }
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-300">{t.lblUploadAvatar}</span>
              <label className="min-h-[38px] px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 text-xs font-bold flex items-center gap-2 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>{uploading ? t.uploadingPhoto : t.uploadPhotoBtn}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AVATAR_PRESETS.map(preset => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    title={preset.label}
                    className={`p-1 rounded-xl bg-slate-900 border transition cursor-pointer ${
                      isSelected
                        ? 'border-sky-400 ring-1 ring-sky-400'
                        : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-8 h-8 mx-auto rounded-lg object-cover"
                    />
                  </button>
                );
              })}
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
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#090d16] border border-slate-800 focus:border-sky-500 text-white text-sm font-medium outline-none transition"
          />
        </div>

        {/* Audio Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div className="space-y-2 bg-[#090d16] p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.lblSound}</span>
              </span>
              <span className="font-mono text-sky-400 font-bold tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="space-y-2 bg-[#090d16] p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.bgmTitle}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = sound.toggleBgm();
                  setIsBgmMuted(next);
                }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                  !isBgmMuted
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {!isBgmMuted ? t.bgmOn : t.bgmOff}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setBgmVolume(val);
                sound.setBgmVolume(val);
              }}
              className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.lblLang || 'Language'}</span>
            </span>
            <span className="text-[11px] text-sky-400 font-mono font-bold uppercase">
              {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.name}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map(item => {
              const isSelected = item.code === lang;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    sound.playTone(520, 'sine', 0.1);
                    sound.triggerHaptic('light');
                    onChangeLanguage(item.code);
                  }}
                  className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-black'
                      : 'bg-[#090d16] border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-base leading-none">{item.flag}</span>
                    <span className="truncate">{item.nativeName}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {!isInstalled && (
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>{t.installAppHeader}</span>
            </div>
            <PWAInstallButton lang={lang} variant="prominent" className="w-full" />
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full min-h-[46px] rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-rose-300 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.logout}</span>
        </button>
      </div>
    </div>
  );
};
