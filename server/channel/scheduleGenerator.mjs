import { withChecksum } from './scheduleStore.mjs';

export function generateScheduleFromTemplate({
  template,
  reciters = [],
  themes = [],
  nowIso = new Date().toISOString(),
  publishedBy = 'programming-generator',
  version = 1,
  status = 'draft'
}) {
  const reciterIds = reciters.map((reciter) => reciter.id);
  const themeIds = themes.map((theme) => theme.id);
  const daily = [];
  let lastReciterId = null;
  let lastThemeId = null;

  const blocks = [...template.blocks].sort((a, b) => a.start.localeCompare(b.start));
  for (const [index, block] of blocks.entries()) {
    const reciterId = block.reciterId || chooseFromPolicy(template.rotation.reciters, reciterIds, index, lastReciterId);
    const themeId = block.themeId || chooseFromPolicy(template.rotation.themes, themeIds, index, lastThemeId, block.preferredTags, themes);
    lastReciterId = reciterId;
    lastThemeId = themeId;

    daily.push({
      id: block.id === 'fallback-quran' ? block.id : `quran-${block.id}`,
      type: 'quran',
      title: block.title,
      start: block.start,
      durationSec: block.durationSec,
      reciterId,
      themeId,
      layoutPresetId: themeId ? undefined : 2,
      fromPage: block.fromPage,
      toPage: block.toPage,
      allowAutoContinue: true
    });

    const filler = template.fillers[index % Math.max(1, template.fillers.length)];
    if (filler && index < blocks.length - 1) {
      const start = addSeconds(block.start, block.durationSec);
      daily.push(toScheduleFiller(filler, `${block.id}-${filler.id}`, start));
    }
  }

  if (!daily.some((item) => item.id === template.defaultFallbackItemId)) {
    daily.unshift({
      id: template.defaultFallbackItemId,
      type: 'quran',
      title: 'Fallback Quran',
      start: '00:00:00',
      reciterId: reciterIds[0] ?? 'ajmy',
      themeId: themeIds[0] ?? 'classic-gold',
      fromPage: template.pageCursor,
      toPage: Math.min(604, template.pageCursor + 19),
      allowAutoContinue: true
    });
  }

  const schedule = {
    version,
    timezone: template.timezone,
    publishedAt: nowIso,
    publishedBy,
    status,
    defaultFallbackItemId: template.defaultFallbackItemId,
    days: {
      daily: daily.sort((a, b) => a.start.localeCompare(b.start)),
      friday: []
    },
    religious: {
      profile: 'quran24-programming-template',
      fridayReminderItemIds: template.specialDays.friday.enabled ? template.specialDays.friday.reminderItemIds : [],
      taraweehLiveStreamItemIds: [],
      spiritualFillerItemIds: daily.filter((item) => item.type === 'break' || item.type === 'announcement' || item.type === 'audio_message').map((item) => item.id)
    }
  };

  return withChecksum(schedule);
}

function chooseFromPolicy(policy, ids, index, previousId, preferredTags = [], themes = []) {
  if (policy.mode === 'fixed' && policy.fixedId) return policy.fixedId;
  let pool = policy.pool?.length ? policy.pool : ids;
  if (preferredTags.length && themes.length) {
    const tagged = themes
      .filter((theme) => pool.includes(theme.id) && preferredTags.some((tag) => theme.tags?.includes(tag)))
      .map((theme) => theme.id);
    if (tagged.length) pool = tagged;
  }
  if (!pool.length) return ids[0] ?? '';
  let selected = pool[index % pool.length];
  if (policy.avoidImmediateRepeat && selected === previousId && pool.length > 1) {
    selected = pool[(index + 1) % pool.length];
  }
  return selected;
}

function toScheduleFiller(filler, id, start) {
  if (filler.type === 'announcement') {
    return {
      id,
      type: 'announcement',
      title: filler.title,
      start,
      durationSec: filler.durationSec,
      message: filler.message,
      tone: 'spiritual'
    };
  }
  if (filler.type === 'audio_message') {
    return {
      id,
      type: 'audio_message',
      title: filler.title,
      start,
      durationSec: filler.durationSec,
      audio: filler.audio || '/assets/audio/message.mp3',
      transcript: filler.message
    };
  }
  return {
    id,
    type: 'break',
    title: filler.title,
    start,
    durationSec: filler.durationSec,
    slides: filler.slides,
    audio: filler.audio
  };
}

function addSeconds(time, seconds) {
  const [h, m, s] = time.split(':').map(Number);
  const total = (h * 3600 + m * 60 + s + seconds) % 86400;
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return [hh, mm, ss].map((part) => String(part).padStart(2, '0')).join(':');
}
