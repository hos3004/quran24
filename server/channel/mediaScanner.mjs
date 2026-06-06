import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg']);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.mkv']);

export function createMediaScanner({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const mediaIndexPath = join(channelDir, 'media-index.json');

  function loadMediaIndex() {
    if (!existsSync(mediaIndexPath)) return scanMedia({ persist: false });
    return JSON.parse(readFileSync(mediaIndexPath, 'utf8').replace(/^\uFEFF/, ''));
  }

  function scanMedia(options = {}) {
    mkdirSync(channelDir, { recursive: true });
    const index = buildMediaIndex(rootDir);

    if (options.persist !== false) {
      writeFileSync(mediaIndexPath, JSON.stringify(index, null, 2), 'utf8');
      logger('info', 'media_index_saved', {
        path: 'data/channel/media-index.json',
        quranPageImages: index.summary.quranPageImages,
        reciterAudio: index.summary.reciterAudio,
        missingFiles: index.summary.missingFiles
      });
    }

    return index;
  }

  return {
    mediaIndexPath,
    loadMediaIndex,
    scanMedia
  };
}

export function buildMediaIndex(rootDir) {
  const roots = {
    quranPages: 'data/assets/hafs',
    reciterAudio: 'data/reciters',
    breakSlides: 'data/assets/slides',
    audioMessages: 'data/assets/audio',
    videos: 'data/assets/videos'
  };

  const quranPageImages = listFiles(rootDir, roots.quranPages, IMAGE_EXTENSIONS).map((file) => ({
    page: pageFromFile(file.path),
    path: file.assetPath,
    bytes: file.bytes
  }));
  const quranPageMetadata = listFiles(rootDir, roots.quranPages, new Set(['.json'])).map((file) => ({
    page: pageFromFile(file.path),
    path: file.assetPath,
    bytes: file.bytes
  }));
  const reciterAudio = summarizeReciterAudio(listFiles(rootDir, roots.reciterAudio, AUDIO_EXTENSIONS));
  const breakSlides = listFiles(rootDir, roots.breakSlides, IMAGE_EXTENSIONS).map(publicFile);
  const audioMessages = listFiles(rootDir, roots.audioMessages, AUDIO_EXTENSIONS).map(publicFile);
  const videos = listFiles(rootDir, roots.videos, VIDEO_EXTENSIONS).map(publicFile);
  const missingFiles = findMissingReferences(rootDir);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    roots,
    summary: {
      quranPageImages: quranPageImages.length,
      quranPageMetadata: quranPageMetadata.length,
      reciterAudio: reciterAudio.reduce((total, reciter) => total + reciter.fileCount, 0),
      breakSlides: breakSlides.length,
      audioMessages: audioMessages.length,
      videos: videos.length,
      missingFiles: missingFiles.length
    },
    categories: {
      quranPageImages,
      quranPageMetadata,
      reciterAudio,
      breakSlides,
      audioMessages,
      videos
    },
    missingFiles
  };
}

function listFiles(rootDir, relativeRoot, allowedExtensions) {
  const absoluteRoot = resolve(rootDir, relativeRoot);
  if (!isInsideRoot(rootDir, absoluteRoot) || !existsSync(absoluteRoot)) return [];

  const files = [];
  walk(absoluteRoot, (filePath) => {
    const extension = extname(filePath).toLowerCase();
    if (!allowedExtensions.has(extension)) return;
    const rel = relative(rootDir, filePath).replace(/\\/g, '/');
    files.push({
      path: rel,
      assetPath: toAssetPath(rel),
      bytes: statSync(filePath).size
    });
  });
  return files;
}

function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visit);
    } else if (entry.isFile() || isSymlinkToFile(fullPath, entry)) {
      visit(fullPath);
    }
  }
}

