import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { packageSkill } from '../skillPackage.js';

describe('packageSkill', () => {
  it('bundles extra files beside SKILL.md and builds identical bytes each time', () => {
    const skill = { name: 'a-b', skillMd: 'x', files: { 'notes.md': new TextEncoder().encode('y') } };
    expect(Object.keys(unzipSync(packageSkill(skill))).sort()).toEqual(['a-b/SKILL.md', 'a-b/notes.md']);
    expect(packageSkill(skill)).toEqual(packageSkill(skill));
  });

  it('puts SKILL.md inside a folder named after the skill', () => {
    const files = unzipSync(packageSkill({ name: 'prepping-calls', skillMd: '---\nname: prepping-calls\n---\n— café\n' }));
    expect(Object.keys(files)).toEqual(['prepping-calls/SKILL.md']);
    expect(strFromU8(files['prepping-calls/SKILL.md'])).toBe('---\nname: prepping-calls\n---\n— café\n');
  });
});
