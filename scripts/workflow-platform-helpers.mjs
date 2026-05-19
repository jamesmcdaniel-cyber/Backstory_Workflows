export const TEMPLATE_VERSION = '2026-05-16';
export const PLATFORM_CONTRACTS = ['run_context', 'source_record', 'enrichment_context', 'delivery_payload'];

const WORKATO_REFERENCES = [
  { label: 'Recipe lifecycle management', url: 'https://docs.workato.com/en/recipe-development-lifecycle.html' },
  { label: 'Importing packages', url: 'https://docs.workato.com/en/recipe-development-lifecycle/import.html' },
  { label: 'Recipe function by Workato', url: 'https://docs.workato.com/connectors/recipe-functions.html' },
  { label: 'Using the Workato Connector SDK', url: 'https://docs.workato.com/en/developing-connectors/sdk/quickstart/quickstart.html' },
  { label: 'Slack connector', url: 'https://docs.workato.com/connectors/slack.html' },
  { label: 'Google Calendar connector', url: 'https://docs.workato.com/en/connectors/google-calendar.html' },
];

const ZAPIER_REFERENCES = [
  { label: 'Zap templates restrictions', url: 'https://docs.zapier.com/integrations/publish/zap-templates' },
  { label: 'Known limitations for workflow creation', url: 'https://docs.zapier.com/powered-by-zapier/zap-creation/known-limitations' },
  { label: 'Build with CLI', url: 'https://docs.zapier.com/integrations/build-cli/overview' },
  { label: 'Zapier action design', url: 'https://docs.zapier.com/integrations/build/action' },
  { label: 'Add a create action', url: 'https://docs.zapier.com/integrations/build/create' },
  { label: 'AI actions', url: 'https://docs.zapier.com/integrations/reference/ai-actions' },
  { label: 'Custom actions and API requests actions', url: 'https://docs.zapier.com/integrations/reference/custom-actions-api-requests' },
];

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const slugify = (value) =>
  String(value || 'workflow')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'workflow';

const toSentence = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const firstSentence = (value) => {
  const normalized = toSentence(value);
  if (!normalized) return '';
  const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1] : normalized;
};

const buildWorkflowBlob = (workflow) =>
  [
    workflow.id,
    workflow.name,
    workflow.description,
    workflow.trigger,
    workflow.output,
    ...(workflow.credentials || []),
    ...(workflow.configuration || []),
    ...(workflow.node_flow || []).flatMap((step) => [step.name, step.description, step.type]),
  ]
    .filter(Boolean)
    .join('\n');

