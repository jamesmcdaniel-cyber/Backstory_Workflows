import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HARNESS_PY } from '../scriptHarness.js';

const SCRIPT = `import json, sys

def run(data, settings, as_of):
    keep = [r for r in data if r.get("amount", 0) >= settings["min"]]
    return {"kept": keep, "report": [f"dropped {len(data) - len(keep)}"]}

def main(argv):
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
`;

const testFile = (expected) => `import json, os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from population import run

SETTINGS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "settings.json")))

class PopulationTest(unittest.TestCase):
    def test_keeps_large(self):
        out = run([{"amount": 5}, {"amount": 50}], SETTINGS, "2026-11-19")
        self.assertEqual(len(out["kept"]), ${expected})

if __name__ == "__main__":
    unittest.main()
`;

// Runs the harness exactly as the browser does, with local python3 in place of Pyodide.
function harness(files) {
  const dir = mkdtempSync(join(tmpdir(), 'harness-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  const code = `SKILL_DIR = ${JSON.stringify(dir)}\nNAME = "population"\n${HARNESS_PY.replace(/\njson\.dumps\((.*)\)\s*$/, '\nprint(json.dumps($1))')}`;
  const result = spawnSync('python3', ['-I', '-c', code], { encoding: 'utf8' });
  return JSON.parse(result.stdout);
}

const python = spawnSync('python3', ['--version']).status === 0;

describe.runIf(python)('the script test harness', () => {
  const settings = JSON.stringify({ min: 10 });
  it('reports a passing suite with its test count', () => {
    const result = harness({ 'settings.json': settings, 'scripts/population.py': SCRIPT, 'scripts/test_population.py': testFile(1) });
    expect(result).toMatchObject({ passed: true, testsRun: 1, problems: 0 });
  });
  it('reports a failing assertion with its output, for the fix request', () => {
    const result = harness({ 'settings.json': settings, 'scripts/population.py': SCRIPT, 'scripts/test_population.py': testFile(2) });
    expect(result).toMatchObject({ passed: false, testsRun: 1, problems: 1 });
    expect(result.output).toMatch(/AssertionError: 1 != 2/);
  });
  it('fails a script that does not import, rather than passing zero tests', () => {
    const result = harness({ 'settings.json': settings, 'scripts/population.py': 'def run(:\n', 'scripts/test_population.py': testFile(1) });
    expect(result.passed).toBe(false);
    expect(result.output).toMatch(/SyntaxError/);
  });
});
