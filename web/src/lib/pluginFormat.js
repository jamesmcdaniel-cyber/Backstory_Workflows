import { MCP_TOOLS } from '../data/mcpTools.js';
import { nameProblem, sequenceProblem, slugifySkillName, toolsNamedIn, wordingProblem } from './skillFormat.js';

// The plugin contract for the Plugin Builder, shared by the server (which
// validates and repairs each file the model writes) and the page (which shows
// the checks, gates the download and packages the ZIP).
//
// A plugin is one skill plus what makes it repeatable: settings, references
// for judgment, an eval rubric, a README, and, for plugins that publish a
// page, a fixed template and build script (the "brief kit") so every run
// looks the same and the counting is done by code.
//
// Limits: plugin names follow Claude's manifest rules (kebab-case, no
// "claude"/"anthropic"); a skill inside a plugin follows the Agent Skills spec
// (description 1-1,024 characters, version kept under `metadata`).
export const PLUGIN_LIMITS = { nameMax: 64, skillDescriptionMax: 1024, pluginDescriptionMax: 500, fileMaxLines: 500, referencesMin: 2, referencesMax: 5 };
export const CADENCES = ['on_request', 'daily', 'weekly'];
export const OUTPUTS = ['chat', 'brief'];
export const INITIAL_VERSION = '0.1.0';

// Shipped unchanged with every plugin whose output is a brief page. Their
// content lives in src/plugin-kit/brief and is added by the page at download.
export const BRIEF_KIT = [
  { path: 'assets/brief-template.html', about: 'the fixed page design; runs only change the data' },
  { path: 'scripts/build_brief.py', about: 'checks the data, ranks and counts, and builds the page' },
  { path: 'references/data-schema.md', about: 'the exact shape of data.json' },
  { path: 'references/publishing.md', about: 'building the page and updating the same brief' },
  { path: 'examples/sample-data.json', about: 'fictional data for previews and tests' },
];
const KIT_PATHS = new Set(BRIEF_KIT.map((item) => item.path));

const TOOL_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
const XML_TAG = /<[^>]+>/;
const GENERATED_PATH = /^(?:SKILL\.md|references\/[a-z0-9]+(?:-[a-z0-9]+)*\.md|evals\/rubric\.md)$/;
const MENTIONED_PATH = /\b(?:references|evals|scripts|assets|examples)\/[A-Za-z0-9._-]+\.[a-z]+\b/g;
const CRON = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;

export const slugifyPluginName = (raw) => slugifySkillName(raw).replace(/^backstory-skill$/, 'backstory-plugin');

export const isGeneratedPath = (path) => GENERATED_PATH.test(path) && !KIT_PATHS.has(path);

/** Every file in the plugin, relative to the plugin folder, in display order. */
export function pluginPaths(plugin) {
  const skill = `skills/${plugin.name}`;
  const generated = (plugin.plan || []).map((item) => item.path).filter((path) => path !== 'SKILL.md');
  const kit = plugin.output === 'brief' ? BRIEF_KIT.map((item) => item.path) : [];
  return [
    '.claude-plugin/plugin.json',
    'README.md',
    `${skill}/SKILL.md`,
    `${skill}/settings.json`,
    ...[...generated, ...kit].sort().map((path) => `${skill}/${path}`),
  ];
}

export function composePluginJson(plugin) {
  return `${JSON.stringify({
    name: plugin.name,
    version: plugin.version || INITIAL_VERSION,
    description: clean(plugin.pluginDescription),
    author: { name: 'Backstory Plugin Builder' },
  }, null, 2)}\n`;
}

export function composePluginSkillMd({ name, description, version, body }) {
  // A double-quoted JSON string is a valid YAML scalar, so colons and quotes in
  // the description can't break the frontmatter.
  return `---\nname: ${name}\ndescription: ${JSON.stringify(clean(description))}\nmetadata:\n  version: ${JSON.stringify(version || INITIAL_VERSION)}\n---\n\n${String(body || '').trim()}\n`;
}

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

function describeFile(plugin, path) {
  const kit = BRIEF_KIT.find((item) => item.path === path);
  if (kit) return kit.about;
  if (path === 'SKILL.md') return 'the workflow Claude follows';
  if (path === 'settings.json') return 'scope, thresholds, output and schedule';
  return (plugin.plan || []).find((item) => item.path === path)?.purpose || '';
}

