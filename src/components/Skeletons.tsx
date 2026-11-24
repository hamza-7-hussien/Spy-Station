import React from 'react';
import { Language } from '../types';

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`relative overflow-hidden rounded-xl bg-slate-800/75 skeleton-shimmer ${className}`}
  />
);

/**
 * Full-viewport app boot skeleton mirroring the real Home layout
 * (Profile Bar + Quick Match Banner + 3x3 Category Grid + Bottom Nav).
 */
export const AppBootSkeleton: React.FC<{ lang?: Language }> = ({ lang = 'ar' }) => (
  <div
    dir={lang === 'ar' ? 'rtl' : 'ltr'}
    aria-busy="true"
    aria-label={lang === 'ar' ? 'جاري تحميل المحطة...' : 'Loading Spy Station...'}
    className="h-full w-full flex flex-col overflow-hidden bg-[#030712] text-slate-100 relative"
  >
    <div className="stars-overlay" />
    <main className="flex-1 w-full overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-4 relative z-10">
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Profile Header Skeleton */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-11 h-11 rounded-full shrink-0" />
            <div className="space-y-2">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="h-5 w-16 rounded-lg" />
          </div>
        </div>

        {/* Quick Match CTA Skeleton */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-9 h-9 rounded-xl shrink-0" />
            <div className="space-y-1.5">
              <SkeletonBlock className="h-3.5 w-32" />
              <SkeletonBlock className="h-2.5 w-44" />
            </div>
          </div>
          <SkeletonBlock className="h-7 w-16 rounded-xl" />
        </div>

        {/* Categories Card Skeleton */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-3.5 w-32" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center gap-2"
              >
                <SkeletonBlock className="w-8 h-8 rounded-xl" />
                <SkeletonBlock className="h-3 w-14" />
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <div className="flex gap-2">
              <SkeletonBlock className="h-11 flex-1 rounded-2xl" />
              <SkeletonBlock className="h-11 w-24 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </main>

    {/* Bottom Navigation Bar Skeleton */}
    <div className="shrink-0 h-16 px-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-around relative z-10">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <SkeletonBlock className="w-6 h-6 rounded-lg" />
          <SkeletonBlock className="w-10 h-2.5" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton cards matching StationsTab public station list rows.
 */
export const StationsListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div aria-busy="true" className="space-y-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
      >
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-3.5 w-28" />
          </div>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-3 w-12" />
            <SkeletonBlock className="h-3 w-20 hidden sm:block" />
          </div>
        </div>
        <SkeletonBlock className="h-9 w-20 rounded-xl shrink-0" />
      </div>
    ))}
  </div>
);

/**
 * Skeleton rows matching FriendsTab friend/request/invite list items.
 */
export const FriendsListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div aria-busy="true" className="space-y-2">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="space-y-1.5 flex-1">
            <SkeletonBlock className="h-3.5 w-28" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
        <SkeletonBlock className="h-8 w-8 rounded-xl shrink-0" />
      </div>
    ))}
  </div>
);

/**
 * Skeleton shown immediately when joining a room before RTDB room snapshot arrives,
 * eliminating flicker back to HomeTab.
 */
export const RoomLobbySkeleton: React.FC<{ lang?: Language; roomCode?: string | null }> = ({
  lang = 'ar',
  roomCode
}) => (
  <div
    dir={lang === 'ar' ? 'rtl' : 'ltr'}
    aria-busy="true"
    className="h-full w-full overflow-hidden flex flex-col items-center justify-start p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] bg-[#030712] relative"
  >
    <div className="stars-overlay" />
    <div className="w-full max-w-xl mx-auto space-y-4 pt-2 relative z-10">
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/95 border border-sky-500/25 shadow-2xl space-y-4">
        <div className="flex flex-col items-center space-y-2">
          <SkeletonBlock className="h-3 w-24" />
          {roomCode ? (
            <div className="font-mono font-black text-3xl text-sky-400/70 tracking-[0.25em]">
              {roomCode}
            </div>
          ) : (
            <SkeletonBlock className="h-9 w-40" />
          )}
          <SkeletonBlock className="h-3 w-36" />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <SkeletonBlock className="h-10 rounded-2xl" />
          <SkeletonBlock className="h-10 rounded-2xl" />
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex justify-between">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <SkeletonBlock className="w-8 h-8 rounded-full" />
                <SkeletonBlock className="h-3.5 w-24" />
              </div>
              <SkeletonBlock className="h-7 w-14 rounded-xl" />
            </div>
          ))}
        </div>

        <SkeletonBlock className="h-28 w-full rounded-2xl" />
        <SkeletonBlock className="h-10 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton grid matching CategoriesTab custom & community category cards.
 */
export const CategoriesListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div aria-busy="true" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div
        key={idx}
        className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center gap-3"
      >
        <SkeletonBlock className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-7 w-20 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