export function inferWorkflowCapabilities(workflow) {
  const blob = buildWorkflowBlob(workflow).toLowerCase();
  const credentialBlob = (workflow.credentials || []).join('\n').toLowerCase();
  const stepBlob = (workflow.node_flow || [])
    .flatMap((step) => [step.name, step.description, step.type])
    .filter(Boolean)
    .join('\n')
    .toLowerCase();
  const descriptionBlob = [workflow.description, workflow.output].filter(Boolean).join('\n').toLowerCase();
  const triggerText = String(workflow.trigger || '').toLowerCase();

  return {
    backstory:
      /backstory/.test(credentialBlob) ||
      /backstory/.test(stepBlob) ||
      /via backstory|from backstory|calls backstory|queries backstory|backstory mcp/.test(descriptionBlob),
    llm: /llm|ai|anthropic|openai|gemini|claude/.test(blob) || (workflow.node_flow || []).some((step) => step.type === 'ai'),
    slack: /\bslack\b/.test(blob),
    teams: /\bteams\b|microsoft teams/.test(blob),
    email:
      /\bemail\b|\bsmtp\b|\bgmail\b|\boutlook\b|\bimap\b/.test(credentialBlob) ||
      /\bemail\b|\bsmtp\b|\bgmail\b|\boutlook\b|\bimap\b/.test(stepBlob) ||
      /email delivery|deliver(?:s|ed)? .*email|email fetch|inbox|gmail|outlook|imap|smtp/.test(descriptionBlob),
    smtp: /\bsmtp\b/.test(blob),
    googleCalendar: /google calendar/.test(blob),
    outlookCalendar: /outlook/.test(blob) && /calendar/.test(blob),
    calendar: /calendar/.test(blob),
    crm: /salesforce|hubspot|dynamics|crm\s*(?:\(|api|record|records|deal|opportun|pipeline|account|webhook|mql|data|access)/.test(blob),
    jira: /\bjira\b/.test(blob),
    asana: /\basana\b/.test(blob),
    linear: /\blinear\b/.test(blob),
    airtable: /\bairtable\b/.test(blob),
    supabase: /\bsupabase\b/.test(blob),
    meetingSource: /gong|zoom|otter|fireflies|fathom|meeting|transcript/.test(blob),
    messagingGeneric: /messaging/.test(blob),
    store: /store|database|warehouse|queue|registry|table|tables|dedupe|mapping|lookup/.test(blob),
    sink: /event sink|queue|database|warehouse|downstream workflow|downstream orchestrator|publish destination|quarantine sink|webhook sink/.test(
      blob,
    ),
    webhook: /webhook/.test(triggerText),
    schedule: /schedule/.test(triggerText),
    subworkflow: /sub-workflow|subworkflow/.test(triggerText),
    manual: /manual|slash command|command|intake|button|form/.test(blob),
  };
}

const buildDeliveryTargets = (capabilities) =>
  unique([
    capabilities.slack ? 'Slack channel or direct message' : '',
    capabilities.teams ? 'Microsoft Teams channel or chat' : '',
    capabilities.email ? 'Email delivery' : '',
    capabilities.calendar ? 'Calendar event or task' : '',
    capabilities.jira ? 'Jira issue or project item' : '',
    capabilities.asana ? 'Asana task' : '',
    capabilities.linear ? 'Linear issue' : '',
    capabilities.sink ? 'Webhook, queue, database, or downstream workflow sink' : '',
  ]);

const inferSourceLabel = (step, capabilities) => {
  const blob = `${step.name} ${step.description}`.toLowerCase();
  if (/backstory/.test(blob) && capabilities.backstory) return 'Backstory custom connector action';
  if (/crm|salesforce|hubspot|dynamics|pipeline|opportunit/.test(blob) && capabilities.crm) return 'CRM connector action';
  if (/email|gmail|outlook|imap|inbox/.test(blob) && capabilities.email) return 'email connector action';
  if (/calendar/.test(blob) && capabilities.calendar) return 'calendar connector action';
  if (/meeting|transcript|gong|zoom|otter|fireflies|fathom/.test(blob) && capabilities.meetingSource) {
    return 'meeting-system connector action';
  }
  if (/store|config|mapping|lookup|registry|table|warehouse|database|queue/.test(blob) && capabilities.store) {
    return 'native data-store lookup';
  }
  if (capabilities.backstory) return 'Backstory custom connector action';
  if (capabilities.crm) return 'CRM connector action';
  return 'native connector action';
};

const inferOutputLabel = (step, capabilities, platform) => {
  const blob = `${step.name} ${step.description}`.toLowerCase();
  const teamLabel = platform === 'workato' ? 'Microsoft Teams connector' : 'Microsoft Teams app action';
  const slackLabel = platform === 'workato' ? 'Slack connector' : 'Slack app action';
  const emailLabel =
    platform === 'workato'
      ? 'Gmail, Outlook, or SMTP connector'
      : 'Gmail, Outlook, or Email by Zapier action';
  const calendarLabel =
    platform === 'workato'
      ? 'Google Calendar or Microsoft 365 Calendar connector'
      : 'Google Calendar or Microsoft Outlook Calendar action';

  if (/calendar/.test(blob) && capabilities.calendar) return `${calendarLabel} for ${step.name}`;
  if (/queue|webhook|database|warehouse|publish|sink|orchestrator/.test(blob) && capabilities.sink) {
    return `${
      platform === 'workato'
        ? 'database, queue, webhook, or downstream app connector'
        : 'database, queue, webhook, or downstream app action'
    } for ${step.name}`;
  }
  if (/email|smtp/.test(blob) && capabilities.email) return `${emailLabel} for ${step.name}`;
  if (/teams/.test(blob) && capabilities.teams) return `${teamLabel} for ${step.name}`;
  if (/slack|channel|message|dm|messaging|alert|digest|brief|deliver|route/.test(blob) && capabilities.slack) {
    return `${slackLabel} for ${step.name}`;
  }
  if (capabilities.teams && capabilities.messagingGeneric) return `${teamLabel} for ${step.name}`;
  if (capabilities.email) return `${emailLabel} for ${step.name}`;
  if (capabilities.slack) return `${slackLabel} for ${step.name}`;
  if (capabilities.jira) return `${platform === 'workato' ? 'Jira connector' : 'Jira app action'} for ${step.name}`;
  if (capabilities.asana) return `${platform === 'workato' ? 'Asana connector' : 'Asana app action'} for ${step.name}`;
  if (capabilities.linear) {
    return `${platform === 'workato' ? 'Linear custom connector or approved connector' : 'Linear app action'} for ${step.name}`;
  }
  return `${platform === 'workato' ? 'native connector' : 'native app action'} for ${step.name}`;
};

const buildWorkatoConnectorRequirements = (capabilities) =>
  unique([
    capabilities.backstory ? 'Backstory custom connector built with the Connector SDK' : '',
    capabilities.crm ? 'Salesforce, HubSpot, or Dynamics connector for CRM reads and writes' : '',
    capabilities.slack ? 'Slack connector or Workbot for Slack for channel and DM delivery' : '',
    capabilities.teams ? 'Microsoft Teams connector or Workbot for Microsoft Teams' : '',
    capabilities.smtp
      ? 'SMTP-compatible email connector for outbound delivery'
      : capabilities.email
        ? 'Gmail, Microsoft Outlook, or approved email connector for message delivery'
        : '',
    capabilities.googleCalendar
      ? 'Google Calendar connector for event and task creation'
      : capabilities.outlookCalendar
        ? 'Microsoft 365 Calendar connector for event and task creation'
        : capabilities.calendar
          ? 'Google Calendar or Microsoft 365 Calendar connector for event and task creation'
          : '',
    capabilities.jira ? 'Jira connector for work-management routing' : '',
    capabilities.asana ? 'Asana connector for task routing' : '',
    capabilities.linear ? 'Linear connector or approved custom connector for issue routing' : '',
    capabilities.meetingSource ? 'Meeting-system connector or approved custom connector for transcript intake' : '',
    capabilities.store ? 'Lookup tables, data tables, or project properties for routing and canonical maps' : '',
    capabilities.sink ? 'Webhook connector, database connector, queue adapter, or downstream orchestrator action' : '',
  ]);

const buildZapierConnectorRequirements = (capabilities) =>
  unique([
    capabilities.backstory ? 'Published Backstory custom Zapier app with explicit search and create actions' : '',
    capabilities.crm ? 'Native Salesforce, HubSpot, or Dynamics app triggers and actions' : '',
    capabilities.slack ? 'Slack app actions for channel posts and direct messages' : '',
    capabilities.teams ? 'Microsoft Teams app actions or companion Microsoft 365 app steps' : '',
    capabilities.smtp
      ? 'SMTP-capable email action or a native Gmail/Outlook delivery app'
      : capabilities.email
        ? 'Gmail, Microsoft Outlook, or Email by Zapier actions'
        : '',
    capabilities.googleCalendar
      ? 'Google Calendar app actions for event and task creation'
      : capabilities.outlookCalendar
        ? 'Microsoft Outlook Calendar actions for event creation'
        : capabilities.calendar
          ? 'Google Calendar or Microsoft Outlook Calendar actions'
          : '',
    capabilities.jira ? 'Jira app actions for backlog updates' : '',
    capabilities.asana ? 'Asana app actions for task routing' : '',
    capabilities.linear ? 'Linear app actions for issue routing' : '',
    capabilities.meetingSource ? 'Meeting-system native app or published custom Zapier app for transcript retrieval' : '',
    capabilities.store ? 'Zapier Tables or Storage for state, routing maps, and dedupe keys' : '',
    capabilities.sink ? 'Approved webhook sink, database action, queue adapter, or downstream custom app action for publication' : '',
  ]);

const classifyTrigger = (workflow, capabilities, platform) => {
  if (capabilities.schedule) return platform === 'workato' ? 'Scheduler by Workato' : 'Schedule by Zapier';
  if (capabilities.subworkflow) {
    return platform === 'workato'
      ? 'Callable recipe or Recipe Function invocation from a parent orchestrator'
      : 'Sub-Zap orchestration via Zapier Tables, Interfaces, or a parent app trigger';
  }
  if (capabilities.webhook && capabilities.crm) {
    return platform === 'workato'
      ? 'Native CRM event trigger or API Platform endpoint'
      : 'Native CRM app trigger or private custom Zapier app trigger';
  }
  if (capabilities.webhook) {
    return platform === 'workato'
      ? 'API Platform endpoint or native app event trigger'
      : 'Private custom Zapier app trigger or internal Catch Hook rollout path';
  }
  if (capabilities.manual) {
    return platform === 'workato'
      ? 'Workbot command, API Platform endpoint, or intake form trigger'
      : 'Zapier Interfaces form/button, native app trigger, or private custom app trigger';
  }
  return platform === 'workato' ? 'Native app event trigger' : 'Native app trigger';
};

const buildAiContractMap = (workflow) => {
  const aiSteps = (workflow.node_flow || []).filter((step) => step.type === 'ai');
  if (aiSteps.length === 0) return {};

  const contracts = {};
  for (const step of aiSteps) {
    contracts[slugify(step.name)] = {
      required_keys: ['title', 'summary', 'confidence', 'recommended_actions', 'source_refs'],
      output_mode: 'json_only',
      intent: toSentence(step.description) || `Structured output for ${step.name}`,
    };
  }
  return contracts;
};

const buildWorkatoRecipeFunctions = (workflow, capabilities) => {
  const dataSteps = (workflow.node_flow || []).filter((step) => step.type === 'data');
  const outputSteps = (workflow.node_flow || []).filter((step) => step.type === 'output');
  const functions = [
    {
      key: 'normalize_run_context',
      purpose: `Normalize the ${workflow.name} trigger into the shared run_context contract.`,
      inputs: ['trigger_payload', 'workflow defaults'],
      outputs: ['run_context'],
      native_features: ['Recipe function by Workato', 'Formula mode', 'Variables'],
    },
    {
      key: 'load_source_records',
      purpose: `Load and normalize the primary ${workflow.name} business inputs into source_record objects.`,
      inputs: ['run_context'],
      outputs: ['source_record[]'],
      native_features: unique([
        'Recipe function by Workato',
        capabilities.backstory ? 'Backstory custom connector action' : '',
        capabilities.crm ? 'CRM connector action' : '',
        capabilities.meetingSource ? 'Meeting-system connector action' : '',
        capabilities.store ? 'Lookup tables or data tables' : '',
      ]),
    },
  ];

  if (dataSteps.length > 1 || capabilities.store || capabilities.crm) {
    functions.push({
      key: 'assemble_business_context',
      purpose: `Join the intermediate context needed for ${workflow.name}, especially ${dataSteps.map((step) => step.name).slice(0, 3).join(', ') || 'source inputs'}.`,
      inputs: ['source_record[]', 'run_context'],
      outputs: ['source_record[]', 'enrichment_context candidates'],
      native_features: unique(['Lists', 'Object actions', capabilities.store ? 'Data tables' : 'Recipe data pills']),
    });
  }

  if (outputSteps.length > 0) {
    functions.push({
      key: 'render_delivery_payload',
      purpose: `Render normalized delivery_payload objects for ${workflow.name}.`,
      inputs: ['structured_ai_json', 'source_record', 'run_context'],
      outputs: ['delivery_payload'],
      native_features: ['Recipe function by Workato', 'Object construction', 'Formula mode'],
    });
  }

  if (outputSteps.length > 1 || capabilities.store) {
    functions.push({
      key: 'record_run_summary',
      purpose: `Capture deterministic summary, dedupe, and retry state for ${workflow.name}.`,
      inputs: ['run_context', 'delivery results'],
      outputs: ['execution summary'],
      native_features: unique(['Variables', capabilities.store ? 'Data tables' : 'Job report metadata']),
    });
  }

  return functions;
};

const buildWorkatoSteps = (workflow, capabilities) => {
  const steps = ['Call normalize_run_context'];

  for (const step of workflow.node_flow || []) {
    if (step.type === 'data') {
      steps.push(`Use ${inferSourceLabel(step, capabilities)} for ${step.name}`);
      continue;
    }
    if (step.type === 'ai') {
      steps.push(`Use an LLM connector or AI step to return strict JSON for ${step.name}`);
      continue;
    }
    if (step.type === 'output') {
      steps.push(`Use ${inferOutputLabel(step, capabilities, 'workato')}`);
    }
  }

  if (steps[steps.length - 1] !== 'Record deterministic run summary and retry state') {
    steps.push('Record deterministic run summary and retry state');
  }

  return steps;
};

const buildZapierSteps = (workflow, capabilities) => {
  const steps = [];
  for (const step of workflow.node_flow || []) {
    if (step.type === 'data') {
      const label = inferSourceLabel(step, capabilities);
      if (label.includes('Backstory')) {
        steps.push(`Backstory custom Zapier app action: ${slugify(step.name)}`);
      } else {
        steps.push(`Native app step: ${step.name}`);
      }
      continue;
    }
    if (step.type === 'ai') {
      steps.push(`AI step backed by a native LLM app returning strict JSON for ${step.name}`);
      continue;
    }
    if (step.type === 'output') {
      steps.push(`Native delivery step: ${inferOutputLabel(step, capabilities, 'zapier')}`);
    }
  }
  return steps;
};

const formatBullets = (items) => unique(items).map((item) => `- ${item}`).join('\n');
const formatNumbered = (items) => unique(items).map((item, index) => `${index + 1}. ${item}`).join('\n');
const formatReferences = (items) => items.map((item) => `- [${item.label}](${item.url})`).join('\n');
const formatContracts = () =>
  [
    '- `run_context`: workflow-level execution context such as trigger, mode, lookback, delivery mode, and dry-run state.',
    '- `source_record`: normalized business record from the source adapter or source-system action layer.',
    '- `enrichment_context`: MCP or native app enrichment results used only during synthesis.',
    '- `delivery_payload`: deterministic delivery fields for the final native connector or app action.',
  ].join('\n');
const formatAiContracts = (contracts) => {
  const entries = Object.entries(contracts);
  if (!entries.length) return '- This workflow does not require a separate AI contract beyond the normalized source and delivery payloads.';
  return entries
    .map(
      ([key, value]) =>
        `- \`${key}\`: return JSON only with keys ${value.required_keys.map((item) => `\`${item}\``).join(', ')}. Intent: ${value.intent}`,
    )
    .join('\n');
};

export function buildWorkatoGuide(workflow) {
  const capabilities = inferWorkflowCapabilities(workflow);
  const deliveryTargets = buildDeliveryTargets(capabilities);
  const recipeFunctions = buildWorkatoRecipeFunctions(workflow, capabilities);
  const recipeSteps = buildWorkatoSteps(workflow, capabilities);
  const aiContracts = buildAiContractMap(workflow);
  const nativeConnectors = buildWorkatoConnectorRequirements(capabilities);
  const validationChecklist = [
    'No repeated Universal HTTP or custom-action sprawl for Slack, calendar, CRM, or email delivery when a native connector exists.',
    'All secrets live in connections, environment properties, or project properties rather than formula literals.',
    'LLM or agent output is validated as structured JSON before any delivery or persistence step runs.',
    'Recipe Functions, lookup tables, and data tables own reuse, routing, and dedupe instead of large inline scripts.',
    'If this build is moved between workspaces, export and import it as a Workato package `.zip`, then reconnect placeholder connections in the target workspace.',
  ];

  return `
# ${workflow.name} — Workato Implementation Guide

This file is a plain-English implementation guide. It is not an importable JSON artifact.

Workato moves reusable automation between workspaces as recipe packages, and package import uses a \`.zip\` file in Recipe Lifecycle Management. Imported connections arrive as placeholders and must be authenticated in the destination workspace. Build this workflow in Workato as recipes, recipe functions, connectors, properties, and tables, then export/import the package when you need to promote it between environments.

## Workflow Summary

- Workflow ID: \`${workflow.id}\`
- Category: ${workflow.category || 'uncategorized'}
- Source trigger in this catalog: ${toSentence(workflow.trigger || 'Not specified')}
- Recommended Workato trigger surface: ${classifyTrigger(workflow, capabilities, 'workato')}
- Delivery targets: ${deliveryTargets.length ? deliveryTargets.join(', ') : 'No end-user delivery surface; publish to a sink or downstream workflow.'}

## What To Create In Workato

${formatBullets(nativeConnectors)}

## Build Order

${formatNumbered([
  'Create or choose the target project and folder where this workflow will live.',
  capabilities.backstory
    ? 'Build or install the Backstory custom connector in Connector SDK. If you have an OpenAPI 3.0 definition, Workato supports using that as a starting point in the Connector SDK.'
    : 'Confirm the native source-system connectors needed by this workflow are installed and authenticated.',
  ...recipeFunctions.map((fn) => `Create the Recipe Function \`${fn.key}\` so reusable logic is not trapped inside one large recipe.`),
  `Build the primary recipe \`${slugify(workflow.id)}_primary_recipe\` with the trigger surface ${classifyTrigger(workflow, capabilities, 'workato')}.`,
  'Store routing defaults, destination IDs, and mode switches in connections, environment properties, project properties, lookup tables, or data tables.',
  'Test the recipe and each function with representative payloads, then export the project as a Workato package `.zip` if you need to move it to QA or production.',
])}

