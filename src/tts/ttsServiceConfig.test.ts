import { describe, it, expect, beforeEach } from "vitest";
import {
  getTtsServiceConfig,
  setTtsServiceConfig,
  isCloudTtsAvailable,
  isWebSpeechAvailable,
  resetTtsServiceConfig
} from "./ttsServiceConfig";

interface TtsTestGlobals {
  __AETHERCURSOR_TTS_ENDPOINT?: string;
  __AETHERCURSOR_TTS_API_KEY?: string;
  __AETHERCURSOR_TTS_VOICE?: string;
  __AETHERCURSOR_TTS_RATE?: number;
  __AETHERCURSOR_TTS_PITCH?: number;
}

describe("ttsServiceConfig", () => {
  beforeEach(() => {
    resetTtsServiceConfig();
    const globals = globalThis as unknown as TtsTestGlobals;
    delete globals.__AETHERCURSOR_TTS_ENDPOINT;
    delete globals.__AETHERCURSOR_TTS_API_KEY;
    delete globals.__AETHERCURSOR_TTS_VOICE;
    delete globals.__AETHERCURSOR_TTS_RATE;
    delete globals.__AETHERCURSOR_TTS_PITCH;
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

  it("reads global runtime config before explicit overrides", () => {
    const globals = globalThis as unknown as TtsTestGlobals;
    globals.__AETHERCURSOR_TTS_ENDPOINT = " https://local.test/v1/audio/speech ";
    globals.__AETHERCURSOR_TTS_API_KEY = " sk-tts ";
    globals.__AETHERCURSOR_TTS_VOICE = " nova ";
    globals.__AETHERCURSOR_TTS_RATE = 1.25;
    globals.__AETHERCURSOR_TTS_PITCH = 0.9;

    const config = getTtsServiceConfig();
    expect(config.endpoint).toBe("https://local.test/v1/audio/speech");
    expect(config.api_key).toBe("sk-tts");
    expect(config.voice).toBe("nova");
    expect(config.rate).toBe(1.25);
    expect(config.pitch).toBe(0.9);
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
