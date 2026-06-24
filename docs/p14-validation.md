# P14 Validation

P14 integrates a cloud LLM provider adapter for explain/translate/summarize agents, with mock fallback for development and proper privacy gating.

## Deliverables

### Cloud Service Config
- `src/cloud/cloudServiceConfig.ts` - Cloud LLM service configuration module
  - `endpoint`: API endpoint URL (default: OpenAI-compatible chat completions)
  - `api_key`: Authentication key
  - `model`: Model name selection (default: gpt-4o-mini)
  - `timeout_ms`: Request timeout
  - `enabled`: Derived from api_key presence
  - `getCloudServiceConfig()`, `setCloudServiceConfig()`, `isCloudServiceAvailable()`, `resetCloudServiceConfig()`
  - 7 unit tests

### Cloud LLM Adapter
- `src/cloud/cloudLlmAdapter.ts` - HTTP adapter for cloud LLM APIs
  - OpenAI-compatible chat completions API
  - Bearer token authentication
  - Support for `explain`, `translate`, `summarize`, `extract_text` intents
  - Prompt building per intent type
  - Response parsing with error handling
  - Output fields: text, translation, explanation, summary
  - Custom `fetchImpl` for testability
  - 8 unit tests

### Runtime Integration
- Updated `src/runtime/agentRuntime.ts`
  - Cloud adapter auto-selected when `isCloudServiceAvailable()` returns true
  - Mock fallback preserved for development without API keys
  - Privacy policy gates enforced before execution

## Integration Points

1. **Privacy gate**: Policy module checks cloud_allowed and user_confirmed_upload before execution
2. **Context source**: Uses `selected_text` first, falls back to `ocr_text`
3. **Output format**: Matches AgentResult schema with intent-specific output fields
4. **Graceful degradation**: Mock runtime used when cloud service is not configured

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

1. **Mock mode (default)**:
   - Without configuring API key, verify mock outputs for explain/translate/summarize
   - App should work normally with mock data

2. **Cloud mode**:
   - Configure API key via `setCloudServiceConfig({ api_key: "..." })`
   - Verify real API calls are made with correct prompts
   - Verify results appear in Result Canvas

3. **Privacy gate**:
   - Without user confirmation, cloud agents should be blocked
   - Permission prompt should appear for level 2 content

## 2026-06-24 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 14 test files and 80 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real cloud API validation with live service
- Support for additional cloud providers (Anthropic, Gemini, etc.)
- Streaming responses
- Token usage tracking and cost estimation
- Real extension-agent execution from `More agents`
- Real TTS
