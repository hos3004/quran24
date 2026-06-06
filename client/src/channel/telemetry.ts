import { hasAndroidBridge } from './bridge/androidBridge';

const DEVICE_ID_KEY = 'quran24:telemetry-device-id:v1';
const DEVICE_LABEL_KEY = 'quran24:telemetry-device-label:v1';

export type RuntimeTelemetryHeartbeat = {
  currentItemId?: string;
  currentPage?: number;
  playState: 'idle' | 'loading' | 'playing' | 'error';
  scheduleVersion?: number;
  offsetSec?: number;
  clockSource?: 'server' | 'local' | null;
  scheduleSource?: 'network' | 'cache' | null;
  manifestSource?: 'network' | 'cache' | null;
  manifestPageCount?: number;
  lastCommandType?: string;
};

export async function postRuntimeTelemetry(heartbeat: RuntimeTelemetryHeartbeat) {
  const payload = {
    deviceId: getTelemetryDeviceId(),
    deviceLabel: getTelemetryDeviceLabel(),
    source: 'web-runtime',
    timestamp: Date.now(),
    androidBridgeAvailable: hasAndroidBridge(),
    currentItemId: heartbeat.currentItemId,
    currentPage: heartbeat.currentPage,
    playState: heartbeat.playState,
    scheduleVersion: heartbeat.scheduleVersion,
    offsetSec: heartbeat.offsetSec,
    clockSource: heartbeat.clockSource ?? undefined,
    scheduleSource: heartbeat.scheduleSource ?? undefined,
    manifestSource: heartbeat.manifestSource ?? undefined,
    manifestPageCount: heartbeat.manifestPageCount,
    lastCommandType: heartbeat.lastCommandType
  };
  const body = JSON.stringify(payload);
  const response = await fetch('/api/telemetry/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: body.length < 60_000
  });

  return response.ok;
}

export function getTelemetryDeviceId() {
  const existing = readLocalStorage(DEVICE_ID_KEY);
  if (existing && /^[A-Za-z0-9._:-]{3,96}$/.test(existing)) return existing;

  const generated = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeLocalStorage(DEVICE_ID_KEY, generated);
  return generated;
}

export function getTelemetryDeviceLabel() {
  return readLocalStorage(DEVICE_LABEL_KEY) || inferDeviceLabel();
}

function inferDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Quran24 Web Runtime';
  const userAgent = navigator.userAgent || '';
  if (/android/i.test(userAgent)) return 'Android TV WebView';
  return 'Quran24 Web Runtime';
}

function readLocalStorage(key: string) {
  try {
    return window.localStorage?.getItem(key)?.trim() || '';
  } catch {
    return '';
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // Telemetry still works for this page load; the server can derive a fallback id.
  }
}
