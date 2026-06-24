import { describe, it, expect, beforeEach } from "vitest";
import {
  getCloudServiceConfig,
  setCloudServiceConfig,
  isCloudServiceAvailable,
  resetCloudServiceConfig
} from "./cloudServiceConfig";

describe("cloudServiceConfig", () => {
  beforeEach(() => {
    resetCloudServiceConfig();
  });

  it("has sensible defaults", () => {
    const config = getCloudServiceConfig();
    expect(config.endpoint).toContain("api.openai.com");
    expect(config.api_key).toBe("");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.timeout_ms).toBeGreaterThan(0);
    expect(config.enabled).toBe(false);
  });

  it("reports unavailable by default", () => {
    expect(isCloudServiceAvailable()).toBe(false);
  });

  it("reports available when api_key is set", () => {
    setCloudServiceConfig({ api_key: "sk-test-key" });
    expect(isCloudServiceAvailable()).toBe(true);
  });

  it("updates endpoint", () => {
    setCloudServiceConfig({ endpoint: "https://custom.api.com/v1/chat" });
    const config = getCloudServiceConfig();
    expect(config.endpoint).toBe("https://custom.api.com/v1/chat");
  });

  it("updates model", () => {
    setCloudServiceConfig({ model: "gpt-4" });
    const config = getCloudServiceConfig();
    expect(config.model).toBe("gpt-4");
  });

  it("trims api_key whitespace", () => {
    setCloudServiceConfig({ api_key: "  sk-test  " });
    const config = getCloudServiceConfig();
    expect(config.api_key).toBe("sk-test");
    expect(config.enabled).toBe(true);
  });

  it("resets to defaults", () => {
    setCloudServiceConfig({ api_key: "sk-test", model: "gpt-4" });
    resetCloudServiceConfig();
    const config = getCloudServiceConfig();
    expect(config.api_key).toBe("");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.enabled).toBe(false);
  });
});
