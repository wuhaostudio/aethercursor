# P6 Validation

P6 adds the first capture/context generation layer. It converts a valid selected region into a schema-valid `ContextProtocol` object and exposes the latest context in the debug window.

## Deliverables

- `src/capture/contextCapture.ts`
- `src/capture/contextCapture.test.ts`
- App integration for automatic context creation from the `resolving` state.
- Debug UI for the latest context bounds, `image_ref`, and local-only privacy state.
- Temporary image cleanup request boundary.
- P6.1 native Windows capture command documented in `docs/p6-1-validation.md`.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual Validation

- Hold `Alt` and drag a valid region.
- Release the pointer.
- The cursor state advances through `resolving` to `action_pending`.
- The latest context panel shows normalized bounds.
- The generated context uses a local `image_ref`.
- Privacy remains local-only: `cloud_allowed: false`.

## 2026-06-14 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd run test`: passed, 7 test files and 31 tests.
- `npm.cmd run build`: passed.
- `cargo check`: passed after P6.1 native capture work.

## Native Work

P6.1 adds a Windows native capture command that writes a BMP artifact for the selected region. Browser debug mode still uses the placeholder boundary:

```text
local://capture/{context_id}.png
```

Tauri desktop mode upgrades the context to a native BMP reference when `capture_region` succeeds.
