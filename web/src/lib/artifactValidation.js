const PLACEHOLDER = /(?:TODO|YOUR_[A-Z_]+|<[^>]+>|\.\.\.)/;
const SECRET = /(?:sk-ant-|sk-proj-|ghp_|xox[baprs]-)[A-Za-z0-9_-]{8,}/;

export const PLATFORM_FORMATS = {
  n8n: { language: 'json', extension: '.json', label: 'n8n import JSON' },
  workato: { language: 'markdown', extension: '.md', label: 'Workato implementation guide' },
  zapier: { language: 'markdown', extension: '.md', label: 'Zapier implementation guide' },
  claude: { language: 'markdown', extension: '.md', label: 'Claude workflow instructions' },
  openai: { language: 'markdown', extension: '.md', label: 'OpenAI workflow instructions' },
};

export function platformKey(platform) {
  const value = String(platform || '').toLowerCase().replace(/\s+/g, ' ');
  if (value.includes('n8n')) return 'n8n';
  if (value.includes('workato')) return 'workato';
  if (value.includes('zapier')) return 'zapier';
  if (value.includes('claude')) return 'claude';
  if (value.includes('openai') || value.includes('open ai')) return 'openai';
  return null;
}

function hasHeading(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, 'im').test(content);
}

function collectTargets(value, out = []) {
  if (Array.isArray(value)) value.forEach((item) => collectTargets(item, out));
  else if (value && typeof value === 'object') {
    if (typeof value.node === 'string') out.push(value.node);
    Object.values(value).forEach((item) => collectTargets(item, out));
  }
  return out;
}

