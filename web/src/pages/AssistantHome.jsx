// web/src/pages/AssistantHome.jsx
// The Librarian's home — the site's front door. Gemini-style: a greeting and
// one big composer; after the first message it becomes a focused thread.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Paperclip, Wrench, ArrowUp, SquarePen, X } from 'lucide-react';
import { useAssistantChat } from '../lib/chatStore';
import { BrandMark } from '../components/BrandMark';
import { timeGreeting } from '../lib/greeting';
import { artifactPrompt, buildPrompt } from '../lib/assistant';
import { useData } from '../lib/useData';
import { MessageList } from '../components/assistant/MessageList';
import { BuilderPanel } from '../components/assistant/BuilderPanel';
import { AudienceRoleControl } from '../components/assistant/AudienceRoleControl';
import { HOME_SUGGESTIONS } from '../lib/assistantSuggestions';

const HOME_CONTEXT =
  "The user is on the Assistant home page — the assistant's dedicated page for the whole library. They may ask about anything on the site (Auto flows, Signals, MCP capabilities, API docs, setup guides), want a workflow built, or want to talk through automation strategy. Questions often arrive fuzzy — interpret the underlying need and guide them to concrete use cases.";

// Rotating headline — each line is something the Librarian actually does.
const HEADLINES = [
  'Build a deal-risk workflow.',
  'Search the workflow library.',
  'Find a signal for your team.',
  'Talk through your automation strategy.',
];

// Typewriter rotation: type a headline out, hold it, backspace, type the
// next — the brand's "typed" mannerism. Reduced-motion users get the first
// headline held statically. Returns the partial text plus the full current
// line (for the accessible label).
function useTypedHeadline() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(HEADLINES[0]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let i = 0;
    let pos = HEADLINES[0].length;
    let deleting = false;
    let timer;
    const step = () => {
      const line = HEADLINES[i];
      if (!deleting && pos === line.length) {
        deleting = true;
        timer = setTimeout(step, 2600); // hold the finished line
        return;
      }
      if (deleting && pos === 0) {
        deleting = false;
        i = (i + 1) % HEADLINES.length;
        setIndex(i);
        timer = setTimeout(step, 250); // beat before typing the next line
        return;
      }
      pos += deleting ? -1 : 1;
      setText(line.slice(0, pos));
      timer = setTimeout(step, deleting ? 16 : 40);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  }, []);
  return { text, full: HEADLINES[index] };
}

function Composer({ chat, autoFocus = false }) {
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
      className="rounded-2xl border border-ac-light-gray bg-ac-card p-3 shadow-card transition-colors focus-within:border-ac-coral"
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
        className="max-h-[200px] w-full resize-none bg-transparent px-2 pt-1.5 text-[15px] leading-6 text-ac-dark placeholder:text-ac-med-gray focus:outline-none"
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
          className="grid h-9 w-9 place-items-center rounded-full bg-ac-coral text-white transition-colors hover:bg-ac-coral-dark disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp size={16} />
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
  const { text: typedHeadline, full: fullHeadline } = useTypedHeadline();

  if (empty) {
    return (
      <div className="mx-auto w-full max-w-[920px] px-5 pb-24 pt-[14vh] animate-fade-up">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ac-dark-secondary">
          <BrandMark /> {timeGreeting(new Date().getHours())}
        </div>
        <h1
          aria-label={fullHeadline}
          className="mt-2 min-h-[1.5em] font-display text-[clamp(26px,4.5vw,40px)] font-bold tracking-[-0.02em] text-ac-dark"
        >
          <span aria-hidden>{typedHeadline}</span>
          <span
            aria-hidden
            className="ml-1 inline-block h-[0.85em] w-[3px] translate-y-[0.1em] rounded-sm bg-ac-coral animate-caret motion-reduce:hidden"
          />
        </h1>
        <div className="mt-8">
          {chat.mode === 'builder' ? (
            <div className="rounded-2xl border border-ac-light-gray bg-ac-card p-5">
              <BuilderPanel surface="platform" onBuild={handleBuild} onCancel={() => chat.setMode('chat')} />
            </div>
          ) : (
            <>
              <Composer chat={chat} autoFocus />
              <div className="mt-4 flex flex-wrap gap-2">
                {HOME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => chat.ask(s, { pageContext: HOME_CONTEXT })}
                    className="rounded-full border border-ac-light-gray bg-ac-card px-3.5 py-1.5 font-mono text-[11.5px] text-ac-dark-secondary transition-colors hover:border-ac-coral hover:text-ac-coral-dark"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
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
