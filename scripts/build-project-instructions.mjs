// Generates the "project" variant of each workflow's orchestrator instructions:
// the same workflow, reframed to run inside a Claude.ai Project or an OpenAI
// Project / Custom GPT, where a person types a request and reads the report in
// the chat instead of a schedule firing and a connector delivering it.
//
// Sibling of build-orchestrator-instructions.mjs, which produces the automated
// workflow variant. Both read the same canonical workflows.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const catalogPath = path.join(repoRoot, 'workflows.json');

const writeText = (target, value) => fs.writeFileSync(target, `${value.trimStart()}\n`);

// ─── Source-shape helpers ──────────────────────────────────────────────────

const stepsOfType = (workflow, ...types) =>
  (workflow.node_flow || []).filter((step) => types.includes(step.type));

const credentialName = (credential) => String(credential).split('—')[0].trim();

const usesBackstory = (workflow) =>
  (workflow.credentials || []).some((c) => /backstory/i.test(c));

const haystack = (workflow) =>
  [workflow.name, workflow.description, workflow.trigger, ...(workflow.configuration || [])]
    .join(' ')
    .toLowerCase();

// Deal-shaped workflows get the opportunity tools, and — in the Gemini variant —
// amount/stage/close-date badges rather than engagement badges.
const isDealShaped = (workflow) =>
  /opportunit|deal|pipeline|forecast|renewal|quota|close/.test(haystack(workflow));

// Catalog copy is written in the third person about an automated run ("Flags
// deals...", "Delivered via Messaging every Monday"). A project instruction is
// addressed to the model in the imperative, and has no delivery step at all, so
// both have to be rewritten rather than quoted verbatim.

const singularize = (verb) => {
  if (/ies$/i.test(verb)) return verb.replace(/ies$/i, 'y');
  // Sibilant stems take -es, so the whole suffix goes: "searches" -> "search",
  // "matches" -> "match". Dropping only the "s" leaves "searche".
  if (/(ss|ch|sh|x)es$/i.test(verb)) return verb.replace(/es$/i, '');
  if (/s$/i.test(verb)) return verb.replace(/s$/i, '');
  return verb;
};

// A Set rather than a /g regex: a global regex carries lastIndex between
// .test() calls and would skip every other match.
const THIRD_PERSON_VERBS = new Set(
  ('identifies analyzes analyses evaluates generates produces scores assesses prioritizes recommends ' +
    'summarizes compares flags creates highlights suggests calculates checks pulls queries fetches reads ' +
    'retrieves normalizes resolves aggregates validates maps splits merges filters routes adapts replays ' +
    'surfaces monitors combines synthesizes sends posts delivers enriches extracts scans tracks applies ' +
    'builds writes records publishes quarantines escalates ranks groups orders verifies confirms detects ' +
    'computes derives joins matches dedupes updates drafts composes formats renders returns provides ' +
    'performs receives explains searches correlates assigns')
    .split(' '),
);

const isThirdPersonVerb = (word) => THIRD_PERSON_VERBS.has(String(word).toLowerCase());

function toImperative(text) {
  if (!text) return '';
  let out = text.trim();
  // Leading verb: "Identifies hygiene issues" -> "Identify hygiene issues"
  out = out.replace(/^([A-Za-z]+)/, (word) => {
    if (!isThirdPersonVerb(word)) return word;
    const singular = singularize(word);
    return singular.charAt(0).toUpperCase() + singular.slice(1);
  });
  // Coordinated verbs: "... and prioritizes by stage" -> "... and prioritize by stage"
  out = out.replace(/\b(and|then)\s+([A-Za-z]+)/gi, (match, joiner, verb) =>
    isThirdPersonVerb(verb) ? `${joiner} ${singularize(verb)}` : match,
  );
  return out;
}

// Drop the sentences that only describe the automated run's schedule or its
// connector delivery — a project has neither.
const DELIVERY_SENTENCE =
  /^(delivered|delivery|alerts? (are|is) sent|briefs? (are|is) delivered|the (scorecard|digest|brief|debrief|report) is delivered)/i;

// "Every Monday, ...", "At 6 AM on weekdays, ...", "On a weekly cadence, ..."
const CADENCE_CLAUSE = /^(every|each|at|on|when)\b[^,]{2,48},\s*/i;

function projectPurpose(workflow) {
  return (workflow.description || '')
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((sentence) => {
      if (DELIVERY_SENTENCE.test(sentence)) return false;
      return !/\b(deliver(ed|s)?|sent|posts?|posted)\b[^.]*\b(via|to)\b[^.]*\b(messaging|slack|teams|email|smtp|channel|inbox)\b/i.test(
        sentence,
      );
    })
    .map((sentence) => {
      const trimmed = sentence.replace(CADENCE_CLAUSE, '');
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .join(' ')
    .replace(/\bthe workflow\b/gi, 'this project')
    .replace(/\buses the LLM to\b/gi, 'uses AI to')
    .replace(/\bpasses (it|them|the data) to the LLM to\b/gi, 'then')
    // Re-capitalize last: the substitutions above can leave a lowercase word at
    // the head of a sentence whose original opener was stripped.
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, lead, letter) => `${lead}${letter.toUpperCase()}`)
    // "Provides coaching insights..." reads as an orphaned third-person clause
    // after "You are the X Agent." Turn it into second person.
    .replace(/^([A-Za-z]+)/, (word) =>
      isThirdPersonVerb(word) ? `You ${singularize(word).toLowerCase()}` : word,
    )
    .trim();
}

// A project has no scheduler and no delivery connector, so the credentials list
// has to be rewritten: the model itself replaces the LLM API, the chat replaces
// the messaging surface, and systems we can no longer call become paste-ins.
const DROPPED_CREDENTIAL = /^(llm api|optional llm api)/i;
const DELIVERY_CREDENTIAL = /^(messaging|slack|email|smtp|project management|delivery|fallback sink|messaging or work-management surface)/i;

function pasteInSources(workflow) {
  return (workflow.credentials || [])
    .map(credentialName)
    .filter((name) => !DROPPED_CREDENTIAL.test(name) && !DELIVERY_CREDENTIAL.test(name) && !/backstory/i.test(name));
}

// ─── What the person types ─────────────────────────────────────────────────

