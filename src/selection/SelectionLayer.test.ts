import { describe, expect, it } from "vitest";
import { createSelectionLayerClassName, toRelativePathPoints } from "./SelectionLayer";

describe("SelectionLayer", () => {
  it("maps selection modes to stable visual classes", () => {
    expect(createSelectionLayerClassName({ mode: "focus", active: false, small: false })).toBe(
      "selection-layer selection-layer--focus"
    );
    expect(createSelectionLayerClassName({ mode: "rect", active: false, small: false })).toBe(
      "selection-layer selection-layer--rect"
    );
    expect(createSelectionLayerClassName({ mode: "lasso", active: false, small: false })).toBe(
      "selection-layer selection-layer--lasso"
    );
    expect(createSelectionLayerClassName({ mode: "object_snap", active: false, small: false })).toBe(
      "selection-layer selection-layer--object_snap"
    );
  });

  it("keeps activity and small-region modifiers independent from mode", () => {
    expect(createSelectionLayerClassName({ mode: "focus", active: true, small: true })).toBe(
      "selection-layer selection-layer--focus selection-layer--active selection-layer--small"
    );
  });

  it("converts absolute lasso points into region-relative svg points", () => {
    expect(
      toRelativePathPoints(
        [
          { x: 110, y: 220 },
          { x: 130, y: 260 }
        ],
        { left: 100, top: 200, width: 40, height: 80 }
      )
    ).toBe("10,20 30,60");
  });
});
