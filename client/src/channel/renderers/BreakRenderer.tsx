import type { CSSProperties } from 'react';
import type { BreakScheduleItem } from '../types';
import { useOptionalAudio } from '../hooks/useOptionalAudio';

export function BreakRenderer({ item, offsetSec }: { item: BreakScheduleItem; offsetSec: number }) {
  const audio = useOptionalAudio(item.audio, offsetSec);
  const slides = item.slides ?? [];
  const duration = Math.max(1, item.durationSec);
  const clampedOffset = Math.max(0, Math.min(offsetSec, duration));
  const progress = clampedOffset / duration;
  const slideDuration = slides.length > 0 ? Math.max(4, duration / slides.length) : duration;
  const slideIndex = slides.length > 0 ? Math.min(slides.length - 1, Math.floor(clampedOffset / slideDuration)) : -1;
  const activeSlide = slideIndex >= 0 ? slides[slideIndex] : null;

  return (
    <section
      className="channel-program channel-break"
      aria-label="Break program"
      style={activeSlide ? { '--break-slide': `url(${activeSlide})` } as CSSProperties : undefined}
    >
      <span className="program-kicker">Break</span>
      <h2>{item.title}</h2>
      <p>{slides.length ? `Slide ${slideIndex + 1} of ${slides.length}` : 'Visual filler'}</p>
      <div className="program-progress" aria-label="Break progress">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <strong>{Math.max(0, Math.ceil(duration - clampedOffset))}s remaining - audio {audio.state}</strong>
      {audio.error && <small>{audio.error}</small>}
    </section>
  );
}
