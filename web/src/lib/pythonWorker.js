// Runs a generated script's tests in Pyodide (Python compiled to WebAssembly),
// inside this worker, so generated code never runs on our servers and the page
// can stop a runaway script by terminating the worker.
import { HARNESS_PY } from './scriptHarness.js';

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let pyodide;

async function load() {
  if (!pyodide) {
    pyodide = import(/* @vite-ignore */ `${PYODIDE}pyodide.mjs`).then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE }));
  }
  return pyodide;
}

function writeTree(py, root, files) {
  for (const [path, content] of Object.entries(files)) {
    const full = `${root}/${path}`;
    const parts = full.split('/').slice(1, -1);
    let dir = '';
    for (const part of parts) {
      dir += `/${part}`;
      if (!py.FS.analyzePath(dir).exists) py.FS.mkdir(dir);
    }
    py.FS.writeFile(full, content);
  }
}

let runs = 0;
self.onmessage = async ({ data }) => {
  const { id, name, files, warm } = data;
  try {
    const py = await load();
    self.postMessage({ id, loaded: true });
    if (warm) return;
    const root = `/plugin-run${(runs += 1)}`;
    writeTree(py, root, files);
    py.globals.set('SKILL_DIR', root);
    py.globals.set('NAME', name);
    const result = JSON.parse(py.runPython(HARNESS_PY));
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, result: { passed: false, testsRun: 0, problems: 1, output: `The test runner failed: ${error?.message || error}` } });
  }
};
