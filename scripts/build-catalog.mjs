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
run('apply-rollout-metadata.mjs');
run('render-platform-guide-pdfs.mjs');
run('wire-adaptation-workflows.mjs');
run('certify-adaptation-assets.mjs');
