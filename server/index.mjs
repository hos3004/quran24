import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createMediaScanner } from './channel/mediaScanner.mjs';
import { createOverlayStore } from './channel/overlayStore.mjs';
import { createProgrammingStore } from './channel/programmingStore.mjs';
import { createReciterStore } from './channel/reciterStore.mjs';
import { summarizeReligiousSchedule } from './channel/religiousSchedule.mjs';
import { generateScheduleFromTemplate } from './channel/scheduleGenerator.mjs';
import { createScheduleStore } from './channel/scheduleStore.mjs';
import { createTelemetryStore } from './channel/telemetryStore.mjs';
import { createThemeStore } from './channel/themeStore.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const CLIENT_DIST = join(ROOT, 'client', 'dist');
const CLIENT_ASSETS = join(CLIENT_DIST, 'assets');
const PORT = Number.parseInt(process.env.PORT || '3737', 10);
const HOST = process.env.HOST || '0.0.0.0';
const startedAtMs = Date.now();

const app = express();

app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function readJsonIfExists(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    log('warn', 'json_read_failed', { filePath, message: error.message });
    return fallback;
  }
}

function log(level, event, fields = {}) {
  console.log(JSON.stringify({
    level,
    event,
    time: new Date().toISOString(),
    ...fields
  }));
}

const packageJson = readJsonIfExists(join(ROOT, 'package.json'), { version: '0.0.0' });
const scheduleStore = createScheduleStore({ rootDir: ROOT, logger: log });
const reciterStore = createReciterStore({ rootDir: ROOT, logger: log });
const themeStore = createThemeStore({ rootDir: ROOT, logger: log });
const overlayStore = createOverlayStore({ rootDir: ROOT, logger: log });
const programmingStore = createProgrammingStore({ rootDir: ROOT, logger: log });
const mediaScanner = createMediaScanner({ rootDir: ROOT, logger: log });
const telemetryStore = createTelemetryStore({ rootDir: ROOT, logger: log });

const defaultConfig = {
  service: 'quran24-channel',
  channelPath: '/channel',
  startPage: 1,
  loopMode: true,
  layoutPreset: 1,
  reciterName: 'Default reciter',
  hafsDir: 'data/assets/hafs',
  mp3Dir: 'data/reciters/default',
  slideDir: 'data/assets/slides'
};

app.use((req, res, next) => {
  const started = performance.now();
  res.on('finish', () => {
    log('info', 'http_request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round((performance.now() - started) * 100) / 100
    });
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'quran24-channel',
    time: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAtMs) / 1000),
    version: packageJson.version || '0.0.0'
  });
});

