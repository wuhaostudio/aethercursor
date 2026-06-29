# P22 Validation

P22 starts the Context Resolver Upgrade. This slice adds minimum-context routing
before agent runtime execution without introducing UI Automation, browser DOM
bridges, or real vision upload support.

## Implemented

- Added `src/capture/contextResolver.ts`.
- Added `src/capture/contextResolver.test.ts`.
- Initial contexts no longer include a fake local image reference before native
  capture has actually produced one.
- Runtime context resolution now prefers direct text, then OCR text, before
  requesting pixels for agents that can accept text.
- Image and screen-region agents trigger native capture only when pixels are
  required and missing.
- Context resolution failures are mapped to structured `AgentResult` errors.
- Agent routing considers inputs that can be produced, so image-capable actions
  remain visible before capture while impossible actions are hidden.

## Verification

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Targeted test command run:

```powershell
npm.cmd run test -- src/capture/contextResolver.test.ts src/capture/contextCapture.test.ts src/agents/agentRegistry.test.ts src/runtime/agentRuntime.test.ts
```

Results:

- Typecheck passed.
- Lint passed.
- Targeted tests passed: 4 test files, 23 tests.
- Full tests passed: 24 test files, 142 tests.
- Build passed.

## Environment Note

Running Vitest inside the managed sandbox failed with `EPERM` while Vite tried
to write `node_modules\.vite-temp`. The same test command passed when run with
the required filesystem permission.

## Remaining Gaps

- No real selected text extraction from other apps yet.
- No automatic OCR fallback for text agents yet.
- Cloud vision and table agents still depend on future provider-specific image
  upload support.
