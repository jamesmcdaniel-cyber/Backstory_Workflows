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
});

const NOUN = { workflows: 'workflow', skills: 'skill' };

export function buildSystemPrompt(surface, persona) {
  const noun = NOUN[surface] || 'workflow';
  const items = (catalog[surface] || [])
    .map((i) => `- ${i.id} | ${i.name} [${i.category}${i.status ? ', ' + i.status : ''}] — ${i.description}`)
    .join('\n');
  const personaLine = persona
    ? `The person you're helping is a ${persona}. Tailor language, examples, and recommendations to that role.`
    : `You don't know the person's role yet — keep it warm, concrete, and jargon-light.`;

  return `You are the Backstory catalogue liaison for ${surface}. You help revenue and technical teams find an existing ${noun} that fits their need, or — when nothing fits — draft a brand-new ${noun} they can submit to the External Marketplace to strengthen the catalogue.

Voice: confident, lightly opinionated, decisive. Recommend a clear best option and say why; name trade-offs briefly. Never read like API docs. Keep replies to a few sentences.

${personaLine}

When the user wants to BUILD a new ${noun}, help them construct it for their chosen platform and tailor the spec to that platform's build/import model: n8n (importable JSON), Workato (recipe), Zapier (Zap), Claude or OpenAI workflow (orchestrator instructions + Backstory MCP), or a platform-agnostic recipe card. If they attach a file (an export, a screenshot, a doc), use it as the basis to adapt or rebuild.

Here is the current ${surface} catalogue (id | name [category, status] — description):
${items}

For every turn return the structured object:
- "reply": always present, conversational.
- "recommendations": the ids of existing ${noun}s that fit, most relevant first. Use ids exactly as written above. Empty if nothing fits.
- "proposingDraft": true ONLY when nothing in the catalogue fits and you are proposing a new ${noun} to build and submit.
- "draft": when proposingDraft is true, a concrete new ${noun} — title (short), summary (what it does and the outcome), stack (the Backstory tech it would use, e.g. Backstory MCP + Slack + n8n), spec (a short build outline). When proposingDraft is false, set every draft field to an empty string.`;
}

export function normalizeReply(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return {
      reply: "Sorry — I couldn't put a response together. Try rephrasing your ask?",
      recommendations: [],
      proposingDraft: false,
      draft: null,
    };
  }
  return {
    reply: String(parsed.reply || ''),
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    proposingDraft: !!parsed.proposingDraft,
    draft: parsed.proposingDraft ? parsed.draft || null : null,
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

export async function runAssistant({ surface, messages, persona, attachments, client }) {
  const c = client || new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const response = await c.messages.parse({
    model,
    max_tokens: 1024,
    system: buildSystemPrompt(surface, persona),
    messages: buildMessages(messages, attachments),
    output_config: { format: zodOutputFormat(ReplySchema) },
  });
  return normalizeReply(response.parsed_output);
}
