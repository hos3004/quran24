const SPIRITUAL_KEYWORDS = [
  'dua',
  'duaa',
  'dhikr',
  'quran',
  'kahf',
  'taraweeh',
  'ramadan',
  'jumuah',
  'friday',
  'salawat'
];

export function summarizeReligiousSchedule(schedule, options = {}) {
  const now = options.now || new Date();
  const items = collectScheduleItems(schedule);
  const fridayItems = Array.isArray(schedule?.days?.friday) ? schedule.days.friday : [];
  const quranItems = items.filter((item) => item.type === 'quran');
  const taraweehItems = items.filter(isTaraweehItem);
  const spiritualFillers = items.filter(isSpiritualFiller);
  const quranPageSpan = summarizeQuranPageSpan(quranItems);
  const recommendations = buildRecommendations({
    fridayItems,
    taraweehItems,
    spiritualFillers,
    quranPageSpan
  });

  return {
    ok: true,
    generatedAt: now.toISOString(),
    scheduleVersion: schedule?.version ?? null,
    timezone: schedule?.timezone ?? null,
    metadata: normalizeReligiousMetadata(schedule?.religious),
    summary: {
      fridayScheduleConfigured: fridayItems.length > 0,
      fridayItemCount: fridayItems.length,
      taraweehLiveStreamConfigured: taraweehItems.length > 0,
      taraweehItemIds: taraweehItems.map((item) => item.id),
      spiritualFillerCount: spiritualFillers.length,
      spiritualFillerItemIds: spiritualFillers.map((item) => item.id),
      quranItemCount: quranItems.length,
      quranPageSpan
    },
    recommendations
  };
}

export function collectScheduleItems(schedule) {
  if (!schedule?.days || typeof schedule.days !== 'object') return [];
  return Object.values(schedule.days).flatMap((items) => Array.isArray(items) ? items : []);
}

function buildRecommendations({ fridayItems, taraweehItems, spiritualFillers, quranPageSpan }) {
  const recommendations = [];
  if (fridayItems.length === 0) {
    recommendations.push('Add a Friday schedule override for Jumuah reminders or Surah Al-Kahf programming.');
  }
  if (taraweehItems.length === 0) {
    recommendations.push('Add a Taraweeh live stream item before Ramadan deployment.');
  }
  if (spiritualFillers.length < 2) {
    recommendations.push('Add more short dua, dhikr, or announcement fillers for natural channel breaks.');
  }
  if (quranPageSpan.coveredPages < 20) {
    recommendations.push('Expand Quran page coverage as local page/audio assets are packaged.');
  }
  return recommendations;
}

function summarizeQuranPageSpan(quranItems) {
  const pages = new Set();
  for (const item of quranItems) {
    if (!Number.isInteger(item.fromPage) || !Number.isInteger(item.toPage)) continue;
    for (let page = item.fromPage; page <= item.toPage; page += 1) {
      pages.add(page);
    }
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return {
    coveredPages: sorted.length,
    firstPage: sorted[0] ?? null,
    lastPage: sorted[sorted.length - 1] ?? null
  };
}

function isTaraweehItem(item) {
  if (item.type !== 'live_stream' && item.type !== 'video') return false;
  return textMatches(item, ['taraweeh', 'tarawih', 'ramadan']);
}

function isSpiritualFiller(item) {
  if (item.type !== 'break' && item.type !== 'announcement' && item.type !== 'audio_message') return false;
  if (item.tone === 'spiritual') return true;
  return textMatches(item, SPIRITUAL_KEYWORDS);
}

function textMatches(item, keywords) {
  const haystack = [
    item.id,
    item.title,
    item.message,
    item.transcript,
    item.source,
    ...(Array.isArray(item.slides) ? item.slides : [])
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function normalizeReligiousMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      profile: 'default',
      fridayReminderItemIds: [],
      taraweehLiveStreamItemIds: [],
      spiritualFillerItemIds: []
    };
  }

  return {
    profile: typeof value.profile === 'string' && value.profile.trim() ? value.profile.trim() : 'default',
    fridayReminderItemIds: normalizeIdList(value.fridayReminderItemIds),
    taraweehLiveStreamItemIds: normalizeIdList(value.taraweehLiveStreamItemIds),
    spiritualFillerItemIds: normalizeIdList(value.spiritualFillerItemIds)
  };
}

function normalizeIdList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : [];
}
