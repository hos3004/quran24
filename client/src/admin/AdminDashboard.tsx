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
            <span>Quran24 Admin</span>
            <h1>{sectionLabel(section)}</h1>
          </div>
          <a className="admin-live-link" href="/channel">Open Channel</a>
        </header>

        <nav className="admin-tabs" aria-label="Admin sections">
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
  const [message, setMessage] = useState('Loading programming template');
  const [busy, setBusy] = useState(false);

  const loadTemplate = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/programming-template', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ProgrammingResponse>)
      .then((payload) => {
        setTemplate(payload.template);
        setValidation(payload.validation);
        setMessage('Programming template loaded');
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
      setMessage('Admin token required');
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
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'Template save failed');
        return;
      }
      setTemplate(payload.template);
      setValidation(payload.validation);
      setMessage('Programming template saved');
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
      setMessage(payload.ok ? `Generated ${payload.schedule.days.daily.length} schedule items` : payload.validation.errors.join(' | '));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function publishGenerated() {
    if (!generated) {
      setMessage('Generate a schedule first');
      return;
    }
    if (!adminToken.trim()) {
      setMessage('Admin token required');
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
      setMessage(payload.ok ? `Published generated schedule v${payload.schedule?.version}` : payload.validation?.errors.join(' | ') || 'Publish failed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <section className="admin-panel">
        <h2>Daily Programming</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Daily Programming</h2>
        <strong>{template.blocks.length} blocks / {template.fillers.length} fillers</strong>
      </div>
      <div className="form-grid">
        <label>
          Timezone
          <input value={template.timezone} onChange={(event) => updateTemplate({ timezone: event.target.value })} />
        </label>
        <label>
          Page Cursor
          <input type="number" min="1" max="604" value={template.pageCursor} onChange={(event) => updateTemplate({ pageCursor: Number(event.target.value) })} />
        </label>
        <label>
          Reciter Pool
          <input value={template.rotation.reciters.pool.join(', ')} onChange={(event) => updatePolicy('reciters', { pool: splitIds(event.target.value) })} />
        </label>
        <label>
          Theme Pool
          <input value={template.rotation.themes.pool.join(', ')} onChange={(event) => updatePolicy('themes', { pool: splitIds(event.target.value) })} />
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={template.rotation.reciters.avoidImmediateRepeat} onChange={(event) => updatePolicy('reciters', { avoidImmediateRepeat: event.target.checked })} />
          Avoid repeating reciters
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={template.rotation.themes.avoidImmediateRepeat} onChange={(event) => updatePolicy('themes', { avoidImmediateRepeat: event.target.checked })} />
          Avoid repeating themes
        </label>
        <label>
          Admin Token
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
        <button type="button" onClick={saveTemplate} disabled={busy}>Save Template</button>
        <button type="button" onClick={generateSchedule} disabled={busy}>Generate Day</button>
        <button type="button" onClick={publishGenerated} disabled={busy || !generated}>Publish Generated</button>
        <button type="button" onClick={loadTemplate} disabled={busy}>Reload</button>
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
  const [message, setMessage] = useState('Loading schedule');
  const [busy, setBusy] = useState(false);

  const loadSchedule = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/schedule', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ScheduleResponse>)
      .then((payload) => {
        setSchedule(payload.schedule);
        setValidation(payload.validation);
        setSelectedItemId(payload.schedule.days.daily[0]?.id ?? null);
        setMessage('Schedule loaded');
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
    setMessage('Validating schedule');
    try {
      const response = await fetch('/api/channel/schedule/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidate)
      });
      const payload = await response.json() as ValidationResponse;
      setValidation(payload.validation);
      setMessage(payload.validation.ok ? 'Validation passed' : 'Validation failed');
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
      setMessage('Admin token required');
      return;
    }

    const candidate: ChannelSchedule = {
      ...schedule,
      status,
      publishedAt: new Date().toISOString(),
      publishedBy: adminUser.trim() || 'admin-ui'
    };

    setBusy(true);
    setMessage(status === 'published' ? 'Publishing schedule' : 'Saving draft');
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
          errors: payload.errors ?? ['Schedule save failed'],
          warnings: payload.warnings ?? []
        });
        setMessage(status === 'published' ? 'Publish blocked' : 'Draft save blocked');
        return;
      }

      if (payload.schedule) setSchedule(payload.schedule);
      setValidation(payload.validation);
      setMessage(status === 'published' ? `Published version ${payload.schedule?.version}` : `Draft saved as version ${payload.schedule?.version}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!schedule) {
    return (
      <section className="admin-panel">
        <h2>Channel Schedule</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="schedule-editor" aria-label="Channel schedule editor">
      <div className="admin-panel schedule-general">
        <div className="admin-panel-title">
          <h2>General</h2>
          <strong>v{schedule.version} · {schedule.status}</strong>
        </div>
        <label>
          Timezone
          <input value={schedule.timezone} onChange={(event) => updateSchedule({ timezone: event.target.value })} />
        </label>
        <label>
          Fallback Item
          <input
            value={schedule.defaultFallbackItemId}
            onChange={(event) => updateSchedule({ defaultFallbackItemId: event.target.value })}
          />
        </label>
        <label>
          Admin Token
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
        <label>
          Publisher
          <input value={adminUser} onChange={(event) => setAdminUser(event.target.value)} />
        </label>
        <div className="admin-actions">
          <button type="button" onClick={() => validateCandidate()} disabled={busy}>Validate</button>
          <button type="button" onClick={() => saveSchedule('draft')} disabled={busy}>Save Draft</button>
          <button type="button" onClick={() => saveSchedule('published')} disabled={busy}>Publish</button>
          <button type="button" onClick={loadSchedule} disabled={busy}>Reload</button>
        </div>
        <p className="admin-message">{message}</p>
      </div>

      <div className="admin-panel schedule-preview">
        <div className="admin-panel-title">
          <h2>Preview</h2>
          <strong>{activePreview?.item.id ?? 'none'}</strong>
        </div>
        <div className="diagnostics-table compact">
          <div>
            <span>Active Now</span>
            <strong>{activePreview ? activePreview.item.title : 'Unavailable'}</strong>
          </div>
          <div>
            <span>Offset</span>
            <strong>{activePreview ? `${Math.floor(activePreview.offsetSec)}s` : 'none'}</strong>
          </div>
          <div>
            <span>Validation</span>
            <strong>{validation?.ok ? 'valid' : validation ? 'invalid' : 'pending'}</strong>
          </div>
        </div>
      </div>

      <div className="admin-panel schedule-list-panel">
        <div className="admin-panel-title">
          <h2>Items</h2>
          <select value={selectedDay} onChange={(event) => {
            const day = event.target.value as WeekdayKey;
            setSelectedDay(day);
            setSelectedItemId((schedule.days[day] ?? [])[0]?.id ?? null);
          }}>
            {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
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
              <em>{typeLabel(item.type)} · {formatSeconds(item.durationSec)}</em>
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
          <p>No item selected</p>
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
        <button type="button" className="danger" onClick={onRemove}>Remove</button>
      </div>
      <div className="form-grid">
        <label>
          ID
          <input value={item.id} onChange={(event) => onIdChange(event.target.value)} />
        </label>
        <label>
          Title
          <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
        </label>
        <label>
          Start
          <input value={item.start} onChange={(event) => onChange({ start: event.target.value })} />
        </label>
        {'durationSec' in item && (
          <label>
            Duration Seconds
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
          Message
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
        Reciter
        <input value={item.reciterId} onChange={(event) => onChange({ reciterId: event.target.value })} />
      </label>
      <label>
        From Page
        <input type="number" min="1" max="604" value={item.fromPage} onChange={(event) => onChange({ fromPage: Number(event.target.value) })} />
      </label>
      <label>
        To Page
        <input type="number" min="1" max="604" value={item.toPage} onChange={(event) => onChange({ toPage: Number(event.target.value) })} />
      </label>
      <label>
        Theme ID
        <input value={item.themeId ?? ''} onChange={(event) => onChange({ themeId: event.target.value || undefined })} />
      </label>
      <label>
        Legacy Layout Preset
        <input type="number" min="1" value={item.layoutPresetId ?? ''} onChange={(event) => onChange({ layoutPresetId: numberOrUndefined(event.target.value) })} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(item.allowAutoContinue)} onChange={(event) => onChange({ allowAutoContinue: event.target.checked })} />
        Auto Continue
      </label>
    </div>
  );
}

function ThemesPanel() {
  const [data, setData] = useState<ThemesResponse | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('Loading themes');
  const [busy, setBusy] = useState(false);

  const loadThemes = useCallback(() => {
    setBusy(true);
    fetch('/api/themes', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ThemesResponse>)
      .then((payload) => {
        setData(payload);
        setMessage('Themes loaded');
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
            name: `Theme ${current.themes.length + 1}`,
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
      setMessage('Admin token required');
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
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'Theme save failed');
        return;
      }
      setData(payload);
      setMessage('Themes saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function scanThemes() {
    if (!adminToken.trim()) {
      setMessage('Admin token required');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/themes/scan', { method: 'POST', headers: { 'x-admin-token': adminToken.trim() } });
      if (!response.ok) throw new Error(`Theme scan failed: ${response.status}`);
      setMessage('Theme folders scanned');
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
        <h2>Themes</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Themes</h2>
        <strong>{data.themes.length} available</strong>
      </div>
      <div className="form-grid">
        <label>
          Active Theme
          <select value={data.activeThemeId} onChange={(event) => setData({ ...data, activeThemeId: event.target.value })}>
            {data.themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
          </select>
        </label>
        <label>
          Admin Token
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
              Name
              <input value={theme.name} onChange={(event) => updateTheme(theme.id, { name: event.target.value })} />
            </label>
            <label>
              Frame
              <input value={theme.frame} onChange={(event) => updateTheme(theme.id, { frame: event.target.value })} />
            </label>
            <label>
              Tags
              <input value={(theme.tags ?? []).join(', ')} onChange={(event) => updateTheme(theme.id, { tags: splitIds(event.target.value) })} />
            </label>
            <label>
              Zoom
              <input type="number" step="0.01" value={theme.quranZoom} onChange={(event) => updateTheme(theme.id, { quranZoom: Number(event.target.value) })} />
            </label>
          </div>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" onClick={addTheme} disabled={busy}>Add Theme</button>
        <button type="button" onClick={scanThemes} disabled={busy}>Scan Theme Folders</button>
        <button type="button" onClick={saveThemes} disabled={busy}>Save Themes</button>
        <button type="button" onClick={loadThemes} disabled={busy}>Reload</button>
      </div>
      <p className="admin-message">{message}</p>
    </section>
  );
}

function FillersPanel() {
  const [template, setTemplate] = useState<ProgrammingTemplate | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('Loading fillers');
  const [busy, setBusy] = useState(false);

  const loadTemplate = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/programming-template', { cache: 'no-store' })
      .then((response) => response.json() as Promise<ProgrammingResponse>)
      .then((payload) => {
        setTemplate(payload.template);
        setMessage('Fillers loaded');
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
          title: `Filler ${current.fillers.length + 1}`,
          durationSec: 120,
          slides: ['/assets/slides/dua-1.jpeg']
        }
      ]
    } : current);
  }

  async function saveFillers() {
    if (!template) return;
    if (!adminToken.trim()) {
      setMessage('Admin token required');
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
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'Fillers save failed');
        return;
      }
      setTemplate(payload.template);
      setMessage('Fillers saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!template) {
    return (
      <section className="admin-panel">
        <h2>Fillers</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>Fillers and Announcements</h2>
          <strong>{template.fillers.length} configured</strong>
        </div>
        <div className="form-grid">
          <label>
            Admin Token
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
                Type
                <select value={filler.type} onChange={(event) => updateFiller(filler.id, { type: event.target.value as ProgrammingFiller['type'] })}>
                  <option value="break">Visual Break</option>
                  <option value="announcement">Announcement</option>
                  <option value="audio_message">Audio Message</option>
                </select>
              </label>
              <label>
                Title
                <input value={filler.title} onChange={(event) => updateFiller(filler.id, { title: event.target.value })} />
              </label>
              <label>
                Duration
                <input type="number" min="1" value={filler.durationSec} onChange={(event) => updateFiller(filler.id, { durationSec: Number(event.target.value) })} />
              </label>
              <label>
                Slides
                <textarea value={stringifyMediaList(filler.slides)} onChange={(event) => updateFiller(filler.id, { slides: parseMediaList(event.target.value) })} />
              </label>
              <label>
                Audio
                <input value={filler.audio ?? ''} onChange={(event) => updateFiller(filler.id, { audio: event.target.value || undefined })} />
              </label>
            </div>
          ))}
        </div>
        <div className="admin-actions">
          <button type="button" onClick={addFiller} disabled={busy}>Add Filler</button>
          <button type="button" onClick={saveFillers} disabled={busy}>Save Fillers</button>
          <button type="button" onClick={loadTemplate} disabled={busy}>Reload</button>
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
        Slides
        <textarea value={stringifyMediaList(item.slides)} onChange={(event) => onChange({ slides: parseMediaList(event.target.value) })} />
      </label>
      <label>
        Audio
        <input value={item.audio ?? ''} onChange={(event) => onChange({ audio: event.target.value || undefined })} />
      </label>
    </>
  );
}

function VideoFields({ item, onChange }: { item: VideoScheduleItem; onChange: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="form-grid">
      <label>
        Source
        <input value={item.source} onChange={(event) => onChange({ source: event.target.value })} />
      </label>
      <label>
        Start Mode
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
        Source
        <input value={item.source} onChange={(event) => onChange({ source: event.target.value })} />
      </label>
      <label>
        Start Mode
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
  const [message, setMessage] = useState('Loading overlays');
  const [busy, setBusy] = useState(false);

  const loadOverlays = useCallback(() => {
    setBusy(true);
    fetch('/api/channel/overlays', { cache: 'no-store' })
      .then((response) => response.json() as Promise<OverlaysResponse>)
      .then((payload) => {
        setOverlays(payload.overlays);
        setValidation(payload.validation ?? null);
        setMessage('Overlays loaded');
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
    setMessage('Saving overlays');
    try {
      const response = await fetch('/api/channel/overlays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken.trim() },
        body: JSON.stringify(overlays)
      });
      const payload = await response.json() as OverlaysResponse & { error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || payload.validation?.errors?.join(', ') || 'Failed to save overlays');
      setOverlays(payload.overlays);
      setValidation(payload.validation ?? null);
      setMessage('Overlays saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!overlays) {
    return (
      <section className="admin-panel">
        <h2>Overlays</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Overlays</h2>
        <strong>Logo, ticker, extra image</strong>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.logo.enabled} onChange={(event) => updateLogo({ enabled: event.target.checked })} />
          Show channel logo
        </label>
        <label>
          Logo Text
          <input value={overlays.logo.text} onChange={(event) => updateLogo({ text: event.target.value })} />
        </label>
        <label>
          Logo Subtext
          <input value={overlays.logo.subtext} onChange={(event) => updateLogo({ subtext: event.target.value })} />
        </label>
        <label>
          Logo Image Path
          <input placeholder="/assets/overlays/logo.png" value={overlays.logo.imagePath ?? ''} onChange={(event) => updateLogo({ imagePath: event.target.value })} />
        </label>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.ticker.enabled} onChange={(event) => updateTicker({ enabled: event.target.checked })} />
          Show ticker
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.ticker.includeTodaySchedule} onChange={(event) => updateTicker({ includeTodaySchedule: event.target.checked })} />
          Include today schedule
        </label>
        <label>
          Welcome Text
          <input value={overlays.ticker.welcomeText} onChange={(event) => updateTicker({ welcomeText: event.target.value })} />
        </label>
        <label>
          Today Prefix
          <input value={overlays.ticker.todayPrefix} onChange={(event) => updateTicker({ todayPrefix: event.target.value })} />
        </label>
        <label>
          Ticker Speed Seconds
          <input type="number" min="20" max="180" value={overlays.ticker.speedSec} onChange={(event) => updateTicker({ speedSec: Number(event.target.value) })} />
        </label>
      </div>

      <div className="form-grid">
        <label className="checkbox-row">
          <input type="checkbox" checked={overlays.extraImage.enabled} onChange={(event) => updateExtraImage({ enabled: event.target.checked })} />
          Show extra image
        </label>
        <label>
          Extra Image Path
          <input placeholder="/assets/overlays/qr.png" value={overlays.extraImage.imagePath ?? ''} onChange={(event) => updateExtraImage({ imagePath: event.target.value })} />
        </label>
        <label>
          Position
          <select value={overlays.extraImage.position} onChange={(event) => updateExtraImage({ position: event.target.value as ChannelOverlaySettings['extraImage']['position'] })}>
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
          </select>
        </label>
        <label>
          Width px
          <input type="number" min="96" max="520" value={overlays.extraImage.widthPx} onChange={(event) => updateExtraImage({ widthPx: Number(event.target.value) })} />
        </label>
        <label>
          Admin Token
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>

      <div className="admin-actions">
        <button type="button" onClick={saveOverlays} disabled={busy}>Save Overlays</button>
        <button type="button" onClick={loadOverlays} disabled={busy}>Reload</button>
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
        <h2>Validation</h2>
        <strong>{validation?.ok ? 'valid' : validation ? 'invalid' : 'pending'}</strong>
      </div>
      <div className="validation-list">
        {(validation?.errors.length ? validation.errors : ['No validation errors']).map((error) => (
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
  const [message, setMessage] = useState('Loading reciters');
  const [busy, setBusy] = useState(false);

  const loadReciters = useCallback(() => {
    setBusy(true);
    fetch('/api/reciters', { cache: 'no-store' })
      .then((response) => response.json() as Promise<RecitersResponse>)
      .then((payload) => {
        setData(payload);
        setMessage('Reciters loaded');
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
            name: `Reciter ${current.reciters.length + 1}`,
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
      setMessage('Admin token required');
      return;
    }

    setBusy(true);
    setMessage('Saving reciters');
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
        setMessage(payload.validation?.errors.join(' | ') || payload.error || 'Reciter save failed');
        return;
      }
      setData(payload);
      setMessage('Reciters saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <section className="admin-panel">
        <h2>Readers</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Readers</h2>
        <strong>{data.reciters.length} configured</strong>
      </div>
      <div className="form-grid">
        <label>
          Audio Root
          <input value={data.audioRootDir} readOnly />
        </label>
        <label>
          Admin Token
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
              Active
            </label>
            <label>
              ID
              <input value={reciter.id} onChange={(event) => updateReciter(reciter.id, { id: event.target.value })} />
            </label>
            <label>
              Name
              <input value={reciter.name} onChange={(event) => updateReciter(reciter.id, { name: event.target.value })} />
            </label>
            <label>
              Folder
              <input value={reciter.folderName} onChange={(event) => updateReciter(reciter.id, { folderName: event.target.value })} />
            </label>
            <button type="button" className="danger" onClick={() => removeReciter(reciter.id)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="admin-actions">
        <button type="button" onClick={addReciter} disabled={busy}>Add Reader</button>
        <button type="button" onClick={saveReciters} disabled={busy}>Save Readers</button>
        <button type="button" onClick={loadReciters} disabled={busy}>Reload</button>
      </div>
      <p className="admin-message">{message}</p>
    </section>
  );
}

function MediaPanel() {
  const [media, setMedia] = useState<MediaIndex | null>(null);
  const [adminToken, setAdminToken] = useState('');
  const [message, setMessage] = useState('Loading media library');
  const [busy, setBusy] = useState(false);

  const loadMedia = useCallback(() => {
    setBusy(true);
    fetch('/api/media/library', { cache: 'no-store' })
      .then((response) => response.json() as Promise<MediaIndex>)
      .then((payload) => {
        setMedia(payload);
        setMessage('Media library loaded');
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  async function scanMedia() {
    if (!adminToken.trim()) {
      setMessage('Admin token required');
      return;
    }

    setBusy(true);
    setMessage('Scanning media');
    try {
      const response = await fetch('/api/media/scan', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken.trim() }
      });
      const payload = await response.json() as MediaIndex & { error?: string };
      if (!response.ok || !payload.ok) {
        setMessage(payload.error || 'Media scan failed');
        return;
      }
      setMedia(payload);
      setMessage('Media scan complete');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-title">
        <h2>Media Library</h2>
        <strong>{media?.generatedAt ? new Date(media.generatedAt).toLocaleString() : 'pending'}</strong>
      </div>
      <div className="form-grid">
        <label>
          Admin Token
          <input type="password" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} />
        </label>
      </div>
      <div className="admin-actions">
        <button type="button" onClick={scanMedia} disabled={busy}>Scan Media</button>
        <button type="button" onClick={loadMedia} disabled={busy}>Reload</button>
      </div>
      {media ? (
        <>
          <div className="status-grid">
            <Metric label="Quran Images" value={String(media.summary.quranPageImages)} />
            <Metric label="Reciter Audio" value={String(media.summary.reciterAudio)} />
            <Metric label="Slides" value={String(media.summary.breakSlides)} />
            <Metric label="Missing" value={String(media.summary.missingFiles)} />
          </div>
          <div className="diagnostics-table compact">
            {media.categories.reciterAudio.map((reciter) => (
              <div key={reciter.reciterId}>
                <span>{reciter.reciterId}</span>
                <strong>{reciter.fileCount} audio files</strong>
              </div>
            ))}
            {media.categories.reciterAudio.length === 0 && (
              <div>
                <span>Reciter Audio</span>
                <strong>0 audio files</strong>
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
            {media.missingFiles.length > 12 && <p>{media.missingFiles.length - 12} more missing files</p>}
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
    programming: 'Daily Programming',
    readers: 'Readers',
    themes: 'Themes',
    overlays: 'Overlays',
    fillers: 'Fillers',
    schedule: 'Schedule and Publish',
    diagnostics: 'Diagnostics'
  };
  return labels[section];
}

function typeLabel(type: ChannelScheduleItem['type']) {
  return type.replace('_', ' ');
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
