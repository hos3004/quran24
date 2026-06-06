import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createScheduleStore } from './channel/scheduleStore.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const CLIENT_DIST = join(ROOT, 'client', 'dist');
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
    return JSON.parse(readFileSync(filePath, 'utf8'));
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
  try {
    schedule = scheduleStore.loadSchedule();
  } catch (error) {
    log('error', 'schedule_status_load_failed', { message: error.message });
  }

  res.json({
    ok: true,
    service: 'quran24-channel',
    time: new Date().toISOString(),
    uptimeSec: Math.floor((Date.now() - startedAtMs) / 1000),
    version: packageJson.version || '0.0.0',
    phase: 3,
    schedule: {
      loaded: Boolean(schedule),
      activeVersion: schedule?.version ?? null,
      status: schedule?.status ?? null,
      source: schedule ? 'data/channel/schedule.json' : 'unavailable'
    },
    runtime: {
      channelRoute: '/channel',
      androidBridge: false,
      heartbeat: 'not-implemented-yet'
    },
    compatibility: {
      config: true,
      manifest: true,
      slides: true
    }
  });
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

app.patch('/api/channel/schedule', requireAdminWrite, (req, res) => {
  try {
    const result = scheduleStore.publishSchedule(req.body || {}, {
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

app.use('/assets', express.static(join(ROOT, 'data', 'assets'), {
  fallthrough: true,
  maxAge: '5m'
}));

app.get('/api/config', (_req, res) => {
  const config = readJsonIfExists(join(ROOT, 'data', 'config.json'), defaultConfig);
  res.json(config);
});

app.get('/api/slides', (_req, res) => {
  res.json({ slides: [] });
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
