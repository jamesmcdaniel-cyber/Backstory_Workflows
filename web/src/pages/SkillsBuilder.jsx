import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Download, FileText, Loader2, Lock, RefreshCw, X } from 'lucide-react';
import { SectionHero } from '../components/SectionHero';
import { ChatGptInstallSteps, PluginInstallSteps } from '../components/PluginInstallSteps';
import { BuildProgress } from '../components/BuildProgress';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { cn } from '../lib/cn';
import { pluginBuilderRequest, recordAssistantEvent } from '../lib/assistant';
import { BRIEF_KIT, PLATFORMS, PLATFORM_LABEL, pluginPaths, pluginScripts, skillMdPath, validatePlugin } from '../lib/pluginFormat';
import { allPluginFiles, downloadPlugin } from '../lib/pluginPackage';
import { runScriptTests, warmPython } from '../lib/scriptTests';

// One saved session per platform, so switching tabs never loses a build.
const storageKey = (platform) => (platform === 'claude' ? 'backstory.pluginBuilder' : `backstory.pluginBuilder.${platform}`);
// Rounds of model repair for a script whose tests fail, before the page gives up.
const MAX_FIXES = 2;
const TESTING = new Set(['waiting', 'running', 'fixing']);
const AUDIENCES = ['Rep', 'Sales manager', 'Sales leader', 'AM / CSM', 'RevOps'];
const CADENCES = [
  { value: 'on_request', label: 'When someone asks' },
  { value: 'daily', label: 'Every weekday' },
  { value: 'weekly', label: 'Every week' },
];
const CADENCE_LABEL = { on_request: 'On request', daily: 'Daily', weekly: 'Weekly' };
const OUTPUT_LABEL = { chat: 'Answers in chat', brief: 'Publishes a page' };
// What a build makes: a Claude plugin, or a ChatGPT skill (never a ChatGPT plugin).
const NOUN = { claude: 'plugin', chatgpt: 'skill' };
const steps = (platform) => [
  { id: 'describe', label: 'Your use case' },
  { id: 'fit', label: 'Fit check' },
  { id: 'plugin', label: `Your ${NOUN[platform]}` },
];

const STARTERS = [
  { label: 'Renewal risk brief', audience: 'Sales leader', cadence: 'weekly', text: 'Every Monday, review every renewal due in the next 120 days, rate how at risk each one is and why, with dated evidence, and suggest where a leader should step in this week. Publish one page leaders can filter by region.' },
  { label: 'Weekly pipeline review', audience: 'Sales manager', cadence: 'weekly', text: 'Each week, review my team\'s open deals closing this quarter, flag the ones that have gone quiet or have no decision-maker engaged, and give me questions to ask each rep in their 1:1.' },
  { label: 'Exec sponsor tracker', audience: 'Sales leader', cadence: 'weekly', text: 'For our largest accounts, check whether an executive on their side has engaged with us recently, and flag the ones that need an exec-to-exec touch, with who should reach out.' },
  { label: 'Deal hygiene audit', audience: 'RevOps', cadence: 'weekly', text: 'Check open opportunities closing in the next 60 days for missing next steps, single-threaded deals and no recent two-way contact, and list what each owner should fix.' },
  { label: 'QBR prep', audience: 'AM / CSM', cadence: 'on_request', text: 'When I name an account, build a QBR prep pack: what happened recently, who is engaged on their side, open risks and commitments, and a proposed agenda.' },
  { label: 'Call prep', audience: 'Rep', cadence: 'on_request', text: 'Before a customer call, give me a one-page brief: what happened recently, who is engaged, open risks, and what to ask.' },
];

const FIT = {
  strong: { label: 'Good fit', className: 'bg-ac-success/10 text-ac-success' },
  partial: { label: 'Works with limits', className: 'bg-ac-warning/15 text-ac-warning' },
  not_supported: { label: 'Not possible today', className: 'bg-ac-coral/10 text-ac-coral-dark' },
};

const EMPTY = { step: 'describe', useCase: '', audience: '', cadence: '', tried: '', setup: '', scope: null, answers: {}, plugin: null, fileStatus: {}, timing: {} };

const fieldClass = 'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2.5 text-[14px] leading-6 text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-white';
const labelClass = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-dark-secondary';
const eyebrowClass = 'mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray';