// The scheduled/webhook trigger becomes a typed request. Most workflows key off
// an account; these are the ones where that would be the wrong prompt.
const INPUT_OVERRIDES = {
  '01-sales-digest': 'a rep name (or "me") and the accounts they own',
  '02-meeting-brief': 'the account name and who you are meeting',
  '05-forecast-coach': 'a sales leader or team name, or a list of their open deals',
  '06-executive-inbox': 'the unread messages to triage',
  '10-activity-gap-detector': 'a team or a list of rep names',
  '11-deal-hygiene-audit': 'a rep name, a team, or a list of account names',
  '12-win-loss-debrief': 'the account or deal that closed, and whether it was won or lost',
  '14-territory-heat-map': 'a rep name or the list of accounts in the territory',
  '15-qbr-auto-prep': 'the account name and which quarter the QBR covers',
  '17-marketing-sales-handoff-scorer': 'the new lead — name, title, company, and how they came in',
  '18-channel-pulse': 'an account name and how many days back to look',
  '20-crm-signal-normalizer': 'a sample of the CRM records to normalize',
  '21-meeting-intelligence-normalizer': 'a meeting or transcript payload',
  '22-multi-channel-delivery-router': 'the insight payload plus who it is for',
  '23-identity-resolution-hub': 'the identity records to resolve',
  '24-workflow-contract-validator': 'the payload plus the contract it is supposed to satisfy',
  '27-adapter-regression-monitor': 'the golden case plus the actual adapter output',
  '32-revenue-orchestration': 'the revenue signal plus the account it relates to',
  '34-manager-coaching-brief': 'the rep name plus the account or deal to coach on',
  '35-grounded-follow-up': 'the account or deal, what you want to send, and who it goes to',
};

// Platform-enablement workflows are intake-driven rather than account-driven.
const INTAKE_CATEGORIES = new Set(['platform-enablement']);

function inputHint(workflow) {
  if (INPUT_OVERRIDES[workflow.id]) return INPUT_OVERRIDES[workflow.id];
  if (INTAKE_CATEGORIES.has(workflow.category)) return 'the intake details for the request';
  const text = haystack(workflow);
  if (/\brenewal\b/.test(text)) return 'an account name and its renewal date';
  if (/opportunit|deal|pipeline/.test(text)) return 'an account name, or a specific opportunity';
  return 'one or more account names';
}

// ─── Backstory MCP tool selection ──────────────────────────────────────────

const TOOL_NOTES = {
  find_account: 'resolve each name to a Backstory account',
  get_account_status: 'open risks, next steps, and live topics',
  get_opportunity_status: 'stage, close date, amount, and deal health',
  get_recent_account_activity: 'recent meetings, emails, and who was on them',
  get_recent_opportunity_activity: 'deal-level activity and last touch',
  get_engaged_people: 'stakeholders, seniority, and engagement volume',
  get_scorecard: 'scored engagement and coverage signals',
};

function mcpTools(workflow) {
  if (!usesBackstory(workflow)) return [];
  const text = haystack(workflow);
  const tools = ['find_account', 'get_account_status'];
  const dealShaped = isDealShaped(workflow);
  if (dealShaped) tools.push('get_opportunity_status');
  tools.push('get_recent_account_activity');
  if (dealShaped) tools.push('get_recent_opportunity_activity');
  if (/stakeholder|contact|exec|sponsor|champion|thread|relationship|people|engag/.test(text)) {
    tools.push('get_engaged_people');
  }
  if (/score|health|benchmark|grade|risk/.test(text)) tools.push('get_scorecard');
  return [...new Set(tools)];
}

function askTool(workflow) {
  return /opportunit|deal|pipeline|forecast|renewal|close/.test(haystack(workflow))
    ? 'ask_sales_ai_about_opportunity'
    : 'ask_sales_ai_about_account';
}

// The AI step's own description is the best available statement of what this
// workflow is actually reasoning about, so it becomes the analysis instruction.
function analysisQuestion(workflow) {
  const ai = stepsOfType(workflow, 'ai')[0];
  const raw = (ai?.description || '').replace(/^AI Agent\s*/i, '').trim();
  if (!raw) return 'Identify what matters most here and what the owner should do next.';
  const imperative = toImperative(raw);
  return imperative.charAt(0).toUpperCase() + imperative.slice(1);
}

// ─── Section builders ──────────────────────────────────────────────────────

// Data steps split into two kinds. Retrieval steps ("Queries CRM for...", "Pulls
// Backstory data on...") are already covered by the tool list or the pasted
// intake, so repeating them just contradicts step 1. Derivation steps
// ("Benchmark Analysis", "Identify Unmatched Accounts") describe work the
// automated version does in code and a project has to do in reasoning.
const isRetrievalStep = (step) =>
  /^(quer|pull|fetch|read|retriev|receiv|load|gather|enrich|collect)/i.test(step.description || '') ||
  /\bpulls? (backstory|crm)\b/i.test(step.description || '');

const derivationSteps = (workflow) =>
  stepsOfType(workflow, 'data').filter((step) => !isRetrievalStep(step));

function processSection(workflow) {
  const lines = [];
  let n = 1;
  const tools = mcpTools(workflow);

  if (tools.length) {
    lines.push(
      `${n++}. **Resolve what you were given** — run \`find_account\` for every account or company named. If the request names a rep, team, or territory instead, ask which accounts that covers unless the user already pasted a list. If a name does not resolve, say so instead of guessing.`,
    );
    lines.push(`${n++}. **Gather the evidence in parallel:**`);
    for (const tool of tools.filter((t) => t !== 'find_account')) {
      lines.push(`   - \`${tool}\` — ${TOOL_NOTES[tool]}`);
    }
    lines.push(`   - \`${askTool(workflow)}\` — "${analysisQuestion(workflow)}"`);
  } else {
    lines.push(`${n++}. **Read the intake** the user pasted in. List anything required that is missing before you analyze.`);
  }

  for (const step of derivationSteps(workflow)) {
    lines.push(`${n++}. **${step.name}** — ${toImperative(step.description)}`);
  }

  lines.push(`${n++}. **Analyze** — ${analysisQuestion(workflow)}`);
  lines.push(
    `${n++}. **Render the report as a single HTML document** in this chat, following the Output Format section below. You have no connectors — never try to send, post, email, or schedule anything. The user takes the rendered report wherever it needs to go.`,
  );
  return lines.join('\n');
}

