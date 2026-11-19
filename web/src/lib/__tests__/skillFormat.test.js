import { describe, expect, it } from 'vitest';
import { composeSkillMd, slugifySkillName, toolsNamedIn, validateSkill } from '../skillFormat.js';

const body = `# Call prep

1. Call Backstory:find_account with the account name.
2. Call Backstory:get_account_status with the account ID.
3. If a section comes back empty, say that Backstory has no data for it.`;

const skill = { name: 'prepping-customer-calls', description: 'Builds a call brief from Backstory. Use when someone is preparing for a customer call.', body };

const errorsFor = (overrides) => validateSkill({ ...skill, ...overrides }).errors.join(' ');

describe('slugifySkillName', () => {
  it('produces a valid slug without reserved words', () => {
    expect(slugifySkillName('Claude Call Prep!')).toBe('call-prep');
    expect(slugifySkillName('anthropic')).toBe('backstory-skill');
    expect(slugifySkillName('x'.repeat(80))).toHaveLength(64);
  });
  it('does not leave a trailing hyphen when truncating', () => {
    expect(slugifySkillName(`${'a'.repeat(63)} b`).endsWith('-')).toBe(false);
  });
});

describe('composeSkillMd', () => {
  it('writes frontmatter that survives colons and quotes in the description', () => {
    const md = composeSkillMd({ name: 'a-b', description: 'Note: use "this"\nwhen asked', body: '# Hi' });
    expect(md).toBe('---\nname: a-b\ndescription: "Note: use \\"this\\" when asked"\n---\n\n# Hi\n');
  });
});

describe('toolsNamedIn', () => {
  it('finds prefixed and bare tools and ignores parameter names', () => {
    expect(toolsNamedIn('Backstory:find_account then `get_scorecard` with `object_type` and `peopleai_account_id`')).toEqual(['find_account', 'get_scorecard']);
  });
  it('surfaces invented tools', () => {
    expect(toolsNamedIn('Call Backstory:update_crm then get_calendar_events')).toEqual(['update_crm', 'get_calendar_events']);
  });
});

describe('validateSkill', () => {
  it('passes a well-formed skill and reports the tools it uses', () => {
    const result = validateSkill(skill);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.tools).toEqual(['find_account', 'get_account_status']);
  });

  it('enforces Claude frontmatter rules', () => {
    expect(errorsFor({ name: 'Call_Prep' })).toMatch(/lowercase/);
    expect(errorsFor({ name: 'claude-prep' })).toMatch(/cannot include/);
    expect(errorsFor({ description: '' })).toMatch(/needs a description/);
    expect(errorsFor({ description: `Use when ${'x'.repeat(200)}` })).toMatch(/limit is 200/);
    expect(errorsFor({ description: 'Use when <b>asked</b>.' })).toMatch(/XML/);
    expect(errorsFor({ description: 'Builds a call brief.' })).toMatch(/Use when/);
  });

  it('rejects invented tools and skills with no tools', () => {
    expect(errorsFor({ body: `${body}\n4. Call Backstory:update_crm.` })).toMatch(/not Backstory MCP tools: update_crm/);
    expect(errorsFor({ body: '1. Think hard.\n2. Say no data if missing.' })).toMatch(/never calls/);
  });

  it('requires a lookup before tools that take an ID', () => {
    expect(errorsFor({ body: '1. Call Backstory:get_account_status.\n2. Say no data if missing.' })).toMatch(/never looks one up/);
  });

  it('requires the preview, confirm, fetch order for lists', () => {
    expect(errorsFor({ body: '1. Call Backstory:fetch_records.\n2. Say no data if missing.' })).toMatch(/after preview_records/);
    expect(errorsFor({ body: '1. Call Backstory:preview_records.\n2. Call Backstory:fetch_records.\n3. Say no data if missing.' })).toMatch(/wait for the user to confirm/);
    expect(errorsFor({ body: '1. Call Backstory:preview_records and wait for the user to confirm.\n2. Call Backstory:fetch_records.\n3. Say no data if missing.' })).toBe('');
  });

  it('requires steps and a missing-data rule', () => {
    expect(errorsFor({ body: 'Call Backstory:find_account. Say no data if missing.' })).toMatch(/numbered steps/);
    expect(errorsFor({ body: '1. Call Backstory:find_account.' })).toMatch(/no data/);
  });

  it('holds the Backstory wording rules without tripping on tool names', () => {
    expect(errorsFor({ body: `${body}\n4. Ask Sales AI about it.` })).toMatch(/Backstory's assistant/);
    expect(errorsFor({ body: `${body}\n4. Backstory is reliable for 90 days.` })).toMatch(/past 30 days reliable/);
    expect(errorsFor({ body: `${body}\n4. Ask Sales AI.` })).toMatch(/Backstory's assistant/);
    expect(errorsFor({ body: `${body}\n4. The name "Sales AI" never appears where a person reads.` })).not.toMatch(/Backstory's assistant/);
    expect(errorsFor({ body: `${body}\n4. Call it Backstory's assistant, never "Sales AI."` })).not.toMatch(/Backstory's assistant/);
    expect(errorsFor({ body: `${body}\n4. Nothing past 30 days is treated as reliable, even with a 90-day lookback.` })).not.toMatch(/past 30 days reliable/);
    expect(errorsFor({ body: `${body}\n4. Call Backstory:ask_sales_ai_about_account for 90 days of themes.` })).toBe('');
  });
});
