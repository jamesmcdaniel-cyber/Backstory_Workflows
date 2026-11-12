// Builds the installable Claude Skill for each catalogue skill: skills/<id>/SKILL.md
// and skills/<id>/<name>.zip, from skills/skills.json. Run by sync-data on every
// build, which fails if any skill breaks Claude's format rules.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { MCP_TOOLS } from '../src/data/mcpTools.js';
import { composeSkillMd, validatePackagedSkill } from '../src/lib/skillFormat.js';
import { packageSkill } from '../src/lib/skillPackage.js';

// Written for Claude.ai and Claude Code, where the catalogue's instructions can
// otherwise promise data the MCP doesn't return. Mirrors the limits on
// customerforlife.ai/resources/questions.
const DATA_RULES = `## Backstory data rules

These rules take priority over anything above.

- This skill needs the Backstory MCP connector. If its tools aren't available, say so and stop.
- Use only what Backstory returns. If something above asks for data Backstory doesn't have, write "Backstory has no data for this" or leave that part out. Never invent names, dates, amounts, or trends. Label any score you calculate as an estimate.
- Status, activity, and engagement cover the last 30 days, which is where Backstory is most reliable. Backstory can't show change over time, stage history, forecast categories, or lists of won and lost deals.
- Backstory is read-only. Draft for a person to send, and never claim to have updated or sent anything.
- Before running tools across many records, show the list and let the user choose the ones that matter.
- For a list of accounts or deals, call Backstory:preview_records, relay the count and how Backstory read the request, and wait for the user to confirm before calling Backstory:fetch_records.`;

const TOOL_REFERENCE = new RegExp(`(?<![:\\w])(${MCP_TOOLS.map((tool) => tool.name).join('|')})(?!\\w)`, 'g');
// Site data that lives with the skill's assets but isn't part of the skill.
const NOT_BUNDLED = new Set(['walkthrough-data.json']);

export function buildSkillBody(skill) {
  const instructions = skill.platforms['claude-code'].instructions
    // Repo paths don't exist once installed; bundled files sit beside SKILL.md.
    .replaceAll(`skills/${skill.id}/assets/`, '')
    .trim();
  const qualified = instructions.replace(TOOL_REFERENCE, 'Backstory:$1');
  return qualified === instructions ? qualified : `${qualified}\n\n${DATA_RULES}`;
}

export function buildSkillPackage(skill, repo) {
  const { name, description } = skill.claudeSkill;
  const body = buildSkillBody(skill);
  const validation = validatePackagedSkill({ name, description, body });
  if (!validation.valid) throw new Error(`${skill.id}: ${validation.errors.join(' ')}`);
  const assets = resolve(repo, 'skills', skill.id, 'assets');
  // Claude only opens a bundled file when SKILL.md names it, so nothing else ships.
  const files = {};
  if (existsSync(assets)) {
    for (const file of readdirSync(assets)) {
      if (!NOT_BUNDLED.has(file) && body.includes(file)) files[file] = readFileSync(resolve(assets, file));
    }
  }
  const skillMd = composeSkillMd({ name, description, body });
  return { name, skillMd, files, zip: packageSkill({ name, skillMd, files }) };
}

function writeIfChanged(path, content) {
  if (!existsSync(path) || !Buffer.from(content).equals(readFileSync(path))) writeFileSync(path, content);
}

export function writeSkillPackages(skills, repo) {
  return skills.map((skill) => {
    const built = buildSkillPackage(skill, repo);
    const dir = resolve(repo, 'skills', skill.id);
    writeIfChanged(resolve(dir, 'SKILL.md'), built.skillMd);
    writeIfChanged(resolve(dir, `${built.name}.zip`), built.zip);
    return { id: skill.id, ...built };
  });
}

export function readSkillZip(path) {
  return Object.fromEntries(Object.entries(unzipSync(readFileSync(path))).map(([file, bytes]) => [file, strFromU8(bytes)]));
}
