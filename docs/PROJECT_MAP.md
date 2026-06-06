# PROJECT_MAP

## TARGET_REPOSITORY

- Repository: `https://github.com/hos3004/quran24`
- Local path: `D:\2025 apps\quran24`
- Current state at Phase 0: empty unborn Git repository with no commits and no valid remote `main` branch.
- Active work branch for this project: `feature/channel-runtime-platform`
- Rule: all new code and documentation must be created only in this repository.

## REFERENCE_REPOSITORY

- Repository: `https://github.com/hos3004/livestreamquran`
- Local path: `D:\2025 apps\livestreamquran-reference`
- Usage: read-only engineering reference.
- Rule: do not modify the reference repository.

## TECH_STACK

Reference app:

- Web runtime: React, TypeScript, Vite.
- Backend: Express, ESM Node.js.
- Rendering model: SVG scene with clipped windows and HTML `foreignObject` for Quran page scrolling.
- Audio model: browser `HTMLAudioElement` per Quran page.
- Asset ingestion: Node script using `music-metadata` to generate `public/manifest.json`.
- Admin UI: React + Bootstrap.
- Render tooling: Puppeteer and ffmpeg-oriented scripts for video rendering.

Target Quran24 stack:

- Web runtime: React, TypeScript, Vite.
- Backend: Express with channel APIs, validation, telemetry, and schedule versioning.
- Channel model: schedule plus local rendering plus synchronized server clock.
- Android TV: Kotlin, fullscreen WebView shell for Quran visual runtime, Media3/ExoPlayer for MP4/HLS, AndroidX WebKit, WebViewAssetLoader, watchdogs, recovery UI.
- Persistence: JSON files under `data/channel` for Phase 1-10, with future migration path if required.

## SYSTEM_FLOW

Target flow:

1. Android TV app launches fullscreen.
2. WebView loads `/channel`.
3. Runtime fetches `/api/channel/schedule`.
4. Runtime samples server time multiple times and chooses the lowest RTT sample.
5. Runtime calculates the active item and exact offset.
6. Quran, break, and announcement items render locally in the web runtime.
7. Video and live stream items emit bridge events for native Android playback.
8. Web runtime emits heartbeat every 5 seconds.
9. Android watchdog reloads WebView if heartbeat stalls.
10. Cached schedule and fallback local assets prevent black screens during network failure.

## CURRENT_ENTRYPOINTS

Target repository:

- Root `package.json` exists with workspace scripts:
  - `npm run dev`
  - `npm run server`
  - `npm run build`
  - `npm run test`
  - `npm run lint`
- Express server entrypoint: `server/index.mjs`
- Vite client entrypoint: `client/src/main.tsx`
- Channel scheduler: `client/src/channel/scheduler.ts`
- Channel time sync: `client/src/channel/timeSync.ts`
- Channel hooks:
  - `client/src/channel/hooks/useChannelClock.ts`
  - `client/src/channel/hooks/useChannelSchedule.ts`
- Channel runtime shell: `client/src/channel/renderers/ChannelRuntime.tsx`
- Runtime utilities:
  - `client/src/channel/logger.ts`
  - `client/src/channel/runtimeStore.ts`
- Android/WebView bridge contract:
  - `client/src/channel/bridge/androidBridge.ts`
- Runtime renderers:
  - `client/src/channel/renderers/QuranRenderer.tsx`
  - `client/src/channel/renderers/BreakRenderer.tsx`
  - `client/src/channel/renderers/AnnouncementRenderer.tsx`
  - `client/src/channel/renderers/VideoBridgeRenderer.tsx`
  - `client/src/channel/renderers/LiveStreamBridgeRenderer.tsx`
- Production client output: `client/dist` after `npm run build`
- Current web routes are served by the client fallback.
- Current compatibility API placeholders:
  - `GET /api/health`
  - `GET /api/channel/status`
  - `GET /api/channel/schedule`
  - `PATCH /api/channel/schedule`
  - `GET /api/config`
  - `GET /api/slides`
  - `GET /api/manifest`
  - `GET /manifest.json`
