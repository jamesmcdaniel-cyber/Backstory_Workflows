import React from 'react';
import { assetUrl } from '../lib/cn';

// The Backstory symbol mark (/|||) — replaces the legacy "///" eyebrow motif.
// tone: 'light' → black mark for light backgrounds, 'dark' → white mark for dark.
export function BrandMark({ tone = 'light', className = '' }) {
  const file = tone === 'dark' ? 'backstory-symbol-white.png' : 'backstory-symbol-black.png';
  return (
    <img
      src={assetUrl(`assets/${file}`)}
      alt=""
      aria-hidden
      className={`inline-block h-[0.95em] w-auto shrink-0 align-[-0.12em] ${className}`}
    />
  );
}
