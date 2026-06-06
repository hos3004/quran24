import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_RECITERS = {
  audioRootDir: 'data/reciters',
  activeReciterId: 'ajmy',
  reciters: [
    {
      id: 'ajmy',
      name: 'Ahmad Al Ajmy',
      folderName: 'ajmy',
      audioDir: 'data/reciters/ajmy'
    },
    {
      id: 'maher',
      name: 'Maher Al Muaiqly',
      folderName: 'maher',
      audioDir: 'data/reciters/maher'
    }
  ]
};

export function createReciterStore({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const recitersPath = join(channelDir, 'reciters.json');

  function ensureStore() {
    mkdirSync(channelDir, { recursive: true });
    if (!existsSync(recitersPath)) {
      writeFileSync(recitersPath, JSON.stringify(DEFAULT_RECITERS, null, 2), 'utf8');
    }
  }

  function loadReciters() {
    ensureStore();
    return JSON.parse(readFileSync(recitersPath, 'utf8').replace(/^\uFEFF/, ''));
  }

  function saveReciters(candidate) {
    ensureStore();
    const validation = validateReciters(candidate);
    if (!validation.ok) return { ok: false, validation };

    const normalized = normalizeReciters(candidate);
    writeFileSync(recitersPath, JSON.stringify(normalized, null, 2), 'utf8');
    logger('info', 'reciters_saved', {
      count: normalized.reciters.length,
      activeReciterId: normalized.activeReciterId
    });

    return { ok: true, reciters: normalized, validation };
  }

  return {
    recitersPath,
    loadReciters,
    saveReciters,
    validateReciters
  };
}

export function normalizeReciters(candidate) {
  const audioRootDir = normalizeAudioRoot(candidate?.audioRootDir);
  const reciters = Array.isArray(candidate?.reciters)
    ? candidate.reciters.map((reciter, index) => normalizeReciter(reciter, audioRootDir, index))
    : [];
  const activeReciterId = isSafeId(candidate?.activeReciterId) && reciters.some((item) => item.id === candidate.activeReciterId)
    ? candidate.activeReciterId
    : reciters[0]?.id ?? '';

  return {
    audioRootDir,
    activeReciterId,
    reciters
  };
}

export function validateReciters(candidate) {
  const errors = [];
  const warnings = [];

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['reciters payload must be an object'], warnings };
  }

  if (candidate.audioRootDir !== undefined && candidate.audioRootDir !== 'data/reciters') {
    errors.push('audioRootDir must stay inside data/reciters');
  }

  if (!Array.isArray(candidate.reciters)) {
    errors.push('reciters must be an array');
    return { ok: errors.length === 0, errors, warnings };
  }

  const ids = new Set();
  candidate.reciters.forEach((reciter, index) => {
    const prefix = `reciters[${index}]`;
    if (!reciter || typeof reciter !== 'object' || Array.isArray(reciter)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!isSafeId(reciter.id)) {
      errors.push(`${prefix}.id must contain only lowercase letters, numbers, underscores, or hyphens`);
    } else if (ids.has(reciter.id)) {
      errors.push(`duplicate reciter id: ${reciter.id}`);
    } else {
      ids.add(reciter.id);
    }

    if (!isNonEmptyString(reciter.name)) {
      errors.push(`${prefix}.name is required`);
    }

    if (!isSafeSegment(reciter.folderName)) {
      errors.push(`${prefix}.folderName must be a safe folder name`);
    }

    if (reciter.audioDir !== undefined && reciter.audioDir !== `data/reciters/${reciter.folderName}`) {
      errors.push(`${prefix}.audioDir must match data/reciters/{folderName}`);
    }
  });

  if (candidate.activeReciterId && !ids.has(candidate.activeReciterId)) {
    errors.push(`activeReciterId does not match any reciter: ${candidate.activeReciterId}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function normalizeReciter(reciter, audioRootDir, index) {
  const id = isSafeId(reciter?.id) ? reciter.id : `reciter-${index + 1}`;
  const folderName = isSafeSegment(reciter?.folderName) ? reciter.folderName : id;
  const name = isNonEmptyString(reciter?.name) ? reciter.name.trim() : `Reciter ${index + 1}`;

  return {
    id,
    name,
    folderName,
    audioDir: `${audioRootDir}/${folderName}`
  };
}

function normalizeAudioRoot(value) {
  return value === 'data/reciters' ? value : 'data/reciters';
}

function isSafeId(value) {
  return typeof value === 'string' && /^[a-z0-9_-]+$/.test(value);
}

function isSafeSegment(value) {
  return typeof value === 'string' && /^[a-z0-9_-]+$/.test(value) && !value.includes('..');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
