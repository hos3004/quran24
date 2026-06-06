import { useEffect, useState } from 'react';
import type { ChannelSchedule, ScheduleValidationResult } from '../types';

export type ChannelScheduleState = {
  schedule: ChannelSchedule | null;
  validation: ScheduleValidationResult | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useChannelSchedule(): ChannelScheduleState {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<Omit<ChannelScheduleState, 'reload'>>({
    schedule: null,
    validation: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({ ...current, loading: true, error: null }));
    fetch('/api/channel/schedule', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
        return response.json() as Promise<{ schedule: ChannelSchedule; validation: ScheduleValidationResult }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setState({
            schedule: payload.schedule,
            validation: payload.validation,
            loading: false,
            error: null
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : String(error)
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return {
    ...state,
    reload: () => setReloadToken((value) => value + 1)
  };
}

