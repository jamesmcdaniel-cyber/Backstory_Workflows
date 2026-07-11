import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowUp, Paperclip, Wrench, SquarePen, Maximize2 } from 'lucide-react';
import { MessageList } from './assistant/MessageList';
import { BuilderPanel } from './assistant/BuilderPanel';
import { useAssistantChat } from '../lib/chatStore';
import { artifactPrompt, buildPrompt } from '../lib/assistant';

export function AssistantWidget({ suggestions = [], lookup = {}, pageContext }) {
  const [open, setOpen] = useState(false);
  const chat = useAssistantChat();
  const fileRef = useRef(null);
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    chat.ask(chat.input, { pageContext });
  }

  function handleBuild(spec) {
    chat.setMode('chat');
    chat.ask(buildPrompt(spec), { pageContext, requestMode: 'plan' });
  }

  function handleGenerate(draft) {
    chat.ask(artifactPrompt(draft), { pageContext, requestMode: 'artifact' });
  }

  function handleShorter() {
    chat.ask('Rewrite your immediately previous answer in no more than 60 words. Preserve only the essential answer and do not add recommendations or a closing question.', { pageContext });
  }

  function handleRegenerate() {
    chat.ask('Regenerate the most recent approved artifact using the plan and context already in this conversation.', { pageContext, requestMode: 'artifact' });
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
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ac-med-gray">/// Librarian</div>
          <div className="font-display text-[14px] font-bold text-ac-dark">Backstory AI</div>
        </div>
        <div className="flex items-center gap-2">
          {(chat.turns.length > 0 || chat.mode === 'builder') && (
            <button
              type="button"
              onClick={chat.resetChat}
              title="New chat"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
            >
              <SquarePen size={14} /> New
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/')}
            title="Open the Librarian page"
            className="text-ac-med-gray transition-colors hover:text-ac-dark"
          >
            <Maximize2 size={16} />
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-ac-med-gray transition-colors hover:text-ac-dark">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chat.mode === 'builder' ? (
          <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
        ) : chat.turns.length === 0 ? (
          <div>
            <p className="text-[13.5px] leading-6 text-ac-dark-secondary">
              I'm the Librarian — I know every flow, signal, MCP tool, guide, and API doc on this site. Ask me anything, or have me build you a workflow. You can attach an export, screenshot, or doc too.
            </p>
            <button
              type="button"
              onClick={() => chat.setMode('builder')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[0.07em] text-ac-ink"
            >
              <Wrench size={13} /> Build your own workflow
            </button>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.ask(s, { pageContext })}
                    className="rounded-full border border-ac-light-gray bg-ac-warm-white px-3 py-1 font-mono text-[11px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <MessageList
            turns={chat.turns}
            pending={chat.pending}
            pendingStage={chat.pendingStage}
            lookup={lookup}
            onGenerate={handleGenerate}
            onRetry={chat.retryLast}
            onCancel={chat.cancel}
            onShorter={handleShorter}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>

      {chat.mode !== 'builder' && (
        <form onSubmit={onSubmit} className="border-t border-ac-light-gray p-3">
          {chat.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {chat.attachments.map((a, i) => (
                <span
                  key={`${a.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-ac-warm-white px-2 py-0.5 font-mono text-[10.5px] text-ac-dark-secondary"
                >
                  {a.name}
                  <button type="button" onClick={() => chat.removeAttachment(i)} className="text-ac-med-gray hover:text-ac-dark">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {chat.attachError && <div className="mb-2 font-mono text-[11px] text-ac-coral-dark">{chat.attachError}</div>}
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
              onChange={(e) => {
                chat.addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              type="text"
              value={chat.input}
              onChange={(e) => chat.setInput(e.target.value)}
              placeholder="Ask, or describe a workflow to build…"
              className="w-full rounded-xl border border-ac-light-gray bg-ac-warm-white py-2.5 pl-9 pr-12 text-sm text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-ac-cream"
            />
            <button
              type="submit"
              disabled={(!chat.input.trim() && chat.attachments.length === 0) || chat.pending}
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
