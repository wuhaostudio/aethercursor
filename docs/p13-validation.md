# P13 Validation

P13 bridges the Tauri native capture layer to the PaddleOCR adapter, enabling end-to-end OCR from screen region capture through text extraction. OCR results are written back to `ContextProtocol.content.ocr_text` for use by downstream agents.

## Deliverables

### Rust Backend
- Added `read_capture_file` Tauri command in `src-tauri/src/lib.rs`
  - Reads BMP capture file from OS temp directory
  - Returns base64-encoded image data
  - Includes file path and size metadata
  - Uses same `capture_path` logic as `capture_region`
  - Custom base64 encoder (no external dependency)

### Frontend
- Extended `src/capture/nativeCapture.ts`
  - Added `readCaptureFile()` - raw base64 result bridge
  - Added `readCaptureFileAsBlob()` - converts base64 to Blob for OCR submission
  - Graceful null return when not in Tauri runtime

- Updated `src/ocr/paddleOcrAdapter.ts`
  - Default `readImageFromRef()` now uses `readCaptureFileAsBlob`
  - Added `extractContextIdFromImageRef()` helper for BMP and PNG refs
  - Image ref parsing: `local://capture/{context_id}.bmp` or `.png`

- Updated `src/App.tsx`
  - OCR results written back to `latestContext.content.ocr_text`
  - Updates `metadata.content_guess` to `["text", "image"]`
  - Boosts `metadata.confidence` to at least 0.8
  - Only triggers on `extract_text` intent with successful OCR

## Integration Points

1. **Capture -> OCR**: Screen region captured by Windows GDI -> BMP file -> base64 -> Blob -> PaddleOCR HTTP API
2. **OCR -> Context**: OCR text stored in context for downstream agents (explain, translate, summarize)
3. **Graceful degradation**: Mock fallback preserved when OCR service is not configured

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

1. **Native capture path** (Tauri desktop + PaddleOCR service):
   - Hold `Alt` and drag a region with visible text
   - Choose `Extract Text`
   - Verify OCR text appears in result
   - Verify `Latest Context` debug panel shows `ocr_text` populated

2. **Context enrichment**:
   - After successful OCR, choose `Explain` or `Translate`
   - Verify the downstream agent receives the OCR text as source

3. **Mock fallback** (no OCR service):
   - Without configuring API key, verify mock output still works
   - App should not crash or throw errors

## 2026-06-24 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 12 test files and 65 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real end-to-end validation with running PaddleOCR service (requires service deployment)
- OCR preprocessing and image optimization
- Cloud provider adapter integration
- Real extension-agent execution from `More agents`
- Real TTS
