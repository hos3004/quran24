import type { LiveStreamScheduleItem } from '../types';

export function LiveStreamBridgeRenderer({ item }: { item: LiveStreamScheduleItem }) {
  return (
    <section className="channel-program channel-live" aria-label="Live stream bridge program">
      <span className="program-kicker">Live Stream</span>
      <h2>{item.title}</h2>
      <p>{item.source}</p>
    </section>
  );
}

