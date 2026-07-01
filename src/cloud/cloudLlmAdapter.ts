import { getCloudServiceConfig, isCloudServiceAvailable } from "./cloudServiceConfig";
import { readCaptureFile } from "../capture/nativeCapture";
import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";

export interface CloudLlmAdapterOptions {
  readonly fetchImpl?: typeof fetch;
  readonly getSourceText?: (context: ContextProtocol) => string;
  readonly readImageAsDataUrl?: (context: ContextProtocol) => Promise<string | null>;
  readonly now?: () => number;
}

interface ChatMessage {
  readonly role: "user";
  readonly content: string | readonly ChatContentPart[];
}

type ChatContentPart =
  | {
      readonly type: "text";
      readonly text: string;
    }
  | {
      readonly type: "image_url";
      readonly image_url: {
        readonly url: string;
      };
    };

interface TableOutput {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
}

export async function executeCloudLlmAgent(
  request: {
    readonly manifest: AgentManifest;
    readonly context: ContextProtocol;
    readonly intent: Intent;
  },
  options?: CloudLlmAdapterOptions
): Promise<AgentResult> {
  const startedAt = options?.now?.() ?? performance.now();
  const config = getCloudServiceConfig();

  if (!isCloudServiceAvailable()) {
    return createCloudErrorResult(request, "error", "cloud_unavailable", "云端服务未配置。", startedAt);
  }

  const sourceText = options?.getSourceText ? options.getSourceText(request.context) : getSourceText(request.context);
  const needsImage = shouldUseImageInput(request.manifest);
  let imageDataUrl: string | null = null;

  if (needsImage) {
    imageDataUrl = await resolveImageDataUrl(request.context, options);

    if (!imageDataUrl) {
      return createCloudErrorResult(request, "error", "image_unavailable", "No uploadable image is available for cloud vision processing.", startedAt);
    }
  } else if (!sourceText || sourceText.trim().length === 0) {
    return createCloudErrorResult(request, "error", "no_source_text", "No source text available for processing.", startedAt);
  }

  try {
    const prompt = buildPrompt(request, sourceText);
    const messages = buildMessages(prompt, imageDataUrl);
    const response = await callLlmApi(messages, config, options);
    return createCloudSuccessResult(request, response, config.model, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createCloudErrorResult(request, "error", "cloud_api_failed", message, startedAt);
  }
}

function getSourceText(context: ContextProtocol): string {
  return context.content.selected_text ?? context.content.ocr_text ?? "";
}

function shouldUseImageInput(manifest: AgentManifest): boolean {
  return manifest.capabilities.includes("image_understanding") || manifest.capabilities.includes("table_extraction");
}

async function resolveImageDataUrl(
  context: ContextProtocol,
  options?: CloudLlmAdapterOptions
): Promise<string | null> {
  const imageRef = context.content.image_ref;

  if (!imageRef) {
    return null;
  }

  if (imageRef.startsWith("data:image/")) {
    return imageRef;
  }

  if (options?.readImageAsDataUrl) {
    return options.readImageAsDataUrl(context);
  }

  const contextId = extractContextIdFromImageRef(imageRef);

  if (!contextId) {
    return null;
  }

  const captureFile = await readCaptureFile(contextId);

  if (!captureFile) {
    return null;
  }

  return `data:${getMimeTypeFromImageRef(imageRef)};base64,${captureFile.data_base64}`;
}

function extractContextIdFromImageRef(imageRef: string): string | null {
  const match = imageRef.match(/^local:\/\/capture\/([a-zA-Z0-9_-]+)\.(?:bmp|png|jpg|jpeg)$/);

  return match?.[1] ?? null;
}

function getMimeTypeFromImageRef(imageRef: string): string {
  if (imageRef.endsWith(".png")) {
    return "image/png";
  }

  if (imageRef.endsWith(".jpg") || imageRef.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "image/bmp";
}

function buildPrompt(
  request: {
    readonly manifest: AgentManifest;
    readonly intent: Intent;
  },
  sourceText: string
): string {
  if (request.manifest.capabilities.includes("table_extraction")) {
    return [
      "Extract the table from the selected image.",
      "Return only JSON with this shape: {\"columns\":[\"Column\"],\"rows\":[[\"Cell\"]]}.",
      "Use strings for every cell. If no table is present, return {\"columns\":[],\"rows\":[]}."
    ].join("\n");
  }

  if (request.manifest.capabilities.includes("image_understanding")) {
    return "Analyze the selected image region. Describe visible content, notable UI/text, and any likely user-relevant meaning concisely.";
  }

  const intent = request.intent;

  switch (intent) {
    case "explain":
      return `Explain the following text clearly and concisely:\n\n${sourceText}`;
    case "translate":
      return `Translate the following text to English. If it is already in English, translate to Chinese:\n\n${sourceText}`;
    case "summarize":
      return `Summarize the following text in 2-3 sentences:\n\n${sourceText}`;
    case "extract_text":
      return sourceText;
    default:
      return sourceText;
  }
}

function buildMessages(prompt: string, imageDataUrl: string | null): readonly ChatMessage[] {
  if (!imageDataUrl) {
    return [
      {
        role: "user",
        content: prompt
      }
    ];
  }

  return [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt
        },
        {
          type: "image_url",
          image_url: {
            url: imageDataUrl
          }
        }
      ]
    }
  ];
}