function tree(plugin) {
  const skillFiles = ['SKILL.md', 'settings.json', ...pluginPaths(plugin).slice(4).map((path) => path.replace(`skills/${plugin.name}/`, ''))];
  const width = Math.max(...skillFiles.map((path) => path.length)) + 6;
  const lines = [`${plugin.name}/`, '├── .claude-plugin/plugin.json', '├── README.md', `└── skills/${plugin.name}/`];
  skillFiles.forEach((path, index) => {
    const prefix = `    ${index === skillFiles.length - 1 ? '└──' : '├──'} ${path}`;
    const about = describeFile(plugin, path);
    lines.push(about ? `${prefix.padEnd(width + 8)}# ${about}` : prefix);
  });
  return lines.join('\n');
}

function scheduleText(plugin) {
  const schedule = plugin.settings?.schedule || {};
  const when = [schedule.day, schedule.time, schedule.timezone].filter(Boolean).join(', ');
  const prompt = String(schedule.promptTemplate || '').replace('{output}', '<brief link>');
  return [
    '## Scheduled refresh',
    '',
    `The plugin is meant to run ${plugin.cadence === 'daily' ? 'every weekday' : 'every week'}${when ? ` (${when})` : ''}. After the first good run, Claude offers to set this up and creates the scheduled task only if you say yes.`,
    '',
    '- The task runs under the account of whoever creates it, with their Backstory access.',
    '- A task scheduled on a computer runs only while that computer is on and Claude is open.',
    plugin.output === 'brief' && '- A scheduled run never creates a second page. If it can\'t finish, it leaves the last brief in place and says what stopped it.',
    '- Use "Run now" on the task once to check it picks up the plugin before relying on the schedule.',
    '',
    prompt && 'If Claude can\'t schedule it where you\'re working, create a scheduled task yourself with this prompt:',
    prompt && '',
    prompt && '```',
    prompt,
    prompt && '```',
    '',
  ].filter((line) => line !== false && line !== undefined && line !== null).join('\n');
}

export function composeReadme(plugin) {
  const skillDir = `skills/${plugin.name}`;
  const brief = plugin.output === 'brief';
  const requirements = [
    '**The Backstory connector** in Claude (required): connect it under Customize > Connectors. The plugin doesn\'t bundle it.',
    ...(plugin.requirements || []),
    brief && '**Code execution turned on** in Claude\'s settings. Claude runs a small script that checks the data and builds the page from the fixed design.',
  ].filter(Boolean);
  const firstPrompt = (plugin.testPrompts || [])[0];
  const lines = [
    `# ${plugin.title || plugin.name}`,
    '',
    `${clean(plugin.pluginDescription)}`,
    '',
    plugin.question && 'It answers one question:',
    plugin.question && '',
    plugin.question && `> ${clean(plugin.question)}`,
    plugin.question && '',
    `Version ${plugin.version || INITIAL_VERSION}.`,
    '',
    '## Install',
    '',
    '- **Claude app:** Customize > Plugins > Add > Upload plugin, and choose this ZIP.',
    `- **Claude Code:** a plugin uploaded to your Claude account syncs to Claude Code as \`${plugin.name}@synced\`. To try it for one session from an unzipped copy instead: \`claude --plugin-dir ./${plugin.name}\`.`,
    '',
    '## What you need',
    '',
    ...requirements.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Running it',
    '',
    firstPrompt ? `Ask Claude something like "${firstPrompt.replace(/[.\s]+$/, '')}". It uses the settings in \`${skillDir}/settings.json\`.` : `Ask Claude to run ${plugin.title || plugin.name}. It uses the settings in \`${skillDir}/settings.json\`.`,
    '',
    brief && 'The first run creates the page and gives you its link. Include the link when you ask for the next run so it updates the same page; the scheduled refresh carries it automatically.',
    brief && '',
    plugin.cadence && plugin.cadence !== 'on_request' && scheduleText(plugin),
    '## Settings',
    '',
    `\`${skillDir}/settings.json\`:`,
    '',
    ...(plugin.settingsGuide || []).map((item) => `- \`${item.key}\`: ${clean(item.about)}`),
    '',
    '## What\'s inside',
    '',
    '```',
    tree(plugin),
    '```',
    '',
    '## Testing',
    '',
    brief && 'To see the page with fictional data:',
    brief && '',
    brief && '```bash',
    brief && `python3 ${skillDir}/scripts/build_brief.py ${skillDir}/examples/sample-data.json sample-brief.html`,
    brief && '```',
    brief && '',
    `Judge a few runs against \`${skillDir}/evals/rubric.md\` before you rely on it, and again after any change to the instructions.`,
    '',
  ];
  return lines.filter((line) => line !== false && line !== undefined && line !== null).join('\n');
}

