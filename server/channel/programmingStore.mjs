import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULT_PROGRAMMING_TEMPLATE = {
  version: 1,
  timezone: 'Europe/Istanbul',
  defaultFallbackItemId: 'fallback-quran',
  pageCursor: 1,
  rotation: {
    reciters: {
      mode: 'rotate',
      pool: ['ajmy', 'maher'],
      avoidImmediateRepeat: true
    },
    themes: {
      mode: 'rotate',
      pool: ['classic-gold'],
      avoidImmediateRepeat: true
    }
  },
  fillers: [
    {
      id: 'short-dua-break',
      type: 'break',
      title: 'Spiritual visual break',
      durationSec: 180,
      slides: ['/assets/slides/dua-1.jpeg', '/assets/slides/dua-2.jpeg']
    }
  ],
  blocks: [
    { id: 'fajr', title: 'Fajr Quran', start: '05:00:00', durationSec: 7200, fromPage: 1, toPage: 20, preferredTags: ['day'] },
    { id: 'morning', title: 'Morning Quran', start: '08:00:00', durationSec: 10800, fromPage: 1, toPage: 20, preferredTags: ['day'] },
    { id: 'afternoon', title: 'Afternoon Quran', start: '13:00:00', durationSec: 10800, fromPage: 1, toPage: 20, preferredTags: ['day'] },
    { id: 'evening', title: 'Evening Quran', start: '18:00:00', durationSec: 10800, fromPage: 1, toPage: 20, preferredTags: ['night'] },
    { id: 'night', title: 'Night Quran', start: '22:00:00', durationSec: 7200, fromPage: 1, toPage: 20, preferredTags: ['night'] }
  ],
  specialDays: {
    friday: {
      enabled: true,
      reminderItemIds: []
    },
    ramadan: {
      enabled: false,
      taraweehLiveStreamUrl: ''
    }
  }
};

