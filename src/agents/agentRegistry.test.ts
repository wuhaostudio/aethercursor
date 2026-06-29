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
      "agent.cloud.summarize",
      "agent.cloud.deep-explain",
      "agent.cloud.table-extract",
      "agent.cloud.vision-analyze"
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
    const explainAgent = agents.find((a) => a.manifest.id === "agent.cloud.explain");

    expect(explainAgent).toMatchObject({
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
    const actionIntents = actions.map((action) => action.intent);

    expect(actionIntents).toContain("extract_text");
    expect(actionIntents).toContain("explain");
    expect(actionIntents).toContain("translate");
    expect(actionIntents).toContain("summarize");
    expect(actions.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps image-capable actions available before pixels are captured", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const actions = getAvailableAgentActions(manifests, {
      ...sampleContext,
      content: {
        selected_text: null,
        ocr_text: null,
        image_ref: null
      }
    });

    expect(actions.some((action) => action.manifest.id === "agent.cloud.vision-analyze")).toBe(true);
  });

  it("hides actions when no required input can be produced", () => {
    const { manifests } = loadBuiltInAgentManifests();
    const actions = getAvailableAgentActions(manifests, {
      ...sampleContext,
      selection: {
        ...sampleContext.selection,
        bounds: {
          x: 0,
          y: 0,
          width: 0,
          height: 0
        }
      },
      content: {
        selected_text: null,
        ocr_text: null,
        image_ref: null
      }
    });

    expect(actions).toEqual([]);
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
