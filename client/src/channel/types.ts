export type ChannelItemType =
  | 'quran'
  | 'break'
  | 'video'
  | 'live_stream'
  | 'announcement'
  | 'image_slideshow'
  | 'audio_message';

export type ScheduleStatus = 'draft' | 'published' | 'archived';

export type WeekdayKey =
  | 'daily'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type ScheduleMetadata = {
  version: number;
  publishedAt: string;
  publishedBy?: string;
  checksum?: string;
  status: ScheduleStatus;
};

export type BaseChannelItem = {
  id: string;
  type: ChannelItemType;
  title: string;
  start: string;
  durationSec?: number;
};

export type QuranScheduleItem = BaseChannelItem & {
  type: 'quran';
  reciterId: string;
  fromPage: number;
  toPage: number;
  layoutPresetId?: number;
  themeId?: string;
  allowAutoContinue?: boolean;
};

export type ChannelTheme = {
  id: string;
  name: string;
  frame: string;
  background: string;
  quranZoom: number;
  page: { x: number; y: number; w: number; h: number };
  info?: { x: number; y: number; w: number; h: number };
  tags?: string[];
};

export type BreakScheduleItem = BaseChannelItem & {
  type: 'break';
  durationSec: number;
  slides?: string[];
  audio?: string;
};

export type AnnouncementScheduleItem = BaseChannelItem & {
  type: 'announcement';
  durationSec: number;
  message: string;
  tone?: 'info' | 'warning' | 'spiritual';
};

export type VideoScheduleItem = BaseChannelItem & {
  type: 'video';
  durationSec: number;
  source: string;
  startMode?: 'timeline_offset' | 'from_start';
};

export type LiveStreamScheduleItem = BaseChannelItem & {
  type: 'live_stream';
  source: string;
  durationSec?: number;
  startMode?: 'live_edge' | 'timeline_offset';
};

export type ImageSlideshowScheduleItem = BaseChannelItem & {
  type: 'image_slideshow';
  durationSec: number;
  slides: string[];
  audio?: string;
};

export type AudioMessageScheduleItem = BaseChannelItem & {
  type: 'audio_message';
  durationSec: number;
  audio: string;
  transcript?: string;
};

export type ChannelScheduleItem =
  | QuranScheduleItem
  | BreakScheduleItem
  | AnnouncementScheduleItem
  | VideoScheduleItem
  | LiveStreamScheduleItem
  | ImageSlideshowScheduleItem
  | AudioMessageScheduleItem;

export type ChannelScheduleDays = Partial<Record<WeekdayKey, ChannelScheduleItem[]>> & {
  daily: ChannelScheduleItem[];
};

export type ReligiousScheduleMetadata = {
  profile?: string;
  fridayReminderItemIds?: string[];
  taraweehLiveStreamItemIds?: string[];
  spiritualFillerItemIds?: string[];
};

export type ChannelSchedule = ScheduleMetadata & {
  timezone: string;
  defaultFallbackItemId: string;
  days: ChannelScheduleDays;
  religious?: ReligiousScheduleMetadata;
};

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export type ChannelOverlaySettings = {
  version: number;
  logo: {
    enabled: boolean;
    text: string;
    subtext: string;
    imagePath?: string;
    position: OverlayPosition;
  };
  ticker: {
    enabled: boolean;
    welcomeText: string;
    todayPrefix: string;
    includeTodaySchedule: boolean;
    speedSec: number;
  };
  extraImage: {
    enabled: boolean;
    imagePath?: string;
    alt: string;
    position: OverlayPosition;
    widthPx: number;
  };
};

export type ScheduleValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
