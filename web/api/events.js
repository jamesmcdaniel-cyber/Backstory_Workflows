const ALLOWED = new Set([
  'assistant_request', 'assistant_response', 'assistant_error', 'assistant_cancel',
  'assistant_feedback', 'chat_reset', 'response_mode_changed',
  'health_check_started', 'health_check_result', 'artifact_copy', 'artifact_download',
  'marketplace_submit_started', 'marketplace_submit_result',
]);

function safeProperties(value) {
  const out = {};
  for (const [key, item] of Object.entries(value || {}).slice(0, 20)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
    if (typeof item === 'string') out[key] = item.slice(0, 80);
    else if (typeof item === 'number' && Number.isFinite(item)) out[key] = item;
    else if (typeof item === 'boolean') out[key] = item;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { name, properties } = req.body || {};
  if (!ALLOWED.has(name)) return res.status(400).json({ error: 'Invalid event' });
  const event = { name, properties: safeProperties(properties), timestamp: new Date().toISOString() };

  if (process.env.ANALYTICS_WEBHOOK_URL) {
    try {
      await fetch(process.env.ANALYTICS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {
      // Event delivery is best-effort and must never affect the product request.
    }
  } else {
    console.info(JSON.stringify({ source: 'librarian', ...event }));
  }
  return res.status(202).json({ ok: true });
}
