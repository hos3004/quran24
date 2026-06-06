# PHASE_STATUS

## Repository Safety

Backup branch/commit skipped for Phase 0 because quran24 is an empty unborn repository with no commits or files. No user work exists to protect.

## Current Branch

- Branch: `feature/channel-runtime-platform`
- Base state: empty unborn repository cloned from `https://github.com/hos3004/quran24`
- Remote `main`: absent at Phase 0 start

## Phase 0 Summary

Status: completed

Goal:

- Audit `livestreamquran-reference`.
- Audit `quran24`.
- Decide what to reuse and what to rebuild.
- Create Phase 0 documentation.

What changed:

- Added `docs/PROJECT_MAP.md`.
- Added `docs/ARCHITECTURE_REVIEW.md`.
- Added `docs/PHASE_STATUS.md`.

Reference used from `livestreamquran-reference`:

- Root and client package scripts.
- Express API server routes.
- Manifest format and ingest script.
- React runtime components and hooks.
- Quran renderer page-scrolling behavior.
- Content bounds detector.
- Slideshow and layout preset concepts.
- Admin dashboard structure.
- Asset folder layout and tracked media counts.

What was intentionally not reused:

- OBS-first app structure as the new product architecture.
- Unauthenticated write routes as production behavior.
- Arbitrary local path editing without safe-root validation.
- Browser audio as the only long-run Android TV playback strategy.
- Puppeteer video rendering as the core Quran delivery method.
- Any direct modifications to the reference repository.

## Phase 0 Verification

Result: passed for Phase 0.

Commands required by Phase 0:

```powershell
git status
npm install || true
cd client && npm install || true
cd ..
npm run build || true
```

Observed results on 2026-06-06:

- `git status --short --branch` reported an unborn `feature/channel-runtime-platform` branch with only `docs/` untracked.
- `npm install` reported `ENOENT` because `D:\2025 apps\quran24\package.json` does not exist yet.
- `cd client && npm install` was not applicable because `client` does not exist yet.
- `npm run build` reported `ENOENT` because `package.json` and build scripts do not exist yet.
- `npm install` created an empty `package-lock.json` side effect; it was removed before commit because Phase 0 is documentation-only and no package exists yet.

Phase 0 interpretation:

- No build scripts exist yet because Phase 0 is documentation-only.
- Missing `package.json` and missing `client` directory were documented honestly and are not Phase 0 failures.
- No destructive changes were made.

## Phase 0 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 0 commit: `52a6fe9`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 0 push without rewriting published history.

## Phase 1 Readiness

Phase 1 started after Phase 0 verification passed, Phase 0 docs were committed, and the branch was pushed.

Phase 1 should create the runnable web/server foundation without copying the old project wholesale.

## Phase 1 Summary

Status: completed

Goal:

- Create a clean runnable foundation in `quran24`.
- Add root package scripts.
- Add Express server.
- Add React + TypeScript + Vite client.
- Add compatibility placeholders for reference-era APIs.
- Add `.env.example`, `.gitignore`, README, and a lightweight test.

What changed:

- Added root npm workspace package.
- Added Express server at `server/index.mjs`.
- Added Vite React client under `client/`.
- Added minimal app shell served by the Express server after build.
- Added placeholder compatibility endpoints:
  - `GET /api/config`
  - `GET /api/slides`
  - `GET /api/manifest`
  - `GET /manifest.json`
- Added data placeholder directories:
  - `data/assets/`
  - `data/reciters/`
  - `data/channel/`
- Added root `README.md`.
- Added `test/foundation.test.mjs`.

Reference used from `livestreamquran-reference`:

- Express plus Vite split.
- Port convention: server on 3737 and client on 5173.
- Compatibility API names.
- Asset path conventions for `/assets`, manifest, slides, reciters, and Quran pages.

What was intentionally not reused:

- Full old React app.
- OBS player routes.
- Admin dashboard implementation.
- Old write APIs.
- Quran renderer internals, which begin in the scheduled runtime phases.
- Any tracked media from the reference repository.

## Phase 1 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm install
npm run build
npm run test
npm run lint
node server/index.mjs
```

Observed results:

- `git pull --ff-only`: already up to date.
- `npm install`: installed 253 packages, audited 255 packages, found 0 vulnerabilities.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 2 tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke test:
  - Initial Phase 1 smoke used port 3737 before discovering that port was already occupied by an old Quran Broadcast server in this environment.
  - Retested during Phase 2 with `PORT=3837` against the actual Quran24 server after fixing the Express 5 fallback route.
  - `http://localhost:3837/` returned 200 and contained `<title>Quran24</title>`.
  - `http://localhost:3837/api/config` returned 200.
  - `http://localhost:3837/api/slides` returned 200.
  - `http://localhost:3837/api/manifest` returned 200.

## Phase 1 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 1 commit: `671277e`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 1 push without rewriting published history.

## Phase 2 Summary

Status: completed

Goal:

- Add health diagnostics.
- Preserve compatibility endpoints.
- Add structured backend logging.
- Add a client diagnostics placeholder route.

What changed:

- Added `GET /api/health`.
- Added `GET /api/channel/status`.
- Added JSON request logging middleware.
- Fixed Express 5 fallback routing by replacing the `*` route with a regex catch-all.
- Updated the client app to fetch config, health, and channel status.
- Added `/admin` diagnostics placeholder in the web client.
- Added a test assertion for Phase 2 endpoint declarations.

Reference used from `livestreamquran-reference`:

