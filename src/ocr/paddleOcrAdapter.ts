import { getOcrServiceConfig, isOcrServiceAvailable } from "./ocrServiceConfig";
import { readCaptureFileAsBlob } from "../capture/nativeCapture";
import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";

export interface OcrRecognitionResult {
  readonly text: string;
  readonly confidence: number;
}

export interface PaddleOcrResponse {
  readonly status: "success" | "error";
  readonly results?: readonly OcrRecognitionResult[];
  readonly message?: string;
}

export async function recognizeOcrFromImage(
  imageData: Blob,
  options?: {
    endpoint?: string;
    api_key?: string;
    timeout_ms?: number;
    fetchImpl?: typeof fetch;
  }
): Promise<readonly OcrRecognitionResult[]> {
  const config = getOcrServiceConfig();
  const endpoint = options?.endpoint ?? config.endpoint;
  const api_key = options?.api_key ?? config.api_key;
  const timeout_ms = options?.timeout_ms ?? config.timeout_ms;
  const fetchImpl = options?.fetchImpl ?? fetch;

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeout_ms);

  try {
    const formData = new FormData();
    formData.append("image", imageData, "capture.bmp");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "X-API-Key": api_key
      },
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OCR service returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as PaddleOcrResponse;

    if (data.status === "error") {
      throw new Error(data.message ?? "OCR service error");
    }

    return data.results ?? [];
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function extractOcrText(results: readonly OcrRecognitionResult[]): string {
  return results.map((r) => r.text).join("\n");
}

export async function executePaddleOcrAgent(
  request: {
    readonly manifest: AgentManifest;
    readonly context: ContextProtocol;
    readonly intent: Intent;
    readonly now?: () => number;
  },
  options?: {
    fetchImpl?: typeof fetch;
    readImageFile?: (ref: string) => Promise<Blob | null>;
  }
): Promise<AgentResult> {
  const startedAt = request.now?.() ?? performance.now();

  if (!isOcrServiceAvailable()) {
    return createOcrErrorResult(request, "error", "ocr_service_disabled", "OCR service is not configured.", startedAt);
  }

  const imageRef = request.context.content.image_ref;

  if (!imageRef) {
    return createOcrErrorResult(request, "error", "no_image", "没有可用于OCR的图像。", startedAt);
  }

  try {
    const imageBlob = options?.readImageFile
      ? await options.readImageFile(imageRef)
      : await readImageFromRef(imageRef);

    if (!imageBlob) {
      return createOcrErrorResult(request, "error", "image_read_failed", "Failed to read image file.", startedAt);
    }

    const results = await recognizeOcrFromImage(imageBlob, {
      fetchImpl: options?.fetchImpl
    });

    const text = extractOcrText(results);

    return createOcrSuccessResult(request, text, results.length, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createOcrErrorResult(request, "error", "ocr_failed", message, startedAt);
  }
}

async function readImageFromRef(imageRef: string): Promise<Blob | null> {
  const contextId = extractContextIdFromImageRef(imageRef);

  if (!contextId) {
    return null;
  }

  return readCaptureFileAsBlob(contextId);
}

function extractContextIdFromImageRef(imageRef: string): string | null {
  const match = imageRef.match(/^local:\/\/capture\/([a-zA-Z0-9_-]+)\.bmp$/);

  if (match) {
    return match[1];
  }

  const matchPng = imageRef.match(/^local:\/\/capture\/([a-zA-Z0-9_-]+)\.png$/);

  if (matchPng) {
    return matchPng[1];
  }

  return null;
}

function createOcrSuccessResult(
  request: {
    readonly manifest: AgentManifest;
    readonly context: ContextProtocol;
    readonly intent: Intent;
  },
  text: string,
  lineCount: number,
  startedAt: number
): AgentResult {
  const finishedAt = performance.now();

  return {
    result_id: `res_${request.context.context_id}_${request.intent}_${request.manifest.id}`,
    context_id: request.context.context_id,
    agent_id: request.manifest.id,
    intent: request.intent,
    status: "success",
    output_type: "ocr_text",
    output: {
      text,
      ocr_text: text,
      explanation: `Extracted ${lineCount} line(s) of text from the selected region.`
    },
    runtime: {
      execution_mode: "local",
      model: "paddleocr-local",
      duration_ms: Math.max(0, finishedAt - startedAt)
    },
    privacy: {
      uploaded: false,
      stored_by_aethercursor: false
    },
    error: null
  };
}

function createOcrErrorResult(
  request: {
    readonly manifest: AgentManifest;
    readonly context: ContextProtocol;
    readonly intent: Intent;
  },
  status: AgentResult["status"],
  code: string,
  message: string,
  startedAt: number
): AgentResult {
  const finishedAt = performance.now();

  return {
    result_id: `res_${request.context.context_id}_${request.intent}_${code}`,
    context_id: request.context.context_id,
    agent_id: request.manifest.id,
    intent: request.intent,
    status,
    output_type: "error",
    output: {
      text: message
    },
    runtime: {
      execution_mode: "local",
      model: null,
      duration_ms: Math.max(0, finishedAt - startedAt)
    },
    privacy: {
      uploaded: false,
      stored_by_aethercursor: false
    },
    error: {
      code,
      message
    }
  };
}
