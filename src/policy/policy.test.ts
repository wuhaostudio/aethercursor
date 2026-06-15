import { describe, expect, it } from "vitest";
import { sampleAgentManifest, sampleContext } from "../shared/fixtures";
import { confirmCloudUpload, decideAgentPolicy } from "./policy";

const localManifest = {
  ...sampleAgentManifest,
  execution_mode: "local",
  privacy_policy: {
    requires_upload: false,
    sensitive_data_allowed: true,
    user_confirmation: "never"
  }
} as const;

describe("policy decisions", () => {
  it("allows local agents without confirmation", () => {
    expect(decideAgentPolicy(localManifest, sampleContext)).toEqual({
      status: "allow",
      privacy_level: 1,
      requires_confirmation: false,
      reason: "Local processing only."
    });
  });

  it("requires confirmation before cloud upload", () => {
    expect(decideAgentPolicy(sampleAgentManifest, sampleContext)).toMatchObject({
      status: "confirm",
      privacy_level: 2,
      requires_confirmation: true
    });
  });

  it("allows cloud upload after explicit confirmation for the context", () => {
    expect(decideAgentPolicy(sampleAgentManifest, confirmCloudUpload(sampleContext))).toMatchObject({
      status: "allow",
      privacy_level: 2,
      requires_confirmation: false
    });
  });

  it("blocks sensitive context when the cloud agent disallows sensitive data", () => {
    const sensitiveContext = {
      ...sampleContext,
      privacy: {
        ...sampleContext.privacy,
        contains_sensitive_guess: true
      }
    };

    expect(decideAgentPolicy(sampleAgentManifest, sensitiveContext)).toMatchObject({
      status: "block",
      privacy_level: 3,
      requires_confirmation: false
    });
  });
});