- Preserved compatibility route names for config, manifest, and slides.
- Kept server port convention 3737 as the default.
- Did not copy reference server code wholesale.

What was intentionally not reused:

- Reference fallback route style, because Express 5 rejects `app.get('*')`.
- Reference admin dashboard implementation, because Phase 2 only needs a diagnostics placeholder.
- Unprotected write routes.

## Phase 2 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 3 tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Port 3737 was already occupied by a pre-existing old Quran Broadcast server, so Quran24 smoke verification used port 3837.
- Server smoke test on port 3837:
  - `GET /api/health` returned 200 with `service: quran24-channel`.
  - `GET /api/channel/status` returned 200 with `phase: 2`.
  - `GET /` returned 200 and contained `<title>Quran24</title>`.
  - `GET /admin` returned 200.
  - `GET /api/config` returned 200.

## Phase 2 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 2 commit: `ae51e2e`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 2 push without rewriting published history.

## Phase 3 Summary

Status: completed

Goal:

- Make schedule the core platform model.
- Add shared TypeScript schedule types.
- Add backend schedule store and validation.
- Add schedule files and history folder.
- Add protected schedule read/write APIs.

What changed:

- Added `client/src/channel/types.ts`.
- Added `server/channel/scheduleValidator.mjs`.
- Added `server/channel/scheduleStore.mjs`.
- Added `data/channel/schedule.json`.
- Added `data/channel/schedule-history/`.
- Added `GET /api/channel/schedule`.
- Added token-protected `PATCH /api/channel/schedule`.
- Updated `GET /api/channel/status` to report schedule version/status and Phase 3.
- Added schedule validator tests.

Reference used from `livestreamquran-reference`:

- Preserved page number bounds from the 604-page Hafs model.
- Preserved `/assets/...` path convention.
- Preserved future compatibility with reciter IDs from `reciters.json`.

What was intentionally not reused:

- Reference config write behavior.
- Arbitrary path editing.
- Legacy player state machine.
- Any media files from the reference repository.

## Phase 3 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; $env:ADMIN_TOKEN = "phase3-token"; node server/index.mjs
```

Observed results:

- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Valid PATCH with `x-admin-token: phase3-token` saved schedule version 2.
- Valid PATCH created history file `data/channel/schedule-history/schedule-v2-2026-06-06T05-30-00-000Z.json`.
- Invalid PATCH with `fromPage: 900` returned 400.
- Non-mutating smoke after final code tweak:
  - `GET /api/channel/status` returned 200 with `phase: 3`.
  - `GET /api/channel/schedule` returned 200 with `version: 2`.
  - schedule validation returned `ok: true`.

## Phase 3 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 3 commit: `fd042a7`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 3 push without rewriting published history.

## Phase 4 Summary

Status: completed

Goal:

- Create deterministic pseudo-live schedule calculations.
- Add server time sync utilities.
- Add schedule and clock hooks.
- Add boundary and drift tests.

What changed:

- Added `client/src/channel/scheduler.ts`.
- Added `client/src/channel/timeSync.ts`.
- Added `client/src/channel/hooks/useChannelClock.ts`.
- Added `client/src/channel/hooks/useChannelSchedule.ts`.
- Added `client/src/channel/scheduler.test.ts`.
- Added `client/src/channel/timeSync.test.ts`.
- Added client Vitest into the root `npm run test` flow.

Reference used from `livestreamquran-reference`:

- Preserved manifest page duration concept for Quran page offset calculation.
- Preserved page range assumptions from the 604-page Hafs model.

What was intentionally not reused:

- Old sequential playback state machine.
- Browser audio state coupling.
- Render-mode video timeline code.

## Phase 4 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
```

Observed results:

- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 backend Node tests passed and 13 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.

Test coverage added:

- exact midnight active item
- exact item boundary
- inside item offset
- after last scheduled item
- previous-day wrapped offset before first item
- Friday override
- invalid schedule shape
- Quran page duration offset
- Quran page range auto-continue wrapping
- lowest RTT time sync sample
- simulated 24-hour monotonic no-drift calculation
- resync interval decision

## Phase 4 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 4 commit: `b5f3689`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 4 push without rewriting published history.

## Phase 5 Summary

Status: completed

Goal:

- Add visible `/channel` route.
- Display active schedule state.
- Emit runtime heartbeat every 5 seconds.
- Add placeholder renderers for major content types.

What changed:

- Added `client/src/channel/logger.ts`.
- Added `client/src/channel/runtimeStore.ts`.
- Added `client/src/channel/renderers/ChannelRuntime.tsx`.
- Added placeholder renderers:
  - `QuranRenderer.tsx`
  - `BreakRenderer.tsx`
  - `AnnouncementRenderer.tsx`
  - `VideoBridgeRenderer.tsx`
  - `LiveStreamBridgeRenderer.tsx`
- Wired `/channel` in `client/src/App.tsx`.
- Added fullscreen channel runtime CSS.

Reference used from `livestreamquran-reference`:

- Preserved the idea of a fullscreen runtime separate from admin/player controls.
- Preserved page/item metadata display direction, but not the old renderer.

What was intentionally not reused:

- Old Quran visual renderer, reserved for Phase 6 integration.
- Old audio hook, reserved for scheduled Quran playback work.
- Old controls panel.

## Phase 5 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 backend Node tests passed and 13 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /channel` returned 200 and contained `<title>Quran24</title>`.
  - `GET /api/channel/schedule` returned 200.
  - `GET /api/health` returned 200.

