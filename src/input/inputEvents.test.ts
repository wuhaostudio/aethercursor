import { describe, expect, it } from "vitest";
import {
  handleKeyDown,
  handleKeyUp,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  initialInputSession,
  isValidSelection
} from "./inputEvents";
import { appendInputDebugLog, INPUT_LOG_LIMIT } from "./inputDebugLog";

describe("input event mapping", () => {
  it("maps Alt keydown and keyup to activation events", () => {
    const pressed = handleKeyDown(initialInputSession, "Alt");
    const released = handleKeyUp(pressed.session, "Alt");

    expect(pressed.event).toEqual({ type: "activation.pressed" });
    expect(pressed.session.altActive).toBe(true);
    expect(released.event).toEqual({ type: "activation.released" });
    expect(released.session.altActive).toBe(false);
  });

  it("maps Escape to cancel", () => {
    expect(handleKeyDown(initialInputSession, "Escape").event).toEqual({ type: "cancel" });
  });

  it("ignores pointer events when Alt is not active", () => {
    const transition = handlePointerDown(initialInputSession, { x: 10, y: 20 });

    expect(transition.event).toBeNull();
    expect(transition.logType).toBe("pointer.down.ignored");
  });

  it("maps Alt pointer sequence to cursor events", () => {
    const armed = handleKeyDown(initialInputSession, "Alt").session;
    const down = handlePointerDown(armed, { x: 10, y: 20 });
    const move = handlePointerMove(down.session, { x: 40, y: 60 });
    const up = handlePointerUp(move.session, { x: 80, y: 100 });

    expect(down.event).toEqual({ type: "pointer.down", x: 10, y: 20 });
    expect(move.event).toEqual({ type: "pointer.move", x: 40, y: 60 });
    expect(up.event).toEqual({ type: "pointer.up", x: 80, y: 100, valid_selection: true });
  });

  it("marks small drags as invalid selections", () => {
    expect(isValidSelection({ x: 10, y: 10 }, { x: 15, y: 40 })).toBe(false);
    expect(isValidSelection({ x: 10, y: 10 }, { x: 40, y: 15 })).toBe(false);
    expect(isValidSelection({ x: 10, y: 10 }, { x: 18, y: 18 })).toBe(true);
  });
});

describe("input debug log", () => {
  it("keeps only the latest entries", () => {
    const entries = Array.from({ length: INPUT_LOG_LIMIT + 3 }, (_, index) => ({
      type: "event",
      detail: String(index)
    })).reduce(appendInputDebugLog, []);

    expect(entries).toHaveLength(INPUT_LOG_LIMIT);
    expect(entries[0].detail).toBe(String(INPUT_LOG_LIMIT + 2));
  });
});
