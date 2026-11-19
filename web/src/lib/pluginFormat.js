import { MCP_TOOLS } from '../data/mcpTools.js';
import { AVOIDED_TOOLS, TOOL_GAPS, TOOL_INVENTORY, TOOL_INVENTORY_REVIEWED, VERIFY_STEPS } from '../data/toolInventory.js';
import { nameProblem, sequenceProblem, slugifySkillName, toolsNamedIn, wordingProblem } from './skillFormat.js';

// The plugin and skill contract for the Skill Builder, shared by the server (which
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
// Where it runs. Claude: a Claude plugin (.claude-plugin/plugin.json, README,
// one skill folder). ChatGPT: a ChatGPT skill, the skill folder on its own,
// as OpenAI's skill-creator describes it: SKILL.md with only name and
// description in its frontmatter, agents/openai.yaml, and only the files the
// agent needs (no README, no rubric, no test files).
export const PLATFORMS = ['claude', 'chatgpt'];
export const PLATFORM_LABEL = { claude: 'Claude', chatgpt: 'ChatGPT' };
export const BACKSTORY_MCP_URL = 'https://mcp.backstory.ai/mcp';
export const BUILDER_NAME = 'Backstory Skill Builder';
const isChatGpt = (plugin) => plugin?.platform === 'chatgpt';
// Kit files a ChatGPT skill leaves out: sample data is for people testing, not for the agent.
const CHATGPT_SKIPS = new Set(['examples/sample-data.json']);
const isTestPath = (path) => /^scripts\/test_[a-z0-9_]+\.py$/.test(path);

/** Where SKILL.md sits in the download: inside the plugin's skill folder for Claude, at the top for ChatGPT. */
export const skillMdPath = (plugin) => (isChatGpt(plugin) ? 'SKILL.md' : `skills/${plugin.name}/SKILL.md`);
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
// Written by code from src/data/toolInventory.js, never by the model.
export const TOOL_INVENTORY_PATH = 'references/tool-inventory.md';
// The two scripts every brief has, in Studio's reference architecture.
export const BRIEF_SCRIPTS = ['population', 'assemble'];
const DISPLAY_DATE = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}, \d{4}\b/;

const TOOL_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
const XML_TAG = /<[^>]+>/;
const GENERATED_PATH = /^(?:SKILL\.md|references\/[a-z0-9]+(?:-[a-z0-9]+)*\.md|evals\/rubric\.md|scripts\/[a-z][a-z0-9_]*\.py)$/;
// Python a generated script may not import: no network, no processes, no shell.
const FORBIDDEN_IMPORT = /^\s*(?:import|from)\s+(?:subprocess|socket|urllib|http|requests|ftplib|smtplib|ctypes|multiprocessing|asyncio|shutil|pty)\b/m;
export const MAX_SCRIPTS = 2;
export const scriptFiles = (name) => ({ script: `scripts/${name}.py`, test: `scripts/test_${name}.py` });
/** The scripts a plugin generates, from its plan: [{ name, script, test, purpose }]. */
export const pluginScripts = (plugin) => (plugin.plan || [])
  .filter((item) => item.kind === 'script')
  .map((item) => ({ name: item.script.name, ...scriptFiles(item.script.name), purpose: item.purpose }));
const isMarkdown = (path) => path.endsWith('.md');
const MENTIONED_PATH = /\b(?:references|evals|scripts|assets|examples)\/[A-Za-z0-9._-]+\.[a-z]+\b/g;
const CRON = /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/;
const SKILL_MD_MAX_BYTES = 20000;
const RUBRIC = 'evals/rubric.md';

export const slugifyPluginName = (raw) => slugifySkillName(raw).replace(/^backstory-skill$/, 'backstory-plugin');

/** A ChatGPT skill name: lowercase, hyphenated, and without the word "skill" (OpenAI's naming rule). */
export function chatGptSkillName(raw) {
  const name = slugifySkillName(raw).split('-').filter((part) => part && part !== 'skill' && part !== 'skills').join('-');
  return name || 'backstory-brief';
}

function chatGptNameProblem(name) {
  const problem = nameProblem(name);
  if (problem) return problem;
  if (String(name).split('-').some((part) => part === 'skill' || part === 'skills')) return 'A ChatGPT skill name must not include the word "skill".';
  return '';
}

export const isGeneratedPath = (path) => GENERATED_PATH.test(path) && !KIT_PATHS.has(path) && path !== TOOL_INVENTORY_PATH;

