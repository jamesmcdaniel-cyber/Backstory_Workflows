import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import resolveConfig from 'tailwindcss/resolveConfig';
import { describe, expect, it } from 'vitest';
import config from '../../../tailwind.config.js';

const src = resolve(import.meta.dirname, '..', '..');
const CLASS = /\b(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|placeholder|accent|decoration|caret)-[a-zA-Z][a-zA-Z0-9-]*\/(\d+(?:\.\d+)?)(?![\w%/])/g;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '__tests__') return [];
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|jsx|css)$/.test(entry.name) ? [path] : [];
  });
}

// Tailwind silently drops a color class whose opacity isn't on its scale, so a
// typo'd tint just renders with no background and no warning.
describe('Tailwind opacity modifiers', () => {
  it('only uses values on the configured scale', () => {
    const scale = resolveConfig(config).theme.opacity;
    const invalid = sourceFiles(src).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(CLASS)]
        .filter((match) => !(match[1] in scale))
        .map((match) => `${match[0]} in ${file.slice(src.length + 1)}`));
    expect(invalid).toEqual([]);
  });
});
