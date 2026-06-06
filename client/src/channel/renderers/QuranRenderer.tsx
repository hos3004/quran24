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
    <section className="quran-broadcast-scene" aria-label="Quran program">
      <div className="quran-reference-stage">
        <div className="quran-page-window">
          <div className="quran-page-mount">
            {playback.currentEntry?.imagePath ? (
              <img src={playback.currentEntry.imagePath} alt={`Quran page ${page}`} draggable={false} />
            ) : (
              <div className="quran-page-missing">Page {page}</div>
            )}
          </div>
        </div>
        <img
          className="quran-frame-overlay"
          src="/assets/frames/frame-preset2.png"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </div>

      <div className="quran-runtime-status" aria-hidden="true">
        <span>{item.title}</span>
        <strong>Page {page}</strong>
      </div>

      <span className="sr-only">
        {playback.currentEntry?.imagePath ? (
          <>Playing {item.title}, page {page}, audio {playback.audioState}</>
        ) : (
          <>Quran page {page} is missing</>
        )}
      </span>
      {playback.audioError && <span className="sr-only">{playback.audioError}</span>}
    </section>
  );
}
