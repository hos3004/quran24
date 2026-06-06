import type { ChannelSchedule, ChannelScheduleItem, QuranScheduleItem, WeekdayKey } from './types';

export type ScheduleForDay = {
  dayKey: WeekdayKey;
  items: ChannelScheduleItem[];
};

export type ActiveScheduleItem = {
  dayKey: WeekdayKey;
  item: ChannelScheduleItem;
  nextItem: ChannelScheduleItem | null;
  offsetSec: number;
  nowSec: number;
};

export type QuranManifestEntry = {
  page: number;
  audioDuration?: number;
  durationSec?: number;
};

export type QuranPageOffset = {
  page: number;
  pageIndex: number;
  pageOffsetSec: number;
  pageDurationSec: number;
  rangeDurationSec: number;
};

const WEEKDAY_KEYS: WeekdayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];

export function getScheduleForDay(schedule: ChannelSchedule, now: Date): ScheduleForDay {
  assertScheduleShape(schedule);
  const dayKey = getWeekdayKey(now, schedule.timezone);
  const dayItems = schedule.days[dayKey] ?? [];
  const sourceItems = dayItems.length > 0 ? dayItems : schedule.days.daily;

  return {
    dayKey: dayItems.length > 0 ? dayKey : 'daily',
    items: sortItemsByStart(sourceItems)
  };
}

export function getActiveScheduleItem(schedule: ChannelSchedule, now: Date): ActiveScheduleItem | null {
  const scheduleForDay = getScheduleForDay(schedule, now);
  if (scheduleForDay.items.length === 0) return null;

  const nowSec = getTimeOfDaySec(now, schedule.timezone);
  let activeIndex = -1;
  for (let index = 0; index < scheduleForDay.items.length; index += 1) {
    const startSec = parseTimeToSec(scheduleForDay.items[index].start);
    if (startSec !== null && startSec <= nowSec) {
      activeIndex = index;
    }
  }

  if (activeIndex === -1) {
    activeIndex = scheduleForDay.items.length - 1;
  }

  const item = scheduleForDay.items[activeIndex];
  const nextItem = scheduleForDay.items[(activeIndex + 1) % scheduleForDay.items.length] ?? null;

  return {
    dayKey: scheduleForDay.dayKey,
    item,
    nextItem,
    offsetSec: calculateItemOffset(item, now, schedule.timezone),
    nowSec
  };
}

export function calculateItemOffset(item: ChannelScheduleItem, now: Date, timezone = 'UTC'): number {
  const startSec = parseTimeToSec(item.start);
  if (startSec === null) throw new Error(`Invalid item start: ${item.start}`);

  const nowSec = getTimeOfDaySec(now, timezone);
  const delta = nowSec - startSec;
  return delta >= 0 ? delta : delta + 86400;
}

export function calculateQuranPageFromOffset(
  item: QuranScheduleItem,
  manifest: QuranManifestEntry[],
  offsetSec: number
): QuranPageOffset | null {
  const entries = manifest
    .filter((entry) => entry.page >= item.fromPage && entry.page <= item.toPage)
    .sort((a, b) => a.page - b.page);

  if (entries.length === 0) return null;

  const durations = entries.map((entry) => Math.max(0.1, entry.audioDuration ?? entry.durationSec ?? 30));
  const rangeDurationSec = durations.reduce((sum, duration) => sum + duration, 0);
  let remaining = Math.max(0, offsetSec);

  if (rangeDurationSec > 0) {
    if (item.allowAutoContinue) {
      remaining %= rangeDurationSec;
    } else {
      remaining = Math.min(remaining, Math.max(0, rangeDurationSec - 0.001));
    }
  }

  for (let index = 0; index < entries.length; index += 1) {
    const duration = durations[index];
    if (remaining < duration || index === entries.length - 1) {
      return {
        page: entries[index].page,
        pageIndex: index,
        pageOffsetSec: Math.min(remaining, duration),
        pageDurationSec: duration,
        rangeDurationSec
      };
    }
    remaining -= duration;
  }

  return null;
}

export function getTimeOfDaySec(now: Date, timezone: string): number {
  const parts = getDateTimeParts(now, timezone);
  return parts.hour * 3600 + parts.minute * 60 + parts.second;
}

export function getWeekdayKey(now: Date, timezone: string): WeekdayKey {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' })
    .format(now)
    .toLowerCase() as WeekdayKey;

  if (WEEKDAY_KEYS.includes(weekday)) return weekday;
  throw new Error(`Unable to resolve weekday for timezone: ${timezone}`);
}

export function parseTimeToSec(value: string): number | null {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3]);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return hour * 3600 + minute * 60 + second;
}

function sortItemsByStart(items: ChannelScheduleItem[]): ChannelScheduleItem[] {
  return [...items].sort((a, b) => (parseTimeToSec(a.start) ?? 0) - (parseTimeToSec(b.start) ?? 0));
}

function assertScheduleShape(schedule: ChannelSchedule) {
  if (!schedule?.days?.daily) {
    throw new Error('Invalid schedule: days.daily is required');
  }
}

function getDateTimeParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(now);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    hour: getPart('hour') % 24,
    minute: getPart('minute'),
    second: getPart('second')
  };
}
