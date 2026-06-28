# P21 Validation

P21 integrates the reserved transparent Tauri `overlay` window as the primary desktop smart cursor surface for the current phase.

## Deliverables

- Native overlay show, hide, sizing, focus, z-order, and pointer-event control.
- Native `Alt+Shift+S` shortcut shows the overlay before emitting the frontend shortcut event.
- Shortcut payload includes cursor coordinates and overlay metrics.
- Overlay metrics resolve to the monitor containing the cursor, with primary-monitor fallback.
- Frontend window-role detection for browser, main Tauri window, and overlay Tauri window.
- Overlay window renders only the interaction layer; browser and main window keep the debug UI.
- Overlay hides when the smart cursor state returns to `normal`.
- Overlay logical coordinates convert to desktop physical coordinates for native capture.
- Native region capture temporarily hides the overlay and restores it afterward.
- Floating Action Menu, Permission Prompt, and Result Canvas clamp inside the overlay viewport.
- Transient overlay session state clears on return to `normal`.
- Pointer events from overlay controls are ignored by the selection input pipeline.

## Verification

Commands run on 2026-06-28:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
cd src-tauri
cargo fmt --check
cargo check
```

Result:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 23 test files and 135 tests.
- `npm.cmd run build`: passed.
- `cargo fmt --check`: passed.
- `cargo check`: passed.

## Notes

- In the managed sandbox, `npm.cmd run test` and `npm.cmd run build` required filesystem permission to write Vite temp files under `node_modules\.vite-temp`.
- P21 does not implement text-first context resolution, UI Automation selected text extraction, real vision upload, table extraction, or cross-platform native capture. Those remain covered by P22/P23 and known gaps.
