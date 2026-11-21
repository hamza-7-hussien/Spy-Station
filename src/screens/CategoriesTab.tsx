import React, { useMemo, useState } from 'react';
import { dictionary } from '../translations';
import { CustomCategory, CustomCategoryWord, Language } from '../types';
import { compressImageToWebP } from '../wordVisuals';
import { CategoriesListSkeleton } from '../components/Skeletons';
import { sound } from '../audio';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  Layers,
  Plus,
  Search,
  Globe,
  Lock,
  Play,
  Pencil,
  Trash2,
  Upload,
  X,
  Check
} from 'lucide-react';

interface Props {
  lang: Language;
  currentUserUid: string;
  currentUserName: string;
  myCategories: CustomCategory[];
  communityCategories: CustomCategory[];
  isLoading: boolean;
  hasMoreCommunity: boolean;
  onLoadMoreCommunity: () => void;
  onSaveCategory: (payload: {
    id?: string;
    name: string;
    icon: string;
    image?: string;
    words: CustomCategoryWord[];
    isPublished: boolean;
  }) => Promise<void>;
  onDeleteCategory: (catId: string) => Promise<void>;
  onPlayCategory: (catId: string) => void;
  onToast: (msg: string, type?: 'normal' | 'danger' | 'success') => void;
}

const ICON_PRESETS = ['🎯', '🚀', '⚽', '🍕', '🎬', '🎮', '🦁', '🎵', '🚗', '📚', '👑', '🌍'];