async function callLlmApi(
  messages: readonly ChatMessage[],
  config: ReturnType<typeof getCloudServiceConfig>,
  options?: CloudLlmAdapterOptions
): Promise<string> {
  const fetchImpl = options?.fetchImpl ?? fetch;

  const requestBody = {
    model: config.model,
    messages,
    temperature: 0.3,
    max_tokens: 1000
  };

  const response = await fetchImpl(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.api_key}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const choices = data.choices as Array<Record<string, unknown>> | undefined;

  if (!choices || choices.length === 0) {
    throw new Error("No choices in cloud API response.");
  }

  const message = choices[0].message as Record<string, unknown> | undefined;
  const content = message?.content as string | undefined;

  if (!content) {
    throw new Error("No content in cloud API response.");
  }

  return content.trim();
}

function createCloudSuccessResult(
  request: {
    readonly manifest: AgentManifest;
    readonly context: ContextProtocol;
    readonly intent: Intent;
  },
  text: string,
  model: string,
  startedAt: number
): AgentResult {
  const finishedAt = performance.now();
  const output = buildOutput(request.intent, text);

  return {
    result_id: `res_${request.context.context_id}_${request.intent}_${request.manifest.id}`,
    context_id: request.context.context_id,
    agent_id: request.manifest.id,
    intent: request.intent,
    status: "success",
    output_type: request.manifest.output_types[0],
    output,
    runtime: {
      execution_mode: request.manifest.execution_mode,
      model,
      duration_ms: Math.max(0, finishedAt - startedAt)
    },
    privacy: {
      uploaded: request.manifest.privacy_policy.requires_upload,
      stored_by_aethercursor: false
    },
    error: null
  };
}

function buildOutput(intent: Intent, text: string): {
  text: string;
  translation?: string;
  explanation?: string;
  summary?: string;
  table?: TableOutput;
} {
  const base = { text };

  const table = parseTableOutput(text);

  if (table) {
    return {
      ...base,
      table
    };
  }

  switch (intent) {
    case "translate":
      return { ...base, translation: text };
    case "explain":
      return { ...base, explanation: text };
    case "summarize":
      return { ...base, summary: text };
    default:
      return base;
  }
}

function parseTableOutput(text: string): TableOutput | null {
  const jsonText = extractJsonObject(text);

  if (!jsonText) {
    return null;
  }

  try {
    const value = JSON.parse(jsonText) as unknown;

    if (!isTableOutput(value)) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): string | null {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function isTableOutput(value: unknown): value is TableOutput {
  if (typeof value !== "object" || value === null || !("columns" in value) || !("rows" in value)) {
    return false;
  }

  const table = value as Record<string, unknown>;

  return (
    Array.isArray(table.columns) &&
    table.columns.every((column) => typeof column === "string") &&
    Array.isArray(table.rows) &&
    table.rows.every(
      (row) => Array.isArray(row) && row.every((cell) => typeof cell === "string")
    )
  );
}

function createCloudErrorResult(
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
      execution_mode: request.manifest.execution_mode,
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
