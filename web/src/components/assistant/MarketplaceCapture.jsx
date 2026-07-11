import { useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, AlertCircle, Upload } from 'lucide-react';
import { submitDraft, getPersona, recordAssistantEvent } from '../../lib/assistant';

// Marketplace publishing is always user initiated. Generated artifacts may
// contain customer-specific logic, so the user sees what will be filed first.
export function MarketplaceCapture({ surface, draft, artifact }) {
  const [state, setState] = useState({ status: 'idle', url: null, fallbackUrl: null });
  const label = artifact?.filename || draft?.title || 'this draft';

  async function submit() {
    setState({ status: 'pending', url: null, fallbackUrl: null });
    recordAssistantEvent('marketplace_submit_started', { surface, hasArtifact: !!artifact, hasDraft: !!draft });
    try {
      const r = await submitDraft({ surface, draft, artifact, persona: getPersona() });
      if (r?.ok) {
        setState({ status: 'done', url: r.url, fallbackUrl: null });
        recordAssistantEvent('marketplace_submit_result', { surface, status: 'done' });
      } else {
        setState({ status: 'fallback', url: null, fallbackUrl: r?.fallbackUrl || null });
        recordAssistantEvent('marketplace_submit_result', { surface, status: 'fallback' });
      }
    } catch {
      setState({ status: 'error', url: null, fallbackUrl: null });
      recordAssistantEvent('marketplace_submit_result', { surface, status: 'error' });
    }
  }

  const base = 'mt-2 inline-flex items-center gap-1.5 font-mono text-[11px]';
  if (state.status === 'idle') return (
    <button type="button" onClick={() => setState({ status: 'confirm', url: null, fallbackUrl: null })} className={`${base} text-ac-med-gray hover:text-ac-dark`}>
      <Upload size={12} /> Submit to marketplace
    </button>
  );
  if (state.status === 'confirm') return (
    <div className="mt-2 rounded-lg border border-ac-light-gray bg-ac-warm-white p-3 text-[12px] text-ac-dark-secondary">
      <p>This will file <strong>{label}</strong> and its generated content in the configured GitHub marketplace repository.</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={submit} className="rounded-md bg-white px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase text-ac-ink">Confirm submission</button>
        <button type="button" onClick={() => setState({ status: 'idle', url: null, fallbackUrl: null })} className="px-2 py-1 font-mono text-[10.5px] uppercase text-ac-med-gray">Cancel</button>
      </div>
    </div>
  );
  if (state.status === 'pending') return <div className={`${base} text-ac-med-gray`}><Loader2 size={12} className="animate-spin" /> Submitting…</div>;
  if (state.status === 'done') return state.url ? (
    <a href={state.url} target="_blank" rel="noreferrer" className={`${base} text-ac-success no-underline`}><CheckCircle2 size={12} /> Filed to marketplace <ExternalLink size={11} /></a>
  ) : <div className={`${base} text-ac-success`}><CheckCircle2 size={12} /> Filed to marketplace</div>;
  if (state.status === 'fallback') return state.fallbackUrl ? (
    <a href={state.fallbackUrl} target="_blank" rel="noreferrer" className={`${base} text-ac-coral-dark no-underline`}>Review a prefilled marketplace issue <ExternalLink size={11} /></a>
  ) : <div className={`${base} text-ac-med-gray`}>Marketplace submission is not configured.</div>;
  return <button type="button" onClick={() => setState({ status: 'confirm', url: null, fallbackUrl: null })} className={`${base} text-ac-coral-dark`}><AlertCircle size={12} /> Submission failed — retry</button>;
}
