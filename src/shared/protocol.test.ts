import { describe, expect, it } from "vitest";
import { sampleAgentManifest, sampleAgentResult, sampleContext } from "./fixtures";
import { validateAgentManifest } from "./agent";
import { validateContextProtocol } from "./context";
import { validateAgentResult } from "./result";

describe("ContextProtocol validation", () => {
  it("accepts a valid context fixture", () => {
    expect(validateContextProtocol(sampleContext)).toEqual({ valid: true, issues: [] });
  });

  it("rejects a context without required privacy flags", () => {
    const invalid = {
      ...sampleContext,
      privacy: {
        cloud_allowed: false
      }
    };

    expect(validateContextProtocol(invalid)).toMatchObject({
      valid: false,
      issues: [
        {
          path: "$.privacy.contains_sensitive_guess"
        },
        {
          path: "$.privacy.user_confirmed_upload"
        }
      ]
    });
  });
});

describe("AgentManifest validation", () => {
  it("accepts a valid manifest fixture", () => {
    expect(validateAgentManifest(sampleAgentManifest)).toEqual({ valid: true, issues: [] });
  });

  it("rejects manifests with unknown capabilities", () => {
    const invalid = {
      ...sampleAgentManifest,
      capabilities: ["launch_missiles"]
    };

    expect(validateAgentManifest(invalid)).toMatchObject({
      valid: false,
      issues: [
        {
          path: "$.capabilities"
        }
      ]
    });
  });
});

describe("AgentResult validation", () => {
  it("accepts a valid result fixture", () => {
    expect(validateAgentResult(sampleAgentResult)).toEqual({ valid: true, issues: [] });
  });

  it("rejects result objects without output text", () => {
    const invalid = {
      ...sampleAgentResult,
      output: {}
    };

    expect(validateAgentResult(invalid)).toMatchObject({
      valid: false,
      issues: [
        {
          path: "$.output.text"
        }
      ]
    });
  });
});