export function createProgrammingStore({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const templatePath = join(channelDir, 'programming-template.json');

  function ensureStore() {
    mkdirSync(channelDir, { recursive: true });
    if (!existsSync(templatePath)) {
      writeFileSync(templatePath, JSON.stringify(DEFAULT_PROGRAMMING_TEMPLATE, null, 2), 'utf8');
    }
  }

  function loadTemplate() {
    ensureStore();
    return normalizeTemplate(JSON.parse(readFileSync(templatePath, 'utf8').replace(/^\uFEFF/, '')));
  }

  function saveTemplate(candidate) {
    ensureStore();
    const template = normalizeTemplate(candidate);
    const validation = validateTemplate(template);
    if (!validation.ok) return { ok: false, validation };
    writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');
    logger('info', 'programming_template_saved', { blockCount: template.blocks.length });
    return { ok: true, template, validation };
  }

  return {
    templatePath,
    loadTemplate,
    saveTemplate,
    validateTemplate
  };
}

export function normalizeTemplate(candidate) {
  const base = candidate && typeof candidate === 'object' ? candidate : DEFAULT_PROGRAMMING_TEMPLATE;
  return {
    version: positiveInt(base.version, 1),
    timezone: nonEmpty(base.timezone, 'Europe/Istanbul'),
    defaultFallbackItemId: nonEmpty(base.defaultFallbackItemId, 'fallback-quran'),
    pageCursor: positiveInt(base.pageCursor, 1),
    rotation: {
      reciters: normalizePolicy(base.rotation?.reciters, DEFAULT_PROGRAMMING_TEMPLATE.rotation.reciters),
      themes: normalizePolicy(base.rotation?.themes, DEFAULT_PROGRAMMING_TEMPLATE.rotation.themes)
    },
    fillers: Array.isArray(base.fillers) ? base.fillers.map(normalizeFiller) : [],
    blocks: Array.isArray(base.blocks) ? base.blocks.map(normalizeBlock) : DEFAULT_PROGRAMMING_TEMPLATE.blocks,
    specialDays: {
      friday: {
        enabled: Boolean(base.specialDays?.friday?.enabled),
        reminderItemIds: safeIdList(base.specialDays?.friday?.reminderItemIds)
      },
      ramadan: {
        enabled: Boolean(base.specialDays?.ramadan?.enabled),
        taraweehLiveStreamUrl: typeof base.specialDays?.ramadan?.taraweehLiveStreamUrl === 'string'
          ? base.specialDays.ramadan.taraweehLiveStreamUrl
          : ''
      }
    }
  };
}

export function validateTemplate(template) {
  const errors = [];
  const warnings = [];
  if (!template || typeof template !== 'object' || Array.isArray(template)) {
    return { ok: false, errors: ['programming template must be an object'], warnings };
  }
  if (!Array.isArray(template.blocks) || template.blocks.length === 0) errors.push('blocks must not be empty');
  if (!Array.isArray(template.rotation?.reciters?.pool) || template.rotation.reciters.pool.length === 0) {
    errors.push('rotation.reciters.pool must not be empty');
  }
  if (!Array.isArray(template.rotation?.themes?.pool) || template.rotation.themes.pool.length === 0) {
    errors.push('rotation.themes.pool must not be empty');
  }
  const starts = new Set();
  for (const [index, block] of (template.blocks ?? []).entries()) {
    const prefix = `blocks[${index}]`;
    if (!isSafeId(block.id)) errors.push(`${prefix}.id is invalid`);
    if (!/^\d{2}:\d{2}:\d{2}$/.test(block.start)) errors.push(`${prefix}.start must use HH:MM:SS`);
    if (starts.has(block.start)) errors.push(`${prefix}.start duplicates another block`);
    starts.add(block.start);
    if (!Number.isFinite(block.durationSec) || block.durationSec <= 0) errors.push(`${prefix}.durationSec must be positive`);
    if (block.fromPage > block.toPage) errors.push(`${prefix}.fromPage must be <= toPage`);
  }
  if ((template.fillers ?? []).length === 0) warnings.push('No fillers configured; the day will be Quran-only except explicit items.');
  return { ok: errors.length === 0, errors, warnings };
}

function normalizePolicy(value, fallback) {
  const mode = value?.mode === 'fixed' ? 'fixed' : 'rotate';
  return {
    mode,
    fixedId: isSafeId(value?.fixedId) ? value.fixedId : fallback.fixedId,
    pool: safeIdList(value?.pool).length ? safeIdList(value.pool) : fallback.pool,
    avoidImmediateRepeat: value?.avoidImmediateRepeat !== false
  };
}

function normalizeBlock(block, index) {
  return {
    id: isSafeId(block?.id) ? block.id : `block-${index + 1}`,
    title: nonEmpty(block?.title, `Quran Block ${index + 1}`),
    start: nonEmpty(block?.start, '00:00:00'),
    durationSec: positiveInt(block?.durationSec, 3600),
    fromPage: pageNumber(block?.fromPage, 1),
    toPage: pageNumber(block?.toPage, 604),
    preferredTags: safeIdList(block?.preferredTags),
    reciterId: isSafeId(block?.reciterId) ? block.reciterId : undefined,
    themeId: isSafeId(block?.themeId) ? block.themeId : undefined
  };
}

function normalizeFiller(filler, index) {
  return {
    id: isSafeId(filler?.id) ? filler.id : `filler-${index + 1}`,
    type: filler?.type === 'announcement' || filler?.type === 'audio_message' ? filler.type : 'break',
    title: nonEmpty(filler?.title, `Filler ${index + 1}`),
    durationSec: positiveInt(filler?.durationSec, 120),
    slides: Array.isArray(filler?.slides) ? filler.slides.filter(isAssetPath) : [],
    audio: isAssetPath(filler?.audio) ? filler.audio : undefined,
    message: nonEmpty(filler?.message, 'Quran24')
  };
}

function safeIdList(value) {
  return Array.isArray(value) ? value.filter(isSafeId).slice(0, 24) : [];
}

function pageNumber(value, fallback) {
  const n = positiveInt(value, fallback);
  return Math.min(604, Math.max(1, n));
}

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function nonEmpty(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isSafeId(value) {
  return typeof value === 'string' && /^[a-z0-9_-]+$/.test(value);
}

function isAssetPath(value) {
  return typeof value === 'string' && value.startsWith('/assets/') && !value.includes('../') && !value.includes('\\');
}
