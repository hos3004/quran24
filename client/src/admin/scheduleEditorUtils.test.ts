import { describe, expect, it } from 'vitest';
import { createScheduleItem, parseMediaList, sortScheduleItems, stringifyMediaList } from './scheduleEditorUtils';
import type { ChannelScheduleItem } from '../channel/types';

describe('schedule editor utils', () => {
  it('creates valid defaults for editable item types', () => {
    expect(createScheduleItem('quran', 0)).toMatchObject({ type: 'quran', reciterId: 'ajmy' });
    expect(createScheduleItem('video', 1)).toMatchObject({ type: 'video', durationSec: 300 });
    expect(createScheduleItem('live_stream', 2)).toMatchObject({ type: 'live_stream', startMode: 'live_edge' });
  });

  it('sorts schedule items by start time and id', () => {
    const items = [
      { id: 'b', type: 'announcement', title: 'B', start: '02:00:00', durationSec: 60, message: 'B' },
      { id: 'a', type: 'announcement', title: 'A', start: '01:00:00', durationSec: 60, message: 'A' }
    ] satisfies ChannelScheduleItem[];

    expect(sortScheduleItems(items).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('round-trips media list text', () => {
    const parsed = parseMediaList('/assets/a.jpeg\n/assets/b.jpeg, https://example.com/c.mp4');
    expect(parsed).toEqual(['/assets/a.jpeg', '/assets/b.jpeg', 'https://example.com/c.mp4']);
    expect(stringifyMediaList(parsed)).toBe('/assets/a.jpeg\n/assets/b.jpeg\nhttps://example.com/c.mp4');
  });
});
