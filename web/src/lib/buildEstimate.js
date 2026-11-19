// Time estimates for a plugin build, from real-model runs (2026-11-19): the
// design call takes 100-170s, a Markdown file 20-60s, a script 60-110s, and a
// script's tests about 10-40s in the browser, plus about 45s for each fix.
// Files are written in parallel, so the files phase lasts as long as the
// slowest one still writing; scripts are tested at the same time too.
export const EXPECTED_SECONDS = { design: 150, markdown: 60, script: 110, test: 40, fix: 50, pythonLoad: 15 };
// An estimate never drops below this, so a slow call reads as "almost done"
// rather than a countdown stuck at zero.
const FLOOR = { design: 20, file: 10, test: 5 };

export const PHASES = [
  { id: 'design', label: 'Design' },
  { id: 'files', label: 'Write files' },
  { id: 'tests', label: 'Test scripts' },
  { id: 'ready', label: 'Ready' },
];

const seconds = (ms) => Math.max(0, ms / 1000);
const isScript = (item) => item.kind === 'script';

// Scripts are tested at the same time, so the longest one sets the time left.
function testsRemaining(plugin, now) {
  const scripts = (plugin?.plan || []).filter(isScript);
  if (!scripts.length) return 0;
  // Python downloads before the first test run of the page view.
  const started = scripts.some((item) => plugin.tests?.[item.script.name] && plugin.tests[item.script.name].status !== 'waiting');
  const each = scripts.map((item) => {
    const test = plugin.tests?.[item.script.name];
    const since = test?.startedAt ? seconds(now - test.startedAt) : 0;
    if (!test || test.status === 'waiting') return EXPECTED_SECONDS.test;
    if (test.status === 'running') return Math.max(EXPECTED_SECONDS.test - since, FLOOR.test);
    if (test.status === 'fixing') return Math.max(EXPECTED_SECONDS.fix - since, FLOOR.test) + EXPECTED_SECONDS.test;
    return 0;
  });
  return (started ? 0 : EXPECTED_SECONDS.pythonLoad) + Math.max(...each);
}

/**
 * Where a build is and how long it has left.
 * timing: { startedAt, fileStarted: { [path]: ms } }. Returns
 * { phase, elapsed, remaining, done, total, stalled } with times in seconds.
 */
export function estimateBuild({ plugin, fileStatus = {}, timing = {}, now = Date.now() }) {
  const elapsed = timing.startedAt ? seconds(now - timing.startedAt) : 0;
  if (!plugin) {
    // Designing: the plan isn't known yet, so assume a typical plugin with two scripts.
    const design = Math.max(EXPECTED_SECONDS.design - elapsed, FLOOR.design);
    return { phase: 'design', elapsed, remaining: design + EXPECTED_SECONDS.script + 2 * EXPECTED_SECONDS.test + EXPECTED_SECONDS.pythonLoad, done: 0, total: 0, stalled: false };
  }
  const plan = plugin.plan || [];
  const writing = plan.filter((item) => fileStatus[item.path] === 'writing');
  const done = plan.filter((item) => fileStatus[item.path] === 'done').length;
  const stalled = !writing.length && plan.some((item) => fileStatus[item.path] === 'error');
  if (writing.length || stalled) {
    const files = writing.length ? Math.max(...writing.map((item) => {
      const since = seconds(now - (timing.fileStarted?.[item.path] || timing.startedAt || now));
      return Math.max((isScript(item) ? EXPECTED_SECONDS.script : EXPECTED_SECONDS.markdown) - since, FLOOR.file);
    })) : 0;
    return { phase: 'files', elapsed, remaining: files + testsRemaining({ ...plugin, tests: {} }, now), done, total: plan.length, stalled };
  }
  const scripts = plan.filter(isScript);
  const testing = scripts.filter((item) => ['waiting', 'running', 'fixing'].includes(plugin.tests?.[item.script.name]?.status));
  if (testing.length) {
    const tested = scripts.length - testing.length;
    return { phase: 'tests', elapsed, remaining: testsRemaining(plugin, now), done: tested, total: scripts.length, stalled: false };
  }
  return { phase: 'ready', elapsed, remaining: 0, done: plan.length, total: plan.length, stalled: false };
}

/** "About 3 min left", "About 40 sec left". */
export function formatRemaining(remaining) {
  if (remaining <= 0) return 'Finishing up';
  if (remaining < 50) return `About ${Math.max(10, Math.round(remaining / 10) * 10)} sec left`;
  const minutes = Math.round(remaining / 60);
  return minutes <= 1 ? 'About a minute left' : `About ${minutes} min left`;
}

/** "1:05" */
export function formatElapsed(elapsed) {
  const total = Math.floor(elapsed);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
