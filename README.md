# Quran24

Android TV virtual linear Quran channel platform.

Quran24 is being built as a channel-first successor to the reference `livestreamquran` project. The core model is:

```text
Schedule + local rendering + synchronized clock = TV-like channel
```

The current foundation includes schedule storage, server-time pseudo-live playback, Quran page rendering, break/announcement rendering, and browser-to-Android bridge events for future native video/HLS playback. Android TV shell, Media3 playback, watchdogs, telemetry, and offline cache are added in later phases.

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

If port 3737 is already in use:

```powershell
$env:PORT = "3837"
npm run server
```

Client dev server:

```text
http://localhost:5173
```

Channel runtime:

```text
http://localhost:3737/channel
```

Admin dashboard:

```text
http://localhost:3737/admin
http://localhost:3737/admin?section=schedule
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

The root test command runs backend Node tests and client Vitest tests.

Open:

```text
http://localhost:3737
```

## Current Compatibility Endpoints

- `GET /api/health`
- `GET /api/channel/status`
- `GET /api/channel/schedule`
- `POST /api/channel/schedule/validate`
- `PATCH /api/channel/schedule`
- `GET /api/config`
- `GET /api/slides`
- `GET /api/manifest`
- `GET /manifest.json`
- `GET /api/reciters`
- `PATCH /api/reciters`
- `GET /api/media/library`
- `POST /api/media/scan`

These endpoints are minimal early-phase implementations. They preserve useful paths from the reference app while the channel-first API is built in later phases.

## Admin Schedule Editor

Phase 9 adds a schedule editor under `/admin?section=schedule`. It can load the current schedule, edit daily/weekly item fields, add Quran/break/announcement/video/live-stream items, call the backend validator, save drafts, and publish with the admin token.

Phase 10 connects `/admin?section=readers` and `/admin?section=media` to the reciter and media APIs. Reciter metadata is stored in `data/channel/reciters.json`; heavy audio remains local under ignored `data/reciters/` folders. The media scanner writes `data/channel/media-index.json` and reports missing manifest/schedule references.

## Seed Quran Assets

Phase 6 seeds pages 1-20 from the reference Hafs assets:

```text
data/assets/hafs/
data/manifest.json
```

The reference repository does not include reciter MP3 folders in Git, so the Quran renderer attempts audio alignment when audio files are present and keeps visual playback running when they are missing.

Phase 7 also seeds two break slides:

```text
data/assets/slides/dua-1.jpeg
data/assets/slides/dua-2.jpeg
```

## Android Bridge Events

The `/channel` web runtime emits JSON bridge events through `window.Quran24Android.postMessage(...)` or `window.AndroidBridge.postMessage(...)` when either object is present. Without Android, it dispatches browser events for testing:

```text
quran24:android-bridge-event
```

Current event types:

- `HEARTBEAT`
- `PLAY_VIDEO`
- `PLAY_LIVE_STREAM`
- `RUNTIME_ERROR`
- `REQUEST_RELOAD`

Android or tests can send commands back through `window.quran24ReceiveCommand(...)` or the `quran24:web-runtime-command` browser event. Current commands are `VIDEO_FINISHED`, `VIDEO_FAILED`, `RESUME_CHANNEL`, and `RELOAD_SCHEDULE`.

Write APIs require an admin token:

```powershell
$env:ADMIN_TOKEN = "change-me"
npm run server
```

Send the token as `x-admin-token` or `Authorization: Bearer <token>`.

## Documentation

- `docs/PROJECT_MAP.md`
- `docs/ARCHITECTURE_REVIEW.md`
- `docs/PHASE_STATUS.md`
