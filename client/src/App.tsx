import { useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './admin/AdminDashboard';
import { ChannelRuntime } from './channel/renderers/ChannelRuntime';

type ApiConfig = {
  service?: string;
  channelPath?: string;
  reciterName?: string;
  startPage?: number;
  loopMode?: boolean;
};

type LoadState = 'loading' | 'ready' | 'error';

type HealthResponse = {
  ok: boolean;
  service: string;
  time: string;
  uptimeSec: number;
  version: string;
};

type ChannelStatusResponse = {
  ok: boolean;
  phase: number;
  schedule: {
    loaded: boolean;
    activeVersion: number | null;
    source: string;
  };
  runtime: {
    channelRoute: string;
    androidBridge: boolean;
    heartbeat: string;
  };
  compatibility: {
    config: boolean;
    manifest: boolean;
    slides: boolean;
  };
};

type DiagnosticsState = {
  config: ApiConfig | null;
  health: HealthResponse | null;
  channelStatus: ChannelStatusResponse | null;
  errors: string[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function App() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState>({
    config: null,
    health: null,
    channelStatus: null,
    errors: []
  });
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      fetchJson<ApiConfig>('/api/config'),
      fetchJson<HealthResponse>('/api/health'),
      fetchJson<ChannelStatusResponse>('/api/channel/status')
    ]).then(([configResult, healthResult, statusResult]) => {
      if (cancelled) return;

      const errors = [configResult, healthResult, statusResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason));

      setDiagnostics({
        config: configResult.status === 'fulfilled' ? configResult.value : null,
        health: healthResult.status === 'fulfilled' ? healthResult.value : null,
        channelStatus: statusResult.status === 'fulfilled' ? statusResult.value : null,
        errors
      });

      setLoadState(errors.length === 3 ? 'error' : 'ready');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPath = useMemo(() => window.location.pathname || '/', []);
  const channelPath = diagnostics.config?.channelPath ?? '/channel';

  if (currentPath === '/channel') {
    return <ChannelRuntime />;
  }

  if (currentPath.startsWith('/admin')) {
    return <AdminDashboard diagnostics={diagnostics} loadState={loadState} />;
  }

  return (
    <main className="shell" data-route={currentPath}>
      <section className="status-panel">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">24</div>
          <div>
            <h1>Quran24</h1>
            <p>Android TV channel foundation</p>
          </div>
        </div>

        <div className="status-grid" aria-live="polite">
          <div className="metric">
            <span>Runtime</span>
            <strong>{loadState === 'ready' ? 'Connected' : loadState === 'loading' ? 'Loading' : 'Fallback'}</strong>
          </div>
          <div className="metric">
            <span>Service</span>
            <strong>{diagnostics.health?.service ?? diagnostics.config?.service ?? 'quran24-channel'}</strong>
          </div>
          <div className="metric">
            <span>Route</span>
            <strong>{currentPath}</strong>
          </div>
          <div className="metric">
            <span>Health</span>
            <strong>{diagnostics.health?.ok ? `v${diagnostics.health.version}` : 'Pending'}</strong>
          </div>
        </div>

        <div className="foundation-bar">
          <a href="/">Home</a>
          <a href={channelPath}>Channel</a>
          <a href="/admin">Admin</a>
          <a href="/api/config">Config API</a>
        </div>
      </section>
    </main>
  );
}
