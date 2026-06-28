import { describe, expect, it } from "vitest";
import { positionFloatingNearSelection } from "./floatingPosition";

describe("floating overlay positioning", () => {
  it("places floating UI below the selection when there is room", () => {
    expect(
      positionFloatingNearSelection(
        { left: 100, top: 80, width: 40, height: 20 },
        { width: 200, height: 120 },
        { width: 800, height: 600 }
      )
    ).toEqual({
      left: "100px",
      top: "112px"
    });
  });

  it("places floating UI above the selection near the bottom edge", () => {
    expect(
      positionFloatingNearSelection(
        { left: 100, top: 540, width: 40, height: 20 },
        { width: 200, height: 120 },
        { width: 800, height: 600 }
      )
    ).toEqual({
      left: "100px",
      top: "408px"
    });
  });

  it("clamps floating UI inside the viewport", () => {
    expect(
      positionFloatingNearSelection(
        { left: 780, top: 590, width: 20, height: 20 },
        { width: 200, height: 120 },
        { width: 800, height: 600 }
      )
    ).toEqual({
      left: "584px",
      top: "458px"
    });
  });

  it("uses a stable fallback position without a selection box", () => {
    expect(positionFloatingNearSelection(null, { width: 200, height: 120 }, { width: 800, height: 600 })).toEqual({
      left: "16px",
      top: "64px"
    });
  });
});
