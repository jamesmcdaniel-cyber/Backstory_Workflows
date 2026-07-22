import { SectionHero } from '../components/SectionHero';
import { Tabs } from '../components/ui/Tabs';
import { CopyButton } from '../components/ui/CopyButton';
import { cn } from '../lib/cn';

/* ---------- prose primitives ---------- */
const H2 = (p) => <h2 className="mt-10 font-display text-[18px] font-bold tracking-[-0.01em] text-ac-dark" {...p} />;
const H3 = (p) => <h3 className="mt-6 font-display text-[14.5px] font-bold text-ac-dark" {...p} />;
const P = (p) => <p className="mt-3 text-[14px] leading-7 text-ac-dark-secondary" {...p} />;

function Code({ children }) {
  return <code className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[12px] text-ac-dark-secondary">{children}</code>;
}

function CodeBlock({ children, label }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-wf-border bg-wf-bg">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/50">{label || 'shell'}</span>
        <CopyButton text={children} className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white" />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-6 text-wf-text">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Callout({ tone = 'note', children }) {
  const tones = {
    note: 'border-ac-light-gray bg-ac-warm-white',
    tip: 'border-ac-success/40 bg-ac-success/10',
    warning: 'border-ac-coral/40 bg-ac-coral/10',
  };
  return <div className={cn('mt-4 rounded-xl border p-3.5 text-[13.5px] leading-6 text-ac-dark-secondary', tones[tone])}>{children}</div>;
}

function ToolTable({ rows }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-ac-light-gray">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-ac-warm-white">
            {['Tool', 'What it does', 'Notes'].map((h) => (
              <th key={h} className="border-b border-ac-light-gray px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-ac-light-gray last:border-0">
              <td className="whitespace-nowrap px-3 py-2.5 align-top">
                <code className="font-mono text-[12px] text-ac-dark">{r.name}</code>
              </td>
              <td className="px-3 py-2.5 align-top text-ac-dark-secondary">{r.does}</td>
              <td className="px-3 py-2.5 align-top text-ac-med-gray">{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- connection config, ported verbatim from the docs ---------- */
const MCP_URL = 'https://mcp.backstory.ai/mcp';

const CLIENT_TABS = [
  {
    value: 'claude-code',
    label: 'Claude Code',
    content: (
      <>
        <P>Add the remote server from the CLI, then sign in.</P>
        <CodeBlock label="terminal">{`claude mcp add --transport http backstory ${MCP_URL}`}</CodeBlock>
        <P>Then run <Code>/mcp</Code> inside Claude Code and complete the browser sign-in.</P>
      </>
    ),
  },
  {
    value: 'cursor',
    label: 'Cursor',
    content: (
      <>
        <P>Save this as <Code>.cursor/mcp.json</Code> in your project (or the global Cursor config).</P>
        <CodeBlock label=".cursor/mcp.json">{`{
  "mcpServers": {
    "backstory": {
      "url": "${MCP_URL}"
    }
  }
}`}</CodeBlock>
      </>
    ),
  },
  {
    value: 'vscode',
    label: 'VS Code',
    content: (
      <>
        <P>Save this as <Code>.vscode/mcp.json</Code>. Note VS Code uses <Code>servers</Code> (not <Code>mcpServers</Code>).</P>
        <CodeBlock label=".vscode/mcp.json">{`{
  "servers": {
    "backstory": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`}</CodeBlock>
      </>
    ),
  },
  {
    value: 'desktop',
    label: 'Claude Desktop / ChatGPT',
    content: (
      <>
        <P>No file editing required — add it through the UI.</P>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] leading-7 text-ac-dark-secondary">
          <li>Open <strong>Settings → Connectors → Add custom connector</strong>.</li>
          <li>Name it <Code>Backstory</Code>.</li>
          <li>Enter the URL below and complete the OAuth sign-in.</li>
        </ol>
        <CodeBlock label="connector url">{MCP_URL}</CodeBlock>
      </>
    ),
  },
];

/* ---------- tool reference, from the MCP Tools docs ---------- */
const FIND_TOOLS = [
  { name: 'find_account', does: 'Retrieve an account ID, domain, and open opportunities from a company name.', notes: 'Near-exact match; returns IDs and open opportunities only.' },
  { name: 'find_record_by_crm_id', does: 'Map a CRM record ID to its Backstory account or opportunity.', notes: 'Single record resolution, without metrics.' },
  { name: 'top_records', does: 'Discover the most relevant accounts in your portfolio.', notes: 'About 20 records, relevance-ranked — not exhaustive.' },
];

const ACCOUNT_TOOLS = [
  { name: 'get_account_status', does: 'Risks, agreed next steps, and topics under discussion.', notes: '' },
  { name: 'get_recent_account_activity', does: 'Weekly summaries of matched emails, calls, and meetings.', notes: '' },
  { name: 'account_company_news', does: 'Recent public news about the account’s company.', notes: 'Publicly traded companies only; private accounts return no data.' },
  { name: 'ask_sales_ai_about_account', does: 'Open-ended, natural-language questions about an account.', notes: 'Slower — LLM-based.' },
  { name: 'get_engaged_people', does: 'Engaged contacts with titles and activity counts.', notes: '' },
  { name: 'get_scorecard', does: 'Scorecard completion for MEDDIC, MEDDPICC, and SPICED.', notes: '' },
];

const OPPORTUNITY_TOOLS = [
  { name: 'get_opportunity_status', does: 'Risks, next steps, and deal topics.', notes: '' },
  { name: 'get_recent_opportunity_activity', does: 'Weekly matched-activity summaries for a deal.', notes: '' },
  { name: 'ask_sales_ai_about_opportunity', does: 'Deal questions with recommended actions.', notes: 'Slower — LLM-based.' },
  { name: 'situation_search', does: 'Find precedent deals with similar situations and their outcomes.', notes: 'Up to 4 precedent cases above a 70% match.' },
];

export function McpCapabilities() {
  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Backstory MCP"
        title="Connect the MCP"
        subtitle="A remote Model Context Protocol server that lets your AI clients query Backstory in natural language. Read-only, permission-scoped, ~5 minutes to set up."
        image="meeting-bg-05.jpg"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">13</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Read-only tools</div>
          </div>
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">OAuth 2.0</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">PKCE S256</div>
          </div>
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">30 days</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Activity window</div>
          </div>
        </div>
      </SectionHero>

      <div className="mx-auto max-w-3xl pb-8">
        {/* ---------- overview ---------- */}
        <H2>Overview</H2>
        <P>
          The Backstory MCP server lets AI clients query your organization’s data through natural language, with
          read-only access scoped to each user’s existing permissions. Point any MCP-capable client at the endpoint below.
        </P>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ac-light-gray bg-ac-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ac-med-gray">Endpoint</div>
            <code className="mt-1 block break-all font-mono text-[12.5px] text-ac-dark">{MCP_URL}</code>
          </div>
          <div className="rounded-xl border border-ac-light-gray bg-ac-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ac-med-gray">Auth</div>
            <div className="mt-1 text-[13px] text-ac-dark-secondary">OAuth 2.0 authorization code + PKCE S256, <Code>claudeai</Code> scope.</div>
          </div>
          <div className="rounded-xl border border-ac-light-gray bg-ac-card p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ac-med-gray">Access</div>
            <div className="mt-1 text-[13px] text-ac-dark-secondary">Read-only, scoped to your authorization level.</div>
          </div>
        </div>

        {/* ---------- connect ---------- */}
        <H2>Connect your client</H2>
        <P>Pick your client. Every option connects to the same remote endpoint and signs in with OAuth.</P>
        <div className="mt-5">
          <Tabs tabs={CLIENT_TABS} />
        </div>

        <H3>Local proxy fallback</H3>
        <P>
          For stdio-based clients, or environments that can’t reach the remote server directly, use the{' '}
          <Code>mcp-remote</Code> proxy (requires Node 18+).
        </P>
        <CodeBlock label="stdio config">{`{
  "mcpServers": {
    "backstory": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${MCP_URL}"]
    }
  }
}`}</CodeBlock>

        {/* ---------- verify ---------- */}
        <H2>Verify the connection</H2>
        <P>In Claude Code, list the configured servers:</P>
        <CodeBlock label="terminal">{`claude mcp list`}</CodeBlock>
        <P>You should see the server reporting as connected:</P>
        <CodeBlock label="expected output">{`backstory    ${MCP_URL}    ✓ connected`}</CodeBlock>
        <P>
          Then test with a Backstory-specific question — for example, ask about the engagement level for one of your
          key accounts. Common first tasks are account briefings, spotting at-risk renewals, and mapping org whitespace
          across a contact network.
        </P>

        {/* ---------- service accounts ---------- */}
        <H2>Service accounts</H2>
        <P>
          Background automation can authenticate with a service-account header instead of interactive OAuth, using the
          format below:
        </P>
        <CodeBlock label="http header">{`Authorization: gt_{api_key}:{api_secret}`}</CodeBlock>
        <Callout tone="warning">
          This grants admin-level access across your entire organization. Reserve it for trusted server-side processes
          — never interactive agents.
        </Callout>

        {/* ---------- tools ---------- */}
        <H2>MCP tools</H2>
        <P>
          The MCP exposes <strong>13 read-only tools</strong>, scoped to your permissions. Account and opportunity data
          covers the last <strong>30 days</strong> of matched activity — emails, calls, or meetings linked to CRM records.
        </P>

        <H3>Find records</H3>
        <P>Turn company names or CRM IDs into Backstory IDs you can pass to the other tools.</P>
        <ToolTable rows={FIND_TOOLS} />

        <H3>Account tools</H3>
        <P>These take a <Code>peopleai_account_id</Code> and look at the past 30 days.</P>
        <ToolTable rows={ACCOUNT_TOOLS} />

        <H3>Opportunity tools</H3>
        <P>These take an opportunity ID returned by the find tools.</P>
        <ToolTable rows={OPPORTUNITY_TOOLS} />

        {/* ---------- limitations ---------- */}
        <H2>Limitations</H2>
        <P>
          The MCP does not provide metrics, historical roll-ups, Engagement Level history, or CRM writes. For those,
          use the REST and Query APIs.
        </P>
      </div>
    </div>
  );
}
