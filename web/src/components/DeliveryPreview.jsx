// Convert the shared "brief" markup in sample_output.content into an HTML string.
// Tokens: **bold**  *em*  @mention  ===money===  "## <emoji> HEADER" section
// "> callout" line  "- bullet"  "---" divider.  Lines beginning with "<" are
// treated as raw HTML and passed through verbatim (authored, trusted content).
// Kept identical to legacy index.html's mdToHtml so both codebases stay in sync.
export function briefToHtml(md) {
  if (!md) return '';

  const inline = (s) =>
    s
      .replace(/===(.+?)===/g, '<span class="slack-money">$1</span>')
      .replace(/@([\w.]+)/g, '<span class="slack-mention">@$1</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const lines = String(md).split('\n');
  let html = '';
  let inList = false;
  let sectionSeen = false;
  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('<')) {
      // Raw HTML escape hatch — pass through untouched
      closeList();
      html += trimmed;
    } else if (trimmed.startsWith('## ')) {
      closeList();
      html += `<div class="so-section${sectionSeen ? '' : ' so-section--first'}">${inline(trimmed.slice(3))}</div>`;
      sectionSeen = true;
    } else if (trimmed.startsWith('> ')) {
      closeList();
      html += `<div class="so-callout">${inline(trimmed.slice(2))}</div>`;
    } else if (trimmed === '---') {
      closeList();
      html += '<hr>';
    } else if (trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inline(trimmed.slice(2))}</li>`;
    } else {
      closeList();
      html += `<p>${inline(trimmed)}</p>`;
    }
  }
  closeList();
  return html;
}

// Render sample_output.content as the Slack message body.
export function SlackBody({ content }) {
  if (!content) return null;
  return <div className="so-body" dangerouslySetInnerHTML={{ __html: briefToHtml(content) }} />;
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
