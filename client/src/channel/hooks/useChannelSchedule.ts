import { useCallback, useEffect, useState } from 'react';
import type { ChannelSchedule, ScheduleValidationResult } from '../types';
import { loadCachedPayload, saveCachedPayload } from '../offlineCache';

const SCHEDULE_CACHE_KEY = 'quran24:channel-schedule:v1';

type SchedulePayload = {
  schedule: ChannelSchedule;
  validation: ScheduleValidationResult;
};

export type ChannelScheduleState = {
  schedule: ChannelSchedule | null;
  validation: ScheduleValidationResult | null;
  loading: boolean;
  error: string | null;
  source: 'network' | 'cache' | null;
  reload: () => void;
};

export function useChannelSchedule(): ChannelScheduleState {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<Omit<ChannelScheduleState, 'reload'>>({
    schedule: null,
    validation: null,
    loading: true,
    error: null,
    source: null
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({ ...current, loading: true, error: null }));
    fetch('/api/channel/schedule', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
        return response.json() as Promise<SchedulePayload>;
      })
      .then((payload) => {
        saveCachedPayload(SCHEDULE_CACHE_KEY, payload);
        if (!cancelled) {
          setState({
            schedule: payload.schedule,
            validation: payload.validation,
            loading: false,
            error: null,
            source: 'network'
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : String(error);
          const cached = loadCachedPayload<SchedulePayload>(SCHEDULE_CACHE_KEY);
          if (cached) {
            setState({
              schedule: cached.value.schedule,
              validation: cached.value.validation,
              loading: false,
              error: `Using cached schedule from ${cached.savedAt}: ${message}`,
              source: 'cache'
            });
          } else {
            setState((current) => ({
              ...current,
              loading: false,
              error: message,
              source: null
            }));
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  return {
    ...state,
    reload
  };
}
