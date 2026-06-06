# Quran24

Android TV virtual linear Quran channel platform.

Quran24 is being built as a channel-first successor to the reference `livestreamquran` project. The core model is:

```text
Schedule + local rendering + synchronized clock = TV-like channel
```

Phase 1 establishes the runnable web/server foundation only. Channel scheduling, Quran playback, Android TV, Media3, watchdogs, telemetry, and offline cache are added in later phases.

## Local Folders

```text
D:\2025 apps\livestreamquran-reference
D:\2025 apps\quran24
```

`livestreamquran-reference` is read-only reference material. All new work happens in `quran24`.

## Requirements

- Node.js 22 or newer
- npm

## Install

```powershell
npm install
```

## Run

```powershell
npm run dev
```

Server:

```text
http://localhost:3737
```

Client dev server:

```text
http://localhost:5173
```

## Build

```powershell
npm run build
```

The server serves the production client from `client/dist` after a build.

## Smoke Test

```powershell
npm run test
npm run server
```

Open:

```text
http://localhost:3737
```

## Current Compatibility Endpoints

- `GET /api/config`
- `GET /api/slides`
- `GET /api/manifest`
- `GET /manifest.json`

These endpoints are minimal Phase 1 placeholders. They are kept to preserve useful paths from the reference app while the channel-first API is built in later phases.

## Documentation

- `docs/PROJECT_MAP.md`
- `docs/ARCHITECTURE_REVIEW.md`
- `docs/PHASE_STATUS.md`
