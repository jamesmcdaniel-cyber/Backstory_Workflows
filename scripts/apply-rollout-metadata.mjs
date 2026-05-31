import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildPlatformStatusMap,
  buildRolloutBlockers,
  getN8nVariantPresentation,
} from './workflow-rollout-helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'workflows.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const GUIDE_PDF_MAPPINGS = [
  ['workato', 'workato-guide.pdf'],
  ['zapier', 'zapier-guide.pdf'],
];

for (const workflow of catalog.workflows || []) {
  workflow.platform_status = buildPlatformStatusMap(workflow);
  workflow.rollout_blockers = buildRolloutBlockers(workflow);

  workflow.exports = Array.from(
    new Set(
      (workflow.exports || [])
        .filter((entry) => entry !== 'workato-guide.md' && entry !== 'zapier-guide.md')
        .concat(GUIDE_PDF_MAPPINGS.filter(([platformId]) => workflow.platforms?.[platformId]).map(([, fileName]) => fileName)),
    ),
  );

  workflow.exports.sort((left, right) => {
    const order = ['full.json', 'starter.json', 'workato-guide.pdf', 'zapier-guide.pdf'];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
  });

  for (const [platformId, fileName] of GUIDE_PDF_MAPPINGS) {
    if (workflow.platforms?.[platformId]) {
      workflow.platforms[platformId] = fileName;
    }
  }

  workflow.template_variants = (workflow.template_variants || []).map((variant) => {
    if (variant.platform === 'n8n' || variant.id === 'n8n') {
      const presentation = getN8nVariantPresentation(workflow.id);
      return { ...variant, ...presentation };
    }
    if (variant.platform === 'workato' || variant.id === 'workato') {
      return {
        ...variant,
        label: 'Workato PDF Guide',
        description:
          'Branded PDF implementation guide covering Recipe Functions, custom connectors, package deployment, and native connector setup.',
      };
    }
    if (variant.platform === 'zapier' || variant.id === 'zapier') {
      return {
        ...variant,
        label: 'Zapier PDF Guide',
        description:
          'Branded PDF implementation guide covering custom apps, Zap templates, native actions, and platform restrictions.',
      };
    }
    return variant;
  });
}

catalog._generated = new Date().toISOString();
catalog._generator = 'scripts/build-catalog.mjs';

fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      updatedWorkflows: catalog.workflows.length,
      generator: catalog._generator,
    },
    null,
    2,
  ),
);