Notes:

- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so smoke tests use `PORT=3837`.
- In-app Browser automation was requested through tool discovery after the frontend change, but no browser control tool was exposed in this thread. Server-level smoke was used instead.

## Phase 5 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 5 commit: `7d991cc`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 5 push without rewriting published history.

## Phase 6 Summary

Status: completed

Goal:

- Integrate real Quran page rendering under schedule control.
- Respect `reciterId`, `fromPage`, `toPage`, and schedule offset.
- Preload only current and next page assets.
- Keep visual playback running if audio is missing.

What changed:

- Seeded pages 1-20 from `livestreamquran-reference/data/hafs`.
- Added `data/manifest.json` for pages 1-20.
- Updated `.gitignore` to allow committed seeded Hafs assets under `data/assets/hafs`.
- Added `client/src/channel/hooks/useQuranSchedulePlayback.ts`.
- Replaced the Quran placeholder with image rendering and audio alignment in `QuranRenderer.tsx`.
- Updated `ChannelRuntime.tsx` to fetch manifest data and include current page in runtime snapshots/heartbeats.
- Updated server JSON parsing to strip UTF-8 BOMs from generated JSON files.

Reference used from `livestreamquran-reference`:

- Reused page images and per-page JSON for pages 1-20.
- Reused manifest page duration metadata for pages 1-20.
- Reused the current/next preload idea from the old Quran renderer.
- Reused the page-based audio path convention, adapted to `/assets/reciters/ajmy/PageNNN.mp3`.

What was intentionally not reused:

- Full 123 MB Hafs asset set.
- Old renderer code as a direct copy.
- Old audio hook as-is.
- Any MP3 audio, because it is absent from the reference clone.

## Phase 6 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 backend Node tests passed and 13 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /api/manifest` returned 200 with 20 pages.
  - first manifest page is page 1.
  - `GET /assets/hafs/001.webp` returned 200 with `image/webp`.
  - `GET /channel` returned 200 and contained `<title>Quran24</title>`.

Notes:

- In-app Browser automation remains unavailable in this thread after tool discovery, so visual verification is limited to server smoke checks.
- Audio files are still missing locally; visual Quran rendering is implemented and audio is best-effort until reciter assets are provided.

## Phase 6 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 6 commit: `46f3e27`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 6 push without rewriting published history.

## Phase 7 Summary

Status: completed

Goal:

- Add break and announcement runtime behavior.
- Support slide transitions and optional break audio.
- Add basic spiritual filler sample data.

What changed:

- Added `client/src/channel/hooks/useOptionalAudio.ts`.
- Upgraded `BreakRenderer.tsx`:
  - schedule-offset slide selection
  - progress bar
  - remaining time
  - graceful optional audio failure
- Upgraded `AnnouncementRenderer.tsx`:
  - progress bar
  - remaining time
- Seeded break slide assets:
  - `data/assets/slides/dua-1.jpeg`
  - `data/assets/slides/dua-2.jpeg`
- Published seed schedule version 3 with break slide paths.
- Added schedule history file `schedule-v3-2026-06-06T06-00-00-000Z.json`.

Reference used from `livestreamquran-reference`:

- Reused two reference slideshow images as break filler assets.
- Reused the idea of scheduled visual fillers from the old slideshow system.

What was intentionally not reused:

- Old top-window slideshow implementation as-is.
- Any audio file, because optional break audio is absent locally.
- Renderer-controlled item transitions; schedule remains authoritative.

## Phase 7 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 backend Node tests passed and 13 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /api/channel/schedule` returned 200 with version 3.
  - `break-dua-001` points to `/assets/slides/dua-1.jpeg`.
  - `GET /assets/slides/dua-1.jpeg` returned 200 with `image/jpeg`.
  - `GET /channel` returned 200 and contained `<title>Quran24</title>`.

Notes:

- Optional audio intentionally reports a non-fatal error/missing state until audio assets are provided.

## Phase 7 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 7 commit: `dfa3165`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 7 push without rewriting published history.

## Phase 8 Summary

Status: completed

Goal:

- Add browser-side Android bridge events for video and live stream schedule items.
- Keep the web runtime as the local renderer and delegate future MP4/HLS playback to Android.
- Accept basic native-to-web runtime commands.
- Keep bridge behavior testable before the Android shell exists.

What changed:

- Added `client/src/channel/bridge/androidBridge.ts`.
- Added bridge event tests in `client/src/channel/bridge/androidBridge.test.ts`.
- Updated heartbeats to emit through the Android bridge when present.
- Updated video items to emit `PLAY_VIDEO` bridge events with item id, source, title, and initial offset.
- Updated live stream items to emit `PLAY_LIVE_STREAM` bridge events with item id, source, and title.
- Added native command subscription in `ChannelRuntime`.
- Added `RELOAD_SCHEDULE` command handling.
- Added last-command diagnostics to `/channel`.
- Updated `/api/channel/status` to report Phase 8 bridge and heartbeat readiness.
- Updated README and architecture docs with the bridge contract.

Reference used from `livestreamquran-reference`:

- Preserved the separation between browser visual runtime and external playback/control surfaces.
- Preserved the route/API compatibility direction while moving video/HLS responsibility toward Android.

What was intentionally not reused:

- Browser-owned MP4/HLS playback as the production Android strategy.
- Encoded whole-Quran video output.
- Any Android native code before the Android TV phases.

## Phase 8 Verification

