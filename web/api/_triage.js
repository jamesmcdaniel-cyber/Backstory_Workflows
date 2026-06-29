import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

export const TriageSchema = z.object({
  candidates: z.array(
    z.object({
      title: z.string(),
      request: z.string(),
      customer: z.string(),
      assignee: z.string(),
      isMine: z.boolean(),
      trigger: z.string(),
      outputs: z.string(),
      suggestedPlatform: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    }),
  ),
});

export function buildTriagePrompt() {
  return `You triage meeting notes into buildable workflow/automation requests. Extract ONLY concrete, actionable workflow/automation/integration/recurring-report asks from the notes. For each candidate:

- "title": a short, descriptive name for the workflow
- "request": a clear description of what the workflow/automation should do
- "customer": the stakeholder or team who would benefit (empty string if unknown)
- "assignee": the person responsible for building or owning it (empty string if unknown)
- "isMine": set true if the task is assigned to the note-taker or their team; false if it is owned by someone else entirely
- "trigger": what kicks off the workflow (e.g. "every Monday 9 AM", "on new Salesforce deal", "on Slack message") — empty string if unknown
- "outputs": what the workflow produces or where it delivers results (e.g. "Slack alert", "email digest", "Google Sheet row") — empty string if unknown
- "suggestedPlatform": one of — n8n, Workato, Zapier, Claude workflow, OpenAI workflow — pick the best fit based on the complexity and integrations involved
- "confidence": "high" if the ask is explicit and detailed, "medium" if implied or partially specified, "low" if vague or uncertain

SKIP anything that is not a concrete buildable workflow: general discussion points, FYIs, decisions with no automation implication, and vague future ideas with no actionable ask.

Return an empty candidates array if the notes contain no buildable workflow asks.`;
}

export function normalizeTriage(parsed) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.candidates)) {
    return { candidates: [] };
  }
  const candidates = parsed.candidates.filter(
    (c) => c && typeof c === 'object' && typeof c.title === 'string' && typeof c.request === 'string',
  );
  return { candidates };
}

export async function runTriage({ notes, client }) {
  const c = client || new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';
  const response = await c.messages.parse({
    model,
    max_tokens: 2048,
    system: buildTriagePrompt(),
    messages: [{ role: 'user', content: 'Meeting notes:\n\n' + notes }],
    output_config: { format: zodOutputFormat(TriageSchema) },
  });
  return normalizeTriage(response.parsed_output);
}
