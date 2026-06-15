# Phase Progress

## Completed

### P0: Project Skeleton and Engineering Constraints

Status: Completely.

Completed:

- React + TypeScript + Vite frontend scaffold.
- Tauri 2 desktop shell files under `src-tauri/`.
- `src/`, `src-tauri/`, `schemas/`, `agents/`, and `docs/` directory boundaries.
- `package.json` scripts for `dev`, `dev:desktop`, `build`, `typecheck`, `lint`, and `test`.
- Strict TypeScript configuration.
- Basic README and validation notes.
- Frontend debug window.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

Desktop shell check:

- `cargo check` passed after Rust/Cargo installation, Tsinghua Cargo mirror configuration, and development icon setup.

### P1: Shared Types and Protocol Schemas

Status: Completely.

Completed:

- `schemas/context.schema.json`
- `schemas/agent-manifest.schema.json`
- `schemas/agent-result.schema.json`
- `src/shared/context.ts`
- `src/shared/agent.ts`
- `src/shared/result.ts`
- Runtime validation helpers.
- Valid protocol fixtures.
- Unit tests for valid objects and missing or invalid fields.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`

### P2: Cursor State Machine

Status: Completely.

Completed:

- Pure reducer-based cursor state machine.
- States: `normal`, `armed`, `inspecting`, `selecting`, `resolving`, `action_pending`, `confirming`, `thinking`, `result`, and `error`.
- Events for activation, pointer, selection, action, permission, agent, result close, and cancel.
- Unit tests for primary path, cancel path, local action path, cloud permission gating, invalid event handling, and small selection rejection.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`

### P3: Overlay Window and Visual Foundation

Status: Completely.

Completed:

- Centralized overlay visual tokens.
- Overlay view model for cursor states.
- Overlay root component for armed, inspecting, selecting, resolving, and thinking visuals.
- Debug preview states in the frontend window.
- Hidden transparent Tauri overlay window reservation.
- Unit tests for normal invisibility, armed ring, selection bounds, and radius constraints.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

Desktop shell check:

- `cargo check` passed.

### P4: Input Module and Activation Model

Status: Completely.

Completed:

- WebView keyboard event bridge for `Alt` and `Esc`.
- WebView pointer event bridge for down, move, and up events.
- Input-to-state-machine event mapping.
- Minimum selection size validation.
- Recent input event debug log.
- App-level reducer integration with the cursor state machine.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`

Desktop shell check:

- `cargo check` passed.

Deferred:

- OS-level global shortcut support remains deferred.

### P5: Region Selection Layer

Status: Completely.

Completed:

- Shared selection geometry module.
- Normalized drag rectangle calculation for all drag directions.
- Shared minimum selection size rule.
- Dedicated `SelectionLayer` component.
- Semi-transparent selection fill, luminous border, corner handles, and too-small visual state.
- Pointer capture during Alt-drag inside the WebView.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- Rust, Cargo, and Tauri CLI are available when `C:\Users\AIUX\.cargo\bin` is added to PATH.

Desktop shell dependency check:

- `cargo check` passed after adding `.cargo/config.toml` for the Tsinghua crates.io mirror and `src-tauri/icons/icon.ico`.

### P6: Capture Module and Context Generation

Status: Completely.

Completed:

- `src/capture/contextCapture.ts` capture/context module.
- `src/capture/contextCapture.test.ts` unit coverage.
- Selection draft to normalized `ContextProtocol.selection.bounds`.
- Local temporary `image_ref` convention: `local://capture/{context_id}.png`.
- Capture cleanup request boundary for temporary image refs.
- Default local-only privacy flags for captured context.
- App-level resolving flow that creates and displays the latest context after a valid `Alt + drag`.
- Windows native region capture command exposed as `capture_region`.
- Native capture writes only the selected rectangle to a temporary BMP artifact.
- Frontend bridge upgrades `image_ref` when running inside Tauri and gracefully keeps the placeholder in browser debug mode.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run test`
- `npm.cmd run build`
- `cargo check`

Deferred:

- Native selected text, UI Automation, browser DOM, and OCR preprocessing.
- Cross-platform capture implementations beyond Windows.
- PNG encoding; the current native artifact is BMP to avoid adding an image encoding dependency.

### P7: Action Menu and Result Canvas

Status: Completely.

Completed:

- `src/overlay/ActionMenu.tsx` compact intent menu.
- `src/overlay/ResultCanvas.tsx` structured output canvas.
- Overlay integration for `action_pending`, `result`, and `error` states.
- App-level mock execution from selected action to `AgentResult`.
- Result Canvas source, translation, and explanation blocks.
- Immediate controls: read aloud, copy, pin, switch agent, close.
- More agents affordance that opens a mock compatible-agent menu without auto-running agents.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`

