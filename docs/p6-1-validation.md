# P6.1 Validation

P6.1 adds a native Windows capture command for selected screen regions.

## Deliverables

- `capture_region` Tauri command in `src-tauri/src/lib.rs`.
- Minimal direct `windows` crate declaration with only the required Win32 feature groups.
- Windows GDI-based region copy from the desktop DC.
- Temporary BMP artifact writing under the OS temp directory.
- Frontend bridge in `src/capture/nativeCapture.ts`.
- Debug UI update for native capture file path when available.

## Design Constraint

This slice intentionally avoids adding a screenshot library or image encoding library. The native artifact is BMP instead of PNG so the implementation can use the existing Rust standard library plus Win32 APIs.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
cargo check
```

## 2026-06-14 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 7 test files and 31 tests.
- `npm.cmd run build`: passed.
- `cargo check`: passed.

## Manual Validation

- In Tauri desktop mode, perform a valid `Alt + drag`.
- The frontend creates a `ContextProtocol` object.
- The frontend invokes `capture_region`.
- The native file path appears in the Latest Context debug panel.
- The `image_ref` updates to a BMP local capture reference.

## Deferred

- PNG encoding.
- Non-Windows capture implementations.
- Native selected text, UI Automation, DOM bridge, OCR, or multimodal preprocessing.