app.get('/api/channel/status', (_req, res) => {
  let schedule = null;
  let telemetry = null;
  let religiousSchedule = null;
  let themes = null;
  let template = null;
  try {
    schedule = scheduleStore.loadSchedule();
  } catch (error) {
    log('error', 'schedule_status_load_failed', { message: error.message });
  }
  try {
    religiousSchedule = schedule ? summarizeReligiousSchedule(schedule) : null;
  } catch (error) {
    log('warn', 'religious_schedule_status_failed', { message: error.message });
  }
  try {
    telemetry = telemetryStore.getStatus();
  } catch (error) {
    log('warn', 'telemetry_status_load_failed', { message: error.message });
  }
  try {
    themes = themeStore.loadThemes();
  } catch (error) {
    log('warn', 'themes_status_load_failed', { message: error.message });
  }
  try {
    template = programmingStore.loadTemplate();
  } catch (error) {
    log('warn', 'programming_template_status_load_failed', { message: error.message });
  }

  res.json({
    ok: true,
    service: 'quran24-channel',
    time: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAtMs) / 1000),
    version: packageJson.version || '0.0.0',
    phase: 18,
    schedule: {
      loaded: Boolean(schedule),
      activeVersion: schedule?.version ?? null,
      status: schedule?.status ?? null,
      source: schedule ? 'data/channel/schedule.json' : 'unavailable'
    },
    runtime: {
      channelRoute: '/channel',
      androidBridge: true,
      androidTvShell: true,
      androidBridgeReceiver: true,
      androidWatchdog: true,
      nativeMedia3Playback: true,
      nativeHlsPlayback: true,
      webOfflineCache: true,
      androidWebViewCacheFallback: true,
      telemetryHeartbeatApi: true,
      remoteDeviceStatus: true,
      webRuntimeErrorReporter: true,
      webRuntimeErrorBoundary: true,
      webRuntimeStallWatchdog: true,
      boundedTelemetryRetention: true,
      religiousScheduleInsights: true,
      fridayOverrideAwareness: true,
      taraweehReadiness: true,
      spiritualFillerInventory: true,
      channelTelemetryAlias: true,
      channelDevicesAlias: true,
      remoteReloadCommand: true,
      webViewAssetLoader: true,
      bundledFallbackScreen: true,
      themeLibrary: true,
      programmingTemplateGenerator: true,
      reciterThemeRotation: true,
      heartbeat: 'every-5-sec'
    },
    programming: {
      loaded: Boolean(template),
      blockCount: template?.blocks?.length ?? 0,
      fillerCount: template?.fillers?.length ?? 0
    },
    themes: {
      loaded: Boolean(themes),
      totalThemes: themes?.themes?.length ?? 0,
      activeThemeId: themes?.activeThemeId ?? null
    },
    religiousSchedule: {
      loaded: Boolean(religiousSchedule),
      fridayScheduleConfigured: religiousSchedule?.summary.fridayScheduleConfigured ?? false,
      taraweehLiveStreamConfigured: religiousSchedule?.summary.taraweehLiveStreamConfigured ?? false,
      spiritualFillerCount: religiousSchedule?.summary.spiritualFillerCount ?? 0,
      quranCoveredPages: religiousSchedule?.summary.quranPageSpan.coveredPages ?? 0
    },
    telemetry: {
      loaded: Boolean(telemetry),
      totalDevices: telemetry?.totalDevices ?? 0,
      onlineDevices: telemetry?.onlineDevices ?? 0,
      staleAfterSec: telemetry?.staleAfterSec ?? 45,
      source: 'data/channel/telemetry.json'
    },
    compatibility: {
      config: true,
      manifest: true,
      slides: true
    }
  });
});

app.get('/api/channel/religious-schedule', (_req, res) => {
  try {
    const schedule = scheduleStore.loadSchedule();
    res.json(summarizeReligiousSchedule(schedule));
  } catch (error) {
    log('error', 'religious_schedule_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load religious schedule insights' });
  }
});

app.post(['/api/telemetry/heartbeat', '/api/channel/telemetry'], (req, res) => {
  try {
    const result = telemetryStore.recordHeartbeat(req.body || {}, {
      userAgent: req.get('user-agent') || '',
      remoteAddress: req.ip || req.socket.remoteAddress || ''
    });
    res.json(result);
  } catch (error) {
    log('warn', 'telemetry_heartbeat_rejected', { message: error.message });
    res.status(400).json({ ok: false, error: 'Invalid telemetry heartbeat' });
  }
});

app.get(['/api/telemetry/devices', '/api/channel/devices'], (_req, res) => {
  try {
    res.json(telemetryStore.getStatus());
  } catch (error) {
    log('error', 'telemetry_devices_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load telemetry devices' });
  }
});

app.post('/api/channel/reload-device', requireAdminWrite, (req, res) => {
  try {
    res.json(telemetryStore.queueReloadCommand(req.body || {}));
  } catch (error) {
    log('warn', 'telemetry_reload_rejected', { message: error.message });
    res.status(400).json({ ok: false, error: error.message || 'Invalid reload command' });
  }
});

