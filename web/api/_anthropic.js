import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { catalog } from './_catalog-index.js';
import { chunks } from './_knowledge-index.js';
import { selectChunks, retrievalQuery } from './_retrieval.js';

export const ReplySchema = z.object({
  intent: z.enum(['explain', 'find', 'explore', 'build', 'edit', 'troubleshoot']),
  reply: z.string(),
  recommendations: z.array(z.string()),
  proposingDraft: z.boolean(),
  draft: z.object({
    title: z.string(),
    summary: z.string(),
    stack: z.string(),
    spec: z.string(),
  }),
  buildsArtifact: z.boolean(),
  artifact: z.object({
    platform: z.string(),
    filename: z.string(),
    language: z.string(),
    content: z.string(),
  }),
});

const NOUN = { workflows: 'workflow', skills: 'skill' };

// Plain-language primer so the assistant can explain what the catalogue's building
// blocks ARE and what they're FOR — not just find or build them.
const CONCEPTS = `About the Backstory catalogue — what these things are and what they're for:
- Workflows (browsed under "Auto flows"): automated, scheduled agents that run on a platform — n8n, Workato, Zapier, or a Claude/OpenAI orchestrator. A workflow triggers on a schedule or event, pulls live account and deal context from Backstory over MCP, reasons over it with an LLM, and delivers an outcome (a Slack message, an email, a CRM update, a brief). Use them to put a recurring revenue task on autopilot — daily digests, meeting briefs, silence/churn alerts, forecast coaching.
- Signals (a.k.a. skills): packaged instruction sets you drop into an AI assistant (Claude, OpenAI, or any MCP-connected assistant). A signal teaches the assistant to do one sales job well, on demand — account planning, QBR prep, MEDDPICC qualification, relationship mapping. Where a workflow runs itself on a schedule, a signal is invoked by a person in the moment.
- Backstory MCP: the Model Context Protocol server that both workflows and signals call to fetch real Backstory data — accounts, opportunities, activity, engaged people, company news, and a natural-language sales-AI. It's the shared data layer underneath everything; its tools are listed below.`;

function mcpBlock() {
  const tools = catalog.mcp || [];
  if (!tools.length) return '';
  const lines = tools
    .map((t) => {
      const used = (t.usedBy || []).slice(0, 4);
      const suffix = used.length
        ? ` (used by: ${used.join(', ')}${t.usedBy.length > used.length ? ', …' : ''})`
        : '';
      return `- ${t.name} — ${t.description}${suffix}`;
    })
    .join('\n');
  return `\nBackstory MCP tools (what each one does):\n${lines}\n`;
}

const N8N_SHAPE = `When the target platform is n8n, the artifact content MUST be a single valid JSON object importable into n8n, with EXACTLY this shape (real \`n8n-nodes-base.*\` node types, correct \`typeVersion\` and \`position\` [x,y], and every node wired in \`connections\` by its node name):
{"name":"<Workflow Name>","nodes":[{"parameters":{"path":"<hook>","httpMethod":"POST"},"id":"<uuid>","name":"Trigger Webhook","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[-980,220]},{"parameters":{"assignments":{"assignments":[]}},"id":"<uuid>","name":"Set Fields","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[-760,220]},{"parameters":{"jsCode":"// transform"},"id":"<uuid>","name":"Normalize","type":"n8n-nodes-base.code","typeVersion":2,"position":[-540,220]},{"parameters":{"url":"...","method":"GET"},"id":"<uuid>","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4,"position":[-320,220]}],"connections":{"Trigger Webhook":{"main":[[{"node":"Set Fields","type":"main","index":0}]]},"Set Fields":{"main":[[{"node":"Normalize","type":"main","index":0}]]},"Normalize":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]}},"settings":{},"active":false}
Pick the right real node types for the task (e.g. \`n8n-nodes-base.webhook\`, \`.scheduleTrigger\`, \`.set\`, \`.code\`, \`.httpRequest\`, \`.if\`, \`.switch\`, \`.merge\`, \`.slack\`, \`.gmail\`, \`.googleSheets\`, \`.emailSend\`). Give each node a unique \`id\`, space \`position\` left-to-right, and wire EVERY node in \`connections\`. Keep it complete but compact so it fits in one response.`;

