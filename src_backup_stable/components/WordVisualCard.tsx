import React from 'react';
import { CategoryKey } from '../types';

interface Props {
  wordEn?: string | null;
  wordAr?: string | null;
  category?: CategoryKey | null;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// User explicitly requested to completely remove images for all categories and words
export const WordVisualCard: React.FC<Props> = () => {
  return null;
};