export const CategoriesTab: React.FC<Props> = ({
  lang,
  currentUserUid,
  myCategories,
  communityCategories,
  isLoading,
  hasMoreCommunity,
  onLoadMoreCommunity,
  onSaveCategory,
  onDeleteCategory,
  onPlayCategory,
  onToast
}) => {
  const t = dictionary[lang];
  const [subTab, setSubTab] = useState<'my' | 'community'>('my');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal builder state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🎯');
  const [catImage, setCatImage] = useState('');
  const [wordsList, setWordsList] = useState<CustomCategoryWord[]>([]);
  const [wordDraft, setWordDraft] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useBodyScrollLock(modalOpen);

  const openCreateModal = () => {
    sound.playTone(500, 'sine', 0.08);
    setEditingId(undefined);
    setCatName('');
    setCatIcon('🎯');
    setCatImage('');
    setWordsList([]);
    setWordDraft('');
    setIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (cat: CustomCategory) => {
    sound.playTone(460, 'sine', 0.08);
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon || '🎯');
    setCatImage(cat.image || '');
    setWordsList(cat.words || []);
    setWordDraft('');
    setIsPublished(Boolean(cat.isPublished));
    setModalOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return onToast(t.errPhotoUpload, 'danger');
    }
    setUploadingCover(true);
    try {
      const compressedWebp = await compressImageToWebP(file, 256);
      setCatImage(compressedWebp);
    } catch {
      onToast(t.errPhotoUpload, 'danger');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  const addDraftWords = () => {
    const raw = wordDraft.trim();
    if (!raw) return;
    const parts = raw
      .split(/[\n,،;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;

    setWordsList(prev => {
      const seen = new Set(prev.map(w => w.en.toLowerCase().trim()));
      const next = [...prev];
      for (const p of parts) {
        if (next.length >= 120) break;
        const clean = p.slice(0, 48);
        const key = clean.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          next.push({ en: clean, ar: clean });
        }
      }
      return next;
    });
    setWordDraft('');
    sound.playTone(560, 'sine', 0.06);
  };

  const handleRemoveWord = (index: number) => {
    setWordsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catName.trim();
    if (!cleanName) {
      return onToast(t.errCategoryNameRequired, 'danger');
    }
    // Include any pending text in wordDraft automatically if user forgot to press Add
    let finalWords = [...wordsList];
    if (wordDraft.trim()) {
      const seen = new Set(finalWords.map(w => w.en.toLowerCase().trim()));
      wordDraft
        .trim()
        .split(/[\n,،;]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(p => {
          const clean = p.slice(0, 48);
          if (!seen.has(clean.toLowerCase()) && finalWords.length < 120) {
            seen.add(clean.toLowerCase());
            finalWords.push({ en: clean, ar: clean });
          }
        });
    }

    if (finalWords.length < 6) {
      return onToast(t.errCategoryMinWords, 'danger');
    }

    setSaving(true);
    try {
      await onSaveCategory({
        id: editingId,
        name: cleanName,
        icon: catIcon,
        image: catImage || undefined,
        words: finalWords,
        isPublished
      });
      setModalOpen(false);
      onToast(t.msgCategorySaved, 'success');
    } catch {
      onToast(t.errActionFailed, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const filteredList = useMemo(() => {
    const source = subTab === 'my' ? myCategories : communityCategories;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.creatorName.toLowerCase().includes(q) ||
        c.words?.some(w => w.en.toLowerCase().includes(q) || w.ar.toLowerCase().includes(q))
    );
  }, [subTab, myCategories, communityCategories, searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-24">
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-sky-500/25 shadow-xl space-y-4 text-start">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                {t.categoriesStudioTitle}
              </h2>
              <p className="text-xs text-slate-400 tabular-nums">
                {myCategories.length} {t.myCategoriesTab} · {communityCategories.length} {t.communityCategoriesTab}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] py-2 px-4 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.createCategoryBtn}</span>
          </button>
        </div>

        {/* Segmented Filter Control (My Categories vs Community) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/90 border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('my')}
            className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'my'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            {t.myCategoriesTab} ({myCategories.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('community')}
            className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              subTab === 'community'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-400/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            {t.communityCategoriesTab} ({communityCategories.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchCategoriesPlaceholder}
            className="w-full min-h-[44px] py-2.5 ps-10 pe-4 rounded-2xl bg-slate-950/80 border border-slate-800 focus:border-sky-400 text-white text-xs outline-none transition placeholder:text-slate-500"
          />
        </div>

        {/* Content List */}
        {isLoading && filteredList.length === 0 ? (
          <CategoriesListSkeleton count={4} />
        ) : filteredList.length === 0 ? (
          <div className="py-10 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-3">
            <p className="text-xs text-slate-400">
              {subTab === 'my' ? t.noMyCategories : t.noCommunityCategories}
            </p>
            {subTab === 'my' && (
              <button
                type="button"
                onClick={openCreateModal}
                className="min-h-[44px] py-2 px-4 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-bold hover:bg-sky-500/30 transition cursor-pointer"
              >
                {t.createCategoryBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredList.map(cat => {
              const isOwner = cat.creatorUid === currentUserUid;
              const playCount = Number(cat.playCount) || 0;
              const wordsCount = (cat.words || []).length;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-slate-950/75 border border-slate-800 hover:border-sky-500/40 transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {/* WebP Thumbnail with clean fallback */}
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-2xl shrink-0">
                        {cat.icon || '🎯'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-bold text-white truncate">
                        {cat.name}
                      </h3>

                      {/* Clean unboxed typographic metadata per frontend-design guidelines */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                        <span>{t.wordsCountLabel.replace('{count}', wordsCount.toString())}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-sky-300 font-semibold">
                          {t.playedCountLabel.replace('{count}', playCount.toString())}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{cat.isPublished ? t.lblPublishedTag : t.lblPrivateTag}</span>
                      </div>

                      {!isOwner && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {cat.creatorName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onPlayCategory(cat.id)}
                      className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t.playCategoryBtn}</span>
                    </button>

                    {isOwner && (
                      confirmDeleteId === cat.id ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              setConfirmDeleteId(null);
                              await onDeleteCategory(cat.id);
                              onToast(t.msgCategoryDeleted, 'normal');
                            }}
                            className="min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                          >
                            {t.btnDelete}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition cursor-pointer"
                            title={t.editCategoryTitle}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(cat.id)}
                            className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 flex items-center justify-center transition cursor-pointer"
                            title={t.btnDelete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {subTab === 'community' && hasMoreCommunity && (
          <button
            type="button"
            onClick={onLoadMoreCommunity}
            className="w-full min-h-[44px] py-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-sky-400 text-xs font-bold transition cursor-pointer"
          >
            {t.btnLoadMore}
          </button>
        )}
      </div>

      {/* Create / Edit Category Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 overscroll-contain"
          onClick={e => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-sky-500/30 p-4 sm:p-5 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <h3 className="font-heading font-bold text-base text-white">
                {editingId ? t.editCategoryTitle : t.createCategoryBtn}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="overflow-y-auto overscroll-contain space-y-4 py-4 pr-1 flex-1"
            >
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {t.categoryNamePlaceholder}
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  maxLength={50}
                  placeholder={t.categoryNamePlaceholder}
                  className="w-full min-h-[44px] py-2.5 px-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-sky-400 text-white text-sm outline-none transition"
                />
              </div>

              {/* Cover Image & Icon */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  {t.categoryImageLabel}
                </label>
                <div className="flex items-center gap-3">
                  {catImage ? (
                    <div className="relative shrink-0">
                      <img
                        src={catImage}
                        alt="Cover"
                        className="w-16 h-16 rounded-2xl object-cover border border-sky-400/50 bg-slate-950"
                      />
                      <button
                        type="button"
                        onClick={() => setCatImage('')}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      {catIcon}
                    </div>
                  )}

                  <label className="flex-1 min-h-[44px] py-2.5 px-4 rounded-2xl bg-slate-950 border border-sky-400/35 hover:border-sky-400 text-sky-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingCover ? t.uploadingPhoto : t.uploadCategoryImage}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick Icon Selector */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ICON_PRESETS.map(ic => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setCatIcon(ic)}
                      className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition cursor-pointer ${
                        catIcon === ic
                          ? 'border-sky-400 bg-sky-500/20'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Words Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    {t.categoryWordsLabel}
                  </label>
                  <span className={`text-xs font-mono font-bold tabular-nums ${wordsList.length >= 6 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wordsList.length} / 6+
                  </span>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={wordDraft}
                    onChange={e => setWordDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addDraftWords();
                      }
                    }}
                    placeholder={t.categoryWordsPlaceholder}
                    className="flex-1 py-2 px-3 rounded-2xl bg-slate-950/90 border border-slate-800 focus:border-sky-400 text-white text-xs outline-none transition resize-none"
                  />
                  <button
                    type="button"
                    onClick={addDraftWords}
                    className="min-h-[44px] px-4 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold cursor-pointer shrink-0"
                  >
                    {t.addWordBtn}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">{t.bulkPasteHint}</p>

                {wordsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    {wordsList.map((w, idx) => (
                      <span
                        key={`${w.en}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                      >
                        <span>{w.en}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWord(idx)}
                          className="text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Publish to Community Toggle */}
              <button
                type="button"
                onClick={() => setIsPublished(p => !p)}
                className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-start transition cursor-pointer ${
                  isPublished
                    ? 'bg-emerald-500/10 border-emerald-400/50'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isPublished ? (
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">{t.categoryPublishToggle}</div>
                    <div className="text-[11px] text-slate-400">{t.categoryPublishHint}</div>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 ${
                    isPublished ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      isPublished ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition cursor-pointer disabled:opacity-60"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{t.saveChanges}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
