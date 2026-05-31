import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'workflows.json');

const baseTemplateVariants = [
  {
    id: 'n8n',
    platform: 'n8n',
    label: 'Production Template',
    description: 'Primary n8n template intended for production hardening and shared-subworkflow reuse.',
  },
  {
    id: 'n8n-starter',
    platform: 'n8n-starter',
    label: 'Demo Starter',
    description: 'Demo-safe starter asset for sandbox imports, walkthroughs, and customer-specific adaptation.',
  },
];

const optionalPlatformVariants = [
  {
    id: 'workato',
    platform: 'workato',
    fileName: 'workato-guide.pdf',
    sourceFileName: 'workato-guide.md',
    label: 'Workato PDF Guide',
    description: 'Branded PDF Workato guide covering Recipe Functions, custom connectors, package deployment, and native connector setup.',
  },
  {
    id: 'zapier',
    platform: 'zapier',
    fileName: 'zapier-guide.pdf',
    sourceFileName: 'zapier-guide.md',
    label: 'Zapier PDF Guide',
    description: 'Branded PDF Zapier guide covering custom apps, Zap templates, native actions, and platform restrictions.',
  },
];

const legacyPlatformArtifacts = new Set(['workato-template.json', 'zapier-template.json']);

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const workflowDirs = fs
  .readdirSync(repoRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

let createdStarters = 0;
let updatedCatalogEntries = 0;

for (const workflowId of workflowDirs) {
  const workflowDir = path.join(repoRoot, workflowId);
  const fullPath = path.join(workflowDir, 'full.json');
  const starterPath = path.join(workflowDir, 'starter.json');
  if (!fs.existsSync(fullPath)) continue;

  if (!fs.existsSync(starterPath)) {
    fs.copyFileSync(fullPath, starterPath);
    createdStarters += 1;
  }

  const workflow = catalog.workflows.find((item) => item.id === workflowId);
  if (!workflow) continue;

  const presentOptionalVariants = optionalPlatformVariants.filter((variant) =>
    fs.existsSync(path.join(workflowDir, variant.sourceFileName || variant.fileName)),
  );
  const nextExports = Array.from(
    new Set(
      (workflow.exports || []).filter((entry) => !legacyPlatformArtifacts.has(entry)).concat([
        'full.json',
        'starter.json',
        ...presentOptionalVariants.map((variant) => variant.fileName),
      ]),
    ),
  );
  nextExports.sort((left, right) => {
    const order = ['full.json', 'starter.json', 'workato-guide.pdf', 'zapier-guide.pdf'];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });

  workflow.exports = nextExports;
  workflow.platforms = workflow.platforms || {};
  workflow.platforms.n8n = 'full.json';
  workflow.platforms['n8n-starter'] = 'starter.json';
  for (const variant of presentOptionalVariants) {
    workflow.platforms[variant.platform] = variant.fileName;
  }
  workflow.template_variants = [
    ...baseTemplateVariants,
    ...presentOptionalVariants.map(({ fileName, sourceFileName, ...variant }) => variant),
  ];
  updatedCatalogEntries += 1;
}

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      createdStarters,
      updatedCatalogEntries,
      workflowCount: workflowDirs.length,
    },
    null,
    2,
  ),
);
