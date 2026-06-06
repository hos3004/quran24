import { beforeEach, describe, expect, it } from 'vitest';
import { loadCachedPayload, saveCachedPayload } from './offlineCache';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
          store.set(key, value);
        }
      }
    }
  });
});

describe('offline cache', () => {
  it('stores and loads cached payloads', () => {
    saveCachedPayload('schedule', { version: 3 });
    const cached = loadCachedPayload<{ version: number }>('schedule');

    expect(cached?.value.version).toBe(3);
    expect(cached?.savedAt).toEqual(expect.any(String));
  });

  it('drops malformed payloads', () => {
    store.set('schedule', '{bad-json');

    expect(loadCachedPayload('schedule')).toBeNull();
    expect(store.has('schedule')).toBe(false);
  });
});
