import { useEffect, useState } from 'react';
import { hasAndroidBridge, sendAndroidBridgeEvent } from '../bridge/androidBridge';
import type { LiveStreamScheduleItem } from '../types';

export function LiveStreamBridgeRenderer({ item }: { item: LiveStreamScheduleItem }) {
  const [bridgePresent, setBridgePresent] = useState(false);

  useEffect(() => {
    const sentToAndroid = sendAndroidBridgeEvent({
      type: 'PLAY_LIVE_STREAM',
      itemId: item.id,
      source: item.source,
      title: item.title
    });
    setBridgePresent(sentToAndroid || hasAndroidBridge());
  }, [item.id, item.source, item.title]);

  return (
    <section className="channel-program channel-live" aria-label="Live stream bridge program">
      <span className="program-kicker">Live Stream</span>
      <h2>{item.title}</h2>
      <p>{item.source}</p>
      <small>{bridgePresent ? 'Sent to Android native player' : 'Browser fallback placeholder'}</small>
    </section>
  );
}
