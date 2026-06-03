import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const workflowDirs = [
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
];

const assignment = (name, type, value) => ({ name, type, value });

const workflowUpdates = {
  '19-customer-stack-blueprint': {
    description:
      'Transforms a typed customer stack config plus selected adapter packs into an implementation blueprint that recommends the best validated workflow assets, orchestration recipe, and connector substitutions.',
    params: [
      assignment('defaultOrchestrators', 'string', 'n8n, Make, Power Automate, Zapier, Workato'),
      assignment('validatedAssetsUrl', 'string', 'https://your-library.example.com'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('customerConfigSchemaPath', 'string', '/schemas/customer-stack-config.schema.json'),
      assignment('adapterPackSchemaPath', 'string', '/schemas/adapter-pack.schema.json'),
      assignment('outputWebhookUrl', 'string', 'https://hooks.slack.com/services/YOUR/WEBHOOK'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const workflows = Array.isArray(payload.requests) ? payload.requests : [payload];
const params = $('Workflow Parameters').first().json;
return workflows.filter(Boolean).map((request, index) => {
  const customerConfig = request.customerConfig || request.stackConfig || {};
  const selectedPacks = Array.isArray(request.selectedPacks)
    ? request.selectedPacks
    : Array.isArray(customerConfig.selected_packs)
      ? customerConfig.selected_packs
      : [];
  const adapterPacks = Array.isArray(request.adapterPacks)
    ? request.adapterPacks
    : Array.isArray(request.adapterPackManifests)
      ? request.adapterPackManifests
      : [];
  const selectedPackIds = selectedPacks
    .map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '')
    .filter(Boolean);
  return { json: {
    requestIndex: index + 1,
    customerName: request.customerName || request.accountName || request.company || customerConfig.customer?.name || 'Unknown Customer',
    workflowGoal: request.workflowGoal || request.useCase || 'Unspecified Workflow Goal',
    requestedWorkflowId: request.workflowId || request.requestedWorkflowId || customerConfig.implementation?.workflow_id || '',
    orchestrator: request.orchestrator || request.automationPlatform || customerConfig.implementation?.target_orchestrator || 'unknown',
    crm: request.crm || request.crmPlatform || selectedPacks.find((pack) => pack.role === 'crm')?.pack_id || 'unknown',
    delivery: request.delivery || request.messagingPlatform || selectedPacks.find((pack) => pack.role === 'delivery')?.pack_id || 'unknown',
    meetingSource: request.meetingSource || request.noteTaker || selectedPacks.find((pack) => pack.role === 'meeting_source')?.pack_id || 'unknown',
    constraints: request.constraints || request.knownConstraints || [],
    customerConfigRef: request.customerConfigRef || request.configRef || '',
    customerConfig,
    selectedPacks,
    selectedPackIds,
    adapterPacks,
    certificationScenarios: request.certificationScenarios || customerConfig.certification?.required_scenarios || [],
    assetRegistryUrl: params.assetRegistryUrl,
    customerConfigSchemaUrl: \`\${params.assetRegistryUrl}\${params.customerConfigSchemaPath}\`,
    adapterPackSchemaUrl: \`\${params.assetRegistryUrl}\${params.adapterPackSchemaPath}\`,
    rawRequest: request
  } };
});`,
    extraCodeNodeId: 'match-19',
    extraCode: `const record = $json;
const orchestrator = String(record.orchestrator || '').toLowerCase();
const crm = String(record.crm || '').toLowerCase();
const delivery = String(record.delivery || '').toLowerCase();
const selectedRoles = new Set((record.selectedPacks || []).map((pack) => typeof pack === 'string' ? '' : pack.role || ''));
const recommendations = [];
if (orchestrator.includes('n8n')) recommendations.push('Use shipped n8n JSON as the primary starting point.');
if (orchestrator.includes('power')) recommendations.push('Use the generic recipe and swap Microsoft-native connectors first.');
if (orchestrator.includes('zapier') || orchestrator.includes('make') || orchestrator.includes('workato')) recommendations.push('Use the orchestration recipe with lightweight connector wrappers.');
if (crm.includes('dynamics')) recommendations.push('Apply the Dynamics 365 mapping profile instead of Salesforce object names.');
if (delivery.includes('teams')) recommendations.push('Format final outputs for Teams cards or Teams chat messages instead of Slack markdown only.');
if (!selectedRoles.has('crm')) recommendations.push('No CRM adapter pack is selected. Start by choosing or authoring one before customizing workflow logic.');
if (!selectedRoles.has('delivery')) recommendations.push('No delivery adapter pack is selected. Capture routing defaults in the customer stack config before rollout.');
if (!record.customerConfigRef && !record.customerConfig?.customer?.slug) recommendations.push('The typed customer stack config is missing. Start from the customer stack config starter before implementation.');
if (!(record.certificationScenarios || []).length) recommendations.push('No certification scenarios are defined yet. Add golden scenarios before launch planning.');
if (!recommendations.length) recommendations.push('Start from the closest recipe card and keep the orchestration pattern constant while swapping connectors.');
return [{ json: { ...record, selectedRoles: [...selectedRoles].filter(Boolean), missingRoles: ['crm', 'delivery'].filter((role) => !selectedRoles.has(role)), recommendations } }];`,
    prompt: `=You are designing a reusable workflow implementation blueprint.

Customer: {{ $json.customerName }}
Requested workflow ID: {{ $json.requestedWorkflowId }}
Workflow goal: {{ $json.workflowGoal }}
Orchestrator: {{ $json.orchestrator }}
CRM: {{ $json.crm }}
Delivery: {{ $json.delivery }}
Meeting source: {{ $json.meetingSource }}
Customer config ref: {{ $json.customerConfigRef }}
Customer config: {{ JSON.stringify($json.customerConfig, null, 2) }}
Selected packs: {{ JSON.stringify($json.selectedPacks, null, 2) }}
Inline adapter packs: {{ JSON.stringify($json.adapterPacks, null, 2) }}
Certification scenarios: {{ JSON.stringify($json.certificationScenarios) }}
Constraints: {{ JSON.stringify($json.constraints) }}
Recommendations: {{ JSON.stringify($json.recommendations) }}

Produce:
1. Best validated starting point from this library
2. Adapter-pack plan by role
3. Customer-config gaps or missing fields
4. Certification plan before launch
5. First implementation milestones

Keep the output concise and operator-friendly.`,
    systemMessage:
      'You are a workflow solution architect turning one-off requests into repeatable implementation patterns using typed customer config and adapter-pack assets.',
    deliverBody:
      '={{ { customerName: $json.customerName, workflowGoal: $json.workflowGoal, customerConfigRef: $json.customerConfigRef, selectedPackIds: $json.selectedPackIds || [], missingRoles: $json.missingRoles || [], blueprint: $json.output || $json.text || JSON.stringify($json) } }}',
  },
  '20-crm-signal-normalizer': {
    description:
      'Normalizes CRM records using a selected CRM adapter pack so Salesforce, Dynamics 365, HubSpot, or custom sources produce one canonical source_record payload for downstream workflows.',
    params: [
      assignment('crmSource', 'string', 'Dynamics 365'),
      assignment('sourceApiBaseUrl', 'string', 'https://your-crm.example.com/api'),
      assignment('sourceApiToken', 'string', 'YOUR_SOURCE_API_TOKEN'),
      assignment('mappingProfile', 'string', 'canonical-opportunity-v1'),
      assignment('defaultCrmAdapterPackId', 'string', 'crm.salesforce.opportunity-signals'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('outputWebhookUrl', 'string', 'https://your-normalized-event-bus.example.com'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const records = payload.records || payload.items || payload.data || [];
const params = $('Workflow Parameters').first().json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(customerConfig.selected_packs) ? customerConfig.selected_packs : [];
const adapterPackId = payload.crmAdapterPackId || payload.adapterPackId || selectedPacks.find((pack) => pack.role === 'crm')?.pack_id || params.defaultCrmAdapterPackId;
const adapterPack = payload.crmAdapterPack || payload.adapterPackManifest || {};
const fieldOverrides = payload.fieldOverrides || customerConfig.field_overrides?.crm || {};
return records.map((record, index) => ({ json: {
  recordIndex: index + 1,
  crmSource: payload.crmSource || params.crmSource,
  adapterPackId,
  adapterPack,
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  fieldOverrides,
  mappingProfile: payload.mappingProfile || params.mappingProfile,
  canonical: {
    accountName: record.accountName || record.account?.name || record.company || record.customerName || '',
    opportunityName: record.opportunityName || record.dealName || record.topic || '',
    stage: record.stage || record.salesStage || record.status || '',
    amount: record.amount || record.value || record.estRevenue || '',
    owner: record.ownerName || record.owner?.name || record.assignedTo || '',
    closeDate: record.closeDate || record.estimatedClose || '',
    sourceId: record.id || record.opportunityId || record.accountId || \`record-\${index + 1}\`
  },
  rawRecord: record
} }));`,
    prompt: `=Review this canonical CRM payload for downstream workflow readiness.

CRM source: {{ $json.crmSource }}
CRM adapter pack ID: {{ $json.adapterPackId }}
Customer config ref: {{ $json.customerConfigRef }}
Field overrides: {{ JSON.stringify($json.fieldOverrides, null, 2) }}
Adapter pack manifest: {{ JSON.stringify($json.adapterPack, null, 2) }}
Canonical payload: {{ JSON.stringify($json.canonical, null, 2) }}
Raw record: {{ JSON.stringify($json.rawRecord, null, 2) }}

Return:
- fields that mapped correctly
- missing or ambiguous fields
- pack or field-override gaps
- risks for downstream Backstory workflows
- recommended fallback logic`,
    systemMessage:
      'You are a CRM schema normalization reviewer focused on reusable workflow payloads and adapter-pack driven mappings.',
    deliverBody:
      '={{ { source: $json.crmSource, adapterPackId: $json.adapterPackId, customerConfigRef: $json.customerConfigRef, canonical: $json.canonical, mappingQa: $json.output || $json.text || "" } }}',
  },
  '21-meeting-intelligence-normalizer': {
    description:
      'Normalizes meeting artifacts using a selected meeting-source adapter pack so Gong, Zoom, Teams, Otter, Fireflies, Fathom, and similar systems emit one canonical source_record payload.',
    params: [
      assignment('meetingSourceType', 'string', 'Gong'),
      assignment('sourceApiBaseUrl', 'string', 'https://meetings.example.com/api'),
      assignment('sourceApiToken', 'string', 'YOUR_SOURCE_API_TOKEN'),
      assignment('defaultMeetingAdapterPackId', 'string', 'meeting_source.gong.meeting-intelligence'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('outputWebhookUrl', 'string', 'https://your-meeting-event-bus.example.com'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const meetings = payload.meetings || payload.items || payload.records || [];
const params = $('Workflow Parameters').first().json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(customerConfig.selected_packs) ? customerConfig.selected_packs : [];
const adapterPackId = payload.meetingAdapterPackId || payload.adapterPackId || selectedPacks.find((pack) => pack.role === 'meeting_source')?.pack_id || params.defaultMeetingAdapterPackId;
const adapterPack = payload.meetingAdapterPack || payload.adapterPackManifest || {};
const fieldOverrides = payload.fieldOverrides || customerConfig.field_overrides?.meeting_source || {};
return meetings.map((meeting, index) => ({ json: {
  recordIndex: index + 1,
  sourceType: payload.meetingSourceType || params.meetingSourceType,
  adapterPackId,
  adapterPack,
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  fieldOverrides,
  canonical: {
    meetingTitle: meeting.title || meeting.subject || meeting.name || \`meeting-\${index + 1}\`,
    meetingStart: meeting.start || meeting.startTime || meeting.startedAt || '',
    accountName: meeting.accountName || meeting.crmAccount || meeting.company || '',
    attendees: meeting.attendees || meeting.participants || [],
    transcriptSummary: meeting.summary || meeting.transcriptSummary || meeting.snippet || '',
    actionItems: meeting.actionItems || meeting.tasks || [],
    sourceId: meeting.id || meeting.callId || meeting.eventId || \`meeting-\${index + 1}\`
  },
  rawMeeting: meeting
} }));`,
    prompt: `=Review this normalized meeting payload for downstream workflow readiness.

Meeting source: {{ $json.sourceType }}
Meeting adapter pack ID: {{ $json.adapterPackId }}
Customer config ref: {{ $json.customerConfigRef }}
Field overrides: {{ JSON.stringify($json.fieldOverrides, null, 2) }}
Adapter pack manifest: {{ JSON.stringify($json.adapterPack, null, 2) }}
Canonical payload: {{ JSON.stringify($json.canonical, null, 2) }}
Raw payload: {{ JSON.stringify($json.rawMeeting, null, 2) }}

Return:
- which signals mapped cleanly
- attendee or account-association gaps
- transcript quality risks
- pack or field-override gaps
- downstream implications for briefing or coaching workflows`,
    systemMessage:
      'You are a meeting intelligence normalization reviewer focused on reusable workflow payloads and adapter-pack driven mappings.',
    deliverBody:
      '={{ { source: $json.sourceType, adapterPackId: $json.adapterPackId, customerConfigRef: $json.customerConfigRef, canonical: $json.canonical, meetingQa: $json.output || $json.text || "" } }}',
  },
  '22-multi-channel-delivery-router': {
    description:
      'Receives a formatted workflow insight payload, applies customer routing defaults and the selected delivery adapter pack, and returns a destination-safe delivery recommendation.',
    params: [
      assignment('routingStoreUrl', 'string', 'https://routing.example.com/api'),
      assignment('defaultDestination', 'string', 'email'),
      assignment('defaultDeliveryAdapterPackId', 'string', 'delivery.slack.account-routing'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('fallbackWebhookUrl', 'string', 'https://hooks.slack.com/services/YOUR/WEBHOOK'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const params = $('Workflow Parameters').first().json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const routingDefaults = customerConfig.routing_defaults || {};
const selectedPacks = Array.isArray(customerConfig.selected_packs) ? customerConfig.selected_packs : [];
const adapterPackId = payload.deliveryAdapterPackId || payload.adapterPackId || selectedPacks.find((pack) => pack.role === 'delivery')?.pack_id || params.defaultDeliveryAdapterPackId;
const adapterPack = payload.deliveryAdapterPack || payload.adapterPackManifest || {};
const metadata = payload.routing || {};
const destinationAlias = metadata.preferredDestination || payload.delivery || routingDefaults.default_destination || '';
const destination = String(destinationAlias || params.defaultDestination).toLowerCase();
return [{ json: {
  accountName: payload.accountName || payload.account || customerConfig.customer?.name || 'Unknown Account',
  audience: payload.audience || 'internal-team',
  destination,
  destinationAlias,
  fallbackDestination: metadata.fallbackDestination || routingDefaults.summary_destination || params.defaultDestination,
  routingDefaults,
  adapterPackId,
  adapterPack,
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  selectedPackIds: selectedPacks.map((pack) => pack.pack_id).filter(Boolean),
  rawPayload: payload,
  fallbackWebhookUrl: params.fallbackWebhookUrl
} }];`,
    prompt: `=Adapt this workflow insight for the requested delivery surface.

Destination: {{ $json.destination }}
Destination alias: {{ $json.destinationAlias }}
Audience: {{ $json.audience }}
Customer config ref: {{ $json.customerConfigRef }}
Routing defaults: {{ JSON.stringify($json.routingDefaults, null, 2) }}
Delivery adapter pack ID: {{ $json.adapterPackId }}
Adapter pack manifest: {{ JSON.stringify($json.adapterPack, null, 2) }}
Payload: {{ JSON.stringify($json.rawPayload, null, 2) }}

Return:
- destination-safe message body
- any fallback destination if the preferred one fails
- notable formatting constraints for Slack, Teams, email, or webhook delivery
- any routing gaps caused by missing customer-config defaults or adapter-pack metadata`,
    systemMessage:
      'You are a delivery routing assistant that uses customer config and delivery adapter-pack metadata to keep workflow delivery reusable.',
    deliverBody:
      '={{ { accountName: $json.accountName, destination: $json.destination, adapterPackId: $json.adapterPackId, customerConfigRef: $json.customerConfigRef, routedPayload: $json.output || $json.text || "Routing required" } }}',
  },
  '23-identity-resolution-hub': {
    description:
      'Resolves people, accounts, owners, and messaging handles using a selected identity adapter pack so downstream workflows can trust one canonical identity layer.',
    params: [
      assignment('identityStoreUrl', 'string', 'https://identity.example.com/api'),
      assignment('autoMergeThreshold', 'number', 0.92),
      assignment('defaultIdentityAdapterPackId', 'string', 'identity.example.canonical-matching'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('ambiguityQueueUrl', 'string', 'https://review.example.com/identity-queue'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const items = payload.identities || payload.records || [payload];
const params = $('Workflow Parameters').first().json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(customerConfig.selected_packs) ? customerConfig.selected_packs : [];
const adapterPackId = payload.identityAdapterPackId || payload.adapterPackId || selectedPacks.find((pack) => pack.role === 'identity')?.pack_id || params.defaultIdentityAdapterPackId;
const adapterPack = payload.identityAdapterPack || payload.adapterPackManifest || {};
const matchHints = payload.matchHints || adapterPack.match_hints || {};
return items.map((item, index) => ({
  json: {
    candidateId: item.candidateId || \`candidate-\${index + 1}\`,
    displayName: item.displayName || item.name || 'Unknown Person',
    email: item.email || item.primaryEmail || '',
    domain: item.domain || (item.email ? String(item.email).split('@')[1] : ''),
    crmOwnerId: item.crmOwnerId || item.ownerId || '',
    channelHandle: item.channelHandle || item.slackUser || item.teamsUser || '',
    sourceSystem: item.sourceSystem || payload.sourceSystem || 'unknown',
    adapterPackId,
    adapterPack,
    matchHints,
    customerConfigRef: payload.customerConfigRef || payload.configRef || '',
    rawPayload: item,
    identityStoreUrl: params.identityStoreUrl,
    autoMergeThreshold: params.autoMergeThreshold,
    ambiguityQueueUrl: params.ambiguityQueueUrl
  }
}));`,
    prompt: `=Assess this identity candidate for canonical matching.

Candidate: {{ JSON.stringify($json.rawPayload, null, 2) }}
Identity adapter pack ID: {{ $json.adapterPackId }}
Customer config ref: {{ $json.customerConfigRef }}
Auto-merge threshold: {{ $json.autoMergeThreshold }}
Match hints: {{ JSON.stringify($json.matchHints, null, 2) }}
Adapter pack manifest: {{ JSON.stringify($json.adapterPack, null, 2) }}

Return:
- likely canonical person or account match
- whether the match is safe to auto-merge
- ambiguity risks and manual-review reasons
- downstream workflow impact if matched incorrectly
- any missing identity-layer rules that belong in the adapter pack or customer config`,
    systemMessage:
      'You are an identity resolution assistant that uses identity adapter packs and customer config to keep canonical matching reusable.',
    deliverBody:
      '={{ { candidateId: $json.candidateId, adapterPackId: $json.adapterPackId, customerConfigRef: $json.customerConfigRef, review: $json.output || $json.text || "Identity review required" } }}',
  },
  '24-workflow-contract-validator': {
    description:
      'Validates canonical payloads, selected adapter-pack outputs, and customer-config assumptions so schema drift is caught before downstream automations break.',
    params: [
      assignment('contractRegistryUrl', 'string', 'https://contracts.example.com/api'),
      assignment('defaultContractVersion', 'string', 'v1'),
      assignment('customerConfigSchemaPath', 'string', '/schemas/customer-stack-config.schema.json'),
      assignment('adapterPackSchemaPath', 'string', '/schemas/adapter-pack.schema.json'),
      assignment('quarantineWebhookUrl', 'string', 'https://queue.example.com/workflow-quarantine'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(payload.selectedPacks)
  ? payload.selectedPacks
  : Array.isArray(customerConfig.selected_packs)
    ? customerConfig.selected_packs
    : [];
const adapterPacks = Array.isArray(payload.adapterPacks)
  ? payload.adapterPacks
  : Array.isArray(payload.adapterPackManifests)
    ? payload.adapterPackManifests
    : [];
const expectedContracts = payload.expectedContracts || payload.producedContracts || [];
return [{ json: {
  workflowName: payload.workflowName || 'unknown-workflow',
  boundaryName: payload.boundaryName || payload.stepName || 'unknown-boundary',
  contractVersion: payload.contractVersion || $('Workflow Parameters').first().json.defaultContractVersion,
  records: payload.records || payload.payloads || [payload],
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  customerConfig,
  selectedPacks,
  selectedPackIds: selectedPacks.map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '').filter(Boolean),
  adapterPacks,
  expectedContracts,
  customerConfigSchemaPath: $('Workflow Parameters').first().json.customerConfigSchemaPath,
  adapterPackSchemaPath: $('Workflow Parameters').first().json.adapterPackSchemaPath,
  contractRegistryUrl: $('Workflow Parameters').first().json.contractRegistryUrl,
  quarantineWebhookUrl: $('Workflow Parameters').first().json.quarantineWebhookUrl
} }];`,
    prompt: `=Validate this workflow payload batch.

Workflow: {{ $json.workflowName }}
Boundary: {{ $json.boundaryName }}
Contract version: {{ $json.contractVersion }}
Customer config ref: {{ $json.customerConfigRef }}
Selected packs: {{ JSON.stringify($json.selectedPacks, null, 2) }}
Expected contracts: {{ JSON.stringify($json.expectedContracts, null, 2) }}
Adapter pack manifests: {{ JSON.stringify($json.adapterPacks, null, 2) }}
Records: {{ JSON.stringify($json.records, null, 2) }}

Return:
- required fields likely present vs missing
- drift, enum, or type mismatch risks
- whether the payload should pass or quarantine
- likely source of the mismatch
- whether the selected adapter packs or customer config imply a different contract shape`,
    systemMessage:
      'You are a workflow contract validation assistant that checks canonical payloads against customer config and adapter-pack expectations.',
    deliverBody:
      '={{ { workflowName: $json.workflowName, boundaryName: $json.boundaryName, contractVersion: $json.contractVersion, customerConfigRef: $json.customerConfigRef, selectedPackIds: $json.selectedPackIds || [], expectedContracts: $json.expectedContracts || [], review: $json.output || $json.text || "Validation required" } }}',
  },
  '25-implementation-gap-audit': {
    description:
      'Audits a customer stack against validated assets, selected adapter packs, and certification coverage to identify what exists today and what still needs productization work.',
    params: [
      assignment('backlogWebhookUrl', 'string', 'https://backlog.example.com/triage'),
      assignment('priorityModel', 'string', 'risk-x-repeatability'),
      assignment('supportedOrchestrators', 'string', 'n8n, Make, Power Automate, Zapier, Workato, custom code'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('certificationScriptRef', 'string', 'npm run certify:adaptation'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(payload.selectedPacks)
  ? payload.selectedPacks
  : Array.isArray(customerConfig.selected_packs)
    ? customerConfig.selected_packs
    : [];
const adapterPacks = Array.isArray(payload.adapterPacks)
  ? payload.adapterPacks
  : Array.isArray(payload.adapterPackManifests)
    ? payload.adapterPackManifests
    : [];
const selectedRoles = new Set(selectedPacks.map((pack) => typeof pack === 'string' ? '' : pack.role || ''));
return [{ json: {
  workflowGoal: payload.workflowGoal || payload.goal || 'Unknown workflow goal',
  requestedWorkflowId: payload.workflowId || customerConfig.implementation?.workflow_id || '',
  orchestrator: payload.orchestrator || payload.automationPlatform || customerConfig.implementation?.target_orchestrator || 'unknown',
  crm: payload.crm || 'unknown',
  meetingSource: payload.meetingSource || payload.noteTaker || 'unknown',
  delivery: payload.delivery || payload.deliverySurface || 'unknown',
  identityLayer: payload.identityLayer || 'unspecified',
  constraints: payload.constraints || [],
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  customerConfig,
  selectedPacks,
  selectedPackIds: selectedPacks.map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '').filter(Boolean),
  adapterPacks,
  certifiedScenarios: payload.certifiedScenarios || customerConfig.certification?.required_scenarios || [],
  missingPackRoles: (payload.requiredPackRoles || ['crm', 'delivery']).filter((role) => !selectedRoles.has(role)),
  backlogWebhookUrl: $('Workflow Parameters').first().json.backlogWebhookUrl,
  priorityModel: $('Workflow Parameters').first().json.priorityModel,
  supportedOrchestrators: $('Workflow Parameters').first().json.supportedOrchestrators,
  assetRegistryUrl: $('Workflow Parameters').first().json.assetRegistryUrl,
  certificationScriptRef: $('Workflow Parameters').first().json.certificationScriptRef
} }];`,
    prompt: `=Assess the implementation coverage of this workflow request.

Workflow goal: {{ $json.workflowGoal }}
Requested workflow ID: {{ $json.requestedWorkflowId }}
Orchestrator: {{ $json.orchestrator }}
CRM: {{ $json.crm }}
Meeting source: {{ $json.meetingSource }}
Delivery: {{ $json.delivery }}
Identity layer: {{ $json.identityLayer }}
Customer config ref: {{ $json.customerConfigRef }}
Selected packs: {{ JSON.stringify($json.selectedPacks, null, 2) }}
Adapter pack manifests: {{ JSON.stringify($json.adapterPacks, null, 2) }}
Certified scenarios: {{ JSON.stringify($json.certifiedScenarios) }}
Missing pack roles: {{ JSON.stringify($json.missingPackRoles) }}
Constraints: {{ JSON.stringify($json.constraints) }}

Return:
- what is likely validated already
- what is recipe-only vs generic-only
- missing adapters or contract layers
- certification or customer-config gaps
- backlog priority ordered by repeatability and rollout risk`,
    systemMessage:
      'You are an implementation gap analysis assistant that turns one-off requests into reusable productization backlogs using adapter-pack and customer-config assets.',
    deliverBody:
      '={{ { workflowGoal: $json.workflowGoal, requestedWorkflowId: $json.requestedWorkflowId, customerConfigRef: $json.customerConfigRef, selectedPackIds: $json.selectedPackIds || [], missingPackRoles: $json.missingPackRoles || [], analysis: $json.output || $json.text || "Assessment required" } }}',
  },
  '26-orchestrator-migration-planner': {
    description:
      'Creates a migration blueprint between orchestration platforms while preserving workflow order, state handling, payload contracts, and the selected customer adapter-pack plan.',
    params: [
      assignment('migrationRegistryUrl', 'string', 'https://migration.example.com/api'),
      assignment('defaultStrategy', 'string', 'phased-dual-run'),
      assignment('assetRegistryUrl', 'string', 'https://your-library.example.com'),
      assignment('certificationScriptRef', 'string', 'npm run certify:adaptation'),
      assignment('deliveryWebhookUrl', 'string', 'https://hooks.slack.com/services/YOUR/WEBHOOK'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(payload.selectedPacks)
  ? payload.selectedPacks
  : Array.isArray(customerConfig.selected_packs)
    ? customerConfig.selected_packs
    : [];
const adapterPacks = Array.isArray(payload.adapterPacks)
  ? payload.adapterPacks
  : Array.isArray(payload.adapterPackManifests)
    ? payload.adapterPackManifests
    : [];
return [{ json: {
  workflowFamily: payload.workflowFamily || payload.workflow || customerConfig.implementation?.workflow_id || 'Unknown Workflow',
  sourceOrchestrator: payload.sourceOrchestrator || payload.source || 'n8n',
  targetOrchestrator: payload.targetOrchestrator || payload.target || customerConfig.implementation?.target_orchestrator || 'power-automate',
  strategy: payload.strategy || $('Workflow Parameters').first().json.defaultStrategy,
  constraints: payload.constraints || [],
  sourceNotes: payload.sourceNotes || {},
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  customerConfig,
  selectedPacks,
  selectedPackIds: selectedPacks.map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '').filter(Boolean),
  adapterPacks,
  certifiedScenarios: payload.certifiedScenarios || customerConfig.certification?.required_scenarios || [],
  deliveryWebhookUrl: $('Workflow Parameters').first().json.deliveryWebhookUrl,
  migrationRegistryUrl: $('Workflow Parameters').first().json.migrationRegistryUrl,
  assetRegistryUrl: $('Workflow Parameters').first().json.assetRegistryUrl,
  certificationScriptRef: $('Workflow Parameters').first().json.certificationScriptRef
} }];`,
    prompt: `=Create an orchestrator migration plan.

Workflow family: {{ $json.workflowFamily }}
Source orchestrator: {{ $json.sourceOrchestrator }}
Target orchestrator: {{ $json.targetOrchestrator }}
Strategy: {{ $json.strategy }}
Customer config ref: {{ $json.customerConfigRef }}
Selected packs: {{ JSON.stringify($json.selectedPacks, null, 2) }}
Adapter pack manifests: {{ JSON.stringify($json.adapterPacks, null, 2) }}
Certified scenarios: {{ JSON.stringify($json.certifiedScenarios) }}
Constraints: {{ JSON.stringify($json.constraints) }}
Source notes: {{ JSON.stringify($json.sourceNotes, null, 2) }}

Return:
- step and node equivalents
- auth, retry, and state risks
- payload and scheduling migration notes
- impact on the customer config and adapter-pack plan
- phased cutover and rollback guidance`,
    systemMessage:
      'You are an orchestration migration assistant that preserves workflow behavior while honoring customer config and adapter-pack decisions.',
    deliverBody:
      '={{ { workflowFamily: $json.workflowFamily, sourceOrchestrator: $json.sourceOrchestrator, targetOrchestrator: $json.targetOrchestrator, customerConfigRef: $json.customerConfigRef, selectedPackIds: $json.selectedPackIds || [], plan: $json.output || $json.text || "Migration plan required" } }}',
  },
  '27-adapter-regression-monitor': {
    description:
      'Replays adapter-pack fixtures and customer-selected certification scenarios to report regressions before connector changes break reusable workflow patterns.',
    params: [
      assignment('goldenCaseStore', 'string', 'https://qa.example.com/golden-cases'),
      assignment('certificationScriptRef', 'string', 'npm run certify:adaptation'),
      assignment('severityThreshold', 'string', 'warn'),
      assignment('alertWebhookUrl', 'string', 'https://hooks.slack.com/services/YOUR/WEBHOOK'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(payload.selectedPacks)
  ? payload.selectedPacks
  : Array.isArray(customerConfig.selected_packs)
    ? customerConfig.selected_packs
    : [];
const adapterPack = payload.adapterPackManifest || (Array.isArray(payload.adapterPacks) ? payload.adapterPacks[0] : {}) || {};
const adapterPackId = payload.adapterPackId || adapterPack.pack_id || selectedPacks.find((pack) => pack.role === payload.adapterFamily)?.pack_id || '';
const scenarios = Array.isArray(payload.scenarios) && payload.scenarios.length
  ? payload.scenarios
  : Array.isArray(adapterPack.fixtures)
    ? adapterPack.fixtures.map((fixture) => ({ scenario: fixture.scenario, input: fixture.input, expected: fixture.expected }))
    : [];
return [{ json: {
  adapterFamily: payload.adapterFamily || adapterPack.family || 'unknown-adapter-family',
  adapters: payload.adapters || [],
  adapterPackId,
  adapterPack,
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  selectedPackIds: selectedPacks.map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '').filter(Boolean),
  releaseVersion: payload.releaseVersion || 'unversioned',
  scenarios,
  certifiedScenarios: payload.certifiedScenarios || customerConfig.certification?.required_scenarios || [],
  goldenCaseStore: $('Workflow Parameters').first().json.goldenCaseStore,
  certificationScriptRef: $('Workflow Parameters').first().json.certificationScriptRef,
  severityThreshold: $('Workflow Parameters').first().json.severityThreshold,
  alertWebhookUrl: $('Workflow Parameters').first().json.alertWebhookUrl
} }];`,
    prompt: `=Assess this adapter regression run.

Adapter family: {{ $json.adapterFamily }}
Adapter pack ID: {{ $json.adapterPackId }}
Customer config ref: {{ $json.customerConfigRef }}
Adapters: {{ JSON.stringify($json.adapters) }}
Release version: {{ $json.releaseVersion }}
Certification script: {{ $json.certificationScriptRef }}
Adapter pack manifest: {{ JSON.stringify($json.adapterPack, null, 2) }}
Scenarios: {{ JSON.stringify($json.scenarios, null, 2) }}
Certified scenarios: {{ JSON.stringify($json.certifiedScenarios) }}
Severity threshold: {{ $json.severityThreshold }}

Return:
- scenarios likely passing
- regressions or drift patterns
- likely root cause and blast radius
- replay and fix priority
- whether the adapter pack, fixtures, or customer config need to change`,
    systemMessage:
      'You are an adapter regression QA assistant that protects reusable workflow adapters using adapter-pack fixtures and customer certification scenarios.',
    deliverBody:
      '={{ { adapterFamily: $json.adapterFamily, adapterPackId: $json.adapterPackId, releaseVersion: $json.releaseVersion, customerConfigRef: $json.customerConfigRef, scenarioCount: Array.isArray($json.scenarios) ? $json.scenarios.length : 0, findings: $json.output || $json.text || "Regression review required" } }}',
  },
  '28-rollout-readiness-scorecard': {
    description:
      'Scores whether a customer stack, selected adapter packs, and certification coverage are actually ready for workflow deployment before launch.',
    params: [
      assignment('launchThreshold', 'number', 80),
      assignment('pilotThreshold', 'number', 60),
      assignment('minimumCertifiedScenarios', 'number', 3),
      assignment('deliveryWebhookUrl', 'string', 'https://hooks.slack.com/services/YOUR/WEBHOOK'),
    ],
    normalizeCode: `const payload = $json.body || $json;
const params = $('Workflow Parameters').first().json;
const customerConfig = payload.customerConfig || payload.stackConfig || {};
const selectedPacks = Array.isArray(payload.selectedPacks)
  ? payload.selectedPacks
  : Array.isArray(customerConfig.selected_packs)
    ? customerConfig.selected_packs
    : [];
const certification = payload.certification || customerConfig.certification || {};
const selectedRoles = new Set(selectedPacks.map((pack) => typeof pack === 'string' ? '' : pack.role || ''));
const requiredPackRoles = payload.requiredPackRoles || ['crm', 'delivery'];
const certifiedScenarios = payload.certifiedScenarios || certification.required_scenarios || [];
return [{ json: {
  workflowFamily: payload.workflowFamily || payload.workflow || customerConfig.implementation?.workflow_id || 'Unknown Workflow',
  crm: payload.crm || 'unknown',
  meetingSource: payload.meetingSource || payload.noteTaker || 'unknown',
  delivery: payload.delivery || 'unknown',
  identityLayer: payload.identityLayer || 'unspecified',
  securityStatus: payload.securityStatus || 'unknown',
  operationalOwner: payload.operationalOwner || customerConfig.customer?.owner_email || 'unassigned',
  blockers: payload.blockers || [],
  customerConfigRef: payload.customerConfigRef || payload.configRef || '',
  customerConfig,
  selectedPackIds: selectedPacks.map((pack) => typeof pack === 'string' ? pack : pack.pack_id || pack.packId || '').filter(Boolean),
  requiredPackRoles,
  missingPackRoles: requiredPackRoles.filter((role) => !selectedRoles.has(role)),
  certifiedScenarios,
  minimumCertifiedScenarios: params.minimumCertifiedScenarios,
  launchThreshold: params.launchThreshold,
  pilotThreshold: params.pilotThreshold,
  deliveryWebhookUrl: params.deliveryWebhookUrl
} }];`,
    prompt: `=Create a rollout readiness scorecard.

Workflow family: {{ $json.workflowFamily }}
CRM: {{ $json.crm }}
Meeting source: {{ $json.meetingSource }}
Delivery: {{ $json.delivery }}
Identity layer: {{ $json.identityLayer }}
Security status: {{ $json.securityStatus }}
Operational owner: {{ $json.operationalOwner }}
Customer config ref: {{ $json.customerConfigRef }}
Selected pack IDs: {{ JSON.stringify($json.selectedPackIds) }}
Required pack roles: {{ JSON.stringify($json.requiredPackRoles) }}
Missing pack roles: {{ JSON.stringify($json.missingPackRoles) }}
Certified scenarios: {{ JSON.stringify($json.certifiedScenarios) }}
Minimum certified scenarios: {{ $json.minimumCertifiedScenarios }}
Blockers: {{ JSON.stringify($json.blockers) }}
Pilot threshold: {{ $json.pilotThreshold }}
Launch threshold: {{ $json.launchThreshold }}

Return:
- readiness score and recommendation
- passed prerequisites and blockers
- manual work remaining
- whether adapter-pack coverage and certification are sufficient
- pilot, launch, and monitoring checkpoints`,
    systemMessage:
      'You are a rollout readiness assessment assistant that decides whether a workflow can safely pilot or launch using customer config and adapter-pack coverage.',
    deliverBody:
      '={{ { workflowFamily: $json.workflowFamily, customerConfigRef: $json.customerConfigRef, selectedPackIds: $json.selectedPackIds || [], missingPackRoles: $json.missingPackRoles || [], certifiedScenarioCount: Array.isArray($json.certifiedScenarios) ? $json.certifiedScenarios.length : 0, readiness: $json.output || $json.text || "Readiness assessment required" } }}',
  },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function findNode(workflow, id) {
  const node = workflow.nodes.find((entry) => entry.id === id);
  if (!node) {
    throw new Error(`Node ${id} not found in ${workflow.id || workflow.name}`);
  }
  return node;
}

function setAssignments(node, assignments) {
  node.parameters ??= {};
  node.parameters.assignments = { assignments };
  node.parameters.options ??= {};
}

function applyUpdate(workflow, update) {
  workflow.description = update.description;

  const paramsNode = workflow.nodes.find((node) => /^params-/.test(node.id));
  const promptNode = workflow.nodes.find((node) => node.type === '@n8n/n8n-nodes-langchain.agent');
  const normalizeNode = workflow.nodes.find((node) => /^normalize-/.test(node.id) || /^resolve-/.test(node.id) || /^extract-/.test(node.id));
  const deliverNode =
    workflow.nodes.find((node) => /^deliver-/.test(node.id)) ||
    workflow.nodes.find((node) => /^publish-/.test(node.id)) ||
    workflow.nodes.find((node) => /^quarantine-/.test(node.id));

  if (!paramsNode || !promptNode || !normalizeNode || !deliverNode) {
    throw new Error(`Workflow ${workflow.id || workflow.name} missing one of params/prompt/normalize/deliver nodes`);
  }

  setAssignments(paramsNode, update.params);
  normalizeNode.parameters.jsCode = update.normalizeCode;
  promptNode.parameters.text = update.prompt;
  promptNode.parameters.options ??= {};
  promptNode.parameters.options.systemMessage = update.systemMessage;
  deliverNode.parameters.jsonBody = update.deliverBody;

  if (update.extraCodeNodeId && update.extraCode) {
    findNode(workflow, update.extraCodeNodeId).parameters.jsCode = update.extraCode;
  }
}

let updatedCount = 0;

for (const workflowDir of workflowDirs) {
  const update = workflowUpdates[workflowDir];
  if (!update) continue;

  for (const fileName of ['full.json', 'starter.json']) {
    const filePath = path.join(repoRoot, workflowDir, fileName);
    const workflow = readJson(filePath);
    applyUpdate(workflow, update);
    writeJson(filePath, workflow);
    updatedCount += 1;
  }
}

console.log(JSON.stringify({ ok: true, updatedCount }, null, 2));
