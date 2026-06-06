import { useEffect, useMemo, useRef, useState } from 'react';
import { calculateQuranPageFromOffset, type QuranManifestEntry, type QuranPageOffset } from '../scheduler';
import type { QuranScheduleItem } from '../types';

export type QuranPlaybackState = {
  pageOffset: QuranPageOffset | null;
  currentEntry: QuranManifestEntry | null;
  nextEntry: QuranManifestEntry | null;
  audioState: 'idle' | 'loading' | 'playing' | 'missing' | 'error';
  audioError: string | null;
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
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;

    if (!currentEntry?.audioPath) {
      audio.pause();
      audio.removeAttribute('src');
      setAudioState('missing');
      setAudioError('No audio path for current page');
      return;
    }

    let cancelled = false;
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
    };

    audio.addEventListener('error', onError);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.preload = 'auto';
    audio.src = audioPathForReciter(currentEntry.audioPath, item.reciterId);
    audio.load();
    setAudioState('loading');
    setAudioError(null);

    audio.play().catch((error: unknown) => {
      if (cancelled) return;
      setAudioState('error');
      setAudioError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('error', onError);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [currentEntry?.audioPath, item.reciterId]);

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
      audioRef.current?.pause();
      audioRef.current?.removeAttribute('src');
      audioRef.current = null;
    };
  }, []);

  return {
    pageOffset,
    currentEntry,
    nextEntry,
    audioState,
    audioError
  };
}

function audioPathForReciter(audioPath: string, reciterId: string) {
  const match = /^\/assets\/reciters\/([^/]+)\/(.+)$/.exec(audioPath);
  if (!match) return audioPath;
  return `/assets/reciters/${reciterId}/${match[2]}`;
}
