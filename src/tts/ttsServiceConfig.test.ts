import { describe, it, expect, beforeEach } from "vitest";
import {
  getTtsServiceConfig,
  setTtsServiceConfig,
  isCloudTtsAvailable,
  isWebSpeechAvailable,
  resetTtsServiceConfig
} from "./ttsServiceConfig";

describe("ttsServiceConfig", () => {
  beforeEach(() => {
    resetTtsServiceConfig();
  });

  it("has sensible defaults", () => {
    const config = getTtsServiceConfig();
    expect(config.endpoint).toContain("audio/speech");
    expect(config.api_key).toBe("");
    expect(config.voice).toBe("alloy");
    expect(config.rate).toBe(1.0);
    expect(config.pitch).toBe(1.0);
    expect(config.enabled).toBe(false);
  });

  it("reports cloud TTS unavailable by default", () => {
    expect(isCloudTtsAvailable()).toBe(false);
  });

  it("reports cloud TTS available when api_key is set", () => {
    setTtsServiceConfig({ api_key: "sk-test-key" });
    expect(isCloudTtsAvailable()).toBe(true);
  });

  it("updates voice", () => {
    setTtsServiceConfig({ voice: "nova" });
    const config = getTtsServiceConfig();
    expect(config.voice).toBe("nova");
  });

  it("updates rate", () => {
    setTtsServiceConfig({ rate: 1.5 });
    const config = getTtsServiceConfig();
    expect(config.rate).toBe(1.5);
  });

  it("updates pitch", () => {
    setTtsServiceConfig({ pitch: 0.8 });
    const config = getTtsServiceConfig();
    expect(config.pitch).toBe(0.8);
  });

  it("trims api_key whitespace", () => {
    setTtsServiceConfig({ api_key: "  sk-test  " });
    const config = getTtsServiceConfig();
    expect(config.api_key).toBe("sk-test");
    expect(config.enabled).toBe(true);
  });

  it("resets to defaults", () => {
    setTtsServiceConfig({ api_key: "sk-test", voice: "nova", rate: 1.5 });
    resetTtsServiceConfig();
    const config = getTtsServiceConfig();
    expect(config.api_key).toBe("");
    expect(config.voice).toBe("alloy");
    expect(config.rate).toBe(1.0);
    expect(config.enabled).toBe(false);
  });

  it("reports web speech availability", () => {
    const available = isWebSpeechAvailable();
    expect(typeof available).toBe("boolean");
  });
});
