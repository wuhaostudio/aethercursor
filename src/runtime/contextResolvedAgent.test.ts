import { describe, expect, it } from "vitest";
import { sampleAgentManifest, sampleContext } from "../shared/fixtures";
import type { AgentResult } from "../shared/result";
import { executeContextResolvedAgent } from "./contextResolvedAgent";

describe("context resolved agent runtime", () => {
  it("runs text agents directly when selected text is available", async () => {
    let receivedText: string | null = null;

    const result = await executeContextResolvedAgent({
      manifest: sampleAgentManifest,
      context: {
        ...sampleContext,
        content: {
          selected_text: "Direct text",
          ocr_text: null,
          image_ref: "local://capture/ctx_001.bmp"
        }
      },
      intent: "explain",
      executeAgent: async (request) => {
        receivedText = request.context.content.selected_text;
        return createSuccessResult(request.context.context_id, request.manifest.id, request.intent);
      }
    });

    expect(result.status).toBe("success");
    expect(receivedText).toBe("Direct text");
  });

  it("captures and runs OCR fallback before text agents when no text is available", async () => {
    const events: string[] = [];
    let runtimeOcrText: string | null = null;

    const result = await executeContextResolvedAgent({
      manifest: sampleAgentManifest,
      context: {
        ...sampleContext,
        content: {
          selected_text: null,
          ocr_text: null,
          image_ref: null
        }
      },
      intent: "summarize",
      captureRegion: async (context) => {
        events.push(`capture:${context.context_id}`);
        return {
          context_id: context.context_id,
          image_ref: "local://capture/ctx_001.bmp",
          file_path: "C:\\Temp\\ctx_001.bmp",
          width: 520,
          height: 240
        };
      },
      executeOcr: async (request) => {
        events.push(`ocr:${request.context.content.image_ref}`);
        return createOcrResult(request.context.context_id, "OCR fallback text");
      },
      executeAgent: async (request) => {
        events.push(`agent:${request.context.selection.type}`);
        runtimeOcrText = request.context.content.ocr_text;
        return createSuccessResult(request.context.context_id, request.manifest.id, request.intent);
      }
    });

    expect(result.status).toBe("success");
    expect(events).toEqual([
      "capture:ctx_001",
      "ocr:local://capture/ctx_001.bmp",
      "agent:ocr_text"
    ]);
    expect(runtimeOcrText).toBe("OCR fallback text");
  });

  it("returns a structured error when OCR fallback fails", async () => {
    const result = await executeContextResolvedAgent({
      manifest: sampleAgentManifest,
      context: {
        ...sampleContext,
        content: {
          selected_text: null,
          ocr_text: null,
          image_ref: "local://capture/ctx_001.bmp"
        }
      },
      intent: "translate",
      executeOcr: async (request) => ({
        result_id: "res_ocr_error",
        context_id: request.context.context_id,
        agent_id: request.manifest.id,
        intent: request.intent,
        status: "error",
        output_type: "error",
        output: {
          text: "OCR failed"
        },
        runtime: {
          execution_mode: "local",
          model: null,
          duration_ms: 5
        },
        privacy: {
          uploaded: false,
          stored_by_aethercursor: false
        },
        error: {
          code: "ocr_failed",
          message: "OCR failed"
        }
      })
    });

    expect(result).toMatchObject({
      status: "error",
      error: {
        code: "ocr_failed",
        message: "OCR failed"
      },
      privacy: {
        uploaded: false
      }
    });
  });
});

function createSuccessResult(contextId: string, agentId: string, intent: AgentResult["intent"]): AgentResult {
  return {
    result_id: `res_${contextId}_${intent}_${agentId}`,
    context_id: contextId,
    agent_id: agentId,
    intent,
    status: "success",
    output_type: "markdown",
    output: {
      text: "Done"
    },
    runtime: {
      execution_mode: "cloud",
      model: "test",
      duration_ms: 1
    },
    privacy: {
      uploaded: true,
      stored_by_aethercursor: false
    },
    error: null
  };
}

function createOcrResult(contextId: string, text: string): AgentResult {
  return {
    result_id: `res_${contextId}_extract_text_agent.local.ocr`,
    context_id: contextId,
    agent_id: "agent.local.ocr",
    intent: "extract_text",
    status: "success",
    output_type: "ocr_text",
    output: {
      text,
      ocr_text: text
    },
    runtime: {
      execution_mode: "local",
      model: "test-ocr",
      duration_ms: 1
    },
    privacy: {
      uploaded: false,
      stored_by_aethercursor: false
    },
    error: null
  };
}
