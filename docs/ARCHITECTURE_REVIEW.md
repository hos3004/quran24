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

Android dependency versions must be verified against official Android documentation before implementation.

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
