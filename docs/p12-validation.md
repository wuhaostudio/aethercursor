# P12 Validation

P12 integrates a local PaddleOCR API service adapter with the OCR agent runtime, while preserving the mock fallback for development environments without an OCR backend. The architecture supports local deployment of the OCR service with API key authentication.

## Deliverables

- `src/ocr/ocrServiceConfig.ts` - OCR service configuration module
  - Supports configurable endpoint (default: `http://127.0.0.1:9003/ocr`)
  - API key configuration with runtime setter
  - `isOcrServiceAvailable()` helper for availability checks
  - Global injection points via `__AETHERCURSOR_OCR_ENDPOINT__` and `__AETHERCURSOR_OCR_API_KEY__`
- `src/ocr/paddleOcrAdapter.ts` - PaddleOCR HTTP adapter
  - `recognizeOcrFromImage()` - sends image blob to OCR service
  - `extractOcrText()` - extracts plain text from recognition results
  - `executePaddleOcrAgent()` - full agent execution pipeline
  - Timeout support via AbortController
  - Structured error handling (service disabled, no image, read failed, ocr failed)
- `src/ocr/ocrServiceConfig.test.ts` - 7 unit tests for config module
- `src/ocr/paddleOcrAdapter.test.ts` - 10 unit tests for OCR adapter
- Integration with `src/runtime/agentRuntime.ts`
  - Local OCR agent automatically uses PaddleOCR when service is configured
  - Falls back to mock output when OCR service is unavailable
  - Maintains existing behavior for all other agents

## Architecture Notes

### Local-first design

The OCR service is designed to run locally on the user's machine:
- Default endpoint points to `127.0.0.1`
- No data leaves the user's machine
- `privacy.uploaded` is always `false` for local OCR results

### Graceful degradation

When the OCR service is not configured (no API key set):
- `isOcrServiceAvailable()` returns `false`
- The runtime falls back to mock OCR output
- The app remains fully functional for development and testing

### API key pattern

The API key serves as a simple authentication mechanism for the local OCR service:
- Set via `setOcrServiceConfig({ api_key: "..." })` at runtime
- Or via global `__AETHERCURSOR_OCR_API_KEY__` injection
- Sent in the `X-API-Key` request header
- User manually adds the key when the OCR service is deployed

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

1. **Mock fallback path** (default):
   - Hold `Alt` and drag a valid region
   - Choose `Extract Text`
   - Result should show mock OCR output (current behavior preserved)

2. **Configured OCR service path**:
   - Call `setOcrServiceConfig({ api_key: "test-key" })` from console
   - Hold `Alt` and drag a valid region
   - Choose `Extract Text`
   - Result should attempt to call the PaddleOCR endpoint
   - With no service running, should show `ocr_failed` error

3. **Service available path** (requires running PaddleOCR service):
   - Configure endpoint and API key
   - Select a region with text
   - Verify actual OCR text appears in result

## 2026-06-23 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 12 test files and 65 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real image file reading from the BMP capture artifact (currently returns null)
- OCR preprocessing and performance optimization
- Cloud provider adapter integration
- Real extension-agent execution from `More agents`
- Real TTS
