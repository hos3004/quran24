import type { CSSProperties } from 'react';
import { getScheduleForDay } from '../scheduler';
import type { ChannelOverlaySettings, ChannelSchedule, ChannelScheduleItem } from '../types';

export function ChannelOverlay({
  overlays,
  schedule,
  serverNow
}: {
  overlays: ChannelOverlaySettings | null;
  schedule: ChannelSchedule | null;
  serverNow: Date | null;
}) {
  if (!overlays) return null;

  const tickerMessages = buildTickerMessages(overlays, schedule, serverNow);

  return (
    <div className="channel-overlay-layer" aria-hidden="true">
      {overlays.logo.enabled && <ChannelLogo settings={overlays} />}
      {overlays.extraImage.enabled && overlays.extraImage.imagePath && <ExtraOverlayImage settings={overlays} />}
      {overlays.ticker.enabled && tickerMessages.length > 0 && (
        <TickerBar messages={tickerMessages} speedSec={overlays.ticker.speedSec} />
      )}
    </div>
  );
}

function ChannelLogo({ settings }: { settings: ChannelOverlaySettings }) {
  const logo = settings.logo;
  return (
    <div className={`channel-logo-bug overlay-${logo.position}`}>
      {logo.imagePath ? (
        <img src={logo.imagePath} alt="" draggable={false} />
      ) : (
        <div className="channel-logo-mark">24</div>
      )}
      <div>
        <strong>{logo.text}</strong>
        <span>{logo.subtext}</span>
      </div>
    </div>
  );
}

function ExtraOverlayImage({ settings }: { settings: ChannelOverlaySettings }) {
  const image = settings.extraImage;
  return (
    <img
      className={`channel-extra-overlay overlay-${image.position}`}
      src={image.imagePath}
      alt=""
      draggable={false}
      style={{ width: image.widthPx }}
    />
  );
}

function TickerBar({ messages, speedSec }: { messages: string[]; speedSec: number }) {
  const text = messages.join('   •   ');
  return (
    <div className="channel-ticker">
      <div className="channel-ticker-label">Quran24</div>
      <div className="channel-ticker-track">
        <div className="channel-ticker-content" style={{ '--ticker-speed': `${speedSec}s` } as CSSProperties}>
          <span>{text}</span>
          <span>{text}</span>
        </div>
      </div>
    </div>
  );
}

function buildTickerMessages(
  overlays: ChannelOverlaySettings,
  schedule: ChannelSchedule | null,
  serverNow: Date | null
) {
  const messages = [overlays.ticker.welcomeText].filter(Boolean);
  if (!overlays.ticker.includeTodaySchedule || !schedule || !serverNow) return messages;

  try {
    const day = getScheduleForDay(schedule, serverNow);
    const programs = day.items
      .slice(0, 8)
      .map(formatTickerItem)
      .filter(Boolean);

    if (programs.length > 0) {
      messages.push(`${overlays.ticker.todayPrefix}: ${programs.join('  |  ')}`);
    }
  } catch {
    return messages;
  }

  return messages;
}

function formatTickerItem(item: ChannelScheduleItem) {
  const time = item.start?.slice(0, 5);
  const title = item.title || item.type;
  return time ? `${time} ${title}` : title;
}
