import type { QuranScheduleItem } from '../types';

export function QuranRenderer({ item, offsetSec }: { item: QuranScheduleItem; offsetSec: number }) {
  return (
    <section className="channel-program channel-quran" aria-label="Quran program">
      <span className="program-kicker">Quran</span>
      <h2>{item.title}</h2>
      <p>Pages {item.fromPage} to {item.toPage}</p>
      <strong>{Math.floor(offsetSec)}s</strong>
    </section>
  );
}

