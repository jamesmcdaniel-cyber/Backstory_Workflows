import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { toolsNamedIn, wordingProblem } from './skillFormat.js';
import { MCP_TOOLS } from '../data/mcpTools.js';

// Editing an existing skill: a Claude plugin ZIP or a ChatGPT skill ZIP (or
// its folder) is read here, edited file by file by the builder, checked, and
// zipped back in the same shape. Text files can change; binary files and the
// fixed page template (with its fingerprint) never do.
// Limits on what's read and sent. The locked page template never leaves the
// browser (the model can't change it), and the server shows the model the
// files that matter first when a package is larger than it can read at once.
export const EDIT_LIMITS = { files: 200, perFile: 200000, total: 1000000, change: 2000 };
const JUNK = /(?:^|\/)(?:__MACOSX|\.git|node_modules|__pycache__)(?:\/|$)|(?:^|\/)(?:\.DS_Store|Thumbs\.db)$|(?:^|\/)\._/;
const TEXT = /\.(?:md|markdown|json|py|ya?ml|txt|csv|tsv|html?|css|js|mjs|sh|sql|sha256|toml|cfg|ini|xml)$/i;
const LOCKED = /(?:^|\/)assets\/brief-template\.(?:html|sha256)$/;
const TOOL_NAMES = new Set(MCP_TOOLS.map((tool) => tool.name));
export const PLATFORM_NAME = { claude: 'Claude plugin', chatgpt: 'ChatGPT skill' };

const isBinaryText = (text) => text.slice(0, 4000).includes('\u0000');
export const isLocked = (path) => LOCKED.test(path);

