import React, { useState } from 'react';
import { dictionary } from '../translations';
import { Language, CategoryKey, GameMode } from '../types';
import { CATEGORY_META } from '../words';
import {
  Rocket,
  X,
  Sliders,
  Shield,
  Users,
  Clock,
  Sparkles,
  Globe,
  Lock,
  Check,
  Plus,
  Minus,
  Zap,
  Brush,
  Radio,
  Radar,
  Flame,
  Eye,
  ChevronRight
} from 'lucide-react';
import { sound } from '../audio';

interface Props {
  lang: Language;
  initialCategory?: CategoryKey | 'random';
  isEditing?: boolean;
  initialValues?: {
    visibility?: 'public' | 'private';
    categories?: CategoryKey[];
    gameMode?: GameMode;
    maxPlayers?: number;
    spyCount?: number;
    turnSeconds?: number;
    anonymousVoting?: boolean;
    customWords?: [string, string][];
  };
  onConfirm: (config: {
    visibility: 'public' | 'private';
    categories: CategoryKey[];
    gameMode: GameMode;
    maxPlayers: number;
    spyCount: number;
    turnSeconds: number;
    anonymousVoting?: boolean;
    customWords?: [string, string][];
  }) => void;
  onCancel: () => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

export const CreateRoomScreen: React.FC<Props> = ({
  lang,
  initialCategory = 'players',
  isEditing = false,
  initialValues,
  onConfirm,
  onCancel,
  onToast
}) => {
  const t = dictionary[lang];
  const allCategoryKeys = Object.keys(CATEGORY_META) as CategoryKey[];

  const [visibility, setVisibility] = useState<'public' | 'private'>(
    initialValues?.visibility || 'public'
  );

  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(() => {
    if (initialValues?.categories && initialValues.categories.length > 0) {
      return new Set(initialValues.categories);
    }
    if (initialCategory === 'random') {
      return new Set(allCategoryKeys);
    }
    return new Set([initialCategory as CategoryKey]);
  });

  const [gameMode, setGameMode] = useState<GameMode>(initialValues?.gameMode || 'normal');
  const [maxPlayers, setMaxPlayers] = useState<number>(initialValues?.maxPlayers || 8);
  const [spyCount, setSpyCount] = useState<number>(initialValues?.spyCount || 1);
  const [turnSeconds, setTurnSeconds] = useState<number>(initialValues?.turnSeconds || 20);
  const [anonymousVoting, setAnonymousVoting] = useState<boolean>(initialValues?.anonymousVoting || false);
  const [customWordsText, setCustomWordsText] = useState<string>(() => {
    if (initialValues?.customWords && initialValues.customWords.length > 0) {
      return initialValues.customWords.map(([en, ar]) => ar || en).join(', ');
    }
    return '';
  });
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  const handleSelectMode = (selectedModeId: GameMode) => {
    sound.playTone(500, 'sine', 0.08);
    if (selectedModeId === 'mole') {
      if (spyCount < 2) setSpyCount(2);
      if (maxPlayers < 4) setMaxPlayers(4);
      onToast(
        lang === 'ar'
          ? '🕸️ تم ضبط الجواسيس إلى 2 واللاعبين إلى 4 تلقائياً لتفعيل شبكة العملاء!'
          : '🕸️ Auto-set 2 spies and 4 players for Mole Network!',
        'normal'
      );
    }
    setGameMode(selectedModeId);
    setIsModeModalOpen(false);
  };

  const toggleCategory = (cat: CategoryKey) => {
    sound.playTone(480, 'sine', 0.08);
    const next = new Set(selectedCategories);
    if (next.has(cat)) {
      if (next.size > 1) next.delete(cat);
      else onToast(t.errNoCategory, 'danger');
    } else {
      next.add(cat);
    }
    setSelectedCategories(next);
  };

  const selectAll = () => {
    sound.playTone(550, 'sine', 0.1);
    setSelectedCategories(new Set(allCategoryKeys));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.triggerHaptic('medium');
    const cats = Array.from(selectedCategories);
    if (cats.length === 0) {
      return onToast(t.errNoCategory, 'danger');
    }
    if (gameMode === 'mole' && (spyCount < 2 || maxPlayers < 4)) {
      return onToast(
        lang === 'ar'
          ? 'شبكة العملاء تتطلب 4 لاعبين على الأقل وجاسوسين (2) على الأقل!'
          : 'Mole Network requires at least 4 players and 2 spies!',
        'danger'
      );
    }
    const parsedCustomWords: [string, string][] = customWordsText
      .split(/[,،\n]+/)
      .map(w => w.trim())
      .filter(Boolean)
      .map(w => [w, w]);

    onConfirm({
      visibility,
      categories: cats,
      gameMode,
      maxPlayers,
      spyCount,
      turnSeconds,
      anonymousVoting,
      customWords: parsedCustomWords.length > 0 ? parsedCustomWords : undefined
    });
  };

  const GAME_MODES = [
    {
      id: 'normal' as GameMode,
      title: lang === 'ar' ? 'الطور الكلاسيكي' : 'Classic Mode',
      desc: lang === 'ar' ? 'تلميحات ذكية وتصويت طارئ لكشف الجاسوس' : 'Clever clues & emergency vote',
      icon: Radio,
      color: 'from-sky-500/20 to-indigo-500/20',
      border: 'border-sky-400',
      text: 'text-sky-300'
    },
    {
      id: 'blackout' as GameMode,
      title: lang === 'ar' ? 'التعتيم اللاسلكي (Blackout)' : 'Blackout Protocol',
      desc:
        lang === 'ar'
          ? 'انقطاع مفاجئ للاتصالات وظلام أحمر طارئ؛ رصد خاطف للجواسيس أو الكلمة لجزء من الثانية للمركزين فقط!'
          : 'Sudden blackout & sirens; split-second flash reveals spies or secret word!',
      icon: Zap,
      color: 'from-rose-500/20 to-red-500/20',
      border: 'border-rose-400',
      text: 'text-rose-300',
      badge: lang === 'ar' ? 'جديد ⚡' : 'NEW ⚡'
    },
    {
      id: 'chameleon' as GameMode,
      title: lang === 'ar' ? 'الحرباء المتخفية (كلمة توأم)' : 'Twin Chameleon',
      desc:
        lang === 'ar'
          ? 'الجاسوس تصله كلمة مضللة قريبة جداً فيتكلم بثقة دون أن يدري!'
          : 'Spy gets a twin decoy word and blends in unknowingly!',
      icon: Eye,
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-400',
      text: 'text-emerald-300'
    },
    {
      id: 'rapid' as GameMode,
      title: lang === 'ar' ? 'الاستجواب السريع' : 'Rapid Interrogation',
      desc:
        lang === 'ar'
          ? 'وقت الدور 7 ثوانٍ فقط وسؤال سريع؛ التوتر يفضح الجاسوس فوراً!'
          : '7 seconds turn time; high speed interrogation under pressure!',
      icon: Flame,
      color: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-400',
      text: 'text-orange-300'
    },
    {
      id: 'mole' as GameMode,
      title: lang === 'ar' ? 'شبكة العملاء' : 'Mole Network',
      desc:
        lang === 'ar'
          ? 'الجواسيس يعرفون بعضهم وينسقون سراً بشات خاص (يتطلب 4+ لاعبين وجاسوسين 2+ على الأقل)'
          : 'Spies know each other and coordinate secretly (Requires 4+ players & 2+ spies)',
      icon: Shield,
      color: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-400',
      text: 'text-purple-300',
      badge: lang === 'ar' ? '4+ لاعبين • 2+ جواسيس' : '4+ players • 2+ spies'
    },
    {
      id: 'undercover' as GameMode,
      title: lang === 'ar' ? 'العميل السري (الملاك الحارس)' : 'Undercover Protector',
      desc:
        lang === 'ar'
          ? 'لاعب بريء يعرف من هو الجاسوس ويحاول حمايته دون أن يُكشف!'
          : 'One innocent knows the spy and secretly protects them!',
      icon: Radar,
      color: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-400',
      text: 'text-cyan-300'
    },
    {
      id: 'silent' as GameMode,
      title: lang === 'ar' ? 'المحطة الصامتة' : 'Silent Drawing',
      desc: lang === 'ar' ? 'رسم تلميحات حية على شاشة الرادار الفضائي دون كلام' : 'Live radar drawing hints instead of words',
      icon: Brush,
      color: 'from-teal-500/20 to-cyan-500/20',
      border: 'border-teal-400',
      text: 'text-teal-300'
    },
    {
      id: 'jester' as GameMode,
      title: lang === 'ar' ? 'المهرج الخادع (The Jester)' : 'The Jester (Troll Mode)',
      desc:
        lang === 'ar'
          ? 'لاعب محايد لا يعرف الكلمة، إذا نجح في جعل الجميع يصوتون لطرده يفوز هو بمفرده!'
          : 'Neutral player wants everyone to vote them out! If eliminated, Jester wins alone!',
      icon: Sparkles,
      color: 'from-fuchsia-500/20 to-purple-500/20',
      border: 'border-fuchsia-400',
      text: 'text-fuchsia-300',
      badge: lang === 'ar' ? 'جديد 🤡' : 'NEW 🤡'
    },
    {
      id: 'bomb' as GameMode,
      title: lang === 'ar' ? 'القنبلة الموقوتة (Time Bomb)' : 'Cosmic Time Bomb',
      desc:
        lang === 'ar'
          ? 'قنبلة فضائية تنتقل بين اللاعبين؛ أعطِ تلميحك ومررها قبل 8 ثوانٍ وإلا ستنفجر فيك!'
          : 'Passing hot potato bomb! Give clue and pass it before 8s or explode!',
      icon: Flame,
      color: 'from-amber-500/20 to-red-500/20',
      border: 'border-amber-400',
      text: 'text-amber-300',
      badge: lang === 'ar' ? 'جديد 💣' : 'NEW 💣'
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 pb-24 relative z-20">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900/95 border border-sky-500/30 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-6 text-start">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/30">
              <Sliders className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                {isEditing ? (lang === 'ar' ? 'تعديل إعدادات المحطة' : 'Edit Station Settings') : t.roomSettingsTitle}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar' ? 'خصص تجربة اللعب وقواعد المهمة' : 'Customize gameplay rules & station settings'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Visibility (Public vs Private) - High-tech interactive cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.lblVisibility}</span>
              </span>
              <span className="text-[11px] text-sky-400 font-normal">
                {visibility === 'public'
                  ? (lang === 'ar' ? 'موافقة المضيف مطلوبة للدخول' : 'Host approval required')
                  : (lang === 'ar' ? 'لأصدقائك عبر الكود فقط' : 'Private via frequency code')}
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              {/* Public Card */}
              <button
                type="button"
                onClick={() => {
                  sound.playTone(520, 'sine', 0.08);
                  setVisibility('public');
                }}
                className={`p-3.5 rounded-2xl border text-start relative transition-all cursor-pointer ${
                  visibility === 'public'
                    ? 'bg-gradient-to-br from-sky-500/20 via-slate-900 to-indigo-950/60 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  {visibility === 'public' && (
                    <div className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="font-bold text-xs sm:text-sm text-white mb-0.5">
                  {t.visPublic}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {lang === 'ar' ? 'تظهر في قائمة المحطات النشطة مع طلب قبول من المضيف' : 'Listed in public stations list with host approval'}
                </div>
              </button>

              {/* Private Card */}
              <button
                type="button"
                onClick={() => {
                  sound.playTone(460, 'sine', 0.08);
                  setVisibility('private');
                }}
                className={`p-3.5 rounded-2xl border text-start relative transition-all cursor-pointer ${
                  visibility === 'private'
                    ? 'bg-gradient-to-br from-purple-500/20 via-slate-900 to-indigo-950/60 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  {visibility === 'private' && (
                    <div className="w-5 h-5 rounded-full bg-purple-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div className="font-bold text-xs sm:text-sm text-white mb-0.5">
                  {t.visPrivate}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {lang === 'ar' ? 'مخفية، الدخول عبر كود التردد السري المباشر فقط' : 'Hidden, entrance via secret 6-character code only'}
                </div>
              </button>
            </div>
          </div>

          {/* 2. Game Mode Selection - Compact Elegant Banner with Modal Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.lblGameMode}</span>
              </label>
              <button
                type="button"
                onClick={() => setIsModeModalOpen(true)}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
              >
                <span>{lang === 'ar' ? 'تغيير المود' : 'Change Mode'}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Currently Active Mode Card (High Quality Compact Hero) */}
            {(() => {
              const activeModeObj = GAME_MODES.find(m => m.id === gameMode) || GAME_MODES[0];
              const Icon = activeModeObj.icon;
              return (
                <div
                  onClick={() => setIsModeModalOpen(true)}
                  className={`p-3.5 rounded-2xl border bg-gradient-to-r ${activeModeObj.color} ${activeModeObj.border} shadow-lg cursor-pointer hover:brightness-110 transition flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 shrink-0 ${activeModeObj.text}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate font-heading">
                          {activeModeObj.title}
                        </span>
                        {activeModeObj.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/30 text-rose-300 border border-rose-500/40">
                            {activeModeObj.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
                        {activeModeObj.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs font-bold text-sky-400 flex items-center gap-1">
                    <span>{lang === 'ar' ? 'المودات' : 'Modes'}</span>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 3. Spy Count - Visual Interactive Segmented Agent Bar */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-rose-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>{t.lblSpies}</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTone(400, 'sine', 0.06);
                    const next = Math.max(1, spyCount - 1);
                    setSpyCount(next);
                    if (gameMode === 'mole' && next < 2) {
                      setGameMode('normal');
                      onToast(
                        lang === 'ar'
                          ? 'تم تحويل النمط للطور الكلاسيكي؛ شبكة العملاء تتطلب جاسوسين على الأقل!'
                          : 'Switched to Classic; Mole Network requires at least 2 spies!',
                        'normal'
                      );
                    }
                  }}
                  disabled={spyCount <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-sm text-rose-400 w-6 text-center">
                  {spyCount}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTone(550, 'sine', 0.06);
                    setSpyCount(Math.min(Math.floor((maxPlayers - 1) / 2), Math.min(6, spyCount + 1)));
                  }}
                  disabled={spyCount >= Math.floor((maxPlayers - 1) / 2)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Spy Preset Pills */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[1, 2, 3, 4].map(count => {
                const disabled = count >= Math.ceil(maxPlayers / 2);
                const isSelected = spyCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      sound.playTone(500, 'sine', 0.08);
                      setSpyCount(count);
                    }}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                      isSelected
                        ? 'bg-rose-500/25 border border-rose-400 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">🕵️</span>
                    <span className="text-[10px] font-mono">
                      {count} {lang === 'ar' ? (count === 1 ? 'جاسوس' : 'جواسيس') : `Spy${count > 1 ? 's' : ''}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Max Players - Interactive Capacity Control */}
          <div className="space-y-2 p-4 rounded-2xl bg-slate-950/60 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.lblMaxPlayers}</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playTone(400, 'sine', 0.06);
                    const next = Math.max(3, maxPlayers - 1);
                    setMaxPlayers(next);
                    if (spyCount >= Math.ceil(next / 2)) setSpyCount(Math.max(1, Math.floor((next - 1) / 2)));
                    if (gameMode === 'mole' && next < 4) {
                      setGameMode('normal');
                      onToast(
                        lang === 'ar'
                          ? 'تم تحويل النمط للطور الكلاسيكي؛ شبكة العملاء تتطلب 4 لاعبين على الأقل!'
                          : 'Switched to Classic; Mole Network requires at least 4 players!',
                        'normal'
                      );
                    }
                  }}
                  disabled={maxPlayers <= 3}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-black text-sm text-sky-400 w-8 text-center">
                  {maxPlayers}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playTone(550, 'sine', 0.06);
                    setMaxPlayers(Math.min(20, maxPlayers + 1));
                  }}
                  disabled={maxPlayers >= 20}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Player Presets */}
            <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto pb-1">
              {[4, 6, 8, 10, 12, 16, 20].map(pNum => {
                const isSelected = maxPlayers === pNum;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => {
                      sound.playTone(520, 'sine', 0.06);
                      setMaxPlayers(pNum);
                      if (spyCount >= Math.ceil(pNum / 2)) setSpyCount(Math.max(1, Math.floor((pNum - 1) / 2)));
                    }}
                    className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-sky-500/25 border border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                        : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Turn Duration - Glowing Chips */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.lblTurnSeconds}</span>
            </label>

            <div className="grid grid-cols-5 gap-2">
              {[15, 20, 30, 45, 60].map(sec => {
                const isSelected = turnSeconds === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      sound.playTone(480, 'sine', 0.06);
                      setTurnSeconds(sec);
                    }}
                    className={`py-2.5 rounded-xl font-mono text-xs font-bold transition cursor-pointer text-center flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-amber-500/25 border border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                        : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span>{sec}s</span>
                    {sec === 20 && (
                      <span className="text-[9px] text-amber-400/80 font-sans">⚡</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anonymous Voting Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">
                  {lang === 'ar' ? 'تصويت سري مجهول' : 'Anonymous Voting'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === 'ar' ? 'إخفاء أسماء المصوتين لمنع الإحراج والانتقام' : 'Hide voter identities during voting'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setAnonymousVoting(!anonymousVoting);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                anonymousVoting ? 'bg-purple-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  anonymousVoting ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0.5 rtl:-translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* 6. Categories Multi-Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{t.lblCategoryMulti}</span>
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
              >
                {t.btnRandomAll}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {allCategoryKeys.map(cat => {
                const meta = CATEGORY_META[cat];
                const selected = selectedCategories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                      selected
                        ? 'border-sky-400 bg-sky-500/20 text-white shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{meta.icon}</span>
                    <span className="text-[11px] font-bold truncate max-w-full">
                      {t[meta.key as keyof typeof t] || meta.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Custom Words Deck Creator (Optional) */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>✍️</span>
                <span>{lang === 'ar' ? 'كلمات مخصصة من عندك (اختياري)' : 'Custom Words Deck (Optional)'}</span>
              </label>
              <span className="text-[10px] text-purple-400 font-bold">
                {lang === 'ar' ? 'افصل بين الكلمات بفاصلة' : 'Separate with commas'}
              </span>
            </div>
            <textarea
              rows={2}
              value={customWordsText}
              onChange={e => setCustomWordsText(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'مثال: بيتزا، شاورما، أهرامات، بلايستيشن، ميسي، كشري...'
                  : 'e.g. Pizza, Tokyo, Batman, Coffee, Minecraft...'
              }
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none focus:border-purple-400 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>{isEditing ? (lang === 'ar' ? 'حفظ التعديلات 💾' : 'Save Changes 💾') : t.btnConfirmRoom}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================== */}
      {/* 🎮 GAME MODES SELECTION MODAL (Elegant Cyberpunk Drawer/Popup) */}
      {/* ============================================================== */}
      {isModeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in-50 duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-sky-500/30 p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    {lang === 'ar' ? 'اختر مود اللعبة' : 'Select Game Mode'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'جميع الأطوار شغالة ومضبوطة بالكامل' : 'All modes are active and optimized'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modes List */}
            <div className="overflow-y-auto space-y-2.5 py-4 pr-1 flex-1">
              {GAME_MODES.map(mode => {
                const Icon = mode.icon;
                const isSelected = gameMode === mode.id;
                const isMole = mode.id === 'mole';
                const isMoleDisabled = isMole && (maxPlayers < 4 || spyCount < 2);

                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isMoleDisabled}
                    onClick={() => handleSelectMode(mode.id)}
                    className={`w-full p-3.5 rounded-2xl border text-start transition-all relative flex items-start gap-3.5 ${
                      isMoleDisabled
                        ? 'opacity-40 bg-slate-950/40 border-slate-900 cursor-not-allowed grayscale'
                        : isSelected
                        ? `bg-gradient-to-r ${mode.color} ${mode.border} shadow-[0_0_20px_rgba(56,189,248,0.25)] cursor-pointer ring-1 ring-sky-400/50`
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/90 cursor-pointer'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 ${mode.text}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {mode.title}
                          </span>
                          {mode.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/25 text-rose-300 border border-rose-500/30">
                              {mode.badge}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-sky-400 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {mode.desc}
                      </p>

                      {isMoleDisabled && (
                        <div className="mt-2 text-[10px] font-bold text-rose-400 flex items-center gap-1">
                          <span>⚠️</span>
                          <span>
                            {lang === 'ar'
                              ? 'يتطلب زيادة اللاعبين إلى 4+ والجواسيس إلى 2+ لاختياره'
                              : 'Requires at least 4 players and 2 spies to select'}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModeModalOpen(false)}
                className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
