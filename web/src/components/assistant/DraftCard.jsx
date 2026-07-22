import { useState } from 'react';
import { Download, Hammer, Pencil, X } from 'lucide-react';
import { BrandMark } from '../BrandMark';

function slug(s) {
  return (
    (s || 'workflow')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'workflow'
  );
}

// Fallback card shown when the assistant proposed a draft but produced no
// downloadable artifact. Still lets the user download the spec as markdown.
export function DraftCard({ draft, onGenerate, attachmentsReady = true }) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(() => ({ ...draft }));

  function download() {
    const md = [
      `# ${edited.title || 'Untitled'}`,
      '',
      edited.summary || '',
      edited.stack ? `\n**Stack:** ${edited.stack}` : '',
      edited.spec ? `\n## Spec\n\n${edited.spec}` : '',
      edited.assumptions ? `\n## Assumptions\n\n${edited.assumptions}` : '',
      edited.openQuestions?.length ? `\n## Open questions\n\n${edited.openQuestions.map((item) => `- ${item}`).join('\n')}` : '',
      edited.formatExamples?.length ? `\n## Format examples\n\n${edited.formatExamples.map((item) => `- ${item.name}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(edited.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 rounded-xl border border-ac-light-gray bg-ac-warm-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ac-med-gray"><BrandMark /> Draft</div>
        <div className="flex gap-1.5">
          {editing && (
            <button type="button" onClick={() => setEdited({ ...draft })} className="rounded-md border border-ac-light-gray px-2 py-1 font-mono text-[10.5px] uppercase text-ac-dark-secondary">
              Reset
            </button>
          )}
          <button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray px-2 py-1 font-mono text-[10.5px] uppercase text-ac-dark-secondary">
            {editing ? <X size={12} /> : <Pencil size={12} />} {editing ? 'Close' : 'Edit'}
          </button>
          <button type="button" onClick={download} title="Download this unvalidated plan, not a runnable workflow" className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-white px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-dark">
            <Download size={12} /> Download plan
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-3 flex flex-col gap-2">
          <input value={edited.title || ''} onChange={(e) => setEdited((value) => ({ ...value, title: e.target.value }))} aria-label="Plan title" className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 text-[13px] text-ac-dark" />
          <textarea value={edited.summary || ''} onChange={(e) => setEdited((value) => ({ ...value, summary: e.target.value }))} aria-label="Plan summary" rows={2} className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 text-[13px] text-ac-dark" />
          <input value={edited.stack || ''} onChange={(e) => setEdited((value) => ({ ...value, stack: e.target.value }))} aria-label="Plan stack" className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 text-[13px] text-ac-dark" />
          <textarea value={edited.spec || ''} onChange={(e) => setEdited((value) => ({ ...value, spec: e.target.value }))} aria-label="Plan specification" rows={6} className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 font-mono text-[12px] text-ac-dark" />
          <textarea value={edited.assumptions || ''} onChange={(e) => setEdited((value) => ({ ...value, assumptions: e.target.value }))} aria-label="Plan assumptions" rows={3} placeholder="Assumptions" className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 text-[13px] text-ac-dark" />
          <textarea value={(edited.openQuestions || []).join('\n')} onChange={(e) => setEdited((value) => ({ ...value, openQuestions: e.target.value.split('\n').map((item) => item.trim()).filter(Boolean) }))} aria-label="Plan open questions" rows={3} placeholder="One open question per line" className="rounded-lg border border-ac-light-gray bg-ac-cream px-3 py-2 text-[13px] text-ac-dark" />
        </div>
      ) : <>
      <h4 className="mt-1.5 font-display text-[15px] font-bold text-ac-dark">{edited.title}</h4>
      <p className="mt-1 text-[13.5px] leading-6 text-ac-dark-secondary">{edited.summary}</p>
      {edited.stack && (
        <p className="mt-2 text-[12.5px] text-ac-dark-secondary">
          <span className="font-mono uppercase tracking-[0.1em] text-ac-med-gray">Stack</span> · {edited.stack}
        </p>
      )}
      {edited.spec && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ac-cream p-3 font-mono text-[12px] leading-5 text-ac-dark-secondary">{edited.spec}</pre>
      )}
      {edited.assumptions && <p className="mt-2 text-[12.5px] text-ac-dark-secondary"><span className="font-mono uppercase tracking-[0.1em] text-ac-med-gray">Assumptions</span> · {edited.assumptions}</p>}
      {edited.openQuestions?.length > 0 && (
        <div className="mt-2 text-[12.5px] text-ac-dark-secondary">
          <span className="font-mono uppercase tracking-[0.1em] text-ac-med-gray">Open questions</span>
          <ul className="mt-1 list-disc pl-5">{edited.openQuestions.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}
      {edited.formatExamples?.length > 0 && (
        <div className="mt-2 text-[12.5px] text-ac-dark-secondary">
          <span className="font-mono uppercase tracking-[0.1em] text-ac-med-gray">Format examples retained for generation</span>
          <ul className="mt-1 list-disc pl-5">{edited.formatExamples.map((item) => <li key={item.name}>{item.name}</li>)}</ul>
        </div>
      )}
      </>}
      <p className="mt-2 text-[10.5px] text-ac-med-gray">This is a reviewable plan, not a validated workflow artifact.</p>
      {onGenerate && (
        <button
          type="button"
          onClick={() => onGenerate(edited)}
          disabled={edited.formatExamples?.length > 0 && !attachmentsReady}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ac-coral px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-white shadow-card transition-colors hover:bg-ac-coral-dark"
        >
          <Hammer size={13} /> {edited.formatExamples?.length > 0 && !attachmentsReady ? 'Restoring format examples…' : 'Confirm and generate'}
        </button>
      )}
    </div>
  );
}
