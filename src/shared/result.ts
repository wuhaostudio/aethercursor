import {
  createValidationResult,
  hasBoolean,
  hasFiniteNumber,
  hasString,
  isRecord,
  pushRequiredIssue,
  type ValidationIssue,
  type ValidationResult
} from "./validation";
import { executionModes, intents, outputTypes, type AgentOutputType, type ExecutionMode, type Intent } from "./agent";

export const resultStatuses = ["success", "error", "cancelled", "blocked", "timeout"] as const;
export type AgentResultStatus = (typeof resultStatuses)[number];

export interface AgentResultOutput {
  readonly text: string;
  readonly [key: string]: unknown;
}

export interface AgentResultRuntime {
  readonly execution_mode: ExecutionMode;
  readonly model: string | null;
  readonly duration_ms: number;
}

export interface AgentResultPrivacy {
  readonly uploaded: boolean;
  readonly stored_by_aethercursor: boolean;
}

export interface AgentResultError {
  readonly code: string;
  readonly message: string;
}

export interface AgentResult {
  readonly result_id: string;
  readonly context_id: string;
  readonly agent_id: string;
  readonly intent: Intent;
  readonly status: AgentResultStatus;
  readonly output_type: AgentOutputType;
  readonly output: AgentResultOutput;
  readonly runtime: AgentResultRuntime;
  readonly privacy: AgentResultPrivacy;
  readonly error: AgentResultError | null;
}

export function validateAgentResult(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return createValidationResult([{ path: "$", message: "Expected object." }]);
  }

  pushRequiredIssue(issues, hasString(value, "result_id"), "$.result_id", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "context_id"), "$.context_id", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "agent_id"), "$.agent_id", "non-empty string");
  pushRequiredIssue(issues, intents.includes(value.intent as Intent), "$.intent", "known intent");
  pushRequiredIssue(
    issues,
    resultStatuses.includes(value.status as AgentResultStatus),
    "$.status",
    "known result status"
  );
  pushRequiredIssue(
    issues,
    outputTypes.includes(value.output_type as AgentOutputType),
    "$.output_type",
    "known output type"
  );
  validateOutput(value.output, issues);
  validateRuntime(value.runtime, issues);
  validatePrivacy(value.privacy, issues);
  validateError(value.error, issues);

  return createValidationResult(issues);
}

export function isAgentResult(value: unknown): value is AgentResult {
  return validateAgentResult(value).valid;
}

function validateOutput(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.output", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasString(value, "text"), "$.output.text", "string");
}

function validateRuntime(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.runtime", message: "Expected object." });
    return;
  }

  pushRequiredIssue(
    issues,
    executionModes.includes(value.execution_mode as ExecutionMode),
    "$.runtime.execution_mode",
    "known execution mode"
  );
  pushRequiredIssue(
    issues,
    typeof value.model === "string" || value.model === null,
    "$.runtime.model",
    "string or null"
  );
  pushRequiredIssue(
    issues,
    hasFiniteNumber(value, "duration_ms") && Number(value.duration_ms) >= 0,
    "$.runtime.duration_ms",
    "non-negative number"
  );
}

function validatePrivacy(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.privacy", message: "Expected object." });
    return;
  }

  pushRequiredIssue(issues, hasBoolean(value, "uploaded"), "$.privacy.uploaded", "boolean");
  pushRequiredIssue(
    issues,
    hasBoolean(value, "stored_by_aethercursor"),
    "$.privacy.stored_by_aethercursor",
    "boolean"
  );
}

function validateError(value: unknown, issues: ValidationIssue[]): void {
  if (value === null) {
    return;
  }

  if (!isRecord(value)) {
    issues.push({ path: "$.error", message: "Expected object or null." });
    return;
  }

  pushRequiredIssue(issues, hasString(value, "code"), "$.error.code", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "message"), "$.error.message", "non-empty string");
}
