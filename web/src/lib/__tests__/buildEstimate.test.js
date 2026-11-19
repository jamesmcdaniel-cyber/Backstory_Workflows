import { describe, expect, it } from 'vitest';
import { estimateBuild, formatElapsed, formatRemaining } from '../buildEstimate.js';

const T0 = 1_000_000;
const plugin = (tests = {}) => ({
  plan: [
    { path: 'SKILL.md' },
    { path: 'references/framework.md' },
    { path: 'scripts/population.py', kind: 'script', script: { name: 'population' } },
    { path: 'scripts/test_population.py', kind: 'test', script: { name: 'population' } },
  ],
  tests,
});

describe('estimateBuild', () => {
  it('counts down the design call, then the slowest file still writing', () => {
    const design = estimateBuild({ timing: { startedAt: T0 }, now: T0 + 30_000 });
    expect(design.phase).toBe('design');
    expect(design.remaining).toBeGreaterThan(200);
    const files = estimateBuild({
      plugin: plugin(),
      fileStatus: { 'SKILL.md': 'done', 'references/framework.md': 'writing', 'scripts/population.py': 'writing', 'scripts/test_population.py': 'done' },
      timing: { startedAt: T0, fileStarted: { 'references/framework.md': T0, 'scripts/population.py': T0 } },
      now: T0 + 30_000,
    });
    expect(files).toMatchObject({ phase: 'files', done: 2, total: 4, stalled: false });
    // The script has 80s left, then its tests and the Python download.
    expect(files.remaining).toBe(80 + 40 + 15);
  });

  it('adds a fix and a re-run for a failing test, and pauses on a failed file', () => {
    const done = { 'SKILL.md': 'done', 'references/framework.md': 'done', 'scripts/population.py': 'done', 'scripts/test_population.py': 'done' };
    const fixing = estimateBuild({ plugin: plugin({ population: { status: 'fixing', startedAt: T0 } }), fileStatus: done, timing: { startedAt: T0 }, now: T0 + 10_000 });
    expect(fixing).toMatchObject({ phase: 'tests', remaining: 40 + 40 });
    expect(estimateBuild({ plugin: plugin({ population: { status: 'passed' } }), fileStatus: done, timing: { startedAt: T0 }, now: T0 }).phase).toBe('ready');
    expect(estimateBuild({ plugin: plugin(), fileStatus: { ...done, 'SKILL.md': 'error' }, timing: { startedAt: T0 }, now: T0 }).stalled).toBe(true);
  });

  it('formats times for people', () => {
    expect(formatRemaining(200)).toBe('About 3 min left');
    expect(formatRemaining(70)).toBe('About a minute left');
    expect(formatRemaining(33)).toBe('About 30 sec left');
    expect(formatElapsed(125)).toBe('2:05');
  });
});
