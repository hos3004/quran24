import type { ChannelItemType, ChannelScheduleItem } from '../channel/types';

export const editableItemTypes: ChannelItemType[] = [
  'quran',
  'break',
  'announcement',
  'video',
  'live_stream'
];

export function sortScheduleItems(items: ChannelScheduleItem[]) {
  return [...items].sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}

export function createScheduleItem(type: ChannelItemType, index: number): ChannelScheduleItem {
  const suffix = String(index + 1).padStart(3, '0');
  const start = defaultStart(index);

  switch (type) {
    case 'quran':
      return {
        id: `quran-${suffix}`,
        type,
        title: 'تلاوة قرآن',
        start,
        reciterId: 'ajmy',
        fromPage: 1,
        toPage: 20,
        layoutPresetId: 2,
        allowAutoContinue: true
      };
    case 'break':
      return {
        id: `break-${suffix}`,
        type,
        title: 'فاصل دعاء',
        start,
        durationSec: 120,
        slides: ['/assets/slides/dua-1.jpeg']
      };
    case 'announcement':
      return {
        id: `announcement-${suffix}`,
        type,
        title: 'إعلان القناة',
        start,
        durationSec: 60,
        message: 'Quran24'
      };
    case 'video':
      return {
        id: `video-${suffix}`,
        type,
        title: 'فيديو',
        start,
        durationSec: 300,
        source: 'https://example.com/videos/video.mp4',
        startMode: 'timeline_offset'
      };
    case 'live_stream':
      return {
        id: `live-${suffix}`,
        type,
        title: 'بث مباشر',
        start,
        durationSec: 900,
        source: 'https://example.com/live/stream.m3u8',
        startMode: 'live_edge'
      };
    default:
      throw new Error(`Unsupported editable item type: ${type}`);
  }
}

export function parseMediaList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function stringifyMediaList(value?: string[]) {
  return (value ?? []).join('\n');
}

export function formatSeconds(value?: number) {
  if (!Number.isFinite(value)) return 'مفتوح';
  const seconds = Math.max(0, Math.floor(value ?? 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function defaultStart(index: number) {
  const hour = Math.min(23, Math.floor(index / 2));
  const minute = index % 2 === 0 ? 0 : 30;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}
