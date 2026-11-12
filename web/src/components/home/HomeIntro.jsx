// web/src/components/home/HomeIntro.jsx
// The front door's context, shown above the Assistant composer before the
// first message: a hero that says what the library is and why to use it, then
// an "Ask any question" explainer that shows what goes into an answer, so a
// first-time visitor knows what to ask before they reach the composer.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, FileText, Plug, Sparkles, Workflow } from 'lucide-react';
import { SectionHero } from '../SectionHero';
import { MCP_TOOLS } from '../../data/mcpTools';
import { cn } from '../../lib/cn';

export function LibraryHero({ workflowCount, signalCount, onAsk }) {
  return (
    <SectionHero
      eyebrow="Backstory Automation Library"
      title="Ready-made AI workflows that run on your customer data."
      subtitle={`Backstory keeps the record of every email, meeting, and call. This library turns that record into the work your team does every week: meeting briefs, renewal-risk alerts, forecast digests, and follow-ups grounded in what actually happened. Pick one of ${workflowCount ?? 38} workflows or ${signalCount ?? 30} signals, or describe a goal and the Assistant will find or build it for you.`}
      image="meeting-bg-01.jpg"
    >
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex items-center gap-2 rounded-xl bg-ac-coral px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-ac-coral-dark"
        >
          Ask the Assistant <ArrowDown size={15} />
        </button>
        <Link
          to="/flows"
          className="inline-flex items-center gap-2 rounded-xl border border-white/35 px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10"
        >
          Browse workflows
        </Link>
        <Link
          to="/signals"
          className="inline-flex items-center gap-2 rounded-xl border border-white/35 px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:border-white hover:bg-white/10"
        >
          Browse signals
        </Link>
      </div>
    </SectionHero>
  );
}

// Each step is something the Assistant really does on a library question.
// The counts are illustrative except the library size and MCP tool count.
function answerSteps(libraryCount) {
  return [
    { label: 'Read the goal behind your question', meta: 'Intent' },
    { label: 'Search every workflow and signal', meta: String(libraryCount) },
    { label: 'Rank the closest matches', meta: '3' },
    { label: 'Map the Backstory MCP tools it needs', meta: `${MCP_TOOLS.length} tools` },
    { label: 'Hand back something you can import', meta: 'Ready' },
  ];
}

const SOURCE_CHIPS = [
  { kind: 'Workflow', icon: Workflow, label: 'Renewal Prep Brief' },
  { kind: 'Signal', icon: Sparkles, label: 'Customer Sentiment Agent' },
  { kind: 'MCP', icon: Plug, label: 'find_account' },
  { kind: 'Guide', icon: FileText, label: 'Deliver to Slack' },
];

// Steps check off one by one the first time the panel scrolls into view.
// Reduced-motion visitors see the finished state.
function useStepReveal(total) {
  const ref = useRef(null);
  const [done, setDone] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setDone(total);
      return undefined;
    }
    let timer;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        let n = 0;
        const tick = () => {
          n += 1;
          setDone(n);
          if (n < total) timer = setTimeout(tick, 520);
        };
        timer = setTimeout(tick, 300);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [total]);
  return { ref, done };
}

export function AnswerExplainer({ libraryCount }) {
  const steps = answerSteps(libraryCount ?? 68);
  const { ref, done } = useStepReveal(steps.length);
  const finished = done >= steps.length;

  return (
    <section aria-labelledby="ask-any-question" className="mx-auto max-w-[860px] text-center">
      <div className="inline-block rounded border border-ac-horizon-100 bg-ac-horizon-50 px-2.5 py-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ac-coral-dark">
        What goes into an Assistant answer
      </div>
      <h2
        id="ask-any-question"
        className="mt-4 font-display text-[clamp(26px,4.2vw,40px)] font-bold leading-[1.15] tracking-[-0.02em] text-ac-dark"
      >
        Ask any question. <span className="font-normal text-ac-coral">Get a working answer.</span>
      </h2>
      <p className="mx-auto mt-3 max-w-[640px] text-[15px] leading-relaxed text-ac-dark-secondary">
        Type a goal the way you'd say it to a colleague. The Assistant searches the whole library, picks the workflow
        or signal that fits, and hands you something specific enough to set up today, in the tools your team already uses.
      </p>

      <div
        ref={ref}
        className="relative mt-8 overflow-hidden rounded-2xl px-4 pb-5 pt-6 text-left sm:px-8"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(160deg, #7DACC0 0%, #447C93 55%, #2B6178 100%)',
          backgroundSize: '28px 28px, 28px 28px, cover',
        }}
      >
        <div className="mx-auto max-w-[420px] rounded-xl border border-white/25 bg-white/10 p-5 backdrop-blur-sm">
          <div className="font-display text-[18px] font-bold text-white" aria-live="polite">
            {finished ? 'Answer ready' : 'Building the answer…'}
          </div>
          <ol className="mt-3 space-y-2.5">
            {steps.map((s, i) => {
              const on = i < done;
              return (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full transition-colors duration-300',
                      on ? 'bg-white text-ac-coral-dark' : 'border border-white/40 text-transparent',
                    )}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-[13.5px] transition-colors duration-300',
                      on ? 'text-white' : 'text-white/55',
                    )}
                  >
                    {s.label}
                  </span>
                  <span className={cn('font-mono text-[10px] uppercase tracking-[0.1em]', on ? 'text-white/85' : 'text-white/40')}>
                    {s.meta}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SOURCE_CHIPS.map(({ kind, icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[12px] text-ac-dark shadow-card"
            >
              <Icon size={12} className="text-ac-coral-dark" />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ac-med-gray">{kind}</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ac-dark-secondary">
        Try it below <ArrowRight size={12} className="rotate-90" />
      </div>
    </section>
  );
}
