// Maps catalogue items to the four go-to-market roles the assistant already
// speaks to — Sales, CSM, Marketing, IT — so the Auto flows and Signals pages
// can filter by "who is this for". Workflows carry no role field, so their
// relevance is derived from category (with per-id overrides, mainly to surface
// Marketing, which no single category captures). Skills carry an `audience`
// list, so their roles are derived from those tokens plus a couple of explicit
// Marketing tags the audience vocabulary doesn't cover.

export const ROLES = [
  { value: 'sales', label: 'Sales' },
  { value: 'csm', label: 'CSM' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'it', label: 'IT' },
];

// Default role relevance by workflow category.
const CATEGORY_ROLES = {
  'daily-intelligence': ['sales', 'csm'],
  'pipeline-forecasting': ['sales'],
  'account-monitoring': ['sales', 'csm'],
  'customer-success': ['csm'],
  'coaching-enablement': ['sales'],
  'strategic-intelligence': ['sales'],
  'platform-enablement': ['it'],
};

// Per-workflow overrides — replace the category default for that id. Used where
// an item serves an extra role its category doesn't imply (Marketing intel,
// cross-functional renewal/QBR/account planning, etc.).
const WORKFLOW_ROLE_OVERRIDES = {
  '02-meeting-brief': ['sales', 'csm'],
  '08-renewal-prep-brief': ['csm', 'sales'],
  '12-win-loss-debrief': ['sales', 'marketing'],
  '13-competitive-displacement-alert': ['sales', 'marketing'],
  '14-territory-heat-map': ['sales', 'marketing'],
  '15-qbr-auto-prep': ['sales', 'csm'],
  '16-executive-sponsor-tracker': ['sales', 'csm'],
  '17-marketing-sales-handoff-scorer': ['sales', 'marketing'],
  '18-channel-pulse': ['sales', 'csm', 'marketing'],
  '30-market-research-brief': ['sales', 'marketing'],
  '33-prospecting-brief': ['sales', 'marketing'],
  '35-grounded-follow-up': ['sales', 'csm'],
  '38-account-planning-strategy': ['sales', 'csm'],
};

export function workflowRoles(workflow) {
  if (!workflow) return [];
  return WORKFLOW_ROLE_OVERRIDES[workflow.id] || CATEGORY_ROLES[workflow.category] || [];
}

// Skill audience tokens → canonical roles. Ambiguous cross-functional ops
// tokens (RevOps, Enablement Ops) are intentionally left unmapped so they don't
// pull technical skills into Sales or vice versa.
const AUDIENCE_TO_ROLE = {
  AEs: 'sales',
  'Sales leaders': 'sales',
  'Sales Leaders': 'sales',
  'Sales managers': 'sales',
  VPs: 'sales',
  CROs: 'sales',
  CSMs: 'csm',
  'CS Ops': 'csm',
  'Solutions Engineers': 'it',
  'Data Architects': 'it',
  'Platform Engineers': 'it',
  'Platform Leads': 'it',
  'QA Leads': 'it',
  'Implementation Leads': 'it',
  'CS Architects': 'it',
  Product: 'it',
};

// Signals whose value to Marketing the audience list doesn't spell out.
const SKILL_MARKETING = new Set(['02-external-company-news-agent', '14-competitive-battle-card-agent']);

export function skillRoles(skill) {
  if (!skill) return [];
  const set = new Set();
  (skill.audience || []).forEach((token) => {
    const role = AUDIENCE_TO_ROLE[token];
    if (role) set.add(role);
  });
  if (SKILL_MARKETING.has(skill.id)) set.add('marketing');
  return [...set];
}
