import { useEffect, useMemo, useState } from 'react';
import { calculateQuranPageFromOffset, getActiveScheduleItem, type QuranManifestEntry } from '../scheduler';
import { emitHeartbeat, logRuntime } from '../logger';
import { setRuntimeSnapshot } from '../runtimeStore';
import { subscribeWebRuntimeCommands, type WebRuntimeCommand } from '../bridge/androidBridge';
import { useChannelClock } from '../hooks/useChannelClock';
import { useChannelSchedule } from '../hooks/useChannelSchedule';
import type {
  AnnouncementScheduleItem,
  BreakScheduleItem,
  ChannelScheduleItem,
  LiveStreamScheduleItem,
  QuranScheduleItem,
  VideoScheduleItem
} from '../types';
import { AnnouncementRenderer } from './AnnouncementRenderer';
import { BreakRenderer } from './BreakRenderer';
import { LiveStreamBridgeRenderer } from './LiveStreamBridgeRenderer';
import { QuranRenderer } from './QuranRenderer';
import { VideoBridgeRenderer } from './VideoBridgeRenderer';

export function ChannelRuntime() {
  const scheduleState = useChannelSchedule();
  const clockState = useChannelClock();
  const [manifest, setManifest] = useState<QuranManifestEntry[]>([]);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<WebRuntimeCommand | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/manifest', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
        return response.json() as Promise<QuranManifestEntry[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setManifest(data);
          setManifestError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setManifestError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeWebRuntimeCommands((command) => {
    setLastCommand(command);
    logRuntime('info', 'web_runtime_command', {
      commandType: command.type,
      itemId: 'itemId' in command ? command.itemId : undefined
    });

    if (command.type === 'RELOAD_SCHEDULE') {
      scheduleState.reload();
    }
  }), [scheduleState.reload]);

  const active = useMemo(() => {
    if (!scheduleState.schedule || !clockState.serverNow) return null;
    return getActiveScheduleItem(scheduleState.schedule, clockState.serverNow);
  }, [scheduleState.schedule, clockState.serverNow]);

  const currentPage = active?.item.type === 'quran'
    ? calculateQuranPageFromOffset(active.item, manifest, active.offsetSec)?.page ?? active.item.fromPage
    : undefined;
  const playState = scheduleState.loading || clockState.syncing ? 'loading' : active ? 'playing' : 'idle';

  useEffect(() => {
    setRuntimeSnapshot({
      timestamp: Date.now(),
      scheduleVersion: scheduleState.schedule?.version,
      validation: scheduleState.validation,
      currentItem: active?.item ?? null,
      offsetSec: active?.offsetSec,
      currentPage,
      playState
    });
  }, [active, currentPage, playState, scheduleState.schedule?.version, scheduleState.validation]);

  useEffect(() => {
    const sendHeartbeat = () => {
      emitHeartbeat({
        type: 'HEARTBEAT',
        timestamp: Date.now(),
        currentItemId: active?.item.id,
        currentPage,
        playState
      });
    };

    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 5000);
    return () => window.clearInterval(timer);
  }, [active?.item.id, currentPage, playState]);

  return (
    <main className="channel-runtime-shell">
      <section className="channel-stage">
        {active ? (
          <RuntimeRenderer item={active.item} manifest={manifest} offsetSec={active.offsetSec} />
        ) : (
          <section className="channel-program channel-empty">
            <span className="program-kicker">Channel</span>
            <h2>Loading schedule</h2>
            <p>{scheduleState.error || clockState.error || manifestError || 'Waiting for channel state'}</p>
          </section>
        )}
      </section>

      <aside className="channel-diagnostics" aria-label="Channel runtime diagnostics">
        <div>
          <span>Server Time</span>
          <strong>{clockState.serverNow?.toISOString() ?? 'syncing'}</strong>
        </div>
        <div>
          <span>Local Time</span>
          <strong>{new Date().toISOString()}</strong>
        </div>
        <div>
          <span>Active Item</span>
          <strong>{active?.item.id ?? 'none'}</strong>
        </div>
        <div>
          <span>Offset</span>
          <strong>{active ? `${Math.floor(active.offsetSec)}s` : 'none'}</strong>
        </div>
        <div>
          <span>Schedule Version</span>
          <strong>{scheduleState.schedule?.version ?? 'none'}</strong>
        </div>
        <div>
          <span>Validation</span>
          <strong>{scheduleState.validation?.ok ? 'valid' : scheduleState.validation ? 'invalid' : 'pending'}</strong>
        </div>
        <div>
          <span>Manifest</span>
          <strong>{manifestError ? 'error' : `${manifest.length} pages`}</strong>
        </div>
        <div>
          <span>Last Command</span>
          <strong>{lastCommand?.type ?? 'none'}</strong>
        </div>
      </aside>
    </main>
  );
}

function RuntimeRenderer({
  item,
  manifest,
  offsetSec
}: {
  item: ChannelScheduleItem;
  manifest: QuranManifestEntry[];
  offsetSec: number;
}) {
  switch (item.type) {
    case 'quran':
      return <QuranRenderer item={item as QuranScheduleItem} manifest={manifest} offsetSec={offsetSec} />;
    case 'break':
      return <BreakRenderer item={item as BreakScheduleItem} offsetSec={offsetSec} />;
    case 'announcement':
      return <AnnouncementRenderer item={item as AnnouncementScheduleItem} offsetSec={offsetSec} />;
    case 'video':
      return <VideoBridgeRenderer item={item as VideoScheduleItem} offsetSec={offsetSec} />;
    case 'live_stream':
      return <LiveStreamBridgeRenderer item={item as LiveStreamScheduleItem} />;
    default:
      return (
        <section className="channel-program channel-empty">
          <span className="program-kicker">{item.type}</span>
          <h2>{item.title}</h2>
          <p>Renderer will be added in a later phase.</p>
        </section>
      );
  }
}