function loadSaved(platform) {
  try {
    const saved = { ...EMPTY, ...JSON.parse(sessionStorage.getItem(storageKey(platform)) || '{}') };
    // A reload stops any file still being written; offer a retry instead of a spinner forever.
    const fileStatus = Object.fromEntries(Object.entries(saved.fileStatus || {}).map(([path, status]) => [path, status === 'writing' ? 'error' : status]));
    // Tests stopped by a reload are reported as not run, with a button to run them again.
    const tests = saved.plugin?.tests && Object.fromEntries(Object.entries(saved.plugin.tests).map(([name, test]) => [name, TESTING.has(test.status) ? { ...test, status: 'stopped' } : test]));
    return { ...saved, fileStatus, plugin: saved.plugin && { ...saved.plugin, tests } };
  } catch {
    return EMPTY;
  }
}

// A missing or timed-out endpoint rejects with a raw path or a fetch error, which
// means nothing to the person using the page. Server-written messages pass through.
function friendlyError(error) {
  const message = error?.message || '';
  if (!message || message.startsWith('/api/') || error instanceof TypeError) {
    return 'The Skills Builder could not respond. Please try again.';
  }
  return message;
}

// The blueprint without the written files: what the server needs to write one file.
function blueprintOf(plugin) {
  const { files, tests, ...blueprint } = plugin;
  return blueprint;
}

function Stepper({ current, platform }) {
  const STEPS = steps(platform);
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

function DescribeStep({ platform, state, update, busy, error, onSubmit }) {
  const ready = state.useCase.trim().length >= 12;
  return (
    <form
      className="surface-card p-6 lg:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (ready && !busy) onSubmit();
      }}
    >
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0">
      <label htmlFor={`plugin-use-case-${platform}`} className="font-display text-[18px] font-bold text-ac-dark">
        What job should the {NOUN[platform]} do with Backstory?
      </label>
      <p className="mt-1 text-[14px] leading-6 text-ac-dark-secondary">Describe it in your own words: what it reviews, what it decides, who reads the result and what they do next.</p>
      <textarea
        id={`plugin-use-case-${platform}`}
        rows={7}
        maxLength={2000}
        className={cn(fieldClass, 'mt-3')}
        value={state.useCase}
        onChange={(event) => update({ useCase: event.target.value })}
        placeholder="Every Monday, review… and tell our leaders…"
      />

      <div className="mt-3">
        <div className={cn(labelClass, 'mb-1.5')}>Or start from one of these</div>
        <div className="flex flex-wrap gap-1.5">
          {STARTERS.map((starter) => (
            <Chip key={starter.label} selected={state.useCase === starter.text} onClick={() => update({ useCase: starter.text, audience: starter.audience, cadence: starter.cadence })}>
              {starter.label}
            </Chip>
          ))}
        </div>
      </div>

      </div>

      <div className="min-w-0 space-y-5 lg:border-l lg:border-ac-light-gray lg:pl-10">
        <fieldset>
          <legend className={cn(labelClass, 'mb-1.5')}>Who reads the result? <span className="font-normal text-ac-med-gray">Optional</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map((audience) => (
              <Chip key={audience} selected={state.audience === audience} onClick={() => update({ audience: state.audience === audience ? '' : audience })}>
                {audience}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className={cn(labelClass, 'mb-1.5')}>How often should it run? <span className="font-normal text-ac-med-gray">Optional</span></legend>
          <div className="flex flex-wrap gap-1.5">
            {CADENCES.map((cadence) => (
              <Chip key={cadence.value} selected={state.cadence === cadence.value} onClick={() => update({ cadence: state.cadence === cadence.value ? '' : cadence.value })}>
                {cadence.label}
              </Chip>
            ))}
          </div>
        </fieldset>

      <div>
      <label htmlFor={`plugin-setup-${platform}`} className={cn(labelClass, 'block')}>Your setup <span className="font-normal text-ac-med-gray">Optional</span></label>
      <textarea
        id={`plugin-setup-${platform}`}
        rows={3}
        maxLength={3000}
        className={cn(fieldClass, 'mt-1.5')}
        value={state.setup}
        onChange={(event) => update({ setup: event.target.value })}
        placeholder="Company name, Salesforce fields synced into Backstory (Region__c, Tier__c…), regions or teams, thresholds you already use…"
      />
      </div>

      <div>
      <label htmlFor={`plugin-tried-${platform}`} className={cn(labelClass, 'block')}>What happened when you tried it? <span className="font-normal text-ac-med-gray">Optional</span></label>
      <textarea
        id={`plugin-tried-${platform}`}
        rows={2}
        maxLength={4000}
        className={cn(fieldClass, 'mt-1.5')}
        value={state.tried}
        onChange={(event) => update({ tried: event.target.value })}
        placeholder="It gave me something different each time, or missed the deals I meant…"
      />
      </div>
      </div>
      </div>

      <p className="mt-6 text-[12.5px] leading-5 text-ac-med-gray">
        What you type goes to our AI provider to build the {NOUN[platform]}, and this site doesn't store it. Leave out customer names and anything confidential.
      </p>
      <ErrorNote message={error} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!ready || busy}>Check it against Backstory <ArrowRight size={15} /></Button>
        {busy && <Busy>Checking what Backstory can do here…</Busy>}
      </div>
    </form>
  );
}

