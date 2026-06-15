import {
  createValidationResult,
  hasBoolean,
  hasString,
  hasStringArray,
  isRecord,
  pushRequiredIssue,
  type ValidationIssue,
  type ValidationResult
} from "./validation";
import { contextTypes, type ContextType } from "./context";

export const intents = ["explain", "translate", "summarize", "extract_text", "ask_ai", "send_to_agent"] as const;
export type Intent = (typeof intents)[number];

export const agentCapabilities = [
  ...intents,
  "image_understanding",
  "pronunciation",
  "code_review",
  "table_extraction",
  "question_answering"
] as const;
export type AgentCapability = (typeof agentCapabilities)[number];

export const outputTypes = ["plain_text", "markdown", "ocr_text", "key_value", "error", "popup"] as const;
export type AgentOutputType = (typeof outputTypes)[number];

export const executionModes = ["local", "cloud", "hybrid"] as const;
export type ExecutionMode = (typeof executionModes)[number];

export const latencyLevels = ["instant", "short", "medium", "long"] as const;
export type LatencyLevel = (typeof latencyLevels)[number];

export const costLevels = ["none", "low", "medium", "high"] as const;
export type CostLevel = (typeof costLevels)[number];

export const confirmationPolicies = ["never", "first_time", "every_time"] as const;
export type ConfirmationPolicy = (typeof confirmationPolicies)[number];

export interface AgentPrivacyPolicy {
  readonly requires_upload: boolean;
  readonly sensitive_data_allowed: boolean;
  readonly user_confirmation: ConfirmationPolicy;
}

export interface AgentManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly capabilities: readonly AgentCapability[];
  readonly input_types: readonly ContextType[];
  readonly output_types: readonly AgentOutputType[];
  readonly execution_mode: ExecutionMode;
  readonly latency_level: LatencyLevel;
  readonly cost_level: CostLevel;
  readonly required_permissions: readonly string[];
  readonly privacy_policy: AgentPrivacyPolicy;
}

export function validateAgentManifest(value: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isRecord(value)) {
    return createValidationResult([{ path: "$", message: "Expected object." }]);
  }

  pushRequiredIssue(issues, hasString(value, "id"), "$.id", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "name"), "$.name", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "version"), "$.version", "non-empty string");
  pushRequiredIssue(issues, hasString(value, "description"), "$.description", "non-empty string");
  pushRequiredIssue(
    issues,
    isKnownStringArray(value, "capabilities", agentCapabilities),
    "$.capabilities",
    "known capability array"
  );
  pushRequiredIssue(
    issues,
    isKnownStringArray(value, "input_types", contextTypes),
    "$.input_types",
    "known context type array"
  );
  pushRequiredIssue(
    issues,
    isKnownStringArray(value, "output_types", outputTypes),
    "$.output_types",
    "known output type array"
  );
  pushRequiredIssue(
    issues,
    executionModes.includes(value.execution_mode as ExecutionMode),
    "$.execution_mode",
    "known execution mode"
  );
  pushRequiredIssue(
    issues,
    latencyLevels.includes(value.latency_level as LatencyLevel),
    "$.latency_level",
    "known latency level"
  );
  pushRequiredIssue(
    issues,
    costLevels.includes(value.cost_level as CostLevel),
    "$.cost_level",
    "known cost level"
  );
  pushRequiredIssue(
    issues,
    hasStringArray(value, "required_permissions"),
    "$.required_permissions",
    "string array"
  );
  validatePrivacyPolicy(value.privacy_policy, issues);

  return createValidationResult(issues);
}

export function isAgentManifest(value: unknown): value is AgentManifest {
  return validateAgentManifest(value).valid;
}

function validatePrivacyPolicy(value: unknown, issues: ValidationIssue[]): void {
  if (!isRecord(value)) {
    issues.push({ path: "$.privacy_policy", message: "Expected object." });
    return;
  }

  pushRequiredIssue(
    issues,
    hasBoolean(value, "requires_upload"),
    "$.privacy_policy.requires_upload",
    "boolean"
  );
  pushRequiredIssue(
    issues,
    hasBoolean(value, "sensitive_data_allowed"),
    "$.privacy_policy.sensitive_data_allowed",
    "boolean"
  );
  pushRequiredIssue(
    issues,
    confirmationPolicies.includes(value.user_confirmation as ConfirmationPolicy),
    "$.privacy_policy.user_confirmation",
    "known confirmation policy"
  );
}

function isKnownStringArray<T extends string>(
  value: Record<string, unknown>,
  key: string,
  allowed: readonly T[]
): boolean {
  const candidate = value[key];

  return (
    Array.isArray(candidate) &&
    candidate.length > 0 &&
    candidate.every((item) => typeof item === "string" && allowed.includes(item as T))
  );
}
