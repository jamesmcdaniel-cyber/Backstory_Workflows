export const PLATFORM_STATUS_VALUES = new Set([
  'public',
  'pilot',
  'legacy',
  'starter',
  'guide-only',
]);

export const PUBLIC_N8N_WORKFLOW_IDS = new Set([
  '04-opportunity-discovery',
  '05-forecast-coach',
  '18-channel-pulse',
  '29-digital-chief-of-staff',
]);

export const PILOT_N8N_WORKFLOW_IDS = new Set([
  '19-customer-stack-blueprint',
  '20-crm-signal-normalizer',
  '21-meeting-intelligence-normalizer',
  '22-multi-channel-delivery-router',
  '23-identity-resolution-hub',
  '24-workflow-contract-validator',
  '25-implementation-gap-audit',
  '26-orchestrator-migration-planner',
  '27-adapter-regression-monitor',
  '28-rollout-readiness-scorecard',
  '30-market-research-brief',
]);

export const LEGACY_N8N_WORKFLOW_IDS = new Set([
  '01-sales-digest',
  '02-meeting-brief',
  '03-silence-contract-monitor',
  '06-executive-inbox',
  '07-churn-risk-scorecard',
  '08-renewal-prep-brief',
  '09-onboarding-pulse',
  '10-activity-gap-detector',
  '11-deal-hygiene-audit',
  '12-win-loss-debrief',
  '13-competitive-displacement-alert',
  '14-territory-heat-map',
  '15-qbr-auto-prep',
  '16-executive-sponsor-tracker',
  '17-marketing-sales-handoff-scorer',
]);

export function getN8nRolloutStatus(workflowId) {
  if (PUBLIC_N8N_WORKFLOW_IDS.has(workflowId)) return 'public';
  if (PILOT_N8N_WORKFLOW_IDS.has(workflowId)) return 'pilot';
  return 'legacy';
}

export function getPlatformStatus(workflow, platformId) {
  if (!workflow?.platforms?.[platformId]) return null;

  if (platformId === 'n8n') return getN8nRolloutStatus(workflow.id);
  if (platformId === 'n8n-starter') return 'starter';
  if (
    platformId === 'workato' ||
    platformId === 'zapier' ||
    platformId === 'recipe-card' ||
    platformId === 'claude-workflow' ||
    platformId === 'openai-workflow'
  ) {
    return 'guide-only';
  }
  return 'legacy';
}

export function buildPlatformStatusMap(workflow) {
  const statuses = {};
  for (const platformId of Object.keys(workflow.platforms || {})) {
    const status = getPlatformStatus(workflow, platformId);
    if (status) statuses[platformId] = status;
  }
  return statuses;
}

export function buildRolloutBlockers(workflow) {
  const n8nStatus = getPlatformStatus(workflow, 'n8n');
  if (n8nStatus === 'legacy') {
    return [
      'Legacy inline HTTP and source-normalization patterns still need migration onto shared adapters.',
      'The n8n full template is not yet hardened enough for public rollout and remains on the migration backlog.',
    ];
  }
  if (n8nStatus === 'pilot') {
    return [
      'This workflow is still a pilot/reference asset and is not yet separated cleanly enough for broad public rollout.',
      'Customer-specific source or sink adapters still need hardening before the n8n template can be promoted to public.',
    ];
  }
  return [];
}

export function getN8nVariantPresentation(workflowId) {
  const status = getN8nRolloutStatus(workflowId);
  if (status === 'public') {
    return {
      label: 'Public Template',
      description:
        'Public-ready n8n template with env-backed shared workflow references, standardized contracts, and native delivery nodes.',
    };
  }
  if (status === 'pilot') {
    return {
      label: 'Pilot Template',
      description:
        'Pilot/reference n8n template for internal validation. Keep this gated until the full and starter variants diverge cleanly.',
    };
  }
  return {
    label: 'Legacy Template',
    description:
      'Legacy n8n template retained for reference. Do not treat this full.json variant as public-release ready until it is migrated.',
  };
}
