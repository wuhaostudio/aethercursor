import { getCloudServiceConfig, isCloudServiceAvailable } from "./cloudServiceConfig";
import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";

export interface CloudLlmAdapterOptions {
  readonly fetchImpl?: typeof fetch;
  readonly getSourceText?: (context: ContextProtocol) => string;
  readonly now?: () => number;
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

  const sourceText = options?.getSourceText
    ? options.getSourceText(request.context)
    : getSourceText(request.context);

  if (!sourceText || sourceText.trim().length === 0) {
    return createCloudErrorResult(request, "error", "no_source_text", "No source text available for processing.", startedAt);
  }

  try {
    const prompt = buildPrompt(request.intent, sourceText);
    const response = await callLlmApi(prompt, config, options);
    return createCloudSuccessResult(request, response, config.model, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createCloudErrorResult(request, "error", "cloud_api_failed", message, startedAt);
  }
}

function getSourceText(context: ContextProtocol): string {
  return context.content.selected_text ?? context.content.ocr_text ?? "";
}

function buildPrompt(intent: Intent, sourceText: string): string {
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

async function callLlmApi(
  prompt: string,
  config: ReturnType<typeof getCloudServiceConfig>,
  options?: CloudLlmAdapterOptions
): Promise<string> {
  const fetchImpl = options?.fetchImpl ?? fetch;

  const requestBody = {
    model: config.model,
    messages: [
      { role: "user", content: prompt }
    ],
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
} {
  const base = { text };

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
