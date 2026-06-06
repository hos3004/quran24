export type ServerTimeSample = {
  serverEpochAtSampleMs: number;
  sampledAtPerformanceMs: number;
  rttMs: number;
  offsetMs: number;
};

export type TimeSyncOptions = {
  endpoint?: string;
  sampleCount?: number;
  fetcher?: typeof fetch;
  performanceNow?: () => number;
  dateNow?: () => number;
};

export async function syncServerTime(options: TimeSyncOptions = {}): Promise<ServerTimeSample> {
  const sampleCount = clampInteger(options.sampleCount ?? 5, 3, 7);
  const samples: ServerTimeSample[] = [];

  for (let i = 0; i < sampleCount; i += 1) {
    samples.push(await sampleServerTime(options));
  }

  return samples.reduce((best, sample) => (sample.rttMs < best.rttMs ? sample : best));
}

export async function sampleServerTime(options: TimeSyncOptions = {}): Promise<ServerTimeSample> {
  const endpoint = options.endpoint ?? '/api/health';
  const fetcher = options.fetcher ?? fetch;
  const performanceNow = options.performanceNow ?? (() => performance.now());
  const dateNow = options.dateNow ?? (() => Date.now());

  const startedPerformanceMs = performanceNow();
  const startedEpochMs = dateNow();
  const response = await fetcher(endpoint, { cache: 'no-store' });
  const endedPerformanceMs = performanceNow();

  if (!response.ok) {
    throw new Error(`Time sync failed: ${response.status}`);
  }

  const body = (await response.json()) as { time?: string };
  const serverEpochMs = Date.parse(body.time ?? '');
  if (Number.isNaN(serverEpochMs)) {
    throw new Error('Time sync response missing valid time');
  }

  const rttMs = endedPerformanceMs - startedPerformanceMs;
  const localMidpointEpochMs = startedEpochMs + rttMs / 2;

  return {
    serverEpochAtSampleMs: serverEpochMs + rttMs / 2,
    sampledAtPerformanceMs: startedPerformanceMs + rttMs / 2,
    rttMs,
    offsetMs: serverEpochMs - localMidpointEpochMs
  };
}

export function getServerNowMs(sample: ServerTimeSample, performanceNowMs = performance.now()): number {
  return sample.serverEpochAtSampleMs + (performanceNowMs - sample.sampledAtPerformanceMs);
}

export function getServerNow(sample: ServerTimeSample, performanceNowMs = performance.now()): Date {
  return new Date(getServerNowMs(sample, performanceNowMs));
}

export function shouldResync(sample: ServerTimeSample | null, performanceNowMs = performance.now(), intervalMs = 240000): boolean {
  if (!sample) return true;
  return performanceNowMs - sample.sampledAtPerformanceMs >= intervalMs;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