/** Every file of the plugin keyed by its path inside the plugin folder. `kit` maps brief-kit paths to their contents. */
export function pluginFiles(plugin, kit = {}) {
  const skill = `skills/${plugin.name}`;
  const files = {
    '.claude-plugin/plugin.json': composePluginJson(plugin),
    'README.md': composeReadme(plugin),
    [`${skill}/SKILL.md`]: composePluginSkillMd({ name: plugin.name, description: plugin.skillDescription, version: plugin.version, body: plugin.files?.['SKILL.md'] }),
    [`${skill}/settings.json`]: `${JSON.stringify(plugin.settings || {}, null, 2)}\n`,
  };
  for (const item of plugin.plan || []) {
    if (item.path !== 'SKILL.md') files[`${skill}/${item.path}`] = `${String(plugin.files?.[item.path] || '').trim()}\n`;
  }
  if (plugin.output === 'brief') {
    for (const { path } of BRIEF_KIT) if (kit[path] !== undefined) files[`${skill}/${path}`] = kit[path];
  }
  return files;
}

function unknownTools(text) {
  return toolsNamedIn(text).filter((tool) => !TOOL_BY_NAME.has(tool));
}

/** Problems with one generated file, used by the server to repair it before it reaches the page. With the blueprint, SKILL.md's links and build step are checked too. */
export function fileProblems(path, content, blueprint) {
  const text = String(content || '');
  const problems = [];
  if (!text.trim()) return ['The file is empty.'];
  const lines = text.split('\n').length;
  if (lines > PLUGIN_LIMITS.fileMaxLines) problems.push(`The file runs ${lines} lines; keep it under ${PLUGIN_LIMITS.fileMaxLines}.`);
  if (/^\s*---\n/.test(text) && path === 'SKILL.md') problems.push('Leave out the frontmatter; it is added for you.');
  const unknown = unknownTools(text);
  if (unknown.length) problems.push(`These are not Backstory MCP tools: ${unknown.join(', ')}.`);
  const wording = wordingProblem(text);
  if (wording) problems.push(wording);
  if (path === 'SKILL.md') {
    if (!/^#{2,3} .*\b(?:workflow|steps)\b/im.test(text) && !/^\d+\.\s+\S/m.test(text)) problems.push('SKILL.md needs a workflow of numbered steps Claude can follow.');
    if (!/\b(?:missing|no data|not found|isn't|doesn't have|does not have|comes back empty|unavailable|unknown)\b/i.test(text)) problems.push('SKILL.md must say what to do when Backstory has no data, so Claude does not fill the gap by guessing.');
    if (blueprint) {
      const links = linksProblem(text, blueprint.plan, blueprint.output);
      if (links) problems.push(links);
    }
  }
  if (path === 'evals/rubric.md' && !/\bgate\b/i.test(text)) problems.push('The rubric must mark the criteria a run has to pass (gates).');
  return problems;
}

function check(checks, errors, name, problem, okDetail) {
  checks.push({ name, passed: !problem, detail: problem || okDetail });
  if (problem) errors.push(problem);
}

function descriptionProblem(description) {
  const text = clean(description);
  if (!text) return 'The skill needs a description.';
  if (text.length > PLUGIN_LIMITS.skillDescriptionMax) return `The skill description is ${text.length} characters; the limit is ${PLUGIN_LIMITS.skillDescriptionMax}.`;
  if (XML_TAG.test(text)) return 'The skill description cannot contain XML tags.';
  if (!/\buse when\b/i.test(text)) return 'The skill description must say when to use it ("Use when…"), or Claude will not know when to load it.';
  return '';
}

function manifestProblem(plugin) {
  const name = nameProblem(plugin.name);
  if (name) return name.replace('skill', 'plugin');
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version || '')) return 'The version must look like 0.1.0.';
  const description = clean(plugin.pluginDescription);
  if (!description) return 'The plugin needs a description.';
  if (description.length > PLUGIN_LIMITS.pluginDescriptionMax) return `The plugin description is ${description.length} characters; keep it under ${PLUGIN_LIMITS.pluginDescriptionMax}.`;
  return '';
}

function settingsProblem(plugin) {
  const settings = plugin.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return 'settings.json must be a JSON object.';
  if (plugin.cadence && plugin.cadence !== 'on_request') {
    const schedule = settings.schedule;
    if (!schedule || !CRON.test(String(schedule.cron || '').trim())) return 'A scheduled plugin needs settings.schedule.cron (five fields, such as "0 8 * * 1").';
    if (!clean(schedule.promptTemplate)) return 'A scheduled plugin needs settings.schedule.promptTemplate, the prompt the scheduled task runs.';
  }
  if (plugin.output === 'brief' && !settings.output) return 'A plugin that publishes a page needs settings.output, so every run updates the same place.';
  return '';
}

