import { useEffect, useMemo, useState } from 'react';
import { getServerNow, shouldResync, syncServerTime, type ServerTimeSample } from '../timeSync';

export type ChannelClockState = {
  serverNow: Date | null;
  sample: ServerTimeSample | null;
  syncing: boolean;
  error: string | null;
};

export function useChannelClock(resyncIntervalMs = 240000) {
  const [state, setState] = useState<ChannelClockState>({
    serverNow: null,
    sample: null,
    syncing: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    const runSync = async () => {
      setState((current) => ({ ...current, syncing: true }));
      try {
        const sample = await syncServerTime();
        if (cancelled) return;
        setState({ sample, serverNow: getServerNow(sample), syncing: false, error: null });
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          syncing: false,
          error: error instanceof Error ? error.message : String(error)
        }));
      }
    };

    const tickTimer = window.setInterval(() => {
      setState((current) => {
        if (!current.sample) return current;
        return { ...current, serverNow: getServerNow(current.sample) };
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
