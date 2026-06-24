import { describe, expect, it } from "vitest";
import {
  handleKeyDown,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  initialInputSession,
  isValidSelection
} from "./inputEvents";
import { appendInputDebugLog, INPUT_LOG_LIMIT } from "./inputDebugLog";

describe("input event mapping", () => {
  it("ignores non-Escape keys", () => {
    const transition = handleKeyDown(initialInputSession, "Enter");
    expect(transition.event).toBeNull();
    expect(transition.logType).toBe("key.ignored");
  });

  it("maps Escape to cancel", () => {
    expect(handleKeyDown(initialInputSession, "Escape").event).toEqual({ type: "cancel" });
  });

  it("maps pointer sequence to cursor events", () => {
    const down = handlePointerDown(initialInputSession, { x: 10, y: 20 });
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

  it("ignores pointer up without prior pointer down", () => {
    const up = handlePointerUp(initialInputSession, { x: 80, y: 100 });

    expect(up.event).toBeNull();
    expect(up.logType).toBe("pointer.up.ignored");
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
