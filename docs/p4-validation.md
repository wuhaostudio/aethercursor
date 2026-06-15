# P4 Validation

P4 connects WebView keyboard and pointer input to the cursor state machine.

## Deliverables

- `src/input/inputEvents.ts`
- `src/input/inputDebugLog.ts`
- `src/input/inputEvents.test.ts`
- `src/App.tsx` reducer integration and input debug panel.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual Validation

- Press `Alt`: cursor state becomes `armed`.
- Release `Alt`: cursor state returns to `normal`.
- Press `Esc`: cursor state returns to `normal`.
- Drag while holding `Alt`: cursor state enters `selecting`, then `resolving` for valid selections.
- Pointer events without `Alt` are logged as ignored and do not start the smart cursor flow.

## 2026-06-13 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 5 test files and 24 tests.
- `npm.cmd run build`: passed.

Notes:

- P4 uses WebView keyboard and pointer events, not OS-level global hooks.
- Tauri global shortcut support is intentionally deferred; the desktop shell dependency graph is verified with `cargo check`.
