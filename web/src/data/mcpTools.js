// Canonical descriptions of the Backstory MCP tools — what each tool does.
// Single source of truth shared by the MCP Capabilities page (web/src) and the
// catalogue assistant's server-side context (web/api, via scripts/sync-data.mjs).
// Mirrors the "Available MCP Tools" table in the legacy index.html — keep in sync.
export const MCP_TOOLS = [
  { name: 'find_account', description: 'Search for accounts by name or domain.' },
  { name: 'get_account_status', description: 'Account health, engagement score, and risk signals.' },
  { name: 'get_recent_account_activity', description: 'Meetings, emails, and calls in a time window.' },
  { name: 'get_opportunity_status', description: 'Deal stage, amount, close date, and activity.' },
  { name: 'get_recent_opportunity_activity', description: 'Recent deal-level interactions and changes.' },
  { name: 'get_engaged_people', description: 'Contacts with recent engagement on an account.' },
  { name: 'get_scorecard', description: 'Rep and team performance metrics.' },
  { name: 'ask_sales_ai_about_account', description: 'Natural-language queries about any account (10–30s response).' },
  { name: 'ask_sales_ai_about_opportunity', description: 'Natural-language queries about any deal (10–30s response).' },
  { name: 'top_records', description: 'Top accounts and opps by activity, risk, or value.' },
  { name: 'account_company_news', description: "Recent news about an account's company." },
];

/** Lookup of tool name → short description. */
export const MCP_TOOL_DESCRIPTIONS = Object.fromEntries(
  MCP_TOOLS.map((t) => [t.name, t.description]),
);
