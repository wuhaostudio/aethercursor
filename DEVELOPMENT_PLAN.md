# AetherCursor Development Plan

## Purpose

This document is the project development plan for AetherCursor.

AetherCursor is a desktop smart cursor layer. It is not a replacement for the
system mouse and should not behave like a conventional screenshot tool. The
product goal is to let the user explicitly activate a smart cursor, naturally
point at or circle visual context, choose an enabled capability, and receive a
compact spatial result.

## Development Principles

- Prefer the simplest implementation that satisfies the current phase goal.
- Do not add abstractions, dependencies, services, or configuration unless they
  are required for the requested behavior or remove real complexity.
- Follow the principle: "Do not multiply entities beyond necessity."
- Do not bypass the privacy model. Cloud or external processing must go through
  policy and permission checks.
- Do not monitor the screen in the background.
- Capture only the selected region, shape, or cursor-local context required by
  the selected capability.
- Keep normal mouse behavior unaffected when smart cursor mode is inactive.

## Completion Tracking

- Completed phases must use the exact status word: `Completely`.
- Partially implemented phases must not use `Completely`; list the remaining
  work explicitly.
- The `Next` section must point to the next unfinished phase.
- Validation should include the relevant commands listed in `Verification`.

## Current Product Reality

The project currently has a working React + TypeScript + Tauri framework for the
original MVP flow:

```text
activate -> select rectangular region -> capture context -> choose action
  -> apply policy -> run agent -> show Result Canvas
```

The current implementation is useful for browser or Tauri main-window frontend
debugging, and the transparent Tauri `overlay` window is now wired as the
primary desktop smart cursor interaction surface for the current phase.

Recent fixes:

- WebView `Alt` keydown/keyup maps to activation pressed/released.
- Tauri `Alt+Shift+S` global shortcut events are received by the frontend.
- Local OCR waits for native capture to finish before execution when needed.
- Cloud LLM and TTS config can be injected through runtime globals.
- The transparent overlay window is shown by the native `Alt+Shift+S` shortcut,
  positioned on the cursor monitor, and hidden when the smart cursor session
  returns to normal.

## New Product Direction

The next product direction is a smart cursor interaction model, not a screenshot
interaction model.

Target flow:

```text
User presses Alt+Shift+S
  -> smart cursor mode activates
  -> cursor shows a small default focus shape near the pointer
  -> user moves, confirms, drags a rectangle, or draws a closed lasso shape
  -> AetherCursor resolves the selected shape into minimal context
  -> user chooses from enabled capabilities only
  -> policy checks privacy and permission
  -> runtime executes local-first when possible
  -> Result Canvas appears spatially near the selected shape
```

Important distinction:

- The user experience should not feel like taking a screenshot.
- The system may still use minimal selected-region image capture internally when
  a capability requires pixels, OCR, table extraction, or vision analysis.
- Text-oriented capabilities should prefer structured text sources first, then
  OCR fallback when necessary.

## Product Design Reference

These product notes were merged from the former `DESIGN.md` and `PLAN.md`
documents so this file remains the single source of truth for product direction,
development status, and roadmap.

### Product Thesis

Modern AI products often require users to copy visible content into a chat
window. AetherCursor changes the interaction model:

```text
See something -> point at it -> select it -> choose an AI action
  -> get the result in place
```

Core principles:

- AI should work near the object the user is looking at.
- Users must actively decide what screen region is processed.
- Tasks should be selected by intent, not by model name.
- Cloud processing must be transparent and permissioned.
- Agent capabilities should be added through a standard protocol.

### Product Scope

The current product remains a smart cursor framework, not a full autonomous
computer-control agent.

Included in the current framework direction:

- Smart cursor activation model.
- Cursor visual states.
- Explicit shape-based selection.
- Translucent desktop overlay UI.
- Minimal context capture model.
- Action Menu and Result Canvas.
- Agent and capability protocol.
- Privacy and permission model.
- Local-first and cloud-optional processing policy.
- Extension points for future agents.

Deferred from the current scope:

- Fully autonomous computer control.
- Multi-agent collaboration chains.
- Long-term memory.
- Agent marketplace.
- Enterprise admin console.
- Background screen monitoring.
- Automatic hover-based AI execution.
- Complex workflow automation.

### Visual Direction

AetherCursor should feel like a precise, lightweight AI instrument rather than a
chat product.

Keywords:

