import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTelemetryDeviceId, postRuntimeTelemetry } from './telemetry';

function stubBrowser() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      }
    },
    Quran24Android: {
      postMessage: vi.fn()
    }
  });
  vi.stubGlobal('navigator', {
    userAgent: 'Android TV WebView'
  });
  return store;
}

describe('runtime telemetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists a stable telemetry device id', () => {
    const store = stubBrowser();
    const first = getTelemetryDeviceId();
    const second = getTelemetryDeviceId();

    expect(first).toBe(second);
    expect(store.get('quran24:telemetry-device-id:v1')).toBe(first);
  });

  it('posts runtime heartbeat telemetry', async () => {
    stubBrowser();
    const calls: [string, RequestInit][] = [];
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      calls.push([url, options]);
      return Promise.resolve({ ok: true } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await postRuntimeTelemetry({
      playState: 'playing',
      currentItemId: 'quran-fajr',
      currentPage: 4,
      scheduleVersion: 3,
      offsetSec: 25,
      clockSource: 'server',
      scheduleSource: 'network',
      manifestSource: 'network',
      manifestPageCount: 20,
      lastCommandType: 'RESUME_CHANNEL'
    });

    const [, options] = calls[0];
    const body = JSON.parse(String(options.body));
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/telemetry/heartbeat', expect.objectContaining({
      method: 'POST'
    }));
    expect(body.currentItemId).toBe('quran-fajr');
    expect(body.androidBridgeAvailable).toBe(true);
    expect(body.deviceLabel).toBe('Android TV WebView');
  });
});
