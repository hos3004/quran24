import type { ChannelScheduleItem, ScheduleValidationResult } from './types';

export type ChannelRuntimeSnapshot = {
  timestamp: number;
  scheduleVersion?: number;
  validation?: ScheduleValidationResult | null;
  currentItem?: ChannelScheduleItem | null;
  offsetSec?: number;
  currentPage?: number;
  playState: 'idle' | 'loading' | 'playing' | 'error';
};

type Listener = (snapshot: ChannelRuntimeSnapshot) => void;

let snapshot: ChannelRuntimeSnapshot = {
  timestamp: Date.now(),
  playState: 'idle'
};

const listeners = new Set<Listener>();

export function setRuntimeSnapshot(next: ChannelRuntimeSnapshot) {
  snapshot = next;
  for (const listener of listeners) listener(snapshot);
}

export function getRuntimeSnapshot() {
  return snapshot;
}

export function subscribeRuntimeSnapshot(listener: Listener) {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

