# P15 Validation

P15 integrates text-to-speech (TTS) for the "Read aloud" feature, with Web Speech API as the default fallback and cloud TTS support.

## Deliverables

### TTS Service Config
- `src/tts/ttsServiceConfig.ts` - TTS service configuration module
  - `endpoint`: Cloud TTS API endpoint (default: OpenAI TTS)
  - `api_key`: Authentication key
  - `voice`: Voice selection (default: alloy)
  - `rate`: Speech rate (default: 1.0)
  - `pitch`: Pitch (default: 1.0)
  - `enabled`: Derived from api_key presence
  - `isCloudTtsAvailable()`, `isWebSpeechAvailable()`
  - 9 unit tests

### TTS Player
- `src/tts/ttsPlayer.ts` - Unified TTS player service
  - Singleton `ttsPlayer` with state management
  - Web Speech API fallback (`speechSynthesis`)
  - Cloud TTS API support (OpenAI-compatible audio/speech endpoint)
  - Play, pause, resume, stop controls
  - State subscription for UI updates
  - Priority: cloud TTS > Web Speech API > error
  - Audio element playback for cloud TTS
  - Proper cleanup of blob URLs

### UI Integration
- Updated `src/overlay/ResultCanvas.tsx`
  - `isReading` and `isReadingPaused` props
  - Button text changes: Read → Pause → Resume
  - Dynamic title attribute

- Updated `src/overlay/OverlayRoot.tsx`
  - Passes through `isReading` and `isReadingPaused` props

- Updated `src/App.tsx`
  - `ttsState` React state synced with player
  - `handleReadAloud` toggle logic: play/pause/resume
  - Priority text source: result output → ocr_text → selected_text
  - Error logging for TTS failures

## Integration Points

1. **Text source**: Uses result output first, falls back to OCR text, then selected text
2. **Service priority**: Cloud TTS (if configured) → Web Speech API → error
3. **State management**: Player singleton with subscription-based UI updates
4. **Resource cleanup**: Blob URLs revoked on playback end/error

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

1. **Web Speech API (default)**:
   - Without configuring API key, click "Read" button
   - Verify speech synthesis plays the result text
   - Verify button changes to "Pause" while playing
   - Click "Pause" and verify speech pauses
   - Verify button changes to "Resume"
   - Click "Resume" and verify speech continues

2. **Cloud TTS mode**:
   - Configure API key via `setTtsServiceConfig({ api_key: "..." })`
   - Verify cloud TTS API is called with correct voice and speed
   - Verify audio playback works

3. **Text source priority**:
   - With result: reads result.output.text
   - Without result but with OCR: reads ocr_text
   - With only selected text: reads selected_text

## 2026-06-24 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 15 test files and 89 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real cloud TTS validation with live service
- Support for additional TTS providers (ElevenLabs, Azure, etc.)
- Word-level highlighting during playback
- Playback speed control in UI
- Voice selection in UI
- Real extension-agent execution from `More agents`
