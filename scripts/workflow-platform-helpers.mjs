export const TEMPLATE_VERSION = '2026-05-16';
export const PLATFORM_CONTRACTS = ['run_context', 'source_record', 'enrichment_context', 'delivery_payload'];

const WORKATO_REFERENCES = [
  { label: 'Recipe function by Workato', url: 'https://docs.workato.com/connectors/recipe-functions.html' },
  { label: 'Create a Custom Connector', url: 'https://docs.workato.com/en/developing-connectors/custom-connector.html' },
  { label: 'Slack connector', url: 'https://docs.workato.com/connectors/slack.html' },
  { label: 'Google Calendar connector', url: 'https://docs.workato.com/en/connectors/google-calendar.html' },
];

const ZAPIER_REFERENCES = [
  { label: 'Zapier action design', url: 'https://docs.zapier.com/integrations/build/action' },
  { label: 'Add a create action', url: 'https://docs.zapier.com/integrations/build/create' },
  { label: 'AI actions', url: 'https://docs.zapier.com/integrations/reference/ai-actions' },
  { label: 'Zap templates restrictions', url: 'https://docs.zapier.com/integrations/publish/zap-templates' },
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

export function buildWorkatoTemplate(workflow) {
  const capabilities = inferWorkflowCapabilities(workflow);
  const deliveryTargets = buildDeliveryTargets(capabilities);

  return {
    template_version: TEMPLATE_VERSION,
    platform: 'workato',
    template_type: 'native-blueprint',
    workflow_id: workflow.id,
    name: `${workflow.name} — Workato Native Blueprint`,
    category: workflow.category,
    summary: `${firstSentence(workflow.description)} Native-first Workato blueprint that favors recipe functions, custom connectors, and native delivery/connectivity surfaces over raw HTTP steps.`,
    official_references: WORKATO_REFERENCES,
    quality_bar: {
      native_connectors_required: buildWorkatoConnectorRequirements(capabilities),
      prohibited_patterns: [
        'No repeated Universal HTTP or ad hoc API request actions for Slack, CRM, calendar, or email delivery',
        'No credentials stored in formula literals, project properties comments, or recipe notes',
        'No agent output sent straight to transport or records without JSON schema validation',
        'No routing, dedupe, or retry logic hidden inside opaque code snippets when Recipe Functions or data tables can own it',
      ],
    },
    contracts: PLATFORM_CONTRACTS,
    trigger_model: {
      source: workflow.trigger,
      recommended_surface: classifyTrigger(workflow, capabilities, 'workato'),
    },
    delivery_strategy: {
      targets: deliveryTargets,
      contract: 'delivery_payload',
      connectors: buildWorkatoConnectorRequirements(capabilities).filter((entry) =>
        /slack|teams|email|calendar|jira|asana|linear|webhook|database|queue|orchestrator/i.test(entry),
      ),
    },
    recipe_functions: buildWorkatoRecipeFunctions(workflow, capabilities),
    main_recipes: [
      {
        key: `${slugify(workflow.id)}_primary_recipe`,
        trigger: classifyTrigger(workflow, capabilities, 'workato'),
        steps: buildWorkatoSteps(workflow, capabilities),
      },
    ],
    ai_contracts: buildAiContractMap(workflow),
    deployment_notes: unique([
      'Store connector configuration, defaults, and destination IDs in connection objects or project properties.',
      capabilities.backstory ? 'Expose Backstory through a reusable custom connector instead of repeated HTTP actions.' : '',
      capabilities.store ? 'Use lookup tables or data tables for routing maps, dedupe keys, and canonical mappings.' : '',
      capabilities.email && capabilities.slack
        ? 'Split fan-out delivery into deterministic recipe-function stages so Slack, Teams, and email stay independently testable.'
        : '',
      'Keep synthesis agentic, but keep delivery and persistence deterministic.',
    ]),
  };
}

export function buildZapierTemplate(workflow) {
  const capabilities = inferWorkflowCapabilities(workflow);
  const deliveryTargets = buildDeliveryTargets(capabilities);
  const nativeAppsRequired = buildZapierConnectorRequirements(capabilities);
  const needsBundle = deliveryTargets.length > 1 || capabilities.subworkflow || capabilities.store;

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

  return {
    template_version: TEMPLATE_VERSION,
    platform: 'zapier',
    template_type: 'native-blueprint-bundle',
    workflow_id: workflow.id,
    name: `${workflow.name} — Zapier Native Blueprint`,
    category: workflow.category,
    summary: `${firstSentence(workflow.description)} Native-first Zapier blueprint that favors published custom apps, native app steps, and structured AI outputs over API Request, Webhooks, and Code-heavy builds.`,
    official_references: ZAPIER_REFERENCES,
    quality_bar: {
      native_connectors_required: nativeAppsRequired,
      prohibited_patterns: [
        'Do not use raw API Requests or Custom Actions as the long-term production answer when a reusable custom Zapier app can be published',
        'Do not use Webhooks, Code, Looping, Formatter, or Paths as the basis for a reusable published Zap template',
        'Do not send unvalidated LLM text straight to Slack, Teams, email, calendar, or project-management actions',
        'Do not hide routing or canonical data mapping inside opaque code when Tables, native apps, or custom-app actions can own it',
      ],
      template_constraints: [
        'Public Zap templates have product restrictions, so multi-surface workflows may need a blueprint bundle instead of one monolithic reusable Zap.',
        'Use private or published custom Zapier apps for durable source-system integrations instead of repeated API Request steps.',
      ],
    },
    contracts: PLATFORM_CONTRACTS,
    trigger_model: {
      source: workflow.trigger,
      recommended_surface: classifyTrigger(workflow, capabilities, 'zapier'),
    },
    delivery_strategy: {
      targets: deliveryTargets,
      contract: 'delivery_payload',
      apps: nativeAppsRequired.filter((entry) =>
        /slack|teams|gmail|outlook|email|calendar|jira|asana|linear|webhook|database|queue|publication/i.test(entry),
      ),
    },
    custom_app_actions: unique([
      capabilities.backstory ? 'backstory_list_source_records' : '',
      capabilities.backstory ? 'backstory_get_record_context' : '',
      capabilities.backstory ? 'backstory_publish_run_summary' : '',
      capabilities.meetingSource ? 'meeting_source_fetch_artifact' : '',
      capabilities.store ? 'load_routing_map' : '',
    ]),
    blueprint_bundle: blueprintBundle,
    ai_contracts: buildAiContractMap(workflow),
    deployment_notes: unique([
      capabilities.backstory
        ? 'If Backstory is not already available as a Zapier integration, publish a private or public custom Zapier app before rolling this out broadly.'
        : '',
      capabilities.store ? 'Use Zapier Tables or Storage for canonical keys, approval state, dedupe, and retry tracking.' : '',
      capabilities.subworkflow ? 'Split orchestration and delivery into separate Zaps when parent-child reuse is needed.' : '',
      'Keep transport deterministic and reserve AI for classification, synthesis, and explanation.',
    ]),
  };
}
