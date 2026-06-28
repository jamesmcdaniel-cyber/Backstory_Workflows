import { runTriage } from './_triage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { notes } = req.body || {};
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    return res.status(400).json({ error: 'Missing notes' });
  }
  const trimmed = notes.slice(0, 20000);
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(200).json({ candidates: [], error: 'The triage assistant is offline (no API key configured).' });
  }
  try {
    const result = await runTriage({ notes: trimmed });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(200).json({
      candidates: [],
      error: 'The triage assistant hit an error — give it another try in a moment.',
    });
  }
}
