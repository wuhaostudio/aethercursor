# P8 Validation

P8 adds built-in agent manifests and a minimal manifest-driven router. The Action Menu now reflects compatible agents for the generated context instead of hard-coded buttons.

## Deliverables

- `agents/local-ocr.json`
- `agents/cloud-explain.json`
- `agents/cloud-translate.json`
- `agents/cloud-summarize.json`
- `src/agents/agentRegistry.ts`
- `src/agents/agentRegistry.test.ts`
- `tsconfig.json` includes the `agents` directory for JSON manifest imports.
- Action Menu receives context-compatible route entries from the registry.

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Manual Validation

- Hold `Alt` and drag a valid region.
- The debug panel shows 4 loaded agents.
- The Action Menu shows actions routed from manifest compatibility.
- `Extract text` routes to `agent.local.ocr` and can continue into the mock Result Canvas.
- Cloud actions are marked as requiring confirmation and stop in `confirming` until P9 adds Permission Prompt UI.

## 2026-06-14 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 8 test files and 36 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Permission Prompt UI.
- Full Policy Module.
- Real Runtime adapters.
- More agents execution from the Result Canvas.
