import { useEffect, useMemo, useState } from 'react';

type ApiConfig = {
  service?: string;
  channelPath?: string;
  reciterName?: string;
  startPage?: number;
  loopMode?: boolean;
};

type LoadState = 'loading' | 'ready' | 'error';

export function App() {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/config')
      .then((response) => {
        if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
        return response.json() as Promise<ApiConfig>;
      })
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPath = useMemo(() => window.location.pathname || '/', []);
  const channelPath = config?.channelPath ?? '/channel';

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
            <strong>{config?.service ?? 'quran24-channel'}</strong>
          </div>
          <div className="metric">
            <span>Route</span>
            <strong>{currentPath}</strong>
          </div>
          <div className="metric">
            <span>Channel</span>
            <strong>{channelPath}</strong>
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

