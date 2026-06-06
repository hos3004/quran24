import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_STALE_AFTER_SEC = 45;
const MAX_DEVICES = 200;
const MAX_EVENTS = 200;
const SAFE_DEVICE_ID = /^[A-Za-z0-9._:-]{3,96}$/;
const PLAY_STATES = new Set(['idle', 'loading', 'playing', 'error', 'unknown']);
const SOURCES = new Set(['web-runtime', 'android-tv', 'admin', 'unknown']);
const CLOCK_SOURCES = new Set(['server', 'local', 'unknown']);
const DATA_SOURCES = new Set(['network', 'cache', 'pending', 'unknown']);

export function createTelemetryStore({ rootDir, logger = () => {}, now = () => new Date() }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const telemetryPath = join(channelDir, 'telemetry.json');

  function loadTelemetry() {
    if (!existsSync(telemetryPath)) return emptyTelemetry();

    try {
      return normalizeTelemetry(JSON.parse(readFileSync(telemetryPath, 'utf8').replace(/^\uFEFF/, '')));
    } catch (error) {
      logger('warn', 'telemetry_read_failed', { message: error.message });
      return emptyTelemetry();
    }
  }

  function writeTelemetry(data) {
    mkdirSync(channelDir, { recursive: true });
    const next = {
      version: 1,
      updatedAt: now().toISOString(),
      devices: data.devices,
      recentEvents: data.recentEvents.slice(0, MAX_EVENTS)
    };
    const tempPath = `${telemetryPath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(next, null, 2), 'utf8');
    renameSync(tempPath, telemetryPath);
  }

  function recordHeartbeat(payload = {}, context = {}) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Telemetry heartbeat must be an object');
    }

    const store = loadTelemetry();
    const serverNow = now();
    const serverNowIso = serverNow.toISOString();
    const deviceId = resolveDeviceId(payload.deviceId, context);
    const current = store.devices[deviceId] ?? null;
    const heartbeat = sanitizeHeartbeat(payload);
    const device = {
      deviceId,
      deviceLabel: sanitizeString(payload.deviceLabel, 120) || current?.deviceLabel || 'Quran24 device',
      source: sanitizeEnum(payload.source, SOURCES, 'unknown'),
      firstSeenAt: current?.firstSeenAt || serverNowIso,
      lastSeenAt: serverNowIso,
      heartbeatCount: Number(current?.heartbeatCount || 0) + 1,
      client: {
        userAgentHash: context.userAgent ? shortHash(context.userAgent) : current?.client?.userAgentHash ?? null,
        addressHash: context.remoteAddress ? shortHash(context.remoteAddress) : current?.client?.addressHash ?? null
      },
      lastHeartbeat: heartbeat
    };

    store.devices[deviceId] = device;
    trimDevices(store, serverNow);
    store.recentEvents = [
      {
        type: 'heartbeat',
        time: serverNowIso,
        deviceId,
        currentItemId: heartbeat.currentItemId ?? null,
        playState: heartbeat.playState,
        scheduleVersion: heartbeat.scheduleVersion ?? null
      },
      ...store.recentEvents
    ].slice(0, MAX_EVENTS);

    writeTelemetry(store);
    logger('info', 'telemetry_heartbeat', {
      deviceId,
      playState: heartbeat.playState,
      currentItemId: heartbeat.currentItemId ?? null
    });

    return {
      ok: true,
      device: withAge(device, serverNow),
      totalDevices: Object.keys(store.devices).length
    };
  }

  function getStatus() {
    const serverNow = now();
    const store = loadTelemetry();
    const devices = Object.values(store.devices)
      .map((device) => withAge(device, serverNow))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

    return {
      ok: true,
      generatedAt: serverNow.toISOString(),
      staleAfterSec: DEFAULT_STALE_AFTER_SEC,
      totalDevices: devices.length,
      onlineDevices: devices.filter((device) => !device.stale).length,
      devices,
      recentEvents: store.recentEvents.slice(0, MAX_EVENTS)
    };
  }

  return {
    telemetryPath,
    getStatus,
    loadTelemetry,
    recordHeartbeat
  };
}

function emptyTelemetry() {
  return {
    version: 1,
    updatedAt: null,
    devices: {},
    recentEvents: []
  };
}

function normalizeTelemetry(data) {
  const normalized = emptyTelemetry();
  if (data && typeof data === 'object' && data.devices && typeof data.devices === 'object') {
    normalized.devices = Object.fromEntries(
      Object.entries(data.devices)
        .filter(([deviceId, device]) => SAFE_DEVICE_ID.test(deviceId) && device && typeof device === 'object')
        .slice(0, MAX_DEVICES)
    );
  }
  if (Array.isArray(data?.recentEvents)) {
    normalized.recentEvents = data.recentEvents
      .filter((event) => event && typeof event === 'object')
      .slice(0, MAX_EVENTS);
  }
  return normalized;
}

function sanitizeHeartbeat(payload) {
  return {
    clientTimestamp: sanitizeClientTimestamp(payload.timestamp ?? payload.clientTimestamp),
    currentItemId: sanitizeString(payload.currentItemId, 120) || undefined,
    currentPage: sanitizeInteger(payload.currentPage, 1, 604),
    playState: sanitizeEnum(payload.playState, PLAY_STATES, 'unknown'),
    scheduleVersion: sanitizeInteger(payload.scheduleVersion, 1, 1_000_000),
    offsetSec: sanitizeFiniteNumber(payload.offsetSec, 0, 86_400),
    clockSource: sanitizeEnum(payload.clockSource, CLOCK_SOURCES, undefined),
    scheduleSource: sanitizeEnum(payload.scheduleSource, DATA_SOURCES, undefined),
    manifestSource: sanitizeEnum(payload.manifestSource, DATA_SOURCES, undefined),
    manifestPageCount: sanitizeInteger(payload.manifestPageCount, 0, 604),
    androidBridgeAvailable: typeof payload.androidBridgeAvailable === 'boolean'
      ? payload.androidBridgeAvailable
      : undefined,
    lastCommandType: sanitizeString(payload.lastCommandType, 80) || undefined
  };
}

function resolveDeviceId(input, context) {
  const candidate = sanitizeString(input, 96);
  if (candidate && SAFE_DEVICE_ID.test(candidate)) return candidate;

  const fingerprint = [
    context.userAgent || 'unknown-user-agent',
    context.remoteAddress || 'unknown-address'
  ].join('|');
  return `device-${shortHash(fingerprint)}`;
}

function trimDevices(store, serverNow) {
  const devices = Object.values(store.devices)
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, MAX_DEVICES);
  store.devices = Object.fromEntries(devices.map((device) => [device.deviceId, stripAge(device)]));

  for (const device of Object.values(store.devices)) {
    const aged = withAge(device, serverNow);
    store.devices[device.deviceId] = stripAge(aged);
  }
}

function withAge(device, serverNow) {
  const lastSeenMs = Date.parse(device.lastSeenAt);
  const ageSec = Number.isFinite(lastSeenMs)
    ? Math.max(0, Math.floor((serverNow.getTime() - lastSeenMs) / 1000))
    : null;
  return {
    ...device,
    ageSec,
    stale: ageSec === null ? true : ageSec > DEFAULT_STALE_AFTER_SEC
  };
}

function stripAge(device) {
  const { ageSec: _ageSec, stale: _stale, ...rest } = device;
  return rest;
}

function sanitizeString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\0/g, '').trim().slice(0, maxLength);
}

function sanitizeEnum(value, allowed, fallback) {
  const normalized = sanitizeString(value, 80);
  if (allowed.has(normalized)) return normalized;
  return fallback;
}

function sanitizeInteger(value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) return undefined;
  return value;
}

function sanitizeFiniteNumber(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function sanitizeClientTimestamp(value) {
  if (Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value;
  return undefined;
}

function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}