- Android TV project does not exist yet; it starts in a later phase.
- In the current local environment, port 3737 is already occupied by a pre-existing old Quran Broadcast server, so Quran24 smoke verification used `PORT=3837`.

Reference repository:

- Root scripts:
  - `npm run server` starts `server/index.mjs` on port 3737.
  - `npm run client` starts Vite client on port 5173.
  - `npm run dev` starts both via `concurrently`.
  - `npm run ingest` builds `public/manifest.json`.
  - `npm run build` builds the Vite client.
- Web routes:
  - `/` renders the broadcast scene.
  - `/?mode=player` renders broadcast preview with controls.
  - `/admin` renders standalone admin.
  - legacy redirects exist for `/admin/reciters`, `/admin/player`, and `/player`.
- API routes:
  - `GET /api/config`
  - `PATCH /api/config`
  - `GET /api/layout-presets`
  - `PATCH /api/layout-presets`
  - `GET /api/reciters`
  - `PATCH /api/reciters`
  - `POST /api/reciters/scan`
  - `POST /api/reciters/activate`
  - `GET /api/slides`
  - `GET /api/manifest`

## EXISTING_ASSETS

Reference repository contains:

- `hafs/`: 604 `.webp` page images and 605 `.json` files, including `mushaf-content.json`.
- `data/hafs/`: duplicate tracked Hafs page set with 604 `.webp` files and 605 `.json` files.
- `data/slides/`: 15 `.jpeg` slide images.
- `slide/`: 15 `.jpeg` slide images.
- `data/frames/`: 1 frame image.
- `public/`: generated manifest and frame files.
- Root frame/sample files: `1.png`, `2.png`, `3.png`, `juz_1_silent.mp4`.
- `surahs_index.json` and `juzs_index.json` for page metadata.
- `reciters.json` names `maher` and `ajmy`, but `data/reciters`, `mp3`, and other heavy audio folders are gitignored and absent in the local reference clone.

## DATA_FORMATS

Reference manifest entry:

```json
{
  "page": 1,
  "imagePath": "/assets/hafs/001.webp",
  "jsonPath": "/assets/hafs/001.json",
  "audioPath": "/assets/mp3/Page001.mp3",
  "audioDuration": 29.858,
  "surah": {
    "id": 1,
    "nameArabic": "Al-Fatihah in Arabic",
    "nameSimple": "Al-Fatihah"
  },
  "juz": 1
}
```

Reference config fields:

- `reciterName`
- `startPage`
- `loopMode`
- `layoutPreset`
- `slideshowInterval`
- `slideshowTransitionDuration`
- `scrollZoomFactor`
- `pageTransitionDuration`
- visual effect fields
- `hafsDir`
- `mp3Dir`
- `slideDir`

Reference reciter file:

- `audioRootDir`
- `activeReciterId`
- `reciters[]` with `id`, `name`, `folderName`, and `audioDir`.

Target schedule data:

- Versioned channel schedule with daily and weekly blocks.
- Content item types: `quran`, `break`, `video`, `live_stream`, `announcement`, `image_slideshow`, `audio_message`.
- Required metadata: `version`, `publishedAt`, optional `publishedBy`, optional `checksum`, `status`.
- Every publish must create immutable history under `data/channel/schedule-history`.
- Current seed schedule: `data/channel/schedule.json`, version 3, status `published`.
- Current schedule history snapshots include version 2 and version 3 publishes.
- Current Quran seed manifest: `data/manifest.json`, pages 1-20.
- Current Quran seed assets: `data/assets/hafs/001-020.webp` and matching per-page JSON files.
- Current break slide seed assets: `data/assets/slides/dua-1.jpeg` and `data/assets/slides/dua-2.jpeg`.

