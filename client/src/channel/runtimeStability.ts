import { sendAndroidBridgeEvent } from './bridge/androidBridge';

const ERROR_COOLDOWN_MS = 30_000;
const RELOAD_COOLDOWN_MS = 30_000;
const DEFAULT_LOADING_STALL_MS = 60_000;
const MAX_MESSAGE_CHARS = 360;

type RuntimeProgressState = {
  playState: 'idle' | 'loading' | 'playing' | 'error';
  currentItemId?: string;
  currentPage?: number;
};

type RuntimeReportOptions = {
  itemId?: string;
  force?: boolean;
  nowMs?: number;
};

type RuntimeReloadOptions = {
  force?: boolean;
  nowMs?: number;
};

let lastErrorKey = '';
let lastErrorAt = 0;
let lastReloadReason = '';
let lastReloadAt = 0;

export function reportRuntimeError(input: unknown, options: RuntimeReportOptions = {}) {
  if (typeof window === 'undefined') return false;

  const nowMs = options.nowMs ?? Date.now();
  const message = normalizeRuntimeErrorMessage(input);
  const key = `${options.itemId ?? ''}:${message}`;
  if (!options.force && key === lastErrorKey && nowMs - lastErrorAt < ERROR_COOLDOWN_MS) {
    return false;
  }

  lastErrorKey = key;
  lastErrorAt = nowMs;
  const event = {
    type: 'RUNTIME_ERROR' as const,
    message,
    itemId: options.itemId
  };
  const delivered = sendAndroidBridgeEvent(event);
  window.dispatchEvent(new CustomEvent('quran24:runtime-error', {
    detail: { ...event, delivered }
  }));
  return true;
}

export function requestRuntimeReload(reason: string, options: RuntimeReloadOptions = {}) {
  if (typeof window === 'undefined') return false;

  const nowMs = options.nowMs ?? Date.now();
  const normalizedReason = sanitizeRuntimeText(reason, 120) || 'runtime-reload';
  if (!options.force && normalizedReason === lastReloadReason && nowMs - lastReloadAt < RELOAD_COOLDOWN_MS) {
    return false;
  }

  lastReloadReason = normalizedReason;
  lastReloadAt = nowMs;
  const event = {
    type: 'REQUEST_RELOAD' as const,
    reason: normalizedReason
  };
  const delivered = sendAndroidBridgeEvent(event);
  window.dispatchEvent(new CustomEvent('quran24:runtime-reload-requested', {
    detail: { ...event, delivered }
  }));
  return true;
}

export function installGlobalRuntimeErrorReporter() {
  if (typeof window === 'undefined') return () => {};

  const onError = (event: ErrorEvent) => {
    reportRuntimeError(event.error ?? event.message ?? 'window error');
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportRuntimeError(event.reason ?? 'unhandled promise rejection');
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}

export function createRuntimeProgressWatchdog({
  loadingStallMs = DEFAULT_LOADING_STALL_MS,
  now = () => Date.now()
}: {
  loadingStallMs?: number;
  now?: () => number;
} = {}) {
  let lastKey = '';
  let lastChangedAt = now();
  let reported = false;

  return {
    update(state: RuntimeProgressState) {
      const nextKey = `${state.playState}:${state.currentItemId ?? 'none'}:${state.currentPage ?? 'none'}`;
      if (nextKey !== lastKey) {
        lastKey = nextKey;
        lastChangedAt = now();
        reported = false;
        return false;
      }

      if (state.playState !== 'loading' || reported || now() - lastChangedAt < loadingStallMs) {
        return false;
      }

      reported = true;
      reportRuntimeError('Channel runtime loading state stalled', {
        itemId: state.currentItemId,
        force: true,
        nowMs: now()
      });
      requestRuntimeReload('web_runtime_loading_stalled', {
        force: true,
        nowMs: now()
      });
      return true;
    }
  };
}

export function normalizeRuntimeErrorMessage(input: unknown) {
  if (input instanceof Error) return sanitizeRuntimeText(input.message || input.name, MAX_MESSAGE_CHARS);
  if (typeof input === 'string') return sanitizeRuntimeText(input, MAX_MESSAGE_CHARS);
  try {
    return sanitizeRuntimeText(JSON.stringify(input) ?? String(input), MAX_MESSAGE_CHARS);
  } catch {
    return 'Unknown runtime error';
  }
}

export function resetRuntimeStabilityForTests() {
  lastErrorKey = '';
  lastErrorAt = 0;
  lastReloadReason = '';
  lastReloadAt = 0;
}

function sanitizeRuntimeText(value: string, maxLength: number) {
  const cleaned = value.replace(/\0/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return cleaned || 'Unknown runtime error';
}
