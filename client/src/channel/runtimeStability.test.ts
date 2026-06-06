import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRuntimeProgressWatchdog,
  installGlobalRuntimeErrorReporter,
  reportRuntimeError,
  requestRuntimeReload,
  resetRuntimeStabilityForTests
} from './runtimeStability';

function stubWindow(overrides: Partial<Window> = {}) {
  const listeners = new Map<string, EventListener[]>();
  const win = {
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((item) => item !== listener));
    }),
    dispatchEvent: vi.fn((event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    }),
    ...overrides
  };

  vi.stubGlobal('window', win);
  return {
    win: win as Window & typeof globalThis,
    listeners
  };
}

describe('runtime stability', () => {
  beforeEach(() => {
    resetRuntimeStabilityForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports runtime errors to Android with cooldown', () => {
    const postMessage = vi.fn();
    stubWindow({ Quran24Android: { postMessage } });

    expect(reportRuntimeError(new Error('boom'), { nowMs: 1000 })).toBe(true);
    expect(reportRuntimeError(new Error('boom'), { nowMs: 2000 })).toBe(false);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('"type":"RUNTIME_ERROR"'));
    expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('"message":"boom"'));
  });

  it('installs and removes global runtime error listeners', () => {
    const { win, listeners } = stubWindow();
    const unsubscribe = installGlobalRuntimeErrorReporter();

    listeners.get('error')?.[0]?.({ message: 'window blew up' } as ErrorEvent);
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:android-bridge-event'
    }));

    unsubscribe();
    expect(win.removeEventListener).toHaveBeenCalledWith('error', expect.any(Function));
    expect(win.removeEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
  });

  it('requests reload through the bridge event path', () => {
    const { win } = stubWindow();

    expect(requestRuntimeReload('manual runtime reload', { nowMs: 1000 })).toBe(true);
    expect(requestRuntimeReload('manual runtime reload', { nowMs: 2000 })).toBe(false);
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:android-bridge-event'
    }));
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:runtime-reload-requested'
    }));
  });

  it('turns stalled loading into one reload request', () => {
    const { win } = stubWindow();
    let now = 0;
    const watchdog = createRuntimeProgressWatchdog({
      loadingStallMs: 1000,
      now: () => now
    });

    expect(watchdog.update({ playState: 'loading' })).toBe(false);
    now = 999;
    expect(watchdog.update({ playState: 'loading' })).toBe(false);
    now = 1000;
    expect(watchdog.update({ playState: 'loading' })).toBe(true);
    now = 2000;
    expect(watchdog.update({ playState: 'loading' })).toBe(false);
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:runtime-reload-requested'
    }));
  });
});
