import type { QuranScheduleItem } from '../types';
import type { QuranManifestEntry } from '../scheduler';
import { useQuranSchedulePlayback } from '../hooks/useQuranSchedulePlayback';

export function QuranRenderer({
  item,
  manifest,
  offsetSec
}: {
  item: QuranScheduleItem;
  manifest: QuranManifestEntry[];
  offsetSec: number;
}) {
  const playback = useQuranSchedulePlayback(item, manifest, offsetSec);
  const page = playback.pageOffset?.page ?? item.fromPage;

  return (
    <section className="channel-program channel-quran" aria-label="Quran program">
      <span className="program-kicker">Quran</span>
      <h2>{item.title}</h2>
      <div className="quran-page-frame">
        {playback.currentEntry?.imagePath ? (
          <img src={playback.currentEntry.imagePath} alt={`Quran page ${page}`} draggable={false} />
        ) : (
          <div className="quran-page-missing">Page {page}</div>
        )}
      </div>
      <p>Page {page} of {item.fromPage}-{item.toPage}</p>
      <strong>
        {Math.floor(playback.pageOffset?.pageOffsetSec ?? offsetSec)}s page offset - audio {playback.audioState}
      </strong>
      {playback.audioError && <small>{playback.audioError}</small>}
    </section>
  );
}