Result: passed.

Commands run:

```powershell
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git pull --ff-only`: already up to date before Phase 8 edits continued.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 8 backend Node tests passed and 17 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /api/health` returned `service: quran24-channel`.
  - `GET /api/channel/status` returned `phase: 8`, `androidBridge: true`, and `heartbeat: every-5-sec`.
  - `GET /api/channel/schedule` returned schedule version 3.
  - `GET /channel` returned HTML containing `<title>Quran24</title>`.

Notes:

- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.
- The first `/channel` HTML smoke used PowerShell `Invoke-WebRequest`, which hit a local `NullReferenceException`; the final HTML smoke passed with `curl.exe`.

## Phase 8 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 8 commit: `dfe3276`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 8 push without rewriting published history.

## Phase 9 Summary

Status: completed

Goal:

- Add a usable admin dashboard shape.
- Allow schedule editing without hand-editing JSON.
- Use the backend validator for schedule validation.
- Keep draft and publish writes protected by admin token.

What changed:

- Added `client/src/admin/AdminDashboard.tsx`.
- Added `client/src/admin/scheduleEditorUtils.ts`.
- Added `client/src/admin/scheduleEditorUtils.test.ts`.
- Replaced the old diagnostics-only `/admin` view with sections:
  - General
  - Readers
  - Channel Schedule
  - Media Library
  - Diagnostics
- Added schedule editor controls for:
  - Quran items
  - Break items
  - Announcement items
  - Video items
  - Live stream items
- Added backend validation endpoint:
  - `POST /api/channel/schedule/validate`
- Updated token-protected schedule PATCH flow to bump schedule version on admin saves.
- Updated `/api/channel/status` to report Phase 9.
- Updated README, project map, and architecture notes.

Reference used from `livestreamquran-reference`:

- Preserved the idea of an admin surface for operators.
- Preserved compatibility route conventions while making schedule publishing the center of the admin workflow.

What was intentionally not reused:

- The old Bootstrap admin information architecture.
- Arbitrary filesystem path editing.
- Unauthenticated admin write behavior.

## Phase 9 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; $env:ADMIN_TOKEN = "phase9-token"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 9 start.
- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 10 backend Node tests passed and 20 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /api/channel/status` returned `phase: 9`.
  - `POST /api/channel/schedule/validate` accepted the current schedule.
  - `POST /api/channel/schedule/validate` rejected an invalid page range.
  - Token-protected invalid `PATCH /api/channel/schedule` returned 400.
  - `GET /admin?section=schedule` returned HTML containing `<title>Quran24</title>`.
  - `GET /channel` returned HTML containing `<title>Quran24</title>`.

Notes:

- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.
- In-app Browser visual verification was not available after tool discovery; server-level smoke was used.

## Phase 9 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 9 commit: `add4469`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 9 push without rewriting published history.

## Phase 10 Summary

Status: completed

Goal:

- Add safe reciter management.
- Add media library indexing and scan APIs.
- Show reciter and media state in the admin dashboard.
- Report missing local assets clearly.

What changed:

- Added `server/channel/reciterStore.mjs`.
- Added `server/channel/mediaScanner.mjs`.
- Added `data/channel/reciters.json`.
- Added generated `data/channel/media-index.json`.
- Added APIs:
  - `GET /api/reciters`
  - `PATCH /api/reciters`
  - `GET /api/media/library`
  - `POST /api/media/scan`
- Added static serving for `/assets/reciters/*` from `data/reciters`.
- Updated `/api/channel/status` to report Phase 10.
- Updated admin Readers and Media Library panels to use live APIs.
- Added backend tests for scanner counts, safe asset references, and reciter validation.
- Updated README, project map, and architecture notes.

Reference used from `livestreamquran-reference`:

- Reused the reciter metadata shape:
  - `audioRootDir`
  - `activeReciterId`
  - `reciters[]` with `id`, `name`, `folderName`, and `audioDir`
- Reused the idea of scanning reciter audio folders.

What was intentionally not reused:

- Arbitrary path editing for audio roots.
- Unauthenticated reciter write APIs.
- Old reciter activation side effects that directly rewrote runtime config.

## Phase 10 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run build
npm run test
npm run lint
$env:PORT = "3837"; $env:ADMIN_TOKEN = "phase10-token"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 10 start.
- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 15 backend Node tests passed and 20 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Server smoke on port 3837:
  - `GET /api/channel/status` returned `phase: 10`.
  - `GET /api/reciters` returned active reciter `ajmy` and 2 configured reciters.
  - Protected `POST /api/media/scan` returned 20 Quran page images and 21 missing files.
  - `GET /api/media/library` returned the generated media index.
  - Invalid `PATCH /api/reciters` returned 400.
  - `GET /admin?section=readers` returned HTML containing `<title>Quran24</title>`.
  - `GET /admin?section=media` returned HTML containing `<title>Quran24</title>`.

Notes:

- The 21 missing files are expected in this local clone: 20 reciter MP3 files referenced by the seeded manifest plus one optional break audio file.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.
- In-app Browser visual verification was not available after tool discovery; server-level smoke was used.

## Phase 10 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 10 commit: `b7bd729`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 10 push without rewriting published history.

## Phase 11 Summary

Status: completed

Goal:

- Add the first native Android TV project foundation.
- Load the web `/channel` runtime fullscreen inside WebView.
- Configure Android TV launcher metadata and TV-safe manifest features.
- Add native URL settings and recovery UI.
- Verify the APK in Android Studio's Android TV emulator.

