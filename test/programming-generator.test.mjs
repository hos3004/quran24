import test from 'node:test';
import assert from 'node:assert/strict';
import { generateScheduleFromTemplate } from '../server/channel/scheduleGenerator.mjs';
import { DEFAULT_PROGRAMMING_TEMPLATE, validateTemplate } from '../server/channel/programmingStore.mjs';
import { validateThemes } from '../server/channel/themeStore.mjs';

test('programming template validates and generates a mixed daily schedule', () => {
  const template = {
    ...DEFAULT_PROGRAMMING_TEMPLATE,
    rotation: {
      reciters: { mode: 'rotate', pool: ['ajmy', 'maher'], avoidImmediateRepeat: true },
      themes: { mode: 'rotate', pool: ['classic-gold'], avoidImmediateRepeat: true }
    }
  };
  const templateValidation = validateTemplate(template);
  assert.equal(templateValidation.ok, true);

  const schedule = generateScheduleFromTemplate({
    template,
    reciters: [{ id: 'ajmy' }, { id: 'maher' }],
    themes: [{ id: 'classic-gold', tags: ['day', 'night'] }],
    nowIso: '2026-06-06T12:00:00.000Z',
    version: 12
  });

  assert.equal(schedule.version, 12);
  assert.equal(schedule.defaultFallbackItemId, 'fallback-quran');
  assert.ok(schedule.days.daily.some((item) => item.type === 'quran' && item.themeId === 'classic-gold'));
  assert.ok(schedule.days.daily.some((item) => item.type === 'break'));
});

test('theme validation accepts the packaged classic theme shape', () => {
  const validation = validateThemes({
    activeThemeId: 'classic-gold',
    themes: [
      {
        id: 'classic-gold',
        name: 'Classic Gold',
        frame: '/assets/frames/frame-preset2.png',
        background: '#000000',
        quranZoom: 0.82,
        page: { x: 1036, y: 185, w: 825, h: 680 },
        info: { x: 470, y: 635, w: 500, h: 300 }
      }
    ]
  });
  assert.equal(validation.ok, true);
});
