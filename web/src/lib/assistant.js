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
      artifact: result.buildsArtifact ? result.artifact || null : null,
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

export function sendChat({ surface, messages, persona, attachments, pageContext }) {
  return postJson('/api/chat', { surface, messages, persona, attachments, pageContext });
}

export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // ~3MB — Vercel function body ceiling

export function attachmentKind(type) {
  if ((type || '').startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'document';
  return 'text';
}

// Read a browser File into an attachment block: { name, mediaType, kind, data }.
// data is base64 for image/document, raw text for text files.
export function readFileToAttachment(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      reject(new Error(`${file.name} is larger than 3MB`));
      return;
    }
    const kind = attachmentKind(file.type);
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    if (kind === 'text') {
      reader.onload = () =>
        resolve({ name: file.name, mediaType: file.type || 'text/plain', kind, data: String(reader.result) });
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const res = String(reader.result);
        const comma = res.indexOf(',');
        resolve({ name: file.name, mediaType: file.type, kind, data: comma >= 0 ? res.slice(comma + 1) : res });
      };
      reader.readAsDataURL(file);
    }
  });
}

// Turn the builder-panel inputs into a first chat turn that asks for a draft.
export function buildPrompt({ target, platform, goal, trigger, output }) {
  return [
    `Build a custom ${target}${platform ? ` for ${platform}` : ''}.`,
    goal && `What it should do: ${goal}`,
    trigger && `Trigger: ${trigger}`,
    output && `Output / delivery: ${output}`,
    `Produce the actual ${platform || 'platform'} build artifact I can download and use, not just an outline.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function submitDraft({ surface, draft, persona }) {
  return postJson('/api/submit', { surface, draft, persona });
}