/** Every file in the download, relative to its top folder, in display order. */
export function pluginPaths(plugin) {
  const generated = [...(plugin.plan || []).map((item) => item.path).filter((path) => path !== 'SKILL.md'), TOOL_INVENTORY_PATH];
  const kit = plugin.output === 'brief' ? BRIEF_KIT.map((item) => item.path) : [];
  if (isChatGpt(plugin)) {
    const files = [...generated, ...kit].filter((path) => !isTestPath(path) && !CHATGPT_SKIPS.has(path) && path !== 'evals/rubric.md');
    return ['SKILL.md', 'agents/openai.yaml', 'settings.json', ...files.sort()];
  }
  // The rubric sits beside the skill, not in it: an agent reading a test
  // scenario inside the skill can take it for an instruction.
  const skill = `skills/${plugin.name}`;
  return [
    '.claude-plugin/plugin.json',
    'README.md',
    ...(generated.includes(RUBRIC) ? [RUBRIC] : []),
    `${skill}/SKILL.md`,
    `${skill}/settings.json`,
    ...[...generated.filter((path) => path !== RUBRIC), ...kit].sort().map((path) => `${skill}/${path}`),
  ];
}

export function composePluginJson(plugin) {
  return `${JSON.stringify({
    name: plugin.name,
    version: plugin.version || INITIAL_VERSION,
    description: clean(plugin.pluginDescription),
    author: { name: BUILDER_NAME },
  }, null, 2)}\n`;
}

/** ChatGPT's SKILL.md frontmatter holds name and description only, nothing else. */
export function composeChatGptSkillMd({ name, description, body }) {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(clean(description))}\n---\n\n${String(body || '').trim()}\n`;
}

export function composePluginSkillMd({ name, description, version, body }) {
  // A double-quoted JSON string is a valid YAML scalar, so colons and quotes in
  // the description can't break the frontmatter.
  return `---\nname: ${name}\ndescription: ${JSON.stringify(clean(description))}\nmetadata:\n  version: ${JSON.stringify(version || INITIAL_VERSION)}\n---\n\n${String(body || '').trim()}\n`;
}

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const yamlString = (value) => JSON.stringify(clean(value));

// openai.yaml's short_description is 25-64 characters: the first of the
// summary, question or description that fits whole, else the question cut at a word.
function shortDescription(plugin) {
  const candidates = [plugin.summary, plugin.question, plugin.pluginDescription].map(clean).filter(Boolean);
  const fits = candidates.find((text) => text.length >= 25 && text.length <= 64);
  if (fits) return fits;
  const text = candidates[0] || clean(plugin.title);
  if (text.length < 25) return `${text} with Backstory data`.slice(0, 64);
  const words = text.slice(0, 63).split(' ');
  words.pop();
  return `${words.join(' ').replace(/[,;:]+$/, '')}…`;
}

// The default prompt names the skill as $name, once.
function defaultPrompt(plugin) {
  const tag = `$${plugin.name}`;
  const first = clean((plugin.testPrompts || [])[0] || `Run ${plugin.title || plugin.name}`).replace(/[.\s]+$/, '');
  if (first.includes(tag)) return `${first}.`;
  return `Use ${tag} to ${first.charAt(0).toLowerCase()}${first.slice(1)}.`;
}

/**
 * agents/openai.yaml, per OpenAI's skill-creator: every string quoted, a
 * 25-64 character short description, a default prompt that names the skill
 * as $name, and the Backstory MCP declared as a dependency. The connection
 * itself is made in ChatGPT; this only declares it.
 */
export function composeOpenAiYaml(plugin) {
  return [
    'interface:',
    `  display_name: ${yamlString(plugin.title || plugin.name)}`,
    `  short_description: ${yamlString(shortDescription(plugin))}`,
    `  default_prompt: ${yamlString(defaultPrompt(plugin))}`,
    '',
    'dependencies:',
    '  tools:',
    '    - type: "mcp"',
    '      value: "backstory"',
    '      description: "Backstory MCP: read-only account, opportunity and activity data"',
    '      transport: "streamable_http"',
    `      url: "${BACKSTORY_MCP_URL}"`,
    '',
  ].join('\n');
}

function describeFile(plugin, path) {
  const kit = BRIEF_KIT.find((item) => item.path === path);
  if (kit) return kit.about;
  if (path === 'SKILL.md') return `the workflow ${isChatGpt(plugin) ? 'ChatGPT' : 'Claude'} follows`;
  if (path === 'agents/openai.yaml') return 'how ChatGPT shows the skill, and that it needs Backstory';
  if (path === TOOL_INVENTORY_PATH) return 'the Backstory tools it uses: parameters, behaviours, last verified';
  if (path === 'settings.json') return 'scope, thresholds, output and schedule';
  return (plugin.plan || []).find((item) => item.path === path)?.purpose || '';
}

function tree(plugin) {
  const prefix = `skills/${plugin.name}/`;
  const skillFiles = pluginPaths(plugin).filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length));
  const width = Math.max(...skillFiles.map((path) => path.length)) + 6;
  const hasRubric = pluginPaths(plugin).includes(RUBRIC);
  const lines = [`${plugin.name}/`, '├── .claude-plugin/plugin.json', '├── README.md'];
  if (hasRubric) lines.push(`${'├── evals/rubric.md'.padEnd(width + 8)}# how to judge a run (kept outside the skill)`);
  lines.push(`└── skills/${plugin.name}/`);
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
    ...testPlanMarkdown(plugin),
    ...readmeTail(plugin, skillDir, brief),
  ];
  return lines.filter((line) => line !== false && line !== undefined && line !== null).join('\n');
}