function rulesSection(workflow) {
  const rules = [];
  if (usesBackstory(workflow)) {
    rules.push('Use ONLY verified data from Backstory MCP or what the user pasted in — never invent an account name, date, amount, or person');
  } else {
    rules.push('Use ONLY what the user pasted in — never invent a field, record, or system detail');
  }
  rules.push('Cite the evidence behind every finding: the date, the field, the person, or the record it came from');
  rules.push('If a record is incomplete, say which check you could not run rather than assuming it passed');
  rules.push('Mark anything uncertain as `(low confidence)` and say what would confirm it');
  rules.push(
    usesBackstory(workflow)
      ? 'Every recommended action names a specific person and is doable this week'
      : 'Every recommended action names the specific field, record, or system to change',
  );
  rules.push('Rank ruthlessly — lead with what matters most, and summarize the long tail as a count');
  rules.push('Always answer with the HTML document described in Output Format — never a plain-text or markdown summary');

  const pasteIns = pasteInSources(workflow);
  if (pasteIns.length) {
    rules.push(
      `This project has no connection to ${pasteIns.join(', ')} — ask the user to paste or upload an export when you need that data`,
    );
  }
  return rules.map((r) => `- ${r}`).join('\n');
}

function integrationsSection(workflow) {
  const lines = [];
  if (usesBackstory(workflow)) {
    lines.push('- **Backstory MCP** — for account, opportunity, activity, and stakeholder data');
  }
  const pasteIns = pasteInSources(workflow);
  if (pasteIns.length) {
    lines.push(`- **Pasted or uploaded by the user** — ${pasteIns.join(', ')}`);
  }
  if (!lines.length) lines.push('- None. Everything this project needs is pasted in by the user.');
  return lines.join('\n');
}

function configurationSection(workflow) {
  const items = (workflow.configuration || []).filter(Boolean);
  if (!items.length) return '';
  return `\n## Settings You Can Change\n\nTell the project to override any of these at the start of a request:\n\n${items
    .map((item) => `- ${item}`)
    .join('\n')}\n`;
}

// Every template renders as HTML. Plain-text and markdown replies read badly
// for these reports — the grouping, severity, and evidence hierarchy only land
// when they are actually laid out — so the spec is mandatory, not a suggestion.
function outputFormatSection(workflow) {
  const content = workflow.sample_output?.content;
  const reference = content
    ? `\n### Content Reference\n\nThe rendered report must carry at least the information in this reference. Treat it as the content checklist, not the visual design — the layout is defined above.\n\n\`\`\`text\n${content}\n\`\`\`\n`
    : '';

  return `
## Output Format — HTML, Always

Always reply with one complete, self-contained HTML document. Never answer with plain text, markdown, or a code-fenced summary. Do not ask whether the user wants HTML — render it every time, including for follow-up questions and revisions.

### Document Rules
- A full document from \`<!doctype html>\` down. One file, nothing external.
- All CSS in one \`<style>\` block. No CDN, web fonts, external images, or JS libraries.
- Include a viewport meta tag and a \`<title>\` naming the report and its subject.
- Escape all source data — never emit a raw \`<\` or \`&\` from a record.

### Visual System
- Fonts: \`ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif\`; \`ui-monospace, SFMono-Regular, Menlo, monospace\` for figures, IDs, and dates.
- Palette — page \`#F7F8F8\`, card \`#FFFFFF\`, ink \`#1F2933\`, muted \`#5B6B73\`, rule \`#E3E8EA\`, accent \`#447C93\`.
- Severity — critical \`#B3261E\`, warning \`#B8752A\`, healthy \`#2E7D5B\`. Use them for badges and the left border of each finding card. Never rely on color alone: every badge carries a word too.
- Body 15px / 1.55. Column \`max-width: 880px\`, centered, 32px padding.
- Cards: white, 1px \`#E3E8EA\` border, 10px radius, 20px padding, 16px gap, 4px colored left border.
- Add a \`@media (prefers-color-scheme: dark)\` block, and a \`@media print\` block that drops shadows and stops cards splitting across pages.

### Required Structure, In Order
1. **Header** — report name, what was analyzed, and the date of the run.
2. **Summary row** — 3 to 5 stat tiles (counts, totals, how many need attention). Big figure, small label beneath.
3. **Findings** — one card per item, most urgent first, grouped under severity headings. Each card: a title line with the subject name plus badges (amount, stage, owner, date); an evidence list whose every bullet names its date, field, person, or record; then one bolded action line.
4. **Next actions table** — a real \`<table>\` with Action, Owner, Due, and Source columns.
5. **Footer** — one muted line naming the data source and the counts covered.

### Content Rules
- No placeholder text or invented rows. If a value is unknown, write "Not available" and say why in the evidence list.
- Tabular content goes in a \`<table>\`, never in a bulleted list.
- Keep the summary readable in one screen; push the detail into the finding cards below it.
${reference}`;
}

// ─── Gemini agent variant ──────────────────────────────────────────────────

// A Gemini Enterprise agent does not accept the Claude/OpenAI document, so this
// is a separate builder rather than another PLATFORMS entry. Three differences
// force it, each one observed in a run that failed:
//
//  - The chat renders markdown. The Claude and OpenAI variants demand a single
//    fenced HTML document, which arrives in Gemini as unreadable source. So
//    markdown is the default here and HTML is opt-in, specified at the end.
//  - On a tool-registration failure the model retries the same tool under
//    guessed spellings (`findAccount`, `find-account`, `default_api:find_account`)
//    until the run is spent, then writes prose instead of a report. The stop
//    rule fixes the retrying; it needs a report shape to fail into, or the
//    improvised prose comes back.
//  - Pretrained company knowledge leaks into findings unless it is ruled out by
//    name. "Use only verified data" is not enough — the model reads its own
//    recall as verified.

const CATEGORY_EMOJI = {
  'daily-intelligence': '☀️',
  'account-monitoring': '📡',
  'pipeline-forecasting': '📈',
  'customer-success': '🤝',
  'coaching-enablement': '🎯',
  'strategic-intelligence': '🧭',
  'platform-enablement': '🧱',
};

// The catalog's sample output already opens with the emoji this workflow is
// known by in Slack; reusing it keeps the two surfaces recognizably the same
// report.
function leadEmoji(workflow) {
  const match = (workflow.sample_output?.content || '').match(/^\s*(\p{Extended_Pictographic}️?)/u);
  return match ? match[1] : CATEGORY_EMOJI[workflow.category] || '📊';
}

