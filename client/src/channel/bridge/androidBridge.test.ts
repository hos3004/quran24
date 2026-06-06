import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  sendAndroidBridgeEvent,
  simulateWebRuntimeCommand,
  subscribeWebRuntimeCommands,
  type WebRuntimeCommand
} from './androidBridge';

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
    CustomEvent,
    ...overrides
  };

  vi.stubGlobal('window', win);
  return win as Window & typeof globalThis;
}

describe('android bridge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts serialized events to the Android bridge when present', () => {
    const postMessage = vi.fn();
    stubWindow({ Quran24Android: { postMessage } });

    const bridged = sendAndroidBridgeEvent({
      type: 'PLAY_VIDEO',
      itemId: 'video-1',
      source: 'https://example.com/video.mp4',
      title: 'Video',
      offsetSec: 12
    });

    expect(bridged).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(expect.stringContaining('"type":"PLAY_VIDEO"'));
  });

  it('dispatches a browser event when the Android bridge is unavailable', () => {
    const win = stubWindow();

    const bridged = sendAndroidBridgeEvent({
      type: 'PLAY_LIVE_STREAM',
      itemId: 'live-1',
      source: 'https://example.com/live.m3u8',
      title: 'Live'
    });

    expect(bridged).toBe(false);
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:android-bridge-event'
    }));
  });

  it('receives native commands through both the global function and browser event', () => {
    const win = stubWindow();
    const handler = vi.fn();
    const unsubscribe = subscribeWebRuntimeCommands(handler);
    const command: WebRuntimeCommand = { type: 'VIDEO_FINISHED', itemId: 'video-1' };

    win.quran24ReceiveCommand?.(JSON.stringify(command));
    simulateWebRuntimeCommand({ type: 'RELOAD_SCHEDULE' });
    unsubscribe();
    simulateWebRuntimeCommand({ type: 'RESUME_CHANNEL' });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, command);
    expect(handler).toHaveBeenNthCalledWith(2, { type: 'RELOAD_SCHEDULE' });
  });

  it('reports malformed native commands as runtime errors', () => {
    const win = stubWindow();
    const handler = vi.fn();

    subscribeWebRuntimeCommands(handler);
    win.quran24ReceiveCommand?.('{bad-json');

    expect(handler).not.toHaveBeenCalled();
    expect(win.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'quran24:android-bridge-event'
    }));
  });
});
