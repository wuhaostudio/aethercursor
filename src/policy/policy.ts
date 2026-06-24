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
      reason: "仅本地处理。"
    };
  }

  if (context.privacy.contains_sensitive_guess && !manifest.privacy_policy.sensitive_data_allowed) {
    return {
      status: "block",
      privacy_level: 3,
      requires_confirmation: false,
      reason: "敏感内容无法上传到此代理。"
    };
  }

  if (!context.privacy.cloud_allowed || !context.privacy.user_confirmed_upload) {
    return {
      status: "confirm",
      privacy_level: 2,
      requires_confirmation: true,
      reason: "云端处理需要您的确认。"
    };
  }

  return {
    status: "allow",
    privacy_level: 2,
    requires_confirmation: false,
    reason: "此上下文的云端处理已获确认。"
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