function FitStep({ platform, state, update, busy, error, onBuild, onBack, onUseAlternative }) {
  const noun = NOUN[platform];
  const { scope, answers } = state;
  const fit = FIT[scope.fit] || FIT.partial;
  const buildable = scope.fit !== 'not_supported';
  const setAnswer = (index, value) => update({ answers: { ...answers, [index]: value } });
  return (
    <div className="surface-card p-6 lg:p-8">
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
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
          <h2 className={eyebrowClass}>What each run will do</h2>
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

      </div>

      <div className="min-w-0 lg:border-l lg:border-ac-light-gray lg:pl-10">
      {scope.questions.length > 0 && (
        <section className="border-t border-ac-light-gray pt-5 lg:border-t-0 lg:pt-0">
          <h2 className="font-display text-[15px] font-bold text-ac-dark">A few quick choices</h2>
          <p className="mt-0.5 text-[13px] text-ac-dark-secondary">Skip any you don't mind. The {noun} will use a sensible default, which you can change later in its settings.</p>
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
        <section className="rounded-lg bg-ac-cream p-4">
          <h2 className={eyebrowClass}>The closest thing that works</h2>
          <p className="text-[14px] leading-6 text-ac-dark">{scope.alternative}</p>
          <Button className="mt-3" size="sm" disabled={busy} onClick={onUseAlternative}>Use this instead <ArrowRight size={14} /></Button>
        </section>
      )}
      {!scope.questions.length && !scope.alternative && buildable && (
        <p className="text-[14px] leading-6 text-ac-dark-secondary">Nothing to decide here: the {noun} starts from sensible defaults, and you can change them later in its settings or with "Change something".</p>
      )}
      </div>
      </div>

      <ErrorNote message={error} />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {buildable && <Button disabled={busy} onClick={onBuild}>Build my {noun} <ArrowRight size={15} /></Button>}
        <Button variant="secondary" disabled={busy} onClick={onBack}><ArrowLeft size={15} /> Edit use case</Button>
        {busy && !(buildable && state.timing?.phase === 'design') && <Busy>{buildable ? `Designing your ${noun}…` : 'Checking the new use case…'}</Busy>}
      </div>
      {busy && buildable && state.timing?.phase === 'design' && <BuildProgress noun={noun} timing={state.timing} className="mt-5" />}
    </div>
  );
}

function StatusIcon({ status }) {
  if (status === 'done') return <Check size={14} className="shrink-0 text-ac-success" />;
  if (status === 'error') return <X size={14} className="shrink-0 text-ac-coral-dark" />;
  if (status === 'kit') return <Lock size={13} className="shrink-0 text-ac-med-gray" />;
  return <Loader2 size={14} className="shrink-0 animate-spin text-ac-coral" />;
}

const TEST_LABEL = {
  waiting: 'Waiting to test',
  running: 'Running its tests in Python',
  fixing: 'Tests failed; fixing',
  passed: 'Tests passed',
  failed: 'Tests failed',
  stopped: 'Tests not run',
};

function testIcon(status) {
  if (status === 'passed') return 'done';
  if (status === 'failed' || status === 'stopped') return 'error';
  return 'writing';
}

