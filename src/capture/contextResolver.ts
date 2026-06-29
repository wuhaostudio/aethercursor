import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol, ContextType } from "../shared/context";
import type { AgentResult } from "../shared/result";

export type ContextResolution =
  | {
      readonly status: "ready";
      readonly context: ContextProtocol;
      readonly input_type: ContextType;
    }
  | {
      readonly status: "requires_capture";
      readonly reason: string;
    }
  | {
      readonly status: "error";
      readonly code: string;
      readonly message: string;
    };

export interface ResolveContextForAgentRequest {
  readonly context: ContextProtocol;
  readonly manifest: AgentManifest;
  readonly intent: Intent;
}

export function resolveContextForAgent(request: ResolveContextForAgentRequest): ContextResolution {
  const { context, manifest, intent } = request;
  const imageFirst = shouldPreferImageInput(manifest, intent);

  if (!imageFirst) {
    const textContext = resolveTextContext(context, manifest);

    if (textContext) {
      return textContext;
    }
  }

  const imageContext = resolveImageContext(context, manifest);

  if (imageContext) {
    return imageContext;
  }

  if (imageFirst) {
    const textContext = resolveTextContext(context, manifest);

    if (textContext) {
      return textContext;
    }
  }

  return {
    status: "error",
    code: "context_unavailable",
    message: `Cannot produce required context for ${manifest.name}.`
  };
}

export function createContextResolutionErrorResult(
  request: ResolveContextForAgentRequest,
  error: Extract<ContextResolution, { readonly status: "error" }>,
  startedAt: number,
  now: () => number = () => performance.now()
): AgentResult {
  return {
    result_id: `res_${request.context.context_id}_${request.intent}_${error.code}`,
    context_id: request.context.context_id,
    agent_id: request.manifest.id,
    intent: request.intent,
    status: "error",
    output_type: "error",
    output: {
      text: error.message
    },
    runtime: {
      execution_mode: request.manifest.execution_mode,
      model: null,
      duration_ms: Math.max(0, now() - startedAt)
    },
    privacy: {
      uploaded: false,
      stored_by_aethercursor: false
    },
    error: {
      code: error.code,
      message: error.message
    }
  };
}

function resolveTextContext(context: ContextProtocol, manifest: AgentManifest): ContextResolution | null {
  if (manifest.input_types.includes("text") && hasText(context.content.selected_text)) {
    return {
      status: "ready",
      input_type: "text",
      context: withInputType(context, "text", { imageRef: null })
    };
  }

  if (manifest.input_types.includes("ocr_text") && hasText(context.content.ocr_text)) {
    return {
      status: "ready",
      input_type: "ocr_text",
      context: withInputType(context, "ocr_text", { imageRef: null })
    };
  }

  return null;
}

function resolveImageContext(context: ContextProtocol, manifest: AgentManifest): ContextResolution | null {
  const acceptsImage = manifest.input_types.includes("image_region") || manifest.input_types.includes("screen_region");

  if (!acceptsImage) {
    return null;
  }

  if (hasText(context.content.image_ref)) {
    return {
      status: "ready",
      input_type: "image_region",
      context: withInputType(context, "image_region", { imageRef: context.content.image_ref })
    };
  }

  if (context.selection.bounds.width > 0 && context.selection.bounds.height > 0) {
    return {
      status: "requires_capture",
      reason: `${manifest.name} requires selected-region pixels.`
    };
  }

  return {
    status: "error",
    code: "invalid_selection",
    message: "Selected region has no capturable area."
  };
}

function shouldPreferImageInput(manifest: AgentManifest, intent: Intent): boolean {
  return (
    intent === "extract_text" ||
    manifest.capabilities.includes("image_understanding") ||
    manifest.capabilities.includes("table_extraction")
  );
}

function withInputType(
  context: ContextProtocol,
  type: ContextType,
  options: { readonly imageRef: string | null }
): ContextProtocol {
  if (context.selection.type === type && context.content.image_ref === options.imageRef) {
    return context;
  }

  return {
    ...context,
    selection: {
      ...context.selection,
      type
    },
    content: {
      ...context.content,
      image_ref: options.imageRef
    },
    metadata: {
      ...context.metadata,
      content_guess: inferContentGuess(type, context),
      confidence: Math.max(context.metadata.confidence, type === "image_region" ? 0.5 : 0.8)
    }
  };
}

function inferContentGuess(type: ContextType, context: ContextProtocol): readonly string[] {
  if (type === "text" || type === "ocr_text") {
    return ["text"];
  }

  if (type === "image_region") {
    return context.content.ocr_text || context.content.selected_text ? ["text", "image"] : ["image"];
  }

  return context.metadata.content_guess;
}

function hasText(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
