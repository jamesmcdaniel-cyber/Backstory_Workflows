import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { composePluginSkillMd, composeReadme, fileProblems, isGeneratedPath, pluginPaths, slugifyPluginName, validatePlugin } from '../pluginFormat.js';
import { BRIEF_KIT_CONTENT, allPluginFiles, packagePlugin, packageSkill } from '../pluginPackage.js';

const skillBody = `# Renewal risk brief

> Which renewals need a leader this week?

## Read first

| File | What it gives you |
|---|---|
| settings.json | Scope |
| [references/framework.md](references/framework.md) | Levels |
| [references/data-collection.md](references/data-collection.md) | Tool calls |
| references/data-schema.md | data.json |
| references/publishing.md | Publishing |

## Workflow

### 0. Preflight
Load settings.json. If a field is missing, use its fallback.

1. Call \`preview_records\`, relay the count and wait for the user to confirm, then \`fetch_records\`.
2. For each account, call \`get_recent_account_activity\` with days = 90.
3. Write data.json, then run python3 <skill>/scripts/build_brief.py data.json brief.html.
`;

export const samplePlugin = () => ({
  name: 'renewal-risk-brief',
  version: '0.1.0',
  title: 'Renewal risk brief',
  question: 'Which renewals need a leader this week?',
  pluginDescription: 'Builds a weekly renewal risk brief.',
  skillDescription: 'Builds the weekly renewal risk brief. Use when asked to run or refresh the renewal risk brief.',
  summary: 'A weekly brief.',
  cadence: 'weekly',
  output: 'brief',
  settings: { scope: {}, output: { artifactUrl: null, filePath: null }, schedule: { cron: '0 8 * * 1', promptTemplate: 'Run the renewal risk brief at {output}.' } },
  settingsGuide: [{ key: 'scope', about: 'which renewals' }],
  requirements: ['**Region field** synced into Backstory.'],
  workflow: ['0. Preflight'],
  plan: [
    { path: 'SKILL.md', purpose: 'the workflow Claude follows', outline: [] },
    { path: 'references/framework.md', purpose: 'levels', outline: [] },
    { path: 'references/data-collection.md', purpose: 'tool calls', outline: [] },
    { path: 'evals/rubric.md', purpose: 'judging runs', outline: [] },
  ],
  nonNegotiables: [],
  tools: ['get_account_status'],
  testPrompts: ['Run the renewal risk brief.'],
  limits: [],
  files: {
    'SKILL.md': skillBody,
    'references/framework.md': '# Framework\n\nCritical needs dated evidence.',
    'references/data-collection.md': '# Data collection\n\nUse `get_account_status` for risks.',
    'evals/rubric.md': '# Rubric\n\n1. **gate** Every renewal in scope was analysed.',
  },
});

