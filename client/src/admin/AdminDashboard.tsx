import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActiveScheduleItem } from '../channel/scheduler';
import type {
  BreakScheduleItem,
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
    runtime: { channelRoute: string; androidBridge: boolean; heartbeat: string };
    compatibility: { config: boolean; manifest: boolean; slides: boolean };
  } | null;
  errors: string[];
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

const adminSections = ['general', 'readers', 'schedule', 'media', 'diagnostics'] as const;
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

        {section === 'schedule' ? (
          <ScheduleEditor />
        ) : section === 'diagnostics' ? (
          <DiagnosticsPanel diagnostics={diagnostics} loadState={loadState} />
        ) : section === 'readers' ? (
          <ReadersPanel />
        ) : section === 'media' ? (
          <MediaPanel />
        ) : (
          <GeneralPanel diagnostics={diagnostics} loadState={loadState} />
        )}
      </div>
    </main>
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
        Layout Preset
        <input type="number" min="1" value={item.layoutPresetId ?? ''} onChange={(event) => onChange({ layoutPresetId: numberOrUndefined(event.target.value) })} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" checked={Boolean(item.allowAutoContinue)} onChange={(event) => onChange({ allowAutoContinue: event.target.checked })} />
        Auto Continue
      </label>
    </div>
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

function GeneralPanel({ diagnostics, loadState }: { diagnostics: AdminDiagnostics; loadState: LoadState }) {
  return (
    <section className="admin-panel">
      <h2>General</h2>
      <div className="status-grid">
        <Metric label="Load State" value={loadState} />
        <Metric label="Service" value={diagnostics.health?.service ?? diagnostics.config?.service ?? 'quran24-channel'} />
        <Metric label="Phase" value={String(diagnostics.channelStatus?.phase ?? 9)} />
        <Metric label="Schedule" value={String(diagnostics.channelStatus?.schedule.activeVersion ?? 'none')} />
      </div>
    </section>
  );
}

function ReadersPanel() {
  return (
    <section className="admin-panel">
      <h2>Readers</h2>
      <div className="diagnostics-table compact">
        <div>
          <span>Default</span>
          <strong>ajmy</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>Phase 10</strong>
        </div>
      </div>
    </section>
  );
}

function MediaPanel() {
  return (
    <section className="admin-panel">
      <h2>Media Library</h2>
      <div className="diagnostics-table compact">
        <div>
          <span>Quran Pages</span>
          <strong>20 seeded</strong>
        </div>
        <div>
          <span>Slides</span>
          <strong>2 seeded</strong>
        </div>
        <div>
          <span>Scanner</span>
          <strong>Phase 10</strong>
        </div>
      </div>
    </section>
  );
}

function DiagnosticsPanel({ diagnostics, loadState }: { diagnostics: AdminDiagnostics; loadState: LoadState }) {
  const compatibility = diagnostics.channelStatus?.compatibility;

  return (
    <section className="admin-panel">
      <h2>Diagnostics</h2>
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
  return value && adminSections.includes(value) ? value : 'general';
}

function sectionLabel(section: AdminSection) {
  const labels: Record<AdminSection, string> = {
    general: 'General',
    readers: 'Readers',
    schedule: 'Channel Schedule',
    media: 'Media Library',
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