## Recipe Functions To Create

${formatBullets(
  recipeFunctions.map(
    (fn) =>
      `\`${fn.key}\`: ${fn.purpose} Inputs: ${fn.inputs.join(', ')}. Outputs: ${fn.outputs.join(', ')}. Native features: ${fn.native_features.join(', ')}.`,
  ),
)}

## Primary Recipe Outline

${formatNumbered(recipeSteps)}

## Contracts To Preserve

${formatContracts()}

## Structured AI Requirements

${formatAiContracts(aiContracts)}

## Validation Checklist

${formatBullets(validationChecklist)}

## Official References

${formatReferences(WORKATO_REFERENCES)}
`;
}

export function buildZapierGuide(workflow) {
  const capabilities = inferWorkflowCapabilities(workflow);
  const deliveryTargets = buildDeliveryTargets(capabilities);
  const nativeAppsRequired = buildZapierConnectorRequirements(capabilities);
  const needsBundle = deliveryTargets.length > 1 || capabilities.subworkflow || capabilities.store;
  const aiContracts = buildAiContractMap(workflow);

  const blueprintBundle = [
    {
      key: `${slugify(workflow.id)}_primary_zap`,
      trigger: classifyTrigger(workflow, capabilities, 'zapier'),
      native_steps: buildZapierSteps(workflow, capabilities),
      notes: needsBundle
        ? 'Keep the primary Zap focused on normalization, source access, and structured synthesis. Route secondary fan-out through additional native Zaps when template restrictions or retry requirements demand decomposition.'
        : 'This Zap stays native-first and should rely on published app actions rather than ad hoc API requests.',
    },
  ];

  if (needsBundle) {
    blueprintBundle.push({
      key: `${slugify(workflow.id)}_delivery_or_followup_zap`,
      trigger: 'Zapier Tables state change, Interfaces action, or an upstream custom app event',
      native_steps: unique([
        deliveryTargets.length > 0 ? 'Read delivery_payload and target metadata from structured fields' : '',
        capabilities.slack ? 'Slack app action: Send Channel Message or Send Direct Message' : '',
        capabilities.teams ? 'Microsoft Teams app action or Microsoft 365 companion action' : '',
        capabilities.email ? 'Gmail, Outlook, or Email by Zapier action' : '',
        capabilities.calendar ? 'Google Calendar or Microsoft Outlook Calendar action' : '',
        capabilities.jira ? 'Jira app action' : '',
        capabilities.asana ? 'Asana app action' : '',
        capabilities.linear ? 'Linear app action' : '',
        capabilities.sink ? 'Approved webhook sink, database action, queue adapter, or downstream custom app action' : '',
      ]),
      notes: 'Use this secondary Zap when you need reusable delivery fan-out, fallback paths, or approval boundaries without falling back to Webhooks or Code steps.',
    });
  }

  const customAppActions = unique([
    capabilities.backstory ? 'backstory_list_source_records' : '',
    capabilities.backstory ? 'backstory_get_record_context' : '',
    capabilities.backstory ? 'backstory_publish_run_summary' : '',
    capabilities.meetingSource ? 'meeting_source_fetch_artifact' : '',
    capabilities.store ? 'load_routing_map' : '',
  ]);
  const validationChecklist = [
    'Do not treat this guide as an importable JSON workflow; build the workflow as one or more Zaps and, if needed, a custom Zapier app.',
    'If you want a reusable public Zap Template, only public integrations can be used in the template.',
    'Do not include Code, custom Webhook, or custom Formatter steps in a public Zap Template.',
    'If you are creating workflows through Zapier workflow-creation APIs, use Public Apps only and avoid Paths because they are not currently supported there.',
    'Validate structured AI output before any Slack, Teams, email, calendar, Jira, or sink action runs.',
  ];

  return `
