import { describe, it, expect, beforeEach, vi } from "vitest";
import { executeCloudLlmAgent } from "./cloudLlmAdapter";
import { setCloudServiceConfig, resetCloudServiceConfig } from "./cloudServiceConfig";
import type { AgentManifest } from "../shared/agent";
import type { ContextProtocol } from "../shared/context";

const mockManifest: AgentManifest = {
  id: "agent.cloud.explain",
  name: "Explain",
  version: "0.1.0",
  description: "Cloud explain agent",
  capabilities: ["explain"],
  input_types: ["text", "image_region"],
  output_types: ["plain_text"],
  execution_mode: "cloud",
  latency_level: "medium",
  cost_level: "low",
  required_permissions: [],
  privacy_policy: {
    requires_upload: true,
    sensitive_data_allowed: false,
    user_confirmation: "every_time"
  }
};

const visionManifest: AgentManifest = {
  id: "agent.cloud.vision-analyze",
  name: "Vision",
  version: "0.1.0",
  description: "Cloud vision agent",
  capabilities: ["image_understanding", "explain"],
  input_types: ["image_region", "screen_region"],
  output_types: ["markdown", "plain_text"],
  execution_mode: "cloud",
  latency_level: "long",
  cost_level: "high",
  required_permissions: ["screen_region_read", "cloud_upload", "image_upload"],
  privacy_policy: {
    requires_upload: true,
    sensitive_data_allowed: false,
    user_confirmation: "every_time"
  }
};

const tableManifest: AgentManifest = {
  id: "agent.cloud.table-extract",
  name: "Table",
  version: "0.1.0",
  description: "Cloud table extraction agent",
  capabilities: ["table_extraction", "extract_text"],
  input_types: ["image_region", "screen_region", "ocr_text"],
  output_types: ["key_value", "markdown", "plain_text"],
  execution_mode: "cloud",
  latency_level: "medium",
  cost_level: "medium",
  required_permissions: ["screen_region_read", "cloud_upload"],
  privacy_policy: {
    requires_upload: true,
    sensitive_data_allowed: false,
    user_confirmation: "first_time"
  }
};

function createContext(overrides: Partial<ContextProtocol> = {}): ContextProtocol {
  return {
    context_id: "ctx_test123",
    created_at: new Date().toISOString(),
    source: {
      app_name: null,
      window_title: null,
      url: null
    },
    selection: {
      type: "screen_region",
      bounds: { x: 100, y: 100, width: 200, height: 100 },
      display_scale: 1.0
    },
    content: {
      image_ref: "local://capture/ctx_test123.bmp",
      selected_text: "Hello world",
      ocr_text: null
    },
    metadata: {
      content_guess: ["text"],
      confidence: 0.5,
      language: "en"
    },
    privacy: {
      cloud_allowed: true,
      contains_sensitive_guess: false,
      user_confirmed_upload: true
    },
    ...overrides
  };
}

