import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

