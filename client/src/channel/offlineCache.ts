export type CachedPayload<T> = {
  savedAt: string;
  value: T;
};

export function saveCachedPayload<T>(key: string, value: T) {
  const storage = getLocalStorage();
  if (!storage) return;

  const payload: CachedPayload<T> = {
    savedAt: new Date().toISOString(),
    value
  };
  storage.setItem(key, JSON.stringify(payload));
}

export function loadCachedPayload<T>(key: string): CachedPayload<T> | null {
  const storage = getLocalStorage();
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) return null;
    return parsed;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