function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---/.exec(String(text || ''));
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2].replace(/^["']|["']$/g, '');
  }
  const version = /\n\s+version:\s*["']?([\w.-]+)["']?/.exec(`\n${match[1]}`);
  return { fields, keys: Object.keys(fields), version: version?.[1] || null };
}

/** Strips one folder shared by every path, remembering it so the ZIP comes back the same shape. */
function stripRoot(entries) {
  const paths = Object.keys(entries);
  const first = paths[0]?.split('/')[0];
  if (!first || paths.length === 0 || !paths.every((path) => path.startsWith(`${first}/`))) return { root: '', entries };
  return { root: first, entries: Object.fromEntries(Object.entries(entries).map(([path, value]) => [path.slice(first.length + 1), value])) };
}

/**
 * Reads a ZIP File, or the Files of a folder, into a package:
 * { platform, name, version, root, skillDir, files: { path: text }, binary: { path: Uint8Array }, problems }.
 */
export async function readPackage(input) {
  const raw = {};
  const list = Array.from(input?.length !== undefined ? input : [input]).filter(Boolean);
  if (list.length === 1 && /\.zip$/i.test(list[0].name)) {
    const entries = unzipSync(new Uint8Array(await list[0].arrayBuffer()));
    for (const [path, bytes] of Object.entries(entries)) if (!path.endsWith('/')) raw[path] = bytes;
  } else {
    for (const file of list) raw[file.webkitRelativePath || file.relativePath || file.name] = new Uint8Array(await file.arrayBuffer());
  }
  const kept = Object.fromEntries(Object.entries(raw).filter(([path]) => !JUNK.test(path)));
  const { root, entries } = stripRoot(kept);
  const files = {};
  const binary = {};
  for (const [path, bytes] of Object.entries(entries)) {
    const text = TEXT.test(path) ? strFromU8(bytes) : null;
    if (text !== null && !isBinaryText(text)) files[path] = text;
    else binary[path] = bytes;
  }
  return describePackage({ root, files, binary });
}

/** Works out what a package is from its files. */
export function describePackage({ root, files, binary = {} }) {
  const problems = [];
  const skillMds = Object.keys(files).filter((path) => /(?:^|\/)SKILL\.md$/.test(path));
  let platform = null;
  let skillDir = null;
  let name = null;
  let version = null;
  if (files['.claude-plugin/plugin.json'] !== undefined) {
    platform = 'claude';
    try {
      const manifest = JSON.parse(files['.claude-plugin/plugin.json']);
      name = manifest.name || null;
      version = manifest.version || null;
    } catch {
      problems.push('.claude-plugin/plugin.json is not valid JSON.');
    }
    const skill = skillMds.find((path) => path.startsWith('skills/'));
    skillDir = skill ? skill.replace(/SKILL\.md$/, '') : null;
    if (!skill) problems.push('The plugin has no skills/<name>/SKILL.md.');
  } else if (files['SKILL.md'] !== undefined) {
    platform = 'chatgpt';
    skillDir = '';
    const meta = frontmatter(files['SKILL.md']);
    name = meta?.fields.name || root || null;
    version = meta?.version || null;
    if (files['agents/openai.yaml'] === undefined) problems.push('No agents/openai.yaml: ChatGPT skills need one (it can be added as part of an edit).');
  } else {
    problems.push(skillMds.length > 1 ? 'This holds several skills; upload one plugin or one skill at a time.' : 'No SKILL.md found: upload a Claude plugin ZIP (with .claude-plugin/plugin.json) or a ChatGPT skill ZIP (with SKILL.md).');
  }
  const total = Object.entries(files).filter(([path]) => !isLocked(path)).reduce((sum, [, text]) => sum + text.length, 0);
  if (Object.keys(files).length > EDIT_LIMITS.files) problems.push(`It has ${Object.keys(files).length} text files; the builder edits packages of up to ${EDIT_LIMITS.files}.`);
  if (total > EDIT_LIMITS.total) problems.push(`Its text runs to ${Math.round(total / 1000)}k characters; the builder edits packages of up to ${EDIT_LIMITS.total / 1000}k.`);
  const tooBig = Object.entries(files).filter(([path, text]) => !isLocked(path) && text.length > EDIT_LIMITS.perFile).map(([path]) => path);
  if (tooBig.length) problems.push(`These files are too large to edit: ${tooBig.join(', ')}.`);
  return { platform, name, version, root, skillDir, files, binary, problems };
}

/** 0.5.3 → 0.5.4 (or 1.2 → 1.3); null when there's no version to bump. */
export function nextPatch(version) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(version || ''));
  if (!match) return null;
  return match[3] === undefined ? `${match[1]}.${Number(match[2]) + 1}` : `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sets the version everywhere it's recorded, so the three places agree:
 * plugin.json, SKILL.md's metadata.version, and the README's mentions of the old version.
 */
export function applyVersion(pkg, files, version) {
  if (!pkg.version || !version || version === pkg.version) return files;
  const out = { ...files };
  const old = new RegExp(`(?<![\\d.])${escapeRegExp(pkg.version)}(?!\\.?\\d)`, 'g');
  if (out['.claude-plugin/plugin.json']) {
    try {
      const manifest = JSON.parse(out['.claude-plugin/plugin.json']);
      manifest.version = version;
      out['.claude-plugin/plugin.json'] = `${JSON.stringify(manifest, null, 2)}\n`;
    } catch {
      /* left as is; the checks report it */
    }
  }
  const skillMd = `${pkg.skillDir || ''}SKILL.md`;
  if (out[skillMd]) out[skillMd] = out[skillMd].replace(/(\n\s+version:\s*["']?)([\w.-]+)(["']?)/, `$1${version}$3`);
  if (out['README.md']) out['README.md'] = out['README.md'].replace(old, version);
  return out;
}

/** The package as a ZIP, in the shape it came in: the same top folder, binaries untouched, scripts executable. */
export function zipPackage(pkg, files) {
  const folder = pkg.root || pkg.name || 'skill';
  const mtime = new Date(2026, 0, 1);
  const entries = {};
  for (const [path, text] of Object.entries(files)) entries[`${folder}/${path}`] = [strToU8(text), { mtime, ...(path.endsWith('.py') || path.endsWith('.sh') ? { os: 3, attrs: 0o100755 << 16 } : {}) }];
  for (const [path, bytes] of Object.entries(pkg.binary || {})) entries[`${folder}/${path}`] = [bytes, { mtime }];
  return zipSync(entries);
}

/** A line diff (longest common subsequence), grouped into hunks with context. */
export function lineDiff(before, after, context = 3) {
  const a = String(before || '').split('\n');
  const b = String(after || '').split('\n');
  // Trim the shared start and end, so the table only covers the changed middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const ops = [];
  if (midA.length * midB.length > 4000000) {
    midA.forEach((line) => ops.push({ type: 'del', text: line }));
    midB.forEach((line) => ops.push({ type: 'add', text: line }));
  } else {
    const table = Array.from({ length: midA.length + 1 }, () => new Uint32Array(midB.length + 1));
    for (let i = midA.length - 1; i >= 0; i -= 1) {
      for (let j = midB.length - 1; j >= 0; j -= 1) {
        table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < midA.length || j < midB.length) {
      if (i < midA.length && j < midB.length && midA[i] === midB[j]) { ops.push({ type: 'same', text: midA[i] }); i += 1; j += 1; }
      else if (j < midB.length && (i >= midA.length || table[i][j + 1] >= table[i + 1][j])) { ops.push({ type: 'add', text: midB[j] }); j += 1; }
      else { ops.push({ type: 'del', text: midA[i] }); i += 1; }
    }
  }
  const all = [...a.slice(0, start).map((text) => ({ type: 'same', text })), ...ops, ...a.slice(endA).map((text) => ({ type: 'same', text }))];
  let lineA = 1;
  let lineB = 1;
  const numbered = all.map((op) => {
    const item = { ...op, a: op.type !== 'add' ? lineA : null, b: op.type !== 'del' ? lineB : null };
    if (op.type !== 'add') lineA += 1;
    if (op.type !== 'del') lineB += 1;
    return item;
  });
  const hunks = [];
  let current = null;
  numbered.forEach((op, index) => {
    if (op.type === 'same') return;
    const from = Math.max(0, index - context);
    if (current && from <= current.to + 1) current.to = Math.min(numbered.length - 1, index + context);
    else {
      current = { from, to: Math.min(numbered.length - 1, index + context) };
      hunks.push(current);
    }
  });
  return {
    added: numbered.filter((op) => op.type === 'add').length,
    removed: numbered.filter((op) => op.type === 'del').length,
    hunks: hunks.map((hunk) => numbered.slice(hunk.from, hunk.to + 1)),
  };
}

/**
 * Format checks on the edited package: what can be checked without running
 * it. Returns [{ name, passed, detail }].
 */
export function checkPackage(pkg, files) {
  const checks = [];
  // paths: the files a failing check is about, so the page can tell what an edit introduced from what was already there.
  const add = (name, problem, ok, paths = []) => checks.push({ name, passed: !problem, detail: problem || ok, paths: problem ? paths : [] });
  const skillMdPath = `${pkg.skillDir || ''}SKILL.md`;
  const skillMd = files[skillMdPath];
  const meta = frontmatter(skillMd);
  const description = meta?.fields.description || '';
  let skillProblem = '';
  if (!skillMd) skillProblem = 'SKILL.md is missing.';
  else if (!meta) skillProblem = 'SKILL.md has no frontmatter.';
  else if (!meta.fields.name) skillProblem = 'SKILL.md frontmatter needs a name.';
  else if (!description) skillProblem = 'SKILL.md frontmatter needs a description.';
  else if (description.length > 1024) skillProblem = `The description is ${description.length} characters; the limit is 1,024.`;
  else if (pkg.platform === 'chatgpt' && meta.keys.some((key) => !['name', 'description', 'metadata', 'license', 'allowed-tools'].includes(key))) skillProblem = 'A ChatGPT skill\'s frontmatter holds name and description only.';
  else if (pkg.platform === 'chatgpt' && /[<>]/.test(description)) skillProblem = 'A ChatGPT skill description cannot contain < or >.';
  add('Skill', skillProblem, `${meta?.fields.name || pkg.name}: frontmatter and description are valid.`);

  const badJson = Object.entries(files).filter(([path]) => path.endsWith('.json')).filter(([, text]) => {
    try { JSON.parse(text); return false; } catch { return true; }
  }).map(([path]) => path);
  add('JSON files', badJson.length ? `Not valid JSON: ${badJson.join(', ')}.` : '', 'Every JSON file parses.', badJson);

  const changedLocked = Object.keys(files).filter((path) => isLocked(path) && files[path] !== pkg.files[path]);
  add('Fixed files', changedLocked.length ? `These must not change: ${changedLocked.join(', ')}.` : '', 'The page template and its fingerprint are unchanged.', changedLocked);

  const markdown = Object.entries(files).filter(([path]) => path.endsWith('.md'));
  const toolFiles = markdown.filter(([, text]) => toolsNamedIn(text).some((tool) => !TOOL_NAMES.has(tool)));
  const unknown = [...new Set(toolFiles.flatMap(([, text]) => toolsNamedIn(text).filter((tool) => !TOOL_NAMES.has(tool))))];
  add('Backstory tools', unknown.length ? `These are not Backstory MCP tools: ${unknown.join(', ')} (in ${toolFiles.map(([path]) => path).join(', ')}).` : '', 'Every tool named is a real Backstory MCP tool.', toolFiles.map(([path]) => path));
  const wording = markdown.map(([path, text]) => [path, wordingProblem(text)]).filter(([, problem]) => problem);
  add('Wording', wording.length ? `${wording[0][1]} In: ${wording.map(([path]) => path).join(', ')}.` : '', 'Describes Backstory accurately.', wording.map(([path]) => path));

  if (pkg.platform === 'claude') {
    let manifestVersion = null;
    try { manifestVersion = JSON.parse(files['.claude-plugin/plugin.json']).version; } catch { /* reported above */ }
    const versions = [manifestVersion, frontmatter(skillMd)?.version].filter(Boolean);
    const disagree = new Set(versions).size > 1;
    const readmeLags = manifestVersion && files['README.md'] && pkg.version && pkg.version !== manifestVersion && new RegExp(`(?<![\\d.])${escapeRegExp(pkg.version)}(?!\\.?\\d)`).test(files['README.md']);
    add('Versions', disagree ? `plugin.json and SKILL.md disagree: ${versions.join(' vs ')}.` : readmeLags ? `README.md still says ${pkg.version}.` : '', `Version ${manifestVersion || '—'} agrees across the manifest, SKILL.md and README.`);
  } else {
    const yaml = files['agents/openai.yaml'];
    add('ChatGPT metadata', yaml ? '' : 'agents/openai.yaml is missing.', 'agents/openai.yaml is present.');
  }
  return checks;
}

/** The scripts to run as the package's own tests: its unittest files and any fixtures runner. */
export function packageTests(pkg, files) {
  const dir = pkg.skillDir || '';
  const scripts = Object.keys(files).filter((path) => path.startsWith(`${dir}scripts/`));
  const unit = scripts.filter((path) => /\/test_[A-Za-z0-9_]+\.py$/.test(path)).map((path) => ({ kind: 'unittest', path, name: path.replace(/^.*\/test_/, '').replace(/\.py$/, '') }));
  const runner = scripts.filter((path) => /\/check_fixtures\.py$/.test(path)).map((path) => ({ kind: 'script', path, args: ['--out', '/tmp/fixtures'] }));
  return [...runner, ...unit];
}
