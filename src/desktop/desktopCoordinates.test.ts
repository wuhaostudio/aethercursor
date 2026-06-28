import { describe, expect, it } from "vitest";
import { toDesktopSelectionCoordinates, toOverlayLogicalPoint } from "./desktopCoordinates";

describe("desktop coordinate conversion", () => {
  it("keeps browser coordinates unchanged without desktop metrics", () => {
    const result = toDesktopSelectionCoordinates(
      { start_x: 10, start_y: 20, current_x: 50, current_y: 80 },
      undefined,
      null
    );

    expect(result.selection).toEqual({ start_x: 10, start_y: 20, current_x: 50, current_y: 80 });
  });

  it("maps overlay logical selection coordinates to desktop physical coordinates", () => {
    const result = toDesktopSelectionCoordinates(
      { start_x: 10, start_y: 20, current_x: 50, current_y: 80 },
      {
        mode: "lasso",
        bounds: { x: 10, y: 20, width: 40, height: 60 },
        path: [
          { x: 10, y: 20 },
          { x: 50, y: 80 }
        ]
      },
      {
        origin_x: -1920,
        origin_y: 0,
        width: 1920,
        height: 1080,
        scale_factor: 1.5
      }
    );

    expect(result).toEqual({
      selection: {
        start_x: -1905,
        start_y: 30,
        current_x: -1845,
        current_y: 120
      },
      selectionShape: {
        mode: "lasso",
        bounds: {
          x: -1905,
          y: 30,
          width: 60,
          height: 90
        },
        path: [
          { x: -1905, y: 30 },
          { x: -1845, y: 120 }
        ]
      },
      displayScale: 1.5
    });
  });

  it("maps desktop cursor coordinates to overlay logical coordinates", () => {
    expect(
      toOverlayLogicalPoint(-1845, 120, {
        origin_x: -1920,
        origin_y: 0,
        width: 1920,
        height: 1080,
        scale_factor: 1.5
      })
    ).toEqual({ x: 50, y: 80 });
  });
});
