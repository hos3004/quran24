import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DEFAULT_THEMES = {
  version: 1,
  activeThemeId: 'classic-gold',
  themes: [
    {
      id: 'classic-gold',
      name: 'Classic Gold',
      frame: '/assets/frames/frame-preset2.png',
      background: '#000000',
      quranZoom: 0.82,
      page: { x: 1036, y: 185, w: 825, h: 680 },
      info: { x: 470, y: 635, w: 500, h: 300 },
      tags: ['default', 'gold', 'day', 'night'],
      source: 'data/channel/themes.json'
    }
  ]
};

export function createThemeStore({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const themesPath = join(channelDir, 'themes.json');
  const scannedRoot = join(rootDir, 'data', 'assets', 'themes');

  function ensureStore() {
    mkdirSync(channelDir, { recursive: true });
    mkdirSync(scannedRoot, { recursive: true });
    if (!existsSync(themesPath)) {
      writeFileSync(themesPath, JSON.stringify(DEFAULT_THEMES, null, 2), 'utf8');
    }
  }

  function loadThemes() {
    ensureStore();
    const configured = normalizeThemes(readJson(themesPath, DEFAULT_THEMES));
    const scanned = scanThemeFolders({ persist: false });
    const byId = new Map();
    for (const theme of configured.themes) byId.set(theme.id, theme);
    for (const theme of scanned.discoveredThemes) byId.set(theme.id, theme);
    const themes = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    return {
      ok: true,
      version: configured.version,
      activeThemeId: themes.some((theme) => theme.id === configured.activeThemeId)
        ? configured.activeThemeId
        : themes[0]?.id ?? '',
      themes,
      discoveredAt: scanned.generatedAt,
      validation: validateThemes({ ...configured, themes })
    };
  }

  function saveThemes(candidate) {
    ensureStore();
    const normalized = normalizeThemes(candidate);
    const validation = validateThemes(normalized);
    if (!validation.ok) return { ok: false, validation };
    writeFileSync(themesPath, JSON.stringify(normalized, null, 2), 'utf8');
    logger('info', 'themes_saved', { count: normalized.themes.length });
    return { ok: true, ...loadThemes(), validation };
  }

  function scanThemeFolders(options = {}) {
    ensureStore();
    const discoveredThemes = [];
    if (existsSync(scannedRoot)) {
      for (const entry of readdirSync(scannedRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const themePath = join(scannedRoot, entry.name, 'theme.json');
        if (!existsSync(themePath)) continue;
        try {
          const theme = normalizeTheme(readJson(themePath, null), discoveredThemes.length, {
            folderName: entry.name,
            source: toDataPath(rootDir, themePath)
          });
          discoveredThemes.push(theme);
        } catch (error) {
          logger('warn', 'theme_scan_failed', { folder: entry.name, message: error.message });
        }
      }
    }

    const result = {
      ok: true,
      generatedAt: new Date().toISOString(),
      root: 'data/assets/themes',
      discoveredThemes,
      validation: validateThemes({ version: 1, activeThemeId: discoveredThemes[0]?.id ?? '', themes: discoveredThemes })
    };

    if (options.persist) {
      const current = loadConfiguredThemes();
      const byId = new Map(current.themes.map((theme) => [theme.id, theme]));
      for (const theme of discoveredThemes) byId.set(theme.id, theme);
      saveThemes({ ...current, themes: [...byId.values()] });
    }

    return result;
  }

  function loadConfiguredThemes() {
    ensureStore();
    return normalizeThemes(readJson(themesPath, DEFAULT_THEMES));
  }

  return {
    themesPath,
    scannedRoot,
    loadThemes,
    saveThemes,
    scanThemeFolders,
    validateThemes
  };
}

export function normalizeThemes(candidate) {
  const themes = Array.isArray(candidate?.themes)
    ? candidate.themes.map((theme, index) => normalizeTheme(theme, index))
    : DEFAULT_THEMES.themes;
  const activeThemeId = isSafeId(candidate?.activeThemeId) && themes.some((theme) => theme.id === candidate.activeThemeId)
    ? candidate.activeThemeId
    : themes[0]?.id ?? '';
  return {
    version: Number.isInteger(candidate?.version) && candidate.version > 0 ? candidate.version : 1,
    activeThemeId,
    themes
  };
}

function normalizeTheme(theme, index, scan = {}) {
  const id = isSafeId(theme?.id) ? theme.id : (isSafeId(scan.folderName) ? scan.folderName : `theme-${index + 1}`);
  const folderAssetRoot = scan.folderName ? `/assets/themes/${scan.folderName}` : null;
  return {
    id,
    name: isNonEmptyString(theme?.name) ? theme.name.trim() : `Theme ${index + 1}`,
    frame: normalizeAssetPath(theme?.frame, folderAssetRoot ? `${folderAssetRoot}/frame.png` : '/assets/frames/frame-preset2.png'),
    background: isNonEmptyString(theme?.background) ? theme.background.trim() : '#000000',
    quranZoom: Number.isFinite(theme?.quranZoom) ? Number(theme.quranZoom) : 0.82,
    page: normalizeRect(theme?.page, { x: 1036, y: 185, w: 825, h: 680 }),
    info: normalizeRect(theme?.info, { x: 470, y: 635, w: 500, h: 300 }),
    tags: Array.isArray(theme?.tags) ? theme.tags.filter(isSafeId).slice(0, 12) : [],
    source: scan.source || theme?.source || 'data/channel/themes.json'
  };
}

export function validateThemes(candidate) {
  const errors = [];
  const warnings = [];
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['themes payload must be an object'], warnings };
  }
  if (!Array.isArray(candidate.themes)) {
    errors.push('themes must be an array');
    return { ok: false, errors, warnings };
  }
  const ids = new Set();
  candidate.themes.forEach((theme, index) => {
    const prefix = `themes[${index}]`;
    if (!isSafeId(theme.id)) errors.push(`${prefix}.id must be lowercase letters, numbers, underscores, or hyphens`);
    if (ids.has(theme.id)) errors.push(`duplicate theme id: ${theme.id}`);
    ids.add(theme.id);
    if (!isNonEmptyString(theme.name)) errors.push(`${prefix}.name is required`);
    if (!isSafeAssetReference(theme.frame)) errors.push(`${prefix}.frame must be a safe /assets path`);
    for (const key of ['page', 'info']) validateRect(`${prefix}.${key}`, theme[key], errors);
    if (theme.quranZoom < 0.25 || theme.quranZoom > 2) warnings.push(`${prefix}.quranZoom is unusual`);
  });
  if (candidate.activeThemeId && !ids.has(candidate.activeThemeId)) {
    errors.push(`activeThemeId does not match any theme: ${candidate.activeThemeId}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

function normalizeRect(value, fallback) {
  return {
    x: numberOr(value?.x, fallback.x),
    y: numberOr(value?.y, fallback.y),
    w: numberOr(value?.w, fallback.w),
    h: numberOr(value?.h, fallback.h)
  };
}

function validateRect(prefix, value, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  for (const key of ['x', 'y', 'w', 'h']) {
    if (!Number.isFinite(value[key])) errors.push(`${prefix}.${key} must be a number`);
  }
  if (Number(value.w) <= 0 || Number(value.h) <= 0) errors.push(`${prefix}.w and ${prefix}.h must be positive`);
}

function normalizeAssetPath(value, fallback) {
  return isSafeAssetReference(value) ? value.trim() : fallback;
}

function isSafeAssetReference(value) {
  return typeof value === 'string'
    && value.startsWith('/assets/')
    && !value.includes('\\')
    && !value.includes('../')
    && !value.includes('\0');
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function toDataPath(rootDir, filePath) {
  return relative(rootDir, filePath).replace(/\\/g, '/');
}

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function isSafeId(value) {
  return typeof value === 'string' && /^[a-z0-9_-]+$/.test(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
