import { useState } from 'react';
import { Send, ExternalLink, Loader2 } from 'lucide-react';
import { submitDraft, getPersona } from '../../lib/assistant';

export function DraftCard({ surface, draft }) {
  const [state, setState] = useState({ status: 'idle', url: null, fallbackUrl: null, message: '' });

  async function onSubmit() {
    setState({ status: 'sending', url: null, fallbackUrl: null, message: '' });
    try {
      const r = await submitDraft({ surface, draft, persona: getPersona() });
      if (r.ok) setState({ status: 'done', url: r.url, fallbackUrl: null, message: '' });
      else setState({ status: 'fallback', url: null, fallbackUrl: r.fallbackUrl || null, message: r.message || '' });
    } catch {
      setState({ status: 'error', url: null, fallbackUrl: null, message: 'Submission failed — try again.' });
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-ac-light-gray bg-ac-warm-white p-4">
      <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ac-med-gray">
        /// Draft submission
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

      {state.status === 'done' ? (
        <a href={state.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-ac-success no-underline">
          Filed to the marketplace <ExternalLink size={13} />
        </a>
      ) : state.status === 'fallback' ? (
        <a href={state.fallbackUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 font-mono text-[12px] font-medium text-ac-coral-dark no-underline">
          Open a prefilled issue <ExternalLink size={13} />
        </a>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={state.status === 'sending'}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-ac-ink disabled:opacity-50"
        >
          {state.status === 'sending' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit to marketplace
        </button>
      )}
      {state.status === 'error' && <p className="mt-2 text-[12px] text-ac-coral-dark">{state.message}</p>}
    </div>
  );
}
