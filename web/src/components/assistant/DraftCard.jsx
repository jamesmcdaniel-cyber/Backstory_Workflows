import { Download } from 'lucide-react';

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
export function DraftCard({ draft }) {
  function download() {
    const md = [
      `# ${draft.title || 'Untitled'}`,
      '',
      draft.summary || '',
      draft.stack ? `\n**Stack:** ${draft.stack}` : '',
      draft.spec ? `\n## Spec\n\n${draft.spec}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(draft.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 rounded-xl border border-ac-light-gray bg-ac-warm-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ac-med-gray">/// Draft</div>
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-1 rounded-md bg-ac-coral px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-card transition-colors hover:bg-ac-coral-dark"
        >
          <Download size={12} /> Download
        </button>
      </div>
      <h4 className="mt-1.5 font-display text-[15px] font-bold text-ac-dark">{draft.title}</h4>
      <p className="mt-1 text-[13.5px] leading-6 text-ac-dark-secondary">{draft.summary}</p>
      {draft.stack && (
        <p className="mt-2 text-[12.5px] text-ac-dark-secondary">
          <span className="font-mono uppercase tracking-[0.1em] text-ac-med-gray">Stack</span> · {draft.stack}
        </p>
      )}
      {draft.spec && (
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ac-cream p-3 font-mono text-[12px] leading-5 text-ac-dark-secondary">{draft.spec}</pre>
      )}
    </div>
  );
}
