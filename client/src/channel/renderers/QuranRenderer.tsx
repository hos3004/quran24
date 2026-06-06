import type { CSSProperties } from 'react';
import type { ChannelTheme, QuranScheduleItem } from '../types';
import type { QuranManifestEntry } from '../scheduler';
import { useQuranSchedulePlayback } from '../hooks/useQuranSchedulePlayback';

const DEFAULT_THEME: ChannelTheme = {
  id: 'classic-gold',
  name: 'Classic Gold',
  frame: '/assets/frames/frame-preset2.png',
  background: '#000000',
  quranZoom: 0.82,
  page: { x: 1036, y: 185, w: 825, h: 680 },
  tags: ['default']
};

export function QuranRenderer({
  item,
  manifest,
  offsetSec,
  themes
}: {
  item: QuranScheduleItem;
  manifest: QuranManifestEntry[];
  offsetSec: number;
  themes: ChannelTheme[];
}) {
  const playback = useQuranSchedulePlayback(item, manifest, offsetSec);
  const page = playback.pageOffset?.page ?? item.fromPage;
  const theme = themes.find((candidate) => candidate.id === item.themeId)
    ?? themes.find((candidate) => candidate.id === `preset-${item.layoutPresetId}`)
    ?? themes[0]
    ?? DEFAULT_THEME;
  const quranScrollY = -(playback.audioProgress * 22);
  const pageStyle = {
    '--theme-bg': theme.background,
    '--page-left': `${(theme.page.x / 1920) * 100}%`,
    '--page-top': `${(theme.page.y / 1080) * 100}%`,
    '--page-width': `${(theme.page.w / 1920) * 100}%`,
    '--page-height': `${(theme.page.h / 1080) * 100}%`,
    '--quran-zoom': `${theme.quranZoom * 100}%`,
    '--quran-scroll-y': `${quranScrollY}%`
  } as CSSProperties;

  return (
    <section
      className="quran-broadcast-scene"
      aria-label="Quran program"
      data-audio-state={playback.audioState}
      style={pageStyle}
    >
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
          src={theme.frame}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </div>

      <div className="quran-runtime-status" aria-hidden="true">
        <span>{item.title} / {theme.name}</span>
        <strong>{item.reciterId} / Page {page} / {Math.round(playback.audioProgress * 100)}%</strong>
      </div>

      <span className="sr-only">
        {playback.currentEntry?.imagePath ? (
          <>
            Playing {item.title}, page {page}, audio {playback.audioState},
            {Math.round(playback.audioCurrentTime)} of {Math.round(playback.audioDuration)} seconds.
          </>
        ) : (
          <>Quran page {page} is missing</>
        )}
      </span>
      {playback.audioError && <span className="sr-only">{playback.audioError}</span>}
    </section>
  );
}
