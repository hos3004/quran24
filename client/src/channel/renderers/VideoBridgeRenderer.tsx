import { useEffect, useRef, useState } from 'react';
import { hasAndroidBridge, sendAndroidBridgeEvent } from '../bridge/androidBridge';
import type { VideoScheduleItem } from '../types';

export function VideoBridgeRenderer({ item, offsetSec }: { item: VideoScheduleItem; offsetSec: number }) {
  const [bridgePresent, setBridgePresent] = useState(false);
  const initialOffsetRef = useRef(offsetSec);

  useEffect(() => {
    const sentToAndroid = sendAndroidBridgeEvent({
      type: 'PLAY_VIDEO',
      itemId: item.id,
      source: item.source,
      title: item.title,
      offsetSec: initialOffsetRef.current
    });
    setBridgePresent(sentToAndroid || hasAndroidBridge());
  }, [item.id, item.source, item.title]);

  return (
    <section className="channel-program channel-video" aria-label="Video bridge program">
      <span className="program-kicker">Video</span>
      <h2>{item.title}</h2>
      <p>{item.source}</p>
      <strong>{Math.floor(offsetSec)}s / {item.durationSec}s</strong>
      <small>{bridgePresent ? 'Sent to Android native player' : 'Browser fallback placeholder'}</small>
    </section>
  );
}
