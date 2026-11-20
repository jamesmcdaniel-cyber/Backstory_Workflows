import { strFromU8, unzipSync } from 'fflate';

// Files a person adds under "Your setup": a field inventory, an existing
// skill, a report, notes. They are read in the browser as text and sent with
// the fit check and the design, never stored. Binary files are skipped, ZIPs
// are opened for their text files, and sizes are capped so one stray folder
// can't swamp the request.
export const SETUP_LIMITS = { files: 30, perFile: 20000, total: 100000, name: 200 };
export const SETUP_ACCEPT = '.csv,.tsv,.txt,.md,.markdown,.json,.yaml,.yml,.py,.xml,.zip';
const TEXT = /\.(?:csv|tsv|txt|md|markdown|json|ya?ml|py|xml|html?|sql)$/i;
const SKIP = /(?:^|\/)(?:__MACOSX|\.git|node_modules|\.DS_Store)(?:\/|$)|(?:^|\/)\._/;

const isBinary = (text) => text.slice(0, 2000).includes('\u0000');

function addText(result, name, text) {
  if (result.files.length >= SETUP_LIMITS.files) {
    result.skipped.push({ name, reason: `only the first ${SETUP_LIMITS.files} files are used` });
    return;
  }
  if (isBinary(text)) {
    result.skipped.push({ name, reason: 'not a text file' });
    return;
  }
  const room = SETUP_LIMITS.total - result.files.reduce((sum, file) => sum + file.content.length, 0);
  if (room <= 0) {
    result.skipped.push({ name, reason: 'the files added already reach the size limit' });
    return;
  }
  const limit = Math.min(SETUP_LIMITS.perFile, room);
  result.files.push({ name: name.slice(0, SETUP_LIMITS.name), size: text.length, content: text.slice(0, limit), truncated: text.length > limit });
}

/**
 * Reads File objects (from a file picker, a folder picker or a drop) into
 * { files: [{ name, size, content, truncated }], skipped: [{ name, reason }] }.
 * `existing` counts toward the limits, so adding more never exceeds them.
 */
export async function readSetupFiles(fileList, existing = []) {
  const result = { files: [...existing], skipped: [] };
  for (const file of Array.from(fileList || [])) {
    const name = file.webkitRelativePath || file.relativePath || file.name;
    if (SKIP.test(name)) continue;
    if (result.files.some((item) => item.name === name)) continue;
    if (/\.zip$/i.test(name)) {
      try {
        const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
        for (const [path, bytes] of Object.entries(entries)) {
          if (path.endsWith('/') || SKIP.test(path) || !TEXT.test(path)) continue;
          addText(result, `${name}/${path}`, strFromU8(bytes));
        }
      } catch {
        result.skipped.push({ name, reason: 'the ZIP could not be opened' });
      }
      continue;
    }
    if (!TEXT.test(name)) {
      result.skipped.push({ name, reason: 'not a text file the builder reads' });
      continue;
    }
    addText(result, name, await file.text());
  }
  return { files: result.files.slice(existing.length), skipped: result.skipped };
}

/** Every File under a dropped folder, via the drag-and-drop entries API. */
export async function filesFromDrop(dataTransfer) {
  const items = Array.from(dataTransfer?.items || []);
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return Array.from(dataTransfer?.files || []);
  const files = [];
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      files.push(Object.assign(file, { relativePath: `${prefix}${file.name}` }));
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries returns a batch at a time; read until it comes back empty.
      for (;;) {
        const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  for (const entry of entries) await walk(entry, '');
  return files;
}
