import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { validateSchedule } from './scheduleValidator.mjs';

const DEFAULT_SCHEDULE = {
  version: 1,
  timezone: 'Europe/Istanbul',
  publishedAt: '2026-06-06T07:55:00+03:00',
  publishedBy: 'system',
  checksum: '',
  status: 'published',
  defaultFallbackItemId: 'fallback-quran',
  days: {
    daily: [
      {
        id: 'fallback-quran',
        type: 'quran',
        title: 'Quran recitation - fallback',
        start: '00:00:00',
        reciterId: 'ajmy',
        fromPage: 1,
        toPage: 20,
        layoutPresetId: 2,
        allowAutoContinue: true
      }
    ],
    friday: []
  }
};

export function createScheduleStore({ rootDir, logger = () => {} }) {
  const channelDir = join(rootDir, 'data', 'channel');
  const schedulePath = join(channelDir, 'schedule.json');
  const historyDir = join(channelDir, 'schedule-history');

  function ensureStore() {
    mkdirSync(channelDir, { recursive: true });
    mkdirSync(historyDir, { recursive: true });
    if (!existsSync(schedulePath)) {
      writeFileSync(schedulePath, JSON.stringify(withChecksum(DEFAULT_SCHEDULE), null, 2), 'utf8');
    }
  }

  function loadSchedule() {
    ensureStore();
    return JSON.parse(readFileSync(schedulePath, 'utf8'));
  }

  function publishSchedule(candidate, options = {}) {
    ensureStore();

    const prepared = prepareForSave(candidate, loadSchedule(), options);
    const validation = validateSchedule(prepared, options);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors, warnings: validation.warnings };
    }

    writeFileSync(schedulePath, JSON.stringify(prepared, null, 2), 'utf8');

    let historyPath = null;
    if (prepared.status === 'published') {
      historyPath = writeHistory(prepared);
    }

    logger('info', 'schedule_saved', {
      version: prepared.version,
      status: prepared.status,
      historyPath: historyPath ? basename(historyPath) : null
    });

    return {
      ok: true,
      schedule: prepared,
      validation,
      historyPath
    };
  }

  function writeHistory(schedule) {
    const stamp = new Date(schedule.publishedAt).toISOString().replace(/[:.]/g, '-');
    const fileName = `schedule-v${schedule.version}-${stamp}.json`;
    const historyPath = join(historyDir, fileName);
    writeFileSync(historyPath, JSON.stringify(schedule, null, 2), 'utf8');
    return historyPath;
  }

  return {
    schedulePath,
    historyDir,
    loadSchedule,
    publishSchedule,
    validateSchedule: (schedule, options = {}) => validateSchedule(schedule, options)
  };
}

export function prepareForSave(candidate, currentSchedule, options = {}) {
  const nowIso = options.nowIso || new Date().toISOString();
  const nextVersion = Number.isInteger(candidate?.version)
    ? candidate.version
    : Math.max(1, Number(currentSchedule?.version || 0) + 1);

  const prepared = {
    ...clone(candidate || {}),
    version: nextVersion,
    publishedAt: candidate?.publishedAt || nowIso,
    publishedBy: candidate?.publishedBy || options.publishedBy || currentSchedule?.publishedBy,
    status: candidate?.status || 'draft'
  };

  return withChecksum(prepared);
}

export function withChecksum(schedule) {
  const withoutChecksum = clone(schedule);
  delete withoutChecksum.checksum;
  const checksum = createHash('sha256')
    .update(JSON.stringify(withoutChecksum))
    .digest('hex');
  return { ...withoutChecksum, checksum };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
