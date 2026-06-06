import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildMediaIndex, isSafeAssetReference } from '../server/channel/mediaScanner.mjs';
import { normalizeReciters, validateReciters } from '../server/channel/reciterStore.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

test('media scanner summarizes seeded assets and missing audio', () => {
  const index = buildMediaIndex(ROOT);
  assert.equal(index.summary.quranPageImages, 20);
  assert.equal(index.summary.quranPageMetadata, 20);
  assert.equal(index.summary.reciterAudio, 3);
  assert.equal(index.summary.breakSlides, 2);
  assert.equal(index.missingFiles.some((missing) => missing.path.includes('/assets/reciters/ajmy/Page004.mp3')), true);
});

test('media scanner rejects unsafe asset references', () => {
  assert.equal(isSafeAssetReference('/assets/slides/dua-1.jpeg'), true);
  assert.equal(isSafeAssetReference('data/assets/slides/dua-1.jpeg'), true);
  assert.equal(isSafeAssetReference('../secret.mp3'), false);
  assert.equal(isSafeAssetReference('file:///etc/passwd'), false);
  assert.equal(isSafeAssetReference('C:\\media\\secret.mp4'), false);
});

test('reciter validation rejects unsafe payloads', () => {
  const result = validateReciters({
    audioRootDir: '../secret',
    activeReciterId: 'missing',
    reciters: [
      {
        id: 'bad/id',
        name: 'Bad',
        folderName: '../bad',
        audioDir: 'C:\\unsafe'
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /audioRootDir/);
  assert.match(result.errors.join('\n'), /folderName/);
  assert.match(result.errors.join('\n'), /audioDir/);
});

test('reciter normalization keeps audio dirs under data reciters', () => {
  const normalized = normalizeReciters({
    audioRootDir: 'data/reciters',
    activeReciterId: 'ajmy',
    reciters: [
      {
        id: 'ajmy',
        name: 'Ahmad Al Ajmy',
        folderName: 'ajmy',
        audioDir: 'C:\\unsafe'
      }
    ]
  });

  assert.equal(normalized.reciters[0].audioDir, 'data/reciters/ajmy');
});
