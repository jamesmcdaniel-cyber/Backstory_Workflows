import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useData } from '../lib/useData';
import { Tabs } from '../components/ui/Tabs';

function Field({ label, value }) {
  if (value == null || value === '') return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <div className="border-b border-ac-light-gray py-3 last:border-b-0">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ac-med-gray">{label}</div>
      <div className="whitespace-pre-wrap text-sm leading-6 text-ac-dark-secondary">{text}</div>
    </div>
  );
}

function CodeBlock({ value }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="overflow-x-auto rounded-xl border border-wf-border bg-wf-bg p-4 text-[12.5px] leading-6 text-wf-text">
      <code>{text}</code>
    </pre>
  );
}

export function WorkflowDetail() {
  const { id } = useParams();
  const { data, loading } = useData('workflows.json');

  if (loading) return <div className="container-page py-16 text-center text-ac-med-gray">Loading…</div>;
  const wf = data?.workflows.find((w) => String(w.id) === String(id));
  const catName = data?.categories.find((c) => c.id === wf?.category)?.name;

  if (!wf) {
    return (
      <div className="container-page">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ac-coral no-underline hover:underline">
          <ArrowLeft size={15} /> Back to Library
        </Link>
        <div className="surface-card p-8">
          <h1 className="text-xl font-bold">Workflow not found</h1>
          <p className="mt-2 text-ac-dark-secondary">No workflow matches “{id}”.</p>
        </div>
      </div>
    );
  }

  const platforms = Object.entries(wf.platform_status || {});

  const overview = (
    <div className="surface-card p-6">
      <Field label="Trigger" value={wf.trigger} />
      <Field label="Output" value={wf.output} />
      <Field label="Credentials" value={wf.credentials} />
      <Field label="Node flow" value={wf.node_flow} />
      <Field label="Configuration" value={wf.configuration} />
      <Field label="Quick start vs. full" value={wf.quick_start_vs_full} />
    </div>
  );

  const tabs = [{ value: 'overview', label: 'Overview', content: overview }];
  if (wf.sample_output)
    tabs.push({ value: 'sample', label: 'Sample output', content: <CodeBlock value={wf.sample_output} /> });
  if (platforms.length)
    tabs.push({
      value: 'platforms',
      label: 'Platforms',
      content: (
        <div className="surface-card p-6">
          <div className="flex flex-col divide-y divide-ac-light-gray">
            {platforms.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5">
                <span className="font-mono text-[13px] text-ac-dark">{k}</span>
                <span
                  className={
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold ' +
                    (v === 'guide-only'
                      ? 'bg-ac-cream text-ac-dark-secondary'
                      : 'bg-ac-success/15 text-[#3c6b50]')
                  }
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    });

  return (
    <div className="container-page">
      <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ac-coral no-underline hover:underline">
        <ArrowLeft size={15} /> Back to Library
      </Link>
      <div className="surface-card mb-6 p-7">
        {catName && (
          <span className="rounded-md bg-ac-coral/12 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ac-coral-dark">
            {catName}
          </span>
        )}
        <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-ac-dark">{wf.name}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ac-dark-secondary">{wf.description}</p>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}
