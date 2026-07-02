// Persistence for the single shared Librarian conversation. All entry points
// are exception-safe: storage may be null (SSR/tests), full (quota), or
// blocked (privacy mode) — the chat then simply lives in memory.
export const STORAGE_KEY = 'backstory.chat.v1';
export const TURN_CAP = 40;

export function capTurns(turns, max = TURN_CAP) {
  if (!Array.isArray(turns)) return [];
  return turns.length > max ? turns.slice(turns.length - max) : turns;
}

export function loadTurns(storage) {
  try {
    const raw = storage && storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return capTurns(parsed.filter((t) => t && (t.role === 'user' || t.role === 'assistant')));
  } catch {
    return [];
  }
}

export function saveTurns(storage, turns) {
  try {
    if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(capTurns(turns)));
  } catch {
    /* quota / privacy mode — conversation stays in memory */
  }
}

export function clearTurns(storage) {
  try {
    if (storage) storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
