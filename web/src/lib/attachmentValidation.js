export const MAX_ATTACHMENT_COUNT = 4;
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 3 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const TEXT_TYPES = new Set(['', 'text/plain', 'text/markdown', 'text/csv', 'application/json']);

export function sanitizeAttachmentName(value) {
  const leaf = String(value || 'attachment').split(/[\\/]/).pop();
  return leaf.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) || 'attachment';
}

export function attachmentDataBytes(attachment) {
  const data = String(attachment?.data || '');
  if (attachment?.kind === 'image' || attachment?.kind === 'document') {
    const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((data.length * 3) / 4) - padding);
  }
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(data).length;
  return unescape(encodeURIComponent(data)).length;
}

function validKindAndType(attachment) {
  const mediaType = String(attachment?.mediaType || '').toLowerCase();
  if (attachment?.kind === 'image') return IMAGE_TYPES.has(mediaType);
  if (attachment?.kind === 'document') return mediaType === 'application/pdf';
  if (attachment?.kind === 'text') return TEXT_TYPES.has(mediaType);
  return false;
}

export function validateAttachments(value) {
  const attachments = Array.isArray(value) ? value : [];
  const errors = [];
  if (attachments.length > MAX_ATTACHMENT_COUNT) errors.push(`Attach no more than ${MAX_ATTACHMENT_COUNT} files.`);
  let totalBytes = 0;
  const normalized = attachments.slice(0, MAX_ATTACHMENT_COUNT).map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object' || typeof attachment.data !== 'string') {
      errors.push(`Attachment ${index + 1} is malformed.`);
      return null;
    }
    if (!validKindAndType(attachment)) errors.push(`${sanitizeAttachmentName(attachment.name)} has an unsupported file type.`);
    if ((attachment.kind === 'image' || attachment.kind === 'document') && !/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.data)) {
      errors.push(`${sanitizeAttachmentName(attachment.name)} is not valid base64 data.`);
    }
    const bytes = attachmentDataBytes(attachment);
    totalBytes += bytes;
    if (bytes > MAX_ATTACHMENT_BYTES) errors.push(`${sanitizeAttachmentName(attachment.name)} is larger than 3 MB.`);
    return { ...attachment, name: sanitizeAttachmentName(attachment.name), size: bytes };
  }).filter(Boolean);
  if (totalBytes > MAX_ATTACHMENT_TOTAL_BYTES) errors.push('Attachments must total 3 MB or less.');
  return { valid: errors.length === 0, errors: [...new Set(errors)], attachments: normalized, totalBytes };
}
