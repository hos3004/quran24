import assert from 'node:assert/strict';
import test from 'node:test';
import { isSafeMediaReference, parseTimeToSec, validateSchedule } from '../server/channel/scheduleValidator.mjs';

function validSchedule(overrides = {}) {
  return {
    version: 1,
    timezone: 'Europe/Istanbul',
    publishedAt: '2026-06-06T07:55:00+03:00',
    publishedBy: 'test',
    checksum: '',
    status: 'published',
    defaultFallbackItemId: 'fallback-quran',
    days: {
      daily: [
        {
          id: 'fallback-quran',
          type: 'quran',
          title: 'Quran recitation',
          start: '00:00:00',
          reciterId: 'ajmy',
          fromPage: 1,
          toPage: 20,
          layoutPresetId: 2,
          allowAutoContinue: true
        },
        {
          id: 'break-001',
          type: 'break',
          title: 'Break',
          start: '00:45:00',
          durationSec: 120,
          slides: ['/assets/slides/dua-1.webp']
        }
      ],
      friday: []
    },
    ...overrides
  };
}

test('parseTimeToSec validates HH:MM:SS boundaries', () => {
  assert.equal(parseTimeToSec('00:00:00'), 0);
  assert.equal(parseTimeToSec('23:59:59'), 86399);
  assert.equal(parseTimeToSec('24:00:00'), null);
  assert.equal(parseTimeToSec('01:99:00'), null);
});

test('valid schedule passes validation', () => {
  const result = validateSchedule(validSchedule());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('invalid Quran page range fails validation', () => {
  const schedule = validSchedule();
  schedule.days.daily[0].fromPage = 99;
  schedule.days.daily[0].toPage = 10;
  const result = validateSchedule(schedule);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /fromPage must be less than or equal to toPage/);
});

test('unsafe media references are rejected', () => {
  assert.equal(isSafeMediaReference('/assets/slides/ok.webp'), true);
  assert.equal(isSafeMediaReference('https://example.com/video.mp4'), true);
  assert.equal(isSafeMediaReference('../secret.mp4'), false);
  assert.equal(isSafeMediaReference('file:///etc/passwd'), false);
  assert.equal(isSafeMediaReference('C:\\media\\secret.mp4'), false);
});

test('overlapping explicit durations fail validation', () => {
  const schedule = validSchedule({
    days: {
      daily: [
        {
          id: 'announcement-1',
          type: 'announcement',
          title: 'Announcement',
          start: '00:00:00',
          durationSec: 120,
          message: 'A'
        },
        {
          id: 'announcement-2',
          type: 'announcement',
          title: 'Announcement',
          start: '00:01:00',
          durationSec: 60,
          message: 'B'
        }
      ]
    },
    defaultFallbackItemId: 'announcement-1'
  });

  const result = validateSchedule(schedule);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /overlaps next item/);
});

