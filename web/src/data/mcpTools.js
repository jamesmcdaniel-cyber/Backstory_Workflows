// Canonical descriptions of the Backstory MCP tools — what each tool does.
// Single source of truth shared by the MCP Capabilities page (web/src) and the
// catalogue assistant's server-side context (web/api, via scripts/sync-data.mjs).
// Mirrors the "MCP tools" tables in the legacy index.html — keep in sync.
// 17 tools, confirmed against a live connection on 2026-09-24.
export const MCP_TOOLS = [
  // Find records — return the Backstory IDs the other tools take.
  { name: 'find_account', group: 'find', description: 'Search for an account by name; returns its account ID and opportunities.', notes: 'Near-exact match' },
  { name: 'find_record_by_crm_id', group: 'find', description: 'Look up an account or opportunity by its CRM (Salesforce) ID.', notes: 'One record at a time' },
  { name: 'top_records', group: 'find', description: 'Your 20 most relevant accounts and their open opportunities.', notes: 'Relevance-ranked, not exhaustive' },
  { name: 'preview_records', group: 'find', description: 'Step 1 of a plain-language list query (for example, deals closing this quarter): returns a count, then waits for confirmation.', notes: 'Pair with fetch_records' },
  { name: 'fetch_records', group: 'find', description: 'Step 2 of a list query: returns the records confirmed in preview_records.', notes: 'Up to 1,000 records' },
  // Account tools — take a Backstory account ID.
  { name: 'get_account_status', group: 'account', description: 'Default account overview: risks, next steps, and topics from the last 30 days.', notes: '' },
  { name: 'get_recent_account_activity', group: 'account', description: 'Summaries of matched emails and meetings from the last 30 days.', notes: '' },
  { name: 'get_engaged_people', group: 'account', description: 'External and internal people involved, with email and meeting counts for each.', notes: '' },
  { name: 'get_scorecard', group: 'account', description: "The account's scorecard questions and answers.", notes: '' },
  { name: 'account_company_news', group: 'account', description: "Recent news and filings about the account's company.", notes: 'Publicly traded companies only' },
  { name: 'ask_sales_ai_about_account', group: 'account', description: 'Open-ended, natural-language analysis of an account from SalesAI.', notes: 'Slower (10–30s)' },
  // Opportunity tools — take a Backstory opportunity ID.
  { name: 'get_opportunity_status', group: 'opportunity', description: 'Default deal overview: risks, next steps, and topics.', notes: '' },
  { name: 'get_recent_opportunity_activity', group: 'opportunity', description: 'Deal communications from the last 30 days.', notes: '' },
  { name: 'get_opportunity_engaged_people', group: 'opportunity', description: 'Who is involved in the deal, on both sides.', notes: '' },
  { name: 'get_opportunity_scorecard', group: 'opportunity', description: 'Qualification scorecard for the deal (MEDDIC, MEDDPICC, SPICED, and others).', notes: '' },
  { name: 'ask_sales_ai_about_opportunity', group: 'opportunity', description: 'Open-ended deal analysis with recommended actions from SalesAI.', notes: 'Slower (10–30s)' },
  // Works on accounts or opportunities.
  { name: 'situation_search', group: 'either', description: 'Find past accounts or deals that faced a similar situation, and how each turned out.', notes: 'Where enabled' },
];

/** Lookup of tool name → short description. */
export const MCP_TOOL_DESCRIPTIONS = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t.description]),
);

/** Tools in one group, in listed order. */
export const mcpToolsIn = (group) => MCP_TOOLS.filter((t) => t.group === group);
