import type { BreakScheduleItem } from '../types';

export function BreakRenderer({ item, offsetSec }: { item: BreakScheduleItem; offsetSec: number }) {
  return (
    <section className="channel-program channel-break" aria-label="Break program">
      <span className="program-kicker">Break</span>
      <h2>{item.title}</h2>
      <p>{item.slides?.length ?? 0} slides queued</p>
      <strong>{Math.floor(offsetSec)}s / {item.durationSec}s</strong>
    </section>
  );
}

