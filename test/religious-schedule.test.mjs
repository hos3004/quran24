import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { summarizeReligiousSchedule } from '../server/channel/religiousSchedule.mjs';
import { validateSchedule } from '../server/channel/scheduleValidator.mjs';

test('religious schedule summary detects Friday, Taraweeh, fillers, and Quran coverage', () => {
  const schedule = JSON.parse(readFileSync(new URL('../data/channel/schedule.json', import.meta.url), 'utf8'));
  const summary = summarizeReligiousSchedule(schedule, {
    now: new Date('2026-06-06T12:00:00.000Z')
  });

  assert.equal(summary.ok, true);
  assert.equal(summary.scheduleVersion, 4);
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
