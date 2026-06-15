# P3 Validation

P3 establishes the overlay visual foundation without connecting real global input or capture.

## Deliverables

- `src/overlay/tokens.ts`
- `src/overlay/overlayModel.ts`
- `src/overlay/OverlayRoot.tsx`
- `src/overlay/OverlayRoot.css`
- `src/overlay/overlayModel.test.ts`
- Debug preview states in `src/App.tsx`
- A hidden transparent overlay window reservation in `src-tauri/tauri.conf.json`

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 2026-06-13 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 4 test files and 18 tests.
- `npm.cmd run build`: passed.

Notes:

- P3 does not connect real global input, click-through behavior, or capture.
- The `overlay` Tauri window is reserved in config as hidden and transparent.
- Rust/Tauri compilation is validated with `cargo check`.
