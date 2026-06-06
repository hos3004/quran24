# Android TV

## Phase 11 Scope

The Android TV project is a native Kotlin shell around the existing Quran24 `/channel` web runtime. It does not convert Quran playback into encoded HLS video.

Current behavior:

- Fullscreen `MainActivity` with `FLAG_KEEP_SCREEN_ON`.
- Android TV and Leanback launcher declarations.
- WebView loads the configured channel URL.
- JavaScript, DOM storage, and media playback without user gesture are enabled for the channel runtime.
- File/content WebView access is disabled.
- Main-frame load, HTTP, SSL, and renderer process failures show a native recovery screen.
- Native hidden settings screen stores the channel URL in shared preferences.
- Menu/Settings keys open settings when the device forwards them to the app.
- Long press OK/DPAD_CENTER also opens settings for TV launchers that reserve Menu for system Home behavior.
- JavaScript bridge objects `Quran24Android` and `AndroidBridge` receive web runtime events.
- Heartbeat watchdog reloads WebView after a stalled heartbeat window and falls back to native recovery after repeated stalls.
- Media3/ExoPlayer plays video and HLS bridge items in a native fullscreen `PlayerView` overlay.
- Native playback sends `VIDEO_FINISHED`, `VIDEO_FAILED`, and `RESUME_CHANNEL` commands back to the web runtime.

## Build

Use JDK 17:

```powershell
cd "D:\2025 apps\quran24\android-tv"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
.\gradlew.bat lintDebug
```

The debug APK is written to:

```text
D:\2025 apps\quran24\android-tv\app\build\outputs\apk\debug\app-debug.apk
```

## Local Emulator Smoke

The default Android emulator host URL is:

```text
http://10.0.2.2:3737/channel
```

If another local service owns port `3737`, run Quran24 on `3837` and bridge emulator port `3737` back to it:

```powershell
cd "D:\2025 apps\quran24"
$env:PORT = "3837"
npm run server

$adb = "C:\Users\gamer\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 reverse tcp:3737 tcp:3837
& $adb -s emulator-5554 install -r android-tv\app\build\outputs\apk\debug\app-debug.apk
& $adb -s emulator-5554 shell am start -n com.quran24.tv/.MainActivity -e channel_url http://127.0.0.1:3737/channel
```

Settings smoke:

```powershell
& $adb -s emulator-5554 shell input keyevent --longpress KEYCODE_DPAD_CENTER
```

Expected result:

- `/channel` renders fullscreen in WebView.
- Long press OK opens `Quran24 Settings`.
- The first settings button has a visible focus state.
- Logcat shows `Quran24TV` heartbeat messages when `/channel` is healthy.
- Media3 logs appear when video or HLS bridge events are active.

Useful logcat filter:

```powershell
& $adb -s emulator-5554 logcat -d -t 240 | Select-String -Pattern "Quran24TV|FATAL EXCEPTION|AndroidRuntime"
```

## Local Security Scanner Note

During development, security software can flag actions such as Gradle wrapper execution, APK install, `adb reverse`, hidden background Node servers, or emulator/device communication. Phase 11 does not add destructive commands or system-level persistence; it only builds and installs the debug app and runs the local Quran24 server for smoke tests.

## Next Android Phases

- Phase 12: bridge receiver and WebView heartbeat watchdog. Completed.
- Phase 13: Media3/ExoPlayer MP4 and HLS playback for video/live stream items. Completed with Media3 `1.10.1`.
- Phase 14: offline cache and local-first recovery.
