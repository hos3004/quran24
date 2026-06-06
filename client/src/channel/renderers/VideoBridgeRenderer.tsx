import type { VideoScheduleItem } from '../types';

export function VideoBridgeRenderer({ item, offsetSec }: { item: VideoScheduleItem; offsetSec: number }) {
  return (
    <section className="channel-program channel-video" aria-label="Video bridge program">
      <span className="program-kicker">Video</span>
      <h2>{item.title}</h2>
      <p>{item.source}</p>
      <strong>{Math.floor(offsetSec)}s / {item.durationSec}s</strong>
    </section>
  );
}