function outputContract(noun, requestMode = 'chat') {
  const modeRules = requestMode === 'artifact'
    ? `This is a confirmed artifact-generation request. Set buildsArtifact true and return the complete artifact. Keep reply to one sentence.`
    : requestMode === 'plan'
      ? `This is a planning request. Set proposingDraft true with a compact proposed plan. Set buildsArtifact false. Do not generate an artifact yet.`
      : `This is ordinary conversation. Set buildsArtifact false. If the user explicitly asks to build or design something, return a compact plan as a draft for confirmation; otherwise do not create a draft.`;
  const artifactInstructions = requestMode === 'artifact' ? `
- "artifact": return the COMPLETE, ready-to-use build output:
    - platform: the confirmed target platform.
    - filename: a sensible filename with the right extension.
    - language: "json" for n8n/Workato/Zapier exports, "markdown" for Claude/OpenAI workflow instructions.
    - content: the full artifact candidate. Generate complete content — never a stub or "TODO". Use credential references rather than secrets; the UI will validate structure and show remaining configuration.
${N8N_SHAPE}` : `
- "artifact": set platform, filename, language, and content to empty strings.`;
  return `${modeRules}

For every turn return the structured object:
- "intent": classify the user's current request as explain, find, explore, build, edit, or troubleshoot.
- "reply": always present, conversational. When you build an artifact, briefly say what you produced and how to use it.
- "recommendations": the ids of existing catalogue items that fit, most relevant first. Use ids exactly as written in the catalogues above. Empty if nothing fits.
- "proposingDraft": true only when returning a plan for a new ${noun}.
- "draft": when proposingDraft is true, a concrete new ${noun} — title (short), summary (what it does and the outcome), stack (the Backstory tech it uses), spec (a short build outline). When proposingDraft is false, set every draft field to an empty string.
- "buildsArtifact": true only for confirmed artifact-generation mode; otherwise false.
${artifactInstructions}`;
}

export function buildSystemPrompt(surface, persona, pageContext, retrievedBlock = '', requestMode = 'chat') {
  const personaLine = persona
    ? `The person you're helping is a ${persona}. Tailor language, examples, and recommendations to that role.`
    : `You don't know the person's role yet — keep it warm, concrete, and jargon-light.`;
  const contextLine = pageContext ? `\nPage context: ${pageContext}\n` : '';

  if (surface === 'platform') {
    const wfItems = (catalog.workflows || [])
      .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
      .join('\n');
    const skItems = (catalog.skills || [])
      .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
      .join('\n');
    return `You are the Backstory Librarian — the brain of the Backstory Automation Library and the assistant on its home page. You know everything published on this site: the Auto flows (workflow) catalogue, the Signals (skills) catalogue, the Backstory MCP tools, the API docs, and the setup guides. You help revenue and technical teams understand the platform, find the right item, build new workflows, and think through automation strategy.

Voice: confident, direct, and jargon-light. Default to 60–100 words; factual answers should be 1–3 sentences. Do not recap the request. Do not end with a question or call to action unless one missing answer blocks useful progress. Go longer only when explicitly asked.

${personaLine}
${contextLine}
${CONCEPTS}

You do four jobs:
1. EXPLAIN — answer questions about anything on the site (what a workflow, signal, or MCP tool is or does; how the API authenticates; what a setup guide covers) plainly, with a quick concrete example. Set proposingDraft and buildsArtifact false for pure explanations.
2. FIND — only when the user asks to find, compare, or recommend catalogue items, return at most two best-fitting workflow and/or signal ids. For explain, troubleshoot, and ordinary exploration, recommendations must be empty.
3. BUILD — first propose a compact plan and wait for confirmation. Generate a downloadable artifact only in confirmed artifact mode. Never assume n8n when the platform is consequential; recommend a platform in the plan or identify it as undecided.
4. STRATEGIZE — classify this as explore. Talk through automation strategy: which flows and signals to adopt first for a goal (pipeline hygiene, churn prevention, forecast discipline), how they combine over the shared MCP data layer, what to sequence next. Mention catalogue items in prose only when useful; recommendation cards stay empty unless the user explicitly asks to find or compare items.

When a question is vague, offer your best interpretation briefly. Suggest use cases only for explore or find intent. Ask at most one question, and only when the answer materially changes the result.
${mcpBlock()}
Auto flows catalogue (id | name [category, status] — description):
${wfItems}

Signals catalogue (id | name [category, status] — description):
${skItems}
${retrievedBlock}
${outputContract('workflow', requestMode)}`;
  }

  const noun = NOUN[surface] || 'workflow';
  const items = (catalog[surface] || [])
    .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
    .join('\n');
  const otherSurface = surface === 'skills' ? 'workflows' : 'skills';
  const otherLabel = otherSurface === 'skills' ? 'signals' : 'workflows';
  const otherItems = (catalog[otherSurface] || [])
    .map((i) => `- ${i.id} | ${i.name} — ${(i.description || '').slice(0, 120)}`)
    .join('\n');

  return `You are the Backstory catalogue liaison for ${surface}. You help revenue and technical teams understand the catalogue, find an existing ${noun} that fits their need, or — when nothing fits — draft a brand-new ${noun} they can submit to the External Marketplace to strengthen the catalogue.

Voice: confident, direct, and jargon-light. Default to 60–100 words; factual answers should be 1–3 sentences. Do not recap the request or add a closing call to action.

${personaLine}
${contextLine}
${CONCEPTS}

People often come here to UNDERSTAND the catalogue, not only to find or build. When someone asks what a workflow, a signal/skill, or the Backstory MCP is — what it means, what it can be used for, how they differ, or what a specific MCP tool does — answer plainly and concretely using the knowledge here, with a quick concrete example. Only recommend a matching ${noun} if it genuinely helps, and don't push a build or a draft onto a question that's just asking to understand something. Set proposingDraft and buildsArtifact false for pure explanations.

When the user wants to BUILD a ${noun}, actually build it — produce the real, usable, downloadable artifact (set buildsArtifact true and fill artifact), never just an outline or a spec. Build it for the platform they named; if they didn't name one, default to n8n. If they attach a file (an export, a screenshot, a doc), use it as the basis to adapt or rebuild.
${mcpBlock()}
Here is the current ${surface} catalogue (id | name [category, status] — description):
${items}

For reference, the ${otherLabel} catalogue (id | name — description), so you can answer questions that span both:
${otherItems}
${retrievedBlock}
${outputContract(noun, requestMode)}`;
}

