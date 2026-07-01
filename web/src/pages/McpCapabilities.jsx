import { useMemo } from 'react';
import { useData } from '../lib/useData';
import { SectionHero } from '../components/SectionHero';

/** Convert snake_case tool name to "Title Case" human-readable label */
function humanize(toolName) {
  return toolName
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Short, human-readable description of what each Backstory MCP tool does.
 * Kept in sync with the "Available MCP Tools" table in the legacy index.html.
 */
const TOOL_DESCRIPTIONS = {
  find_account: 'Search for accounts by name or domain.',
  get_account_status: 'Account health, engagement score, and risk signals.',
  get_recent_account_activity: 'Meetings, emails, and calls in a time window.',
  get_opportunity_status: 'Deal stage, amount, close date, and activity.',
  get_recent_opportunity_activity: 'Recent deal-level interactions and changes.',
  get_engaged_people: 'Contacts with recent engagement on an account.',
  get_scorecard: 'Rep and team performance metrics.',
  ask_sales_ai_about_account: 'Natural-language queries about any account (10–30s response).',
  ask_sales_ai_about_opportunity: 'Natural-language queries about any deal (10–30s response).',
  top_records: 'Top accounts and opps by activity, risk, or value.',
  account_company_news: "Recent news about an account's company.",
};

function McpToolCard({ tool, count, skills }) {
  const preview = skills.slice(0, 3);
  const remaining = skills.length - preview.length;
  const description = TOOL_DESCRIPTIONS[tool];

  return (
    <div className="flex flex-col rounded-xl border border-ac-light-gray bg-ac-card p-5 shadow-card">
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-ac-dark">
          {humanize(tool)}
        </h3>
        <span className="flex-shrink-0 rounded-md bg-ac-coral/12 px-2 py-0.5 font-mono text-[10.5px] font-medium text-ac-coral-dark">
          {count} {count === 1 ? 'skill' : 'skills'}
        </span>
      </div>
      <code className="mb-2 font-mono text-[11.5px] text-ac-med-gray">{tool}</code>
      {description && (
        <p className="mb-3 text-[13px] leading-snug text-ac-dark-secondary">{description}</p>
      )}
      {preview.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1.5">
          {preview.map((name) => (
            <span
              key={name}
              className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ac-dark-secondary"
            >
              {name}
            </span>
          ))}
          {remaining > 0 && (
            <span className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ac-dark-secondary">
              +{remaining} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function McpCapabilities() {
  const { data, loading, error } = useData('skills.json');

  const tools = useMemo(() => {
    if (!data) return [];
    const toolMap = {};
    for (const skill of data.skills) {
      for (const tool of skill.mcpTools || []) {
        if (!toolMap[tool]) toolMap[tool] = { count: 0, skills: [] };
        toolMap[tool].count += 1;
        toolMap[tool].skills.push(skill.name);
      }
    }
    return Object.entries(toolMap)
      .map(([tool, { count, skills }]) => ({ tool, count, skills }))
      .sort((a, b) => b.count - a.count || a.tool.localeCompare(b.tool));
  }, [data]);

  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Backstory MCP"
        title="MCP Capabilities"
        subtitle="Everything the Backstory MCP can do — the tools your agents and assistants can call."
        image="meeting-bg-05.jpg"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/15 bg-black/45 px-5 py-3 backdrop-blur-md">
            <div className="font-mono text-2xl font-bold tabular-nums">{tools.length || '—'}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">MCP tools</div>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/45 px-5 py-3 backdrop-blur-md">
            <div className="font-mono text-2xl font-bold tabular-nums">{data?.skills.length ?? '—'}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Skills using them</div>
          </div>
        </div>
      </SectionHero>

      {loading && <div className="py-16 text-center text-ac-med-gray">Loading MCP capabilities…</div>}
      {error && (
        <div className="py-16 text-center text-ac-med-gray">
          Failed to load data ({String(error.message)}).
        </div>
      )}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ tool, count, skills }) => (
            <McpToolCard key={tool} tool={tool} count={count} skills={skills} />
          ))}
        </div>
      )}
    </div>
  );
}