# ${workflow.name} — Zapier Implementation Guide

This file is a plain-English implementation guide. It is not an importable JSON artifact.

Zapier does not accept a reusable “upload this workflow JSON” format for the kind of cross-workspace assets this catalog is describing. To replicate this workflow in Zapier, build it as one or more Zaps plus, when needed, a custom Zapier app. If you want a reusable public Zap Template, every integration in the template must be a public integration, and Zapier rejects templates that include Code, custom Webhook, or custom Formatter steps. If you are creating workflows through Zapier workflow-creation APIs, use Public Apps because private apps are not supported there.

## Workflow Summary

- Workflow ID: \`${workflow.id}\`
- Category: ${workflow.category || 'uncategorized'}
- Source trigger in this catalog: ${toSentence(workflow.trigger || 'Not specified')}
- Recommended Zapier trigger surface: ${classifyTrigger(workflow, capabilities, 'zapier')}
- Delivery targets: ${deliveryTargets.length ? deliveryTargets.join(', ') : 'No end-user delivery surface; publish to a sink or downstream workflow.'}

## What To Build In Zapier

${formatBullets(nativeAppsRequired)}

## Recommended Implementation Shape

${formatNumbered([
  capabilities.backstory
    ? 'Publish the Backstory integration as a custom Zapier app before you try to templatize the workflow. Use the Zapier Platform UI or CLI if you need custom triggers or actions.'
    : 'Confirm the required public or workspace-native Zapier apps are available before you build the workflow.',
  'Create the primary Zap with the trigger and the minimum deterministic steps needed to gather source data and reach structured synthesis.',
  needsBundle
    ? 'Split delivery, approvals, or fan-out into additional Zaps when the workflow naturally decomposes or when public-template restrictions would block a single-Zap design.'
    : 'Keep the workflow in one Zap if the trigger, source access, and delivery can stay within Zapier’s supported template and app boundaries.',
  capabilities.store
    ? 'Use Zapier Tables or Storage for routing maps, dedupe keys, approval state, or cross-Zap handoff instead of hiding state in code.'
    : 'Keep routing and field mapping explicit in native steps rather than burying them in ad hoc code.',
  'If you plan to publish a public Zap Template, test the template path separately from any internal/private workspace build.',
])}

## Custom App Actions To Provide

${formatBullets(
  customAppActions.length
    ? customAppActions.map((action) => `\`${action}\``)
    : ['This workflow can be built from existing public or workspace-native apps without adding a custom app action.'],
)}

## Zaps To Create

${formatBullets(
  blueprintBundle.map(
    (bundle) =>
      `\`${bundle.key}\` — Trigger: ${bundle.trigger}. Native steps: ${bundle.native_steps.join(' -> ')}. Notes: ${bundle.notes}`,
  ),
)}

## Contracts To Preserve

${formatContracts()}

## Structured AI Requirements

${formatAiContracts(aiContracts)}

## Validation Checklist

${formatBullets(validationChecklist)}

## Official References

${formatReferences(ZAPIER_REFERENCES)}
`;
}
