import { describe, expect, it } from "vitest";
import { validateContextProtocol } from "../shared/context";
import {
  createCaptureCleanupRequest,
  createContextFromSelection,
  createLocalCaptureImageRef
} from "./contextCapture";

const selection = {
  start_x: 120,
  start_y: 300,
  current_x: 640,
  current_y: 540
};

describe("context capture", () => {
  it("creates a valid context protocol object from a selected region", () => {
    const context = createContextFromSelection({
      selection,
      displayScale: 1.25,
      now: () => new Date("2026-06-13T08:00:00.000Z"),
      createContextId: () => "ctx_test"
    });

    expect(validateContextProtocol(context)).toEqual({ valid: true, issues: [] });
    expect(context).toMatchObject({
      context_id: "ctx_test",
      created_at: "2026-06-13T08:00:00.000Z",
      selection: {
        type: "screen_region",
        bounds: {
          x: 120,
          y: 300,
          width: 520,
          height: 240
        },
        display_scale: 1.25
      },
      content: {
        selected_text: null,
        ocr_text: null,
        image_ref: "local://capture/ctx_test.png"
      },
      privacy: {
        cloud_allowed: false,
        contains_sensitive_guess: false,
        user_confirmed_upload: false
      }
    });
  });

  it("normalizes selections dragged in reverse directions", () => {
    const context = createContextFromSelection({
      selection: {
        start_x: 640,
        start_y: 540,
        current_x: 120,
        current_y: 300
      },
      createContextId: () => "ctx_reverse"
    });

    expect(context.selection.bounds).toEqual({
      x: 120,
      y: 300,
      width: 520,
      height: 240
    });
  });

  it("uses direct text signals when capture preprocessing provides them", () => {
    const context = createContextFromSelection({
      selection,
      selectedText: "Selected text",
      ocrText: "OCR text",
      createContextId: () => "ctx_text"
    });

    expect(context.content.selected_text).toBe("Selected text");
    expect(context.content.ocr_text).toBe("OCR text");
    expect(context.metadata.content_guess).toEqual(["text", "image"]);
    expect(context.metadata.confidence).toBe(0.72);
  });

  it("records selection shape details when provided", () => {
    const context = createContextFromSelection({
      selection,
      selectionShape: {
        mode: "lasso",
        bounds: {
          x: 120,
          y: 300,
          width: 520,
          height: 240
        },
        path: [
          { x: 120, y: 300 },
          { x: 640, y: 540 },
          { x: 120, y: 540 }
        ],
        confidence: 1
      },
      createContextId: () => "ctx_lasso"
    });

    expect(context.selection.shape).toBe("lasso");
    expect(context.selection.path).toEqual([
      { x: 120, y: 300 },
      { x: 640, y: 540 },
      { x: 120, y: 540 }
    ]);
    expect(validateContextProtocol(context)).toEqual({ valid: true, issues: [] });
  });

  it("creates cleanup requests for local image refs", () => {
    const context = createContextFromSelection({
      selection,
      createContextId: () => "ctx_cleanup"
    });

    expect(createLocalCaptureImageRef("ctx_cleanup")).toBe("local://capture/ctx_cleanup.png");
    expect(createCaptureCleanupRequest(context)).toEqual({
      image_ref: "local://capture/ctx_cleanup.png"
    });
  });
});
