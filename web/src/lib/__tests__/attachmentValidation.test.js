import { describe, expect, it } from 'vitest';
import {
  MAX_ATTACHMENT_TOTAL_BYTES,
  sanitizeAttachmentName,
  validateAttachments,
} from '../attachmentValidation';

describe('attachment validation', () => {
  it('normalizes safe supported attachments', () => {
    const result = validateAttachments([{ name: '../sample.md', mediaType: 'text/markdown', kind: 'text', data: '# Example' }]);
    expect(result.valid).toBe(true);
    expect(result.attachments[0].name).toBe('sample.md');
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  it('rejects unsupported types, malformed base64, excessive counts, and aggregate size', () => {
    expect(validateAttachments([{ name: 'vector.svg', mediaType: 'image/svg+xml', kind: 'image', data: 'PHN2Zz4=' }]).valid).toBe(false);
    expect(validateAttachments([{ name: 'bad.png', mediaType: 'image/png', kind: 'image', data: 'not base64!' }]).valid).toBe(false);
    expect(validateAttachments(Array.from({ length: 5 }, (_, index) => ({ name: `${index}.txt`, mediaType: 'text/plain', kind: 'text', data: 'x' }))).valid).toBe(false);
    const oversized = validateAttachments([{ name: 'large.txt', mediaType: 'text/plain', kind: 'text', data: 'x'.repeat(MAX_ATTACHMENT_TOTAL_BYTES + 1) }]);
    expect(oversized.errors.join(' ')).toMatch(/total 3 MB or less/);
  });

  it('removes path and control characters from names', () => {
    expect(sanitizeAttachmentName('../folder/\u0000secret.csv')).toBe('secret.csv');
  });
});
