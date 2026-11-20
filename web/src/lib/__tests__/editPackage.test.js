import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { applyVersion, checkPackage, lineDiff, nextPatch, packageTests, readPackage, zipPackage } from '../editPackage.js';
import { RUN_SCRIPT_PY } from '../scriptHarness.js';

const claudeZip = () => zipSync({
  'renewal-risk-brief/.claude-plugin/plugin.json': strToU8(JSON.stringify({ name: 'renewal-risk-brief', version: '0.5.3' })),
  'renewal-risk-brief/README.md': strToU8('# Renewal risk brief\n\nVersion 0.5.3. Built on 10.5.3 data.\n'),
  'renewal-risk-brief/skills/renewal-risk-brief/SKILL.md': strToU8('---\nname: renewal-risk-brief\ndescription: "Builds the brief. Use when asked to run it."\nmetadata:\n  version: "0.5.3"\n---\n\n# Brief\n\nCall `fetch_records`.\n'),
  'renewal-risk-brief/skills/renewal-risk-brief/settings.json': strToU8('{\n  "population": { "maxReviewed": 40 }\n}\n'),
  'renewal-risk-brief/skills/renewal-risk-brief/assets/brief-template.html': strToU8('<html></html>'),
  'renewal-risk-brief/skills/renewal-risk-brief/assets/logo.png': new Uint8Array([137, 80, 78, 71, 0, 0]),
  'renewal-risk-brief/skills/renewal-risk-brief/scripts/check_fixtures.py': strToU8('import sys\nsys.exit(0)\n'),
  'renewal-risk-brief/skills/renewal-risk-brief/scripts/test_population.py': strToU8('import unittest\n'),
  '__MACOSX/renewal-risk-brief/._README.md': strToU8('x'),
});

describe('readPackage', () => {
  it('recognizes a Claude plugin, keeps binaries aside and drops OS clutter', async () => {
    const pkg = await readPackage(new File([claudeZip()], 'renewal-risk-brief-0.5.3.zip'));
    expect(pkg).toMatchObject({ platform: 'claude', name: 'renewal-risk-brief', version: '0.5.3', root: 'renewal-risk-brief', skillDir: 'skills/renewal-risk-brief/' });
    expect(Object.keys(pkg.binary)).toEqual(['skills/renewal-risk-brief/assets/logo.png']);
    expect(Object.keys(pkg.files).some((path) => path.includes('__MACOSX'))).toBe(false);
    expect(pkg.problems).toEqual([]);
  });

  it('recognizes a ChatGPT skill and refuses a folder with no SKILL.md', async () => {
    const skill = zipSync({ 'deal-review/SKILL.md': strToU8('---\nname: deal-review\ndescription: "x"\n---\nBody'), 'deal-review/agents/openai.yaml': strToU8('interface:\n') });
    expect((await readPackage(new File([skill], 'skill.zip')))).toMatchObject({ platform: 'chatgpt', name: 'deal-review', skillDir: '' });
    const none = zipSync({ 'notes/readme.md': strToU8('hi') });
    expect((await readPackage(new File([none], 'x.zip'))).platform).toBeNull();
  });
});

describe('editing a package', () => {
  it('bumps the version in the manifest, SKILL.md and README, and zips it back in the same shape', async () => {
    const pkg = await readPackage(new File([claudeZip()], 'p.zip'));
    expect(nextPatch('0.5.3')).toBe('0.5.4');
    const files = applyVersion(pkg, { ...pkg.files }, '0.5.4');
    expect(JSON.parse(files['.claude-plugin/plugin.json']).version).toBe('0.5.4');
    expect(files['skills/renewal-risk-brief/SKILL.md']).toMatch(/version: "0\.5\.4"/);
    expect(files['README.md']).toBe('# Renewal risk brief\n\nVersion 0.5.4. Built on 10.5.3 data.\n');
    const entries = unzipSync(zipPackage(pkg, files));
    expect(Object.keys(entries)).toContain('renewal-risk-brief/skills/renewal-risk-brief/assets/logo.png');
    expect(Array.from(entries['renewal-risk-brief/skills/renewal-risk-brief/assets/logo.png'])).toEqual([137, 80, 78, 71, 0, 0]);
    expect(checkPackage(pkg, files).every((check) => check.passed)).toBe(true);
  });

  it('fails the checks when a locked file, JSON or the versions break', async () => {
    const pkg = await readPackage(new File([claudeZip()], 'p.zip'));
    const files = { ...pkg.files, 'skills/renewal-risk-brief/assets/brief-template.html': '<html>changed</html>', 'skills/renewal-risk-brief/settings.json': '{ nope' };
    const failed = checkPackage(pkg, files).filter((check) => !check.passed).map((check) => check.name);
    expect(failed).toEqual(expect.arrayContaining(['JSON files', 'Fixed files']));
  });

  it('finds the package\'s own tests', async () => {
    const pkg = await readPackage(new File([claudeZip()], 'p.zip'));
    expect(packageTests(pkg, pkg.files)).toEqual([
      { kind: 'script', path: 'skills/renewal-risk-brief/scripts/check_fixtures.py', args: ['--out', '/tmp/fixtures'] },
      { kind: 'unittest', path: 'skills/renewal-risk-brief/scripts/test_population.py', name: 'population' },
    ]);
  });

  it('diffs by line, with hunks around each change', () => {
    const before = Array.from({ length: 30 }, (_, index) => `line ${index}`).join('\n');
    const after = before.replace('line 5', 'line five').replace('line 25', 'line 25\nextra');
    const diff = lineDiff(before, after);
    expect(diff).toMatchObject({ added: 2, removed: 1 });
    expect(diff.hunks).toHaveLength(2);
    expect(diff.hunks[0].find((line) => line.type === 'add')).toMatchObject({ text: 'line five', b: 6 });
  });
});

const python = spawnSync('python3', ['--version']).status === 0;
describe.skipIf(!python)('running a package script', () => {
  it('reports the exit code and output of a script run from the package', () => {
    const root = mkdtempSync(join(tmpdir(), 'pkg-'));
    const path = 'skills/x/scripts/check_fixtures.py';
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), 'import sys\nprint("cases", sys.argv[1:])\nsys.exit(3)\n');
    const program = `ROOT = ${JSON.stringify(root)}\nPATH = ${JSON.stringify(path)}\nARGV = ["--out", "/tmp/x"]\n${RUN_SCRIPT_PY}\nprint(json.dumps(_run_script(ROOT, PATH, ARGV)))`;
    const result = JSON.parse(execFileSync('python3', ['-c', program]).toString().trim().split('\n').pop());
    expect(result).toEqual({ exitCode: 3, output: "cases ['--out', '/tmp/x']\n" });
  });
});

describe('problems the upload already had', () => {
  it('names every file a failing check is about', async () => {
    const pkg = await readPackage(new File([claudeZip()], 'p.zip'));
    const files = { ...pkg.files, 'skills/renewal-risk-brief/references/a.md': 'Ask SalesAI.', 'skills/renewal-risk-brief/references/b.md': 'SalesAI again.' };
    const wording = checkPackage(pkg, files).find((check) => check.name === 'Wording');
    expect(wording.paths).toEqual(['skills/renewal-risk-brief/references/a.md', 'skills/renewal-risk-brief/references/b.md']);
  });
});
