// Client-side helpers for the catalogue assistant. The /api/* endpoints exist on
// Vercel; on GitHub Pages they're absent and sendChat/submitDraft reject — callers
// fall back to a graceful inline message.

export function getPersona() {
  try {
    return localStorage.getItem('backstory.persona') || null;
  } catch {
    return null;
  }
}

export function appendUser(turns, text) {
  return [...turns, { role: 'user', content: text }];
}

export function appendAssistant(turns, result) {
  return [
    ...turns,
    {
      role: 'assistant',
      content: result.reply || '',
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      draft: result.proposingDraft ? result.draft || null : null,
    },
  ];
}

export function toApiMessages(turns) {
  return turns.map((t) => ({ role: t.role, content: t.content }));
}

async function postJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export function sendChat({ surface, messages, persona }) {
  return postJson('/api/chat', { surface, messages, persona });
}

export function submitDraft({ surface, draft, persona }) {
  return postJson('/api/submit', { surface, draft, persona });
}
