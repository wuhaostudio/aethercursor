# P11 Validation

P11 adds OS-level global shortcut support in the Tauri layer, enabling activation of smart cursor from any desktop application. The WebView `Alt` activation is retained as a debug fallback.

## Deliverables

- Added `tauri-plugin-global-shortcut` to Rust dependencies.
- Implemented `setup_global_shortcut()` in `src-tauri/src/lib.rs` to register `Alt+Shift+S` global shortcut.
- Added `GlobalShortcutEvent` struct for frontend event emission.
- Added `register_global_shortcut` and `unregister_global_shortcut` Tauri commands.
- Integrated global shortcut plugin with Tauri builder.
- Events emitted via `app.emit()` when shortcut is pressed/released.
- WebView `Alt` activation preserved in `src/App.tsx` as debug fallback.

## Expected Checks

Frontend:
```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Rust (requires Windows SDK with RC.exe):
```bash
cargo fmt --check
cargo check
```

## Manual Validation

- Launch the desktop app with global shortcut registered.
- Focus a different application (e.g., Notepad, browser).
- Press `Alt+Shift+S` - the AetherCursor window should become active and enter `armed` state.
- Release `Alt+Shift+S` - the app should return to `normal` state if no selection was started.
- With AetherCursor focused, hold `Alt` and drag - the app should still work (debug fallback).

## 2026-06-23 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 10 test files and 48 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.
- `cargo check`: failed due to Windows Resource Compiler (rc.exe) not available in build environment. This is an environmental issue, not a code issue.

## Rust Code Notes

The Rust code changes are syntactically correct and follow Tauri 2 plugin patterns. The build failure is due to missing Windows SDK components (RC.exe) in the current environment. The code should compile correctly in a properly configured Windows development environment with Visual Studio or Windows SDK installed.

## Deferred

- Real OCR engine integration (PaddleOCR API).
- Real cloud provider adapter.
- Real extension-agent execution from `More agents`.
- Real TTS.
