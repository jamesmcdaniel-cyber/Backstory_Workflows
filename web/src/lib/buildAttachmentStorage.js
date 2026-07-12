const DB_NAME = 'backstory-assistant';
const STORE_NAME = 'build-state';
const RECORD_KEY = 'format-examples';

function openDatabase() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDatabase();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadBuildAttachments() {
  try {
    const value = await withStore('readonly', (store) => store.get(RECORD_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function saveBuildAttachments(attachments) {
  try {
    await withStore('readwrite', (store) => store.put(Array.isArray(attachments) ? attachments : [], RECORD_KEY));
  } catch {
    /* build continues in memory when IndexedDB is unavailable */
  }
}

export async function clearBuildAttachments() {
  try {
    await withStore('readwrite', (store) => store.delete(RECORD_KEY));
  } catch {
    /* ignore */
  }
}
