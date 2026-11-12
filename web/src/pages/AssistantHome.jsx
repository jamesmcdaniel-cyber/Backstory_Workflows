// web/src/pages/AssistantHome.jsx
// The site's front door. Before the first message: a hero that explains the
// library, an "Ask any question" explainer, then the composer. After the first
// message it becomes a focused thread.
import { useEffect, useMemo, useRef } from 'react';
import { Paperclip, Wrench, ArrowUp, SquarePen, X } from 'lucide-react';
import { useAssistantChat } from '../lib/chatStore';
import { BrandMark } from '../components/BrandMark';
import { artifactPrompt, buildPrompt } from '../lib/assistant';
import { useData } from '../lib/useData';
import { MessageList } from '../components/assistant/MessageList';
import { BuilderPanel } from '../components/assistant/BuilderPanel';
import { AudienceRoleControl } from '../components/assistant/AudienceRoleControl';
import { HOME_SUGGESTIONS } from '../lib/assistantSuggestions';
import { AnswerExplainer, ExploreLibrary, LibraryHero } from '../components/home/HomeIntro';

const HOME_CONTEXT =
  "The user is on the Assistant home page — the assistant's dedicated page for the whole library. They may ask about anything on the site (Auto flows, Signals, MCP capabilities, API docs, setup guides), want a workflow built, or want to talk through automation strategy. Questions often arrive fuzzy — interpret the underlying need and guide them to concrete use cases.";