What changed:

- Added `android-tv/` Gradle project with wrapper files.
- Added `.gitattributes` to keep `gradlew` executable-friendly across platforms.
- Added Android application module `com.quran24.tv`.
- Added `MainActivity` fullscreen WebView shell.
- Added `HiddenSettingsActivity` for channel URL configuration.
- Added `ChannelPreferences` shared-preference storage.
- Added Android TV manifest configuration:
  - Leanback launcher category
  - TV banner/icon resources
  - `android.software.leanback`
  - no required touchscreen/faketouch
  - internet and network state permissions
  - local cleartext network security config for development channel URLs
- Added WebView recovery handling for:
  - main-frame load errors
  - HTTP errors
  - SSL errors
  - renderer process exits
- Added hidden settings access through Menu/Settings and long press OK/DPAD_CENTER.
- Updated `/api/channel/status` to report Phase 11 and `androidTvShell: true`.
- Updated README and docs for Android TV build and smoke instructions.

Reference used from `livestreamquran-reference`:

- Preserved the browser-rendered channel model.
- Preserved the default local server port convention.
- Preserved the idea that Quran rendering remains page images plus audio, not encoded video.

What was intentionally not reused:

- No Android work was done inside the reference repository.
- No whole-Quran HLS/video conversion was introduced.
- No native Media3 playback was added yet; this starts in Phase 13 after watchdog/bridge ingestion.
- No production offline cache was added yet; this starts in Phase 14.

## Phase 11 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- Android build passed with Android Gradle Plugin 9.2.0, Gradle 9.4.1, JDK 17, compile SDK 36, and target SDK 36.
- Android lint passed for the debug variant.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 16 backend Node tests and 20 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- `GET /api/channel/status` returned `phase: 11` and `runtime.androidTvShell: true`.
- Android Studio TV emulator smoke:
  - device: `emulator-5554`
  - `adb reverse tcp:3737 tcp:3837` mapped the app's local channel URL to the Quran24 server on port 3837.
  - `MainActivity` loaded `http://127.0.0.1:3737/channel`.
  - `/channel` rendered fullscreen in WebView.
  - long press OK/DPAD_CENTER opened `HiddenSettingsActivity`.
  - settings screen showed a visible D-pad focus state.
  - final smoke log contained no `FATAL EXCEPTION`.

Notes:

- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837` plus `adb reverse`.
- The Android TV launcher on the emulator reserves `KEYCODE_MENU` for system behavior, so Phase 11 supports long press OK/DPAD_CENTER as the reliable hidden settings shortcut.
- A local security tool such as Kaspersky may flag development actions like Gradle wrapper execution, APK install, `adb reverse`, hidden Node server processes, or emulator/device communication. Phase 11 did not add destructive commands or system-level persistence.

## Phase 11 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 11 commit: `1e5bab9`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 11 push without rewriting published history.

## Phase 12 Summary

Status: completed

Goal:

- Add Android-side bridge ingestion for web runtime events.
- Track WebView heartbeat health natively.
- Reload WebView when heartbeat stalls.
- Keep video/HLS playback ownership deferred to the Media3 phase.

What changed:

- Added JavaScript interfaces named `Quran24Android` and `AndroidBridge` in `MainActivity`.
- Added native parsing for bridge event types:
  - `HEARTBEAT`
  - `PLAY_VIDEO`
  - `PLAY_LIVE_STREAM`
  - `REQUEST_RELOAD`
  - `RUNTIME_ERROR`
- Added heartbeat state tracking in Android.
- Added WebView watchdog checks every 5 seconds.
- Added WebView reload on heartbeat stall.
- Added native recovery fallback after repeated watchdog reload attempts.
- Added native command sender for `window.quran24ReceiveCommand(...)`.
- Updated `/api/channel/status` to report Phase 12, `androidBridgeReceiver: true`, and `androidWatchdog: true`.
- Updated admin diagnostics to display Android bridge receiver and watchdog readiness.
- Updated Android TV docs and architecture notes.

What was intentionally not added:

- No Media3/ExoPlayer playback yet.
- No native MP4/HLS surface yet.
- No offline cache yet.
- No change to Quran rendering as page images plus audio.

## Phase 12 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 12 start.
- `git pull --ff-only`: already up to date.
- Android build passed.
- Android lint passed.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 16 backend Node tests and 20 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- `GET /api/channel/status` returned `phase: 12`, `runtime.androidBridgeReceiver: true`, and `runtime.androidWatchdog: true`.
- Android Studio TV emulator smoke:
  - device: `emulator-5554`
  - `adb reverse tcp:3737 tcp:3837` mapped the app's local channel URL to the Quran24 server on port 3837.
  - `/channel` rendered fullscreen in WebView.
  - logcat showed `Quran24TV` heartbeat messages.
  - logcat showed `PLAY_LIVE_STREAM` for `live-taraweeh-placeholder`.
  - final smoke log contained no `FATAL EXCEPTION`.
  - screenshot showed the web runtime detected Android bridge availability and rendered "Sent to Android native player".

Notes:

- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837` plus `adb reverse`.
- Phase 12 observes video/live-stream requests but does not play them natively; Media3 ownership begins in Phase 13.

## Phase 12 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 12 commit: `55d8e61`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 12 push without rewriting published history.

## Phase 13 Summary

Status: completed

Goal:

