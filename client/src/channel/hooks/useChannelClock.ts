import { useEffect, useMemo, useState } from 'react';
import { getServerNow, shouldResync, syncServerTime, type ServerTimeSample } from '../timeSync';

export type ChannelClockState = {
  serverNow: Date | null;
  sample: ServerTimeSample | null;
  syncing: boolean;
  error: string | null;
  source: 'server' | 'local' | null;
};

export function useChannelClock(resyncIntervalMs = 240000) {
  const [state, setState] = useState<ChannelClockState>({
    serverNow: null,
    sample: null,
    syncing: true,
    error: null,
    source: null
  });

  useEffect(() => {
    let cancelled = false;
    const runSync = async () => {
      setState((current) => ({ ...current, syncing: true }));
      try {
        const sample = await syncServerTime();
        if (cancelled) return;
        setState({ sample, serverNow: getServerNow(sample), syncing: false, error: null, source: 'server' });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState((current) => ({
          ...current,
          serverNow: current.serverNow ?? new Date(),
          syncing: false,
          error: `Using local clock fallback: ${message}`,
          source: current.sample ? current.source : 'local'
        }));
      }
    };

    const tickTimer = window.setInterval(() => {
      setState((current) => {
        if (current.sample) return { ...current, serverNow: getServerNow(current.sample) };
        if (current.source === 'local') return { ...current, serverNow: new Date() };
        return current;
      });
    }, 1000);

    const syncTimer = window.setInterval(() => {
      setState((current) => {
        if (shouldResync(current.sample, performance.now(), resyncIntervalMs)) {
          void runSync();
        }
        return current;
      });
    }, 30000);

    void runSync();

    return () => {
      cancelled = true;
      if (tickTimer) window.clearInterval(tickTimer);
      if (syncTimer) window.clearInterval(syncTimer);
    };
  }, [resyncIntervalMs]);

  return useMemo(() => state, [state]);
}