function credentialLiterals(value, path = '', out = []) {
  if (Array.isArray(value)) value.forEach((item, index) => credentialLiterals(item, `${path}[${index}]`, out));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const next = path ? `${path}.${key}` : key;
      if (/api.?key|token|password|client.?secret|authorization/i.test(key) && typeof item === 'string' && item && !/^={{|^\$env\.|^\{\{/.test(item)) out.push(next);
      credentialLiterals(item, next, out);
    }
  }
  return out;
}

function finish(errors, warnings, checks, platform) {
  return {
    valid: errors.length === 0,
    status: errors.length ? 'failed' : warnings.length ? 'passed_with_setup' : 'passed',
    platform,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    checks,
  };
}

function checkMarkdown(content, requiredHeadings, errors, checks) {
  const missing = requiredHeadings.filter((heading) => !hasHeading(content, heading));
  if (missing.length) errors.push(`Missing required sections: ${missing.join(', ')}.`);
  checks.push({ name: 'Required sections', passed: missing.length === 0, detail: missing.length ? missing.join(', ') : 'All required sections are present.' });
  const hasSteps = /^\d+\.\s+\S+/m.test(content);
  if (!hasSteps) errors.push('The workflow needs an ordered sequence of executable steps.');
  checks.push({ name: 'Executable sequence', passed: hasSteps, detail: hasSteps ? 'Ordered workflow steps found.' : 'No ordered steps found.' });
}

function checkN8n(artifact, errors, warnings, checks) {
  let workflow;
  try {
    workflow = JSON.parse(artifact.content);
    checks.push({ name: 'JSON syntax', passed: true, detail: 'Valid JSON.' });
  } catch {
    errors.push('The generated n8n JSON is not valid.');
    checks.push({ name: 'JSON syntax', passed: false, detail: 'JSON parsing failed.' });
    return;
  }

  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const connections = workflow.connections && typeof workflow.connections === 'object' ? workflow.connections : null;
  if (!nodes.length) errors.push('The n8n workflow has no nodes.');
  if (!connections) errors.push('The n8n workflow has no connection map.');

  const names = new Set();
  const ids = new Set();
  let validNodes = true;
  for (const node of nodes) {
    if (!node?.name || !node?.id || !node?.type || node.typeVersion == null || !Array.isArray(node.position) || !node.parameters || typeof node.parameters !== 'object') validNodes = false;
    if (node?.type && !/^(?:n8n-nodes-base\.|@n8n\/)/.test(node.type)) errors.push(`Unsupported-looking n8n node type: ${node.type}.`);
    if (names.has(node?.name)) errors.push(`Duplicate node name: ${node.name}.`);
    if (ids.has(node?.id)) errors.push(`Duplicate node id: ${node.id}.`);
    names.add(node?.name);
    ids.add(node?.id);
  }
  if (!validNodes) errors.push('Every n8n node needs parameters, id, name, type, typeVersion, and position.');
  checks.push({ name: 'Node definitions', passed: validNodes && nodes.length > 0, detail: `${nodes.length} node${nodes.length === 1 ? '' : 's'} inspected.` });

  const adjacency = new Map(nodes.map((node) => [node.name, []]));
  for (const [source, groups] of Object.entries(connections || {})) {
    if (!names.has(source)) errors.push(`Connection source does not exist: ${source}.`);
    for (const target of collectTargets(groups)) {
      if (!names.has(target)) errors.push(`Connection target does not exist: ${target}.`);
      else if (adjacency.has(source)) adjacency.get(source).push(target);
    }
  }

  const triggers = nodes.filter((node) => /trigger|webhook/i.test(`${node.type} ${node.name}`));
  if (!triggers.length) errors.push('The n8n workflow needs a trigger or webhook node.');
  const searchable = JSON.stringify(nodes);
  const hasBackstory = /backstory|mcp/i.test(searchable);
  const hasAi = /openai|anthropic|claude|agent|language.?model|llm/i.test(searchable);
  const hasDelivery = /slack|gmail|email|teams|respond.?to.?webhook|delivery/i.test(searchable);
  if (!hasBackstory) errors.push('The workflow has no identifiable Backstory MCP or Backstory data step.');
  if (!hasAi) errors.push('The workflow has no identifiable AI synthesis step.');
  if (!hasDelivery) errors.push('The workflow has no identifiable delivery or response step.');
  checks.push({ name: 'Required stages', passed: !!triggers.length && hasBackstory && hasAi && hasDelivery, detail: `Trigger ${triggers.length ? 'found' : 'missing'}; Backstory ${hasBackstory ? 'found' : 'missing'}; AI ${hasAi ? 'found' : 'missing'}; delivery ${hasDelivery ? 'found' : 'missing'}.` });

  const visited = new Set();
  const queue = triggers.map((node) => node.name);
  while (queue.length) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);
    for (const next of adjacency.get(name) || []) queue.push(next);
  }
  const unreachable = nodes.map((node) => node.name).filter((name) => !visited.has(name));
  if (unreachable.length) errors.push(`Nodes are not reachable from a trigger: ${unreachable.join(', ')}.`);
  checks.push({ name: 'Execution path', passed: nodes.length > 0 && unreachable.length === 0, detail: unreachable.length ? `${unreachable.length} unreachable node(s).` : 'Every node is reachable from a trigger.' });

  if (workflow.active !== false) errors.push('The n8n workflow must be inactive until credentials and destinations are configured.');
  checks.push({ name: 'Safe activation', passed: workflow.active === false, detail: workflow.active === false ? 'Workflow is inactive by default.' : 'Workflow is not explicitly inactive.' });
  const literals = credentialLiterals(workflow);
  if (literals.length) errors.push(`Possible literal credentials found at: ${literals.join(', ')}.`);
  checks.push({ name: 'Credential safety', passed: literals.length === 0, detail: literals.length ? `${literals.length} possible literal credential value(s).` : 'No literal credential fields detected.' });
}

function checkWorkato(content, errors, warnings, checks) {
  checkMarkdown(content, ['Workflow Summary', 'What To Create In Workato', 'Build Order', 'Primary Recipe Outline', 'Structured AI Requirements', 'Validation Checklist'], errors, checks);
  const native = /Recipe Function|custom connector|native connector/i.test(content);
  const formatTruth = /not an importable JSON artifact/i.test(content) && /package\s+`?\.zip`?|\.zip file/i.test(content);
  if (!native) errors.push('The Workato guide must use Recipe Functions or native/custom connectors.');
  if (!formatTruth) errors.push('The Workato guide must explain that an actual import requires a Workato-exported package ZIP.');
  if (!/dedupe/i.test(content) || !/retr(?:y|ies)/i.test(content) || !/test/i.test(content)) errors.push('The Workato guide must cover dedupe, retries, and representative tests.');
  checks.push({ name: 'Workato-native format', passed: native && formatTruth, detail: formatTruth ? 'Guide correctly distinguishes generated instructions from Workato package export.' : 'Package format disclosure is missing.' });
}

