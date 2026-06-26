import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../lib/useData';
import { SectionHero } from '../components/SectionHero';
import { cn } from '../lib/cn';

/* ---------- prose primitives ---------- */
const H1 = (p) => <h1 className="font-display text-[24px] font-bold tracking-[-0.01em] text-ac-dark" {...p} />;
const H2 = (p) => <h2 className="mt-7 font-display text-[17px] font-bold text-ac-dark" {...p} />;
const H3 = (p) => <h3 className="mt-5 font-display text-[14.5px] font-bold text-ac-dark" {...p} />;
const P = (p) => <p className="mt-3 text-[14px] leading-7 text-ac-dark-secondary" {...p} />;
const Eyebrow = () => <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ac-med-gray">/// API Reference</div>;
function Code({ children }) {
  return <code className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[12px] text-ac-dark-secondary">{children}</code>;
}
function Pre({ children }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-wf-border bg-wf-bg p-4 font-mono text-[12px] leading-6 text-wf-text">
      <code>{children}</code>
    </pre>
  );
}
function UL({ children }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] leading-7 text-ac-dark-secondary">{children}</ul>;
}
function Table({ head, rows }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-ac-light-gray">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-ac-warm-white">
            {head.map((h) => (
              <th key={h} className="border-b border-ac-light-gray px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ac-light-gray last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top text-ac-dark-secondary">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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

/* ---------- doc pages (ported from legacy) ---------- */
const DOC_PAGES = [
  { slug: 'overview', label: 'Overview' },
  { slug: 'rate-limits', label: 'Rate limits & conventions' },
  { slug: 'versioning', label: 'Versioning & Beta' },
  { slug: 'data-model', label: 'Data model' },
  { slug: 'errors', label: 'Errors' },
];

function DocOverview() {
  return (
    <>
      <Eyebrow />
      <H1>API reference</H1>
      <P>Every Backstory API endpoint, grouped by resource. All endpoints use host <Code>https://api.people.ai</Code> and bearer-token authentication — send <Code>Authorization: Bearer &lt;access_token&gt;</Code> on every request.</P>
      <Callout tone="tip"><strong>Run your first call (60 seconds).</strong> Mint a token from your API key and secret, then read an Engagement Level snapshot end to end.</Callout>
      <H2>Read path vs. write path</H2>
      <P>Credentials are <strong className="text-ac-dark">production</strong> — there is no sandbox.</P>
      <UL>
        <li><strong className="text-ac-dark"><Code>GET</Code>s</strong> are safe to run against your org.</li>
        <li><strong className="text-ac-dark">Write paths</strong> mutate or schedule work: activity ingestion (<Code>PUT /v0/public/activities/email</Code>) and bulk export (<Code>POST /pull/v1/export/...</Code>). Run with intent.</li>
      </UL>
      <Callout tone="warning">Every <Code>POST</Code>/<Code>PUT</Code> here is a live write. Stick to <Code>GET</Code>s for exploration.</Callout>
      <H2>Resources</H2>
      <Table
        head={['Group', 'What it covers']}
        rows={[
          ['Authentication', 'Mint a bearer token from your API key and secret.'],
          ['Accounts, Contacts, Leads, Opportunities', 'Read CRM records by id, CRM id, or email.'],
          ['Activities', 'Read emails, calls, and meetings, plus their participants.'],
          ['Teams, Team members', 'Read your sales hierarchy and users.'],
          ['Engagement', 'Read the Engagement Level over time.'],
          ['Bulk export', 'Asynchronous export jobs for raw activity data and enriched contacts.'],
          ['Activity ingestion', 'Push email activities into Backstory.'],
        ]}
      />
      <H2>Conventions</H2>
      <UL>
        <li><strong className="text-ac-dark">Auth</strong>: <Code>Authorization: Bearer &lt;access_token&gt;</Code> on every request.</li>
        <li><strong className="text-ac-dark">Pagination</strong>: list endpoints take <Code>offset</Code> and <Code>limit</Code>; responses include <Code>meta</Code>.</li>
        <li><strong className="text-ac-dark">Envelope</strong>: payload in <Code>data</Code>; lists also include <Code>meta</Code>.</li>
      </UL>
    </>
  );
}

function DocRateLimits() {
  return (
    <>
      <Eyebrow />
      <H1>Rate limits and conventions</H1>
      <P>The REST data API shares a consistent set of conventions across every resource.</P>
      <H2>Rate limits</H2>
      <Table
        head={['Limit', 'Value']}
        rows={[
          ['Maximum requests per second', '5'],
          ['Maximum concurrent requests', '10'],
          ['Maximum page size', '100,000'],
          ['Maximum date range for activity data', '2 years'],
        ]}
      />
      <P>The REST API does not return <Code>X-RateLimit-*</Code> headers. Stay within the limits above, and retry with backoff if you receive a <Code>429</Code>.</P>
      <H2>Pagination</H2>
      <P>List endpoints accept <Code>offset</Code> and <Code>limit</Code> query parameters and return a <Code>meta</Code> object alongside the <Code>data</Code> array. The default <Code>limit</Code> is 1000; the maximum is 100,000.</P>
      <Pre>{`{
  "data": [ { "id": 140089, "name": "Northwind Logistics" } ],
  "meta": { "limit": 500, "offset": 0, "total": 2843, "message": null }
}`}</Pre>
      <H2>Dates and timestamps</H2>
      <UL>
        <li>Date query params (<Code>from</Code>, <Code>to</Code>, <Code>ingested-from</Code>, <Code>ingested-to</Code>) use <Code>YYYY-MM-DD</Code>. Use <Code>last-n-days</Code> for a relative window and <Code>time-zone</Code> to set interpretation.</li>
        <li>Response timestamp fields (<Code>activity_timestamp</Code>, <Code>created_at</Code>, <Code>ingested_at</Code>) are Unix epoch milliseconds.</li>
        <li>Activity-ingestion bodies and Beta <Code>filter</Code> dates use Unix epoch <strong className="text-ac-dark">seconds</strong>.</li>
      </UL>
    </>
  );
}

function DocVersioning() {
  return (
    <>
      <Eyebrow />
      <H1>Versioning and Beta</H1>
      <P>Backstory API endpoints are versioned in their path. Different capabilities sit at different versions.</P>
      <Table
        head={['Path prefix', 'Capability', 'Status']}
        rows={[
          [<Code key="a">/auth/v1/tokens</Code>, 'Access tokens for the REST and bulk APIs', 'GA'],
          [<Code key="b">/v0/public</Code>, 'REST data API and activity ingestion', 'GA'],
          [<Code key="c">/pull/v1/export</Code>, 'Bulk export jobs', 'GA'],
          [<Code key="d">/v3/auth/tokens</Code>, 'Access tokens for the Beta endpoints', 'Beta'],
          [<Code key="e">/v3/beta/insights/export</Code>, 'Insights export and Query API', 'Beta'],
          [<Code key="f">/v3/beta/forecasting/query</Code>, 'Forecasting Query API', 'Beta'],
        ]}
      />
      <H2>GA endpoints</H2>
      <P>GA endpoints are stable. Backstory adds fields and capabilities in a backward-compatible way — treat unknown fields in responses as additive and ignore the ones you do not use.</P>
      <H2>Beta endpoints</H2>
      <Callout tone="warning">Beta endpoints under <Code>/v3/beta</Code> can change. Request/response shapes, available metrics, and limits may evolve before GA. Pin to documented behavior and revalidate before depending on a Beta endpoint in production.</Callout>
    </>
  );
}

function DocDataModel() {
  return (
    <>
      <Eyebrow />
      <H1>Data model</H1>
      <P>The REST API exposes the core go-to-market objects Backstory maintains.</P>
      <H2>Objects</H2>
      <Table
        head={['Object', 'Description']}
        rows={[
          ['Account', 'A company in your CRM.'],
          ['Opportunity', 'A deal, linked to an account.'],
          ['Contact', 'A known person at an account.'],
          ['Lead', 'An unconverted prospect. When converted, links to an account, contact, and opportunity.'],
          ['Activity', 'An email, call, or meeting, with participants. Activities match to accounts and opportunities.'],
          ['Team', 'A node in your sales hierarchy.'],
          ['Team member', 'A user, who belongs to a team.'],
          ['Engagement Level', 'A 0–100 score based on the volume, recency, and type of matched activities.'],
        ]}
      />
      <H2>Referencing records</H2>
      <P>Every record carries two identifiers: <Code>id</Code> (Backstory's internal numeric id) and <Code>crm_id</Code> (the id in your source CRM). Most resources offer a lookup by each — e.g. an account at <Code>/v0/public/accounts/{'{id}'}</Code> and at <Code>/v0/public/accounts/crm-id/{'{crmId}'}</Code>. Contacts, leads, and team members also support lookup by <Code>email</Code>.</P>
      <H2>Engagement Level</H2>
      <P>Backstory recomputes Engagement Level on a 24-hour cycle. The endpoints return a score history of point-in-time snapshots, each <Code>{'{ id, crm_id, score, date, timestamp }'}</Code>. Opportunities return a daily snapshot through close; accounts, contacts, and leads return a weekly snapshot over roughly the last three months.</P>
    </>
  );
}

function DocErrors() {
  return (
    <>
      <Eyebrow />
      <H1>Errors</H1>
      <P>Every status the API returns, the error envelope you parse, and the Query API traps that return <Code>HTTP 200</Code> while silently dropping your data.</P>
      <H2>Error envelope</H2>
      <Pre>{`{
  "code": 401,
  "id": "0f9a3c7e1b5d4826ad03e9f1c7b62d54",
  "message": "Invalid or expired token",
  "path": "/v0/public/accounts",
  "timestamp": "04-06-2026 03:25:25"
}`}</Pre>
      <P><Code>id</Code> is a per-request trace id (changes on every response) — log it, never branch on it. <Code>timestamp</Code> is server time, <Code>DD-MM-YYYY HH:MM:SS</Code>.</P>
      <H2>Status codes</H2>
      <Table
        head={['Status', 'Meaning', 'What to do']}
        rows={[
          [<Code key="a">400</Code>, 'Malformed request — out-of-range limit, malformed job id, invalid body.', 'Fix the request; do not retry unchanged.'],
          [<Code key="b">401</Code>, 'Missing or invalid bearer token.', 'Mint a new token.'],
          [<Code key="c">404</Code>, 'No record matches the requested id.', 'Check the id; expected for unknown records.'],
          [<Code key="d">422</Code>, 'Invalid filter range — single-day or inverted range on Engagement.', 'Pass from strictly before to.'],
          [<Code key="e">429</Code>, 'Rate limit exceeded. No Retry-After header.', 'Back off and retry — start at 1s, double to a cap.'],
          [<Code key="f">500</Code>, 'Unexpected server error.', 'Retry with exponential backoff.'],
        ]}
      />
      <H2>Failures that return 200 (read this)</H2>
      <Callout tone="warning">Unknown query params, unknown export columns, and <strong className="text-ac-dark">invalid metric slugs are accepted with <Code>HTTP 200</Code> and silently ignored</strong>. Always validate every slug and param name against the live API, and diff returned columns against the columns you requested on every run.</Callout>
    </>
  );
}

const DOC_CONTENT = {
  overview: DocOverview,
  'rate-limits': DocRateLimits,
  versioning: DocVersioning,
  'data-model': DocDataModel,
  errors: DocErrors,
};

/* ---------- openapi helpers ---------- */
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const METHOD_STYLE = {
  get: 'text-ac-success bg-ac-success/15',
  post: 'text-ac-coral-dark bg-ac-coral/15',
  put: 'text-amber-500 bg-amber-500/15',
  patch: 'text-amber-500 bg-amber-500/15',
  delete: 'text-red-400 bg-red-400/15',
};

function endpointSlug(method, path) {
  return `${method}${path.replace(/[^a-zA-Z0-9]+/g, '-')}`.replace(/-+$/, '').toLowerCase();
}

function resolveRef(ref, oa) {
  return ref.replace('#/', '').split('/').reduce((cur, k) => (cur ? cur[k] : undefined), oa);
}

function schemaProps(schema, oa, depth = 0) {
  if (!schema || depth > 1) return [];
  if (schema.$ref) schema = resolveRef(schema.$ref, oa);
  if (schema?.type === 'array' && schema.items) schema = schema.items.$ref ? resolveRef(schema.items.$ref, oa) : schema.items;
  if (!schema?.properties) return [];
  return Object.entries(schema.properties).map(([name, v]) => ({
    name,
    type: v.type || (v.$ref ? 'object' : v.items ? 'array' : ''),
    description: v.description || '',
  }));
}

function MethodBadge({ method }) {
  return (
    <span className={cn('rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase', METHOD_STYLE[method] || 'bg-ac-cream text-ac-dark-secondary')}>
      {method}
    </span>
  );
}

function EndpointDetail({ method, path, op, pathItem, oa }) {
  const params = [...(pathItem.parameters || []), ...(op.parameters || [])].map((p) => (p.$ref ? resolveRef(p.$ref, oa) : p));
  const body = op.requestBody;
  const bodySchema = body && body.content && (body.content['application/json'] || Object.values(body.content)[0]);
  const responses = Object.entries(op.responses || {});
  return (
    <>
      <Eyebrow />
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        <MethodBadge method={method} />
        <span className="font-mono text-[15px] text-ac-dark">{path}</span>
      </div>
      {op.summary && <H1 className="mt-3 !text-[20px]">{op.summary}</H1>}
      {op.description && <P>{op.description}</P>}

      {params.length > 0 && (
        <>
          <H2>Parameters</H2>
          <Table
            head={['Name', 'In', 'Type', 'Required', 'Description']}
            rows={params.map((p) => [
              <Code key="n">{p.name}</Code>,
              p.in,
              (p.schema && (p.schema.type || (p.schema.$ref ? 'object' : ''))) || '',
              p.required ? 'yes' : '',
              p.description || '',
            ])}
          />
        </>
      )}

      {bodySchema && (
        <>
          <H2>Request body</H2>
          {schemaProps(bodySchema.schema, oa).length > 0 ? (
            <Table head={['Field', 'Type', 'Description']} rows={schemaProps(bodySchema.schema, oa).map((f) => [<Code key="f">{f.name}</Code>, f.type, f.description])} />
          ) : (
            <P>JSON body — see the schema in <Code>openapi.json</Code>.</P>
          )}
        </>
      )}

      <H2>Responses</H2>
      {responses.map(([status, r]) => {
        const rr = r.$ref ? resolveRef(r.$ref, oa) : r;
        const sch = rr.content && (rr.content['application/json'] || Object.values(rr.content)[0]);
        const props = sch ? schemaProps(sch.schema, oa) : [];
        return (
          <div key={status} className="mt-4">
            <div className="flex items-center gap-2">
              <span className={cn('rounded-md px-2 py-0.5 font-mono text-[11px] font-bold', status.startsWith('2') ? 'bg-ac-success/15 text-ac-success' : 'bg-ac-coral/15 text-ac-coral-dark')}>{status}</span>
              <span className="text-[13.5px] text-ac-dark-secondary">{rr.description}</span>
            </div>
            {props.length > 0 && <Table head={['Field', 'Type', 'Description']} rows={props.map((f) => [<Code key="f">{f.name}</Code>, f.type, f.description])} />}
          </div>
        );
      })}
    </>
  );
}

/* ---------- page ---------- */
export function ApiDocs() {
  const { '*': splat } = useParams();
  const section = (splat || 'overview').replace(/\/$/, '');
  const { data: oa, loading } = useData('openapi.json');
  const [filter, setFilter] = useState('');

  const groups = useMemo(() => {
    if (!oa) return [];
    const byTag = new Map();
    for (const [path, item] of Object.entries(oa.paths || {})) {
      for (const method of METHODS) {
        const op = item[method];
        if (!op) continue;
        const tag = (op.tags && op.tags[0]) || 'Other';
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag).push({ method, path, op, pathItem: item, slug: endpointSlug(method, path) });
      }
    }
    return [...byTag.entries()].map(([tag, eps]) => ({ tag, eps }));
  }, [oa]);

  const allEndpoints = useMemo(() => groups.flatMap((g) => g.eps), [groups]);
  const current = allEndpoints.find((e) => e.slug === section);
  const DocComp = DOC_CONTENT[section];
  const q = filter.toLowerCase().trim();

  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Developer Reference"
        title="Backstory API"
        subtitle="The read-only REST + Query API at api.people.ai — authentication, conventions, the data model, and an endpoint-by-endpoint reference."
        image="meeting-bg-06.jpg"
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="surface-card h-max p-4 lg:sticky lg:top-24">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter endpoints…"
            className="mb-3 w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-1.5 text-[13px] text-ac-dark outline-none focus:border-ac-coral"
          />
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ac-med-gray">Documentation</div>
          <div className="flex flex-col">
            {DOC_PAGES.map((d) => (
              <Link
                key={d.slug}
                to={`/api-docs/${d.slug}`}
                className={cn(
                  'rounded-md px-2 py-1.5 text-[12.5px] no-underline transition-colors',
                  section === d.slug ? 'bg-ac-coral/12 text-ac-coral-dark' : 'text-ac-dark-secondary hover:text-ac-coral-dark',
                )}
              >
                {d.label}
              </Link>
            ))}
          </div>
          {groups.map((g) => {
            const eps = g.eps.filter((e) => !q || e.path.toLowerCase().includes(q) || (e.op.summary || '').toLowerCase().includes(q) || g.tag.toLowerCase().includes(q));
            if (!eps.length) return null;
            return (
              <div key={g.tag} className="mt-3">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ac-med-gray">{g.tag}</div>
                <div className="flex flex-col">
                  {eps.map((e) => (
                    <Link
                      key={e.slug}
                      to={`/api-docs/${e.slug}`}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-1 no-underline transition-colors',
                        section === e.slug ? 'bg-ac-coral/12' : 'hover:bg-ac-warm-white',
                      )}
                    >
                      <span className={cn('rounded px-1 py-0.5 font-mono text-[9px] font-bold uppercase', METHOD_STYLE[e.method])}>{e.method}</span>
                      <span className="truncate font-mono text-[11.5px] text-ac-dark-secondary">{e.path.replace('/v0/public', '').replace('/pull/v1', '') || e.path}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        <div className="surface-card min-w-0 p-7">
          {loading && <div className="py-10 text-center text-ac-med-gray">Loading API reference…</div>}
          {!loading && DocComp && <DocComp />}
          {!loading && !DocComp && current && (
            <EndpointDetail method={current.method} path={current.path} op={current.op} pathItem={current.pathItem} oa={oa} />
          )}
          {!loading && !DocComp && !current && <DocOverview />}
        </div>
      </div>
    </div>
  );
}
