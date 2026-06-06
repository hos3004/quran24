import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('root package exposes required Phase 1 scripts', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  for (const script of ['dev', 'server', 'build', 'test', 'lint']) {
    assert.equal(typeof pkg.scripts[script], 'string');
    assert.notEqual(pkg.scripts[script].length, 0);
  }
});

test('client workspace is declared', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.deepEqual(pkg.workspaces, ['client']);
});

test('server declares Phase 2 health and status endpoints', () => {
  const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /\/api\/health/);
  assert.match(serverSource, /\/api\/channel\/status/);
});

test('server exposes non-mutating schedule validation endpoint', () => {
  const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /\/api\/channel\/schedule\/validate/);
});

test('server exposes Phase 10 media and reciter endpoints', () => {
  const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /\/api\/reciters/);
  assert.match(serverSource, /\/api\/media\/library/);
  assert.match(serverSource, /\/api\/media\/scan/);
});

test('Android TV Phase 18 local fallback and channel device APIs are present and reported', () => {
  const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /phase:\s*18/);
  assert.match(serverSource, /androidTvShell:\s*true/);
  assert.match(serverSource, /androidBridgeReceiver:\s*true/);
  assert.match(serverSource, /androidWatchdog:\s*true/);
  assert.match(serverSource, /nativeMedia3Playback:\s*true/);
  assert.match(serverSource, /nativeHlsPlayback:\s*true/);
  assert.match(serverSource, /webOfflineCache:\s*true/);
  assert.match(serverSource, /androidWebViewCacheFallback:\s*true/);
  assert.match(serverSource, /telemetryHeartbeatApi:\s*true/);
  assert.match(serverSource, /remoteDeviceStatus:\s*true/);
  assert.match(serverSource, /webRuntimeErrorReporter:\s*true/);
  assert.match(serverSource, /webRuntimeErrorBoundary:\s*true/);
  assert.match(serverSource, /webRuntimeStallWatchdog:\s*true/);
  assert.match(serverSource, /boundedTelemetryRetention:\s*true/);
  assert.match(serverSource, /religiousScheduleInsights:\s*true/);
  assert.match(serverSource, /fridayOverrideAwareness:\s*true/);
  assert.match(serverSource, /taraweehReadiness:\s*true/);
  assert.match(serverSource, /spiritualFillerInventory:\s*true/);
  assert.match(serverSource, /channelTelemetryAlias:\s*true/);
  assert.match(serverSource, /channelDevicesAlias:\s*true/);
  assert.match(serverSource, /remoteReloadCommand:\s*true/);
  assert.match(serverSource, /webViewAssetLoader:\s*true/);
  assert.match(serverSource, /bundledFallbackScreen:\s*true/);
  assert.match(serverSource, /\/api\/channel\/religious-schedule/);
  assert.match(serverSource, /\/api\/telemetry\/heartbeat/);
  assert.match(serverSource, /\/api\/telemetry\/devices/);
  assert.match(serverSource, /\/api\/channel\/telemetry/);
  assert.match(serverSource, /\/api\/channel\/devices/);
  assert.match(serverSource, /\/api\/channel\/reload-device/);
  assert.equal(existsSync(new URL('../android-tv/app/src/main/AndroidManifest.xml', import.meta.url)), true);
  assert.equal(
    existsSync(new URL('../android-tv/app/src/main/kotlin/com/quran24/tv/MainActivity.kt', import.meta.url)),
    true
  );
});
