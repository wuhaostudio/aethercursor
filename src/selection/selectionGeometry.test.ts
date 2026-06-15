import { describe, expect, it } from "vitest";
import {
  createSelectionRegion,
  isRegionRenderable,
  isRegionTooSmall,
  isSelectionValid,
  MIN_SELECTION_SIZE
} from "./selectionGeometry";

describe("selection geometry", () => {
  it("normalizes regions from every drag direction", () => {
    expect(createSelectionRegion({ x: 180, y: 140 }, { x: 80, y: 40 })).toEqual({
      left: 80,
      top: 40,
      width: 100,
      height: 100
    });
  });

  it("validates selections with the shared minimum size", () => {
    expect(isSelectionValid({ x: 10, y: 10 }, { x: 10 + MIN_SELECTION_SIZE, y: 18 })).toBe(true);
    expect(isSelectionValid({ x: 10, y: 10 }, { x: 17, y: 18 })).toBe(false);
  });

  it("detects renderable and too-small regions separately", () => {
    expect(isRegionRenderable({ left: 0, top: 0, width: 0, height: 0 })).toBe(false);
    expect(isRegionRenderable({ left: 0, top: 0, width: 0, height: 12 })).toBe(true);
    expect(isRegionTooSmall({ left: 0, top: 0, width: 6, height: 12 })).toBe(true);
    expect(isRegionTooSmall({ left: 0, top: 0, width: 12, height: 12 })).toBe(false);
  });
});
