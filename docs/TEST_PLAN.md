# Quran24 Test Plan

## Scope

This plan covers the Android TV virtual linear channel runtime, admin dashboard, server APIs, local/offline fallback behavior, and long-run stability checks.

## Required Automated Checks

Run before every pushed phase:

```powershell
npm run test
npm run build
npm run lint
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
```

## API Smoke

Use `PORT=3837` in this workspace because port 3737 is occupied by a pre-existing old Quran Broadcast server.

Required checks:

- `GET /api/health`
- `GET /api/channel/status`
- `GET /api/channel/schedule`
- `GET /api/channel/religious-schedule`
- `GET /api/channel/devices`
- `POST /api/channel/telemetry`
- `POST /api/channel/reload-device` with `ADMIN_TOKEN` set
- `GET /api/reciters`
- `GET /api/media/library`

## Android TV Smoke

1. Start Quran24 server.
2. Install debug APK on Android Studio TV emulator.
3. Use `adb reverse tcp:3737 tcp:3837` when testing against local `PORT=3837`.
4. Launch `com.quran24.tv/.MainActivity` with `/channel` URL.
5. Confirm fullscreen WebView loads channel runtime.
6. Confirm heartbeat logs appear every 5 seconds.
7. Confirm long press OK opens hidden settings.
8. Confirm video/HLS bridge items start native Media3 playback and return to WebView on failure/end.
9. Stop server after one successful load and relaunch app.
10. Confirm cached schedule/local clock or bundled fallback prevents a black screen.

## One-Hour Development Soak

Goal: catch obvious timer, reload, and memory issues.

Record:

- start/end time
- app version/commit
- device/emulator
- server port and URL
- current item/page every 10 minutes
- Android logcat reload count
- WebView renderer crash count
- Media3 player failures
- telemetry online/stale status
- memory trend from Android Studio profiler or `adb shell dumpsys meminfo`

Pass criteria:

- no black screen
- no unbounded reload loop
- no fatal Android exception
- channel still emits heartbeat
- admin diagnostics still show current device

## Six-Hour Stability Soak

Goal: prove a normal unattended runtime window.

Record the one-hour fields plus:

- schedule boundary transitions
- clock source and schedule source changes
- telemetry pending command count
- cache fallback attempts
- user-visible recovery screens

Pass criteria:

- no manual intervention required
- no repeated crash loop
- memory does not grow without settling
- if server is interrupted and restored, runtime recovers

## Twenty-Four-Hour Production Simulation

Goal: validate TV-like 24/7 behavior before deployment.

Record:

- all six-hour fields
- daily rollover behavior
- Friday override behavior if test window includes Friday
- remote reload command result
- offline window and reconnect result
- final admin diagnostics snapshot

Pass criteria:

- no black screen
- no unbounded memory growth
- recovery is automatic
- logs are readable enough to diagnose failures
- schedule remains deterministic across day boundary

## Release Gate

Do not treat the product as deployment-ready until:

- automated checks pass
- Android smoke passes
- one-hour soak passes
- six-hour soak passes on target hardware
- twenty-four-hour plan has been executed or explicitly waived for a non-production demo
