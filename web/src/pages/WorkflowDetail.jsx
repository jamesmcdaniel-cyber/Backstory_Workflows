import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useData } from '../lib/useData';
import { SectionHero } from '../components/SectionHero';
import { cn, assetUrl } from '../lib/cn';

// Platforms that should never appear on this page
const HIDDEN_PLATFORMS = new Set(['recipe-card', 'n8n-starter']);

const PLATFORM_BASE_META = {
  n8n: {
    label: 'n8n Template',
    note: 'Import this JSON into your n8n instance after binding credentials, environment variables, and shared sub-workflows.',
  },
  workato: {
    label: 'Workato Guide',
    note: 'Implementation guide covering Recipe Functions, custom connectors, native connectors, and package deployment steps.',
  },
  zapier: {
    label: 'Zapier Guide',
    note: 'Implementation guide covering custom apps, Zap templates, native actions, and platform-constraint decisions.',
  },
  'claude-workflow': {
    label: 'Claude Workflow Instructions',
    note: 'Instructions for Claude workflow/orchestrator tools. Configure Backstory MCP and native connectors in the orchestrator UI.',
  },
  'openai-workflow': {
    label: 'OpenAI Workflow Instructions',
    note: 'Instructions for OpenAI workflow/orchestrator tools. Configure Backstory MCP and native connectors in the orchestrator UI.',
  },
};

const PLATFORM_STATUS_META = {
  public: { label: 'Public release', shortLabel: 'Public' },
  pilot: { label: 'Pilot only', shortLabel: 'Pilot' },
  legacy: { label: 'Legacy', shortLabel: 'Legacy' },
  starter: { label: 'Starter', shortLabel: 'Starter' },
  'guide-only': { label: 'Guide only', shortLabel: 'Guide' },
};

// Node-flow type → badge colour classes
const NODE_TYPE_BADGE = {
  trigger: 'bg-ac-success/15 text-ac-success',
  data: 'bg-[rgba(29,155,209,0.15)] text-[#5bb8e8]',
  ai: 'bg-ac-coral/12 text-ac-coral-dark',
  output: 'bg-[rgba(210,168,120,0.15)] text-ac-warning',
};

function downloadLabel(file) {
  if (!file) return 'Download';
  if (file.endsWith('.pdf')) return 'Download PDF';
  if (file.endsWith('.py')) return 'Download Script';
  if (file.endsWith('.md')) return 'Download Guide';
  return 'Download Workflow';
}

function platformTitle(platformId, status) {
  const sm = PLATFORM_STATUS_META[status] || { shortLabel: status };
  if (platformId === 'n8n') return `${sm.shortLabel} n8n Template`;
  if (platformId === 'claude-workflow') return `${sm.shortLabel} Claude Workflow Instructions`;
  if (platformId === 'openai-workflow') return `${sm.shortLabel} OpenAI Workflow Instructions`;
  return (PLATFORM_BASE_META[platformId] || { label: platformId }).label;
}

// ─── Left column ───────────────────────────────────────────────────────────

