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
- Added `src/runtime/contextResolvedAgent.ts` as the app/runtime bridge for
  minimum-context execution.
- Text-capable agents now use automatic OCR fallback when direct text and
  existing OCR text are unavailable: capture the selected region, run local OCR,
  then execute the original text agent with `ocr_text`.
- Added `src/capture/selectedText.ts` to read and normalize current DOM selected
  text in browser/main-window development flows before any capture is requested.
- Added Windows UI Automation selected-text reading on desktop activation. The
  native shortcut handler reads the focused element selection before showing and
  focusing the overlay, then sends the text through the shortcut payload.

## Verification

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
cd src-tauri
cargo fmt --check
cargo check
```

Targeted test command run:

```powershell
npm.cmd run test -- src/capture/contextResolver.test.ts src/capture/contextCapture.test.ts src/agents/agentRegistry.test.ts src/runtime/agentRuntime.test.ts
npm.cmd run test -- src/capture/contextResolver.test.ts src/runtime/contextResolvedAgent.test.ts src/runtime/agentRuntime.test.ts src/ocr/paddleOcrAdapter.test.ts
npm.cmd run test -- src/capture/selectedText.test.ts src/capture/contextCapture.test.ts src/capture/contextResolver.test.ts src/runtime/contextResolvedAgent.test.ts
```

Results:

- Typecheck passed.
- Lint passed.
- Targeted tests passed: 4 test files, 23 tests.
- OCR fallback targeted tests passed: 4 test files, 25 tests.
- DOM selected text targeted tests passed: 4 test files, 19 tests.
- Full tests passed: 26 test files, 151 tests.
- Build passed.
- Cargo fmt check passed.
- Cargo check passed.

## Environment Note

Running Vitest inside the managed sandbox failed with `EPERM` while Vite tried
to write `node_modules\.vite-temp`. The same test command passed when run with
the required filesystem permission.

## Remaining Gaps

- Cloud vision and table agents still depend on future provider-specific image
  upload support.