- Semi-transparent.
- Frosted glass.
- High-tech.
- Minimal.
- Spatial.
- Contextual.
- Quiet.
- Fast.

Suggested overlay tokens:

```text
overlay.background: rgba(12, 18, 28, 0.58)
overlay.border: rgba(120, 220, 255, 0.42)
overlay.highlight: rgba(80, 210, 255, 0.86)
overlay.text: rgba(245, 248, 255, 0.96)
overlay.muted_text: rgba(210, 220, 235, 0.68)
overlay.blur: 18px
overlay.radius: 8px
```

The UI should avoid heavy gradients, large decorative shapes, and
marketing-style panels. The overlay exists to support interaction, not to become
the main focus.

### Result Canvas Expectations

The Result Canvas should stay close to the selected content while avoiding
occlusion. It is both an output surface and a local control surface for deciding
whether to invoke more compatible agents.

Expected content and controls:

- Header with selected content label, local/cloud indicator, and compact
  controls.
- Source block with extracted text or selected-content preview when useful.
- Default output blocks such as translation, explanation, summary, or extracted
  text.
- Explicit expansion entry for additional compatible agents.
- Immediate controls for read aloud, copy, pin, switch agent, close, and more
  agents.

Expanded agents must never run automatically. They run only after explicit user
selection and policy approval when required.

### Success Metrics

Product interaction metrics:

- Time from activation to action menu.
- Time from selection to result.
- Selection correction rate.
- Action cancellation rate.
- Permission prompt acceptance rate.
- Result copy or follow-up rate.
- Result Canvas extension-agent invocation rate.

Qualitative metrics:

- Does the smart cursor feel non-invasive?
- Does the overlay feel precise and readable?
- Does the user understand when cloud AI is used?
- Does the user feel in control of what is sent?
- Can new agents be added without changing core UI code?

### Risks and Design Responses

Risk: AI feels too intrusive.

Response:

- Active invocation only.
- No default background monitoring.
- Minimal overlay.

Risk: Privacy concerns block adoption.

Response:

- Local-first policy.
- Clear cloud confirmation.
- Visible agent identity.
- Minimal context capture.

Risk: UI becomes a chat window.

Response:

- Results appear near selected content.
- Chat remains an optional continuation, not the primary mode.

Risk: Too many actions overwhelm users.

Response:

- Show only context-compatible and enabled actions.
- Hide advanced agents behind a clearly labeled Result Canvas expansion entry.
- Keep default output presets small and user-configurable.

Risk: Agent ecosystem becomes inconsistent.

Response:

- Require manifest and capability protocol.
- Standardize input and output types.
- Enforce permission declarations.

### Open Design Questions

- Should the action menu be radial, vertical, or adaptive?
- How much context should be visible in the cloud confirmation prompt?
- Should OCR always run locally before cloud routing?
- Should result canvases disappear automatically or remain until dismissed?
- How should pinned results behave across app switches?
- Should enterprise deployments disable cloud agents by default?

## Interaction Model

### Activation

- `Alt+Shift+S` is the formal desktop activation shortcut.
- WebView `Alt` activation remains a development fallback only.
- Activation enters smart cursor mode and does not immediately capture the
  screen.

### Selection Modes

The smart cursor should support explicit selection shapes:

- `focus`: default small focus shape around the pointer, approximately word
  sized, for example `20x15px`.
- `rect`: rectangular region selection.
- `lasso`: freeform closed shape selection.
- `object_snap`: future mode for snapping to inferred words, controls, images,
  or UI objects.

The selection model should represent both bounds and shape data:

```ts
interface SelectionShape {
  readonly mode: "focus" | "rect" | "lasso" | "object_snap";
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly path?: readonly { readonly x: number; readonly y: number }[];
  readonly confidence?: number;
}
```

### Cursor Visual Forms

The cursor should communicate mode without relying on large text labels.

- Focus mode: small translucent oval or rounded focus frame around the pointer.
- Rect mode: crosshair-style decoration and rectangular outline while dragging.
- Lasso mode: pen or lasso decoration with a live path and closed-shape fill.
- Object snap mode: magnetic ring decoration and candidate object highlight.
- Thinking mode: selected shape edge shows subtle motion or breathing feedback.
- Result mode: cursor returns close to normal and the result appears near the
  selected shape.

Use an overlay decoration near the pointer instead of relying on OS-level cursor
replacement. This is simpler and more portable.

### Capability Choice

