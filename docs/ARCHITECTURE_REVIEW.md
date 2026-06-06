# ARCHITECTURE_REVIEW

## Phase 0 Review

Quran24 should not be a direct clone of `livestreamquran`. The reference app is a useful OBS-era renderer: it proves that Quran pages can be rendered from images, scrolled against page-level audio duration, decorated with slides and frames, and controlled through a small Express API. The new product needs a different center of gravity: channel scheduling, pseudo-live clock sync, Android TV supervision, native video/HLS playback, offline resilience, and fleet diagnostics.

## Reference Strengths

- Clear page-based manifest for all 604 Quran pages.
- Page metadata includes image path, JSON path, audio path, audio duration, surah, and juz.
- Quran page rendering uses current, previous, and next page layouts rather than loading the entire Quran into the DOM.
- `contentBounds` detects the visible page text area by scanning alpha values.
- Express routes already separate page images, audio, slides, frames, config, layouts, and reciters.
- Admin UI demonstrates useful concepts for layout presets and reciter activation.
- Slideshow and frame composition prove the visual direction is practical in a browser renderer.

## Reference Weaknesses

- It is player/OBS-first, not schedule/channel-first.
- It does not model daily/weekly programming or content item types.
- It does not use server-time-based pseudo-live playback.
- Write APIs are not protected enough for a production admin surface.
- Config exposes local paths and needs stronger path safety.
- Browser audio is the only Quran playback path.
- No Android WebView watchdog, native video bridge, telemetry, or offline cache exists.
- Reciter audio assets are expected locally but are gitignored and absent from the clone.

## Rebuild Decision

Build Quran24 as a new platform in `quran24` and selectively adapt reference ideas. The first implementation should preserve compatibility routes where useful, but new behavior should flow through channel schedule APIs and `/channel`.

## Target Runtime Boundaries

- Server owns schedule storage, validation, history, media scanning, health, and telemetry.
- Web runtime owns local Quran/break/announcement rendering and active item calculation from server-synced time.
- Android owns WebView process supervision, keep-awake fullscreen behavior, crash recovery, local cache, and native Media3 playback for MP4/HLS.
- Admin owns schedule editing, publishing, validation display, media library, reciter management, and diagnostics.

## Key Design Choices

- Keep Quran as page images plus audio, not generated HLS video.
- Use manifest-driven Quran timing and page metadata.
- Use schedule item offsets to enter Quran playback mid-item.
- Use server time with multiple samples and monotonic local anchoring.
- Use native Android for video and live stream items.
- Keep at least one local fallback schedule and fallback visual state.
- Add write API protection before enabling schedule mutation.

## Phase 1 Guidance

Phase 1 foundation now includes:

- Root package scripts for `dev`, `server`, `build`, `test`, and `lint`.
- Express server on port 3737.
- Vite React client.
- Compatibility routes for `/api/config`, `/api/manifest`, `/manifest.json`, and `/api/slides`, backed by placeholders.
- A placeholder app shell served from the built client.
- `.env.example`, `.gitignore`, and README.

The old app was not imported wholesale. Later phases should pull in small proven pieces as each phase needs them.

## Phase 2 Guidance

Phase 2 now adds:

- `GET /api/health` with service name, ISO time, uptime, and package version.
- `GET /api/channel/status` with early channel diagnostics and compatibility flags.
- Structured JSON request logs from the Express server.
- `/admin` client route that shows a diagnostics placeholder.

The environment already has another server responding on port 3737, so smoke verification used `PORT=3837` for Quran24. Do not stop unrelated local processes without approval.

## Phase 3 Guidance

Phase 3 now adds:

- Shared TypeScript channel schedule types in `client/src/channel/types.ts`.
- Seed schedule in `data/channel/schedule.json`.
- Schedule history folder under `data/channel/schedule-history`.
- Backend schedule validator in `server/channel/scheduleValidator.mjs`.
- Backend schedule store in `server/channel/scheduleStore.mjs`.
- `GET /api/channel/schedule`.
- Token-protected `PATCH /api/channel/schedule`.

Write APIs refuse requests unless `ADMIN_TOKEN` is set and the request supplies the matching `x-admin-token` or bearer token. This keeps the safe default closed while still allowing local verification with a temporary token.

