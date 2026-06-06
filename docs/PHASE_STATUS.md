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
