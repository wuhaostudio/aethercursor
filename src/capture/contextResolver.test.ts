import { describe, expect, it } from "vitest";
import { sampleAgentManifest, sampleContext } from "../shared/fixtures";
import type { AgentManifest } from "../shared/agent";
import { createContextResolutionErrorResult, resolveContextForAgent } from "./contextResolver";

const visionManifest: AgentManifest = {
  ...sampleAgentManifest,
  id: "agent.cloud.vision",
  name: "Vision Agent",
  capabilities: ["image_understanding", "explain"],
  input_types: ["image_region", "screen_region"],
  execution_mode: "cloud"
};

describe("context resolver", () => {
  it("uses selected text before image capture for text agents", () => {
    const context = {
      ...sampleContext,
      selection: {
        ...sampleContext.selection,
        type: "screen_region" as const
      },
      content: {
        selected_text: "Direct selection",
        ocr_text: null,
        image_ref: "local://capture/ctx_001.bmp"
      }
    };

    const resolved = resolveContextForAgent({
      manifest: sampleAgentManifest,
      context,
      intent: "explain"
    });

    expect(resolved).toMatchObject({
      status: "ready",
      input_type: "text",
      context: {
        selection: {
          type: "text"
        },
        content: {
          selected_text: "Direct selection",
          image_ref: null
        }
      }
    });
  });

  it("uses OCR text for text agents when direct text is unavailable", () => {
    const resolved = resolveContextForAgent({
      manifest: sampleAgentManifest,
      context: {
        ...sampleContext,
        content: {
          selected_text: null,
          ocr_text: "OCR fallback",
          image_ref: "local://capture/ctx_001.bmp"
        }
      },
      intent: "summarize"
    });

    expect(resolved).toMatchObject({
      status: "ready",
      input_type: "ocr_text",
      context: {
        selection: {
          type: "ocr_text"
        },
        content: {
          ocr_text: "OCR fallback",
          image_ref: null
        }
      }
    });
  });

  it("requires capture for image-only agents without an image artifact", () => {
    const resolved = resolveContextForAgent({
      manifest: visionManifest,
      context: {
        ...sampleContext,
        content: {
          selected_text: null,
          ocr_text: null,
          image_ref: null
        }
      },
      intent: "explain"
    });

    expect(resolved).toEqual({
      status: "requires_capture",
      reason: "Vision Agent requires selected-region pixels."
    });
  });

  it("returns an image-region context when pixels are available", () => {
    const resolved = resolveContextForAgent({
      manifest: visionManifest,
      context: sampleContext,
      intent: "explain"
    });

    expect(resolved).toMatchObject({
      status: "ready",
      input_type: "image_region",
      context: {
        selection: {
          type: "image_region"
        },
        content: {
          image_ref: "local://capture/ctx_001.png"
        }
      }
    });
  });

  it("creates structured error results for unresolved context", () => {
    const error = createContextResolutionErrorResult(
      {
        manifest: sampleAgentManifest,
        context: sampleContext,
        intent: "explain"
      },
      {
        status: "error",
        code: "context_unavailable",
        message: "No text available."
      },
      10,
      () => 25
    );

    expect(error).toMatchObject({
      status: "error",
      output_type: "error",
      error: {
        code: "context_unavailable",
        message: "No text available."
      },
      runtime: {
        duration_ms: 15
      },
      privacy: {
        uploaded: false
      }
    });
  });
});
