import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { ChannelTheme, QuranScheduleItem } from '../types';
import type { QuranManifestEntry } from '../scheduler';
import { useQuranSchedulePlayback } from '../hooks/useQuranSchedulePlayback';
import { formatArabicNumber, getQuranMetadataForPage, getSurahNameArabic, type QuranPageMetadata } from '../quranMetadata';
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
  ajmy: 'أحمد بن علي العجمي',
  maher: 'ماهر المعيقلي',
  afasy: 'مشاري راشد العفاسي',
  alafasy: 'مشاري راشد العفاسي',
  husary: 'محمود خليل الحصري',
  minshawi: 'محمد صديق المنشاوي',
  sudais: 'عبد الرحمن السديس'
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

    initializedPageRef.current = currKey;
    setEntryInitialY(getReadingStartY(currLayout, windowSize.height));
  }, [currKey, currLayout, windowSize.height]);

  const translateY = useMemo(() => {
    if (!currLayout || !windowSize.height) return 0;
    const initialY = entryInitialY ?? getReadingStartY(currLayout, windowSize.height);
    const endY = getReadingEndY(currLayout, windowSize.height);
    const progress = Math.min(1, Math.max(0, playback.audioProgress));
    return initialY + (endY - initialY) * progress;
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
  const metadata = getQuranMetadataForPage(entry?.page);
  const surahName = readableSurahName(entry, metadata);
  const surahNumber = readableSurahNumber(entry, metadata);
  const juz = entry?.juz ?? metadata?.juz ?? null;
  const reciterName = RECITER_LABELS[reciterId] ?? reciterId;

  return (
    <div className="quran-info-band" lang="ar" dir="rtl" aria-hidden="true">
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
          <span>رقم السورة</span>
          <strong>{surahNumber}</strong>
        </div>
        <div>
          <span>الصفحة</span>
          <strong>{formatArabicNumber(entry?.page)}</strong>
        </div>
        <div>
          <span>الجزء</span>
          <strong>{formatArabicNumber(juz)}</strong>
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

function readableSurahName(entry: QuranManifestEntry | null, metadata: QuranPageMetadata | null) {
  if (metadata?.surahNamesArabic.length) {
    const prefix = metadata.surahNamesArabic.length > 1 ? 'سور' : 'سورة';
    return `${prefix} ${metadata.surahNamesArabic.join('، ')}`;
  }

  const nameById = getSurahNameArabic(entry?.surah?.id);
  if (nameById) return `سورة ${nameById}`;

  const nameArabic = entry?.surah?.nameArabic;
  if (nameArabic && !looksMojibake(nameArabic)) return withSurahPrefix(nameArabic);
  return entry?.surah?.nameSimple ?? '-';
}

function readableSurahNumber(entry: QuranManifestEntry | null, metadata: QuranPageMetadata | null) {
  if (metadata?.surahIds.length) {
    return metadata.surahIds.map((surahId) => formatArabicNumber(surahId)).join(' / ');
  }
  return formatArabicNumber(entry?.surah?.id);
}

function withSurahPrefix(name: string) {
  return name.startsWith('سورة') || name.startsWith('سور ') ? name : `سورة ${name}`;
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

function getReadingStartY(layout: PageLayout, windowHeight: number) {
  if (layout.contentH <= windowHeight) return getCenteredReadingY(layout, windowHeight);
  return -layout.contentY;
}

function getReadingEndY(layout: PageLayout, windowHeight: number) {
  if (layout.contentH <= windowHeight) return getCenteredReadingY(layout, windowHeight);
  return windowHeight - (layout.contentY + layout.contentH);
}

function getCenteredReadingY(layout: PageLayout, windowHeight: number) {
  return (windowHeight - layout.contentH) / 2 - layout.contentY;
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
