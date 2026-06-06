import { describe, expect, it } from 'vitest';
import { getServerNowMs, shouldResync, syncServerTime, type ServerTimeSample } from './timeSync';

describe('timeSync', () => {
  it('chooses the lowest RTT sample', async () => {
    const samples = [
      { rtt: 80, time: '2026-06-06T00:00:00.000Z' },
      { rtt: 20, time: '2026-06-06T00:00:01.000Z' },
      { rtt: 60, time: '2026-06-06T00:00:02.000Z' }
    ];
    let perf = 1000;
    let date = Date.parse('2026-06-06T00:00:00.000Z');
    let call = 0;

    const sample = await syncServerTime({
      sampleCount: 3,
      performanceNow: () => perf,
      dateNow: () => date,
      fetcher: (async () => {
        const current = samples[call];
        call += 1;
        perf += current.rtt;
        date += current.rtt;
        return {
          ok: true,
          json: async () => ({ time: current.time })
        } as Response;
      }) as typeof fetch
    });

    expect(sample.rttMs).toBe(20);
    expect(sample.serverEpochAtSampleMs).toBe(Date.parse('2026-06-06T00:00:01.000Z') + 10);
  });

  it('does not drift during a simulated 24-hour monotonic run', () => {
    const baseServerMs = Date.parse('2026-06-06T00:00:00.000Z');
    const sample: ServerTimeSample = {
      serverEpochAtSampleMs: baseServerMs,
      sampledAtPerformanceMs: 5000,
      rttMs: 12,
      offsetMs: 0
    };

    const after24h = getServerNowMs(sample, 5000 + 24 * 60 * 60 * 1000);
    expect(after24h).toBe(baseServerMs + 24 * 60 * 60 * 1000);
  });

  it('requests resync after the configured interval', () => {
    const sample: ServerTimeSample = {
      serverEpochAtSampleMs: 1000,
      sampledAtPerformanceMs: 100,
      rttMs: 10,
      offsetMs: 0
    };

    expect(shouldResync(sample, 200, 240000)).toBe(false);
    expect(shouldResync(sample, 240100, 240000)).toBe(true);
  });
});

