// The verified skill library on the Skill Builder page: skills Backstory
// Studio built, checked and verified, ready to download.
//
// To add one: run it through Studio's test levels (references in
// src/data/toolInventory.js and the six levels in pluginFormat.js testPlan),
// put its ZIP in web/public/skill-library/, and add an entry here with the
// levels it passed and when. Never add a skill with a client's name, fields
// or data in it: the library is public.
//
// Levels (Studio's client-plugin method):
//   1 Package and build · 2 Real tool output · 3 Environment canaries ·
//   4 Staged runs · 5 Output quality · 6 Client acceptance
export const TEST_LEVELS = [
  { level: 1, title: 'Package and build' },
  { level: 2, title: 'Real tool output' },
  { level: 3, title: 'Environment canaries' },
  { level: 4, title: 'Staged runs' },
  { level: 5, title: 'Output quality' },
  { level: 6, title: 'Client acceptance' },
];

export const SKILL_LIBRARY = [
  {
    id: 'renewal-risk-brief',
    title: 'Renewal risk brief',
    question: 'Which of our largest upcoming renewals are at risk, why, and where should leaders step in this week?',
    summary: "Studio's most-tested skill: a weekly page of upcoming renewals rated across six areas of account health, each call backed by dated evidence, with Backstory's risk level next to the team's own forecast and the moves leaders should make. Generalized from a client build: it runs on standard Salesforce fields, with optional enrichment fields (region, tier, notice date) set in settings.",
    audience: 'Sales leader',
    cadence: 'Weekly',
    output: 'Publishes a page',
    tools: ['preview_records', 'fetch_records', 'find_record_by_crm_id', 'get_account_status', 'get_recent_account_activity', 'get_recent_opportunity_activity', 'get_engaged_people', 'ask_sales_ai_about_account', 'account_company_news'],
    builds: [
      {
        platform: 'claude',
        name: 'renewal-risk-brief',
        version: '0.6.0',
        file: 'skill-library/renewal-risk-brief-claude-0.6.0.zip',
        downloadAs: 'renewal-risk-brief-0.6.0.zip',
        levels: [1, 2],
        verified: '2026-11-19',
        checks: [
          'Passed claude plugin validate; versions agree across the manifest, SKILL.md and README.',
          'Its own suite passed 42 of 42 cases (check_fixtures.py): every outcome rule, pages that must render, data that must be rejected for the right reason, and the scripts end to end, including a run on standard fields only.',
          'Fixtures replay Backstory\'s real record format, including display dates ("Nov 28, 2026"), the format that would have emptied the client version\'s brief.',
          'Scanned clean: no client names, custom fields, people, emails or tenant results.',
        ],
      },
    ],
  },
  {
    id: 'quarterly-deal-risk-brief',
    title: 'Quarterly deal risk brief',
    question: "Which of my team's open deals closing this quarter have gone quiet or lack an engaged decision-maker, and what should I ask each rep about them in our 1:1?",
    summary: "A weekly brief that ranks a sales team's open deals closing this quarter by risk (gone quiet, no decision-maker engaged), with dated Backstory evidence and 1:1 questions for each rep.",
    audience: 'Sales manager',
    cadence: 'Weekly',
    output: 'Publishes a page',
    tools: ['preview_records', 'fetch_records', 'get_recent_opportunity_activity', 'get_opportunity_status', 'get_opportunity_engaged_people', 'ask_sales_ai_about_opportunity', 'get_opportunity_scorecard'],
    builds: [
      {
        platform: 'claude',
        name: 'quarterly-deal-risk-brief',
        version: '0.1.0',
        file: 'skill-library/quarterly-deal-risk-brief-claude-0.1.0.zip',
        downloadAs: 'quarterly-deal-risk-brief-0.1.0.zip',
        levels: [1, 2],
        verified: '2026-11-19',
        checks: [
          'Passed claude plugin validate and every Skill Builder check, including the Studio method.',
          'Script tests passed in Python: population (9) and assemble, after two fixes.',
          'population.py run on records shaped like Backstory\'s output: "Nov 28, 2026", "December 15, 2026" and ISO dates parsed; next quarter\'s and Closed Won deals dropped with reasons; a count move past 30% stopped the run (exit 4).',
        ],
      },
      {
        platform: 'chatgpt',
        name: 'quarterly-pipeline-1on1-brief',
        version: '0.1.0',
        file: 'skill-library/quarterly-pipeline-1on1-brief-chatgpt-0.1.0.zip',
        downloadAs: 'skill.zip',
        levels: [1, 2],
        verified: '2026-11-19',
        checks: [
          'Passed OpenAI\'s skill validator (quick_validate.py) and every Skill Builder check, including the Studio method.',
          'Script tests passed in Python: population (13) and assemble, after one fix.',
          'population.py run on records shaped like Backstory\'s output: display and ISO dates parsed to ISO; next quarter\'s and Closed Won deals dropped with reasons; a count move stopped the run (exit 4); a fetch with nothing in scope stopped it (exit 3).',
          'Not yet confirmed: that ChatGPT runs the skill\'s Python scripts.',
        ],
      },
    ],
  },
];
