import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { submitDraft, getPersona } from '../../lib/assistant';

// Auto-submits a built workflow/skill to the marketplace once, on mount, and shows status.
export function MarketplaceCapture({ surface, draft, artifact }) {
  const [state, setState] = useState({ status: 'pending', url: null, fallbackUrl: null });
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    submitDraft({ surface, draft, artifact, persona: getPersona() })
      .then((r) => {
        if (r && r.ok) setState({ status: 'done', url: r.url, fallbackUrl: null });
        else setState({ status: 'fallback', url: null, fallbackUrl: (r && r.fallbackUrl) || null });
      })
      .catch(() => setState({ status: 'error', url: null, fallbackUrl: null }));
  }, [surface, draft, artifact]);

  const base = 'mt-2 inline-flex items-center gap-1.5 font-mono text-[11px]';

  if (state.status === 'pending')
    return (
      <div className={`${base} text-ac-med-gray`}>
        <Loader2 size={12} className="animate-spin" /> Capturing to the marketplace…
      </div>
    );
  if (state.status === 'done')
    return state.url ? (
      <a href={state.url} target="_blank" rel="noreferrer" className={`${base} text-ac-success no-underline`}>
        <CheckCircle2 size={12} /> Filed to the marketplace <ExternalLink size={11} />
      </a>
    ) : (
      <div className={`${base} text-ac-success`}>
        <CheckCircle2 size={12} /> Filed to the marketplace
      </div>
    );
  if (state.status === 'fallback')
    return state.fallbackUrl ? (
      <a href={state.fallbackUrl} target="_blank" rel="noreferrer" className={`${base} text-ac-coral-dark no-underline`}>
        Open a prefilled marketplace issue <ExternalLink size={11} />
      </a>
    ) : (
      <div className={`${base} text-ac-med-gray`}>Saved — marketplace not configured.</div>
    );
  return (
    <div className={`${base} text-ac-coral-dark`}>
      <AlertCircle size={12} /> Couldn't file to the marketplace — try again later.
    </div>
  );
}
