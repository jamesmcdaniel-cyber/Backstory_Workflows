import { useMemo, useState } from 'react';
import { Sparkles, X, ArrowUp } from 'lucide-react';
import { MessageList } from './assistant/MessageList';
import { sendChat, getPersona, appendUser, appendAssistant, toApiMessages } from '../lib/assistant';

export function AssistantWidget({ surface, suggestions = [], lookup = {} }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const persona = useMemo(() => getPersona(), []);

  const noun = surface === 'skills' ? 'skill' : 'workflow';
  const label = surface === 'skills' ? 'Skill builder' : 'Workflow liaison';

  async function ask(text) {
    const q = (text || '').trim();
    if (!q || pending) return;
    const next = appendUser(turns, q);
    setTurns(next);
    setInput('');
    setPending(true);
    try {
      const result = await sendChat({ surface, messages: toApiMessages(next), persona });
      setTurns((t) => appendAssistant(t, result));
    } catch {
      setTurns((t) =>
        appendAssistant(t, {
          reply: 'The assistant is offline here — set ANTHROPIC_API_KEY on the deployment to enable it. The catalogue search still works.',
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
    ask(input);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-ac-ink shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5"
      >
        <Sparkles size={16} /> Ask AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(620px,calc(100vh-2.5rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ac-light-gray bg-ac-card shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      <header className="flex items-center justify-between border-b border-ac-light-gray px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ac-med-gray">/// {label}</div>
          <div className="font-display text-[14px] font-bold text-ac-dark">Backstory AI</div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-ac-med-gray transition-colors hover:text-ac-dark">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <div>
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">
              Tell me what you want to get done. I'll find a {noun} that fits — or help you draft a new one and submit it to the marketplace.
            </p>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border border-ac-light-gray bg-ac-warm-white px-3 py-1 font-mono text-[11px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <MessageList surface={surface} turns={turns} pending={pending} lookup={lookup} />
        )}
      </div>

      <form onSubmit={onSubmit} className="relative border-t border-ac-light-gray p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask for a ${noun}, or describe one to build…`}
          className="w-full rounded-xl border border-ac-light-gray bg-ac-warm-white py-2.5 pl-3.5 pr-12 text-sm text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream"
        />
        <button
          type="submit"
          disabled={!input.trim() || pending}
          className="absolute right-5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg bg-white p-2 text-ac-ink disabled:opacity-40"
        >
          <ArrowUp size={15} />
        </button>
      </form>
    </div>
  );
}
