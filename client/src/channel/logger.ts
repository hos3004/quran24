import { sendAndroidBridgeEvent } from './bridge/androidBridge';

export type RuntimeLogLevel = 'debug' | 'info' | 'warn' | 'error';

export type AndroidBridgeHeartbeat = {
  type: 'HEARTBEAT';
  timestamp: number;
  currentItemId?: string;
  currentPage?: number;
  playState?: string;
};

export function logRuntime(level: RuntimeLogLevel, event: string, fields: Record<string, unknown> = {}) {
  const payload = {
    level,
    event,
    time: new Date().toISOString(),
    scope: 'channel-runtime',
    ...fields
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export function emitHeartbeat(heartbeat: AndroidBridgeHeartbeat) {
  sendAndroidBridgeEvent(heartbeat);
  window.dispatchEvent(new CustomEvent('quran24:heartbeat', { detail: heartbeat }));
  logRuntime('info', 'heartbeat', heartbeat);
}
