import cloudExplainManifest from "../../agents/cloud-explain.json";
import cloudSummarizeManifest from "../../agents/cloud-summarize.json";
import cloudTranslateManifest from "../../agents/cloud-translate.json";
import cloudDeepExplainManifest from "../../agents/cloud-deep-explain.json";
import cloudTableExtractManifest from "../../agents/cloud-table-extract.json";
import cloudVisionAnalyzeManifest from "../../agents/cloud-vision-analyze.json";
import localOcrManifest from "../../agents/local-ocr.json";
import {
  validateAgentManifest,
  type AgentManifest,
  type Intent
} from "../shared/agent";
import type { ContextProtocol } from "../shared/context";
import type { ValidationIssue } from "../shared/validation";
import { decideAgentPolicy, type PolicyDecision } from "../policy/policy";

export interface ManifestLoadResult {
  readonly manifests: readonly AgentManifest[];
  readonly errors: readonly ManifestLoadError[];
}

export interface ManifestLoadError {
  readonly id: string;
  readonly issues: readonly ValidationIssue[];
}

export interface RoutedAgent {
  readonly manifest: AgentManifest;
  readonly intent: Intent;
  readonly requires_confirmation: boolean;
  readonly policy_decision: PolicyDecision;
}

const builtInManifestValues: readonly unknown[] = [
  localOcrManifest,
  cloudExplainManifest,
  cloudTranslateManifest,
  cloudSummarizeManifest,
  cloudDeepExplainManifest,
  cloudTableExtractManifest,
  cloudVisionAnalyzeManifest
];

const intentOrder: readonly Intent[] = ["extract_text", "explain", "translate", "summarize", "ask_ai", "send_to_agent"];

export function loadBuiltInAgentManifests(): ManifestLoadResult {
  return loadAgentManifests(builtInManifestValues);
}

export function loadAgentManifests(values: readonly unknown[]): ManifestLoadResult {
  const manifests: AgentManifest[] = [];
  const errors: ManifestLoadError[] = [];

  for (const value of values) {
    const validation = validateAgentManifest(value);

    if (validation.valid) {
      manifests.push(value as AgentManifest);
      continue;
    }

    errors.push({
      id: getManifestId(value),
      issues: validation.issues
    });
  }

  return {
    manifests,
    errors
  };
}

export function getCompatibleAgents(
  manifests: readonly AgentManifest[],
  context: ContextProtocol,
  intent: Intent
): readonly RoutedAgent[] {
  return manifests
    .filter((manifest) => isManifestCompatible(manifest, context, intent))
    .sort(compareLocalFirst)
    .map((manifest) => createRoutedAgent(manifest, context, intent));
}

export function getAvailableAgentActions(
  manifests: readonly AgentManifest[],
  context: ContextProtocol
): readonly RoutedAgent[] {
  const actions = manifests.flatMap((manifest) =>
    manifest.capabilities
      .filter((capability): capability is Intent => isIntent(capability))
      .filter((intent) => isManifestCompatible(manifest, context, intent))
      .map((intent) => createRoutedAgent(manifest, context, intent))
  );

  return actions.sort(compareRoutedAgents);
}

function createRoutedAgent(manifest: AgentManifest, context: ContextProtocol, intent: Intent): RoutedAgent {
  const policyDecision = decideAgentPolicy(manifest, context);

  return {
    manifest,
    intent,
    requires_confirmation: policyDecision.requires_confirmation,
    policy_decision: policyDecision
  };
}

function isManifestCompatible(manifest: AgentManifest, context: ContextProtocol, intent: Intent): boolean {
  return manifest.capabilities.includes(intent) && manifest.input_types.includes(context.selection.type);
}

function compareRoutedAgents(left: RoutedAgent, right: RoutedAgent): number {
  const intentComparison = intentOrder.indexOf(left.intent) - intentOrder.indexOf(right.intent);

  if (intentComparison !== 0) {
    return intentComparison;
  }

  const localComparison = compareLocalFirst(left.manifest, right.manifest);

  if (localComparison !== 0) {
    return localComparison;
  }

  return left.manifest.name.localeCompare(right.manifest.name);
}

function compareLocalFirst(left: AgentManifest, right: AgentManifest): number {
  if (left.execution_mode === right.execution_mode) {
    return left.name.localeCompare(right.name);
  }

  return left.execution_mode === "local" ? -1 : 1;
}

function isIntent(value: string): value is Intent {
  return (
    value === "explain" ||
    value === "translate" ||
    value === "summarize" ||
    value === "extract_text" ||
    value === "ask_ai" ||
    value === "send_to_agent"
  );
}

function getManifestId(value: unknown): string {
  if (typeof value === "object" && value !== null && "id" in value && typeof value.id === "string") {
    return value.id;
  }

  return "unknown";
}
