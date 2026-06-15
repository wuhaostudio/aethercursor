import { describe, expect, it } from "vitest";
import { sampleContext } from "../shared/fixtures";
import {
  getAvailableAgentActions,
  getCompatibleAgents,
  loadAgentManifests,
  loadBuiltInAgentManifests
} from "./agentRegistry";

describe("agent registry", () => {
  it("loads built-in manifests", () => {
    const result = loadBuiltInAgentManifests();

    expect(result.errors).toEqual([]);
    expect(result.manifests.map((manifest) => manifest.id)).toEqual([
      "agent.local.ocr",
      "agent.cloud.explain",
      "agent.cloud.translate",
      "agent.cloud.summarize"
    ]);
  });

  it("reports invalid manifests without dropping valid ones", () => {
    const result = loadAgentManifests([
      {
        id: "bad"
      },
      {
        id: "agent.local.test",
        name: "Local Test",
        version: "0.1.0",
        description: "Valid local test.",
        capabilities: ["extract_text"],
        input_types: ["screen_region"],
        output_types: ["plain_text"],
        execution_mode: "local",
        latency_level: "instant",
        cost_level: "none",
        required_permissions: [],
        privacy_policy: {
          requires_upload: false,
          sensitive_data_allowed: true,
          user_confirmation: "never"
        }
      }
    ]);

    expect(result.manifests).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].id).toBe("bad");
  });

  it("routes extract_text on screen regions to local OCR first", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const agents = getCompatibleAgents(manifests, sampleContext, "extract_text");

    expect(agents[0]).toMatchObject({
      intent: "extract_text",
      requires_confirmation: false,
      manifest: {
        id: "agent.local.ocr",
        execution_mode: "local"
      }
    });
  });

  it("marks cloud agents as requiring confirmation", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const agents = getCompatibleAgents(manifests, sampleContext, "explain");

    expect(agents[0]).toMatchObject({
      intent: "explain",
      requires_confirmation: true,
      manifest: {
        id: "agent.cloud.explain",
        execution_mode: "cloud"
      }
    });
  });

  it("provides context-compatible action entries", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const actions = getAvailableAgentActions(manifests, sampleContext);

    expect(actions.map((action) => action.intent)).toEqual([
      "extract_text",
      "explain",
      "translate",
      "summarize"
    ]);
  });

  it("keeps blocked cloud actions visible with a policy decision", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const actions = getAvailableAgentActions(manifests, {
      ...sampleContext,
      privacy: {
        ...sampleContext.privacy,
        contains_sensitive_guess: true
      }
    });

    expect(actions.find((action) => action.intent === "explain")).toMatchObject({
      requires_confirmation: false,
      policy_decision: {
        status: "block",
        privacy_level: 3
      }
    });
  });
});