app.get('/api/channel/schedule', (_req, res) => {
  try {
    const schedule = scheduleStore.loadSchedule();
    const validation = scheduleStore.validateSchedule(schedule);
    res.json({ ok: true, schedule, validation });
  } catch (error) {
    log('error', 'schedule_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load schedule' });
  }
});

app.post('/api/channel/schedule/validate', (req, res) => {
  try {
    const validation = scheduleStore.validateSchedule(req.body || {});
    res.json({ ok: validation.ok, validation });
  } catch (error) {
    log('error', 'schedule_validate_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to validate schedule' });
  }
});

app.patch('/api/channel/schedule', requireAdminWrite, (req, res) => {
  try {
    const result = scheduleStore.publishSchedule(req.body || {}, {
      bumpVersion: true,
      publishedBy: req.get('x-admin-user') || undefined
    });

    if (!result.ok) {
      res.status(400).json(result);
      return;
    }

    res.json({
      ok: true,
      schedule: result.schedule,
      validation: result.validation,
      historyFile: result.historyPath ? result.historyPath.replace(ROOT, '').replace(/\\/g, '/') : null
    });
  } catch (error) {
    log('error', 'schedule_patch_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to save schedule' });
  }
});

app.get('/api/channel/programming-template', (_req, res) => {
  try {
    const template = programmingStore.loadTemplate();
    const validation = programmingStore.validateTemplate(template);
    res.json({ ok: true, template, validation });
  } catch (error) {
    log('error', 'programming_template_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load programming template' });
  }
});

app.patch('/api/channel/programming-template', requireAdminWrite, (req, res) => {
  try {
    const result = programmingStore.saveTemplate(req.body || {});
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    log('error', 'programming_template_patch_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to save programming template' });
  }
});

app.post('/api/channel/programming-template/generate', (req, res) => {
  try {
    const template = req.body?.template ? programmingStore.validateTemplate(req.body.template).ok ? req.body.template : programmingStore.loadTemplate() : programmingStore.loadTemplate();
    const reciters = reciterStore.loadReciters().reciters;
    const themes = themeStore.loadThemes().themes;
    const current = scheduleStore.loadSchedule();
    const schedule = generateScheduleFromTemplate({
      template,
      reciters,
      themes,
      version: Math.max(1, Number(current?.version || 0) + 1),
      status: req.body?.status === 'published' ? 'published' : 'draft',
      publishedBy: req.get('x-admin-user') || 'programming-generator'
    });
    const validation = scheduleStore.validateSchedule(schedule, {
      knownReciterIds: reciters.map((reciter) => reciter.id)
    });
    res.json({ ok: validation.ok, schedule, validation });
  } catch (error) {
    log('error', 'programming_template_generate_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to generate schedule' });
  }
});

app.get('/api/reciters', (_req, res) => {
  try {
    res.json({ ok: true, ...reciterStore.loadReciters() });
  } catch (error) {
    log('error', 'reciters_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load reciters' });
  }
});

app.patch('/api/reciters', requireAdminWrite, (req, res) => {
  try {
    const result = reciterStore.saveReciters(req.body || {});
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json({ ok: true, ...result.reciters, validation: result.validation });
  } catch (error) {
    log('error', 'reciters_patch_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to save reciters' });
  }
});

app.get('/api/themes', (_req, res) => {
  try {
    res.json(themeStore.loadThemes());
  } catch (error) {
    log('error', 'themes_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load themes' });
  }
});

app.patch('/api/themes', requireAdminWrite, (req, res) => {
  try {
    const result = themeStore.saveThemes(req.body || {});
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    log('error', 'themes_patch_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to save themes' });
  }
});

app.post('/api/themes/scan', requireAdminWrite, (_req, res) => {
  try {
    res.json(themeStore.scanThemeFolders({ persist: true }));
  } catch (error) {
    log('error', 'themes_scan_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to scan themes' });
  }
});

