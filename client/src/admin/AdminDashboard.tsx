import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveScheduleItem } from '../channel/scheduler';
import type {
  BreakScheduleItem,
  ChannelOverlaySettings,
  ChannelSchedule,
  ChannelScheduleItem,
  LiveStreamScheduleItem,
  QuranScheduleItem,
  ScheduleValidationResult,
  VideoScheduleItem,
  WeekdayKey
} from '../channel/types';
import {
  createScheduleItem,
  editableItemTypes,
  formatSeconds,
  parseMediaList,
  sortScheduleItems,
  stringifyMediaList
} from './scheduleEditorUtils';

type LoadState = 'loading' | 'ready' | 'error';

type AdminDiagnostics = {
  config: { channelPath?: string; service?: string } | null;
  health: { ok: boolean; service: string; time: string; uptimeSec: number; version: string } | null;
  channelStatus: {
    ok: boolean;
    phase: number;
    schedule: { loaded: boolean; activeVersion: number | null; source: string };
    runtime: {
      channelRoute: string;
      androidBridge: boolean;
      androidTvShell?: boolean;
      androidBridgeReceiver?: boolean;
      androidWatchdog?: boolean;
      nativeMedia3Playback?: boolean;
      nativeHlsPlayback?: boolean;
      webOfflineCache?: boolean;
      androidWebViewCacheFallback?: boolean;
      telemetryHeartbeatApi?: boolean;
      remoteDeviceStatus?: boolean;
      webRuntimeErrorReporter?: boolean;
      webRuntimeErrorBoundary?: boolean;
      webRuntimeStallWatchdog?: boolean;
      boundedTelemetryRetention?: boolean;
      religiousScheduleInsights?: boolean;
      fridayOverrideAwareness?: boolean;
      taraweehReadiness?: boolean;
      spiritualFillerInventory?: boolean;
      channelTelemetryAlias?: boolean;
      channelDevicesAlias?: boolean;
      remoteReloadCommand?: boolean;
      webViewAssetLoader?: boolean;
      bundledFallbackScreen?: boolean;
      heartbeat: string;
    };
    religiousSchedule?: {
      loaded: boolean;
      fridayScheduleConfigured: boolean;
      taraweehLiveStreamConfigured: boolean;
      spiritualFillerCount: number;
      quranCoveredPages: number;
    };
    telemetry?: {
      loaded: boolean;
      totalDevices: number;
      onlineDevices: number;
      staleAfterSec: number;
      source: string;
    };
    compatibility: { config: boolean; manifest: boolean; slides: boolean };
  } | null;
  religiousSchedule: ReligiousSchedule | null;
  telemetry: TelemetryStatus | null;
  errors: string[];
};

type ReligiousSchedule = {
  ok: boolean;
  generatedAt: string;
  scheduleVersion: number | null;
  timezone: string | null;
  metadata: {
    profile: string;
    fridayReminderItemIds: string[];
    taraweehLiveStreamItemIds: string[];
    spiritualFillerItemIds: string[];
  };
  summary: {
    fridayScheduleConfigured: boolean;
    fridayItemCount: number;
    taraweehLiveStreamConfigured: boolean;
    taraweehItemIds: string[];
    spiritualFillerCount: number;
    spiritualFillerItemIds: string[];
    quranItemCount: number;
    quranPageSpan: {
      coveredPages: number;
      firstPage: number | null;
      lastPage: number | null;
    };
  };
  recommendations: string[];
};

type TelemetryDeviceStatus = {
  deviceId: string;
  deviceLabel: string;
  source: string;
  firstSeenAt: string;
  lastSeenAt: string;
  heartbeatCount: number;
  ageSec: number | null;
  stale: boolean;
  lastHeartbeat: {
    currentItemId?: string;
    currentPage?: number;
    playState: string;
    scheduleVersion?: number;
    clockSource?: string;
    scheduleSource?: string;
    manifestSource?: string;
    androidBridgeAvailable?: boolean;
    lastCommandType?: string;
  };
};

type TelemetryStatus = {
  ok: boolean;
  generatedAt: string;
  staleAfterSec: number;
  totalDevices: number;
  onlineDevices: number;
  pendingCommandCount?: number;
  devices: TelemetryDeviceStatus[];
  recentEvents: {
    type: string;
    time: string;
    deviceId: string;
    currentItemId: string | null;
    playState: string;
    scheduleVersion: number | null;
  }[];
};

type ScheduleResponse = {
  ok: boolean;
  schedule: ChannelSchedule;
  validation: ScheduleValidationResult;
};

type ValidationResponse = {
  ok: boolean;
  validation: ScheduleValidationResult;
};

type SaveResponse = ValidationResponse & {
  schedule?: ChannelSchedule;
  historyFile?: string | null;
  errors?: string[];
  warnings?: string[];
};

type Reciter = {
  id: string;
  name: string;
  folderName: string;
  audioDir: string;
};

type RecitersResponse = {
  ok: boolean;
  audioRootDir: string;
  activeReciterId: string;
  reciters: Reciter[];
  validation?: ScheduleValidationResult;
};

type ChannelTheme = {
  id: string;
  name: string;
  frame: string;
  background: string;
  quranZoom: number;
  page: { x: number; y: number; w: number; h: number };
  info?: { x: number; y: number; w: number; h: number };
  tags?: string[];
};

type ThemesResponse = {
  ok: boolean;
  activeThemeId: string;
  themes: ChannelTheme[];
  validation?: ScheduleValidationResult;
};

type OverlaysResponse = {
  ok: boolean;
  overlays: ChannelOverlaySettings;
  validation?: ScheduleValidationResult;
};

type ProgrammingTemplate = {
  version: number;
  timezone: string;
  defaultFallbackItemId: string;
  pageCursor: number;
  rotation: {
    reciters: RotationPolicy;
    themes: RotationPolicy;
  };
  fillers: ProgrammingFiller[];
  blocks: ProgrammingBlock[];
  specialDays: {
    friday: { enabled: boolean; reminderItemIds: string[] };
    ramadan: { enabled: boolean; taraweehLiveStreamUrl: string };
  };
};

type RotationPolicy = {
  mode: 'fixed' | 'rotate';
  fixedId?: string;
  pool: string[];
  avoidImmediateRepeat: boolean;
};

type ProgrammingBlock = {
  id: string;
  title: string;
  start: string;
  durationSec: number;
  fromPage: number;
  toPage: number;
  preferredTags: string[];
  reciterId?: string;
  themeId?: string;
};

type ProgrammingFiller = {
  id: string;
  type: 'break' | 'announcement' | 'audio_message';
  title: string;
  durationSec: number;
  slides?: string[];
  audio?: string;
  message?: string;
};