The runtime action menu should show enabled capabilities only.

Capability management must be user-initiated:

- Do not show a capability selection window on every startup.
- Do not force capability selection during initialization unless there is no
  usable default.
- Provide a separate Manage Capabilities entry where the user can add, remove,
  or configure capabilities.
- Capability changes may apply on next startup for the first implementation.

## Capability Model

The existing agent manifest system should evolve into a capability registry.
Capabilities describe what they can do, what inputs they need, how they run, and
what privacy gates apply.

Candidate capability profile:

```ts
interface CapabilityProfile {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly input_requirements: readonly ("text" | "region_image" | "shape_path")[];
  readonly fallback_requirements: readonly ("ocr" | "capture")[];
  readonly execution_mode: "local" | "cloud" | "hybrid";
  readonly requires_upload: boolean;
  readonly provider_id?: string;
}
```

Expected behavior:

- Translate, explain, and summarize prefer text.
- OCR requires selected region image capture.
- Vision analysis requires selected region image capture.
- Table extraction may require selected region image capture and structured OCR.
- TTS requires text from the result or selected context.

## Privacy Model

Privacy remains a core product boundary.

- Smart cursor activation does not start background capture.
- Moving the cursor does not upload or process the whole screen.
- Context capture starts only after explicit selection confirmation or
  capability execution.
- Local capabilities should run without cloud prompts.
- Cloud capabilities must show a clear permission prompt before upload.
- Agents and capabilities never read the screen directly; they receive a
  standardized context object.

## Current Architecture

Implemented modules:

- Input Module: WebView activation fallback, pointer events, cancel events, and
  global shortcut event reception.
- Cursor State Machine: state reducer for normal, armed, selecting, action,
  confirmation, thinking, result, and error flows.
- Overlay Module: cursor ring, selection layer, Action Menu, Result Canvas, and
  Permission Prompt.
- Capture Module: Windows selected-region capture, BMP temporary artifacts, and
  frontend native capture bridge.
- Policy Module: cloud permission and sensitive-content gates.
- Agent Registry: manifest loading, validation, compatibility filtering, and
  local-first routing.
- Agent Runtime: local OCR, cloud LLM, mock fallback, timeout and error mapping.
- OCR Module: PaddleOCR HTTP adapter with native image reading.
- Cloud Module: OpenAI-compatible chat completions adapter.
- TTS Module: Web Speech fallback and cloud TTS support.

Important data boundaries:

- `schemas/context.schema.json`
- `schemas/agent-manifest.schema.json`
- `schemas/agent-result.schema.json`
- `src/shared/context.ts`
- `src/shared/agent.ts`
- `src/shared/result.ts`

## Completed Foundation

### P0: Project Skeleton and Engineering Constraints

Status: `Completely`

Completed:

- React + TypeScript + Vite frontend scaffold.
- Tauri 2 desktop shell.
- `src/`, `src-tauri/`, `schemas/`, `agents/`, and `docs/` boundaries.
- Development scripts for dev, desktop dev, build, typecheck, lint, and test.
- Strict TypeScript configuration.
- Basic README and debug window.

### P1: Shared Types and Protocol Schemas

Status: `Completely`

Completed:

- Context, AgentManifest, and AgentResult schemas.
- Shared TypeScript protocol types.
- Runtime validation helpers.
- Protocol fixtures and validation tests.

### P2: Cursor State Machine

Status: `Completely`

Completed:

- Reducer-based cursor state machine.
- States for normal, armed, selecting, resolving, action, confirmation,
  thinking, result, and error flows.
- Tests for primary path, cancel path, cloud gating, local actions, invalid
  events, and small selections.

### P3-P10: MVP Interaction Framework

Status: `Completely`

Completed:

- Overlay visual foundation.
- WebView activation fallback.
- Rectangular region selection.
- Context generation.
- Action Menu and Result Canvas.
- Agent registry and router.
- Policy module and permission prompt.
- Unified Agent Runtime boundary.
- Session-local pins and agent switching foundation.

### P11-P16: Runtime and Extension Foundation

Status: `Completely`

Completed:

- Tauri global shortcut registration for `Alt+Shift+S`.
- Frontend global shortcut event handling.
- Local PaddleOCR adapter and OCR config.
- Native capture file reading for OCR.
- Cloud LLM adapter.
- TTS player and cloud TTS config.
- More Agents panel with compatible agent routing.
- OCR runtime waits for capture availability.
- Cloud and TTS runtime globals.

