import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Download, Loader2, RefreshCw, X } from 'lucide-react';
import { SectionHero } from '../components/SectionHero';
import { SkillInstallSteps } from '../components/SkillInstallSteps';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { cn } from '../lib/cn';
import { recordAssistantEvent, skillBuilderRequest } from '../lib/assistant';
import { downloadSkill } from '../lib/skillPackage';

const STORAGE_KEY = 'backstory.skillBuilder';
const AUDIENCES = ['Rep', 'Sales manager', 'Sales leader', 'AM / CSM', 'RevOps'];
const STEPS = [
  { id: 'describe', label: 'Your use case' },
  { id: 'fit', label: 'Fit check' },
  { id: 'skill', label: 'Your skill' },
];

const STARTERS = [
  { label: 'Call prep', audience: 'Rep', text: 'Before a customer call, give me a one-page brief: what happened in the last 30 days, who is engaged, open risks, and what to ask.' },
  { label: 'Deal review', audience: 'Sales manager', text: 'For one deal, show me the risks, the next steps and who owns them, who we are talking to, and what is missing from the scorecard.' },
  { label: '1:1 prep', audience: 'Sales manager', text: 'Before a 1:1, list a rep\'s deals closing this quarter, then go through the risks and next steps on the ones I pick.' },
  { label: 'Follow-up email', audience: 'Rep', text: 'After a customer meeting, draft a follow-up email from the next steps Backstory captured, and flag any with no owner or date.' },
  { label: 'Account takeover', audience: 'AM / CSM', text: 'I just took over an account. Give me the history, who matters on their side, and what we have committed to.' },
  { label: 'Find a precedent', audience: 'Rep', text: 'When a deal hits a specific problem, find similar past deals and show what the seller did and how it turned out.' },
];

const FIT = {
  strong: { label: 'Good fit', className: 'bg-ac-success/10 text-ac-success' },
  partial: { label: 'Works with limits', className: 'bg-ac-warning/15 text-ac-warning' },
  not_supported: { label: 'Not possible today', className: 'bg-ac-coral/10 text-ac-coral-dark' },
};

const EMPTY = { step: 'describe', useCase: '', audience: '', tried: '', scope: null, answers: {}, skill: null };

const fieldClass = 'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2.5 text-[14px] leading-6 text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-white';
const labelClass = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-dark-secondary';
const eyebrowClass = 'mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray';

function loadSaved() {
  try {
    return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return EMPTY;
  }
}

// A missing or timed-out endpoint rejects with a raw path or a fetch error, which
// means nothing to the person using the page. Server-written messages pass through.
function friendlyError(error) {
  const message = error?.message || '';
  if (!message || message.startsWith('/api/') || error instanceof TypeError) {
    return 'The Skill Builder could not respond. Please try again.';
  }
  return message;
}

function Stepper({ current }) {
  const index = STEPS.findIndex((step) => step.id === current);
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Progress">
      {STEPS.map((step, i) => (
        <li key={step.id} aria-current={i === index ? 'step' : undefined} className="flex items-center gap-2">
          <span className={cn('grid h-6 w-6 place-items-center rounded-md font-mono text-[11px] font-bold', i < index ? 'bg-ac-coral/15 text-ac-coral-dark' : i === index ? 'bg-ac-coral text-white' : 'bg-ac-cream text-ac-med-gray')}>
            {i < index ? <Check size={13} /> : i + 1}
          </span>
          <span className={cn('font-mono text-[12px] font-medium uppercase tracking-[0.08em]', i === index ? 'text-ac-dark' : 'text-ac-med-gray')}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-ac-coral/10 px-3 py-2 text-[13px] leading-5 text-ac-coral-dark">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {message}
    </p>
  );
}

function Busy({ children }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-[13px] text-ac-dark-secondary">
      <Loader2 size={15} className="animate-spin text-ac-coral" /> {children}
    </span>
  );
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-left text-[13px] transition-colors',
        selected ? 'border-ac-coral bg-ac-coral/10 text-ac-coral-dark' : 'border-ac-light-gray bg-white text-ac-dark-secondary hover:border-ac-coral',
      )}
    >
      {children}
    </button>
  );
}

function ToolChips({ tools }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((tool) => (
        <code key={tool} className="rounded-md bg-ac-cream px-2 py-0.5 font-mono text-[11.5px] text-ac-dark-secondary">{tool}</code>
      ))}
    </div>
  );
}

