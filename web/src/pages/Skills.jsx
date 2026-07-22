import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useData } from '../lib/useData';
import { SectionHero } from '../components/SectionHero';
import { ToggleGroup } from '../components/ui/ToggleGroup';

function SkillCard({ skill, categoryName }) {
  return (
    <Link
      to={`/signals/${skill.id}`}
      className="group flex flex-col rounded-xl border border-ac-light-gray bg-ac-card p-5 shadow-card no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-ac-coral hover:shadow-cardhover"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="rounded-md bg-ac-coral/12 px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ac-coral-dark">
          {categoryName}
        </span>
      </div>
      <h3 className="font-display text-[15px] font-bold leading-snug tracking-[-0.01em] text-ac-dark">{skill.name}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-[13.5px] leading-6 text-ac-dark-secondary">{skill.description}</p>
      {Array.isArray(skill.audience) && skill.audience.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skill.audience.map((a) => (
            <span key={a} className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ac-dark-secondary">
              {a}
            </span>
          ))}
        </div>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark">
        View skill
        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function Skills() {
  const { data, loading, error } = useData('skills.json');
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
    return data.skills.filter((s) => {
      if (filter !== 'all' && s.category !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (catName[s.category] || '').toLowerCase().includes(q)
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
        eyebrow="Backstory Signals"
        title="Signals"
        subtitle="Backstory capabilities you apply to your signals — drop a SKILL.md into your assistant and run."
        image="meeting-bg-05.jpg"
      >
        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border border-white/20 bg-ac-horizon-900/40 px-5 py-3">
            <div className="font-mono text-2xl font-bold tabular-nums">{data?.skills.length ?? '—'}</div>
            <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-white/80">Skills</div>
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

      {loading && <div className="py-16 text-center text-ac-med-gray">Loading skills…</div>}
      {error && <div className="py-16 text-center text-ac-med-gray">Failed to load skills ({String(error.message)}).</div>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SkillCard key={s.id} skill={s} categoryName={catName[s.category] || 'Skill'} />
            ))}
          </div>
          {filtered.length === 0 && <div className="py-16 text-center text-ac-med-gray">No skills match your search.</div>}
        </>
      )}
    </div>
  );
}
