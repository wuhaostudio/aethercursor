import { describe, expect, it } from "vitest";
import { isInteractivePointerTarget } from "./pointerTargets";

function targetWithClosest(match: boolean): EventTarget {
  return {
    closest: () => (match ? {} : null)
  } as unknown as EventTarget;
}

describe("pointer target filtering", () => {
  it("does not ignore plain event targets", () => {
    expect(isInteractivePointerTarget({} as EventTarget)).toBe(false);
    expect(isInteractivePointerTarget(null)).toBe(false);
  });

  it("ignores targets inside interactive overlay controls", () => {
    expect(isInteractivePointerTarget(targetWithClosest(true))).toBe(true);
  });

  it("allows pointer targets outside interactive overlay controls", () => {
    expect(isInteractivePointerTarget(targetWithClosest(false))).toBe(false);
  });
});
