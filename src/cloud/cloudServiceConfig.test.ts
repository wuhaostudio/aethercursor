import { describe, it, expect, beforeEach } from "vitest";
import {
  getCloudServiceConfig,
  setCloudServiceConfig,
  isCloudServiceAvailable,
  resetCloudServiceConfig
} from "./cloudServiceConfig";

interface CloudTestGlobals {
  __AETHERCURSOR_CLOUD_ENDPOINT?: string;
  __AETHERCURSOR_CLOUD_API_KEY?: string;
  __AETHERCURSOR_CLOUD_MODEL?: string;
  __AETHERCURSOR_CLOUD_TIMEOUT_MS?: number;
}

describe("cloudServiceConfig", () => {
  beforeEach(() => {
    resetCloudServiceConfig();
    const globals = globalThis as unknown as CloudTestGlobals;
    delete globals.__AETHERCURSOR_CLOUD_ENDPOINT;
    delete globals.__AETHERCURSOR_CLOUD_API_KEY;
    delete globals.__AETHERCURSOR_CLOUD_MODEL;
    delete globals.__AETHERCURSOR_CLOUD_TIMEOUT_MS;
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

  it("reads global runtime config before explicit overrides", () => {
    const globals = globalThis as unknown as CloudTestGlobals;
    globals.__AETHERCURSOR_CLOUD_ENDPOINT = " https://local.test/v1/chat ";
    globals.__AETHERCURSOR_CLOUD_API_KEY = " sk-global ";
    globals.__AETHERCURSOR_CLOUD_MODEL = " local-model ";
    globals.__AETHERCURSOR_CLOUD_TIMEOUT_MS = 3000;

    const config = getCloudServiceConfig();
    expect(config.endpoint).toBe("https://local.test/v1/chat");
    expect(config.api_key).toBe("sk-global");
    expect(config.model).toBe("local-model");
    expect(config.timeout_ms).toBe(3000);
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