type ProgrammingResponse = {
  ok: boolean;
  template: ProgrammingTemplate;
  validation: ScheduleValidationResult;
};

type MediaIndex = {
  ok: boolean;
  generatedAt: string;
  summary: {
    quranPageImages: number;
    quranPageMetadata: number;
    reciterAudio: number;
    breakSlides: number;
    audioMessages: number;
    videos: number;
    missingFiles: number;
  };
  categories: {
    reciterAudio: { reciterId: string; fileCount: number; totalBytes: number; samplePath: string }[];
    breakSlides: { path: string; bytes: number }[];
    audioMessages: { path: string; bytes: number }[];
    videos: { path: string; bytes: number }[];
  };
  missingFiles: { source: string; ownerId: string; path: string; reason: string }[];
};

const adminSections = ['programming', 'readers', 'themes', 'overlays', 'fillers', 'schedule', 'diagnostics'] as const;
type AdminSection = typeof adminSections[number];

const dayOptions: WeekdayKey[] = [
  'daily',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export function AdminDashboard({
  diagnostics,
  loadState
}: {
  diagnostics: AdminDiagnostics;
  loadState: LoadState;
}) {
  const section = getRequestedSection();

  return (
    <main className="shell admin-shell">
      <div className="admin-layout">
        <header className="admin-header">
          <div>
            <span>لوحة تحكم Quran24</span>
            <h1>{sectionLabel(section)}</h1>
          </div>
          <a className="admin-live-link" href="/channel">فتح القناة</a>
        </header>

        <nav className="admin-tabs" aria-label="أقسام لوحة التحكم">
          {adminSections.map((item) => (
            <a key={item} aria-current={item === section ? 'page' : undefined} href={`/admin?section=${item}`}>
              {sectionLabel(item)}
            </a>
          ))}
        </nav>

        {section === 'programming' ? (
          <ProgrammingPanel />
        ) : section === 'schedule' ? (
          <ScheduleEditor />
        ) : section === 'diagnostics' ? (
          <DiagnosticsPanel diagnostics={diagnostics} loadState={loadState} />
        ) : section === 'readers' ? (
          <ReadersPanel />
        ) : section === 'themes' ? (
          <ThemesPanel />
        ) : section === 'overlays' ? (
          <OverlaysPanel />
        ) : section === 'fillers' ? (
          <FillersPanel />
        ) : (
          <ProgrammingPanel />
        )}
      </div>
    </main>
  );
}

function ProgrammingPanel() {
  const [template, setTemplate] = useState<ProgrammingTemplate | null>(null);
  const [validation, setValidation] = useState<ScheduleValidationResult | null>(null);
  const [generated, setGenerated] = useState<ChannelSchedule | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل نموذج البرمجة اليومية');
  const [busy, setBusy] = useState(false);

  const loadTemplate = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/programming-template', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ProgrammingResponse>)
      .then((payload) => {
        setTemplate(payload.template);
        setValidation(payload.validation);
        setMessage('تم تحميل نموذج البرمجة اليومية');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  function updateTemplate(patch: Partial<ProgrammingTemplate>) {
    setTemplate((current) => current ? { ...current, ...patch } : current);
  }

  function updatePolicy(kind: 'reciters' | 'themes', patch: Partial<RotationPolicy>) {
    setTemplate((current) => current ? {
      ...current,
      rotation: {
        ...current.rotation,
        [kind]: { ...current.rotation[kind], ...patch }
      }
    } : current);
  }

  function updateBlock(id: string, patch: Partial<ProgrammingBlock>) {
    setTemplate((current) => current ? {
      ...current,
      blocks: current.blocks.map((block) => block.id === id ? { ...block, ...patch } : block)
    } : current);
  }

  async function saveTemplate() {
    if (!template) return;
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/channel/programming-template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
        body: JSON.stringify(template)
      });
      const payload = await response.json() as ProgrammingResponse & { error?: string };
      if (!response.ok || !payload.ok) {
        setValidation(payload.validation);
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'فشل حفظ النموذج');
        return;
      }
      setTemplate(payload.template);
      setValidation(payload.validation);
      setMessage('تم حفظ نموذج البرمجة اليومية');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function generateSchedule() {
    if (!template) return;
    setBusy(true);
    try {
      const response = await fetch('/api/channel/programming-template/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template })
      });
      const payload = await response.json() as { ok: boolean; schedule: ChannelSchedule; validation: ScheduleValidationResult; error?: string };
      setGenerated(payload.schedule);
      setValidation(payload.validation);
      setMessage(payload.ok ? `تم إنشاء ${payload.schedule.days.daily.length} عنصر في الجدول` : payload.validation.errors.join(' | '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function publishGenerated() {
    if (!generated) {
      setMessage('أنشئ جدول اليوم أولاً');
      return;
    }
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/channel/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim(), 'x-admin-user': 'programming-panel' },
        body: JSON.stringify({ ...generated, status: 'published', publishedAt: new Date().toISOString() })
      });
      const payload = await response.json() as SaveResponse;
      setValidation(payload.validation);
      setMessage(payload.ok ? `تم نشر الجدول المولّد - الإصدار ${payload.schedule?.version}` : payload.validation?.errors.join(' | ') || 'فشل النشر');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <section className="admin-panel">
        <h2>البرمجة اليومية</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>البرمجة اليومية</h2>
        <strong>{template.blocks.length} فترات / {template.fillers.length} فواصل</strong>
      </div>
      <div className="form-grid">
        <label>
          المنطقة الزمنية
          <input value={template.timezone} onChange={(event) => updateTemplate({ timezone: event.target.value })} />
        </label>
        <label>
          مؤشر الصفحة
          <input type="number" min="1" max="604" value={template.pageCursor} onChange={(event) => updateTemplate({ pageCursor: Number(event.target.value) })} />
        </label>
        <label>
          قائمة القراء
          <input value={template.rotation.reciters.pool.join(', ')} onChange={(event) => updatePolicy('reciters', { pool: splitIds(event.target.value) })} />
        </label>
        <label>
          قائمة الثيمات
          <input value={template.rotation.themes.pool.join(', ')} onChange={(event) => updatePolicy('themes', { pool: splitIds(event.target.value) })} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={template.rotation.reciters.avoidImmediateRepeat} onChange={(event) => updatePolicy('reciters', { avoidImmediateRepeat: event.target.checked })} />
          تجنب تكرار القارئ مباشرة
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={template.rotation.themes.avoidImmediateRepeat} onChange={(event) => updatePolicy('themes', { avoidImmediateRepeat: event.target.checked })} />
          تجنب تكرار الثيم مباشرة
        </label>
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>
      <div className="diagnostics-table compact">
        {template.blocks.map((block) => (
          <div key={block.id}>
            <span>{block.start}</span>
            <strong>
              <input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} />
              <span>{block.fromPage}-{block.toPage} / {formatSeconds(block.durationSec)}</span>
            </strong>
          </div>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" onClick={saveTemplate} disabled={busy}>حفظ النموذج</button>
        <button type="button" onClick={generateSchedule} disabled={busy}>توليد اليوم</button>
        <button type="button" onClick={publishGenerated} disabled={busy || !generated}>نشر الجدول المولّد</button>
        <button type="button" onClick={loadTemplate} disabled={busy}>إعادة التحميل</button>
      </div>
      <p className="admin-message">{message}</p>
      <ValidationPanel validation={validation} />
    </section>
  );
}
function ScheduleEditor() {
  const [schedule, setSchedule] = useState<ChannelSchedule | null>(null);
  const [validation, setValidation] = useState<ScheduleValidationResult | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeekdayKey>('daily');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [adminUser, setAdminUser] = useState('admin-ui');
  const [message, setMessage] = useState('جار تحميل الجدول');
  const [busy, setBusy] = useState(false);

  const loadSchedule = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/schedule', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ScheduleResponse>)
      .then((payload) => {
        setSchedule(payload.schedule);
        setValidation(payload.validation);
        setSelectedItemId(payload.schedule.days.daily[0]?.id ?? null);
        setMessage('تم تحميل الجدول');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const items = useMemo(() => sortScheduleItems(schedule?.days[selectedDay] ?? []), [schedule, selectedDay]);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0] ?? null;
  const activePreview = useMemo(() => {
    if (!schedule) return null;
    try {
      return getActiveScheduleItem(schedule, new Date());
    } catch {
      return null;
    }
  }, [schedule]);

  function updateSchedule(patch: Partial<ChannelSchedule>) {
    setSchedule((current) => current ? { ...current, ...patch } : current);
  }

  function updateItem(itemId: string, patch: Record<string, unknown>) {
    setSchedule((current) => {
      if (!current) return current;
      const dayItems = current.days[selectedDay] ?? [];
      return {
        ...current,
        days: {
          ...current.days,
          [selectedDay]: dayItems.map((item) => item.id === itemId ? { ...item, ...patch } as ChannelScheduleItem : item)
        }
      };
    });
  }

  function addItem(type: ChannelScheduleItem['type']) {
    setSchedule((current) => {
      if (!current) return current;
      const dayItems = current.days[selectedDay] ?? [];
      const item = {
        ...createScheduleItem(type, dayItems.length),
        id: `${type}-${Date.now()}`
      };
      setSelectedItemId(item.id);
      return {
        ...current,
        days: {
          ...current.days,
          [selectedDay]: sortScheduleItems([...dayItems, item])
        }
      };
    });
  }

  function removeSelectedItem() {
    if (!selectedItem) return;
    setSchedule((current) => {
      if (!current) return current;
      const nextItems = (current.days[selectedDay] ?? []).filter((item) => item.id !== selectedItem.id);
      setSelectedItemId(nextItems[0]?.id ?? null);
      return {
        ...current,
        days: {
          ...current.days,
          [selectedDay]: nextItems
        }
      };
    });
  }

  async function validateCandidate(candidate = schedule) {
    if (!candidate) return null;
    setBusy(true);
    setMessage('جار فحص الجدول');
    try {
      const response = await fetch('/api/channel/schedule/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      const payload = await response.json() as ValidationResponse;
      setValidation(payload.validation);
      setMessage(payload.validation.ok ? 'تم اجتياز الفحص' : 'فشل الفحص');
      return payload.validation;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveSchedule(status: 'draft' | 'published') {
    if (!schedule) return;
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }

    const candidate: ChannelSchedule = {
      ...schedule,
      status,
      publishedAt: new Date().toISOString(),
      publishedBy: adminUser.trim() || 'admin-ui'
    };

    setBusy(true);
    setMessage(status === 'published' ? 'جار نشر الجدول' : 'جار حفظ المسودة');
    try {
      const response = await fetch('/api/channel/schedule', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken.trim(),
          'x-admin-user': adminUser.trim() || 'admin-ui'
        },
        body: JSON.stringify(candidate)
      });
      const payload = await response.json() as SaveResponse;
      if (!response.ok || !payload.ok) {
        setValidation(payload.validation ?? {
          ok: false,
          errors: payload.errors ?? ['فشل حفظ الجدول'],
          warnings: payload.warnings ?? []
        });
        setMessage(status === 'published' ? 'تم منع النشر' : 'تم منع حفظ المسودة');
        return;
      }

      if (payload.schedule) setSchedule(payload.schedule);
      setValidation(payload.validation);
      setMessage(status === 'published' ? `تم نشر الإصدار ${payload.schedule?.version}` : `تم حفظ المسودة كإصدار ${payload.schedule?.version}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!schedule) {
    return (
      <section className="admin-panel">
        <h2>جدول القناة</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="schedule-editor" aria-label="محرر جدول القناة">
      <div className="admin-panel schedule-general">
        <div className="admin-panel-title">
          <h2>الإعدادات العامة</h2>
          <strong>v{schedule.version} - {statusLabel(schedule.status)}</strong>
        </div>
        <label>
          المنطقة الزمنية
          <input value={schedule.timezone} onChange={(event) => updateSchedule({ timezone: event.target.value })} />
        </label>
        <label>
          عنصر الاحتياط
          <input
            value={schedule.defaultFallbackItemId}
            onChange={(event) => updateSchedule({ defaultFallbackItemId: event.target.value })}
          />
        </label>
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
        <label>
          الناشر
          <input value={adminUser} onChange={(event) => setAdminUser(event.target.value)} />
        </label>
        <div className="admin-actions">
          <button type="button" onClick={() => validateCandidate()} disabled={busy}>فحص</button>
          <button type="button" onClick={() => saveSchedule('draft')} disabled={busy}>حفظ كمسودة</button>
          <button type="button" onClick={() => saveSchedule('published')} disabled={busy}>نشر</button>
          <button type="button" onClick={loadSchedule} disabled={busy}>إعادة التحميل</button>
        </div>
        <p className="admin-message">{message}</p>
      </div>

      <div className="admin-panel schedule-preview">
        <div className="admin-panel-title">
          <h2>المعاينة</h2>
          <strong>{activePreview?.item.id ?? 'لا يوجد'}</strong>
        </div>
        <div className="diagnostics-table compact">
          <div>
            <span>المعروض الآن</span>
            <strong>{activePreview ? activePreview.item.title : 'غير متاح'}</strong>
          </div>
          <div>
            <span>الإزاحة الزمنية</span>
            <strong>{activePreview ? `${Math.floor(activePreview.offsetSec)}ث` : 'لا يوجد'}</strong>
          </div>
          <div>
            <span>الفحص</span>
            <strong>{validationStatusLabel(validation)}</strong>
          </div>
        </div>
      </div>

      <div className="admin-panel schedule-list-panel">
        <div className="admin-panel-title">
          <h2>عناصر الجدول</h2>
          <select value={selectedDay} onChange={(event) => {
            const day = event.target.value as WeekdayKey;
            setSelectedDay(day);
            setSelectedItemId((schedule.days[day] ?? [])[0]?.id ?? null);
          }}>
            {dayOptions.map((day) => <option key={day} value={day}>{dayLabel(day)}</option>)}
          </select>
        </div>
        <div className="item-type-row">
          {editableItemTypes.map((type) => (
            <button key={type} type="button" onClick={() => addItem(type)}>{typeLabel(type)}</button>
          ))}
        </div>
        <div className="schedule-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selectedItem?.id ? 'active' : undefined}
              onClick={() => setSelectedItemId(item.id)}
            >
              <span>{item.start}</span>
              <strong>{item.title}</strong>
              <em>{typeLabel(item.type)} - {formatSeconds(item.durationSec)}</em>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-panel schedule-form-panel">
        {selectedItem ? (
          <ItemEditor
            item={selectedItem}
            onChange={(patch) => updateItem(selectedItem.id, patch)}
            onIdChange={(id) => {
              updateItem(selectedItem.id, { id });
              setSelectedItemId(id);
            }}
            onRemove={removeSelectedItem}
          />
        ) : (
          <p>لم يتم اختيار عنصر</p>
        )}
      </div>

      <ValidationPanel validation={validation} />
    </section>
  );
}

function ItemEditor({
  item,
  onChange,
  onIdChange,
  onRemove
}: {
  item: ChannelScheduleItem;
  onChange: (patch: Record<string, unknown>) => void;
  onIdChange: (id: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="item-editor">
      <div className="admin-panel-title">
        <h2>{typeLabel(item.type)}</h2>
        <button type="button" className="danger" onClick={onRemove}>حذف</button>
      </div>
      <div className="form-grid">
        <label>
          ID
          <input value={item.id} onChange={(event) => onIdChange(event.target.value)} />
        </label>
        <label>
          العنوان
          <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
        </label>
        <label>
          وقت البداية
          <input value={item.start} onChange={(event) => onChange({ start: event.target.value })} />
        </label>
        {'durationSec' in item && (
          <label>
            المدة بالثواني
            <input
              type="number"
              min="1"
              value={item.durationSec ?? ''}
              onChange={(event) => onChange({ durationSec: numberOrUndefined(event.target.value) })}
            />
          </label>
        )}
      </div>
      {item.type === 'quran' && <QuranFields item={item} onChange={onChange} />}
      {item.type === 'break' && <BreakFields item={item} onChange={onChange} />}
      {item.type === 'announcement' && (
        <label>
          الرسالة
          <textarea value={item.message} onChange={(event) => onChange({ message: event.target.value })} />
        </label>
      )}
      {item.type === 'video' && <VideoFields item={item} onChange={onChange} />}
      {item.type === 'live_stream' && <LiveStreamFields item={item} onChange={onChange} />}
    </div>
  );
}

function QuranFields({ item, onChange }: { item: QuranScheduleItem; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="form-grid">
      <label>
        القارئ
        <input value={item.reciterId} onChange={(event) => onChange({ reciterId: event.target.value })} />
      </label>
      <label>
        من صفحة
        <input type="number" min="1" max="604" value={item.fromPage} onChange={(event) => onChange({ fromPage: Number(event.target.value) })} />
      </label>
      <label>
        إلى صفحة
        <input type="number" min="1" max="604" value={item.toPage} onChange={(event) => onChange({ toPage: Number(event.target.value) })} />
      </label>
      <label>
        معرف الثيم
        <input value={item.themeId ?? ''} onChange={(event) => onChange({ themeId: event.target.value || undefined })} />
      </label>
      <label>
        قالب العرض القديم
        <input type="number" min="1" value={item.layoutPresetId ?? ''} onChange={(event) => onChange({ layoutPresetId: numberOrUndefined(event.target.value) })} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(item.allowAutoContinue)} onChange={(event) => onChange({ allowAutoContinue: event.target.checked })} />
        متابعة تلقائية
      </label>
    </div>
  );
}

function ThemesPanel() {
  const [data, setData] = useState<ThemesResponse | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل الثيمات');
  const [busy, setBusy] = useState(false);

  const loadThemes = useCallback(() => {
    setBusy(true);
    fetch('/api/themes', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ThemesResponse>)
      .then((payload) => {
        setData(payload);
        setMessage('تم تحميل الثيمات');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  function updateTheme(id: string, patch: Partial<ChannelTheme>) {
    setData((current) => current ? {
      ...current,
      themes: current.themes.map((theme) => theme.id === id ? { ...theme, ...patch } : theme)
    } : current);
  }

  function addTheme() {
    setData((current) => {
      if (!current) return current;
      const id = `theme-${current.themes.length + 1}`;
      return {
        ...current,
        activeThemeId: current.activeThemeId || id,
        themes: [
          ...current.themes,
          {
            id,
            name: `ثيم ${current.themes.length + 1}`,
            frame: '/assets/frames/frame-preset2.png',
            background: '#000000',
            quranZoom: 0.82,
            page: { x: 1036, y: 185, w: 825, h: 680 },
            tags: ['day']
          }
        ]
      };
    });
  }

  async function saveThemes() {
    if (!data) return;
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/themes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
        body: JSON.stringify({ activeThemeId: data.activeThemeId, themes: data.themes })
      });
      const payload = await response.json() as ThemesResponse & { error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'فشل حفظ الثيمات');
        return;
      }
      setData(payload);
      setMessage('تم حفظ الثيمات');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function scanThemes() {
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/themes/scan', { method: 'POST', headers: { 'x-admin-token': adminToken.trim() } });
      if (!response.ok) throw new Error(`فشل فحص مجلدات الثيمات: ${response.status}`);
      setMessage('تم فحص مجلدات الثيمات');
      loadThemes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="admin-panel">
        <h2>الثيمات</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>الثيمات</h2>
        <strong>{data.themes.length} متاح</strong>
      </div>
      <div className="form-grid">
        <label>
          الثيم النشط
          <select value={data.activeThemeId} onChange={(event) => setData({ ...data, activeThemeId: event.target.value })}>
            {data.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
        </label>
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>
      <div className="reciter-list">
        {data.themes.map((theme) => (
          <div key={theme.id} className="theme-row">
            <label>
              ID
              <input value={theme.id} onChange={(event) => updateTheme(theme.id, { id: event.target.value })} />
            </label>
            <label>
              الاسم
              <input value={theme.name} onChange={(event) => updateTheme(theme.id, { name: event.target.value })} />
            </label>
            <label>
              الإطار
              <input value={theme.frame} onChange={(event) => updateTheme(theme.id, { frame: event.target.value })} />
            </label>
            <label>
              الوسوم
              <input value={(theme.tags ?? []).join(', ')} onChange={(event) => updateTheme(theme.id, { tags: splitIds(event.target.value) })} />
            </label>
            <label>
              التكبير
              <input type="number" step="0.01" value={theme.quranZoom} onChange={(event) => updateTheme(theme.id, { quranZoom: Number(event.target.value) })} />
            </label>
          </div>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" onClick={addTheme} disabled={busy}>إضافة ثيم</button>
        <button type="button" onClick={scanThemes} disabled={busy}>فحص مجلدات الثيمات</button>
        <button type="button" onClick={saveThemes} disabled={busy}>حفظ الثيمات</button>
        <button type="button" onClick={loadThemes} disabled={busy}>إعادة التحميل</button>
      </div>
      <p className="admin-message">{message}</p>
    </section>
  );
}

function FillersPanel() {
  const [template, setTemplate] = useState<ProgrammingTemplate | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل الفواصل');
  const [busy, setBusy] = useState(false);

  const loadTemplate = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/programming-template', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ProgrammingResponse>)
      .then((payload) => {
        setTemplate(payload.template);
        setMessage('تم تحميل الفواصل');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  function updateFiller(id: string, patch: Partial<ProgrammingFiller>) {
    setTemplate((current) => current ? {
      ...current,
      fillers: current.fillers.map((filler) => filler.id === id ? { ...filler, ...patch } : filler)
    } : current);
  }

  function addFiller() {
    setTemplate((current) => current ? {
      ...current,
      fillers: [
        ...current.fillers,
        {
          id: `filler-${current.fillers.length + 1}`,
          type: 'break',
          title: `فاصل ${current.fillers.length + 1}`,
          durationSec: 120,
          slides: ['/assets/slides/dua-1.jpeg']
        }
      ]
    } : current);
  }

  async function saveFillers() {
    if (!template) return;
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/channel/programming-template', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
        body: JSON.stringify(template)
      });
      const payload = await response.json() as ProgrammingResponse & { error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'فشل حفظ الفواصل');
        return;
      }
      setTemplate(payload.template);
      setMessage('تم حفظ الفواصل');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <section className="admin-panel">
        <h2>الفواصل</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>الفواصل والإعلانات</h2>
          <strong>{template.fillers.length} معدة</strong>
        </div>
        <div className="form-grid">
          <label>
            توكن الأدمن
            <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
          </label>
        </div>
        <div className="reciter-list">
          {template.fillers.map((filler) => (
            <div key={filler.id} className="theme-row">
              <label>
                ID
                <input value={filler.id} onChange={(event) => updateFiller(filler.id, { id: event.target.value })} />
              </label>
              <label>
                النوع
                <select value={filler.type} onChange={(event) => updateFiller(filler.id, { type: event.target.value as ProgrammingFiller['type'] })}>
                  <option value="break">فاصل مرئي</option>
                  <option value="announcement">إعلان</option>
                  <option value="audio_message">رسالة صوتية</option>
                </select>
              </label>
              <label>
                العنوان
                <input value={filler.title} onChange={(event) => updateFiller(filler.id, { title: event.target.value })} />
              </label>
              <label>
                المدة
                <input type="number" min="1" value={filler.durationSec} onChange={(event) => updateFiller(filler.id, { durationSec: Number(event.target.value) })} />
              </label>
              <label>
                السلايدات
                <textarea value={stringifyMediaList(filler.slides)} onChange={(event) => updateFiller(filler.id, { slides: parseMediaList(event.target.value) })} />
              </label>
              <label>
                الصوت
                <input value={filler.audio ?? ''} onChange={(event) => updateFiller(filler.id, { audio: event.target.value || undefined })} />
              </label>
            </div>
          ))}
        </div>
        <div className="admin-actions">
          <button type="button" onClick={addFiller} disabled={busy}>إضافة فاصل</button>
          <button type="button" onClick={saveFillers} disabled={busy}>حفظ الفواصل</button>
          <button type="button" onClick={loadTemplate} disabled={busy}>إعادة التحميل</button>
        </div>
        <p className="admin-message">{message}</p>
      </section>
      <MediaPanel />
    </>
  );
}

function BreakFields({ item, onChange }: { item: BreakScheduleItem; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <>
      <label>
        السلايدات
        <textarea value={stringifyMediaList(item.slides)} onChange={(event) => onChange({ slides: parseMediaList(event.target.value) })} />
      </label>
      <label>
        الصوت
        <input value={item.audio ?? ''} onChange={(event) => onChange({ audio: event.target.value || undefined })} />
      </label>
    </>
  );
}

function VideoFields({ item, onChange }: { item: VideoScheduleItem; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="form-grid">
      <label>
        المصدر
        <input value={item.source} onChange={(event) => onChange({ source: event.target.value })} />
      </label>
      <label>
        وضع البداية
        <select value={item.startMode ?? 'timeline_offset'} onChange={(event) => onChange({ startMode: event.target.value })}>
          <option value="timeline_offset">timeline_offset</option>
          <option value="from_start">from_start</option>
        </select>
      </label>
    </div>
  );
}

function LiveStreamFields({ item, onChange }: { item: LiveStreamScheduleItem; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="form-grid">
      <label>
        المصدر
        <input value={item.source} onChange={(event) => onChange({ source: event.target.value })} />
      </label>
      <label>
        وضع البداية
        <select value={item.startMode ?? 'live_edge'} onChange={(event) => onChange({ startMode: event.target.value })}>
          <option value="live_edge">live_edge</option>
          <option value="timeline_offset">timeline_offset</option>
        </select>
      </label>
    </div>
  );
}

function OverlaysPanel() {
  const [overlays, setOverlays] = useState<ChannelOverlaySettings | null>(null);
  const [validation, setValidation] = useState<ScheduleValidationResult | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل إعدادات الأوفرلاي');
  const [busy, setBusy] = useState(false);

  const loadOverlays = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/overlays', { cache: 'no-store' })
      .then((response) => response.json() as Promise<OverlaysResponse>)
      .then((payload) => {
        setOverlays(payload.overlays);
        setValidation(payload.validation ?? null);
        setMessage('تم تحميل إعدادات الأوفرلاي');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadOverlays();
  }, [loadOverlays]);

  function updateLogo(patch: Partial<ChannelOverlaySettings['logo']>) {
    setOverlays((current) => current ? { ...current, logo: { ...current.logo, ...patch } } : current);
  }

  function updateTicker(patch: Partial<ChannelOverlaySettings['ticker']>) {
    setOverlays((current) => current ? { ...current, ticker: { ...current.ticker, ...patch } } : current);
  }

  function updateExtraImage(patch: Partial<ChannelOverlaySettings['extraImage']>) {
    setOverlays((current) => current ? { ...current, extraImage: { ...current.extraImage, ...patch } } : current);
  }

  async function saveOverlays() {
    if (!overlays) return;
    setBusy(true);
    setMessage('جار حفظ إعدادات الأوفرلاي');
    try {
      const response = await fetch('/api/channel/overlays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
        body: JSON.stringify(overlays)
      });
      const payload = await response.json() as OverlaysResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || payload.validation?.errors?.join(', ') || 'فشل حفظ إعدادات الأوفرلاي');
      setOverlays(payload.overlays);
      setValidation(payload.validation ?? null);
      setMessage('تم حفظ إعدادات الأوفرلاي');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!overlays) {
    return (
      <section className="admin-panel">
        <h2>الأوفرلاي</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>الأوفرلاي</h2>
        <strong>الشعار، شريط الأخبار، صورة إضافية</strong>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.logo.enabled} onChange={(event) => updateLogo({ enabled: event.target.checked })} />
          عرض شعار القناة
        </label>
        <label>
          نص الشعار
          <input value={overlays.logo.text} onChange={(event) => updateLogo({ text: event.target.value })} />
        </label>
        <label>
          النص الفرعي للشعار
          <input value={overlays.logo.subtext} onChange={(event) => updateLogo({ subtext: event.target.value })} />
        </label>
        <label>
          مسار صورة الشعار
          <input placeholder="/assets/overlays/logo.png" value={overlays.logo.imagePath ?? ''} onChange={(event) => updateLogo({ imagePath: event.target.value })} />
        </label>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.ticker.enabled} onChange={(event) => updateTicker({ enabled: event.target.checked })} />
          عرض شريط الأخبار
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.ticker.includeTodaySchedule} onChange={(event) => updateTicker({ includeTodaySchedule: event.target.checked })} />
          تضمين جدول اليوم
        </label>
        <label>
          نص الترحيب
          <input value={overlays.ticker.welcomeText} onChange={(event) => updateTicker({ welcomeText: event.target.value })} />
        </label>
        <label>
          مقدمة جدول اليوم
          <input value={overlays.ticker.todayPrefix} onChange={(event) => updateTicker({ todayPrefix: event.target.value })} />
        </label>
        <label>
          سرعة الشريط بالثواني
          <input type="number" min="20" max="180" value={overlays.ticker.speedSec} onChange={(event) => updateTicker({ speedSec: Number(event.target.value) })} />
        </label>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.extraImage.enabled} onChange={(event) => updateExtraImage({ enabled: event.target.checked })} />
          عرض صورة إضافية
        </label>
        <label>
          مسار الصورة الإضافية
          <input placeholder="/assets/overlays/qr.png" value={overlays.extraImage.imagePath ?? ''} onChange={(event) => updateExtraImage({ imagePath: event.target.value })} />
        </label>
        <label>
          الموضع
          <select value={overlays.extraImage.position} onChange={(event) => updateExtraImage({ position: event.target.value as ChannelOverlaySettings['extraImage']['position'] })}>
            <option value="bottom-right">أسفل اليمين</option>
            <option value="bottom-left">أسفل اليسار</option>
            <option value="top-right">أعلى اليمين</option>
            <option value="top-left">أعلى اليسار</option>
          </select>
        </label>
        <label>
          العرض بالبكسل
          <input type="number" min="96" max="520" value={overlays.extraImage.widthPx} onChange={(event) => updateExtraImage({ widthPx: Number(event.target.value) })} />
        </label>
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>

      <div className="admin-actions">
        <button type="button" onClick={saveOverlays} disabled={busy}>حفظ الأوفرلاي</button>
        <button type="button" onClick={loadOverlays} disabled={busy}>إعادة التحميل</button>
      </div>
      <ValidationPanel validation={validation} />
      <p className="admin-message">{message}</p>
    </section>
  );
}

function ValidationPanel({ validation }: { validation: ScheduleValidationResult | null }) {
  return (
    <div className="admin-panel validation-panel">
      <div className="admin-panel-title">
        <h2>الفحص</h2>
        <strong>{validationStatusLabel(validation)}</strong>
      </div>
      <div className="validation-list">
        {(validation?.errors.length ? validation.errors : ['لا توجد أخطاء في الفحص']).map((error) => (
          <p key={error} className={validation?.errors.length ? 'error-text' : undefined}>{error}</p>
        ))}
        {validation?.warnings.map((warning) => <p key={warning}>{warning}</p>)}
      </div>
    </div>
  );
}

function ReadersPanel() {
  const [data, setData] = useState<RecitersResponse | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل القراء');
  const [busy, setBusy] = useState(false);

  const loadReciters = useCallback(() => {
    setBusy(true);
    fetch('/api/reciters', { cache: 'no-store' })
      .then((response) => response.json() as Promise<RecitersResponse>)
      .then((payload) => {
        setData(payload);
        setMessage('تم تحميل القراء');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadReciters();
  }, [loadReciters]);

  function updateReciter(id: string, patch: Partial<Reciter>) {
    setData((current) => current ? {
      ...current,
      activeReciterId: patch.id && current.activeReciterId === id ? patch.id : current.activeReciterId,
      reciters: current.reciters.map((reciter) => reciter.id === id ? {
        ...reciter,
        ...patch,
        audioDir: `data/reciters/${patch.folderName ?? reciter.folderName}`
      } : reciter)
    } : current);
  }

  function addReciter() {
    setData((current) => {
      if (!current) return current;
      const id = `reciter-${current.reciters.length + 1}`;
      return {
        ...current,
        activeReciterId: current.activeReciterId || id,
        reciters: [
          ...current.reciters,
          {
            id,
            name: `قارئ ${current.reciters.length + 1}`,
            folderName: id,
            audioDir: `data/reciters/${id}`
          }
        ]
      };
    });
  }

  function removeReciter(id: string) {
    setData((current) => {
      if (!current) return current;
      const reciters = current.reciters.filter((reciter) => reciter.id !== id);
      return {
        ...current,
        activeReciterId: current.activeReciterId === id ? reciters[0]?.id ?? '' : current.activeReciterId,
        reciters
      };
    });
  }

  async function saveReciters() {
    if (!data) return;
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }

    setBusy(true);
    setMessage('جار حفظ القراء');
    try {
      const response = await fetch('/api/reciters', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken.trim()
        },
        body: JSON.stringify({
          audioRootDir: data.audioRootDir,
          activeReciterId: data.activeReciterId,
          reciters: data.reciters
        })
      });
      const payload = await response.json() as RecitersResponse & { validation?: ScheduleValidationResult; error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'فشل حفظ القراء');
        return;
      }
      setData(payload);
      setMessage('تم حفظ القراء');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="admin-panel">
        <h2>القراء</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>القراء</h2>
        <strong>{data.reciters.length} معد</strong>
      </div>
      <div className="form-grid">
        <label>
          مسار مكتبة الصوت
          <input value={data.audioRootDir} readOnly />
        </label>
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>
      <div className="reciter-list">
        {data.reciters.map((reciter) => (
          <div key={reciter.id} className="reciter-row">
            <label className="checkbox-row">
              <input
                type="radio"
                name="active-reciter"
                checked={data.activeReciterId === reciter.id}
                onChange={() => setData({ ...data, activeReciterId: reciter.id })}
              />
              نشط
            </label>
            <label>
              ID
              <input value={reciter.id} onChange={(event) => updateReciter(reciter.id, { id: event.target.value })} />
            </label>
            <label>
              الاسم
              <input value={reciter.name} onChange={(event) => updateReciter(reciter.id, { name: event.target.value })} />
            </label>
            <label>
              المجلد
              <input value={reciter.folderName} onChange={(event) => updateReciter(reciter.id, { folderName: event.target.value })} />
            </label>
            <button type="button" className="danger" onClick={() => removeReciter(reciter.id)}>حذف</button>
          </div>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" onClick={addReciter} disabled={busy}>إضافة قارئ</button>
        <button type="button" onClick={saveReciters} disabled={busy}>حفظ القراء</button>
        <button type="button" onClick={loadReciters} disabled={busy}>إعادة التحميل</button>
      </div>
      <p className="admin-message">{message}</p>
    </section>
  );
}

function MediaPanel() {
  const [media, setMedia] = useState<MediaIndex | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('جار تحميل مكتبة الوسائط');
  const [busy, setBusy] = useState(false);

  const loadMedia = useCallback(() => {
    setBusy(true);
    fetch('/api/media/library', { cache: 'no-store' })
      .then((response) => response.json() as Promise<MediaIndex>)
      .then((payload) => {
        setMedia(payload);
        setMessage('تم تحميل مكتبة الوسائط');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  async function scanMedia() {
    if (!adminToken.trim()) {
      setMessage('مطلوب إدخال توكن الأدمن');
      return;
    }

    setBusy(true);
    setMessage('جار فحص الوسائط');
    try {
      const response = await fetch('/api/media/scan', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken.trim() }
      });
      const payload = await response.json() as MediaIndex & { error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.error || 'فشل فحص الوسائط');
        return;
      }
      setMedia(payload);
      setMessage('تم فحص الوسائط');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>مكتبة الوسائط</h2>
        <strong>{media?.generatedAt ? new Date(media.generatedAt).toLocaleString() : 'بانتظار الفحص'}</strong>
      </div>
      <div className="form-grid">
        <label>
          توكن الأدمن
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={scanMedia} disabled={busy}>فحص الوسائط</button>
        <button type="button" onClick={loadMedia} disabled={busy}>إعادة التحميل</button>
      </div>
      {media ? (
        <>
          <div className="status-grid">
            <Metric label="صور المصحف" value={String(media.summary.quranPageImages)} />
            <Metric label="صوت القراء" value={String(media.summary.reciterAudio)} />
            <Metric label="السلايدات" value={String(media.summary.breakSlides)} />
            <Metric label="ملفات ناقصة" value={String(media.summary.missingFiles)} />
          </div>
          <div className="diagnostics-table compact">
            {media.categories.reciterAudio.map((reciter) => (
              <div key={reciter.reciterId}>
                <span>{reciter.reciterId}</span>
                <strong>{reciter.fileCount} ملف صوتي</strong>
              </div>
            ))}
            {media.categories.reciterAudio.length === 0 && (
              <div>
                <span>صوت القراء</span>
                <strong>0 ملف صوتي</strong>
              </div>
            )}
          </div>
          <div className="media-missing-list">
            {media.missingFiles.slice(0, 12).map((missing) => (
              <p key={`${missing.source}-${missing.ownerId}-${missing.path}`}>
                <strong>{missing.ownerId}</strong>
                <span>{missing.path}</span>
              </p>
            ))}
            {media.missingFiles.length > 12 && <p>{media.missingFiles.length - 12} ملف ناقص آخر</p>}
          </div>
        </>
      ) : (
        <p>{message}</p>
      )}
      <p className="admin-message">{message}</p>
    </section>
  );
}

function DiagnosticsPanel({ diagnostics, loadState }: { diagnostics: AdminDiagnostics; loadState: LoadState }) {
  const compatibility = diagnostics.channelStatus?.compatibility;
  const religiousSchedule = diagnostics.religiousSchedule;
  const [telemetry, setTelemetry] = useState<TelemetryStatus | null>(diagnostics.telemetry);
  const [telemetryMessage, setTelemetryMessage] = useState('Loading telemetry');

  const loadTelemetry = useCallback(() => {
    fetch('/api/telemetry/devices', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Telemetry request failed: ${response.status}`);
        return response.json() as Promise<TelemetryStatus>;
      })
      .then((payload) => {
        setTelemetry(payload);
        setTelemetryMessage(`Telemetry refreshed ${new Date(payload.generatedAt).toLocaleTimeString()}`);
      })
      .catch((error) => {
        setTelemetryMessage(error instanceof Error ? error.message : String(error));
      });
  }, []);

  useEffect(() => {
    loadTelemetry();
    const timer = window.setInterval(loadTelemetry, 15000);
    return () => window.clearInterval(timer);
  }, [loadTelemetry]);

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Diagnostics</h2>
        <button type="button" onClick={loadTelemetry}>Refresh Telemetry</button>
      </div>
      <div className="diagnostics-table">
        <div>
          <span>Load State</span>
          <strong>{loadState}</strong>
        </div>
        <div>
          <span>Server Time</span>
          <strong>{diagnostics.health?.time ?? 'Unavailable'}</strong>
        </div>
        <div>
          <span>Uptime</span>
          <strong>{diagnostics.health ? `${diagnostics.health.uptimeSec}s` : 'Unavailable'}</strong>
        </div>
        <div>
          <span>Heartbeat</span>
          <strong>{diagnostics.channelStatus?.runtime.heartbeat ?? 'Unavailable'}</strong>
        </div>
        <div>
          <span>Bridge</span>
          <strong>{diagnostics.channelStatus?.runtime.androidBridge ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Android TV Shell</span>
          <strong>{diagnostics.channelStatus?.runtime.androidTvShell ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Bridge Receiver</span>
          <strong>{diagnostics.channelStatus?.runtime.androidBridgeReceiver ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Watchdog</span>
          <strong>{diagnostics.channelStatus?.runtime.androidWatchdog ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Media3 Playback</span>
          <strong>{diagnostics.channelStatus?.runtime.nativeMedia3Playback ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Native HLS</span>
          <strong>{diagnostics.channelStatus?.runtime.nativeHlsPlayback ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Web Offline Cache</span>
          <strong>{diagnostics.channelStatus?.runtime.webOfflineCache ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>WebView Cache Fallback</span>
          <strong>{diagnostics.channelStatus?.runtime.androidWebViewCacheFallback ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Telemetry API</span>
          <strong>{diagnostics.channelStatus?.runtime.telemetryHeartbeatApi ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Remote Device Status</span>
          <strong>{diagnostics.channelStatus?.runtime.remoteDeviceStatus ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Runtime Error Reporter</span>
          <strong>{diagnostics.channelStatus?.runtime.webRuntimeErrorReporter ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Error Boundary</span>
          <strong>{diagnostics.channelStatus?.runtime.webRuntimeErrorBoundary ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Stall Watchdog</span>
          <strong>{diagnostics.channelStatus?.runtime.webRuntimeStallWatchdog ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Telemetry Retention</span>
          <strong>{diagnostics.channelStatus?.runtime.boundedTelemetryRetention ? 'bounded' : 'pending'}</strong>
        </div>
        <div>
          <span>Religious Insights</span>
          <strong>{diagnostics.channelStatus?.runtime.religiousScheduleInsights ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Friday Override</span>
          <strong>{religiousSchedule?.summary.fridayScheduleConfigured || diagnostics.channelStatus?.religiousSchedule?.fridayScheduleConfigured ? 'configured' : 'pending'}</strong>
        </div>
        <div>
          <span>Taraweeh Readiness</span>
          <strong>{religiousSchedule?.summary.taraweehLiveStreamConfigured || diagnostics.channelStatus?.religiousSchedule?.taraweehLiveStreamConfigured ? 'configured' : 'pending'}</strong>
        </div>
        <div>
          <span>Spiritual Fillers</span>
          <strong>{religiousSchedule?.summary.spiritualFillerCount ?? diagnostics.channelStatus?.religiousSchedule?.spiritualFillerCount ?? 0}</strong>
        </div>
        <div>
          <span>Quran Coverage</span>
          <strong>{religiousSchedule?.summary.quranPageSpan.coveredPages ?? diagnostics.channelStatus?.religiousSchedule?.quranCoveredPages ?? 0} pages</strong>
        </div>
        <div>
          <span>Channel Telemetry API</span>
          <strong>{diagnostics.channelStatus?.runtime.channelTelemetryAlias ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Channel Devices API</span>
          <strong>{diagnostics.channelStatus?.runtime.channelDevicesAlias ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Remote Reload API</span>
          <strong>{diagnostics.channelStatus?.runtime.remoteReloadCommand ? 'protected' : 'pending'}</strong>
        </div>
        <div>
          <span>WebViewAssetLoader</span>
          <strong>{diagnostics.channelStatus?.runtime.webViewAssetLoader ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Bundled Fallback</span>
          <strong>{diagnostics.channelStatus?.runtime.bundledFallbackScreen ? 'ready' : 'pending'}</strong>
        </div>
        <div>
          <span>Devices Online</span>
          <strong>{telemetry ? `${telemetry.onlineDevices}/${telemetry.totalDevices} / commands ${telemetry.pendingCommandCount ?? 0}` : 'Unavailable'}</strong>
        </div>
        <div>
          <span>Telemetry Message</span>
          <strong>{telemetryMessage}</strong>
        </div>
        <div>
          <span>Compatibility APIs</span>
          <strong>
            {compatibility
              ? `config:${String(compatibility.config)} manifest:${String(compatibility.manifest)} slides:${String(compatibility.slides)}`
              : 'Unavailable'}
          </strong>
        </div>
        <div>
          <span>Errors</span>
          <strong>{diagnostics.errors.length ? diagnostics.errors.join(' | ') : 'None'}</strong>
        </div>
      </div>
      <div className="diagnostics-table compact">
        {(religiousSchedule?.recommendations ?? []).slice(0, 4).map((recommendation) => (
          <div key={recommendation}>
            <span>Schedule Guidance</span>
            <strong>{recommendation}</strong>
          </div>
        ))}
        {(telemetry?.devices.slice(0, 8) ?? []).map((device) => (
          <div key={device.deviceId}>
            <span>{device.deviceLabel}</span>
            <strong>
              {device.stale ? 'stale' : 'online'} / {device.lastHeartbeat.playState} / {device.lastHeartbeat.currentItemId ?? 'none'} / {device.ageSec ?? '?'}s ago
            </strong>
          </div>
        ))}
        {telemetry && telemetry.devices.length === 0 && (
          <div>
            <span>Devices</span>
            <strong>No runtime heartbeats received yet</strong>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getRequestedSection(): AdminSection {
  const value = new URLSearchParams(window.location.search).get('section') as AdminSection | null;
  return value && adminSections.includes(value) ? value : 'programming';
}

function sectionLabel(section: AdminSection) {
  const labels: Record<AdminSection, string> = {
    programming: 'البرمجة اليومية',
    readers: 'القراء',
    themes: 'الثيمات',
    overlays: 'الأوفرلاي',
    fillers: 'الفواصل والإعلانات',
    schedule: 'الجدولة والنشر',
    diagnostics: 'التشخيص'
  };
  return labels[section];
}

function typeLabel(type: ChannelScheduleItem['type']) {
  const labels: Record<ChannelScheduleItem['type'], string> = {
    quran: 'تلاوة قرآن',
    break: 'فاصل مرئي',
    announcement: 'إعلان',
    video: 'فيديو',
    live_stream: 'بث مباشر',
    image_slideshow: 'عرض صور',
    audio_message: 'رسالة صوتية'
  };
  return labels[type];
}

function dayLabel(day: WeekdayKey) {
  const labels: Record<WeekdayKey, string> = {
    daily: 'يومي',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
    sunday: 'الأحد'
  };
  return labels[day];
}

function statusLabel(status: ChannelSchedule['status']) {
  return status === 'published' ? 'منشور' : 'مسودة';
}

function validationStatusLabel(validation: ScheduleValidationResult | null) {
  if (!validation) return 'بانتظار الفحص';
  return validation.ok ? 'سليم' : 'به أخطاء';
}

function numberOrUndefined(value: string) {
  return value.trim() === '' ? undefined : Number(value);
}

function splitIds(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
