import { runAssistant } from './_anthropic.js';

const OFFLINE =
  'The assistant is offline right now (no API key configured), but the catalogue search above still works.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { surface, messages, persona, attachments, pageContext } = req.body || {};
  if (!['workflows', 'skills', 'platform'].includes(surface) || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ reply: OFFLINE, recommendations: [], proposingDraft: false, draft: null });
  }
  try {
    const result = await runAssistant({
      surface,
      messages,
      persona,
      attachments: Array.isArray(attachments) ? attachments.slice(0, 4) : undefined,
      pageContext: typeof pageContext === 'string' ? pageContext.slice(0, 600) : undefined,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({
      reply: 'The assistant hit an error — give it another try in a moment.',
      recommendations: [],
      proposingDraft: false,
      draft: null,
      error: String((err && err.message) || err),
    });
  }
}
