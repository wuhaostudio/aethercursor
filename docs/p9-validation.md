# P9 Validation

P9 adds the policy decision boundary and the user-facing Permission Prompt. Cloud actions now require explicit confirmation before mock execution, while blocked sensitive uploads are stopped before runtime.

## Deliverables

- `src/policy/policy.ts`
- `src/policy/policy.test.ts`
- `src/overlay/PermissionPrompt.tsx`
- Policy decisions attached to routed agent actions.
- Action Menu policy labels for cloud and blocked actions.
- App-level confirm and cancel flow for cloud actions.
- Thinking-state policy guard before mock execution.
- Error display for blocked or denied policy execution.

## Expected Checks

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Manual Validation

- Hold `Alt` and drag a valid region.
- Choose `Extract Text`; it should proceed directly to the mock Result Canvas.
- Choose a cloud action; the Permission Prompt should appear before execution.
- Click `Cancel`; the flow should return to `action_pending` and not produce a result.
- Choose the cloud action again and click `Confirm`; it should continue to the mock Result Canvas.
- A Level 3 blocked policy decision should show an error and should not start execution.

## 2026-06-15 Result

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 9 test files and 42 tests.
- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed.

## Deferred

- Real Agent Runtime adapters.
- Runtime timeout handling.
- Session-local pin behavior.
- Switch Agent execution foundation.