describe('validatePlugin', () => {
  it('passes a complete plugin', () => {
    const result = validatePlugin(samplePlugin());
    expect(result.errors).toEqual([]);
    expect(result.tools).toEqual(['preview_records', 'fetch_records', 'get_recent_account_activity', 'get_account_status']);
  });

  it('catches broken links, unread references and a missing build step', () => {
    const plugin = samplePlugin();
    plugin.files['SKILL.md'] = skillBody.replace('[references/data-collection.md](references/data-collection.md)', 'references/missing.md').replace(/build_brief\.py/g, 'make_page.py');
    const errors = validatePlugin(plugin).errors.join(' ');
    expect(errors).toMatch(/references\/missing\.md/);
  });

  it('requires the schedule for a scheduled plugin and the output for a brief', () => {
    const plugin = samplePlugin();
    plugin.settings = { scope: {} };
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/schedule\.cron/);
    plugin.cadence = 'on_request';
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/settings\.output/);
  });

  it('rejects invented tools, a description with no trigger, and a rubric with no gates', () => {
    const plugin = samplePlugin();
    plugin.files['references/framework.md'] += '\nThen call `get_forecast_data`.';
    plugin.skillDescription = 'Builds a brief.';
    plugin.files['evals/rubric.md'] = '# Rubric\n\n1. Good.';
    const errors = validatePlugin(plugin).errors.join(' ');
    expect(errors).toMatch(/get_forecast_data/);
    expect(errors).toMatch(/Use when/);
    expect(errors).toMatch(/gates/);
  });

  it('flags a reference that names a tool the workflow never calls', () => {
    const plugin = samplePlugin();
    plugin.files['evals/rubric.md'] += '\n| `situation_search` is not enabled | Say so |';
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/situation_search \(evals\/rubric\.md\)/);
  });

  it('rejects placeholder settings and CRM fields without names to try', () => {
    const plugin = samplePlugin();
    plugin.settings.scope.teamOwners = ['{rep_name_1}'];
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/scope\.teamOwners\[0\]/);
    plugin.settings.scope.teamOwners = null;
    plugin.settings.fields = { closeDate: 'CloseDate' };
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/fields\.closeDate/);
    plugin.settings.fields = { _closeDate: 'note', closeDate: { names: ['CloseDate', 'Close_Date__c'], required: true } };
    expect(validatePlugin(plugin).errors).toEqual([]);
  });

  it('checks list queries wait for confirmation across all files', () => {
    const plugin = samplePlugin();
    plugin.files['SKILL.md'] = plugin.files['SKILL.md'].replace(/confirm/g, 'check');
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/confirm/);
  });
});

describe('fileProblems', () => {
  it('flags Sales AI wording and frontmatter in SKILL.md', () => {
    expect(fileProblems('references/x.md', 'Ask Sales AI about it.').join(' ')).toMatch(/Backstory's assistant/);
    expect(fileProblems('SKILL.md', '---\nname: x\n---\n1. Step. If data is missing, say so.').join(' ')).toMatch(/frontmatter/);
  });
});

describe('composing files', () => {
  it('writes the version under metadata, as the skills spec allows', () => {
    expect(composePluginSkillMd({ name: 'a', description: 'Does: things. Use when x.', version: '0.2.0', body: 'Body' }))
      .toBe('---\nname: a\ndescription: "Does: things. Use when x."\nmetadata:\n  version: "0.2.0"\n---\n\nBody\n');
  });

  it('lists every file, the kit included, and documents install, schedule and settings in the README', () => {
    const plugin = samplePlugin();
    expect(pluginPaths(plugin)).toContain('skills/renewal-risk-brief/scripts/build_brief.py');
    const readme = composeReadme(plugin);
    expect(readme).toMatch(/Customize > Plugins > Add > Upload plugin/);
    expect(readme).toMatch(/Run the renewal risk brief at <brief link>/);
    expect(readme).toMatch(/`scope`: which renewals/);
    expect(readme).toMatch(/build_brief\.py .*sample-data\.json/);
  });

  it('never names a plugin after Claude or Anthropic', () => {
    expect(slugifyPluginName('Claude Renewal Brief')).toBe('renewal-brief');
    expect(slugifyPluginName('!!!')).toBe('backstory-plugin');
  });
});

describe('packagePlugin', () => {
  it('ships one plugin folder with one manifest, and is byte-identical each time', () => {
    const plugin = samplePlugin();
    const files = unzipSync(packagePlugin(plugin));
    const paths = Object.keys(files);
    expect(paths.filter((path) => path.endsWith('.claude-plugin/plugin.json'))).toEqual(['renewal-risk-brief/.claude-plugin/plugin.json']);
    expect(paths.every((path) => path.startsWith('renewal-risk-brief/'))).toBe(true);
    expect(JSON.parse(strFromU8(files['renewal-risk-brief/.claude-plugin/plugin.json']))).toMatchObject({ name: 'renewal-risk-brief', version: '0.1.0', author: { name: expect.any(String) } });
    expect(packagePlugin(plugin)).toEqual(packagePlugin(plugin));
  });

  it('leaves the page kit out of chat plugins', () => {
    const plugin = { ...samplePlugin(), output: 'chat' };
    expect(Object.keys(allPluginFiles(plugin)).some((path) => path.includes('build_brief'))).toBe(false);
  });
});

describe('ChatGPT plugins', () => {
  const chatgpt = () => {
    const plugin = { ...samplePlugin(), platform: 'chatgpt', settings: { scope: {}, output: { fileName: 'renewal-risk-brief.html' }, schedule: { cron: '0 8 * * 1', promptTemplate: 'Run the renewal risk brief scheduled run.' } } };
    return plugin;
  };

  it('ships an Agent Plugins manifest at the root and an openai.yaml that needs Backstory', () => {
    const files = allPluginFiles(chatgpt());
    expect(files['.claude-plugin/plugin.json']).toBeUndefined();
    const manifest = JSON.parse(files['plugin.json']);
    expect(manifest).toMatchObject({ $schema: expect.stringContaining('agent-plugins.org'), name: 'renewal-risk-brief', version: '0.1.0', extensions: { 'com.openai': { interface: { displayName: 'Renewal risk brief', defaultPrompt: ['Run the renewal risk brief.'] } } } });
    expect(files['skills/renewal-risk-brief/agents/openai.yaml']).toMatch(/type: "mcp"[\s\S]*url: "https:\/\/mcp\.backstory\.ai\/mcp"/);
    expect(files['skills/renewal-risk-brief/references/publishing.md']).toMatch(/download/);
    expect(files['skills/renewal-risk-brief/references/publishing.md']).not.toMatch(/artifact/);
    expect(pluginPaths(chatgpt())[0]).toBe('plugin.json');
  });

  it('writes the README for a ChatGPT workspace', () => {
    const readme = allPluginFiles(chatgpt())['README.md'];
    expect(readme).toMatch(/Add custom MCP server/);
    expect(readme).toMatch(/Upload plugin/);
    expect(readme).toMatch(/@renewal-risk-brief/);
    expect(readme).toMatch(/scheduled task in ChatGPT/);
    expect(readme).not.toMatch(/Customize > Plugins/);
  });

  it('packages the skill folder alone for the Skills upload', () => {
    const paths = Object.keys(unzipSync(packageSkill(chatgpt())));
    expect(paths).toContain('renewal-risk-brief/SKILL.md');
    expect(paths).toContain('renewal-risk-brief/agents/openai.yaml');
    expect(paths.some((path) => path.endsWith('plugin.json') || path.endsWith('README.md'))).toBe(false);
  });

  it('passes validation, and flags files written for Claude', () => {
    const plugin = chatgpt();
    expect(validatePlugin(plugin).errors).toEqual([]);
    plugin.files['references/framework.md'] += '\nClaude decides the level.';
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/mention Claude/);
    expect(fileProblems('references/framework.md', 'Claude decides.', { platform: 'chatgpt', tools: [], workflow: [] }).join(' ')).toMatch(/ChatGPT/);
  });
});

