import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { DraftCard } from './DraftCard';
import { ArtifactCard } from './ArtifactCard';
import { MarketplaceCapture } from './MarketplaceCapture';

function RecCard({ surface, id, lookup }) {
  const meta = lookup[id] || {};
  const to = surface === 'skills' ? `/signals/${id}` : `/workflow/${id}`;
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 no-underline transition-colors hover:border-ac-coral"
    >
      <span className="text-[13px] font-medium text-ac-dark">{meta.name || id}</span>
      <ArrowRight size={13} className="text-ac-med-gray transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function MessageList({ surface, turns, pending, lookup }) {
  return (
    <div className="flex flex-col gap-4">
      {turns.map((t, i) =>
        t.role === 'user' ? (
          <div key={i} className="self-end rounded-xl bg-white px-3.5 py-2 text-[13.5px] text-ac-ink">{t.content}</div>
        ) : (
          <div key={i} className="max-w-full self-start">
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">{t.content}</p>
            {t.recommendations && t.recommendations.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {t.recommendations.map((id) => (
                  <RecCard key={id} surface={surface} id={id} lookup={lookup} />
                ))}
              </div>
            )}
            {t.artifact && <ArtifactCard artifact={t.artifact} />}
            {!t.artifact && t.draft && <DraftCard draft={t.draft} />}
            {(t.artifact || t.draft) && <MarketplaceCapture surface={surface} draft={t.draft} artifact={t.artifact} />}
          </div>
        ),
      )}
      {pending && (
        <div className="inline-flex items-center gap-2 self-start text-[13px] text-ac-med-gray">
          <Loader2 size={14} className="animate-spin" /> Thinking…
        </div>
      )}
    </div>
  );
}
