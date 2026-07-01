import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { catalog } from './_catalog-index.js';

export const ReplySchema = z.object({
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

export function buildSystemPrompt(surface, persona, pageContext) {
  const noun = NOUN[surface] || 'workflow';
  const items = (catalog[surface] || [])
    .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
    .join('\n');
  const otherSurface = surface === 'skills' ? 'workflows' : 'skills';
  const otherLabel = otherSurface === 'skills' ? 'signals' : 'workflows';
  const otherItems = (catalog[otherSurface] || [])
    .map((i) => `- ${i.id} | ${i.name} — ${(i.description || '').slice(0, 120)}`)
    .join('\n');
  const personaLine = persona
    ? `The person you're helping is a ${persona}. Tailor language, examples, and recommendations to that role.`
    : `You don't know the person's role yet — keep it warm, concrete, and jargon-light.`;
  const contextLine = pageContext ? `\nPage context: ${pageContext}\n` : '';

  return `You are the Backstory catalogue liaison for ${surface}. You help revenue and technical teams understand the catalogue, find an existing ${noun} that fits their need, or — when nothing fits — draft a brand-new ${noun} they can submit to the External Marketplace to strengthen the catalogue.

Voice: confident, lightly opinionated, decisive. Recommend a clear best option and say why; name trade-offs briefly. Never read like API docs. Keep replies to a few sentences.

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

For every turn return the structured object:
- "reply": always present, conversational. When you build an artifact, briefly say what you produced and how to use it.
- "recommendations": the ids of existing ${noun}s that fit, most relevant first. Use ids exactly as written above. Empty if nothing fits.
- "proposingDraft": true when you've built or are proposing a new ${noun} the user could submit to the marketplace to strengthen the catalogue.
- "draft": when proposingDraft is true, a concrete new ${noun} — title (short), summary (what it does and the outcome), stack (the Backstory tech it uses), spec (a short build outline). When proposingDraft is false, set every draft field to an empty string.
- "buildsArtifact": true whenever the user is building or creating a ${noun} (a "build…" request, the builder panel, or "make me a…"). On any build you MUST set this true and fill artifact — never return a build as a draft/spec only.
- "artifact": when buildsArtifact is true, the COMPLETE, ready-to-use build output:
    - platform: the target platform (n8n, Workato, Zapier, Claude workflow, or OpenAI workflow).
    - filename: a sensible filename with the right extension (e.g. "champion-silence-alert.json" or "...-instructions.md").
    - language: "json" for n8n/Workato/Zapier exports, "markdown" for Claude/OpenAI workflow instructions.
    - content: the full artifact. For n8n produce a structurally valid, importable n8n workflow JSON (nodes + connections, with Backstory MCP, an LLM step, and delivery). For Workato/Zapier produce the recipe/Zap definition. For Claude/OpenAI workflow produce complete orchestrator instructions (MCP setup, the system prompt/steps, tool calls, and delivery) in markdown. Generate real, complete content — never a stub or "TODO".
  When buildsArtifact is false, set platform/filename/language/content to empty strings.

When the target platform is n8n, the artifact content MUST be a single valid JSON object importable into n8n, with EXACTLY this shape (real \`n8n-nodes-base.*\` node types, correct \`typeVersion\` and \`position\` [x,y], and every node wired in \`connections\` by its node name):
{"name":"<Workflow Name>","nodes":[{"parameters":{"path":"<hook>","httpMethod":"POST"},"id":"<uuid>","name":"Trigger Webhook","type":"n8n-nodes-base.webhook","typeVersion":2,"position":[-980,220]},{"parameters":{"assignments":{"assignments":[]}},"id":"<uuid>","name":"Set Fields","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[-760,220]},{"parameters":{"jsCode":"// transform"},"id":"<uuid>","name":"Normalize","type":"n8n-nodes-base.code","typeVersion":2,"position":[-540,220]},{"parameters":{"url":"...","method":"GET"},"id":"<uuid>","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4,"position":[-320,220]}],"connections":{"Trigger Webhook":{"main":[[{"node":"Set Fields","type":"main","index":0}]]},"Set Fields":{"main":[[{"node":"Normalize","type":"main","index":0}]]},"Normalize":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]}},"settings":{},"active":false}
Pick the right real node types for the task (e.g. \`n8n-nodes-base.webhook\`, \`.scheduleTrigger\`, \`.set\`, \`.code\`, \`.httpRequest\`, \`.if\`, \`.switch\`, \`.merge\`, \`.slack\`, \`.gmail\`, \`.googleSheets\`, \`.emailSend\`). Give each node a unique \`id\`, space \`position\` left-to-right, and wire EVERY node in \`connections\`. Keep it complete but compact so it fits in one response.`;
}

export function normalizeReply(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return {
      reply: "Sorry — I couldn't put a response together. Try rephrasing your ask?",
      recommendations: [],
      proposingDraft: false,
      draft: null,
      buildsArtifact: false,
      artifact: null,
    };
  }
  return {
    reply: String(parsed.reply || ''),
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
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

export async function runAssistant({ surface, messages, persona, attachments, pageContext, client }) {
  const c = client || new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const response = await c.messages.parse({
    model,
    max_tokens: 8192,
    system: buildSystemPrompt(surface, persona, pageContext),
    messages: buildMessages(messages, attachments),
    output_config: { format: zodOutputFormat(ReplySchema) },
  });
  return normalizeReply(response.parsed_output);
}
