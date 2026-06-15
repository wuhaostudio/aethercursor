# P10 Validation

P10 moves mock execution behind a unified Agent Runtime boundary and completes the MVP validation slice. Runtime execution remains mock-compatible, but local, cloud, timeout, blocked, permission-denied, and adapter-failure outcomes now return structured `AgentResult` objects.

## Deliverables

- `src/runtime/agentRuntime.ts`
- `src/runtime/agentRuntime.test.ts`
- Runtime execution integrated with the app `thinking` state.
- Runtime policy enforcement before adapter execution.
- Mock-compatible local and cloud adapters.
- Timeout and adapter failure mapping to `AgentResult` errors.
- Session-local pin storage for recent results.
- Switch Agent foundation from Result Canvas back to the current region's Action Menu.
- State machine support for `agent.switch_requested`.

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

- Hold `Alt` and drag a valid region.
- Choose `Extract Text`; the app should enter `thinking` and then show a local mock runtime result.
- Choose a cloud action; confirm the Permission Prompt and verify a cloud mock runtime result appears.
- Cancel the Permission Prompt; the app should return to `action_pending` without a result.
- Use `Pin`; the debug panel should show a session-local pinned result.
- Use `Agent`; the Result Canvas should return to the Action Menu for the same selected region.
- Runtime blocked, timeout, permission-denied, and adapter failure paths are covered by unit tests.

## 2026-06-15 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 10 test files and 48 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real OCR engine integration.
- Real cloud provider adapter.
- Real extension-agent execution from `More agents`.
- Real TTS.
- OS-level global shortcut support.
