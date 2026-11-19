// Backstory Studio's living inventory of the Backstory connector's tools: how
// each behaves in practice, from building and testing client skills (the BCA
// renewal risk brief, tested on Backstory's own tenant and a demo org). It is
// what the Skill Builder designs around, and each generated skill ships the
// rows for the tools it uses as references/tool-inventory.md.
//
// The connector evolves: this is a dated record, not a fixed rule. Update a
// row (and its date) whenever a tool is re-verified or behaves differently.
export const TOOL_INVENTORY_REVIEWED = '2026-11-19';

export const TOOL_INVENTORY = [
  // Records
  { name: 'preview_records', group: 'Records', useFor: 'Count and check a list query before fetching', params: 'object type; plain-language query', behaviours: 'Rewrites queries it can\'t map, without saying so: date ranges became "next 90 days" or "this year"; renewal type and forecast category became a Stage filter; a tier was matched to Account Name. Always read the filter plan it returns. Its description tells the assistant to stop and wait for the user to confirm, so unattended (scheduled) runs need a scripted alternative: a count check against the last run.', verified: '2026-11-18' },
  { name: 'fetch_records', group: 'Records', useFor: 'Pull the records', params: 'the same object type and query as the preview; a limit above the count', behaviours: 'Same rewriting, and preview and fetch can apply different plans to the same query. Only fields in the connector\'s record-search schema can be filtered or returned: a newly mapped custom field can take 24 hours or more to appear, may not appear at all, and unknown fields are dropped silently. Dates come back as display text ("Nov 28, 2026"), not ISO. Large results can overflow the tool output: fetch one month at a time.', verified: '2026-11-18' },
  { name: 'find_account', group: 'Records', useFor: 'Resolve an account by name', params: 'name', behaviours: 'Name variants and duplicate accounts (several accounts per company); short names can match the wrong account.', verified: '2026-11' },
  { name: 'find_record_by_crm_id', group: 'Records', useFor: 'Map a CRM ID to the Backstory record', params: 'CRM ID', behaviours: 'One record at a time; useful to add records a search missed.', verified: '2026-11' },
  { name: 'top_records', group: 'Records', useFor: 'A relevance-ranked starting list', params: '—', behaviours: 'Not exhaustive and not yet verified for skills: check it before relying on it.', verified: '' },
  // Activity and status
  { name: 'get_recent_account_activity', group: 'Activity and status', useFor: 'Contact history, who is engaged, what was discussed', params: 'days: default 30; pass up to 90 explicitly on every call', behaviours: 'Returns AI summaries, often weekly digests, not email or transcript text: no verbatim quotes and no reliable record of who replied. Summaries sometimes swap buyer and seller. Manual CRM notes aren\'t captured. History depends on what was ingested.', verified: '2026-11-17' },
  { name: 'get_recent_opportunity_activity', group: 'Activity and status', useFor: 'Activity logged against one opportunity', params: 'days: as for account activity', behaviours: 'Same as account activity, and activity is sometimes matched to the wrong opportunity (a renewal meeting under a new-sale opportunity): use it to supplement account activity, not replace it.', verified: '2026-11-17' },
  { name: 'get_account_status', group: 'Activity and status', useFor: 'Current risks, topics and next steps for an account', params: 'fixed 30 days', behaviours: 'Can repeat stale risks from older activity: check the dates. Next steps usually name an owner but no date.', verified: '2026-11' },
  { name: 'get_opportunity_status', group: 'Activity and status', useFor: 'Current risks, topics and next steps for a deal', params: 'fixed 30 days', behaviours: 'Can repeat stale risks from older activity: check the dates. Next steps usually name an owner but no date.', verified: '2026-11' },
  { name: 'get_engaged_people', group: 'Activity and status', useFor: 'Contacts on both sides and how engaged they are', params: 'fixed 30 days', behaviours: 'Returns email addresses: strip them before any output. Includes the seller\'s own people: buyer checks use the customer side only. Returned 403 on some tenants: say so and treat the signal as unknown.', verified: '2026-11' },
  { name: 'get_opportunity_engaged_people', group: 'Activity and status', useFor: 'Contacts on a deal and how engaged they are', params: 'fixed 30 days', behaviours: 'As for account engaged people: emails to strip, both sides returned, 403 on some tenants.', verified: '2026-11' },
  { name: 'ask_sales_ai_about_account', group: 'Activity and status', useFor: 'Targeted questions about an account', params: 'question; fixed 30 days; 10–30 seconds per call', behaviours: 'Reads the same summaries, not raw text; puts paraphrases in quotation marks; has described a filing as something the client said. Never treat its text as the customer\'s words. Call it "Backstory\'s assistant" in anything a person reads.', verified: '2026-11-17' },
  { name: 'ask_sales_ai_about_opportunity', group: 'Activity and status', useFor: 'Targeted questions about a deal', params: 'question; 10–30 seconds per call', behaviours: 'As for the account version. Returned 403 on some tenants: the skill must work without it.', verified: '2026-10' },
  { name: 'get_scorecard', group: 'Activity and status', useFor: 'An account\'s scorecard answers', params: '—', behaviours: 'Returned 403 on some tenants: the skill must work without it. Read the answers returned; never assume a framework or picklist.', verified: '2026-10' },
  { name: 'get_opportunity_scorecard', group: 'Activity and status', useFor: 'A deal\'s qualification scorecard', params: '—', behaviours: 'Returned 403 on some tenants: the skill must work without it. Read the answers returned; never assume a framework or picklist.', verified: '2026-10' },
  { name: 'situation_search', group: 'Activity and status', useFor: 'Similar past situations', params: 'query, filters', behaviours: 'Match scores were unreliable in testing: Studio doesn\'t use it in skills.', verified: '2026-11', avoid: true },
  // News
  { name: 'account_company_news', group: 'News', useFor: 'Mergers, layoffs, leadership change', params: 'account', behaviours: 'Mostly public companies; items are often undated (use a date span); an empty result is not evidence of health.', verified: '2026-11' },
];

/** Tools Studio doesn't build skills on today. */
export const AVOIDED_TOOLS = TOOL_INVENTORY.filter((tool) => tool.avoid).map((tool) => tool.name);

export const TOOL_GAPS = [
  'Raw text (or excerpts) of a given email or transcript, for verbatim quotes.',
  'Who sent and who replied, per message, for two-way contact.',
  'Custom fields in the record-search schema as soon as they are mapped, and an error instead of silently dropping unknown fields.',
  'ISO dates in record output.',
  'Field history (previous values), for trends.',
  'A non-interactive mode for record search (no "stop and wait"), for scheduled runs.',
];

export const VERIFY_STEPS = [
  'Read the tool\'s current description in the session: parameters, defaults, limits.',
  'Make one call on a known account or query and look at the raw output: format, dates, fields present.',
  'For record search: run the same query through preview and fetch and compare the filter plans; request each custom field the skill needs and confirm it comes back with values.',
  'Update the date and any change here.',
];
