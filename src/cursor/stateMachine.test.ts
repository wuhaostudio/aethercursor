import { describe, expect, it } from "vitest";
import { cursorReducer, initialCursorState, type CursorEvent, type CursorState } from "./stateMachine";

function reduceEvents(events: readonly CursorEvent[], initial: CursorState = initialCursorState): CursorState {
  return events.reduce(cursorReducer, initial);
}

describe("cursor state machine", () => {
  it("follows the primary region-selection path", () => {
    const state = reduceEvents([
      { type: "activation.pressed" },
      { type: "pointer.down", x: 10, y: 20 },
      { type: "pointer.move", x: 100, y: 120 },
      { type: "pointer.up", x: 100, y: 120, valid_selection: true },
      { type: "context.resolved" }
    ]);

    expect(state).toMatchObject({
      status: "action_pending",
      selection: {
        start_x: 10,
        start_y: 20,
        current_x: 100,
        current_y: 120
      }
    });
  });

  it("returns to normal from any non-normal state when cancelled", () => {
    const states: readonly CursorState[] = [
      { status: "armed" },
      { status: "inspecting" },
      { status: "selecting" },
      { status: "resolving" },
      { status: "action_pending" },
      { status: "confirming" },
      { status: "thinking" },
      { status: "result" },
      { status: "error" }
    ];

    expect(states.map((state) => cursorReducer(state, { type: "cancel" }))).toEqual(
      states.map(() => initialCursorState)
    );
  });

  it("keeps cloud execution behind explicit permission", () => {
    const confirming = reduceEvents([
      { type: "activation.pressed" },
      { type: "pointer.down", x: 10, y: 20 },
      { type: "pointer.up", x: 100, y: 120, valid_selection: true },
      { type: "context.resolved" },
      {
        type: "action.selected",
        intent: "explain",
        agent_id: "agent.text.explainer.basic",
        requires_confirmation: true
      }
    ]);

    expect(confirming.status).toBe("confirming");
    expect(cursorReducer(confirming, { type: "agent.started" }).status).toBe("confirming");
    expect(cursorReducer(confirming, { type: "activation.released" }).status).toBe("confirming");
    expect(cursorReducer(confirming, { type: "permission.granted" }).status).toBe("thinking");
    expect(cursorReducer(confirming, { type: "permission.denied" }).status).toBe("action_pending");
  });

  it("runs local actions without permission confirmation", () => {
    const state = reduceEvents([
      { type: "activation.pressed" },
      { type: "pointer.down", x: 0, y: 0 },
      { type: "pointer.up", x: 40, y: 40, valid_selection: true },
      { type: "context.resolved" },
      {
        type: "action.selected",
        intent: "extract_text",
        agent_id: "agent.local.ocr",
        requires_confirmation: false
      }
    ]);

    expect(state).toMatchObject({
      status: "thinking",
      intent: "extract_text",
      agent_id: "agent.local.ocr"
    });
  });

  it("does not crash or advance on illegal events", () => {
    const state = cursorReducer(initialCursorState, {
      type: "agent.succeeded",
      result_id: "res_001"
    });

    expect(state).toEqual(initialCursorState);
  });

  it("returns to armed when selection is too small", () => {
    const state = reduceEvents([
      { type: "activation.pressed" },
      { type: "selection.drag.started", x: 10, y: 20 },
      { type: "selection.drag.completed", x: 12, y: 22, valid_selection: false }
    ]);

    expect(state).toEqual({ status: "armed" });
  });

  it("moves blocked policy decisions to error without starting an agent", () => {
    const state = reduceEvents([
      { type: "activation.pressed" },
      { type: "pointer.down", x: 10, y: 20 },
      { type: "pointer.up", x: 100, y: 120, valid_selection: true },
      { type: "context.resolved" },
      { type: "policy.blocked", message: "Sensitive content cannot be uploaded." }
    ]);

    expect(state).toMatchObject({
      status: "error",
      error: "Sensitive content cannot be uploaded.",
      selection: {
        start_x: 10,
        start_y: 20,
        current_x: 100,
        current_y: 120
      }
    });
  });

  it("returns from result to action pending for switch agent", () => {
    const state = cursorReducer(
      {
        status: "result",
        result_id: "res_001",
        selection: {
          start_x: 10,
          start_y: 20,
          current_x: 100,
          current_y: 120
        }
      },
      { type: "agent.switch_requested" }
    );

    expect(state).toMatchObject({
      status: "action_pending",
      selection: {
        start_x: 10,
        start_y: 20,
        current_x: 100,
        current_y: 120
      }
    });
  });
});
