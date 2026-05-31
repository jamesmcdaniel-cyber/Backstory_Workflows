import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PUBLIC_N8N_WORKFLOW_IDS } from './workflow-rollout-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const image = process.env.N8N_DOCKER_IMAGE || 'n8nio/n8n:latest';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'backstory-n8n-smoke-'));
const dataDir = path.join(tempRoot, 'n8n-data');
fs.mkdirSync(dataDir, { recursive: true });

const sharedFiles = [
  'source-adapter.json',
  'identity-channel-resolution.json',
  'delivery-renderer.json',
  'calendar-task-writer.json',
  'run-summary-observability.json',
].map((fileName) => path.join(repoRoot, 'shared-n8n', fileName));

const publicWorkflowFiles = Array.from(PUBLIC_N8N_WORKFLOW_IDS)
  .sort()
  .map((workflowId) => path.join(repoRoot, workflowId, 'full.json'));

function runDocker(args) {
  return execFileSync('docker', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function dockerAvailable() {
  try {
    runDocker(['info']);
    return true;
  } catch {
    return false;
  }
}

function importWorkflow(filePath) {
  const relativePath = path.relative(repoRoot, filePath);
  return runDocker([
    'run',
    '--rm',
    '-u',
    'node',
    '-v',
    `${dataDir}:/home/node/.n8n`,
    '-v',
    `${repoRoot}:/repo`,
    image,
    'n8n',
    'import:workflow',
    `--input=/repo/${relativePath}`,
  ]);
}

function main() {
  if (!dockerAvailable()) {
    throw new Error('Docker daemon is not running. Start Docker Desktop before running smoke:n8n.');
  }

  const imported = [];
  for (const filePath of [...sharedFiles, ...publicWorkflowFiles]) {
    importWorkflow(filePath);
    imported.push(path.relative(repoRoot, filePath));
  }

  const unresolvedRefs = [];
  for (const filePath of publicWorkflowFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (/REPLACE_WITH_SHARED_/.test(raw)) {
      unresolvedRefs.push(path.relative(repoRoot, filePath));
    }
  }
  if (unresolvedRefs.length) {
    throw new Error(`Public n8n workflows still contain unresolved shared-workflow placeholders: ${unresolvedRefs.join(', ')}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        image,
        importedCount: imported.length,
        imported,
        note:
          'This smoke check validates Dockerized n8n imports plus env-backed shared workflow references. Runtime execution still requires live connector credentials and source fixtures.',
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