function checkZapier(content, errors, warnings, checks) {
  checkMarkdown(content, ['Workflow Summary', 'What To Build In Zapier', 'Recommended Implementation Shape', 'Zaps To Create', 'Structured AI Requirements', 'Validation Checklist'], errors, checks);
  const formatTruth = /does not accept|not an importable JSON|not importable JSON/i.test(content);
  const restrictions = /public integration/i.test(content) && /Code|Webhooks|Paths/i.test(content);
  const structured = /structured (AI|JSON).*validat|validat.*structured (AI|JSON)/i.test(content);
  if (!formatTruth) errors.push('The Zapier guide must not claim to be an importable workflow JSON file.');
  if (!restrictions) errors.push('The Zapier guide must document public-template integration and restricted-step constraints.');
  if (!structured) errors.push('The Zapier guide must validate structured AI output before delivery.');
  if (!/test/i.test(content)) errors.push('The Zapier guide must include a test procedure.');
  checks.push({ name: 'Zapier-native format', passed: formatTruth && restrictions && structured, detail: formatTruth ? 'Guide uses an editor/template implementation format.' : 'Format disclosure is missing.' });
}

function checkOrchestrator(content, platform, errors, warnings, checks) {
  checkMarkdown(content, ['Role', 'Workflow Context', 'Purpose', 'Required Tools And Connections', 'Configurable Inputs', 'Workflow Steps', 'Tool Use Rules', 'Output Requirements', 'Validation Checklist'], errors, checks);
  const named = platform === 'claude' ? /Claude/i.test(content) : /OpenAI|OpenAI workflow/i.test(content);
  const mcp = /Backstory MCP/i.test(content);
  const failure = /error|retry|failure|missing data/i.test(content);
  if (!named) errors.push(`The instructions do not identify the ${platform === 'claude' ? 'Claude' : 'OpenAI'} target.`);
  if (!mcp) errors.push('The instructions must configure and govern Backstory MCP tool use.');
  if (!failure) errors.push('The instructions need failure or retry behavior.');
  if (!/test/i.test(content)) errors.push('The instructions need representative test cases.');
  checks.push({ name: 'Orchestrator readiness', passed: named && mcp && failure, detail: `Target ${named ? 'identified' : 'missing'}; MCP ${mcp ? 'covered' : 'missing'}; failure handling ${failure ? 'covered' : 'missing'}.` });
}

export function validateArtifact(artifact) {
  const errors = [];
  const warnings = [];
  const checks = [];
  const platform = platformKey(artifact?.platform);
  if (!artifact?.content) return finish(['The artifact is empty.'], warnings, checks, platform);
  if (!platform) errors.push('Choose one supported platform: n8n, Workato, Zapier, Claude, or OpenAI.');
  const format = platform && PLATFORM_FORMATS[platform];
  if (!artifact.filename) errors.push('A filename is required.');
  else if (format && !artifact.filename.toLowerCase().endsWith(format.extension)) errors.push(`${format.label} must use a ${format.extension} filename.`);
  if (format && artifact.language !== format.language) errors.push(`${format.label} must use ${format.language}.`);
  if (SECRET.test(artifact.content)) errors.push('The artifact appears to contain a hard-coded secret.');
  if (PLACEHOLDER.test(artifact.content)) warnings.push('Configuration placeholders must be completed in the target platform.');
  if (artifact.content.length < 300) errors.push('The artifact is too short to contain a complete workflow.');
  checks.push({ name: 'Format and safety', passed: errors.length === 0, detail: format ? `${format.label}; no hard-coded secret detected.` : 'Unsupported platform.' });

  if (platform === 'n8n') checkN8n(artifact, errors, warnings, checks);
  else if (platform === 'workato') checkWorkato(artifact.content, errors, warnings, checks);
  else if (platform === 'zapier') checkZapier(artifact.content, errors, warnings, checks);
  else if (platform === 'claude' || platform === 'openai') checkOrchestrator(artifact.content, platform, errors, warnings, checks);

  warnings.push('Preflight cannot verify external credentials or live connector responses; run the documented test in the target platform before activation.');

  return finish(errors, warnings, checks, platform);
}
