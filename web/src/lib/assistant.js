import { MAX_ATTACHMENT_BYTES } from './attachmentValidation';

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

export function getAudienceRole() {
  try {
    const value = localStorage.getItem('backstory.audienceRole');
    return ['sales', 'csm', 'marketing', 'it'].includes(value) ? value : 'sales';
  } catch {
    return 'sales';
  }
}

export function saveAudienceRole(role) {
  try {
    localStorage.setItem('backstory.audienceRole', role);
  } catch {
    /* preference remains in memory */
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
      intent: result.intent || 'explain',
      source: result.source || '',
      content: result.reply || '',
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
      recommendationReasons: result.recommendationReasons || {},
      draft: result.proposingDraft ? result.draft || null : null,
      artifact: result.buildsArtifact ? result.artifact || null : null,
      error: !!result.error,
    },
  ];
}

export function toApiMessages(turns) {
  return turns.map((t) => ({ role: t.role, content: t.content }));
}

async function postJson(path, payload, signal) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.reply || body.error || `${path} ${res.status}`);
  return body;
}

export function sendChat({ surface, messages, persona, attachments, pageContext, requestMode, audienceRole, signal }) {
  return postJson('/api/chat', { surface, messages, persona, attachments, pageContext, requestMode, audienceRole }, signal);
}

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
        resolve({ name: file.name, mediaType: file.type || 'text/plain', kind, size: file.size, data: String(reader.result) });
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const res = String(reader.result);
        const comma = res.indexOf(',');
        resolve({ name: file.name, mediaType: file.type, kind, size: file.size, data: comma >= 0 ? res.slice(comma + 1) : res });
      };
      reader.readAsDataURL(file);
    }
  });
}

// Turn the builder-panel inputs into a first chat turn that asks for a draft.
export function buildPrompt({ target, platform, goal, trigger, output, timezone, sourceSystems, retryPolicy, deduplication, platformConstraints, sample, formatExample, formatExamples = [] }) {
  const pastedFormatExample = formatExample || sample;
  return [
    `Plan a custom ${target}${platform && platform !== 'Help me choose' ? ` for ${platform}` : ''}.`,
    goal && `What it should do: ${goal}`,
    trigger && `Trigger: ${trigger}`,
    output && `Output / delivery: ${output}`,
    timezone && `Timezone: ${timezone}`,
    sourceSystems && `Source systems / connectors: ${sourceSystems}`,
    retryPolicy && `Failure / retry behavior: ${retryPolicy}`,
    deduplication && `Duplicate prevention: ${deduplication}`,
    platformConstraints && `Platform / credential constraints: ${platformConstraints}`,
    pastedFormatExample && `Desired output format example:\n${pastedFormatExample}`,
    formatExamples.length && `Attached format examples: ${formatExamples.join(', ')}. Match their structure, hierarchy, and style without copying sensitive or customer-specific values.`,
    platform === 'Help me choose' && 'Recommend the best target platform and explain the choice in the plan.',
    'Return a concise plan for review. Do not generate the artifact yet.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function attachmentsForRequest({ requestMode, explicitAttachments, composerAttachments = [], buildAttachments = [] }) {
  if (explicitAttachments !== undefined) return explicitAttachments;
  if (requestMode === 'artifact') return buildAttachments;
  return composerAttachments;
}

export function artifactPrompt(draft) {
  return [
    'Generate the confirmed workflow artifact from this approved plan.',
    draft?.title && `Title: ${draft.title}`,
    draft?.summary && `Summary: ${draft.summary}`,
    draft?.stack && `Platform and stack: ${draft.stack}`,
    draft?.spec && `Plan:\n${draft.spec}`,
    draft?.assumptions && `Assumptions:\n${draft.assumptions}`,
    draft?.openQuestions?.length && `Resolved or remaining questions:\n${draft.openQuestions.join('\n')}`,
    'Return the complete downloadable artifact and no additional recommendations.',
  ].filter(Boolean).join('\n');
}

export function submitDraft({ surface, draft, artifact, persona }) {
  return postJson('/api/submit', { surface, draft, artifact, persona });
}

export function recordAssistantEvent(name, properties = {}) {
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, properties }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics never interrupts the assistant */
  }
}