describe("cloudLlmAdapter", () => {
  beforeEach(() => {
    resetCloudServiceConfig();
    vi.clearAllMocks();
  });

  it("returns error when cloud service is not configured", async () => {
    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context: createContext(),
        intent: "explain"
      },
      { now: () => 0 }
    );

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("cloud_unavailable");
  });

  it("returns error when no source text", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });
    const context = createContext({ content: { image_ref: null, selected_text: null, ocr_text: null } });

    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context,
        intent: "explain"
      },
      { now: () => 0 }
    );

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("no_source_text");
  });

  it("calls cloud API with explain intent", async () => {
    setCloudServiceConfig({ api_key: "sk-test", model: "test-model" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "This is an explanation." } }]
        }),
      text: () => Promise.resolve("")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context: createContext(),
        intent: "explain"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    expect(result.output.text).toBe("This is an explanation.");
    expect(result.output.explanation).toBe("This is an explanation.");
    expect(result.runtime.model).toBe("test-model");
    expect(result.privacy.uploaded).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.model).toBe("test-model");
    expect(body.messages[0].content).toContain("Explain");
  });

  it("calls cloud API with translate intent", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "你好世界" } }]
        }),
      text: () => Promise.resolve("")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: { ...mockManifest, id: "agent.cloud.translate", capabilities: ["translate"], output_types: ["plain_text"] },
        context: createContext(),
        intent: "translate"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    expect(result.output.translation).toBe("你好世界");
  });

  it("calls cloud API with summarize intent", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Summary text." } }]
        }),
      text: () => Promise.resolve("")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: { ...mockManifest, id: "agent.cloud.summarize", capabilities: ["summarize"], output_types: ["plain_text"] },
        context: createContext(),
        intent: "summarize"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    expect(result.output.summary).toBe("Summary text.");
  });

  it("returns error when API call fails", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context: createContext(),
        intent: "explain"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("cloud_api_failed");
    expect(result.error?.message).toContain("401");
  });

  it("uses ocr_text when selected_text is null", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "OCR explanation." } }]
        }),
      text: () => Promise.resolve("")
    });

    const context = createContext({
      content: { image_ref: "local://capture/ctx_test.bmp", selected_text: null, ocr_text: "OCR text here" }
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context,
        intent: "explain"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages[0].content).toContain("OCR text here");
  });

  it("returns error when API response has no choices", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }),
      text: () => Promise.resolve("")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: mockManifest,
        context: createContext(),
        intent: "explain"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("cloud_api_failed");
  });

  it("sends image content for vision agents", async () => {
    setCloudServiceConfig({ api_key: "sk-test", model: "vision-model" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "The region shows a settings panel." } }]
        }),
      text: () => Promise.resolve("")
    });

    const context = createContext({
      content: {
        selected_text: null,
        ocr_text: null,
        image_ref: "data:image/png;base64,abc123"
      }
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: visionManifest,
        context,
        intent: "explain"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    expect(result.output.explanation).toBe("The region shows a settings panel.");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("vision-model");
    expect(body.messages[0].content).toEqual([
      {
        type: "text",
        text: expect.stringContaining("Analyze the selected image region")
      },
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,abc123"
        }
      }
    ]);
  });

  it("converts local image refs through the injected image reader", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "Image analysis." } }]
        }),
      text: () => Promise.resolve("")
    });
    const readImageAsDataUrl = vi.fn().mockResolvedValue("data:image/bmp;base64,converted");

    const result = await executeCloudLlmAgent(
      {
        manifest: visionManifest,
        context: createContext(),
        intent: "explain"
      },
      {
        fetchImpl: mockFetch as unknown as typeof fetch,
        readImageAsDataUrl,
        now: () => 0
      }
    );

    expect(result.status).toBe("success");
    expect(readImageAsDataUrl).toHaveBeenCalledTimes(1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content[1].image_url.url).toBe("data:image/bmp;base64,converted");
  });

  it("returns image_unavailable for vision agents without uploadable pixels", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const result = await executeCloudLlmAgent(
      {
        manifest: visionManifest,
        context: createContext({
          content: {
            selected_text: null,
            ocr_text: null,
            image_ref: null
          }
        }),
        intent: "explain"
      },
      { now: () => 0 }
    );

    expect(result.status).toBe("error");
    expect(result.error?.code).toBe("image_unavailable");
  });

  it("parses table JSON from cloud table extraction results", async () => {
    setCloudServiceConfig({ api_key: "sk-test" });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: "```json\n{\"columns\":[\"Name\",\"Score\"],\"rows\":[[\"Ada\",\"98\"],[\"Lin\",\"91\"]]}\n```"
              }
            }
          ]
        }),
      text: () => Promise.resolve("")
    });

    const result = await executeCloudLlmAgent(
      {
        manifest: tableManifest,
        context: createContext({
          content: {
            selected_text: null,
            ocr_text: null,
            image_ref: "data:image/png;base64,table"
          }
        }),
        intent: "extract_text"
      },
      { fetchImpl: mockFetch as unknown as typeof fetch, now: () => 0 }
    );

    expect(result.status).toBe("success");
    expect(result.output.table).toEqual({
      columns: ["Name", "Score"],
      rows: [
        ["Ada", "98"],
        ["Lin", "91"]
      ]
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content[0].text).toContain("Return only JSON");
  });
});
