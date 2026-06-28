import { describe, expect, it } from "vitest";
import { createLassoBounds, isLassoPathValid } from "./lassoGeometry";

describe("lasso geometry", () => {
  it("derives bounds from arbitrary path points", () => {
    expect(
      createLassoBounds([
        { x: 30, y: 40 },
        { x: 10, y: 80 },
        { x: 70, y: 20 }
      ])
    ).toEqual({
      left: 10,
      top: 20,
      width: 60,
      height: 60
    });
  });

  it("requires enough points and a minimum bounding area", () => {
    expect(isLassoPathValid([{ x: 0, y: 0 }, { x: 20, y: 20 }])).toBe(false);
    expect(isLassoPathValid([{ x: 0, y: 0 }, { x: 4, y: 6 }, { x: 7, y: 4 }])).toBe(false);
    expect(isLassoPathValid([{ x: 0, y: 0 }, { x: 12, y: 20 }, { x: 20, y: 4 }])).toBe(true);
  });
});
