import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useData } from '../lib/useData';
import { Tabs } from '../components/ui/Tabs';
import { CopyButton } from '../components/ui/CopyButton';
import { DeliveryPreview } from '../components/DeliveryPreview';

function Chips({ label, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="rounded-md bg-ac-cream px-2 py-0.5 font-mono text-[12px] text-ac-dark-secondary">
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function CodePanel({ title, text }) {
  return (
    <div className="overflow-hidden rounded-xl border border-wf-border">
      <div className="flex items-center justify-between bg-[#1c262c] px-3.5 py-2 text-[12px] font-semibold text-[#9fb4bd]">
        <span>{title}</span>
        <CopyButton text={text} />
      </div>
      <pre className="max-h-[460px] overflow-auto bg-wf-bg p-4 text-[12.5px] leading-6 text-wf-text">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export function SkillDetail() {
  const { id } = useParams();
  const { data, loading } = useData('skills.json');
  // Arrived from an assistant recommendation? Offer a way back to the chat.
  const fromAssistant = !!useLocation().state?.fromAssistant;

  if (loading) return <div className="container-page py-16 text-center text-ac-med-gray">Loading…</div>;
  const skill = data?.skills.find((s) => String(s.id) === String(id));
  const catName = data?.categories.find((c) => c.id === skill?.category)?.name;

  if (!skill) {
    return (
      <div className="container-page">
        <Link to="/signals" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ac-coral no-underline hover:underline">
          <ArrowLeft size={15} /> All signals
        </Link>
        <div className="surface-card p-8">
          <h1 className="text-xl font-bold">Skill not found</h1>
          <p className="mt-2 text-ac-dark-secondary">No skill matches “{id}”.</p>
        </div>
      </div>
    );
  }

  const platformEntries = Object.entries(skill.platforms || {});
  const steps = skill.walkthrough?.steps || [];

  const overview = (
    <div className="surface-card space-y-5 p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Chips label="Audience" items={skill.audience} />
        {skill.input && (
          <div>
            <div className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray">Input</div>
            <div className="text-sm text-ac-dark-secondary">{skill.input}</div>
          </div>
        )}
        <Chips label="MCP tools" items={skill.mcpTools} />
        <Chips label="MCP connectors" items={skill.mcpConnectors} />
        <Chips label="Project knowledge files" items={skill.projectKnowledgeFiles} />
      </div>
    </div>
  );

  const tabs = [{ value: 'overview', label: 'Overview', content: overview }];

  if (steps.length)
    tabs.push({
      value: 'walkthrough',
      label: 'Walkthrough',
      content: (
        <div className="surface-card p-6">
          {skill.walkthrough?.input?.example && (
            <p className="mb-4 text-sm text-ac-dark-secondary">
              <span className="font-semibold text-ac-dark">{skill.walkthrough.input.label || 'Input'}:</span>{' '}
              <code className="rounded bg-ac-cream px-1.5 py-0.5 font-mono text-[12px]">{skill.walkthrough.input.example}</code>
            </p>
          )}
          <ol className="space-y-3">
            {steps.map((st, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-ac-coral text-[12px] font-bold text-ac-ink">
                  {st.stepNum ?? i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ac-dark">
                    {st.name}
                    {st.type && (
                      <span className="ml-2 rounded bg-ac-cream px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ac-dark-secondary">
                        {st.type}
                      </span>
                    )}
                  </div>
                  {st.description && <div className="text-[13px] leading-6 text-ac-dark-secondary">{st.description}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    });

  if (skill.sample_output?.content)
    tabs.push({
      value: 'sample',
      label: 'Sample output',
      content: <DeliveryPreview sample={skill.sample_output} />,
    });

  if (platformEntries.length)
    tabs.push({
      value: 'platforms',
      label: 'Prompt / Platforms',
      content: (
        <div className="space-y-4">
          {platformEntries.map(([key, val]) => (
            <CodePanel key={key} title={key} text={typeof val === 'string' ? val : val.instructions || JSON.stringify(val, null, 2)} />
          ))}
        </div>
      ),
    });

  return (
    <div className="container-page">
      <Link to={fromAssistant ? '/' : '/signals'} className="mb-5 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark no-underline hover:text-ac-coral">
        <ArrowLeft size={14} /> {fromAssistant ? 'Back to Assistant' : 'All signals'}
      </Link>
      <div className="surface-card mb-6 p-7">
        <div className="flex flex-wrap items-center gap-2">
          {catName && (
            <span className="rounded-md bg-ac-coral/12 px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ac-coral-dark">
              {catName}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-[22px] font-bold leading-tight tracking-[-0.01em] text-ac-dark">{skill.name}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ac-dark-secondary">{skill.description}</p>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}
