import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const adapterRoot = path.join(repoRoot, 'adapter-packs');
const templatesRoot = path.join(repoRoot, 'templates');

const CONTRACT_REQUIREMENTS = {
  run_context: ['workflow_id', 'mode', 'trigger_type', 'lookback_days', 'delivery_mode', 'dry_run'],
  source_record: ['source_system', 'source_id', 'source_url', 'owner', 'account_name', 'opportunity_name', 'workflow_specific_fields', 'raw_record'],
  enrichment_context: ['summary', 'confidence', 'source_refs', 'tool_results'],
  delivery_payload: ['target_type', 'target_id', 'format', 'title', 'body', 'blocks_or_html', 'thread_key', 'dedupe_key'],
};

const PACK_FAMILIES = new Set(['crm', 'delivery', 'meeting_source', 'identity', 'orchestrator']);
const CONFIG_ROLES = new Set(['crm', 'delivery', 'meeting_source', 'identity', 'orchestrator']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFilesRecursive(rootDir, matchFileName) {
  const results = [];
  const visit = (dirPath) => {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const nextPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(nextPath);
      } else if (entry.name === matchFileName) {
        results.push(nextPath);
      }
    }
  };
  if (fs.existsSync(rootDir)) visit(rootDir);
  return results.sort();
}

function issue(scope, filePath, message) {
  return {
    scope,
    file: path.relative(repoRoot, filePath),
    message,
  };
}

function validateRequiredFields(obj, requiredFields) {
  return requiredFields.filter((field) => !(field in obj));
}

function validatePack(manifestPath) {
  const packDir = path.dirname(manifestPath);
  const manifest = readJson(manifestPath);
  const issues = [];
  const relativeDir = path.relative(adapterRoot, packDir).split(path.sep);
  const familyFromPath = relativeDir[0];

  const requiredStringFields = ['schema_version', 'pack_id', 'family', 'system', 'display_name', 'version', 'summary'];
  for (const key of requiredStringFields) {
    if (typeof manifest[key] !== 'string' || manifest[key].trim() === '') {
      issues.push(issue('adapter-pack', manifestPath, `missing or empty string field ${key}`));
    }
  }

  if (!PACK_FAMILIES.has(manifest.family)) {
    issues.push(issue('adapter-pack', manifestPath, `invalid family ${manifest.family}`));
  }
  if (familyFromPath !== manifest.family) {
    issues.push(issue('adapter-pack', manifestPath, `family directory ${familyFromPath} does not match manifest family ${manifest.family}`));
  }

  if (!manifest.supports || typeof manifest.supports !== 'object') {
    issues.push(issue('adapter-pack', manifestPath, 'supports block is missing'));
  } else {
    for (const key of ['workflow_ids', 'workflow_families', 'orchestrators']) {
      if (!Array.isArray(manifest.supports[key])) {
        issues.push(issue('adapter-pack', manifestPath, `supports.${key} must be an array`));
      }
    }
  }

  for (const key of ['consumes_contracts', 'produces_contracts', 'required_env', 'mapping_files', 'fixtures']) {
    if (!Array.isArray(manifest[key]) || manifest[key].length === 0) {
      issues.push(issue('adapter-pack', manifestPath, `${key} must be a non-empty array`));
    }
  }

  for (const mapping of manifest.mapping_files || []) {
    const targetPath = path.join(packDir, mapping.path || '');
    if (!fs.existsSync(targetPath)) {
      issues.push(issue('adapter-pack', manifestPath, `mapping file not found: ${mapping.path}`));
    }
  }

  for (const envBinding of manifest.required_env || []) {
    if (!/^[A-Z0-9_]+$/.test(envBinding.name || '')) {
      issues.push(issue('adapter-pack', manifestPath, `required_env name must be uppercase snake case: ${envBinding.name || ''}`));
    }
  }

  for (const fixture of manifest.fixtures || []) {
    const inputPath = path.join(packDir, fixture.input || '');
    const expectedPath = path.join(packDir, fixture.expected || '');
    if (!fs.existsSync(inputPath)) {
      issues.push(issue('adapter-pack', manifestPath, `fixture input not found: ${fixture.input}`));
      continue;
    }
    if (!fs.existsSync(expectedPath)) {
      issues.push(issue('adapter-pack', manifestPath, `fixture expected output not found: ${fixture.expected}`));
      continue;
    }

    let expected;
    try {
      expected = readJson(expectedPath);
    } catch (error) {
      issues.push(issue('adapter-pack', expectedPath, `failed to parse expected fixture: ${error.message}`));
      continue;
    }

    for (const contractName of manifest.produces_contracts || []) {
      const contractValue = expected[contractName];
      if (!contractValue || typeof contractValue !== 'object' || Array.isArray(contractValue)) {
        issues.push(issue('adapter-pack', expectedPath, `expected fixture is missing object contract ${contractName}`));
        continue;
      }
      const missingFields = validateRequiredFields(contractValue, CONTRACT_REQUIREMENTS[contractName] || []);
      if (missingFields.length) {
        issues.push(issue('adapter-pack', expectedPath, `contract ${contractName} is missing fields: ${missingFields.join(', ')}`));
      }
    }
  }

  return {
    manifest,
    issues,
  };
}