function validRecommendationIds(surface) {
  const primary = catalog[surface] || [];
  const all = surface === 'platform' ? [...(catalog.workflows || []), ...(catalog.skills || [])] : primary;
  return new Set(all.map((item) => item.id));
}

export function normalizeReply(parsed, surface = 'platform') {
  if (!parsed || typeof parsed !== 'object') {
    return {
      reply: "Sorry — I couldn't put a response together. Try rephrasing your ask?",
      intent: 'explain',
      recommendations: [],
      proposingDraft: false,
      draft: null,
      buildsArtifact: false,
      artifact: null,
    };
  }
  const allowed = validRecommendationIds(surface);
  const recommendations = [...new Set(Array.isArray(parsed.recommendations) ? parsed.recommendations : [])]
    .filter((id) => allowed.has(id))
    .slice(0, 2);
  const intent = parsed.intent || (recommendations.length ? 'find' : 'explain');
  return {
    intent,
    reply: String(parsed.reply || ''),
    recommendations: intent === 'find' ? recommendations : [],
    proposingDraft: !!parsed.proposingDraft,
    draft: parsed.proposingDraft ? parsed.draft || null : null,
    buildsArtifact: !!parsed.buildsArtifact,
    artifact: parsed.buildsArtifact && parsed.artifact && parsed.artifact.content ? parsed.artifact : null,
  };
}

// Attach uploaded files to the most recent user message as Anthropic content blocks.
// attachments: [{ name, mediaType, kind: 'image'|'document'|'text', data }]
// (data is base64 for image/document, raw text for text).
export function buildMessages(messages, attachments) {
  const msgs = (messages || []).map((m) => ({ role: m.role, content: m.content }));
  if (!attachments || !attachments.length || !msgs.length) return msgs;
  const i = msgs.length - 1;
  const blocks = [];
  if (msgs[i].content) blocks.push({ type: 'text', text: msgs[i].content });
  for (const a of attachments) {
    if (a.kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: a.mediaType, data: a.data } });
    } else if (a.kind === 'document') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: a.mediaType || 'application/pdf', data: a.data } });
    } else {
      blocks.push({ type: 'text', text: `Attached file "${a.name}":\n\n${a.data}` });
    }
  }
  msgs[i] = { role: msgs[i].role, content: blocks };
  return msgs;
}

export async function runAssistant({ surface, messages, persona, attachments, pageContext, requestMode = 'chat', client }) {
  const c = client || new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  let retrievedBlock = '';
  try {
    const picked = selectChunks(retrievalQuery(messages), chunks);
    if (picked.length) {
      retrievedBlock =
        '\nRelevant library detail (retrieved for this question — prefer it over guessing):\n' +
        picked.map((k) => `### ${k.title}\n${k.text}`).join('\n\n') +
        '\n';
    }
  } catch {
    /* fail-open: the compact catalogue index above is still in the prompt */
  }
  const response = await c.messages.parse({
    model,
    max_tokens: requestMode === 'artifact' ? 8192 : requestMode === 'plan' ? 1400 : 900,
    system: buildSystemPrompt(surface, persona, pageContext, retrievedBlock, requestMode),
    messages: buildMessages(messages, attachments),
    output_config: { format: zodOutputFormat(ReplySchema) },
  });
  return normalizeReply(response.parsed_output, surface);
}