app.get('/api/channel/overlays', (_req, res) => {
  try {
    res.json(overlayStore.loadOverlays());
  } catch (error) {
    log('error', 'overlays_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load overlays' });
  }
});

app.patch('/api/channel/overlays', requireAdminWrite, (req, res) => {
  try {
    const result = overlayStore.saveOverlays(req.body || {});
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    log('error', 'overlays_patch_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to save overlays' });
  }
});

app.get('/api/media/library', (_req, res) => {
  try {
    res.json(mediaScanner.loadMediaIndex());
  } catch (error) {
    log('error', 'media_library_get_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to load media library' });
  }
});

app.post('/api/media/scan', requireAdminWrite, (_req, res) => {
  try {
    res.json(mediaScanner.scanMedia());
  } catch (error) {
    log('error', 'media_scan_failed', { message: error.message });
    res.status(500).json({ ok: false, error: 'Failed to scan media library' });
  }
});

if (existsSync(CLIENT_ASSETS)) {
  app.use('/assets', express.static(CLIENT_ASSETS, {
    fallthrough: true,
    maxAge: '1m'
  }));
}

app.use('/assets/reciters', express.static(join(ROOT, 'data', 'reciters'), {
  fallthrough: true,
  maxAge: '5m'
}));

app.use('/assets', express.static(join(ROOT, 'data', 'assets'), {
  fallthrough: true,
  maxAge: '5m'
}));

app.use('/assets', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(404).json({
    ok: false,
    error: 'Asset not found',
    path: req.originalUrl
  });
});

app.get('/api/config', (_req, res) => {
  const config = readJsonIfExists(join(ROOT, 'data', 'config.json'), defaultConfig);
  res.json(config);
});

app.get('/api/slides', (_req, res) => {
  const slideDir = join(ROOT, 'data', 'assets', 'slides');
  const imageExtensions = new Set(['.webp', '.png', '.jpg', '.jpeg']);

  if (!existsSync(slideDir)) {
    res.json({ slides: [] });
    return;
  }

  const slides = readdirSync(slideDir)
    .filter((fileName) => imageExtensions.has(extname(fileName).toLowerCase()))
    .map((fileName) => ({
      fileName,
      assetPath: `/assets/slides/${fileName}`,
      modifiedMs: statSync(join(slideDir, fileName)).mtimeMs
    }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, 'en'))
    .map((file) => file.assetPath);

  res.json({ slides });
});

app.get(['/api/manifest', '/manifest.json'], (_req, res) => {
  const manifest = readJsonIfExists(join(ROOT, 'data', 'manifest.json'), []);
  res.json(manifest);
});

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1m' }));
}

app.get(/.*/, (_req, res) => {
  const indexPath = join(CLIENT_DIST, 'index.html');
  if (existsSync(indexPath)) {
    res.set('Cache-Control', 'public, max-age=60');
    res.sendFile(indexPath);
    return;
  }

  res.status(200).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quran24 Server</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1117; color: #f5f0e6; font-family: Arial, sans-serif; }
      main { width: min(720px, calc(100vw - 48px)); }
      code { color: #9fd3ff; }
    </style>
  </head>
  <body>
    <main>
      <h1>Quran24 server is running</h1>
      <p>Build the client with <code>npm run build</code> to serve the web runtime here.</p>
    </main>
  </body>
</html>`);
});

function requireAdminWrite(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    res.status(403).json({
      ok: false,
      error: 'Write APIs are disabled until ADMIN_TOKEN is set'
    });
    return;
  }

  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = req.get('x-admin-token') || bearer;
  if (provided !== expected) {
    res.status(401).json({ ok: false, error: 'Invalid admin token' });
    return;
  }

  next();
}

const server = app.listen(PORT, HOST, () => {
  log('info', 'server_started', {
    service: 'quran24-channel',
    url: `http://${HOST}:${PORT}`
  });
});

function shutdown(signal) {
  log('info', 'server_shutdown', { signal });
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
