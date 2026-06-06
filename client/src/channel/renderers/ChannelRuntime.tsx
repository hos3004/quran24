import { useEffect, useMemo } from 'react';
import { getActiveScheduleItem } from '../scheduler';
import { emitHeartbeat } from '../logger';
import { setRuntimeSnapshot } from '../runtimeStore';
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

  const active = useMemo(() => {
    if (!scheduleState.schedule || !clockState.serverNow) return null;
    return getActiveScheduleItem(scheduleState.schedule, clockState.serverNow);
  }, [scheduleState.schedule, clockState.serverNow]);

  const currentPage = active?.item.type === 'quran' ? active.item.fromPage : undefined;
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
          <RuntimeRenderer item={active.item} offsetSec={active.offsetSec} />
        ) : (
          <section className="channel-program channel-empty">
            <span className="program-kicker">Channel</span>
            <h2>Loading schedule</h2>
            <p>{scheduleState.error || clockState.error || 'Waiting for channel state'}</p>
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
      </aside>
    </main>
  );
}

function RuntimeRenderer({ item, offsetSec }: { item: ChannelScheduleItem; offsetSec: number }) {
  switch (item.type) {
    case 'quran':
      return <QuranRenderer item={item as QuranScheduleItem} offsetSec={offsetSec} />;
    case 'break':
      return <BreakRenderer item={item as BreakScheduleItem} offsetSec={offsetSec} />;
    case 'announcement':
      return <AnnouncementRenderer item={item as AnnouncementScheduleItem} />;
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