// Backstory workflows always resolve through find_account, so their findings
// are per-account. Intake workflows reason over whatever was pasted in.
const geminiSubject = (workflow) =>
  usesBackstory(workflow)
    ? { one: 'account', many: 'accounts', Cap: 'Account', Many: 'Accounts', resolvedLabel: 'Resolved' }
    : { one: 'record', many: 'records', Cap: 'Record', Many: 'Records', resolvedLabel: 'Parsed' };

// A Gemini agent has no n8n runtime: no sub-workflows to call, no Wait node to
// pause on, no resume link, no adapter to replay through. Steps that describe
// that plumbing are instructions it cannot follow, so they are dropped here
// even though the Claude and OpenAI variants keep them.
const PLUMBING_STEP =
  /sub-workflow|delivery_payload|wait node|resume link|replay|runs? the golden|renderer/i;

const geminiSteps = (workflow) =>
  derivationSteps(workflow).filter(
    (step) => !PLUMBING_STEP.test(`${step.name} ${step.description || ''}`),
  );

// Catalog step descriptions were written about an n8n run: they name node types
// as the subject ("Code node calculates...") and slip back into the third person
// after a leading clause. The Claude and OpenAI variants quote them as-is; a
// Gemini agent has no nodes, so they are rewritten here rather than in the
// shared helper, which would change the other two variants' output.
const N8N_SUBJECT =
  /^(?:an?\s+)?(?:code and set nodes?|code and conditional logic|code nodes?|set nodes?|function nodes?|wait nodes?|conditional logic|code)\s+/i;

const GEMINI_EXTRA_VERBS = new Set(['calls', 'uses', 'looks', 'runs', 'handles', 'scans', 'collects']);

const isGeminiVerb = (word) =>
  isThirdPersonVerb(word) || GEMINI_EXTRA_VERBS.has(String(word).toLowerCase());

function geminiImperative(text) {
  let out = String(text || '').trim().replace(N8N_SUBJECT, '');
  out = out.replace(/^([A-Za-z]+)/, (word) => (isGeminiVerb(word) ? singularize(word) : word));
  // "For each account, queries Backstory ..." -> "..., query Backstory ..."
  out = out.replace(/^(For [^,]{2,60},\s+)([A-Za-z]+)/, (match, lead, verb) =>
    isGeminiVerb(verb) ? `${lead}${singularize(verb)}` : match,
  );
  out = out.replace(/\b(and|then)\s+([A-Za-z]+)/gi, (match, joiner, verb) =>
    isGeminiVerb(verb) ? `${joiner} ${singularize(verb)}` : match,
  );
  // A comma-coordinated verb ("..., extracts the account names"). Requiring a
  // determiner after it keeps list nouns that double as verbs — "meetings,
  // records, maps" — from being rewritten.
  out = out.replace(
    /(,\s+)([A-Za-z]+)(\s+(?:the|a|an|each|all|them|it|its|their)\b)/gi,
    (match, comma, verb, tail) => (isGeminiVerb(verb) ? `${comma}${singularize(verb)}${tail}` : match),
  );
  return out.charAt(0).toUpperCase() + out.slice(1);
}

const NUMBER_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const numberWord = (n) => NUMBER_WORD[n] || String(n);

const GEMINI_TOOL_USE = {
  find_account: 'Resolve every account or company name the user gives you. Always first.',
  get_account_status: 'Open risks, next steps, live topics',
  get_opportunity_status: 'Stage, close date, amount, deal health',
  get_recent_account_activity: 'Recent meetings, emails, and who attended',
  get_recent_opportunity_activity: 'Deal-level activity and last touch',
  get_engaged_people: 'Stakeholders, seniority, engagement volume',
  get_scorecard: 'Scored engagement and coverage signals',
};

// What each tool contributes to the normalized shape, so the NORMALIZE step
// lists the fields this workflow will actually have rather than a fixed set.
const NORMALIZED_FIELDS = {
  get_account_status: ['open risks', 'next steps'],
  get_opportunity_status: ['amount', 'stage', 'close date'],
  get_recent_account_activity: ['last touch date'],
  get_recent_opportunity_activity: ['last deal activity'],
  get_engaged_people: ['stakeholder coverage'],
  get_scorecard: ['scorecard signals'],
};

// One illustrative evidence bullet per tool. The report example has to cite the
// tools this workflow actually calls — a sample bullet naming get_scorecard in
// a workflow that never calls it teaches the model to invent the citation.
const SAMPLE_EVIDENCE = {
  get_account_status:
    '- **Next steps field** (`get_account_status`): empty since the record was created\n  (low confidence — would be confirmed by the field history).',
  get_opportunity_status:
    '- **Stage** (`get_opportunity_status`): 41 days in Negotiation against a 14-day stage norm.',
  get_recent_account_activity:
    '- **2026-09-02 — last customer touch** (`get_recent_account_activity`): 14 days of silence\n  since the pricing call with M. Reyes.',
  get_recent_opportunity_activity:
    '- **2026-09-04 — last deal activity** (`get_recent_opportunity_activity`): nothing logged\n  since the technical review.',
  get_engaged_people:
    '- **Economic buyer** (`get_engaged_people`): no VP-level or above engaged in 60 days.',
  get_scorecard:
    '- **Scorecard** (`get_scorecard`): decision criteria unscored — check not run, field empty.',
};

const INTAKE_EVIDENCE = [
  "- **Required field `account_id`** (user's pasted payload): absent from 3 of the 12 records.",
  "- **Source system** (user's paste): named as \"CRM export\" with no instance or version, so the\n  shape could not be checked against a specific contract (low confidence).",
  '- **Record 7** (user\'s pasted payload): two conflicting owner values on the same row.',
];

function geminiGatherTools(workflow) {
  const tools = mcpTools(workflow).filter((t) => t !== 'find_account');
  return [...tools, askTool(workflow)];
}

function geminiToolTable(workflow) {
  const tools = mcpTools(workflow);
  if (!tools.length) return null;
  const rows = tools.map((tool) => `| \`${tool}\` | ${GEMINI_TOOL_USE[tool]} |`);
  rows.push(
    `| \`${askTool(workflow)}\` | Enrichment and summary synthesis ONLY, and only over data this tool returns. Never for facts, figures, dates, or names that belong in the evidence list. |`,
  );
  return rows.join('\n');
}