Deferred:

- Manifest-driven action filtering.
- Real Agent Registry, Intent Router, Policy Module, and Runtime.
- Real TTS for read aloud.
- Actual extension-agent execution from More agents.

### P8: Agent Registry, Manifest Loader, and Intent Router

Status: Completely.

Completed:

- Built-in validation manifests:
  - `agents/local-ocr.json`
  - `agents/cloud-explain.json`
  - `agents/cloud-translate.json`
  - `agents/cloud-summarize.json`
- `src/agents/agentRegistry.ts` manifest loading, validation, compatibility filtering, and local-first routing.
- `src/agents/agentRegistry.test.ts` route coverage.
- Action Menu entries now come from context-compatible manifest routes.
- Router marks cloud agents as requiring confirmation.
- Debug panel shows loaded agent count and current route count.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`

Deferred:

- Runtime execution adapters beyond the current mock result path.
- Extension-agent execution from More agents.

### P9: Policy Module and Permission Prompt

Status: Completely.

Completed:

- `src/policy/policy.ts` policy decision helper for local, cloud-confirmed, cloud-confirm-needed, and blocked actions.
- Policy decision structure with privacy levels 1, 2, and 3.
- `src/overlay/PermissionPrompt.tsx` compact cloud confirmation UI.
- Action Menu entries now carry policy decisions and show blocked cloud actions explicitly.
- App-level confirm flow marks the current context as cloud-confirmed and continues to mock execution.
- App-level cancel flow returns to `action_pending` without starting execution.
- Level 3 sensitive-context blocked behavior routes to an error result without execution.
- Thinking-state guard re-checks policy before mock execution so cloud agents cannot run without confirmation.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`

### P10: Agent Runtime and MVP Validation

Status: Completely.

Completed:

- `src/runtime/agentRuntime.ts` unified Agent Runtime interface.
- Mock-compatible local adapter for the Local OCR manifest.
- Mock-compatible cloud adapter for cloud explain, translate, and summarize manifests.
- App-level `thinking` state execution through the Agent Runtime instead of inline mock generation.
- Runtime policy enforcement for permission-denied and blocked actions.
- Runtime timeout and adapter failure mapping to structured `AgentResult` errors.
- Session-local pin storage for recent results.
- Switch Agent foundation that returns from Result Canvas to the current region's Action Menu without auto-running agents.
- End-to-end MVP validation record in `docs/p10-validation.md`.

Verified:

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run lint`
- `npm.cmd run build`

Deferred:

- Real OCR engine integration.
- Real cloud provider adapter.
- Real extension-agent execution from `More agents`.
- Real TTS.
- OS-level global shortcut support.

## Next

### P11: OS Global Shortcut And Desktop Activation

Status: not started.

Next focus:

- Add OS-level global shortcut support in the Tauri layer.
- Keep WebView `Alt` activation as a debug fallback.
- Validate activation, selection, and cancellation while another desktop app is focused.
- After P11, connect Local OCR to the PaddleOCR API service.
