import type { AgentManifest } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";

export type PrivacyLevel = 1 | 2 | 3;
export type PolicyDecisionStatus = "allow" | "confirm" | "block";

export interface PolicyDecision {
  readonly status: PolicyDecisionStatus;
  readonly privacy_level: PrivacyLevel;
  readonly requires_confirmation: boolean;
  readonly reason: string;
}

export function decideAgentPolicy(manifest: AgentManifest, context: ContextProtocol): PolicyDecision {
  if (!manifest.privacy_policy.requires_upload) {
    return {
      status: "allow",
      privacy_level: 1,
      requires_confirmation: false,
      reason: "Local processing only."
    };
  }

  if (context.privacy.contains_sensitive_guess && !manifest.privacy_policy.sensitive_data_allowed) {
    return {
      status: "block",
      privacy_level: 3,
      requires_confirmation: false,
      reason: "Sensitive content cannot be uploaded to this agent."
    };
  }

  if (!context.privacy.cloud_allowed || !context.privacy.user_confirmed_upload) {
    return {
      status: "confirm",
      privacy_level: 2,
      requires_confirmation: true,
      reason: "Cloud processing requires confirmation."
    };
  }

  return {
    status: "allow",
    privacy_level: 2,
    requires_confirmation: false,
    reason: "Cloud processing was confirmed for this context."
  };
}

export function confirmCloudUpload(context: ContextProtocol): ContextProtocol {
  return {
    ...context,
    privacy: {
      ...context.privacy,
      cloud_allowed: true,
      user_confirmed_upload: true
    }
  };
}
