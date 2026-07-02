import { describe, it, expect } from 'vitest';
import { STORAGE_KEY, TURN_CAP, capTurns, loadTurns, saveTurns, clearTurns } from '../chatStorage.js';

function memStorage(initial = {}) {
  const m = { ...initial };
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    _dump: () => m,
  };
}

describe('chatStorage', () => {
  it('round-trips turns through storage', () => {
    const s = memStorage();
    const turns = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello', recommendations: ['01-sales-digest'], draft: null, artifact: null },
    ];
    saveTurns(s, turns);
    expect(loadTurns(s)).toEqual(turns);
  });

  it('caps to the last TURN_CAP turns on save', () => {
    const s = memStorage();
    const turns = Array.from({ length: 50 }, (_, i) => ({ role: 'user', content: `m${i}` }));
    saveTurns(s, turns);
    const loaded = loadTurns(s);
    expect(loaded).toHaveLength(TURN_CAP);
    expect(loaded[0].content).toBe('m10');
    expect(loaded[TURN_CAP - 1].content).toBe('m49');
  });

  it('capTurns leaves short lists alone', () => {
    const t = [{ role: 'user', content: 'a' }];
    expect(capTurns(t)).toEqual(t);
    expect(capTurns([])).toEqual([]);
    expect(capTurns(null)).toEqual([]);
  });

  it('loadTurns returns [] on corrupt JSON, junk shapes, or a throwing storage', () => {
    expect(loadTurns(memStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([]);
    expect(loadTurns(memStorage({ [STORAGE_KEY]: '"a string"' }))).toEqual([]);
    expect(loadTurns(memStorage({ [STORAGE_KEY]: JSON.stringify([{ role: 'user', content: 'ok' }, { bogus: 1 }]) })))
      .toEqual([{ role: 'user', content: 'ok' }]);
    expect(loadTurns({ getItem() { throw new Error('denied'); } })).toEqual([]);
    expect(loadTurns(null)).toEqual([]);
  });

  it('saveTurns and clearTurns never throw, even on a broken storage', () => {
    expect(() => saveTurns({ setItem() { throw new Error('quota'); } }, [{ role: 'user', content: 'x' }])).not.toThrow();
    expect(() => saveTurns(null, [])).not.toThrow();
    expect(() => clearTurns({ removeItem() { throw new Error('denied'); } })).not.toThrow();
    expect(() => clearTurns(null)).not.toThrow();
  });

  it('clearTurns removes the key', () => {
    const s = memStorage();
    saveTurns(s, [{ role: 'user', content: 'x' }]);
    clearTurns(s);
    expect(loadTurns(s)).toEqual([]);
  });
});
