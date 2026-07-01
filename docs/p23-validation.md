# P23 Validation

## Scope

P23 adds first real cloud vision and table adapter behavior on top of the
existing OpenAI-compatible chat completions adapter.

Implemented:

- Cloud image-capable agents now send multimodal message content with an
  `image_url` part.
- `data:image/*` refs are uploaded directly.
- Tauri `local://capture/{context_id}.bmp` refs are read through the native
  capture bridge and converted to `data:image/bmp;base64,...`.
- Vision analysis uses an image-region prompt instead of the old text-only
  prompt.
- Table extraction asks for strict JSON and parses `{ columns, rows }` into
  `AgentResult.output.table`.
- Result Canvas renders parsed table output as a compact table.
- Action labels distinguish visual analysis and table extraction from generic
  explanation or OCR.
- Cloud permission copy now states whether selected text or the selected image
  region will be uploaded.

## Verification

Commands run:

```powershell
npm.cmd run typecheck
npm.cmd run test -- src/cloud/cloudLlmAdapter.test.ts
npm.cmd run test
npm.cmd run lint
```

Results:

- TypeScript passed.
- Focused cloud adapter tests passed: 12 tests.
- Full Vitest suite passed: 155 tests across 26 test files.
- ESLint passed with zero warnings.

Environment note:

- The first sandboxed Vitest run hit the known Vite `node_modules\.vite-temp`
  `EPERM` issue. The test command was rerun with the required filesystem
  permission and passed.

## Remaining Risks

- Provider compatibility depends on the configured OpenAI-compatible endpoint
  supporting chat completion image content parts.
- Native capture currently produces BMP artifacts. Some providers may reject
  `image/bmp`; PNG/JPEG conversion remains a future portability improvement.