describe('the page kit', () => {
  it('pins the shipped template by its SHA-256', () => {
    const hash = createHash('sha256').update(BRIEF_KIT_CONTENT['assets/brief-template.html']).digest('hex');
    expect(BRIEF_KIT_CONTENT['scripts/build_brief.py']).toContain(`TEMPLATE_SHA256 = "${hash}"`);
    expect(BRIEF_KIT_CONTENT['assets/brief-template.html'].split('/*__DATA__*/null')).toHaveLength(2);
  });

  const python = spawnSync('python3', ['--version']).status === 0;
  it.runIf(python)('builds the sample brief from a packaged plugin, and rejects undated evidence', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plugin-kit-'));
    for (const [path, content] of Object.entries(allPluginFiles(samplePlugin()))) {
      const full = join(dir, path);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    }
    const skill = join(dir, 'skills/renewal-risk-brief');
    const out = execFileSync('python3', ['-I', join(skill, 'scripts/build_brief.py'), join(skill, 'examples/sample-data.json'), join(dir, 'brief.html')]).toString();
    expect(out).toMatch(/6 reviewed, 2 shown/);

    const bad = JSON.parse(BRIEF_KIT_CONTENT['examples/sample-data.json']);
    bad.items[0].findings[0].evidence = [];
    writeFileSync(join(dir, 'bad.json'), JSON.stringify(bad));
    const result = spawnSync('python3', ['-I', join(skill, 'scripts/build_brief.py'), '--check', join(dir, 'bad.json')]);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toMatch(/Evidence or nothing/);
  });
});