- Add native Media3/ExoPlayer playback for scheduled video items.
- Add native Media3/ExoPlayer HLS playback for live stream items.
- Keep Quran rendering as local page images plus audio.
- Return playback lifecycle results to the web runtime.

What changed:

- Added Media3 `1.10.1` dependencies:
  - `androidx.media3:media3-exoplayer`
  - `androidx.media3:media3-exoplayer-hls`
  - `androidx.media3:media3-ui`
- Added fullscreen native `PlayerView` overlay in `MainActivity`.
- `PLAY_VIDEO` bridge events now start native Media3 playback.
- `PLAY_LIVE_STREAM` bridge events now start native Media3 HLS playback.
- HLS sources are marked with `MimeTypes.APPLICATION_M3U8`.
- Video item offsets seek the native player to the scheduled offset.
- Back stops native playback and returns to WebView.
- Player errors send `VIDEO_FAILED` and `RESUME_CHANNEL` to the web runtime.
- Player end sends `VIDEO_FINISHED` and returns to the web runtime.
- Updated `/api/channel/status` to report Phase 13, `nativeMedia3Playback: true`, and `nativeHlsPlayback: true`.
- Updated admin diagnostics and docs.

What was intentionally not added:

- No whole-Quran HLS conversion.
- No offline cache yet.
- No production Taraweeh HLS source; the current schedule still uses a placeholder URL.

## Phase 13 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
npm run build
npm run test
npm run lint
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 13 start.
- `git pull --ff-only`: already up to date.
- Media3 dependency version checked against official Android Developers Media3 release notes: stable `1.10.1`.
- Android build passed.
- Android lint passed after avoiding an unnecessary unstable `PlayerView` API.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 16 backend Node tests and 20 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- `GET /api/channel/status` returned `phase: 13`, `runtime.nativeMedia3Playback: true`, and `runtime.nativeHlsPlayback: true`.
- Android Studio TV emulator smoke:
  - device: `emulator-5554`
  - `adb reverse tcp:3737 tcp:3837` mapped the app's local channel URL to the Quran24 server on port 3837.
  - `/channel` rendered fullscreen in WebView.
  - Web runtime detected the Android bridge and sent the live stream item to native playback.
  - Media3 attempted the placeholder HLS URL.
  - Media3 failed safely with a source/certificate error for `https://example.com/live/taraweeh.m3u8`.
  - Android released the native player and returned to WebView.
  - WebView heartbeat continued after native playback failure.
  - final smoke log contained no `FATAL EXCEPTION`.

Notes:

- The placeholder `example.com` HLS URL is not expected to play. Phase 13 verifies native player ownership and failure recovery. Real stream verification requires a valid HLS source.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837` plus `adb reverse`.

## Phase 13 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 13 commit: `38ec257`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 13 push without rewriting published history.

## Phase 14 Summary

Status: completed

Goal:

- Add first-pass offline resilience.
- Keep the channel from going black when server APIs are temporarily unavailable after a prior successful load.
- Add WebView cache fallback before native recovery.
- Add web runtime cached schedule, cached manifest, and local clock fallback.

What changed:

- Added `client/src/channel/offlineCache.ts`.
- Added offline cache tests.
- `useChannelSchedule` now saves last-good schedule responses and uses them when `/api/channel/schedule` fails.
- `ChannelRuntime` now saves last-good Quran manifest responses and uses them when `/api/manifest` fails.
- `useChannelClock` now falls back to local device time when `/api/health` time sync fails.
- Channel diagnostics now show clock source and schedule source.
- Android WebView now tries `LOAD_CACHE_ELSE_NETWORK` once for main-frame load, HTTP, and SSL failures before native recovery.
- Server fallback HTML now sets a short `Cache-Control` header to support WebView cache recovery.
- Updated `/api/channel/status` to report Phase 14, `webOfflineCache: true`, and `androidWebViewCacheFallback: true`.
- Updated admin diagnostics and docs.

What was intentionally not added:

- No full local Quran asset packaging yet.
- No reciter audio sync/download manager yet.
- No production asset eviction policy yet.
- No telemetry upload queue yet; Phase 15 starts telemetry.

## Phase 14 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run build
npm run test
npm run lint
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 14 start.
- `git pull --ff-only`: already up to date.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run test`: 16 backend Node tests and 22 client Vitest tests passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Android build passed.
- Android lint passed.
- `GET /api/channel/status` returned `phase: 14`, `runtime.webOfflineCache: true`, and `runtime.androidWebViewCacheFallback: true`.
- Android Studio TV emulator offline smoke:
  - device: `emulator-5554`
  - first launch used `PORT=3837` plus `adb reverse tcp:3737 tcp:3837` to seed WebView and web localStorage caches.
  - the server on port 3837 was stopped.
  - the app was force-stopped and relaunched with the same channel URL.
  - WebView loaded cached channel assets.
  - web runtime used cached schedule and local clock fallback.
  - screenshot showed `Clock Source local`.
  - active item remained `live-taraweeh-placeholder`.
  - logcat showed Media3 native playback still received the cached live-stream item.
  - final smoke log contained no `FATAL EXCEPTION`.

Notes:

