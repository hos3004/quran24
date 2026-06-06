import { useCallback, useEffect, useRef, useState } from 'react';

type SlideshowState = {
  currentIndex: number;
  nextIndex: number;
  transitioning: boolean;
};

export function useSlideshow(slides: string[], intervalMs = 8000, transitionMs = 1500) {
  const [state, setState] = useState<SlideshowState>({
    currentIndex: 0,
    nextIndex: 1,
    transitioning: false
  });
  const timerRef = useRef<number | null>(null);
  const transitionRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
    timerRef.current = null;
    transitionRef.current = null;
  }, []);

  const safeIntervalMs = Math.max(1000, intervalMs);
  const safeTransitionMs = Math.max(0, Math.min(transitionMs, safeIntervalMs - 100));

  const advance = useCallback(() => {
    if (slides.length <= 1) return;

    setState((previous) => ({
      ...previous,
      nextIndex: (previous.currentIndex + 1) % slides.length,
      transitioning: true
    }));

    transitionRef.current = window.setTimeout(() => {
      setState((previous) => ({
        currentIndex: previous.nextIndex,
        nextIndex: (previous.nextIndex + 1) % slides.length,
        transitioning: false
      }));
      transitionRef.current = null;
    }, safeTransitionMs);
  }, [safeTransitionMs, slides.length]);

  useEffect(() => {
    clearTimers();

    if (slides.length <= 1) {
      setState({ currentIndex: 0, nextIndex: 0, transitioning: false });
      return;
    }

    setState((previous) => ({
      currentIndex: previous.currentIndex % slides.length,
      nextIndex: (previous.currentIndex + 1) % slides.length,
      transitioning: false
    }));

    const schedule = () => {
      timerRef.current = window.setTimeout(() => {
        advance();
        schedule();
      }, safeIntervalMs);
    };

    schedule();
    return clearTimers;
  }, [advance, clearTimers, safeIntervalMs, slides.length]);

  const currentSrc = slides.length > 0 ? slides[state.currentIndex % slides.length] : '';
  const nextSrc = slides.length > 1 ? slides[state.nextIndex % slides.length] : currentSrc;

  return { currentSrc, nextSrc, transitioning: state.transitioning };
}
