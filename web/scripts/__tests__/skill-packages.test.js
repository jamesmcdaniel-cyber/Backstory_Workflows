import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MCP_TOOLS } from '../../src/data/mcpTools.js';
import { toolsNamedIn, validatePackagedSkill } from '../../src/lib/skillFormat.js';
import { buildSkillBody, buildSkillPackage, readSkillZip } from '../skill-packages.mjs';

const repo = resolve(import.meta.dirname, '..', '..', '..');
const { skills } = JSON.parse(readFileSync(resolve(repo, 'skills/skills.json'), 'utf8'));
const built = skills.map((skill) => ({ skill, ...buildSkillPackage(skill, repo), body: buildSkillBody(skill) }));

describe('catalogue skill packages', () => {
  it('covers all 30 skills with unique names', () => {
    expect(built).toHaveLength(30);
    expect(new Set(built.map((item) => item.name)).size).toBe(30);
  });

  it.each(built.map((item) => [item.skill.id, item]))('%s meets Claude\'s format rules', (_id, item) => {
    const { name, description } = item.skill.claudeSkill;
    expect(validatePackagedSkill({ name, description, body: item.body }).errors).toEqual([]);
    expect(item.skillMd.startsWith(`---\nname: ${name}\ndescription: "`)).toBe(true);
  });

  it('gives every skill a role and instructions, not just an output format', () => {
    for (const { skill, body } of built) {
      expect(body, skill.id).toMatch(/^(# .+\n+)?You are\b/);
    }
  });

  it('restores the workflow on the five skills that had lost it', () => {
    for (const prefix of ['01', '02', '09', '11', '17']) {
      const { body } = built.find((item) => item.skill.id.startsWith(prefix));
      expect(body, prefix).toMatch(/### Step 1: Find the Account/);
      expect(body, prefix).toMatch(/## Delivery Format/);
      expect(body.indexOf('### Step 1'), prefix).toBeLessThan(body.indexOf('## Delivery Format'));
      expect(body, prefix).not.toMatch(/recently closed/);
    }
  });

  it('writes every tool with its server name, with no doubled prefixes', () => {
    const names = MCP_TOOLS.map((tool) => tool.name).join('|');
    for (const { skill, body } of built) {
      expect(body, skill.id).not.toMatch(new RegExp(`(?<![:\\w])(?:${names})(?!\\w)`));
      expect(body, skill.id).not.toContain('Backstory:Backstory:');
    }
  });

  it('adds the data rules only to skills that call Backstory', () => {
    for (const { skill, body } of built) {
      const callsBackstory = toolsNamedIn(skill.platforms['claude-code'].instructions).length > 0;
      expect(body.includes('## Backstory data rules'), skill.id).toBe(callsBackstory);
    }
  });

  it('bundles the files the skill names and resolves them beside SKILL.md', () => {
    for (const { skill, body, files } of built) {
      expect(body, skill.id).not.toContain('skills/');
      expect(Object.keys(files), skill.id).not.toContain('walkthrough-data.json');
      const assets = resolve(repo, 'skills', skill.id, 'assets');
      if (!existsSync(assets)) continue;
      for (const file of readdirSync(assets).filter((name) => name !== 'walkthrough-data.json')) {
        expect(file in files, `${skill.id}/${file}`).toBe(body.includes(file));
      }
    }
  });

  it('keeps the committed SKILL.md and ZIP in step with skills.json', () => {
    for (const { skill, name, skillMd, files } of built) {
      const dir = resolve(repo, 'skills', skill.id);
      expect(readdirSync(dir), skill.id).toContain('SKILL.md');
      expect(readdirSync(dir), skill.id).not.toContain('skill.md');
      expect(readFileSync(resolve(dir, 'SKILL.md'), 'utf8'), skill.id).toBe(skillMd);
      const zip = readSkillZip(resolve(dir, `${name}.zip`));
      expect(Object.keys(zip).sort(), skill.id).toEqual([`${name}/SKILL.md`, ...Object.keys(files).map((file) => `${name}/${file}`)].sort());
      expect(zip[`${name}/SKILL.md`], skill.id).toBe(skillMd);
    }
  });

  it('fails loudly on an invalid skill, so a bad one cannot ship', () => {
    const skill = { ...skills[0], claudeSkill: { name: 'bad', description: 'No trigger.' } };
    expect(() => buildSkillPackage(skill, repo)).toThrow(/Use when/);
  });
});
