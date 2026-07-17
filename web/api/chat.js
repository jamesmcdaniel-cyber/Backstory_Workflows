import { runAssistant } from './_anthropic.js';
import { validateAttachments } from '../src/lib/attachmentValidation.js';

const OFFLINE =
  'The assistant is offline right now (no API key configured), but the catalogue search above still works.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { surface, messages, persona, attachments, pageContext, requestMode = 'chat', audienceRole = 'sales' } = req.body || {};
  if (
    !['workflows', 'skills', 'platform'].includes(surface) ||
    !['chat', 'plan', 'artifact'].includes(requestMode) ||
    !['sales', 'csm', 'marketing', 'it'].includes(audienceRole) ||
    !Array.isArray(messages)
  ) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  const attachmentResult = validateAttachments(attachments);
  if (!attachmentResult.valid) {
    return res.status(400).json({ error: 'Invalid attachments', reply: attachmentResult.errors.join(' ') });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ reply: OFFLINE, recommendations: [], recommendationReasons: {}, proposingDraft: false, draft: null });
  }
  try {
    const result = await runAssistant({
      surface,
      messages,
      persona,
      attachments: attachmentResult.attachments.length ? attachmentResult.attachments : undefined,
      pageContext: typeof pageContext === 'string' ? pageContext.slice(0, 600) : undefined,
      requestMode,
      audienceRole,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(502).json({
      reply: 'The assistant hit an error — give it another try in a moment.',
      recommendations: [],
      recommendationReasons: {},
      proposingDraft: false,
      draft: null,
    });
  }
}