function filesProblem(plugin) {
  const plan = plugin.plan || [];
  const references = plan.filter((item) => item.path.startsWith('references/'));
  if (!plan.some((item) => item.path === 'SKILL.md')) return 'The plugin has no SKILL.md.';
  if (!plan.some((item) => item.path === 'evals/rubric.md')) return 'The plugin has no eval rubric.';
  if (references.length < PLUGIN_LIMITS.referencesMin) return `The plugin needs at least ${PLUGIN_LIMITS.referencesMin} reference files.`;
  const bad = plan.find((item) => !isGeneratedPath(item.path));
  if (bad) return `${bad.path} isn't a file the builder can write.`;
  const missing = plan.filter((item) => !String(plugin.files?.[item.path] || '').trim()).map((item) => item.path);
  if (missing.length) return `These files are empty: ${missing.join(', ')}.`;
  return '';
}

function linksProblem(body, plan = [], output) {
  const available = new Set([
    ...plan.map((item) => item.path),
    ...(output === 'brief' ? BRIEF_KIT.map((item) => item.path) : []),
  ]);
  const broken = [...new Set(String(body).match(MENTIONED_PATH) || [])].filter((path) => !available.has(path));
  if (broken.length) return `SKILL.md points to files the plugin doesn't have: ${broken.join(', ')}.`;
  const unlinked = plan.filter((item) => item.path.startsWith('references/') && !body.includes(item.path)).map((item) => item.path);
  if (unlinked.length) return `SKILL.md never tells Claude to read ${unlinked.join(', ')}.`;
  if (output === 'brief' && !body.includes('build_brief.py')) return 'SKILL.md must build the page with scripts/build_brief.py (python3 <skill>/scripts/build_brief.py data.json brief.html), never by hand.';
  return '';
}

export function validatePlugin(plugin = {}) {
  const errors = [];
  const checks = [];
  const files = plugin.files || {};
  const generated = Object.entries(files);
  const allText = generated.map(([, content]) => content).join('\n\n');
  const body = String(files['SKILL.md'] || '');
  const tools = toolsNamedIn(allText);
  const known = tools.filter((tool) => TOOL_BY_NAME.has(tool));
  const unknown = tools.filter((tool) => !TOOL_BY_NAME.has(tool));
  const fileIssues = generated.flatMap(([path, content]) => fileProblems(path, content)
    .filter((problem) => !/Backstory MCP tools|Backstory accurately|"Sales AI"|30 days reliable|no data|points to|never tells|build_brief/.test(problem))
    .map((problem) => `${path}: ${problem}`));
  const wording = generated.map(([path, content]) => [path, wordingProblem(content)]).find(([, problem]) => problem);

  check(checks, errors, 'Plugin manifest', manifestProblem(plugin), `${plugin.name} ${plugin.version}, with a description.`);
  check(checks, errors, 'Skill description', descriptionProblem(plugin.skillDescription), 'Says what it does and when Claude should use it.');
  check(checks, errors, 'Files', filesProblem(plugin) || fileIssues[0] || '', `${generated.length} written files${plugin.output === 'brief' ? ` plus the ${BRIEF_KIT.length}-file page kit` : ''}.`);
  check(checks, errors, 'Links', linksProblem(body, plugin.plan, plugin.output), 'SKILL.md points Claude to every reference, and every link resolves.');
  check(checks, errors, 'Settings', settingsProblem(plugin), plugin.cadence && plugin.cadence !== 'on_request' ? 'Scope, output and the scheduled run are set.' : 'Scope and output are set.');
  check(checks, errors, 'Backstory tools', unknown.length ? `These are not Backstory MCP tools: ${unknown.join(', ')}.` : known.length ? '' : 'The plugin never calls a Backstory MCP tool.', `Uses ${known.length} real Backstory tool${known.length === 1 ? '' : 's'}.`);
  check(checks, errors, 'Tool order', sequenceProblem(toolsNamedIn(body), body), 'Looks records up first and confirms lists before pulling them.');
  check(checks, errors, 'Missing data', fileProblems('SKILL.md', body).find((problem) => problem.includes('no data')) || '', 'Says what to do when data is missing.');
  check(checks, errors, 'Wording', wording ? `${wording[0]}: ${wording[1]}` : '', 'Describes Backstory accurately.');

  return { valid: errors.length === 0, errors: [...new Set(errors)], checks, tools: known };
}
