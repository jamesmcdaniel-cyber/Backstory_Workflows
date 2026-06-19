// Copies the canonical data + assets from the repo root into web/public so the
// React app stays in sync with the legacy site's single source of truth.
// Runs automatically before `dev` and `build`.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const pub = resolve(here, '..', 'public');

const files = [
  ['workflows.json', 'workflows.json'],
  ['openapi.json', 'openapi.json'],
  ['skills/skills.json', 'skills.json'],
];
const dirs = [['assets', 'assets']];

mkdirSync(pub, { recursive: true });
for (const [src, dst] of files) {
  const from = resolve(repo, src);
  if (existsSync(from)) cpSync(from, resolve(pub, dst));
  else console.warn('sync-data: missing', src);
}
for (const [src, dst] of dirs) {
  const from = resolve(repo, src);
  if (existsSync(from)) cpSync(from, resolve(pub, dst), { recursive: true });
}
console.log('sync-data: copied data + assets into web/public');
