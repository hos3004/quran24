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

test('Android TV Phase 11 shell is present and reported', () => {
  const serverSource = readFileSync(new URL('../server/index.mjs', import.meta.url), 'utf8');
  assert.match(serverSource, /phase:\s*11/);
  assert.match(serverSource, /androidTvShell:\s*true/);
  assert.equal(existsSync(new URL('../android-tv/app/src/main/AndroidManifest.xml', import.meta.url)), true);
  assert.equal(
    existsSync(new URL('../android-tv/app/src/main/kotlin/com/quran24/tv/MainActivity.kt', import.meta.url)),
    true
  );
});
