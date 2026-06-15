import { describe, expect, it } from "vitest";
import { confirmCloudUpload } from "../policy/policy";
import { sampleAgentManifest, sampleContext } from "../shared/fixtures";
import type { AgentManifest } from "../shared/agent";
import { executeAgentRuntime } from "./agentRuntime";

const localManifest: AgentManifest = {
  ...sampleAgentManifest,
  id: "agent.local.ocr",
  capabilities: ["extract_text"],
  input_types: ["screen_region"],
  output_types: ["ocr_text", "plain_text"],
  execution_mode: "local",
  privacy_policy: {
    requires_upload: false,
    sensitive_data_allowed: true,
    user_confirmation: "never"
  }
};

describe("agent runtime", () => {
  it("executes local mock-compatible agents", async () => {
    const result = await executeAgentRuntime({
      manifest: localManifest,
      context: sampleContext,
      intent: "extract_text"
    });

    expect(result).toMatchObject({
      agent_id: "agent.local.ocr",
      intent: "extract_text",
      status: "success",
      output_type: "ocr_text",
      runtime: {
        execution_mode: "local",
        model: "mock-local-runtime"
      },
      privacy: {
        uploaded: false
      }
    });
  });

  it("executes cloud mock-compatible agents only after confirmation", async () => {
    const denied = await executeAgentRuntime({
      manifest: sampleAgentManifest,
      context: sampleContext,
      intent: "explain"
    });
    const allowed = await executeAgentRuntime({
      manifest: sampleAgentManifest,
      context: confirmCloudUpload(sampleContext),
      intent: "explain"
    });

    expect(denied).toMatchObject({
      status: "blocked",
      error: {
        code: "permission_denied"
      },
      privacy: {
        uploaded: false
      }
    });
    expect(allowed).toMatchObject({
      status: "success",
      runtime: {
        execution_mode: "cloud",
        model: "mock-cloud-runtime"
      },
      privacy: {
        uploaded: true
      }
    });
  });

  it("returns blocked results for sensitive content disallowed by policy", async () => {
    const result = await executeAgentRuntime({
      manifest: sampleAgentManifest,
      context: {
        ...sampleContext,
        privacy: {
          ...sampleContext.privacy,
          contains_sensitive_guess: true
        }
      },
      intent: "explain"
    });

    expect(result).toMatchObject({
      status: "blocked",
      error: {
        code: "policy_blocked"
      }
    });
  });

  it("returns timeout results when an adapter exceeds the runtime budget", async () => {
    const result = await executeAgentRuntime({
      manifest: localManifest,
      context: sampleContext,
      intent: "extract_text",
      timeout_ms: 1,
      adapters: {
        local: {
          execute: () =>
            new Promise((resolve) => {
              globalThis.setTimeout(() => resolve(executeAgentRuntime({
                manifest: localManifest,
                context: sampleContext,
                intent: "extract_text"
              })), 20);
            })
        }
      }
    });

    expect(result).toMatchObject({
      status: "timeout",
      error: {
        code: "timeout"
      }
    });
  });

  it("returns runtime errors when an adapter fails", async () => {
    const result = await executeAgentRuntime({
      manifest: localManifest,
      context: sampleContext,
      intent: "extract_text",
      adapters: {
        local: {
          execute: () => Promise.reject(new Error("Adapter failed."))
        }
      }
    });

    expect(result).toMatchObject({
      status: "error",
      error: {
        code: "runtime_error",
        message: "Adapter failed."
      }
    });
  });
});
