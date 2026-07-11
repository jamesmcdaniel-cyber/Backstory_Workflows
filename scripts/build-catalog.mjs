import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const run = (scriptName) => {
  execFileSync(process.execPath, [path.join(__dirname, scriptName)], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
};

run('build-reference-assets.mjs');
run('sync-workflow-variants.mjs');
run('rebuild-sales-digest-parity.mjs');
run('rebuild-meeting-brief-parity.mjs');
run('build-orchestrator-instructions.mjs');
run('apply-rollout-metadata.mjs');
run('render-platform-guide-pdfs.mjs');
run('wire-adaptation-workflows.mjs');
run('apply-native-node-parity.mjs');
// Must run after every generator and after native-node parity (which strips
// credential blocks): re-hardens templates for external use — native data
// sources, pre-wired credential placeholders, demo-safe starters, model bump.
run('harden-external-templates.mjs');
run('certify-adaptation-assets.mjs');
