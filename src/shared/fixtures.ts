import type { AgentManifest } from "./agent";
import type { ContextProtocol } from "./context";
import type { AgentResult } from "./result";

export const sampleContext: ContextProtocol = {
  context_id: "ctx_001",
  created_at: "2026-06-12T10:00:00.000Z",
  source: {
    app_name: "Chrome",
    window_title: "Research Article",
    url: "https://example.com"
  },
  selection: {
    type: "screen_region",
    bounds: {
      x: 120,
      y: 300,
      width: 520,
      height: 240
    },
    display_scale: 1
  },
  content: {
    selected_text: null,
    ocr_text: "Recognized text appears here.",
    image_ref: "local://capture/ctx_001.png"
  },
  metadata: {
    language: "auto",
    content_guess: ["text", "image"],
    confidence: 0.82
  },
  privacy: {
    cloud_allowed: false,
    contains_sensitive_guess: false,
    user_confirmed_upload: false
  }
};

export const sampleAgentManifest: AgentManifest = {
  id: "agent.text.explainer.basic",
  name: "Text Explainer",
  version: "0.1.0",
  description: "Explains selected text in plain language.",
  capabilities: ["explain", "summarize"],
  input_types: ["text", "ocr_text"],
  output_types: ["markdown", "popup"],
  execution_mode: "cloud",
  latency_level: "short",
  cost_level: "low",
  required_permissions: ["screen_region_read"],
  privacy_policy: {
    requires_upload: true,
    sensitive_data_allowed: false,
    user_confirmation: "first_time"
  }
};

export const sampleAgentResult: AgentResult = {
  result_id: "res_001",
  context_id: sampleContext.context_id,
  agent_id: sampleAgentManifest.id,
  intent: "explain",
  status: "success",
  output_type: "markdown",
  output: {
    text: "This selection describes a concise AetherCursor protocol fixture."
  },
  runtime: {
    execution_mode: "cloud",
    model: "mock-provider",
    duration_ms: 1200
  },
  privacy: {
    uploaded: true,
    stored_by_aethercursor: false
  },
  error: null
};
