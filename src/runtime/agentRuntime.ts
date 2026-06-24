import { decideAgentPolicy } from "../policy/policy";
import { executePaddleOcrAgent } from "../ocr/paddleOcrAdapter";
import { isOcrServiceAvailable } from "../ocr/ocrServiceConfig";
import { executeCloudLlmAgent } from "../cloud/cloudLlmAdapter";
import { isCloudServiceAvailable } from "../cloud/cloudServiceConfig";
import type { AgentManifest, Intent } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { AgentResult } from "../shared/result";

export interface AgentRuntimeRequest {
  readonly manifest: AgentManifest;
  readonly context: ContextProtocol;
  readonly intent: Intent;
  readonly timeout_ms?: number;
  readonly adapters?: Partial<Record<AgentManifest["execution_mode"], AgentRuntimeAdapter>>;
  readonly now?: () => number;
}

export interface AgentRuntimeAdapter {
  readonly execute: (request: AgentRuntimeRequest) => Promise<AgentResult>;
}

const defaultAdapters: Record<AgentManifest["execution_mode"], AgentRuntimeAdapter> = {
  local: {
    execute: executeLocalAgent
  },
  cloud: {
    execute: executeMockCloudAgent
  },
  hybrid: {
    execute: executeMockCloudAgent
  }
};

export async function executeAgentRuntime(request: AgentRuntimeRequest): Promise<AgentResult> {
  const startedAt = request.now?.() ?? performance.now();
  const policyDecision = decideAgentPolicy(request.manifest, request.context);

  if (policyDecision.status === "block") {
    return createErrorResult(request, "blocked", "policy_blocked", policyDecision.reason, startedAt);
  }

  if (policyDecision.status === "confirm") {
    return createErrorResult(request, "blocked", "permission_denied", policyDecision.reason, startedAt);
  }

  const adapter = request.adapters?.[request.manifest.execution_mode] ?? defaultAdapters[request.manifest.execution_mode];

  try {
    return await withTimeout(adapter.execute(request), request, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return createErrorResult(request, "error", "runtime_error", message, startedAt);
  }
}

async function withTimeout(
  execution: Promise<AgentResult>,
  request: AgentRuntimeRequest,
  startedAt: number
): Promise<AgentResult> {
  const timeoutMs = request.timeout_ms;

  if (timeoutMs === undefined) {
    return execution;
  }

  return Promise.race([
    execution,
    new Promise<AgentResult>((resolve) => {
      globalThis.setTimeout(() => {
        resolve(createErrorResult(request, "timeout", "timeout", "代理执行超时。", startedAt));
      }, timeoutMs);
    })
  ]);
}

async function executeLocalAgent(request: AgentRuntimeRequest): Promise<AgentResult> {
  if (request.manifest.id === "agent.local.ocr" && request.intent === "extract_text" && isOcrServiceAvailable()) {
    return executePaddleOcrAgent(request);
  }

  return createSuccessResult(request, "mock-local-runtime");
}

async function executeMockCloudAgent(request: AgentRuntimeRequest): Promise<AgentResult> {
  if (isCloudServiceAvailable() && request.manifest.execution_mode === "cloud") {
    return executeCloudLlmAgent(request);
  }

  return createSuccessResult(request, "mock-cloud-runtime");
}

function createSuccessResult(request: AgentRuntimeRequest, model: string): AgentResult {
  const sourceText = getSourceText(request.context);
  const text = createMockText(request.intent, sourceText);

  return {
    result_id: `res_${request.context.context_id}_${request.intent}_${request.manifest.id}`,
    context_id: request.context.context_id,
    agent_id: request.manifest.id,
    intent: request.intent,
    status: "success",
    output_type: request.manifest.output_types[0],
    output: {
      text,
      translation: `基于 ${sourceText} 的模拟翻译。`,
      explanation: text
    },
    runtime: {
      execution_mode: request.manifest.execution_mode,
      model,
      duration_ms: 120
    },
    privacy: {
      uploaded: request.manifest.privacy_policy.requires_upload,
      stored_by_aethercursor: false
    },
    error: null
  };
}

function createErrorResult(
  request: AgentRuntimeRequest,
  status: AgentResult["status"],
  code: string,
  message: string,
  startedAt: number
): AgentResult {
  const finishedAt = request.now?.() ?? performance.now();

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

function getSourceText(context: ContextProtocol): string {
  return context.content.selected_text ?? context.content.ocr_text ?? "选中的屏幕区域";
}

function createMockText(intent: Intent, sourceText: string): string {
  if (intent === "extract_text") {
    return `从 ${sourceText} 提取的本地上下文。`;
  }

  return `${sourceText} 的模拟${intent}结果。`;
}
