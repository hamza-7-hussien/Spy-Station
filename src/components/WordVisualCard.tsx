import React, { useState } from 'react';
import { CategoryKey } from '../types';
import { CATEGORY_STYLES, getWordImage } from '../wordVisuals';

interface Props {
  wordEn?: string | null;
  wordAr?: string | null;
  category?: CategoryKey | null;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const WordVisualCard: React.FC<Props> = ({
  wordEn,
  wordAr,
  category,
  imageUrl,
  size = 'md',
  className = ''
}) => {
  // CRITICAL USER RULE: Jobs MUST NOT have an image!
  if (category === 'jobs') {
    return null;
  }

  const [hasError, setHasError] = useState(false);
  const resolvedUrl = imageUrl || getWordImage(wordEn, wordAr, category);

  if (!resolvedUrl) return null;

  const styleMeta = category ? CATEGORY_STYLES[category] : null;
  const borderColor = styleMeta ? styleMeta.border : 'border-sky-400';
  const icon = styleMeta ? styleMeta.icon : '🎯';

  // Sizing: compact and contained, nicely aligned with the secret word text
  const sizeClasses = {
    sm: 'w-11 h-11 rounded-xl',
    md: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
    lg: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl'
  }[size];

  return (
    <div className={`relative shrink-0 group ${className}`}>
      {/* Outer ambient glow */}
      <div
        className="absolute -inset-1 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-500"
        style={{ backgroundColor: styleMeta?.glow || 'rgba(56,189,248,0.3)' }}
      />

      {/* Cyber game frame */}
      <div
        className={`relative ${sizeClasses} p-0.5 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 ${borderColor} shadow-lg overflow-hidden flex items-center justify-center`}
      >
        {!hasError ? (
          <img
            src={resolvedUrl}
            alt={wordAr || wordEn || 'Secret Word'}
            className="w-full h-full object-cover rounded-xl transition duration-300 group-hover:scale-105"
            onError={() => setHasError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 rounded-xl text-lg sm:text-xl">
            <span>{icon}</span>
          </div>
        )}

        {/* Cyber overlay scanline shimmer */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

        {/* Corner category mini-badge */}
        <span className="absolute bottom-0.5 end-0.5 text-[10px] bg-slate-950/90 rounded-full px-1 py-0.2 shadow border border-sky-400/40 select-none">
          {icon}
        </span>
      </div>
    </div>
  );
};
