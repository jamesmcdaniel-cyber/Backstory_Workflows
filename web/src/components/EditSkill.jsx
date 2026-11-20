import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Download, FileText, Loader2, Lock, PackageOpen, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from './ui/Button';
import { SetupFiles } from './SetupFiles';
import { cn } from '../lib/cn';
import { pluginBuilderRequest, recordAssistantEvent } from '../lib/assistant';
import { PLATFORM_NAME, applyVersion, checkPackage, describePackage, isLocked, lineDiff, nextPatch, packageTests, readPackage, zipPackage } from '../lib/editPackage';
import { filesFromDrop } from '../lib/setupFiles';
import { runPackageScript, runScriptTests } from '../lib/scriptTests';

// Edit an existing skill: upload a Claude plugin or ChatGPT skill ZIP (or its
// folder), say what should change, check the change against what the
// Backstory MCP can do, edit the files that need it, then run the package's
// own tests and checks, show every change as a diff, and download it in the
// shape it came in. Nothing is stored; a reload starts over.
const MAX_FIX_ROUNDS = 2;
const FIT = {
  strong: { label: 'Can be done', className: 'bg-ac-success/10 text-ac-success' },
  partial: { label: 'Can be done with limits', className: 'bg-ac-warning/15 text-ac-warning' },
  not_supported: { label: 'Not possible with Backstory', className: 'bg-ac-coral/10 text-ac-coral-dark' },
};
const fieldClass = 'w-full rounded-lg border border-ac-light-gray bg-ac-warm-white px-3 py-2.5 text-[14px] leading-6 text-ac-dark outline-none transition-colors focus:border-ac-coral focus:bg-white';
const labelClass = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-ac-dark-secondary';
const eyebrowClass = 'mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ac-med-gray';

function Busy({ children }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-[13px] text-ac-dark-secondary">
      <Loader2 size={15} className="animate-spin text-ac-coral" /> {children}
    </span>
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

// The locked page template stays in the browser: the model can't change it, and it's large.
const asPayload = (pkg, files = pkg.files) => ({ name: pkg.name || '', version: pkg.version || '', files: Object.entries(files).filter(([path]) => !isLocked(path)).map(([path, content]) => ({ path, content })) });
const friendly = (error) => (error?.message && !String(error.message).startsWith('/api/') ? error.message : 'The Skill Builder could not respond. Please try again.');

function save(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function PackageDrop({ onFiles, reading }) {
  const [dragging, setDragging] = useState(false);
  const zipInput = useRef(null);
  const folderInput = useRef(null);
  const linkClass = 'font-medium text-ac-coral-dark underline-offset-2 hover:underline';
  return (
    <div
      className={cn('grid place-items-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors', dragging ? 'border-ac-coral bg-ac-coral/5' : 'border-ac-light-gray bg-ac-warm-white')}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => { event.preventDefault(); setDragging(false); onFiles(await filesFromDrop(event.dataTransfer)); }}
    >
      <Upload size={22} className="text-ac-med-gray" aria-hidden="true" />
      <p className="mt-2 text-[14px] text-ac-dark">
        Drop a skill ZIP or its folder here, or{' '}
        <button type="button" className={linkClass} onClick={() => zipInput.current?.click()}>choose a ZIP</button>
        {' '}or{' '}
        <button type="button" className={linkClass} onClick={() => folderInput.current?.click()}>a folder</button>.
      </p>
      <p className="mt-1 text-[12.5px] text-ac-med-gray">A Claude plugin (with .claude-plugin/plugin.json) or a ChatGPT skill (with SKILL.md and agents/openai.yaml).</p>
      <input ref={zipInput} type="file" accept=".zip" className="hidden" onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
      <input ref={folderInput} type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={(event) => { onFiles(event.target.files); event.target.value = ''; }} />
      {reading && <p className="mt-3"><Busy>Reading the package…</Busy></p>}
    </div>
  );
}

function PackageSummary({ pkg, onClear }) {
  const textCount = Object.keys(pkg.files).length;
  const binaryCount = Object.keys(pkg.binary).length;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-ac-light-gray bg-white p-4">
      <div className="flex min-w-0 items-start gap-3">
        <PackageOpen size={20} className="mt-0.5 shrink-0 text-ac-coral" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ac-dark">{pkg.name || 'Unnamed skill'}{pkg.version ? ` · v${pkg.version}` : ''}</p>
          <p className="text-[12.5px] text-ac-dark-secondary">{pkg.platform ? PLATFORM_NAME[pkg.platform] : 'Not recognized'} · {textCount} text file{textCount === 1 ? '' : 's'}{binaryCount ? `, ${binaryCount} other kept as is` : ''}</p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}><X size={13} /> Use another</Button>
    </div>
  );
}