function DescribeStep({ state, update, busy, error, onSubmit }) {
  const ready = state.useCase.trim().length >= 12;
  return (
    <form
      className="surface-card max-w-3xl p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) onSubmit();
      }}
    >
      <label htmlFor="skill-use-case" className="font-display text-[18px] font-bold text-ac-dark">
        What do you want Claude to do with Backstory?
      </label>
      <p className="mt-1 text-[14px] leading-6 text-ac-dark-secondary">Describe the job in your own words. Say who reads the result and what they do next.</p>
      <textarea
        id="skill-use-case"
        rows={4}
        maxLength={2000}
        className={cn(fieldClass, 'mt-3')}
        value={state.useCase}
        onChange={(event) => update({ useCase: event.target.value })}
        placeholder="Before my weekly pipeline call, I want…"
      />

      <div className="mt-3">
        <div className={cn(labelClass, 'mb-1.5')}>Or start from one of these</div>
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((starter) => (
            <Chip key={starter.label} selected={state.useCase === starter.text} onClick={() => update({ useCase: starter.text, audience: starter.audience })}>
              {starter.label}
            </Chip>
          ))}
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className={cn(labelClass, 'mb-1.5')}>Who will use it? <span className="font-normal text-ac-med-gray">Optional</span></legend>
        <div className="flex flex-wrap gap-1.5">
          {AUDIENCES.map((audience) => (
            <Chip key={audience} selected={state.audience === audience} onClick={() => update({ audience: state.audience === audience ? '' : audience })}>
              {audience}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label htmlFor="skill-tried" className={cn(labelClass, 'mt-5 block')}>What happened when you tried it? <span className="font-normal text-ac-med-gray">Optional</span></label>
      <textarea
        id="skill-tried"
        rows={2}
        maxLength={4000}
        className={cn(fieldClass, 'mt-1.5')}
        value={state.tried}
        onChange={(event) => update({ tried: event.target.value })}
        placeholder="It gave me something different each time, or missed the deals I meant…"
      />

      <p className="mt-4 text-[12.5px] leading-5 text-ac-med-gray">
        What you type goes to our AI provider to build the skill, and this site doesn't store it. Leave out customer names and anything confidential.
      </p>
      <ErrorNote message={error} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!ready || busy}>Check it against Backstory <ArrowRight size={15} /></Button>
        {busy && <Busy>Checking what Backstory can do here…</Busy>}
      </div>
    </form>
  );
}

