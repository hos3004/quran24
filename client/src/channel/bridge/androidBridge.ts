export type AndroidBridgeEvent =
  | { type: 'HEARTBEAT'; timestamp: number; currentItemId?: string; currentPage?: number; playState?: string }
  | { type: 'PLAY_VIDEO'; itemId: string; source: string; title: string; offsetSec?: number }
  | { type: 'PLAY_LIVE_STREAM'; itemId: string; source: string; title: string }
  | { type: 'RUNTIME_ERROR'; message: string; itemId?: string }
  | { type: 'REQUEST_RELOAD'; reason: string };

export type WebRuntimeCommand =
  | { type: 'VIDEO_FINISHED'; itemId: string }
  | { type: 'VIDEO_FAILED'; itemId: string; message: string }
  | { type: 'RESUME_CHANNEL' }
  | { type: 'RELOAD_SCHEDULE' };

type AndroidPostMessageBridge = {
  postMessage: (message: string) => void;
};

declare global {
  interface Window {
    Quran24Android?: AndroidPostMessageBridge;
    AndroidBridge?: AndroidPostMessageBridge;
    quran24ReceiveCommand?: (command: WebRuntimeCommand | string) => void;
  }
}

export function hasAndroidBridge() {
  return Boolean(window.Quran24Android?.postMessage || window.AndroidBridge?.postMessage);
}

export function sendAndroidBridgeEvent(event: AndroidBridgeEvent) {
  const serialized = JSON.stringify(event);
  const bridge = window.Quran24Android ?? window.AndroidBridge;

  if (bridge?.postMessage) {
    bridge.postMessage(serialized);
    return true;
  }

  window.dispatchEvent(new CustomEvent('quran24:android-bridge-event', { detail: event }));
  return false;
}

export function subscribeWebRuntimeCommands(handler: (command: WebRuntimeCommand) => void) {
  const previousReceiver = window.quran24ReceiveCommand;

  window.quran24ReceiveCommand = (command: WebRuntimeCommand | string) => {
    dispatchCommand(command, handler);
  };

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<WebRuntimeCommand | string>;
    dispatchCommand(customEvent.detail, handler);
  };

  window.addEventListener('quran24:web-runtime-command', listener);

  return () => {
    window.removeEventListener('quran24:web-runtime-command', listener);
    window.quran24ReceiveCommand = previousReceiver;
  };
}

export function simulateWebRuntimeCommand(command: WebRuntimeCommand) {
  window.dispatchEvent(new CustomEvent('quran24:web-runtime-command', { detail: command }));
}

function dispatchCommand(command: WebRuntimeCommand | string, handler: (command: WebRuntimeCommand) => void) {
  try {
    handler(parseCommand(command));
  } catch (error) {
    sendAndroidBridgeEvent({
      type: 'RUNTIME_ERROR',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

function parseCommand(command: WebRuntimeCommand | string): WebRuntimeCommand {
  const parsed = typeof command === 'string' ? JSON.parse(command) : command;
  if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
    throw new Error('Invalid web runtime command');
  }
  return parsed as WebRuntimeCommand;
}
