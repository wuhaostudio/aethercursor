# P2 Validation

P2 implements the smart cursor state machine as pure reducer logic.

## Deliverables

- `src/cursor/stateMachine.ts`
- `src/cursor/stateMachine.test.ts`

## Expected Checks

```bash
npm run typecheck
npm run lint
npm run test
```

## 2026-06-13 Result

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 3 test files and 14 tests.

Covered paths:

- `normal -> armed -> selecting -> resolving -> action_pending`
- `cancel -> normal` from every non-normal state.
- Cloud execution remains blocked while state is `confirming`.
- Local actions can enter `thinking` without cloud confirmation.
- Illegal events do not crash or advance the state machine.