function validateCustomerConfig(templatePath, knownPackIds) {
  const config = readJson(templatePath);
  const issues = [];

  if (config.schema_version !== 'v1') {
    issues.push(issue('customer-config', templatePath, `unsupported schema_version ${config.schema_version}`));
  }

  const requiredTopLevelFields = [
    'customer',
    'implementation',
    'selected_packs',
    'env_bindings',
    'routing_defaults',
    'field_overrides',
    'threshold_overrides',
    'certification',
  ];
  for (const key of requiredTopLevelFields) {
    if (!(key in config)) {
      issues.push(issue('customer-config', templatePath, `missing top-level field ${key}`));
    }
  }

  if (!Array.isArray(config.selected_packs) || config.selected_packs.length < 2) {
    issues.push(issue('customer-config', templatePath, 'selected_packs must contain at least two entries'));
  } else {
    for (const selectedPack of config.selected_packs) {
      if (!CONFIG_ROLES.has(selectedPack.role)) {
        issues.push(issue('customer-config', templatePath, `invalid selected pack role ${selectedPack.role}`));
      }
      if (selectedPack.enabled && !knownPackIds.has(selectedPack.pack_id)) {
        issues.push(issue('customer-config', templatePath, `enabled pack_id not found: ${selectedPack.pack_id}`));
      }
    }
  }

  for (const envBinding of config.env_bindings || []) {
    if (!/^[A-Z0-9_]+$/.test(envBinding.name || '')) {
      issues.push(issue('customer-config', templatePath, `env binding name must be uppercase snake case: ${envBinding.name || ''}`));
    }
    if (envBinding.secret && envBinding.value_source === 'manual') {
      issues.push(issue('customer-config', templatePath, `secret env binding should not use manual value_source: ${envBinding.name}`));
    }
  }

  if (!Array.isArray(config.certification?.required_scenarios) || config.certification.required_scenarios.length === 0) {
    issues.push(issue('customer-config', templatePath, 'certification.required_scenarios must contain at least one scenario'));
  }
  if (!Array.isArray(config.certification?.approvers) || config.certification.approvers.length === 0) {
    issues.push(issue('customer-config', templatePath, 'certification.approvers must contain at least one approver'));
  }

  return issues;
}

function main() {
  const manifestPaths = listFilesRecursive(adapterRoot, 'manifest.json');
  const packResults = manifestPaths.map(validatePack);
  const knownPackIds = new Set(packResults.map((result) => result.manifest.pack_id));
  const customerConfigPaths = listFilesRecursive(templatesRoot, 'customer-stack-config.starter.json')
    .concat(listFilesRecursive(templatesRoot, 'customer-stack-config.multi-channel.json'))
    .sort();

  const issues = [];
  for (const result of packResults) {
    issues.push(...result.issues);
  }
  for (const templatePath of customerConfigPaths) {
    issues.push(...validateCustomerConfig(templatePath, knownPackIds));
  }

  const output = {
    ok: issues.length === 0,
    packCount: packResults.length,
    customerTemplateCount: customerConfigPaths.length,
    issueCount: issues.length,
    issues,
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(output.ok ? 0 : 1);
}

main();
