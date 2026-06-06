import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const CLIENT_DIST = join(ROOT, 'client', 'dist');
const PORT = Number.parseInt(process.env.PORT || '3737', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.disable('x-powered-by');
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

function readJsonIfExists(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(JSON.stringify({
      level: 'warn',
      event: 'json_read_failed',
      filePath,
      message: error.message
    }));
    return fallback;
  }
}

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

app.get('*', (_req, res) => {
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

const server = app.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    level: 'info',
    event: 'server_started',
    service: 'quran24-channel',
    url: `http://${HOST}:${PORT}`
  }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'server_shutdown', signal }));
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