The validator currently checks:

- schedule object shape
- timezone
- published date
- status
- known item types
- required ids and unique ids
- valid `HH:MM:SS` starts
- duplicate starts
- page range 1-604
- `fromPage <= toPage`
- positive durations
- safe URL or `/assets/` media references
- explicit duration overlaps
- fallback item id existence

## Phase 4 Guidance

Phase 4 now adds:

- `client/src/channel/scheduler.ts`
- `client/src/channel/timeSync.ts`
- `client/src/channel/hooks/useChannelClock.ts`
- `client/src/channel/hooks/useChannelSchedule.ts`
- Vitest coverage for scheduler and time-sync behavior.

Scheduler behavior:

- A non-empty weekday block overrides `daily`.
- An empty weekday block falls back to `daily`.
- Active item selection uses local time in the schedule timezone.
- If no item has started yet today, the last item is treated as carrying over from the previous day.
- Item offsets wrap across midnight.
- Quran page offset calculation respects `fromPage`, `toPage`, page durations, and `allowAutoContinue`.

Time-sync behavior:

- Takes 3 to 7 samples.
- Chooses the lowest RTT sample.
- Uses `performance.now()` for monotonic elapsed time.
- Provides a resync decision helper for 3 to 5 minute re-anchoring.

The current hook layer is intentionally small and does not render `/channel` yet. The visible runtime starts in Phase 5.

## Phase 5 Guidance

Phase 5 now adds the visible `/channel` runtime shell:

- Fetches schedule through `useChannelSchedule`.
- Syncs server time through `useChannelClock`.
- Calculates active item and offset through the scheduler.
- Displays server time, local time, active item, offset, schedule version, and validation state.
- Emits one heartbeat immediately and every 5 seconds after that.
- Updates an in-memory runtime snapshot store.
- Uses placeholder renderers for Quran, break, announcement, video, and live stream items.

The placeholder renderers intentionally do not perform real media playback yet. Quran rendering starts in Phase 6, break/announcement rendering deepens in Phase 7, and Android video/HLS bridge behavior starts in Phase 8.

## Phase 6 Guidance

Phase 6 now adds scheduled Quran page rendering:

- Seeded pages 1-20 from the reference Hafs assets.
- Generated `data/manifest.json` for the seeded page range.
- Added `useQuranSchedulePlayback`.
- Updated `QuranRenderer` to calculate current page from schedule offset, render the page image, preload current and next images only, and attempt audio alignment.
- Updated `ChannelRuntime` to fetch the manifest and report current Quran page in heartbeat/runtime snapshots.

Audio note:

The local reference clone does not contain reciter MP3 files because those folders are gitignored. The renderer therefore treats audio as best-effort: it tries to load `/assets/reciters/{reciter}/PageNNN.mp3` paths from the manifest, reports errors, and keeps visual playback alive.

Asset note:

The full tracked Hafs reference set is about 123 MB. Phase 6 seeds only pages 1-20, matching the current schedule range, to avoid a large blind media dump. Full asset packaging belongs in the media-library/local-first phases.

## Phase 7 Guidance

Phase 7 now adds scheduled break and announcement behavior:

- Break renderer selects slides by schedule offset.
- Break renderer shows duration progress and remaining time.
- Break optional audio uses a best-effort hook and keeps visuals alive on failure.
- Announcement renderer shows message, progress, and remaining time.
- Seed schedule version 3 points `break-dua-001` to committed slide assets.

The schedule still controls item transitions. Renderers do not self-advance; they render the active item and offset provided by the scheduler.

## Phase 8 Guidance

Phase 8 now adds the browser-side Android bridge contract for video and live stream items:

- `client/src/channel/bridge/androidBridge.ts` owns serialized JSON messaging.
- Heartbeats are sent through the bridge when an Android object is present.
- Video schedule items emit `PLAY_VIDEO` once when the item/source becomes active.
- Live stream schedule items emit `PLAY_LIVE_STREAM` once when the item/source becomes active.
- The web runtime accepts `VIDEO_FINISHED`, `VIDEO_FAILED`, `RESUME_CHANNEL`, and `RELOAD_SCHEDULE` commands.
- Malformed native commands are reported as `RUNTIME_ERROR` bridge events instead of crashing the renderer.
- The browser fallback dispatches custom events so the contract can be tested before the Android shell exists.