function CredentialsList({ credentials }) {
  if (!credentials?.length) return null;
  return (
    <div className="surface-card p-6">
      <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
        Required Credentials
      </h2>
      <div className="space-y-2">
        {credentials.map((cred, i) => (
          <div
            key={i}
            className="rounded-lg border border-ac-light-gray bg-ac-warm-white px-4 py-3 text-[13px] leading-5 text-ac-dark-secondary"
          >
            {cred}
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateStrategy({ wf }) {
  // Derive the strategy inline, mirroring buildTemplateStrategy() from the legacy.
  const text = [wf.name, wf.description, ...(wf.credentials || []), ...(wf.configuration || [])]
    .join(' ')
    .toLowerCase();

  const includesAny = (patterns) => patterns.some((r) => r.test(text));

  const substitutions = [];
  if (includesAny([/crm/, /opportun/, /pipeline/, /deal/, /renewal/, /forecast/, /territory/, /mql/, /account/]))
    substitutions.push('CRM / system of record: Salesforce, Dynamics 365, HubSpot, or a customer-specific CRM / warehouse');
  if (includesAny([/message/, /alert/, /digest/, /brief/, /email/, /slack/, /teams/, /channel/]))
    substitutions.push('Delivery surfaces: Slack, Microsoft Teams, email, ticket queues, or internal portals');
  if (includesAny([/meeting/, /calendar/, /brief/, /qbr/, /debrief/, /transcript/, /attendee/]))
    substitutions.push('Meetings and note sources: Google Calendar, Microsoft 365, Gong, Zoom, Otter, Fireflies, Fathom');
  if (includesAny([/email/, /inbox/, /outlook/, /gmail/]))
    substitutions.push('Mail systems: Gmail, Outlook, IMAP, Microsoft Graph, or another mail API');
  if (includesAny([/ticket/, /project management/, /jira/, /asana/, /support/, /onboarding/]))
    substitutions.push('Work-management systems: Jira, Asana, ServiceNow, Linear, or a custom task API');
  if (includesAny([/config/, /user configuration store/, /airtable/, /supabase/, /database/, /sheet/]))
    substitutions.push('Config and state stores: Airtable, Google Sheets, Supabase, Postgres, Redis, or internal config APIs');
  if (!substitutions.length)
    substitutions.push('Connector families vary by customer; preserve the canonical payload and swap equivalent APIs.');

  const visiblePlatforms = Object.keys(wf.platforms || {}).filter((p) => !HIDDEN_PLATFORMS.has(p));
  const validated = visiblePlatforms
    .map((p) => (PLATFORM_BASE_META[p] || { label: p }).label)
    .join(', ') || 'Recipe Card only';

  const orchestrators = ['n8n', 'Make', 'Power Automate', 'Zapier', 'Workato', 'Custom code'].join(', ');
  const rule =
    'Preserve the trigger → gather → enrich → analyze → route → deliver pattern. Swap only the connector shells when moving between customer stacks.';

  const items = [
    { label: 'Validated implementations in this repo', value: validated },
    { label: 'Major orchestration tools to support deeply', value: orchestrators },
    { label: 'Common system substitutions', value: substitutions },
    { label: 'Productization rule', value: rule },
  ];

  return (
    <div className="surface-card p-6">
      <h2 className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
        Template Strategy
      </h2>
      <p className="mb-4 text-[13px] leading-5 text-ac-dark-secondary">
        Start from a validated implementation when the stack matches, use the recipe card for major orchestration
        tools, and swap only the connector shells for customer-specific environments.
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-ac-light-gray bg-ac-warm-white px-4 py-3">
            <div className="mb-1 font-mono text-[11px] font-semibold text-ac-coral-dark">{item.label}</div>
            {Array.isArray(item.value) ? (
              <ul className="list-disc pl-4 space-y-0.5">
                {item.value.map((s, i) => (
                  <li key={i} className="text-[13px] leading-5 text-ac-dark-secondary">{s}</li>
                ))}
              </ul>
            ) : (
              <div className="text-[13px] leading-5 text-ac-dark-secondary">{item.value}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowAssets({ wf }) {
  const platformIds = Object.keys(wf.platforms || {}).filter((p) => !HIDDEN_PLATFORMS.has(p));
  if (!platformIds.length) {
    return (
      <div className="surface-card p-6">
        <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
          Workflow Assets
        </h2>
        <p className="text-[13px] text-ac-dark-secondary">No assets attached yet — coming soon.</p>
      </div>
    );
  }

  return (
    <div className="surface-card p-6">
      <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
        Workflow Assets
      </h2>
      <div className="space-y-3">
        {platformIds.map((pid) => {
          const file = wf.platforms[pid];
          const status = (wf.platform_status || {})[pid] || '';
          const base = PLATFORM_BASE_META[pid] || { label: pid, note: '' };
          const sm = PLATFORM_STATUS_META[status] || { label: status || 'Unknown' };
          const variant = (wf.template_variants || []).find((v) => v.platform === pid || v.id === pid);
          const url = assetUrl(`downloads/${wf.id}/${file}`);
          const isGuideOnly = status === 'guide-only';

          return (
            <div key={pid} className="rounded-xl border border-ac-light-gray bg-ac-warm-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[14px] font-bold text-ac-dark">
                    {platformTitle(pid, status)}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-ac-med-gray">{file}</div>
                </div>
                <a
                  href={url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ac-coral px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ac-ink no-underline transition-colors hover:bg-ac-coral-light"
                >
                  <Download size={12} /> {downloadLabel(file)}
                </a>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]',
                    isGuideOnly
                      ? 'bg-ac-cream text-ac-dark-secondary'
                      : 'bg-ac-success/15 text-ac-success',
                  )}
                >
                  {sm.label}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-ac-dark-secondary">
                {base.note}
                {variant ? ` ${variant.description}` : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Right column ──────────────────────────────────────────────────────────

function WorkflowBlueprint({ nodeFlow }) {
  if (!nodeFlow?.length) return null;

  return (
    <div className="surface-card p-6">
      <h2 className="mb-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
        Workflow Blueprint
      </h2>
      <div className="space-y-4">
        {nodeFlow.map((node) => {
          const badgeClass = NODE_TYPE_BADGE[node.type?.toLowerCase()] || 'bg-ac-cream text-ac-dark-secondary';
          return (
            <div key={node.step} className="grid grid-cols-[34px_1fr] gap-3 items-start">
              {/* Step index bubble */}
              <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl border border-ac-light-gray bg-ac-warm-white font-display text-[13px] font-bold text-ac-coral-dark">
                {node.step}
              </div>
              <div>
                <div className="text-[14px] font-bold leading-snug text-ac-dark">{node.name}</div>
                <div className="mt-0.5 text-[13px] leading-[1.55] text-ac-dark-secondary">{node.description}</div>
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.07em]',
                    badgeClass,
                  )}
                >
                  {node.type}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Render inline markdown from sample_output.content into React nodes
function SlackBody({ content }) {
  if (!content) return null;

  // Tokenise the string into paragraphs, lists, and <hr>s
  // We do inline replacements via regex and split by line, just like the legacy.
  const processInline = (text) => {
    // Split on special spans we can detect, then map to React
    // Strategy: convert to HTML-safe JSX fragments by splitting on patterns.
    // We return an array of React elements.
    const parts = [];
    let remaining = text;

    // Patterns: ===money===, @mention, **bold**, *em*
    const patterns = [
      { re: /===(.+?)===/g, render: (m, g) => <span key={m} className="rounded px-1.5 py-px bg-[rgba(0,184,148,0.12)] text-[#00866A] font-bold text-[11px] border border-[rgba(0,184,148,0.25)]">{g}</span> },
      { re: /@([\w.]+)/g, render: (m, g) => <span key={m} className="rounded px-0.5 bg-[rgba(29,155,209,0.1)] text-[#1264A3] font-medium">@{g}</span> },
      { re: /\*\*(.+?)\*\*/g, render: (m, g) => <strong key={m}>{g}</strong> },
      { re: /\*(.+?)\*/g, render: (m, g) => <em key={m} className="text-ac-dark-secondary">{g}</em> },
    ];

    // We'll do a single-pass regex replacement using a combined regex
    const combined = /===(.+?)===|@([\w.]+)|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let key = 0;
    let match;
    const result = [];

    combined.lastIndex = 0;
    const str = String(text);
    while ((match = combined.exec(str)) !== null) {
      if (match.index > last) {
        result.push(str.slice(last, match.index));
      }
      if (match[1] !== undefined) {
        // ===money===
        result.push(
          <span key={key++} className="rounded px-1.5 py-px bg-[rgba(0,184,148,0.12)] text-[#00866A] font-bold text-[11px] border border-[rgba(0,184,148,0.25)]">
            {match[1]}
          </span>
        );
      } else if (match[2] !== undefined) {
        // @mention
        result.push(
          <span key={key++} className="rounded px-0.5 bg-[rgba(29,155,209,0.1)] text-[#1264A3] font-medium">
            @{match[2]}
          </span>
        );
      } else if (match[3] !== undefined) {
        // **bold**
        result.push(<strong key={key++}>{match[3]}</strong>);
      } else if (match[4] !== undefined) {
        // *em*
        result.push(<em key={key++} className="text-ac-dark-secondary">{match[4]}</em>);
      }
      last = match.index + match[0].length;
    }
    if (last < str.length) result.push(str.slice(last));
    return result;
  };

  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} className="mb-1.5 list-disc pl-4 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === '---') {
      flushList();
      elements.push(<hr key={key++} className="my-2 border-ac-light-gray" />);
    } else if (trimmed.startsWith('- ')) {
      listItems.push(
        <li key={key++}>{processInline(trimmed.slice(2))}</li>
      );
    } else {
      flushList();
      elements.push(
        <p key={key++} className="mb-1">{processInline(trimmed)}</p>
      );
    }
  }
  flushList();

  return <>{elements}</>;
}

function DeliveryPreview({ sample }) {
  if (!sample) return null;
  const initial = sample.bot_name ? sample.bot_name[0].toUpperCase() : 'A';

  return (
    <div className="surface-card p-6">
      {/* Panel heading */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
            Sample Output
          </div>
          <h2 className="mt-0.5 font-display text-[15px] font-bold text-ac-dark">Delivery Preview</h2>
        </div>
        {sample.mockup && (
          <span className="rounded-full border border-ac-light-gray px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.05em] text-ac-coral-dark">
            {sample.mockup}
          </span>
        )}
      </div>

      {/* Slack-style card */}
      <div className="overflow-hidden rounded-xl border border-ac-light-gray bg-ac-card shadow-card">
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-1">
          {/* Avatar */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] bg-ac-coral font-display text-[16px] font-bold text-ac-ink">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="font-display text-[14px] font-black text-ac-dark">
              {sample.bot_name || 'Bot'}
            </span>
            {sample.bot_app && (
              <span className="rounded px-[5px] py-px bg-ac-light-gray font-mono text-[10px] font-bold text-ac-dark-secondary">
                APP
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-ac-med-gray">7:21 AM</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-[60px] pb-3.5 pt-1.5 text-[13px] leading-[1.55] text-ac-dark">
          <SlackBody content={sample.content} />
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function WorkflowDetail() {
  const { id } = useParams();
  const { data, loading } = useData('workflows.json');

  if (loading) {
    return <div className="container-page py-16 text-center text-ac-med-gray">Loading…</div>;
  }

  const wf = data?.workflows.find((w) => String(w.id) === String(id));
  const catName = data?.categories.find((c) => c.id === wf?.category)?.name;

  if (!wf) {
    return (
      <div className="container-page">
        <Link
          to="/flows"
          className="mb-5 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark no-underline hover:text-ac-coral"
        >
          <ArrowLeft size={14} /> Back to Auto flows
        </Link>
        <div className="surface-card p-8">
          <h1 className="text-xl font-bold">Workflow not found</h1>
          <p className="mt-2 text-ac-dark-secondary">No workflow matches "{id}".</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page">
      {/* Back nav */}
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark no-underline hover:text-ac-coral"
      >
        <ArrowLeft size={14} /> Back to Library
      </Link>

      {/* Hero */}
      <SectionHero
        eyebrow={catName}
        title={wf.name}
        subtitle={wf.description}
      />

      {/* Two-column body */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-5">
          <CredentialsList credentials={wf.credentials} />
          <TemplateStrategy wf={wf} />
          <WorkflowAssets wf={wf} />
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">
          <WorkflowBlueprint nodeFlow={wf.node_flow} />
          {wf.sample_output && <DeliveryPreview sample={wf.sample_output} />}
        </div>
      </div>
    </div>
  );
}
