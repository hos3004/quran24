import { useEffect, useState } from 'react';

export type OptionalAudioState = {
  state: 'idle' | 'loading' | 'playing' | 'missing' | 'error';
  error: string | null;
};

export function useOptionalAudio(src: string | undefined, offsetSec = 0): OptionalAudioState {
  const [state, setState] = useState<OptionalAudioState>({
    state: src ? 'loading' : 'missing',
    error: src ? null : 'No audio configured'
  });

  useEffect(() => {
    if (!src) {
      setState({ state: 'missing', error: 'No audio configured' });
      return;
    }

    const audio = new Audio();
    let cancelled = false;

    const onPlaying = () => {
      if (!cancelled) setState({ state: 'playing', error: null });
    };

    const onError = () => {
      if (!cancelled) {
        setState({ state: 'error', error: audio.error?.message || 'Audio failed to load' });
      }
    };

    const onLoadedMetadata = () => {
      try {
        audio.currentTime = Math.min(offsetSec, Math.max(0, audio.duration - 0.1));
      } catch {
        // Keep the visual runtime alive even when the browser refuses a seek.
      }
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('error', onError);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.preload = 'auto';
    audio.src = src;
    audio.load();
    setState({ state: 'loading', error: null });
    audio.play().catch((error: unknown) => {
      if (!cancelled) {
        setState({ state: 'error', error: error instanceof Error ? error.message : String(error) });
      }
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeAttribute('src');
    };
  }, [src]);

  return state;
}
