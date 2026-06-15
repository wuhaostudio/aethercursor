# P7 Validation

P7 adds the first usable Action Menu and Result Canvas skeleton. It remains mock-driven so the UI flow can be verified before P8 introduces manifest-driven routing.

## Deliverables

- `src/overlay/ActionMenu.tsx`
- `src/overlay/ResultCanvas.tsx`
- Overlay rendering for `action_pending`, `result`, and `error`.
- Mock action selection from the generated context.
- Mock `AgentResult` generation for Result Canvas blocks.
- Result Canvas controls: read aloud, copy, pin, switch agent, close.
- More agents affordance with a mock compatible-agent menu.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual Validation

- Hold `Alt` and drag a valid region.
- Action Menu appears near the selected region.
- Select Translate, Explain, Summarize, or Extract text.
- Result Canvas appears near the selection.
- Source, Translation, and Explanation blocks are visible.
- Read, Copy, Pin, Agent, More agents, and Close controls produce debug events or state changes.
- More agents opens a menu but does not auto-run any agent.
- Close returns the cursor state to `normal`.

## 2026-06-14 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 7 test files and 31 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Manifest-driven action filtering.
- Real Agent Registry, Intent Router, Policy Module, and Runtime.
- Real TTS.
- Real extension-agent execution from More agents.
