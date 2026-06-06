import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ChannelTheme, QuranScheduleItem } from '../types';
import type { QuranManifestEntry } from '../scheduler';
import { useQuranSchedulePlayback } from '../hooks/useQuranSchedulePlayback';
import { useSlideshow } from '../hooks/useSlideshow';
import { detectQuranContentBounds } from '../quranContentBounds';

type PageLayout = {
  imagePath: string;
  renderedW: number;
  renderedH: number;
  contentY: number;
  contentH: number;
  leftOffset: number;
};

const PAGE_CONTENT_GAP = 30;
const RECITER_LABELS: Record<string, string> = {
  ajmy: 'Ahmad Al Ajmy',
  maher: 'Maher Al Muaiqly'
};

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
  themes,
  slides
}: {
  item: QuranScheduleItem;
  manifest: QuranManifestEntry[];
  offsetSec: number;
  themes: ChannelTheme[];
  slides: string[];
}) {
  const playback = useQuranSchedulePlayback(item, manifest, offsetSec);
  const page = playback.pageOffset?.page ?? item.fromPage;
  const windowRef = useRef<HTMLDivElement | null>(null);
  const lastTranslateYRef = useRef<number | null>(null);
  const initializedPageRef = useRef<string | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [entryInitialY, setEntryInitialY] = useState<number | null>(null);
  const theme = themes.find((candidate) => candidate.id === item.themeId)
    ?? themes.find((candidate) => candidate.id === `preset-${item.layoutPresetId}`)
    ?? themes[0]
    ?? DEFAULT_THEME;
  const prevEntry = useMemo(() => {
    if (!playback.pageOffset) return null;
    const previousPage = playback.pageOffset.page - 1;
    return manifest.find((entry) => entry.page === previousPage && entry.page >= item.fromPage) ?? null;
  }, [item.fromPage, manifest, playback.pageOffset]);

  const quranZoom = theme.quranZoom || DEFAULT_THEME.quranZoom;
  const prevLayout = useQuranPageLayout(prevEntry, windowSize.width, quranZoom);
  const currLayout = useQuranPageLayout(playback.currentEntry, windowSize.width, quranZoom);
  const nextLayout = useQuranPageLayout(playback.nextEntry, windowSize.width, quranZoom);

  const offsetPrevToCurr = prevLayout && currLayout ? getPageAdvanceOffset(prevLayout, currLayout) : 0;
  const offsetCurrToNext = currLayout && nextLayout ? getPageAdvanceOffset(currLayout, nextLayout) : 0;
  const currKey = playback.currentEntry?.imagePath ?? null;

  useEffect(() => {
    const element = windowRef.current;
    if (!element) return;

    const updateSize = () => {
      setWindowSize({
        width: element.clientWidth,
        height: element.clientHeight
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!currLayout || !currKey || !windowSize.height) return;
    if (initializedPageRef.current === currKey) return;

    const initialY = lastTranslateYRef.current !== null && prevLayout
      ? lastTranslateYRef.current + offsetPrevToCurr
      : windowSize.height - currLayout.contentY;

    initializedPageRef.current = currKey;
    setEntryInitialY(initialY);
    lastTranslateYRef.current = initialY;
  }, [currKey, currLayout, offsetPrevToCurr, prevLayout, windowSize.height]);

  const translateY = useMemo(() => {
    if (!currLayout || !windowSize.height) return 0;
    const initialY = entryInitialY ?? windowSize.height - currLayout.contentY;
    const endY = windowSize.height * 0.6 - (currLayout.contentY + currLayout.contentH);
    const nextTranslateY = initialY + (endY - initialY) * playback.audioProgress;
    lastTranslateYRef.current = nextTranslateY;
    return nextTranslateY;
  }, [currLayout, entryInitialY, playback.audioProgress, windowSize.height]);

  const pageStyle = {
    '--theme-bg': theme.background,
    '--page-left': `${(theme.page.x / 1920) * 100}%`,
    '--page-top': `${(theme.page.y / 1080) * 100}%`,
    '--page-width': `${(theme.page.w / 1920) * 100}%`,
    '--page-height': `${(theme.page.h / 1080) * 100}%`,
    '--quran-flow-y': `${translateY}px`
  } as CSSProperties;

  return (
    <section
      className="quran-broadcast-scene"
      aria-label="Quran program"
      data-audio-state={playback.audioState}
      style={pageStyle}
    >
      <div className="quran-reference-stage">
        <QuranSlideWindow slides={slides} />
        <div className="quran-page-window" ref={windowRef}>
          <div className="quran-page-flow">
            <QuranFlowPage entry={prevEntry} layout={prevLayout} top={-offsetPrevToCurr} hidden={!prevEntry} />
            <QuranFlowPage entry={playback.currentEntry} layout={currLayout} top={0} />
            <QuranFlowPage entry={playback.nextEntry} layout={nextLayout} top={offsetCurrToNext} />
          </div>
          {!playback.currentEntry?.imagePath && <div className="quran-page-missing">Page {page}</div>}
        </div>
        <img
          className="quran-frame-overlay"
          src={theme.frame}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <QuranInfoBand entry={playback.currentEntry} reciterId={item.reciterId} />
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

function QuranSlideWindow({ slides }: { slides: string[] }) {
  const { currentSrc, nextSrc, transitioning } = useSlideshow(slides, 18000, 3000);
  const particles = useMemo(() => createDustParticles(120), []);

  if (slides.length === 0 || !currentSrc) {
    return (
      <div className="quran-slide-window quran-slide-window-empty" aria-hidden="true">
        <QuranParticles particles={particles} />
      </div>
    );
  }

  return (
    <div className="quran-slide-window" aria-hidden="true">
      <img className="quran-slide quran-slide-current" src={currentSrc} alt="" draggable={false} />
      {slides.length > 1 && (
        <img
          className={`quran-slide quran-slide-next${transitioning ? ' is-visible' : ''}`}
          src={nextSrc}
          alt=""
          draggable={false}
        />
      )}
      <div className="quran-slide-shade" />
      <QuranParticles particles={particles} />
    </div>
  );
}

function QuranInfoBand({
  entry,
  reciterId
}: {
  entry: QuranManifestEntry | null;
  reciterId: string;
}) {
  const surahName = readableSurahName(entry);
  const reciterName = RECITER_LABELS[reciterId] ?? reciterId;

  return (
    <div className="quran-info-band" aria-hidden="true">
      <div className="quran-info-section quran-info-reciter">
        <span>القارئ</span>
        <strong>{reciterName}</strong>
      </div>
      <div className="quran-info-divider" />
      <div className="quran-info-section quran-info-surah">
        <span>السورة</span>
        <strong>{surahName}</strong>
      </div>
      <div className="quran-info-divider quran-info-divider-short" />
      <div className="quran-info-grid">
        <div>
          <span>الصفحة</span>
          <strong>{entry?.page ?? '-'}</strong>
        </div>
        <div>
          <span>الجزء</span>
          <strong>{entry?.juz ?? '-'}</strong>
        </div>
      </div>
    </div>
  );
}

type DustParticle = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  tx: number;
  ty: number;
};

function QuranParticles({ particles }: { particles: DustParticle[] }) {
  return (
    <div className="quran-particles">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="quran-particle"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            '--particle-x': `${particle.tx}px`,
            '--particle-y': `${particle.ty}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function createDustParticles(count: number): DustParticle[] {
  let seed = 108;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  return Array.from({ length: count }, (_, id) => ({
    id,
    x: random() * 100,
    y: random() * 100,
    size: 1 + random() * 2.4,
    delay: random() * -28,
    duration: 20 + random() * 18,
    tx: (random() - 0.5) * 95,
    ty: -(50 + random() * 130)
  }));
}

function readableSurahName(entry: QuranManifestEntry | null) {
  const nameArabic = entry?.surah?.nameArabic;
  if (nameArabic && !looksMojibake(nameArabic)) return nameArabic;
  return entry?.surah?.nameSimple ?? '-';
}

function looksMojibake(value: string) {
  return /[ØÙ�]/.test(value);
}

function useQuranPageLayout(entry: QuranManifestEntry | null, windowWidth: number, quranZoom: number) {
  const [layout, setLayout] = useState<PageLayout | null>(null);

  useEffect(() => {
    const imagePath = entry?.imagePath;
    if (!imagePath || windowWidth <= 0) {
      setLayout(null);
      return;
    }

    let cancelled = false;
    detectQuranContentBounds(imagePath)
      .then((bounds) => {
        if (cancelled) return;
        const scale = (windowWidth / Math.max(1, bounds.width)) * quranZoom;
        setLayout({
          imagePath,
          renderedW: bounds.imageWidth * scale,
          renderedH: bounds.imageHeight * scale,
          contentY: bounds.y * scale,
          contentH: bounds.height * scale,
          leftOffset: (windowWidth - bounds.imageWidth * scale) / 2
        });
      })
      .catch(() => {
        if (!cancelled) setLayout(null);
      });

    return () => {
      cancelled = true;
    };
  }, [entry?.imagePath, quranZoom, windowWidth]);

  return layout;
}

function getPageAdvanceOffset(current: PageLayout, next: PageLayout) {
  return Math.max(0, current.contentY + current.contentH + PAGE_CONTENT_GAP - next.contentY);
}

function QuranFlowPage({
  entry,
  layout,
  top,
  hidden = false
}: {
  entry: QuranManifestEntry | null;
  layout: PageLayout | null;
  top: number;
  hidden?: boolean;
}) {
  if (!entry?.imagePath || !layout || hidden) return null;

  return (
    <img
      className="quran-flow-page"
      src={entry.imagePath}
      alt={`Quran page ${entry.page}`}
      draggable={false}
      style={{
        top,
        left: layout.leftOffset,
        width: layout.renderedW,
        height: layout.renderedH
      }}
    />
  );
}
