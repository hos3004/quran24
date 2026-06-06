import type { AnnouncementScheduleItem } from '../types';

export function AnnouncementRenderer({ item, offsetSec = 0 }: { item: AnnouncementScheduleItem; offsetSec?: number }) {
  const duration = Math.max(1, item.durationSec);
  const clampedOffset = Math.max(0, Math.min(offsetSec, duration));
  const progress = clampedOffset / duration;

  return (
    <section className="channel-program channel-announcement" aria-label="Announcement program">
      <span className="program-kicker">Announcement</span>
      <h2>{item.title}</h2>
      <p>{item.message}</p>
      <div className="program-progress" aria-label="Announcement progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <strong>{Math.max(0, Math.ceil(duration - clampedOffset))}s remaining</strong>
    </section>
  );
}
