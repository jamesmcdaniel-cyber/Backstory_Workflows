// web/src/components/home/HomeIntro.jsx
// The front door's context, shown above the Assistant composer before the
// first message: a hero that says what the library is and why to use it, then
// an "Ask any question" explainer that shows what goes into an answer, so a
// first-time visitor knows what to ask before they reach the composer.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, BookOpen, Check, Code2, FileText, Info, Plug, Sparkles, Workflow } from 'lucide-react';
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

    </section>
  );
}

// Cards under the Assistant that lead to the rest of the site, for visitors
// who would rather browse than ask. Add Skill Builder here once it ships.
function exploreCards({ workflowCount, signalCount }) {
  return [
    {
      to: '/flows',
      icon: Workflow,
      eyebrow: 'Auto flows',
      title: 'Put a recurring task on autopilot',
      description: 'Scheduled workflows for n8n, Zapier, Workato, or a Claude, ChatGPT or Gemini project: digests, meeting briefs, risk alerts.',
      stat: `${workflowCount ?? 38} workflows`,
    },
    {
      to: '/signals',
      icon: Sparkles,
      eyebrow: 'Signals',
      title: 'Give your AI tool a sales skill',
      description: 'Packaged skills a person runs on demand: account plans, QBR prep, MEDDPICC, relationship maps.',
      stat: `${signalCount ?? 30} signals`,
    },
    {
      to: '/mcp',
      icon: Plug,
      eyebrow: 'MCP capabilities',
      title: 'See what Backstory can look up',
      description: 'The Backstory MCP tools every workflow and signal calls, what each returns, and its limits.',
      stat: `${MCP_TOOLS.length} tools`,
    },
    {
      to: '/guides',
      icon: BookOpen,
      eyebrow: 'Setup guides',
      title: 'Connect it to your stack',
      description: 'Step-by-step setup for Slack, Teams, email, Google Chat, and the Backstory MCP.',
      stat: 'Guides',
    },
    {
      to: '/api-docs',
      icon: Code2,
      eyebrow: 'API docs',
      title: 'Build on the Backstory API',
      description: 'Authentication, endpoints, pagination, and the data model for custom integrations.',
      stat: 'Reference',
    },
    {
      to: '/about',
      icon: Info,
      eyebrow: 'About',
      title: 'How the library is put together',
      description: 'What the library is, how workflows are packaged, and how to choose the right one.',
      stat: 'Overview',
    },
  ];
}

export function ExploreLibrary({ workflowCount, signalCount }) {
  const cards = exploreCards({ workflowCount, signalCount });
  return (
    <section aria-labelledby="explore-library" className="border-t border-ac-light-gray pt-12">
      <div className="text-center">
        <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ac-coral-dark">
          Explore the library
        </div>
        <h2
          id="explore-library"
          className="mt-2 font-display text-[clamp(22px,3vw,28px)] font-bold tracking-[-0.01em] text-ac-dark"
        >
          Rather browse? Go straight to what you need.
        </h2>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ to, icon: Icon, eyebrow, title, description, stat }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col rounded-xl border border-ac-light-gray bg-ac-card p-6 shadow-card no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-ac-coral hover:shadow-cardhover"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ac-horizon-50 text-ac-coral-dark">
                <Icon size={17} />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ac-med-gray">{stat}</span>
            </div>
            <div className="mt-4 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-ac-coral-dark">
              {eyebrow}
            </div>
            <h3 className="mt-1.5 font-display text-[16px] font-bold leading-snug tracking-[-0.01em] text-ac-dark">
              {title}
            </h3>
            <p className="mt-2 flex-1 text-[13.5px] leading-6 text-ac-dark-secondary">{description}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-coral-dark">
              Explore
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
