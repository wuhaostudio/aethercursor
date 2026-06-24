import { describe, it, expect, beforeEach } from "vitest";
import {
  getOcrServiceConfig,
  setOcrServiceConfig,
  resetOcrServiceConfig,
  isOcrServiceAvailable
} from "./ocrServiceConfig";

describe("ocrServiceConfig", () => {
  beforeEach(() => {
    resetOcrServiceConfig();
  });

  it("returns default config when not configured", () => {
    const config = getOcrServiceConfig();
    expect(config.endpoint).toBe("http://127.0.0.1:9003/ocr");
    expect(config.api_key).toBe("");
    expect(config.timeout_ms).toBe(10000);
    expect(config.enabled).toBe(false);
  });

  it("reports unavailable when api_key is empty", () => {
    expect(isOcrServiceAvailable()).toBe(false);
  });

  it("reports available when api_key is set", () => {
    setOcrServiceConfig({ api_key: "test-key-123" });
    expect(isOcrServiceAvailable()).toBe(true);
  });

  it("allows overriding endpoint", () => {
    setOcrServiceConfig({
      endpoint: "http://localhost:8000/ocr",
      api_key: "test-key"
    });
    const config = getOcrServiceConfig();
    expect(config.endpoint).toBe("http://localhost:8000/ocr");
    expect(config.api_key).toBe("test-key");
    expect(config.enabled).toBe(true);
  });

  it("allows overriding timeout", () => {
    setOcrServiceConfig({
      api_key: "test-key",
      timeout_ms: 5000
    });
    const config = getOcrServiceConfig();
    expect(config.timeout_ms).toBe(5000);
  });

  it("reset restores defaults", () => {
    setOcrServiceConfig({
      endpoint: "http://custom:9000/ocr",
      api_key: "custom-key",
      timeout_ms: 3000
    });
    resetOcrServiceConfig();
    const config = getOcrServiceConfig();
    expect(config.endpoint).toBe("http://127.0.0.1:9003/ocr");
    expect(config.api_key).toBe("");
    expect(config.timeout_ms).toBe(10000);
    expect(config.enabled).toBe(false);
  });

  it("partial update preserves existing values", () => {
    setOcrServiceConfig({ api_key: "key-1" });
    setOcrServiceConfig({ timeout_ms: 2000 });
    const config = getOcrServiceConfig();
    expect(config.api_key).toBe("key-1");
    expect(config.timeout_ms).toBe(2000);
  });
});