The web runtime still does not own actual MP4/HLS playback. Android Phase 13 should consume these bridge events with Media3/ExoPlayer and then send lifecycle commands back to the web runtime.

## Phase 9 Guidance

Phase 9 now adds the first real admin dashboard shape:

- `/admin` exposes General, Readers, Channel Schedule, Media Library, and Diagnostics sections.
- `/admin?section=schedule` loads the current schedule and edits the channel model directly.
- The schedule editor supports Quran, break, announcement, video, and live stream items.
- Validation calls the backend validator through `POST /api/channel/schedule/validate`.
- Draft and publish actions use the token-protected `PATCH /api/channel/schedule`.
- Published saves bump the schedule version and continue to create immutable history snapshots.

Readers and Media Library sections are intentionally light until Phase 10 adds reciter and media scan APIs.

## Phase 10 Guidance

Phase 10 now adds safe media and reciter management:

- `server/channel/mediaScanner.mjs` scans only known project data roots.
- `server/channel/reciterStore.mjs` stores reciter metadata in `data/channel/reciters.json`.
- `GET /api/reciters` returns configured reciters.
- `PATCH /api/reciters` is admin-token protected and rejects unsafe IDs, folders, audio roots, and audio paths.
- `GET /api/media/library` returns the latest media index.
- `POST /api/media/scan` is admin-token protected and writes `data/channel/media-index.json`.
- `/assets/reciters/*` serves local reciter audio from `data/reciters` when audio packages are present.
- The admin Readers and Media Library sections are now API-backed.

The current scan correctly reports missing reciter audio and break audio instead of masking those gaps. This is desirable until Phase 14 adds local-first/offline packaging.

## Phase 11 Guidance

Phase 11 now adds the native Android TV foundation:

- Gradle Android project under `android-tv/`.
- Kotlin `MainActivity` that runs fullscreen, keeps the screen awake, and loads `/channel` in WebView.
- Android TV launcher and Leanback manifest declarations.
- WebView configuration for JavaScript, DOM storage, media playback without user gesture, disabled file/content access, and hardware-accelerated fullscreen rendering.
- Native recovery UI for main-frame load failures, HTTP errors, SSL errors, and WebView renderer process loss.
- Native hidden settings screen for changing the channel URL.
- Remote-safe settings access through Menu/Settings when available and long press OK/DPAD_CENTER when launchers reserve Menu for system behavior.
- AndroidX WebKit dependency for current WebView package checks and renderer recovery.
- `/api/channel/status` now reports Phase 11 and `runtime.androidTvShell: true`.

Dependency choices were checked against official Android documentation during the phase:

- Android Gradle Plugin 9.2.0 with compile/target SDK 36.
- Built-in Kotlin support from the Android Gradle Plugin.
- AndroidX WebKit 1.16.0.
- JDK 17 for Gradle and Android builds.

Phase 11 intentionally does not consume video/live stream bridge events natively yet. That belongs in Phase 13 with Media3/ExoPlayer after Phase 12 adds bridge ingestion and watchdog behavior.

Android Studio emulator smoke passed with:

- `adb reverse tcp:3737 tcp:3837`
- `MainActivity` launched against `http://127.0.0.1:3737/channel`
- `/channel` rendered fullscreen in WebView
- long press OK opened `HiddenSettingsActivity`
- settings screen showed visible D-pad focus
- no `FATAL EXCEPTION` in the final smoke log

## Phase 12 Guidance

Phase 12 now adds Android-side bridge ingestion and heartbeat supervision:

