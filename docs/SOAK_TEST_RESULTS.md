# Quran24 Soak Test Results

## Current Status

No full one-hour, six-hour, or twenty-four-hour unattended soak has been completed in this Codex session.

## Completed Smoke Coverage

- Web/client build, lint, and tests pass through Phase 18.
- Android `assembleDebug` and `lintDebug` pass with JDK 17.
- Android Studio TV emulator smoke previously verified:
  - fullscreen WebView shell
  - hidden settings via long press OK
  - Android bridge heartbeat reception
  - native Media3 placeholder HLS failure returns to WebView
  - offline relaunch after cache seed avoids a black screen
- Phase 18 adds a bundled WebViewAssetLoader fallback screen for main-frame load, HTTP, and SSL failures after cache fallback is attempted.

## Latest Phase 18 Smoke

Environment:

- Workspace: `D:\2025 apps\quran24`
- Branch: `feature/channel-runtime-platform`
- Server smoke port: `3837`
- Note: port `3737` is occupied by a pre-existing old Quran Broadcast server in this environment.

Observed:

- `GET /api/channel/status` reports Phase 18 capability flags.
- `GET /api/channel/religious-schedule` reports Friday and Taraweeh readiness.
- `POST /api/channel/telemetry` accepts heartbeat payloads.
- `GET /api/channel/devices` reports device status.
- `POST /api/channel/reload-device` is protected by admin token middleware.

## Required Before Production

Run and record:

- one-hour development soak
- six-hour stability soak on the intended Android TV hardware
- twenty-four-hour production simulation or an explicit written waiver for demo-only use

Use `docs/TEST_PLAN.md` as the checklist and append dated results below.

## Results Log

No dated full-soak entries yet.
