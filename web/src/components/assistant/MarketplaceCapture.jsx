import { CheckCircle2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

// Pure renderer for a build turn's marketplace-capture status. The submission
// itself is fired once by the chat store when the turn arrives (never on
// mount/render), so a persisted thread rendered on reload can't re-submit.
// `capture` is the turn's { status, url?, fallbackUrl? } — absent on turns
// created before this session, in which case nothing is shown.
export function MarketplaceCapture({ capture }) {
  if (!capture) return null;

  const base = 'mt-2 inline-flex items-center gap-1.5 font-mono text-[11px]';

  if (capture.status === 'pending')
    return (
      <div className={`${base} text-ac-med-gray`}>
        <Loader2 size={12} className="animate-spin" /> Capturing to the marketplace…
      </div>
    );
  if (capture.status === 'done')
    return capture.url ? (
      <a href={capture.url} target="_blank" rel="noreferrer" className={`${base} text-ac-success no-underline`}>
        <CheckCircle2 size={12} /> Filed to the marketplace <ExternalLink size={11} />
      </a>
    ) : (
      <div className={`${base} text-ac-success`}>
        <CheckCircle2 size={12} /> Filed to the marketplace
      </div>
    );
  if (capture.status === 'fallback')
    return capture.fallbackUrl ? (
      <a href={capture.fallbackUrl} target="_blank" rel="noreferrer" className={`${base} text-ac-coral-dark no-underline`}>
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
