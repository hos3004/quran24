import type { AnnouncementScheduleItem } from '../types';

export function AnnouncementRenderer({ item }: { item: AnnouncementScheduleItem }) {
  return (
    <section className="channel-program channel-announcement" aria-label="Announcement program">
      <span className="program-kicker">Announcement</span>
      <h2>{item.title}</h2>
      <p>{item.message}</p>
    </section>
  );
}