Current validation count:

- 135 tests across 23 test files.

## Known Gaps

- Desktop overlay interaction is implemented for the current Windows/Tauri
  phase, but broader OS-specific polish may still be needed after manual use on
  varied monitor and focus configurations.
- Current cloud vision/table agents are routed, but the cloud adapter is still
  text-only.
- Real selected text extraction through UI Automation or browser DOM bridge is
  not implemented.
- Cross-platform native capture beyond Windows is not implemented.

## Next

Next unfinished phase: P22 Context Resolver Upgrade.

## Roadmap

### P17: Smart Cursor Session Model

Status: `Completely`

Goal:

- Replace the rectangle-first interaction model with a smart cursor session.
- `Alt+Shift+S` activates smart cursor mode.
- Activation creates a default `focus` selection near the pointer, such as
  `20x15px`.
- Context capture remains delayed until confirmation or capability execution.

Required:

- Add `SelectionShape` model with `focus`, `rect`, and `lasso` modes.
- Add smart cursor session state to the state machine.
- Make global shortcut activation enter smart cursor mode.
- Preserve WebView `Alt` fallback for development only.
- Keep `Esc` cancellation.
- Add tests for focus-mode activation and cancellation.

Completed:

- Added `SelectionShape` model with `focus`, `rect`, `lasso`, and `object_snap`
  modes.
- Added `smart_cursor` state to the cursor state machine.
- `Alt+Shift+S` and WebView `Alt` activation now enter smart cursor mode.
- Activation creates a default `focus` selection near the latest pointer
  location with a `20x15px` bounds.
- Pointer movement updates the focus selection without resolving context.
- `Enter` confirms the current focus selection and moves to context resolution.
- Dragging from smart cursor mode switches to rectangular selection.
- Existing region capture still starts only after context resolution.
- Added tests for focus activation, movement, confirmation, drag transition,
  input mapping, and overlay model output.

Exit standard:

- Pressing `Alt+Shift+S` arms the smart cursor session.
- A small focus selection appears near the pointer.
- No capture starts until the user confirms or chooses a capability.

### P18: Cursor Visual Mode Layer

Status: `Completely`

Goal:

- Make the current smart cursor mode obvious through cursor decorations.

Required:

- Focus decoration: small translucent focus shape.
- Rect decoration: crosshair and rectangle outline.
- Lasso decoration: live path and closed-shape fill.
- Thinking decoration: subtle activity on selected shape edge.
- Avoid heavy text labels as the primary mode indicator.

Completed:

- Overlay view model now exposes the active selection mode.
- Selection rendering receives the mode and applies stable visual classes.
- Focus mode renders as a compact rounded focus marker with a center point.
- Rect mode keeps the existing rectangular selection with corner handles.
- Lasso mode has a distinct dashed rounded selection style for the upcoming
  freeform path implementation.
- Object snap has a distinct magnetic-style highlight for future snapping.
- Smart cursor focus mode no longer depends on a text target hint as its primary
  mode indicator.
- Added tests for overlay mode output and selection visual class mapping.

Exit standard:

- A user can visually distinguish focus, rect, lasso, and thinking modes without
  reading a debug panel.

### P19: Freeform Lasso Selection

Status: `Completely`

Goal:

- Let users circle arbitrary visual content with a closed shape.

Required:

- Pointer path capture.
- Closed-shape detection or explicit close-on-release behavior.
- Derived bounds for capture fallback.
- Shape path retained in `ContextProtocol` or a successor selection protocol.
- Tests for path collection, bounds derivation, and cancellation.

Completed:

- Added lasso geometry helpers for path bounds and minimum-validity checks.
- `Tab` cycles smart cursor selection mode through focus, lasso, and rect.
- Lasso mode collects pointer path points during drag.
- Releasing the pointer explicitly closes the lasso path and resolves context
  using the path-derived bounds.
- Invalid or too-small lasso paths return to smart cursor focus mode.
- Overlay renders lasso paths as an SVG polyline inside the selected bounds.
- `ContextProtocol.selection` now supports optional `shape` and `path` fields.
- Context validation checks optional selection shape and path points.
- Added tests for lasso geometry, state transitions, input mapping, path
  rendering coordinates, context capture, and protocol validation.

Exit standard:

- User can draw a closed lasso shape and execute an enabled capability on that
  selected shape.

