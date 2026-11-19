// Runs one generated script's tests in a Web Worker with Pyodide. The first
// run downloads Python (about 10 MB, then cached by the browser), so it gets a
// longer limit; a run past its limit terminates the worker, which also stops
// a script stuck in a loop.
const FIRST_LIMIT_MS = 90000;
const RUN_LIMIT_MS = 30000;

let worker = null;
let loaded = false;
let nextId = 0;

function getWorker() {
  if (!worker) worker = new Worker(new URL('./pythonWorker.js', import.meta.url), { type: 'module' });
  return worker;
}

function reset() {
  worker?.terminate();
  worker = null;
  loaded = false;
}

/**
 * Starts downloading Python before the first test needs it, so the tests
 * don't wait for it. Safe to call more than once.
 */
export function warmPython() {
  if (loaded) return;
  const id = (nextId += 1);
  const current = getWorker();
  const onMessage = ({ data }) => {
    if (data.id !== id) return;
    current.removeEventListener('message', onMessage);
    loaded = true;
  };
  current.addEventListener('message', onMessage);
  current.postMessage({ id, warm: true });
}

/**
 * files: { 'settings.json': text, 'scripts/x.py': text, 'scripts/test_x.py': text }, relative to the skill folder.
 * Resolves { passed, testsRun, problems, output }; never rejects.
 */
export function runScriptTests({ name, files, onLoaded }) {
  const id = (nextId += 1);
  const current = getWorker();
  return new Promise((resolve) => {
    let limit = loaded ? RUN_LIMIT_MS : FIRST_LIMIT_MS;
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        current.removeEventListener('message', onMessage);
        current.removeEventListener('error', onError);
        reset();
        resolve({ passed: false, testsRun: 0, problems: 1, output: `The tests didn't finish within ${Math.round(limit / 1000)} seconds, so they were stopped. A loop that never ends is the usual cause.` });
      }, limit);
    };
    function onMessage({ data }) {
      if (data.id !== id) return;
      if (data.loaded) {
        if (!loaded) onLoaded?.();
        loaded = true;
        limit = RUN_LIMIT_MS;
        arm();
        return;
      }
      clearTimeout(timer);
      current.removeEventListener('message', onMessage);
      current.removeEventListener('error', onError);
      resolve(data.result);
    }
    // A worker that can't start (the script failed to load) fails at once rather than at the limit.
    function onError() {
      clearTimeout(timer);
      current.removeEventListener('message', onMessage);
      reset();
      resolve({ passed: false, testsRun: 0, problems: 1, output: 'Python could not start in this browser, so the tests did not run. Check your connection and run them again.' });
    }
    current.addEventListener('message', onMessage);
    current.addEventListener('error', onError, { once: true });
    arm();
    current.postMessage({ id, name, files });
  });
}
