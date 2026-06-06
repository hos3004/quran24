const ALLOWED_ITEM_TYPES = new Set([
  'quran',
  'break',
  'video',
  'live_stream',
  'announcement',
  'image_slideshow',
  'audio_message'
]);

const ALLOWED_STATUSES = new Set(['draft', 'published', 'archived']);
const ALLOWED_DAYS = new Set([
  'daily',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

export { ALLOWED_DAYS, ALLOWED_ITEM_TYPES };

export function validateSchedule(schedule, options = {}) {
  const errors = [];
  const warnings = [];
  const knownReciterIds = new Set(options.knownReciterIds || []);

  if (!isPlainObject(schedule)) {
    return { ok: false, errors: ['schedule must be an object'], warnings };
  }

  if (!Number.isInteger(schedule.version) || schedule.version < 1) {
    errors.push('version must be a positive integer');
  }

  if (!isNonEmptyString(schedule.timezone)) {
    errors.push('timezone is required');
  } else if (!isValidTimeZone(schedule.timezone)) {
    errors.push(`timezone is invalid: ${schedule.timezone}`);
  }

  if (!isNonEmptyString(schedule.publishedAt)) {
    errors.push('publishedAt is required');
  } else if (Number.isNaN(Date.parse(schedule.publishedAt))) {
    errors.push('publishedAt must be a valid ISO date string');
  }

  if (!ALLOWED_STATUSES.has(schedule.status)) {
    errors.push('status must be draft, published, or archived');
  }

  if (!isNonEmptyString(schedule.defaultFallbackItemId)) {
    errors.push('defaultFallbackItemId is required');
  }

  if (!isPlainObject(schedule.days)) {
    errors.push('days must be an object');
    return { ok: errors.length === 0, errors, warnings };
  }

  if (!Array.isArray(schedule.days.daily)) {
    errors.push('days.daily must be an array');
  }

  const itemIds = new Set();
  let fallbackFound = false;

  for (const [dayKey, items] of Object.entries(schedule.days)) {
    if (!ALLOWED_DAYS.has(dayKey)) {
      errors.push(`invalid day key: ${dayKey}`);
      continue;
    }

    if (!Array.isArray(items)) {
      errors.push(`days.${dayKey} must be an array`);
      continue;
    }

    validateDayItems(dayKey, items, itemIds, knownReciterIds, errors, warnings);

    if (items.some((item) => item?.id === schedule.defaultFallbackItemId)) {
      fallbackFound = true;
    }
  }

  if (schedule.defaultFallbackItemId && !fallbackFound) {
    errors.push(`defaultFallbackItemId does not match any item: ${schedule.defaultFallbackItemId}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function validateDayItems(dayKey, items, itemIds, knownReciterIds, errors, warnings) {
  const starts = new Map();
  const normalized = [];

  items.forEach((item, index) => {
    const prefix = `days.${dayKey}[${index}]`;

    if (!isPlainObject(item)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isNonEmptyString(item.id)) {
      errors.push(`${prefix}.id is required`);
    } else if (itemIds.has(item.id)) {
      errors.push(`duplicate item id: ${item.id}`);
    } else {
      itemIds.add(item.id);
    }

    if (!ALLOWED_ITEM_TYPES.has(item.type)) {
      errors.push(`${prefix}.type is invalid: ${String(item.type)}`);
    }

    if (!isNonEmptyString(item.title)) {
      errors.push(`${prefix}.title is required`);
    }

    const startSec = parseTimeToSec(item.start);
    if (startSec === null) {
      errors.push(`${prefix}.start must use HH:MM:SS`);
    } else {
      if (starts.has(startSec)) {
        errors.push(`${prefix}.start duplicates ${starts.get(startSec)}`);
      }
      starts.set(startSec, item.id || prefix);
      normalized.push({ item, index, startSec });
    }

    validateItemPayload(prefix, item, knownReciterIds, errors, warnings);
  });

  normalized.sort((a, b) => a.startSec - b.startSec);
  for (let i = 0; i < normalized.length - 1; i += 1) {
    const current = normalized[i];
    const next = normalized[i + 1];
    if (Number.isFinite(current.item.durationSec)) {
      const endSec = current.startSec + current.item.durationSec;
      if (endSec > next.startSec) {
        errors.push(`days.${dayKey}[${current.index}] overlaps next item ${next.item.id || next.index}`);
      }
    }
  }
}

function validateItemPayload(prefix, item, knownReciterIds, errors, warnings) {
  if (Number.isFinite(item.durationSec) && item.durationSec <= 0) {
    errors.push(`${prefix}.durationSec must be positive`);
  }

  switch (item.type) {
    case 'quran':
      validateQuranItem(prefix, item, knownReciterIds, errors, warnings);
      break;
    case 'break':
      requireDuration(prefix, item, errors);
      validateMediaList(prefix, item.slides, 'slides', errors);
      validateOptionalMedia(prefix, item.audio, 'audio', errors);
      break;
    case 'announcement':
      requireDuration(prefix, item, errors);
      if (!isNonEmptyString(item.message)) errors.push(`${prefix}.message is required`);
      break;
    case 'video':
      requireDuration(prefix, item, errors);
      validateRequiredMedia(prefix, item.source, 'source', errors);
      break;
    case 'live_stream':
      validateRequiredMedia(prefix, item.source, 'source', errors);
      break;
    case 'image_slideshow':
      requireDuration(prefix, item, errors);
      validateMediaList(prefix, item.slides, 'slides', errors, { required: true });
      validateOptionalMedia(prefix, item.audio, 'audio', errors);
      break;
    case 'audio_message':
      requireDuration(prefix, item, errors);
      validateRequiredMedia(prefix, item.audio, 'audio', errors);
      break;
    default:
      break;
  }
}

function validateQuranItem(prefix, item, knownReciterIds, errors, warnings) {
  if (!isNonEmptyString(item.reciterId)) {
    errors.push(`${prefix}.reciterId is required`);
  } else if (knownReciterIds.size > 0 && !knownReciterIds.has(item.reciterId)) {
    errors.push(`${prefix}.reciterId is unknown: ${item.reciterId}`);
  } else if (knownReciterIds.size === 0) {
    warnings.push(`${prefix}.reciterId could not be checked because no reciter index is available`);
  }

  if (!Number.isInteger(item.fromPage) || item.fromPage < 1 || item.fromPage > 604) {
    errors.push(`${prefix}.fromPage must be between 1 and 604`);
  }

  if (!Number.isInteger(item.toPage) || item.toPage < 1 || item.toPage > 604) {
    errors.push(`${prefix}.toPage must be between 1 and 604`);
  }

  if (Number.isInteger(item.fromPage) && Number.isInteger(item.toPage) && item.fromPage > item.toPage) {
    errors.push(`${prefix}.fromPage must be less than or equal to toPage`);
  }
}

function requireDuration(prefix, item, errors) {
  if (!Number.isFinite(item.durationSec) || item.durationSec <= 0) {
    errors.push(`${prefix}.durationSec must be a positive number`);
  }
}

function validateMediaList(prefix, value, field, errors, options = {}) {
  if (value === undefined) {
    if (options.required) errors.push(`${prefix}.${field} is required`);
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${prefix}.${field} must be an array`);
    return;
  }

  if (options.required && value.length === 0) {
    errors.push(`${prefix}.${field} must not be empty`);
  }

  value.forEach((entry, index) => validateRequiredMedia(prefix, entry, `${field}[${index}]`, errors));
}

function validateOptionalMedia(prefix, value, field, errors) {
  if (value !== undefined) validateRequiredMedia(prefix, value, field, errors);
}

function validateRequiredMedia(prefix, value, field, errors) {
  if (!isNonEmptyString(value)) {
    errors.push(`${prefix}.${field} is required`);
    return;
  }

  if (!isSafeMediaReference(value)) {
    errors.push(`${prefix}.${field} is unsafe: ${value}`);
  }
}

export function parseTimeToSec(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);

  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function isSafeMediaReference(value) {
  if (!isNonEmptyString(value)) return false;
  const normalized = value.trim();
  const lower = normalized.toLowerCase();

  if (normalized.includes('\0')) return false;
  if (normalized.includes('\\')) return false;
  if (normalized.includes('../') || normalized.includes('..\\')) return false;
  if (lower.startsWith('file://')) return false;
  if (/^[a-z]:[\\/]/i.test(normalized)) return false;
  if (lower.startsWith('/etc/')) return false;

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return normalized.startsWith('/assets/');
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

