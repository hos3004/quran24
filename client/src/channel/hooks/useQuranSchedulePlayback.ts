import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateQuranPageFromOffset, type QuranManifestEntry, type QuranPageOffset } from '../scheduler';
import type { QuranScheduleItem } from '../types';

export type QuranPlaybackState = {
  pageOffset: QuranPageOffset | null;
  currentEntry: QuranManifestEntry | null;
  nextEntry: QuranManifestEntry | null;
  audioState: 'idle' | 'loading' | 'playing' | 'missing' | 'error';
  audioError: string | null;
  audioSrc: string | null;
  audioCurrentTime: number;
  audioDuration: number;
  audioProgress: number;
};

export function useQuranSchedulePlayback(
  item: QuranScheduleItem,
  manifest: QuranManifestEntry[],
  offsetSec: number
): QuranPlaybackState {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetOffsetRef = useRef(0);
  const [audioState, setAudioState] = useState<QuranPlaybackState['audioState']>('idle');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioClock, setAudioClock] = useState({ currentTime: 0, duration: 0 });

  const pageOffset = useMemo(
    () => calculateQuranPageFromOffset(item, manifest, offsetSec),
    [item, manifest, offsetSec]
  );

  const currentEntry = useMemo(
    () => manifest.find((entry) => entry.page === pageOffset?.page) ?? null,
    [manifest, pageOffset?.page]
  );

  const nextEntry = useMemo(() => {
    if (!pageOffset) return null;
    return manifest.find((entry) => entry.page === pageOffset.page + 1 && entry.page <= item.toPage) ?? null;
  }, [item.toPage, manifest, pageOffset]);

  useEffect(() => {
    targetOffsetRef.current = pageOffset?.pageOffsetSec ?? 0;
  }, [pageOffset?.pageOffsetSec]);

  useEffect(() => {
    const images: HTMLImageElement[] = [];
    for (const entry of [currentEntry, nextEntry]) {
      if (!entry?.imagePath) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = entry.imagePath;
      images.push(image);
    }

    return () => {
      for (const image of images) image.src = '';
    };
  }, [currentEntry, nextEntry]);

  useEffect(() => {
    if (!audioRef.current) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.controls = false;
      audio.preload = 'auto';
      audio.style.display = 'none';
      audio.setAttribute('playsinline', 'true');
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
    const audio = audioRef.current;

    if (!currentEntry?.audioPath) {
      audio.pause();
      audio.removeAttribute('src');
      setAudioSrc(null);
      setAudioClock({ currentTime: 0, duration: 0 });
      setAudioState('missing');
      setAudioError('No audio path for current page');
      return;
    }

    let cancelled = false;
    const nextAudioSrc = audioPathForReciter(currentEntry.audioPath, item.reciterId);
    const requestPlayback = () => {
      audio.muted = false;
      audio.volume = 1;
      audio.play().catch((error: unknown) => {
        if (cancelled) return;
        setAudioState('error');
        setAudioError(error instanceof Error ? error.message : String(error));
      });
    };

    const onError = () => {
      if (cancelled) return;
      setAudioState('error');
      setAudioError(audio.error?.message || 'Audio failed to load');
    };

    const onPlaying = () => {
      if (!cancelled) setAudioState('playing');
    };

    const onLoadedMetadata = () => {
      if (cancelled) return;
      try {
        audio.currentTime = Math.min(targetOffsetRef.current, Math.max(0, audio.duration - 0.1));
      } catch {
        // Some browsers refuse seeking before enough data is buffered.
      }
      setAudioClock({
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0
      });
      requestPlayback();
    };

    const onCanPlay = () => {
      if (!cancelled && audio.paused) requestPlayback();
    };

    audio.addEventListener('error', onError);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.preload = 'auto';
    audio.src = nextAudioSrc;
    audio.muted = false;
    audio.volume = 1;
    audio.load();
    setAudioSrc(nextAudioSrc);
    setAudioClock({ currentTime: 0, duration: 0 });
    setAudioState('loading');
    setAudioError(null);

    requestPlayback();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('error', onError);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [currentEntry?.audioPath, item.reciterId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      setAudioClock((previous) => {
        const currentDelta = Math.abs(previous.currentTime - currentTime);
        const durationDelta = Math.abs(previous.duration - duration);
        if (currentDelta < 0.2 && durationDelta < 0.2) return previous;
        return { currentTime, duration };
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio || audio.readyState < 1 || audio.paused) return;
      const driftSec = Math.abs(audio.currentTime - targetOffsetRef.current);
      if (driftSec > 2.5) {
        try {
          audio.currentTime = targetOffsetRef.current;
        } catch {
          // Keep visual playback running even when audio seeking fails.
        }
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      audio?.pause();
      audio?.removeAttribute('src');
      audio?.remove();
      audioRef.current = null;
    };
  }, []);

  const fallbackDuration = pageOffset?.pageDurationSec ?? 0;
  const audioDuration = audioClock.duration > 0 ? audioClock.duration : fallbackDuration;
  const audioCurrentTime = audioClock.currentTime > 0 ? audioClock.currentTime : (pageOffset?.pageOffsetSec ?? 0);
  const audioProgress = audioDuration > 0
    ? Math.min(1, Math.max(0, audioCurrentTime / audioDuration))
    : 0;

  return {
    pageOffset,
    currentEntry,
    nextEntry,
    audioState,
    audioError,
    audioSrc,
    audioCurrentTime,
    audioDuration,
    audioProgress
  };
}

function audioPathForReciter(audioPath: string, reciterId: string) {
  const match = /^\/assets\/reciters\/([^/]+)\/(.+)$/.exec(audioPath);
  if (!match) return audioPath;
  return `/assets/reciters/${reciterId}/${match[2]}`;
}