function geminiToolsSection(workflow) {
  const table = geminiToolTable(workflow);
  const subject = geminiSubject(workflow);

  if (!table) {
    return `# TOOLS

This agent has no tools. Everything it reasons over is pasted or uploaded by the user in
the chat.

- Never claim to have called a tool, queried a system, or fetched a record. You did not.
- Never infer or construct a tool name from a skill name, a file path, or documentation.
  A skill is an instruction file; reading one does not give you a callable function.
- If the intake is missing something you need, raise it as an "Input needed" finding inside
  the report. Do not fill the gap from your own knowledge.`;
  }

  const gatherCount = numberWord(geminiGatherTools(workflow).length);

  return `# TOOLS

Call these and only these. Never invent a tool or claim you called one.

| Tool | Use it for |
|---|---|
${table}

## Tool registration failures — STOP, do not improvise

- Call each tool by the exact name in the table above, once.
- If a call fails with "tool not found", "not found in function declarations", or any other
  registration error, STOP IMMEDIATELY. Do not retry that tool under a different name,
  casing, prefix, separator, or namespace. Do not try hyphens, underscores, camelCase,
  concatenation, \`default_api:\`, or any other prefix. Do not try a different tool to see
  whether it registers differently.
- One registration failure means the tools are not attached to this agent. No spelling fixes
  that. Repeated guessing produces nothing and wastes the run.
- Skills and tools are different things. A skill is an instruction file; reading one does not
  give you a callable function. Never infer, construct, or guess a tool name from a skill
  name, a skill's file path, or a skill's documentation, even when the skill is named after
  the tool.
- On a registration failure, immediately deliver the TOOL UNAVAILABLE report below and end
  the turn. Do not attempt the remaining tools. Do not proceed to enrichment.

## Other tool handling

- After \`find_account\` resolves, issue the ${gatherCount} gather calls for each ${subject.one} IN A
  SINGLE TURN so they run in parallel. Do not serialize them across turns.
- A tool that runs but returns empty is a different case: keep going with the other tools,
  and record "Not available" plus the tool name in the evidence list.
- If a name does not resolve, say so. Do not guess, do not substitute a similar name, and do
  not proceed as though it resolved. Offer the closest spelling variant as a question only.
- If the user names a rep, team, or territory instead of ${subject.many}, deliver an "Input needed"
  finding asking which ${subject.many} that covers — unless they already pasted a list.`;
}

function geminiGroundingSection(workflow) {
  const backstory = usesBackstory(workflow);
  const rules = [
    backstory
      ? 'Use ONLY data returned by the tools or pasted in by the user. Never invent an account\n  name, date, amount, person, or record ID.'
      : 'Use ONLY what the user pasted or uploaded. Never invent a field, record, value, or\n  system detail.',
    'You have no other source of knowledge about any company. If you know something about an\n  account that no tool returned, it does not go in the report — not as background, not as\n  market context, not as industry framing, not hedged as low confidence. An empty result is\n  "Not available", full stop.',
    'Never invent contact details. Use a person\'s name exactly as a tool returned it, with no\n  email, title, or handle you did not receive from a tool.',
    'Cite the evidence behind every finding: the date, the field, the person, or the record it\n  came from. An evidence bullet with no source is not allowed.',
    'If a record is incomplete, say which check you could not run rather than implying it passed.',
    'Mark anything uncertain as (low confidence) and state what would confirm it.',
    backstory
      ? 'Every recommended action names a specific person and is doable this week.'
      : 'Every recommended action names the specific field, record, or system to change.',
  ];
  if (!backstory) {
    rules.splice(
      1,
      1,
      'You have no other source of knowledge about the systems in the intake. If you know\n  something the user did not paste, it does not go in the report — not as background, not\n  as vendor context, not hedged as low confidence. An absent value is "Not available".',
    );
  }
  return `# GROUNDING RULES\n\n${rules.map((r) => `- ${r}`).join('\n')}`;
}

function geminiWorkflowSection(workflow) {
  const subject = geminiSubject(workflow);
  const tools = mcpTools(workflow);
  const lines = [];
  let n = 1;

  if (tools.length) {
    lines.push(`${n++}. RESOLVE — \`find_account\` for every account or company named.`);
    lines.push(
      `${n++}. GATHER — the ${numberWord(geminiGatherTools(workflow).length)} tools above, in parallel, per resolved ${subject.one}.`,
    );
  } else {
    lines.push(
      `${n++}. READ — take in the intake the user pasted. Name anything required that is missing\n   before you analyze, as an "Input needed" finding.`,
    );
  }

  for (const step of geminiSteps(workflow)) {
    lines.push(`${n++}. ${step.name.toUpperCase()} — ${geminiImperative(step.description)}`);
  }

  const fields = tools.length
    ? [...new Set(tools.flatMap((t) => NORMALIZED_FIELDS[t] || []))].concat('owner')
    : ['what it claims', 'what is missing', 'what conflicts', 'who owns the fix'];
  lines.push(
    `${n++}. NORMALIZE — reduce each ${subject.one} to a common shape: ${fields.join(', ')}.`,
  );
  lines.push(
    `${n++}. RANK — order by urgency, not by the order the user typed them. Severity is CRITICAL /\n   WARNING / HEALTHY. Lead with what matters most; compress the long tail to a count.`,
  );
  lines.push(`${n++}. DELIVER — the report format below.`);

  const pasteIns = pasteInSources(workflow);
  const noConnectors = pasteIns.length
    ? ` You have no connection to ${pasteIns.join(', ')} — when you need that data, ask the user to paste or upload an export.`
    : '';

  return `# WORKFLOW

${lines.join('\n')}

You have no connectors. Never attempt to send, post, email, DM, schedule, or write a
calendar entry, and never state that you did. Follow-up tasks belong in the Next actions
table for the user to create.${noConnectors}`;
}

// The illustrative action has to follow from the illustrative evidence, and the
// Next actions Source column has to name the tool that bullet actually cited.
// A sample that cites get_account_status for a stakeholder finding teaches the
// model that the Source column is decorative.
const SAMPLE_REMEDY = {
  get_account_status: { action: 'Write next steps into the account record', owner: 'S. Metcalf' },
  get_opportunity_status: { action: 'Re-set the close date or move the stage to match reality', owner: 'D. Klein' },
  get_recent_account_activity: { action: 'Re-establish contact with M. Reyes', owner: 'D. Klein' },
  get_recent_opportunity_activity: { action: 'Log the outcome of the technical review on the deal', owner: 'D. Klein' },
  get_engaged_people: { action: 'Book a meeting with M. Reyes that includes a named economic buyer', owner: 'D. Klein' },
  get_scorecard: { action: 'Score the open criteria on the account scorecard', owner: 'S. Metcalf' },
};

