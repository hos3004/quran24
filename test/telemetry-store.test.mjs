import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createTelemetryStore } from '../server/channel/telemetryStore.mjs';

test('telemetry store records latest device heartbeat', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'quran24-telemetry-'));
  try {
    const store = createTelemetryStore({
      rootDir,
      now: () => new Date('2026-06-06T12:00:00.000Z')
    });

    const result = store.recordHeartbeat({
      deviceId: 'android-tv-1',
      deviceLabel: 'Main TV',
      source: 'web-runtime',
      playState: 'playing',
      currentItemId: 'quran-fajr',
      currentPage: 12,
      scheduleVersion: 3,
      clockSource: 'server',
      scheduleSource: 'network',
      manifestSource: 'network',
      androidBridgeAvailable: true
    }, {
      userAgent: 'Android WebView',
      remoteAddress: '127.0.0.1'
    });

    const status = store.getStatus();
    assert.equal(result.ok, true);
    assert.equal(existsSync(store.telemetryPath), true);
    assert.equal(status.totalDevices, 1);
    assert.equal(status.onlineDevices, 1);
    assert.equal(status.devices[0].deviceId, 'android-tv-1');
    assert.equal(status.devices[0].lastHeartbeat.currentItemId, 'quran-fajr');
    assert.equal(status.devices[0].lastHeartbeat.androidBridgeAvailable, true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('telemetry store sanitizes invalid ids and detects stale devices', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'quran24-telemetry-'));
  let now = new Date('2026-06-06T12:00:00.000Z');
  try {
    const store = createTelemetryStore({
      rootDir,
      now: () => now
    });

    store.recordHeartbeat({
      deviceId: '../bad-id',
      source: 'not-real',
      playState: 'invalid-state',
      currentPage: 999
    }, {
      userAgent: 'Browser',
      remoteAddress: '10.0.0.5'
    });

    now = new Date('2026-06-06T12:01:00.000Z');
    const status = store.getStatus();
    assert.match(status.devices[0].deviceId, /^device-/);
    assert.equal(status.devices[0].source, 'unknown');
    assert.equal(status.devices[0].lastHeartbeat.playState, 'unknown');
    assert.equal(status.devices[0].lastHeartbeat.currentPage, undefined);
    assert.equal(status.devices[0].stale, true);
    assert.equal(status.onlineDevices, 0);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
