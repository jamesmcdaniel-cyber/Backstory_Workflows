import { useMemo, useState } from 'react';
import { Sparkles, ArrowUp } from 'lucide-react';
import { MessageList } from './assistant/MessageList';
import { sendChat, getPersona, appendUser, appendAssistant, toApiMessages } from '../lib/assistant';

export function Assistant({ surface, query, onQueryChange, placeholder, suggestions = [], lookup = {} }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [pending, setPending] = useState(false);
  const persona = useMemo(() => getPersona(), []);

  async function ask(text) {
    const q = (text || '').trim();
    if (!q || pending) return;
    const next = appendUser(turns, q);
    setTurns(next);
    setOpen(true);
    setPending(true);
    try {
      const result = await sendChat({ surface, messages: toApiMessages(next), persona });
      setTurns((t) => appendAssistant(t, result));
    } catch {
      setTurns((t) =>
        appendAssistant(t, {
          reply: 'The assistant is unavailable right now — the catalogue search above still works.',
          recommendations: [],
          proposingDraft: false,
        }),
      );
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    ask(query);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="relative">
        <Sparkles size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ac-med-gray" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-ac-light-gray bg-ac-warm-white py-2.5 pl-10 pr-24 text-sm text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream"
        />
        <button
          type="submit"
          disabled={!query.trim() || pending}
          className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ac-ink disabled:opacity-40"
        >
          Ask <ArrowUp size={13} />
        </button>
      </form>

      {!open && suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-ac-light-gray bg-ac-card px-3 py-1 font-mono text-[11px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-4 rounded-xl border border-ac-light-gray bg-ac-card p-4">
          <MessageList surface={surface} turns={turns} pending={pending} lookup={lookup} />
        </div>
      )}
    </div>
  );
}
