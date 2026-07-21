// Render inline markdown from sample_output.content into React nodes
export function SlackBody({ content }) {
  if (!content) return null;

  const processInline = (text) => {
    // Patterns: ===money===, @mention, **bold**, *em*
    const combined = /===(.+?)===|@([\w.]+)|\*\*(.+?)\*\*|\*(.+?)\*/g;
    let last = 0;
    let key = 0;
    let match;
    const result = [];

    combined.lastIndex = 0;
    const str = String(text);
    while ((match = combined.exec(str)) !== null) {
      if (match.index > last) {
        result.push(str.slice(last, match.index));
      }
      if (match[1] !== undefined) {
        // ===money===
        result.push(
          <span key={key++} className="rounded px-1.5 py-px bg-[rgba(0,184,148,0.12)] text-[#00866A] font-bold text-[11px] border border-[rgba(0,184,148,0.25)]">
            {match[1]}
          </span>
        );
      } else if (match[2] !== undefined) {
        // @mention
        result.push(
          <span key={key++} className="rounded px-0.5 bg-[rgba(29,155,209,0.1)] text-[#1264A3] font-medium">
            @{match[2]}
          </span>
        );
      } else if (match[3] !== undefined) {
        // **bold**
        result.push(<strong key={key++}>{match[3]}</strong>);
      } else if (match[4] !== undefined) {
        // *em*
        result.push(<em key={key++} className="text-ac-dark-secondary">{match[4]}</em>);
      }
      last = match.index + match[0].length;
    }
    if (last < str.length) result.push(str.slice(last));
    return result;
  };

  const lines = content.split('\n');
  const elements = [];
  let listItems = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={key++} className="mb-1.5 list-disc pl-4 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed === '---') {
      flushList();
      elements.push(<hr key={key++} className="my-2 border-ac-light-gray" />);
    } else if (trimmed.startsWith('- ')) {
      listItems.push(
        <li key={key++}>{processInline(trimmed.slice(2))}</li>
      );
    } else {
      flushList();
      elements.push(
        <p key={key++} className="mb-1">{processInline(trimmed)}</p>
      );
    }
  }
  flushList();

  return <>{elements}</>;
}

export function DeliveryPreview({ sample }) {
  if (!sample) return null;
  const initial = sample.bot_name ? sample.bot_name[0].toUpperCase() : 'A';

  return (
    <div className="surface-card p-6">
      {/* Panel heading */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ac-med-gray">
            Sample Output
          </div>
          <h2 className="mt-0.5 font-display text-[15px] font-bold text-ac-dark">Delivery Preview</h2>
        </div>
        {sample.mockup && (
          <span className="rounded-full border border-ac-light-gray px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.05em] text-ac-coral-dark">
            {sample.mockup}
          </span>
        )}
      </div>

      {/* Slack-style card */}
      <div className="overflow-hidden rounded-xl border border-ac-light-gray bg-ac-card shadow-card">
        {/* Header row */}
        <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-1">
          {/* Avatar */}
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[6px] bg-ac-coral font-display text-[16px] font-bold text-ac-ink">
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="font-display text-[14px] font-black text-ac-dark">
              {sample.bot_name || 'Bot'}
            </span>
            {sample.bot_app && (
              <span className="rounded px-[5px] py-px bg-ac-light-gray font-mono text-[10px] font-bold text-ac-dark-secondary">
                APP
              </span>
            )}
            <span className="ml-auto font-mono text-[11px] text-ac-med-gray">7:21 AM</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-[60px] pb-3.5 pt-1.5 text-[13px] leading-[1.55] text-ac-dark">
          <SlackBody content={sample.content} />
        </div>
      </div>
    </div>
  );
}