function Composer({ chat, autoFocus = false, prominent = false }) {
  const taRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (autoFocus && taRef.current) taRef.current.focus();
  }, [autoFocus]);

  function resize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  function submit() {
    chat.ask(chat.input, { pageContext: HOME_CONTEXT });
    if (taRef.current) taRef.current.style.height = 'auto';
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={
        prominent
          ? 'rounded-2xl border-2 border-ac-horizon-200 bg-ac-card px-4 py-3 shadow-cardhover ring-2 ring-ac-horizon-100/70 transition-colors focus-within:border-ac-coral focus-within:ring-ac-horizon-200/60'
          : 'rounded-2xl border border-ac-light-gray bg-ac-card p-3 shadow-card transition-colors focus-within:border-ac-coral'
      }
    >
      {chat.attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chat.attachments.map((a, i) => (
            <span
              key={`${a.name}-${i}`}
              className="inline-flex items-center gap-1 rounded-md border border-ac-light-gray bg-ac-warm-white px-2 py-0.5 font-mono text-[10.5px] text-ac-dark-secondary"
            >
              {a.name}
              <button
                type="button"
                onClick={() => chat.removeAttachment(i)}
                aria-label={`Remove ${a.name}`}
                className="text-ac-med-gray hover:text-ac-dark"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {chat.attachError && <div className="mb-2 font-mono text-[11px] text-ac-coral-dark">{chat.attachError}</div>}
      <textarea
        ref={taRef}
        rows={1}
        value={chat.input}
        onChange={(e) => {
          chat.setInput(e.target.value);
          resize();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask the Assistant about the library, setup, or a goal…"
        className={`max-h-[200px] w-full resize-none bg-transparent px-2 pt-1.5 text-ac-dark placeholder:text-ac-med-gray focus:outline-none ${
          prominent ? 'text-[16.5px] leading-7 placeholder:text-ac-dark-secondary/70' : 'text-[15px] leading-6'
        }`}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            title="Attach a file"
            aria-label="Attach a file"
            className="grid h-9 w-9 place-items-center rounded-lg text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
          >
            <Paperclip size={17} />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.json,.txt,.md,.csv"
            className="hidden"
            onChange={(e) => {
              chat.addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => chat.setMode('builder')}
            title="Build a workflow"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
          >
            <Wrench size={14} /> Build
          </button>
        </div>
        <button
          type="submit"
          disabled={(!chat.input.trim() && chat.attachments.length === 0) || chat.pending}
          className={`grid place-items-center rounded-full bg-ac-coral text-white transition-colors hover:bg-ac-coral-dark ${
            prominent ? 'h-11 w-11 shadow-card disabled:opacity-60' : 'h-9 w-9 disabled:opacity-40'
          }`}
          aria-label="Send"
        >
          <ArrowUp size={prominent ? 19 : 16} />
        </button>
      </div>
      <div className="mt-2 border-t border-ac-light-gray pt-2">
        <AudienceRoleControl value={chat.audienceRole} onChange={chat.setAudienceRole} />
      </div>
    </form>
  );
}

export function AssistantHome() {
  const chat = useAssistantChat();
  const { data: wf } = useData('workflows.json');
  const { data: sk } = useData('skills.json');

  const lookup = useMemo(() => {
    const m = {};
    (wf?.workflows || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'workflow' }));
    (sk?.skills || []).forEach((x) => (m[x.id] = { name: x.name, category: x.category, kind: 'signal' }));
    return m;
  }, [wf, sk]);

  function handleBuild(spec, formatAttachments = []) {
    chat.setMode('chat');
    chat.ask(buildPrompt(spec), { attachments: formatAttachments, pageContext: HOME_CONTEXT, requestMode: 'plan' });
  }

  function handleGenerate(draft) {
    chat.ask(artifactPrompt(draft), { pageContext: HOME_CONTEXT, requestMode: 'artifact' });
  }

  function handleRegenerate() {
    chat.ask('Regenerate the most recent approved artifact using the plan and context already in this conversation.', { pageContext: HOME_CONTEXT, requestMode: 'artifact' });
  }

  // Keep the newest turn (and the Thinking… indicator) in view as the thread grows.
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.turns.length, chat.pending]);

  const empty = chat.turns.length === 0;
  const askRef = useRef(null);

  if (empty) {
    const workflowCount = wf?.workflows?.length;
    const signalCount = sk?.skills?.length;
    const scrollToAsk = () => {
      askRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      askRef.current?.querySelector('textarea')?.focus({ preventScroll: true });
    };
    return (
      <div className="container-page animate-fade-up pb-24">
        <LibraryHero workflowCount={workflowCount} signalCount={signalCount} onAsk={scrollToAsk} />
        <div className="mt-14 sm:mt-20">
          <AnswerExplainer libraryCount={workflowCount && signalCount ? workflowCount + signalCount : undefined} />
        </div>
        <div
          ref={askRef}
          id="ask"
          className="mt-10 w-full scroll-mt-28 rounded-3xl border border-ac-horizon-100 bg-ac-horizon-50 px-4 py-4 sm:px-7 sm:py-5"
        >
          <div className="mb-3 flex items-center gap-2 font-mono text-[11.5px] font-medium uppercase tracking-[0.18em] text-ac-coral-dark">
            <BrandMark /> Ask the Assistant
          </div>
          {chat.mode === 'builder' ? (
            <div className="rounded-2xl border border-ac-light-gray bg-ac-card p-5">
              <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
            </div>
          ) : (
            <>
              <Composer chat={chat} prominent />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {HOME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.ask(s, { pageContext: HOME_CONTEXT })}
                    className="rounded-full border border-ac-horizon-100 bg-ac-card px-3.5 py-1.5 font-mono text-[11.5px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mt-20">
          <ExploreLibrary workflowCount={workflowCount} signalCount={signalCount} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5">
      <div className="sticky top-[74px] z-10 -mx-5 flex items-center justify-between bg-gradient-to-b from-white via-white/95 to-transparent px-5 pb-4 pt-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ac-dark-secondary"><BrandMark /> Assistant</div>
        <button
          type="button"
          onClick={chat.resetChat}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-med-gray transition-colors hover:bg-ac-cream hover:text-ac-dark"
        >
          <SquarePen size={13} /> New chat
        </button>
      </div>

      <div className="pb-6 pt-2">
        {chat.mode === 'builder' ? (
          <div className="rounded-2xl border border-ac-light-gray bg-ac-card p-5">
            <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
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
            onRegenerate={handleRegenerate}
            buildAttachmentsReady={chat.buildAttachmentsReady}
          />
        )}
        <div ref={endRef} />
      </div>

      {chat.mode !== 'builder' && (
        <div className="sticky bottom-0 z-20 -mx-5 bg-gradient-to-t from-white via-white/95 to-transparent px-5 pb-5 pt-8">
          <Composer chat={chat} />
        </div>
      )}
    </div>
  );
}
