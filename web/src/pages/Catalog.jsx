import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useData } from '../lib/useData';
import { SectionHero } from '../components/SectionHero';
import { ToggleGroup } from '../components/ui/ToggleGroup';
import { Tooltip } from '../components/ui/Tooltip';
import { cn } from '../lib/cn';

function StatusChip({ label }) {
  return (
    <span className="rounded-md bg-ac-cream px-2 py-0.5 font-mono text-[11px] font-medium text-ac-dark-secondary">
      {label}
    </span>
  );
}

function WorkflowCard({ wf, categoryName }) {
  const validated = Object.entries(wf.platform_status || {})
    .filter(([, v]) => v && v !== 'guide-only')
    .map(([k]) => k);
  return (
    <Link
      to={`/workflow/${wf.id}`}
      className="group flex flex-col rounded-xl border border-ac-light-gray bg-ac-card p-5 shadow-card no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-ac-coral hover:shadow-cardhover"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="rounded-md bg-ac-coral/12 px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ac-coral-dark">
          {categoryName}
        </span>
        {validated.length > 0 && (
          <Tooltip content={`Validated for: ${validated.join(', ')}`}>
            <span className="rounded-md bg-ac-success/15 px-2 py-0.5 font-mono text-[10.5px] font-medium text-ac-success">
              {validated.length} platform{validated.length > 1 ? 's' : ''}
            </span>
          </Tooltip>
        )}
      </div>
      <h3 className="font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-ac-dark">{wf.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-6 text-ac-dark-secondary">{wf.description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark">
        View details
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function Catalog() {
  const { data, loading, error } = useData('workflows.json');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const catName = useMemo(() => {
    const m = {};
    (data?.categories || []).forEach((c) => (m[c.id] = c.name));
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase().trim();
    return data.workflows.filter((w) => {
      if (filter !== 'all' && w.category !== filter) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description || '').toLowerCase().includes(q) ||
        (catName[w.category] || '').toLowerCase().includes(q)
      );
    });
  }, [data, query, filter, catName]);

  const items = useMemo(
    () => [{ value: 'all', label: 'All' }, ...(data?.categories || []).map((c) => ({ value: c.id, label: c.name }))],
    [data],
  );

  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Automation Library"
        title="Implementation-ready workflow patterns for revenue teams."
        subtitle="Browse importable automations, copyable orchestrator instructions, and rebuild recipes — without digging through raw exports first."
        image="meeting-bg-01.jpg"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">{data?.workflows.length ?? '—'}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Workflows</div>
          </div>
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">{data?.categories.length ?? '—'}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Categories</div>
          </div>
        </div>
      </SectionHero>

      <div className="surface-card mb-6 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-2 hidden font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray sm:block">Category</span>
          <ToggleGroup value={filter} onValueChange={setFilter} items={items} />
        </div>
      </div>

      {loading && <div className="py-16 text-center text-ac-med-gray">Loading workflows…</div>}
      {error && (
        <div className="py-16 text-center text-ac-med-gray">Failed to load workflow data ({String(error.message)}).</div>
      )}
      {!loading && !error && (
        <>
          <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
            {filtered.map((wf) => (
              <WorkflowCard key={wf.id} wf={wf} categoryName={catName[wf.category] || 'Workflow'} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-ac-med-gray">No automations match your search.</div>
          )}
        </>
      )}
    </div>
  );
}