/**
 * Studio's six test levels for this skill, each a gate, written from its own
 * fields and tools: level 1 is what the builder already ran; the rest need the
 * person's tenant, data and reviewers. Shared by the README and the page.
 */
export function testPlan(plugin) {
  const chatgpt = isChatGpt(plugin);
  const brief = plugin.output === 'brief';
  const fields = Object.entries(plugin.settings?.fields || {})
    .filter(([key, value]) => !key.startsWith('_') && value && Array.isArray(value.names))
    .map(([key, value]) => `${value.names.join(' / ')}${value.required ? ' (key)' : ''}`);
  const tools = (plugin.tools || []).map((tool) => `\`${tool}\``).join(', ');
  const scripts = pluginScripts(plugin);
  return [
    {
      level: 1,
      title: 'Package and build',
      who: 'Done by the Skill Builder before download',
      items: [
        scripts.length ? `Each script's tests passed in Python${chatgpt ? '' : '; re-run them after any change with the commands under Testing'}.` : 'The format, links and tool checks passed.',
        brief && 'The page kit builds the sample page from its fixed, fingerprinted template.',
      ].filter(Boolean),
    },
    {
      level: 2,
      title: 'Real tool output',
      who: 'You, on saved samples',
      items: [
        'Save one real fetch_records result and one activity call, with customer names and emails removed.',
        scripts.some((item) => item.name === 'population') ? 'Run population.py on the saved records and check it keeps the records you expect: Backstory returns dates as display text ("Nov 28, 2026").' : 'Check the skill reads them as expected: Backstory returns dates as display text ("Nov 28, 2026").',
        'A fetch where nothing survives must stop the run, never publish an empty result.',
      ],
    },
    {
      level: 3,
      title: 'Canaries in your tenant',
      who: 'Whoever has access to the tenant, before any run on real data',
      items: [
        ...(fields.length ? fields.map((field) => `${field}: mapped and Ready in Backstory, known to record search by that exact name, and returned with values on a small fetch.`) : ['Each CRM field the skill reads: mapped, known to record search by exact name, and returned with values.']),
        tools && `${tools} each answer on this tenant (no 403) with the parameters the skill passes.`,
        'Preview and fetch apply the filter plan you asked for.',
        'The person who will run it sees the whole population (counts match your own).',
        'Code execution works.',
        brief && (chatgpt ? 'The brief downloads as an HTML file and opens.' : 'Publishing updates the same page by its link.'),
        plugin.cadence && plugin.cadence !== 'on_request' && (chatgpt ? 'A scheduled task can be created in ChatGPT.' : 'A scheduled task can be created where you run Claude.'),
      ].filter(Boolean),
    },
    {
      level: 4,
      title: 'Staged runs',
      who: 'Tenant tester',
      items: [
        `Run it in test-run mode${brief && !chatgpt ? ' (a new page, never the shared one)' : ''}: 2 to 5 items, then about 20, then the full population.`,
        'At each stage record what was fetched, kept and dropped (by reason), the fallbacks used, the spread of levels, and the time and tokens it took.',
      ],
    },
    {
      level: 5,
      title: 'Output quality',
      who: 'You plus a second reviewer',
      items: [
        chatgpt ? 'Judge the run: every finding cites dated evidence, nothing is invented, no emails or phone numbers.' : 'Score the run against evals/rubric.md: every gate criterion at full marks.',
        'Spot-check the top 10 against the source activity: every name, date and figure.',
        'Run the same data twice: outcomes for the same items must match.',
        'A second reviewer (a person, or a fresh session with only the skill and the run) tries to break it.',
      ],
    },
    {
      level: 6,
      title: 'Acceptance',
      who: 'The owner',
      items: [
        'Reconcile the population and totals with your own report, or explain the differences.',
        plugin.cadence && plugin.cadence !== 'on_request' && 'The first scheduled run completes.',
        'The owner confirms it answers the question, and names who runs it and who reads it.',
      ].filter(Boolean),
    },
  ];
}