function DiffView({ before, after }) {
  const diff = useMemo(() => lineDiff(before, after), [before, after]);
  return (
    <div className="overflow-x-auto rounded-md bg-wf-bg font-mono text-[11.5px] leading-5 text-wf-text">
      {diff.hunks.map((hunk, index) => (
        <div key={index} className={index ? 'border-t border-wf-border' : ''}>
          {hunk.map((line, row) => (
            <div key={row} className={cn('flex whitespace-pre', line.type === 'add' && 'bg-emerald-500/15', line.type === 'del' && 'bg-rose-500/15')}>
              <span className="w-10 shrink-0 select-none pr-2 text-right opacity-50">{line.a ?? ''}</span>
              <span className="w-10 shrink-0 select-none pr-2 text-right opacity-50">{line.b ?? ''}</span>
              <span className="w-4 shrink-0 select-none">{line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' '}</span>
              <span>{line.text || ' '}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const STATUS_ICON = {
  writing: <Loader2 size={14} className="shrink-0 animate-spin text-ac-coral" />,
  running: <Loader2 size={14} className="shrink-0 animate-spin text-ac-coral" />,
  waiting: <Loader2 size={14} className="shrink-0 text-ac-med-gray" />,
  done: <Check size={14} className="shrink-0 text-ac-success" />,
  passed: <Check size={14} className="shrink-0 text-ac-success" />,
  error: <X size={14} className="shrink-0 text-ac-coral-dark" />,
  failed: <X size={14} className="shrink-0 text-ac-coral-dark" />,
};

/** The "Edit an existing skill" path of the Skill Builder. */
export function EditSkill({ platform }) {
  const [pkg, setPkg] = useState(null);
  const [reading, setReading] = useState(false);
  const [change, setChange] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [plan, setPlan] = useState(null);
  const [edited, setEdited] = useState({});
  const [fileStatus, setFileStatus] = useState({});
  const [tests, setTests] = useState([]);
  const [phase, setPhase] = useState('upload'); // upload → plan → editing → review
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fixRounds, setFixRounds] = useState(0);

  const version = pkg ? nextPatch(pkg.version) : null;
  const finalFiles = useMemo(() => (pkg ? applyVersion(pkg, { ...pkg.files, ...edited }, version) : {}), [pkg, edited, version]);
  const changedPaths = useMemo(() => Object.keys(finalFiles).filter((path) => finalFiles[path] !== pkg?.files[path]).sort(), [finalFiles, pkg]);
  const checks = useMemo(() => (pkg && phase === 'review' ? checkPackage(pkg, finalFiles) : []), [pkg, finalFiles, phase]);
  // A problem the uploaded skill already had isn't the edit's doing: it's
  // shown as a warning, and doesn't hold the download.
  const before = useMemo(() => (pkg ? Object.fromEntries(checkPackage(pkg, pkg.files).map((item) => [item.name, item])) : {}), [pkg]);
  const preexisting = (item) => {
    const earlier = before[item.name];
    if (item.passed || !earlier || earlier.passed) return false;
    // Already there only when every file it names had the problem before the edit.
    return item.paths?.length ? item.paths.every((path) => earlier.paths.includes(path)) : earlier.detail === item.detail;
  };
  const blocking = checks.filter((item) => !item.passed && !preexisting(item));
  const testsRunning = tests.some((test) => test.status === 'running' || test.status === 'waiting');
  const ready = phase === 'review' && !testsRunning && checks.length > 0 && blocking.length === 0 && tests.every((test) => test.status === 'passed');

  async function onFiles(list) {
    setReading(true);
    setError('');
    try {
      const read = await readPackage(list);
      setPkg(read);
      setPhase('upload');
      setPlan(null);
      setEdited({});
      if (!read.platform) setError(read.problems[0] || 'This doesn\'t look like a skill or plugin.');
    } catch {
      setError('That file couldn\'t be read. Upload a ZIP of a Claude plugin or a ChatGPT skill, or its folder.');
    } finally {
      setReading(false);
    }
  }

  function reset() {
    setPkg(null);
    setPlan(null);
    setEdited({});
    setFileStatus({});
    setTests([]);
    setPhase('upload');
    setError('');
    setFixRounds(0);
  }

  async function checkChange() {
    setBusy(true);
    setError('');
    try {
      const result = await pluginBuilderRequest({
        stage: 'edit-plan',
        platform: pkg.platform,
        change: change.trim(),
        pkg: asPayload(pkg),
        ...(attachments.length ? { attachments: attachments.map(({ name, content }) => ({ name, content })) } : {}),
      });
      setPlan(result);
      setPhase('plan');
      recordAssistantEvent('plugin_builder_scope', { fit: result.fit, platform: pkg.platform, edit: true });
    } catch (requestError) {
      setError(friendly(requestError));
    } finally {
      setBusy(false);
    }
  }

  // One file, written with the whole package (as it stands) in view; one retry on a failure.
  async function editFile(path, base, testOutput) {
    setFileStatus((current) => ({ ...current, [path]: 'writing' }));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const result = await pluginBuilderRequest({
          stage: 'edit-file', platform: pkg.platform, change: change.trim(), pkg: asPayload(pkg, base), plan, path, ...(testOutput ? { testOutput } : {}),
        });
        setFileStatus((current) => ({ ...current, [path]: 'done' }));
        return result.content;
      } catch {
        /* try once more */
      }
    }
    setFileStatus((current) => ({ ...current, [path]: 'error' }));
    return null;
  }

  async function runTests(files) {
    const list = packageTests(pkg, files);
    setTests(list.map((test) => ({ ...test, status: 'waiting', output: '' })));
    const results = [];
    for (const [index, test] of list.entries()) {
      setTests((current) => current.map((item, i) => (i === index ? { ...item, status: 'running' } : item)));
      let result;
      if (test.kind === 'unittest') {
        const prefix = pkg.skillDir || '';
        const skillFiles = Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(prefix)).map(([path, text]) => [path.slice(prefix.length), text]));
        result = await runScriptTests({ name: test.name, files: skillFiles });
      } else {
        result = await runPackageScript({ files, script: test.path, args: test.args });
      }
      results.push({ ...test, result });
      setTests((current) => current.map((item, i) => (i === index ? { ...item, status: result.passed ? 'passed' : 'failed', output: result.output, testsRun: result.testsRun } : item)));
    }
    return results;
  }

  async function apply() {
    setPhase('editing');
    setError('');
    setFixRounds(0);
    const contents = await Promise.all(plan.changes.map((item) => editFile(item.path, pkg.files)));
    const next = Object.fromEntries(plan.changes.map((item, index) => [item.path, contents[index]]).filter(([, content]) => content !== null));
    setEdited(next);
    recordAssistantEvent('plugin_builder_files', { written: Object.keys(next).length, failed: contents.filter((content) => content === null).length, platform: pkg.platform, edit: true });
    if (contents.some((content) => content === null)) {
      setError('Some files couldn\'t be edited. Retry them below.');
      setPhase('review');
      return;
    }
    setPhase('review');
    await runTests(applyVersion(pkg, { ...pkg.files, ...next }, version));
  }

  async function retry(path) {
    const content = await editFile(path, pkg.files);
    if (content === null) return;
    const next = { ...edited, [path]: content };
    setEdited(next);
    if (plan.changes.every((item) => next[item.path] !== undefined)) {
      setError('');
      await runTests(applyVersion(pkg, { ...pkg.files, ...next }, version));
    }
  }

  // When the package's tests fail after the edit, the planned Python and JSON
  // files get one more pass with the failing output, up to MAX_FIX_ROUNDS.
  // Fixes what failed after the edit: the planned files a failing check
  // names, and, when tests failed, the planned Python and JSON files.
  async function fix() {
    const failedTests = tests.filter((test) => test.status === 'failed');
    const failing = [
      ...blocking.map((item) => `Check "${item.name}" failed: ${item.detail}`),
      ...failedTests.map((test) => `${test.path}:\n${test.output}`),
    ].join('\n\n').slice(-7900);
    const planned = plan.changes.map((item) => item.path);
    const targets = planned.filter((path) => (failedTests.length && /\.(?:py|json)$/.test(path)) || blocking.some((item) => item.paths?.includes(path) || item.detail.includes(path)));
    if (!targets.length) return;
    setFixRounds((count) => count + 1);
    const base = { ...pkg.files, ...edited };
    const contents = await Promise.all(targets.map((path) => editFile(path, base, failing)));
    const next = { ...edited, ...Object.fromEntries(targets.map((path, index) => [path, contents[index]]).filter(([, content]) => content !== null)) };
    setEdited(next);
    await runTests(applyVersion(pkg, { ...pkg.files, ...next }, version));
  }

  function download() {
    const filename = pkg.platform === 'chatgpt' ? 'skill.zip' : `${pkg.name || 'plugin'}-${version || pkg.version || 'edited'}.zip`;
    save(zipPackage(pkg, finalFiles), filename);
    recordAssistantEvent('plugin_builder_download', { platform: pkg.platform, edit: true, changed: changedPaths.length });
  }

  if (phase === 'upload' || !plan) {
    const usable = pkg?.platform && !pkg.problems.some((problem) => /too large|several skills|up to/.test(problem));
    return (
      <form className="surface-card p-6 lg:p-8" onSubmit={(event) => { event.preventDefault(); if (usable && change.trim().length >= 8 && !busy) checkChange(); }}>
        <h2 className="font-display text-[18px] font-bold text-ac-dark">Edit an existing skill</h2>
        <p className="mt-1 text-[14px] leading-6 text-ac-dark-secondary">Upload a Claude plugin or a ChatGPT skill and say what should change. The builder checks the change against what Backstory can do, edits only the files that need it, runs the skill's own tests, and shows you every change before you download it.</p>
        <div className="mt-4">{pkg ? <PackageSummary pkg={pkg} onClear={reset} /> : <PackageDrop onFiles={onFiles} reading={reading} />}</div>
        {pkg?.problems?.length > 0 && pkg.platform && (
          <ul className="mt-2 list-disc pl-5 text-[12.5px] leading-5 text-ac-warning">{pkg.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
        )}
        {pkg?.platform && pkg.platform !== platform && (
          <p className="mt-2 text-[12.5px] text-ac-med-gray">This is a {PLATFORM_NAME[pkg.platform]}; it will be edited and downloaded as one.</p>
        )}
        <label htmlFor={`edit-change-${platform}`} className={cn(labelClass, 'mt-5 block')}>What should change?</label>
        <textarea
          id={`edit-change-${platform}`}
          rows={4}
          maxLength={2000}
          className={cn(fieldClass, 'mt-1.5')}
          value={change}
          onChange={(event) => setChange(event.target.value)}
          placeholder="Cap it at 200 renewals with a $25K floor, and stop asking the client to confirm the count…"
        />
        <div className="mt-4">
          <span className={labelClass}>Your setup <span className="font-normal text-ac-med-gray">Optional</span></span>
          <SetupFiles platform={`edit-${platform}`} files={attachments} onChange={setAttachments} />
        </div>
        <p className="mt-5 text-[12.5px] leading-5 text-ac-med-gray">The skill, what you type and the files you add go to our AI provider to make the edit, and this site doesn't store them. Leave out anything you can't share.</p>
        <ErrorNote message={error} />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!usable || change.trim().length < 8 || busy}>Check the change <ArrowRight size={15} /></Button>
          {busy && <Busy>Reading the skill and checking the change against Backstory…</Busy>}
        </div>
      </form>
    );
  }

  const fit = FIT[plan.fit] || FIT.partial;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-5">
        <div className="surface-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em]', fit.className)}>{fit.label}</span>
            <span className="font-mono text-[12px] text-ac-med-gray">{pkg.name}{pkg.version ? ` v${pkg.version}${version ? ` → v${version}` : ''}` : ''} · {PLATFORM_NAME[pkg.platform]}</span>
          </div>
          <p className="mt-3 text-[15px] font-medium leading-6 text-ac-dark">{plan.verdict}</p>
          <p className="mt-1 text-[14px] leading-6 text-ac-dark-secondary">{plan.summary}</p>
          {plan.stopsAt.length > 0 && (
            <div className="mt-3 rounded-lg bg-ac-cream p-3">
              <p className={labelClass}>What it can't do</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-5 text-ac-dark-secondary">{plan.stopsAt.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          <p className={cn(eyebrowClass, 'mb-1.5 mt-4')}>Files to change</p>
          <ul className="space-y-2">
            {plan.changes.map((item) => (
              <li key={item.path} className="rounded-lg border border-ac-light-gray p-3">
                <div className="flex items-center gap-2">
                  {phase !== 'plan' && (STATUS_ICON[fileStatus[item.path]] || STATUS_ICON.done)}
                  <code className="font-mono text-[12.5px] text-ac-dark">{item.path}</code>
                  {!pkg.files[item.path] && <span className="rounded bg-ac-cream px-1.5 font-mono text-[10.5px] uppercase text-ac-med-gray">new</span>}
                  {fileStatus[item.path] === 'error' && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => retry(item.path)}><RefreshCw size={13} /> Retry</Button>}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-ac-dark-secondary">{item.what}</p>
              </li>
            ))}
          </ul>
          {version && <p className="mt-2 text-[12.5px] text-ac-med-gray">The version goes to {version} wherever it's recorded. <Lock size={11} className="inline" /> The page template and its fingerprint never change.</p>}
          <ErrorNote message={error} />
          {phase === 'plan' && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {plan.fit !== 'not_supported' && plan.changes.length > 0 && <Button onClick={apply}>Make these changes <ArrowRight size={15} /></Button>}
              <Button variant="secondary" onClick={() => { setPhase('upload'); setPlan(null); }}><ArrowLeft size={15} /> Change the request</Button>
            </div>
          )}
          {phase === 'editing' && <p className="mt-4"><Busy>Editing {plan.changes.length} file{plan.changes.length === 1 ? '' : 's'} with the whole skill in view. This usually takes one to two minutes.</Busy></p>}
          {phase === 'review' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button disabled={!ready} onClick={download}><Download size={15} /> Download {pkg.platform === 'chatgpt' ? 'skill.zip' : 'the plugin ZIP'}</Button>
              <Button variant="ghost" size="sm" onClick={() => { setPhase('upload'); setPlan(null); setPkg(describePackage({ root: pkg.root, files: finalFiles, binary: pkg.binary })); setEdited({}); setChange(''); setTests([]); }}>Make another change</Button>
              <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>
              {!ready && !testsRunning && fixRounds < MAX_FIX_ROUNDS && (blocking.length > 0 || tests.some((test) => test.status === 'failed')) && plan.changes.some((item) => blocking.some((check) => check.detail.includes(item.path)) || (tests.some((test) => test.status === 'failed') && /\.(?:py|json)$/.test(item.path))) && (
                <Button size="sm" variant="secondary" onClick={fix}><RefreshCw size={13} /> Fix what failed</Button>
              )}
              {!ready && !testsRunning && <span className="text-[12.5px] text-ac-coral-dark">The download opens once every check and test passes.</span>}
            </div>
          )}
        </div>

        {phase === 'review' && changedPaths.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Every change</h2>
            <div className="space-y-2">
              {changedPaths.map((path) => {
                const diff = lineDiff(pkg.files[path] || '', finalFiles[path]);
                return (
                  <details key={path} className="rounded-lg border border-ac-light-gray">
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px]">
                      <FileText size={13} className="text-ac-med-gray" aria-hidden="true" />
                      <code className="font-mono text-ac-dark">{path}</code>
                      <span className="ml-auto font-mono text-[11.5px]"><span className="text-ac-success">+{diff.added}</span> <span className="text-ac-coral-dark">−{diff.removed}</span></span>
                    </summary>
                    <div className="p-2"><DiffView before={pkg.files[path] || ''} after={finalFiles[path]} /></div>
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        {plan.checks.length > 0 && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Confirm after the edit</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-5 text-ac-dark-secondary">{plan.checks.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        )}
        {phase === 'review' && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>The skill's own tests</h2>
            {tests.length === 0 ? (
              <p className="text-[13px] leading-5 text-ac-dark-secondary">This skill has no tests to run (no scripts/test_*.py or check_fixtures.py). The checks below still apply.</p>
            ) : (
              <ul className="space-y-1.5 text-[13px] leading-5">
                {tests.map((test) => (
                  <li key={test.path}>
                    <div className="flex items-center gap-2">
                      {STATUS_ICON[test.status]}
                      <code className="min-w-0 truncate font-mono text-[12px] text-ac-dark">{test.path.split('/').slice(-2).join('/')}</code>
                      <span className="ml-auto text-ac-med-gray">{test.status === 'running' ? 'running in Python' : test.status}</span>
                    </div>
                    {test.output && test.status !== 'running' && (
                      <details className="ml-6 mt-1"><summary className="cursor-pointer text-[12px] text-ac-coral-dark">Output</summary><pre className="mt-1 max-h-60 overflow-auto rounded bg-wf-bg p-2 font-mono text-[11px] text-wf-text">{test.output}</pre></details>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {tests.some((test) => test.status === 'failed') && !testsRunning && fixRounds >= MAX_FIX_ROUNDS && (
              <p className="mt-3 text-[12.5px] leading-5 text-ac-coral-dark">The tests still fail. Change the request and try again, or check the output above.</p>
            )}
            <p className="mt-3 text-[12px] leading-5 text-ac-med-gray">They run in Python in your browser, on the edited package, before you download.</p>
          </section>
        )}
        {phase === 'review' && (
          <section className="surface-card p-5">
            <h2 className={eyebrowClass}>Checks</h2>
            <ul className="space-y-1.5 text-[13px] leading-5 text-ac-dark-secondary">
              {checks.map((item) => (
                <li key={item.name} className="flex items-start gap-2">
                  {item.passed ? <Check size={14} className="mt-0.5 shrink-0 text-ac-success" /> : preexisting(item) ? <AlertTriangle size={14} className="mt-0.5 shrink-0 text-ac-warning" /> : <X size={14} className="mt-0.5 shrink-0 text-ac-coral-dark" />}
                  <span><strong className="font-medium text-ac-dark">{item.name}.</strong> {item.detail}{preexisting(item) ? ' (already there)' : ''}</span>
                </li>
              ))}
            </ul>
            {changedPaths.some(isLocked) && <p className="mt-2 text-[12.5px] text-ac-coral-dark">A locked file changed; this edit can't be downloaded.</p>}
            {checks.some(preexisting) && <p className="mt-2 text-[12px] leading-5 text-ac-med-gray">Marked "already there": the uploaded skill had this before the edit, so it doesn't hold the download.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
