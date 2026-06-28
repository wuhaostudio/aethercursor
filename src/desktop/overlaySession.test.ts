import { describe, expect, it } from "vitest";
import { shouldResetOverlaySession } from "./overlaySession";

describe("overlay session cleanup", () => {
  const emptySession = {
    hasContext: false,
    hasResult: false,
    hasPendingAction: false,
    moreAgentsOpen: false,
    nativeCapturePath: null,
    nativeCapturePending: false
  };

  it("does not reset during an active cursor session", () => {
    expect(
      shouldResetOverlaySession("action_pending", {
        ...emptySession,
        hasContext: true
      })
    ).toBe(false);
  });

  it("does not reset an already empty normal session", () => {
    expect(shouldResetOverlaySession("normal", emptySession)).toBe(false);
  });

  it("resets transient context and result state when returning to normal", () => {
    expect(
      shouldResetOverlaySession("normal", {
        ...emptySession,
        hasContext: true,
        hasResult: true,
        hasPendingAction: true,
        moreAgentsOpen: true,
        nativeCapturePath: "C:\\temp\\capture.bmp",
        nativeCapturePending: true
      })
    ).toBe(true);
  });
});
