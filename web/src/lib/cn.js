import clsx from 'clsx';

// Tiny class combiner. (clsx is enough here; no tailwind-merge needed yet.)
export function cn(...args) {
  return clsx(...args);
}

// Base-aware asset/data URL so fetches work under the GitHub Pages base path.
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');
}