function testPlanMarkdown(plugin) {
  return [
    '## Before you rely on it',
    '',
    'Six levels, in order; each is a gate. Don\'t start a level until the one before has passed, and re-run from the lowest level a change touches.',
    '',
    ...testPlan(plugin).flatMap((level) => [
      `${level.level}. **${level.title}** (${level.who.toLowerCase()})`,
      ...level.items.map((item) => `   - ${item}`),
    ]),
    '',
  ];
}

function readmeTail(plugin, skillDir, brief) {
  return [
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
    ...(pluginScripts(plugin).length ? [
      'To test the scripts after any change (standard library only, Python 3.8+):',
      '',
      '```bash',
      ...pluginScripts(plugin).map((item) => `python3 ${skillDir}/${item.test}`),
      '```',
      '',
    ] : []),
    `Judge a few runs against \`${RUBRIC}\` before you rely on it, and again after any change to the instructions. It sits outside the skill folder so a run never reads it as instructions.`,
    '',
  ];
}

/** Every file of the plugin keyed by its path inside the plugin folder. `kit` maps brief-kit paths to their contents. */
export function pluginFiles(plugin, kit = {}) {
  if (isChatGpt(plugin)) return chatGptSkillFiles(plugin, kit);
  const skill = `skills/${plugin.name}`;
  const files = {
    '.claude-plugin/plugin.json': composePluginJson(plugin),
    'README.md': composeReadme(plugin),
    [`${skill}/SKILL.md`]: composePluginSkillMd({ name: plugin.name, description: plugin.skillDescription, version: plugin.version, body: plugin.files?.['SKILL.md'] }),
    [`${skill}/settings.json`]: `${JSON.stringify(plugin.settings || {}, null, 2)}\n`,
  };
  for (const item of plugin.plan || []) {
    if (item.path !== 'SKILL.md') files[item.path === RUBRIC ? RUBRIC : `${skill}/${item.path}`] = `${String(plugin.files?.[item.path] || '').trim()}\n`;
  }
  if (plugin.output === 'brief') {
    for (const { path } of BRIEF_KIT) if (kit[path] !== undefined) files[`${skill}/${path}`] = kit[path];
  }
  files[`${skill}/${TOOL_INVENTORY_PATH}`] = composeToolInventory(plugin);
  return files;
}

/** The skill's own copy of the tool inventory: the rows for the tools it uses, dated, with how to re-verify them. */
export function composeToolInventory(plugin) {
  const used = new Set([...(plugin.tools || []), ...toolsNamedIn(String(plugin.files?.['SKILL.md'] || ''))]);
  const rows = TOOL_INVENTORY.filter((tool) => used.has(tool.name));
  const cell = (text) => String(text || '—').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  return [
    '# Backstory tool inventory',
    '',
    `The Backstory connector tools this skill uses: what each is for, the parameters that matter, and how each behaves in practice. From Backstory Studio's inventory, last full review ${TOOL_INVENTORY_REVIEWED}. **The connector evolves:** at the start of each run, re-read each tool's current description, and report any difference first (a parameter, a limit, a 403), following the fallback the skill gives for it.`,
    '',
    '| Tool | Used for | Parameters that matter | Behaviours to design around | Last verified |',
    '|---|---|---|---|---|',
    ...rows.map((tool) => `| \`${tool.name}\` | ${cell(tool.useFor)} | ${cell(tool.params)} | ${cell(tool.behaviours)} | ${cell(tool.verified)} |`),
    '',
    '## How to verify a tool',
    '',
    ...VERIFY_STEPS.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Known gaps',
    '',
    'What the connector can\'t do today, so the skill never relies on it:',
    '',
    ...TOOL_GAPS.map((gap) => `- ${gap}`),
    '',
  ].join('\n');
}

/** A ChatGPT skill: the skill folder's files, keyed by their path inside it, in the order pluginPaths lists them. */
function chatGptSkillFiles(plugin, kit) {
  const all = {
    'SKILL.md': composeChatGptSkillMd({ name: plugin.name, description: plugin.skillDescription, body: plugin.files?.['SKILL.md'] }),
    'agents/openai.yaml': composeOpenAiYaml(plugin),
    'settings.json': `${JSON.stringify(plugin.settings || {}, null, 2)}\n`,
  };
  for (const item of plugin.plan || []) {
    if (item.path !== 'SKILL.md') all[item.path] = `${String(plugin.files?.[item.path] || '').trim()}\n`;
  }
  if (plugin.output === 'brief') for (const { path } of BRIEF_KIT) if (kit[path] !== undefined) all[path] = kit[path];
  all[TOOL_INVENTORY_PATH] = composeToolInventory(plugin);
  return Object.fromEntries(pluginPaths(plugin).filter((path) => all[path] !== undefined).map((path) => [path, all[path]]));
}

