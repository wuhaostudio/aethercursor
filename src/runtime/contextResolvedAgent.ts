import { resolveContextForAgent, createContextResolutionErrorResult } from "../capture/contextResolver";
import { captureNativeRegion, type NativeCaptureArtifact } from "../capture/nativeCapture";
import { executePaddleOcrAgent } from "../ocr/paddleOcrAdapter";
import { executeAgentRuntime, type AgentRuntimeRequest } from "./agentRuntime";
import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";

const fallbackOcrManifest: AgentManifest = {
  id: "agent.local.ocr",
  name: "Local OCR",
  version: "0.1.0",
  description: "Extracts text from selected-region pixels for context fallback.",
  capabilities: ["extract_text"],
  input_types: ["screen_region", "image_region"],
  output_types: ["ocr_text", "plain_text"],
  execution_mode: "local",
  latency_level: "short",
  cost_level: "none",
  required_permissions: ["screen_region_read"],
  privacy_policy: {
    requires_upload: false,
    sensitive_data_allowed: true,
    user_confirmation: "never"
  }
};

export interface ExecuteContextResolvedAgentOptions {
  readonly manifest: AgentManifest;
  readonly context: ContextProtocol;
  readonly intent: Intent;
  readonly timeout_ms?: number;
  readonly startedAt?: number;
  readonly captureRegion?: (context: ContextProtocol) => Promise<NativeCaptureArtifact | null>;
  readonly executeOcr?: (request: AgentRuntimeRequest) => Promise<AgentResult>;
  readonly executeAgent?: (request: AgentRuntimeRequest) => Promise<AgentResult>;
  readonly onCaptureStart?: (reason: string) => void;
  readonly onCaptureSuccess?: (context: ContextProtocol, artifact: NativeCaptureArtifact) => void;
  readonly onCaptureFailure?: (message: string) => void;
  readonly onOcrStart?: (reason: string) => void;
  readonly onOcrSuccess?: (context: ContextProtocol, text: string) => void;
  readonly onOcrFailure?: (message: string) => void;
}

export async function executeContextResolvedAgent(
  options: ExecuteContextResolvedAgentOptions
): Promise<AgentResult> {
  const startedAt = options.startedAt ?? performance.now();
  let workingContext = options.context;
  let resolved = resolveContextForAgent({
    manifest: options.manifest,
    context: workingContext,
    intent: options.intent
  });

  if (resolved.status === "requires_capture") {
    options.onCaptureStart?.(resolved.reason);

    try {
      const artifact = await (options.captureRegion ?? captureNativeRegion)(workingContext);

      if (!artifact) {
        return createResolutionError(options, "capture_unavailable", "Selected-region capture is unavailable in this runtime.", startedAt);
      }

      workingContext = {
        ...workingContext,
        content: {
          ...workingContext.content,
          image_ref: artifact.image_ref
        }
      };

      options.onCaptureSuccess?.(workingContext, artifact);
      resolved = resolveContextForAgent({
        manifest: options.manifest,
        context: workingContext,
        intent: options.intent
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.onCaptureFailure?.(message);
      return createResolutionError(options, "capture_failed", message, startedAt);
    }
  }

  if (resolved.status === "requires_ocr") {
    options.onOcrStart?.(resolved.reason);

    const ocrResult = await (options.executeOcr ?? executePaddleOcrAgent)({
      manifest: fallbackOcrManifest,
      context: resolved.context,
      intent: "extract_text",
      timeout_ms: options.timeout_ms
    });

    if (ocrResult.status !== "success") {
      const message = ocrResult.error?.message ?? ocrResult.output.text;
      options.onOcrFailure?.(message);
      return createResolutionError(options, ocrResult.error?.code ?? "ocr_fallback_failed", message, startedAt);
    }

    const ocrText = typeof ocrResult.output.ocr_text === "string" ? ocrResult.output.ocr_text : ocrResult.output.text;

    if (!ocrText.trim()) {
      const message = "OCR fallback did not produce text.";
      options.onOcrFailure?.(message);
      return createResolutionError(options, "ocr_text_empty", message, startedAt);
    }

    workingContext = {
      ...resolved.context,
      content: {
        ...resolved.context.content,
        ocr_text: ocrText
      },
      metadata: {
        ...resolved.context.metadata,
        content_guess: ["text", "image"],
        confidence: Math.max(resolved.context.metadata.confidence, 0.8)
      }
    };

    options.onOcrSuccess?.(workingContext, ocrText);
    resolved = resolveContextForAgent({
      manifest: options.manifest,
      context: workingContext,
      intent: options.intent
    });
  }

  if (resolved.status === "error") {
    return createContextResolutionErrorResult(
      {
        manifest: options.manifest,
        context: options.context,
        intent: options.intent
      },
      resolved,
      startedAt
    );
  }

  if (resolved.status !== "ready") {
    return createResolutionError(options, "context_unavailable", resolved.reason, startedAt);
  }

  return (options.executeAgent ?? executeAgentRuntime)({
    manifest: options.manifest,
    context: resolved.context,
    intent: options.intent,
    timeout_ms: options.timeout_ms
  });
}

function createResolutionError(
  options: ExecuteContextResolvedAgentOptions,
  code: string,
  message: string,
  startedAt: number
): AgentResult {
  return createContextResolutionErrorResult(
    {
      manifest: options.manifest,
      context: options.context,
      intent: options.intent
    },
    {
      status: "error",
      code,
      message
    },
    startedAt
  );
}
