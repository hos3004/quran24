import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { summarizeReligiousSchedule } from '../server/channel/religiousSchedule.mjs';
import { validateSchedule } from '../server/channel/scheduleValidator.mjs';

test('religious schedule summary detects Friday, Taraweeh, fillers, and Quran coverage', () => {
  const schedule = {
    version: 5,
    timezone: 'Europe/Istanbul',
    days: {
      daily: [
        {
          id: 'quran-fajr',
          type: 'quran',
          title: 'Fajr Quran',
          fromPage: 1,
          toPage: 20
        },
        {
          id: 'dua-break-1',
          type: 'break',
          title: 'Dua break',
          slides: ['/assets/slides/dua-1.jpeg']
        },
        {
          id: 'dhikr-break-2',
          type: 'announcement',
          title: 'Dhikr reminder',
          message: 'Short dhikr reminder'
        },
        {
          id: 'salawat-break-3',
          type: 'audio_message',
          title: 'Salawat reminder',
          transcript: 'Increase salawat today'
        },
        {
          id: 'ramadan-taraweeh',
          type: 'live_stream',
          title: 'Ramadan Taraweeh live stream',
          source: 'https://example.test/taraweeh.m3u8'
        }
      ],
      friday: [
        {
          id: 'friday-kahf-reminder',
          type: 'announcement',
          title: 'Friday Surah Al-Kahf reminder'
        }
      ]
    }
  };
  const summary = summarizeReligiousSchedule(schedule, {
    now: new Date('2026-06-06T12:00:00.000Z')
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.scheduleVersion, 5);
  assert.equal(summary.summary.fridayScheduleConfigured, true);
  assert.equal(summary.summary.taraweehLiveStreamConfigured, true);
  assert.equal(summary.summary.spiritualFillerCount >= 3, true);
  assert.equal(summary.summary.quranPageSpan.coveredPages, 20);
  assert.equal(summary.recommendations.length, 0);
});

test('schedule validator accepts religious metadata and warns on missing item ids', () => {
  const schedule = JSON.parse(readFileSync(new URL('../data/channel/schedule.json', import.meta.url), 'utf8'));
  const candidate = {
    ...schedule,
    religious: {
      ...schedule.religious,
      fridayReminderItemIds: ['missing-friday-item']
    }
  };

  const result = validateSchedule(candidate);
  assert.equal(result.ok, true);
  assert.match(result.warnings.join('\n'), /missing-friday-item/);
});