function ScriptTestList({ plugin }) {
  const scripts = pluginScripts(plugin);
  if (!scripts.length) return null;
  return (
    <ul className="space-y-1.5 text-[13.5px] leading-5">
      {scripts.map((item) => {
        const test = plugin.tests?.[item.name] || { status: 'stopped' };
        return (
          <li key={item.name} className="flex items-center gap-2">
            <StatusIcon status={testIcon(test.status)} />
            <code className="font-mono text-[12.5px] text-ac-dark">{item.script}</code>
            <span className="min-w-0 truncate text-ac-med-gray">
              {TEST_LABEL[test.status]}
              {test.status === 'passed' && ` (${test.testsRun})`}
              {test.attempts > 0 && ` · ${test.attempts} fix${test.attempts === 1 ? '' : 'es'}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Progress({ noun, plugin, fileStatus, timing, onRetry, testing }) {
  return (
    <section className="mt-4 rounded-lg bg-ac-cream p-4">
      <BuildProgress noun={noun} plugin={plugin} fileStatus={fileStatus} timing={timing} className="mb-4" />
      <h2 className={eyebrowClass}>{testing && !plugin.plan.some((item) => fileStatus[item.path] === 'writing') ? `Testing your ${noun}'s scripts` : `Writing your ${noun}`}</h2>
      <ul className="space-y-1.5 text-[13.5px] leading-5">
        {plugin.plan.map((item) => (
          <li key={item.path} className="flex items-center gap-2">
            <StatusIcon status={fileStatus[item.path]} />
            <code className="font-mono text-[12.5px] text-ac-dark">{item.path}</code>
            <span className="min-w-0 truncate text-ac-med-gray">{item.purpose}</span>
            {fileStatus[item.path] === 'error' && (
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => onRetry(item.path)}><RefreshCw size={13} /> Retry</Button>
            )}
          </li>
        ))}
        {plugin.output === 'brief' && (
          <li className="flex items-center gap-2 text-ac-dark-secondary">
            <StatusIcon status="kit" /> Page kit: {BRIEF_KIT.length} tested files, shipped as is
          </li>
        )}
      </ul>
      {pluginScripts(plugin).length > 0 && (
        <div className="mt-3 border-t border-ac-light-gray pt-3">
          <ScriptTestList plugin={plugin} />
        </div>
      )}
      {pluginScripts(plugin).length > 0 && (
        <p className="mt-3 text-[12.5px] text-ac-med-gray">Each script runs its tests in Python in your browser. The first run downloads Python (about 10 MB).</p>
      )}
    </section>
  );
}

function FileBrowser({ plugin, files, fileStatus }) {
  const paths = pluginPaths(plugin);
  const skillMd = skillMdPath(plugin);
  const [selected, setSelected] = useState(skillMd);
  const current = paths.includes(selected) ? selected : skillMd;
  const kitPaths = new Set(BRIEF_KIT.map((item) => `skills/${plugin.name}/${item.path}`));
  const writing = (path) => {
    const relative = path.replace(`skills/${plugin.name}/`, '');
    return fileStatus[relative] && fileStatus[relative] !== 'done';
  };
  const content = files[current] || '';
  return (
    <div className="overflow-hidden rounded-xl border border-wf-border lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <nav aria-label="Files" className="border-b border-wf-border bg-[#1c262c] p-2 lg:border-b-0 lg:border-r">
        <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
          {paths.map((path) => (
            <li key={path} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(path)}
                aria-current={path === current ? 'true' : undefined}
                className={cn('flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono text-[11.5px] transition-colors', path === current ? 'bg-white/10 text-white' : 'text-[#9fb4bd] hover:text-white')}
              >
                {kitPaths.has(path) ? <Lock size={11} className="shrink-0 opacity-70" /> : <FileText size={11} className="shrink-0 opacity-70" />}
                <span className="truncate" title={path}>{path.replace(`skills/${plugin.name}/`, '')}</span>
                {writing(path) && <Loader2 size={11} className="ml-auto shrink-0 animate-spin" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 bg-[#1c262c] px-3.5 py-2 font-mono text-[12px] font-semibold text-[#9fb4bd]">
          <span className="min-w-0 truncate">{plugin.name}/{current}</span>
          {kitPaths.has(current) && <span className="shrink-0 font-normal">Shipped as is</span>}
        </div>
        <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap break-words bg-wf-bg p-4 font-mono text-[12.5px] leading-6 text-wf-text"><code>{writing(current) ? 'Writing…' : content}</code></pre>
      </div>
    </div>
  );
}

function TestsPanel({ platform, plugin, busy, onRunTests }) {
  const scripts = pluginScripts(plugin);
  if (!scripts.length) return null;
  const testing = scripts.some((item) => TESTING.has(plugin.tests?.[item.name]?.status));
  return (
    <section className="surface-card p-5">
      <h2 className={eyebrowClass}>Script tests</h2>
      <ScriptTestList plugin={plugin} />
      {scripts.map((item) => plugin.tests?.[item.name]?.output && (
        <details key={item.name} className="mt-3">
          <summary className="cursor-pointer text-[12.5px] font-medium text-ac-coral-dark">Test output: {item.name}.py</summary>
          <pre className="mt-2 max-h-[280px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-wf-bg p-3 font-mono text-[11.5px] leading-5 text-wf-text">{plugin.tests[item.name].output}</pre>
        </details>
      ))}
      <p className="mt-3 text-[12px] leading-5 text-ac-med-gray">
        The tests are written separately from each script, from the same contract, and run in Python in your browser. {platform === 'chatgpt' ? 'They run here before you download; the skill itself carries only what ChatGPT needs to do the job.' : 'They ship with the plugin, so you can run them again after any change.'}
      </p>
      {!testing && <Button className="mt-3" size="sm" variant="secondary" disabled={busy} onClick={onRunTests}><RefreshCw size={13} /> Run the tests again</Button>}
    </section>
  );
}

function PluginStep({ platform, state, busy, error, onRefine, onRetry, onRebuild, onReset, onRunTests }) {
  const chatgpt = platform === 'chatgpt';
  const host = PLATFORM_LABEL[platform];
  const { plugin, fileStatus } = state;
  const [change, setChange] = useState('');
  const testing = pluginScripts(plugin).some((item) => TESTING.has(plugin.tests?.[item.name]?.status));
  const writing = testing || plugin.plan.some((item) => fileStatus[item.path] !== 'done');
  const failed = plugin.plan.some((item) => fileStatus[item.path] === 'error');
  const files = useMemo(() => allPluginFiles(plugin), [plugin]);
  const validation = useMemo(() => (writing ? null : validatePlugin(plugin)), [plugin, writing]);
  const firstPrompt = plugin.testPrompts[0];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <div className="surface-card p-6">
          <div className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ac-dark-secondary">
            <span className="rounded-md bg-ac-cream px-2 py-0.5">v{plugin.version}</span>
            <span className="rounded-md bg-ac-cream px-2 py-0.5">{CADENCE_LABEL[plugin.cadence]}</span>
            <span className="rounded-md bg-ac-cream px-2 py-0.5">{OUTPUT_LABEL[plugin.output]}</span>
          </div>
          <h2 className="mt-3 break-words font-display text-[20px] font-bold text-ac-dark">{plugin.title}</h2>
          <p className="mt-1.5 text-[14px] leading-6 text-ac-dark-secondary">{plugin.summary}</p>
          {plugin.question && <blockquote className="mt-3 border-l-2 border-ac-coral pl-3 text-[14px] italic leading-6 text-ac-dark">{plugin.question}</blockquote>}

          {busy && state.timing?.phase === 'design' ? (
            <BuildProgress noun={NOUN[platform]} timing={state.timing} className="mt-4" />
          ) : writing ? (
            <Progress noun={NOUN[platform]} plugin={plugin} fileStatus={fileStatus} timing={state.timing} onRetry={onRetry} testing={testing} />
          ) : validation.valid ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => { downloadPlugin(plugin); recordAssistantEvent('plugin_builder_download', { fileCount: Object.keys(files).length, output: plugin.output, platform }); }}>
                <Download size={15} /> Download {chatgpt ? 'ChatGPT skill' : 'plugin'} ZIP
              </Button>
              <CopyButton text={files[skillMdPath(plugin)]} label="Copy SKILL.md" />
            </div>
          ) : (
            <div role="alert" className="mt-4 rounded-lg bg-ac-coral/10 p-3 text-[13.5px] leading-6 text-ac-coral-dark">
              <p className="font-semibold">This draft isn't ready to install, so the download is off.</p>
              <ul className="mt-1 list-disc pl-5">{validation.errors.map((item) => <li key={item}>{item}</li>)}</ul>
              <Button className="mt-3" size="sm" disabled={busy} onClick={onRebuild}><RefreshCw size={14} /> Build it again</Button>
            </div>
          )}
          {failed && !busy && <ErrorNote message="Some files couldn't be written. Retry them above." />}
        </div>

        <FileBrowser plugin={plugin} files={files} fileStatus={fileStatus} />
      </div>

      <div className="min-w-0 space-y-5">
        <section className="surface-card p-5">
          <h2 className={eyebrowClass}>Add it to {host}</h2>
          {chatgpt
            ? <ChatGptInstallSteps name={plugin.name} />
            : <PluginInstallSteps name={plugin.name} version={plugin.version} needsCode={plugin.output === 'brief'} tryIt="Start a new chat and try a prompt below." />}
        </section>

        <TestsPanel platform={platform} plugin={plugin} busy={busy || writing} onRunTests={onRunTests} />

        {plugin.testPrompts.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Try it</h2>
            <ul className="space-y-2.5">
              {plugin.testPrompts.map((prompt) => (
                <li key={prompt} className="rounded-lg bg-ac-cream p-3">
                  <p className="text-[13.5px] leading-5 text-ac-dark">{prompt}</p>
                  <CopyButton className="mt-2" text={prompt} />
                </li>
              ))}
            </ul>
            {plugin.cadence !== 'on_request' && firstPrompt && (
              <p className="mt-3 text-[12.5px] leading-5 text-ac-med-gray">
                {chatgpt
                  ? `To run it on a schedule, create a scheduled task in ChatGPT with this prompt: "${String(plugin.settings?.schedule?.promptTemplate || '')}". Run the task once by hand before you rely on it.`
                  : 'After the first good run, Claude offers to schedule it. Use "Run now" on the scheduled task once before you rely on it.'}
              </p>
            )}
          </section>
        )}

        {plugin.limits.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Check when you read the output</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-ac-dark-secondary">
              {plugin.limits.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        )}

        {validation && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Checks</h2>
            <ul className="space-y-1.5 text-[13px] leading-5 text-ac-dark-secondary">
              {validation.checks.map((item) => (
                <li key={item.name} className="flex items-start gap-2">
                  {item.passed ? <Check size={14} className="mt-0.5 shrink-0 text-ac-success" /> : <X size={14} className="mt-0.5 shrink-0 text-ac-coral-dark" />}
                  <span><strong className="font-medium text-ac-dark">{item.name}.</strong> {item.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-5 text-ac-med-gray">{chatgpt
              ? "These check the skill's format, links and tool use. They don't run it against your data, so try it on a few real runs before you share it."
              : "These check the plugin's format, links and tool use. They don't run it against your data, so judge a few runs with its rubric (evals/rubric.md) before you share it."}</p>
          </section>
        )}

        <form
          className="surface-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (change.trim() && !busy && !writing) onRefine(change.trim(), () => setChange(''));
          }}
        >
          <label htmlFor={`plugin-change-${platform}`} className={cn(eyebrowClass, 'block')}>Change something</label>
          <textarea
            id={`plugin-change-${platform}`}
            rows={3}
            maxLength={1000}
            className={fieldClass}
            value={change}
            onChange={(event) => setChange(event.target.value)}
            placeholder="Add a region filter, flag deals quiet for 21 days instead, run it on Fridays… or paste what went wrong when you tried it."
          />
          <ErrorNote message={error} />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={!change.trim() || busy || writing}>Update my {NOUN[platform]}</Button>
            {busy ? <Busy>Updating the design…</Busy> : <Button type="button" variant="ghost" size="sm" onClick={onReset}>Start over</Button>}
          </div>
        </form>
      </div>
    </div>
  );
}

function BuilderFlow({ platform }) {
  const [state, setState] = useState(() => loadSaved(platform));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (patch) => setState((current) => ({ ...current, ...patch }));

  // Survives a trip to the connect guide and back, since a built plugin costs minutes to redo.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(platform), JSON.stringify(state));
    } catch {
      /* the builder still works for this page view */
    }
  }, [state, platform]);

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
      return await onResult(await pluginBuilderRequest(payload));
    } catch (requestError) {
      setError(friendlyError(requestError));
      return null;
    } finally {
      setBusy(false);
    }
  }

  const base = (useCase = state.useCase) => ({
    platform,
    useCase,
    audience: state.audience || undefined,
    cadence: state.cadence || undefined,
    tried: state.tried || undefined,
    setup: state.setup || undefined,
    answers: (state.scope?.questions || []).map((item, index) => ({ question: item.question, answer: state.answers[index] || '' })),
  });

  function checkFit(useCase = state.useCase) {
    update({ timing: {} });
    return run({ stage: 'scope', ...base(useCase), answers: undefined }, (scope) => {
      update({ useCase, scope, answers: {}, step: 'fit' });
      recordAssistantEvent('plugin_builder_scope', { fit: scope.fit, platform });
    });
  }

  function setFile(path, patch) {
    setState((current) => {
      if (!current.plugin) return current;
      const files = 'content' in patch ? { ...current.plugin.files, [path]: patch.content } : current.plugin.files;
      const timing = patch.status === 'writing' ? { ...current.timing, fileStarted: { ...current.timing?.fileStarted, [path]: Date.now() } } : current.timing;
      return { ...current, plugin: { ...current.plugin, files }, fileStatus: { ...current.fileStatus, [path]: patch.status }, timing };
    });
  }

  // Starts the clock for a build, an update or a retry.
  const startClock = (phase) => update({ timing: { startedAt: Date.now(), phase, fileStarted: {} } });

  // One request per file, all at once; each lands as it finishes.
  // The latest state, for work that finishes after several renders (a retried file, a test run).
  const stateRef = useRef(state);
  stateRef.current = state;

  // Resolves the written content, or null when the file couldn't be written.
  // A file that fails (a timeout, a busy model) gets one more try on its own
  // before the page asks the person to retry it.
  async function writeFile(plugin, path, extra = {}) {
    setFile(path, { status: 'writing' });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await pluginBuilderRequest({ stage: 'file', ...base(), blueprint: blueprintOf(plugin), path, ...extra });
        setFile(path, { status: 'done', content: result.content });
        return result.content;
      } catch {
        /* try once more */
      }
    }
    setFile(path, { status: 'error' });
    return null;
  }

  function setTest(name, patch) {
    const stamped = patch.status === 'running' || patch.status === 'fixing' ? { ...patch, startedAt: Date.now() } : patch;
    setState((current) => (current.plugin ? {
      ...current,
      plugin: { ...current.plugin, tests: { ...current.plugin.tests, [name]: { ...current.plugin.tests?.[name], ...stamped } } },
    } : current));
  }

  // Runs one script's tests in the browser. A failure goes back to the model
  // with the test output, up to MAX_FIXES times, and the fixed file replaces
  // the old one before the tests run again.
  async function testScript(plugin, item, files) {
    let current = { ...files };
    {
      if (!current[item.script] || !current[item.test]) {
        setTest(item.name, { status: 'stopped', output: 'The script or its tests were not written. Retry them above.' });
        return;
      }
      let attempts = 0;
      for (;;) {
        setTest(item.name, { status: 'running', attempts });
        const result = await runScriptTests({
          name: item.name,
          files: { 'settings.json': JSON.stringify(plugin.settings || {}, null, 2), [item.script]: current[item.script], [item.test]: current[item.test] },
        });
        if (result.passed || attempts >= MAX_FIXES) {
          setTest(item.name, { status: result.passed ? 'passed' : 'failed', testsRun: result.testsRun, output: result.output, attempts });
          recordAssistantEvent('plugin_builder_tests', { passed: result.passed, testsRun: result.testsRun, fixes: attempts });
          break;
        }
        attempts += 1;
        setTest(item.name, { status: 'fixing', attempts, output: result.output });
        // A fix that errors (a timeout, a busy model) gets one more try before the page gives up.
        let fix = null;
        for (let request = 0; request < 2 && !fix; request += 1) {
          try {
            fix = await pluginBuilderRequest({
              stage: 'fix', ...base(), blueprint: blueprintOf(plugin), path: item.script, script: current[item.script], test: current[item.test], output: result.output,
            });
          } catch {
            /* try once more */
          }
        }
        if (!fix) {
          setTest(item.name, { status: 'failed', testsRun: result.testsRun, output: result.output, attempts });
          break;
        }
        current = { ...current, [fix.path]: fix.content };
        setFile(fix.path, { status: 'done', content: fix.content });
      }
    }
  }

  // Every script is tested at once; Python runs them one at a time, but the
  // fixes, which take the longest, overlap.
  async function testScripts(plugin, files) {
    const scripts = pluginScripts(plugin);
    scripts.forEach((item) => setTest(item.name, { status: 'waiting', attempts: 0, output: '', testsRun: 0 }));
    await Promise.all(scripts.map((item) => testScript(plugin, item, files)));
  }

  // Every file is written at once, and each script's tests start as soon as
  // the script and its test file are both written, not when the last file is.
  async function writeAll(plugin, { change, previousFiles } = {}) {
    const writes = plugin.plan.map((item) => writeFile(plugin, item.path, change ? {
      change,
      previousContent: previousFiles?.[item.path] || undefined,
    } : {}));
    const written = Object.fromEntries(plugin.plan.map((item, index) => [item.path, writes[index]]));
    const scripts = pluginScripts(plugin);
    scripts.forEach((item) => setTest(item.name, { status: 'waiting', attempts: 0, output: '', testsRun: 0 }));
    const tests = scripts.map(async (item) => {
      const [script, test] = await Promise.all([written[item.script], written[item.test]]);
      return testScript(plugin, item, { [item.script]: script, [item.test]: test });
    });
    const contents = await Promise.all(writes);
    recordAssistantEvent('plugin_builder_files', { written: contents.filter(Boolean).length, failed: contents.filter((content) => !content).length, output: plugin.output });
    await Promise.all(tests);
  }

  function startPlugin(blueprint) {
    const plugin = { ...blueprint, files: {} };
    setState((current) => ({ ...current, timing: { ...current.timing, phase: 'files' } }));
    if (pluginScripts(plugin).length) warmPython();
    update({ plugin, fileStatus: Object.fromEntries(plugin.plan.map((item) => [item.path, 'writing'])), step: 'plugin' });
    recordAssistantEvent('plugin_builder_blueprint', { cadence: plugin.cadence, output: plugin.output, fileCount: plugin.plan.length });
    return plugin;
  }

  const build = () => {
    startClock('design');
    return run({ stage: 'blueprint', ...base() }, (blueprint) => writeAll(startPlugin(blueprint)));
  };

  const refine = (change, onDone) => {
    const previous = state.plugin;
    startClock('design');
    return run({ stage: 'blueprint', ...base(), previous: blueprintOf(previous), change }, (blueprint) => {
      onDone();
      return writeAll(startPlugin(blueprint), { change, previousFiles: previous.files });
    });
  };

  async function retry(path) {
    startClock('files');
    const content = await writeFile(state.plugin, path);
    const latest = stateRef.current.plugin;
    if (!content || !latest) return;
    const files = { ...latest.files, [path]: content };
    if (latest.plan.every((item) => files[item.path])) await testScripts(latest, files);
  }

  const runTests = () => {
    startClock('tests');
    return testScripts(state.plugin, state.plugin.files);
  };

  return (
    <>
      <div ref={stepsRef} tabIndex={-1} className="scroll-mt-24 outline-none">
        <Stepper current={state.step} platform={platform} />
      </div>

      {state.step === 'describe' && <DescribeStep platform={platform} state={state} update={update} busy={busy} error={error} onSubmit={() => checkFit()} />}
      {state.step === 'fit' && state.scope && (
        <FitStep
          platform={platform}
          state={state}
          update={update}
          busy={busy}
          error={error}
          onBuild={build}
          onBack={() => { setError(''); update({ step: 'describe' }); }}
          onUseAlternative={() => checkFit(state.scope.alternative)}
        />
      )}
      {state.step === 'plugin' && state.plugin && (
        <PluginStep
          platform={platform}
          state={state}
          busy={busy}
          error={error}
          onRefine={refine}
          onRetry={retry}
          onRebuild={build}
          onReset={() => { setError(''); setState(EMPTY); }}
          onRunTests={runTests}
        />
      )}
    </>
  );
}

