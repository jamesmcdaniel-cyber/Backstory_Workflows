import { MCP_TOOLS } from '../data/mcpTools.js';

// The SKILL.md contract for packaged Claude Skills (the catalogue's signals),
// and the checks the Plugin Builder reuses for the skill inside each plugin.
// Name and body limits come from Anthropic's skill authoring docs. The docs allow 1,024 characters for a description but
// Claude's help article says 200, so we hold to 200 to pass under both.
export const SKILL_LIMITS = { nameMax: 64, descriptionMax: 200, bodyMaxLines: 500 };

export const RESERVED = new Set(['anthropic', 'claude']);
const XML_TAG = /<[^>]+>/;
const TOOL_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));
// Tools that take a Backstory ID, which only the "find" tools can supply.
const NEEDS_ID = new Set(MCP_TOOLS.filter((tool) => tool.group !== 'find').map((tool) => tool.name));
const FINDS_ID = new Set(MCP_TOOLS.filter((tool) => tool.group === 'find').map((tool) => tool.name));

export function slugifySkillName(raw) {
  const slug = String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter((part) => part && !RESERVED.has(part))
    .join('-')
    .slice(0, SKILL_LIMITS.nameMax)
    .replace(/-+$/, '');
  return slug || 'backstory-skill';
}

export function composeSkillMd({ name, description, body }) {
  // A double-quoted JSON string is a valid YAML scalar, so colons and quotes in
  // the description can't break the frontmatter.
  const yamlDescription = JSON.stringify(String(description || '').replace(/\s+/g, ' ').trim());
  return `---\nname: ${name}\ndescription: ${yamlDescription}\n---\n\n${String(body || '').trim()}\n`;
}

/** Every Backstory tool a skill body names, in first-mention order, including invented ones. */
export function toolsNamedIn(body) {
  const text = String(body || '');
  const found = new Set();
  // `Backstory:anything` is always a tool reference; bare snake_case only counts
  // when it looks like a tool call, because params like `object_type` are legal.
  for (const match of text.matchAll(/(?:Backstory:([a-z][a-z0-9_]*))|\b((?:get|find|fetch|top|preview|ask|account|situation)_[a-z0-9_]+)\b/g)) {
    const name = match[1] || match[2];
    if (match[1] || TOOL_BY_NAME.has(name) || /^(?:get|fetch|ask)_/.test(name)) found.add(name);
  }
  return [...found];
}

function check(checks, errors, name, problem, okDetail) {
  checks.push({ name, passed: !problem, detail: problem || okDetail });
  if (problem) errors.push(problem);
}

export function nameProblem(name) {
  if (!name) return 'The skill needs a name.';
  if (name.length > SKILL_LIMITS.nameMax) return `The name is over ${SKILL_LIMITS.nameMax} characters.`;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) return 'The name can only use lowercase letters, numbers, and single hyphens.';
  if (name.split('-').some((part) => RESERVED.has(part))) return 'The name cannot include "claude" or "anthropic".';
  return '';
}

function descriptionProblem(description) {
  if (!description) return 'The skill needs a description.';
  if (description.length > SKILL_LIMITS.descriptionMax) return `The description is ${description.length} characters; the limit is ${SKILL_LIMITS.descriptionMax}.`;
  if (XML_TAG.test(description)) return 'The description cannot contain XML tags.';
  if (!/\buse when\b/i.test(description)) return 'The description must say when to use the skill ("Use when…"), or Claude will not know when to load it.';
  return '';
}

export function toolProblem(tools) {
  const known = tools.filter((tool) => TOOL_BY_NAME.has(tool));
  const unknown = tools.filter((tool) => !TOOL_BY_NAME.has(tool));
  if (unknown.length) return `These are not Backstory MCP tools: ${unknown.join(', ')}.`;
  if (!known.length) return 'The skill never calls a Backstory MCP tool.';
  return '';
}

export function sequenceProblem(tools, body) {
  const hasFind = tools.some((tool) => FINDS_ID.has(tool));
  if (!hasFind && tools.some((tool) => NEEDS_ID.has(tool))) return 'The skill calls tools that need a Backstory ID but never looks one up first.';
  if (tools.includes('fetch_records') && !tools.includes('preview_records')) return 'fetch_records only works after preview_records.';
  if (tools.includes('preview_records') && !/\bconfirm/i.test(body)) return 'A list query must stop and wait for the user to confirm the preview.';
  return '';
}

export function wordingProblem(body) {
  if (/\bsales ?ai\b/i.test(body)) return 'Customer-facing text says "Sales AI"; it should say "Backstory\'s assistant".';
  if (/\b(?:60|90)[- ]days?\b[^.\n]*\breliabl|\breliabl[^.\n]*\b(?:60|90)[- ]days?\b/i.test(body)) return 'The skill calls data past 30 days reliable. Backstory is most reliable for the last 30 days.';
  return '';
}

// The bar for catalogue skills: they must install and describe Backstory
// accurately, but some advise on workflow design and never call a tool.
export function validatePackagedSkill({ name, description, body } = {}) {
  const text = String(body || '');
  const unknown = toolsNamedIn(text).filter((tool) => !TOOL_BY_NAME.has(tool));
  const errors = [
    nameProblem(name),
    descriptionProblem(description),
    !text.trim() ? 'The skill has no instructions.' : '',
    text.split('\n').length > SKILL_LIMITS.bodyMaxLines ? `The instructions are over ${SKILL_LIMITS.bodyMaxLines} lines.` : '',
    unknown.length ? `These are not Backstory MCP tools: ${unknown.join(', ')}.` : '',
    wordingProblem(text),
  ].filter(Boolean);
  return { valid: errors.length === 0, errors };
}

export function validateSkill({ name, description, body } = {}) {
  const errors = [];
  const checks = [];
  const text = String(body || '');
  const tools = toolsNamedIn(text);
  const lines = text.split('\n').length;

  check(checks, errors, 'Skill name', nameProblem(name), 'Meets Claude\'s naming rules.');
  check(checks, errors, 'Description', descriptionProblem(description), 'Says what it does and when Claude should use it.');
  check(checks, errors, 'Length', !text.trim() ? 'The skill has no instructions.' : lines > SKILL_LIMITS.bodyMaxLines ? `The instructions run ${lines} lines; keep them under ${SKILL_LIMITS.bodyMaxLines}.` : '', `${lines} lines of instructions.`);
  check(checks, errors, 'Backstory tools', toolProblem(tools), `Uses ${tools.length} real Backstory tool${tools.length === 1 ? '' : 's'}.`);
  check(checks, errors, 'Tool order', sequenceProblem(tools, text), 'Looks records up first and confirms lists before pulling them.');
  check(checks, errors, 'Steps', /^\d+\.\s+\S/m.test(text) ? '' : 'The skill needs numbered steps Claude can follow.', 'Has numbered steps to follow.');
  check(checks, errors, 'Missing data', /\b(?:missing|no data|not found|isn't|doesn't have|does not have|comes back empty|unavailable)\b/i.test(text) ? '' : 'The skill must say what to do when Backstory has no data, so Claude does not fill the gap by guessing.', 'Says what to do when data is missing.');
  check(checks, errors, 'Wording', wordingProblem(text), 'Describes Backstory accurately.');

  return { valid: errors.length === 0, errors, checks, tools: tools.filter((tool) => TOOL_BY_NAME.has(tool)) };
}
