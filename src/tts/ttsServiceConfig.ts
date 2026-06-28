export interface TtsServiceConfig {
  readonly endpoint: string;
  readonly api_key: string;
  readonly voice: string;
  readonly rate: number;
  readonly pitch: number;
  readonly enabled: boolean;
}

const defaultConfig: TtsServiceConfig = {
  endpoint: "https://api.openai.com/v1/audio/speech",
  api_key: "",
  voice: "alloy",
  rate: 1.0,
  pitch: 1.0,
  enabled: false
};

let runtimeConfig: TtsServiceConfig | null = null;

export function getTtsServiceConfig(): TtsServiceConfig {
  if (runtimeConfig) {
    return { ...runtimeConfig };
  }

  const globals = globalThis as unknown as {
    __AETHERCURSOR_TTS_ENDPOINT?: string;
    __AETHERCURSOR_TTS_API_KEY?: string;
    __AETHERCURSOR_TTS_VOICE?: string;
    __AETHERCURSOR_TTS_RATE?: number;
    __AETHERCURSOR_TTS_PITCH?: number;
  };
  const apiKey = globals.__AETHERCURSOR_TTS_API_KEY?.trim() ?? defaultConfig.api_key;

  return {
    endpoint: globals.__AETHERCURSOR_TTS_ENDPOINT?.trim() ?? defaultConfig.endpoint,
    api_key: apiKey,
    voice: globals.__AETHERCURSOR_TTS_VOICE?.trim() ?? defaultConfig.voice,
    rate: globals.__AETHERCURSOR_TTS_RATE ?? defaultConfig.rate,
    pitch: globals.__AETHERCURSOR_TTS_PITCH ?? defaultConfig.pitch,
    enabled: apiKey.length > 0
  };
}

export function setTtsServiceConfig(partial: Partial<TtsServiceConfig>): TtsServiceConfig {
  const currentConfig = getTtsServiceConfig();
  const endpoint = partial.endpoint !== undefined ? partial.endpoint.trim() : currentConfig.endpoint;
  const apiKey = partial.api_key !== undefined ? partial.api_key.trim() : currentConfig.api_key;
  const voice = partial.voice !== undefined ? partial.voice.trim() : currentConfig.voice;
  const rate = partial.rate !== undefined ? partial.rate : currentConfig.rate;
  const pitch = partial.pitch !== undefined ? partial.pitch : currentConfig.pitch;
  const enabled = apiKey.length > 0;

  runtimeConfig = {
    endpoint,
    api_key: apiKey,
    voice,
    rate,
    pitch,
    enabled
  };

  return { ...runtimeConfig };
}

export function isCloudTtsAvailable(): boolean {
  const currentConfig = getTtsServiceConfig();
  return currentConfig.enabled && currentConfig.endpoint.length > 0 && currentConfig.api_key.length > 0;
}

export function isWebSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function resetTtsServiceConfig(): void {
  runtimeConfig = null;
}
