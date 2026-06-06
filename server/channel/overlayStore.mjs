import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_OVERLAYS = {
  version: 1,
  logo: {
    enabled: true,
    text: 'Quran24',
    subtext: 'قناة القرآن',
    imagePath: '',
    position: 'top-right'
  },
  ticker: {
    enabled: true,
    welcomeText: 'مرحبا بكم في قناة Quran24',
    todayPrefix: 'تشاهدون اليوم',
    includeTodaySchedule: true,
    speedSec: 58
  },
  extraImage: {
    enabled: false,
    imagePath: '',
    alt: 'Channel overlay',
    position: 'bottom-right',
    widthPx: 260
  }
};

const POSITIONS = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

export function createOverlayStore({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const overlaysPath = join(channelDir, 'overlays.json');

  function ensureStore() {
    mkdirSync(channelDir, { recursive: true });
    if (!existsSync(overlaysPath)) {
      writeFileSync(overlaysPath, JSON.stringify(DEFAULT_OVERLAYS, null, 2), 'utf8');
    }
  }

  function loadOverlays() {
    ensureStore();
    const overlays = normalizeOverlays(readJson(overlaysPath, DEFAULT_OVERLAYS));
    return {
      ok: true,
      overlays,
      validation: validateOverlays(overlays)
    };
  }

  function saveOverlays(candidate) {
    ensureStore();
    const overlays = normalizeOverlays(candidate);
    const validation = validateOverlays(overlays);
    if (!validation.ok) return { ok: false, overlays, validation };
    writeFileSync(overlaysPath, JSON.stringify(overlays, null, 2), 'utf8');
    logger('info', 'overlays_saved', { version: overlays.version });
    return { ok: true, overlays, validation };
  }

  return {
    overlaysPath,
    loadOverlays,
    saveOverlays,
    validateOverlays
  };
}

export function normalizeOverlays(candidate) {
  return {
    version: Number.isInteger(candidate?.version) && candidate.version > 0 ? candidate.version : 1,
    logo: {
      enabled: candidate?.logo?.enabled !== false,
      text: textOr(candidate?.logo?.text, DEFAULT_OVERLAYS.logo.text, 40),
      subtext: textOr(candidate?.logo?.subtext, DEFAULT_OVERLAYS.logo.subtext, 48),
      imagePath: safeAssetOrEmpty(candidate?.logo?.imagePath),
      position: POSITIONS.has(candidate?.logo?.position) ? candidate.logo.position : DEFAULT_OVERLAYS.logo.position
    },
    ticker: {
      enabled: candidate?.ticker?.enabled !== false,
      welcomeText: textOr(candidate?.ticker?.welcomeText, DEFAULT_OVERLAYS.ticker.welcomeText, 140),
      todayPrefix: textOr(candidate?.ticker?.todayPrefix, DEFAULT_OVERLAYS.ticker.todayPrefix, 80),
      includeTodaySchedule: candidate?.ticker?.includeTodaySchedule !== false,
      speedSec: clampNumber(candidate?.ticker?.speedSec, 20, 180, DEFAULT_OVERLAYS.ticker.speedSec)
    },
    extraImage: {
      enabled: candidate?.extraImage?.enabled === true,
      imagePath: safeAssetOrEmpty(candidate?.extraImage?.imagePath),
      alt: textOr(candidate?.extraImage?.alt, DEFAULT_OVERLAYS.extraImage.alt, 80),
      position: POSITIONS.has(candidate?.extraImage?.position) ? candidate.extraImage.position : DEFAULT_OVERLAYS.extraImage.position,
      widthPx: clampNumber(candidate?.extraImage?.widthPx, 96, 520, DEFAULT_OVERLAYS.extraImage.widthPx)
    }
  };
}

export function validateOverlays(overlays) {
  const errors = [];
  const warnings = [];
  if (!overlays || typeof overlays !== 'object' || Array.isArray(overlays)) {
    return { ok: false, errors: ['overlays payload must be an object'], warnings };
  }
  if (overlays.logo?.imagePath && !isSafeAssetReference(overlays.logo.imagePath)) errors.push('logo.imagePath must be a safe /assets path');
  if (overlays.extraImage?.imagePath && !isSafeAssetReference(overlays.extraImage.imagePath)) errors.push('extraImage.imagePath must be a safe /assets path');
  if (overlays.extraImage?.enabled && !overlays.extraImage.imagePath) warnings.push('extraImage is enabled but imagePath is empty');
  if (overlays.ticker?.enabled && !overlays.ticker.welcomeText && !overlays.ticker.includeTodaySchedule) warnings.push('ticker has no visible content');
  return { ok: errors.length === 0, errors, warnings };
}

function textOr(value, fallback, maxLength) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function safeAssetOrEmpty(value) {
  return isSafeAssetReference(value) ? value.trim() : '';
}

function isSafeAssetReference(value) {
  return typeof value === 'string'
    && value.startsWith('/assets/')
    && !value.includes('\\')
    && !value.includes('../')
    && !value.includes('\0');
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}