const PLATFORM_NOTE = {
  claude: 'Packaged as a Claude plugin: upload it in Customize > Plugins. It also syncs to Claude Code.',
  chatgpt: 'A ChatGPT skill: upload it under Skills in ChatGPT, with Backstory connected.',
};

export function SkillsBuilder() {
  const [params, setParams] = useSearchParams();
  const platform = PLATFORMS.includes(params.get('for')) ? params.get('for') : 'claude';
  const choose = (value) => setParams(value === 'claude' ? {} : { for: value }, { replace: true });
  return (
    <div className="container-page">
      <SectionHero
        eyebrow="Skills Builder"
        title="Build a skill for Claude or ChatGPT"
        subtitle="Describe a job you want done the same way every time. You'll get a skill that already knows how Backstory's tools behave and where they stop: its workflow, settings, judgment standard, tested scripts and, when it publishes a page, a fixed page kit. For Claude it comes packaged as a plugin; for ChatGPT, as a ChatGPT skill."
        image="meeting-bg-05.jpg"
      />
      <div className="mb-6 flex flex-wrap items-end gap-x-5 gap-y-2 border-b border-ac-light-gray" role="tablist" aria-label="Where the skill runs">
        {PLATFORMS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`platform-${value}`}
            aria-selected={platform === value}
            aria-controls={`platform-panel-${value}`}
            onClick={() => choose(value)}
            className={cn(
              '-mb-px border-b-2 px-1 pb-2.5 font-mono text-[12.5px] font-medium uppercase tracking-[0.06em] transition-colors',
              platform === value ? 'border-ac-coral text-ac-coral-dark' : 'border-transparent text-ac-dark-secondary hover:text-ac-coral-dark',
            )}
          >
            For {PLATFORM_LABEL[value]}
          </button>
        ))}
        <p className="pb-2.5 text-[12.5px] leading-5 text-ac-med-gray sm:ml-auto">{PLATFORM_NOTE[platform]}</p>
      </div>
      {/* Both stay mounted, so a build keeps going on the tab you left. */}
      {PLATFORMS.map((value) => (
        <div key={value} id={`platform-panel-${value}`} role="tabpanel" aria-labelledby={`platform-${value}`} hidden={platform !== value}>
          <BuilderFlow platform={value} />
        </div>
      ))}
    </div>
  );
}