function isSymlinkToFile(filePath, entry) {
  if (!entry.isSymbolicLink()) return false;
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function summarizeReciterAudio(files) {
  const byReciter = new Map();
  for (const file of files) {
    const parts = file.path.split('/');
    const reciterId = parts[2] || 'unknown';
    const current = byReciter.get(reciterId) ?? {
      reciterId,
      fileCount: 0,
      totalBytes: 0,
      samplePath: file.assetPath
    };
    current.fileCount += 1;
    current.totalBytes += file.bytes;
    byReciter.set(reciterId, current);
  }
  return [...byReciter.values()].sort((a, b) => a.reciterId.localeCompare(b.reciterId));
}

function findMissingReferences(rootDir) {
  const missing = [];
  const manifest = readJson(rootDir, 'data/manifest.json', []);
  const schedule = readJson(rootDir, 'data/channel/schedule.json', null);

  if (Array.isArray(manifest)) {
    for (const entry of manifest) {
      addMissingIfNeeded(rootDir, missing, 'manifest', `page-${entry.page}`, entry.imagePath);
      addMissingIfNeeded(rootDir, missing, 'manifest', `page-${entry.page}`, entry.jsonPath);
      addMissingIfNeeded(rootDir, missing, 'manifest', `page-${entry.page}`, entry.audioPath);
    }
  }

  for (const item of collectScheduleItems(schedule)) {
    if (Array.isArray(item.slides)) {
      item.slides.forEach((slide) => addMissingIfNeeded(rootDir, missing, 'schedule', item.id, slide));
    }
    addMissingIfNeeded(rootDir, missing, 'schedule', item.id, item.audio);
    addMissingIfNeeded(rootDir, missing, 'schedule', item.id, item.source);
  }

  return missing;
}

function addMissingIfNeeded(rootDir, missing, source, ownerId, value) {
  if (typeof value !== 'string' || value.trim() === '') return;
  if (/^https?:\/\//i.test(value)) return;
  const resolved = resolveAssetReference(rootDir, value);
  if (!resolved || existsSync(resolved)) return;
  missing.push({
    source,
    ownerId,
    path: value,
    reason: 'not-found'
  });
}

function collectScheduleItems(schedule) {
  if (!schedule?.days || typeof schedule.days !== 'object') return [];
  return Object.values(schedule.days).flatMap((items) => Array.isArray(items) ? items : []);
}

function resolveAssetReference(rootDir, value) {
  if (!isSafeAssetReference(value)) return null;
  if (value.startsWith('/assets/reciters/')) {
    return resolve(rootDir, 'data/reciters', value.slice('/assets/reciters/'.length));
  }
  if (value.startsWith('/assets/')) {
    return resolve(rootDir, 'data/assets', value.slice('/assets/'.length));
  }
  if (value.startsWith('data/')) {
    return resolve(rootDir, value);
  }
  return null;
}

export function isSafeAssetReference(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (normalized.includes('\0')) return false;
  if (normalized.includes('\\')) return false;
  if (normalized.includes('../') || normalized.includes('..\\')) return false;
  if (lower.startsWith('file://')) return false;
  if (/^[a-z]:[\\/]/i.test(normalized)) return false;
  return normalized.startsWith('/assets/') || normalized.startsWith('data/');
}

function readJson(rootDir, relativePath, fallback) {
  const path = resolve(rootDir, relativePath);
  if (!isInsideRoot(rootDir, path) || !existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function publicFile(file) {
  return {
    path: file.assetPath,
    bytes: file.bytes
  };
}

function toAssetPath(relativePath) {
  if (relativePath.startsWith('data/reciters/')) {
    return `/assets/reciters/${relativePath.slice('data/reciters/'.length)}`;
  }
  if (relativePath.startsWith('data/assets/')) {
    return `/assets/${relativePath.slice('data/assets/'.length)}`;
  }
  return relativePath;
}

function pageFromFile(path) {
  const match = /(\d{3})\.[^.]+$/.exec(path);
  return match ? Number(match[1]) : null;
}

function isInsideRoot(rootDir, candidatePath) {
  const relativePath = relative(resolve(rootDir), resolve(candidatePath));
  return relativePath === '' || (!relativePath.startsWith('..') && !relativePath.startsWith('/'));
}