const SCRIPT = 'import json, sys\n\ndef run(data, settings, as_of):\n    return {"report": []}\n\ndef main(argv):\n    return 0\n\nif __name__ == "__main__":\n    sys.exit(main(sys.argv[1:]))\n';
const TEST = 'import unittest\nfrom population import run\n\nclass T(unittest.TestCase):\n    def test_get_value(self):\n        self.assertEqual(run([], {}, "2026-01-01")["report"], [])\n\nif __name__ == "__main__":\n    unittest.main()\n';

function withScript() {
  const plugin = samplePlugin();
  const contract = { name: 'population', input: 'records', output: 'kept', rules: [], cases: [] };
  plugin.plan.push(
    { path: 'scripts/population.py', purpose: 'builds the renewal list', outline: [], kind: 'script', script: contract },
    { path: 'scripts/test_population.py', purpose: 'tests for population.py', outline: [], kind: 'test', script: contract },
  );
  plugin.files['scripts/population.py'] = SCRIPT;
  plugin.files['scripts/test_population.py'] = TEST;
  plugin.files['SKILL.md'] += '4. Run python3 <skill>/scripts/population.py records.json --out population.json.\n';
  return plugin;
}

describe('generated scripts', () => {
  it('fail when a script reads a setting settings.json lacks', () => {
    const plugin = withScript();
    plugin.tests = { population: { status: 'passed', testsRun: 1 } };
    plugin.plan.find((item) => item.kind === 'script').script.settingsKeys = ['scope.quarterStart'];
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/population\.py → scope\.quarterStart/);
  });

  it('accept script paths but never the shipped build script', () => {
    expect(isGeneratedPath('scripts/population.py')).toBe(true);
    expect(isGeneratedPath('scripts/build_brief.py')).toBe(false);
    expect(isGeneratedPath('scripts/../x.py')).toBe(false);
  });

  it('gate the plugin until the scripts pass their tests', () => {
    const plugin = withScript();
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/scripts\/population\.py hasn't passed its tests/);
    plugin.tests = { population: { status: 'passed', testsRun: 7 } };
    const result = validatePlugin(plugin);
    expect(result.errors).toEqual([]);
    expect(result.checks.find((item) => item.name === 'Script tests').detail).toMatch(/1 script passed 7 tests/);
  });

  it("don't count Python function names as Backstory tools", () => {
    const plugin = withScript();
    plugin.tests = { population: { status: 'passed', testsRun: 1 } };
    plugin.files['scripts/population.py'] += '\ndef get_value(record):\n    return record\n';
    expect(validatePlugin(plugin).errors).toEqual([]);
  });

  it('require SKILL.md to run each script', () => {
    const plugin = withScript();
    plugin.files['SKILL.md'] = plugin.files['SKILL.md'].replace(/scripts\/population\.py/g, 'the script');
    expect(validatePlugin(plugin).errors.join(' ')).toMatch(/never runs scripts\/population\.py/);
  });

  it('check the contract that can be checked without Python', () => {
    expect(fileProblems('scripts/population.py', 'import subprocess\nprint(1)').join(' ')).toMatch(/no network, subprocess.*run\(data, settings, as_of\).*main\(argv\)/s);
    expect(fileProblems('scripts/population.py', SCRIPT.replace('def run(data, settings, as_of)', 'def run(data: list, settings: dict, as_of: str)'))).toEqual([]);
    expect(fileProblems('scripts/test_population.py', 'print(1)').join(' ')).toMatch(/unittest.*import population/s);
  });

  it('list the test command in the README and ship the tests', () => {
    const plugin = withScript();
    expect(composeReadme(plugin)).toMatch(/python3 skills\/renewal-risk-brief\/scripts\/test_population\.py/);
    expect(Object.keys(allPluginFiles(plugin))).toContain('skills/renewal-risk-brief/scripts/test_population.py');
  });
});
