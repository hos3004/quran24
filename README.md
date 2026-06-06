# Quran24

Android TV virtual linear Quran channel platform.

Quran24 is being built as a channel-first successor to the reference `livestreamquran` project. The core model is:

```text
Schedule + local rendering + synchronized clock = TV-like channel
```

The current foundation includes schedule storage, server-time pseudo-live playback, Quran page rendering, break/announcement rendering, browser-to-Android bridge events, the Android TV fullscreen WebView shell, Android-side heartbeat watchdog, native Media3 playback for video/HLS bridge items, first-pass offline cache recovery, runtime telemetry/device diagnostics, web runtime stability recovery, and religious schedule insights. Deeper local asset packaging is added in later phases.

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
- `GET /api/channel/religious-schedule`
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
- `POST /api/telemetry/heartbeat`
- `GET /api/telemetry/devices`

These endpoints are minimal early-phase implementations. They preserve useful paths from the reference app while the channel-first API is built in later phases.

## Admin Schedule Editor

Phase 9 adds a schedule editor under `/admin?section=schedule`. It can load the current schedule, edit daily/weekly item fields, add Quran/break/announcement/video/live-stream items, call the backend validator, save drafts, and publish with the admin token.

Phase 10 connects `/admin?section=readers` and `/admin?section=media` to the reciter and media APIs. Reciter metadata is stored in `data/channel/reciters.json`; heavy audio remains local under ignored `data/reciters/` folders. The media scanner writes `data/channel/media-index.json` and reports missing manifest/schedule references.

Phase 15 adds runtime telemetry. The `/channel` web runtime posts a compact heartbeat every 15 seconds to `/api/telemetry/heartbeat`. The server stores latest device status in ignored local file `data/channel/telemetry.json`, exposes `/api/telemetry/devices`, and the admin Diagnostics section shows online/stale devices.

Phase 16 adds long-run stability hardening. The web runtime installs global error reporting, wraps `/channel` in a React error boundary, reports runtime errors to the Android bridge, and requests a native WebView reload if the runtime stays stuck in loading for too long.

Phase 17 adds religious schedule insights. The seed schedule now includes Friday programming metadata, a safe Friday override using the available seeded Quran pages, Taraweeh readiness detection, and spiritual filler inventory for admin diagnostics.

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

## Android TV Shell

Phase 11 adds the first native Android TV project under:

```text
android-tv/
```

Build the debug APK with JDK 17:

```powershell
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
```

Default channel URL:

```text
http://10.0.2.2:3737/channel
```

For the local development environment where port `3737` is already occupied, run Quran24 on `3837` and bridge it to the emulator:

```powershell
$env:PORT = "3837"
npm run server

$adb = "C:\Users\gamer\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 reverse tcp:3737 tcp:3837
& $adb -s emulator-5554 install -r android-tv\app\build\outputs\apk\debug\app-debug.apk
& $adb -s emulator-5554 shell am start -n com.quran24.tv/.MainActivity -e channel_url http://127.0.0.1:3737/channel
```

The TV shell is fullscreen, keeps the screen awake, loads `/channel` in WebView, stores the channel URL locally, receives bridge events from the web runtime, plays video/HLS items through Media3/ExoPlayer, tries cached WebView content when the channel URL is unavailable, watches for heartbeat stalls, and opens native settings through Menu/Settings when available or a long press on OK/DPAD_CENTER.

## Documentation

- `docs/PROJECT_MAP.md`
- `docs/ARCHITECTURE_REVIEW.md`
- `docs/PHASE_STATUS.md`
- `docs/ANDROID_TV.md`
