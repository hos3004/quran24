import { describe, expect, it } from 'vitest';
import {
  calculateItemOffset,
  calculateQuranPageFromOffset,
  getActiveScheduleItem,
  getScheduleForDay
} from './scheduler';
import type { ChannelSchedule, QuranScheduleItem } from './types';

function atIstanbul(localIso: string) {
  return new Date(localIso);
}

const quranItem: QuranScheduleItem = {
  id: 'quran-1',
  type: 'quran',
  title: 'Quran',
  start: '00:00:00',
  reciterId: 'ajmy',
  fromPage: 1,
  toPage: 3,
  allowAutoContinue: false
};

const schedule: ChannelSchedule = {
  version: 1,
  timezone: 'Europe/Istanbul',
  publishedAt: '2026-06-06T07:55:00+03:00',
  status: 'published',
  defaultFallbackItemId: 'quran-1',
  days: {
    daily: [
      quranItem,
      {
        id: 'break-1',
        type: 'break',
        title: 'Break',
        start: '00:45:00',
        durationSec: 120
      },
      {
        id: 'video-1',
        type: 'video',
        title: 'Video',
        start: '01:00:00',
        durationSec: 300,
        source: 'https://example.com/video.mp4'
      }
    ],
    friday: []
  }
};

describe('scheduler', () => {
  it('selects the first item at exact local midnight', () => {
    const active = getActiveScheduleItem(schedule, atIstanbul('2026-06-06T00:00:00+03:00'));
    expect(active?.item.id).toBe('quran-1');
    expect(active?.offsetSec).toBe(0);
  });

  it('switches exactly at an item boundary', () => {
    const active = getActiveScheduleItem(schedule, atIstanbul('2026-06-06T00:45:00+03:00'));
    expect(active?.item.id).toBe('break-1');
    expect(active?.offsetSec).toBe(0);
  });

  it('calculates offsets inside an item', () => {
    const active = getActiveScheduleItem(schedule, atIstanbul('2026-06-06T00:46:00+03:00'));
    expect(active?.item.id).toBe('break-1');
    expect(active?.offsetSec).toBe(60);
  });

  it('keeps the last item active after the last scheduled start', () => {
    const active = getActiveScheduleItem(schedule, atIstanbul('2026-06-06T03:00:00+03:00'));
    expect(active?.item.id).toBe('video-1');
    expect(active?.offsetSec).toBe(7200);
  });

  it('wraps offset for previous-day last item before first start', () => {
    const lateSchedule: ChannelSchedule = {
      ...schedule,
      days: {
        daily: [
          {
            ...quranItem,
            start: '06:00:00'
          }
        ]
      }
    };
    const active = getActiveScheduleItem(lateSchedule, atIstanbul('2026-06-06T01:00:00+03:00'));
    expect(active?.item.id).toBe('quran-1');
    expect(active?.offsetSec).toBe(19 * 3600);
  });

  it('uses a non-empty Friday override', () => {
    const fridaySchedule: ChannelSchedule = {
      ...schedule,
      defaultFallbackItemId: 'friday-kahf',
      days: {
        ...schedule.days,
        friday: [
          {
            ...quranItem,
            id: 'friday-kahf',
            title: 'Friday'
          }
        ]
      }
    };

    const day = getScheduleForDay(fridaySchedule, atIstanbul('2026-06-05T12:00:00+03:00'));
    expect(day.dayKey).toBe('friday');
    expect(day.items[0].id).toBe('friday-kahf');
  });

  it('calculates Quran page from offset', () => {
    const manifest = [
      { page: 1, audioDuration: 10 },
      { page: 2, audioDuration: 20 },
      { page: 3, audioDuration: 30 }
    ];

    const page = calculateQuranPageFromOffset(quranItem, manifest, 15);
    expect(page?.page).toBe(2);
    expect(page?.pageOffsetSec).toBe(5);
    expect(page?.rangeDurationSec).toBe(60);
  });

  it('wraps Quran page ranges when auto-continue is enabled', () => {
    const manifest = [
      { page: 1, audioDuration: 10 },
      { page: 2, audioDuration: 20 },
      { page: 3, audioDuration: 30 }
    ];

    const page = calculateQuranPageFromOffset({ ...quranItem, allowAutoContinue: true }, manifest, 65);
    expect(page?.page).toBe(1);
    expect(page?.pageOffsetSec).toBe(5);
  });

  it('throws on invalid schedule shape', () => {
    expect(() => getScheduleForDay({} as ChannelSchedule, new Date())).toThrow(/days.daily/);
  });

  it('calculateItemOffset can be used directly', () => {
    expect(calculateItemOffset(quranItem, atIstanbul('2026-06-06T00:10:00+03:00'), 'Europe/Istanbul')).toBe(600);
  });
});