## REUSABLE_COMPONENTS_FROM_REFERENCE

Reuse or adapt:

- Manifest shape for page image, page timing, surah, and juz metadata.
- Ingestion approach that scans Quran pages and audio duration.
- Quran page renderer idea: current/next page only, content bounds, continuous scroll based on audio progress.
- `contentBounds` alpha-scan algorithm, with bounded cache policy.
- Slideshow crossfade and Ken Burns style as a visual filler basis.
- Dynamic layout preset concept.
- Reciter data shape and activate/scan ideas, with stronger validation and no arbitrary path exposure.
- Express static asset routes, adapted to a safer local asset policy.
- Admin concepts for readers, layout, and player preview, rebuilt as channel-first admin sections.

## DO_NOT_REUSE

Do not reuse as-is:

- OBS-only assumptions as the product shell.
- Browser audio as the sole long-run production playback mechanism on Android TV.
- Unauthenticated write APIs.
- User-editable arbitrary filesystem paths without strict safe-root validation.
- Whole-Quran encoded video generation as the primary delivery model.
- Puppeteer render path as a core runtime feature.
- Admin UI information architecture that lacks schedule publishing, validation, telemetry, and device status.
- Unbounded preload behavior or timers.
- Any reference mojibake or encoding damage from terminal output; new source files should be UTF-8.

## TARGET_ARCHITECTURE

Planned structure:

```text
quran24/
  server/
    index.mjs
    channel/
      scheduleStore.mjs
      scheduleValidator.mjs
      mediaScanner.mjs
      health.mjs
      telemetryStore.mjs
  data/
    channel/
      schedule.json
      schedule-history/
      media-index.json
      devices.json
    reciters/
    assets/
  client/
    src/
      channel/
        types.ts
        scheduler.ts
        timeSync.ts
        validators.ts
        logger.ts
        runtimeStore.ts
        hooks/
        renderers/
        bridge/
      admin/
      components/
  android-tv/
  docs/
```

Architecture priorities:

1. Stable 24/7 channel behavior.
2. Deterministic schedule and server-time sync.
3. Local rendering for Quran pages.
4. Native Android playback for video/HLS.
5. Offline fallback and watchdog recovery.
6. Admin publishing with validation and history.

## KNOWN_RISKS

- Remote `quran24` has no `main` branch yet; Phase 0 starts from an unborn repository.
- Reference audio assets are gitignored and absent locally; early phases must not assume committed MP3 files.
- Android dependency versions must be checked against official Android sources before Android phases.
- WebView audio can be fragile for 24/7 use; the Phase 8 bridge defines ownership boundaries for native video/HLS but Quran audio still needs Android-phase supervision.
- Schedule validation must block path traversal and unsafe local paths from the first write API phase.
- Time sync must use `performance.now()` anchoring to avoid drift and wall-clock jumps.
- The reference app includes useful rendering code but it is not channel-first; direct copy would preserve the wrong product model.

## PHASE_PLAN

- Phase 0: audit repositories and document project map.
- Phase 1: create web and server foundation.
- Phase 2: add health, diagnostics, and compatibility endpoints.
- Phase 3: add schedule store, validation, and versioning.
- Phase 4: implement server-synced scheduler.
- Phase 5: add `/channel` runtime shell and heartbeat.
- Phase 6: implement scheduled Quran renderer.
- Phase 7: add break and announcement runtime.
- Phase 8: add Android bridge events for video/live stream.
- Phase 9: add admin schedule UI.
- Phase 10: add media library and reciter management.
- Phase 11: add Android TV WebView shell.
- Phase 12: add Android runtime bridge and WebView watchdog.
- Phase 13: add native Media3 video and HLS playback.
- Phase 14: add offline cache and local-first recovery.
- Phase 15: add telemetry, remote status, and diagnostics.
- Phase 16: document and harden long-run stability.
- Phase 17: add religious scheduling enhancements after stability.
