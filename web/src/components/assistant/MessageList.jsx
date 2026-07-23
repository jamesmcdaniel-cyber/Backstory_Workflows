// web/src/components/assistant/MessageList.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, StopCircle, RotateCcw, ThumbsUp, ThumbsDown } from 'lucide-react';
import { DraftCard } from './DraftCard';
import { ArtifactCard } from './ArtifactCard';
import { MarketplaceCapture } from './MarketplaceCapture';
import { AssistantMessage } from './AssistantMessage';
import { recordAssistantEvent } from '../../lib/assistant';

function ResponseFeedback({ turn }) {
  const [choice, setChoice] = useState(null);
  function choose(value) {
    if (choice) return;
    setChoice(value);
    recordAssistantEvent('assistant_feedback', {
      helpful: value === 'helpful',
      intent: turn.intent || 'unknown',
      hasArtifact: !!turn.artifact,
      hasDraft: !!turn.draft,
    });
  }
  return (
    <div className="inline-flex items-center gap-1 text-ac-med-gray" aria-label="Rate this response">
      <span className="mr-1 font-mono text-[9.5px] uppercase">{choice ? 'Thanks' : 'Helpful?'}</span>
      <button type="button" onClick={() => choose('helpful')} disabled={!!choice} aria-label="Helpful response" aria-pressed={choice === 'helpful'} className="rounded p-1 hover:text-ac-dark disabled:opacity-60"><ThumbsUp size={12} /></button>
      <button type="button" onClick={() => choose('unhelpful')} disabled={!!choice} aria-label="Unhelpful response" aria-pressed={choice === 'unhelpful'} className="rounded p-1 hover:text-ac-dark disabled:opacity-60"><ThumbsDown size={12} /></button>
    </div>
  );
}

// Which site page each answer's `source` links to. Rendered as a "learn more"
// link so users can open the underlying page and read it themselves.
const SOURCE_LINKS = {
  mcp: { to: '/mcp', label: 'the Backstory MCP page' },
  api: { to: '/api-docs', label: 'the API docs' },
  workflows: { to: '/flows', label: 'the Auto flows library' },
  skills: { to: '/signals', label: 'the Signals library' },
  guides: { to: '/guides', label: 'the setup guides' },
};

function SourceLink({ source }) {
  const link = SOURCE_LINKS[source];
  if (!link) return null;
  // No `fromAssistant` state here (unlike recommendation cards): "Learn more"
  // just sends the user to the source page to explore on their own, so the
  // floating widget stays closed rather than following them there.
  return (
    <Link
      to={link.to}
      className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ac-coral-dark no-underline transition-colors hover:text-ac-coral"
    >
      Learn more on {link.label}
      <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function RecCard({ id, lookup, reason }) {
  const meta = lookup[id] || {};
  const to = meta.kind === 'signal' ? `/signals/${id}` : `/workflow/${id}`;
  return (
    // Tag the navigation as coming from the assistant so the destination shows
    // a "Back to Assistant" link and opens the floating widget, ready for the
    // user to continue the thread.
    <Link
      to={to}
      state={{ fromAssistant: true }}
      className="group flex items-center justify-between gap-3 rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2 no-underline transition-colors hover:border-ac-coral"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ac-dark">{meta.name || id}</span>
        {reason && <span className="mt-0.5 block text-[11.5px] leading-4 text-ac-med-gray">{reason}</span>}
      </span>
      <ArrowRight size={13} className="text-ac-med-gray transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function MessageList({ turns, pending, pendingStage = 'Thinking', lookup, onGenerate, onRetry, onCancel, onRegenerate, buildAttachmentsReady = true }) {
  return (
    <div className="flex flex-col gap-4">
      {turns.map((t, i) =>
        t.role === 'user' ? (
          <div key={i} className="self-end rounded-xl bg-ac-horizon-100 px-3.5 py-2 text-[13.5px] text-ac-dark">{t.content}</div>
        ) : (
          <div key={i} className="max-w-full self-start">
            <AssistantMessage content={t.content} />
            {t.source && (
              <div>
                <SourceLink source={t.source} />
              </div>
            )}
            {t.recommendations && t.recommendations.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {t.recommendations.map((id) => (
                  <RecCard key={id} id={id} lookup={lookup} reason={t.recommendationReasons?.[id]} />
                ))}
              </div>
            )}
            {t.artifact && <ArtifactCard artifact={t.artifact} />}
            {!t.artifact && t.draft && <DraftCard draft={t.draft} onGenerate={onGenerate} attachmentsReady={buildAttachmentsReady} />}
            {t.artifactExpired && (
              <div className="mt-2 text-[11.5px] text-ac-med-gray">
                {t.artifactSummary?.filename || 'The generated artifact'} was not stored in this browser.
                {onRegenerate && <button type="button" onClick={onRegenerate} className="ml-1 font-mono uppercase text-ac-dark-secondary hover:text-ac-dark">Regenerate</button>}
              </div>
            )}
            {t.artifact && <MarketplaceCapture surface="platform" draft={t.draft} artifact={t.artifact} />}
            {t.error && onRetry && (
              <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-ac-coral-dark">
                <RotateCcw size={12} /> Retry
              </button>
            )}
            {!t.error && i === turns.length - 1 && (
              <div className="mt-2">
                <ResponseFeedback turn={t} />
              </div>
            )}
          </div>
        ),
      )}
      {pending && (
        <div className="inline-flex items-center gap-2 self-start text-[13px] text-ac-med-gray">
          <Loader2 size={14} className="animate-spin" /> {pendingStage}…
          {onCancel && <button type="button" onClick={onCancel} className="ml-1 inline-flex items-center gap-1 font-mono text-[10.5px] uppercase text-ac-dark-secondary"><StopCircle size={12} /> Stop</button>}
        </div>
      )}
    </div>
  );
}
