import { useMemo, useRef, useState } from 'react';
import { Sparkles, X, ArrowUp, Paperclip, Wrench } from 'lucide-react';
import { MessageList } from './assistant/MessageList';
import { BuilderPanel } from './assistant/BuilderPanel';
import {
  sendChat,
  getPersona,
  appendUser,
  appendAssistant,
  toApiMessages,
  readFileToAttachment,
  buildPrompt,
} from '../lib/assistant';

export function AssistantWidget({ surface, suggestions = [], lookup = {}, pageContext }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'builder'
  const fileRef = useRef(null);
  const persona = useMemo(() => getPersona(), []);

  const noun = surface === 'skills' ? 'skill' : 'workflow';
  const label = surface === 'skills' ? 'Skill builder' : 'Workflow liaison';

  async function ask(text, atts) {
    const q = (text || '').trim();
    const sendAtts = atts !== undefined ? atts : attachments;
    if ((!q && (!sendAtts || !sendAtts.length)) || pending) return;
    const next = appendUser(turns, q || '📎 (see attached)');
    setTurns(next);
    setInput('');
    setAttachments([]);
    setAttachError('');
    setPending(true);
    try {
      const result = await sendChat({ surface, messages: toApiMessages(next), persona, attachments: sendAtts, pageContext });
      setTurns((t) => appendAssistant(t, result));
    } catch {
      setTurns((t) =>
        appendAssistant(t, {
          reply: 'The assistant is unavailable right now — please try again in a moment.',
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

  function handleBuild(spec) {
    setMode('chat');
    ask(buildPrompt(spec));
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setAttachError('');
    for (const f of files) {
      try {
        const att = await readFileToAttachment(f);
        setAttachments((prev) => (prev.length >= 4 ? prev : [...prev, att]));
      } catch (err) {
        setAttachError((err && err.message) || 'Could not attach that file');
      }
    }
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
    <div className="fixed bottom-5 right-5 z-50 flex h-[min(640px,calc(100vh-2.5rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ac-light-gray bg-ac-card shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
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
        {mode === 'builder' ? (
          <BuilderPanel surface={surface} onBuild={handleBuild} onCancel={() => setMode('chat')} />
        ) : turns.length === 0 ? (
          <div>
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">
              Tell me what you want to get done. I'll find a {noun} that fits — or help you build a new one and submit it to the marketplace. You can attach an export, screenshot, or doc too.
            </p>
            <button
              type="button"
              onClick={() => setMode('builder')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.07em] text-ac-ink"
            >
              <Wrench size={13} /> Build your own {noun}
            </button>
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

      {mode !== 'builder' && (
        <form onSubmit={onSubmit} className="border-t border-ac-light-gray p-3">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {attachments.map((a, i) => (
                <span
                  key={`${a.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-ac-warm-white px-2 py-0.5 font-mono text-[10.5px] text-ac-dark-secondary"
                >
                  {a.name}
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ac-med-gray hover:text-ac-dark"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {attachError && <div className="mb-2 font-mono text-[11px] text-ac-coral-dark">{attachError}</div>}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ac-med-gray transition-colors hover:text-ac-dark"
              title="Attach a file"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.json,.txt,.md,.csv"
              className="hidden"
              onChange={handleFiles}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask, or describe a ${noun} to build…`}
              className="w-full rounded-xl border border-ac-light-gray bg-ac-warm-white py-2.5 pl-9 pr-12 text-sm text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream"
            />
            <button
              type="submit"
              disabled={(!input.trim() && attachments.length === 0) || pending}
              className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg bg-white p-2 text-ac-ink disabled:opacity-40"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
