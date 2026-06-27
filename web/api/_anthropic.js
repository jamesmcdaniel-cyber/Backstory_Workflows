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

export function buildSystemPrompt(surface, persona, pageContext) {
  const noun = NOUN[surface] || 'workflow';
  const items = (catalog[surface] || [])
    .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
    .join('\n');
  const personaLine = persona
    ? `The person you're helping is a ${persona}. Tailor language, examples, and recommendations to that role.`
    : `You don't know the person's role yet — keep it warm, concrete, and jargon-light.`;
  const contextLine = pageContext ? `\nPage context: ${pageContext}\n` : '';

  return `You are the Backstory catalogue liaison for ${surface}. You help revenue and technical teams find an existing ${noun} that fits their need, or — when nothing fits — draft a brand-new ${noun} they can submit to the External Marketplace to strengthen the catalogue.

Voice: confident, lightly opinionated, decisive. Recommend a clear best option and say why; name trade-offs briefly. Never read like API docs. Keep replies to a few sentences.

${personaLine}
${contextLine}
When the user wants to BUILD a ${noun}, actually build it for their chosen platform — produce the real, usable artifact, not just an outline. If they attach a file (an export, a screenshot, a doc), use it as the basis to adapt or rebuild.

Here is the current ${surface} catalogue (id | name [category, status] — description):
${items}

For every turn return the structured object:
- "reply": always present, conversational. When you build an artifact, briefly say what you produced and how to use it.
- "recommendations": the ids of existing ${noun}s that fit, most relevant first. Use ids exactly as written above. Empty if nothing fits.
- "proposingDraft": true when you've built or are proposing a new ${noun} the user could submit to the marketplace to strengthen the catalogue.
- "draft": when proposingDraft is true, a concrete new ${noun} — title (short), summary (what it does and the outcome), stack (the Backstory tech it uses), spec (a short build outline). When proposingDraft is false, set every draft field to an empty string.
- "buildsArtifact": true ONLY when the user is building a ${noun} and you are producing the actual build output for a target platform.
- "artifact": when buildsArtifact is true, the COMPLETE, ready-to-use build output:
    - platform: the target platform (n8n, n8n-starter, Workato, Zapier, Claude workflow, OpenAI workflow, or Recipe card).
    - filename: a sensible filename with the right extension (e.g. "champion-silence-alert.json" or "...-instructions.md").
    - language: "json" for n8n/Workato/Zapier exports, "markdown" for instructions/recipe cards.
    - content: the full artifact. For n8n / n8n-starter produce a structurally valid, importable n8n workflow JSON (nodes + connections, with Backstory MCP, an LLM step, and delivery). For Workato/Zapier produce the recipe/Zap definition. For Claude/OpenAI workflow produce complete orchestrator instructions (MCP setup, the system prompt/steps, tool calls, and delivery) in markdown. For a Recipe card produce a step-by-step rebuild guide in markdown. Generate real, complete content — never a stub or "TODO".
  When buildsArtifact is false, set platform/filename/language/content to empty strings.`;
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
    max_tokens: 4096,
    system: buildSystemPrompt(surface, persona, pageContext),
    messages: buildMessages(messages, attachments),
    output_config: { format: zodOutputFormat(ReplySchema) },
  });
  return normalizeReply(response.parsed_output);
}
