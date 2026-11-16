import React, { useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { dictionary } from '../translations';
import { Language, CategoryKey, GameMode } from '../types';
import { CATEGORY_META } from '../words';
import { getMaxAllowedSpies } from '../gameEngine';
import {
  Rocket,
  X,
  Sliders,
  Shield,
  Users,
  Clock,
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
  ChevronRight,
  AlertCircle
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
  };
  onConfirm: (config: {
    visibility: 'public' | 'private';
    categories: CategoryKey[];
    gameMode: GameMode;
    maxPlayers: number;
    spyCount: number;
    turnSeconds: number;
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
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);

  useBodyScrollLock(isModeModalOpen);

  const handleSelectMode = (selectedModeId: GameMode) => {
    sound.playTone(500, 'sine', 0.08);
    if (selectedModeId === 'mole') {
      if (spyCount < 2) setSpyCount(2);
      if (maxPlayers < 5) setMaxPlayers(5);
      onToast(t.moleAutoSetToast, 'normal');
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
    if (gameMode === 'mole' && (spyCount < 2 || maxPlayers < 5)) {
      return onToast(t.moleReqValidationToast, 'danger');
    }
    onConfirm({
      visibility,
      categories: cats,
      gameMode,
      maxPlayers,
      spyCount,
      turnSeconds
    });
  };

  const GAME_MODES = [
    {
      id: 'normal' as GameMode,
      title: t.modeNormalTitle,
      desc: t.modeNormalDesc,
      icon: Radio,
      border: 'border-sky-400',
      text: 'text-sky-400'
    },
    {
      id: 'blackout' as GameMode,
      title: t.modeBlackoutTitle,
      desc: t.modeBlackoutDesc,
      icon: Zap,
      border: 'border-rose-400',
      text: 'text-rose-400',
      badge: t.badgeNew
    },
    {
      id: 'chameleon' as GameMode,
      title: t.modeChameleonTitle,
      desc: t.modeChameleonDesc,
      icon: Eye,
      border: 'border-emerald-400',
      text: 'text-emerald-400'
    },
    {
      id: 'rapid' as GameMode,
      title: t.modeRapidTitle,
      desc: t.modeRapidDesc,
      icon: Flame,
      border: 'border-amber-400',
      text: 'text-amber-400'
    },
    {
      id: 'mole' as GameMode,
      title: t.modeMoleTitle,
      desc: t.modeMoleDesc,
      icon: Shield,
      border: 'border-indigo-400',
      text: 'text-indigo-400',
      badge: t.modeMoleBadge
    },
    {
      id: 'undercover' as GameMode,
      title: t.modeUndercoverTitle,
      desc: t.modeUndercoverDesc,
      icon: Radar,
      border: 'border-cyan-400',
      text: 'text-cyan-400'
    },
    {
      id: 'silent' as GameMode,
      title: t.modeSilentTitle,
      desc: t.modeSilentDesc,
      icon: Brush,
      border: 'border-teal-400',
      text: 'text-teal-400'
    }
  ];

  const maxAllowedSpies = getMaxAllowedSpies(gameMode, maxPlayers);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start py-4 pb-24 relative z-20">
      <div className="w-full max-w-3xl rounded-2xl bg-[#111827] border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6 text-start">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <Sliders className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                {isEditing ? t.editStationSettings : t.roomSettingsTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.customizeRules}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Visibility, Game Mode, Categories */}
            <div className="space-y-5">
              {/* 1. Visibility */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.lblVisibility}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {visibility === 'public' ? t.publicApprovalHint : t.privateCodeHint}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTone(520, 'sine', 0.08);
                      setVisibility('public');
                    }}
                    className={`p-3.5 rounded-xl border text-start transition-colors cursor-pointer ${
                      visibility === 'public'
                        ? 'bg-sky-950/35 border-sky-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Globe className="w-4 h-4 text-sky-400" />
                      {visibility === 'public' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm mb-0.5">{t.visPublic}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{t.publicVisHint}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      sound.playTone(460, 'sine', 0.08);
                      setVisibility('private');
                    }}
                    className={`p-3.5 rounded-xl border text-start transition-colors cursor-pointer ${
                      visibility === 'private'
                        ? 'bg-indigo-950/35 border-indigo-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Lock className="w-4 h-4 text-indigo-400" />
                      {visibility === 'private' && <Check className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <div className="font-bold text-xs sm:text-sm mb-0.5">{t.visPrivate}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{t.privateVisHint}</div>
                  </button>
                </div>
              </div>

              {/* 2. Game Mode Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t.lblGameMode}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsModeModalOpen(true)}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{t.changeMode}</span>
                    <ChevronRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {(() => {
                  const activeModeObj = GAME_MODES.find(m => m.id === gameMode) || GAME_MODES[0];
                  const Icon = activeModeObj.icon;
                  return (
                    <button
                      type="button"
                      onClick={() => setIsModeModalOpen(true)}
                      className={`w-full p-3.5 rounded-xl border bg-slate-950/80 ${activeModeObj.border} text-start cursor-pointer hover:bg-slate-900 transition flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 ${activeModeObj.text}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate">
                              {activeModeObj.title}
                            </span>
                            {activeModeObj.badge && (
                              <span className="text-[10px] font-bold text-rose-400">
                                {activeModeObj.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {activeModeObj.desc}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-bold text-sky-400 whitespace-nowrap">
                        {t.modesTitle}
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* 3. Categories Multi-Select (with category emojis) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    {t.lblCategoryMulti}
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
                        className={`min-h-[68px] p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          selected
                            ? 'border-sky-400 bg-sky-500/15 text-white'
                            : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl leading-none" aria-hidden="true">{meta.icon}</span>
                        <span className="text-[11px] font-bold truncate max-w-full">
                          {t[meta.key as keyof typeof t] || meta.key}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Spy Count, Max Players, Turn Duration */}
            <div className="space-y-5">
              {/* Spy Count */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/75 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
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
                          onToast(t.switchedToClassicToastSpies, 'normal');
                        }
                      }}
                      disabled={spyCount <= 1}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums font-black text-sm text-rose-400 w-6 text-center">
                      {spyCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTone(550, 'sine', 0.06);
                        setSpyCount(Math.min(maxAllowedSpies, Math.min(6, spyCount + 1)));
                      }}
                      disabled={spyCount >= maxAllowedSpies}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(count => {
                    const disabled = count > maxAllowedSpies || (gameMode === 'mole' && count < 2);
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
                        className={`min-h-[44px] py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'bg-rose-500/20 border border-rose-400 text-rose-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-mono tabular-nums">
                          {count} {count === 1 ? t.spySingle : t.spiesPlural}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Players */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/75 border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t.lblMaxPlayers}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTone(400, 'sine', 0.06);
                        const minAllowed = gameMode === 'mole' ? 5 : 3;
                        const next = Math.max(minAllowed, maxPlayers - 1);
                        setMaxPlayers(next);
                        const maxAllowedForNext = getMaxAllowedSpies(gameMode, next);
                        if (spyCount > maxAllowedForNext) setSpyCount(Math.max(1, maxAllowedForNext));
                        if (gameMode === 'mole' && next < 5) {
                          setGameMode('normal');
                          onToast(t.switchedToClassicToastPlayers, 'normal');
                        }
                      }}
                      disabled={maxPlayers <= (gameMode === 'mole' ? 5 : 3)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono tabular-nums font-black text-sm text-sky-400 w-8 text-center">
                      {maxPlayers}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTone(550, 'sine', 0.06);
                        setMaxPlayers(Math.min(20, maxPlayers + 1));
                      }}
                      disabled={maxPlayers >= 20}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {[4, 6, 8, 10, 12, 16, 20].map(pNum => {
                    const isSelected = maxPlayers === pNum;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => {
                          sound.playTone(520, 'sine', 0.06);
                          let effectiveMode = gameMode;
                          if (gameMode === 'mole' && pNum < 5) {
                            effectiveMode = 'normal';
                            setGameMode('normal');
                            onToast(t.switchedToClassicToastPlayers, 'normal');
                          }
                          setMaxPlayers(pNum);
                          const maxAllowedForNum = getMaxAllowedSpies(effectiveMode, pNum);
                          if (spyCount > maxAllowedForNum) {
                            setSpyCount(Math.max(1, maxAllowedForNum));
                          }
                        }}
                        className={`min-h-[38px] rounded-lg font-mono tabular-nums text-xs font-bold transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-sky-500/20 border border-sky-400 text-sky-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Turn Duration */}
              <div className="space-y-2.5 p-4 rounded-xl bg-slate-950/75 border border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.lblTurnSeconds}</span>
                  </label>
                  {gameMode === 'rapid' && (
                    <span className="text-[11px] font-mono tabular-nums font-bold text-amber-400">
                      7s (Rapid)
                    </span>
                  )}
                </div>

                <div className={`grid grid-cols-5 gap-2 ${gameMode === 'rapid' ? 'opacity-45 pointer-events-none' : ''}`}>
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
                        className={`min-h-[42px] rounded-xl font-mono tabular-nums text-xs font-bold transition cursor-pointer text-center flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500/20 border border-amber-400 text-amber-200'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>{sec}s</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="submit"
              className="w-full min-h-[48px] py-3 rounded-xl bg-sky-400 hover:bg-sky-300 active:scale-[0.99] text-slate-950 font-black text-sm tracking-wide transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>{isEditing ? t.saveChanges : t.btnConfirmRoom}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Game Modes Selection Modal */}
      {isModeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overscroll-contain select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModeModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#111827] border border-slate-800 p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-sky-400 border border-slate-800">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">
                    {t.selectGameMode}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t.allModesActive}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModeModalOpen(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              data-scrollable="true"
              className="overflow-y-auto overscroll-contain space-y-2.5 py-3 pe-1 flex-1 touch-pan-y"
              onWheel={(e) => e.stopPropagation()}
            >
              {GAME_MODES.map(mode => {
                const Icon = mode.icon;
                const isSelected = gameMode === mode.id;
                const isMole = mode.id === 'mole';
                const isMoleDisabled = isMole && (maxPlayers < 5 || spyCount < 2);

                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isMoleDisabled}
                    onClick={() => handleSelectMode(mode.id)}
                    className={`w-full p-3.5 rounded-xl border text-start transition-colors flex items-start gap-3 ${
                      isMoleDisabled
                        ? 'opacity-40 bg-slate-950/50 border-slate-900 cursor-not-allowed'
                        : isSelected
                        ? `bg-slate-900 ${mode.border} cursor-pointer`
                        : 'bg-slate-950/75 border-slate-800 hover:border-slate-700 hover:bg-slate-900 cursor-pointer'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 ${mode.text}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {mode.title}
                          </span>
                          {mode.badge && (
                            <span className="text-[11px] font-semibold text-rose-400 shrink-0">
                              {mode.badge}
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <Check className="w-4 h-4 text-sky-400 shrink-0 stroke-[3]" />
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {mode.desc}
                      </p>

                      {isMoleDisabled && (
                        <div className="mt-1.5 text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{t.badgeMoleReq}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsModeModalOpen(false)}
                className="min-h-[40px] py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
