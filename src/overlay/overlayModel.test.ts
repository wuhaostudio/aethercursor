import { describe, expect, it } from "vitest";
import { createOverlayViewModel, toSelectionBox } from "./overlayModel";
import { overlayTokens } from "./tokens";

describe("overlay model", () => {
  it("keeps normal state invisible", () => {
    expect(createOverlayViewModel({ status: "normal" })).toMatchObject({
      visible: false,
      selectionBox: null,
      showCursorRing: false
    });
  });

  it("shows the armed cursor ring", () => {
    expect(createOverlayViewModel({ status: "armed" })).toMatchObject({
      visible: true,
      label: "已激活",
      showCursorRing: true
    });
  });

  it("shows smart cursor focus selection from the shape model", () => {
    expect(
      createOverlayViewModel({
        status: "smart_cursor",
        selection_shape: {
          mode: "focus",
          bounds: {
            x: 100,
            y: 72.5,
            width: 20,
            height: 15
          }
        }
      })
    ).toMatchObject({
      visible: true,
      label: "智能光标",
      showCursorRing: true,
      showTargetHint: false,
      selectionMode: "focus",
      selectionBox: {
        left: 100,
        top: 72.5,
        width: 20,
        height: 15
      }
    });
  });

  it("normalizes selection rectangles from any drag direction", () => {
    expect(
      toSelectionBox({
        start_x: 200,
        start_y: 140,
        current_x: 80,
        current_y: 40
      })
    ).toEqual({
      left: 80,
      top: 40,
      width: 120,
      height: 100
    });
  });

  it("uses restrained overlay radius", () => {
    expect(overlayTokens.radiusPx).toBeLessThanOrEqual(8);
  });
});
