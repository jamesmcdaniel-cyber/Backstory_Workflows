import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { composePluginSkillMd, composeReadme, fileProblems, pluginPaths, slugifyPluginName, validatePlugin } from '../pluginFormat.js';
import { BRIEF_KIT_CONTENT, allPluginFiles, packagePlugin } from '../pluginPackage.js';

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
  tools: [],
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