- Offline behavior currently depends on at least one prior successful online load.
- Placeholder HLS still fails safely because `https://example.com/live/taraweeh.m3u8` is not a valid production stream.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837` plus `adb reverse`.

## Phase 14 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 14 commit: `3ff1e0c`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 14 push without rewriting published history.

## Phase 15 Summary

Status: completed

Goal:

- Add first-pass runtime telemetry and remote device status.
- Let admin diagnostics see whether a channel runtime is online or stale.
- Keep telemetry bounded and file-backed for local/LAN deployments.

What changed:

- Added `server/channel/telemetryStore.mjs`.
- Added `POST /api/telemetry/heartbeat`.
- Added `GET /api/telemetry/devices`.
- Added ignored local telemetry file path `data/channel/telemetry.json`.
- Updated `/api/channel/status` to report Phase 15, `telemetryHeartbeatApi: true`, and `remoteDeviceStatus: true`.
- Added `client/src/channel/telemetry.ts` for stable runtime device ids and compact heartbeat upload.
- `ChannelRuntime` now posts remote telemetry every 15 seconds while keeping Android/local heartbeat every 5 seconds.
- Admin diagnostics now polls telemetry and shows online/stale devices.
- Added backend telemetry store tests and client telemetry tests.
- Updated README, project map, architecture review, and Android TV docs.

What was intentionally not added:

- No database-backed fleet history yet.
- No signed device enrollment yet.
- No Android-native direct telemetry uploader yet; the current uploader runs inside the WebView runtime.
- No alerting/notification pipeline yet.

## Phase 15 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run test
npm run build
npm run lint
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 15 start.
- `git pull --ff-only`: already up to date.
- `npm run test`: 18 backend Node tests and 24 client Vitest tests passed.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Android build passed.
- Android lint passed.
- API smoke on `PORT=3837` returned:
  - `GET /api/health`: `ok: true`
  - `GET /api/channel/status`: `phase: 15`, `runtime.telemetryHeartbeatApi: true`, `runtime.remoteDeviceStatus: true`
  - `POST /api/telemetry/heartbeat`: `ok: true`
  - `GET /api/telemetry/devices`: `totalDevices: 1`, `onlineDevices: 1`, `firstDevice: phase15-smoke-tv`
- The temporary server was stopped after smoke.
- `Get-NetTCPConnection -LocalPort 3837 -State Listen` returned no listener after smoke.

Notes:

- `data/channel/telemetry.json` is generated at runtime, ignored by Git, and was removed after the smoke test to avoid leaving a stale test device in local admin diagnostics.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.

## Phase 15 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 15 commit: `ff66a4a`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 15 push without rewriting published history.

## Phase 16 Summary

Status: completed

Goal:

- Harden the web runtime for long-running Android TV operation.
- Report runtime errors before Android only sees heartbeat silence.
- Ask native Android to reload when the web runtime is stuck in loading.

What changed:

- Added `client/src/channel/runtimeStability.ts`.
- Added global web runtime `error` and `unhandledrejection` reporting.
- Added bounded duplicate error/reload cooldowns.
- Added `client/src/channel/renderers/ChannelErrorBoundary.tsx`.
- Wrapped `/channel` in the error boundary.
- Added a loading-stall watchdog inside `ChannelRuntime`.
- Runtime errors now emit `RUNTIME_ERROR` bridge events.
- Loading stalls and error boundaries emit `REQUEST_RELOAD` bridge events.
- Updated `/api/channel/status` to report Phase 16, `webRuntimeErrorReporter: true`, `webRuntimeErrorBoundary: true`, `webRuntimeStallWatchdog: true`, and `boundedTelemetryRetention: true`.
- Updated admin diagnostics and docs.
- Added client tests for runtime stability behavior.

What was intentionally not added:

- No persisted crash counter yet.
- No remote alerting or notification pipeline yet.
- No Android-native crash upload pipeline yet.
- No supervised asset-sync watchdog yet.

## Phase 16 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run test
npm run build
npm run lint
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 16 start.
- `git pull --ff-only`: already up to date.
- `npm run test`: 18 backend Node tests and 28 client Vitest tests passed.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Android build passed.
- Android lint passed.
- API smoke on `PORT=3837` returned:
  - `GET /api/health`: `ok: true`
  - `GET /api/channel/status`: `phase: 16`
  - `runtime.webRuntimeErrorReporter: true`
  - `runtime.webRuntimeErrorBoundary: true`
  - `runtime.webRuntimeStallWatchdog: true`
  - `runtime.boundedTelemetryRetention: true`
- The temporary server was stopped after smoke.
- `Get-NetTCPConnection -LocalPort 3837 -State Listen` returned no listener after smoke.

Notes:

- Phase 16 complements the Android native heartbeat watchdog; it does not replace it.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.

## Phase 16 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 16 commit: `cace903`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 16 push without rewriting published history.

## Phase 17 Summary

Status: completed

Goal:

- Add religious scheduling enhancements after runtime stability.
- Make Friday/Jumuah and Taraweeh readiness visible in admin diagnostics.
- Keep the implementation independent from external prayer-time or Hijri calendar assumptions.

What changed:

- Added `server/channel/religiousSchedule.mjs`.
- Added `GET /api/channel/religious-schedule`.
- Updated `/api/channel/status` to report Phase 17 and religious schedule flags:
  - `religiousScheduleInsights: true`
  - `fridayOverrideAwareness: true`
  - `taraweehReadiness: true`
  - `spiritualFillerInventory: true`
- Added optional `religious` schedule metadata type.
- Updated schedule validation to accept optional religious metadata and warn on missing item-id references.
- Updated `data/channel/schedule.json` to version 4.
- Added Friday override programming using the already seeded Quran pages and break slides.
- Added Friday reminder, Friday dua break, Taraweeh readiness metadata, and spiritual filler metadata.
- Updated admin diagnostics to show Friday override, Taraweeh readiness, spiritual filler count, Quran coverage, and schedule recommendations.
- Added backend tests for religious schedule insights and metadata validation.
- Updated README, project map, architecture review, and Android TV docs.

What was intentionally not added:

- No external prayer-time API integration.
- No Hijri date conversion or Ramadan date authority yet.
- No location-specific calculation method.
- No automatic replacement of the full day schedule from prayer times.

## Phase 17 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run test
npm run build
npm run lint
node -e "<schedule checksum verification>"
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
$env:PORT = "3837"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 17 start.
- `git pull --ff-only`: already up to date.
- `npm run test`: 20 backend Node tests and 28 client Vitest tests passed.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Schedule checksum verification passed:
  - version: `4`
  - `checksumMatches: true`
  - Friday item count: `4`
- Android build passed.
- Android lint passed.
- API smoke on `PORT=3837` returned:
  - `GET /api/health`: `ok: true`
  - `GET /api/channel/status`: `phase: 17`, `runtime.religiousScheduleInsights: true`
  - `GET /api/channel/religious-schedule`: `fridayScheduleConfigured: true`
  - `taraweehLiveStreamConfigured: true`
  - `spiritualFillerCount: 4`
  - `quranPageSpan.coveredPages: 20`
  - recommendations count: `0`
- The temporary server was stopped after smoke.
- `Get-NetTCPConnection -LocalPort 3837 -State Listen` returned no listener after smoke.

Notes:

- Religious insights are readiness diagnostics, not authoritative prayer-time scheduling.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.

## Phase 17 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 17 commit: `e331eb2`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 17 push without rewriting published history.

## Phase 18 Summary

Status: completed

Goal:

- Close remaining compatibility gaps from the original command.
- Add channel telemetry/device API aliases.
- Add protected remote reload command delivery.
- Add Android WebViewAssetLoader local fallback.
- Add soak test documentation.

What changed:

- Added `POST /api/channel/telemetry` as an alias for runtime heartbeat upload.
- Added `GET /api/channel/devices` as an alias for device diagnostics.
- Added protected `POST /api/channel/reload-device`.
- Extended telemetry storage with bounded pending command queues.
- Telemetry heartbeat responses now deliver queued reload commands.
- Web runtime consumes queued reload commands and emits `REQUEST_RELOAD`.
- Updated `/api/channel/status` to report Phase 18 and flags:
  - `channelTelemetryAlias: true`
  - `channelDevicesAlias: true`
  - `remoteReloadCommand: true`
  - `webViewAssetLoader: true`
  - `bundledFallbackScreen: true`
- Added Android WebViewAssetLoader in `MainActivity`.
- Added bundled fallback HTML at `android-tv/app/src/main/assets/fallback.html`.
- Main-frame load, HTTP, and SSL failures now try WebView cache first, bundled fallback second, and native recovery third.
- Added `docs/TEST_PLAN.md`.
- Added `docs/SOAK_TEST_RESULTS.md`.
- Updated README, project map, architecture review, Android TV docs, tests, and admin diagnostics.

What was intentionally not added:

- No completed one-hour or six-hour unattended soak in this session.
- No target-hardware production soak yet.
- No native Android telemetry uploader with WebView package/version fields yet.
- No full local Quran/reciter asset bundle yet.

## Phase 18 Verification

Result: passed.

Commands run:

```powershell
git status --short --branch
git pull --ff-only
npm run test
npm run build
npm run lint
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
cd ..
$env:PORT = "3837"; $env:ADMIN_TOKEN = "phase18-smoke-token"; node server/index.mjs
```

Observed results:

- `git status --short --branch`: clean at Phase 18 start.
- `git pull --ff-only`: already up to date.
- `npm run test`: 21 backend Node tests and 28 client Vitest tests passed.
- `npm run build`: TypeScript type-check and Vite production build passed.
- `npm run lint`: server syntax check and client ESLint passed.
- Android build passed.
- Android lint passed.
- API smoke on `PORT=3837` with a temporary `ADMIN_TOKEN` returned:
  - `GET /api/health`: `ok: true`
  - `GET /api/channel/status`: `phase: 18`
  - `runtime.channelTelemetryAlias: true`
  - `runtime.channelDevicesAlias: true`
  - `runtime.remoteReloadCommand: true`
  - `runtime.webViewAssetLoader: true`
  - `runtime.bundledFallbackScreen: true`
  - `POST /api/channel/telemetry`: `ok: true`
  - `POST /api/channel/reload-device`: `ok: true`
  - next `POST /api/channel/telemetry` delivered `1` command
  - `GET /api/channel/devices`: `pendingCommandCount: 0`
- The temporary server was stopped after smoke.
- `Get-NetTCPConnection -LocalPort 3837 -State Listen` returned no listener after smoke.
- `data/channel/telemetry.json` was removed after smoke because it is generated local runtime state.

Notes:

- `docs/SOAK_TEST_RESULTS.md` records that full unattended soak tests are still required before production deployment.
- Port 3737 remains occupied by a pre-existing old Quran Broadcast server in this environment, so Quran24 smoke tests continue to use `PORT=3837`.

## Phase 18 Git Update

- Branch: `feature/channel-runtime-platform`
- Primary Phase 18 commit: `023fbe6`
- Pushed: yes, to `origin/feature/channel-runtime-platform`
- Note: this status update is recorded after the initial Phase 18 push without rewriting published history.