function FitStep({ state, update, busy, error, onBuild, onBack, onUseAlternative }) {
  const { scope, answers } = state;
  const fit = FIT[scope.fit] || FIT.partial;
  const buildable = scope.fit !== 'not_supported';
  const setAnswer = (index, value) => update({ answers: { ...answers, [index]: value } });
  return (
    <div className="surface-card max-w-3xl p-6">
      <span className={cn('inline-block rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em]', fit.className)}>{fit.label}</span>
      <p className="mt-3 font-display text-[18px] font-bold leading-snug text-ac-dark">{scope.verdict}</p>

      {scope.whyItFailed && (
        <section className="mt-4 rounded-lg bg-ac-cream p-4">
          <h2 className={eyebrowClass}>Why that happened</h2>
          <p className="text-[14px] leading-6 text-ac-dark">{scope.whyItFailed}</p>
        </section>
      )}

      {scope.plan.length > 0 && (
        <section className="mt-5">
          <h2 className={eyebrowClass}>What your skill will do</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-6 text-ac-dark-secondary">
            {scope.plan.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>
      )}

      {scope.stopsAt.length > 0 && (
        <section className="mt-5">
          <h2 className={eyebrowClass}>Where it stops</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-6 text-ac-dark-secondary">
            {scope.stopsAt.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}

      {scope.tools.length > 0 && (
        <section className="mt-5">
          <h2 className={eyebrowClass}>Backstory tools it will use</h2>
          <ToolChips tools={scope.tools} />
        </section>
      )}

      {scope.questions.length > 0 && (
        <section className="mt-6 border-t border-ac-light-gray pt-5">
          <h2 className="font-display text-[15px] font-bold text-ac-dark">A few quick choices</h2>
          <p className="mt-0.5 text-[13px] text-ac-dark-secondary">Skip any you don't mind. The skill will use a sensible default.</p>
          <div className="mt-3 space-y-4">
            {scope.questions.map((item, index) => (
              <fieldset key={item.question}>
                <legend className="mb-1.5 text-[14px] font-medium text-ac-dark">{item.question}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {item.options.map((option) => (
                    <Chip key={option} selected={answers[index] === option} onClick={() => setAnswer(index, answers[index] === option ? '' : option)}>{option}</Chip>
                  ))}
                </div>
                <input
                  aria-label={`Your own answer: ${item.question}`}
                  maxLength={500}
                  className={cn(fieldClass, 'mt-2 py-1.5 text-[13px]')}
                  value={item.options.includes(answers[index]) ? '' : answers[index] || ''}
                  onChange={(event) => setAnswer(index, event.target.value)}
                  placeholder="Or type your own"
                />
              </fieldset>
            ))}
          </div>
        </section>
      )}

      {scope.alternative && (
        <section className="mt-5 rounded-lg bg-ac-cream p-4">
          <h2 className={eyebrowClass}>The closest thing that works</h2>
          <p className="text-[14px] leading-6 text-ac-dark">{scope.alternative}</p>
          <Button className="mt-3" size="sm" disabled={busy} onClick={onUseAlternative}>Use this instead <ArrowRight size={14} /></Button>
        </section>
      )}

      <ErrorNote message={error} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {buildable && <Button disabled={busy} onClick={onBuild}>Build my skill <ArrowRight size={15} /></Button>}
        <Button variant="secondary" disabled={busy} onClick={onBack}><ArrowLeft size={15} /> Edit use case</Button>
        {busy && <Busy>{buildable ? 'Writing your skill. This can take up to a minute…' : 'Checking the new use case…'}</Busy>}
      </div>
    </div>
  );
}

function SkillStep({ state, busy, error, onRefine, onRebuild, onReset }) {
  const { skill } = state;
  const [change, setChange] = useState('');
  const { valid, errors, checks } = skill.validation;
  const blockedTitle = valid ? undefined : 'Fix the failed checks before using this skill';
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <div className="surface-card p-6">
          <h2 className="break-words font-display text-[20px] font-bold text-ac-dark">{skill.name}</h2>
          <p className="mt-1.5 text-[14px] leading-6 text-ac-dark-secondary">{skill.summary}</p>
          {valid ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => { downloadSkill(skill); recordAssistantEvent('skill_builder_download', { toolCount: skill.tools.length }); }}>
                <Download size={15} /> Download ZIP
              </Button>
              <CopyButton text={skill.skillMd} label="Copy SKILL.md" />
            </div>
          ) : (
            <div role="alert" className="mt-4 rounded-lg bg-ac-coral/10 p-3 text-[13.5px] leading-6 text-ac-coral-dark" title={blockedTitle}>
              <p className="font-semibold">This draft isn't ready to install, so the download is off.</p>
              <ul className="mt-1 list-disc pl-5">{errors.map((item) => <li key={item}>{item}</li>)}</ul>
              <Button className="mt-3" size="sm" disabled={busy} onClick={onRebuild}><RefreshCw size={14} /> Try again</Button>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-wf-border">
          <div className="bg-[#1c262c] px-3.5 py-2 font-mono text-[12px] font-semibold text-[#9fb4bd]">{skill.name}/SKILL.md</div>
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-words bg-wf-bg p-4 font-mono text-[12.5px] leading-6 text-wf-text lg:max-h-none"><code>{skill.skillMd}</code></pre>
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <section className="surface-card p-5">
          <h2 className={eyebrowClass}>Add it to Claude</h2>
          <SkillInstallSteps name={skill.name} tryIt="Start a new chat and try a prompt below." />
        </section>

        {skill.testPrompts.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Try it</h2>
            <ul className="space-y-2.5">
              {skill.testPrompts.map((prompt) => (
                <li key={prompt} className="rounded-lg bg-ac-cream p-3">
                  <p className="text-[13.5px] leading-5 text-ac-dark">{prompt}</p>
                  <CopyButton className="mt-2" text={prompt} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {skill.limits.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Check when you read the output</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-ac-dark-secondary">
              {skill.limits.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        )}

        <section className="surface-card p-5">
          <h2 className={eyebrowClass}>Checks</h2>
          <ul className="space-y-1.5 text-[13px] leading-5 text-ac-dark-secondary">
            {checks.map((item) => (
              <li key={item.name} className="flex items-start gap-2">
                {item.passed ? <Check size={14} className="mt-0.5 shrink-0 text-ac-success" /> : <X size={14} className="mt-0.5 shrink-0 text-ac-coral-dark" />}
                <span><strong className="font-medium text-ac-dark">{item.name}.</strong> {item.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-5 text-ac-med-gray">These check the skill's format and tool use. They don't run it against your data, so try it before you share it.</p>
        </section>

        <form
          className="surface-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (change.trim() && !busy) onRefine(change.trim(), () => setChange(''));
          }}
        >
          <label htmlFor="skill-change" className={cn(eyebrowClass, 'block')}>Change something</label>
          <textarea
            id="skill-change"
            rows={3}
            maxLength={1000}
            className={fieldClass}
            value={change}
            onChange={(event) => setChange(event.target.value)}
            placeholder="Make the brief shorter, add a section for… or paste what went wrong when you tried it."
          />
          <ErrorNote message={error} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={!change.trim() || busy}>Update my skill</Button>
            {busy ? <Busy>Updating…</Busy> : <Button type="button" variant="ghost" size="sm" onClick={onReset}>Start over</Button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export function SkillBuilder() {
  const [state, setState] = useState(loadSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (patch) => setState((current) => ({ ...current, ...patch }));

  // Survives a trip to the connect guide and back, since a built skill costs a minute to redo.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* the builder still works for this page view */
    }
  }, [state]);

  // Each step is a new page's worth of content, and the button that opened it
  // sits at the bottom of the last one. Skip the first render so arriving here
  // doesn't jump past the hero.
  const stepsRef = useRef(null);
  const firstStep = useRef(state.step);
  useEffect(() => {
    if (firstStep.current === state.step) return;
    firstStep.current = null;
    stepsRef.current?.scrollIntoView({ block: 'start' });
    stepsRef.current?.focus({ preventScroll: true });
  }, [state.step]);

  async function run(payload, onResult) {
    setBusy(true);
    setError('');
    try {
      onResult(await skillBuilderRequest(payload));
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const base = (useCase = state.useCase) => ({ useCase, audience: state.audience || undefined, tried: state.tried || undefined });
  const answerList = () => (state.scope?.questions || []).map((item, index) => ({ question: item.question, answer: state.answers[index] || '' }));

  function checkFit(useCase = state.useCase) {
    return run({ stage: 'scope', ...base(useCase) }, (scope) => {
      update({ useCase, scope, answers: {}, step: 'fit' });
      recordAssistantEvent('skill_builder_scope', { fit: scope.fit });
    });
  }

  function acceptSkill(skill) {
    update({ skill, step: 'skill' });
    recordAssistantEvent('skill_builder_generate', { valid: skill.validation.valid, toolCount: skill.tools.length });
  }

  const build = () => run({ stage: 'generate', ...base(), answers: answerList() }, acceptSkill);

  const refine = (change, onDone) => {
    const { name, description, body } = state.skill;
    return run({ stage: 'generate', ...base(), answers: answerList(), previous: { name, description, body }, change }, (skill) => {
      acceptSkill(skill);
      onDone();
    });
  };

  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Skill Builder"
        title="Build a Claude Skill for your use case"
        subtitle="Describe the job you're trying to do with Backstory. You'll get a skill that already knows how the tools behave and where they stop, ready to add to Claude."
        image="meeting-bg-05.jpg"
      />
      <div ref={stepsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
        <Stepper current={state.step} />
      </div>

      {state.step === 'describe' && <DescribeStep state={state} update={update} busy={busy} error={error} onSubmit={() => checkFit()} />}
      {state.step === 'fit' && state.scope && (
        <FitStep
          state={state}
          update={update}
          busy={busy}
          error={error}
          onBuild={build}
          onBack={() => { setError(''); update({ step: 'describe' }); }}
          onUseAlternative={() => checkFit(state.scope.alternative)}
        />
      )}
      {state.step === 'skill' && state.skill && (
        <SkillStep
          key={state.skill.skillMd}
          state={state}
          busy={busy}
          error={error}
          onRefine={refine}
          onRebuild={build}
          onReset={() => { setError(''); setState(EMPTY); }}
        />
      )}
    </div>
  );
}