function geminiReportFormat(workflow) {
  const subject = geminiSubject(workflow);
  const emoji = leadEmoji(workflow);
  const backstory = usesBackstory(workflow);
  const tools = mcpTools(workflow).filter((t) => t !== 'find_account');

  // Two blocks' worth of evidence, split so each block keeps at least one
  // bullet even on a workflow that only calls two tools.
  const split = Math.max(1, Math.ceil(tools.length / 2));
  const criticalTools = backstory ? tools.slice(0, split) : [];
  const warningTools = backstory ? tools.slice(split) : [];
  const effectiveWarning = warningTools.length ? warningTools : criticalTools.slice(-1);

  const bullets = (list) => list.map((t) => SAMPLE_EVIDENCE[t]).filter(Boolean).join('\n');
  const criticalEvidence = backstory
    ? bullets(criticalTools)
    : [INTAKE_EVIDENCE[0], INTAKE_EVIDENCE[2]].join('\n');
  const warningEvidence = backstory ? bullets(effectiveWarning) : INTAKE_EVIDENCE[1];

  // The action closes on the last bullet in the block, so it reads as the
  // consequence of the finding directly above it.
  const criticalSource = criticalTools[criticalTools.length - 1];
  const warningSource = effectiveWarning[effectiveWarning.length - 1];
  const criticalRemedy = SAMPLE_REMEDY[criticalSource];
  const warningRemedy = SAMPLE_REMEDY[warningSource];

  const badgesFor = ({ owner, touch, stakeholders, amount, stage, close, records }) => {
    if (!backstory) return `\`${records}\` · \`Intake\` · \`Source: pasted export\``;
    return isDealShaped(workflow)
      ? `\`${amount}\` · \`${stage}\` · \`Owner: ${owner}\` · \`Close ${close}\``
      : `\`Owner: ${owner}\` · \`Last touch ${touch}\` · \`${stakeholders}\``;
  };

  const badgesA = badgesFor({
    owner: 'D. Klein', touch: '2026-09-02', stakeholders: '3 stakeholders engaged',
    amount: '$240K', stage: 'Negotiation', close: '2026-10-15', records: '12 rows',
  });
  const badgesB = badgesFor({
    owner: 'S. Metcalf', touch: '2026-09-11', stakeholders: '1 stakeholder engaged',
    amount: '$85K', stage: 'Discovery', close: '2026-12-01', records: '4 rows',
  });

  const criticalAction = backstory
    ? `**→ ${criticalRemedy.owner} to ${criticalRemedy.action.charAt(0).toLowerCase()}${criticalRemedy.action.slice(1)} by Friday.**`
    : '**→ Add `account_id` to the 3 rows, reconcile the owner conflict on row 7, and\nre-submit the batch.**';
  const warningAction = backstory
    ? `**→ ${warningRemedy.owner} to ${warningRemedy.action.charAt(0).toLowerCase()}${warningRemedy.action.slice(1)} this week.**`
    : '**→ State the source system and contract version on the next submission.**';

  const healthyLine = backstory
    ? `3 ${subject.many} clear: ${subject.Cap} C, ${subject.Cap} D, ${subject.Cap} E. No open risks, all touched inside 14 days.`
    : `3 ${subject.many} clear: ${subject.Cap} C, ${subject.Cap} D, ${subject.Cap} E. All required fields present, no conflicts.`;

  const nextActions = backstory
    ? `| ${criticalRemedy.action} | ${criticalRemedy.owner} | 2026-09-18 | \`${criticalSource}\` |
| ${warningRemedy.action} | ${warningRemedy.owner} | 2026-09-19 | \`${warningSource}\` |`
    : `| Add \`account_id\` to the 3 rows and fix the row 7 owner conflict | Submitter | 2026-09-18 | User's pasted payload |
| State source system and contract version | Submitter | 2026-09-19 | User's pasted payload |`;

  const footer = backstory
    ? `*Source: Backstory MCP · 2 ${subject.many}, ${geminiGatherTools(workflow).length} tool calls each · Hybrid control plane:
deterministic assembly, agentic enrichment only.*`
    : `*Source: the intake the user pasted · 12 ${subject.many} checked · No external data was used.*`;

  return `# REPORT FORMAT

Reproduce this structure exactly. Severity is always carried by a word, never by an emoji
or symbol alone. Every name, date, and figure below is illustrative — replace all of them
with what the run actually produced.

---

## ${emoji} ${workflow.name} — [${subject.Cap} A, ${subject.Cap} B]
*Run 2026-09-16 · 2 ${subject.many} · 1 needs attention*

| ${subject.Many} | ${subject.resolvedLabel} | Need attention | Open actions |
|---|---|---|---|
| 2 | 2 | 1 | 4 |

---

### CRITICAL

**${subject.Cap} A** · ${badgesA}

${criticalEvidence}

${criticalAction}

---

### WARNING

**${subject.Cap} B** · ${badgesB}

${warningEvidence}

${warningAction}

---

### HEALTHY

${healthyLine}

---

### Next actions

| Action | Owner | Due | Source |
|---|---|---|---|
${nextActions}

---

${footer}

---

Format rules:

- Header line, then the italic run line, then the summary table. Keep the whole summary
  readable without scrolling.
- One findings block per ${subject.one}, grouped under CRITICAL / WARNING / HEALTHY headings, most
  urgent first. Skip a severity heading entirely if nothing sits under it.
- The badge line is inline code separated by \`·\`. Write \`Not available\` for any badge you
  don't have.
- Every evidence bullet opens with its date or field in bold, names the tool or record in
  parentheses, then states the finding.
- Every findings block closes with exactly one bolded action line starting with \`→\`, and
  that action follows from the evidence directly above it.
- Every Next actions row names, in its Source column, the tool or record the finding came
  from.
- HEALTHY ${subject.many} get one compressed line naming them, not a block each.
- Tabular content goes in a markdown table, never a bulleted list.
- No placeholder rows and no invented values.`;
}