const PLACEHOLDER = /^\s*(?:\{[^{}]+\}|<[^<>]+>|TBD|TODO)\s*$/i;

/** Whether a dotted path ("scope.teamOwners") exists in settings, even with a null value. */
export function settingsPathExists(settings, key) {
  let node = settings;
  for (const part of String(key || '').split('.')) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.prototype.hasOwnProperty.call(node, part)) return false;
    node = node[part];
  }
  return true;
}

/**
 * Problems a run would hit on its first try because of settings.json itself:
 * a {placeholder} value (which a script takes literally, so every record is
 * filtered out) and CRM fields without a list of names to try.
 */
export function settingsShapeProblems(settings) {
  const problems = [];
  const placeholders = [];
  const walk = (value, path) => {
    if (typeof value === 'string' && PLACEHOLDER.test(value)) placeholders.push(path);
    else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => !key.startsWith('_') && walk(item, path ? `${path}.${key}` : key));
  };
  walk(settings, '');
  if (placeholders.length) problems.push(`These settings are placeholders a run would use literally: ${placeholders.slice(0, 6).join(', ')}. Use null and say in the note what a run does when it's null.`);
  const fields = settings?.fields;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    const bad = Object.entries(fields)
      .filter(([key]) => !key.startsWith('_'))
      .filter(([, value]) => !(value && Array.isArray(value.names) && value.names.length && value.names.every((name) => typeof name === 'string' && name.trim()) && typeof value.required === 'boolean'))
      .map(([key]) => `fields.${key}`);
    if (bad.length) problems.push(`Each CRM field setting needs {"names": [field name, then fallbacks], "required": true or false}: ${bad.join(', ')}.`);
  }
  return problems;
}

/** Backstory tools a reference or rubric may name: the plugin's own tools and any its workflow names. */
function allowedTools(blueprint) {
  return new Set([...(blueprint.tools || []), ...toolsNamedIn((blueprint.workflow || []).join('\n'))]);
}

function unknownTools(text) {
  return toolsNamedIn(text).filter((tool) => !TOOL_BY_NAME.has(tool));
}

