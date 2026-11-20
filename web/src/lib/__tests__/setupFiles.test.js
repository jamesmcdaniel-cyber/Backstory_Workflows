import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { SETUP_LIMITS, readSetupFiles } from '../setupFiles.js';

const file = (name, content, extra = {}) => Object.assign(new File([content], name.split('/').pop()), { relativePath: name, ...extra });

describe('readSetupFiles', () => {
  it('reads text files, keeps folder paths, and skips binaries and OS clutter', async () => {
    const result = await readSetupFiles([
      file('inventory/fields.csv', 'Object,Salesforce field\nOpportunity,Region__c\n'),
      file('inventory/.DS_Store', 'x'),
      file('logo.png', 'png'),
      file('notes.txt', 'abc\u0000def'),
    ]);
    expect(result.files.map((item) => item.name)).toEqual(['inventory/fields.csv']);
    expect(result.skipped.map((item) => item.name)).toEqual(['logo.png', 'notes.txt']);
  });

  it('opens a ZIP for its text files', async () => {
    const zip = zipSync({ 'skill/SKILL.md': strToU8('# Skill'), 'skill/assets/logo.png': strToU8('png'), '__MACOSX/skill/._SKILL.md': strToU8('x') });
    const result = await readSetupFiles([new File([zip], 'skill.zip')]);
    expect(result.files.map((item) => item.name)).toEqual(['skill.zip/skill/SKILL.md']);
  });

  it('caps each file and the total, counting files already added', async () => {
    const big = 'x'.repeat(SETUP_LIMITS.perFile + 10);
    const first = await readSetupFiles([file('a.md', big)]);
    expect(first.files[0]).toMatchObject({ truncated: true, size: big.length });
    expect(first.files[0].content).toHaveLength(SETUP_LIMITS.perFile);
    const existing = Array.from({ length: SETUP_LIMITS.files }, (_, index) => ({ name: `f${index}.md`, size: 1, content: 'x' }));
    const more = await readSetupFiles([file('extra.md', 'y')], existing);
    expect(more.files).toEqual([]);
    expect(more.skipped[0].reason).toMatch(/first 30 files/);
  });
});