function geminiToolUnavailableSection(workflow) {
  if (!mcpTools(workflow).length) return '';
  const subject = geminiSubject(workflow);
  return `
# TOOL UNAVAILABLE REPORT

Deliver exactly this shape on a registration failure, then end the turn. Nothing else — no
company background, no market context, no substitute analysis.

---

## ${leadEmoji(workflow)} ${workflow.name} — run halted
*Run [date] · tools unavailable · 0 ${subject.many} analyzed*

| Requested | Resolved | Analyzed | Tool calls succeeded |
|---|---|---|---|
| [n] | 0 | 0 | 0 |

---

### CRITICAL

**Backstory tools not attached to this agent** · \`Unresolved\`

- **[date] — \`find_account\`**: call failed with \`[exact error text]\`.
- No ${subject.one} data could be retrieved, so none of the checks in this workflow were run
  for [${subject.many} requested].
- The tools are registered as skills, not as callable functions, or are not attached to this
  agent at all. This is a configuration issue, not a spelling one.

**→ [user] to attach the Backstory MCP toolset to this agent, then re-run. No report is
possible until a tool call succeeds.**

---

*Source: none — 0 successful tool calls.*
`;
}

function geminiSelfCheck(workflow) {
  const backstory = usesBackstory(workflow);
  const checks = [
    'Is this markdown with no wrapping fence, and no preamble before the header?',
  ];
  if (backstory) {
    checks.push('Did I retry any tool under a guessed name? If yes, I violated the stop rule.');
    checks.push("Did every finding come from a tool result or the user's own paste?");
    checks.push('Did I state anything about a company that no tool returned? If yes, cut it.');
    checks.push('Did I write any email, title, or handle a tool did not give me? If yes, cut it.');
  } else {
    checks.push('Did I claim to call a tool or query a system? I have none — if yes, cut it.');
    checks.push("Did every finding come from what the user pasted or uploaded?");
    checks.push('Did I state anything about a system the user did not describe? If yes, cut it.');
  }
  checks.push('Does every evidence bullet name a date, field, person, or record?');
  checks.push(
    backstory
      ? 'Does every block close with one `→` action naming a specific person, due this week?'
      : 'Does every block close with one `→` action naming the field, record, or system to change?',
  );
  checks.push("Does the summary table's count match the blocks below it?");
  checks.push('Did I avoid claiming to send, post, or schedule anything?');

  return `# BEFORE YOU SEND — SELF-CHECK

Run silently, then deliver. Do not show the checklist.

${checks.map((c) => `- ${c}`).join('\n')}`;
}

// The HTML path is the Claude/OpenAI output spec, demoted to an export the user
// has to ask for. Same visual system, so a report exported from Gemini matches
// one rendered by the other two.
const GEMINI_HTML_SPEC = `# HTML EXPORT SPEC

Only when the user asks for HTML or a file. One complete self-contained document from
\`<!doctype html>\` down, in a single \`\`\`html fence, nothing before or after it. Same content
and the same ranking as the markdown report.

- All CSS in one \`<style>\` block. No CDN, web fonts, external images, or JS libraries.
- Include a viewport meta tag and a \`<title>\` naming the report and its subject.
- Escape all source data — never emit a raw \`<\` or \`&\` from a record.
- Fonts: \`ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif\`; \`ui-monospace,
  SFMono-Regular, Menlo, monospace\` for figures, IDs, and dates.
- Palette — page \`#F7F8F8\`, card \`#FFFFFF\`, ink \`#1F2933\`, muted \`#5B6B73\`, rule \`#E3E8EA\`,
  accent \`#447C93\`.
- Severity — critical \`#B3261E\`, warning \`#B8752A\`, healthy \`#2E7D5B\`. Use them for badges and
  the left border of each finding card. Never rely on color alone: every badge carries a
  word too.
- Body 15px / 1.55. Column \`max-width: 880px\`, centered, 32px padding.
- Cards: white, 1px \`#E3E8EA\` border, 10px radius, 20px padding, 16px gap, 4px colored left
  border.
- Add a \`@media (prefers-color-scheme: dark)\` block, and a \`@media print\` block that drops
  shadows and stops cards splitting across pages.
- Structure, in order: header (report name, what was analyzed, run date); a summary row of
  3 to 5 stat tiles; the finding cards grouped by severity; a real \`<table>\` of next actions
  with Action, Owner, Due, and Source columns; a muted footer naming the data source.
- No placeholder text and no invented rows. If a value is unknown, write "Not available" and
  say why in the evidence list.`;

function geminiOverridesSection(workflow) {
  const items = (workflow.configuration || []).filter(Boolean);
  if (!items.length) return '';
  return `
# OVERRIDES

The user may override any of these at the start of a request; apply them for that run:
${items.map((item) => item.replace(/\.$/, '')).join('; ')}.
`;
}

function buildGeminiInstructions(workflow) {
  const subject = geminiSubject(workflow);
  const hasTools = mcpTools(workflow).length > 0;
  const gather = usesBackstory(workflow)
    ? 'gather verified evidence from the Backstory tools'
    : 'work only from what the user pasted in';
  const setupNote = hasTools
    ? ' Attach the Backstory MCP toolset to\nthe agent first — these instructions assume the tools are callable functions, not skills.'
    : ' This agent needs no tools attached —\neverything it reasons over is pasted or uploaded in the chat.';
  const emptyResultRule = hasTools
    ? 'If a tool fails or returns nothing, that is still a report. Deliver what you have and\n   state the failure in the evidence list.'
    : 'If the intake is unusable or arrives empty, that is still a report. Deliver what you can\n   and state the gap in the evidence list.';

  return `
# Gemini Agent Template: ${workflow.name}

## Agent Name
${workflow.name}

## Where This Goes
Gemini Enterprise → Agents → your agent → Instructions.${setupNote}

## Instructions
(Copy everything below this line into the Gemini Enterprise agent instructions field)

---

# ROLE

You are the ${workflow.name} Agent. You take ${inputHint(workflow)}, ${gather}, rank what needs attention, and deliver a finished brief in the chat.

${projectPurpose(workflow)}

You are the on-demand version of this workflow. Nothing is scheduled. Nothing is delivered
by a connector. The user reads the brief here and takes it wherever it needs to go.

# OUTPUT CONTRACT

Your default output is clean, readable markdown, rendered directly in the chat. Follow the
REPORT FORMAT section exactly.

1. No preamble ("Here is the report"), no sign-off, no commentary wrapping the brief.
   Start with the report header line.
2. Do not emit HTML, and do not wrap the report in a code fence. The chat renders markdown;
   a fenced report arrives as unreadable source.
3. Never abbreviate. No "...and 4 more ${subject.many}" in place of findings. If the summary row
   counts it, it appears below in full.
4. This contract applies to EVERY turn: first request, follow-ups, revisions, corrections,
   errors, and clarifying questions.
5. If you need to ask the user something, ask it as an "Input needed" finding inside the
   report, with the question in the evidence list. Do not drop the format to ask.
6. ${emptyResultRule}

## HTML export — only when asked

If the user asks for HTML, a file, a saveable version, or something to send on, THEN emit a
single complete self-contained HTML document inside one \`\`\`html fence, and nothing else.
Follow the HTML EXPORT SPEC at the end. This is the only situation in which you emit HTML
or a code fence.

${geminiToolsSection(workflow)}

${geminiGroundingSection(workflow)}

${geminiWorkflowSection(workflow)}
${geminiOverridesSection(workflow)}
${geminiReportFormat(workflow)}
${geminiToolUnavailableSection(workflow)}
---

${geminiSelfCheck(workflow)}

${GEMINI_HTML_SPEC}
`;
}