- `MainActivity` exposes `Quran24Android.postMessage(...)` and `AndroidBridge.postMessage(...)` to the WebView.
- Bridge messages are size-limited and parsed as JSON on the main thread.
- Android updates heartbeat state from `HEARTBEAT` events.
- Android records `PLAY_VIDEO` and `PLAY_LIVE_STREAM` events without taking native playback ownership yet.
- `REQUEST_RELOAD` events reload the WebView.
- `RUNTIME_ERROR` events are logged through Android logcat.
- A watchdog checks heartbeat freshness every 5 seconds.
- If heartbeat stalls for the configured window, Android reloads WebView.
- Repeated stalls fall back to the native recovery screen with Retry and Settings actions.
- `/api/channel/status` now reports Phase 12, `runtime.androidBridgeReceiver: true`, and `runtime.androidWatchdog: true`.

The final Android Studio emulator smoke confirmed:

- `/channel` rendered fullscreen in WebView.
- Android logcat received `HEARTBEAT` messages every 5 seconds.
- Android logcat received `PLAY_LIVE_STREAM` for the Taraweeh placeholder item.
- The web runtime detected the Android bridge and showed "Sent to Android native player".
- No `FATAL EXCEPTION` appeared in the final smoke log.

Phase 12 still intentionally leaves actual MP4/HLS rendering for Phase 13. This keeps the receiver/watchdog layer stable before Media3 introduces player lifecycle complexity.

## Phase 13 Guidance

Phase 13 now adds native Media3 playback for bridge-driven video and live stream items:

- Android dependencies use official Media3 `1.10.1` artifacts:
  - `androidx.media3:media3-exoplayer`
  - `androidx.media3:media3-exoplayer-hls`
  - `androidx.media3:media3-ui`
- `PLAY_VIDEO` and `PLAY_LIVE_STREAM` events create a fullscreen native `PlayerView` overlay above WebView.
- `ExoPlayer` receives `MediaItem` instances built from schedule item source URLs.
- HLS items and `.m3u8` sources are marked with `MimeTypes.APPLICATION_M3U8`.
- Video item offsets are mapped into initial player seek positions.
- Back closes native playback and returns focus to WebView.
- Player errors send `VIDEO_FAILED` then `RESUME_CHANNEL` back to the web runtime.
- Player end sends `VIDEO_FINISHED` then returns control to the web runtime.
- `/api/channel/status` now reports Phase 13, `runtime.nativeMedia3Playback: true`, and `runtime.nativeHlsPlayback: true`.

The Phase 13 emulator smoke used the current Taraweeh placeholder HLS URL. Media3 correctly attempted native playback, failed because the placeholder `example.com` certificate path was not valid in the emulator, released the player, returned to WebView, and kept heartbeats flowing. This is the expected result for a placeholder URL; real HLS validation should use a valid test stream or future Taraweeh source.

## Android TV Guidance

Android phases should use:

- Kotlin.
- Android TV launcher configuration.
- Fullscreen immersive mode and `FLAG_KEEP_SCREEN_ON`.
- Hardware acceleration.
- AndroidX WebKit and WebViewAssetLoader.
- `onRenderProcessGone` handling.
- JavaScript bridge with validated message parsing.
- Media3/ExoPlayer for MP4 and HLS.
- Remote/D-pad safe hidden settings and recovery UI.

Android dependency versions must be verified against official Android documentation before implementation. WebViewAssetLoader and Media3 remain upcoming work; Phase 11 keeps the surface small so the TV shell can be tested before native playback and offline caching expand it.

## Security Notes

Write APIs should default to refusing unauthenticated writes until an admin token or equivalent local-only policy is implemented. All media paths must be normalized against safe roots and reject:

- `../`
- `file://`
- absolute system paths
- Windows drive roots such as `C:\`
- control characters

## Stability Notes

Early implementation should include diagnostics hooks, even before the full Android shell exists:

- server health endpoint
- channel status endpoint
- structured logs
- client heartbeat shape
- telemetry store skeleton
- explicit cache/fallback behavior

Memory policy for Quran rendering:

- preload current and next page/audio only
- release previous media
- clear all intervals/timeouts on unmount
- avoid unbounded caches
- track audio stall and render freeze counters

## Open Questions For Later Phases

- Which reciter audio package should become the default local fallback?
- Will production assets be bundled with Android, served from LAN, or synchronized to local storage?
- What admin authentication model is preferred for LAN deployments?
- Should schedule publishing use signed checksums in Phase 3 or after telemetry exists?
- What Android minimum SDK and target SDK should be used for the first TV build?
