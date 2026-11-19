import { strToU8, zipSync } from 'fflate';
import { pluginFiles } from './pluginFormat.js';
import briefTemplate from '../plugin-kit/brief/brief-template.html?raw';
import buildBrief from '../plugin-kit/brief/build_brief.py?raw';
import dataSchema from '../plugin-kit/brief/data-schema.md?raw';
import publishing from '../plugin-kit/brief/publishing.md?raw';
import sampleData from '../plugin-kit/brief/sample-data.json?raw';

// The page kit shipped unchanged with every plugin whose output is a brief.
// build_brief.py checks the template's SHA-256, so it must ship byte for byte.
export const BRIEF_KIT_CONTENT = {
  'assets/brief-template.html': briefTemplate,
  'scripts/build_brief.py': buildBrief,
  'references/data-schema.md': dataSchema,
  'references/publishing.md': publishing,
  'examples/sample-data.json': sampleData,
};

// A fixed timestamp keeps the ZIP byte-identical for the same plugin.
const MTIME = new Date(2026, 0, 1);
// Unix permissions in the high bits of the external attributes, so the build
// script unzips executable.
const EXECUTABLE = { os: 3, attrs: 0o100755 << 16 };

/** All files of the plugin, keyed by their path inside the plugin folder. */
export const allPluginFiles = (plugin) => pluginFiles(plugin, BRIEF_KIT_CONTENT);

// Claude's plugin upload accepts a ZIP holding one .claude-plugin/plugin.json,
// with or without the plugin folder at its root. The folder keeps an unzipped
// copy tidy for Claude Code.
export function packagePlugin(plugin) {
  const entries = {};
  for (const [path, content] of Object.entries(allPluginFiles(plugin))) {
    entries[`${plugin.name}/${path}`] = [strToU8(content), { mtime: MTIME, ...(path.endsWith('.py') ? EXECUTABLE : {}) }];
  }
  return zipSync(entries);
}

export function downloadPlugin(plugin) {
  const url = URL.createObjectURL(new Blob([packagePlugin(plugin)], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${plugin.name}-${plugin.version}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