/** Problems with one generated file, used by the server to repair it before it reaches the page. With the blueprint, SKILL.md's links and build step are checked too. */
export function fileProblems(path, content, blueprint) {
  const text = String(content || '');
  const problems = [];
  if (!text.trim()) return ['The file is empty.'];
  if (path.endsWith('.py')) return pythonProblems(path, text);
  const lines = text.split('\n').length;
  if (lines > PLUGIN_LIMITS.fileMaxLines) problems.push(`The file runs ${lines} lines; keep it under ${PLUGIN_LIMITS.fileMaxLines}.`);
  if (/^\s*---\n/.test(text) && path === 'SKILL.md') problems.push('Leave out the frontmatter; it is added for you.');
  const unknown = unknownTools(text);
  if (unknown.length) problems.push(`These are not Backstory MCP tools: ${unknown.join(', ')}.`);
  const wording = wordingProblem(text);
  if (wording) problems.push(wording);
  if (path === 'SKILL.md') {
    // Claude re-attaches a skill truncated to 20,000 characters after compaction.
    if (new TextEncoder().encode(text).length >= SKILL_MD_MAX_BYTES) problems.push(`SKILL.md is over ${SKILL_MD_MAX_BYTES.toLocaleString('en-US')} bytes; move detail into the references.`);
    if (blueprint && !/^#{2,3}\s*red flags\b/im.test(text)) problems.push('SKILL.md needs a "## Red flags" table of the shortcuts a run is tempted to take, each with what to do instead.');
    if (!/^#{2,3} .*\b(?:workflow|steps)\b/im.test(text) && !/^\d+\.\s+\S/m.test(text)) problems.push('SKILL.md needs a workflow of numbered steps Claude can follow.');
    if (!/\b(?:missing|no data|not found|isn't|doesn't have|does not have|comes back empty|unavailable|unknown)\b/i.test(text)) problems.push('SKILL.md must say what to do when Backstory has no data, so Claude does not fill the gap by guessing.');
    if (blueprint) {
      const links = linksProblem(text, blueprint.plan, blueprint.output);
      if (links) problems.push(links);
    }
  }
  if (path === 'evals/rubric.md' && !/\bgate\b/i.test(text)) problems.push('The rubric must mark the criteria a run has to pass (gates).');
  if (blueprint?.platform === 'chatgpt') {
    if (/\bClaude\b|\bplugins?\b/i.test(text)) problems.push('This is a ChatGPT skill: never mention Claude or a plugin; say ChatGPT, or "the skill".');
    problems.push(...chatGptStyleProblems(path, text));
  }
  if (blueprint && path !== 'SKILL.md') {
    const allowed = allowedTools(blueprint);
    const extra = toolsNamedIn(text).filter((tool) => TOOL_BY_NAME.has(tool) && !allowed.has(tool));
    if (extra.length) problems.push(`It names Backstory tools the plugin doesn't use: ${extra.join(', ')}. Leave them out entirely, even to rule them out, so the files agree on what a run calls.`);
  }
  return problems;
}

// What can be checked without running Python; the page runs the tests.
function pythonProblems(path, text) {
  const problems = [];
  if (/^\s*```/.test(text)) problems.push('Reply with the Python only, with no code fence.');
  if (FORBIDDEN_IMPORT.test(text)) problems.push('Scripts use the standard library for data only: no network, subprocess, shell or file-system tools.');
  const name = path.replace(/^scripts\/(?:test_)?/, '').replace(/\.py$/, '');
  if (path.startsWith('scripts/test_')) {
    if (!/^\s*import unittest\b/m.test(text)) problems.push('The test must use unittest.');
    if (!new RegExp(`\\b(?:from ${name} import|import ${name}\\b)`).test(text)) problems.push(`The test must import ${name}.`);
    if (!/unittest\.main\(/.test(text)) problems.push('The test must end with unittest.main() so it runs from the command line.');
    if (name === 'population' && !DISPLAY_DATE.test(text)) problems.push('The population tests must include a record dated the way Backstory returns dates ("Nov 28, 2026"): a script that only reads ISO dates drops every record.');
  } else {
    if (!/^def run\(\s*data\b[^)]*\bsettings\b[^)]*\bas_of\b/m.test(text)) problems.push('The script must define run(data, settings, as_of) at the top level.');
    if (!/^def main\(/m.test(text)) problems.push('The script must define main(argv) for the command line.');
    if (!/__name__\s*==\s*["']__main__["']/.test(text)) problems.push('The script must call main() under if __name__ == "__main__".');
  }
  return problems;
}

// OpenAI's skill-creator: no "When to use" section in SKILL.md (the
// description carries it), and a reference past 100 lines opens with contents.
function chatGptStyleProblems(path, text) {
  const problems = [];
  if (path === 'SKILL.md' && /^#{1,4}\s*when to use\b/im.test(text)) problems.push('Leave out the "When to use" section: in a ChatGPT skill that belongs only in the description.');
  if (path.startsWith('references/') && text.split('\n').length > 100 && !/^#{1,3}\s*(?:table of )?contents\b/im.test(text.split('\n').slice(0, 25).join('\n'))) {
    problems.push('This reference runs past 100 lines: open it with a "## Contents" list of its sections.');
  }
  return problems;
}

/**
 * What Backstory Studio's method requires that code can check: a brief has
 * the population and assemble scripts, a count check and a calibration
 * spread in settings, and population tests with Backstory's display dates;
 * no skill plans a tool Studio has stopped using.
 */
export function studioArchitectureProblems(plugin) {
  const problems = [];
  const avoided = (plugin.tools || []).filter((tool) => AVOIDED_TOOLS.includes(tool));
  if (avoided.length) problems.push(`Don't plan ${avoided.join(', ')}: its results were unreliable in Studio's testing.`);
  if (plugin.output !== 'brief') return problems;
  const scripts = (plugin.plan || []).filter((item) => item.kind === 'script').map((item) => item.script?.name);
  const missing = BRIEF_SCRIPTS.filter((name) => !scripts.includes(name));
  if (missing.length) problems.push(`A brief has exactly two scripts, "population" and "assemble" (Studio's reference architecture); missing: ${missing.join(', ')}.`);
  const settings = plugin.settings || {};
  if (!settingsPathExists(settings, 'thresholds.maxCountChangePct')) problems.push('A brief needs settings.thresholds.maxCountChangePct: the count check that stops a run when the population moves too much from the previous brief.');
  if (!settingsPathExists(settings, 'calibration')) problems.push('A brief needs settings.calibration: the expected spread of levels the assemble script checks each run against.');
  const population = (plugin.plan || []).find((item) => item.kind === 'script' && item.script?.name === 'population');
  if (population && !(population.script.cases || []).some((item) => DISPLAY_DATE.test(item))) problems.push('The population script\'s cases must include a record dated the way Backstory returns dates ("Nov 28, 2026").');
  return problems;
}

function check(checks, errors, name, problem, okDetail) {
  checks.push({ name, passed: !problem, detail: problem || okDetail });
  if (problem) errors.push(problem);
}

export function descriptionProblem(description, chatgpt) {
  const text = clean(description);
  if (!text) return 'The skill needs a description.';
  if (chatgpt && /[<>]/.test(text)) return 'A ChatGPT skill description cannot contain < or >.';
  if (text.length > PLUGIN_LIMITS.skillDescriptionMax) return `The skill description is ${text.length} characters; the limit is ${PLUGIN_LIMITS.skillDescriptionMax}.`;
  if (XML_TAG.test(text)) return 'The skill description cannot contain XML tags.';
  if (!/\buse when\b/i.test(text)) return `The skill description must say when to use it ("Use when…"), or ${chatgpt ? 'ChatGPT' : 'Claude'} will not know when to load it.`;
  // From Superpowers' discovery rules: a description that summarises the
  // workflow gets followed instead of SKILL.md.
  if (/\b(?:then|step|steps|afterwards|after that|followed by)\b/i.test(text)) return 'The skill description must not describe the steps or their order (no "then" or "step"): say what it produces and when to use it, and leave the workflow to SKILL.md.';
  if (text.toLowerCase().indexOf('use when') > 250) return 'Put "Use when…" near the start of the description: at most one short sentence on what it produces comes first.';
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
  const shape = settingsShapeProblems(settings)[0];
  if (shape) return shape;
  const unread = pluginScripts(plugin).flatMap((item) => (plugin.plan.find((entry) => entry.path === item.script)?.script?.settingsKeys || [])
    .filter((key) => !settingsPathExists(settings, key)).map((key) => `${item.script} → ${key}`));
  if (unread.length) return `Scripts read settings that settings.json doesn't have: ${unread.join(', ')}.`;
  return '';
}

// A reference or the rubric that names a tool SKILL.md never calls sends a run
// two ways (one file says call it, another says it's out of scope).
function toolConsistencyProblem(plugin, markdown, body) {
  const used = new Set([...toolsNamedIn(body), ...(plugin.tools || [])]);
  const extra = markdown
    .filter(([path]) => path !== 'SKILL.md')
    .flatMap(([path, content]) => toolsNamedIn(content).filter((tool) => TOOL_BY_NAME.has(tool) && !used.has(tool)).map((tool) => `${tool} (${path})`));
  return extra.length ? `These files name tools the workflow never calls: ${[...new Set(extra)].join(', ')}. Remove them or add the step that calls them.` : '';
}

function filesProblem(plugin) {
  const plan = plugin.plan || [];
  const references = plan.filter((item) => item.path.startsWith('references/'));
  if (!plan.some((item) => item.path === 'SKILL.md')) return 'The plugin has no SKILL.md.';
  if (!isChatGpt(plugin) && !plan.some((item) => item.path === 'evals/rubric.md')) return 'The plugin has no eval rubric.';
  if (references.length < PLUGIN_LIMITS.referencesMin) return `The plugin needs at least ${PLUGIN_LIMITS.referencesMin} reference files.`;
  const bad = plan.find((item) => !isGeneratedPath(item.path));
  if (bad) return `${bad.path} isn't a file the builder can write.`;
  const missing = plan.filter((item) => !String(plugin.files?.[item.path] || '').trim()).map((item) => item.path);
  if (missing.length) return `These files are empty: ${missing.join(', ')}.`;
  return '';
}

function linksProblem(body, plan = [], output) {
  const available = new Set([
    TOOL_INVENTORY_PATH,
    ...plan.map((item) => item.path).filter((path) => path !== RUBRIC),
    ...(output === 'brief' ? BRIEF_KIT.map((item) => item.path) : []),
  ]);
  const broken = [...new Set(String(body).match(MENTIONED_PATH) || [])].filter((path) => !available.has(path));
  if (broken.length) return `SKILL.md points to files the plugin doesn't have: ${broken.join(', ')}.`;
  const unlinked = [...plan.map((item) => item.path), TOOL_INVENTORY_PATH].filter((path) => path.startsWith('references/') && !body.includes(path));
  if (unlinked.length) return `SKILL.md never tells Claude to read ${[...new Set(unlinked)].join(', ')}.`;
  const unrun = plan.filter((item) => item.kind === 'script' && !body.includes(item.path)).map((item) => item.path);
  if (unrun.length) return `SKILL.md never runs ${unrun.join(', ')}.`;
  if (output === 'brief' && !body.includes('build_brief.py')) return 'SKILL.md must build the page with scripts/build_brief.py (python3 <skill>/scripts/build_brief.py data.json brief.html), never by hand.';
  return '';
}

function scriptTestsProblem(plugin, scripts) {
  const failing = scripts.filter((item) => plugin.tests?.[item.name]?.status !== 'passed');
  if (!failing.length) return '';
  return `${failing.map((item) => item.script).join(', ')} ${failing.length === 1 ? "hasn't" : "haven't"} passed ${failing.length === 1 ? 'its' : 'their'} tests.`;
}

function scriptTestsDetail(plugin, scripts) {
  const count = scripts.reduce((sum, item) => sum + (plugin.tests?.[item.name]?.testsRun || 0), 0);
  return `${scripts.length} script${scripts.length === 1 ? '' : 's'} passed ${count} test${count === 1 ? '' : 's'} in Python.`;
}

export function validatePlugin(plugin = {}) {
  const errors = [];
  const checks = [];
  const files = plugin.files || {};
  const generated = Object.entries(files);
  // Python names its own functions, which aren't tool calls; check the Markdown for tools and wording.
  const markdown = generated.filter(([path]) => isMarkdown(path));
  const allText = markdown.map(([, content]) => content).join('\n\n');
  const body = String(files['SKILL.md'] || '');
  const tools = toolsNamedIn(allText);
  const known = tools.filter((tool) => TOOL_BY_NAME.has(tool));
  const unknown = tools.filter((tool) => !TOOL_BY_NAME.has(tool));
  const fileIssues = generated.flatMap(([path, content]) => fileProblems(path, content)
    .filter((problem) => !/Backstory MCP tools|Backstory accurately|"Sales AI"|30 days reliable|no data|points to|never tells|build_brief/.test(problem))
    .map((problem) => `${path}: ${problem}`));
  const wording = markdown.map(([path, content]) => [path, wordingProblem(content)]).find(([, problem]) => problem);
  const scripts = pluginScripts(plugin);

  if (isChatGpt(plugin)) check(checks, errors, 'Skill name', chatGptNameProblem(plugin.name), `${plugin.name}: lowercase and hyphens, under 64 characters.`);
  else check(checks, errors, 'Plugin manifest', manifestProblem(plugin), `${plugin.name} ${plugin.version}, with a description.`);
  check(checks, errors, 'Skill description', descriptionProblem(plugin.skillDescription, isChatGpt(plugin)), `Says what it does and when ${isChatGpt(plugin) ? 'ChatGPT' : 'Claude'} should use it.`);
  check(checks, errors, 'Files', filesProblem(plugin) || fileIssues[0] || '', `${generated.length} written files${plugin.output === 'brief' ? ` plus the ${BRIEF_KIT.length}-file page kit` : ''}.`);
  check(checks, errors, 'Links', linksProblem(body, plugin.plan, plugin.output), 'SKILL.md points Claude to every reference, and every link resolves.');
  check(checks, errors, 'Settings', settingsProblem(plugin), plugin.cadence && plugin.cadence !== 'on_request' ? 'Scope, output and the scheduled run are set.' : 'Scope and output are set.');
  check(checks, errors, 'Backstory tools', unknown.length ? `These are not Backstory MCP tools: ${unknown.join(', ')}.` : known.length ? '' : 'The plugin never calls a Backstory MCP tool.', `Uses ${known.length} real Backstory tool${known.length === 1 ? '' : 's'}.`);
  if (isChatGpt(plugin)) {
    const mentions = markdown.filter(([, content]) => /\bClaude\b|\bplugins?\b/i.test(content)).map(([path]) => path);
    const style = markdown.flatMap(([path, content]) => chatGptStyleProblems(path, content).map((problem) => `${path}: ${problem}`));
    check(checks, errors, 'Written for ChatGPT', mentions.length ? `These files mention Claude or a plugin, but this is a ChatGPT skill: ${mentions.join(', ')}.` : style[0] || '', 'Every file follows the ChatGPT skill rules.');
  }
  check(checks, errors, 'Studio method', studioArchitectureProblems(plugin)[0] || '', plugin.output === 'brief'
    ? 'Population and assemble scripts, a count check, calibration, and display-date tests.'
    : 'Uses only tools Studio builds on.');
  check(checks, errors, 'Tool consistency', toolConsistencyProblem(plugin, markdown, body), 'Every file names only the tools the workflow calls.');
  check(checks, errors, 'Tool order', sequenceProblem(toolsNamedIn(body), body), 'Looks records up first and confirms lists before pulling them.');
  check(checks, errors, 'Missing data', fileProblems('SKILL.md', body).find((problem) => problem.includes('no data')) || '', 'Says what to do when data is missing.');
  check(checks, errors, 'Wording', wording ? `${wording[0]}: ${wording[1]}` : '', 'Describes Backstory accurately.');
  if (scripts.length) check(checks, errors, 'Script tests', scriptTestsProblem(plugin, scripts), scriptTestsDetail(plugin, scripts));

  return { valid: errors.length === 0, errors: [...new Set(errors)], checks, tools: known };
}