### P20: Capability Management

Status: `Completely`

Goal:

- Let the user explicitly manage enabled capabilities without startup
  interruption.

Required:

- Capability registry facade over current agent manifests.
- Persist enabled capability IDs locally.
- Add Manage Capabilities UI.
- Show only enabled capabilities in the runtime action menu.
- Keep capability changes simple; first implementation may apply changes on next
  startup.

Completed:

- Added capability settings model over current agent manifests.
- Persisted enabled capability IDs in local storage.
- Default enabled capability set is local OCR only, so the app does not require
  startup setup or show all capabilities by default.
- Added user-initiated Manage Capabilities panel in the debug window.
- Runtime Action Menu and More Agents list now route only enabled capabilities.
- Added empty Action Menu state when no enabled capability matches the selected
  context.
- Added tests for default settings, persistence, filtering, settings rows, and
  toggling.

Exit standard:

- App starts without showing a capability setup window.
- User can open Manage Capabilities and enable or disable capabilities.
- Runtime menu only shows enabled capabilities.

### P21: Desktop Overlay Window Integration

Status: `Completely`

Goal:

- Make the transparent Tauri overlay the primary desktop smart cursor surface.

Required:

- Show overlay on `Alt+Shift+S`.
- Hide overlay on cancel or result close.
- Handle focus, z-order, and pointer events safely.
- Support desktop coordinates and display scaling.
- Preserve normal mouse behavior when inactive.

Completed:

- Added native commands to show, size, focus, and hide the reserved Tauri
  `overlay` window.
- Global `Alt+Shift+S` now shows the overlay window from the Rust shortcut
  handler before emitting the frontend shortcut event.
- The frontend detects whether it is running in the browser, main Tauri window,
  or overlay Tauri window.
- The overlay window renders only the interaction overlay, while the main and
  browser surfaces keep the debug UI.
- The overlay window hides when the cursor state returns to `normal`.
- Added overlay window metrics and coordinate conversion so selected bounds can
  be converted from overlay logical coordinates to desktop physical capture
  coordinates.
- Overlay activation now sizes and positions the overlay on the monitor that
  contains the current cursor, with primary-monitor fallback.
- Global shortcut events include cursor coordinates and overlay metrics so the
  first focus selection appears at the activation point.
- Native selected-region capture temporarily hides the overlay window and
  restores it afterward, so overlay decorations are not captured as context.
- Action menu, permission prompt, and result canvas now clamp their floating
  position inside the overlay viewport and flip above the selection near the
  bottom edge.
- Returning to `normal` clears transient overlay session data such as latest
  context, latest result, pending action, open agent menu, and native capture
  status so the next activation starts cleanly.
- Pointer events that originate inside overlay controls, menus, prompts, or the
  result canvas are ignored by the selection input pipeline.
- Added tests for overlay bridge behavior, desktop coordinate conversion,
  floating overlay positioning, session cleanup, and pointer target filtering.
- Added `docs/p21-validation.md` validation record.

Exit standard:

- User can activate smart cursor over another desktop application and complete a
  selection without relying on the browser debug page.

### P22: Context Resolver Upgrade

Status: not started.

Goal:

- Resolve selected shapes into the minimum required context for the selected
  capability.

Required:

- Capability input requirement inspection.
- Text-first resolution where available.
- OCR fallback for text capabilities.
- Region image capture only when required.
- Structured errors when required context cannot be produced.

Exit standard:

- Translation/explanation use text when available and capture only when needed.
- Vision/table capabilities request selected pixels only.

### P23: Real Vision and Table Capability Adapters

Status: deferred.

Goal:

- Make vision analysis and table extraction real capability implementations.

Required:

- Provider-specific image upload support.
- Policy prompt describes uploaded content type.
- Structured table output rendering in Result Canvas.
- Tests for adapter request construction and error handling.

Exit standard:

- Vision and table capabilities no longer return generic text-only cloud output.

## Verification

For frontend changes:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

For Tauri/Rust changes:

```bash
cd src-tauri
cargo fmt --check
cargo check
```

When Cargo is not on PATH:

```powershell
$env:PATH='C:\Users\AIUX\.cargo\bin;' + $env:PATH
```

Known environment note:

- In the managed sandbox, Vite may fail to write
  `node_modules\.vite-temp` with `EPERM`. If that happens, rerun `npm.cmd run
  test` or `npm.cmd run build` with the required filesystem permission.