// ─── Document assembly ─────────────────────────────────────────────────────

const PLATFORMS = {
  claude: {
    file: 'claude-project.md',
    heading: 'Claude.ai Project Template',
    fieldName: 'Claude.ai project custom instructions',
    fieldPath: 'Claude.ai → Projects → your project → Instructions',
    sectionTitle: 'Custom Instructions',
  },
  openai: {
    file: 'openai-project.md',
    heading: 'OpenAI Project Template',
    fieldName: 'OpenAI project instructions (or a Custom GPT’s Instructions field)',
    fieldPath: 'ChatGPT → Projects → your project → Instructions, or GPT Builder → Configure → Instructions',
    sectionTitle: 'Instructions',
  },
};

const GEMINI_FILE = 'gemini-project.md';

function buildProjectInstructions(workflow, platform) {
  const meta = PLATFORMS[platform];
  const purpose = projectPurpose(workflow);
  const configuration = configurationSection(workflow);
  const outputFormat = outputFormatSection(workflow);

  return `
# ${meta.heading}: ${workflow.name}

## Project Name
${workflow.name}

## Where This Goes
${meta.fieldPath}

## ${meta.sectionTitle}
(Copy everything below this line into the ${meta.fieldName})

---

You are the ${workflow.name} Agent. ${purpose}

This is the on-demand version of that workflow: nothing is scheduled and nothing is delivered by a connector. A person types ${inputHint(workflow)}, and you render the finished report as an HTML document in the chat for them to read, save, or send on themselves.

## How to Use
Type ${inputHint(workflow)}. You will get a complete ${workflow.name} report, ranked by what needs attention first.

## Your Process

${processSection(workflow)}

## Rules
${rulesSection(workflow)}
${configuration}${outputFormat}
## Required Integrations
${integrationsSection(workflow)}
`;
}

// Hand-authored refinements that the catalog metadata cannot express. These are
// spliced into the generated document so regeneration never loses them.
const EXTRA_SECTIONS = {
  '11-deal-hygiene-audit': {
    after: '## Your Process',
    markdown: `
## Hygiene Checks

Flag a deal if any of these is true:

| Check | Trigger |
|---|---|
| Past-due close date | Close date is before today and the deal is still open |
| Unrealistic close date | Close date is inside 30 days but the stage is Discovery or Qualification |
| Stale activity | No logged activity beyond the stage norm (see below) |
| No next step | No next step logged, or the logged next step has no owner or no due date |
| Single-threaded | Fewer than 2 contacts engaged in the last 30 days |
| No executive engagement | No VP+ contact engaged, on a deal past Discovery or above $50K |
| Missing fields | Champion, competition, or qualification score blank on a deal past Qualification |

Default stage norms for activity recency — override these if the user gives you their own:
Discovery 7 days · Qualification 7 days · POC / Technical Validation 5 days · Proposal 5 days · Negotiation 3 days
`,
  },
};

function applyExtraSections(markdown, workflowId) {
  const extra = EXTRA_SECTIONS[workflowId];
  if (!extra) return markdown;
  const anchor = markdown.indexOf(extra.after);
  if (anchor === -1) return markdown;
  const nextHeading = markdown.indexOf('\n## ', anchor + extra.after.length);
  const cut = nextHeading === -1 ? markdown.length : nextHeading;
  return `${markdown.slice(0, cut)}\n${extra.markdown}${markdown.slice(cut)}`;
}

export function buildProjectInstructionAssets() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  let updatedWorkflows = 0;
  const written = [];

  for (const workflow of catalog.workflows || []) {
    const workflowDir = path.join(repoRoot, workflow.id);
    if (!fs.existsSync(workflowDir)) continue;

    for (const [platform, meta] of Object.entries(PLATFORMS)) {
      const markdown = applyExtraSections(buildProjectInstructions(workflow, platform), workflow.id);
      writeText(path.join(workflowDir, meta.file), markdown);
      written.push(`${workflow.id}/${meta.file}`);
    }

    // Gemini is not a PLATFORMS entry: its document is structured differently
    // (markdown-first, tool-registration stop rule, HTML demoted to an export),
    // so it has its own builder rather than a heading swap.
    writeText(
      path.join(workflowDir, GEMINI_FILE),
      applyExtraSections(buildGeminiInstructions(workflow), workflow.id),
    );
    written.push(`${workflow.id}/${GEMINI_FILE}`);

    workflow.platforms = workflow.platforms || {};
    workflow.platforms['claude-project'] = 'claude-project.md';
    workflow.platforms['openai-project'] = 'openai-project.md';
    workflow.platforms['gemini-project'] = GEMINI_FILE;

    workflow.platform_status = workflow.platform_status || {};
    workflow.platform_status['claude-project'] = 'guide-only';
    workflow.platform_status['openai-project'] = 'guide-only';
    workflow.platform_status['gemini-project'] = 'guide-only';

    // These are read and copied from a dialog on the site rather than
    // downloaded, so they are deliberately not added to `exports`. Clear any
    // stale rendered-format wiring from earlier revisions of this script.
    delete workflow.platform_formats;
    workflow.exports = (workflow.exports || []).filter(
      (file) => !/^(claude|openai|gemini)-project\.(docx|pdf)$/.test(file),
    );

    updatedWorkflows += 1;
  }

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return { updatedWorkflows, writtenCount: written.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(buildProjectInstructionAssets(), null, 2));
}
